import { z } from 'zod'

const TemplateLayoutSchema = z.object({
  orientation: z.enum(['portrait', 'landscape']),
  pageSize: z.enum(['A4', 'letter']),
  columns: z.union([z.literal(1), z.literal(2)]),
})

const TemplateThemeSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  fontFamily: z.enum(['inter', 'roboto', 'open-sans']),
  fontSize: z.enum(['small', 'medium', 'large']),
})

const TemplateSectionsSchema = z.object({
  companyHeader: z.boolean(),
  employeeInfo: z.boolean(),
  earnings: z.boolean(),
  deductions: z.boolean(),
  netPay: z.boolean(),
  ytdSummary: z.boolean(),
  bankDetails: z.boolean(),
  notes: z.boolean(),
  signature: z.boolean(),
})

const TemplateHeaderSchema = z.object({
  showLogo: z.boolean(),
  logoUrl: z.string().optional(),
  companyName: z.string(),
  companyAddress: z.string().optional(),
  companyTaxId: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().optional(),
})

const CustomFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  key: z.string(),
  type: z.enum(['text', 'number', 'date']),
  section: z.enum(['header', 'earnings', 'deductions', 'footer']),
})

export const TemplateCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['preset', 'custom']).default('custom'),
  isDefault: z.boolean().default(false),
  layout: TemplateLayoutSchema,
  theme: TemplateThemeSchema,
  sections: TemplateSectionsSchema,
  header: TemplateHeaderSchema,
  customFields: z.array(CustomFieldSchema).default([]),
  customCss: z.string().optional(),
  language: z.enum(['id', 'en']).default('id'),
})

export const TemplatePatchSchema = TemplateCreateSchema.partial()
