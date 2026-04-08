import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api, { withUserHeaders } from '../api'
import MilestoneCard from '../components/MilestoneCard'
import StatusBadge, { formatDisplayDate } from '../components/StatusBadge'
import TaskCard from '../components/TaskCard'

const todayKey = () => new Date().toISOString().slice(0, 10)
const getId = (value) => value?._id || value?.id || value || ''

const formatCurrency = (value) => {
  const amount = Number(value || 0)

  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'TND' }).format(amount)
  } catch (_error) {
    return `${amount.toFixed(2)} TND`
  }
}

const normalizeProduct = (product = {}) => ({
  ...product,
  id: getId(product),
  stock: Number(product?.stock ?? 0),
  price: Number(product?.price ?? 0),
  manufacturer: product?.manufacturer || (typeof product?.manufacturerId === 'object' ? product.manufacturerId : null),
})

const normalizeQuote = (quote = {}) => ({
  ...quote,
  id: getId(quote),
  quantity: Number(quote?.quantity ?? 0),
  unitPrice: Number(quote?.unitPrice ?? 0),
  totalPrice: Number(quote?.totalPrice ?? 0),
  status: quote?.status || 'pending',
})

const normalizeInvoice = (invoice = {}) => ({
  ...invoice,
  id: getId(invoice),
  quantity: Number(invoice?.quantity ?? 0),
  totalPrice: Number(invoice?.totalPrice ?? 0),
  status: invoice?.status || 'generated',
  issuedAt: invoice?.issuedAt || invoice?.createdAt || '',
})

function defaultTaskForMilestone(milestone) {
  return {
    id: getId(milestone),
    title: milestone?.title || 'Daily task',
    description: '',
    status: 'not_done',
    date: todayKey(),
    dateLabel: 'Today',
  }
}

