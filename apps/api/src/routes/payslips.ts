import { Hono } from 'hono'
import { prisma } from '../../../../src/lib/db'
import { calculatePayslip, getPeriodMonths } from '../../../../packages/core/src/calculations/payslip'
import { PayslipPatchSchema, BulkPayslipSchema } from '../../../../packages/core/src/schemas/payslip'
import { deserializeTemplate, type RawTemplate } from '../../../../src/lib/api/template-serializer'
import { generatePayslipPDF } from '../../../../src/lib/pdf/generator'
import { sendPayslipEmail } from '../../../../src/lib/email/sender'
import { sendDocument } from '../../../../src/lib/whatsapp/client'
import { parse } from '../lib/validate'
import * as XLSX from 'xlsx'
import { requireAdmin } from '../middleware/admin'
import type { Env } from '../types'

const router = new Hono<Env>()
router.on(['POST', 'PATCH', 'PUT', 'DELETE'], '*', requireAdmin)

function deserializePayslip(p: { allowances: string; otherDeductions: string; [k: string]: unknown }) {
  return { ...p, allowances: JSON.parse(p.allowances), otherDeductions: JSON.parse(p.otherDeductions) }
}

// GET /api/payslips
router.get('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const employeeId = c.req.query('employeeId') ?? undefined
    const year = c.req.query('year') ? Number(c.req.query('year')) : undefined
    const month = c.req.query('month') ? Number(c.req.query('month')) : undefined
    const periodType = c.req.query('periodType') ?? undefined
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
    const skip = (page - 1) * limit

    const where = {
      companyId: cid,
      ...(employeeId ? { employeeId } : {}),
      ...(periodType ? { periodType } : {}),
      ...(year && month
        ? { startDate: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } }
        : year
        ? { startDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
        : {}),
    }

    const [payslips, total] = await Promise.all([
      prisma.payslip.findMany({
        where, orderBy: { generatedAt: 'desc' }, skip, take: limit,
        select: {
          id: true, employeeId: true, templateId: true, periodType: true,
          startDate: true, endDate: true, grossPay: true, netPay: true, generatedAt: true,
          employee: { select: { id: true, name: true, employeeId: true } },
        },
      }),
      prisma.payslip.count({ where }),
    ])

    return c.json({ payslips, total, page, limit })
  } catch (e) {
    console.error('Error fetching payslips:', e)
    return c.json({ error: 'Gagal memuat data slip gaji' }, 500)
  }
})

// POST /api/payslips
router.post('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const data = await c.req.json()

    const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId: cid } })
    if (!employee) return c.json({ error: 'Karyawan tidak ditemukan' }, 404)

    // Build allowances from salary components
    const defaultComponents = employee.salaryComponents ? JSON.parse(employee.salaryComponents) : null
    const overrides = data.salaryComponents || {}
    
    const allowances: { name: string; amount: number; component?: string }[] = []
    
    const componentKeys = ['tunjangan_jabatan', 'tunjangan_luar_kota', 'tunjangan_makan', 'tunjangan_transport', 'tunjangan_lama_bekerja', 'tunjangan_pph21'] as const
    for (const key of componentKeys) {
      const enabled = overrides[key]?.enabled ?? defaultComponents?.[key]?.enabled ?? false
      const amount = overrides[key]?.amount ?? defaultComponents?.[key]?.amount ?? 0
      if (enabled && amount > 0) {
        const labels: Record<string, string> = {
          tunjangan_jabatan: 'Tunjangan Jabatan',
          tunjangan_luar_kota: 'Tunjangan Luar Kota',
          tunjangan_makan: 'Tunjangan Makan',
          tunjangan_transport: 'Tunjangan Transport',
          tunjangan_lama_bekerja: 'Tunjangan Lama Kerja',
          tunjangan_pph21: 'Tunjangan PPh 21',
        }
        allowances.push({ name: labels[key], amount, component: key })
      }
    }
    
    // Add custom allowances from request
    if (data.allowances?.length) {
      allowances.push(...data.allowances.map((a: { name: string; amount: number }) => ({ ...a, component: 'custom' })))
    }

    const monthCount = getPeriodMonths(data.periodType || 'monthly')
    const calculations = calculatePayslip({
      baseSalary: data.basePay || Number(employee.baseSalary),
      overtimeHours: data.overtimeHours, hourlyRate: data.hourlyRate || Number(employee.hourlyRate),
      bonus: data.bonus, thr: data.thr, allowances, otherDeductions: data.otherDeductions,
      pph21Status: employee.pph21Status, monthCount,
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

    const overtimePay = calculations.grossPay
      - (data.basePay || Number(employee.baseSalary))
      - (data.bonus || 0) - (data.thr || 0)
      - (allowances.reduce((a: number, al: { amount?: number }) => a + (al.amount || 0), 0) || 0)

    const manualPph21 = data.pph21 ?? calculations.pph21
    const manualBpjsKesehatan = data.bpjsKesehatan ?? calculations.bpjsKesehatan
    const manualBpjsTkJht = data.bpjsTkJht ?? calculations.bpjsTkJht
    const manualBpjsTkJp = data.bpjsTkJp ?? calculations.bpjsTkJp

    const otherDeductionsTotal = (data.otherDeductions || []).reduce((sum: number, d: { amount?: number }) => sum + (d.amount || 0), 0)
    const totalDeductions = manualPph21 + manualBpjsKesehatan + manualBpjsTkJht + manualBpjsTkJp + otherDeductionsTotal
    const netPay = calculations.grossPay - totalDeductions

    const payslip = await prisma.payslip.create({
      data: {
        companyId: cid, employeeId: data.employeeId, templateId: data.templateId,
        periodType: data.periodType || 'monthly',
        startDate, endDate: new Date(data.endDate),
        basePay: data.basePay || Number(employee.baseSalary),
        overtimeHours: data.overtimeHours || 0, overtimePay,
        bonus: data.bonus || 0, thr: data.thr || 0,
        allowances: JSON.stringify(allowances),
        pph21: manualPph21, bpjsKesehatan: manualBpjsKesehatan,
        bpjsTkJht: manualBpjsTkJht, bpjsTkJp: manualBpjsTkJp,
        otherDeductions: JSON.stringify(data.otherDeductions || []),
        grossPay: calculations.grossPay, totalDeductions,
        netPay,
        ytdGross: previousYtdGross + calculations.grossPay,
        ytdPph21: previousYtdPph21 + manualPph21,
        notes: data.notes,
      },
    })

    return c.json({ success: true, payslipId: payslip.id }, 201)
  } catch (e) {
    console.error('Create payslip error:', e)
    return c.json({ error: 'Gagal membuat slip gaji' }, 500)
  }
})

