import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiOk, apiError } from '@/lib/api/respond'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads/logos')
const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  const claims = token ? await verifyToken(token) : null
  if (!claims) return apiError('Unauthorized', 401)

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return apiError('Tidak ada file', 400)

  if (!ALLOWED.includes(file.type)) {
    return apiError('Format file harus JPG, PNG, WebP, atau SVG', 400)
  }

  if (file.size > MAX_SIZE) {
    return apiError('Ukuran file maksimal 2MB', 400)
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename = `${randomUUID()}.${ext}`
  const filepath = path.join(UPLOAD_DIR, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buffer)

  const logoUrl = `/uploads/logos/${filename}`
  await prisma.company.update({
    where: { id: claims.companyId },
    data: { logoUrl },
  })

  return apiOk({ logoUrl })
}
