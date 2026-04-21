import { useTranslation } from 'react-i18next'

function SubscriptionStatusBadge({ role = '', isPremium = false, className = '' }) {
  const { t } = useTranslation()

  if (role !== 'artisan') {
    return null
  }

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-xs font-semibold ${
        isPremium
          ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
          : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
      } ${className}`.trim()}
    >
      {isPremium
        ? t('premium.premiumArtisanLabel', { defaultValue: 'Premium Artisan' })
        : t('premium.standardArtisanLabel', { defaultValue: 'Standard Artisan' })}
    </span>
  )
}

export default SubscriptionStatusBadge