// POST /api/payslips/bulk
router.post('/bulk', async (c) => {
  const cid = c.get('companyId')
  try {
    const body = await c.req.json()
    const parsed = parse(BulkPayslipSchema, body)
    if (!parsed.ok) return c.json({ error: parsed.error }, 400)

    const { employeeIds, templateId, periodType, startDate, endDate, overtimeHours, bonus, notes } = parsed.data

    const template = await prisma.template.findFirst({ where: { id: templateId, companyId: cid } })
    if (!template) return c.json({ error: 'Template tidak ditemukan' }, 404)

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, companyId: cid, isActive: true },
    })
    if (employees.length === 0) return c.json({ error: 'Tidak ada karyawan aktif yang ditemukan' }, 404)

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
        const ovPay = overtimeHours && hourlyRate
          ? overtimeHours <= 1 ? overtimeHours * hourlyRate * 1.5 : hourlyRate * 1.5 + (overtimeHours - 1) * hourlyRate * 2
          : 0

        const payslip = await tx.payslip.create({
          data: {
            companyId: cid, employeeId: employee.id, templateId, periodType,
            startDate: startDateObj, endDate: new Date(endDate),
            basePay, overtimeHours: overtimeHours ?? 0, overtimePay: ovPay,
            bonus: bonus ?? 0, thr: 0, allowances: '[]',
            pph21: calculations.pph21, bpjsKesehatan: calculations.bpjsKesehatan,
            bpjsTkJht: calculations.bpjsTkJht, bpjsTkJp: calculations.bpjsTkJp,
            otherDeductions: '[]',
            grossPay: calculations.grossPay, totalDeductions: calculations.totalDeductions,
            netPay: calculations.netPay,
            ytdGross: ytd.ytdGross + calculations.grossPay,
            ytdPph21: ytd.ytdPph21 + calculations.pph21,
            notes: notes ?? null,
          },
        })
        payslipIds.push(payslip.id)
      }
    })

    return c.json({ success: true, created: payslipIds.length, payslipIds }, 201)
  } catch (e) {
    console.error('Bulk payslip error:', e)
    return c.json({ error: 'Gagal membuat slip gaji massal' }, 500)
  }
})

