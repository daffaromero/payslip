import { apiError } from '../lib/api-error'
import { Hono } from 'hono'
import { prisma } from '@/lib/db'
import { EmployeePatchSchema } from '@/lib/api/schemas/employee'
import { parse } from '../lib/validate'
import * as XLSX from 'xlsx'
import { requireAdmin } from '../middleware/admin'
import type { Env } from '../types'

const router = new Hono<Env>()
router.on(['POST', 'PATCH', 'PUT', 'DELETE'], '*', requireAdmin)

function parseEmployee(e: { salaryComponents?: string | null; [key: string]: unknown }) {
  return {
    ...e,
    salaryComponents: e.salaryComponents ? JSON.parse(e.salaryComponents as string) : null,
  }
}

router.get('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const employees = await prisma.employee.findMany({
      where: { companyId: cid, isActive: true },
      orderBy: { name: 'asc' },
    })
    return c.json({ employees: employees.map(parseEmployee) })
  } catch (e) {
    console.error('Error fetching employees:', e)
    return c.json(apiError('Gagal memuat data karyawan', e), 500)
  }
})

router.post('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const data = await c.req.json()
    const employee = await prisma.employee.create({
      data: {
        companyId: cid,
        employeeId: data.employeeId,
        name: data.name,
        email: data.email || null,
        whatsappNumber: data.whatsappNumber || null,
        department: data.department || null,
        position: data.position || null,
        site: data.site || null,
        npwp: data.npwp || null,
        bankAccount: data.bankAccount || null,
        bankName: data.bankName || null,
        baseSalary: data.baseSalary,
        hourlyRate: data.hourlyRate || null,
        pph21Status: data.pph21Status || 'TK/0',
        salaryComponents: data.salaryComponents ? JSON.stringify(data.salaryComponents) : null,
        isActive: true,
      },
    })
    return c.json({ employee: parseEmployee(employee) }, 201)
  } catch (e) {
    console.error('Error creating employee:', e)
    return c.json(apiError('Gagal membuat karyawan', e), 500)
  }
})

// GET /api/employees/import-template — must be before /:id to avoid wildcard match
router.get('/import-template', async () => {
  const headers = [
    'ID Karyawan', 'Nama', 'Email', 'WhatsApp', 'Divisi', 'Jabatan', 'Site',
    'Gaji Pokok', 'Tarif Lembur / Jam', 'Status PPh21', 'NPWP', 'Nama Bank', 'No Rekening',
  ]
  const sample = [
    'EMP001', 'Budi Santoso', 'budi@company.com', '628123456789', 'Engineering', 'Staff', 'Yogyakarta',
    8000000, 50000, 'TK/0', '09.123.456.7-123.000', 'BCA', '1234567890',
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, sample])
  ws['!cols'] = headers.map(() => ({ wch: 20 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Karyawan')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-import-karyawan.xlsx"',
    },
  })
})

// GET /api/employees/export — must be before /:id to avoid wildcard match
router.get('/export', async (c) => {
  const cid = c.get('companyId')
  const employees = await prisma.employee.findMany({
    where: { companyId: cid, isActive: true },
    orderBy: { name: 'asc' },
  })

  const rows = employees.map(e => ({
    'ID Karyawan': e.employeeId,
    'Nama': e.name,
    'Email': e.email ?? '',
    'WhatsApp': e.whatsappNumber ?? '',
    'Divisi': e.department ?? '',
    'Jabatan': e.position ?? '',
    'Site': e.site ?? '',
    'Gaji Pokok': e.baseSalary,
    'Tarif Lembur / Jam': e.hourlyRate ?? '',
    'Status PPh21': e.pph21Status,
    'NPWP': e.npwp ?? '',
    'Nama Bank': e.bankName ?? '',
    'No Rekening': e.bankAccount ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Karyawan')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="karyawan.xlsx"',
    },
  })
})

router.get('/:id', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const employee = await prisma.employee.findFirst({ where: { id, companyId: cid } })
    if (!employee) return c.json({ error: 'Karyawan tidak ditemukan' }, 404)
    return c.json({ employee: parseEmployee(employee) })
  } catch (e) {
    console.error('Error fetching employee:', e)
    return c.json(apiError('Gagal memuat data karyawan', e), 500)
  }
})

router.patch('/:id', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const existing = await prisma.employee.findFirst({ where: { id, companyId: cid } })
    if (!existing) return c.json({ error: 'Karyawan tidak ditemukan' }, 404)

    const body = await c.req.json()
    const parsed = parse(EmployeePatchSchema, body)
    if (!parsed.ok) return c.json({ error: parsed.error }, 400)

    const { salaryComponents: sc, ...rest } = parsed.data
    const updateData = { ...rest, ...(sc !== undefined ? { salaryComponents: JSON.stringify(sc) } : {}) }
    const employee = await prisma.employee.update({ where: { id }, data: updateData })
    return c.json({ employee: parseEmployee(employee) })
  } catch (e) {
    console.error('Error updating employee:', e)
    return c.json(apiError('Gagal memperbarui karyawan', e), 500)
  }
})

router.delete('/:id', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const existing = await prisma.employee.findFirst({ where: { id, companyId: cid } })
    if (!existing) return c.json({ error: 'Karyawan tidak ditemukan' }, 404)

    await prisma.employee.update({ where: { id }, data: { isActive: false } })
    return c.json({ success: true })
  } catch (e) {
    console.error('Error deleting employee:', e)
    return c.json(apiError('Gagal menghapus karyawan', e), 500)
  }
})

export default router
