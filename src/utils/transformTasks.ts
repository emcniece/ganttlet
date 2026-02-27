import type { Task, GanttRow } from '../types'

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const columns = [
  { type: 'string', label: 'Task ID' },
  { type: 'string', label: 'Task Name' },
  { type: 'string', label: 'Resource' },
  { type: 'date', label: 'Start Date' },
  { type: 'date', label: 'End Date' },
  { type: 'number', label: 'Duration' },
  { type: 'number', label: 'Percent Complete' },
  { type: 'string', label: 'Dependencies' },
]

export function transformTasks(tasks: Task[]): [typeof columns, ...GanttRow[]] {
  const rows: GanttRow[] = tasks.map((t) => [
    t.id,
    t.name,
    t.resource,
    parseDate(t.start),
    parseDate(t.end),
    t.duration,
    t.percentComplete,
    t.dependencies.join(','),
  ])
  return [columns, ...rows]
}
