import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api, { withUserHeaders } from '../api'
import { LockIcon, SettingsIcon, UserIcon } from './Icons'
import ArtisanLayout from '../layouts/ArtisanLayout'
import ProductCard from './ProductCard'
import { downloadFileReference } from '../utils/fileHelpers'
import { getSafeImageSrc } from '../utils/safeImageSrc'
import { formatProductPrice, normalizeProduct } from '../utils/adminDashboard'
import { getStripeClient } from '../utils/stripe'
import { ARTISAN_ROUTES, resolveArtisanRoute } from '../utils/roleRoutes'
import { resetArtisanTutorialCompletion } from '../onboarding/tutorialSteps'

const RoleStatsCharts = lazy(() => import('./charts/RoleStatsCharts'))
const ArtisanDashboard = lazy(() => import('../pages/ArtisanDashboard'))
const CalendarPage = lazy(() => import('../pages/CalendarPage'))
const ProjectDetails = lazy(() => import('../pages/ProjectDetails'))
const CreateProjectForm = lazy(() => import('./CreateProjectForm'))
const ReportModal = lazy(() => import('./ReportModal'))
const FaceEnrollmentCard = lazy(() => import('./FaceEnrollmentCard'))
const DashboardTour = lazy(() => import('./onboarding/DashboardTour'))

const JOB_OPTIONS = ['Painter', 'Mason', 'Electrician', 'Plumber', 'Carpenter', 'Metalworker', 'Laborer']

function normalizeAssignedProject(project = {}) {
  return {
    id: project._id || project.id || '',
    projectName: project.projectName || project.title || 'Untitled project',
    startDate: project.startDate || '',
    endDate: project.endDate || '',
    job: project.job || '',
    status: project.status || 'recruiting',
    description: project.description || '',
    category: project.category || '',
    dailySalary: Number(project.dailySalary || 0),
    totalSpent: Number(project.totalSpent || 0),
    type: project.type || 'expert',
    ownerId: project.ownerId || project.expertId || '',
    location: project.location || { address: '' },
    teamRequirements: Array.isArray(project.teamRequirements) ? project.teamRequirements : [],
    assignedArtisans: Array.isArray(project.assignedArtisans) ? project.assignedArtisans : [],
  }
}

function getProjectStatusPriority(status) {
  if (status === 'in_progress') return 0
  if (status === 'recruiting') return 1
  if (status === 'finished') return 2
  if (status === 'closed') return 3
  return 4
}

function sortAssignedProjects(projects = []) {
  return [...projects].sort((firstProject, secondProject) => {
    const priorityDiff =
      getProjectStatusPriority(firstProject?.status) - getProjectStatusPriority(secondProject?.status)

    if (priorityDiff !== 0) {
      return priorityDiff
    }

    const firstTime = new Date(firstProject?.startDate || 0).getTime()
    const secondTime = new Date(secondProject?.startDate || 0).getTime()

    return secondTime - firstTime
  })
}

function normalizeMilestone(milestone = {}) {
  return {
    ...milestone,
    _id: milestone._id || milestone.id || '',
    status: milestone.status || 'pending',
  }
}

function normalizeWorkLog(workLog = {}) {
  return {
    ...workLog,
    _id: workLog._id || workLog.id || '',
    status: workLog.status || 'not_done',
  }
}

