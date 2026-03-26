import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { apiOk, apiError } from '@/lib/api/respond'
import { z } from 'zod'

const CompanySchema = z.object({
  name:    z.string().min(1),
  address: z.string().nullable().optional(),
  taxId:   z.string().nullable().optional(),
  phone:   z.string().nullable().optional(),
  email:   z.string().email().nullable().optional(),
})

async function getCompany() {
  return prisma.company.findFirst({ orderBy: { createdAt: 'asc' } })
}

export async function GET() {
  try {
    const company = await getCompany()
    if (!company) return apiError('Belum ada data perusahaan', 404)
    return apiOk({ company })
  } catch (e) {
    console.error(e)
    return apiError('Gagal memuat data perusahaan')
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CompanySchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

    let company = await getCompany()
    if (company) {
      company = await prisma.company.update({ where: { id: company.id }, data: parsed.data })
    } else {
      company = await prisma.company.create({ data: { name: parsed.data.name, ...parsed.data } })
    }
    return apiOk({ company })
  } catch (e) {
    console.error(e)
    return apiError('Gagal menyimpan data perusahaan')
  }
}
