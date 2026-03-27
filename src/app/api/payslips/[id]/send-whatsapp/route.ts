import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompanyId } from '@/lib/api/identity'
import { deserializeTemplate } from '@/lib/api/template-serializer'
import { generatePayslipPDF } from '@/lib/pdf/generator'
import { sendDocument } from '@/lib/whatsapp/client'
import { apiOk, apiError } from '@/lib/api/respond'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cid = getCompanyId(req)
  if (!cid) return apiError('Unauthorized', 401)

  const { id } = await params

  try {
    const payslip = await prisma.payslip.findFirst({
      where: { id, companyId: cid },
      include: { employee: true, template: true, company: true },
    })

    if (!payslip) return apiError('Slip gaji tidak ditemukan', 404)

    const number = payslip.employee.whatsappNumber
    if (!number) {
      return apiError('Karyawan tidak memiliki nomor WhatsApp. Tambahkan di halaman edit karyawan.', 400)
    }

    const template = deserializeTemplate(payslip.template)
    const payslipData = { ...payslip, allowances: JSON.parse(payslip.allowances), otherDeductions: JSON.parse(payslip.otherDeductions) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await generatePayslipPDF({ payslip: payslipData as any, employee: payslip.employee as any, template: template as any, company: payslip.company })

    const periodLabel = new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long' }).format(new Date(payslip.startDate))
    const safeName = payslip.employee.name.toLowerCase().replace(/\s+/g, '-')
    const safeDate = new Date(payslip.startDate).toISOString().slice(0, 7)
    const filename = `slip-gaji-${safeName}-${safeDate}.pdf`
    const caption = `Yth. *${payslip.employee.name}*,\n\nTerlampir slip gaji Anda untuk periode *${periodLabel}*.\n\nSilakan simpan dokumen ini sebagai bukti penerimaan gaji.\n\n_${payslip.company.name}_`

    await sendDocument({ to: number, caption, filename, buffer: pdfBuffer, mimetype: 'application/pdf' })

    return apiOk({ message: `Slip gaji berhasil dikirim ke WhatsApp ${number}` })
  } catch (error) {
    console.error('WhatsApp send error:', error)
    const msg = error instanceof Error ? error.message : 'Gagal mengirim WhatsApp'
    return apiError(msg, 500)
  }
}
