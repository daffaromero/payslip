import { Hono } from 'hono'
import { prisma } from '@/lib/db'
import type { Env } from '../types'

const router = new Hono<Env>()

router.get('/', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return c.json({ ok: true })
  } catch {
    return c.json({ ok: false, error: 'db' }, 503)
  }
})

export default router
