import ManufacturerDashboard from '../pages/manufacturer/ManufacturerDashboard'

function ManufacturerProfile({ user, onLogout }) {
  return <ManufacturerDashboard user={user} onLogout={onLogout} />
}

export default ManufacturerProfile
