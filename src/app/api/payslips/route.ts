import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculatePayslip, getPeriodMonths } from '@/lib/calculations/payslip'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Get employee for calculations
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
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

    const payslip = await prisma.payslip.create({
      data: {
        companyId: employee.companyId,
        employeeId: data.employeeId,
        templateId: data.templateId,
        periodType: data.periodType || 'monthly',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        basePay: data.basePay || Number(employee.baseSalary),
        overtimeHours: data.overtimeHours || 0,
        overtimePay: calculations.grossPay - (data.basePay || Number(employee.baseSalary)) - (data.bonus || 0) - (data.thr || 0) - (data.allowances?.reduce((a: number, al: any) => a + (al.amount || 0), 0) || 0),
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
      },
    })

    return NextResponse.json({ success: true, payslipId: payslip.id })
  } catch (error) {
    console.error('Create payslip error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat slip gaji' },
      { status: 500 }
    )
  }
}
