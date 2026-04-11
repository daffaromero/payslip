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

// Maps Indonesian and English period names → internal value
const PERIOD_TYPE_MAP: Record<string, string> = {
  bulanan: 'monthly',      monthly: 'monthly',
  mingguan: 'weekly',      weekly: 'weekly',
  triwulan: 'quarterly',   quarterly: 'quarterly',
  '3 bulanan': 'quarterly',
  'semi tahunan': 'semi-annual', 'semi-annual': 'semi-annual',
  tahunan: 'annual',       annual: 'annual',
}

function parseImportRow(row: Record<string, string | number | null>, empBaseSalary: number) {
  const basePay = Number(row['Gaji Pokok']   ?? row['gaji pokok']   ?? empBaseSalary)
  const bonus   = Number(row['Bonus']        ?? row['bonus']        ?? 0)
  const thr     = Number(row['THR']          ?? row['thr']          ?? 0)
  const notes   = String(row['Catatan']      ?? row['catatan']      ?? '') || null

  const allowances = TUNJANGAN_COLS
    .map(t => ({ name: t.name, amount: Number(row[t.col] ?? 0), component: t.component }))
    .filter(a => a.amount > 0)

  const otherDeductionAmt = Number(row['Potongan Lain'] ?? row['potongan lain'] ?? 0)
  const otherDeductions = otherDeductionAmt > 0 ? [{ name: 'Potongan Lain', amount: otherDeductionAmt }] : []

  return { basePay, bonus, thr, notes, allowances, otherDeductions }
}

/** Convert an Excel date serial (days since 1899-12-30) to YYYY-MM-DD. */
function excelSerialToDateStr(serial: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400 * 1000)
  return d.toISOString().split('T')[0]
}

/** Parse a raw cell value to a YYYY-MM-DD string, handling Excel serials. */
function parseDateCell(val: string | number | null | undefined): string {
  if (val == null || val === '') return ''
  if (typeof val === 'number') return excelSerialToDateStr(val)
  const s = String(val).trim()
  // Pure integer string → Excel serial
  if (/^\d{4,6}$/.test(s)) return excelSerialToDateStr(Number(s))
  return s
}

/** Resolve per-row period/date/template overrides against form-level defaults. */
function resolveRowMeta(
  row: Record<string, string | number | null>,
  defaults: { templateId: string; periodType: string; startDate: string; endDate: string },
) {
  const rawPeriod = String(row['Periode (Opsional)'] ?? row['Periode'] ?? row['periode'] ?? '').trim().toLowerCase()
  const periodType = rawPeriod ? (PERIOD_TYPE_MAP[rawPeriod] ?? rawPeriod) : defaults.periodType

  const rawStart = row['Tanggal Mulai (Opsional)'] ?? row['Tanggal Mulai'] ?? row['tanggal mulai'] ?? null
  const rawEnd   = row['Tanggal Selesai (Opsional)'] ?? row['Tanggal Selesai'] ?? row['tanggal selesai'] ?? null
  const startDate    = parseDateCell(rawStart) || defaults.startDate
  const endDate      = parseDateCell(rawEnd)   || defaults.endDate
  const templateName = String(row['Template (Opsional)'] ?? row['Template'] ?? row['template'] ?? '').trim() || null

  return { periodType, startDate, endDate, templateName }
}

// POST /api/payslips/import — parse Excel, return rows
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

