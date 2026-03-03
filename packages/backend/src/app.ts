import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { config } from './config.js'
import { createDatabase } from './db/connection.js'
import { setupAuth, type AuthOptions } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import { AuthService } from './services/auth.service.js'
import { ProjectService } from './services/project.service.js'
import { SharingService } from './services/sharing.service.js'
import { authRoutes } from './routes/auth.js'
import { projectRoutes } from './routes/projects.js'
import { sharingRoutes } from './routes/sharing.js'
import { healthRoutes } from './routes/health.js'

export interface AppOptions extends AuthOptions {
  dbPath?: string
}

export function createApp(options?: AppOptions | string) {
  const app = express()
  const opts: AppOptions = typeof options === 'string' ? { dbPath: options } : (options ?? {})
  const resolvedDbPath = opts.dbPath ?? config.databasePath

  // Database
  const { db } = createDatabase(resolvedDbPath)

  // Services
  const authService = new AuthService(db)
  const projectService = new ProjectService(db)
  const sharingService = new SharingService(db)

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(cors({ origin: config.corsOrigin, credentials: true }))
  app.use(express.json())

  // Auth (sessions + passport)
  setupAuth(app, authService, resolvedDbPath, opts)

  // Routes
  app.use('/api/health', healthRoutes())
  app.use('/api/auth', authRoutes(authService))
  app.use('/api/projects', projectRoutes(projectService))
  app.use('/api/projects/:id/shares', sharingRoutes(projectService, sharingService))

  // Serve static frontend in production
  if (config.staticDir) {
    const staticPath = path.resolve(config.staticDir)
    app.use(express.static(staticPath))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'))
    })
  }

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}
