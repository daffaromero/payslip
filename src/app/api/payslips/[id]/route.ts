import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { calculatePayslip, getPeriodMonths } from '@/lib/calculations/payslip'
import { apiOk, apiError } from '@/lib/api/respond'
import { parseData } from '@/lib/api/validate'
import { PayslipPatchSchema } from '@/lib/api/schemas/payslip'

type Params = { params: Promise<{ id: string }> }

function deserializePayslip(payslip: {
  allowances: string
  otherDeductions: string
  [key: string]: unknown
}) {
  return {
    ...payslip,
    allowances: JSON.parse(payslip.allowances),
    otherDeductions: JSON.parse(payslip.otherDeductions),
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: true,
        template: true,
        company: true,
      },
    })
    if (!payslip) return apiError('Slip gaji tidak ditemukan', 404)
    return apiOk({ payslip: deserializePayslip(payslip as Parameters<typeof deserializePayslip>[0]) })
  } catch (error) {
    console.error('Error fetching payslip:', error)
    return apiError('Gagal memuat slip gaji')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const existing = await prisma.payslip.findUnique({ where: { id } })
    if (!existing) return apiError('Slip gaji tidak ditemukan', 404)

    const body = await req.json()
    const parsed = parseData(PayslipPatchSchema, body)
    if (!parsed.ok) return parsed.response

    const patch = parsed.data

    // If any earnings field changed, recalculate all computed fields
    const earningsChanged =
      patch.basePay != null ||
      patch.overtimeHours != null ||
      patch.bonus != null ||
      patch.thr != null ||
      patch.allowances != null ||
      patch.otherDeductions != null

    let computedFields: Record<string, number> = {}

    if (earningsChanged) {
      const employee = await prisma.employee.findUnique({ where: { id: existing.employeeId } })
      if (!employee) return apiError('Karyawan tidak ditemukan', 404)

      const basePay = patch.basePay ?? Number(existing.basePay)
      const overtimeHours = patch.overtimeHours ?? Number(existing.overtimeHours ?? 0)
      const bonus = patch.bonus ?? Number(existing.bonus)
      const thr = patch.thr ?? Number(existing.thr)
      const allowances = patch.allowances ?? JSON.parse(existing.allowances)
      const otherDeductions = patch.otherDeductions ?? JSON.parse(existing.otherDeductions)
      const monthCount = getPeriodMonths(existing.periodType)
      const hourlyRate = Number(employee.hourlyRate ?? 0)

      const calculations = calculatePayslip({
        baseSalary: basePay,
        overtimeHours,
        hourlyRate,
        bonus,
        thr,
        allowances,
        otherDeductions,
        pph21Status: employee.pph21Status as Parameters<typeof calculatePayslip>[0]['pph21Status'],
        monthCount,
      })

      const overtimePay =
        overtimeHours && hourlyRate
          ? overtimeHours <= 1
            ? overtimeHours * hourlyRate * 1.5
            : hourlyRate * 1.5 + (overtimeHours - 1) * hourlyRate * 2
          : 0

      computedFields = {
        overtimePay,
        pph21: calculations.pph21,
        bpjsKesehatan: calculations.bpjsKesehatan,
        bpjsKetenagakerjaan: calculations.bpjsKetenagakerjaan,
        grossPay: calculations.grossPay,
        totalDeductions: calculations.totalDeductions,
        netPay: calculations.netPay,
      }
    }

    const payslip = await prisma.payslip.update({
      where: { id },
      data: {
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.templateId ? { templateId: patch.templateId } : {}),
        ...(patch.basePay != null ? { basePay: patch.basePay } : {}),
        ...(patch.overtimeHours != null ? { overtimeHours: patch.overtimeHours } : {}),
        ...(patch.bonus != null ? { bonus: patch.bonus } : {}),
        ...(patch.thr != null ? { thr: patch.thr } : {}),
        ...(patch.allowances != null ? { allowances: JSON.stringify(patch.allowances) } : {}),
        ...(patch.otherDeductions != null
          ? { otherDeductions: JSON.stringify(patch.otherDeductions) }
          : {}),
        ...computedFields,
      },
    })

    return apiOk({ payslip: deserializePayslip(payslip as Parameters<typeof deserializePayslip>[0]) })
  } catch (error) {
    console.error('Error updating payslip:', error)
    return apiError('Gagal memperbarui slip gaji')
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const existing = await prisma.payslip.findUnique({ where: { id } })
    if (!existing) return apiError('Slip gaji tidak ditemukan', 404)

    await prisma.payslip.delete({ where: { id } })
    return apiOk({ success: true })
  } catch (error) {
    console.error('Error deleting payslip:', error)
    return apiError('Gagal menghapus slip gaji')
  }
}