// POST /api/payslips/import/preview
router.post('/preview', async (c) => {
  const cid = c.get('companyId')
  try {
    const { rows, templateId = '', periodType = 'monthly', startDate = '', endDate = '' } = await c.req.json()

    const [employees, templates, existingPayslips] = await Promise.all([
      prisma.employee.findMany({ where: { companyId: cid, isActive: true } }),
      prisma.template.findMany({ where: { companyId: cid }, select: { id: true, name: true } }),
      prisma.payslip.findMany({ where: { companyId: cid }, select: { employeeId: true, startDate: true } }),
    ])

    const empByEmployeeId  = new Map(employees.map(e => [e.employeeId.toLowerCase(), e]))
    const templateById     = new Map(templates.map(t => [t.id, t.name]))
    const templateByName   = new Map(templates.map(t => [t.name.toLowerCase(), t.id]))
    // fallback: resolve default templateId to name for per-row comparison
    const defaultTemplateName = templateId ? (templateById.get(templateId) ?? null) : null

    // existing set: "employeeId:YYYY-MM-DD"
    const existingSet = new Set(
      existingPayslips.map(p => `${p.employeeId}:${p.startDate.toISOString().split('T')[0]}`)
    )

    const preview = await Promise.all(rows.map(async (row: Record<string, string | number | null>) => {
      const rawId = String(row['ID Karyawan'] ?? row['id karyawan'] ?? row['employeeId'] ?? '').trim()
      if (!rawId) return { valid: false, errors: ['ID Karyawan kosong'], row, employee: null, payslip: null }

      const emp = empByEmployeeId.get(rawId.toLowerCase())
      if (!emp) return { valid: false, errors: [`Karyawan ID "${rawId}" tidak ditemukan`], row, employee: null, payslip: null }

      const meta = resolveRowMeta(row, { templateId, periodType, startDate, endDate })
      if (!meta.startDate || !meta.endDate) return { valid: false, errors: ['Tanggal Mulai dan Tanggal Selesai wajib diisi'], row, employee: null, payslip: null }

      // Resolve templateId for this row
      let rowTemplateId = templateId
      if (meta.templateName) {
        const resolved = templateByName.get(meta.templateName.toLowerCase())
        if (!resolved) return { valid: false, errors: [`Template "${meta.templateName}" tidak ditemukan`], row, employee: null, payslip: null }
        rowTemplateId = resolved
      }
      if (!rowTemplateId) return { valid: false, errors: ['Template wajib diisi'], row, employee: null, payslip: null }

      const warnings: string[] = []
      const startKey = `${emp.id}:${meta.startDate}`
      if (existingSet.has(startKey)) warnings.push('Slip gaji sudah ada untuk periode ini')

      const monthCount = getPeriodMonths(meta.periodType)
      const { basePay, bonus, thr, notes, allowances, otherDeductions } = parseImportRow(row, Number(emp.baseSalary))
      const calc = calculatePayslip({ baseSalary: basePay, bonus, thr, allowances, otherDeductions, pph21Status: emp.pph21Status, monthCount })

      const pph21         = row['PPh21']          != null ? Number(row['PPh21'])          : calc.pph21
      const bpjsKesehatan = row['BPJS Kesehatan'] != null ? Number(row['BPJS Kesehatan']) : calc.bpjsKesehatan
      const bpjsTkJht     = row['BPJS TK JHT']    != null ? Number(row['BPJS TK JHT'])    : calc.bpjsTkJht
      const bpjsTkJp      = row['BPJS TK JP']     != null ? Number(row['BPJS TK JP'])     : calc.bpjsTkJp
      const otherDeductionsTotal = otherDeductions.reduce((s, d) => s + d.amount, 0)
      const totalDeductions = pph21 + bpjsKesehatan + bpjsTkJht + bpjsTkJp + otherDeductionsTotal
      const netPay = calc.grossPay - totalDeductions

      return {
        valid: true,
        warnings,
        row,
        employee: { id: emp.id, employeeId: emp.employeeId, name: emp.name },
        payslip: {
          templateId: rowTemplateId, periodType: meta.periodType,
          startDate: meta.startDate, endDate: meta.endDate,
          basePay, bonus, thr, allowances, otherDeductions,
          pph21, bpjsKesehatan, bpjsTkJht, bpjsTkJp,
          grossPay: calc.grossPay, totalDeductions, netPay, notes,
        },
      }
    }))

    const totalValid    = preview.filter(p => p.valid).length
    const totalInvalid  = preview.filter(p => !p.valid).length
    const totalWarnings = preview.filter(p => p.valid && (p as { warnings?: string[] }).warnings?.length).length

    return c.json({ success: true, preview, totalValid, totalInvalid, totalWarnings })
  } catch (e) {
    console.error('Payslip import preview error:', e)
    return c.json(apiError('Gagal membuat preview', e), 500)
  }
})

