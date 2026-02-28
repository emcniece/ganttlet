export interface Task {
  id: string
  name: string
  resource: string
  start: string // ISO date string (YYYY-MM-DD)
  end: string // ISO date string (YYYY-MM-DD)
  duration: number | null // milliseconds, null if start+end provided
  percentComplete: number // 0-100
  dependencies: string[] // array of task IDs
  color?: string // hex colour for gantt bar
}

export interface AppSettings {
  chartStartDate: string // ISO YYYY-MM-DD or '' (auto)
  chartEndDate: string   // ISO YYYY-MM-DD or '' (auto)
}

export interface AppData {
  version: number
  tasks: Task[]
}

export interface Project {
  id: string
  name: string
}

export interface ProjectData {
  tasks: Task[]
  settings: AppSettings
}
