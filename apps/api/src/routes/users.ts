import { Hono } from 'hono'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/crypto'
import { requireAdmin } from '../middleware/admin'
import type { Env } from '../types'

const router = new Hono<Env>()

router.use('*', requireAdmin)

// List all users in the company
router.get('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const users = await prisma.user.findMany({
      where: { companyId: cid },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return c.json({ users })
  } catch (e) {
    console.error('Error fetching users:', e)
    return c.json({ error: 'Gagal memuat data pengguna' }, 500)
  }
})

// Invite (create) a new user in the same company
router.post('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const { email, password, role, name } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Email dan password wajib diisi' }, 400)
    if (password.length < 8) return c.json({ error: 'Password minimal 8 karakter' }, 400)
    if (role && !['admin', 'viewer'].includes(role)) return c.json({ error: 'Role tidak valid' }, 400)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return c.json({ error: 'Email sudah terdaftar' }, 409)

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { companyId: cid, email, name: name || null, passwordHash, role: role ?? 'viewer' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
    return c.json({ user }, 201)
  } catch (e) {
    console.error('Error creating user:', e)
    return c.json({ error: 'Gagal membuat pengguna' }, 500)
  }
})

// Change a user's role (and optionally name)
router.patch('/:id', async (c) => {
  const cid = c.get('companyId')
  const selfId = c.get('userId')
  const { id } = c.req.param()
  try {
    const { role, name } = await c.req.json()
    if (role !== undefined && !['admin', 'viewer'].includes(role)) return c.json({ error: 'Role tidak valid' }, 400)

    const target = await prisma.user.findFirst({ where: { id, companyId: cid } })
    if (!target) return c.json({ error: 'Pengguna tidak ditemukan' }, 404)

    // Prevent demoting self if last admin
    if (role !== undefined && id === selfId && role !== 'admin') {
      const adminCount = await prisma.user.count({ where: { companyId: cid, role: 'admin' } })
      if (adminCount <= 1) return c.json({ error: 'Tidak bisa mengubah role admin terakhir' }, 400)
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(name !== undefined ? { name: name || null } : {}),
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
    return c.json({ user })
  } catch (e) {
    console.error('Error updating user:', e)
    return c.json({ error: 'Gagal memperbarui pengguna' }, 500)
  }
})

// Remove a user
router.delete('/:id', async (c) => {
  const cid = c.get('companyId')
  const selfId = c.get('userId')
  const { id } = c.req.param()
  try {
    const target = await prisma.user.findFirst({ where: { id, companyId: cid } })
    if (!target) return c.json({ error: 'Pengguna tidak ditemukan' }, 404)
    if (id === selfId) return c.json({ error: 'Tidak bisa menghapus akun sendiri' }, 400)

    // Prevent removing last admin
    if (target.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { companyId: cid, role: 'admin' } })
      if (adminCount <= 1) return c.json({ error: 'Tidak bisa menghapus admin terakhir' }, 400)
    }

    await prisma.user.delete({ where: { id } })
    return c.json({ ok: true })
  } catch (e) {
    console.error('Error deleting user:', e)
    return c.json({ error: 'Gagal menghapus pengguna' }, 500)
  }
})

export default router
