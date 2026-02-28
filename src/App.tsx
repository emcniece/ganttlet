import { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Task } from './types'
import { useLocalStorage } from './hooks/useLocalStorage'
import { GanttChart } from './components/GanttChart'
import { TaskTable } from './components/TaskTable'
import { TaskForm } from './components/TaskForm'
import { Toolbar } from './components/Toolbar'
import { SettingsModal } from './components/SettingsModal'
import { LegalModal } from './components/LegalModal'
import { sampleTasks } from './sampleTasks'
import { applyDateChange } from './utils/transformTasks'

export default function App() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('gantt-tasks', sampleTasks)
  const [googleClientId, setGoogleClientId] = useLocalStorage<string>('gantt-google-client-id', '')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const getHashRoute = useCallback(() => window.location.hash.replace('#', ''), [])

  const [isPrivacyOpen, setIsPrivacyOpen] = useState(() => getHashRoute() === '/privacy')
  const [isTermsOpen, setIsTermsOpen] = useState(() => getHashRoute() === '/terms')

  const openPrivacy = () => {
    setIsPrivacyOpen(true)
    window.location.hash = '/privacy'
  }

  const closePrivacy = () => {
    setIsPrivacyOpen(false)
    window.history.replaceState(null, '', window.location.pathname)
  }

  const openTerms = () => {
    setIsTermsOpen(true)
    window.location.hash = '/terms'
  }

  const closeTerms = () => {
    setIsTermsOpen(false)
    window.history.replaceState(null, '', window.location.pathname)
  }

  useEffect(() => {
    const handleHashChange = () => {
      const route = getHashRoute()
      setIsPrivacyOpen(route === '/privacy')
      setIsTermsOpen(route === '/terms')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [getHashRoute])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isFormOpen) {
        setIsFormOpen(false)
        setEditingTask(null)
      } else if (isSettingsOpen) {
        setIsSettingsOpen(false)
      } else if (isPrivacyOpen) {
        closePrivacy()
      } else if (isTermsOpen) {
        closeTerms()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isFormOpen, isSettingsOpen, isPrivacyOpen, isTermsOpen])

  const [chartReady, setChartReady] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  const handleChartReady = useCallback(() => setChartReady(true), [])

  const handleAdd = () => {
    setEditingTask(null)
    setIsFormOpen(true)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setTasks((prev) =>
      prev
        .filter((t) => t.id !== id)
        .map((t) => ({
          ...t,
          dependencies: t.dependencies.filter((depId) => depId !== id),
        }))
    )
    setChartReady(false)
  }

  const handleSave = (task: Task) => {
    if (editingTask) {
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? { ...task, id: editingTask.id } : t)))
    } else {
      setTasks((prev) => [...prev, { ...task, id: uuidv4() }])
    }
    setIsFormOpen(false)
    setEditingTask(null)
    setChartReady(false)
  }

  const handleTaskDateChange = useCallback(
    (taskId: string, start: Date, end: Date) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t
          return { ...t, ...applyDateChange(t, start, end) }
        })
      )
    },
    [setTasks]
  )

  const handleTaskReorder = useCallback(
    (reordered: Task[]) => {
      setTasks(reordered)
    },
    [setTasks]
  )

  const handleDependencyAdd = useCallback(
    (fromTaskId: string, toTaskId: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== toTaskId) return t
          if (t.dependencies.includes(fromTaskId)) return t
          return { ...t, dependencies: [...t.dependencies, fromTaskId] }
        })
      )
    },
    [setTasks]
  )

  const handleDependencyRemove = useCallback(
    (fromTaskId: string, toTaskId: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== toTaskId) return t
          return { ...t, dependencies: t.dependencies.filter((id) => id !== fromTaskId) }
        })
      )
    },
    [setTasks]
  )

  const handleImport = (imported: Task[]) => {
    setTasks(imported)
    setChartReady(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ganttlet</h1>
          <div className="flex gap-3 items-center">
            <Toolbar
              tasks={tasks}
              onImport={handleImport}
              chartRef={chartRef}
              chartReady={chartReady}
              googleClientId={googleClientId}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Add Task
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <GanttChart
            ref={chartRef}
            tasks={tasks}
            onTaskClick={handleEdit}
            onTaskDateChange={handleTaskDateChange}
            onTaskReorder={handleTaskReorder}
            onDependencyAdd={handleDependencyAdd}
            onDependencyRemove={handleDependencyRemove}
            onReady={handleChartReady}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <TaskTable tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} onReorder={handleTaskReorder} />
        </div>

        <footer className="mt-6 text-center text-xs text-gray-400">
          <a href="#/privacy" onClick={openPrivacy} className="hover:text-gray-600 underline">
            Privacy Policy
          </a>
          <span className="mx-2">·</span>
          <a href="#/terms" onClick={openTerms} className="hover:text-gray-600 underline">
            Terms of Service
          </a>
        </footer>
      </div>

      {isFormOpen && (
        <TaskForm
          task={editingTask}
          tasks={tasks}
          onSave={handleSave}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingTask(null)
          }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          clientId={googleClientId}
          onSave={(id) => {
            setGoogleClientId(id)
            setIsSettingsOpen(false)
          }}
          onCancel={() => setIsSettingsOpen(false)}
        />
      )}

      {isPrivacyOpen && (
        <LegalModal title="Privacy Policy" onClose={closePrivacy}>
          <p>Ganttlet is a static, client-side application. No data is collected or transmitted to any server.</p>
          <p>Your tasks are stored exclusively in your browser's localStorage. No cookies, analytics, or tracking of any kind are used.</p>
          <p>If you use the optional Google Sheets export, your task data is sent directly to Google via their API. This action is always user-initiated and governed by Google's own privacy policies.</p>
        </LegalModal>
      )}

      {isTermsOpen && (
        <LegalModal title="Terms of Service" onClose={closeTerms}>
          <p>Ganttlet is provided "as is" without warranty of any kind, express or implied.</p>
          <p>All data is stored locally in your browser. You are responsible for backing up your own data. The authors are not liable for any data loss.</p>
          <p>Use of this application is at your own risk.</p>
        </LegalModal>
      )}
    </div>
  )
}
