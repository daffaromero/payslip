import puppeteer from 'puppeteer'
import { PayslipData, Employee, Template, Company } from '@/types'

export const escapeHtml = (str: string | null | undefined): string => {
  if (!str) return ''
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c] || c))
}

export interface GeneratePdfOptions {
  payslip: PayslipData
  employee: Employee
  template: Template
  company: Company
}

export async function generatePayslipPDF(options: GeneratePdfOptions): Promise<Buffer> {
  const { payslip, employee, template, company } = options

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  try {
    const page = await browser.newPage()
    const baseUrl = process.env.PDF_BASE_URL || 'http://localhost:3000'
    let html = generatePayslipHTML({ payslip, employee, template, company })
    html = html.replace('<head>', `<head><base href="${baseUrl}">`)
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({
      format: template.layout.pageSize === 'letter' ? 'Letter' : 'A4',
      landscape: template.layout.orientation === 'landscape',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

export function generatePayslipHTML(options: GeneratePdfOptions): string {
  const { payslip, employee, template, company } = options
  const isIndonesian = template.language === 'id'

  const t = (id: string, en: string) => isIndonesian ? id : en

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(isIndonesian ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(isIndonesian ? 'id-ID' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date(date))

  const formatMonth = (date: Date) =>
    new Intl.DateTimeFormat(isIndonesian ? 'id-ID' : 'en-US', {
      year: 'numeric', month: 'long',
    }).format(new Date(date))

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: ${template.theme.fontFamily === 'roboto' ? 'Roboto, sans-serif' : template.theme.fontFamily === 'open-sans' ? '"Open Sans", sans-serif' : 'Inter, system-ui, sans-serif'};
      font-size: ${template.theme.fontSize === 'small' ? '11px' : template.theme.fontSize === 'large' ? '15px' : '13px'};
      line-height: 1.5;
      color: #222;
    }

    .payslip {
      max-width: 780px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .header {
      padding-bottom: 10px;
      border-bottom: 2px solid ${template.theme.primaryColor};
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: 140px 1fr 140px;
      align-items: center;
    }
    .header-logo {
      width: 140px;
    }
    .header-logo img {
      max-height: 100px;
      max-width: 140px;
      width: 100%;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .header-info {
      text-align: center;
    }
    .header-spacer {
      width: 140px;
    }
    .company-name {
      font-size: 26px;
      font-weight: 700;
      color: ${template.theme.primaryColor};
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .company-info {
      font-size: 11px;
      color: #666;
      margin-top: 1px;
    }
    .company-address {
      max-width: 320px;
      margin-left: auto;
      margin-right: auto;
    }
    .payslip-title {
      margin-top: 6px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${template.theme.primaryColor};
    }
    .payslip-period {
      font-size: 11px;
      color: #555;
      margin-top: 2px;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: ${template.theme.primaryColor};
      border-bottom: 1px solid ${template.theme.secondaryColor};
      padding-bottom: 4px;
      margin-bottom: 10px;
    }

    /* ── Employee info ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 30px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .info-label { color: #666; font-size: 12px; }
    .info-value { font-weight: 500; text-align: right; font-size: 12px; }

    /* ── Earnings / Deductions ── */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 18px;
    }
    .amount-table {
      width: 100%;
      border-collapse: collapse;
    }
    .amount-table th {
      text-align: left;
      padding: 6px 4px;
      color: ${template.theme.secondaryColor};
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border-bottom: 1px solid #ddd;
    }
    .amount-table td {
      text-align: left;
      padding: 6px 4px;
      border-bottom: 1px solid #f0f0f0;
    }
    .amount-table td.amount {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .total-row td {
      font-weight: 700;
      border-top: 2px solid ${template.theme.primaryColor};
      border-bottom: none;
      padding-top: 8px;
    }

    /* ── Net Pay ── */
    .net-pay-box {
      background: ${template.theme.primaryColor};
      color: white;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .net-pay-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .net-pay-amount {
      font-size: 20px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    /* ── Footer rows ── */
    .footer-row {
      font-size: 11px;
      color: #555;
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
    }

    /* ── Signature ── */
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
    }
    .signature-block {
      text-align: center;
      width: 160px;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      margin-bottom: 6px;
      height: 40px;
    }
    .signature-label {
      font-size: 11px;
      color: #444;
    }

    ${template.customCss || ''}
  </style>
</head>
<body>
<div class="payslip">

  ${template.sections.companyHeader ? `
  <div class="header">
    ${company.logoUrl ? `<div class="header-logo"><img src="${escapeHtml(company.logoUrl)}" alt="Logo"></div>` : '<div class="header-logo"></div>'}
    <div class="header-info">
      <div class="company-name">${escapeHtml(company.name)}</div>
      ${company.address ? `<div class="company-info company-address">${escapeHtml(company.address)}</div>` : ''}
      ${company.phone ? `<div class="company-info">Telp: ${escapeHtml(company.phone)}</div>` : ''}
      ${company.email ? `<div class="company-info">Email: ${escapeHtml(company.email)}</div>` : ''}
      ${company.taxId ? `<div class="company-info">NPWP: ${escapeHtml(company.taxId)}</div>` : ''}
      <div class="payslip-title">${t('Slip Gaji Karyawan', 'Employee Payslip')}</div>
      <div class="payslip-period">${t('Periode', 'Period')}: ${formatMonth(payslip.startDate)}</div>
    </div>
    <div class="header-spacer"></div>
  </div>
  ` : ''}

  ${template.sections.employeeInfo ? `
  <div class="section">
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
      <span>${t('Informasi Karyawan', 'Employee Information')}</span>
      ${employee.site ? `<span style="font-weight:700;letter-spacing:0;">${t('Site', 'Site')}: ${escapeHtml(employee.site)}</span>` : ''}
    </div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">${t('Nama', 'Name')}</span><span class="info-value">${escapeHtml(employee.name)}</span></div>
      <div class="info-row"><span class="info-label">${t('ID Karyawan', 'Employee ID')}</span><span class="info-value">${escapeHtml(employee.employeeId)}</span></div>
      <div class="info-row"><span class="info-label">${t('Divisi', 'Division')}</span><span class="info-value">${escapeHtml(employee.department) || '—'}</span></div>
      <div class="info-row"><span class="info-label">${t('Jabatan', 'Position')}</span><span class="info-value">${escapeHtml(employee.position) || '—'}</span></div>
      <div class="info-row"><span class="info-label">NPWP</span><span class="info-value">${escapeHtml(employee.npwp) || '—'}</span></div>
      <div class="info-row"><span class="info-label">${t('Status PTKP', 'Tax Status')}</span><span class="info-value">${escapeHtml(employee.pph21Status)}</span></div>
    </div>
  </div>
  ` : ''}

  <div class="two-columns">
    ${template.sections.earnings ? `
    <div class="section">
      <div class="section-title">${t('Penerimaan', 'Earnings')}</div>
      <table class="amount-table">
        <tr><td>${t('Gaji Pokok', 'Base Salary')}</td><td class="amount">${formatCurrency(payslip.basePay)}</td></tr>
        ${payslip.overtimePay > 0 ? `<tr><td>${t('Lembur', 'Overtime')}</td><td class="amount">${formatCurrency(payslip.overtimePay)}</td></tr>` : ''}
        ${payslip.bonus > 0 ? `<tr><td>${t('Bonus', 'Bonus')}</td><td class="amount">${formatCurrency(payslip.bonus)}</td></tr>` : ''}
        ${payslip.thr > 0 ? `<tr><td>THR</td><td class="amount">${formatCurrency(payslip.thr)}</td></tr>` : ''}
        ${(() => {
          const salaryComps = (payslip.allowances || []).filter(a => a.component && a.component !== 'custom')
          const customAllows = (payslip.allowances || []).filter(a => a.component === 'custom')
          return [
            ...salaryComps.map(a => `<tr><td>${escapeHtml(a.name)}</td><td class="amount">${formatCurrency(a.amount)}</td></tr>`),
            ...(customAllows.length > 0 ? [`<tr style="background:#f9f9f9"><td colspan="2" style="font-size:10px;font-weight:600;color:#888;padding-top:10px;">${t('Tunjangan Lain', 'Other Allowances')}</td></tr>`] : []),
            ...customAllows.map(a => `<tr><td>${escapeHtml(a.name)}</td><td class="amount">${formatCurrency(a.amount)}</td></tr>`),
          ].join('')
        })()}
        <tr class="total-row"><td>${t('Total Penerimaan', 'Total Earnings')}</td><td class="amount">${formatCurrency(payslip.grossPay)}</td></tr>
      </table>
    </div>
    ` : ''}

    ${template.sections.deductions ? `
    <div class="section">
      <div class="section-title">${t('Potongan', 'Deductions')}</div>
      <table class="amount-table">
        ${payslip.pph21 > 0 ? `<tr><td>PPh 21</td><td class="amount">${formatCurrency(payslip.pph21)}</td></tr>` : ''}
        ${payslip.bpjsKesehatan > 0 ? `<tr><td>BPJS Kesehatan</td><td class="amount">${formatCurrency(payslip.bpjsKesehatan)}</td></tr>` : ''}
        ${payslip.bpjsTkJht > 0 ? `<tr><td>BPJS TK JHT</td><td class="amount">${formatCurrency(payslip.bpjsTkJht)}</td></tr>` : ''}
        ${payslip.bpjsTkJp > 0 ? `<tr><td>BPJS TK JP</td><td class="amount">${formatCurrency(payslip.bpjsTkJp)}</td></tr>` : ''}
        ${(payslip.otherDeductions || []).map(d => `<tr><td>${escapeHtml(d.name)}</td><td class="amount">${formatCurrency(d.amount)}</td></tr>`).join('')}
        <tr class="total-row"><td>${t('Total Potongan', 'Total Deductions')}</td><td class="amount">${formatCurrency(payslip.totalDeductions)}</td></tr>
      </table>
    </div>
    ` : ''}
  </div>

  ${template.sections.netPay ? `
  <div class="net-pay-box">
    <span class="net-pay-label">${t('Gaji Bersih (Take Home Pay)', 'Net Pay (Take Home Pay)')}</span>
    <span class="net-pay-amount">${formatCurrency(payslip.netPay)}</span>
  </div>
  ` : ''}

  ${template.sections.bankDetails && employee.bankAccount ? `
  <div class="footer-row">
    <span>${t('Informasi Bank', 'Bank Information')}</span>
    <span>${escapeHtml(employee.bankName) || ''} — ${escapeHtml(employee.bankAccount)}</span>
  </div>
  ` : ''}

  ${template.sections.ytdSummary ? `
  <div class="footer-row">
    <span>${t('YTD Penerimaan Kotor', 'YTD Gross')}</span>
    <span>${formatCurrency(payslip.ytdGross)}</span>
  </div>
  <div class="footer-row">
    <span>${t('YTD PPh 21', 'YTD Income Tax')}</span>
    <span>${formatCurrency(payslip.ytdPph21)}</span>
  </div>
  ` : ''}

  ${template.sections.notes && payslip.notes ? `
  <div class="section" style="margin-top:14px;">
    <div class="section-title">${t('Catatan', 'Notes')}</div>
    <p style="font-size:11px;color:#555;">${escapeHtml(payslip.notes)}</p>
  </div>
  ` : ''}

  ${template.sections.signature ? `
  <div class="signature-row">
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">${t('Karyawan', 'Employee')}</div>
      <div class="signature-label" style="margin-top:2px;color:#999;">${escapeHtml(employee.name)}</div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">${t('HRD / Keuangan', 'HR / Finance')}</div>
    </div>
  </div>
  ` : ''}

</div>
</body>
</html>`
}

export function generateBulkPDFZip(payslips: GeneratePdfOptions[]): Promise<Buffer> {
  throw new Error('Bulk PDF ZIP not yet implemented')
}
