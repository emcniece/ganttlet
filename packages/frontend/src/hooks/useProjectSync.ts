import { useEffect, useRef, useCallback } from 'react'
import type { Task, AppSettings } from '@ganttlet/shared'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'

interface SyncState {
  projectId: string | null
  tasks: Task[]
  settings: AppSettings
}

/**
 * Debounced server sync when user is authenticated.
 * Watches tasks/settings and pushes changes to the server after a delay.
 */
export function useProjectSync(
  serverProjectId: string | null,
  tasks: Task[],
  settings: AppSettings,
) {
  const { user } = useAuth()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncRef = useRef<string>('')

  const sync = useCallback(async (state: SyncState) => {
    if (!state.projectId || !user) return

    const fingerprint = JSON.stringify({ tasks: state.tasks, settings: state.settings })
    if (fingerprint === lastSyncRef.current) return
    lastSyncRef.current = fingerprint

    try {
      await api.projects.syncTasks(state.projectId, { tasks: state.tasks })
      await api.projects.update(state.projectId, { settings: state.settings })
    } catch {
      // Silently fail — user can still work offline
    }
  }, [user])

  useEffect(() => {
    if (!user || !serverProjectId) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      sync({ projectId: serverProjectId, tasks, settings })
    }, 2000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user, serverProjectId, tasks, settings, sync])

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (serverProjectId && user) {
      await sync({ projectId: serverProjectId, tasks, settings })
    }
  }, [serverProjectId, user, tasks, settings, sync])

  return { saveNow }
}
