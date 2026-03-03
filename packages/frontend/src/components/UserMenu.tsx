import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UserMenuProps {
  onOpenAuth: () => void
}

export function UserMenu({ onOpenAuth }: UserMenuProps) {
  const { user, loading, logout, backendAvailable } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  if (loading || !backendAvailable) return null

  if (!user) {
    return (
      <button
        onClick={onOpenAuth}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Sign In
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-gray-100"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-gray-700 max-w-[120px] truncate">{user.displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
            {user.email}
          </div>
          <button
            onClick={() => { logout(); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
