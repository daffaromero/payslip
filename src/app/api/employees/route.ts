import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { apiError } from '@/lib/api/respond'

export async function GET(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const employees = await prisma.employee.findMany({
      where: { companyId: cid, isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ employees })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Gagal memuat data karyawan' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const data = await req.json()
    const employee = await prisma.employee.create({
      data: {
        companyId: cid,
        employeeId: data.employeeId,
        name: data.name,
        email: data.email || null,
        department: data.department || null,
        position: data.position || null,
        npwp: data.npwp || null,
        bankAccount: data.bankAccount || null,
        bankName: data.bankName || null,
        baseSalary: data.baseSalary,
        hourlyRate: data.hourlyRate || null,
        pph21Status: data.pph21Status || 'TK/0',
        isActive: true,
      },
    })
    return NextResponse.json({ employee }, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Gagal membuat karyawan' }, { status: 500 })
  }
}
