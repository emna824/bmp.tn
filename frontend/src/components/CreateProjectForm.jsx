import { useEffect, useMemo, useRef, useState } from 'react'
import api, { withUserHeaders } from '../api'
import { TRADES } from '../constants/trades'
import { loadGoogleMapsPlaces } from '../utils/googleMaps'

const INITIAL_FORM = {
  projectName: '',
  address: '',
  latitude: '',
  longitude: '',
  estimatedBudget: '',
  category: 'construction',
  startDate: '',
  endDate: '',
  dailySalary: '',
  workersByTrade: Object.fromEntries(TRADES.map((trade) => [trade, ''])),
}

function normalizeTrade(value) {
  return String(value || '').trim().toLowerCase()
}

function CreateProjectForm({
  userId,
  role = 'expert',
  defaultTrade = '',
  isPremium = true,
  onRequirePremium,
  onCreated,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const isSoloProject = role === 'artisan'
  const normalizedDefaultTrade = normalizeTrade(defaultTrade)
  const addressInputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const selectedPlaceRef = useRef(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [autofillingLocation, setAutofillingLocation] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [mapsStatus, setMapsStatus] = useState(apiKey ? 'loading' : 'idle')

  const validate = useMemo(() => {
    const nextErrors = {}

    if (!form.projectName.trim()) nextErrors.projectName = 'Project name is required'
    if (!form.address.trim()) nextErrors.address = 'Address is required'
    if (form.latitude === '' || Number.isNaN(Number(form.latitude))) nextErrors.latitude = 'Latitude must be valid'
    if (form.longitude === '' || Number.isNaN(Number(form.longitude))) nextErrors.longitude = 'Longitude must be valid'
    if (Number(form.estimatedBudget) <= 0) nextErrors.estimatedBudget = 'Budget must be greater than 0'
    if (!form.startDate) nextErrors.startDate = 'Start date is required'
    if (Number(form.dailySalary) <= 0) nextErrors.dailySalary = 'Daily salary must be greater than 0'
    if (!isSoloProject && !Object.values(form.workersByTrade).some((value) => Number(value) > 0)) {
      nextErrors.teamRequirements = 'Choose at least one trade and worker count'
    }
    if (isSoloProject && !normalizedDefaultTrade) {
      nextErrors.trade = 'Your artisan trade must be set before creating a solo project'
    }
    if (form.endDate && form.startDate && new Date(form.endDate) < new Date(form.startDate)) {
      nextErrors.endDate = 'End date must be after start date'
    }

    return nextErrors
  }, [form, isSoloProject, normalizedDefaultTrade])

  const isValid = Object.keys(validate).length === 0

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setMessage({ type: '', text: '' })
  }

  const handleTradeCountChange = (trade, value) => {
    setForm((current) => ({
      ...current,
      workersByTrade: {
        ...current.workersByTrade,
        [trade]: value,
      },
    }))
    setErrors((current) => ({ ...current, teamRequirements: '' }))
    setMessage({ type: '', text: '' })
  }

  useEffect(() => {
    if (!apiKey || !addressInputRef.current) {
      return undefined
    }

    let isMounted = true

    loadGoogleMapsPlaces(apiKey)
      .then((google) => {
        if (!isMounted || autocompleteRef.current || !addressInputRef.current) {
          return
        }

        const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
          types: ['address'],
          fields: ['formatted_address', 'geometry'],
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          selectedPlaceRef.current = place || null
          setForm((current) => ({
            ...current,
            address: place?.formatted_address || current.address,
          }))
          setErrors((current) => ({
            ...current,
            address: '',
          }))
        })

        autocompleteRef.current = autocomplete
        setMapsStatus('ready')
      })
      .catch(() => {
        if (isMounted) {
          setMapsStatus('error')
        }
      })

    return () => {
      isMounted = false
      if (window.google?.maps?.event && autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [apiKey])

  const handleAutofillLocation = async () => {
    if (!form.address.trim()) {
      setErrors((current) => ({ ...current, address: 'Address is required' }))
      setMessage({ type: 'error', text: 'Enter or select an address first.' })
      return
    }

    if (!apiKey) {
      setMessage({ type: 'error', text: 'Google Maps API key is missing. Add VITE_GOOGLE_MAPS_API_KEY first.' })
      return
    }

    setAutofillingLocation(true)
    setMessage({ type: '', text: '' })

    try {
      const google = await loadGoogleMapsPlaces(apiKey)

      let nextAddress = form.address.trim()
      let nextLatitude = ''
      let nextLongitude = ''

      const selectedPlace = selectedPlaceRef.current
      const selectedLocation = selectedPlace?.geometry?.location

      if (selectedLocation) {
        nextAddress = selectedPlace?.formatted_address || nextAddress
        nextLatitude = String(selectedLocation.lat())
        nextLongitude = String(selectedLocation.lng())
      } else {
        const geocoder = new google.maps.Geocoder()
        const { results } = await geocoder.geocode({ address: form.address.trim() })
        const firstResult = results?.[0]
        const geocodedLocation = firstResult?.geometry?.location

        if (!firstResult || !geocodedLocation) {
          throw new Error('No matching location found')
        }

        nextAddress = firstResult.formatted_address || nextAddress
        nextLatitude = String(geocodedLocation.lat())
        nextLongitude = String(geocodedLocation.lng())
      }

      setForm((current) => ({
        ...current,
        address: nextAddress,
        latitude: nextLatitude,
        longitude: nextLongitude,
      }))
      setErrors((current) => ({
        ...current,
        address: '',
        latitude: '',
        longitude: '',
      }))
      setMessage({ type: 'success', text: 'Location fields autofilled successfully.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to autofill location fields.' })
    } finally {
      setAutofillingLocation(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors(validate)

    if (!isValid) {
      setMessage({ type: 'error', text: 'Please fix the validation errors before submitting.' })
      return
    }

    if (!userId) {
      setMessage({ type: 'error', text: 'Authenticated user is required to create a project.' })
      return
    }

    if (isSoloProject && !isPremium) {
      onRequirePremium?.()
      setMessage({ type: 'error', text: 'Upgrade to Premium to create your own solo projects.' })
      return
    }

    setSubmitting(true)
    try {
      const response = await api.post(
        '/projects',
        {
          projectName: form.projectName.trim(),
          location: {
            address: form.address.trim(),
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
          },
          estimatedBudget: Number(form.estimatedBudget),
          category: form.category,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          teamRequirements: isSoloProject
            ? []
            : TRADES.map((trade) => ({
                job: trade,
                required: Number(form.workersByTrade[trade] || 0),
              })).filter((requirement) => requirement.required > 0),
          job: isSoloProject ? normalizedDefaultTrade : undefined,
          dailySalary: Number(form.dailySalary),
          type: isSoloProject ? 'solo' : 'expert',
        },
        withUserHeaders(userId),
      )

      setMessage({ type: 'success', text: response.data?.message || 'Project created successfully' })
      setForm(INITIAL_FORM)
      setErrors({})

      if (onCreated) {
        onCreated(response.data)
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create project' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="create-project-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid two">
        <label>
          Project name
          <input
            value={form.projectName}
            onChange={(event) => handleChange('projectName', event.target.value)}
            placeholder={isSoloProject ? 'My freelance renovation' : 'Residential block A'}
          />
          {errors.projectName ? <small>{errors.projectName}</small> : null}
        </label>

        <label>
          Estimated budget
          <input
            type="number"
            min="1"
            value={form.estimatedBudget}
            onChange={(event) => handleChange('estimatedBudget', event.target.value)}
            placeholder="250000"
          />
          {errors.estimatedBudget ? <small>{errors.estimatedBudget}</small> : null}
        </label>

        <label className="form-grid-span-two">
          Project location
          <input
            ref={addressInputRef}
            value={form.address}
            onChange={(event) => handleChange('address', event.target.value)}
            placeholder={mapsStatus === 'ready' ? 'Search exact address with Google Maps' : 'Enter address'}
          />
          {errors.address ? <small>{errors.address}</small> : null}
        </label>

        <div className="form-grid-span-two inline-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleAutofillLocation}
            disabled={mapsStatus === 'loading' || autofillingLocation}
          >
            {autofillingLocation ? 'Autofilling...' : 'Autofill location fields'}
          </button>
        </div>

        <label>
          Latitude
          <input
            value={form.latitude}
            onChange={(event) => handleChange('latitude', event.target.value)}
            placeholder="36.8065"
          />
          {errors.latitude ? <small>{errors.latitude}</small> : null}
        </label>

        <label>
          Longitude
          <input
            value={form.longitude}
            onChange={(event) => handleChange('longitude', event.target.value)}
            placeholder="10.1815"
          />
          {errors.longitude ? <small>{errors.longitude}</small> : null}
        </label>

        <label>
          Category
          <select value={form.category} onChange={(event) => handleChange('category', event.target.value)}>
            <option value="construction">construction</option>
            <option value="renovation">renovation</option>
          </select>
        </label>

        <label>
          Start date
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => handleChange('startDate', event.target.value)}
          />
          {errors.startDate ? <small>{errors.startDate}</small> : null}
        </label>

        <label>
          End date
          <input
            type="date"
            value={form.endDate}
            onChange={(event) => handleChange('endDate', event.target.value)}
          />
          {errors.endDate ? <small>{errors.endDate}</small> : null}
        </label>

        <label>
          Daily salary
          <input
            type="number"
            min="1"
            value={form.dailySalary}
            onChange={(event) => handleChange('dailySalary', event.target.value)}
            placeholder="90"
          />
          {errors.dailySalary ? <small>{errors.dailySalary}</small> : null}
        </label>

        {isSoloProject ? (
          <div className="form-grid-span-two rounded-2xl border border-orange-200 bg-orange-50/70 p-4 text-sm text-orange-800">
            <strong>Solo project mode</strong>
            <p className="mt-2">
              This project will be created under your artisan account and managed without an expert.
            </p>
            <p className="mt-2">
              Main trade: <strong>{normalizedDefaultTrade || 'Not set yet'}</strong>
            </p>
            {errors.trade ? <small className="mt-2 block">{errors.trade}</small> : null}
          </div>
        ) : (
          <div className="form-grid-span-two">
            <label>
              Worker requirements by trade
              <div className="trade-worker-grid">
                {TRADES.map((trade) => (
                  <div key={trade} className="trade-worker-row">
                    <span>{trade}</span>
                    <input
                      type="number"
                      min="0"
                      value={form.workersByTrade[trade]}
                      onChange={(event) => handleTradeCountChange(trade, event.target.value)}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </label>
            {errors.teamRequirements ? <small>{errors.teamRequirements}</small> : null}
          </div>
        )}
      </div>

      <p className="subtitle small map-helper">
        {mapsStatus === 'ready' && 'Google Maps autocomplete is active. Select or enter an address, then click the button to fill latitude and longitude.'}
        {mapsStatus === 'loading' && 'Loading Google Maps autocomplete...'}
        {mapsStatus === 'idle' && 'Add VITE_GOOGLE_MAPS_API_KEY to enable Google Maps autocomplete. Manual address and coordinates still work.'}
        {mapsStatus === 'error' && 'Google Maps could not load. You can still enter the address and coordinates manually.'}
      </p>

      {message.text ? <p className={`result ${message.type}`}>{message.text}</p> : null}

      <div className="inline-actions">
        <button type="submit" disabled={!isValid || submitting}>
          {submitting ? 'Creating...' : isSoloProject ? 'Create my solo project' : 'Create project'}
        </button>
      </div>
    </form>
  )
}

export default CreateProjectForm
