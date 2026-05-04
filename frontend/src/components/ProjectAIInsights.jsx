import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { withUserHeaders } from '../api'

const emptyInsights = {
  summary: '',
  risk: '',
  recommendations: [],
  taskInsights: [],
}

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function TypingText({ text }) {
  const [visibleLength, setVisibleLength] = useState(0)
  const safeText = String(text || '')

  useEffect(() => {
    if (!safeText) return undefined

    const timer = window.setInterval(() => {
      setVisibleLength((current) => {
        if (current >= safeText.length) {
          window.clearInterval(timer)
          return current
        }
        return Math.min(safeText.length, current + 4)
      })
    }, 24)

    return () => window.clearInterval(timer)
  }, [safeText])

  return (
    <span>
      {safeText.slice(0, visibleLength)}
      {visibleLength < safeText.length ? <span className="animate-pulse text-orange-500">|</span> : null}
    </span>
  )
}

function InsightCard({ eyebrow, title, children, accent = 'orange' }) {
  const accentClasses = {
    orange: 'from-orange-500/18 to-amber-400/10 text-orange-700 dark:text-orange-300',
    rose: 'from-rose-500/16 to-orange-400/10 text-rose-700 dark:text-rose-300',
    emerald: 'from-emerald-500/16 to-teal-400/10 text-emerald-700 dark:text-emerald-300',
    sky: 'from-sky-500/16 to-indigo-400/10 text-sky-700 dark:text-sky-300',
  }

  return (
    <article className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-950/30">
      <div className={`mb-4 inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold ${accentClasses[accent] || accentClasses.orange}`}>
        {eyebrow}
      </div>
      <h4 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h4>
      <div className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
    </article>
  )
}

function ProjectAIInsights({ projectId, userId }) {
  const [insights, setInsights] = useState(emptyInsights)
  const [projectData, setProjectData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const loadInsights = useCallback(async () => {
    if (!projectId || !userId) return

    setLoading(true)
    setError('')
    try {
      const response = await api.get(`/ai/project-insights/${projectId}`, withUserHeaders(userId))
      const nextInsights = response.data?.insights || emptyInsights
      setInsights({
        summary: nextInsights.summary || '',
        risk: nextInsights.risk || '',
        recommendations: normalizeList(nextInsights.recommendations),
        taskInsights: normalizeList(nextInsights.taskInsights),
      })
      setProjectData(response.data?.projectData || null)
      setLoaded(true)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'AI insights are unavailable right now. Please try again.')
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [projectId, userId])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  const stats = useMemo(() => {
    if (!projectData) return []
    return [
      { label: 'Progress', value: `${projectData.progress ?? 0}%` },
      { label: 'Delayed tasks', value: projectData.delayedTasks ?? 0 },
      { label: 'Budget used', value: `${projectData.budgetUsedPercent ?? 0}%` },
      { label: 'Pending invoices', value: projectData.pendingInvoices ?? 0 },
    ]
  }, [projectData])

  const hasInsights = Boolean(insights.summary || insights.risk || insights.recommendations.length || insights.taskInsights.length)

  return (
    <section className="overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/90 via-orange-50/55 to-slate-100/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:from-slate-950/95 dark:via-slate-900/80 dark:to-orange-950/20 dark:shadow-slate-950/30" aria-labelledby="project-ai-insights-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">Expert assistant</p>
          <h3 id="project-ai-insights-title" className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">AI Insights</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Project data is analyzed from milestones, work logs, invoices, quotes, schedule, and budget usage.
          </p>
        </div>

        <button
          type="button"
          onClick={loadInsights}
          disabled={loading || !projectId || !userId}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-orange-300/60 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-orange-950/30 dark:focus:ring-offset-slate-950"
          aria-label={loading ? 'Refreshing AI insights' : 'Refresh AI insights'}
        >
          {loading ? 'Analyzing...' : loaded ? 'Refresh insights' : 'Generate insights'}
        </button>
      </div>

      {stats.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/60 bg-white/65 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/65">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-5 text-sm text-slate-600 shadow-md shadow-slate-200/40 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:shadow-slate-950/20" role="status" aria-live="polite">
          <span className="font-semibold text-slate-900 dark:text-white">Analyzing project data</span>
          <span className="ml-1 animate-pulse">...</span>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
          {error}
        </div>
      ) : null}

      {!loading && hasInsights ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <InsightCard eyebrow="Summary" title="Project status" accent="orange">
            <TypingText key={insights.summary} text={insights.summary} />
          </InsightCard>

          <InsightCard eyebrow="Risk" title="Risk explanation" accent="rose">
            <TypingText key={insights.risk} text={insights.risk} />
          </InsightCard>

          <InsightCard eyebrow="Recommendations" title="Next best actions" accent="emerald">
            <ul className="space-y-2">
              {insights.recommendations.length ? insights.recommendations.map((item) => (
                <li key={item} className="rounded-xl bg-white/55 px-3 py-2 dark:bg-slate-950/45">{item}</li>
              )) : <li>No recommendations were generated yet.</li>}
            </ul>
          </InsightCard>

          <InsightCard eyebrow="Tasks" title="Task insights" accent="sky">
            <ul className="space-y-2">
              {insights.taskInsights.length ? insights.taskInsights.map((item) => (
                <li key={item} className="rounded-xl bg-white/55 px-3 py-2 dark:bg-slate-950/45">{item}</li>
              )) : <li>No task insights were generated yet.</li>}
            </ul>
          </InsightCard>
        </div>
      ) : null}
    </section>
  )
}

export default ProjectAIInsights
