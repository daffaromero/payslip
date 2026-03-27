import { NextRequest, NextResponse } from 'next/server'
import { generatePayslipPDF } from '@/lib/pdf/generator'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { apiError } from '@/lib/api/respond'
import { deserializeTemplate, RawTemplate } from '@/lib/api/template-serializer'

export async function POST(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const { payslipId } = await req.json()

    if (!payslipId) {
      return NextResponse.json({ error: 'Payslip ID diperlukan' }, { status: 400 })
    }

    const payslip = await prisma.payslip.findFirst({
      where: { id: payslipId, companyId: cid },
      include: { employee: true, template: true, company: true },
    })

    if (!payslip) {
      return NextResponse.json({ error: 'Payslip tidak ditemukan' }, { status: 404 })
    }

    const pdfBuffer = await generatePayslipPDF({
      payslip: {
        id: payslip.id,
        companyId: payslip.companyId,
        employeeId: payslip.employeeId,
        templateId: payslip.templateId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        periodType: payslip.periodType as any,
        startDate: payslip.startDate,
        endDate: payslip.endDate,
        basePay: Number(payslip.basePay),
        overtimePay: Number(payslip.overtimePay),
        bonus: Number(payslip.bonus),
        thr: Number(payslip.thr),
        allowances: JSON.parse(payslip.allowances as string),
        pph21: Number(payslip.pph21),
        bpjsKesehatan: Number(payslip.bpjsKesehatan),
        bpjsKetenagakerjaan: Number(payslip.bpjsKetenagakerjaan),
        otherDeductions: JSON.parse(payslip.otherDeductions as string),
        grossPay: Number(payslip.grossPay),
        totalDeductions: Number(payslip.totalDeductions),
        netPay: Number(payslip.netPay),
        ytdGross: Number(payslip.ytdGross),
        ytdPph21: Number(payslip.ytdPph21),
        notes: payslip.notes || undefined,
      },
      employee: {
        id: payslip.employee.id,
        companyId: payslip.employee.companyId,
        employeeId: payslip.employee.employeeId,
        name: payslip.employee.name,
        email: payslip.employee.email,
        department: payslip.employee.department,
        position: payslip.employee.position,
        npwp: payslip.employee.npwp,
        bankAccount: payslip.employee.bankAccount,
        bankName: payslip.employee.bankName,
        baseSalary: payslip.employee.baseSalary,
        hourlyRate: payslip.employee.hourlyRate,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pph21Status: payslip.employee.pph21Status as any,
        isActive: payslip.employee.isActive,
        joinedAt: payslip.employee.joinedAt,
        createdAt: payslip.employee.createdAt,
        updatedAt: payslip.employee.updatedAt,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: deserializeTemplate(payslip.template as unknown as RawTemplate) as any,
      company: {
        id: payslip.company.id,
        name: payslip.company.name,
        address: payslip.company.address,
        taxId: payslip.company.taxId,
        phone: payslip.company.phone,
        email: payslip.company.email,
        logoUrl: payslip.company.logoUrl,
        createdAt: payslip.company.createdAt,
        updatedAt: payslip.company.updatedAt,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="slip-gaji-${payslip.employee.name}-${payslip.startDate.toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Gagal generate PDF' }, { status: 500 })
  }
}
