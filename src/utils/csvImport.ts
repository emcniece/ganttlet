import { v4 as uuidv4 } from 'uuid'
import type { Task } from '../types'

/**
 * RFC 4180 compliant CSV parser.
 * Handles quoted fields, embedded commas, and escaped quotes ("").
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        row.push(field.trim())
        field = ''
        i++
      } else if (ch === '\r') {
        // Handle \r\n or lone \r
        row.push(field.trim())
        field = ''
        rows.push(row)
        row = []
        i++
        if (i < text.length && text[i] === '\n') i++
      } else if (ch === '\n') {
        row.push(field.trim())
        field = ''
        rows.push(row)
        row = []
        i++
      } else {
        field += ch
        i++
      }
    }
  }

  // Final field/row
  if (field || row.length > 0) {
    row.push(field.trim())
    rows.push(row)
  }

  return rows
}

function parseDate(value: string): string {
  if (!value) return ''
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  // Try M/D/YYYY or MM/DD/YYYY
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Try parsing as a Date
  const d = new Date(value)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }
  return ''
}

/** Parse an ISO date string (YYYY-MM-DD) as local time, avoiding UTC timezone shifts. */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Convert CSV text to Task array.
 * Detects columns from header row using flexible matching.
 */
export function csvToTasks(csvText: string): Task[] {
  const rows = parseCSV(csvText)
  if (rows.length < 2) return []

  const headers = rows[0]

  // Find column indices
  let nameIdx = -1
  let resourceIdx = -1
  let startIdx = -1
  let endIdx = -1
  let offsetIdx = -1
  let durationIdx = -1
  let percentIdx = -1
  let dependenciesIdx = -1
  let colorIdx = -1

  headers.forEach((h, i) => {
    const lh = h.toLowerCase()
    if (lh === 'task name' || lh === 'task' || lh === 'name') nameIdx = i
    else if (lh === 'resource' || lh === 'resource name') resourceIdx = i
    else if (lh === 'start date' || lh === 'start') startIdx = i
    else if (lh === 'end date' || lh === 'end') endIdx = i
    else if (lh === 'start offset' || lh === 'offset') offsetIdx = i
    else if (lh === 'duration') durationIdx = i
    else if (lh === '% complete' || lh === 'percent complete' || lh === 'complete') percentIdx = i
    else if (lh === 'dependencies' || lh === 'depends on' || lh === 'depends') dependenciesIdx = i
    else if (lh === 'color' || lh === 'colour') colorIdx = i
  })

  if (nameIdx === -1) {
    throw new Error('CSV must contain a "Task Name" column')
  }

  const today = new Date()

  // First pass: create tasks, build name→ID map
  const nameToId = new Map<string, string>()
  const rawDeps: string[][] = []
  const tasks: Task[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const name = row[nameIdx] || ''
    if (!name) continue

    const id = uuidv4()
    nameToId.set(name.toLowerCase(), id)

    let start = startIdx >= 0 ? parseDate(row[startIdx] || '') : ''
    let end = endIdx >= 0 ? parseDate(row[endIdx] || '') : ''
    const offsetStr = offsetIdx >= 0 ? row[offsetIdx] || '' : ''
    const durationStr = durationIdx >= 0 ? row[durationIdx] || '' : ''
    const offset = offsetStr ? parseInt(offsetStr, 10) : NaN
    const durationDays = durationStr ? parseInt(durationStr, 10) : NaN

    // Compute start from offset if not provided
    if (!start && !isNaN(offset)) {
      const d = new Date(today)
      d.setDate(d.getDate() + offset)
      start = formatDate(d)
    }

    // Default start to today
    if (!start) {
      start = formatDate(today)
    }

    // Compute end from duration or default to start + 7 days
    if (!end && !isNaN(durationDays) && durationDays > 0) {
      const d = localDate(start)
      d.setDate(d.getDate() + durationDays - 1)
      end = formatDate(d)
    }
    if (!end) {
      const d = localDate(start)
      d.setDate(d.getDate() + 7)
      end = formatDate(d)
    }

    const percentStr = percentIdx >= 0 ? row[percentIdx] || '' : ''
    const percent = percentStr ? parseInt(percentStr, 10) : 0

    const depStr = dependenciesIdx >= 0 ? row[dependenciesIdx] || '' : ''
    rawDeps.push(depStr ? depStr.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [])

    const color = colorIdx >= 0 ? row[colorIdx] || undefined : undefined

    tasks.push({
      id,
      name,
      resource: resourceIdx >= 0 ? row[resourceIdx] || '' : '',
      start,
      end,
      duration: null,
      percentComplete: isNaN(percent) ? 0 : Math.max(0, Math.min(100, percent)),
      dependencies: [], // resolved in second pass
      ...(color ? { color } : {}),
    })
  }

  // Second pass: resolve dependency names to IDs
  for (let i = 0; i < tasks.length; i++) {
    const deps = rawDeps[i]
    if (deps.length > 0) {
      tasks[i].dependencies = deps
        .map((depName) => nameToId.get(depName.toLowerCase()))
        .filter((id): id is string => id !== undefined)
    }
  }

  return tasks
}
