import { schedule } from 'node-cron'
import { prisma } from '@/lib/db'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'

const EXPORT_DIR = process.env.EXPORT_DIR ?? path.join(process.cwd(), 'data/exports')

async function exportMonthlyPayslips() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed, so this is the *previous* month (cron runs at month start)
  const prevYear = month === 0 ? year - 1 : year
  const prevMonth = month === 0 ? 12 : month

  const start = new Date(prevYear, prevMonth - 1, 1)
  const end = new Date(prevYear, prevMonth, 1)

  console.log(`[cron] exporting payslips for ${prevYear}-${String(prevMonth).padStart(2, '0')}`)

  try {
    const companies = await prisma.company.findMany({ select: { id: true, name: true } })

    for (const company of companies) {
      const payslips = await prisma.payslip.findMany({
        where: { companyId: company.id, startDate: { gte: start, lt: end } },
        include: { employee: { select: { name: true, employeeId: true, department: true, position: true } } },
        orderBy: { startDate: 'asc' },
      })

      if (payslips.length === 0) continue

      const rows = payslips.map(p => ({
        'Employee ID': p.employee.employeeId,
        'Name': p.employee.name,
        'Department': p.employee.department ?? '',
        'Position': p.employee.position ?? '',
        'Period': `${p.startDate.toISOString().split('T')[0]} – ${p.endDate.toISOString().split('T')[0]}`,
        'Gross Pay': Number(p.grossPay),
        'Total Deductions': Number(p.totalDeductions),
        'Net Pay': Number(p.netPay),
        'PPh21': Number(p.pph21),
        'BPJS Kesehatan': Number(p.bpjsKesehatan),
        'BPJS Ketenagakerjaan': Number(p.bpjsKetenagakerjaan),
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Payslips')

      const safeName = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const filename = `payslips-${safeName}-${prevYear}-${String(prevMonth).padStart(2, '0')}.xlsx`
      const companyDir = path.join(EXPORT_DIR, company.id)
      mkdirSync(companyDir, { recursive: true })
      writeFileSync(path.join(companyDir, filename), XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))

      console.log(`[cron] exported ${payslips.length} payslips → ${filename}`)
    }
  } catch (e) {
    console.error('[cron] monthly export failed:', e)
  }
}

// Run at 00:05 on the 1st of every month
export function startCronJobs() {
  schedule('5 0 1 * *', exportMonthlyPayslips)
  console.log('[cron] monthly payslip export scheduled')
}
