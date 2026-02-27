import { useState, useEffect } from 'react'
import type { Task } from '../types'

interface TaskFormProps {
  task: Task | null // null = add mode, Task = edit mode
  tasks: Task[] // all tasks (for dependency picker)
  onSave: (task: Task) => void
  onCancel: () => void
}

const MS_PER_DAY = 86400000

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function TaskForm({ task, tasks, onSave, onCancel }: TaskFormProps) {
  const [name, setName] = useState('')
  const [resource, setResource] = useState('')
  const [start, setStart] = useState(todayISO())
  const [end, setEnd] = useState(todayISO())
  const [durationDays, setDurationDays] = useState('')
  const [percentComplete, setPercentComplete] = useState(0)
  const [dependencies, setDependencies] = useState<string[]>([])
  const [useDuration, setUseDuration] = useState(false)

  useEffect(() => {
    if (task) {
      setName(task.name)
      setResource(task.resource)
      setStart(task.start)
      setEnd(task.end)
      setPercentComplete(task.percentComplete)
      setDependencies(task.dependencies)
      if (task.duration !== null) {
        setUseDuration(true)
        setDurationDays(String(task.duration / MS_PER_DAY))
      } else {
        setUseDuration(false)
        setDurationDays('')
      }
    }
  }, [task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const saved: Task = {
      id: task?.id ?? '',
      name: name.trim(),
      resource: resource.trim(),
      start,
      end,
      duration: useDuration && durationDays ? Number(durationDays) * MS_PER_DAY : null,
      percentComplete,
      dependencies,
    }
    onSave(saved)
  }

  const availableDeps = tasks.filter((t) => t.id !== task?.id)

  const toggleDep = (id: string) => {
    setDependencies((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold mb-4">
          {task ? 'Edit Task' : 'Add Task'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Resource</label>
            <input
              type="text"
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              placeholder="e.g. Development, Design"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date *</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required={!useDuration}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useDuration}
                onChange={(e) => setUseDuration(e.target.checked)}
              />
              Use duration instead of end date
            </label>
            {useDuration && (
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="Duration in days"
                min="1"
                className="w-full mt-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              % Complete: {percentComplete}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={percentComplete}
              onChange={(e) => setPercentComplete(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {availableDeps.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Dependencies</label>
              <div className="border border-gray-300 rounded p-2 max-h-32 overflow-y-auto space-y-1">
                {availableDeps.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={dependencies.includes(t.id)}
                      onChange={() => toggleDep(t.id)}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {task ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
