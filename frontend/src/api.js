import axios from 'axios'

// Use environment override when available (e.g., production), otherwise fall back to Vite dev proxy.
const baseURL = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({
  baseURL,
})

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
