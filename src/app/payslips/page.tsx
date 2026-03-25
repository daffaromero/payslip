'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, FileText, Trash2, Download, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

interface Payslip {
  id: string; employeeId: string; periodType: string
  startDate: string; endDate: string; grossPay: number; netPay: number; generatedAt: string
  employee: { id: string; name: string; employeeId: string }
}

const PERIOD: Record<string, string> = {
  weekly: 'Mingguan', monthly: 'Bulanan', quarterly: '3 Bulanan', 'semi-annual': '6 Bulanan', annual: 'Tahunan'
}

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/payslips?limit=50')
    if (res.ok) { const d = await res.json(); setPayslips(d.payslips ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const del = async (id: string) => {
    if (!confirm('Hapus slip gaji ini?')) return
    setDeletingId(id)
    const res = await fetch(`/api/payslips/${id}`, { method: 'DELETE' })
    if (res.ok) setPayslips(p => p.filter(x => x.id !== id))
    setDeletingId(null)
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

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <PageHeader title="Slip Gaji" subtitle={loading ? '' : `${total} slip gaji tersimpan`}>
        <Link href="/generate" className="btn btn-primary">
          <Plus className="h-3.5 w-3.5" /> Buat Slip Gaji
        </Link>
      </PageHeader>

      <div style={{ padding: 32 }}>
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
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Belum ada slip gaji</p>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>Generate slip gaji pertama untuk mulai</p>
              <Link href="/generate" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
                <Plus className="h-3.5 w-3.5" /> Buat Slip Gaji
              </Link>
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
                          <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.employee.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{p.employee.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(p.startDate)} — {formatDate(p.endDate)}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{formatDate(p.generatedAt)}</p>
                    </td>
                    <td><span className="badge badge-gray">{PERIOD[p.periodType] ?? p.periodType}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(Number(p.grossPay))}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(Number(p.netPay))}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ gap: 4 }}>
                        <button
                          onClick={() => download(p.id, p.employee.name, p.startDate.slice(0, 10))}
                          disabled={downloadingId === p.id}
                          className="btn btn-ghost btn-icon btn-sm" title="Download PDF"
                        >
                          {downloadingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => del(p.id)}
                          disabled={deletingId === p.id}
                          className="btn btn-ghost btn-icon btn-sm" title="Hapus"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
