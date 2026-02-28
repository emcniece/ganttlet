import { useRef, useState } from 'react'
import type { Task } from '../types'
import { reorderTasks } from '../utils/transformTasks'

interface TaskTableProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onReorder?: (tasks: Task[]) => void
}

export function TaskTable({ tasks, onEdit, onDelete, onReorder }: TaskTableProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragHandleActive = useRef(false)

  if (tasks.length === 0) return null

  function handleDragStart(e: React.DragEvent, index: number) {
    if (!dragHandleActive.current) {
      e.preventDefault()
      return
    }
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIndex(index)
  }

  function handleDragEnd() {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex && onReorder) {
      onReorder(reorderTasks(tasks, dragIndex, overIndex))
    }
    setDragIndex(null)
    setOverIndex(null)
    dragHandleActive.current = false
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            {onReorder && <th className="w-8 p-2 border border-gray-200" />}
            <th className="p-2 border border-gray-200">Name</th>
            <th className="p-2 border border-gray-200">Resource</th>
            <th className="p-2 border border-gray-200">Start</th>
            <th className="p-2 border border-gray-200">End</th>
            <th className="p-2 border border-gray-200">% Complete</th>
            <th className="p-2 border border-gray-200">Dependencies</th>
            <th className="p-2 border border-gray-200">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => (
            <tr
              key={task.id}
              draggable={!!onReorder}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={
                'hover:bg-gray-50' +
                (dragIndex === i ? ' opacity-40' : '') +
                (overIndex === i && dragIndex !== null && dragIndex !== i
                  ? ' border-t-2 !border-t-blue-500'
                  : '')
              }
            >
              {onReorder && (
                <td className="p-2 border border-gray-200 text-center">
                  <span
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none"
                    onMouseDown={() => { dragHandleActive.current = true }}
                    onMouseUp={() => { dragHandleActive.current = false }}
                  >
                    ⠿
                  </span>
                </td>
              )}
              <td className="p-2 border border-gray-200">
                <div className="flex items-center gap-2">
                  {task.color && (
                    <span
                      className="inline-block w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: task.color }}
                    />
                  )}
                  {task.name}
                </div>
              </td>
              <td className="p-2 border border-gray-200">{task.resource}</td>
              <td className="p-2 border border-gray-200">{task.start}</td>
              <td className="p-2 border border-gray-200">{task.end}</td>
              <td className="p-2 border border-gray-200">{task.percentComplete}%</td>
              <td className="p-2 border border-gray-200">
                {task.dependencies
                  .map((depId) => tasks.find((t) => t.id === depId)?.name ?? depId)
                  .join(', ')}
              </td>
              <td className="p-2 border border-gray-200">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(task)}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
