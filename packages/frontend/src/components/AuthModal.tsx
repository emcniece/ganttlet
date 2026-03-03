import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

type Tab = 'login' | 'register'

interface AuthModalProps {
  onClose: () => void
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { login, register } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        await register(email, password, displayName)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'login', label: 'Sign In' },
    { key: 'register', label: 'Sign Up' },
  ]

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">Account</h2>

        <div className="flex border-b border-gray-200 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setError('') }}
              className={`px-4 py-2 text-sm font-medium -mb-px ${
                tab === t.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>
        )}

        <div className="space-y-3">
          {tab === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium mb-1">Display Name</label>
              <input
                id="auth-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={tab === 'register' ? 8 : 1}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
            {tab === 'register' && (
              <p className="text-xs text-gray-400 mt-1">At least 8 characters</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : tab === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-2">Or sign in with</p>
          <div className="flex gap-2">
            <a
              href="/api/auth/google"
              className="flex-1 px-3 py-1.5 text-sm text-center border border-gray-300 rounded hover:bg-gray-50"
            >
              Google
            </a>
            <a
              href="/api/auth/github"
              className="flex-1 px-3 py-1.5 text-sm text-center border border-gray-300 rounded hover:bg-gray-50"
            >
              GitHub
            </a>
          </div>
        </div>
      </form>
    </div>
  )
}
