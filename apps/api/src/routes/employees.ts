import { Hono } from 'hono'
import { prisma } from '@/lib/db'
import { EmployeePatchSchema } from '@/lib/api/schemas/employee'
import { parse } from '../lib/validate'
import * as XLSX from 'xlsx'
import type { Env } from '../types'

const router = new Hono<Env>()

router.get('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const employees = await prisma.employee.findMany({
      where: { companyId: cid, isActive: true },
      orderBy: { name: 'asc' },
    })
    return c.json({ employees })
  } catch (e) {
    console.error('Error fetching employees:', e)
    return c.json({ error: 'Gagal memuat data karyawan' }, 500)
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
        npwp: data.npwp || null,
        bankAccount: data.bankAccount || null,
        bankName: data.bankName || null,
        baseSalary: data.baseSalary,
        hourlyRate: data.hourlyRate || null,
        pph21Status: data.pph21Status || 'TK/0',
        isActive: true,
      },
    })
    return c.json({ employee }, 201)
  } catch (e) {
    console.error('Error creating employee:', e)
    return c.json({ error: 'Gagal membuat karyawan' }, 500)
  }
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
    return c.json({ employee })
  } catch (e) {
    console.error('Error fetching employee:', e)
    return c.json({ error: 'Gagal memuat data karyawan' }, 500)
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

    const employee = await prisma.employee.update({ where: { id }, data: parsed.data })
    return c.json({ employee })
  } catch (e) {
    console.error('Error updating employee:', e)
    return c.json({ error: 'Gagal memperbarui karyawan' }, 500)
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
    return c.json({ error: 'Gagal menghapus karyawan' }, 500)
  }
})

export default router
