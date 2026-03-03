import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseCSV, csvToTasks } from '../csvImport'

let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: () => `uuid-${++uuidCounter}`,
}))

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const result = parseCSV('a,b,c\n1,2,3')
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted fields with commas', () => {
    const result = parseCSV('name,desc\n"Smith, John","A, B, C"')
    expect(result).toEqual([
      ['name', 'desc'],
      ['Smith, John', 'A, B, C'],
    ])
  })

  it('handles escaped quotes', () => {
    const result = parseCSV('a\n"He said ""hello"""')
    expect(result).toEqual([['a'], ['He said "hello"']])
  })

  it('handles CRLF line endings', () => {
    const result = parseCSV('a,b\r\n1,2\r\n3,4')
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('handles empty fields', () => {
    const result = parseCSV('a,,c\n,2,')
    expect(result).toEqual([
      ['a', '', 'c'],
      ['', '2', ''],
    ])
  })

  it('trims whitespace from fields', () => {
    const result = parseCSV('  a , b \n 1 , 2 ')
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('csvToTasks', () => {
  beforeEach(() => {
    uuidCounter = 0
  })

  it('parses standard columns', () => {
    const csv = [
      'Task Name,Resource,Start Date,End Date,% Complete',
      'Design,Design Team,2025-01-01,2025-01-10,50',
      'Build,Dev Team,2025-01-11,2025-01-20,0',
    ].join('\n')

    const tasks = csvToTasks(csv)
    expect(tasks).toHaveLength(2)
    expect(tasks[0].name).toBe('Design')
    expect(tasks[0].resource).toBe('Design Team')
    expect(tasks[0].start).toBe('2025-01-01')
    expect(tasks[0].end).toBe('2025-01-10')
    expect(tasks[0].percentComplete).toBe(50)
    expect(tasks[1].name).toBe('Build')
  })

  it('resolves dependency names to IDs', () => {
    const csv = [
      'Task Name,Start Date,End Date,Dependencies',
      'Alpha,2025-01-01,2025-01-05,',
      'Beta,2025-01-06,2025-01-10,Alpha',
    ].join('\n')

    const tasks = csvToTasks(csv)
    expect(tasks[1].dependencies).toEqual([tasks[0].id])
  })

  it('handles multiple dependencies separated by commas', () => {
    const csv = [
      'Task Name,Start Date,End Date,Dependencies',
      'A,2025-01-01,2025-01-05,',
      'B,2025-01-01,2025-01-05,',
      'C,2025-01-06,2025-01-10,"A, B"',
    ].join('\n')

    const tasks = csvToTasks(csv)
    expect(tasks[2].dependencies).toEqual([tasks[0].id, tasks[1].id])
  })

  it('throws if no Task Name column found', () => {
    const csv = 'Foo,Bar\n1,2'
    expect(() => csvToTasks(csv)).toThrow('Task Name')
  })

  it('skips empty rows', () => {
    const csv = 'Task Name\nAlpha\n\nBeta'
    const tasks = csvToTasks(csv)
    expect(tasks).toHaveLength(2)
  })

  it('handles M/D/YYYY date format', () => {
    const csv = 'Task Name,Start Date,End Date\nTest,1/5/2025,1/15/2025'
    const tasks = csvToTasks(csv)
    expect(tasks[0].start).toBe('2025-01-05')
    expect(tasks[0].end).toBe('2025-01-15')
  })

  it('defaults missing end date using duration', () => {
    const csv = 'Task Name,Start Date,Duration\nTest,2025-03-01,5'
    const tasks = csvToTasks(csv)
    expect(tasks[0].start).toBe('2025-03-01')
    expect(tasks[0].end).toBe('2025-03-05')
  })

  it('clamps percent complete to 0-100', () => {
    const csv = 'Task Name,% Complete\nA,150\nB,-10'
    const tasks = csvToTasks(csv)
    expect(tasks[0].percentComplete).toBe(100)
    expect(tasks[1].percentComplete).toBe(0)
  })

  it('handles color column', () => {
    const csv = 'Task Name,Color\nA,#ff0000'
    const tasks = csvToTasks(csv)
    expect(tasks[0].color).toBe('#ff0000')
  })

  it('ignores unresolvable dependency names', () => {
    const csv = [
      'Task Name,Dependencies',
      'A,',
      'B,Nonexistent',
    ].join('\n')

    const tasks = csvToTasks(csv)
    expect(tasks[1].dependencies).toEqual([])
  })
})
