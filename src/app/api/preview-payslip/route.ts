import { NextRequest, NextResponse } from 'next/server'
import { generatePayslipHTML } from '@/lib/pdf/generator'
import { calculatePayslip, getPeriodMonths } from '@/lib/calculations/payslip'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { apiError } from '@/lib/api/respond'

export async function POST(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const data = await req.json()

    const [employee, template, company] = await Promise.all([
      prisma.employee.findFirst({ where: { id: data.employeeId, companyId: cid } }),
      prisma.template.findFirst({ where: { id: data.templateId, companyId: cid } }),
      prisma.company.findUnique({ where: { id: cid } }),
    ])

    if (!employee || !template) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    const monthCount = getPeriodMonths(data.periodType || 'monthly')
    const calculations = calculatePayslip({
      baseSalary: data.basePay || Number(employee.baseSalary),
      overtimeHours: data.overtimeHours,
      hourlyRate: data.hourlyRate || Number(employee.hourlyRate),
      bonus: data.bonus,
      thr: data.thr,
      allowances: data.allowances,
      pph21Status: employee.pph21Status,
      monthCount,
    })

    const payslipData = {
      id: 'preview',
      companyId: cid,
      employeeId: employee.id,
      templateId: template.id,
      periodType: data.periodType || 'monthly',
      startDate: new Date(data.startDate || new Date()),
      endDate: new Date(data.endDate || new Date()),
      basePay: data.basePay || Number(employee.baseSalary),
      overtimeHours: data.overtimeHours || 0,
      overtimePay: 0,
      bonus: data.bonus || 0,
      thr: data.thr || 0,
      allowances: data.allowances || [],
      pph21: calculations.pph21,
      bpjsKesehatan: calculations.bpjsKesehatan,
      bpjsKetenagakerjaan: calculations.bpjsKetenagakerjaan,
      otherDeductions: data.otherDeductions || [],
      grossPay: calculations.grossPay,
      totalDeductions: calculations.totalDeductions,
      netPay: calculations.netPay,
      ytdGross: calculations.grossPay,
      ytdPph21: calculations.pph21,
      notes: data.notes,
      generatedAt: new Date(),
    }

    const html = generatePayslipHTML({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payslip: payslipData as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      employee: { ...employee, pph21Status: employee.pph21Status as any },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: template as any,
      company: company || { id: cid, name: '', address: null, taxId: null, phone: null, email: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, html })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: 'Gagal membuat preview' }, { status: 500 })
  }
}
