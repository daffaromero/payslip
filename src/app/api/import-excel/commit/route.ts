import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { generateImportPreview } from '@/lib/excel/mapper'
import { apiOk, apiError } from '@/lib/api/respond'
import { parseData, z } from '@/lib/api/validate'
import type { Pph21Status } from '@/types'

const CommitSchema = z.object({
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
  mappings: z.record(z.string(), z.string()),
  defaultValues: z
    .object({
      pph21Status: z.string().optional(),
      department: z.string().optional(),
    })
    .optional(),
  skipInvalid: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = parseData(CommitSchema, body)
    if (!parsed.ok) return parsed.response

    const { rows, mappings, defaultValues, skipInvalid } = parsed.data

    const config = {
      mappings: Object.entries(mappings).map(([excelColumn, employeeField]) => ({
        excelColumn,
        employeeField: employeeField as string,
      })),
      defaultValues: {
        pph21Status: (defaultValues?.pph21Status ?? 'TK/0') as Pph21Status,
        isActive: true,
        ...(defaultValues?.department ? { department: defaultValues.department } : {}),
      },
    }

    const preview = generateImportPreview(rows as Parameters<typeof generateImportPreview>[0], config)

    const invalid = preview.filter(p => !p.valid)
    if (invalid.length > 0 && !skipInvalid) {
      return apiError(
        `${invalid.length} baris tidak valid. Perbaiki data atau gunakan skipInvalid: true`,
        422
      )
    }

    const validRows = preview.filter(p => p.valid).map(p => p.data)

    // Get or create default company
    let company = await prisma.company.findFirst()
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'PT Contoh Indonesia',
          address: 'Jl. Sudirman No. 1, Jakarta',
          taxId: '09.123.456.7-123.000',
        },
      })
    }

    const created = await prisma.$transaction(
      validRows.map(row =>
        prisma.employee.create({
          data: {
            companyId: company.id,
            employeeId: String(row.employeeId ?? ''),
            name: String(row.name ?? ''),
            email: row.email ? String(row.email) : null,
            department: row.department ? String(row.department) : null,
            position: row.position ? String(row.position) : null,
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

    const errors = invalid.map((p, i) => ({
      row: preview.indexOf(p),
      errors: p.errors,
    }))

    return apiOk(
      {
        success: true,
        created: created.length,
        skipped: invalid.length,
        errors: skipInvalid ? errors : [],
      },
      201
    )
  } catch (error) {
    console.error('Import commit error:', error)
    return apiError('Gagal menyimpan data karyawan')
  }
}
