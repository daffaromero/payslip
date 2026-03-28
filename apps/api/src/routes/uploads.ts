import { Hono } from 'hono'
import { statSync, createReadStream } from 'fs'
import path from 'path'
import type { Env } from '../types'

const router = new Hono<Env>()
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads/logos')

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml',
}

router.get('/logos/:filename', (c) => {
  const filename = c.req.param('filename')
  if (!filename || /[^a-zA-Z0-9._-]/.test(filename)) {
    return c.json({ error: 'Not found' }, 404)
  }

  const filepath = path.join(UPLOAD_DIR, filename)
  try {
    const stat = statSync(filepath)
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'
    const stream = createReadStream(filepath)
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return c.json({ error: 'Not found' }, 404)
  }
})

export default router
