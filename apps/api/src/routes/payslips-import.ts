import { apiError } from '../lib/api-error'
import { Hono } from 'hono'
import { prisma } from '@/lib/db'
import { calculatePayslip, getPeriodMonths } from '@payslip/core'
import * as XLSX from 'xlsx'
import { requireAdmin } from '../middleware/admin'
import type { Env } from '../types'

const router = new Hono<Env>()
router.use('*', requireAdmin)

const TUNJANGAN_COLS = [
  { col: 'Tunjangan Jabatan',    name: 'Tunjangan Jabatan',    component: 'tunjangan_jabatan' },
  { col: 'Tunjangan Luar Kota',  name: 'Tunjangan Luar Kota',  component: 'tunjangan_luar_kota' },
  { col: 'Tunjangan Makan',      name: 'Tunjangan Makan',      component: 'tunjangan_makan' },
  { col: 'Tunjangan Transport',  name: 'Tunjangan Transport',  component: 'tunjangan_transport' },
  { col: 'Tunjangan Lama Kerja', name: 'Tunjangan Lama Kerja', component: 'tunjangan_lama_bekerja' },
  { col: 'Insentif',             name: 'Insentif',             component: 'insentif' },
  { col: 'Tunjangan PPh 21',     name: 'Tunjangan PPh 21',     component: 'tunjangan_pph21' },
] as const

function parseImportRow(row: Record<string, string | number | null>, empBaseSalary: number) {
  const basePay = Number(row['Gaji Pokok'] ?? row['gaji pokok'] ?? empBaseSalary)
  const bonus   = Number(row['Bonus']      ?? row['bonus']      ?? 0)
  const thr     = Number(row['THR']        ?? row['thr']        ?? 0)
  const notes   = String(row['Catatan']    ?? row['catatan']    ?? '') || null

  const allowances = TUNJANGAN_COLS
    .map(t => ({ name: t.name, amount: Number(row[t.col] ?? 0), component: t.component }))
    .filter(a => a.amount > 0)

  const otherDeductionAmt = Number(row['Potongan Lain'] ?? row['potongan lain'] ?? 0)
  const otherDeductions = otherDeductionAmt > 0 ? [{ name: 'Potongan Lain', amount: otherDeductionAmt }] : []

  return { basePay, bonus, thr, notes, allowances, otherDeductions }
}

// POST /api/payslips/import — parse Excel, match employees, return preview
router.post('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'File tidak ditemukan' }, 400)
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return c.json({ error: 'Format file harus .xlsx, .xls, atau .csv' }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(ws, { defval: null })

    return c.json({ success: true, rows, totalRows: rows.length })
  } catch (e) {
    console.error('Payslip import parse error:', e)
    return c.json(apiError('Gagal memproses file', e), 500)
  }
})

