import { NextRequest, NextResponse } from 'next/server'
import { generatePayslipPDF } from '@/lib/pdf/generator'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { payslipId } = await request.json()
    
    if (!payslipId) {
      return NextResponse.json(
        { error: 'Payslip ID diperlukan' },
        { status: 400 }
      )
    }
    
    // Fetch payslip with related data
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: true,
        template: true,
        company: true,
      },
    })
    
    if (!payslip) {
      return NextResponse.json(
        { error: 'Payslip tidak ditemukan' },
        { status: 404 }
      )
    }
    
    // Generate PDF
    const pdfBuffer = await generatePayslipPDF({
      payslip: {
        id: payslip.id,
        companyId: payslip.companyId,
        employeeId: payslip.employeeId,
        templateId: payslip.templateId,
        periodType: payslip.periodType as any,
        startDate: payslip.startDate,
        endDate: payslip.endDate,
        basePay: Number(payslip.basePay),
        overtimePay: Number(payslip.overtimePay),
        bonus: Number(payslip.bonus),
        thr: Number(payslip.thr),
        allowances: payslip.allowances as any,
        pph21: Number(payslip.pph21),
        bpjsKesehatan: Number(payslip.bpjsKesehatan),
        bpjsKetenagakerjaan: Number(payslip.bpjsKetenagakerjaan),
        otherDeductions: payslip.otherDeductions as any,
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
        pph21Status: payslip.employee.pph21Status as any,
        isActive: payslip.employee.isActive,
        joinedAt: payslip.employee.joinedAt,
        createdAt: payslip.employee.createdAt,
        updatedAt: payslip.employee.updatedAt,
      },
      template: payslip.template as any,
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
    
    // Return PDF
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="slip-gaji-${payslip.employee.name}-${payslip.startDate.toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Gagal generate PDF' },
      { status: 500 }
    )
  }
}
