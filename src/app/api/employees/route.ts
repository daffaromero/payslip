import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { company: true }
    })
    return NextResponse.json({ employees })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data karyawan' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Get first company or create default
    let company = await prisma.company.findFirst()
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'PT Contoh Indonesia',
          address: 'Jl. Sudirman No. 1, Jakarta',
          taxId: '09.123.456.7-123.000'
        }
      })
    }
    
    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
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
        isActive: true
      }
    })
    
    return NextResponse.json({ employee }, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: 'Gagal membuat karyawan' },
      { status: 500 }
    )
  }
}
