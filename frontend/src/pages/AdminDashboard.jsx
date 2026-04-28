import { useEffect, useState } from 'react'
import api from '../api'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { HomeIcon, MarketplaceIcon, ShieldIcon, UserIcon } from '../components/Icons'
import ProductsPage from './ProductsPage'
import ReportsPage from './ReportsPage'
import UsersPage from './UsersPage'
import { normalizeProduct, normalizeReport, normalizeUser, withAdminHeaders } from '../utils/adminDashboard'

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Overview and alerts',
    icon: HomeIcon,
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Resolve reported content',
    icon: ShieldIcon,
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Ban or restore accounts',
    icon: UserIcon,
  },
  {
    key: 'products',
    label: 'Products',
    description: 'Remove risky listings',
    icon: MarketplaceIcon,
  },
]

function AdminDashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState('dashboard')
  const [overview, setOverview] = useState({
    loading: true,
    error: '',
    reports: 0,
    pendingReports: 0,
    users: 0,
    bannedUsers: 0,
    products: 0,
  })

  const loadOverview = async () => {
    setOverview((current) => ({ ...current, loading: true, error: '' }))

    try {
      const [reportsResponse, usersResponse, productsResponse] = await Promise.all([
        api.get('/reports', withAdminHeaders(user)),
        api.get('/users', withAdminHeaders(user)),
        (async () => {
          try {
            return await api.get('/products', withAdminHeaders(user))
          } catch (requestError) {
            if (requestError.response?.status !== 404) throw requestError
            return api.get('/manufacturers/products', withAdminHeaders(user))
          }
        })(),
      ])

      const reports = (reportsResponse.data?.reports || []).map((item) => normalizeReport(item))
      const users = (usersResponse.data || []).map((item) => normalizeUser(item))
      const products = (productsResponse.data?.products || productsResponse.data || []).map((item) =>
        normalizeProduct(item),
      )

      setOverview({
        loading: false,
        error: '',
        reports: reports.length,
        pendingReports: reports.filter((item) => item.status === 'pending').length,
        users: users.length,
        bannedUsers: users.filter((item) => item.isBanned).length,
        products: products.length,
      })
    } catch (requestError) {
      setOverview((current) => ({
        ...current,
        loading: false,
        error: requestError.response?.data?.message || 'Failed to load admin overview',
      }))
    }
  }

  useEffect(() => {
    loadOverview()
  }, [user?.id])

  const handleNavigate = (nextView) => {
    setActiveView(nextView)
  }

  const renderActivePage = () => {
    if (activeView === 'reports') {
      return <ReportsPage user={user} />
    }

    if (activeView === 'users') {
      return <UsersPage user={user} />
    }

    if (activeView === 'products') {
      return <ProductsPage user={user} />
    }

    return (
      <section className="admin-page-stack">
        <div className="admin-hero-panel">
          <div>
            <p className="admin-eyebrow">Moderation center</p>
            <h2>Keep the platform healthy and trusted</h2>
            <p>
              Review incoming reports, track risky accounts, and remove problematic products from a
              single dashboard.
            </p>
          </div>
          <button
            type="button"
            className="admin-action-btn admin-action-neutral"
            onClick={loadOverview}
          >
            {overview.loading ? 'Refreshing...' : 'Refresh overview'}
          </button>
        </div>

        {overview.error ? <div className="admin-banner error">{overview.error}</div> : null}

        <div className="admin-overview-grid">
          <article className="admin-stat-card">
            <span>Total reports</span>
            <strong>{overview.loading ? '...' : overview.reports}</strong>
            <p>All moderation cases received by the platform.</p>
          </article>

          <article className="admin-stat-card accent">
            <span>Pending reports</span>
            <strong>{overview.loading ? '...' : overview.pendingReports}</strong>
            <p>Cases still waiting for moderation action.</p>
          </article>

          <article className="admin-stat-card">
            <span>Banned users</span>
            <strong>{overview.loading ? '...' : overview.bannedUsers}</strong>
            <p>Accounts currently blocked from using the platform.</p>
          </article>

          <article className="admin-stat-card">
            <span>Marketplace products</span>
            <strong>{overview.loading ? '...' : overview.products}</strong>
            <p>Total products currently visible in the catalog.</p>
          </article>
        </div>

        <div className="admin-info-grid">
          <article className="admin-panel">
            <p className="admin-eyebrow">Workflow</p>
            <h3>How moderation works</h3>
            <ul className="admin-list">
              <li>Accepting a product report removes the reported marketplace listing.</li>
              <li>Accepting a user report triggers a permanent ban from the reports page.</li>
              <li>Rejecting a report marks it as reviewed without changing the target.</li>
            </ul>
          </article>

          <article className="admin-panel">
            <p className="admin-eyebrow">Coverage</p>
            <h3>Admin sections</h3>
            <ul className="admin-list">
              <li>Reports: review user and product complaints.</li>
              <li>Users: ban or unban platform accounts.</li>
              <li>Products: inspect and delete marketplace listings.</li>
            </ul>
          </article>
        </div>
      </section>
    )
  }

  return (
    <div className="admin-shell">
      <Sidebar items={NAV_ITEMS} activeView={activeView} onNavigate={handleNavigate} />

      <div className="admin-main">
        <Topbar user={user} onLogout={onLogout} />
        <main className="admin-content">{renderActivePage()}</main>
      </div>
    </div>
  )
}

export default AdminDashboard
