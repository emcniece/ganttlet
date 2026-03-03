import { useState, useEffect, useCallback } from 'react'
import type { ProjectShare, ProjectVisibility, ShareRole } from '@ganttlet/shared'
import { api } from '../utils/api'

interface ShareModalProps {
  projectId: string
  projectName: string
  visibility: ProjectVisibility
  onClose: () => void
  onVisibilityChange: (v: ProjectVisibility) => void
}

export function ShareModal({ projectId, projectName, visibility, onClose, onVisibilityChange }: ShareModalProps) {
  const [shares, setShares] = useState<ProjectShare[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('view')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadShares = useCallback(async () => {
    try {
      const list = await api.shares.list(projectId)
      setShares(list)
    } catch {
      // User may not be owner
    }
  }, [projectId])

  useEffect(() => { loadShares() }, [loadShares])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.shares.create(projectId, { email, role })
      setEmail('')
      loadShares()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (shareId: string) => {
    try {
      await api.shares.delete(projectId, shareId)
      loadShares()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  const handleRoleChange = async (shareId: string, newRole: ShareRole) => {
    try {
      await api.shares.update(projectId, shareId, { role: newRole })
      loadShares()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleVisibility = async (v: ProjectVisibility) => {
    try {
      await api.projects.update(projectId, { visibility: v })
      onVisibilityChange(v)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-1">Share "{projectName}"</h2>

        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>
        )}

        {/* Visibility */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => handleVisibility(e.target.value as ProjectVisibility)}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="private">Private - only you and invited users</option>
            <option value="unlisted">Unlisted - anyone with the link can view</option>
            <option value="public">Public - visible to everyone</option>
          </select>
        </div>

        {/* Invite form */}
        <form onSubmit={handleInvite} className="flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="view">View</option>
            <option value="edit">Edit</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Invite
          </button>
        </form>

        {/* Share list */}
        {shares.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {shares.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1">
                <div className="text-sm">
                  <span className="text-gray-900">{s.user?.displayName ?? s.email}</span>
                  {s.user && <span className="text-gray-400 text-xs ml-1">{s.user.email}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={s.role}
                    onChange={(e) => handleRoleChange(s.id, e.target.value as ShareRole)}
                    className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
                  >
                    <option value="view">View</option>
                    <option value="edit">Edit</option>
                  </select>
                  <button
                    onClick={() => handleRemove(s.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
