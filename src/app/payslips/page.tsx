'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, FileText, Trash2, Download, Loader2, Mail, MessageCircle, Filter } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'

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

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [emailingId, setEmailingId] = useState<string | null>(null)
  const [whatsappingId, setWhatsappingId] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    fetch('/api/employees').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.employees) setEmployees(d.employees)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ limit: '50' })
    if (filterEmployee) qs.set('employeeId', filterEmployee)
    if (filterYear) qs.set('year', filterYear)
    if (filterYear && filterMonth) qs.set('month', filterMonth)
    const res = await fetch(`/api/payslips?${qs}`)
    if (res.ok) { const d = await res.json(); setPayslips(d.payslips ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [filterEmployee, filterYear, filterMonth])

  useEffect(() => { load() }, [load])

  const del = async (id: string) => {
    if (!confirm('Hapus slip gaji ini?')) return
    setDeletingId(id)
    const res = await fetch(`/api/payslips/${id}`, { method: 'DELETE' })
    if (res.ok) setPayslips(p => p.filter(x => x.id !== id))
    setDeletingId(null)
  }

  const sendEmail = async (id: string) => {
    setEmailingId(id)
    try {
      const res = await fetch(`/api/payslips/${id}/send-email`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) toast.success(data.message)
      else toast.error(data.error || 'Gagal mengirim email')
    } finally { setEmailingId(null) }
  }

  const sendWhatsApp = async (id: string) => {
    setWhatsappingId(id)
    try {
      const res = await fetch(`/api/payslips/${id}/send-whatsapp`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) toast.success(data.message)
      else toast.error(data.error || 'Gagal mengirim WhatsApp')
    } finally { setWhatsappingId(null) }
  }

  const download = async (id: string, name: string, date: string) => {
    setDownloadingId(id)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: id }),
      })
      if (!res.ok) { alert('Gagal generate PDF'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `slip-gaji-${name}-${date}.pdf` })
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } finally { setDownloadingId(null) }
  }

  const hasFilter = filterEmployee || filterYear || filterMonth
  const clearFilters = () => { setFilterEmployee(''); setFilterYear(''); setFilterMonth('') }

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Slip Gaji" subtitle={loading ? '' : `${total} slip gaji ditemukan`}>
        <Link href="/generate" className="btn btn-primary">
          <Plus className="h-3.5 w-3.5" /> Buat Slip Gaji
        </Link>
      </PageHeader>

      <div style={{ padding: 12 }}>
        {/* Filter bar */}
        <div className="card" style={{ padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Filter style={{ width: 14, height: 14, color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <select
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            className="input"
            style={{ fontSize: 13, height: 32, flex: '1 1 180px', minWidth: 0 }}
          >
            <option value="">Semua Karyawan</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
          </select>
          <input
            type="number"
            value={filterYear}
            onChange={e => { setFilterYear(e.target.value); if (!e.target.value) setFilterMonth('') }}
            className="input"
            style={{ fontSize: 13, height: 32, width: 80, flexShrink: 0 }}
            placeholder="Tahun"
            min="2000"
            max="2099"
          />
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="input"
            style={{ fontSize: 13, height: 32, flex: '1 1 130px', minWidth: 0 }}
            disabled={!filterYear}
          >
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {hasFilter && (
            <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, color: 'var(--text-tertiary)', fontSize: 12 }}>
              Reset
            </button>
          )}
        </div>

        <div className="card overflow-hidden">
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
              ) : (
                <Link href="/generate" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
                  <Plus className="h-3.5 w-3.5" /> Buat Slip Gaji
                </Link>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Periode</th>
                  <th>Tipe</th>
                  <th style={{ textAlign: 'right' }}>Gaji Kotor</th>
                  <th style={{ textAlign: 'right' }}>Gaji Bersih</th>
                  <th style={{ width: '80px' }}></th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(p => (
                  <tr key={p.id} className="group">
                    <td>
                      <div className="flex items-center gap-3" style={{ gap: 12 }}>
                        <div className="avatar avatar-sm avatar-blue">{p.employee.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{p.employee.name}</p>
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
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ gap: 4 }}>
                        <button onClick={() => sendWhatsApp(p.id)} disabled={whatsappingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Kirim ke WhatsApp" style={{ color: '#16a34a' }}>
                          {whatsappingId === p.id ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <MessageCircle style={{ width: 14, height: 14 }} />}
                        </button>
                        <button onClick={() => sendEmail(p.id)} disabled={emailingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Kirim ke Email">
                          {emailingId === p.id ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Mail style={{ width: 14, height: 14 }} />}
                        </button>
                        <button onClick={() => download(p.id, p.employee.name, p.startDate.slice(0, 10))} disabled={downloadingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Download PDF">
                          {downloadingId === p.id ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Download style={{ width: 14, height: 14 }} />}
                        </button>
                        <button onClick={() => del(p.id)} disabled={deletingId === p.id} className="btn btn-ghost btn-icon btn-sm" title="Hapus" style={{ color: 'var(--text-tertiary)' }}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {payslips.length > 0 && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                Menampilkan {payslips.length} dari {total} slip gaji
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
