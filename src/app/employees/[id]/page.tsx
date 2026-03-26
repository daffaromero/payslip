'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Pencil, Download, Mail, MessageCircle, Loader2, FileText, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'

interface Employee {
  id: string; employeeId: string; name: string; email: string | null; whatsappNumber: string | null
  department: string | null; position: string | null; baseSalary: number; hourlyRate: number | null
  bankName: string | null; bankAccount: string | null; npwp: string | null; pph21Status: string
  joinedAt: string; isActive: boolean
}

interface Payslip {
  id: string; periodType: string; startDate: string; endDate: string
  grossPay: number; netPay: number; generatedAt: string
}

const PERIOD: Record<string, string> = {
  weekly: 'Mingguan', monthly: 'Bulanan', quarterly: '3 Bulanan', 'semi-annual': '6 Bulanan', annual: 'Tahunan'
}
const SPIN = { animation: 'spin 1s linear infinite' } as const

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

export default function EmployeeDetailPage() {
  const { id } = useParams() as { id: string }
  const toast = useToast()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [emailingId, setEmailingId] = useState<string | null>(null)
  const [whatsappingId, setWhatsappingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [empRes, psRes] = await Promise.all([
      fetch(`/api/employees/${id}`),
      fetch(`/api/payslips?employeeId=${id}&limit=50`),
    ])
    if (empRes.ok) { const d = await empRes.json(); setEmployee(d.employee) }
    if (psRes.ok) { const d = await psRes.json(); setPayslips(d.payslips ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const download = async (psId: string, empName: string, date: string) => {
    setDownloadingId(psId)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: psId }),
      })
      if (!res.ok) throw new Error('Gagal generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `slip-gaji-${empName}-${date}.pdf` })
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal download') }
    finally { setDownloadingId(null) }
  }

  const sendEmail = async (psId: string) => {
    setEmailingId(psId)
    try {
      const res = await fetch(`/api/payslips/${psId}/send-email`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) toast.success(d.message); else toast.error(d.error || 'Gagal mengirim email')
    } finally { setEmailingId(null) }
  }

  const sendWa = async (psId: string) => {
    setWhatsappingId(psId)
    try {
      const res = await fetch(`/api/payslips/${psId}/send-whatsapp`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) toast.success(d.message); else toast.error(d.error || 'Gagal mengirim WhatsApp')
    } finally { setWhatsappingId(null) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
      <Loader2 style={{ width: 20, height: 20, ...SPIN, color: 'var(--text-tertiary)' }} />
    </div>
  )

  if (!employee) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
      <p style={{ color: 'var(--text-tertiary)' }}>Karyawan tidak ditemukan</p>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader
        title={employee.name}
        subtitle={[employee.position, employee.department].filter(Boolean).join(' · ') || employee.employeeId}
        back={{ href: '/employees', label: 'Kembali ke Karyawan' }}
      >
        <Link href={`/employees/${id}/edit`} className="btn btn-secondary">
          <Pencil style={{ width: 14, height: 14 }} /> Edit
        </Link>
        <Link href={`/generate?employeeId=${id}`} className="btn btn-primary">
          <Plus style={{ width: 14, height: 14 }} /> Buat Slip Gaji
        </Link>
      </PageHeader>

      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'start' }}>

        {/* Left — profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div className="avatar avatar-blue" style={{ width: 56, height: 56, fontSize: 22, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>{employee.name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{employee.employeeId}</p>
              <span className="badge badge-gray" style={{ marginTop: 8 }}>{employee.isActive ? 'Aktif' : 'Nonaktif'}</span>
            </div>
            <InfoRow label="Jabatan" value={employee.position} />
            <InfoRow label="Departemen" value={employee.department} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="WhatsApp" value={employee.whatsappNumber} />
            <InfoRow label="Bergabung" value={formatDate(employee.joinedAt)} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Kompensasi</p>
            <InfoRow label="Gaji Pokok" value={formatCurrency(employee.baseSalary)} />
            <InfoRow label="Tarif Lembur" value={employee.hourlyRate ? `${formatCurrency(employee.hourlyRate)}/jam` : null} />
            <InfoRow label="Status PTKP" value={employee.pph21Status} />
            <InfoRow label="NPWP" value={employee.npwp} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Bank</p>
            <InfoRow label="Bank" value={employee.bankName} />
            <InfoRow label="No. Rekening" value={employee.bankAccount} />
          </div>
        </div>

        {/* Right — payslip history */}
        <div className="card overflow-hidden">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Riwayat Slip Gaji</p>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{total} slip gaji</span>
          </div>

          {payslips.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText style={{ width: 20, height: 20, color: 'var(--text-tertiary)' }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Belum ada slip gaji</p>
              <Link href={`/generate?employeeId=${id}`} className="btn btn-secondary btn-sm">
                <Plus style={{ width: 13, height: 13 }} /> Buat Slip Gaji
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Tipe</th>
                  <th style={{ textAlign: 'right' }}>Gaji Kotor</th>
                  <th style={{ textAlign: 'right' }}>Gaji Bersih</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(p => (
                  <tr key={p.id} className="group">
                    <td>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {formatDate(p.startDate)} — {formatDate(p.endDate)}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{formatDate(p.generatedAt)}</p>
                    </td>
                    <td><span className="badge badge-gray">{PERIOD[p.periodType] ?? p.periodType}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Number(p.grossPay))}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Number(p.netPay))}</span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <button onClick={() => sendWa(p.id)} disabled={whatsappingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Kirim WhatsApp" style={{ color: '#16a34a' }}>
                          {whatsappingId === p.id ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <MessageCircle style={{ width: 13, height: 13 }} />}
                        </button>
                        <button onClick={() => sendEmail(p.id)} disabled={emailingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Kirim Email">
                          {emailingId === p.id ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <Mail style={{ width: 13, height: 13 }} />}
                        </button>
                        <button onClick={() => download(p.id, employee.name, p.startDate.slice(0, 7))} disabled={downloadingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Download PDF">
                          {downloadingId === p.id ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <Download style={{ width: 13, height: 13 }} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
