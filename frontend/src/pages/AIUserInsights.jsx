import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../api'
import { BotIcon, CheckCircleIcon, InvoiceIcon, MarketplaceIcon, ProjectIcon, QuoteIcon } from '../components/Icons'
import { withAdminHeaders } from '../utils/adminDashboard'

const LEVEL_COPY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

const featureIcons = {
  'Calendar conflict management': QuoteIcon,
  'AI project insights': BotIcon,
  'Invoice archiving': InvoiceIcon,
  'Marketplace recommendations': MarketplaceIcon,
  'Premium project management': ProjectIcon,
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`
}

function InsightSkeleton() {
  return (
    <div className="ai-insights-grid" aria-label="Loading AI user insights">
      {[0, 1, 2].map((item) => (
        <article className="ai-insight-card ai-insight-skeleton" key={item}>
          <span />
          <strong />
          <p />
          <div />
        </article>
      ))}
    </div>
  )
}

const InsightCard = memo(function InsightCard({ insight }) {
  const user = insight.user || {}
  const probability = Math.round(Number(insight.premiumProbability || 0) * 100)
  const confidence = Math.round(Number(insight.confidenceScore || 0) * 100)

  return (
    <article className={`ai-insight-card level-${String(insight.engagementLevel || 'LOW').toLowerCase()}`}>
      <div className="ai-insight-card-top">
        <div>
          <p className="admin-eyebrow">{user.trade || 'Artisan'}</p>
          <h3>{user.name || 'Unknown artisan'}</h3>
          <p>{user.email || 'No email available'}</p>
        </div>
        <span className={`ai-level-badge ${String(insight.engagementLevel || 'LOW').toLowerCase()}`}>
          {LEVEL_COPY[insight.engagementLevel] || 'Low'} engagement
        </span>
      </div>

      <div className="ai-score-row">
        <div>
          <span>Premium probability</span>
          <strong>{probability}%</strong>
        </div>
        <div className="ai-probability-track" aria-label={`Premium probability ${probability}%`}>
          <span style={{ width: `${Math.max(4, probability)}%` }} />
        </div>
      </div>

      <div className="ai-mini-metrics">
        <span>{insight.metrics?.loginCount || 0} logins</span>
        <span>{insight.metrics?.projectsCreated || 0} projects</span>
        <span>{insight.metrics?.invoicesCreated || 0} invoices</span>
      </div>

      <div className="ai-recommendation-card">
        <CheckCircleIcon className="icon tiny" />
        <p>{insight.recommendationMessage}</p>
      </div>

      <div className="ai-feature-list">
        {(insight.suggestedFeatures || []).map((feature) => {
          const Icon = featureIcons[feature] || BotIcon
          return (
            <span key={feature}>
              <Icon className="icon tiny" />
              {feature}
            </span>
          )
        })}
      </div>

      <div className="ai-confidence-row">
        <span>Confidence</span>
        <strong>{confidence}%</strong>
      </div>
    </article>
  )
})

function AIUserInsights({ user }) {
  const requestKeyRef = useRef('')
  const [state, setState] = useState({
    loading: true,
    error: '',
    insights: [],
    summary: null,
  })

  const loadInsights = useCallback(async ({ force = false } = {}) => {
    const key = `${user?.id || user?._id || ''}:8`
    if (!force && requestKeyRef.current === key && state.insights.length > 0) return
    requestKeyRef.current = key
    setState((current) => ({ ...current, loading: true, error: '' }))

    try {
      const response = await api.post('/ai/user-insights', { limit: 8 }, withAdminHeaders(user))
      setState({
        loading: false,
        error: '',
        insights: response.data?.insights || [],
        summary: response.data?.summary || null,
      })
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.response?.data?.message || 'Failed to generate AI user insights',
      }))
    }
  }, [state.insights.length, user])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  const summaryCards = useMemo(() => {
    const summary = state.summary || {}
    return [
      ['Analyzed artisans', summary.total || 0],
      ['High engagement', summary.highEngagement || 0],
      ['Premium ready', summary.highPremiumPotential || 0],
      ['Avg confidence', percent(summary.averageConfidence || 0)],
    ]
  }, [state.summary])

  return (
    <section className="admin-page-stack ai-insights-page">
      <div className="admin-panel admin-panel-header ai-insights-header">
        <div>
          <p className="admin-eyebrow">AI User Insights</p>
          <h2>Engagement and premium recommendations</h2>
          <p>
            Random Forest predictions from login, project, quote, invoice, and subscription activity logs.
          </p>
        </div>
        <button
          type="button"
          className="admin-action-btn admin-action-neutral"
          onClick={() => loadInsights({ force: true })}
        >
          {state.loading ? 'Analyzing...' : 'Refresh AI insights'}
        </button>
      </div>

      {state.error ? <div className="admin-banner error">{state.error}</div> : null}

      <div className="ai-summary-grid">
        {summaryCards.map(([label, value]) => (
          <article className="admin-stat-card ai-summary-card" key={label}>
            <span>{label}</span>
            <strong>{state.loading ? '...' : value}</strong>
          </article>
        ))}
      </div>

      {state.loading ? <InsightSkeleton /> : null}

      {!state.loading && state.insights.length > 0 ? (
        <div className="ai-insights-grid">
          {state.insights.map((insight) => (
            <InsightCard insight={insight} key={insight.user?.id || insight.user?.email} />
          ))}
        </div>
      ) : null}

      {!state.loading && !state.insights.length ? (
        <div className="admin-empty-state">No artisan activity is available for AI insights yet.</div>
      ) : null}
    </section>
  )
}

export default AIUserInsights

