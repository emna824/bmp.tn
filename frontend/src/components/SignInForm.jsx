import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { BmpLogo, LockIcon, MailIcon, SettingsIcon } from './Icons'

const initialForm = {
  email: '',
  password: '',
}

function SignInForm({ onLoginSuccess }) {
  const { t } = useTranslation()
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
  const [staySignedIn, setStaySignedIn] = useState(false)
  const googleButtonRef = useRef(null)
  const googleInitializedRef = useRef(false)

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

    if (!form.email.trim()) nextErrors.email = t('auth.signIn.errors.emailRequired')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = t('auth.signIn.errors.invalidEmail')
    if (!form.password) nextErrors.password = t('auth.signIn.errors.passwordRequired')

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

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId || googleInitializedRef.current) return undefined

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return
      googleInitializedRef.current = true
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
      })
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        shape: 'pill',
      })
    }
    document.body.appendChild(script)
    return () => {
      script.remove()
    }
  }, [])

  const onSendResetCode = async () => {
    const nextErrors = {}
    if (!forgotForm.email.trim()) nextErrors.email = t('auth.signIn.errors.emailRequired')
    if (!/^\S+@\S+\.\S+$/.test(forgotForm.email)) nextErrors.email = t('auth.signIn.errors.invalidEmail')

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
        text: response.data?.message || t('auth.signIn.resetSent'),
      })
    } catch (error) {
      const message = error.response?.data?.message || t('auth.signIn.sendResetFailed')
      setNotification({ show: true, type: 'error', text: message })
    } finally {
      setForgotLoading(false)
    }
  }

  const onResetPassword = async () => {
    const nextErrors = {}
    if (!forgotForm.email.trim()) nextErrors.email = t('auth.signIn.errors.emailRequired')
    if (!/^\S+@\S+\.\S+$/.test(forgotForm.email)) nextErrors.email = t('auth.signIn.errors.invalidEmail')
    if (!forgotForm.code.trim()) nextErrors.code = t('auth.signIn.errors.codeRequired')
    if (!forgotForm.newPassword) nextErrors.newPassword = t('auth.signIn.errors.newPasswordRequired')
    if (forgotForm.newPassword && forgotForm.newPassword.length < 8) {
      nextErrors.newPassword = t('auth.signIn.errors.minPassword')
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
        text: response.data?.message || t('auth.signIn.resetSuccess'),
      })
      setShowForgotPassword(false)
      setForgotErrors({})
      setForgotForm((prev) => ({ ...prev, code: '', newPassword: '' }))
    } catch (error) {
      const message = error.response?.data?.message || t('auth.signIn.resetFailed')
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
        text: t('auth.signIn.fixErrors'),
      })
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/users/login', {
        email: form.email,
        password: form.password,
      })

      setResult({ type: 'success', text: response.data?.message || t('auth.signIn.success') })
      setNotification({
        show: true,
        type: 'success',
        text: t('auth.signIn.success'),
      })
      if (onLoginSuccess && response.data?.user) {
        onLoginSuccess(response.data.user, staySignedIn)
      }
      setForm(initialForm)
      setErrors({})
    } catch (error) {
      const message = error.response?.data?.message || t('auth.signIn.failed')
      setResult({ type: 'error', text: message })
      setNotification({ show: true, type: 'error', text: message })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (credentialResponse) => {
    const idToken = credentialResponse?.credential
    if (!idToken) return

    setLoading(true)
    try {
      const response = await api.post('/users/google-login', { idToken })
      const message = response.data?.message || t('auth.signIn.googleSuccess')

      setResult({ type: 'success', text: message })
      setNotification({ show: true, type: 'success', text: message })

      if (onLoginSuccess && response.data?.user) {
        onLoginSuccess(response.data.user, staySignedIn)
      }
    } catch (error) {
      const message = error.response?.data?.message || t('auth.signIn.googleFailed')
      setResult({ type: 'error', text: message })
      setNotification({ show: true, type: 'error', text: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        className={`notification ${notification.show ? 'show' : ''} ${notification.type || ''}`}
        role="status"
        aria-live="polite"
      >
        {notification.text}
      </div>

      <section className="register-card">
        <div className="brand-lockup">
          <BmpLogo className="auth-brand-logo" />
          <div>
            <strong>BMP.tn</strong>
            <p>{t('auth.signIn.brandSubtitle')}</p>
          </div>
        </div>
        <h1>{t('auth.signIn.title')}</h1>
        <p className="subtitle">{t('auth.signIn.subtitle')}</p>

        <form onSubmit={onSubmit} noValidate>
          <label>
            <span className="label-with-icon">
              <MailIcon className="icon tiny" />
              {t('common.email')}
            </span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder={t('auth.signIn.placeholders.email')}
            />
            {errors.email && <small>{errors.email}</small>}
        </label>


          <label>
            <span className="label-with-icon">
              <LockIcon className="icon tiny" />
              {t('common.password')}
            </span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder={t('auth.signIn.placeholders.password')}
            />
            {errors.password && <small>{errors.password}</small>}
          </label>

          <label className="stay-signed-in">
            <input
              type="checkbox"
              checked={staySignedIn}
              onChange={(e) => setStaySignedIn(e.target.checked)}
            />
            <span>{t('auth.signIn.staySignedIn')}</span>
          </label>

          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setShowForgotPassword((prev) => !prev)
              setForgotForm((prev) => ({ ...prev, email: form.email }))
            }}
          >
            <SettingsIcon className="icon tiny" />
            {showForgotPassword ? t('auth.signIn.closeForgotPassword') : t('auth.signIn.forgotPassword')}
          </button>

          {showForgotPassword ? (
            <div className="forgot-box">
              <label>
                {t('auth.signIn.accountEmail')}
                <input
                  name="email"
                  type="email"
                  value={forgotForm.email}
                  onChange={onForgotChange}
                  placeholder={t('auth.signIn.placeholders.email')}
                />
                {forgotErrors.email && <small>{forgotErrors.email}</small>}
              </label>

              <button
                type="button"
                className="secondary-btn"
                onClick={onSendResetCode}
                disabled={forgotLoading}
              >
                <MailIcon className="icon tiny" />
                {forgotLoading ? t('auth.signIn.sending') : t('auth.signIn.sendResetCode')}
              </button>

              <label>
                {t('auth.signIn.resetCode')}
                <input
                  name="code"
                  value={forgotForm.code}
                  onChange={onForgotChange}
                  placeholder={t('auth.signIn.placeholders.code')}
                  inputMode="numeric"
                />
                {forgotErrors.code && <small>{forgotErrors.code}</small>}
              </label>

              <label>
                {t('auth.signIn.newPassword')}
                <input
                  name="newPassword"
                  type="password"
                  value={forgotForm.newPassword}
                  onChange={onForgotChange}
                  placeholder={t('auth.signIn.placeholders.newPassword')}
                />
                {forgotErrors.newPassword && <small>{forgotErrors.newPassword}</small>}
              </label>

              <button
                type="button"
                className="secondary-btn"
                onClick={onResetPassword}
                disabled={forgotLoading}
              >
                <LockIcon className="icon tiny" />
                {forgotLoading ? t('auth.signIn.resetting') : t('auth.signIn.resetPassword')}
              </button>
            </div>
          ) : null}

          <button disabled={loading} type="submit">
            <LockIcon className="icon tiny" />
            {loading ? <span className="btn-loader" aria-hidden="true" /> : null}
            {loading ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
          </button>
        </form>

        <div className="or-divider" role="separator" aria-label={t('auth.signIn.orContinueWith')} />
        <div
          ref={googleButtonRef}
          className="google-button-slot"
          aria-label={t('auth.signIn.googleLabel')}
        />

        {result.text ? <p className={`result ${result.type}`}>{result.text}</p> : null}
      </section>
    </>
  )
}

export default SignInForm
