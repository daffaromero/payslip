import { apiError } from '../lib/api-error'
import { Hono } from 'hono'
import { prisma } from '@/lib/db'
import { generatePayslipPDF, generatePayslipHTML } from '@/lib/pdf/generator'
import { calculatePayslip, getPeriodMonths } from '@/lib/calculations/payslip'
import { deserializeTemplate, type RawTemplate } from '@/lib/api/template-serializer'
import { requireAdmin } from '../middleware/admin'
import type { Env } from '../types'
import { readFileSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads/logos')

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml',
}

function resolveLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null
  // If it's already a data URI or absolute URL, use as-is
  if (logoUrl.startsWith('data:') || logoUrl.startsWith('http')) return logoUrl
  // Extract filename from /api/uploads/logos/<filename>
  const filename = logoUrl.split('/').pop()
  if (!filename || /[^a-zA-Z0-9._-]/.test(filename)) return null
  try {
    const filepath = path.join(UPLOAD_DIR, filename)
    const buffer = readFileSync(filepath)
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const mime = CONTENT_TYPES[ext] ?? 'image/png'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return logoUrl // fallback to original if file not found
  }
}

const router = new Hono<Env>()
router.on(['POST', 'PATCH', 'PUT', 'DELETE'], '*', requireAdmin)

// POST /api/generate-pdf
router.post('/generate-pdf', async (c) => {
  const cid = c.get('companyId')
  try {
    const { payslipId } = await c.req.json()
    if (!payslipId) return c.json({ error: 'Payslip ID diperlukan' }, 400)

    const payslip = await prisma.payslip.findFirst({
      where: { id: payslipId, companyId: cid },
      include: { employee: true, template: true, company: true },
    })
    if (!payslip) return c.json({ error: 'Payslip tidak ditemukan' }, 404)

    const pdfBuffer = await generatePayslipPDF({
      payslip: {
        id: payslip.id, companyId: payslip.companyId, employeeId: payslip.employeeId,
        templateId: payslip.templateId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        periodType: payslip.periodType as any,
        startDate: payslip.startDate, endDate: payslip.endDate,
        basePay: Number(payslip.basePay), overtimePay: Number(payslip.overtimePay),
        bonus: Number(payslip.bonus), thr: Number(payslip.thr),
        allowances: JSON.parse(payslip.allowances as string),
        pph21: Number(payslip.pph21), bpjsKesehatan: Number(payslip.bpjsKesehatan),
        bpjsTkJht: Number(payslip.bpjsTkJht), bpjsTkJp: Number(payslip.bpjsTkJp),
        otherDeductions: JSON.parse(payslip.otherDeductions as string),
        grossPay: Number(payslip.grossPay), totalDeductions: Number(payslip.totalDeductions),
        netPay: Number(payslip.netPay), ytdGross: Number(payslip.ytdGross),
        ytdPph21: Number(payslip.ytdPph21), notes: payslip.notes || undefined,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      employee: payslip.employee as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: deserializeTemplate(payslip.template as unknown as RawTemplate) as any,
      company: {
        id: payslip.company.id, name: payslip.company.name, address: payslip.company.address,
        taxId: payslip.company.taxId, phone: payslip.company.phone, email: payslip.company.email,
        logoUrl: resolveLogoUrl(payslip.company.logoUrl), createdAt: payslip.company.createdAt, updatedAt: payslip.company.updatedAt,
      },
    })

    const safeName = payslip.employee.name.toLowerCase().replace(/\s+/g, '-')
    const safeDate = payslip.startDate.toISOString().split('T')[0]

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="slip-gaji-${safeName}-${safeDate}.pdf"`,
      },
    })
  } catch (e) {
    console.error('PDF generation error:', e)
    return c.json(apiError('Gagal generate PDF', e), 500)
  }
})

// POST /api/preview-payslip
router.post('/preview-payslip', async (c) => {
  const cid = c.get('companyId')
  try {
    const data = await c.req.json()

    const [employee, template, company] = await Promise.all([
      prisma.employee.findFirst({ where: { id: data.employeeId, companyId: cid } }),
      prisma.template.findFirst({ where: { id: data.templateId, companyId: cid } }),
      prisma.company.findUnique({ where: { id: cid } }),
    ])

    if (!employee || !template) return c.json({ error: 'Data tidak ditemukan' }, 404)

    const monthCount = getPeriodMonths(data.periodType || 'monthly')
    const calculations = calculatePayslip({
      baseSalary: data.basePay || Number(employee.baseSalary),
      overtimeHours: data.overtimeHours,
      bonus: data.bonus, thr: data.thr, allowances: data.allowances,
      pph21Status: employee.pph21Status, monthCount,
    })

    const manualPph21 = data.pph21 ?? calculations.pph21
    const manualBpjsKesehatan = data.bpjsKesehatan ?? calculations.bpjsKesehatan
    const manualBpjsTkJht = data.bpjsTkJht ?? calculations.bpjsTkJht
    const manualBpjsTkJp = data.bpjsTkJp ?? calculations.bpjsTkJp
    const otherDeductionsTotal = (data.otherDeductions || []).reduce((sum: number, d: { amount?: number }) => sum + (d.amount || 0), 0)
    const totalDeductions = manualPph21 + manualBpjsKesehatan + manualBpjsTkJht + manualBpjsTkJp + otherDeductionsTotal

    const payslipData = {
      id: 'preview', companyId: cid, employeeId: employee.id, templateId: template.id,
      periodType: data.periodType || 'monthly',
      startDate: new Date(data.startDate || new Date()), endDate: new Date(data.endDate || new Date()),
      basePay: data.basePay || Number(employee.baseSalary), overtimeHours: data.overtimeHours || 0, overtimePay: 0,
      bonus: data.bonus || 0, thr: data.thr || 0, allowances: data.allowances || [],
      pph21: manualPph21, bpjsKesehatan: manualBpjsKesehatan,
      bpjsTkJht: manualBpjsTkJht, bpjsTkJp: manualBpjsTkJp, otherDeductions: data.otherDeductions || [],
      grossPay: calculations.grossPay, totalDeductions, netPay: calculations.grossPay - totalDeductions,
      ytdGross: calculations.grossPay, ytdPph21: manualPph21, notes: data.notes, generatedAt: new Date(),
    }

    const html = generatePayslipHTML({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payslip: payslipData as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      employee: { ...employee, pph21Status: employee.pph21Status as any },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: deserializeTemplate(template as unknown as RawTemplate) as any,
      company: company ? { ...company, logoUrl: resolveLogoUrl(company.logoUrl) } : { id: cid, name: '', address: null, taxId: null, phone: null, email: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
    })

    return c.json({ success: true, html })
  } catch (e) {
    console.error('Preview error:', e)
    return c.json(apiError('Gagal membuat preview', e), 500)
  }
})

export default router
