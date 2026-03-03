import { z } from 'zod'

// ── Auth schemas ──

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required').max(100),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ── Task schemas ──

export const taskSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Task name is required'),
  resource: z.string(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start must be YYYY-MM-DD'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End must be YYYY-MM-DD'),
  duration: z.number().nullable(),
  percentComplete: z.number().min(0).max(100),
  dependencies: z.array(z.string()),
  color: z.string().optional(),
})

export const bulkTasksSchema = z.object({
  tasks: z.array(taskSchema),
})

// ── Project schemas ──

export const visibilitySchema = z.enum(['public', 'unlisted', 'private'])

export const appSettingsSchema = z.object({
  chartStartDate: z.string(),
  chartEndDate: z.string(),
})

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  visibility: visibilitySchema.optional().default('private'),
  settings: appSettingsSchema.optional(),
  tasks: z.array(taskSchema).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  visibility: visibilitySchema.optional(),
  settings: appSettingsSchema.optional(),
})

// ── Sharing schemas ──

export const shareRoleSchema = z.enum(['view', 'edit'])

export const createShareSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: shareRoleSchema,
})

export const updateShareSchema = z.object({
  role: shareRoleSchema,
})
