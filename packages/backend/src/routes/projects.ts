import { Router, type Request, type Response, type NextFunction } from 'express'
import { createProjectSchema, updateProjectSchema, bulkTasksSchema } from '@ganttlet/shared'
import { ProjectService } from '../services/project.service.js'
import { requireAuth } from '../middleware/requireAuth.js'

function paramId(req: Request): string {
  const id = req.params.id
  return Array.isArray(id) ? id[0] : id
}

export function projectRoutes(projectService: ProjectService): Router {
  const router = Router()

  // List owned + shared projects
  router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any
      const projects = await projectService.listProjectsForUser(user.id)
      res.json(projects)
    } catch (err) {
      next(err)
    }
  })

  // Create project
  router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any
      const data = createProjectSchema.parse(req.body)
      const project = await projectService.createProject(
        user.id,
        data.name,
        data.visibility,
        data.settings,
        data.tasks,
      )
      res.status(201).json(project)
    } catch (err) {
      next(err)
    }
  })

  // Get project (public/unlisted: no auth; private: auth + ACL)
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req)
      const userId = req.isAuthenticated() ? (req.user as any).id : null
      const access = await projectService.checkAccess(id, userId)

      if (!access) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        })
        return
      }

      const project = await projectService.getProject(id)
      const tasks = await projectService.getProjectTasks(id)
      res.json({ ...project, tasks, role: access })
    } catch (err) {
      next(err)
    }
  })

  // Update project
  router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req)
      const user = req.user as any
      const access = await projectService.checkAccess(id, user.id)

      if (!access || access === 'view') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        })
        return
      }

      const data = updateProjectSchema.parse(req.body)

      // Only owner can change visibility
      if (data.visibility && access !== 'owner') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only the owner can change visibility' },
        })
        return
      }

      const updated = await projectService.updateProject(id, data)
      res.json(updated)
    } catch (err) {
      next(err)
    }
  })

  // Delete project (owner only)
  router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req)
      const user = req.user as any
      const access = await projectService.checkAccess(id, user.id)

      if (access !== 'owner') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only the owner can delete a project' },
        })
        return
      }

      await projectService.deleteProject(id)
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  })

  // Bulk replace tasks
  router.put('/:id/tasks', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req)
      const user = req.user as any
      const access = await projectService.checkAccess(id, user.id)

      if (!access || access === 'view') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        })
        return
      }

      const { tasks } = bulkTasksSchema.parse(req.body)
      const updated = await projectService.bulkReplaceTasks(id, tasks)
      res.json(updated)
    } catch (err) {
      next(err)
    }
  })

  return router
}
