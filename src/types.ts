export interface Task {
  id: string
  name: string
  resource: string
  start: string // ISO date string (YYYY-MM-DD)
  end: string // ISO date string (YYYY-MM-DD)
  duration: number | null // milliseconds, null if start+end provided
  percentComplete: number // 0-100
  dependencies: string[] // array of task IDs
}

export type GanttRow = [
  string, // Task ID
  string, // Task Name
  string, // Resource
  Date, // Start
  Date, // End
  number | null, // Duration (ms)
  number, // Percent Complete
  string, // Dependencies (comma-separated IDs)
]

export interface AppData {
  version: number
  tasks: Task[]
}
