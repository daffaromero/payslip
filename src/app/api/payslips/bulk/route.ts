import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { calculatePayslip, getPeriodMonths } from '@/lib/calculations/payslip'
import { apiOk, apiError } from '@/lib/api/respond'
import { parseData } from '@/lib/api/validate'
import { BulkPayslipSchema } from '@/lib/api/schemas/payslip'

export async function POST(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const body = await req.json()
    const parsed = parseData(BulkPayslipSchema, body)
    if (!parsed.ok) return parsed.response

    const { employeeIds, templateId, periodType, startDate, endDate, overtimeHours, bonus, notes } = parsed.data

    const template = await prisma.template.findFirst({ where: { id: templateId, companyId: cid } })
    if (!template) return apiError('Template tidak ditemukan', 404)

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, companyId: cid, isActive: true },
    })
    if (employees.length === 0) return apiError('Tidak ada karyawan aktif yang ditemukan', 404)

    const startDateObj = new Date(startDate)
    const year = startDateObj.getFullYear()
    const startOfYear = new Date(year, 0, 1)

    const ytdGroups = await prisma.payslip.groupBy({
      by: ['employeeId'],
      where: { employeeId: { in: employeeIds }, startDate: { gte: startOfYear, lt: startDateObj } },
      _sum: { ytdGross: true, ytdPph21: true },
    })

    const ytdMap = new Map(ytdGroups.map(g => [g.employeeId, { ytdGross: Number(g._sum.ytdGross) || 0, ytdPph21: Number(g._sum.ytdPph21) || 0 }]))
    const monthCount = getPeriodMonths(periodType)
    const payslipIds: string[] = []

    await prisma.$transaction(async tx => {
      for (const employee of employees) {
        const basePay = Number(employee.baseSalary)
        const hourlyRate = Number(employee.hourlyRate ?? 0)

        const calculations = calculatePayslip({
          baseSalary: basePay, overtimeHours: overtimeHours ?? 0, hourlyRate,
          bonus: bonus ?? 0, thr: 0, allowances: [], otherDeductions: [],
          pph21Status: employee.pph21Status as Parameters<typeof calculatePayslip>[0]['pph21Status'],
          monthCount,
        })

        const ytd = ytdMap.get(employee.id) ?? { ytdGross: 0, ytdPph21: 0 }
        const overtimePay = overtimeHours && hourlyRate
          ? overtimeHours <= 1 ? overtimeHours * hourlyRate * 1.5 : hourlyRate * 1.5 + (overtimeHours - 1) * hourlyRate * 2
          : 0

        const payslip = await tx.payslip.create({
          data: {
            companyId: cid,
            employeeId: employee.id,
            templateId,
            periodType,
            startDate: startDateObj,
            endDate: new Date(endDate),
            basePay, overtimeHours: overtimeHours ?? 0, overtimePay,
            bonus: bonus ?? 0, thr: 0, allowances: '[]',
            pph21: calculations.pph21,
            bpjsKesehatan: calculations.bpjsKesehatan,
            bpjsKetenagakerjaan: calculations.bpjsKetenagakerjaan,
            otherDeductions: '[]',
            grossPay: calculations.grossPay,
            totalDeductions: calculations.totalDeductions,
            netPay: calculations.netPay,
            ytdGross: ytd.ytdGross + calculations.grossPay,
            ytdPph21: ytd.ytdPph21 + calculations.pph21,
            notes: notes ?? null,
          },
        })
        payslipIds.push(payslip.id)
      }
    })

    return apiOk({ success: true, created: payslipIds.length, payslipIds }, 201)
  } catch (error) {
    console.error('Bulk payslip error:', error)
    return apiError('Gagal membuat slip gaji massal')
  }
}
