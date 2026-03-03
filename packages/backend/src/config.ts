import path from 'node:path'

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databasePath: process.env.DATABASE_PATH ?? './data/ganttlet.db',
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  staticDir: process.env.STATIC_DIR ?? '',

  // OAuth (optional)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  },

  get isProduction() {
    return this.nodeEnv === 'production'
  },

  get hasGoogleOAuth() {
    return Boolean(this.google.clientId && this.google.clientSecret)
  },

  get hasGithubOAuth() {
    return Boolean(this.github.clientId && this.github.clientSecret)
  },

  /** Resolve the database directory, creating it if needed */
  get databaseDir() {
    return path.dirname(path.resolve(this.databasePath))
  },
} as const
