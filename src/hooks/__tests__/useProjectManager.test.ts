import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProjectManager } from '../useProjectManager'
import type { Task } from '../../types'

vi.mock('uuid', () => {
  let counter = 0
  return { v4: () => `mock-uuid-${++counter}` }
})

const sampleTask: Task = {
  id: 'task-1',
  name: 'Sample',
  resource: 'Dev',
  start: '2025-01-01',
  end: '2025-01-10',
  duration: null,
  percentComplete: 0,
  dependencies: [],
}

beforeEach(() => {
  localStorage.clear()
})

describe('useProjectManager', () => {
  describe('migration', () => {
    it('migrates legacy gantt-tasks and gantt-settings to new format', () => {
      const legacyTasks = [sampleTask]
      const legacySettings = { chartStartDate: '2025-01-01', chartEndDate: '2025-12-31' }
      localStorage.setItem('gantt-tasks', JSON.stringify(legacyTasks))
      localStorage.setItem('gantt-settings', JSON.stringify(legacySettings))

      const { result } = renderHook(() => useProjectManager())

      expect(result.current.projects).toHaveLength(1)
      expect(result.current.projects[0].name).toBe('My Project')
      expect(result.current.tasks).toEqual(legacyTasks)
      expect(result.current.appSettings).toEqual(legacySettings)

      // Legacy keys should be removed
      expect(localStorage.getItem('gantt-tasks')).toBeNull()
      expect(localStorage.getItem('gantt-settings')).toBeNull()
    })

    it('creates a default project with sample tasks when no legacy data exists', () => {
      const { result } = renderHook(() => useProjectManager())

      expect(result.current.projects).toHaveLength(1)
      expect(result.current.projects[0].name).toBe('My Project')
      expect(result.current.tasks.length).toBeGreaterThan(0)
    })

    it('does not re-migrate if gantt-projects already exists', () => {
      const projects = [{ id: 'existing', name: 'Existing' }]
      localStorage.setItem('gantt-projects', JSON.stringify(projects))
      localStorage.setItem('gantt-active-project', JSON.stringify('existing'))

      const { result } = renderHook(() => useProjectManager())

      expect(result.current.projects).toEqual(projects)
    })
  })

  describe('createProject', () => {
    it('adds a new project to the registry', () => {
      const { result } = renderHook(() => useProjectManager())

      let newId: string
      act(() => {
        newId = result.current.createProject('New Project')
      })

      expect(result.current.projects).toHaveLength(2)
      expect(result.current.projects[1].name).toBe('New Project')
      expect(result.current.projects[1].id).toBe(newId!)
    })

    it('creates a project with initial tasks', () => {
      const { result } = renderHook(() => useProjectManager())

      let newId: string
      act(() => {
        newId = result.current.createProject('With Tasks', [sampleTask])
      })

      // Switch to verify data was saved
      act(() => {
        result.current.switchProject(newId!)
      })

      expect(result.current.tasks).toEqual([sampleTask])
    })

    it('creates a project with initial settings', () => {
      const { result } = renderHook(() => useProjectManager())

      const settings = { chartStartDate: '2025-06-01', chartEndDate: '2025-12-31' }
      let newId: string
      act(() => {
        newId = result.current.createProject('With Settings', [], settings)
      })

      act(() => {
        result.current.switchProject(newId!)
      })

      expect(result.current.appSettings).toEqual(settings)
    })
  })

  describe('switchProject', () => {
    it('loads data from the target project', () => {
      const { result } = renderHook(() => useProjectManager())

      let secondId: string
      act(() => {
        secondId = result.current.createProject('Second', [sampleTask])
      })

      act(() => {
        result.current.switchProject(secondId!)
      })

      expect(result.current.activeProjectId).toBe(secondId!)
      expect(result.current.tasks).toEqual([sampleTask])
    })
  })

  describe('renameProject', () => {
    it('updates the project name', () => {
      const { result } = renderHook(() => useProjectManager())

      const projectId = result.current.projects[0].id

      act(() => {
        result.current.renameProject(projectId, 'Renamed')
      })

      expect(result.current.projects[0].name).toBe('Renamed')
    })
  })

  describe('deleteProject', () => {
    it('does not delete the last project', () => {
      const { result } = renderHook(() => useProjectManager())

      const projectId = result.current.projects[0].id

      act(() => {
        result.current.deleteProject(projectId)
      })

      expect(result.current.projects).toHaveLength(1)
    })

    it('deletes a non-active project', () => {
      const { result } = renderHook(() => useProjectManager())

      let secondId: string
      act(() => {
        secondId = result.current.createProject('Second')
      })

      act(() => {
        result.current.deleteProject(secondId!)
      })

      expect(result.current.projects).toHaveLength(1)
      expect(result.current.projects.find((p) => p.id === secondId!)).toBeUndefined()
    })

    it('cleans up localStorage for deleted project', () => {
      const { result } = renderHook(() => useProjectManager())

      let secondId: string
      act(() => {
        secondId = result.current.createProject('Second', [sampleTask])
      })

      expect(localStorage.getItem(`gantt-project-data-${secondId!}`)).not.toBeNull()

      act(() => {
        result.current.deleteProject(secondId!)
      })

      expect(localStorage.getItem(`gantt-project-data-${secondId!}`)).toBeNull()
    })
  })

  describe('setTasks', () => {
    it('updates tasks for the active project', () => {
      const { result } = renderHook(() => useProjectManager())

      act(() => {
        result.current.setTasks([sampleTask])
      })

      expect(result.current.tasks).toEqual([sampleTask])
    })

    it('accepts a function updater', () => {
      const { result } = renderHook(() => useProjectManager())

      act(() => {
        result.current.setTasks([sampleTask])
      })

      act(() => {
        result.current.setTasks((prev) => [...prev, { ...sampleTask, id: 'task-2', name: 'Another' }])
      })

      expect(result.current.tasks).toHaveLength(2)
    })
  })

  describe('setAppSettings', () => {
    it('updates settings for the active project', () => {
      const { result } = renderHook(() => useProjectManager())

      act(() => {
        result.current.setAppSettings({ chartStartDate: '2025-03-01', chartEndDate: '2025-09-30' })
      })

      expect(result.current.appSettings).toEqual({
        chartStartDate: '2025-03-01',
        chartEndDate: '2025-09-30',
      })
    })
  })

  describe('undo/redo', () => {
    it('undoes a task change', () => {
      const { result } = renderHook(() => useProjectManager())

      const original = result.current.tasks

      act(() => {
        result.current.setTasks([sampleTask])
      })

      act(() => {
        result.current.undoTasks()
      })

      expect(result.current.tasks).toEqual(original)
    })

    it('redoes a task change', () => {
      const { result } = renderHook(() => useProjectManager())

      act(() => {
        result.current.setTasks([sampleTask])
      })

      act(() => {
        result.current.undoTasks()
      })

      act(() => {
        result.current.redoTasks()
      })

      expect(result.current.tasks).toEqual([sampleTask])
    })
  })

  describe('persistence', () => {
    it('syncs project data to localStorage', async () => {
      const { result } = renderHook(() => useProjectManager())

      act(() => {
        result.current.setTasks([sampleTask])
      })

      // Wait for useEffect to fire
      await vi.waitFor(() => {
        const stored = localStorage.getItem(`gantt-project-data-${result.current.activeProjectId}`)
        const data = JSON.parse(stored!)
        expect(data.tasks).toEqual([sampleTask])
      })
    })
  })
})
