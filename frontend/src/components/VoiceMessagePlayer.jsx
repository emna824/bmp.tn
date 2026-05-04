import { useMemo, useRef, useState } from 'react'
import { PauseIcon, PlayIcon } from './Icons'

const WAVEFORM_BARS = [32, 52, 38, 68, 44, 76, 58, 36, 64, 48, 72, 42, 56, 34, 62, 46, 78, 50]

function formatAudioTime(value) {
  if (!Number.isFinite(value) || value <= 0) return '0:00'

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function VoiceMessagePlayer({ src, isCurrentUser = false }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const progressPercent = useMemo(() => {
    if (!duration) return 0
    return Math.min(100, Math.max(0, (currentTime / duration) * 100))
  }, [currentTime, duration])

  const handleTogglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      return
    }

    try {
      await audio.play()
    } catch {
      setIsPlaying(false)
    }
  }

  const handleSeek = (event) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const percent = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    audio.currentTime = duration * percent
  }

  return (
    <div
      className={`mt-1 flex min-w-[230px] items-center gap-3 rounded-2xl px-3 py-3 shadow-sm ${
        isCurrentUser
          ? 'bg-white/15 text-white shadow-orange-950/10'
          : 'bg-white/85 text-slate-800 shadow-slate-200/60 dark:bg-slate-900/80 dark:text-slate-100 dark:shadow-slate-950/20'
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
      />

      <button
        type="button"
        onClick={handleTogglePlayback}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all duration-300 hover:scale-105 ${
          isCurrentUser
            ? 'bg-white text-orange-500 shadow-md shadow-orange-950/15'
            : 'bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-md shadow-orange-200/50 dark:shadow-orange-950/20'
        }`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handleSeek}
          className="relative flex h-10 w-full items-center gap-1 overflow-hidden rounded-full px-1"
          aria-label="Seek voice message"
        >
          <span
            className={`absolute inset-y-1 left-0 rounded-full transition-all duration-200 ${
              isCurrentUser ? 'bg-white/20' : 'bg-orange-200/60 dark:bg-orange-400/20'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
          {WAVEFORM_BARS.map((height, index) => {
            const barProgress = ((index + 1) / WAVEFORM_BARS.length) * 100
            const isActive = barProgress <= progressPercent

            return (
              <span
                key={`${height}-${index}`}
                className={`relative z-10 flex-1 rounded-full transition-colors duration-200 ${
                  isActive
                    ? isCurrentUser
                      ? 'bg-white'
                      : 'bg-orange-500 dark:bg-orange-300'
                    : isCurrentUser
                      ? 'bg-white/45'
                      : 'bg-slate-300 dark:bg-slate-600'
                }`}
                style={{ height: `${height}%` }}
              />
            )
          })}
        </button>

        <div className={`mt-1 flex justify-between text-[11px] ${isCurrentUser ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

export default VoiceMessagePlayer
