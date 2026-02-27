import { describe, it, expect } from 'vitest'
import { importJSON } from '../fileIO'
import type { Task } from '../../types'

function makeFile(content: string): File {
  return new File([content], 'test.json', { type: 'application/json' })
}

const validTask: Task = {
  id: '1',
  name: 'Task',
  resource: 'Dev',
  start: '2025-01-01',
  end: '2025-01-10',
  duration: null,
  percentComplete: 0,
  dependencies: [],
}

describe('importJSON', () => {
  it('parses a valid AppData file and returns tasks', async () => {
    const file = makeFile(JSON.stringify({ version: 1, tasks: [validTask] }))
    const tasks = await importJSON(file)

    expect(tasks).toEqual([validTask])
  })

  it('rejects when version is missing', async () => {
    const file = makeFile(JSON.stringify({ tasks: [validTask] }))

    await expect(importJSON(file)).rejects.toThrow('Invalid file format')
  })

  it('rejects when tasks is not an array', async () => {
    const file = makeFile(JSON.stringify({ version: 1, tasks: 'not-an-array' }))

    await expect(importJSON(file)).rejects.toThrow('Invalid file format')
  })

  it('rejects on invalid JSON', async () => {
    const file = makeFile('not json at all')

    await expect(importJSON(file)).rejects.toThrow()
  })
})
