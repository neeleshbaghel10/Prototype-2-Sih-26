import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request Interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wmg_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response Interceptor: handle 401/403 ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const message = err.response?.data?.detail || err.message || 'An error occurred'

    if (status === 401) {
      localStorage.removeItem('wmg_token')
      localStorage.removeItem('wmg_user')
      // Signal auth expiry — caught by AuthContext
      window.dispatchEvent(new CustomEvent('wmg:auth:expired', { detail: message }))
    }

    console.error(`[API ${status}]`, message)
    return Promise.reject(new Error(message))
  }
)

export default api
