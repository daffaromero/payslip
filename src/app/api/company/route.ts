import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { apiOk, apiError } from '@/lib/api/respond'
import { z } from 'zod'

const CompanySchema = z.object({
  name:    z.string().min(1),
  address: z.string().nullable().optional(),
  taxId:   z.string().nullable().optional(),
  phone:   z.string().nullable().optional(),
  email:   z.string().email().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const company = await prisma.company.findUnique({ where: { id: cid } })
    if (!company) return apiError('Belum ada data perusahaan', 404)
    return apiOk({ company })
  } catch (e) {
    console.error(e)
    return apiError('Gagal memuat data perusahaan')
  }
}

export async function PATCH(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const body = await req.json()
    const parsed = CompanySchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

    const company = await prisma.company.update({ where: { id: cid }, data: parsed.data })
    return apiOk({ company })
  } catch (e) {
    console.error(e)
    return apiError('Gagal menyimpan data perusahaan')
  }
}