function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function formatProjectStatus(status) {
  return String(status || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeQuantity(value, max = 99) {
  const limit = Number.isInteger(max) && max > 0 ? Math.min(max, 99) : 99
  const parsed = Number.parseInt(String(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, limit) : 1
}

function ArtisanProfile({
  user,
  currentPath = ARTISAN_ROUTES.dashboard,
  onNavigate,
  onLogout,
  onProfileUpdate,
  isPremium = false,
  onRequirePremium,
  onCancelSubscription,
  cancellingSubscription = false,
}) {
  const { t } = useTranslation()
  const userId = user?.id || user?._id || ''
  const [profile, setProfile] = useState(user)
  const [name, setName] = useState(user?.name || '')
  const [profileImage, setProfileImage] = useState(user?.profileImage || '')
  const [job, setJob] = useState(user?.job || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingJob, setSavingJob] = useState(false)
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })
  const [offers, setOffers] = useState([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [applyingOfferId, setApplyingOfferId] = useState(null)
  const [salaryByOffer, setSalaryByOffer] = useState({})
  const [offerJobFilter, setOfferJobFilter] = useState(user?.job || '')
  const [assignedProjects, setAssignedProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [loadingAssignedProjects, setLoadingAssignedProjects] = useState(false)
  const [projectsDisplayMode, setProjectsDisplayMode] = useState('dashboard')
  const [projectMilestones, setProjectMilestones] = useState({})
  const [artisanWorkLogs, setArtisanWorkLogs] = useState([])
  const [taskDrafts, setTaskDrafts] = useState({})
  const [loadingMilestones, setLoadingMilestones] = useState(false)
  const [loadingWorkLogs, setLoadingWorkLogs] = useState(false)
  const [savingTaskId, setSavingTaskId] = useState('')
  const [marketplaceProducts, setMarketplaceProducts] = useState([])
  const [loadingMarketplace, setLoadingMarketplace] = useState(false)
  const [downloadingProductId, setDownloadingProductId] = useState(null)
  const [payingProductId, setPayingProductId] = useState(null)
  const [filters, setFilters] = useState({ search: '', manufacturer: '' })
  const [offerSearch, setOfferSearch] = useState('')
  const [previewProduct, setPreviewProduct] = useState(null)
  const [marketplaceQuantities, setMarketplaceQuantities] = useState({})
  const [reportTarget, setReportTarget] = useState(null)
  const [tourMounted, setTourMounted] = useState(false)
  const [tourRunning, setTourRunning] = useState(false)
  const [tourSession, setTourSession] = useState(0)
  const isPremiumUser = Boolean(profile?.isPremium ?? user?.isPremium ?? isPremium)
  const activeView = useMemo(() => resolveArtisanRoute(currentPath), [currentPath])
  const profilePreviewSrc = useMemo(() => getSafeImageSrc(profileImage), [profileImage])
  const previewProductImageSrc = useMemo(() => getSafeImageSrc(previewProduct?.image), [previewProduct?.image])

  const getMarketplaceQuantity = useCallback(
    (productId, stock) => normalizeQuantity(marketplaceQuantities[productId], stock),
    [marketplaceQuantities],
  )

  const handleMarketplaceQuantityChange = useCallback((productId, value, stock) => {
    if (!productId) return
    setMarketplaceQuantities((current) => ({
      ...current,
      [productId]: normalizeQuantity(value, stock),
    }))
  }, [])

  const showNotification = useCallback((type, text) => {
    setNotification({ show: true, type, text })
  }, [])

  useEffect(() => {
    if (!notification.show) return undefined
    const timer = setTimeout(() => setNotification({ show: false, type: '', text: '' }), 3000)
    return () => clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    if (!user) return

    setProfile((current) => ({
      ...(current || {}),
      ...user,
      profileImage: typeof user.profileImage === 'string' ? user.profileImage : current?.profileImage || '',
    }))
  }, [user])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const paymentStatus = url.searchParams.get('payment')
    const view = url.searchParams.get('view')

    if (!paymentStatus) return

    if (view === 'marketplace') {
      onNavigate?.(ARTISAN_ROUTES.projects)
      setProjectsDisplayMode('details')
    }

    if (paymentStatus === 'success') {
      showNotification('success', 'Payment completed successfully')
    } else if (paymentStatus === 'cancelled') {
      showNotification('error', 'Payment was cancelled')
    }

    url.searchParams.delete('payment')
    url.searchParams.delete('view')
    url.searchParams.delete('productId')
    url.searchParams.delete('session_id')
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
  }, [onNavigate, showNotification])

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return
      setLoadingProfile(true)
      try {
        const response = await api.get(`/users/${userId}/profile`)
        const apiUser = response.data?.user
        if (apiUser) {
          const nextProfile = {
            ...apiUser,
            profileImage: typeof apiUser.profileImage === 'string' ? apiUser.profileImage : '',
          }
          setProfile(nextProfile)
          setName(nextProfile.name || '')
          setProfileImage(nextProfile.profileImage || '')
          setJob(nextProfile.job || '')
          if (!offerJobFilter && nextProfile.job) {
            setOfferJobFilter(nextProfile.job)
          }
        }
      } catch (error) {
        showNotification('error', error.response?.data?.message || 'Failed to load profile')
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [userId, onProfileUpdate, offerJobFilter, showNotification])

  const loadOffers = useCallback(async () => {
    setLoadingOffers(true)
    try {
      const response = await api.get('/offers', {
        params: {
          status: 'open',
          ...(offerJobFilter ? { job: offerJobFilter } : {}),
        },
      })
      setOffers(response.data?.offers || [])
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load offers'
      showNotification('error', message)
    } finally {
      setLoadingOffers(false)
    }
  }, [offerJobFilter, showNotification])

  const loadAssignedProjects = useCallback(async () => {
    if (!userId) return

    setLoadingAssignedProjects(true)
    try {
      const response = await api.get('/projects/artisan', withUserHeaders(userId))
      const nextProjects = sortAssignedProjects(
        (response.data?.projects || []).map((project) => normalizeAssignedProject(project)),
      )
      setAssignedProjects(nextProjects)
      setSelectedProjectId((current) => {
        const currentProject = nextProjects.find((project) => project.id === current)
        const activeProject =
          nextProjects.find((project) => ['in_progress', 'recruiting'].includes(project.status)) ||
          nextProjects[0]

        if (currentProject && !['closed', 'finished'].includes(currentProject.status)) {
          return current
        }

        return activeProject?.id || ''
      })
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load assigned projects'
      showNotification('error', message)
    } finally {
      setLoadingAssignedProjects(false)
    }
  }, [showNotification, userId])

  const loadProjectMilestones = useCallback(async (projectId) => {
    if (!projectId || !userId) return

    setLoadingMilestones(true)
    try {
      const response = await api.get(`/milestones/project/${projectId}`, withUserHeaders(userId))
      setProjectMilestones((current) => ({
        ...current,
        [projectId]: (response.data?.milestones || []).map((milestone) => normalizeMilestone(milestone)),
      }))
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to load milestones')
    } finally {
      setLoadingMilestones(false)
    }
  }, [showNotification, userId])

  const loadArtisanWorkLogs = useCallback(async (projectId = '') => {
    if (!userId) return

    setLoadingWorkLogs(true)
    try {
      const response = await api.get(
        '/worklog/artisan',
        withUserHeaders(userId, {
          params: projectId ? { projectId } : {},
        }),
      )
      setArtisanWorkLogs((response.data?.workLogs || []).map((workLog) => normalizeWorkLog(workLog)))
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to load work logs')
    } finally {
      setLoadingWorkLogs(false)
    }
  }, [showNotification, userId])

  const loadMarketplace = useCallback(async () => {
    setLoadingMarketplace(true)
    try {
      let response

      try {
        response = await api.get('/products')
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error
        }

        response = await api.get('/manufacturers/products')
      }

      setMarketplaceProducts((response.data?.products || []).map((product) => normalizeProduct(product)))
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load marketplace'
      showNotification('error', message)
    } finally {
      setLoadingMarketplace(false)
    }
  }, [showNotification])

  useEffect(() => {
    loadOffers()
  }, [loadOffers])

  useEffect(() => {
    loadAssignedProjects()
  }, [loadAssignedProjects])

  useEffect(() => {
    if (!selectedProjectId) return
    loadProjectMilestones(selectedProjectId)
    loadArtisanWorkLogs(selectedProjectId)
  }, [loadArtisanWorkLogs, loadProjectMilestones, selectedProjectId])

  useEffect(() => {
    loadMarketplace()
  }, [loadMarketplace])

  useEffect(() => {
    if (projectsDisplayMode === 'calendar' && !isPremiumUser) {
      setProjectsDisplayMode('dashboard')
    }
  }, [isPremiumUser, projectsDisplayMode])

  useEffect(() => {
    if (projectsDisplayMode === 'create' && !isPremiumUser) {
      setProjectsDisplayMode('dashboard')
    }
  }, [isPremiumUser, projectsDisplayMode])

  const filteredOffers = useMemo(() => {
    const term = offerSearch.trim().toLowerCase()
    return offers.filter((offer) => {
      if (!term) return true
      return [offer.job, offer.projectId?.projectName, offer.projectId?.title, offer.projectId?.description]
        .some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [offerSearch, offers])

  const filteredMarketplaceProducts = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()
    return marketplaceProducts.filter((product) => {
      const matchesManufacturer =
        !filters.manufacturer ||
        product.manufacturer?.name?.toLowerCase() === filters.manufacturer.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        product.name?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      return matchesManufacturer && matchesSearch
    })
  }, [filters, marketplaceProducts])

  const manufacturerOptions = useMemo(() => {
    const names = new Set()
    marketplaceProducts.forEach((product) => {
      if (product.manufacturer?.name) {
        names.add(product.manufacturer.name)
      }
    })
    return Array.from(names)
  }, [marketplaceProducts])

  const selectedProject = useMemo(
    () => assignedProjects.find((project) => project.id === selectedProjectId) || null,
    [assignedProjects, selectedProjectId],
  )

  const selectedProjectMilestones = useMemo(
    () => projectMilestones[selectedProjectId] || [],
    [projectMilestones, selectedProjectId],
  )

  const dailyTasks = useMemo(() => {
    const today = getTodayDateInput()
    const workLogsByMilestone = {}

    artisanWorkLogs.forEach((workLog) => {
      const workLogDate = String(workLog?.date || '').slice(0, 10)
      const milestoneId = workLog?.milestoneId?._id || workLog?.milestoneId?.id || workLog?.milestoneId
      if (workLogDate === today && milestoneId) {
        workLogsByMilestone[milestoneId] = workLog
      }
    })

    return selectedProjectMilestones.map((milestone) => {
      const draft = taskDrafts[milestone._id]
      const existingWorkLog = workLogsByMilestone[milestone._id]
      return {
        id: milestone._id,
        title: milestone.title,
        description: draft?.description ?? existingWorkLog?.description ?? '',
        status: draft?.status ?? existingWorkLog?.status ?? 'not_done',
        categoryHint: milestone?.artisanId?.job || selectedProject?.job || '',
        date: today,
        dateLabel: 'Today',
      }
    })
  }, [artisanWorkLogs, selectedProject?.job, selectedProjectMilestones, taskDrafts])

  const availableOfferJobs = useMemo(() => {
    const jobs = new Set()
    offers.forEach((offer) => {
      if (offer.job) jobs.add(offer.job)
    })
    if (profile?.job) jobs.add(profile.job)
    return Array.from(jobs)
  }, [offers, profile?.job])

  const handlePremiumCalendarAccess = useCallback(() => {
    onRequirePremium?.()
    showNotification('error', t('premium.calendarLocked'))
  }, [onRequirePremium, showNotification, t])

  const handleOpenSoloProjectCreator = useCallback(() => {
    if (!isPremiumUser) {
      onRequirePremium?.()
      showNotification('error', t('premium.projectCreationLocked'))
      return
    }

    onNavigate?.(ARTISAN_ROUTES.projects)
    setProjectsDisplayMode('create')
  }, [isPremiumUser, onNavigate, onRequirePremium, showNotification, t])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleAssistantAction = (event) => {
      const action = event.detail?.action

      if (action === 'artisan-open-calendar') {
        if (!isPremiumUser) {
          handlePremiumCalendarAccess()
          return
        }

        onNavigate?.(ARTISAN_ROUTES.projects)
        setProjectsDisplayMode('calendar')
      }

      if (action === 'artisan-open-create-project') {
        handleOpenSoloProjectCreator()
      }
    }

    window.addEventListener('bmp-assistant-action', handleAssistantAction)
    return () => window.removeEventListener('bmp-assistant-action', handleAssistantAction)
  }, [handleOpenSoloProjectCreator, handlePremiumCalendarAccess, isPremiumUser, onNavigate])

  const handleSoloProjectCreated = useCallback(async (payload) => {
    const createdProject = normalizeAssignedProject(payload?.project || {})
    setAssignedProjects((current) => sortAssignedProjects([createdProject, ...current.filter((project) => project.id !== createdProject.id)]))
    setSelectedProjectId(createdProject.id)
    setProjectsDisplayMode('details')
    setProjectMilestones((current) => ({
      ...current,
      [createdProject.id]: [],
    }))
    onNavigate?.(ARTISAN_ROUTES.projects)
    await loadAssignedProjects()
    showNotification('success', payload?.message || 'Solo project created successfully')
  }, [loadAssignedProjects, onNavigate, showNotification])

  const handleCreateSoloMilestone = useCallback(async (payload) => {
    if (!selectedProjectId) return

    try {
      await api.post(
        '/milestones',
        {
          projectId: selectedProjectId,
          artisanId: userId,
          title: payload.title,
          description: payload.description,
          startDate: payload.startDate,
          endDate: payload.endDate,
        },
        withUserHeaders(userId),
      )
      await loadProjectMilestones(selectedProjectId)
      showNotification('success', 'Task created successfully')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to create task')
    }
  }, [loadProjectMilestones, selectedProjectId, showNotification, userId])

  const handleSoloProjectStatusAction = useCallback(async (status) => {
    if (!selectedProjectId) return

    try {
      await api.put(`/projects/status/${selectedProjectId}`, { status }, withUserHeaders(userId))
      await loadAssignedProjects()
      await loadProjectMilestones(selectedProjectId)
      showNotification('success', `Project ${status} successfully`)
    } catch (error) {
      showNotification('error', error.response?.data?.message || `Failed to ${status} project`)
    }
  }, [loadAssignedProjects, loadProjectMilestones, selectedProjectId, showNotification, userId])

  const overviewStats = [
    { label: 'Offers', value: offers.length, detail: offerJobFilter ? `Filtered by ${offerJobFilter}` : 'Open now' },
    {
      label: t('artisan.assignedProjects'),
      value: assignedProjects.length,
      detail: assignedProjects.length ? 'List and calendar ready' : 'No active assignments yet',
    },
    {
      label: 'Marketplace docs',
      value: marketplaceProducts.length,
      detail: `${filteredMarketplaceProducts.length} showing`,
    },
    { label: 'Trade', value: profile?.job || 'Unset', detail: 'Your artisan role' },
  ]

  const billingUsage = useMemo(
    () => [
      {
        label: 'Active Projects',
        value: assignedProjects.length,
        max: isPremiumUser ? 20 : 5,
      },
      {
        label: 'Quotes Available',
        value: offers.length,
        max: 100,
      },
      {
        label: 'Marketplace Docs',
        value: marketplaceProducts.length,
        max: 50,
      },
    ],
    [assignedProjects.length, isPremiumUser, marketplaceProducts.length, offers.length],
  )

  const handleSaveName = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      showNotification('error', 'Name is required')
      return
    }

    setSavingName(true)
    try {
      const response = await api.put(`/users/${userId}/profile`, { name: name.trim() })
      const nextProfile = {
        ...profile,
        ...(response.data?.user || {}),
      }
      setProfile(nextProfile)
      setName(nextProfile.name || '')
      if (onProfileUpdate) {
        onProfileUpdate(nextProfile)
      }
      showNotification('success', response.data?.message || 'Profile updated')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSavingName(false)
    }
  }

  const handleImagePick = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isAllowedType = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    const maxBytes = 2 * 1024 * 1024

    if (!isAllowedType) {
      showNotification('error', 'Only PNG, JPG and WEBP are allowed')
      return
    }

    if (file.size > maxBytes) {
      showNotification('error', 'Image must be 2MB or less')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setProfileImage(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => {
      showNotification('error', 'Failed to read selected image')
    }
    reader.readAsDataURL(file)
  }

  const handleSaveImage = async () => {
    setSavingImage(true)
    try {
      const response = await api.put(`/users/${userId}/profile`, {
        name: (name || profile?.name || '').trim(),
        profileImage,
      })
      const nextProfile = {
        ...profile,
        ...(response.data?.user || {}),
        profileImage,
      }
      setProfile(nextProfile)
      if (onProfileUpdate) {
        onProfileUpdate(nextProfile)
      }
      showNotification('success', response.data?.message || 'Profile image updated')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to update image')
    } finally {
      setSavingImage(false)
    }
  }

  const handleSaveJob = async (event) => {
    event.preventDefault()
    if (!job) {
      showNotification('error', 'Please select your trade')
      return
    }

    setSavingJob(true)
    try {
      const response = await api.put(`/users/${userId}/profile`, {
        name: (name || profile?.name || '').trim(),
        job,
      })
      const nextProfile = {
        ...profile,
        ...(response.data?.user || {}),
        job,
      }
      setProfile(nextProfile)
      setOfferJobFilter(job)
      if (onProfileUpdate) {
        onProfileUpdate(nextProfile)
      }
      showNotification('success', 'Trade saved')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to update trade')
    } finally {
      setSavingJob(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    if (!currentPassword || !newPassword) {
      showNotification('error', 'Current and new password are required')
      return
    }
    if (newPassword.length < 8) {
      showNotification('error', 'New password must be at least 8 characters')
      return
    }

    setSavingPassword(true)
    try {
      const response = await api.put(`/users/${userId}/password`, {
        currentPassword,
        newPassword,
      })
      showNotification('success', response.data?.message || 'Password updated')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleApply = async (offerId) => {
    const salary = Number(salaryByOffer[offerId])
    if (Number.isNaN(salary) || salary < 0) {
      showNotification('error', 'Enter a valid daily salary before applying')
      return
    }

    setApplyingOfferId(offerId)
    try {
      await api.post(`/offers/${offerId}/apply`, {
        artisanId: userId,
        proposedDailySalary: salary,
      })
      setOffers((current) => current.filter((offer) => offer._id !== offerId))
      setSalaryByOffer((current) => ({ ...current, [offerId]: '' }))
      showNotification('success', 'Application sent successfully')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to apply to offer')
    } finally {
      setApplyingOfferId(null)
    }
  }

  const handleTaskDraftChange = useCallback((milestoneId, patch) => {
    if (!milestoneId) return

    setTaskDrafts((current) => {
      const currentTask =
        current[milestoneId] ||
        dailyTasks.find((task) => task.id === milestoneId) || {
          id: milestoneId,
          date: getTodayDateInput(),
          status: 'not_done',
          description: '',
        }

      return {
        ...current,
        [milestoneId]: {
          ...currentTask,
          ...patch,
        },
      }
    })
  }, [dailyTasks])

  const handleSaveTask = useCallback(async (milestoneId) => {
    const task = taskDrafts[milestoneId] || dailyTasks.find((entry) => entry.id === milestoneId)
    if (!task) return

    setSavingTaskId(milestoneId)
    try {
      await api.post(
        '/worklog',
        {
          milestoneId,
          date: task.date || getTodayDateInput(),
          description: task.description || '',
          status: task.status || 'not_done',
        },
        withUserHeaders(userId),
      )

      await Promise.all([
        loadArtisanWorkLogs(selectedProjectId),
        loadProjectMilestones(selectedProjectId),
        loadAssignedProjects(),
      ])

      setTaskDrafts((current) => {
        const nextDrafts = { ...current }
        delete nextDrafts[milestoneId]
        return nextDrafts
      })
      showNotification('success', 'Daily task saved')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to save daily task')
    } finally {
      setSavingTaskId('')
    }
  }, [dailyTasks, loadArtisanWorkLogs, loadAssignedProjects, loadProjectMilestones, selectedProjectId, showNotification, taskDrafts, userId])

  const handleDownloadMarketplaceDocument = async (productId, fallbackName) => {
    if (!productId) return
    setDownloadingProductId(productId)
    try {
      let response

      try {
        response = await api.get(`/products/${productId}/document`)
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error
        }

        response = await api.get(`/manufacturers/products/${productId}/document`)
      }

      const { document, documentName } = response.data || {}
      if (!document) {
        throw new Error('Document unavailable')
      }
      downloadFileReference(document, documentName || fallbackName || 'product.pdf')
      showNotification('success', 'Document downloaded')
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to download document'
      showNotification('error', message)
    } finally {
      setDownloadingProductId(null)
    }
  }

  const handleCheckout = async (product) => {
    if (!product?.id) return
    if (!product.price || Number(product.price) <= 0) {
      showNotification('error', 'This product is not available for payment yet')
      return
    }

    if (Number(product.stock ?? 0) <= 0) {
      showNotification('error', 'This product is currently out of stock')
      return
    }

    const quantity = getMarketplaceQuantity(product.id, product.stock)

    setPayingProductId(product.id)
    try {
      const response = await api.post(
        '/payments/checkout-session',
        {
          productId: product.id,
          quantity,
        },
        {
          headers: {
            'x-user-id': userId,
          },
        },
      )

      if (!response.data?.url) {
        throw new Error('Checkout URL is missing')
      }

      if (typeof window !== 'undefined') {
        const stripe = await getStripeClient()

        if (stripe && response.data?.sessionId) {
          const result = await stripe.redirectToCheckout({ sessionId: response.data.sessionId })
          if (result?.error?.message) {
            throw new Error(result.error.message)
          }
          return
        }

        window.location.assign(response.data.url)
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to start payment'
      showNotification('error', message)
      setPayingProductId(null)
    }
  }

  const openReportModal = useCallback((targetType, targetId, targetLabel) => {
    if (!targetId) return
    setReportTarget({ targetType, targetId, targetLabel })
  }, [])

  const closeReportModal = useCallback(() => {
    setReportTarget(null)
  }, [])

  const handleStartTour = useCallback(() => {
    resetArtisanTutorialCompletion()
    setProjectsDisplayMode('dashboard')
    onNavigate?.(ARTISAN_ROUTES.dashboard)
    setTourMounted(true)
    setTourSession((current) => current + 1)
    window.setTimeout(() => setTourRunning(true), 80)
  }, [onNavigate])

  const handleCloseTour = useCallback(() => {
    setTourRunning(false)
  }, [])

  return (
    <div className="artisan-profile">
      <div
        className={`notification ${notification.show ? 'show' : ''} ${notification.type || ''}`}
        role="status"
        aria-live="polite"
      >
        {notification.text}
      </div>

      <ArtisanLayout
        user={profile}
        currentPath={currentPath}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onCancelSubscription={onCancelSubscription}
        cancellingSubscription={cancellingSubscription}
        onStartGuide={handleStartTour}
      >
        {activeView === ARTISAN_ROUTES.dashboard && (
          <div className="artisan-dashboard">
            <div className="dashboard-overview-head" data-tour="artisan-overview">
              <div className="section-header">
                <p className="eyebrow">Dashboard</p>
                <h3>Overview</h3>
                <p className="subtitle">Real-time metrics and project status across your workspace.</p>
              </div>
              <div className="inline-actions">
                <button
                  type="button"
                  onClick={handleOpenSoloProjectCreator}
                  title={!isPremiumUser ? t('premium.featureTooltip') : undefined}
                  data-tour="artisan-premium"
                >
                  {!isPremiumUser ? <LockIcon className="icon tiny" /> : null}
                  New Project
                </button>
              </div>
            </div>

            <div className="dash-top">
              <input
                className="dash-search dashboard-inline-search"
                type="search"
                placeholder="Search offers or products..."
                value={offerSearch}
                onChange={(event) => setOfferSearch(event.target.value)}
              />
              <div className="dash-actions">
                <button type="button" className="secondary-btn" onClick={() => onNavigate?.(ARTISAN_ROUTES.offers)}>
                  Offers
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setProjectsDisplayMode('dashboard')
                    onNavigate?.(ARTISAN_ROUTES.projects)
                  }}
                >
                  {t('projects')}
                </button>
                <button type="button" className="secondary-btn" onClick={() => onNavigate?.(ARTISAN_ROUTES.marketplace)}>
                  Marketplace
                </button>
              </div>
            </div>

            <div className="stat-grid">
              {overviewStats.map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                  <div className="stat-detail">{stat.detail}</div>
                  <div className="stat-bar" />
                </div>
              ))}
            </div>

            <Suspense fallback={null}>
              <RoleStatsCharts role="artisan" userId={userId} title="Artisan analytics" />
            </Suspense>

            <div className="cards-grid">
              <section className="card-panel" data-tour="artisan-quotes-panel">
                <div className="panel-header">
                  <h3>Open offers</h3>
                  <button type="button" className="text-btn" onClick={() => onNavigate?.(ARTISAN_ROUTES.offers)}>
                    View all
                  </button>
                </div>
                <div className="invitation-list">
                  {filteredOffers.slice(0, 4).map((offer) => (
                    <article key={offer._id} className="invitation-card">
                      <div className="inv-meta">
                        <div>
                          <p className="inv-title">{offer.projectId?.projectName || offer.projectId?.title || 'Project'}</p>
                          <p className="inv-subtitle">{offer.job}</p>
                          <p className="inv-desc">
                            {Number(offer.projectId?.budget || offer.projectId?.estimatedBudget || 0).toLocaleString()} TND budget -
                            {' '}
                            {offer.availableSlots} slots left
                          </p>
                          <div className="inv-tags">
                            <span className="badge">{offer.job}</span>
                            <span className={`pill status-${offer.status}`}>{offer.status}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!offers.length ? <p className="subtitle">No open offers right now.</p> : null}
                </div>
              </section>

              <section className="card-panel" data-tour="artisan-projects-panel">
                <div className="panel-header">
                  <h3>{t('artisan.assignedProjects')}</h3>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      setProjectsDisplayMode('calendar')
                      onNavigate?.(ARTISAN_ROUTES.projects)
                    }}
                    data-tour="artisan-calendar"
                  >
                    {t('artisan.openCalendar')}
                  </button>
                </div>
                <div className="invitation-list">
                  {assignedProjects.slice(0, 4).map((project) => (
                    <article key={project.id} className="invitation-card project-assignment-preview">
                      <div className="inv-meta">
                        <div>
                          <p className="inv-title">{project.projectName}</p>
                          <p className="inv-subtitle">{project.job || 'General assignment'}</p>
                          <p className="inv-desc">
                            {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'}
                            {' '}to{' '}
                            {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}
                          </p>
                          <div className="inv-tags">
                            <span className={`pill status-${project.status}`}>{formatProjectStatus(project.status)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!assignedProjects.length ? <p className="subtitle">{t('artisan.noAssignedProjects')}</p> : null}
                </div>
              </section>

              <section className="card-panel" data-tour="artisan-marketplace-panel">
                <div className="panel-header">
                  <h3>Marketplace spotlight</h3>
                  <button type="button" className="text-btn" onClick={() => onNavigate?.(ARTISAN_ROUTES.marketplace)}>
                    Browse
                  </button>
                </div>
                <div className="product-cards">
                  {filteredMarketplaceProducts.slice(0, 4).map((product) => (
                    <ProductCard
                      key={product.id}
                      variant="spotlight"
                      product={product}
                      downloading={downloadingProductId === product.id}
                      onDownload={() => handleDownloadMarketplaceDocument(product.id, product.documentName)}
                      onOpenReport={() =>
                        openReportModal('product', product.id, product.name || product.documentName || 'this product')
                      }
                    />
                  ))}
                  {!filteredMarketplaceProducts.length ? <p className="subtitle">No marketplace items.</p> : null}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeView === ARTISAN_ROUTES.offers && (
          <section className="dashboard-card" data-tour="artisan-quotes">
            <div className="section-header">
              <h3>Open offers</h3>
              <p className="subtitle">Apply to expert job offers with your proposed daily salary.</p>
            </div>
            <div className="dash-filter-row">
              <input
                type="search"
                placeholder="Search offers..."
                value={offerSearch}
                onChange={(event) => setOfferSearch(event.target.value)}
              />
              <select value={offerJobFilter} onChange={(event) => setOfferJobFilter(event.target.value)}>
                <option value="">All trades</option>
                {availableOfferJobs.map((offerJob) => (
                  <option key={offerJob} value={offerJob}>
                    {offerJob}
                  </option>
                ))}
              </select>
            </div>
            {loadingOffers ? (
              <p className="subtitle">Loading offers...</p>
            ) : filteredOffers.length ? (
              <div className="offer-grid">
                {filteredOffers.map((offer) => (
                  <article key={offer._id} className="offer-card">
                    <div className="offer-card-head">
                      <div>
                        <h4>{offer.job}</h4>
                        <p className="subtitle small">{offer.projectId?.projectName || offer.projectId?.title || 'Project'}</p>
                      </div>
                      <span className="status-pill status-open">{offer.availableSlots} open</span>
                    </div>
                    <p className="subtitle">
                      Budget: {Number(offer.projectId?.estimatedBudget || offer.projectId?.budget || 0).toLocaleString()} TND
                      {offer.projectId?.endDate || offer.projectId?.deadline
                        ? ` - Deadline ${new Date(offer.projectId?.endDate || offer.projectId?.deadline).toLocaleDateString()}`
                        : ''}
                    </p>
                    <label>
                      Proposed daily salary
                      <input
                        type="number"
                        min="0"
                        value={salaryByOffer[offer._id] || ''}
                        onChange={(event) =>
                          setSalaryByOffer((current) => ({
                            ...current,
                            [offer._id]: event.target.value,
                          }))
                        }
                        placeholder="80"
                      />
                    </label>
                    <button type="button" disabled={applyingOfferId === offer._id} onClick={() => handleApply(offer._id)}>
                      {applyingOfferId === offer._id ? 'Applying...' : 'Apply now'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="subtitle">No offers match your filters right now.</p>
            )}
          </section>
        )}

        {activeView === ARTISAN_ROUTES.projects && (
          <section className="space-y-4" data-tour="artisan-projects">
            <div className="dashboard-card artisan-projects-toolbar">
              <div className="section-header">
                <div>
                  <h3>{t('artisan.workspaceTitle')}</h3>
                  <p className="subtitle">{t('artisan.workspaceSubtitle')}</p>
                </div>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleOpenSoloProjectCreator}
                    title={!isPremiumUser ? t('premium.featureTooltip') : undefined}
                  >
                    {!isPremiumUser ? <LockIcon className="icon tiny" /> : null}
                    {t('artisan.createMyProject', { defaultValue: 'Create My Project' })}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      loadAssignedProjects()
                      if (selectedProjectId) {
                        loadProjectMilestones(selectedProjectId)
                        loadArtisanWorkLogs(selectedProjectId)
                      }
                    }}
                    disabled={loadingAssignedProjects || loadingMilestones || loadingWorkLogs}
                  >
                    {loadingAssignedProjects || loadingMilestones || loadingWorkLogs ? t('common.loading') : t('common.refresh')}
                  </button>
                </div>
              </div>

              <div className="view-toggle-group" role="tablist" aria-label="Assigned projects workspace">
                <button
                  type="button"
                  className={`view-toggle-btn ${projectsDisplayMode === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setProjectsDisplayMode('dashboard')}
                >
                  {t('artisan.workspaceDashboard')}
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${projectsDisplayMode === 'details' ? 'active' : ''}`}
                  onClick={() => setProjectsDisplayMode('details')}
                >
                  {t('artisan.workspaceDetails')}
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${projectsDisplayMode === 'create' ? 'active' : ''}`}
                  onClick={handleOpenSoloProjectCreator}
                  title={!isPremiumUser ? t('premium.featureTooltip') : undefined}
                >
                  {!isPremiumUser ? <LockIcon className="icon tiny" /> : null}
                  {t('artisan.createTab', { defaultValue: 'Create' })}
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${projectsDisplayMode === 'calendar' ? 'active' : ''}`}
                  onClick={() => {
                    if (!isPremiumUser) {
                      handlePremiumCalendarAccess()
                      return
                    }
                    setProjectsDisplayMode('calendar')
                  }}
                  title={!isPremiumUser ? t('premium.featureTooltip') : undefined}
                  data-tour="artisan-calendar"
                >
                  {!isPremiumUser ? <LockIcon className="icon tiny" /> : null}
                  {t('artisan.workspaceCalendar')}
                </button>
              </div>
            </div>

            {projectsDisplayMode === 'create' ? (
              <section className="dashboard-card">
                <div className="section-header">
                  <div>
                    <h3>{t('artisan.createMyProject', { defaultValue: 'Create My Project' })}</h3>
                    <p className="subtitle">
                      {t('artisan.createMyProjectSubtitle', {
                        defaultValue: 'Launch a solo project under your artisan account and manage it end to end.',
                      })}
                    </p>
                  </div>
                </div>
                <Suspense fallback={null}>
                  <CreateProjectForm
                    userId={userId}
                    role="artisan"
                    defaultTrade={profile?.trade || profile?.job || user?.trade || user?.job || ''}
                    isPremium={isPremiumUser}
                    onRequirePremium={onRequirePremium}
                    onCreated={handleSoloProjectCreated}
                  />
                </Suspense>
              </section>
            ) : null}

            {projectsDisplayMode === 'calendar' ? (
              <Suspense fallback={null}>
                <CalendarPage
                  projects={assignedProjects}
                  workLogs={artisanWorkLogs}
                  loading={loadingAssignedProjects || loadingWorkLogs}
                  onBack={() => setProjectsDisplayMode('dashboard')}
                />
              </Suspense>
            ) : null}

            {projectsDisplayMode === 'details' ? (
              <Suspense fallback={null}>
                <ProjectDetails
                  role="artisan"
                  userId={userId}
                  project={selectedProject}
                  milestones={selectedProjectMilestones}
                  workLogs={artisanWorkLogs}
                  loading={loadingMilestones || loadingWorkLogs}
                  savingTaskId={savingTaskId}
                  creatingMilestone={false}
                  onBack={() => setProjectsDisplayMode('dashboard')}
                  onTaskChange={handleTaskDraftChange}
                  onSaveTask={handleSaveTask}
                  onCreateMilestone={handleCreateSoloMilestone}
                  onCloseProject={() => handleSoloProjectStatusAction('closed')}
                  onFinishProject={() => handleSoloProjectStatusAction('finished')}
                  onProjectRefresh={loadAssignedProjects}
                />
              </Suspense>
            ) : null}

            {projectsDisplayMode === 'dashboard' ? (
              <Suspense fallback={null}>
                <ArtisanDashboard
                  projects={assignedProjects}
                  selectedProjectId={selectedProjectId}
                  loading={loadingAssignedProjects}
                  tasks={dailyTasks}
                  savingTaskId={savingTaskId}
                  isPremium={isPremiumUser}
                  onSelectProject={setSelectedProjectId}
                  onCreateProject={handleOpenSoloProjectCreator}
                  onOpenDetails={() => setProjectsDisplayMode('details')}
                  onOpenCalendar={() => {
                    if (!isPremiumUser) {
                      handlePremiumCalendarAccess()
                      return
                    }
                    setProjectsDisplayMode('calendar')
                  }}
                  onTaskChange={handleTaskDraftChange}
                  onSaveTask={handleSaveTask}
                />
              </Suspense>
            ) : null}
          </section>
        )}

        {activeView === ARTISAN_ROUTES.marketplace && (
          <section className="dashboard-card marketplace-card" data-tour="artisan-marketplace">
            <div className="market-top">
              <input
                type="search"
                className="market-search"
                placeholder="Search products..."
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
              <div className="market-filters">
                <select
                  value={filters.manufacturer}
                  onChange={(event) => setFilters((prev) => ({ ...prev, manufacturer: event.target.value }))}
                >
                  <option value="">All manufacturers</option>
                  {manufacturerOptions.map((manufacturerName) => (
                    <option key={manufacturerName} value={manufacturerName}>
                      {manufacturerName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingMarketplace ? (
              <p className="subtitle">Loading marketplace...</p>
            ) : (
              <div className="market-grid">
                {filteredMarketplaceProducts.length ? (
                  filteredMarketplaceProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      variant="marketplace"
                      product={product}
                      downloading={downloadingProductId === product.id}
                      paying={payingProductId === product.id}
                      quantity={getMarketplaceQuantity(product.id, product.stock)}
                      onQuantityChange={(value) =>
                        handleMarketplaceQuantityChange(product.id, value, product.stock)
                      }
                      onDownload={() => handleDownloadMarketplaceDocument(product.id, product.documentName)}
                      onPayNow={() => handleCheckout(product)}
                      onViewDetails={() => setPreviewProduct(product)}
                      onOpenReport={() =>
                        openReportModal('product', product.id, product.name || product.documentName || 'this product')
                      }
                    />
                  ))
                ) : (
                  <p className="subtitle">No marketplace listings match your filters.</p>
                )}
              </div>
            )}
          </section>
        )}

        {activeView === ARTISAN_ROUTES.invoices && (
          <section className="space-y-4" data-tour="artisan-invoices">
            <div className="dashboard-card artisan-projects-toolbar">
              <div className="section-header">
                <div>
                  <h3>{t('invoices')}</h3>
                  <p className="subtitle">Review project purchase invoices without leaving the artisan workspace.</p>
                </div>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setProjectsDisplayMode('details')
                      onNavigate?.(ARTISAN_ROUTES.projects)
                    }}
                  >
                    Open project workspace
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      loadAssignedProjects()
                      if (selectedProjectId) {
                        loadProjectMilestones(selectedProjectId)
                        loadArtisanWorkLogs(selectedProjectId)
                      }
                    }}
                    disabled={loadingAssignedProjects || loadingMilestones || loadingWorkLogs}
                  >
                    {loadingAssignedProjects || loadingMilestones || loadingWorkLogs ? t('common.loading') : t('common.refresh')}
                  </button>
                </div>
              </div>

              {assignedProjects.length ? (
                <div className="project-toolbar">
                  <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                    {assignedProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {loadingAssignedProjects ? (
              <section className="dashboard-card">
                <p className="subtitle">Loading invoices...</p>
              </section>
            ) : assignedProjects.length && selectedProject ? (
              <Suspense fallback={null}>
                <ProjectDetails
                  role="artisan"
                  userId={userId}
                  project={selectedProject}
                  milestones={selectedProjectMilestones}
                  workLogs={artisanWorkLogs}
                  loading={loadingMilestones || loadingWorkLogs}
                  savingTaskId={savingTaskId}
                  creatingMilestone={false}
                  initialTab="invoices"
                  onBack={() => onNavigate?.(ARTISAN_ROUTES.projects)}
                  onTaskChange={handleTaskDraftChange}
                  onSaveTask={handleSaveTask}
                  onCreateMilestone={handleCreateSoloMilestone}
                  onCloseProject={() => handleSoloProjectStatusAction('closed')}
                  onFinishProject={() => handleSoloProjectStatusAction('finished')}
                  onProjectRefresh={loadAssignedProjects}
                />
              </Suspense>
            ) : (
              <section className="dashboard-card">
                <p className="subtitle">No assigned projects yet.</p>
              </section>
            )}
          </section>
        )}

        {activeView === ARTISAN_ROUTES.settings && (
          <section className="dashboard-card billing-settings-shell">
            <div className="section-header">
              <div>
                <h3>Billing & Subscription</h3>
                <p className="subtitle">Manage your workspace plan, profile details, and account security.</p>
              </div>
            </div>
            {loadingProfile ? <p className="subtitle">Refreshing profile...</p> : null}

            <div className="billing-overview-grid">
              <article className="billing-plan-card" data-tour="artisan-premium">
                <div className="billing-card-label">Current Plan</div>
                <h4>{isPremiumUser ? 'Premium Artisan' : 'Standard Artisan'}</h4>
                <p className="subtitle">
                  {isPremiumUser
                    ? 'Your workspace has premium access enabled, including solo projects and advanced project tools.'
                    : 'Upgrade to unlock solo projects, premium support, and advanced reporting.'}
                </p>
                <div className="billing-plan-meta">
                  <strong>{isPremiumUser ? 'Premium enabled' : 'Standard access'}</strong>
                  <span>{profile?.subscriptionType || 'Managed securely in checkout'}</span>
                </div>
                <div className="billing-plan-actions">
                  {!isPremiumUser ? (
                    <button type="button" onClick={() => onRequirePremium?.()}>
                      Upgrade Plan
                    </button>
                  ) : null}
                  {isPremiumUser ? (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={onCancelSubscription}
                      disabled={cancellingSubscription}
                    >
                      {cancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}
                    </button>
                  ) : null}
                </div>
              </article>

              <article className="billing-payment-card">
                <h4>Payment Method</h4>
                <div className="billing-payment-note">
                  <strong>Stripe Checkout</strong>
                  <span>
                    Payment details stay managed in the secure checkout flow and are not exposed in the dashboard.
                  </span>
                </div>
                {!isPremiumUser ? (
                  <button type="button" className="secondary-btn" onClick={() => onRequirePremium?.()}>
                    Open Upgrade Flow
                  </button>
                ) : (
                  <span className="chip ghost">Premium managed securely</span>
                )}
              </article>
            </div>

            <article className="billing-usage-card">
              <h4>Current Cycle Usage</h4>
              <div className="usage-meter-grid">
                {billingUsage.map((item) => {
                  const percent = Math.max(6, Math.min(100, Math.round((Number(item.value || 0) / Number(item.max || 1)) * 100)))

                  return (
                    <div key={item.label} className="usage-meter">
                      <div className="usage-meter-row">
                        <span>{item.label}</span>
                        <strong>
                          {item.value} / {item.max}
                        </strong>
                      </div>
                      <div className="usage-meter-track">
                        <div className="usage-meter-fill" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>

            <div className="settings-forms-grid">
              <article className="settings-form-card">
                <div className="section-header">
                  <div>
                    <h4>Workspace Profile</h4>
                    <p className="subtitle">Your account details and moderation tools.</p>
                  </div>
                </div>
                <div className="settings-content">
                  <p><strong>Email:</strong> {profile?.email || '-'}</p>
                  <p><strong>Trade:</strong> {profile?.job || 'Not set'}</p>
                  <p><strong>Artisan ID:</strong> {userId || 'Missing'}</p>
                </div>
                <div className="report-profile-cta">
                  <div>
                    <strong>Need moderation review?</strong>
                    <p className="subtitle small">Submit a report for this profile if something looks wrong.</p>
                  </div>
                  <button
                    type="button"
                    className="secondary-btn report-trigger-btn"
                    disabled={!userId}
                    onClick={() => openReportModal('user', userId, profile?.name || profile?.email || 'this profile')}
                  >
                    Report profile
                  </button>
                </div>
              </article>

              <article className="settings-form-card">
                <div className="section-header">
                  <div>
                    <h4>Profile Details</h4>
                    <p className="subtitle">Update your public artisan information.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveName} noValidate>
                  <label>
                    <span className="label-with-icon">
                      <UserIcon className="icon tiny" />
                      Name
                    </span>
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" />
                  </label>
                  <button type="submit" disabled={savingName}>
                    {savingName ? 'Saving...' : 'Save name'}
                  </button>
                </form>

                <div className="image-settings-block">
                  <label>
                    <span className="label-with-icon">
                      <UserIcon className="icon tiny" />
                      Profile image
                    </span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImagePick} />
                  </label>

                  {profilePreviewSrc ? (
                    <img src={profilePreviewSrc} alt="Profile preview" className="profile-preview" />
                  ) : null}

                  <div className="image-actions">
                    <button type="button" onClick={handleSaveImage} disabled={savingImage}>
                      {savingImage ? 'Uploading...' : 'Save image'}
                    </button>
                    <button type="button" className="secondary-btn" onClick={() => setProfileImage('')} disabled={savingImage}>
                      Remove selected
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveJob} noValidate>
                  <label>
                    <span className="label-with-icon">
                      <SettingsIcon className="icon tiny" />
                      Your trade
                    </span>
                    <select value={job} onChange={(event) => setJob(event.target.value)}>
                      <option value="">Select a trade</option>
                      {JOB_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" disabled={savingJob}>
                    {savingJob ? 'Saving...' : 'Save trade'}
                  </button>
                </form>
              </article>

              <article className="settings-form-card">
                <div className="section-header">
                  <div>
                    <h4>Security</h4>
                    <p className="subtitle">Keep your artisan account protected.</p>
                  </div>
                </div>
                <Suspense fallback={null}>
                  <FaceEnrollmentCard
                    user={{ ...profile, id: userId }}
                    onRegistered={() => {
                      setProfile((current) => ({ ...(current || {}), hasFaceDescriptor: true }))
                      onProfileUpdate?.({ ...(profile || {}), hasFaceDescriptor: true })
                      showNotification('success', 'Face login enabled successfully')
                    }}
                  />
                </Suspense>
                <form onSubmit={handleChangePassword} noValidate>
                  <label>
                    <span className="label-with-icon">
                      <LockIcon className="icon tiny" />
                      Current password
                    </span>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="Current password"
                    />
                  </label>
                  <label>
                    <span className="label-with-icon">
                      <LockIcon className="icon tiny" />
                      New password
                    </span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                  </label>
                  <button type="submit" disabled={savingPassword}>
                    {savingPassword ? 'Updating...' : 'Change password'}
                  </button>
                </form>
              </article>
            </div>
          </section>
        )}
      </ArtisanLayout>

      {previewProduct ? (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Product details">
          <section className="settings-modal product-preview">
            <div className="settings-header">
              <h3>{previewProduct.name}</h3>
              <button type="button" className="text-btn close-btn" onClick={() => setPreviewProduct(null)}>
                Close
              </button>
            </div>
            <div className="product-preview-body">
              <div className="product-preview-media">
                {previewProductImageSrc ? (
                  <img src={previewProductImageSrc} alt={previewProduct.name} loading="lazy" decoding="async" />
                ) : (
                  <div className="market-img-fallback">{previewProduct.name?.charAt(0) || 'P'}</div>
                )}
              </div>
              <div className="product-preview-meta">
                <p className="subtitle">{previewProduct.description || 'No description provided.'}</p>
                <p>
                  <strong>Manufacturer: </strong>
                  {previewProduct.manufacturer?.name || '-'}
                </p>
                <p>
                  <strong>Price: </strong>
                  {previewProduct.price ? formatProductPrice(previewProduct.price) : '-'}
                </p>
                <p>
                  <strong>Stock: </strong>
                  {Number.isInteger(previewProduct.stock) ? previewProduct.stock : 0}
                </p>
                <label className="market-qty-field preview">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="1"
                    max={Number(previewProduct.stock ?? 0) > 0 ? previewProduct.stock : undefined}
                    step="1"
                    value={getMarketplaceQuantity(previewProduct.id, previewProduct.stock)}
                    disabled={Number(previewProduct.stock ?? 0) <= 0}
                    onChange={(event) =>
                      handleMarketplaceQuantityChange(previewProduct.id, event.target.value, previewProduct.stock)
                    }
                  />
                </label>
                {previewProduct.price && Number(previewProduct.stock ?? 0) > 0 ? (
                  <p className="subtitle small preview-total">
                    Total: {formatProductPrice(
                      Number(previewProduct.price || 0) *
                        getMarketplaceQuantity(previewProduct.id, previewProduct.stock),
                    )}
                  </p>
                ) : (
                  <p className="subtitle small preview-total">This product is currently out of stock.</p>
                )}
                <p className="subtitle small">Document: {previewProduct.documentName}</p>
                <div className="product-preview-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    disabled={
                      payingProductId === previewProduct.id ||
                      !previewProduct.price ||
                      Number(previewProduct.stock ?? 0) <= 0
                    }
                    onClick={() => handleCheckout(previewProduct)}
                  >
                    {payingProductId === previewProduct.id ? 'Redirecting...' : 'Pay now'}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn mini-btn"
                    disabled={downloadingProductId === previewProduct.id}
                    onClick={() => handleDownloadMarketplaceDocument(previewProduct.id, previewProduct.documentName)}
                  >
                    {downloadingProductId === previewProduct.id ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn mini-btn report-trigger-btn"
                    onClick={() =>
                      openReportModal(
                        'product',
                        previewProduct.id,
                        previewProduct.name || previewProduct.documentName || 'this product',
                      )
                    }
                  >
                    Report
                  </button>
                  <button type="button" className="secondary-btn mini-btn" onClick={() => setPreviewProduct(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {reportTarget ? (
        <Suspense fallback={null}>
          <ReportModal
            isOpen
            currentUserId={userId}
            targetType={reportTarget?.targetType || 'product'}
            targetId={reportTarget?.targetId || ''}
            targetLabel={reportTarget?.targetLabel || ''}
            onClose={closeReportModal}
            onSuccess={(message) => showNotification('success', message)}
          />
        </Suspense>
      ) : null}

      {tourMounted ? (
        <Suspense fallback={null}>
          <DashboardTour
            key={tourSession}
            run={tourRunning}
            onClose={handleCloseTour}
          />
        </Suspense>
      ) : null}
    </div>
  )
}

export default ArtisanProfile
