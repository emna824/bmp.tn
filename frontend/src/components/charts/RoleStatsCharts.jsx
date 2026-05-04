import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api, { withUserHeaders } from '../../api'
import ChartCard from './ChartCard'

const COLORS = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2']

function hasValues(rows = [], keys = ['value']) {
  return rows.some((row) => keys.some((key) => Number(row?.[key] || 0) > 0))
}

function formatLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function shortName(value) {
  const text = String(value || 'Unknown')
  return text.length > 16 ? `${text.slice(0, 16)}...` : text
}

function valueFormatter(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return value
  return numericValue.toLocaleString()
}

function AppTooltip(props) {
  return (
    <Tooltip
      {...props}
      formatter={(value, name) => [valueFormatter(value), formatLabel(name)]}
      labelFormatter={(label) => formatLabel(label)}
      contentStyle={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.35)',
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.16)',
      }}
    />
  )
}

function LineMetricChart({ data, dataKey, stroke = COLORS[0], suffix = '' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}${suffix}`} />
        <AppTooltip />
        <Legend />
        <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function VerticalBarMetricChart({ data, bars, xKey = 'name' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={shortName} tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <AppTooltip />
        <Legend />
        {bars.map((bar, index) => (
          <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color || COLORS[index]} radius={[8, 8, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function HorizontalBarMetricChart({ data, dataKey }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 18, left: 18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tickFormatter={shortName} tickLine={false} axisLine={false} width={96} />
        <AppTooltip />
        <Legend />
        <Bar dataKey={dataKey} fill={COLORS[1]} radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function PieMetricChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={86} paddingAngle={4}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <AppTooltip />
        <Legend formatter={(value) => formatLabel(value)} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function useRoleStats(role, userId) {
  const [state, setState] = useState({ loading: true, error: '', data: null })

  const loadStats = useCallback(async () => {
    if (!role || !userId) {
      setState({ loading: false, error: '', data: null })
      return
    }

    setState((current) => ({ ...current, loading: true, error: '' }))

    try {
      const response = await api.get(`/stats/${role}`, withUserHeaders(userId))
      setState({ loading: false, error: '', data: response.data || {} })
    } catch (error) {
      setState({
        loading: false,
        error: error.response?.data?.message || 'Failed to load chart data',
        data: null,
      })
    }
  }, [role, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStats()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadStats])

  return { ...state, reload: loadStats }
}

function ErrorPanel({ message, onRetry }) {
  if (!message) return null

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        <button
          type="button"
          className="rounded-lg border border-rose-200 px-3 py-1 font-semibold dark:border-rose-500/30"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    </div>
  )
}

function ArtisanCharts({ data, loading }) {
  const spending = data?.spendingOverTime || []
  const quotes = data?.quotesStatus || []
  const workload = data?.projectWorkload || []

  return (
    <>
      <ChartCard title="Spending over time" subtitle="Invoices total per month" loading={loading} empty={!hasValues(spending, ['total'])}>
        <LineMetricChart data={spending} dataKey="total" stroke={COLORS[0]} />
      </ChartCard>
      <ChartCard title="Quotes status" subtitle="Pending, accepted, and rejected requests" loading={loading} empty={!hasValues(quotes)}>
        <PieMetricChart data={quotes} />
      </ChartCard>
      <ChartCard title="Project workload" subtitle="Number of tasks per project" loading={loading} empty={!hasValues(workload, ['tasks'])}>
        <VerticalBarMetricChart data={workload} bars={[{ key: 'tasks', name: 'Tasks', color: COLORS[2] }]} />
      </ChartCard>
    </>
  )
}

function ExpertCharts({ data, loading }) {
  const performance = data?.projectPerformance || []
  const validation = data?.quoteValidationStats || []
  const timeline = data?.projectTimeline || []

  return (
    <>
      <ChartCard title="Project performance" subtitle="Budget compared with current spend" loading={loading} empty={!hasValues(performance, ['budget', 'spent'])}>
        <VerticalBarMetricChart
          data={performance}
          bars={[
            { key: 'budget', name: 'Budget', color: COLORS[0] },
            { key: 'spent', name: 'Spent', color: COLORS[1] },
          ]}
        />
      </ChartCard>
      <ChartCard title="Quote validation stats" subtitle="Accepted versus rejected quotes" loading={loading} empty={!hasValues(validation)}>
        <PieMetricChart data={validation} />
      </ChartCard>
      <ChartCard title="Project timeline" subtitle="Milestone progress over time" loading={loading} empty={!hasValues(timeline, ['progress'])}>
        <LineMetricChart data={timeline} dataKey="progress" stroke={COLORS[4]} suffix="%" />
      </ChartCard>
    </>
  )
}

function ManufacturerCharts({ data, loading }) {
  const sales = data?.productSales || []
  const revenue = data?.revenueOverTime || []
  const topProducts = data?.topProducts || []

  return (
    <>
      <ChartCard title="Product sales" subtitle="Units sold per product" loading={loading} empty={!hasValues(sales, ['sales'])}>
        <VerticalBarMetricChart data={sales} bars={[{ key: 'sales', name: 'Sales', color: COLORS[0] }]} />
      </ChartCard>
      <ChartCard title="Revenue over time" subtitle="Monthly revenue from generated invoices" loading={loading} empty={!hasValues(revenue, ['revenue'])}>
        <LineMetricChart data={revenue} dataKey="revenue" stroke={COLORS[1]} />
      </ChartCard>
      <ChartCard title="Top products" subtitle="Highest revenue products" loading={loading} empty={!hasValues(topProducts, ['revenue'])}>
        <HorizontalBarMetricChart data={topProducts} dataKey="revenue" />
      </ChartCard>
    </>
  )
}

function AdminCharts({ data, loading }) {
  const revenue = data?.totalRevenue || []
  const users = data?.usersGrowth || []
  const logs = data?.activityLogs || []
  const usage = data?.systemUsage || []

  return (
    <>
      <ChartCard title="Total revenue" subtitle="Monthly platform revenue" loading={loading} empty={!hasValues(revenue, ['revenue'])}>
        <LineMetricChart data={revenue} dataKey="revenue" stroke={COLORS[1]} />
      </ChartCard>
      <ChartCard title="Users growth" subtitle="New users by month" loading={loading} empty={!hasValues(users, ['users'])}>
        <LineMetricChart data={users} dataKey="users" stroke={COLORS[0]} />
      </ChartCard>
      <ChartCard title="Activity logs" subtitle="Logged actions by type" loading={loading} empty={!hasValues(logs, ['count'])}>
        <VerticalBarMetricChart data={logs} bars={[{ key: 'count', name: 'Logs', color: COLORS[4] }]} />
      </ChartCard>
      <ChartCard title="System usage" subtitle="Users by role" loading={loading} empty={!hasValues(usage)}>
        <PieMetricChart data={usage} />
      </ChartCard>
    </>
  )
}

function RoleStatsCharts({ role, userId, title = 'Analytics' }) {
  const { data, loading, error, reload } = useRoleStats(role, userId)
  const Charts = useMemo(
    () =>
      ({
        artisan: ArtisanCharts,
        expert: ExpertCharts,
        manufacturer: ManufacturerCharts,
        admin: AdminCharts,
      })[role],
    [role],
  )

  if (!Charts) return null

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">{title}</p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Performance charts</h2>
        </div>
        <button
          type="button"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          onClick={reload}
        >
          Refresh charts
        </button>
      </div>

      <ErrorPanel message={error} onRetry={reload} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Charts data={data || {}} loading={loading} />
      </div>
    </section>
  )
}

export default RoleStatsCharts
