import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: false })
console.log('Using database URL:', process.env.DATABASE_URL || 'file:./dev.db')

const prisma = new PrismaClient()
const j = JSON.stringify

const COMPANY_HEADER = {
  showLogo: false,
  companyName: 'PT Contoh Indonesia',
  companyAddress: 'Jl. Sudirman No. 1, Jakarta Pusat 10220',
  companyTaxId: '09.123.456.7-123.000',
  companyPhone: '(021) 1234-5678',
  companyEmail: 'hr@contoh.co.id',
}

const LAYOUT_A4 = { orientation: 'portrait', pageSize: 'A4', columns: 1 }

async function main() {
  await prisma.payslip.deleteMany()
  await prisma.template.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.company.deleteMany()

  const company = await prisma.company.create({
    data: {
      name: 'PT Contoh Indonesia',
      address: 'Jl. Sudirman No. 1, Jakarta Pusat 10220',
      taxId: '09.123.456.7-123.000',
      phone: '(021) 1234-5678',
      email: 'hr@contoh.co.id',
    },
  })

  // ── 1. Formal Klasik ─────────────────────────────────────────────────────
  await prisma.template.create({ data: {
    companyId: company.id,
    name: 'Formal Klasik',
    type: 'preset', isDefault: true, language: 'id',
    layout: j(LAYOUT_A4),
    theme: j({ primaryColor: '#1a365d', secondaryColor: '#2b6cb0', fontFamily: 'inter', fontSize: 'medium' }),
    sections: j({ companyHeader: true, employeeInfo: true, earnings: true, deductions: true, netPay: true, ytdSummary: true, bankDetails: true, notes: true, signature: false }),
    header: j(COMPANY_HEADER),
    customFields: j([]),
    customCss: `
      .header { border: 2px solid #1a365d; padding: 16px; }
      .section-title { background: #1a365d; color: white; padding: 5px 10px; border-bottom: none; margin-bottom: 8px; }
      .amount-table th { background: #2c5282; color: white; padding: 7px 10px; }
      .amount-table td, .amount-table th { border: 1px solid #bee3f8; padding: 6px 10px; }
      .amount-table tr:nth-child(even) td { background: #ebf8ff; }
      .total-row td { background: #dbeafe !important; border-top: 2px solid #1a365d !important; }
      .net-pay-box { border-radius: 0; }
      .info-row { border-bottom: 1px solid #e2e8f0; padding: 4px 0; }
    `,
  }})

  // ── 2. Korporat ───────────────────────────────────────────────────────────
  await prisma.template.create({ data: {
    companyId: company.id,
    name: 'Korporat',
    type: 'preset', isDefault: false, language: 'id',
    layout: j(LAYOUT_A4),
    theme: j({ primaryColor: '#1f2937', secondaryColor: '#6b7280', fontFamily: 'inter', fontSize: 'medium' }),
    sections: j({ companyHeader: true, employeeInfo: true, earnings: true, deductions: true, netPay: true, ytdSummary: false, bankDetails: true, notes: false, signature: false }),
    header: j(COMPANY_HEADER),
    customFields: j([]),
    customCss: `
      .header { text-align: left; border-bottom: 3px solid #1f2937; padding-bottom: 14px; }
      .payslip-title { text-align: left; }
      .payslip-period { text-align: left; }
      .section-title { letter-spacing: 0.1em; border-bottom: 2px solid #d1d5db; color: #374151; }
      .amount-table td { border-bottom: 1px solid #e5e7eb; padding: 7px 4px; }
      .amount-table th { color: #374151; font-size: 10px; }
      .total-row td { background: #f9fafb; }
      .net-pay-box { border-radius: 2px; letter-spacing: 0.02em; }
      .info-label { color: #6b7280; }
    `,
  }})

  // ── 3. Minimalis ──────────────────────────────────────────────────────────
  await prisma.template.create({ data: {
    companyId: company.id,
    name: 'Minimalis',
    type: 'preset', isDefault: false, language: 'id',
    layout: j(LAYOUT_A4),
    theme: j({ primaryColor: '#111827', secondaryColor: '#9ca3af', fontFamily: 'inter', fontSize: 'small' }),
    sections: j({ companyHeader: true, employeeInfo: true, earnings: true, deductions: true, netPay: true, ytdSummary: false, bankDetails: true, notes: false, signature: false }),
    header: j({ showLogo: false, companyName: 'PT Contoh Indonesia', companyAddress: 'Jl. Sudirman No. 1, Jakarta Pusat 10220', companyPhone: '(021) 1234-5678' }),
    customFields: j([]),
    customCss: `
      .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 14px; }
      .company-name { font-size: 15px; letter-spacing: 0.04em; }
      .payslip-title { font-size: 11px; font-weight: 400; color: #9ca3af; letter-spacing: 0.15em; margin-top: 10px; }
      .payslip-period { color: #6b7280; }
      .section-title { font-weight: 400; color: #9ca3af; border-bottom: 1px solid #f3f4f6; }
      .amount-table td { padding: 7px 0; border-bottom: 1px solid #f9fafb; }
      .amount-table th { border-bottom: 1px solid #e5e7eb; color: #9ca3af; }
      .total-row td { border-top: 1px solid #d1d5db !important; border-bottom: none; background: none; }
      .net-pay-box { background: #111827; padding: 16px 20px; }
      .net-pay-amount { font-size: 18px; }
      .info-row { padding: 3px 0; }
      .info-label { color: #9ca3af; }
    `,
  }})

  // ── 4. Hijau Profesional ──────────────────────────────────────────────────
  await prisma.template.create({ data: {
    companyId: company.id,
    name: 'Hijau Profesional',
    type: 'preset', isDefault: false, language: 'id',
    layout: j(LAYOUT_A4),
    theme: j({ primaryColor: '#065f46', secondaryColor: '#059669', fontFamily: 'inter', fontSize: 'medium' }),
    sections: j({ companyHeader: true, employeeInfo: true, earnings: true, deductions: true, netPay: true, ytdSummary: true, bankDetails: true, notes: true, signature: true }),
    header: j(COMPANY_HEADER),
    customFields: j([]),
    customCss: `
      .header { border-bottom: 3px solid #065f46; padding-bottom: 12px; }
      .section-title { color: #065f46; background: #f0fdf4; padding: 5px 10px; border-bottom: none; border-left: 4px solid #059669; }
      .amount-table th { background: #065f46; color: white; padding: 7px 10px; border: none; }
      .amount-table td { border-bottom: 1px solid #d1fae5; padding: 6px 10px; }
      .amount-table tr:nth-child(even) td { background: #f0fdf4; }
      .total-row td { background: #dcfce7 !important; border-top: 2px solid #065f46 !important; font-weight: 700; }
      .net-pay-box { border-radius: 4px; }
      .footer-row { border-bottom: 1px solid #d1fae5; }
      .info-label { color: #6b7280; }
      .info-row { padding: 3px 0; }
    `,
  }})

  // ── 5. Resmi Bertanda Tangan ───────────────────────────────────────────────
  await prisma.template.create({ data: {
    companyId: company.id,
    name: 'Resmi Bertanda Tangan',
    type: 'preset', isDefault: false, language: 'id',
    layout: j(LAYOUT_A4),
    theme: j({ primaryColor: '#7f1d1d', secondaryColor: '#b91c1c', fontFamily: 'inter', fontSize: 'medium' }),
    sections: j({ companyHeader: true, employeeInfo: true, earnings: true, deductions: true, netPay: true, ytdSummary: false, bankDetails: true, notes: true, signature: true }),
    header: j(COMPANY_HEADER),
    customFields: j([]),
    customCss: `
      .payslip { border: 2px solid #7f1d1d; padding: 0; }
      .header { background: #7f1d1d; padding: 20px 24px; border-bottom: none; margin-bottom: 0; }
      .company-name { color: white; }
      .company-info { color: #fca5a5; }
      .payslip-title { color: white; border-top: 1px solid rgba(255,255,255,0.3); margin-top: 12px; padding-top: 10px; }
      .payslip-period { color: #fca5a5; }
      .section { padding: 0 20px; }
      .section-title { color: #7f1d1d; background: #fff1f2; padding: 5px 10px; border-left: 3px solid #7f1d1d; border-bottom: none; margin: 0 -20px 10px -20px; }
      .amount-table th { background: #7f1d1d; color: white; padding: 6px 10px; }
      .amount-table td { border-bottom: 1px solid #fecdd3; padding: 6px 10px; }
      .total-row td { background: #fff1f2 !important; border-top: 2px solid #7f1d1d !important; }
      .net-pay-box { margin: 0; border-radius: 0; }
      .footer-row { padding: 6px 20px; margin: 0; }
      .signature-row { padding: 0 20px 20px; margin-top: 30px; }
      .signature-line { border-bottom: 1px solid #7f1d1d; }
    `,
  }})

  console.log('✓ Seeded 5 preset templates')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
