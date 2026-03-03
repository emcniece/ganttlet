import { Router, type Request, type Response, type NextFunction } from 'express'
import type { Authenticator } from 'passport'
import { registerSchema, loginSchema } from '@ganttlet/shared'
import { AuthService } from '../services/auth.service.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { config } from '../config.js'

export function authRoutes(authService: AuthService): Router {
  const router = Router()

  // Register
  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, displayName } = registerSchema.parse(req.body)
      const user = await authService.register(email, password, displayName)

      req.login(user!, (err) => {
        if (err) return next(err)
        res.status(201).json(user)
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'Email already registered') {
        res.status(409).json({
          error: { code: 'EMAIL_EXISTS', message: 'Email already registered' },
        })
        return
      }
      next(err)
    }
  })

  // Login
  router.post('/login', (req: Request, res: Response, next: NextFunction) => {
    try {
      loginSchema.parse(req.body)
    } catch (err) {
      next(err)
      return
    }

    const pp: Authenticator = req.app.get('passport')
    pp.authenticate('local', (err: Error | null, user: any, info: any) => {
      if (err) return next(err)
      if (!user) {
        return res.status(401).json({
          error: { code: 'INVALID_CREDENTIALS', message: info?.message ?? 'Invalid email or password' },
        })
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr)
        res.json(user)
      })
    })(req, res, next)
  })

  // Logout
  router.post('/logout', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err)
      res.json({ success: true })
    })
  })

  // Get current user
  router.get('/me', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json(req.user)
    } else {
      res.json(null)
    }
  })

  // Google OAuth
  if (config.hasGoogleOAuth) {
    router.get('/google', (req: Request, res: Response, next: NextFunction) => {
      const pp: Authenticator = req.app.get('passport')
      pp.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
    })
    router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
      const pp: Authenticator = req.app.get('passport')
      pp.authenticate('google', { failureRedirect: '/#/auth/error' })(req, res, () => {
        res.redirect('/#/auth/success')
      })
    })
  }

  // GitHub OAuth
  if (config.hasGithubOAuth) {
    router.get('/github', (req: Request, res: Response, next: NextFunction) => {
      const pp: Authenticator = req.app.get('passport')
      pp.authenticate('github', { scope: ['user:email'] })(req, res, next)
    })
    router.get('/github/callback', (req: Request, res: Response, next: NextFunction) => {
      const pp: Authenticator = req.app.get('passport')
      pp.authenticate('github', { failureRedirect: '/#/auth/error' })(req, res, () => {
        res.redirect('/#/auth/success')
      })
    })
  }

  return router
}
