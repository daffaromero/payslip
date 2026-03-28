import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { signToken, verifyToken, COOKIE } from '@/lib/auth'
import { verifyPassword, hashPassword } from '@/lib/crypto'
import { prisma } from '@/lib/db'
import type { Env } from '../types'

const router = new Hono<Env>()

router.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) {
      return c.json({ error: 'Email dan password wajib diisi' }, 400)
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return c.json({ error: 'Email atau password salah' }, 401)
    }

    const token = await signToken({ userId: user.id, companyId: user.companyId, role: user.role })
    setCookie(c, COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return c.json({ ok: true })
  } catch (e) {
    console.error('Login error:', e)
    return c.json({ error: 'Terjadi kesalahan' }, 500)
  }
})

router.post('/logout', (c) => {
  deleteCookie(c, COOKIE, { path: '/' })
  return c.json({ ok: true })
})

router.post('/change-password', async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const { currentPassword, newPassword } = await c.req.json()
    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Password lama dan baru wajib diisi' }, 400)
    }
    if (newPassword.length < 8) {
      return c.json({ error: 'Password baru minimal 8 karakter' }, 400)
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) return c.json({ error: 'Password lama salah' }, 401)

    const passwordHash = await hashPassword(newPassword)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
    return c.json({ message: 'Password berhasil diubah' })
  } catch (e) {
    console.error('Change password error:', e)
    return c.json({ error: 'Gagal mengubah password' }, 500)
  }
})

export default router
