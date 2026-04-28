import ManufacturerDashboard from '../pages/manufacturer/ManufacturerDashboard'

function ManufacturerProfile({
  user,
  currentPath,
  onNavigate,
  onLogout,
  onProfileUpdate,
  onCancelSubscription,
  cancellingSubscription = false,
}) {
  return (
    <ManufacturerDashboard
      user={user}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onProfileUpdate={onProfileUpdate}
      onCancelSubscription={onCancelSubscription}
      cancellingSubscription={cancellingSubscription}
    />
  )
}

export default ManufacturerProfile
