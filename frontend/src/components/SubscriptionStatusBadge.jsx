import { useTranslation } from 'react-i18next'

function SubscriptionStatusBadge({ isPremium = false, className = '' }) {
  const { t } = useTranslation()

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-xs font-semibold ${
        isPremium
          ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
          : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
      } ${className}`.trim()}
    >
      {isPremium
        ? t('premium.premiumLabel', { defaultValue: 'Premium' })
        : t('premium.standardLabel', { defaultValue: 'Standard' })}
    </span>
  )
}

export default SubscriptionStatusBadge
