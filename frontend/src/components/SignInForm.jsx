import { useEffect, useState } from 'react'
import api from '../api'

const initialForm = {
  email: '',
  password: '',
}

function SignInForm() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotForm, setForgotForm] = useState({
    email: '',
    code: '',
    newPassword: '',
  })
  const [forgotErrors, setForgotErrors] = useState({})
  const [result, setResult] = useState({ type: '', text: '' })
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'email') {
      setForgotForm((prev) => ({ ...prev, email: value }))
    }
  }

  const onForgotChange = (event) => {
    const { name, value } = event.target
    setForgotForm((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.email.trim()) nextErrors.email = 'Email is required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Invalid email'
    if (!form.password) nextErrors.password = 'Password is required'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  useEffect(() => {
    if (!notification.show) return undefined
    const timer = setTimeout(() => {
      setNotification({ show: false, type: '', text: '' })
    }, 3000)
    return () => clearTimeout(timer)
  }, [notification])

  const onSendResetCode = async () => {
    const nextErrors = {}
    if (!forgotForm.email.trim()) nextErrors.email = 'Email is required'
    if (!/^\S+@\S+\.\S+$/.test(forgotForm.email)) nextErrors.email = 'Invalid email'

    setForgotErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setForgotLoading(true)
    try {
      const response = await api.post('/users/forgot-password', {
        email: forgotForm.email,
      })

      setNotification({
        show: true,
        type: 'success',
        text: response.data?.message || 'Reset code sent to your email.',
      })
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset code'
      setNotification({ show: true, type: 'error', text: message })
    } finally {
      setForgotLoading(false)
    }
  }

  const onResetPassword = async () => {
    const nextErrors = {}
    if (!forgotForm.email.trim()) nextErrors.email = 'Email is required'
    if (!/^\S+@\S+\.\S+$/.test(forgotForm.email)) nextErrors.email = 'Invalid email'
    if (!forgotForm.code.trim()) nextErrors.code = 'Reset code is required'
    if (!forgotForm.newPassword) nextErrors.newPassword = 'New password is required'
    if (forgotForm.newPassword && forgotForm.newPassword.length < 8) {
      nextErrors.newPassword = 'Min 8 characters'
    }

    setForgotErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setForgotLoading(true)
    try {
      const response = await api.post('/users/reset-password', {
        email: forgotForm.email,
        code: forgotForm.code,
        newPassword: forgotForm.newPassword,
      })

      setNotification({
        show: true,
        type: 'success',
        text: response.data?.message || 'Password reset successful.',
      })
      setShowForgotPassword(false)
      setForgotErrors({})
      setForgotForm((prev) => ({ ...prev, code: '', newPassword: '' }))
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password'
      setNotification({ show: true, type: 'error', text: message })
    } finally {
      setForgotLoading(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setResult({ type: '', text: '' })

    if (!validate()) {
      setNotification({
        show: true,
        type: 'error',
        text: 'Please fix form errors before submitting.',
      })
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/users/login', {
        email: form.email,
        password: form.password,
      })

      setResult({ type: 'success', text: response.data?.message || 'Signed in successfully' })
      setNotification({
        show: true,
        type: 'success',
        text: 'Signed in successfully.',
      })
      setForm(initialForm)
      setErrors({})
    } catch (error) {
      const message = error.response?.data?.message || 'Sign in failed'
      setResult({ type: 'error', text: message })
      setNotification({ show: true, type: 'error', text: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div
        className={`notification ${notification.show ? 'show' : ''} ${notification.type || ''}`}
        role="status"
        aria-live="polite"
      >
        {notification.text}
      </div>

      <section className="register-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to your account</p>

        <form onSubmit={onSubmit} noValidate>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@email.com"
            />
            {errors.email && <small>{errors.email}</small>}
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Your password"
            />
            {errors.password && <small>{errors.password}</small>}
          </label>

          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setShowForgotPassword((prev) => !prev)
              setForgotForm((prev) => ({ ...prev, email: form.email }))
            }}
          >
            {showForgotPassword ? 'Close forgot password' : 'Forgot password?'}
          </button>

          {showForgotPassword ? (
            <div className="forgot-box">
              <label>
                Account Email
                <input
                  name="email"
                  type="email"
                  value={forgotForm.email}
                  onChange={onForgotChange}
                  placeholder="you@email.com"
                />
                {forgotErrors.email && <small>{forgotErrors.email}</small>}
              </label>

              <button
                type="button"
                className="secondary-btn"
                onClick={onSendResetCode}
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Sending...' : 'Send reset code'}
              </button>

              <label>
                Reset Code
                <input
                  name="code"
                  value={forgotForm.code}
                  onChange={onForgotChange}
                  placeholder="6-digit code"
                  inputMode="numeric"
                />
                {forgotErrors.code && <small>{forgotErrors.code}</small>}
              </label>

              <label>
                New Password
                <input
                  name="newPassword"
                  type="password"
                  value={forgotForm.newPassword}
                  onChange={onForgotChange}
                  placeholder="Minimum 8 characters"
                />
                {forgotErrors.newPassword && <small>{forgotErrors.newPassword}</small>}
              </label>

              <button
                type="button"
                className="secondary-btn"
                onClick={onResetPassword}
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Resetting...' : 'Reset password'}
              </button>
            </div>
          ) : null}

          <button disabled={loading} type="submit">
            {loading ? <span className="btn-loader" aria-hidden="true" /> : null}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {result.text ? <p className={`result ${result.type}`}>{result.text}</p> : null}
      </section>
    </div>
  )
}

export default SignInForm
