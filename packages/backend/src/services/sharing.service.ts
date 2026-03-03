import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema.js'

type DB = BetterSQLite3Database<typeof schema>

export class SharingService {
  constructor(private db: DB) {}

  async listShares(projectId: string) {
    const shares = await this.db
      .select({
        id: schema.projectShares.id,
        projectId: schema.projectShares.projectId,
        userId: schema.projectShares.userId,
        email: schema.projectShares.email,
        role: schema.projectShares.role,
        createdAt: schema.projectShares.createdAt,
        userDisplayName: schema.users.displayName,
        userEmail: schema.users.email,
        userAvatarUrl: schema.users.avatarUrl,
      })
      .from(schema.projectShares)
      .leftJoin(schema.users, eq(schema.projectShares.userId, schema.users.id))
      .where(eq(schema.projectShares.projectId, projectId))

    return shares.map((s) => ({
      id: s.id,
      projectId: s.projectId,
      userId: s.userId,
      email: s.email ?? s.userEmail,
      role: s.role,
      createdAt: s.createdAt,
      user: s.userId
        ? {
            id: s.userId,
            email: s.userEmail!,
            displayName: s.userDisplayName!,
            avatarUrl: s.userAvatarUrl,
          }
        : undefined,
    }))
  }

  async createShare(projectId: string, email: string, role: string) {
    // Check if user with this email exists
    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get()

    // Check for existing share
    if (user) {
      const existing = await this.db
        .select()
        .from(schema.projectShares)
        .where(
          and(
            eq(schema.projectShares.projectId, projectId),
            eq(schema.projectShares.userId, user.id),
          ),
        )
        .get()

      if (existing) {
        throw new Error('User already has access to this project')
      }
    }

    const id = uuidv4()
    await this.db.insert(schema.projectShares).values({
      id,
      projectId,
      userId: user?.id ?? null,
      email: user ? null : email, // Store email only for pending invites
      role,
      createdAt: new Date().toISOString(),
    })

    return (await this.listShares(projectId)).find((s) => s.id === id)!
  }

  async updateShareRole(shareId: string, role: string) {
    await this.db
      .update(schema.projectShares)
      .set({ role })
      .where(eq(schema.projectShares.id, shareId))
  }

  async deleteShare(shareId: string) {
    await this.db
      .delete(schema.projectShares)
      .where(eq(schema.projectShares.id, shareId))
  }

  async getShare(shareId: string) {
    return this.db
      .select()
      .from(schema.projectShares)
      .where(eq(schema.projectShares.id, shareId))
      .get()
  }
}
