import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api, { withUserHeaders } from '../api'
import { MicIcon, StopIcon } from './Icons'
import VoiceMessagePlayer from './VoiceMessagePlayer'

const getId = (value) => value?._id || value?.id || value || ''

function normalizeMessage(message = {}) {
  return {
    ...message,
    id: getId(message),
    senderId: message?.senderId || null,
    receiverId: message?.receiverId || null,
    content: String(message?.content || ''),
    audioUrl: String(message?.audioUrl || ''),
    createdAt: message?.createdAt || '',
  }
}

function getPreferredAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''

  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function formatRecordingTime(value) {
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatTimestamp(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const sameDay = now.toDateString() === date.toDateString()

  return sameDay
    ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
    : new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
}

function ProjectChatPanel({ projectId, project, role, userId, assignedArtisans = [] }) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageDraft, setMessageDraft] = useState('')
  const [chatError, setChatError] = useState('')
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [recordingError, setRecordingError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [voiceBlob, setVoiceBlob] = useState(null)
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('')
  const endRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const expertId = getId(project?.expertId)

  const recipientOptions = useMemo(() => {
    const recipients = new Map()

    assignedArtisans.forEach((artisan) => {
      const artisanId = getId(artisan)
      if (!artisanId) return

      recipients.set(artisanId, {
        id: artisanId,
        name:
          artisan?.name ||
          artisan?.email ||
          t('project.assignedArtisan', { defaultValue: 'Assigned artisan' }),
      })
    })

    return Array.from(recipients.values())
  }, [assignedArtisans, t])

  const emptyStateMessage = useMemo(() => {
    if (role === 'expert' && !recipientOptions.length) {
      return 'Messages become available when at least one artisan is assigned to this project.'
    }

    if (role === 'artisan' && !expertId) {
      return 'This project does not have an expert chat recipient yet.'
    }

    return ''
  }, [expertId, recipientOptions.length, role])

  const loadMessages = useCallback(
    async (showLoader = false) => {
      if (!projectId || !userId) return

      if (showLoader) {
        setLoadingMessages(true)
      }

      try {
        const response = await api.get(`/messages/${projectId}`, withUserHeaders(userId))
        setMessages((response.data?.messages || []).map(normalizeMessage))
        setChatError('')
      } catch (error) {
        setChatError(error.response?.data?.message || 'Failed to load project messages')
      } finally {
        if (showLoader) {
          setLoadingMessages(false)
        }
      }
    },
    [projectId, userId]
  )

  useEffect(() => {
    setMessages([])
    setMessageDraft('')
    setChatError('')
    setSelectedRecipientId('')
    setRecordingError('')
  }, [projectId])

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current)
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    return () => {
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl)
      }
    }
  }, [voicePreviewUrl])

  useEffect(() => {
    if (!projectId || !userId) return undefined

    loadMessages(true)

    const intervalId = window.setInterval(() => {
      loadMessages(false)
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [loadMessages, projectId, userId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const handleSendMessage = async (event) => {
    event.preventDefault()

    const trimmedDraft = messageDraft.trim()
    if (!trimmedDraft || !projectId || !userId) return

    setSendingMessage(true)
    try {
      const response = await api.post(
        '/messages',
        {
          projectId,
          content: trimmedDraft,
          ...(role === 'expert' && selectedRecipientId ? { receiverId: selectedRecipientId } : {}),
        },
        withUserHeaders(userId)
      )

      const nextMessage = normalizeMessage(response.data?.chatMessage || {})
      setMessages((current) =>
        current.some((message) => message.id === nextMessage.id) ? current : [...current, nextMessage]
      )
      setMessageDraft('')
      setChatError('')
    } catch (error) {
      setChatError(error.response?.data?.message || 'Failed to send project message')
    } finally {
      setSendingMessage(false)
    }
  }

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  const clearVoiceDraft = () => {
    setVoiceBlob(null)
    setRecordingSeconds(0)
    setRecordingError('')

    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl)
      setVoicePreviewUrl('')
    }
  }

  const handleStartRecording = async () => {
    if (sendingMessage || Boolean(emptyStateMessage)) return

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Voice recording is not supported in this browser.')
      return
    }

    clearVoiceDraft()
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getPreferredAudioMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        stopRecordingTimer()
        stopMediaStream()
        setIsRecording(false)

        const audioType = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: audioType })

        if (blob.size) {
          setVoiceBlob(blob)
          setVoicePreviewUrl(URL.createObjectURL(blob))
        } else {
          setRecordingError('No audio was captured. Please try again.')
        }
      }

      recorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1)
      }, 1000)
    } catch (error) {
      stopRecordingTimer()
      stopMediaStream()
      setIsRecording(false)

      const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
      setRecordingError(
        denied
          ? 'Microphone permission was denied. Allow microphone access to record voice messages.'
          : 'Could not start voice recording. Please check your microphone.',
      )
    }
  }

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }

  const handleSendVoiceMessage = async () => {
    if (!voiceBlob || !projectId || !userId || sendingMessage || Boolean(emptyStateMessage)) return

    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('content', messageDraft.trim())
    formData.append('audio', voiceBlob, 'voice-message.webm')

    if (role === 'expert' && selectedRecipientId) {
      formData.append('receiverId', selectedRecipientId)
    }

    setSendingMessage(true)
    try {
      const response = await api.post('/messages/audio', formData, withUserHeaders(userId))
      const nextMessage = normalizeMessage(response.data?.chatMessage || {})

      setMessages((current) =>
        current.some((message) => message.id === nextMessage.id) ? current : [...current, nextMessage]
      )
      setMessageDraft('')
      clearVoiceDraft()
      setChatError('')
    } catch (error) {
      setChatError(error.response?.data?.message || 'Failed to send voice message')
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <div className="project-section-panel rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Chat</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Exchange project updates directly between artisan and expert.
          </p>
        </div>

        {role === 'expert' && recipientOptions.length > 1 ? (
          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Send to</span>
            <select
              value={selectedRecipientId}
              onChange={(event) => setSelectedRecipientId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20"
            >
              <option value="">All assigned artisans</option>
              {recipientOptions.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {chatError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {chatError}
        </div>
      ) : null}

      {emptyStateMessage ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          {emptyStateMessage}
        </div>
      ) : null}

      <div className="flex h-[26rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loadingMessages && !messages.length ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">{t('common.loading')}</p>
          ) : null}

          {!loadingMessages && !messages.length ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              No messages yet. Start the conversation for this project.
            </div>
          ) : null}

          {messages.map((message) => {
            const isCurrentUser = String(getId(message.senderId)) === String(userId)
            const senderName =
              message?.senderId?.name ||
              (isCurrentUser
                ? t('common.you', { defaultValue: 'You' })
                : t('common.user', { defaultValue: 'User' }))
            const recipientNote =
              role === 'expert' && isCurrentUser
                ? message?.receiverId?.name
                  ? `To ${message.receiverId.name}`
                  : 'To all artisans'
                : ''

            return (
              <div
                key={message.id || `${message.createdAt}-${message.content}`}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div
                    className={`flex flex-wrap items-center gap-2 text-xs ${
                      isCurrentUser ? 'justify-end text-slate-500 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{senderName}</span>
                    {recipientNote ? <span>{recipientNote}</span> : null}
                    <span>{formatTimestamp(message.createdAt)}</span>
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      isCurrentUser
                        ? 'rounded-br-md bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-orange-200/40 dark:shadow-orange-950/20'
                        : 'rounded-bl-md bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {message.content ? <p>{message.content}</p> : null}
                    {message.audioUrl ? (
                      <VoiceMessagePlayer src={message.audioUrl} isCurrentUser={isCurrentUser} />
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}

          <div ref={endRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="border-t border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/80"
        >
          <div className="grid gap-3">
            <textarea
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              placeholder="Write a message about this project..."
              rows={2}
              disabled={sendingMessage || Boolean(emptyStateMessage)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20"
            />

            {recordingError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {recordingError}
              </div>
            ) : null}

            {isRecording ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-700 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Recording voice message</p>
                    <p className="text-xs opacity-80">{formatRecordingTime(recordingSeconds)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1" aria-hidden="true">
                  {[8, 16, 24, 14, 28].map((height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className="w-1 animate-pulse rounded-full bg-orange-500"
                      style={{ height, animationDelay: `${index * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {voicePreviewUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Voice preview</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Listen before sending.</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearVoiceDraft}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-300 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    Discard
                  </button>
                </div>
                <VoiceMessagePlayer src={voicePreviewUrl} />
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Messages stay scoped to this project.
              </p>
              <div className="flex items-center gap-2">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-all duration-300 hover:scale-[1.02] hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  >
                    <StopIcon className="h-4 w-4" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    disabled={sendingMessage || Boolean(emptyStateMessage)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-300 hover:scale-[1.02] hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-orange-400 dark:hover:text-orange-300"
                  >
                    <MicIcon className="h-4 w-4" />
                    Record
                  </button>
                )}

                {voiceBlob ? (
                  <button
                    type="button"
                    onClick={handleSendVoiceMessage}
                    disabled={sendingMessage || Boolean(emptyStateMessage)}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200/50 transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-orange-950/25"
                  >
                    {sendingMessage ? t('common.saving') : 'Send voice'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageDraft.trim() || Boolean(emptyStateMessage)}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200/50 transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-orange-950/25"
                  >
                    {sendingMessage ? t('common.saving') : 'Send'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectChatPanel
