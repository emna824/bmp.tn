import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatTradeLabel, getTaskSuggestions, normalizeCategoryKey, predictTaskCategory } from '../utils/taskClassifier'

const CATEGORY_STYLES = {
  carpenter: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  painter: 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300',
  electrician: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  mason: 'border-stone-200 bg-stone-100 text-stone-700 dark:border-stone-500/30 dark:bg-stone-500/10 dark:text-stone-200',
  plumber: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
}

function TaskCategoryBadge({ title = '', description = '', categoryHint = '', className = '' }) {
  const { t, i18n } = useTranslation()
  const [prediction, setPrediction] = useState(null)

  const sourceText = useMemo(
    () => [title, description].filter(Boolean).join(' ').trim(),
    [description, title],
  )

  useEffect(() => {
    let active = true

    if (!sourceText) {
      setPrediction(null)
      return undefined
    }

    predictTaskCategory(sourceText, i18n.resolvedLanguage || i18n.language).then((result) => {
      if (active) {
        setPrediction(result)
      }
    })

    return () => {
      active = false
    }
  }, [i18n.language, i18n.resolvedLanguage, sourceText])

  const fallbackCategory = normalizeCategoryKey(categoryHint)
  const category = prediction?.category || fallbackCategory

  if (!category) {
    return null
  }

  const fallbackSuggestions = getTaskSuggestions(
    category,
    sourceText,
    i18n.resolvedLanguage || i18n.language,
  )
  const label = t(`tradeLabels.${category}`, {
    defaultValue: formatTradeLabel(category),
  })
  const confidence = prediction?.confidence ? Math.round(Number(prediction.confidence || 0) * 100) : 0
  const style = CATEGORY_STYLES[category] || 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
  const materials = prediction?.materials?.length ? prediction.materials : fallbackSuggestions.materials || []
  const bestPractices =
    prediction?.best_practices?.length ? prediction.best_practices : fallbackSuggestions.best_practices || []
  const safety = prediction?.safety?.length ? prediction.safety : fallbackSuggestions.safety || []

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
        title={`${t('task.suggestedTrade', { defaultValue: 'Suggested trade' })}: ${label}`}
      >
        <span>{t('task.suggestedTrade', { defaultValue: 'Suggested trade' })}</span>
        <span>{label}</span>
        {confidence ? (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold dark:bg-slate-950/40">
            {confidence}%
          </span>
        ) : null}
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t('task.materials', { defaultValue: 'Materials' })}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {materials.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition-colors duration-300 dark:bg-slate-800 dark:text-slate-200"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t('task.bestPractices', { defaultValue: 'Best practices' })}
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {bestPractices.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 text-orange-500">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t('task.safety', { defaultValue: 'Safety' })}
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {safety.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 text-orange-500">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TaskCategoryBadge
