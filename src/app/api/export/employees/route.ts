import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(_req: NextRequest) {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  const rows = employees.map(e => ({
    'ID Karyawan': e.employeeId,
    'Nama': e.name,
    'Email': e.email ?? '',
    'Departemen': e.department ?? '',
    'Jabatan': e.position ?? '',
    'Gaji Pokok': e.baseSalary,
    'Status PPh21': e.pph21Status,
    'NPWP': e.npwp ?? '',
    'Nama Bank': e.bankName ?? '',
    'No Rekening': e.bankAccount ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Karyawan')
  const buf: Uint8Array = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="karyawan.xlsx"',
    },
  })
}
