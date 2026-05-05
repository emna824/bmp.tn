import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { BmpLogo, LogoutIcon, SettingsIcon } from '../components/Icons'
import { TRADES } from '../constants/trades'

function formatTradeLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function TradeIcon({ active }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-500'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M14.7 6.2a4.2 4.2 0 0 0-5.9 5.9L4 16.9V20h3.1l4.8-4.8a4.2 4.2 0 0 0 5.9-5.9l-2.4 2.4-2.1-.5-.5-2.1 2.4-2.4Z" />
    </svg>
  )
}

function MasonIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="5" width="7" height="5" rx="1.2" />
      <rect x="13.5" y="5" width="7" height="5" rx="1.2" />
      <rect x="8.5" y="14" width="7" height="5" rx="1.2" />
      <path d="M10.5 7.5h3M7.5 16.5h1M15.5 16.5h1" />
    </svg>
  )
}

function PlumberIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 4v5.5a2.5 2.5 0 0 0 5 0V4" />
      <path d="M10.5 5.5h5a2 2 0 0 1 2 2v2.5a3 3 0 0 1-3 3H12a4 4 0 0 0-4 4V20" />
      <circle cx="8" cy="20" r="1.5" />
    </svg>
  )
}

function ElectricianIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z" />
    </svg>
  )
}

function PainterIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h10l1.5 3H5.5L4 7Z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M10 10v8.5a1.5 1.5 0 0 0 3 0V10" />
    </svg>
  )
}

function CarpenterIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m4 18 9.5-9.5 2 2L6 20H4v-2Z" />
      <path d="m12 5 2-2 7 7-2 2-7-7Z" />
      <path d="M14.5 8.5 16 7" />
    </svg>
  )
}

function CheckBadgeIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m5 12 4.2 4.2L19 6.5" />
    </svg>
  )
}

function LoaderIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" className="stroke-current opacity-20" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function CheckCircleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TRADE_META = {
  mason: {
    Icon: MasonIcon,
    accent: 'from-amber-500 to-orange-600',
    soft: 'from-amber-50 to-orange-50',
    ring: 'ring-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-200',
    tag: 'Structural work',
    details: ['Brick and block work', 'Foundations and walls'],
  },
  plumber: {
    Icon: PlumberIcon,
    accent: 'from-sky-500 to-cyan-600',
    soft: 'from-sky-50 to-cyan-50',
    ring: 'ring-sky-200',
    text: 'text-sky-700',
    border: 'border-sky-200',
    tag: 'Water systems',
    details: ['Pipes and fittings', 'Maintenance and installs'],
  },
  electrician: {
    Icon: ElectricianIcon,
    accent: 'from-violet-500 to-indigo-600',
    soft: 'from-violet-50 to-indigo-50',
    ring: 'ring-violet-200',
    text: 'text-violet-700',
    border: 'border-violet-200',
    tag: 'Power and lighting',
    details: ['Wiring and panels', 'Testing and safety'],
  },
  painter: {
    Icon: PainterIcon,
    accent: 'from-rose-500 to-pink-600',
    soft: 'from-rose-50 to-pink-50',
    ring: 'ring-rose-200',
    text: 'text-rose-700',
    border: 'border-rose-200',
    tag: 'Finishing work',
    details: ['Surface prep', 'Interior and exterior paint'],
  },
  carpenter: {
    Icon: CarpenterIcon,
    accent: 'from-emerald-500 to-teal-600',
    soft: 'from-emerald-50 to-teal-50',
    ring: 'ring-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    tag: 'Woodwork and framing',
    details: ['Custom fitting', 'Structure and finish'],
  },
}

