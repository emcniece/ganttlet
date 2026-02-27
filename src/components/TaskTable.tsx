import type { Task } from '../types'

interface TaskTableProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

export function TaskTable({ tasks, onEdit, onDelete }: TaskTableProps) {
  if (tasks.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
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
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-gray-50">
              <td className="p-2 border border-gray-200">{task.name}</td>
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