// POST /api/payslips/import/preview — match employees and calculate payslips
router.post('/preview', async (c) => {
  const cid = c.get('companyId')
  try {
    const { rows, templateId, periodType, startDate, endDate } = await c.req.json()
    if (!templateId || !startDate || !endDate) {
      return c.json({ error: 'templateId, startDate, endDate wajib diisi' }, 400)
    }

    const employees = await prisma.employee.findMany({ where: { companyId: cid, isActive: true } })
    const empByEmployeeId = new Map(employees.map(e => [e.employeeId.toLowerCase(), e]))

    const monthCount = getPeriodMonths(periodType || 'monthly')
    const startDateObj = new Date(startDate)
    const year = startDateObj.getFullYear()
    const startOfYear = new Date(year, 0, 1)

    const existingPayslips = await prisma.payslip.findMany({
      where: { companyId: cid, startDate: { gte: startDateObj, lt: new Date(startDateObj.getTime() + 86400000) } },
      select: { employeeId: true },
    })
    const existingSet = new Set(existingPayslips.map(p => p.employeeId))

    const preview = await Promise.all(rows.map(async (row: Record<string, string | number | null>) => {
      const rawId = String(row['ID Karyawan'] ?? row['id karyawan'] ?? row['employeeId'] ?? '').trim()
      if (!rawId) return { valid: false, errors: ['ID Karyawan kosong'], row, employee: null, payslip: null }

      const emp = empByEmployeeId.get(rawId.toLowerCase())
      if (!emp) return { valid: false, errors: [`Karyawan ID "${rawId}" tidak ditemukan`], row, employee: null, payslip: null }

      const warnings: string[] = []
      if (existingSet.has(emp.id)) warnings.push('Slip gaji sudah ada untuk periode ini')

      const { basePay, bonus, thr, notes, allowances, otherDeductions } = parseImportRow(row, Number(emp.baseSalary))
      const calc = calculatePayslip({ baseSalary: basePay, bonus, thr, allowances, otherDeductions, pph21Status: emp.pph21Status, monthCount })

      const pph21 = row['PPh21'] != null ? Number(row['PPh21']) : calc.pph21
      const bpjsKesehatan = row['BPJS Kesehatan'] != null ? Number(row['BPJS Kesehatan']) : calc.bpjsKesehatan
      const bpjsTkJht = row['BPJS TK JHT'] != null ? Number(row['BPJS TK JHT']) : calc.bpjsTkJht
      const bpjsTkJp = row['BPJS TK JP'] != null ? Number(row['BPJS TK JP']) : calc.bpjsTkJp
      const otherDeductionsTotal = otherDeductions.reduce((s, d) => s + d.amount, 0)
      const totalDeductions = pph21 + bpjsKesehatan + bpjsTkJht + bpjsTkJp + otherDeductionsTotal
      const netPay = calc.grossPay - totalDeductions

      return {
        valid: true,
        warnings,
        row,
        employee: { id: emp.id, employeeId: emp.employeeId, name: emp.name },
        payslip: { basePay, bonus, thr, allowances, otherDeductions, pph21, bpjsKesehatan, bpjsTkJht, bpjsTkJp, grossPay: calc.grossPay, totalDeductions, netPay, notes },
      }
    }))

    const totalValid = preview.filter(p => p.valid).length
    const totalInvalid = preview.filter(p => !p.valid).length
    const totalWarnings = preview.filter(p => p.valid && p.warnings.length > 0).length

    return c.json({ success: true, preview, totalValid, totalInvalid, totalWarnings })
  } catch (e) {
    console.error('Payslip import preview error:', e)
    return c.json(apiError('Gagal membuat preview', e), 500)
  }
})

