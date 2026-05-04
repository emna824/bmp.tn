export function getEntityId(value) {
  if (!value) return ''
  return value.id || value._id || ''
}

export function getAdminId(user) {
  return getEntityId(user)
}

export function withAdminHeaders(user, config = {}) {
  const adminId = getAdminId(user)
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      ...(adminId ? { 'x-user-id': adminId } : {}),
    },
  }
}

export function getInitials(name) {
  const value = String(name || 'Admin').trim()
  if (!value) return 'AD'

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function formatDashboardDate(value) {
  if (!value) return 'Unknown date'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown date'

  return parsed.toLocaleString()
}

export function formatProductPrice(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'Not set'
  return numericValue.toFixed(2)
}

export function normalizeReport(report = {}) {
  const reporter = report.reporter && typeof report.reporter === 'object' ? report.reporter : null
  const target = report.target && typeof report.target === 'object' ? report.target : null
  const targetLabel =
    target?.name ||
    target?.email ||
    target?.documentName ||
    (report.targetType === 'product' ? 'Reported product' : 'Reported user')

  return {
    id: getEntityId(report),
    targetType: report.targetType || 'product',
    targetId: report.targetId || getEntityId(target),
    targetLabel,
    reason: report.reason || 'No reason provided',
    description: report.description || '',
    status: report.status || 'pending',
    createdAt: report.createdAt || null,
    reviewedAt: report.reviewedAt || null,
    reporter: reporter
      ? {
          id: getEntityId(reporter),
          name: reporter.name || 'Unknown reporter',
          email: reporter.email || '',
          role: reporter.role || '',
        }
      : null,
    target: target
      ? {
          id: getEntityId(target),
          name: target.name || '',
          email: target.email || '',
          role: target.role || '',
          description: target.description || '',
          price: target.price ?? null,
          documentName: target.documentName || '',
        }
      : null,
  }
}

export function normalizeUser(user = {}) {
  return {
    id: getEntityId(user),
    name: user.name || 'Unknown user',
    email: user.email || '',
    role: user.role || 'user',
    isBanned: Boolean(user.isBanned),
    banType: user.banType || null,
    banExpiresAt: user.banExpiresAt || null,
    profileImage: user.profileImage || '',
  }
}

export function normalizeProduct(product = {}) {
  const manufacturer =
    product.manufacturer && typeof product.manufacturer === 'object'
      ? product.manufacturer
      : product.manufacturerId && typeof product.manufacturerId === 'object'
      ? product.manufacturerId
      : null

  return {
    id: getEntityId(product),
    name: product.name || 'Unnamed product',
    price: product.price ?? null,
    stock: Number.isInteger(product.stock) ? product.stock : 1,
    image: product.image || '',
    description: product.description || '',
    documentName: product.documentName || '',
    createdAt: product.createdAt || null,
    manufacturerName: manufacturer?.name || product.manufacturerName || 'Unknown manufacturer',
    manufacturer: manufacturer
      ? {
          id: getEntityId(manufacturer),
          name: manufacturer.name || 'Unknown manufacturer',
          patent: manufacturer.patent || '',
          address: manufacturer.address || '',
          companyPhone: manufacturer.companyPhone || '',
        }
      : null,
  }
}

export function normalizeLog(log = {}) {
  const user = log.user && typeof log.user === 'object' ? log.user : null

  return {
    id: getEntityId(log),
    userId: log.userId || getEntityId(user),
    user: user
      ? {
          id: getEntityId(user),
          name: user.name || 'Unknown user',
          email: user.email || '',
          role: user.role || '',
        }
      : {
          id: log.userId || '',
          name: 'Unknown user',
          email: '',
          role: '',
        },
    action: log.action || 'unknown_action',
    entityType: log.entityType || 'entity',
    entityId: log.entityId || '',
    description: log.description || '',
    createdAt: log.createdAt || null,
  }
}
