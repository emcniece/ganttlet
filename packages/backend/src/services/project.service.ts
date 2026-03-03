import { eq, and, or, inArray, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { Task, AppSettings } from '@ganttlet/shared'
import * as schema from '../db/schema.js'

type DB = BetterSQLite3Database<typeof schema>

export class ProjectService {
  constructor(private db: DB) {}

  async createProject(
    ownerId: string,
    name: string,
    visibility: string = 'private',
    settings?: AppSettings,
    taskList?: Task[],
  ) {
    const id = uuidv4()
    const now = new Date().toISOString()

    await this.db.insert(schema.projects).values({
      id,
      ownerId,
      name,
      visibility,
      settingsJson: JSON.stringify(settings ?? { chartStartDate: '', chartEndDate: '' }),
      createdAt: now,
      updatedAt: now,
    })

    if (taskList && taskList.length > 0) {
      await this.bulkReplaceTasks(id, taskList)
    }

    return this.getProject(id)
  }

  async getProject(id: string) {
    const project = await this.db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, id))
      .get()

    if (!project) return null

    return {
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      visibility: project.visibility,
      settings: JSON.parse(project.settingsJson) as AppSettings,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }
  }

  async listProjectsForUser(userId: string) {
    // Owned projects
    const owned = await this.db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.ownerId, userId))

    // Shared projects
    const shares = await this.db
      .select({
        projectId: schema.projectShares.projectId,
        role: schema.projectShares.role,
      })
      .from(schema.projectShares)
      .where(eq(schema.projectShares.userId, userId))

    const sharedProjectIds = shares.map((s) => s.projectId)
    const sharedProjects = sharedProjectIds.length > 0
      ? await this.db
          .select()
          .from(schema.projects)
          .where(inArray(schema.projects.id, sharedProjectIds))
      : []

    const roleMap = new Map(shares.map((s) => [s.projectId, s.role]))

    return [
      ...owned.map((p) => ({
        id: p.id,
        ownerId: p.ownerId,
        name: p.name,
        visibility: p.visibility,
        settings: JSON.parse(p.settingsJson) as AppSettings,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        role: 'owner' as const,
      })),
      ...sharedProjects.map((p) => ({
        id: p.id,
        ownerId: p.ownerId,
        name: p.name,
        visibility: p.visibility,
        settings: JSON.parse(p.settingsJson) as AppSettings,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        role: (roleMap.get(p.id) ?? 'view') as 'view' | 'edit',
      })),
    ]
  }

  async updateProject(
    id: string,
    data: { name?: string; visibility?: string; settings?: AppSettings },
  ) {
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (data.name !== undefined) updates.name = data.name
    if (data.visibility !== undefined) updates.visibility = data.visibility
    if (data.settings !== undefined) updates.settingsJson = JSON.stringify(data.settings)

    await this.db
      .update(schema.projects)
      .set(updates)
      .where(eq(schema.projects.id, id))

    return this.getProject(id)
  }

  async deleteProject(id: string) {
    await this.db.delete(schema.projects).where(eq(schema.projects.id, id))
  }

  async getProjectTasks(projectId: string): Promise<Task[]> {
    const rows = await this.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.projectId, projectId))
      .orderBy(schema.tasks.sortOrder)

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      resource: r.resource,
      start: r.startDate,
      end: r.endDate,
      duration: r.duration,
      percentComplete: r.percentComplete,
      dependencies: JSON.parse(r.dependenciesJson) as string[],
      color: r.color ?? undefined,
    }))
  }

  async bulkReplaceTasks(projectId: string, taskList: Task[]) {
    const now = new Date().toISOString()

    // Delete existing tasks
    await this.db
      .delete(schema.tasks)
      .where(eq(schema.tasks.projectId, projectId))

    // Insert new tasks
    if (taskList.length > 0) {
      await this.db.insert(schema.tasks).values(
        taskList.map((t, i) => ({
          id: t.id,
          projectId,
          name: t.name,
          resource: t.resource,
          startDate: t.start,
          endDate: t.end,
          duration: t.duration,
          percentComplete: t.percentComplete,
          dependenciesJson: JSON.stringify(t.dependencies),
          color: t.color ?? null,
          sortOrder: i,
          createdAt: now,
          updatedAt: now,
        })),
      )
    }

    // Update project timestamp
    await this.db
      .update(schema.projects)
      .set({ updatedAt: now })
      .where(eq(schema.projects.id, projectId))

    return this.getProjectTasks(projectId)
  }

  /** Check if user has access to a project and at what level */
  async checkAccess(projectId: string, userId: string | null): Promise<'owner' | 'edit' | 'view' | null> {
    const project = await this.db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .get()

    if (!project) return null

    // Public/unlisted projects are viewable by anyone
    if (project.visibility === 'public' || project.visibility === 'unlisted') {
      if (!userId) return 'view'
    }

    if (!userId) return null

    // Owner has full access
    if (project.ownerId === userId) return 'owner'

    // Check shares
    const share = await this.db
      .select()
      .from(schema.projectShares)
      .where(
        and(
          eq(schema.projectShares.projectId, projectId),
          eq(schema.projectShares.userId, userId),
        ),
      )
      .get()

    if (share) return share.role as 'edit' | 'view'

    // Public/unlisted still viewable
    if (project.visibility === 'public' || project.visibility === 'unlisted') return 'view'

    return null
  }
}
