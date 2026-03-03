import { Router } from 'express'

export function healthRoutes(): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0' })
  })

  return router
}
