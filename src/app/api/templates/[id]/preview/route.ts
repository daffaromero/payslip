import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { deserializeTemplate } from '@/lib/api/template-serializer'
import { generatePayslipHTML } from '@/lib/pdf/generator'
import { apiError } from '@/lib/api/respond'

const SAMPLE_COMPANY = {
  id: 'preview',
  name: 'PT Contoh Indonesia',
  address: 'Jl. Sudirman No. 1, Jakarta Pusat 10220',
  taxId: '09.123.456.7-123.000',
  phone: '(021) 1234-5678',
  email: 'hr@contoh.co.id',
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const SAMPLE_EMPLOYEE = {
  id: 'preview',
  companyId: 'preview',
  employeeId: 'EMP-001',
  name: 'Budi Santoso',
  email: 'budi@contoh.co.id',
  department: 'Engineering',
  position: 'Senior Developer',
  npwp: '09.234.567.8-012.000',
  bankAccount: '1234567890',
  bankName: 'BCA',
  baseSalary: 12000000,
  hourlyRate: 75000,
  pph21Status: 'K/1',
  isActive: true,
  joinedAt: new Date('2020-01-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
}

const SAMPLE_PAYSLIP = {
  id: 'preview',
  companyId: 'preview',
  employeeId: 'preview',
  templateId: 'preview',
  periodType: 'monthly' as const,
  startDate: new Date('2026-03-01'),
  endDate: new Date('2026-03-31'),
  basePay: 12000000,
  overtimeHours: 8,
  overtimePay: 600000,
  bonus: 0,
  thr: 0,
  allowances: [
    { name: 'Tunjangan Transport', amount: 500000 },
    { name: 'Tunjangan Makan', amount: 750000 },
  ],
  pph21: 1250000,
  bpjsKesehatan: 240000,
  bpjsKetenagakerjaan: 180000,
  otherDeductions: [],
  grossPay: 13850000,
  totalDeductions: 1670000,
  netPay: 12180000,
  ytdGross: 41550000,
  ytdPph21: 3750000,
  notes: 'Slip gaji ini diterbitkan secara elektronik dan sah tanpa tanda tangan basah.',
  generatedAt: new Date(),
  pdfUrl: null,
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  const { id } = await params

  try {
    const raw = await prisma.template.findFirst({ where: { id, companyId: cid } })
    if (!raw) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const template = deserializeTemplate(raw)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = generatePayslipHTML({ payslip: SAMPLE_PAYSLIP as any, employee: SAMPLE_EMPLOYEE as any, template: template as any, company: SAMPLE_COMPANY as any })

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
