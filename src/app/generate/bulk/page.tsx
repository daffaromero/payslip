'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { Loader2, CheckCircle2, XCircle, Mail, MessageCircle, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Employee { id: string; name: string; employeeId: string; baseSalary: number; email: string | null; whatsappNumber: string | null }
interface Template { id: string; name: string; isDefault: boolean }

type ResultItem = { employee: Employee; ok: boolean; payslipId?: string; error?: string }

const SPIN = { animation: 'spin 1s linear infinite' } as const
const PERIOD: Record<string, string> = { weekly: 'Mingguan', monthly: 'Bulanan', quarterly: '3 Bulanan', 'semi-annual': '6 Bulanan', annual: 'Tahunan' }

export default function BulkGeneratePage() {
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const [templateId, setTemplateId] = useState('')
  const [periodType, setPeriodType] = useState('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ResultItem[]>([])
  const [done, setDone] = useState(false)

  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingWa, setSendingWa] = useState(false)

  useEffect(() => {
    const now = new Date()
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(s.toISOString().split('T')[0])
    setEndDate(e.toISOString().split('T')[0])

    Promise.all([
      fetch('/api/employees?limit=200').then(r => r.json()),
      fetch('/api/templates').then(r => r.json()),
    ]).then(([emp, tpl]) => {
      setEmployees(emp.employees ?? [])
      const tpls: Template[] = tpl.templates ?? []
      setTemplates(tpls)
      setTemplateId(tpls.find(t => t.isDefault)?.id ?? tpls[0]?.id ?? '')
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const s = new Date()
    switch (periodType) {
      case 'weekly': s.setDate(s.getDate() - 7); setStartDate(s.toISOString().split('T')[0]); setEndDate(new Date().toISOString().split('T')[0]); break
      case 'quarterly': { const q = Math.floor(new Date().getMonth() / 3); const qs = new Date(new Date().getFullYear(), q * 3, 1); const qe = new Date(new Date().getFullYear(), (q + 1) * 3, 0); setStartDate(qs.toISOString().split('T')[0]); setEndDate(qe.toISOString().split('T')[0]); break }
      default: { const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1); const me = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0); setStartDate(ms.toISOString().split('T')[0]); setEndDate(me.toISOString().split('T')[0]) }
    }
  }, [periodType])

  const generate = async () => {
    if (!templateId) { toast.error('Pilih template terlebih dahulu'); return }
    setRunning(true); setDone(false); setResults([]); setProgress(0)

    const out: ResultItem[] = []
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      try {
        const res = await fetch('/api/payslips', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: emp.id, templateId, periodType, startDate, endDate,
            basePay: Number(emp.baseSalary), overtimeHours: 0,
            hourlyRate: 0, bonus: 0, thr: 0, allowances: [], otherDeductions: [], notes: '',
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Gagal')
        const d = await res.json()
        out.push({ employee: emp, ok: true, payslipId: d.payslipId })
      } catch (err) {
        out.push({ employee: emp, ok: false, error: err instanceof Error ? err.message : 'Error' })
      }
      setProgress(i + 1)
      setResults([...out])
    }
    setRunning(false); setDone(true)
    const ok = out.filter(r => r.ok).length
    toast.success(`${ok} dari ${employees.length} slip gaji berhasil dibuat`)
  }

  const sendAll = async (channel: 'email' | 'whatsapp') => {
    const succeeded = results.filter(r => r.ok && r.payslipId)
    if (channel === 'email') setSendingEmail(true); else setSendingWa(true)
    let sent = 0; let failed = 0
    for (const r of succeeded) {
      const endpoint = channel === 'email' ? 'send-email' : 'send-whatsapp'
      const res = await fetch(`/api/payslips/${r.payslipId}/${endpoint}`, { method: 'POST' })
      if (res.ok) sent++; else failed++
    }
    if (channel === 'email') setSendingEmail(false); else setSendingWa(false)
    if (failed === 0) toast.success(`${sent} slip gaji berhasil dikirim`)
    else toast.error(`${sent} berhasil, ${failed} gagal`)
  }

  const succeeded = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Generate Massal" subtitle="Buat slip gaji untuk semua karyawan sekaligus" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>

        {/* Config */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label" style={{ marginBottom: 16 }}>Konfigurasi</p>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Loader2 style={{ width: 18, height: 18, ...SPIN, color: 'var(--text-tertiary)' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Template</label>
                <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (default)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Tipe Periode</label>
                <select className="input" value={periodType} onChange={e => setPeriodType(e.target.value)}>
                  {Object.entries(PERIOD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Tanggal Mulai</label>
                <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Tanggal Selesai</label>
                <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          )}

          {!loading && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                <Users style={{ width: 13, height: 13, display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                {employees.length} karyawan aktif
              </span>
              <button onClick={generate} disabled={running || done} className="btn btn-primary">
                {running && <Loader2 style={{ width: 14, height: 14, ...SPIN }} />}
                {running ? `Memproses... (${progress}/${employees.length})` : done ? 'Selesai' : 'Generate Semua'}
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {(running || done) && employees.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Progress</p>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{progress}/{employees.length}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'var(--accent)', width: `${(progress / employees.length) * 100}%`, transition: 'width 0.2s ease' }} />
            </div>
            {done && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 style={{ width: 14, height: 14 }} /> {succeeded} berhasil
                </span>
                {failed > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <XCircle style={{ width: 14, height: 14 }} /> {failed} gagal
                  </span>
                )}
                {succeeded > 0 && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button onClick={() => sendAll('whatsapp')} disabled={sendingWa || sendingEmail} className="btn btn-secondary btn-sm" style={{ color: '#16a34a' }}>
                      {sendingWa ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <MessageCircle style={{ width: 13, height: 13 }} />}
                      Kirim Semua WA
                    </button>
                    <button onClick={() => sendAll('email')} disabled={sendingEmail || sendingWa} className="btn btn-secondary btn-sm">
                      {sendingEmail ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <Mail style={{ width: 13, height: 13 }} />}
                      Kirim Semua Email
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Per-employee results */}
        {results.length > 0 && (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th style={{ textAlign: 'right' }}>Gaji Pokok</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.employee.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm avatar-blue">{r.employee.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{r.employee.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{r.employee.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(Number(r.employee.baseSalary))}
                      </span>
                    </td>
                    <td>
                      {r.ok
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#16a34a' }}><CheckCircle2 style={{ width: 13, height: 13 }} /> Berhasil</span>
                        : <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--danger)' }}><XCircle style={{ width: 13, height: 13 }} /> {r.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
