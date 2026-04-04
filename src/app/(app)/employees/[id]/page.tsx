'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Pencil, Download, Mail, MessageCircle, Loader2, FileText, Plus, X, Check, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { PreviewModal } from '@/components/ui/preview-modal'
import { useRole } from '@/lib/hooks/use-role'

interface Employee {
  id: string; employeeId: string; name: string; email: string | null; whatsappNumber: string | null
  department: string | null; position: string | null; site: string | null; baseSalary: number
  bankName: string | null; bankAccount: string | null; npwp: string | null; pph21Status: string
  joinedAt: string; isActive: boolean
  salaryComponents?: SalaryComponents | null
}

interface SalaryComponents {
  tunjangan_jabatan: { amount: number; enabled: boolean }
  tunjangan_luar_kota: { amount: number; enabled: boolean }
  tunjangan_makan: { amount: number; enabled: boolean }
  tunjangan_transport: { amount: number; enabled: boolean }
  tunjangan_lama_bekerja: { amount: number; enabled: boolean }
  insentif: { amount: number; enabled: boolean }
  tunjangan_pph21: { amount: number; enabled: boolean }
}

const SALARY_COMPONENT_LABELS: Record<keyof Omit<SalaryComponents, ''>, string> = {
  tunjangan_jabatan: 'Tunjangan Jabatan',
  tunjangan_luar_kota: 'Tunjangan Luar Kota',
  tunjangan_makan: 'Tunjangan Makan',
  tunjangan_transport: 'Tunjangan Transport',
  tunjangan_lama_bekerja: 'Tunjangan Lama Kerja',
  insentif: 'Insentif',
  tunjangan_pph21: 'Tunjangan PPh 21',
}

interface Payslip {
  id: string; periodType: string; startDate: string; endDate: string
  grossPay: number; netPay: number; generatedAt: string
}

const PERIOD: Record<string, string> = {
  weekly: 'Mingguan', monthly: 'Bulanan', quarterly: '3 Bulanan', 'semi-annual': '6 Bulanan', annual: 'Tahunan'
}
const PPH21 = ['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3','K/I/0','K/I/1','K/I/2','K/I/3']
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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

type FormState = {
  employeeId: string; name: string; email: string; whatsappNumber: string
  department: string; position: string; site: string; npwp: string; bankAccount: string; bankName: string
  baseSalary: string; pph21Status: string
  salaryComponents: SalaryComponents
}

function toForm(e: Employee): FormState {
  const defaultComponents: SalaryComponents = {
    tunjangan_jabatan: { amount: 0, enabled: false },
    tunjangan_luar_kota: { amount: 0, enabled: false },
    tunjangan_makan: { amount: 0, enabled: false },
    tunjangan_transport: { amount: 0, enabled: false },
    tunjangan_lama_bekerja: { amount: 0, enabled: false },
    insentif: { amount: 0, enabled: false },
    tunjangan_pph21: { amount: 0, enabled: false },
  }
  return {
    employeeId: e.employeeId, name: e.name, email: e.email ?? '', whatsappNumber: e.whatsappNumber ?? '',
    department: e.department ?? '', position: e.position ?? '', site: e.site ?? '', npwp: e.npwp ?? '',
    bankAccount: e.bankAccount ?? '', bankName: e.bankName ?? '',
    baseSalary: String(e.baseSalary), pph21Status: e.pph21Status,
    salaryComponents: e.salaryComponents ?? defaultComponents,
  }
}

