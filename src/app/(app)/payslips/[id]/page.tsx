'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Mail, MessageCircle, Download, Eye, Loader2, Pencil, X, Check, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { PreviewModal } from '@/components/ui/preview-modal'
import { useRole } from '@/lib/hooks/use-role'

interface Allowance { name: string; amount: number }
interface Deduction { name: string; amount: number }

interface Payslip {
  id: string; employeeId: string; templateId: string; periodType: string
  startDate: string; endDate: string; generatedAt: string
  basePay: number; overtimeHours: number; overtimePay: number; bonus: number; thr: number
  allowances: Allowance[]; pph21: number; bpjsKesehatan: number; bpjsTkJht: number; bpjsTkJp: number
  otherDeductions: Deduction[]; grossPay: number; totalDeductions: number; netPay: number
  ytdGross: number; ytdPph21: number; notes: string | null
  employee: { id: string; name: string; employeeId: string; email: string | null; whatsappNumber: string | null; department: string | null; position: string | null; npwp: string | null; bankName: string | null; bankAccount: string | null }
  company: { name: string }
}

interface FormState {
  basePay: string
  bonus: string
  thr: string
  allowances: Allowance[]
  otherDeductions: Deduction[]
  notes: string
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

function AmountInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <div className="input-prefix" style={{ width: 180 }}>
        <span className="prefix">Rp</span>
        <input
          type="number"
          className="input"
          style={{ fontSize: 13 }}
          value={value}
          onChange={e => onChange(e.target.value)}
          min="0"
        />
      </div>
    </div>
  )
}

