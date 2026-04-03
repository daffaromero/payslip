import { apiError } from '../lib/api-error'
import { Hono } from 'hono'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { requireAdmin } from '../middleware/admin'
import type { Env } from '../types'

const router = new Hono<Env>()
router.on(['POST', 'PATCH', 'PUT', 'DELETE'], '*', requireAdmin)

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads/logos')
const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

const CompanySchema = z.object({
  name:    z.string().min(1),
  address: z.string().nullable().optional(),
  taxId:   z.string().nullable().optional(),
  phone:   z.string().nullable().optional(),
  email:   z.string().email().nullable().optional(),
})

router.get('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const company = await prisma.company.findUnique({ where: { id: cid } })
    if (!company) return c.json({ error: 'Belum ada data perusahaan' }, 404)
    return c.json({ company })
  } catch (e) {
    console.error(e)
    return c.json(apiError('Gagal memuat data perusahaan', e), 500)
  }
})

router.patch('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const body = await c.req.json()
    const parsed = CompanySchema.safeParse(body)
    if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)
    const company = await prisma.company.update({ where: { id: cid }, data: parsed.data })
    return c.json({ company })
  } catch (e) {
    console.error(e)
    return c.json(apiError('Gagal menyimpan data perusahaan', e), 500)
  }
})

router.post('/logo', async (c) => {
  const cid = c.get('companyId')
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'Tidak ada file' }, 400)
    if (!ALLOWED.includes(file.type)) {
      return c.json({ error: 'Format file harus JPG, PNG, WebP, atau SVG' }, 400)
    }
    if (file.size > MAX_SIZE) {
      return c.json({ error: 'Ukuran file maksimal 2MB' }, 400)
    }

    await mkdir(UPLOAD_DIR, { recursive: true })
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filename = `${randomUUID()}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const logoUrl = `/api/uploads/logos/${filename}`
    await prisma.company.update({ where: { id: cid }, data: { logoUrl } })
    return c.json({ logoUrl })
  } catch (e) {
    console.error(e)
    return c.json(apiError('Gagal mengunggah logo', e), 500)
  }
})

export default router
