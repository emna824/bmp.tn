import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { BmpLogo, LockIcon, MailIcon, ShieldIcon, UserIcon } from './Icons'

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'expert',
  patent: '',
  address: '',
  companyPhone: '',
}

function SignUpForm({ onRegisterSuccess }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState({ type: '', text: '' })
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })

  const isManufacturer = useMemo(() => form.role === 'manufacturer', [form.role])

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'role' && value !== 'manufacturer') {
        next.patent = ''
        next.address = ''
        next.companyPhone = ''
      }
      return next
    })
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = t('auth.signUp.errors.nameRequired')
    if (!form.email.trim()) nextErrors.email = t('auth.signUp.errors.emailRequired')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = t('auth.signUp.errors.invalidEmail')
    if (!form.password) nextErrors.password = t('auth.signUp.errors.passwordRequired')
    if (form.password.length < 8) nextErrors.password = t('auth.signUp.errors.minPassword')

    if (isManufacturer) {
      if (!form.patent.trim()) nextErrors.patent = t('auth.signUp.errors.patentRequired')
      if (!form.address.trim()) nextErrors.address = t('auth.signUp.errors.addressRequired')
      if (!form.companyPhone.trim()) nextErrors.companyPhone = t('auth.signUp.errors.companyPhoneRequired')
    }

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

  const onSubmit = async (event) => {
    event.preventDefault()
    setResult({ type: '', text: '' })

    if (!validate()) {
      setNotification({
        show: true,
        type: 'error',
        text: t('auth.signUp.fixErrors'),
      })
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      }

      if (isManufacturer) {
        payload.patent = form.patent
        payload.address = form.address
        payload.companyPhone = form.companyPhone
      }

      const response = await api.post('/users/register', payload)
      setResult({ type: 'success', text: response.data?.message || t('auth.signUp.registered') })
      setNotification({
        show: true,
        type: 'success',
        text: t('auth.signUp.success'),
      })
      setForm(initialForm)
      setErrors({})
      if (typeof onRegisterSuccess === 'function') {
        onRegisterSuccess()
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.code === 'ERR_NETWORK' ? t('auth.signUp.networkFailed') : t('auth.signUp.failed'))
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
        <h1>{t('auth.signUp.title')}</h1>
        <p className="subtitle">{t('auth.signUp.subtitle')}</p>

        <form onSubmit={onSubmit} noValidate>
          <div className="role-grid">
            {['expert', 'artisan', 'manufacturer'].map((role) => (
              <label key={role} className={`role-item ${form.role === role ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={form.role === role}
                  onChange={onChange}
                />
                <span>{t(`auth.signUp.roles.${role}`)}</span>
              </label>
            ))}
          </div>

          <label>
            <span className="label-with-icon">
              <UserIcon className="icon tiny" />
              {t('common.name')}
            </span>
            <input name="name" value={form.name} onChange={onChange} placeholder={t('auth.signUp.placeholders.name')} />
            {errors.name && <small>{errors.name}</small>}
          </label>

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
              placeholder={t('auth.signUp.placeholders.email')}
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
              placeholder={t('auth.signUp.placeholders.password')}
            />
            {errors.password && <small>{errors.password}</small>}
          </label>

          {isManufacturer && (
            <>
              <label>
                <span className="label-with-icon">
                  <ShieldIcon className="icon tiny" />
                  {t('auth.signUp.patent')}
                </span>
                <input
                  name="patent"
                  value={form.patent}
                  onChange={onChange}
                  placeholder={t('auth.signUp.placeholders.patent')}
                />
                {errors.patent && <small>{errors.patent}</small>}
              </label>

              <label>
                <span className="label-with-icon">
                  <UserIcon className="icon tiny" />
                  {t('auth.signUp.address')}
                </span>
                <input
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  placeholder={t('auth.signUp.placeholders.address')}
                />
                {errors.address && <small>{errors.address}</small>}
              </label>

              <label>
                <span className="label-with-icon">
                  <ShieldIcon className="icon tiny" />
                  {t('auth.signUp.companyPhone')}
                </span>
                <input
                  name="companyPhone"
                  value={form.companyPhone}
                  onChange={onChange}
                  placeholder={t('auth.signUp.placeholders.companyPhone')}
                />
                {errors.companyPhone && <small>{errors.companyPhone}</small>}
              </label>
            </>
          )}

          <button disabled={loading} type="submit">
            <UserIcon className="icon tiny" />
            {loading ? <span className="btn-loader" aria-hidden="true" /> : null}
            {loading ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
          </button>
        </form>

        {result.text ? <p className={`result ${result.type}`}>{result.text}</p> : null}
      </section>
    </>
  )
}

export default SignUpForm
