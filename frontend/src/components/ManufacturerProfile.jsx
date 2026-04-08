import ManufacturerDashboard from '../pages/manufacturer/ManufacturerDashboard'

function ManufacturerProfile({
  user,
  onLogout,
  onProfileUpdate,
  onCancelSubscription,
  cancellingSubscription = false,
}) {
  return (
    <ManufacturerDashboard
      user={user}
      onLogout={onLogout}
      onProfileUpdate={onProfileUpdate}
      onCancelSubscription={onCancelSubscription}
      cancellingSubscription={cancellingSubscription}
    />
  )
}

export default ManufacturerProfile
