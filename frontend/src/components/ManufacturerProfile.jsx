import { Suspense, lazy } from 'react'

const ManufacturerDashboard = lazy(() => import('../pages/manufacturer/ManufacturerDashboard'))

function ManufacturerShell() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400" role="status">
      Loading workspace…
    </div>
  )
}

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
    <Suspense fallback={<ManufacturerShell />}>
      <ManufacturerDashboard
        user={user}
        currentPath={currentPath}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onProfileUpdate={onProfileUpdate}
        onCancelSubscription={onCancelSubscription}
        cancellingSubscription={cancellingSubscription}
      />
    </Suspense>
  )
}

export default ManufacturerProfile
