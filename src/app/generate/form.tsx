'use client'

import { useState, useEffect } from 'react'
import { Employee, Template } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { calculatePayslip } from '@/lib/calculations/payslip'
import { Download, Loader2, Plus, X } from 'lucide-react'
import { ToastContainer, useToast } from '@/components/ui/toast'

interface Props { employees: Employee[]; templates: Template[]; defaultEmployeeId?: string }

const SPIN = { animation: 'spin 1s linear infinite' } as const

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

export function PayslipGeneratorForm({ employees, templates, defaultEmployeeId }: Props) {
  const [loading, setLoading] = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const toast = useToast()
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
  const [prorateEnabled, setProrateEnabled] = useState(false)
  const [prorateType, setProrateType] = useState<'join' | 'resign'>('join')
  const [prorateDate, setProrateDate] = useState('')

  const emp = employees.find(e => e.id === employeeId)

  // Prorate factor: days worked / total days in period
  const prorateFactor = (() => {
    if (!prorateEnabled || !prorateDate || !startDate || !endDate) return null
    const s = new Date(startDate)
    const e = new Date(endDate)
    const d = new Date(prorateDate)
    const totalDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
    const workedDays = prorateType === 'join'
      ? Math.max(0, Math.round((e.getTime() - d.getTime()) / 86400000) + 1)
      : Math.max(0, Math.round((d.getTime() - s.getTime()) / 86400000) + 1)
    if (totalDays <= 0) return null
    return Math.min(1, workedDays / totalDays)
  })()

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
    if (emp) {
      const full = Number(emp.baseSalary) || 0
      setBasePay(prorateFactor !== null ? Math.round(full * prorateFactor) : full)
      setHourlyRate(Number(emp.hourlyRate) || 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, emp])

  // Re-apply prorate whenever factor changes
  useEffect(() => {
    if (!emp) return
    const full = Number(emp.baseSalary) || 0
    setBasePay(prorateFactor !== null ? Math.round(full * prorateFactor) : full)
  }, [prorateFactor, emp])

  const calc = emp ? calculatePayslip({ baseSalary: basePay, overtimeHours, hourlyRate, bonus, thr, allowances, otherDeductions: deductions, pph21Status: emp.pph21Status || 'TK/0', monthCount: periodType === 'quarterly' ? 3 : periodType === 'semi-annual' ? 6 : periodType === 'annual' ? 12 : 1 }) : null

  const generate = async () => {
    if (!employeeId || !templateId) { toast.error('Pilih karyawan dan template'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/payslips', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, templateId, periodType, startDate, endDate, basePay, overtimeHours, hourlyRate, bonus, thr, allowances, otherDeductions: deductions, notes }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal membuat slip gaji')
      const r = await res.json()
      setGeneratedId(r.payslipId)
      toast.success(`Slip gaji ${emp?.name ?? ''} berhasil dibuat!`)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan') }
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
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Gagal download') }
    finally { setDownloadingPdf(false) }
  }

  return (
    <>
    <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
      {/* Form */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Download button shown after successful generation */}
        {generatedId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--success-light)', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--success)' }}>Slip gaji tersimpan</span>
            <button onClick={downloadPdf} disabled={downloadingPdf} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
              {downloadingPdf ? <Loader2 style={{ width: 14, height: 14, ...SPIN }} /> : <Download style={{ width: 14, height: 14 }} />}
              Download PDF
            </button>
          </div>
        )}

        {/* Setup */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label" style={{ marginBottom: 20 }}>Informasi Dasar</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Mulai"><input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} /></F>
              <F label="Selesai"><input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} /></F>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label" style={{ marginBottom: 20 }}>Penerimaan</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Tunjangan Tambahan</p>
              <button type="button" onClick={() => setAllowances(p => [...p, { name: '', amount: 0 }])} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                <Plus style={{ width: 12, height: 12 }} /> Tambah
              </button>
            </div>
            {allowances.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Tidak ada tunjangan tambahan</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allowances.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="input" style={{ flex: 1 }} placeholder="Nama tunjangan" value={a.name} onChange={e => { const u=[...allowances]; u[i]={...u[i],name:e.target.value}; setAllowances(u) }} />
                  <div className="input-prefix" style={{ flex: 1 }}><span className="prefix">Rp</span><input type="number" className="input" value={a.amount} onChange={e => { const u=[...allowances]; u[i]={...u[i],amount:Number(e.target.value)}; setAllowances(u) }} /></div>
                  <button type="button" onClick={() => setAllowances(allowances.filter((_,j)=>j!==i))} className="btn btn-ghost btn-icon btn-sm" style={{ flexShrink: 0, color: 'var(--danger)' }}><X style={{ width: 14, height: 14 }} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prorate */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p className="section-label">Prorate</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Karyawan bergabung atau keluar di tengah periode</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div
                onClick={() => { setProrateEnabled(v => !v); if (prorateEnabled && emp) setBasePay(Number(emp.baseSalary) || 0) }}
                style={{
                  width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
                  background: prorateEnabled ? 'var(--accent)' : 'var(--border)',
                  transition: 'background 150ms',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: prorateEnabled ? 18 : 2,
                  width: 16, height: 16, borderRadius: 8, background: '#fff',
                  transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aktifkan prorate</span>
            </label>
          </div>

          {prorateEnabled && (
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <F label="Tipe">
                <select className="input" value={prorateType} onChange={e => setProrateType(e.target.value as 'join' | 'resign')}>
                  <option value="join">Bergabung (mulai kerja)</option>
                  <option value="resign">Keluar (hari terakhir)</option>
                </select>
              </F>
              <F label={prorateType === 'join' ? 'Tanggal Bergabung' : 'Tanggal Terakhir Kerja'}>
                <input type="date" className="input" value={prorateDate} onChange={e => setProrateDate(e.target.value)}
                  min={startDate} max={endDate} />
              </F>
              {prorateFactor !== null && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Faktor prorate: <strong style={{ color: 'var(--text-primary)' }}>{(prorateFactor * 100).toFixed(1)}%</strong>
                  </div>
                  {emp && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Gaji pokok: <span style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)', marginRight: 6 }}>
                        {formatCurrency(Number(emp.baseSalary))}
                      </span>
                      <strong style={{ color: 'var(--accent)' }}>{formatCurrency(basePay)}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deductions */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="section-label">Potongan Tambahan</p>
            <button type="button" onClick={() => setDeductions(p => [...p, { name: '', amount: 0 }])} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
              <Plus style={{ width: 12, height: 12 }} /> Tambah
            </button>
          </div>
          {deductions.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>PPh 21 dan BPJS dihitung otomatis. Tambahkan potongan lain jika perlu.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deductions.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="input" style={{ flex: 1 }} placeholder="Nama potongan" value={d.name} onChange={e => { const u=[...deductions]; u[i]={...u[i],name:e.target.value}; setDeductions(u) }} />
                  <div className="input-prefix" style={{ flex: 1 }}><span className="prefix">Rp</span><input type="number" className="input" value={d.amount} onChange={e => { const u=[...deductions]; u[i]={...u[i],amount:Number(e.target.value)}; setDeductions(u) }} /></div>
                  <button type="button" onClick={() => setDeductions(deductions.filter((_,j)=>j!==i))} className="btn btn-ghost btn-icon btn-sm" style={{ flexShrink: 0, color: 'var(--danger)' }}><X style={{ width: 14, height: 14 }} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <F label="Catatan">
            <textarea className="input" style={{ height: 'auto', paddingTop: '8px', paddingBottom: '8px', resize: 'none', lineHeight: '1.5' }} rows={3} placeholder="Catatan opsional untuk slip gaji ini..." value={notes} onChange={e => setNotes(e.target.value)} />
          </F>
        </div>

        <button onClick={generate} disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading && <Loader2 style={{ width: 16, height: 16, ...SPIN }} />}
          {loading ? 'Memproses...' : 'Generate Slip Gaji'}
        </button>
      </div>

      {/* Sidebar — live preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24, alignSelf: 'start' }}>
        {emp && (
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 16 }}>Karyawan</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar avatar-md avatar-blue">{emp.name.charAt(0).toUpperCase()}</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{emp.employeeId} · {emp.pph21Status}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 20 }}>
          <p className="section-label" style={{ marginBottom: 16 }}>Kalkulasi</p>
          {calc ? (
            <div>
              {/* Earnings breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gaji Pokok</span>
                  <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(basePay)}</span>
                </div>
                {overtimeHours > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Lembur ({overtimeHours}j)</span>
                    <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(calc.grossPay - basePay - bonus - thr - allowances.reduce((s,a)=>s+a.amount,0))}</span>
                  </div>
                )}
                {bonus > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Bonus</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(bonus)}</span></div>}
                {thr > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>THR</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(thr)}</span></div>}
                {allowances.filter(a=>a.amount>0).map((a,i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>{a.name||'Tunjangan'}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(a.amount)}</span></div>
                ))}
              </div>

              {/* Gross */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0', paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Gaji Kotor</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(calc.grossPay)}</span>
              </div>

              {/* Deductions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                {calc.pph21 > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>PPh 21</span><span style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(calc.pph21)}</span></div>}
                {calc.bpjsKesehatan > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>BPJS Kesehatan</span><span style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(calc.bpjsKesehatan)}</span></div>}
                {calc.bpjsKetenagakerjaan > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>BPJS Ketenagakerjaan</span><span style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(calc.bpjsKetenagakerjaan)}</span></div>}
                {deductions.filter(d=>d.amount>0).map((d,i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>{d.name||'Potongan'}</span><span style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>−{formatCurrency(d.amount)}</span></div>
                ))}
              </div>

              {/* Net pay */}
              <div style={{ marginTop: 16, padding: 16, background: 'var(--accent-light)', border: '1px solid var(--accent-muted)', borderRadius: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>Gaji Bersih</p>
                <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
                  {formatCurrency(calc.netPay)}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Pilih karyawan untuk melihat kalkulasi</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
