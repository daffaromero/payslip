import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { calculatePayslip, getPeriodMonths } from '@/lib/calculations/payslip'
import { apiOk, apiError } from '@/lib/api/respond'

export async function GET(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId') ?? undefined
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
    const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))
    const skip = (page - 1) * limit

    const where = {
      companyId: cid,
      ...(employeeId ? { employeeId } : {}),
      ...(year && month
        ? { startDate: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } }
        : year
        ? { startDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
        : {}),
    }

    const [payslips, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          employeeId: true,
          templateId: true,
          periodType: true,
          startDate: true,
          endDate: true,
          grossPay: true,
          netPay: true,
          generatedAt: true,
          employee: { select: { id: true, name: true, employeeId: true } },
        },
      }),
      prisma.payslip.count({ where }),
    ])

    return apiOk({ payslips, total, page, limit })
  } catch (error) {
    console.error('Error fetching payslips:', error)
    return apiError('Gagal memuat data slip gaji')
  }
}

export async function POST(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const data = await req.json()

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, companyId: cid },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })
    }

    const monthCount = getPeriodMonths(data.periodType || 'monthly')
    const calculations = calculatePayslip({
      baseSalary: data.basePay || Number(employee.baseSalary),
      overtimeHours: data.overtimeHours,
      hourlyRate: data.hourlyRate || Number(employee.hourlyRate),
      bonus: data.bonus,
      thr: data.thr,
      allowances: data.allowances,
      otherDeductions: data.otherDeductions,
      pph21Status: employee.pph21Status,
      monthCount,
    })

    const startDate = new Date(data.startDate)
    const year = startDate.getFullYear()
    const startOfYear = new Date(year, 0, 1)

    const previousYtd = await prisma.payslip.aggregate({
      where: { employeeId: data.employeeId, startDate: { gte: startOfYear, lt: startDate } },
      _sum: { ytdGross: true, ytdPph21: true },
    })

    const previousYtdGross = Number(previousYtd._sum.ytdGross) || 0
    const previousYtdPph21 = Number(previousYtd._sum.ytdPph21) || 0

    const payslip = await prisma.payslip.create({
      data: {
        companyId: cid,
        employeeId: data.employeeId,
        templateId: data.templateId,
        periodType: data.periodType || 'monthly',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        basePay: data.basePay || Number(employee.baseSalary),
        overtimeHours: data.overtimeHours || 0,
        overtimePay: calculations.grossPay - (data.basePay || Number(employee.baseSalary)) - (data.bonus || 0) - (data.thr || 0) - (data.allowances?.reduce((a: number, al: { amount?: number }) => a + (al.amount || 0), 0) || 0),
        bonus: data.bonus || 0,
        thr: data.thr || 0,
        allowances: JSON.stringify(data.allowances || []),
        pph21: calculations.pph21,
        bpjsKesehatan: calculations.bpjsKesehatan,
        bpjsKetenagakerjaan: calculations.bpjsKetenagakerjaan,
        otherDeductions: JSON.stringify(data.otherDeductions || []),
        grossPay: calculations.grossPay,
        totalDeductions: calculations.totalDeductions,
        netPay: calculations.netPay,
        ytdGross: previousYtdGross + calculations.grossPay,
        ytdPph21: previousYtdPph21 + calculations.pph21,
        notes: data.notes,
      },
    })

    return NextResponse.json({ success: true, payslipId: payslip.id })
  } catch (error) {
    console.error('Create payslip error:', error)
    return NextResponse.json({ error: 'Gagal membuat slip gaji' }, { status: 500 })
  }
}
