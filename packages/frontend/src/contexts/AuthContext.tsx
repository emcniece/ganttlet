import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@ganttlet/shared'
import { api } from '../utils/api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  backendAvailable: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [backendAvailable, setBackendAvailable] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const u = await api.auth.me()
      setUser(u)
      setBackendAvailable(true)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Check if backend is reachable
  useEffect(() => {
    api.health()
      .then(() => setBackendAvailable(true))
      .catch(() => setBackendAvailable(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Listen for hash-based OAuth callback
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#/auth/success') {
        window.history.replaceState(null, '', window.location.pathname)
        refresh()
      }
    }
    window.addEventListener('hashchange', handleHash)
    handleHash() // check on mount
    return () => window.removeEventListener('hashchange', handleHash)
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.auth.login({ email, password })
    setUser(u)
  }, [])

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const u = await api.auth.register({ email, password, displayName })
    setUser(u)
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, backendAvailable, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
