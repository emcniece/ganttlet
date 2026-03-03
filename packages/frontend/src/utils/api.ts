import type {
  User,
  RegisterRequest,
  LoginRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
  BulkTasksRequest,
  CreateShareRequest,
  UpdateShareRequest,
  ProjectListItem,
  ProjectShare,
  Task,
  HealthResponse,
} from '@ganttlet/shared'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.error?.message ?? `Request failed: ${res.status}`
    throw new Error(message)
  }
  return res.json()
}

// Auth
export const api = {
  auth: {
    me: () => request<User | null>('/auth/me'),
    register: (data: RegisterRequest) =>
      request<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: LoginRequest) =>
      request<User>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () =>
      request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  },

  projects: {
    list: () => request<ProjectListItem[]>('/projects'),
    get: (id: string) =>
      request<ProjectListItem & { tasks: Task[] }>(`/projects/${id}`),
    create: (data: CreateProjectRequest) =>
      request<ProjectListItem>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateProjectRequest) =>
      request<ProjectListItem>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
    syncTasks: (id: string, data: BulkTasksRequest) =>
      request<Task[]>(`/projects/${id}/tasks`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  shares: {
    list: (projectId: string) =>
      request<ProjectShare[]>(`/projects/${projectId}/shares`),
    create: (projectId: string, data: CreateShareRequest) =>
      request<ProjectShare>(`/projects/${projectId}/shares`, { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, shareId: string, data: UpdateShareRequest) =>
      request<ProjectShare>(`/projects/${projectId}/shares/${shareId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (projectId: string, shareId: string) =>
      request<{ success: boolean }>(`/projects/${projectId}/shares/${shareId}`, { method: 'DELETE' }),
  },

  health: () => request<HealthResponse>('/health'),
}
