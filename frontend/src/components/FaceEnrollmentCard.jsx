import { Suspense, lazy, useState } from 'react'
import { BotIcon, CheckCircleIcon } from './Icons'

const FaceAuthModal = lazy(() => import('./FaceAuthModal'))

function FaceEnrollmentCard({ user, onRegistered }) {
  const [isOpen, setIsOpen] = useState(false)
  const [registered, setRegistered] = useState(Boolean(user?.hasFaceDescriptor))

  const handleSuccess = () => {
    setRegistered(true)
    onRegistered?.()
    window.setTimeout(() => setIsOpen(false), 900)
  }

  return (
    <article className="face-enrollment-card">
      <div>
        <p className="admin-eyebrow">Facial recognition</p>
        <h4>{registered ? 'Face login enabled' : 'Register Face'}</h4>
        <p className="subtitle">
          Store a secure face descriptor vector for quick password-free authentication.
        </p>
      </div>
      <div className="face-enrollment-actions">
        <span className={`face-enrollment-badge ${registered ? 'ready' : ''}`}>
          {registered ? <CheckCircleIcon className="icon tiny" /> : <BotIcon className="icon tiny" />}
          {registered ? 'Registered' : 'Not registered'}
        </span>
        <button type="button" onClick={() => setIsOpen(true)}>
          <BotIcon className="icon tiny" />
          {registered ? 'Update Face' : 'Register Face'}
        </button>
      </div>

      {isOpen ? (
        <Suspense fallback={null}>
          <FaceAuthModal
            mode="register"
            user={user}
            onClose={() => setIsOpen(false)}
            onSuccess={handleSuccess}
          />
        </Suspense>
      ) : null}
    </article>
  )
}

export default FaceEnrollmentCard
