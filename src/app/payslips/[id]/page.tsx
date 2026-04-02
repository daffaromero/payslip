'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Mail, MessageCircle, Download, Eye, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { PreviewModal } from '@/components/ui/preview-modal'

interface Allowance { name: string; amount: number }
interface Deduction { name: string; amount: number }

interface Payslip {
  id: string; employeeId: string; templateId: string; periodType: string
  startDate: string; endDate: string; generatedAt: string
  basePay: number; overtimeHours: number; overtimePay: number; bonus: number; thr: number
  allowances: Allowance[]; pph21: number; bpjsKesehatan: number; bpjsKetenagakerjaan: number
  otherDeductions: Deduction[]; grossPay: number; totalDeductions: number; netPay: number
  ytdGross: number; ytdPph21: number; notes: string | null
  employee: { id: string; name: string; employeeId: string; email: string | null; whatsappNumber: string | null; department: string | null; position: string | null; npwp: string | null; bankName: string | null; bankAccount: string | null }
  company: { name: string }
}

const PERIOD: Record<string, string> = {
  weekly: 'Mingguan', monthly: 'Bulanan', quarterly: '3 Bulanan', 'semi-annual': '6 Bulanan', annual: 'Tahunan'
}
const SPIN = { animation: 'spin 1s linear infinite' } as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <p className="section-label" style={{ marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export default function PayslipDetailPage() {
  const { id } = useParams() as { id: string }
  const toast = useToast()

  const [payslip, setPayslip] = useState<Payslip | null>(null)
  const [loading, setLoading] = useState(true)

  const [emailing, setEmailing] = useState(false)
  const [whatsapping, setWhatsapping] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/payslips/${id}`)
    if (res.ok) {
      const d = await res.json()
      setPayslip(d.payslip)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const closePreview = () => {
    if (previewSrc) URL.revokeObjectURL(previewSrc)
    setPreviewSrc(null)
  }

  const sendEmail = async () => {
    if (!payslip) return
    setEmailing(true)
    try {
      const res = await fetch(`/api/payslips/${id}/send-email`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) toast.success(d.message); else toast.error(d.error || 'Gagal mengirim email')
    } catch { toast.error('Gagal mengirim email') }
    finally { setEmailing(false) }
  }

  const sendWhatsApp = async () => {
    if (!payslip) return
    setWhatsapping(true)
    try {
      const res = await fetch(`/api/payslips/${id}/send-whatsapp`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) toast.success(d.message); else toast.error(d.error || 'Gagal mengirim WhatsApp')
    } catch { toast.error('Gagal mengirim WhatsApp') }
    finally { setWhatsapping(false) }
  }

  const preview = async () => {
    if (!payslip) return
    setPreviewing(true)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: id }),
      })
      if (!res.ok) throw new Error('Gagal membuat preview')
      const blob = await res.blob()
      setPreviewSrc(URL.createObjectURL(blob))
      setPreviewFilename(`slip-gaji-${payslip.employee.name}-${payslip.startDate.slice(0, 7)}.pdf`)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal preview') }
    finally { setPreviewing(false) }
  }

  const download = async () => {
    if (!payslip) return
    setDownloading(true)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: id }),
      })
      if (!res.ok) throw new Error('Gagal generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `slip-gaji-${payslip.employee.name}-${payslip.startDate.slice(0, 7)}.pdf` })
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal download') }
    finally { setDownloading(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
      <Loader2 style={{ width: 20, height: 20, ...SPIN, color: 'var(--text-tertiary)' }} />
    </div>
  )

  if (!payslip) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
      <p style={{ color: 'var(--text-tertiary)' }}>Slip gaji tidak ditemukan</p>
    </div>
  )

  const totalEarnings = payslip.basePay + payslip.overtimePay + payslip.bonus + payslip.thr + payslip.allowances.reduce((a, al) => a + al.amount, 0)
  const totalDeductions = payslip.pph21 + payslip.bpjsKesehatan + payslip.bpjsKetenagakerjaan + payslip.otherDeductions.reduce((a, d) => a + d.amount, 0)

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      {previewSrc && <PreviewModal open src={previewSrc} filename={previewFilename} onClose={closePreview} />}

      <PageHeader
        title={`Slip Gaji ${payslip.employee.name}`}
        subtitle={`${formatDate(payslip.startDate)} — ${formatDate(payslip.endDate)} · ${PERIOD[payslip.periodType] ?? payslip.periodType}`}
        back={{ href: '/payslips', label: 'Kembali ke Slip Gaji' }}
      >
        <button onClick={sendEmail} disabled={emailing} className="btn btn-secondary">
          {emailing ? <Loader2 style={{ width: 14, height: 14, ...SPIN }} /> : <Mail style={{ width: 14, height: 14 }} />}
          {emailing ? 'Mengirim...' : 'Kirim Email'}
        </button>
        <button onClick={sendWhatsApp} disabled={whatsapping} className="btn btn-secondary" style={{ color: '#16a34a' }}>
          {whatsapping ? <Loader2 style={{ width: 14, height: 14, ...SPIN }} /> : <MessageCircle style={{ width: 14, height: 14 }} />}
          {whatsapping ? 'Mengirim...' : 'Kirim WhatsApp'}
        </button>
        <button onClick={preview} disabled={previewing} className="btn btn-secondary">
          {previewing ? <Loader2 style={{ width: 14, height: 14, ...SPIN }} /> : <Eye style={{ width: 14, height: 14 }} />}
          {previewing ? 'Memuat...' : 'Preview PDF'}
        </button>
        <button onClick={download} disabled={downloading} className="btn btn-primary">
          {downloading ? <Loader2 style={{ width: 14, height: 14, ...SPIN }} /> : <Download style={{ width: 14, height: 14 }} />}
          {downloading ? 'Memuat...' : 'Download PDF'}
        </button>
      </PageHeader>

      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start' }}>

        {/* Left — employee info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Section title="Karyawan">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div className="avatar avatar-blue" style={{ width: 44, height: 44, fontSize: 18, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {payslip.employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <Link href={`/employees/${payslip.employee.id}`} style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{payslip.employee.name}</Link>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{payslip.employee.employeeId}</p>
              </div>
            </div>
            <Row label="Jabatan" value={payslip.employee.position ?? '-'} />
            <Row label="Departemen" value={payslip.employee.department ?? '-'} />
            <Row label="Email" value={payslip.employee.email ?? '-'} />
            <Row label="WhatsApp" value={payslip.employee.whatsappNumber ?? '-'} />
            <Row label="NPWP" value={payslip.employee.npwp ?? '-'} />
          </Section>

          <Section title="Bank">
            <Row label="Bank" value={payslip.employee.bankName ?? '-'} />
            <Row label="No. Rekening" value={payslip.employee.bankAccount ?? '-'} />
          </Section>

          <Section title="Periode">
            <Row label="Tipe" value={PERIOD[payslip.periodType] ?? payslip.periodType} />
            <Row label="Mulai" value={formatDate(payslip.startDate)} />
            <Row label="Selesai" value={formatDate(payslip.endDate)} />
            <Row label="Dibuat" value={formatDate(payslip.generatedAt)} />
          </Section>

          {payslip.notes && (
            <Section title="Catatan">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{payslip.notes}</p>
            </Section>
          )}
        </div>

        {/* Right — payslip breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Earnings */}
          <Section title="Pendapatan">
            <Row label="Gaji Pokok" value={formatCurrency(payslip.basePay)} />
            <Row label={`Lembur (${payslip.overtimeHours} jam)`} value={formatCurrency(payslip.overtimePay)} />
            <Row label="Bonus" value={formatCurrency(payslip.bonus)} />
            <Row label="THR" value={formatCurrency(payslip.thr)} />
            {payslip.allowances.length > 0 && payslip.allowances.map((al, i) => (
              <Row key={i} label={al.name} value={formatCurrency(al.amount)} />
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Total Pendapatan</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(totalEarnings)}</span>
            </div>
          </Section>

          {/* Deductions */}
          <Section title="Potongan">
            <Row label="PPh 21" value={formatCurrency(payslip.pph21)} />
            <Row label="BPJS Kesehatan" value={formatCurrency(payslip.bpjsKesehatan)} />
            <Row label="BPJS TK JHT" value={formatCurrency(payslip.bpjsKetenagakerjaan)} />
            {payslip.otherDeductions.length > 0 && payslip.otherDeductions.map((d, i) => (
              <Row key={i} label={d.name} value={formatCurrency(d.amount)} />
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Total Potongan</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>-{formatCurrency(totalDeductions)}</span>
            </div>
          </Section>

          {/* Summary */}
          <Section title="Ringkasan">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Total Pendapatan</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalEarnings)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Total Potongan</span>
              <span style={{ fontSize: 13, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>-{formatCurrency(totalDeductions)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Gaji Bersih</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(payslip.netPay)}</span>
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}
