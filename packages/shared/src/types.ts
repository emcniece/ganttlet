// ── Existing task/project types ──

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

// ── Auth types ──

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
}

export interface AuthState {
  user: User | null
  loading: boolean
}

// ── Server project types ──

export type ProjectVisibility = 'public' | 'unlisted' | 'private'

export interface ServerProject {
  id: string
  ownerId: string
  name: string
  visibility: ProjectVisibility
  settings: AppSettings
  createdAt: string
  updatedAt: string
}

export interface ServerTask {
  id: string
  projectId: string
  name: string
  resource: string
  startDate: string
  endDate: string
  duration: number | null
  percentComplete: number
  dependencies: string[]
  color: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ── Sharing types ──

export type ShareRole = 'view' | 'edit'

export interface ProjectShare {
  id: string
  projectId: string
  userId: string | null
  email: string | null
  role: ShareRole
  createdAt: string
  user?: Pick<User, 'id' | 'email' | 'displayName' | 'avatarUrl'>
}

// ── API request/response types ──

export interface RegisterRequest {
  email: string
  password: string
  displayName: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface CreateProjectRequest {
  name: string
  visibility?: ProjectVisibility
  settings?: AppSettings
  tasks?: Task[]
}

export interface UpdateProjectRequest {
  name?: string
  visibility?: ProjectVisibility
  settings?: AppSettings
}

export interface BulkTasksRequest {
  tasks: Task[]
}

export interface CreateShareRequest {
  email: string
  role: ShareRole
}

export interface UpdateShareRequest {
  role: ShareRole
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface HealthResponse {
  status: 'ok'
  version: string
}

export interface ProjectListItem extends ServerProject {
  role: 'owner' | ShareRole
}
