import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { apiError } from '@/lib/api/respond'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // e.g. '2024-01'

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
    'ID Karyawan': p.employee.employeeId,
    'Nama': p.employee.name,
    'Departemen': p.employee.department ?? '',
    'Periode Mulai': new Date(p.startDate).toLocaleDateString('id-ID'),
    'Periode Akhir': new Date(p.endDate).toLocaleDateString('id-ID'),
    'Tipe': p.periodType,
    'Gaji Pokok': p.basePay,
    'Lembur': p.overtimePay,
    'Bonus': p.bonus,
    'THR': p.thr,
    'Gaji Kotor': p.grossPay,
    'PPh21': p.pph21,
    'BPJS Kesehatan': p.bpjsKesehatan,
    'BPJS TK': p.bpjsKetenagakerjaan,
    'Total Potongan': p.totalDeductions,
    'Gaji Bersih': p.netPay,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Slip Gaji')
  const buf: Uint8Array = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

  const filename = month ? `slip-gaji-${month}.xlsx` : 'slip-gaji-semua.xlsx'

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
