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
  
  // Launch puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  
  try {
    const page = await browser.newPage()
    
    // Generate HTML content
    const html = generatePayslipHTML({ payslip, employee, template, company })
    
    // Set content
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    // Generate PDF
    const pdf = await page.pdf({
      format: template.layout.pageSize === 'letter' ? 'Letter' : 'A4',
      landscape: template.layout.orientation === 'landscape',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
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
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isIndonesian ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(isIndonesian ? 'id-ID' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date))
  }
  
  // Calculate totals
  const totalAllowances = payslip.allowances?.reduce((sum, a) => sum + a.amount, 0) || 0
  const totalOtherDeductions = payslip.otherDeductions?.reduce((sum, d) => sum + d.amount, 0) || 0
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${template.theme.fontFamily === 'inter' ? 'Inter, system-ui, sans-serif' : 
                    template.theme.fontFamily === 'roboto' ? 'Roboto, sans-serif' : 
                    'Open Sans, sans-serif'};
      font-size: ${template.theme.fontSize === 'small' ? '12px' : 
                   template.theme.fontSize === 'large' ? '16px' : '14px'};
      line-height: 1.5;
      color: #333;
    }
    
    .payslip {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
    }
    
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid ${template.theme.primaryColor};
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 24px;
      color: ${template.theme.primaryColor};
      margin-bottom: 5px;
    }
    
    .header .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header .company-info {
      font-size: 12px;
      color: #666;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: ${template.theme.primaryColor};
      border-bottom: 1px solid ${template.theme.secondaryColor};
      padding-bottom: 5px;
      margin-bottom: 10px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 30px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
    }
    
    .info-label {
      color: #666;
    }
    
    .info-value {
      font-weight: 500;
    }
    
    .amount-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .amount-table th,
    .amount-table td {
      text-align: left;
      padding: 8px 0;
    }
    
    .amount-table th {
      color: ${template.theme.secondaryColor};
      font-weight: 500;
      border-bottom: 1px solid #ddd;
    }
    
    .amount-table td.amount {
      text-align: right;
      font-family: monospace;
    }
    
    .total-row {
      font-weight: bold;
      border-top: 2px solid ${template.theme.primaryColor};
    }
    
    .net-pay {
      background: ${template.theme.primaryColor};
      color: white;
      padding: 15px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin-top: 20px;
    }
    
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    
    ${template.customCss || ''}
  </style>
