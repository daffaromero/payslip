import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { apiOk, apiError } from '@/lib/api/respond'
import { parseData } from '@/lib/api/validate'
import { TemplateCreateSchema } from '@/lib/api/schemas/template'
import { deserializeTemplate, serializeTemplate } from '@/lib/api/template-serializer'

export async function GET(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const templates = await prisma.template.findMany({
      where: { companyId: cid },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
    return NextResponse.json({ templates: templates.map(t => deserializeTemplate(t as Parameters<typeof deserializeTemplate>[0])) })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Gagal memuat template' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  try {
    const body = await req.json()
    const parsed = parseData(TemplateCreateSchema, body)
    if (!parsed.ok) return parsed.response

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

    return apiOk({ template: deserializeTemplate(template as Parameters<typeof deserializeTemplate>[0]) }, 201)
  } catch (error) {
    console.error('Error creating template:', error)
    return apiError('Gagal membuat template')
  }
}
