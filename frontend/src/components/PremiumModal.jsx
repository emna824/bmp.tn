import { createElement, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api, { withUserHeaders } from '../api'
import { CheckCircleIcon, CloseIcon, LockIcon, ProjectIcon } from './Icons'
import { getStripeClient } from '../utils/stripe'
import { devError } from '../utils/devLog'

const PLAN_CONFIG = {
  monthly: {
    price: '$1.99',
  },
  yearly: {
    price: '$20',
  },
}

function PremiumModal({ isOpen, user, onClose }) {
  const { t } = useTranslation()
  const [loadingPlan, setLoadingPlan] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setLoadingPlan('')
      setError('')
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.setTimeout(() => dialogRef.current?.querySelector('button')?.focus(), 0)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const userId = user?.id || user?._id || ''
  const canSubscribe = user?.role === 'artisan'

  const handleSubscribe = async (subscriptionType) => {
    if (!userId || loadingPlan) return

    if (!canSubscribe) {
      setError('Only artisans can subscribe to Premium.')
      return
    }

    setLoadingPlan(subscriptionType)
    setError('')

    try {
      const response = await api.post(
        '/payments/premium-session',
        { subscriptionType },
        withUserHeaders(userId),
      )

      const stripe = await getStripeClient()
      if (stripe && response.data?.sessionId) {
        const result = await stripe.redirectToCheckout({ sessionId: response.data.sessionId })
        if (result?.error?.message) {
          throw new Error(result.error.message)
        }
        return
      }

      if (response.data?.url) {
        window.location.href = response.data.url
        return
      }

      throw new Error(t('premium.checkoutStartFailed'))
    } catch (requestError) {
      devError('[premium] checkout failed', requestError)
      setError(requestError.response?.data?.message || requestError.message || t('premium.checkoutStartFailed'))
      setLoadingPlan('')
    }
  }

  const benefits = [
    { key: 'createProjects', icon: ProjectIcon },
    { key: 'accessCalendar', icon: CheckCircleIcon },
    { key: 'avoidConflicts', icon: LockIcon },
  ]

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onClick={() => onClose?.()}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl border border-white/20 bg-white/90 p-6 shadow-xl shadow-slate-950/20 transition-all duration-300 dark:border-slate-700 dark:bg-slate-800/40"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-modal-title"
        aria-describedby="premium-modal-description"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              {t('premium.eyebrow', { defaultValue: 'Premium access' })}
            </p>
            <h2 id="premium-modal-title" className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {t('premium.modalTitle', { defaultValue: 'Upgrade to Premium' })}
            </h2>
            <p id="premium-modal-description" className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              {t('premium.modalSubtitle', {
                defaultValue:
                  'Unlock project planning tools and smoother scheduling with a simple premium upgrade.',
              })}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-500 transition-all duration-300 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            aria-label={t('premium.close', { defaultValue: 'Close premium modal' })}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.key}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/60"
            >
              <div className="rounded-xl bg-orange-100 p-2 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                {createElement(benefit.icon, { className: 'h-4 w-4' })}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t(`premium.benefits.${benefit.key}`)}
              </span>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={Boolean(loadingPlan) || !canSubscribe}
            onClick={() => handleSubscribe('monthly')}
            className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-orange-200/60 transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-orange-950/25"
            aria-label={`Subscribe monthly for ${PLAN_CONFIG.monthly.price}`}
          >
            {loadingPlan === 'monthly'
              ? t('premium.redirecting', { defaultValue: 'Redirecting...' })
              : t('premium.monthlyButton', {
                  defaultValue: `Subscribe Monthly (${PLAN_CONFIG.monthly.price})`,
                })}
          </button>

          <button
            type="button"
            disabled={Boolean(loadingPlan) || !canSubscribe}
            onClick={() => handleSubscribe('yearly')}
            className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:border-slate-600 dark:hover:bg-slate-900"
            aria-label={`Subscribe yearly for ${PLAN_CONFIG.yearly.price}`}
          >
            {loadingPlan === 'yearly'
              ? t('premium.redirecting', { defaultValue: 'Redirecting...' })
              : t('premium.yearlyButton', {
                  defaultValue: `Subscribe Yearly (${PLAN_CONFIG.yearly.price})`,
                })}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onClose?.()}
          className="mt-4 w-full rounded-2xl border border-transparent bg-transparent px-4 py-3 text-sm font-medium text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-white"
        >
          {t('premium.maybeLater', { defaultValue: 'Maybe Later' })}
        </button>
      </div>
    </div>
  )
}

export default PremiumModal