// POST /api/payslips/import/commit
router.post('/commit', async (c) => {
  const cid = c.get('companyId')
  try {
    const { rows, templateId = '', periodType = 'monthly', startDate = '', endDate = '', skipDuplicates = false } = await c.req.json()

    const [employees, templates, existingPayslips] = await Promise.all([
      prisma.employee.findMany({ where: { companyId: cid, isActive: true } }),
      prisma.template.findMany({ where: { companyId: cid }, select: { id: true, name: true } }),
      prisma.payslip.findMany({ where: { companyId: cid }, select: { employeeId: true, startDate: true } }),
    ])

    const empByEmployeeId = new Map(employees.map(e => [e.employeeId.toLowerCase(), e]))
    const templateByName  = new Map(templates.map(t => [t.name.toLowerCase(), t.id]))
    const templateIds     = new Set(templates.map(t => t.id))

    const existingSet = new Set(
      existingPayslips.map(p => `${p.employeeId}:${p.startDate.toISOString().split('T')[0]}`)
    )

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

        const meta = resolveRowMeta(row, { templateId, periodType, startDate, endDate })
        if (!meta.startDate || !meta.endDate) {
          errors.push({ row: i + 1, error: 'Tanggal Mulai dan Tanggal Selesai wajib diisi' }); continue
        }

        let rowTemplateId = templateId
        if (meta.templateName) {
          const resolved = templateByName.get(meta.templateName.toLowerCase())
          if (!resolved) { errors.push({ row: i + 1, error: `Template "${meta.templateName}" tidak ditemukan` }); continue }
          rowTemplateId = resolved
        }
        if (!rowTemplateId || !templateIds.has(rowTemplateId)) {
          errors.push({ row: i + 1, error: 'Template wajib diisi' }); continue
        }

        const startKey = `${emp.id}:${meta.startDate}`
        if (existingSet.has(startKey)) {
          if (skipDuplicates) { skipped++; continue }
          errors.push({ row: i + 1, error: `${emp.name}: slip gaji sudah ada untuk periode ini` }); continue
        }

        const monthCount   = getPeriodMonths(meta.periodType)
        const startDateObj = new Date(meta.startDate)
        const startOfYear  = new Date(startDateObj.getFullYear(), 0, 1)

        const { basePay, bonus, thr, notes, allowances, otherDeductions } = parseImportRow(row, Number(emp.baseSalary))
        const calc = calculatePayslip({ baseSalary: basePay, bonus, thr, allowances, otherDeductions, pph21Status: emp.pph21Status, monthCount })

        const pph21         = row['PPh21']          != null ? Number(row['PPh21'])          : calc.pph21
        const bpjsKesehatan = row['BPJS Kesehatan'] != null ? Number(row['BPJS Kesehatan']) : calc.bpjsKesehatan
        const bpjsTkJht     = row['BPJS TK JHT']    != null ? Number(row['BPJS TK JHT'])    : calc.bpjsTkJht
        const bpjsTkJp      = row['BPJS TK JP']     != null ? Number(row['BPJS TK JP'])     : calc.bpjsTkJp
        const otherDeductionsTotal = otherDeductions.reduce((s, d) => s + d.amount, 0)
        const totalDeductions = pph21 + bpjsKesehatan + bpjsTkJht + bpjsTkJp + otherDeductionsTotal
        const netPay = calc.grossPay - totalDeductions

        // YTD: sum payslips before this row's startDate within the same year
        const ytdAgg = await tx.payslip.aggregate({
          where: { companyId: cid, employeeId: emp.id, startDate: { gte: startOfYear, lt: startDateObj } },
          _sum: { ytdGross: true, ytdPph21: true },
        })
        const ytdGross = Number(ytdAgg._sum.ytdGross) || 0
        const ytdPph21Acc = Number(ytdAgg._sum.ytdPph21) || 0

        await tx.payslip.create({
          data: {
            companyId: cid, employeeId: emp.id,
            templateId: rowTemplateId, periodType: meta.periodType,
            startDate: startDateObj, endDate: new Date(meta.endDate),
            basePay, overtimeHours: 0, overtimePay: 0,
            bonus, thr, allowances: JSON.stringify(allowances),
            pph21, bpjsKesehatan, bpjsTkJht, bpjsTkJp,
            otherDeductions: JSON.stringify(otherDeductions),
            grossPay: calc.grossPay, totalDeductions, netPay,
            ytdGross: ytdGross + calc.grossPay,
            ytdPph21: ytdPph21Acc + pph21,
            notes,
          },
        })

        // Track in-batch to prevent same-batch duplicates
        existingSet.add(startKey)
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
    'ID Karyawan', 'Periode (Opsional)', 'Tanggal Mulai (Opsional)', 'Tanggal Selesai (Opsional)', 'Template (Opsional)',
    'Gaji Pokok',
    'Tunjangan Jabatan', 'Tunjangan Luar Kota', 'Tunjangan Makan', 'Tunjangan Transport',
    'Tunjangan Lama Kerja', 'Insentif', 'Tunjangan PPh 21',
    'Bonus', 'THR',
    'PPh21', 'BPJS Kesehatan', 'BPJS TK JHT', 'BPJS TK JP', 'Potongan Lain',
    'Catatan',
  ]
  const sample = ['EMP001', 'monthly', '2026-05-01', '2026-05-31', 'Template Name', 8000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', '', '', '', 0, '']
  const ws = XLSX.utils.aoa_to_sheet([headers, sample])
  ws['!cols'] = headers.map((_, i) => ({ wch: i < 5 ? 16 : i === headers.length - 1 ? 20 : 18 }))
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