function SelectTradePage({ user, onTradeSaved, onLogout }) {
  const initialTrade = String(user?.trade || user?.job || '').trim().toLowerCase()
  const [selectedTrade, setSelectedTrade] = useState(initialTrade)
  const [saveState, setSaveState] = useState('idle')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [savedUser, setSavedUser] = useState(null)

  useEffect(() => {
    if (!message.text || message.type !== 'error') return undefined
    const timer = window.setTimeout(() => setMessage({ type: '', text: '' }), 3200)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (user?.role === 'artisan' && initialTrade && onTradeSaved) {
      onTradeSaved({
        ...user,
        trade: initialTrade,
        job: formatTradeLabel(initialTrade),
      })
    }
  }, [initialTrade, onTradeSaved, user])

  useEffect(() => {
    if (saveState !== 'success' || !savedUser || !onTradeSaved) return undefined

    const timer = window.setTimeout(() => {
      onTradeSaved(savedUser)
    }, 1100)

    return () => window.clearTimeout(timer)
  }, [onTradeSaved, saveState, savedUser])

  const selectedTradeLabel = useMemo(() => formatTradeLabel(selectedTrade), [selectedTrade])
  const selectedTradeMeta = selectedTrade ? TRADE_META[selectedTrade] : null

  const handleConfirm = async () => {
    if (!selectedTrade || saveState === 'saving' || saveState === 'success' || !user?.id) return

    setSaveState('saving')
    setSavedUser(null)
    setMessage({ type: '', text: '' })

    try {
      const response = await api.put(
        '/users/add-trade',
        { trade: selectedTrade },
        {
          headers: {
            'x-user-id': user.id,
          },
        },
      )

      setMessage({
        type: 'success',
        text: response.data?.message || 'Trade saved successfully. Redirecting to your dashboard...',
      })
      setSaveState('success')

      if (response.data?.user && onTradeSaved) {
        setSavedUser(response.data.user)
      }
    } catch (error) {
      setSaveState('idle')
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save trade.',
      })
      setSavedUser(null)
    }
  }

  if (!user || user.role !== 'artisan' || initialTrade) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-100 transition-colors duration-300 dark:bg-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-3">
                <BmpLogo className="h-12 w-12" />
                <div>
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Artisan onboarding</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight">Select Your Trade</h1>
                </div>
              </div>

              <button
                type="button"
                className="!m-0 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white shadow-none transition hover:bg-white/10"
                onClick={onLogout}
              >
                <LogoutIcon className="h-4 w-4" />
                Logout
              </button>
            </div>

            <p className="mt-8 max-w-xl text-sm leading-7 text-white/72">
              This helps us match you with the right projects as soon as you enter the platform. You can still update
              your trade later from your artisan settings.
            </p>

            <div className="mt-8 space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
              <div className="inline-flex rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
                <SettingsIcon className="h-6 w-6" />
              </div>
              <h2 className="m-0 text-xl font-semibold">Why we ask this first</h2>
              <ul className="m-0 space-y-3 pl-5 text-sm leading-6 text-white/70">
                <li>Recommend open job offers that fit your specialty.</li>
                <li>Improve project matching from the first session.</li>
                <li>Keep your artisan dashboard focused and useful.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-slate-950/30">
            <div className="space-y-3">
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Trade selection</p>
              <h2 className="m-0 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Choose the trade that defines your work</h2>
              <p className="m-0 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Pick one option to continue to your artisan dashboard. You can only continue once a trade is selected.
              </p>
            </div>

            {saveState === 'saving' ? (
              <div className="mt-6 flex items-center gap-3 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
                <LoaderIcon className="h-5 w-5" />
                Saving your trade and preparing your artisan dashboard...
              </div>
            ) : null}

            {saveState === 'success' ? (
              <div className="mt-6 flex items-center gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <CheckCircleIcon className="h-5 w-5" />
                {message.text}
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {TRADES.map((trade) => {
                const active = selectedTrade === trade
                const meta = TRADE_META[trade]
                const Icon = meta?.Icon || TradeIcon
                return (
                  <button
                    key={trade}
                    type="button"
                    className={`group !m-0 relative flex min-h-[178px] flex-col items-start justify-between overflow-hidden rounded-[1.5rem] border px-4 py-4 text-left shadow-none transition duration-200 ${
                      active
                        ? `bg-gradient-to-br ${meta?.accent} text-white ring-4 ${meta?.ring} border-transparent`
                        : `border-slate-200 bg-gradient-to-br ${meta?.soft} text-slate-900 hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-slate-600`
                    } ${saveState !== 'idle' ? 'pointer-events-none opacity-70' : ''}`}
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative z-10 flex w-full items-start justify-between gap-3">
                      <div className={`rounded-xl p-2.5 ${active ? 'bg-white/15' : 'bg-white/80 shadow-sm dark:bg-slate-800 dark:shadow-slate-950/20'}`}>
                        {active ? <Icon className="h-5 w-5 text-white" /> : <Icon className={`h-5 w-5 ${meta?.text || 'text-slate-600'}`} />}
                      </div>
                      <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        active ? 'bg-white/15 text-white/85' : `${meta?.text || 'text-slate-600'} bg-white/80`
                      }`}>
                        {meta?.tag || 'Trade'}
                      </div>
                    </div>

                    <div className="relative z-10 mt-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <p className="m-0 text-lg font-semibold">{formatTradeLabel(trade)}</p>
                        {active ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                            <CheckBadgeIcon className="h-4 w-4 text-white" />
                          </span>
                        ) : null}
                      </div>
                      <p className={`m-0 text-xs leading-5 ${active ? 'text-white/80' : 'text-slate-500 dark:text-slate-300'}`}>
                        Match with projects looking for {trade} specialists from your first login.
                      </p>
                    </div>

                    <div className="relative z-10 mt-4 grid w-full gap-1.5">
                      {(meta?.details || []).map((detail) => (
                        <div
                          key={detail}
                          className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium ${
                            active ? 'bg-white/10 text-white/85' : 'bg-white/75 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${active ? 'bg-white' : 'bg-slate-400'}`} />
                          {detail}
                        </div>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            <div
              className={`mt-8 rounded-[1.75rem] border p-5 transition ${
                selectedTradeMeta
                  ? `${selectedTradeMeta.border} bg-gradient-to-br ${selectedTradeMeta.soft}`
                  : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80'
              }`}
            >
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Selected trade</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`inline-flex rounded-2xl p-3 ${
                      selectedTradeMeta ? `bg-gradient-to-br ${selectedTradeMeta.accent}` : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    {selectedTradeMeta?.Icon ? (
                      <selectedTradeMeta.Icon className="h-6 w-6 text-white" />
                    ) : (
                      <TradeIcon active />
                    )}
                  </div>
                  <div>
                    <p className="m-0 text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedTradeLabel || 'Choose one trade to continue'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                      {selectedTradeMeta ? selectedTradeMeta.tag : 'Select a specialty to unlock project matching.'}
                    </p>
                  </div>
                </div>
                {selectedTradeMeta ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTradeMeta.details.map((detail) => (
                      <span key={detail} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                        {detail}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {saveState === 'saving' ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <LoaderIcon className="h-4 w-4" />
                  Saving selection
                </div>
              ) : null}

              {saveState === 'success' ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  <CheckCircleIcon className="h-4 w-4" />
                  Trade saved
                </div>
              ) : null}
            </div>

            {message.text && message.type === 'error' ? (
              <div
                className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                role="status"
                aria-live="polite"
              >
                {message.text}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-300">Only artisans can access this step, and it appears only once.</p>
              <button
                type="button"
                className="!m-0 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-none transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                disabled={!selectedTrade || saveState === 'saving' || saveState === 'success'}
                onClick={handleConfirm}
              >
                {saveState === 'saving' ? (
                  <>
                    <LoaderIcon className="h-4 w-4" />
                    Saving Trade...
                  </>
                ) : saveState === 'success' ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    Saved
                  </>
                ) : (
                  'Confirm Trade'
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default SelectTradePage
