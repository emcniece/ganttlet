import { eq, and } from 'drizzle-orm'
import { hash, compare } from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema.js'

type DB = BetterSQLite3Database<typeof schema>

export class AuthService {
  constructor(private db: DB) {}

  async register(email: string, password: string, displayName: string) {
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get()

    if (existing) {
      throw new Error('Email already registered')
    }

    const id = uuidv4()
    const passwordHash = await hash(password, 12)
    const now = new Date().toISOString()

    await this.db.insert(schema.users).values({
      id,
      email,
      displayName,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    })

    return this.getUser(id)
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get()

    if (!user || !user.passwordHash) {
      return null
    }

    const valid = await compare(password, user.passwordHash)
    if (!valid) return null

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    }
  }

  async findOrCreateOAuthUser(
    provider: string,
    providerAccountId: string,
    email: string,
    displayName: string,
    avatarUrl: string | null,
    accessToken: string | null,
    refreshToken: string | null,
  ) {
    // Check if OAuth account already linked
    const oauthAccount = await this.db
      .select()
      .from(schema.oauthAccounts)
      .where(
        and(
          eq(schema.oauthAccounts.provider, provider),
          eq(schema.oauthAccounts.providerAccountId, providerAccountId),
        ),
      )
      .get()

    if (oauthAccount) {
      // Update tokens
      await this.db
        .update(schema.oauthAccounts)
        .set({ accessToken, refreshToken })
        .where(eq(schema.oauthAccounts.id, oauthAccount.id))

      return this.getUser(oauthAccount.userId)
    }

    // Check if user with this email exists
    let user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get()

    if (!user) {
      // Create new user
      const id = uuidv4()
      const now = new Date().toISOString()
      await this.db.insert(schema.users).values({
        id,
        email,
        displayName,
        avatarUrl,
        createdAt: now,
        updatedAt: now,
      })
      user = (await this.db.select().from(schema.users).where(eq(schema.users.id, id)).get())!
    }

    // Link OAuth account
    await this.db.insert(schema.oauthAccounts).values({
      id: uuidv4(),
      userId: user.id,
      provider,
      providerAccountId,
      accessToken,
      refreshToken,
      createdAt: new Date().toISOString(),
    })

    return this.getUser(user.id)
  }

  async getUser(id: string) {
    const user = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .get()

    return user ?? null
  }
}
