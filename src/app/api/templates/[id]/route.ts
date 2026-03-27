import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { apiOk, apiError } from '@/lib/api/respond'
import { parseData } from '@/lib/api/validate'
import { TemplatePatchSchema } from '@/lib/api/schemas/template'
import { deserializeTemplate, serializeTemplate } from '@/lib/api/template-serializer'
import type { TemplateLayout, TemplateTheme, TemplateSections, TemplateHeader, CustomField } from '@/types'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const { id } = await params
    const template = await prisma.template.findFirst({ where: { id, companyId: cid } })
    if (!template) return apiError('Template tidak ditemukan', 404)
    return apiOk({ template: deserializeTemplate(template as Parameters<typeof deserializeTemplate>[0]) })
  } catch (error) {
    console.error('Error fetching template:', error)
    return apiError('Gagal memuat template')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const { id } = await params

    const existing = await prisma.template.findFirst({ where: { id, companyId: cid } })
    if (!existing) return apiError('Template tidak ditemukan', 404)

    const body = await req.json()
    const parsed = parseData(TemplatePatchSchema, body)
    if (!parsed.ok) return parsed.response

    const patch = parsed.data
    const current = deserializeTemplate(existing as Parameters<typeof deserializeTemplate>[0])
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

    return apiOk({ template: deserializeTemplate(template as Parameters<typeof deserializeTemplate>[0]) })
  } catch (error) {
    console.error('Error updating template:', error)
    return apiError('Gagal memperbarui template')
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const { id } = await params

    const existing = await prisma.template.findFirst({ where: { id, companyId: cid } })
    if (!existing) return apiError('Template tidak ditemukan', 404)

    const payslipCount = await prisma.payslip.count({ where: { templateId: id, companyId: cid } })
    if (payslipCount > 0) {
      return apiError(`Template sedang digunakan oleh ${payslipCount} slip gaji dan tidak dapat dihapus`, 409)
    }

    await prisma.template.delete({ where: { id } })
    return apiOk({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return apiError('Gagal menghapus template')
  }
}
