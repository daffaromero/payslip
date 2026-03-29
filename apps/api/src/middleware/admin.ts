import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'

export const requireAdmin = createMiddleware<Env>(async (c, next) => {
  if (c.get('role') !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  return next()
})
