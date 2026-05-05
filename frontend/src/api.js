import axios from 'axios'

// Use environment override when available (e.g., production), otherwise fall back to Vite dev proxy.
const baseURL = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({
  baseURL,
})

/** Short-lived GET cache to collapse duplicate reads (same URL/params/user) during navigation. */
const CACHE_TTL_MS = 8000
const responseCache = new Map()

function requestMethod(config) {
  return String(config?.method || 'get').toLowerCase()
}

function buildCacheKey(config) {
  const url = config.url || ''
  const params =
    config.params === undefined || config.params === null
      ? ''
      : typeof config.params === 'string'
        ? config.params
        : JSON.stringify(config.params)
  const headers = config.headers || {}
  const userId = headers['x-user-id'] || headers['X-User-Id'] || ''
  return `${requestMethod(config)}:${url}:${params}:${userId}`
}

api.interceptors.request.use((config) => {
  const method = requestMethod(config)
  if (method !== 'get' || config.skipApiCache) return config

  const key = buildCacheKey(config)
  const hit = responseCache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    config.adapter = async (cfg) => ({
      data: hit.data,
      status: 200,
      statusText: 'OK',
      headers: { ...hit.headers },
      config: cfg,
      request: { cached: true },
    })
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    const cfg = response.config
    const method = requestMethod(cfg)
    if (method !== 'get' || cfg.skipApiCache || response.request?.cached) return response

    const key = buildCacheKey(cfg)
    responseCache.set(key, {
      data: response.data,
      ts: Date.now(),
      headers: response.headers || {},
    })
    return response
  },
  (error) => Promise.reject(error),
)

export function withUserHeaders(userId, config = {}) {
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      ...(userId ? { 'x-user-id': userId } : {}),
    },
  }
}

export default api