export default function EmployeeDetailPage() {
  const { id } = useParams() as { id: string }
  const toast = useToast()
  const isAdmin = useRole() === 'admin'

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [emailingId, setEmailingId] = useState<string | null>(null)
  const [whatsappingId, setWhatsappingId] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')

  const load = useCallback(async () => {
    const [empRes, psRes] = await Promise.all([
      fetch(`/api/employees/${id}`),
      fetch(`/api/payslips?employeeId=${id}&limit=20&page=${page}`),
    ])
    if (empRes.ok) { const d = await empRes.json(); setEmployee(d.employee) }
    if (psRes.ok) { const d = await psRes.json(); setPayslips(d.payslips ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [id, page])

  useEffect(() => { load() }, [load])

  const startEdit = () => {
    if (!employee) return
    setForm(toForm(employee))
    setSaveError('')
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setForm(null)
    setSaveError('')
  }

  const set = (k: keyof FormState, v: string) => setForm(p => p ? { ...p, [k]: v } : p)

  const setSalaryComponent = (key: keyof SalaryComponents, field: 'amount' | 'enabled', value: number | boolean) => {
    setForm(p => p ? {
      ...p,
      salaryComponents: {
        ...p.salaryComponents,
        [key]: { ...p.salaryComponents[key], [field]: value }
      }
    } : p)
  }

  const save = async () => {
    if (!form) return
    setSaving(true); setSaveError('')
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: form.employeeId,
          name: form.name,
          email: form.email || null,
          whatsappNumber: form.whatsappNumber || null,
          department: form.department || null,
          position: form.position || null,
          site: form.site || null,
          npwp: form.npwp || null,
          bankAccount: form.bankAccount || null,
          bankName: form.bankName || null,
          baseSalary: Number(form.baseSalary),
          pph21Status: form.pph21Status,
          salaryComponents: form.salaryComponents,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menyimpan')
      const updated = await res.json()
      setEmployee(updated.employee)
      setIsEditing(false)
      setForm(null)
      toast.success('Data karyawan diperbarui')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const download = async (psId: string, date: string) => {
    setDownloadingId(psId)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: psId }),
      })
      if (!res.ok) throw new Error('Gagal generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `slip-gaji-${employee?.name}-${date}.pdf` })
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal download') }
    finally { setDownloadingId(null) }
  }

  const preview = async (psId: string, date: string) => {
    setPreviewingId(psId)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: psId }),
      })
      if (!res.ok) throw new Error('Gagal membuat preview')
      const blob = await res.blob()
      setPreviewSrc(URL.createObjectURL(blob))
      setPreviewFilename(`slip-gaji-${employee?.name}-${date}.pdf`)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal preview') }
    finally { setPreviewingId(null) }
  }

  const closePreview = () => {
    if (previewSrc) URL.revokeObjectURL(previewSrc)
    setPreviewSrc(null)
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
    <div style={{ background: 'var(--bg-app)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      {previewSrc && <PreviewModal open src={previewSrc} filename={previewFilename} onClose={closePreview} />}

      <PageHeader
        title={employee.name}
        subtitle={[employee.position, employee.department].filter(Boolean).join(' · ') || employee.employeeId}
        back={{ href: '/employees', label: 'Kembali ke Karyawan' }}
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
          <Link href={`/generate?employeeId=${id}`} className="btn btn-primary">
            <Plus style={{ width: 14, height: 14 }} /> Buat Slip Gaji
          </Link>
        )}
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, padding: 12, flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Left — profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingBottom: 12, minHeight: 0 }}>

          {/* Identity card */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div className="avatar avatar-blue" style={{ width: 56, height: 56, fontSize: 22, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {employee.name.charAt(0).toUpperCase()}
              </div>
              {isEditing && form ? (
                <div style={{ width: '100%', marginTop: 12 }}>
                  <F label="Nama Lengkap"><input className="input" style={{ fontSize: 13 }} value={form.name} onChange={e => set('name', e.target.value)} /></F>
                  <F label="ID Karyawan"><input className="input" style={{ fontSize: 13 }} value={form.employeeId} onChange={e => set('employeeId', e.target.value)} /></F>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>{employee.name}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{employee.employeeId}</p>
                </>
              )}
              <span className="badge badge-gray" style={{ marginTop: 8 }}>{employee.isActive ? 'Aktif' : 'Nonaktif'}</span>
            </div>

            {isEditing && form ? (
              <>
                <F label="Jabatan"><input className="input" style={{ fontSize: 13 }} value={form.position} onChange={e => set('position', e.target.value)} /></F>
                <F label="Divisi"><input className="input" style={{ fontSize: 13 }} value={form.department} onChange={e => set('department', e.target.value)} /></F>
                <F label="Site"><input className="input" style={{ fontSize: 13 }} placeholder="Yogyakarta" value={form.site} onChange={e => set('site', e.target.value)} /></F>
                <F label="Email"><input type="email" className="input" style={{ fontSize: 13 }} value={form.email} onChange={e => set('email', e.target.value)} /></F>
                <F label="WhatsApp"><input className="input" style={{ fontSize: 13 }} placeholder="628xxx" value={form.whatsappNumber} onChange={e => set('whatsappNumber', e.target.value)} /></F>
                <F label="NPWP"><input className="input" style={{ fontSize: 13 }} value={form.npwp} onChange={e => set('npwp', e.target.value)} /></F>
              </>
            ) : (
              <>
                <InfoRow label="Jabatan" value={employee.position} />
                <InfoRow label="Divisi" value={employee.department} />
                <InfoRow label="Site" value={employee.site} />
                <InfoRow label="Email" value={employee.email} />
                <InfoRow label="WhatsApp" value={employee.whatsappNumber} />
                <InfoRow label="Bergabung" value={formatDate(employee.joinedAt)} />
              </>
            )}
          </div>

          {/* Compensation card */}
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Kompensasi</p>
            {isEditing && form ? (
              <>
                <F label="Gaji Pokok">
                  <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" style={{ fontSize: 13 }} value={form.baseSalary} onChange={e => set('baseSalary', e.target.value)} /></div>
                </F>
                <F label="Status PTKP">
                  <select className="input" style={{ fontSize: 13 }} value={form.pph21Status} onChange={e => set('pph21Status', e.target.value)}>
                    {PPH21.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </F>
              </>
            ) : (
              <>
                <InfoRow label="Gaji Pokok" value={formatCurrency(employee.baseSalary)} />
                <InfoRow label="Status PTKP" value={employee.pph21Status} />
                <InfoRow label="NPWP" value={employee.npwp} />
              </>
            )}
          </div>

          {/* Salary Components card */}
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Komponen Gaji</p>
            {isEditing && form ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(Object.keys(form.salaryComponents) as (keyof SalaryComponents)[]).map(key => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.salaryComponents[key].enabled}
                      onChange={e => setSalaryComponent(key, 'enabled', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <label style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, minWidth: 0 }}>{SALARY_COMPONENT_LABELS[key]}</label>
                    <input
                      type="number"
                      className="input"
                      style={{ fontSize: 13, width: 120 }}
                      value={form.salaryComponents[key].amount || ''}
                      onChange={e => setSalaryComponent(key, 'amount', Number(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(Object.keys(employee.salaryComponents ?? {}) as (keyof SalaryComponents)[]).map(key => {
                  const comp = employee.salaryComponents?.[key]
                  if (!comp?.enabled) return null
                  return <InfoRow key={key} label={SALARY_COMPONENT_LABELS[key]} value={formatCurrency(comp.amount)} />
                })}
                {(!employee.salaryComponents || Object.values(employee.salaryComponents).every(c => !c.enabled)) && (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Tidak ada komponen tambahan</p>
                )}
              </div>
            )}
          </div>

          {/* Bank card */}
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Bank</p>
            {isEditing && form ? (
              <>
                <F label="Nama Bank"><input className="input" style={{ fontSize: 13 }} value={form.bankName} onChange={e => set('bankName', e.target.value)} /></F>
                <F label="Nomor Rekening"><input className="input" style={{ fontSize: 13 }} value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} /></F>
              </>
            ) : (
              <>
                <InfoRow label="Bank" value={employee.bankName} />
                <InfoRow label="No. Rekening" value={employee.bankAccount} />
              </>
            )}
          </div>

          {saveError && (
            <div style={{ padding: '12px 16px', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13 }}>
              {saveError}
            </div>
          )}
        </div>

        {/* Right — payslip history */}
        <div className="card overflow-hidden" style={{ overflowY: 'auto', minHeight: 0, alignSelf: 'stretch' }}>
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
            <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Tipe</th>
                  <th style={{ textAlign: 'right' }}>Gaji Kotor</th>
                  <th style={{ textAlign: 'right' }}>Gaji Bersih</th>
                  <th style={{ width: 160 }}></th>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <button onClick={() => sendWa(p.id)} disabled={whatsappingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Kirim WhatsApp" style={{ color: '#16a34a' }}>
                          {whatsappingId === p.id ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <MessageCircle style={{ width: 13, height: 13 }} />}
                        </button>
                        <button onClick={() => sendEmail(p.id)} disabled={emailingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Kirim Email">
                          {emailingId === p.id ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <Mail style={{ width: 13, height: 13 }} />}
                        </button>
                        <button onClick={() => preview(p.id, p.startDate.slice(0, 7))} disabled={previewingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Preview PDF">
                          {previewingId === p.id ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <Eye style={{ width: 13, height: 13 }} />}
                        </button>
                        <button onClick={() => download(p.id, p.startDate.slice(0, 7))} disabled={downloadingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Download PDF">
                          {downloadingId === p.id ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <Download style={{ width: 13, height: 13 }} />}
                        </button>
                        <Link href={`/payslips/${p.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>Lihat</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {total > 20 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} dari {total} slip gaji
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="btn btn-ghost btn-icon btn-sm">
                    <ChevronLeft style={{ width: 13, height: 13 }} />
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '0 8px' }}>{page} / {Math.ceil(total / 20)}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn btn-ghost btn-icon btn-sm">
                    <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
