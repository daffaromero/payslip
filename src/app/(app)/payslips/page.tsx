'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, FileText, Trash2, Download, Loader2, Mail, MessageCircle, Filter, Eye, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { PreviewModal } from '@/components/ui/preview-modal'
import { useRole } from '@/lib/hooks/use-role'
import { usePayslipFilters } from '@/lib/hooks/use-payslip-filters'
import { useAsyncOperation } from '@/lib/hooks/use-async-operation'

interface Payslip {
  id: string; employeeId: string; periodType: string
  startDate: string; endDate: string; grossPay: number; netPay: number; generatedAt: string
  employee: { id: string; name: string; employeeId: string }
}

interface Employee { id: string; name: string; employeeId: string }

const PERIOD: Record<string, string> = {
  weekly: 'Mingguan', monthly: 'Bulanan', quarterly: '3 Bulanan', 'semi-annual': '6 Bulanan', annual: 'Tahunan'
}

const MONTHS = [
  { value: '', label: 'Semua Bulan' },
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' }, { value: '3', label: 'Maret' },
  { value: '4', label: 'April' }, { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' }, { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
]

const LIMIT = 20

export default function PayslipsPage() {
  const isAdmin = useRole() === 'admin'
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const { filterEmployee, filterYear, filterMonth, filterPeriodType, page, setFilterEmployee, setFilterYear, setFilterMonth, setFilterPeriodType, setPage, clearFilters, hasFilter } = usePayslipFilters()
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [bulkSendOpen, setBulkSendOpen] = useState(false)
  const [bulkChannel, setBulkChannel] = useState<'email' | 'whatsapp' | 'both'>('email')
  const [bulkSending, setBulkSending] = useState(false)
  const toast = useToast()

  const deleteOp = useAsyncOperation(
    async (id: string) => {
      const res = await fetch(`/api/payslips/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      return id
    },
    {
      onSuccess: (id) => setPayslips(p => p.filter(x => x.id !== id)),
    }
  )

  const downloadOp = useAsyncOperation(
    async ({ id, name, date }: { id: string; name: string; date: string }) => {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: id }),
      })
      if (!res.ok) throw new Error('Gagal generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `slip-gaji-${name}-${date}.pdf` })
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  )

  const previewOp = useAsyncOperation(
    async ({ id, name, date }: { id: string; name: string; date: string }) => {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: id }),
      })
      if (!res.ok) throw new Error('Gagal membuat preview')
      const blob = await res.blob()
      return { blob, filename: `slip-gaji-${name}-${date}.pdf` }
    },
    {
      onSuccess: ({ blob, filename }) => {
        setPreviewSrc(URL.createObjectURL(blob))
        setPreviewFilename(filename)
      },
    }
  )

  const emailOp = useAsyncOperation(
    async (id: string) => {
      const res = await fetch(`/api/payslips/${id}/send-email`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim email')
      return data
    },
    {
      onSuccess: (data) => toast.success(data.message),
      onError: (err) => toast.error(err.message),
    }
  )

  const whatsappOp = useAsyncOperation(
    async (id: string) => {
      const res = await fetch(`/api/payslips/${id}/send-whatsapp`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim WhatsApp')
      return data
    },
    {
      onSuccess: (data) => toast.success(data.message),
      onError: (err) => toast.error(err.message),
    }
  )

  useEffect(() => {
    fetch('/api/employees?limit=200').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.employees) setEmployees(d.employees)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ limit: String(LIMIT), page: String(page) })
    if (filterEmployee) qs.set('employeeId', filterEmployee)
    if (filterYear) qs.set('year', filterYear)
    if (filterYear && filterMonth) qs.set('month', filterMonth)
    if (filterPeriodType) qs.set('periodType', filterPeriodType)
    const res = await fetch(`/api/payslips?${qs}`)
    if (res.ok) { const d = await res.json(); setPayslips(d.payslips ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [filterEmployee, filterYear, filterMonth, filterPeriodType, page])

  useEffect(() => { load() }, [load])

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(1) }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteOp.execute(pendingDelete.id)
    } finally {
      setPendingDelete(null)
    }
  }

  const closePreview = () => {
    if (previewSrc) URL.revokeObjectURL(previewSrc)
    setPreviewSrc(null)
  }

  const bulkSend = async () => {
    if (payslips.length === 0) return
    setBulkSending(true)
    try {
      const res = await fetch('/api/payslips/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: payslips.map(p => p.id), channel: bulkChannel }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal mengirim')
      const parts = [`${d.sent} slip gaji terkirim`]
      if (d.skipped > 0) parts.push(`${d.skipped} dilewati (tidak ada kontak)`)
      if (d.errors?.length > 0) parts.push(`${d.errors.length} gagal`)
      toast.success(parts.join(', '))
      setBulkSendOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim')
    } finally {
      setBulkSending(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <ConfirmModal
        open={pendingDelete !== null}
        title="Hapus slip gaji?"
        description={`Slip gaji ${pendingDelete?.name} ini akan dihapus permanen.`}
        confirmLabel="Hapus"
        loading={deleteOp.isLoading}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {previewSrc && (
        <PreviewModal
          open
          src={previewSrc}
          filename={previewFilename}
          onClose={closePreview}
        />
      )}

      {/* Bulk send modal */}
      {bulkSendOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) setBulkSendOpen(false) }}>
          <div className="card" style={{ padding: 24, width: 400, maxWidth: 'calc(100vw - 32px)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Kirim Massal</p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
              Mengirim {total} slip gaji sesuai filter aktif saat ini.
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Kirim via</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(['email', 'whatsapp', 'both'] as const).map(ch => (
                <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1px solid ${bulkChannel === ch ? 'var(--accent)' : 'var(--border)'}`, background: bulkChannel === ch ? 'var(--accent-light)' : 'var(--bg-surface)', cursor: 'pointer' }}>
                  <input type="radio" name="channel" value={ch} checked={bulkChannel === ch} onChange={() => setBulkChannel(ch)} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {ch === 'email' ? 'Email saja' : ch === 'whatsapp' ? 'WhatsApp saja' : 'Email & WhatsApp'}
                  </span>
                </label>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              Slip gaji tanpa kontak yang sesuai akan dilewati secara otomatis.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setBulkSendOpen(false)} disabled={bulkSending}>Batal</button>
              <button className="btn btn-primary" onClick={bulkSend} disabled={bulkSending || payslips.length === 0}>
                {bulkSending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: 14, height: 14 }} />}
                {bulkSending ? 'Mengirim...' : `Kirim ${total} Slip Gaji`}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader title="Slip Gaji" subtitle={loading ? '' : `${total} slip gaji ditemukan`}>
        {isAdmin && total > 0 && (
          <button className="btn btn-secondary" onClick={() => setBulkSendOpen(true)}>
            <Send className="h-3.5 w-3.5" /> Kirim Massal
          </button>
        )}
        {isAdmin && (
          <Link href="/generate" className="btn btn-primary">
            <Plus className="h-3.5 w-3.5" /> Buat Slip Gaji
          </Link>
        )}
      </PageHeader>

      <div style={{ padding: 12 }}>
        {/* Filter bar */}
        <div className="card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Filter style={{ width: 14, height: 14, color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <select
            value={filterEmployee}
            onChange={e => { setFilterEmployee(e.target.value); setPage(1) }}
            style={{ fontSize: 13, height: 34, flex: '1 1 200px', minWidth: 0, appearance: 'none', paddingRight: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23737373' d='M6 8.5L1.5 4h9z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius)', paddingLeft: 12, backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <option value="">Semua Karyawan</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
          </select>
          <select
            value={filterPeriodType}
            onChange={e => { setFilterPeriodType(e.target.value); setPage(1) }}
            style={{ fontSize: 13, height: 34, flex: '1 1 140px', minWidth: 0, appearance: 'none', paddingRight: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23737373' d='M6 8.5L1.5 4h9z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius)', paddingLeft: 12, backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <option value="">Semua Tipe</option>
            {Object.entries(PERIOD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input
            type="number"
            value={filterYear}
            onChange={e => { handleFilterChange(setFilterYear)(e.target.value); if (!e.target.value) handleFilterChange(setFilterMonth)('') }}
            className="input"
            style={{ fontSize: 13, height: 34, width: 90, flexShrink: 0 }}
            placeholder="Tahun"
            min="2000" max="2099"
          />
          <select
            value={filterMonth}
            onChange={e => { setFilterMonth(e.target.value); setPage(1) }}
            disabled={!filterYear}
            style={{ fontSize: 13, height: 34, flex: '1 1 140px', minWidth: 0, appearance: 'none', paddingRight: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23737373' d='M6 8.5L1.5 4h9z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius)', paddingLeft: 12, backgroundColor: 'var(--bg-surface)', color: filterYear ? 'var(--text-primary)' : 'var(--text-disabled)', cursor: filterYear ? 'pointer' : 'not-allowed' }}
          >
            <option value="">Semua Bulan</option>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {hasFilter && (
            <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, color: 'var(--text-tertiary)', fontSize: 12 }}>
              Reset
            </button>
          )}
        </div>

        <div className="card" style={{ overflow: 'clip' }}>
          {loading ? (
            <div className="flex items-center justify-center" style={{ padding: '80px 0' }}>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
            </div>
          ) : payslips.length === 0 ? (
            <div className="flex flex-col items-center text-center" style={{ padding: '80px 0' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <FileText className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
                {hasFilter ? 'Tidak ada slip gaji yang cocok' : 'Belum ada slip gaji'}
              </p>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>
                {hasFilter ? 'Coba ubah atau hapus filter' : 'Generate slip gaji pertama untuk mulai'}
              </p>
              {hasFilter ? (
                <button onClick={clearFilters} className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>Reset Filter</button>
              ) : isAdmin ? (
                <Link href="/generate" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
                  <Plus className="h-3.5 w-3.5" /> Buat Slip Gaji
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Karyawan</th>
                    <th>Periode</th>
                    <th>Tipe</th>
                    <th style={{ textAlign: 'right' }}>Gaji Kotor</th>
                    <th style={{ textAlign: 'right' }}>Gaji Bersih</th>
                    <th style={{ width: '180px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(p => (
                    <tr key={p.id} className="group">
                      <td>
                        <div className="flex items-center gap-3" style={{ gap: 12 }}>
                          <div className="avatar avatar-sm avatar-blue">{p.employee.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <Link href={`/employees/${p.employee.id}`} style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{p.employee.name}</Link>
                            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.employee.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                          {formatDate(p.startDate)} — {formatDate(p.endDate)}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{formatDate(p.generatedAt)}</p>
                      </td>
                      <td><span className="badge badge-gray">{PERIOD[p.periodType] ?? p.periodType}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 15, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(Number(p.grossPay))}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(Number(p.netPay))}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button onClick={() => whatsappOp.execute(p.id)} disabled={whatsappOp.isLoading} className="btn btn-ghost btn-icon btn-sm" title="Kirim ke WhatsApp" style={{ color: '#16a34a' }}>
                            {whatsappOp.isLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <MessageCircle style={{ width: 14, height: 14 }} />}
                          </button>
                          <button onClick={() => emailOp.execute(p.id)} disabled={emailOp.isLoading} className="btn btn-ghost btn-icon btn-sm" title="Kirim ke Email">
                            {emailOp.isLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Mail style={{ width: 14, height: 14 }} />}
                          </button>
                          <button onClick={() => previewOp.execute({ id: p.id, name: p.employee.name, date: p.startDate.slice(0, 10) })} disabled={previewOp.isLoading} className="btn btn-ghost btn-icon btn-sm" title="Preview PDF">
                            {previewOp.isLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Eye style={{ width: 14, height: 14 }} />}
                          </button>
                          <button onClick={() => downloadOp.execute({ id: p.id, name: p.employee.name, date: p.startDate.slice(0, 10) })} disabled={downloadOp.isLoading} className="btn btn-ghost btn-icon btn-sm" title="Download PDF">
                            {downloadOp.isLoading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Download style={{ width: 14, height: 14 }} />}
                          </button>
                          {isAdmin && (
                            <button onClick={() => setPendingDelete({ id: p.id, name: p.employee.name })} disabled={deleteOp.isLoading} className="btn btn-ghost btn-icon btn-sm" title="Hapus" style={{ color: 'var(--text-tertiary)' }}>
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                          <Link href={`/payslips/${p.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>Lihat</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer: count + pagination */}
          {payslips.length > 0 && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total} slip gaji
              </p>
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                    className="btn btn-ghost btn-icon btn-sm"
                  >
                    <ChevronLeft style={{ width: 14, height: 14 }} />
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '0 8px' }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                    className="btn btn-ghost btn-icon btn-sm"
                  >
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
