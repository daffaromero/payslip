import type { TemplateLayout, TemplateTheme, TemplateSections, TemplateHeader, CustomField } from '@/types'

export interface RawTemplate {
  id: string
  companyId: string
  name: string
  type: string
  isDefault: boolean
  layout: string
  theme: string
  sections: string
  header: string
  customFields: string | null
  customCss: string | null
  language: string
  createdAt: Date
  updatedAt: Date
}

export interface DeserializedTemplate extends Omit<RawTemplate, 'layout' | 'theme' | 'sections' | 'header' | 'customFields'> {
  layout: TemplateLayout
  theme: TemplateTheme
  sections: TemplateSections
  header: TemplateHeader
  customFields: CustomField[]
}

export function deserializeTemplate(raw: RawTemplate): DeserializedTemplate {
  return {
    ...raw,
    layout: JSON.parse(raw.layout) as TemplateLayout,
    theme: JSON.parse(raw.theme) as TemplateTheme,
    sections: JSON.parse(raw.sections) as TemplateSections,
    header: JSON.parse(raw.header) as TemplateHeader,
    customFields: raw.customFields ? (JSON.parse(raw.customFields) as CustomField[]) : [],
  }
}

interface TemplateJsonFields {
  layout: TemplateLayout
  theme: TemplateTheme
  sections: TemplateSections
  header: TemplateHeader
  customFields?: CustomField[]
}

interface SerializedTemplateFields {
  layout: string
  theme: string
  sections: string
  header: string
  customFields: string
}

export function serializeTemplate(fields: TemplateJsonFields): SerializedTemplateFields {
  return {
    layout: JSON.stringify(fields.layout),
    theme: JSON.stringify(fields.theme),
    sections: JSON.stringify(fields.sections),
    header: JSON.stringify(fields.header),
    customFields: JSON.stringify(fields.customFields ?? []),
  }
}
