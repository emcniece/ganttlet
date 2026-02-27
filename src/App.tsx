import { useState, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Task } from './types'
import { useLocalStorage } from './hooks/useLocalStorage'
import { GanttChart } from './components/GanttChart'
import { TaskTable } from './components/TaskTable'
import { TaskForm } from './components/TaskForm'
import { Toolbar } from './components/Toolbar'
import { sampleTasks } from './sampleTasks'
import { applyDateChange } from './utils/transformTasks'

export default function App() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('gantt-tasks', sampleTasks)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
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
            onReady={handleChartReady}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <TaskTable tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
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
    </div>
  )
}