// POST /api/payslips/import/commit — create payslips for all valid rows
router.post('/commit', async (c) => {
  const cid = c.get('companyId')
  try {
    const { rows, templateId, periodType, startDate, endDate, skipDuplicates } = await c.req.json()
    if (!templateId || !startDate || !endDate) {
      return c.json({ error: 'templateId, startDate, endDate wajib diisi' }, 400)
    }

    const template = await prisma.template.findFirst({ where: { id: templateId, companyId: cid } })
    if (!template) return c.json({ error: 'Template tidak ditemukan' }, 404)

    const employees = await prisma.employee.findMany({ where: { companyId: cid, isActive: true } })
    const empByEmployeeId = new Map(employees.map(e => [e.employeeId.toLowerCase(), e]))

    const monthCount = getPeriodMonths(periodType || 'monthly')
    const startDateObj = new Date(startDate)
    const year = startDateObj.getFullYear()
    const startOfYear = new Date(year, 0, 1)

    const existingPayslips = await prisma.payslip.findMany({
      where: { companyId: cid, startDate: { gte: startDateObj, lt: new Date(startDateObj.getTime() + 86400000) } },
      select: { employeeId: true },
    })
    const existingSet = new Set(existingPayslips.map(p => p.employeeId))

    const ytdGroups = await prisma.payslip.groupBy({
      by: ['employeeId'],
      where: { companyId: cid, startDate: { gte: startOfYear, lt: startDateObj } },
      _sum: { ytdGross: true, ytdPph21: true },
    })
    const ytdMap = new Map(ytdGroups.map(g => [g.employeeId, { ytdGross: Number(g._sum.ytdGross) || 0, ytdPph21: Number(g._sum.ytdPph21) || 0 }]))

    let created = 0
    let skipped = 0
    const errors: { row: number; error: string }[] = []

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as Record<string, string | number | null>
        const rawId = String(row['ID Karyawan'] ?? row['id karyawan'] ?? row['employeeId'] ?? '').trim()
        if (!rawId) { errors.push({ row: i + 1, error: 'ID Karyawan kosong' }); continue }

        const emp = empByEmployeeId.get(rawId.toLowerCase())
        if (!emp) { errors.push({ row: i + 1, error: `Karyawan ID "${rawId}" tidak ditemukan` }); continue }

        if (existingSet.has(emp.id)) {
          if (skipDuplicates) { skipped++; continue }
          errors.push({ row: i + 1, error: `${emp.name}: slip gaji sudah ada untuk periode ini` })
          continue
        }

        const { basePay, bonus, thr, notes, allowances, otherDeductions } = parseImportRow(row, Number(emp.baseSalary))
        const calc = calculatePayslip({ baseSalary: basePay, bonus, thr, allowances, otherDeductions, pph21Status: emp.pph21Status, monthCount })
        const pph21 = row['PPh21'] != null ? Number(row['PPh21']) : calc.pph21
        const bpjsKesehatan = row['BPJS Kesehatan'] != null ? Number(row['BPJS Kesehatan']) : calc.bpjsKesehatan
        const bpjsTkJht = row['BPJS TK JHT'] != null ? Number(row['BPJS TK JHT']) : calc.bpjsTkJht
        const bpjsTkJp = row['BPJS TK JP'] != null ? Number(row['BPJS TK JP']) : calc.bpjsTkJp
        const otherDeductionsTotal = otherDeductions.reduce((s, d) => s + d.amount, 0)
        const totalDeductions = pph21 + bpjsKesehatan + bpjsTkJht + bpjsTkJp + otherDeductionsTotal
        const netPay = calc.grossPay - totalDeductions

        const ytd = ytdMap.get(emp.id) ?? { ytdGross: 0, ytdPph21: 0 }

        await tx.payslip.create({
          data: {
            companyId: cid, employeeId: emp.id, templateId, periodType: periodType || 'monthly',
            startDate: startDateObj, endDate: new Date(endDate),
            basePay, overtimeHours: 0, overtimePay: 0,
            bonus, thr, allowances: JSON.stringify(allowances),
            pph21, bpjsKesehatan, bpjsTkJht, bpjsTkJp,
            otherDeductions: JSON.stringify(otherDeductions),
            grossPay: calc.grossPay, totalDeductions, netPay,
            ytdGross: ytd.ytdGross + calc.grossPay,
            ytdPph21: ytd.ytdPph21 + pph21,
            notes,
          },
        })
        created++
      }
    })

    return c.json({ success: true, created, skipped, errors }, 201)
  } catch (e) {
    console.error('Payslip import commit error:', e)
    return c.json(apiError('Gagal menyimpan slip gaji', e), 500)
  }
})

// GET /api/payslips/import/template — download Excel template
router.get('/template', () => {
  const headers = [
    'ID Karyawan', 'Gaji Pokok',
    'Tunjangan Jabatan', 'Tunjangan Luar Kota', 'Tunjangan Makan', 'Tunjangan Transport',
    'Tunjangan Lama Kerja', 'Insentif', 'Tunjangan PPh 21',
    'Bonus', 'THR',
    'PPh21', 'BPJS Kesehatan', 'BPJS TK JHT', 'BPJS TK JP', 'Potongan Lain',
    'Catatan',
  ]
  const sample = ['EMP001', 8000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', '', '', '', 0, '']
  const ws = XLSX.utils.aoa_to_sheet([headers, sample])
  ws['!cols'] = headers.map((h, i) => ({ wch: i === 0 ? 14 : i === headers.length - 1 ? 20 : 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Import Slip Gaji')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-import-slip-gaji.xlsx"',
    },
  })
})

export default router
