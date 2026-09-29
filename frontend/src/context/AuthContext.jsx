import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('wmg_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Listen for 401 expiry events from axios interceptor
  useEffect(() => {
    const handler = (e) => {
      setUser(null)
      setAuthError('Your session has expired. Please log in again.')
    }
    window.addEventListener('wmg:auth:expired', handler)
    return () => window.removeEventListener('wmg:auth:expired', handler)
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setAuthError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      const { access_token, user: userData } = res.data
      localStorage.setItem('wmg_token', access_token)
      localStorage.setItem('wmg_user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } catch (e) {
      setAuthError(e.message || 'Login failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    localStorage.removeItem('wmg_token')
    localStorage.removeItem('wmg_user')
    setUser(null)
    setAuthError('')
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, authError, setAuthError, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