// GET /api/payslips/export — must be before /:id to avoid wildcard match
router.get('/export', async (c) => {
  const cid = c.get('companyId')
  const month = c.req.query('month')

  const startDateFilter = month
    ? (() => {
        const [year, mon] = month.split('-').map(Number)
        return { gte: new Date(year, mon - 1, 1), lt: new Date(year, mon, 1) }
      })()
    : undefined

  const payslips = await prisma.payslip.findMany({
    where: { companyId: cid, ...(startDateFilter ? { startDate: startDateFilter } : {}) },
    include: { employee: { select: { name: true, employeeId: true, department: true } } },
    orderBy: [{ startDate: 'desc' }, { employee: { name: 'asc' } }],
  })

  const rows = payslips.map(p => ({
    'ID Karyawan': p.employee.employeeId, 'Nama': p.employee.name,
    'Divisi': p.employee.department ?? '', 'Periode Mulai': new Date(p.startDate).toLocaleDateString('id-ID'),
    'Periode Akhir': new Date(p.endDate).toLocaleDateString('id-ID'), 'Tipe': p.periodType,
    'Gaji Pokok': p.basePay, 'Lembur': p.overtimePay, 'Bonus': p.bonus, 'THR': p.thr,
    'Gaji Kotor': p.grossPay, 'PPh21': p.pph21, 'BPJS Kesehatan': p.bpjsKesehatan,
    'BPJS TK JHT': p.bpjsTkJht, 'BPJS TK JP': p.bpjsTkJp, 'Total Potongan': p.totalDeductions, 'Gaji Bersih': p.netPay,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Slip Gaji')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const filename = month ? `slip-gaji-${month}.xlsx` : 'slip-gaji-semua.xlsx'

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})

// GET /api/payslips/:id
router.get('/:id', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const payslip = await prisma.payslip.findFirst({
      where: { id, companyId: cid },
      include: { employee: true, template: true, company: true },
    })
    if (!payslip) return c.json({ error: 'Slip gaji tidak ditemukan' }, 404)
    return c.json({ payslip: deserializePayslip(payslip as Parameters<typeof deserializePayslip>[0]) })
  } catch (e) {
    console.error('Error fetching payslip:', e)
    return c.json({ error: 'Gagal memuat slip gaji' }, 500)
  }
})

// PATCH /api/payslips/:id
router.patch('/:id', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const existing = await prisma.payslip.findFirst({ where: { id, companyId: cid } })
    if (!existing) return c.json({ error: 'Slip gaji tidak ditemukan' }, 404)

    const body = await c.req.json()
    const parsed = parse(PayslipPatchSchema, body)
    if (!parsed.ok) return c.json({ error: parsed.error }, 400)

    const patch = parsed.data
    const earningsChanged =
      patch.basePay != null || patch.overtimeHours != null || patch.bonus != null ||
      patch.thr != null || patch.allowances != null || patch.otherDeductions != null

    let computedFields: Record<string, number> = {}

    if (earningsChanged) {
      const employee = await prisma.employee.findFirst({ where: { id: existing.employeeId, companyId: cid } })
      if (!employee) return c.json({ error: 'Karyawan tidak ditemukan' }, 404)

      const basePay = patch.basePay ?? Number(existing.basePay)
      const overtimeHours = patch.overtimeHours ?? Number(existing.overtimeHours ?? 0)
      const bonus = patch.bonus ?? Number(existing.bonus)
      const thr = patch.thr ?? Number(existing.thr)
      const allowances = patch.allowances ?? JSON.parse(existing.allowances as string)
      const otherDeductions = patch.otherDeductions ?? JSON.parse(existing.otherDeductions as string)
      const monthCount = getPeriodMonths(existing.periodType)
      const hourlyRate = Number(employee.hourlyRate ?? 0)

      const calculations = calculatePayslip({
        baseSalary: basePay, overtimeHours, hourlyRate, bonus, thr, allowances, otherDeductions,
        pph21Status: employee.pph21Status as Parameters<typeof calculatePayslip>[0]['pph21Status'],
        monthCount,
      })

      const overtimePay = overtimeHours && hourlyRate
        ? overtimeHours <= 1 ? overtimeHours * hourlyRate * 1.5 : hourlyRate * 1.5 + (overtimeHours - 1) * hourlyRate * 2
        : 0

      computedFields = {
        overtimePay, pph21: calculations.pph21,
        bpjsKesehatan: calculations.bpjsKesehatan,
        bpjsTkJht: calculations.bpjsTkJht, bpjsTkJp: calculations.bpjsTkJp,
        grossPay: calculations.grossPay,
        totalDeductions: calculations.totalDeductions,
        netPay: calculations.netPay,
      }
    }

    const payslip = await prisma.payslip.update({
      where: { id, companyId: cid },
      data: {
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.templateId ? { templateId: patch.templateId } : {}),
        ...(patch.basePay != null ? { basePay: patch.basePay } : {}),
        ...(patch.overtimeHours != null ? { overtimeHours: patch.overtimeHours } : {}),
        ...(patch.bonus != null ? { bonus: patch.bonus } : {}),
        ...(patch.thr != null ? { thr: patch.thr } : {}),
        ...(patch.allowances != null ? { allowances: JSON.stringify(patch.allowances) } : {}),
        ...(patch.otherDeductions != null ? { otherDeductions: JSON.stringify(patch.otherDeductions) } : {}),
        ...computedFields,
      },
    })

    return c.json({ payslip: deserializePayslip(payslip as Parameters<typeof deserializePayslip>[0]) })
  } catch (e) {
    console.error('Error updating payslip:', e)
    return c.json({ error: 'Gagal memperbarui slip gaji' }, 500)
  }
})

