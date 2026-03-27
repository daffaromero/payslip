import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { apiOk, apiError } from '@/lib/api/respond'
import { parseData } from '@/lib/api/validate'
import { EmployeePatchSchema } from '@/lib/api/schemas/employee'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const { id } = await params
    const employee = await prisma.employee.findFirst({ where: { id, companyId: cid } })
    if (!employee) return apiError('Karyawan tidak ditemukan', 404)
    return apiOk({ employee })
  } catch (error) {
    console.error('Error fetching employee:', error)
    return apiError('Gagal memuat data karyawan')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const { id } = await params

    const existing = await prisma.employee.findFirst({ where: { id, companyId: cid } })
    if (!existing) return apiError('Karyawan tidak ditemukan', 404)

    const body = await req.json()
    const parsed = parseData(EmployeePatchSchema, body)
    if (!parsed.ok) return parsed.response

    const employee = await prisma.employee.update({ where: { id }, data: parsed.data })
    return apiOk({ employee })
  } catch (error) {
    console.error('Error updating employee:', error)
    return apiError('Gagal memperbarui karyawan')
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const { id } = await params

    const existing = await prisma.employee.findFirst({ where: { id, companyId: cid } })
    if (!existing) return apiError('Karyawan tidak ditemukan', 404)

    await prisma.employee.update({ where: { id }, data: { isActive: false } })
    return apiOk({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return apiError('Gagal menghapus karyawan')
  }
}
