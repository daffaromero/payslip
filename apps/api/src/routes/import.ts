import { apiError } from '../lib/api-error'
import { Hono } from 'hono'
import { prisma } from '@/lib/db'
import { parseExcelFile, autoMapColumns } from '@/lib/excel/parser'
import { generateImportPreview } from '@/lib/excel/mapper'
import { z } from 'zod'
import { parse } from '../lib/validate'
import type { Pph21Status } from '@/types'
import { requireAdmin } from '../middleware/admin'
import type { Env } from '../types'

const router = new Hono<Env>()
router.on(['POST', 'PATCH', 'PUT', 'DELETE'], '*', requireAdmin)

const CommitSchema = z.object({
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
  mappings: z.record(z.string(), z.string()),
  defaultValues: z.object({
    pph21Status: z.string().optional(),
    department: z.string().optional(),
  }).optional(),
  skipInvalid: z.boolean().default(false),
})

// POST /api/import-excel — parse file
router.post('/', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'File tidak ditemukan' }, 400)
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return c.json({ error: 'Format file harus .xlsx, .xls, atau .csv' }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = parseExcelFile(buffer)
    const autoMappings = autoMapColumns(result.headers)

    return c.json({
      success: true,
      headers: result.headers,
      preview: result.rows.slice(0, 5),
      totalRows: result.rows.length,
      autoMappings: Object.fromEntries(autoMappings),
      sheetNames: result.sheetNames,
    })
  } catch (e) {
    console.error('Import error:', e)
    return c.json(apiError('Gagal memproses file', e), 500)
  }
})

// PUT /api/import-excel — preview with custom mappings
router.put('/', async (c) => {
  try {
    const { rows, mappings } = await c.req.json()
    const config = {
      mappings: Object.entries(mappings).map(([excelColumn, employeeField]) => ({
        excelColumn, employeeField: employeeField as string,
      })),
      defaultValues: { pph21Status: 'TK/0' as Pph21Status, isActive: true },
    }
    const preview = generateImportPreview(rows, config)
    return c.json({
      success: true,
      preview: preview.slice(0, 10),
      totalValid: preview.filter(p => p.valid).length,
      totalInvalid: preview.filter(p => !p.valid).length,
    })
  } catch (e) {
    console.error('Preview error:', e)
    return c.json(apiError('Gagal membuat preview', e), 500)
  }
})

// POST /api/import-excel/commit
router.post('/commit', async (c) => {
  const cid = c.get('companyId')
  try {
    const body = await c.req.json()
    const parsed = parse(CommitSchema, body)
    if (!parsed.ok) return c.json({ error: parsed.error }, 400)

    const { rows, mappings, defaultValues, skipInvalid } = parsed.data
    const config = {
      mappings: Object.entries(mappings).map(([excelColumn, employeeField]) => ({ excelColumn, employeeField: employeeField as string })),
      defaultValues: {
        pph21Status: (defaultValues?.pph21Status ?? 'TK/0') as Pph21Status,
        isActive: true,
        ...(defaultValues?.department ? { department: defaultValues.department } : {}),
      },
    }

    const preview = generateImportPreview(rows as Parameters<typeof generateImportPreview>[0], config)
    const invalid = preview.filter(p => !p.valid)
    if (invalid.length > 0 && !skipInvalid) {
      return c.json({ error: `${invalid.length} baris tidak valid. Perbaiki data atau gunakan skipInvalid: true` }, 422)
    }

    const validRows = preview.filter(p => p.valid).map(p => p.data)
    const created = await prisma.$transaction(
      validRows.map(row =>
        prisma.employee.create({
          data: {
            companyId: cid,
            employeeId: String(row.employeeId ?? ''),
            name: String(row.name ?? ''),
            email: row.email ? String(row.email) : null,
            whatsappNumber: row.whatsappNumber ? String(row.whatsappNumber) : null,
            department: row.department ? String(row.department) : null,
            position: row.position ? String(row.position) : null,
            site: row.site ? String(row.site) : null,
            npwp: row.npwp ? String(row.npwp) : null,
            bankAccount: row.bankAccount ? String(row.bankAccount) : null,
            bankName: row.bankName ? String(row.bankName) : null,
            baseSalary: Number(row.baseSalary ?? 0),
            hourlyRate: row.hourlyRate != null ? Number(row.hourlyRate) : null,
            pph21Status: (row.pph21Status as Pph21Status) ?? 'TK/0',
            isActive: true,
          },
        })
      )
    )

    const errors = invalid.map(p => ({ row: preview.indexOf(p), errors: p.errors }))
    return c.json({ success: true, created: created.length, skipped: invalid.length, errors: skipInvalid ? errors : [] }, 201)
  } catch (e) {
    console.error('Import commit error:', e)
    return c.json(apiError('Gagal menyimpan data karyawan', e), 500)
  }
})

export default router