// DELETE /api/payslips/:id
router.delete('/:id', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const existing = await prisma.payslip.findFirst({ where: { id, companyId: cid } })
    if (!existing) return c.json({ error: 'Slip gaji tidak ditemukan' }, 404)
    await prisma.payslip.delete({ where: { id, companyId: cid } })
    return c.json({ success: true })
  } catch (e) {
    console.error('Error deleting payslip:', e)
    return c.json({ error: 'Gagal menghapus slip gaji' }, 500)
  }
})

// POST /api/payslips/:id/send-email
router.post('/:id/send-email', async (c) => {
  const cid = c.get('companyId')
  const id = c.req.param('id')
  try {
    const payslip = await prisma.payslip.findFirst({
      where: { id, companyId: cid },
      include: { employee: true, template: true, company: true },
    })
    if (!payslip) return c.json({ error: 'Slip gaji tidak ditemukan' }, 404)
    if (!payslip.employee.email) {
      return c.json({ error: 'Karyawan tidak memiliki alamat email. Tambahkan email di halaman edit karyawan.' }, 400)
    }

    const template = deserializeTemplate(payslip.template as unknown as RawTemplate)
    const payslipData = { ...payslip, allowances: JSON.parse(payslip.allowances as string), otherDeductions: JSON.parse(payslip.otherDeductions as string) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await generatePayslipPDF({ payslip: payslipData as any, employee: payslip.employee as any, template: template as any, company: payslip.company })

    const periodLabel = new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long' }).format(new Date(payslip.startDate))
    const safeName = payslip.employee.name.toLowerCase().replace(/\s+/g, '-')
    const safeDate = new Date(payslip.startDate).toISOString().slice(0, 7)

    await sendPayslipEmail({
      to: payslip.employee.email, employeeName: payslip.employee.name,
      companyName: payslip.company.name, periodLabel,
      pdfBuffer, filename: `slip-gaji-${safeName}-${safeDate}.pdf`,
    })

    return c.json({ message: `Slip gaji berhasil dikirim ke ${payslip.employee.email}` })
  } catch (e) {
    console.error('Email send error:', e)
    const msg = e instanceof Error ? e.message : 'Gagal mengirim email'
    return c.json({ error: msg }, 500)
  }
})

// POST /api/payslips/:id/send-whatsapp
router.post('/:id/send-whatsapp', async (c) => {
  const cid = c.get('companyId')
  const id = c.req.param('id')
  try {
    const payslip = await prisma.payslip.findFirst({
      where: { id, companyId: cid },
      include: { employee: true, template: true, company: true },
    })
    if (!payslip) return c.json({ error: 'Slip gaji tidak ditemukan' }, 404)

    const number = payslip.employee.whatsappNumber
    if (!number) {
      return c.json({ error: 'Karyawan tidak memiliki nomor WhatsApp. Tambahkan di halaman edit karyawan.' }, 400)
    }

    const template = deserializeTemplate(payslip.template as unknown as RawTemplate)
    const payslipData = { ...payslip, allowances: JSON.parse(payslip.allowances as string), otherDeductions: JSON.parse(payslip.otherDeductions as string) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await generatePayslipPDF({ payslip: payslipData as any, employee: payslip.employee as any, template: template as any, company: payslip.company })

    const periodLabel = new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long' }).format(new Date(payslip.startDate))
    const safeName = payslip.employee.name.toLowerCase().replace(/\s+/g, '-')
    const safeDate = new Date(payslip.startDate).toISOString().slice(0, 7)
    const filename = `slip-gaji-${safeName}-${safeDate}.pdf`
    const caption = `Yth. *${payslip.employee.name}*,\n\nTerlampir slip gaji Anda untuk periode *${periodLabel}*.\n\nSilakan simpan dokumen ini sebagai bukti penerimaan gaji.\n\n_${payslip.company.name}_`

    await sendDocument({ to: number, caption, filename, buffer: pdfBuffer, mimetype: 'application/pdf' })
    return c.json({ message: `Slip gaji berhasil dikirim ke WhatsApp ${number}` })
  } catch (e) {
    console.error('WhatsApp send error:', e)
    const msg = e instanceof Error ? e.message : 'Gagal mengirim WhatsApp'
    return c.json({ error: msg }, 500)
  }
})

export default router
