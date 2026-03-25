import nodemailer from 'nodemailer'

function createTransport() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file.')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export interface SendPayslipOptions {
  to: string
  employeeName: string
  companyName: string
  periodLabel: string   // e.g. "Maret 2026"
  pdfBuffer: Buffer
  filename: string      // e.g. "slip-gaji-budi-2026-03.pdf"
}

export async function sendPayslipEmail(opts: SendPayslipOptions) {
  const transport = createTransport()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER

  await transport.sendMail({
    from,
    to: opts.to,
    subject: `Slip Gaji ${opts.periodLabel} — ${opts.companyName}`,
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #222;">
        <p style="font-size: 15px;">Yth. <strong>${opts.employeeName}</strong>,</p>
        <p style="font-size: 14px; margin-top: 12px; line-height: 1.6;">
          Terlampir slip gaji Anda untuk periode <strong>${opts.periodLabel}</strong>.
          Silakan simpan dokumen ini sebagai bukti penerimaan gaji.
        </p>
        <p style="font-size: 14px; margin-top: 12px; line-height: 1.6;">
          Jika ada pertanyaan mengenai rincian gaji, silakan hubungi tim HRD.
        </p>
        <p style="font-size: 14px; margin-top: 24px; color: #555;">
          Hormat kami,<br/>
          <strong>${opts.companyName}</strong>
        </p>
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 11px; color: #9ca3af; margin-top: 12px;">
          Email ini dikirim secara otomatis. Mohon tidak membalas email ini.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: opts.filename,
        content: opts.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}
