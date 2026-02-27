import type { Task } from '../types'
import type { FrappeTask } from 'frappe-gantt'

export function transformToFrappeTasks(tasks: Task[]): FrappeTask[] {
  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    start: t.start,
    end: t.end,
    progress: t.percentComplete,
    dependencies: t.dependencies.join(', '),
    color: t.color,
  }))
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function applyDateChange(
  _task: Task,
  newStart: Date,
  newEnd: Date
): Pick<Task, 'start' | 'end'> {
  return {
    start: formatDate(newStart),
    end: formatDate(newEnd),
  }
}
