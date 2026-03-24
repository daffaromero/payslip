import { NextRequest, NextResponse } from 'next/server'
import { generatePayslipHTML } from '@/lib/pdf/generator'
import { calculatePayslip, getPeriodMonths } from '@/lib/calculations/payslip'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    })

    const template = await prisma.template.findUnique({
      where: { id: data.templateId },
    })

    if (!employee || !template) {
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 }
      )
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
      companyId: employee.companyId,
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

    const company = await prisma.company.findFirst()

    const html = generatePayslipHTML({
      payslip: payslipData as any,
      employee: {
        ...employee,
        pph21Status: employee.pph21Status as any,
      },
      template: template as any,
      company: company || { id: '', name: 'PT Contoh Indonesia', address: null, taxId: null, phone: null, email: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, html })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat preview' },
      { status: 500 }
    )
  }
}