</head>
<body>
  <div class="payslip">
    ${template.sections.companyHeader ? `
    <div class="header">
      ${template.header.showLogo && template.header.logoUrl ? 
        `<img src="${template.header.logoUrl}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
      <div class="company-name">${template.header.companyName || company.name}</div>
      ${template.header.companyAddress ? `<div class="company-info">${template.header.companyAddress}</div>` : ''}
      ${template.header.companyTaxId ? `<div class="company-info">NPWP: ${template.header.companyTaxId}</div>` : ''}
    </div>
    ` : ''}
    
    ${template.sections.employeeInfo ? `
    <div class="section">
      <div class="section-title">${t('Informasi Karyawan', 'Employee Information')}</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">${t('Nama', 'Name')}:</span>
          <span class="info-value">${escapeHtml(employee.name)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t('ID Karyawan', 'Employee ID')}:</span>
          <span class="info-value">${escapeHtml(employee.employeeId)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t('Departemen', 'Department')}:</span>
          <span class="info-value">${escapeHtml(employee.department) || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t('Jabatan', 'Position')}:</span>
          <span class="info-value">${escapeHtml(employee.position) || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t('NPWP', 'Tax ID')}:</span>
          <span class="info-value">${escapeHtml(employee.npwp) || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${t('Status PTKP', 'Tax Status')}:</span>
          <span class="info-value">${escapeHtml(employee.pph21Status)}</span>
        </div>
      </div>
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">${t('Periode', 'Period')}</div>
      <div class="info-row">
        <span class="info-label">${t('Periode', 'Period')}:</span>
        <span class="info-value">${formatDate(payslip.startDate)} - ${formatDate(payslip.endDate)}</span>
      </div>
    </div>
    
    <div class="two-columns">
      ${template.sections.earnings ? `
      <div class="section">
        <div class="section-title">${t('PENERIMAAN', 'EARNINGS')}</div>
        <table class="amount-table">
          <tr>
            <td>${t('Gaji Pokok', 'Base Salary')}</td>
            <td class="amount">${formatCurrency(payslip.basePay)}</td>
          </tr>
          ${payslip.overtimePay > 0 ? `
          <tr>
            <td>${t('Lembur', 'Overtime')}</td>
            <td class="amount">${formatCurrency(payslip.overtimePay)}</td>
          </tr>
          ` : ''}
          ${payslip.bonus > 0 ? `
          <tr>
            <td>${t('Bonus', 'Bonus')}</td>
            <td class="amount">${formatCurrency(payslip.bonus)}</td>
          </tr>
          ` : ''}
          ${payslip.thr > 0 ? `
          <tr>
            <td>${t('THR', 'Holiday Bonus')}</td>
            <td class="amount">${formatCurrency(payslip.thr)}</td>
          </tr>
          ` : ''}
          ${payslip.allowances?.map(a => `
          <tr>
            <td>${escapeHtml(a.name)}</td>
            <td class="amount">${formatCurrency(a.amount)}</td>
          </tr>
          `).join('') || ''}
          <tr class="total-row">
            <td><strong>${t('Total Penerimaan', 'Total Earnings')}</strong></td>
            <td class="amount"><strong>${formatCurrency(payslip.grossPay)}</strong></td>
          </tr>
        </table>
      </div>
      ` : ''}
      
      ${template.sections.deductions ? `
      <div class="section">
        <div class="section-title">${t('POTONGAN', 'DEDUCTIONS')}</div>
        <table class="amount-table">
          ${payslip.pph21 > 0 ? `
          <tr>
            <td>${t('PPh 21', 'Income Tax')}</td>
            <td class="amount">${formatCurrency(payslip.pph21)}</td>
          </tr>
          ` : ''}
          ${payslip.bpjsKesehatan > 0 ? `
          <tr>
            <td>${t('BPJS Kesehatan', 'Health Insurance')}</td>
            <td class="amount">${formatCurrency(payslip.bpjsKesehatan)}</td>
          </tr>
          ` : ''}
          ${payslip.bpjsKetenagakerjaan > 0 ? `
          <tr>
            <td>${t('BPJS Ketenagakerjaan', 'Employment Insurance')}</td>
            <td class="amount">${formatCurrency(payslip.bpjsKetenagakerjaan)}</td>
          </tr>
          ` : ''}
          ${payslip.otherDeductions?.map(d => `
          <tr>
            <td>${escapeHtml(d.name)}</td>
            <td class="amount">${formatCurrency(d.amount)}</td>
          </tr>
          `).join('') || ''}
          <tr class="total-row">
            <td><strong>${t('Total Potongan', 'Total Deductions')}</strong></td>
            <td class="amount"><strong>${formatCurrency(payslip.totalDeductions)}</strong></td>
          </tr>
        </table>
      </div>
      ` : ''}
    </div>
    
    ${template.sections.netPay ? `
    <div class="net-pay">
      ${t('GAJI BERSIH (NET PAY)', 'NET PAY')}: ${formatCurrency(payslip.netPay)}
    </div>
    ` : ''}
    
    ${template.sections.bankDetails && employee.bankAccount ? `
    <div class="section" style="margin-top: 20px; font-size: 12px; color: #666;">
      <strong>${t('Informasi Bank', 'Bank Information')}:</strong><br>
      ${escapeHtml(employee.bankName) || ''} - ${escapeHtml(employee.bankAccount)}
    </div>
    ` : ''}
    
    ${template.sections.ytdSummary ? `
    <div class="section" style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
      <strong>${t('Year-to-Date', 'Year-to-Date')}:</strong> 
      ${t('Penerimaan Kotor', 'Gross')}: ${formatCurrency(payslip.ytdGross)} | 
      PPh 21: ${formatCurrency(payslip.ytdPph21)}
    </div>
    ` : ''}
    
    ${template.sections.notes && payslip.notes ? `
    <div class="section" style="margin-top: 20px; font-size: 11px; color: #666;">
      <strong>${t('Catatan', 'Notes')}:</strong><br>
      ${payslip.notes}
    </div>
    ` : ''}
    
    ${template.sections.signature ? `
    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #333; width: 150px; margin-bottom: 5px;"></div>
        <div style="font-size: 12px;">${t('Karyawan', 'Employee')}</div>
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #333; width: 150px; margin-bottom: 5px;"></div>
        <div style="font-size: 12px;">${t('HRD / Finance', 'HR / Finance')}</div>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `
}

export function generateBulkPDFZip(payslips: GeneratePdfOptions[]): Promise<Buffer> {
  // TODO: Implement ZIP generation for bulk export
  throw new Error('Bulk PDF ZIP not yet implemented')
}
