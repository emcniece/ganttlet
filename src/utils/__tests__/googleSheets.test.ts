import { describe, it, expect } from 'vitest'
import { buildSheetData } from '../googleSheets'
import type { Task } from '../../types'

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1',
  name: 'Task A',
  resource: 'Dev',
  start: '2025-03-01',
  end: '2025-03-05',
  duration: null,
  percentComplete: 40,
  dependencies: [],
  ...overrides,
})

describe('buildSheetData', () => {
  it('returns empty array for no tasks', () => {
    expect(buildSheetData([])).toEqual([])
  })

  it('includes header row plus one data row', () => {
    const result = buildSheetData([makeTask()])

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual([
      'Task Name',
      'Resource',
      'Start Date',
      'End Date',
      'Start Offset (days)',
      'Duration (days)',
      '% Complete',
      'Dependencies',
    ])
  })

  it('computes offset relative to earliest task', () => {
    const tasks = [
      makeTask({ id: '1', start: '2025-03-01', end: '2025-03-05' }),
      makeTask({ id: '2', start: '2025-03-04', end: '2025-03-08' }),
    ]
    const result = buildSheetData(tasks)

    // First task starts at earliest → offset 0
    expect(result[1][4]).toBe(0)
    // Second task starts 3 days later
    expect(result[2][4]).toBe(3)
  })

  it('computes duration in days (minimum 1)', () => {
    const task = makeTask({ start: '2025-03-01', end: '2025-03-01' })
    const result = buildSheetData([task])

    // Same start/end → 0 days rounds to min of 1
    expect(result[1][5]).toBe(1)
  })

  it('resolves dependency IDs to task names', () => {
    const tasks = [
      makeTask({ id: 'a', name: 'Alpha' }),
      makeTask({ id: 'b', name: 'Beta', dependencies: ['a'] }),
    ]
    const result = buildSheetData(tasks)

    // Second row's dependencies column
    expect(result[2][7]).toBe('Alpha')
  })

  it('ignores unresolvable dependency IDs', () => {
    const tasks = [makeTask({ id: 'a', name: 'Alpha', dependencies: ['nonexistent'] })]
    const result = buildSheetData(tasks)

    expect(result[1][7]).toBe('')
  })
})