export default function PayslipDetailPage() {
  const { id } = useParams() as { id: string }
  const toast = useToast()
  const isAdmin = useRole() === 'admin'

  const [payslip, setPayslip] = useState<Payslip | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

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

  const startEdit = () => {
    if (!payslip) return
    setForm({
      basePay: String(payslip.basePay),
      bonus: String(payslip.bonus),
      thr: String(payslip.thr),
      allowances: payslip.allowances.map(a => ({ ...a })),
      otherDeductions: payslip.otherDeductions.map(d => ({ ...d })),
      notes: payslip.notes ?? '',
    })
    setIsEditing(true)
  }

  const cancelEdit = () => { setIsEditing(false); setForm(null) }

  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      const res = await fetch(`/api/payslips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePay: Number(form.basePay) || 0,
          bonus: Number(form.bonus) || 0,
          thr: Number(form.thr) || 0,
          allowances: form.allowances.filter(a => a.name.trim()),
          otherDeductions: form.otherDeductions.filter(d => d.name.trim()),
          notes: form.notes || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menyimpan')
      const updated = await res.json()
      setPayslip(updated.payslip)
      setIsEditing(false)
      setForm(null)
      toast.success('Slip gaji diperbarui')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

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
  const totalDeductions = payslip.pph21 + payslip.bpjsKesehatan + payslip.bpjsTkJht + payslip.bpjsTkJp + payslip.otherDeductions.reduce((a, d) => a + d.amount, 0)

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      {previewSrc && <PreviewModal open src={previewSrc} filename={previewFilename} onClose={closePreview} />}

      <PageHeader
        title={`Slip Gaji ${payslip.employee.name}`}
        subtitle={`${formatDate(payslip.startDate)} — ${formatDate(payslip.endDate)} · ${PERIOD[payslip.periodType] ?? payslip.periodType}`}
        back={{ href: '/payslips', label: 'Kembali ke Slip Gaji' }}
      >
        {isAdmin && !isEditing && (
          <button onClick={startEdit} className="btn btn-secondary">
            <Pencil style={{ width: 14, height: 14 }} /> Edit
          </button>
        )}
        {isAdmin && isEditing && (
          <>
            <button onClick={cancelEdit} disabled={saving} className="btn btn-secondary">
              <X style={{ width: 14, height: 14 }} /> Batal
            </button>
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? <Loader2 style={{ width: 14, height: 14, ...SPIN }} /> : <Check style={{ width: 14, height: 14 }} />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        )}
        {!isEditing && (
          <>
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
          </>
        )}
      </PageHeader>

      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start' }}>

        {/* Left — employee info + notes */}
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
            <Row label="Divisi" value={payslip.employee.department ?? '-'} />
            <Row label="Email" value={payslip.employee.email ?? '-'} />
            <Row label="WhatsApp" value={payslip.employee.whatsappNumber ?? '-'} />
            <Row label="NIK" value={payslip.employee.npwp ?? '-'} />
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

          {/* Notes — editable */}
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Catatan</p>
            {isEditing && form ? (
              <textarea
                className="input"
                style={{ fontSize: 13, minHeight: 80, resize: 'vertical' }}
                value={form.notes}
                onChange={e => setForm(f => f ? { ...f, notes: e.target.value } : f)}
                placeholder="Tambahkan catatan..."
              />
            ) : (
              <p style={{ fontSize: 13, color: payslip.notes ? 'var(--text-secondary)' : 'var(--text-tertiary)', whiteSpace: 'pre-wrap' }}>
                {payslip.notes || 'Tidak ada catatan'}
              </p>
            )}
          </div>
        </div>

        {/* Right — payslip breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Earnings */}
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Pendapatan</p>
            {isEditing && form ? (
              <>
                <AmountInput label="Gaji Pokok" value={form.basePay} onChange={v => setForm(f => f ? { ...f, basePay: v } : f)} />
                <AmountInput label="Bonus" value={form.bonus} onChange={v => setForm(f => f ? { ...f, bonus: v } : f)} />
                <AmountInput label="THR" value={form.thr} onChange={v => setForm(f => f ? { ...f, thr: v } : f)} />

                {/* Editable allowances */}
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 8px' }}>Tunjangan</p>
                {form.allowances.map((al, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      className="input"
                      style={{ fontSize: 13, flex: 1 }}
                      placeholder="Nama tunjangan"
                      value={al.name}
                      onChange={e => setForm(f => {
                        if (!f) return f
                        const next = [...f.allowances]
                        next[i] = { ...next[i], name: e.target.value }
                        return { ...f, allowances: next }
                      })}
                    />
                    <div className="input-prefix" style={{ width: 160 }}>
                      <span className="prefix">Rp</span>
                      <input
                        type="number"
                        className="input"
                        style={{ fontSize: 13 }}
                        placeholder="0"
                        value={al.amount || ''}
                        onChange={e => setForm(f => {
                          if (!f) return f
                          const next = [...f.allowances]
                          next[i] = { ...next[i], amount: Number(e.target.value) || 0 }
                          return { ...f, allowances: next }
                        })}
                      />
                    </div>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'var(--danger)', flexShrink: 0 }}
                      onClick={() => setForm(f => f ? { ...f, allowances: f.allowances.filter((_, j) => j !== i) } : f)}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}
                  onClick={() => setForm(f => f ? { ...f, allowances: [...f.allowances, { name: '', amount: 0 }] } : f)}
                >
                  <Plus style={{ width: 12, height: 12 }} /> Tambah Tunjangan
                </button>
              </>
            ) : (
              <>
                <Row label="Gaji Pokok" value={formatCurrency(payslip.basePay)} />
                <Row label={`Lembur (${payslip.overtimeHours} jam)`} value={formatCurrency(payslip.overtimePay)} />
                <Row label="Bonus" value={formatCurrency(payslip.bonus)} />
                <Row label="THR" value={formatCurrency(payslip.thr)} />
                {payslip.allowances.map((al, i) => (
                  <Row key={i} label={al.name} value={formatCurrency(al.amount)} />
                ))}
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Total Pendapatan</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(totalEarnings)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Potongan</p>
            <Row label="PPh 21" value={formatCurrency(payslip.pph21)} />
            <Row label="BPJS Kesehatan" value={formatCurrency(payslip.bpjsKesehatan)} />
            <Row label="BPJS TK JHT" value={formatCurrency(payslip.bpjsTkJht)} />
            <Row label="BPJS TK JP" value={formatCurrency(payslip.bpjsTkJp)} />

            {/* Editable other deductions */}
            {isEditing && form ? (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 8px' }}>Potongan Lainnya</p>
                {form.otherDeductions.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      className="input"
                      style={{ fontSize: 13, flex: 1 }}
                      placeholder="Nama potongan"
                      value={d.name}
                      onChange={e => setForm(f => {
                        if (!f) return f
                        const next = [...f.otherDeductions]
                        next[i] = { ...next[i], name: e.target.value }
                        return { ...f, otherDeductions: next }
                      })}
                    />
                    <div className="input-prefix" style={{ width: 160 }}>
                      <span className="prefix">Rp</span>
                      <input
                        type="number"
                        className="input"
                        style={{ fontSize: 13 }}
                        placeholder="0"
                        value={d.amount || ''}
                        onChange={e => setForm(f => {
                          if (!f) return f
                          const next = [...f.otherDeductions]
                          next[i] = { ...next[i], amount: Number(e.target.value) || 0 }
                          return { ...f, otherDeductions: next }
                        })}
                      />
                    </div>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'var(--danger)', flexShrink: 0 }}
                      onClick={() => setForm(f => f ? { ...f, otherDeductions: f.otherDeductions.filter((_, j) => j !== i) } : f)}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}
                  onClick={() => setForm(f => f ? { ...f, otherDeductions: [...f.otherDeductions, { name: '', amount: 0 }] } : f)}
                >
                  <Plus style={{ width: 12, height: 12 }} /> Tambah Potongan
                </button>
              </>
            ) : (
              payslip.otherDeductions.map((d, i) => (
                <Row key={i} label={d.name} value={formatCurrency(d.amount)} />
              ))
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Total Potongan</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>-{formatCurrency(totalDeductions)}</span>
            </div>
          </div>

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

          {isEditing && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right' }}>
              PPh 21 dan BPJS dihitung ulang otomatis saat disimpan.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
