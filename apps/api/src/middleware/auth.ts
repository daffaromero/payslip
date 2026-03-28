import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { verifyToken, COOKIE } from '@/lib/auth'
import type { Env } from '../types'

const PUBLIC = [
  '/api/auth/login',
  '/api/health',
  '/api/seed',
  '/api/uploads/logos',
]

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const path = new URL(c.req.url).pathname

  if (PUBLIC.some(p => path.startsWith(p))) {
    return next()
  }

  const token = getCookie(c, COOKIE)
  if (token) {
    const claims = await verifyToken(token)
    if (claims) {
      c.set('userId', claims.userId)
      c.set('companyId', claims.companyId)
      c.set('role', claims.role)
      return next()
    }
  }

  return c.json({ error: 'Unauthorized' }, 401)
})
