'use client'

import { useState, useEffect } from 'react'
import { Employee, Template } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { calculatePayslip } from '@/lib/calculations/payslip'
import { Download, Loader2, Plus, X, CheckCircle2 } from 'lucide-react'

interface Props { employees: Employee[]; templates: Template[]; defaultEmployeeId?: string }

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>}
    </div>
  )
}

export function PayslipGeneratorForm({ employees, templates, defaultEmployeeId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ?? '')
  const [templateId, setTemplateId] = useState(templates.find(t => t.isDefault)?.id ?? templates[0]?.id ?? '')
  const [periodType, setPeriodType] = useState('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [basePay, setBasePay] = useState(0)
  const [overtimeHours, setOvertimeHours] = useState(0)
  const [hourlyRate, setHourlyRate] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [thr, setThr] = useState(0)
  const [allowances, setAllowances] = useState<{ name: string; amount: number }[]>([])
  const [deductions, setDeductions] = useState<{ name: string; amount: number }[]>([])
  const [notes, setNotes] = useState('')
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const emp = employees.find(e => e.id === employeeId)

  useEffect(() => {
    const now = new Date()
    let s: Date, en: Date
    switch (periodType) {
      case 'weekly': s = new Date(now.setDate(now.getDate() - 7)); en = new Date(); break
      case 'quarterly': { const q = Math.floor(new Date().getMonth() / 3); s = new Date(new Date().getFullYear(), q * 3, 1); en = new Date(new Date().getFullYear(), (q + 1) * 3, 0); break }
      default: s = new Date(new Date().getFullYear(), new Date().getMonth(), 1); en = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    }
    setStartDate(s.toISOString().split('T')[0])
    setEndDate(en.toISOString().split('T')[0])
  }, [periodType])

  useEffect(() => {
    if (emp) { setBasePay(Number(emp.baseSalary) || 0); setHourlyRate(Number(emp.hourlyRate) || 0) }
  }, [employeeId, emp])

  const calc = emp ? calculatePayslip({ baseSalary: basePay, overtimeHours, hourlyRate, bonus, thr, allowances, otherDeductions: deductions, pph21Status: emp.pph21Status || 'TK/0', monthCount: periodType === 'quarterly' ? 3 : periodType === 'semi-annual' ? 6 : periodType === 'annual' ? 12 : 1 }) : null

  const generate = async () => {
    if (!employeeId || !templateId) { setError('Pilih karyawan dan template'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/payslips', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, templateId, periodType, startDate, endDate, basePay, overtimeHours, hourlyRate, bonus, thr, allowances, otherDeductions: deductions, notes }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal membuat slip gaji')
      const r = await res.json()
      setGeneratedId(r.payslipId)
      setSuccess('Slip gaji berhasil dibuat!')
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Terjadi kesalahan') }
    finally { setLoading(false) }
  }

  const downloadPdf = async () => {
    if (!generatedId) return
    setDownloadingPdf(true)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: generatedId }),
      })
      if (!res.ok) throw new Error('Gagal generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `slip-gaji-${emp?.name}-${startDate}.pdf` })
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Gagal download') }
    finally { setDownloadingPdf(false) }
  }

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>
      {/* Form */}
      <div className="min-w-0 space-y-4">
        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center justify-between rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--success-light)', border: '1px solid #bbf7d0' }}>
            <span className="flex items-center gap-2 font-medium" style={{ color: 'var(--success)' }}>
              <CheckCircle2 className="h-4 w-4" /> {success}
            </span>
            <button onClick={downloadPdf} disabled={downloadingPdf} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
              {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download PDF
            </button>
          </div>
        )}

        {/* Setup */}
        <div className="card p-5">
          <p className="section-label mb-5">Informasi Dasar</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Karyawan *">
              <select className="input" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                <option value="">Pilih karyawan...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
              </select>
            </F>
            <F label="Template *">
              <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                <option value="">Pilih template...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </F>
            <F label="Tipe Periode">
              <select className="input" value={periodType} onChange={e => setPeriodType(e.target.value)}>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="quarterly">3 Bulanan</option>
                <option value="semi-annual">6 Bulanan</option>
                <option value="annual">Tahunan</option>
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Mulai"><input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} /></F>
              <F label="Selesai"><input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} /></F>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="card p-5">
          <p className="section-label mb-5">Penerimaan</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Gaji Pokok">
              <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" value={basePay} onChange={e => setBasePay(Number(e.target.value))} /></div>
            </F>
            <F label="Bonus">
              <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" value={bonus} onChange={e => setBonus(Number(e.target.value))} /></div>
            </F>
            <F label="Jam Lembur">
              <input type="number" step="0.5" className="input" value={overtimeHours} onChange={e => setOvertimeHours(Number(e.target.value))} />
            </F>
            <F label="Tarif Lembur / Jam">
              <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))} /></div>
            </F>
            <F label="THR (Hari Raya)">
              <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" value={thr} onChange={e => setThr(Number(e.target.value))} /></div>
            </F>
          </div>

          {/* Allowances */}
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Tunjangan Tambahan</p>
              <button type="button" onClick={() => setAllowances(p => [...p, { name: '', amount: 0 }])} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                <Plus className="h-3 w-3" /> Tambah
              </button>
            </div>
            {allowances.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Tidak ada tunjangan tambahan</p>}
            <div className="space-y-2">
              {allowances.map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input flex-1" placeholder="Nama tunjangan" value={a.name} onChange={e => { const u=[...allowances]; u[i]={...u[i],name:e.target.value}; setAllowances(u) }} />
                  <div className="input-prefix flex-1"><span className="prefix">Rp</span><input type="number" className="input" value={a.amount} onChange={e => { const u=[...allowances]; u[i]={...u[i],amount:Number(e.target.value)}; setAllowances(u) }} /></div>
                  <button type="button" onClick={() => setAllowances(allowances.filter((_,j)=>j!==i))} className="btn btn-ghost btn-icon btn-sm flex-shrink-0" style={{ color: 'var(--danger)' }}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="section-label">Potongan Tambahan</p>
            <button type="button" onClick={() => setDeductions(p => [...p, { name: '', amount: 0 }])} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
              <Plus className="h-3 w-3" /> Tambah
            </button>
          </div>
          {deductions.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>PPh 21 dan BPJS dihitung otomatis. Tambahkan potongan lain jika perlu.</p>
          ) : (
            <div className="space-y-2">
              {deductions.map((d, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input flex-1" placeholder="Nama potongan" value={d.name} onChange={e => { const u=[...deductions]; u[i]={...u[i],name:e.target.value}; setDeductions(u) }} />
                  <div className="input-prefix flex-1"><span className="prefix">Rp</span><input type="number" className="input" value={d.amount} onChange={e => { const u=[...deductions]; u[i]={...u[i],amount:Number(e.target.value)}; setDeductions(u) }} /></div>
                  <button type="button" onClick={() => setDeductions(deductions.filter((_,j)=>j!==i))} className="btn btn-ghost btn-icon btn-sm flex-shrink-0" style={{ color: 'var(--danger)' }}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <F label="Catatan">
            <textarea className="input" style={{ height: 'auto', paddingTop: '8px', paddingBottom: '8px', resize: 'none', lineHeight: '1.5' }} rows={3} placeholder="Catatan opsional untuk slip gaji ini..." value={notes} onChange={e => setNotes(e.target.value)} />
          </F>
        </div>

        <button onClick={generate} disabled={loading} className="btn btn-primary btn-lg w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? 'Memproses...' : 'Generate Slip Gaji'}
        </button>
      </div>

      {/* Sidebar — live preview */}
      <div className="space-y-4 sticky top-6 self-start">
        {emp && (
          <div className="card p-5">
            <p className="section-label mb-4">Karyawan</p>
            <div className="flex items-center gap-3">
              <div className="avatar avatar-md avatar-blue">{emp.name.charAt(0).toUpperCase()}</div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{emp.employeeId} · {emp.pph21Status}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card p-5">
          <p className="section-label mb-4">Kalkulasi</p>
          {calc ? (
            <div>
              {/* Earnings breakdown */}
              <div className="space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Gaji Pokok</span>
                  <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(basePay)}</span>
                </div>
                {overtimeHours > 0 && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Lembur ({overtimeHours}j)</span>
                    <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(calc.grossPay - basePay - bonus - thr - allowances.reduce((s,a)=>s+a.amount,0))}</span>
                  </div>
                )}
                {bonus > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Bonus</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(bonus)}</span></div>}
                {thr > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>THR</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(thr)}</span></div>}
                {allowances.filter(a=>a.amount>0).map((a,i) => (
                  <div key={i} className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{a.name||'Tunjangan'}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(a.amount)}</span></div>
                ))}
              </div>

              {/* Gross */}
              <div className="my-3 flex items-center justify-between border-t pt-3 text-[13px]" style={{ borderColor: 'var(--border)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Gaji Kotor</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(calc.grossPay)}</span>
              </div>

              {/* Deductions */}
              <div className="space-y-2.5 text-[13px]">
                {calc.pph21 > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>PPh 21</span><span style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(calc.pph21)}</span></div>}
                {calc.bpjsKesehatan > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>BPJS Kesehatan</span><span style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(calc.bpjsKesehatan)}</span></div>}
                {calc.bpjsKetenagakerjaan > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>BPJS Ketenagakerjaan</span><span style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(calc.bpjsKetenagakerjaan)}</span></div>}
                {deductions.filter(d=>d.amount>0).map((d,i) => (
                  <div key={i} className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{d.name||'Potongan'}</span><span style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(d.amount)}</span></div>
                ))}
              </div>

              {/* Net pay */}
              <div className="mt-4 rounded-lg p-4" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-muted)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>Gaji Bersih</p>
                <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {formatCurrency(calc.netPay)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Pilih karyawan untuk melihat kalkulasi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
