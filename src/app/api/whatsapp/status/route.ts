import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE } from '@/lib/auth'
import { getStatus } from '@/lib/whatsapp/client'
import { apiError } from '@/lib/api/respond'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token || !(await verifyToken(token))) return apiError('Unauthorized', 401)

  return NextResponse.json(getStatus())
}
