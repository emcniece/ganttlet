import { Router, type Request, type Response, type NextFunction } from 'express'
import { createShareSchema, updateShareSchema } from '@ganttlet/shared'
import { ProjectService } from '../services/project.service.js'
import { SharingService } from '../services/sharing.service.js'
import { requireAuth } from '../middleware/requireAuth.js'

function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val
}

export function sharingRoutes(
  projectService: ProjectService,
  sharingService: SharingService,
): Router {
  const router = Router({ mergeParams: true })

  // List shares (owner only)
  router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = paramStr(req.params.id)
      const user = req.user as any
      const access = await projectService.checkAccess(projectId, user.id)

      if (access !== 'owner') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only the owner can view shares' },
        })
        return
      }

      const shares = await sharingService.listShares(projectId)
      res.json(shares)
    } catch (err) {
      next(err)
    }
  })

  // Create share (owner only)
  router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = paramStr(req.params.id)
      const user = req.user as any
      const access = await projectService.checkAccess(projectId, user.id)

      if (access !== 'owner') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only the owner can share a project' },
        })
        return
      }

      const data = createShareSchema.parse(req.body)

      // Don't allow sharing with yourself
      if (data.email === user.email) {
        res.status(400).json({
          error: { code: 'SELF_SHARE', message: 'Cannot share with yourself' },
        })
        return
      }

      const share = await sharingService.createShare(projectId, data.email, data.role)
      res.status(201).json(share)
    } catch (err) {
      if (err instanceof Error && err.message === 'User already has access to this project') {
        res.status(409).json({
          error: { code: 'ALREADY_SHARED', message: err.message },
        })
        return
      }
      next(err)
    }
  })

  // Update share role (owner only)
  router.put('/:shareId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = paramStr(req.params.id)
      const shareId = paramStr(req.params.shareId)
      const user = req.user as any
      const access = await projectService.checkAccess(projectId, user.id)

      if (access !== 'owner') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only the owner can modify shares' },
        })
        return
      }

      const share = await sharingService.getShare(shareId)
      if (!share || share.projectId !== projectId) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Share not found' },
        })
        return
      }

      const data = updateShareSchema.parse(req.body)
      await sharingService.updateShareRole(shareId, data.role)
      res.json({ ...share, role: data.role })
    } catch (err) {
      next(err)
    }
  })

  // Delete share (owner only)
  router.delete('/:shareId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = paramStr(req.params.id)
      const shareId = paramStr(req.params.shareId)
      const user = req.user as any
      const access = await projectService.checkAccess(projectId, user.id)

      if (access !== 'owner') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only the owner can revoke shares' },
        })
        return
      }

      const share = await sharingService.getShare(shareId)
      if (!share || share.projectId !== projectId) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Share not found' },
        })
        return
      }

      await sharingService.deleteShare(shareId)
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  })

  return router
}
