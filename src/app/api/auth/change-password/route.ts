import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyPassword, hashPassword } from '@/lib/crypto'
import { apiOk, apiError } from '@/lib/api/respond'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  const claims = token ? await verifyToken(token) : null
  if (!claims) return apiError('Unauthorized', 401)

  const { userId } = claims
  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return apiError('Password lama dan baru wajib diisi', 400)
  }

  if (newPassword.length < 8) {
    return apiError('Password baru minimal 8 karakter', 400)
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return apiError('Unauthorized', 401)

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) return apiError('Password lama salah', 401)

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

  return apiOk({ message: 'Password berhasil diubah' })
}
