import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Task, AppSettings, Project, ProjectData } from '../types'
import { useLocalStorage } from './useLocalStorage'
import { useUndoRedo } from './useUndoRedo'
import { sampleTasks } from '../sampleTasks'

const DEFAULT_SETTINGS: AppSettings = { chartStartDate: '', chartEndDate: '' }

function loadProjectData(id: string): ProjectData {
  try {
    const raw = localStorage.getItem(`gantt-project-data-${id}`)
    if (raw) return JSON.parse(raw) as ProjectData
  } catch { /* ignore */ }
  return { tasks: [...sampleTasks], settings: { ...DEFAULT_SETTINGS } }
}

function saveProjectData(id: string, data: ProjectData) {
  try {
    localStorage.setItem(`gantt-project-data-${id}`, JSON.stringify(data))
  } catch { /* storage full */ }
}

function migrateIfNeeded(): { projects: Project[]; activeId: string } | null {
  if (localStorage.getItem('gantt-projects')) return null

  let tasks: Task[] = sampleTasks
  let settings: AppSettings = { ...DEFAULT_SETTINGS }

  try {
    const rawTasks = localStorage.getItem('gantt-tasks')
    if (rawTasks) tasks = JSON.parse(rawTasks) as Task[]
  } catch { /* ignore */ }

  try {
    const rawSettings = localStorage.getItem('gantt-settings')
    if (rawSettings) settings = JSON.parse(rawSettings) as AppSettings
  } catch { /* ignore */ }

  const id = uuidv4()
  const projects: Project[] = [{ id, name: 'My Project' }]
  const data: ProjectData = { tasks, settings }

  localStorage.setItem('gantt-projects', JSON.stringify(projects))
  localStorage.setItem('gantt-active-project', JSON.stringify(id))
  saveProjectData(id, data)

  // Remove legacy keys
  localStorage.removeItem('gantt-tasks')
  localStorage.removeItem('gantt-settings')

  return { projects, activeId: id }
}

export function useProjectManager() {
  // Run migration before first render
  const migrated = useRef(migrateIfNeeded()).current

  const [projects, setProjects] = useLocalStorage<Project[]>(
    'gantt-projects',
    migrated?.projects ?? [{ id: 'default', name: 'My Project' }]
  )
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string>(
    'gantt-active-project',
    migrated?.activeId ?? projects[0]?.id ?? 'default'
  )

  // Project data state (not using useLocalStorage because key is dynamic)
  const [projectData, setProjectData] = useState<ProjectData>(() =>
    loadProjectData(activeProjectId)
  )

  // Undo/redo wraps task mutations
  const [tasks, setTasksRaw] = [projectData.tasks, (fn: React.SetStateAction<Task[]>) => {
    setProjectData((prev) => ({
      ...prev,
      tasks: typeof fn === 'function' ? fn(prev.tasks) : fn,
    }))
  }]

  const {
    setValue: setTasks,
    undo: undoTasks,
    redo: redoTasks,
    reset: resetUndoRedo,
  } = useUndoRedo(tasks, setTasksRaw)

  const setAppSettings = useCallback((fn: React.SetStateAction<AppSettings>) => {
    setProjectData((prev) => ({
      ...prev,
      settings: typeof fn === 'function' ? fn(prev.settings) : fn,
    }))
  }, [])

  // Sync project data to localStorage whenever it changes
  useEffect(() => {
    saveProjectData(activeProjectId, projectData)
  }, [activeProjectId, projectData])

  // Switch project: load data for new project
  const switchProject = useCallback((id: string) => {
    // Save current project data first (already synced via effect, but be safe)
    setActiveProjectId(id)
    setProjectData(loadProjectData(id))
    resetUndoRedo()
  }, [setActiveProjectId, resetUndoRedo])

  const createProject = useCallback((
    name: string,
    initialTasks?: Task[],
    initialSettings?: AppSettings
  ): string => {
    const id = uuidv4()
    const newProject: Project = { id, name }
    setProjects((prev) => [...prev, newProject])

    const data: ProjectData = {
      tasks: initialTasks ?? [],
      settings: initialSettings ?? { ...DEFAULT_SETTINGS },
    }
    saveProjectData(id, data)

    return id
  }, [setProjects])

  const renameProject = useCallback((id: string, name: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }, [setProjects])

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((p) => p.id !== id)

      // If deleting the active project, switch to first remaining
      if (id === activeProjectId && next.length > 0) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => switchProject(next[0].id), 0)
      }

      // Clean up localStorage
      try { localStorage.removeItem(`gantt-project-data-${id}`) } catch { /* ignore */ }

      return next
    })
  }, [setProjects, activeProjectId, switchProject])

  return {
    projects,
    activeProjectId,
    tasks,
    setTasks,
    appSettings: projectData.settings,
    setAppSettings,
    undoTasks,
    redoTasks,
    createProject,
    switchProject,
    renameProject,
    deleteProject,
  }
}
