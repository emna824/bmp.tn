import { BmpLogo, HomeIcon, MarketplaceIcon, SettingsIcon } from '../Icons'

function Sidebar({ items, activeView, onNavigate }) {
  const getIcon = (key) => {
    if (key === 'dashboard') return HomeIcon
    if (key === 'products') return MarketplaceIcon
    if (key === 'add') return MarketplaceIcon
    return SettingsIcon
  }

  return (
    <aside className="manufacturer-shell-sidebar">
      <div className="manufacturer-shell-brand">
        <BmpLogo className="manufacturer-shell-logo" />
        <div>
          <strong>BMP.tn</strong>
          <p>Manufacturer space</p>
        </div>
      </div>

      <nav className="manufacturer-shell-nav" aria-label="Manufacturer pages">
        {items.map((item) => {
          const Icon = getIcon(item.key)
          return (
            <button
              key={item.key}
              type="button"
              className={`manufacturer-shell-link ${activeView === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <Icon className="icon" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