function ProjectDetails(props) {
  const {
    role,
    userId,
    project,
    milestones = [],
    workLogs = [],
    loading,
    savingTaskId,
    creatingMilestone,
    projectActionLoading,
    onBack,
    onTaskChange,
    onSaveTask,
    onCreateMilestone,
    onStartProject,
    onCloseProject,
    onFinishProject,
    onProjectRefresh,
  } = props

  const { t } = useTranslation()
  const projectId = getId(project)
  const [activeTab, setActiveTab] = useState('overview')
  const [marketplaceProducts, setMarketplaceProducts] = useState([])
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loadingMarketplace, setLoadingMarketplace] = useState(false)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [quoteProduct, setQuoteProduct] = useState(null)
  const [quoteQuantity, setQuoteQuantity] = useState(1)
  const [submittingQuote, setSubmittingQuote] = useState(false)
  const [reviewingQuoteId, setReviewingQuoteId] = useState('')
  const [generatingInvoiceId, setGeneratingInvoiceId] = useState('')
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const [invoiceFilters, setInvoiceFilters] = useState({ dateFrom: '', dateTo: '', status: '', sort: 'newest' })
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', artisanId: '', startDate: '', endDate: '' })
  const marketplaceLocked = ['finished', 'closed'].includes(String(project?.status || ''))

  useEffect(() => {
    setActiveTab('overview')
    setQuoteProduct(null)
    setQuoteQuantity(1)
    setFeedback({ type: '', text: '' })
  }, [projectId])

  useEffect(() => {
    if (!feedback.text) return undefined
    const timer = setTimeout(() => setFeedback({ type: '', text: '' }), 3200)
    return () => clearTimeout(timer)
  }, [feedback])

  const workLogByMilestone = useMemo(() => {
    const entries = {}
    workLogs.forEach((workLog) => {
      if (String(workLog?.date || '').slice(0, 10) === todayKey()) {
        entries[getId(workLog?.milestoneId)] = workLog
      }
    })
    return entries
  }, [workLogs])

  const assignedArtisans = useMemo(() => {
    const artisans = new Map()
    ;(project?.assignedArtisans || []).forEach((artisan) => {
      const artisanId = getId(artisan)
      if (artisanId && artisan?.name) artisans.set(artisanId, artisan)
    })
    milestones.forEach((milestone) => {
      const artisan = milestone?.artisanId
      const artisanId = getId(artisan)
      if (artisanId && artisan?.name) artisans.set(artisanId, artisan)
    })
    return Array.from(artisans.values())
  }, [milestones, project?.assignedArtisans])

  const loadMarketplace = useCallback(async () => {
    if (!projectId) return
    setLoadingMarketplace(true)
    try {
      let response
      try {
        response = await api.get('/products')
      } catch (error) {
        if (error.response?.status !== 404) throw error
        response = await api.get('/manufacturers/products')
      }
      setMarketplaceProducts((response.data?.products || []).map(normalizeProduct))
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Failed to load marketplace products' })
    } finally {
      setLoadingMarketplace(false)
    }
  }, [projectId])

  const loadQuotes = useCallback(async () => {
    if (!projectId || !userId) return
    setLoadingQuotes(true)
    try {
      const response = await api.get(`/quotes/project/${projectId}`, withUserHeaders(userId))
      setQuotes((response.data?.quotes || []).map(normalizeQuote))
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Failed to load quotes' })
    } finally {
      setLoadingQuotes(false)
    }
  }, [projectId, userId])

  const loadInvoices = useCallback(async () => {
    if (!projectId || !userId) return
    setLoadingInvoices(true)
    try {
      const response = await api.get(`/invoices/project/${projectId}`, withUserHeaders(userId))
      setInvoices((response.data?.invoices || []).map(normalizeInvoice))
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Failed to load invoices' })
    } finally {
      setLoadingInvoices(false)
    }
  }, [projectId, userId])

  useEffect(() => {
    if (!projectId) return
    loadMarketplace()
    loadQuotes()
    loadInvoices()
  }, [loadInvoices, loadMarketplace, loadQuotes, projectId])

  const invoiceQuoteIds = useMemo(() => {
    const ids = new Set()
    invoices.forEach((invoice) => ids.add(String(getId(invoice?.quoteId))))
    return ids
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    const nextInvoices = invoices.filter((invoice) => {
      const invoiceDate = String(invoice?.issuedAt || '').slice(0, 10)
      if (invoiceFilters.status && invoice.status !== invoiceFilters.status) return false
      if (invoiceFilters.dateFrom && invoiceDate && invoiceDate < invoiceFilters.dateFrom) return false
      if (invoiceFilters.dateTo && invoiceDate && invoiceDate > invoiceFilters.dateTo) return false
      return true
    })

    nextInvoices.sort((firstInvoice, secondInvoice) => {
      const firstTime = new Date(firstInvoice?.issuedAt || firstInvoice?.createdAt || 0).getTime()
      const secondTime = new Date(secondInvoice?.issuedAt || secondInvoice?.createdAt || 0).getTime()
      return invoiceFilters.sort === 'oldest' ? firstTime - secondTime : secondTime - firstTime
    })

    return nextInvoices
  }, [invoiceFilters, invoices])

  const submitMilestone = async (event) => {
    event.preventDefault()
    await onCreateMilestone?.(milestoneForm)
    setMilestoneForm({ title: '', description: '', artisanId: '', startDate: '', endDate: '' })
  }

  const requestQuote = async () => {
    if (!quoteProduct || !projectId || !userId) return
    const quantity = Number.parseInt(String(quoteQuantity), 10)
    if (!Number.isInteger(quantity) || quantity < 1) {
      setFeedback({ type: 'error', text: 'Please enter a valid quantity' })
      return
    }

    setSubmittingQuote(true)
    try {
      await api.post('/quotes', { projectId, productId: quoteProduct.id, quantity }, withUserHeaders(userId))
      await loadQuotes()
      setQuoteProduct(null)
      setQuoteQuantity(1)
      setActiveTab('quotes')
      setFeedback({ type: 'success', text: 'Quote requested successfully' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Failed to request quote' })
    } finally {
      setSubmittingQuote(false)
    }
  }

  const reviewQuote = async (quoteId, status) => {
    if (!quoteId || !userId) return
    setReviewingQuoteId(quoteId)
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status }, withUserHeaders(userId))
      await loadQuotes()
      setFeedback({ type: 'success', text: `Quote ${status} successfully` })
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Failed to update quote' })
    } finally {
      setReviewingQuoteId('')
    }
  }

  const confirmPurchase = async (quoteId) => {
    if (!quoteId || !userId) return
    setGeneratingInvoiceId(quoteId)
    try {
      await api.post('/invoices', { quoteId }, withUserHeaders(userId))
      await Promise.all([loadQuotes(), loadInvoices(), Promise.resolve(onProjectRefresh?.())])
      setActiveTab('invoices')
      setFeedback({ type: 'success', text: 'Invoice generated successfully' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Failed to generate invoice' })
    } finally {
      setGeneratingInvoiceId('')
    }
  }

  if (!project) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
        <p className="text-sm text-slate-500 dark:text-slate-300">{t('project.detailsEmpty')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 transition-colors duration-300">
      <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button type="button" onClick={onBack} className="mb-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-300 hover:border-orange-200 hover:bg-orange-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10">
              {t('common.back')}
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{project.projectName || project.title}</h2>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-3 max-w-3xl text-sm text-slate-500 dark:text-slate-300">{project.description || t('project.noDescription')}</p>
          </div>

          {role === 'expert' ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={projectActionLoading || project.status !== 'recruiting'} onClick={onStartProject} className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-200/50 transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-orange-950/25">
                {t('project.startProject')}
              </button>
              <button type="button" disabled={projectActionLoading || project.status === 'closed'} onClick={onCloseProject} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800">
                {t('project.closeProject')}
              </button>
              <button type="button" disabled={projectActionLoading || project.status === 'finished'} onClick={onFinishProject} className="rounded-xl border border-green-200 px-4 py-2 text-sm font-semibold text-green-700 transition-all duration-300 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-500/40 dark:text-green-300 dark:hover:bg-green-500/10">
                {t('project.markFinished')}
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/80"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('common.startDate')}</p><p className="mt-1 font-medium text-slate-900 dark:text-white">{formatDisplayDate(project.startDate)}</p></div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/80"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('common.endDate')}</p><p className="mt-1 font-medium text-slate-900 dark:text-white">{formatDisplayDate(project.endDate || project.startDate)}</p></div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/80"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('common.trade')}</p><p className="mt-1 font-medium text-slate-900 dark:text-white">{project.job || t('project.general')}</p></div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/80"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Total spent</p><p className="mt-1 font-medium text-slate-900 dark:text-white">{formatCurrency(project.totalSpent)}</p></div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/80"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('common.milestones')}</p><p className="mt-1 font-medium text-slate-900 dark:text-white">{milestones.length}</p></div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 border-b border-slate-200 pb-2 dark:border-slate-700">
          {[
            ['overview', 'Overview'],
            ['marketplace', 'Marketplace'],
            ['quotes', t('quotes')],
            ['invoices', t('invoices')],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setActiveTab(key)} className={`border-b-2 px-1 pb-3 text-sm font-semibold transition-all duration-300 ${activeTab === key ? 'border-orange-500 text-orange-600 dark:text-orange-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {feedback.text ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'}`}>
          {feedback.text}
        </div>
      ) : null}

      {activeTab === 'overview' ? (
        <>
          {role === 'expert' ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
              <div className="mb-4"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('project.createMilestone')}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t('project.createMilestoneDescription')}</p></div>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={submitMilestone}>
                <input type="text" value={milestoneForm.title} onChange={(event) => setMilestoneForm((current) => ({ ...current, title: event.target.value }))} placeholder={t('project.milestoneTitle')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20" />
                <select value={milestoneForm.artisanId} onChange={(event) => setMilestoneForm((current) => ({ ...current, artisanId: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20">
                  <option value="">{t('project.selectArtisan')}</option>
                  {assignedArtisans.map((artisan) => <option key={getId(artisan)} value={getId(artisan)}>{artisan.name}</option>)}
                </select>
                <input type="date" value={milestoneForm.startDate} onChange={(event) => setMilestoneForm((current) => ({ ...current, startDate: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20" />
                <input type="date" value={milestoneForm.endDate} onChange={(event) => setMilestoneForm((current) => ({ ...current, endDate: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20" />
                <textarea rows={3} value={milestoneForm.description} onChange={(event) => setMilestoneForm((current) => ({ ...current, description: event.target.value }))} placeholder={t('project.shortDescription')} className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20" />
                <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={creatingMilestone} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">{creatingMilestone ? t('common.saving') : t('project.createMilestone')}</button></div>
              </form>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
            <div className="mb-4"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('common.milestones')}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{role === 'expert' ? t('project.reviewTasks') : t('project.trackTasks')}</p></div>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-300">{t('project.loadingMilestones')}</p>
            ) : milestones.length ? (
              <div className="space-y-4">
                {milestones.map((milestone) => {
                  const workLog = workLogByMilestone[milestone._id] || defaultTaskForMilestone(milestone)
                  return (
                    <div key={milestone._id} className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                      <MilestoneCard milestone={milestone} />
                      {role === 'artisan' ? (
                        <TaskCard
                          task={{ id: milestone._id, title: milestone.title, description: workLog.description || '', status: workLog.status || 'not_done', categoryHint: milestone?.artisanId?.job || project?.job || '', dateLabel: t('common.today') }}
                          disabled={savingTaskId === milestone._id}
                          onToggle={(status) => onTaskChange?.(milestone._id, { status })}
                          onDescriptionChange={(description) => onTaskChange?.(milestone._id, { description })}
                          onSave={() => onSaveTask?.(milestone._id)}
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : <p className="text-sm text-slate-500 dark:text-slate-300">{t('project.noMilestones')}</p>}
          </div>
        </>
      ) : null}

      {activeTab === 'marketplace' ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
          <div className="mb-4"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Marketplace</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Browse products from manufacturers and request quotes inside this project.</p></div>
          {marketplaceLocked ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Quotes are disabled because this project is {String(project.status || '').replace(/_/g, ' ')}.
            </div>
          ) : null}
          {loadingMarketplace ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">{t('common.loading')}</p>
          ) : marketplaceProducts.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {marketplaceProducts.map((product) => {
                const outOfStock = Number(product.stock) <= 0
                return (
                  <article key={product.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-md transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-slate-950/20">
                    <div className="mb-4 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900/80">{product.image ? <img src={product.image} alt={product.name} className="h-44 w-full object-cover" loading="lazy" /> : <div className="flex h-44 items-center justify-center text-4xl font-semibold text-slate-400 dark:text-slate-600">{(product.name || 'P').charAt(0).toUpperCase()}</div>}</div>
                    <div className="flex items-start justify-between gap-3"><div><h4 className="text-base font-semibold text-slate-900 dark:text-white">{product.name}</h4><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{product?.manufacturer?.name || 'Manufacturer'}</p></div><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">{formatCurrency(product.price)}</span></div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{product.description || t('project.noDescription')}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">{product.documentName || 'PDF'}</span><span className={`rounded-full px-3 py-1 font-medium ${outOfStock ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>{outOfStock ? 'Out of stock' : `Stock: ${product.stock}`}</span></div>
                    {role === 'artisan' ? <button type="button" disabled={submittingQuote || outOfStock || marketplaceLocked} onClick={() => { setQuoteProduct(product); setQuoteQuantity(1) }} className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200/50 transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-orange-950/25">{marketplaceLocked ? 'Unavailable for this project' : 'Request Quote'}</button> : <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">Project team can request quotes from this marketplace.</div>}
                  </article>
                )
              })}
            </div>
          ) : <p className="text-sm text-slate-500 dark:text-slate-300">No products are available yet.</p>}
        </div>
      ) : null}

      {activeTab === 'quotes' ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
          <div className="mb-4"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('quotes')}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{role === 'expert' ? 'Review and validate quote requests for this project.' : 'Track your requested quotes and confirm accepted purchases.'}</p></div>
          {loadingQuotes ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">{t('common.loading')}</p>
          ) : quotes.length ? (
            <div className="space-y-4">
              {quotes.map((quote) => {
                const hasInvoice = invoiceQuoteIds.has(String(quote.id))
                return (
                  <article key={quote.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-slate-950/20">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div><div className="flex flex-wrap items-center gap-3"><h4 className="text-base font-semibold text-slate-900 dark:text-white">{quote?.productId?.name || 'Product'}</h4><StatusBadge status={quote.status} /></div><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{quote?.productId?.description || t('project.noDescription')}</p></div>
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-right dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Total price</p><p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{formatCurrency(quote.totalPrice)}</p></div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Quantity</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{quote.quantity}</p></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Unit price</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(quote.unitPrice)}</p></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Manufacturer</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{quote?.manufacturerId?.name || 'Manufacturer'}</p></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Requested on</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{formatDisplayDate(quote.createdAt)}</p></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Artisan</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{quote?.artisanId?.name || 'Assigned artisan'}</p></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {role === 'expert' && quote.status === 'pending' ? (
                        <>
                          <button type="button" disabled={reviewingQuoteId === quote.id} onClick={() => reviewQuote(quote.id, 'accepted')} className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-200/50 transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-orange-950/25">{reviewingQuoteId === quote.id ? t('common.saving') : 'Accept'}</button>
                          <button type="button" disabled={reviewingQuoteId === quote.id} onClick={() => reviewQuote(quote.id, 'rejected')} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800">Reject</button>
                        </>
                      ) : null}
                      {role === 'artisan' && quote.status === 'accepted' ? <button type="button" disabled={hasInvoice || generatingInvoiceId === quote.id} onClick={() => confirmPurchase(quote.id)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">{hasInvoice ? 'Invoice generated' : generatingInvoiceId === quote.id ? 'Confirming...' : 'Confirm Purchase'}</button> : null}
                      {hasInvoice ? <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Invoice linked to this quote</span> : null}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : <p className="text-sm text-slate-500 dark:text-slate-300">No quotes have been requested for this project yet.</p>}
        </div>
      ) : null}

      {activeTab === 'invoices' ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
          <div className="mb-4"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('invoices')}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Archive and review purchase invoices inside this project.</p></div>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input type="date" value={invoiceFilters.dateFrom} onChange={(event) => setInvoiceFilters((current) => ({ ...current, dateFrom: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20" />
            <input type="date" value={invoiceFilters.dateTo} onChange={(event) => setInvoiceFilters((current) => ({ ...current, dateTo: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20" />
            <select value={invoiceFilters.status} onChange={(event) => setInvoiceFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20"><option value="">All statuses</option><option value="generated">Generated</option></select>
            <select value={invoiceFilters.sort} onChange={(event) => setInvoiceFilters((current) => ({ ...current, sort: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
          </div>
          {loadingInvoices ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">{t('common.loading')}</p>
          ) : filteredInvoices.length ? (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <article key={invoice.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-slate-950/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div><div className="flex flex-wrap items-center gap-3"><h4 className="text-base font-semibold text-slate-900 dark:text-white">{invoice?.productId?.name || 'Invoice'}</h4><StatusBadge status={invoice.status} /></div><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{`Invoice #${String(invoice.id).slice(-6).toUpperCase()}`}</p></div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-right dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Total price</p><p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{formatCurrency(invoice.totalPrice)}</p></div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Issued at</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{formatDisplayDate(invoice.issuedAt)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Quantity</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{invoice.quantity}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Manufacturer</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{invoice?.manufacturerId?.name || 'Manufacturer'}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Artisan</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{invoice?.artisanId?.name || 'Assigned artisan'}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70"><p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Quote status</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{invoice?.quoteId?.status || 'accepted'}</p></div>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500 dark:text-slate-300">No invoices have been generated for this project yet.</p>}
        </div>
      ) : null}

      {quoteProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Request Quote</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{quoteProduct.name}</p></div>
              <button type="button" onClick={() => setQuoteProduct(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800">Close</button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Quantity</span><input type="number" min="1" max={Number(quoteProduct.stock ?? 0) > 0 ? quoteProduct.stock : undefined} value={quoteQuantity} onChange={(event) => setQuoteQuantity(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/20" /></label>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/80"><div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-300"><span>Unit price</span><span>{formatCurrency(quoteProduct.price)}</span></div><div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white"><span>Total price</span><span>{formatCurrency(Number(quoteProduct.price || 0) * Number(quoteQuantity || 1))}</span></div></div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setQuoteProduct(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800">Cancel</button>
              <button type="button" disabled={submittingQuote} onClick={requestQuote} className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200/50 transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-orange-950/25">{submittingQuote ? t('common.saving') : 'Submit'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ProjectDetails
