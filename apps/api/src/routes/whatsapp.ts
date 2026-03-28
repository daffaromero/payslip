import { Hono } from 'hono'
import { connect, disconnect, getStatus } from '@/lib/whatsapp/client'
import type { Env } from '../types'

const router = new Hono<Env>()

router.get('/status', (c) => {
  return c.json(getStatus())
})

router.post('/connect', async (c) => {
  await connect()
  return c.json(getStatus())
})

router.post('/disconnect', async (c) => {
  await disconnect()
  return c.json({ status: 'disconnected' })
})

export default router
