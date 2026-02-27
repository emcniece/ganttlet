import { describe, it, expect } from 'vitest'
import { transformToFrappeTasks, applyDateChange } from '../transformTasks'
import type { Task } from '../../types'

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1',
  name: 'Test Task',
  resource: 'Dev',
  start: '2025-01-10',
  end: '2025-01-20',
  duration: null,
  percentComplete: 50,
  dependencies: [],
  ...overrides,
})

describe('transformToFrappeTasks', () => {
  it('maps Task fields to FrappeTask fields', () => {
    const tasks = [makeTask({ id: 'a', name: 'Alpha', percentComplete: 75, color: '#ff0000' })]
    const result = transformToFrappeTasks(tasks)

    expect(result).toEqual([
      {
        id: 'a',
        name: 'Alpha',
        start: '2025-01-10',
        end: '2025-01-20',
        progress: 75,
        dependencies: '',
        color: '#ff0000',
      },
    ])
  })

  it('joins multiple dependencies with commas', () => {
    const tasks = [makeTask({ dependencies: ['a', 'b', 'c'] })]
    const result = transformToFrappeTasks(tasks)

    expect(result[0].dependencies).toBe('a, b, c')
  })

  it('returns empty array for empty input', () => {
    expect(transformToFrappeTasks([])).toEqual([])
  })
})

describe('applyDateChange', () => {
  it('formats dates as YYYY-MM-DD strings', () => {
    const task = makeTask()
    const result = applyDateChange(task, new Date(2025, 2, 5), new Date(2025, 2, 15))

    expect(result).toEqual({ start: '2025-03-05', end: '2025-03-15' })
  })

  it('zero-pads single-digit months and days', () => {
    const task = makeTask()
    const result = applyDateChange(task, new Date(2025, 0, 1), new Date(2025, 0, 9))

    expect(result).toEqual({ start: '2025-01-01', end: '2025-01-09' })
  })
})
