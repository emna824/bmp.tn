import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import api, { withUserHeaders } from '../api'
import { BotIcon, CheckCircleIcon, CloseIcon, UserIcon } from './Icons'
import { getSingleFaceDescriptor, loadFaceModels } from '../utils/faceRecognition'

const videoConstraints = {
  facingMode: 'user',
  width: { ideal: 720 },
  height: { ideal: 540 },
}

function FaceAuthModal({
  mode = 'login',
  user,
  staySignedIn = false,
  onClose,
  onSuccess,
}) {
  const webcamRef = useRef(null)
  const [status, setStatus] = useState('loading-models')
  const [message, setMessage] = useState('Loading face recognition models...')
  const [cameraReady, setCameraReady] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const isRegisterMode = mode === 'register'

  useEffect(() => {
    let active = true

    loadFaceModels()
      .then(() => {
        if (!active) return
        setStatus('ready')
        setMessage('Position your face inside the scanner.')
      })
      .catch(() => {
        if (!active) return
        setStatus('error')
        setMessage('Face models could not be loaded. Please refresh and try again.')
      })

    return () => {
      active = false
    }
  }, [])

  const handleCameraReady = () => {
    setCameraReady(true)
    if (status !== 'processing' && status !== 'success') {
      setStatus('ready')
      setMessage('Camera ready. Keep one face visible and scan.')
    }
  }

  const handleCameraError = () => {
    setCameraReady(false)
    setStatus('error')
    setMessage('Camera permission was denied or no webcam is available.')
  }

  const handleScan = async () => {
    if (!cameraReady || status === 'processing') return

    setStatus('processing')
    setMessage(isRegisterMode ? 'Registering your face...' : 'Matching your face...')

    try {
      const descriptor = await getSingleFaceDescriptor(webcamRef.current?.video)

      if (isRegisterMode) {
        await api.post('/face/register', { descriptor }, withUserHeaders(user?.id || user?._id))
        setStatus('success')
        setMessage('Face registered successfully.')
        onSuccess?.({ hasFaceDescriptor: true })
        return
      }

      const response = await api.post('/face/login', { descriptor })
      setStatus('success')
      setMessage(response.data?.message || 'Face login successful.')
      onSuccess?.({
        user: response.data?.user,
        token: response.data?.token,
        match: response.data?.match,
        staySignedIn,
      })
    } catch (error) {
      setAttempts((current) => current + 1)
      setStatus('error')
      setMessage(error.response?.data?.message || error.message || 'Face authentication failed.')
    }
  }

  const canScan = cameraReady && status !== 'loading-models' && status !== 'processing' && status !== 'success'

  return (
    <div className="face-auth-overlay" role="dialog" aria-modal="true" aria-labelledby="face-auth-title">
      <section className={`face-auth-modal ${status}`}>
        <div className="face-auth-header">
          <div>
            <p className="admin-eyebrow">{isRegisterMode ? 'Face enrollment' : 'Face login'}</p>
            <h3 id="face-auth-title">
              {isRegisterMode ? 'Register your face' : 'Login with Face'}
            </h3>
          </div>
          <button type="button" className="face-icon-btn" onClick={onClose} aria-label="Close face authentication">
            <CloseIcon className="icon tiny" />
          </button>
        </div>

        <div className="face-camera-shell">
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            onUserMedia={handleCameraReady}
            onUserMediaError={handleCameraError}
            className="face-camera"
          />
          <div className="face-scan-frame" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="face-scan-orbit" aria-hidden="true" />
        </div>

        <div className={`face-status ${status}`}>
          {status === 'success' ? <CheckCircleIcon className="icon tiny" /> : <BotIcon className="icon tiny" />}
          <p>{message}</p>
        </div>

        <div className="face-auth-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={handleScan} disabled={!canScan}>
            {status === 'processing' ? <span className="btn-loader" aria-hidden="true" /> : <UserIcon className="icon tiny" />}
            {status === 'processing' ? 'Scanning...' : attempts > 0 ? 'Retry scan' : 'Scan face'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default FaceAuthModal

