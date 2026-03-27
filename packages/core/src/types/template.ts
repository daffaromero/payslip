export interface TemplateLayout {
  orientation: 'portrait' | 'landscape'
  pageSize: 'A4' | 'letter'
  columns: 1 | 2
}

export interface TemplateTheme {
  primaryColor: string
  secondaryColor: string
  fontFamily: 'inter' | 'roboto' | 'open-sans'
  fontSize: 'small' | 'medium' | 'large'
}

export interface TemplateSections {
  companyHeader: boolean
  employeeInfo: boolean
  earnings: boolean
  deductions: boolean
  netPay: boolean
  ytdSummary: boolean
  bankDetails: boolean
  notes: boolean
  signature: boolean
}

export interface TemplateHeader {
  showLogo: boolean
  logoUrl?: string
  companyName: string
  companyAddress?: string
  companyTaxId?: string
  companyPhone?: string
  companyEmail?: string
}

export interface CustomField {
  id: string
  label: string
  key: string
  type: 'text' | 'number' | 'date'
  section: 'header' | 'earnings' | 'deductions' | 'footer'
}

export interface Template {
  id: string
  companyId: string
  name: string
  type: 'preset' | 'custom'
  isDefault: boolean
  layout: TemplateLayout
  theme: TemplateTheme
  sections: TemplateSections
  header: TemplateHeader
  customFields: CustomField[]
  customCss?: string
  language: 'id' | 'en'
}
