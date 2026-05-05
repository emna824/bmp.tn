import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getFallbackReply, QUICK_ACTIONS, resolveAssistantAction } from '../utils/assistantIntents'
import { BotIcon, ChatIcon, CloseIcon, MicIcon, SendIcon, StopIcon } from './Icons'

const ACTION_DELAY_MS = 1250
const TYPE_DELAY_MS = 18

function createMessageId(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getFirstName(user) {
  return String(user?.name || '').trim().split(/\s+/)[0] || 'there'
}

function buildInitialMessages(user) {
  return [
    {
      id: createMessageId('welcome'),
      role: 'assistant',
      text: `Hi ${getFirstName(user)}, I am BMP Assistant. Tell me where you want to go and I will handle the transition.`,
      animated: false,
    },
  ]
}

function dispatchAssistantEvent(action) {
  if (typeof window === 'undefined' || !action) return
  window.dispatchEvent(new CustomEvent('bmp-assistant-action', { detail: { action } }))
}

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const TypingDots = memo(function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 pl-1" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-70"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </span>
  )
})

function TypewriterText({ text, enabled }) {
  const [visibleText, setVisibleText] = useState(enabled ? '' : text)

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setVisibleText(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(timer)
      }
    }, TYPE_DELAY_MS)

    return () => window.clearInterval(timer)
  }, [enabled, text])

  return visibleText
}

