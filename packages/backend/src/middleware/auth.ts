import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import type { Express } from 'express'
import session from 'express-session'
import connectSqlite3 from 'connect-sqlite3'
import path from 'node:path'
import { config } from '../config.js'
import { AuthService } from '../services/auth.service.js'

const SQLiteStore = connectSqlite3(session)

export interface AuthOptions {
  useMemorySession?: boolean
}

export function setupAuth(app: Express, authService: AuthService, dbPath: string, options?: AuthOptions) {
  const dbDir = path.dirname(path.resolve(dbPath))

  const sessionConfig: session.SessionOptions = {
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
    },
  }

  if (!options?.useMemorySession) {
    sessionConfig.store = new (SQLiteStore as any)({
      db: 'sessions.db',
      dir: dbDir,
    })
  }

  app.use(session(sessionConfig))

  // Create a fresh Passport instance to avoid singleton pollution across tests
  const pp = new passport.Passport()

  app.use(pp.initialize())
  app.use(pp.session())

  pp.serializeUser((user: any, done) => {
    done(null, user.id)
  })

  pp.deserializeUser(async (id: string, done) => {
    try {
      const user = await authService.getUser(id)
      done(null, user)
    } catch (err) {
      done(err)
    }
  })

  // Local strategy (email/password)
  pp.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await authService.validateCredentials(email, password)
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' })
          }
          return done(null, user)
        } catch (err) {
          return done(err)
        }
      },
    ),
  )

  // Google OAuth (conditional)
  if (config.hasGoogleOAuth) {
    pp.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: `${config.baseUrl}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value
            if (!email) return done(new Error('No email from Google'))

            const user = await authService.findOrCreateOAuthUser(
              'google',
              profile.id,
              email,
              profile.displayName ?? email,
              profile.photos?.[0]?.value ?? null,
              _accessToken,
              _refreshToken ?? null,
            )
            return done(null, user ?? undefined)
          } catch (err) {
            return done(err as Error)
          }
        },
      ),
    )
  }

  // GitHub OAuth (conditional)
  if (config.hasGithubOAuth) {
    pp.use(
      new GitHubStrategy(
        {
          clientID: config.github.clientId,
          clientSecret: config.github.clientSecret,
          callbackURL: `${config.baseUrl}/api/auth/github/callback`,
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value ?? `${profile.id}@github.oauth`
            const user = await authService.findOrCreateOAuthUser(
              'github',
              profile.id,
              email,
              profile.displayName ?? profile.username ?? email,
              profile.photos?.[0]?.value ?? null,
              _accessToken,
              _refreshToken ?? null,
            )
            return done(null, user)
          } catch (err) {
            return done(err as Error)
          }
        },
      ),
    )
  }

  // Store the passport instance on the app for routes to use
  app.set('passport', pp)
}
