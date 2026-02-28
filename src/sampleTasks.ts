import type { Task } from './types'

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysFromToday(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return formatDate(d)
}

export const sampleTasks: Task[] = [
  {
    id: 'sample-1',
    name: 'Research & Planning',
    resource: 'Planning',
    start: daysFromToday(0),
    end: daysFromToday(6),
    duration: null,
    percentComplete: 100,
    dependencies: [],
    color: '#3b82f6',
  },
  {
    id: 'sample-2',
    name: 'Design Mockups',
    resource: 'Design',
    start: daysFromToday(7),
    end: daysFromToday(13),
    duration: null,
    percentComplete: 75,
    dependencies: ['sample-1'],
    color: '#8b5cf6',
  },
  {
    id: 'sample-3',
    name: 'Core Development',
    resource: 'Development',
    start: daysFromToday(9),
    end: daysFromToday(23),
    duration: null,
    percentComplete: 40,
    dependencies: ['sample-1'],
    color: '#10b981',
  },
  {
    id: 'sample-4',
    name: 'Testing & QA',
    resource: 'QA',
    start: daysFromToday(24),
    end: daysFromToday(30),
    duration: null,
    percentComplete: 0,
    dependencies: ['sample-3'],
    color: '#f59e0b',
  },
  {
    id: 'sample-5',
    name: 'Launch',
    resource: 'Planning',
    start: daysFromToday(31),
    end: daysFromToday(33),
    duration: null,
    percentComplete: 0,
    dependencies: ['sample-2', 'sample-4'],
    color: '#ef4444',
  },
]