const MessageBubble = memo(function MessageBubble({ message, reduceMotion }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
          isUser
            ? 'rounded-br-md bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-orange-950/20'
            : 'rounded-bl-md bg-slate-800/95 text-slate-100 shadow-slate-950/25'
        }`}
      >
        {message.loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-orange-200/30 border-t-orange-300" />
            <span>
              {message.text}
              <TypingDots />
            </span>
          </span>
        ) : (
          <TypewriterText text={message.text} enabled={Boolean(message.animated && !isUser && !reduceMotion)} />
        )}
      </div>
    </div>
  )
})

function PremiumAssistant({
  user,
  currentPath = '/',
  onNavigate,
  onRequirePremium,
  defaultOpen = false,
  onScheduleUnload,
  onCancelScheduledUnload,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(() => buildInitialMessages(user))
  const [isTyping, setIsTyping] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechNotice, setSpeechNotice] = useState('')
  const [reduceMotion, setReduceMotion] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const launcherRef = useRef(null)
  const closeButtonRef = useRef(null)
  const replyTimerRef = useRef(null)
  const recognitionRef = useRef(null)
  const isBusy = isTyping || isExecuting

  const quickActions = useMemo(() => QUICK_ACTIONS[user?.role || ''] || [], [user?.role])
  const speechSupported = Boolean(getSpeechRecognitionConstructor())

  useEffect(() => {
    if (!onScheduleUnload && !onCancelScheduledUnload) return undefined
    if (isOpen) {
      onCancelScheduledUnload?.()
    } else {
      onScheduleUnload?.()
    }
    return undefined
  }, [isOpen, onCancelScheduledUnload, onScheduleUnload])

  useEffect(() => {
    if (isOpen) return undefined
    recognitionRef.current?.abort()
    setIsListening(false)
    return undefined
  }, [isOpen])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => {
      setReduceMotion(Boolean(mediaQuery.matches))
    }
    updateMotionPreference()
    mediaQuery.addEventListener('change', updateMotionPreference)
    return () => mediaQuery.removeEventListener('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isOpen ? 'smooth' : 'auto', block: 'end' })
  }, [isOpen, isTyping, messages])

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) {
        window.clearTimeout(replyTimerRef.current)
      }

      recognitionRef.current?.abort()
    }
  }, [])

  const runAction = useCallback(
    async (action) => {
      const actionMessageId = createMessageId('action')
      const isAlreadyOnRoute = Boolean(action.route && currentPath === action.route)

      setIsExecuting(true)
      setMessages((current) => [
        ...current,
        {
          id: actionMessageId,
          role: 'assistant',
          text: action.loading,
          loading: true,
        },
      ])

      if (!reduceMotion) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, ACTION_DELAY_MS)
        })
      }

      if (action.route) {
        onNavigate?.(action.route)
      }

      if (action.type === 'modal') {
        onRequirePremium?.()
      }

      if (action.eventAction) {
        dispatchAssistantEvent(action.eventAction)
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === actionMessageId
            ? {
                ...message,
                text: isAlreadyOnRoute ? action.alreadyDone || action.done : action.done,
                loading: false,
                animated: true,
              }
            : message,
        ),
      )
      setIsExecuting(false)
    },
    [currentPath, onNavigate, onRequirePremium, reduceMotion],
  )

  const sendMessage = useCallback(
    async (rawText) => {
      const text = rawText.trim()
      if (!text || isBusy) return

      const userMessage = {
        id: createMessageId('user'),
        role: 'user',
        text,
      }

      setMessages((current) => [...current, userMessage])
      setInput('')

      const action = resolveAssistantAction(text, user)
      if (action) {
        if (action.type === 'reply') {
          setIsTyping(true)
          replyTimerRef.current = window.setTimeout(() => {
            setIsTyping(false)
            setMessages((current) => [
              ...current,
              {
                id: createMessageId('assistant'),
                role: 'assistant',
                text: action.done,
                animated: true,
              },
            ])
          }, reduceMotion ? 0 : 650)
          return
        }

        await runAction(action)
        return
      }

      setIsTyping(true)
      replyTimerRef.current = window.setTimeout(() => {
        setIsTyping(false)
        setMessages((current) => [
          ...current,
          {
            id: createMessageId('assistant'),
            role: 'assistant',
            text: getFallbackReply(text, user),
            animated: true,
          },
        ])
      }, reduceMotion ? 0 : 650)
    },
    [isBusy, reduceMotion, runAction, user],
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(input)
  }

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 80)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setIsOpen(false)
        stopListening()
        launcherRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, stopListening])

  const startListening = useCallback(() => {
    if (isBusy || isListening) return

    const SpeechRecognition = getSpeechRecognitionConstructor()
    if (!SpeechRecognition) {
      setSpeechNotice('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    let finalTranscript = ''
    let latestTranscript = ''

    recognition.onstart = () => {
      setSpeechNotice('')
      setInput('')
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      let interimTranscript = ''

      Array.from(event.results).forEach((result) => {
        const transcript = result?.[0]?.transcript || ''
        if (result.isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      })

      latestTranscript = finalTranscript || interimTranscript
      setInput(latestTranscript)
    }

    recognition.onerror = (event) => {
      setIsListening(false)

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSpeechNotice('Microphone permission was denied. Allow microphone access to use voice commands.')
        return
      }

      setSpeechNotice('Could not hear a voice command. Please try again.')
    }

    recognition.onend = () => {
      setIsListening(false)

      const transcript = latestTranscript.trim()
      if (transcript) {
        sendMessage(transcript)
      }
    }

    try {
      recognition.start()
    } catch {
      setIsListening(false)
      setSpeechNotice('Could not start voice command listening.')
    }
  }, [isBusy, isListening, sendMessage])

  return (
    <>
      <section
        id="bmp-assistant-panel"
        className={`fixed bottom-24 right-6 z-[110] flex h-[600px] w-[380px] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/92 text-white shadow-xl shadow-slate-950/25 backdrop-blur-[2px] transition-all duration-300 ease-out dark:border-slate-700/70 dark:bg-slate-950/94 max-sm:bottom-20 max-sm:left-3 max-sm:right-3 max-sm:h-[calc(100dvh-6rem)] max-sm:w-auto ${
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-5 scale-95 opacity-0'
        }`}
        aria-hidden={!isOpen}
        aria-label="BMP Assistant chat"
        aria-labelledby="bmp-assistant-title"
      >
        <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/30">
              <BotIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="bmp-assistant-title" className="truncate text-base font-semibold tracking-normal text-white">BMP Assistant</h2>
              <p className="mt-0.5 flex items-center gap-2 text-xs font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]" aria-hidden="true" />
                Online
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              setIsOpen(false)
              launcherRef.current?.focus()
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-all duration-300 hover:scale-105 hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="Close BMP Assistant"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [scrollbar-color:rgba(251,146,60,0.55)_transparent] [scrollbar-width:thin]"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="Assistant conversation"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} reduceMotion={reduceMotion} />
          ))}

          {isTyping ? (
            <MessageBubble
              message={{
                id: 'typing',
                role: 'assistant',
                text: 'Typing',
                loading: true,
              }}
              reduceMotion={reduceMotion}
            />
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {quickActions.length ? (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 [scrollbar-width:none]">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => sendMessage(action)}
                disabled={isBusy}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all duration-300 hover:border-orange-300/40 hover:bg-orange-400/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Send quick action: ${action}`}
              >
                {action}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="sticky bottom-0 border-t border-white/10 bg-slate-950/90 p-3 sm:p-4">
          {isListening ? (
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-orange-300/25 bg-orange-400/10 px-4 py-3 text-orange-100" role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-300 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-400" />
                </span>
                <span className="text-sm font-semibold">Listening...</span>
              </div>
              <div className="flex items-center gap-1" aria-hidden="true">
                {[10, 18, 28, 16, 24].map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className="w-1 animate-pulse rounded-full bg-orange-300"
                    style={{ height, animationDelay: `${index * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {speechNotice ? (
            <div className="mb-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs font-medium text-amber-100">
              {speechNotice}
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 shadow-inner shadow-black/20 focus-within:border-orange-300/60 focus-within:bg-white/10">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={isListening ? 'Listening for a command...' : 'Message BMP Assistant...'}
              disabled={isBusy}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
              aria-label="Message BMP Assistant"
            />
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isBusy || !speechSupported}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${
                isListening
                  ? 'border-rose-300/40 bg-rose-400/15 text-rose-100'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-orange-300/40 hover:bg-orange-400/15 hover:text-white'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Speak command'}
              title={speechSupported ? 'Speak command' : 'Speech recognition is not supported'}
            >
              {isListening ? <StopIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isBusy || isListening}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-950/25 transition-all duration-300 hover:scale-105 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>

      <button
        ref={launcherRef}
        type="button"
        onClick={() => {
          setIsOpen((current) => {
            const nextOpen = !current
            if (nextOpen) {
              window.setTimeout(() => closeButtonRef.current?.focus(), 80)
            }
            return nextOpen
          })
        }}
        className="fixed bottom-6 right-6 z-[110] grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white shadow-[0_18px_45px_rgba(249,115,22,0.42)] transition-all duration-300 hover:scale-110 hover:shadow-[0_22px_55px_rgba(249,115,22,0.52)] focus:outline-none focus:ring-4 focus:ring-orange-300/35 max-sm:bottom-5 max-sm:right-5"
        aria-label={isOpen ? 'Close BMP Assistant' : 'Open BMP Assistant'}
        aria-expanded={isOpen}
        aria-controls="bmp-assistant-panel"
      >
        <span className="absolute inset-0 rounded-full bg-orange-300/25 blur-md" aria-hidden="true" />
        <ChatIcon className="relative h-7 w-7" />
      </button>
    </>
  )
}

export default PremiumAssistant
