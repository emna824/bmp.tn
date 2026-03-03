import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { LockIcon, MailIcon, ShieldIcon, UserIcon } from './Icons'

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'expert',
  patent: '',
  address: '',
  companyPhone: '',
}

function SignUpForm() {
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

    if (!form.name.trim()) nextErrors.name = 'Name is required'
    if (!form.email.trim()) nextErrors.email = 'Email is required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Invalid email'
    if (!form.password) nextErrors.password = 'Password is required'
    if (form.password.length < 8) nextErrors.password = 'Min 8 characters'

    if (isManufacturer) {
      if (!form.patent.trim()) nextErrors.patent = 'Patent is required'
      if (!form.address.trim()) nextErrors.address = 'Address is required'
      if (!form.companyPhone.trim()) nextErrors.companyPhone = 'Company phone is required'
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
        text: 'Please fix form errors before submitting.',
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
      setResult({ type: 'success', text: response.data?.message || 'Registered' })
      setNotification({
        show: true,
        type: 'success',
        text: 'Account created successfully.',
      })
      setForm(initialForm)
      setErrors({})
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
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
        <h1>Create Account</h1>
        <p className="subtitle">Register as expert, artisan or manufacturer</p>

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
                <span>{role}</span>
              </label>
            ))}
          </div>

          <label>
            <span className="label-with-icon">
              <UserIcon className="icon tiny" />
              Name
            </span>
            <input name="name" value={form.name} onChange={onChange} placeholder="Your full name" />
            {errors.name && <small>{errors.name}</small>}
          </label>

          <label>
            <span className="label-with-icon">
              <MailIcon className="icon tiny" />
              Email
            </span>
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
            <span className="label-with-icon">
              <LockIcon className="icon tiny" />
              Password
            </span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Minimum 8 characters"
            />
            {errors.password && <small>{errors.password}</small>}
          </label>

          {isManufacturer && (
            <>
              <label>
                <span className="label-with-icon">
                  <ShieldIcon className="icon tiny" />
                  Patent
                </span>
                <input
                  name="patent"
                  value={form.patent}
                  onChange={onChange}
                  placeholder="Patent reference"
                />
                {errors.patent && <small>{errors.patent}</small>}
              </label>

              <label>
                <span className="label-with-icon">
                  <UserIcon className="icon tiny" />
                  Address
                </span>
                <input
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  placeholder="Company address"
                />
                {errors.address && <small>{errors.address}</small>}
              </label>

              <label>
                <span className="label-with-icon">
                  <ShieldIcon className="icon tiny" />
                  Company Phone
                </span>
                <input
                  name="companyPhone"
                  value={form.companyPhone}
                  onChange={onChange}
                  placeholder="+216 xx xxx xxx"
                />
                {errors.companyPhone && <small>{errors.companyPhone}</small>}
              </label>
            </>
          )}

          <button disabled={loading} type="submit">
            <UserIcon className="icon tiny" />
            {loading ? <span className="btn-loader" aria-hidden="true" /> : null}
            {loading ? 'Submitting...' : 'Create account'}
          </button>
        </form>

        {result.text ? <p className={`result ${result.type}`}>{result.text}</p> : null}
      </section>
    </div>
  )
}

export default SignUpForm
