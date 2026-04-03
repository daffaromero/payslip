import { apiError } from '../lib/api-error'
import { Hono } from 'hono'
import { prisma } from '@/lib/db'
import {
  TemplateCreateSchema,
  TemplatePatchSchema,
} from '@/lib/api/schemas/template'
import {
  deserializeTemplate,
  serializeTemplate,
  type RawTemplate,
} from '@/lib/api/template-serializer'
import type {
  TemplateLayout,
  TemplateTheme,
  TemplateSections,
  TemplateHeader,
  CustomField,
} from '@/types'
import { generatePayslipHTML } from '@/lib/pdf/generator'
import { parse } from '../lib/validate'
import { requireAdmin } from '../middleware/admin'
import type { Env } from '../types'

const router = new Hono<Env>()
router.on(['POST', 'PATCH', 'PUT', 'DELETE'], '*', requireAdmin)

const SAMPLE_COMPANY = {
  id: 'preview', name: 'PT Contoh Indonesia',
  address: 'Jl. Sudirman No. 1, Jakarta Pusat 10220',
  taxId: '09.123.456.7-123.000', phone: '(021) 1234-5678',
  email: 'hr@contoh.co.id', logoUrl: null,
  createdAt: new Date(), updatedAt: new Date(),
}
const SAMPLE_EMPLOYEE = {
  id: 'preview', companyId: 'preview', employeeId: 'EMP-001',
  name: 'Budi Santoso', email: 'budi@contoh.co.id',
  department: 'Engineering', position: 'Senior Developer',
  npwp: '09.234.567.8-012.000', bankAccount: '1234567890',
  bankName: 'BCA', baseSalary: 12000000, hourlyRate: 75000,
  pph21Status: 'K/1', isActive: true,
  joinedAt: new Date('2020-01-01'), createdAt: new Date(), updatedAt: new Date(),
}
const SAMPLE_PAYSLIP = {
  id: 'preview', companyId: 'preview', employeeId: 'preview', templateId: 'preview',
  periodType: 'monthly' as const,
  startDate: new Date('2026-03-01'), endDate: new Date('2026-03-31'),
  basePay: 12000000, overtimeHours: 8, overtimePay: 600000,
  bonus: 0, thr: 0,
  allowances: [{ name: 'Tunjangan Transport', amount: 500000 }, { name: 'Tunjangan Makan', amount: 750000 }],
  pph21: 1250000, bpjsKesehatan: 240000, bpjsKetenagakerjaan: 180000,
  otherDeductions: [], grossPay: 13850000, totalDeductions: 1670000, netPay: 12180000,
  ytdGross: 41550000, ytdPph21: 3750000,
  notes: 'Slip gaji ini diterbitkan secara elektronik dan sah tanpa tanda tangan basah.',
  generatedAt: new Date(), pdfUrl: null,
}

router.get('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const templates = await prisma.template.findMany({
      where: { companyId: cid },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
    return c.json({ templates: templates.map(t => deserializeTemplate(t as unknown as RawTemplate)) })
  } catch (e) {
    console.error('Error fetching templates:', e)
    return c.json(apiError('Gagal memuat template', e), 500)
  }
})

router.post('/', async (c) => {
  const cid = c.get('companyId')
  try {
    const body = await c.req.json()
    const parsed = parse(TemplateCreateSchema, body)
    if (!parsed.ok) return c.json({ error: parsed.error }, 400)

    const { name, type, isDefault, layout, theme, sections, header, customFields, customCss, language } = parsed.data
    const serialized = serializeTemplate({ layout, theme, sections, header, customFields })

    const template = await prisma.$transaction(async tx => {
      if (isDefault) {
        await tx.template.updateMany({ where: { companyId: cid, isDefault: true }, data: { isDefault: false } })
      }
      return tx.template.create({
        data: { companyId: cid, name, type, isDefault, ...serialized, customCss: customCss ?? null, language },
      })
    })

    return c.json({ template: deserializeTemplate(template as unknown as RawTemplate) }, 201)
  } catch (e) {
    console.error('Error creating template:', e)
    return c.json(apiError('Gagal membuat template', e), 500)
  }
})

router.get('/:id', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const template = await prisma.template.findFirst({ where: { id, companyId: cid } })
    if (!template) return c.json({ error: 'Template tidak ditemukan' }, 404)
    return c.json({ template: deserializeTemplate(template as unknown as RawTemplate) })
  } catch (e) {
    console.error('Error fetching template:', e)
    return c.json(apiError('Gagal memuat template', e), 500)
  }
})

router.patch('/:id', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const existing = await prisma.template.findFirst({ where: { id, companyId: cid } })
    if (!existing) return c.json({ error: 'Template tidak ditemukan' }, 404)

    const body = await c.req.json()
    const parsed = parse(TemplatePatchSchema, body)
    if (!parsed.ok) return c.json({ error: parsed.error }, 400)

    const patch = parsed.data
    const current = deserializeTemplate(existing as unknown as RawTemplate)
    const merged = serializeTemplate({
      layout: (patch.layout ?? current.layout) as TemplateLayout,
      theme: (patch.theme ?? current.theme) as TemplateTheme,
      sections: (patch.sections ?? current.sections) as TemplateSections,
      header: (patch.header ?? current.header) as TemplateHeader,
      customFields: (patch.customFields ?? current.customFields) as CustomField[],
    })

    const template = await prisma.$transaction(async tx => {
      if (patch.isDefault === true) {
        await tx.template.updateMany({ where: { companyId: cid, isDefault: true, id: { not: id } }, data: { isDefault: false } })
      }
      return tx.template.update({
        where: { id },
        data: {
          ...(patch.name != null ? { name: patch.name } : {}),
          ...(patch.type != null ? { type: patch.type } : {}),
          ...(patch.isDefault != null ? { isDefault: patch.isDefault } : {}),
          ...(patch.customCss !== undefined ? { customCss: patch.customCss } : {}),
          ...(patch.language != null ? { language: patch.language } : {}),
          ...merged,
        },
      })
    })

    return c.json({ template: deserializeTemplate(template as unknown as RawTemplate) })
  } catch (e) {
    console.error('Error updating template:', e)
    return c.json(apiError('Gagal memperbarui template', e), 500)
  }
})

router.delete('/:id', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const existing = await prisma.template.findFirst({ where: { id, companyId: cid } })
    if (!existing) return c.json({ error: 'Template tidak ditemukan' }, 404)

    const payslipCount = await prisma.payslip.count({ where: { templateId: id, companyId: cid } })
    if (payslipCount > 0) {
      return c.json({ error: `Template sedang digunakan oleh ${payslipCount} slip gaji dan tidak dapat dihapus` }, 409)
    }

    await prisma.template.delete({ where: { id } })
    return c.json({ success: true })
  } catch (e) {
    console.error('Error deleting template:', e)
    return c.json(apiError('Gagal menghapus template', e), 500)
  }
})

router.get('/:id/preview', async (c) => {
  const cid = c.get('companyId')
  try {
    const id = c.req.param('id')
    const raw = await prisma.template.findFirst({ where: { id, companyId: cid } })
    if (!raw) return c.json({ error: 'Template not found' }, 404)

    const template = deserializeTemplate(raw as unknown as RawTemplate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = generatePayslipHTML({ payslip: SAMPLE_PAYSLIP as any, employee: SAMPLE_EMPLOYEE as any, template: template as any, company: SAMPLE_COMPANY as any })
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (e) {
    console.error(e)
    return c.json(apiError('Preview failed', e), 500)
  }
})

export default router
