'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Employee, Template } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { calculatePayslip } from '@/lib/calculations/payslip'
import { calcProrate } from '@/lib/calculations/prorate'
import { Download, Loader2, Plus, X, Eye } from 'lucide-react'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { PreviewModal } from '@/components/ui/preview-modal'
import { useAsyncOperation } from '@/lib/hooks/use-async-operation'
import { useProrateConfig } from '@/lib/hooks/use-prorate-config'
import { PayslipFormSchema, PayslipFormValues } from '@/lib/schemas/payslip-form'

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
  const defaultTemplateId = templates.find(t => t.isDefault)?.id ?? templates[0]?.id ?? ''

  const form = useForm<PayslipFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(PayslipFormSchema) as any,
    defaultValues: {
      employeeId: defaultEmployeeId ?? '',
      templateId: defaultTemplateId,
      periodType: 'monthly',
      startDate: '',
      endDate: '',
      basePay: 0,
      overtimeHours: 0,
      hourlyRate: 0,
      bonus: 0,
      thr: 0,
      allowances: [],
      deductions: [],
      notes: '',
    },
  })

  const {
    enabled: prorateEnabled,
    prorateType,
    prorateDate,
    prorateCalcMode,
    prorateUseCount,
    prorateCount,
    prorateDayBasis,
    toggle: toggleProrate,
    setType: setProrateType,
    setCalcMode: setProrateCalcMode,
    setUseCount: setProrateUseCount,
    setCount: setProrateCount,
    setDayBasis: setProrateDayBasis,
    setDate: setProrateDate,
  } = useProrateConfig()

  const toast = useToast()
  const [previewingSrc, setPreviewingSrc] = useState<string | null>(null)
  const [generatedId, setGeneratedId] = useState<string | null>(null)

  const { watch, setValue, getValues } = form
  const watchedValues = watch()

  const periodType = watchedValues.periodType
  const employeeId = watchedValues.employeeId
  const startDate = watchedValues.startDate
  const endDate = watchedValues.endDate
  const basePay = watchedValues.basePay
  const overtimeHours = watchedValues.overtimeHours
  const hourlyRate = watchedValues.hourlyRate
  const bonus = watchedValues.bonus
  const thr = watchedValues.thr
  const allowances = watchedValues.allowances
  const deductions = watchedValues.deductions

  const emp = employees.find(e => e.id === employeeId)

  const PERIOD_COUNT: Record<string, number> = { weekly: 1, monthly: 1, quarterly: 3, 'semi-annual': 6, annual: 12 }
  const periodCount = PERIOD_COUNT[periodType] ?? 1

  const { prorateFactor, prorateBreakdown } = !prorateEnabled || !startDate || !endDate
    ? { prorateFactor: null, prorateBreakdown: null }
    : calcProrate({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        prorateDate: prorateDate ? new Date(prorateDate) : undefined,
        prorateType,
        prorateCalcMode,
        prorateUseCount,
        prorateCount,
        periodCount,
        prorateDayBasis,
      })

  const generateOp = useAsyncOperation(async () => {
    const vals = getValues()
    const res = await fetch('/api/payslips', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: vals.employeeId, templateId: vals.templateId, periodType: vals.periodType, startDate: vals.startDate, endDate: vals.endDate, basePay: vals.basePay, overtimeHours: vals.overtimeHours, hourlyRate: vals.hourlyRate, bonus: vals.bonus, thr: vals.thr, allowances: vals.allowances, otherDeductions: vals.deductions, notes: vals.notes }),
    })
    if (!res.ok) throw new Error((await res.json()).error || 'Gagal membuat slip gaji')
    return (await res.json()).payslipId as string
  }, {
    onSuccess: (payslipId) => {
      setGeneratedId(payslipId)
      toast.success(`Slip gaji ${emp?.name ?? ''} berhasil dibuat!`)
    },
    onError: (err) => toast.error(err.message),
  })

  const previewOp = useAsyncOperation(async () => {
    const vals = getValues()
    const res = await fetch('/api/preview-payslip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: vals.employeeId, templateId: vals.templateId, periodType: vals.periodType, startDate: vals.startDate, endDate: vals.endDate, basePay: vals.basePay, overtimeHours: vals.overtimeHours, hourlyRate: vals.hourlyRate, bonus: vals.bonus, thr: vals.thr, allowances: vals.allowances, otherDeductions: vals.deductions, notes: vals.notes }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal membuat preview')
    return data.html as string
  }, {
    onSuccess: (html) => {
      const blob = new Blob([html], { type: 'text/html' })
      setPreviewingSrc(URL.createObjectURL(blob))
    },
    onError: (err) => toast.error(err.message),
  })

  useEffect(() => {
    const now = new Date()
    let s: Date, en: Date
    switch (periodType) {
      case 'weekly': s = new Date(now.setDate(now.getDate() - 7)); en = new Date(); break
      case 'quarterly': { const q = Math.floor(new Date().getMonth() / 3); s = new Date(new Date().getFullYear(), q * 3, 1); en = new Date(new Date().getFullYear(), (q + 1) * 3, 0); break }
      default: s = new Date(new Date().getFullYear(), new Date().getMonth(), 1); en = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    }
    setValue('startDate', s.toISOString().split('T')[0])
    setValue('endDate', en.toISOString().split('T')[0])
  }, [periodType, setValue])

  useEffect(() => {
    if (emp) {
      const full = Number(emp.baseSalary) || 0
      setValue('basePay', prorateFactor !== null ? Math.round(full * prorateFactor) : full)
      setValue('hourlyRate', Number(emp.hourlyRate) || 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, emp])

  useEffect(() => {
    if (!emp) return
    const full = Number(emp.baseSalary) || 0
    setValue('basePay', prorateFactor !== null ? Math.round(full * prorateFactor) : full)
  }, [prorateFactor, emp, setValue])

  const calc = emp ? calculatePayslip({ baseSalary: basePay, overtimeHours, hourlyRate, bonus, thr, allowances, otherDeductions: deductions, pph21Status: emp.pph21Status || 'TK/0', monthCount: periodType === 'quarterly' ? 3 : periodType === 'semi-annual' ? 6 : periodType === 'annual' ? 12 : 1 }) : null

  const downloadPdf = async () => {
    if (!generatedId) return
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
  }

  const closePreview = () => {
    if (previewingSrc) URL.revokeObjectURL(previewingSrc)
    setPreviewingSrc(null)
  }

  const handleProrateToggle = () => {
    toggleProrate()
    if (prorateEnabled && emp) setValue('basePay', Number(emp.baseSalary) || 0)
  }

  const addAllowance = () => setValue('allowances', [...allowances, { name: '', amount: 0 }])
  const removeAllowance = (i: number) => setValue('allowances', allowances.filter((_, j) => j !== i))
  const updateAllowance = (i: number, field: 'name' | 'amount', val: string | number) => {
    const u = [...allowances]; u[i] = { ...u[i], [field]: field === 'amount' ? Number(val) : val }; setValue('allowances', u)
  }

  const addDeduction = () => setValue('deductions', [...deductions, { name: '', amount: 0 }])
  const removeDeduction = (i: number) => setValue('deductions', deductions.filter((_, j) => j !== i))
  const updateDeduction = (i: number, field: 'name' | 'amount', val: string | number) => {
    const u = [...deductions]; u[i] = { ...u[i], [field]: field === 'amount' ? Number(val) : val }; setValue('deductions', u)
  }

  return (
    <>
    <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    {previewingSrc && (
      <PreviewModal
        open
        src={previewingSrc}
        filename={`preview-slip-${emp?.name ?? 'karyawan'}-${startDate}.html`}
        onClose={closePreview}
      />
    )}
    <div className="generate-layout" style={{ gap: 24 }}>
      {/* Form */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Download button shown after successful generation */}
        {generatedId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--success-light)', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--success)' }}>Slip gaji tersimpan</span>
            <button onClick={downloadPdf} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
              <Download style={{ width: 14, height: 14 }} />
              Download PDF
            </button>
          </div>
        )}

        {/* Setup */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label" style={{ marginBottom: 20 }}>Informasi Dasar</p>
          <div className="form-grid-2" style={{ gap: 16 }}>
            <F label="Karyawan *">
              <select className="input" {...form.register('employeeId')}>
                <option value="">Pilih karyawan...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
              </select>
            </F>
            <F label="Template *">
              <select className="input" {...form.register('templateId')}>
                <option value="">Pilih template...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </F>
            <F label="Tipe Periode">
              <select className="input" {...form.register('periodType')}>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="quarterly">3 Bulanan</option>
                <option value="semi-annual">6 Bulanan</option>
                <option value="annual">Tahunan</option>
              </select>
            </F>
            <div className="form-grid-2" style={{ gap: 12 }}>
              <F label="Mulai"><input type="date" className="input" {...form.register('startDate')} /></F>
              <F label="Selesai"><input type="date" className="input" {...form.register('endDate')} /></F>
            </div>
          </div>
        </div>

        {/* earnings */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label" style={{ marginBottom: 20 }}>Penerimaan</p>
          <div className="form-grid-2" style={{ gap: 16 }}>
            <F label="Gaji Pokok">
              <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" {...form.register('basePay', { valueAsNumber: true })} /></div>
            </F>
            <F label="Bonus">
              <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" {...form.register('bonus', { valueAsNumber: true })} /></div>
            </F>
            <F label="Jam Lembur">
              <input type="number" step="0.5" className="input" {...form.register('overtimeHours', { valueAsNumber: true })} />
            </F>
            <F label="Tarif Lembur / Jam">
              <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" {...form.register('hourlyRate', { valueAsNumber: true })} /></div>
            </F>
            <F label="THR (Hari Raya)">
              <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" {...form.register('thr', { valueAsNumber: true })} /></div>
            </F>
          </div>

          {/* Allowances */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Tunjangan Tambahan</p>
              <button type="button" onClick={addAllowance} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                <Plus style={{ width: 12, height: 12 }} /> Tambah
              </button>
            </div>
            {allowances.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Tidak ada tunjangan tambahan</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allowances.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="input" style={{ flex: 1 }} placeholder="Nama tunjangan" value={a.name} onChange={e => updateAllowance(i, 'name', e.target.value)} />
                  <div className="input-prefix" style={{ flex: 1 }}><span className="prefix">Rp</span><input type="number" className="input" value={a.amount} onChange={e => updateAllowance(i, 'amount', Number(e.target.value))} /></div>
                  <button type="button" onClick={() => removeAllowance(i)} className="btn btn-ghost btn-icon btn-sm" style={{ flexShrink: 0, color: 'var(--danger)' }}><X style={{ width: 14, height: 14 }} /></button>
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
                onClick={handleProrateToggle}
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
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Type + method toggle */}
              <div className="form-grid-2" style={{ gap: 16 }}>
                <F label="Tipe">
                  <select className="input" value={prorateType} onChange={e => setProrateType(e.target.value as 'join' | 'resign')}>
                    <option value="join">Bergabung (mulai kerja)</option>
                    <option value="resign">Keluar (hari terakhir)</option>
                  </select>
                </F>
                {periodCount > 1 && (
                  <F label="Metode hitung">
                    <select className="input" value={prorateUseCount ? 'count' : prorateCalcMode}
                      onChange={e => {
                        const v = e.target.value
                        if (v === 'count') { setProrateUseCount(true) }
                        else { setProrateUseCount(false); setProrateCalcMode(v as 'period' | 'span') }
                      }}>
                      <option value="period">Per sub-periode</option>
                      <option value="span">Seluruh rentang</option>
                      <option value="count">Jumlah periode</option>
                    </select>
                  </F>
                )}
                {!prorateUseCount && (
                  <F label="Basis hari">
                    <select className="input" value={prorateDayBasis} onChange={e => setProrateDayBasis(e.target.value as 'calendar' | 'working')}>
                      <option value="calendar">Hari kalender</option>
                      <option value="working">Hari kerja (Senin–Jumat)</option>
                    </select>
                  </F>
                )}
              </div>

              {/* Date input or count input */}
              {prorateUseCount ? (
                <F label={`Periode bekerja (dari ${periodCount})`} hint={`Karyawan bekerja selama berapa periode dari total ${periodCount} periode`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min={0} max={periodCount} step={0.5} value={prorateCount}
                      onChange={e => setProrateCount(Number(e.target.value))}
                      style={{ flex: 1 }} />
                    <input type="number" className="input" min={0} max={periodCount} step={0.5} value={prorateCount}
                      onChange={e => setProrateCount(Math.min(periodCount, Math.max(0, Number(e.target.value))))}
                      style={{ width: 70 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>/ {periodCount}</span>
                  </div>
                </F>
              ) : (
                <F label={prorateType === 'join' ? 'Tanggal Bergabung' : 'Tanggal Terakhir Kerja'}>
                  <input type="date" className="input"
                    value={prorateDate ?? ''}
                    onChange={e => setProrateDate(e.target.value)}
                    min={startDate} max={endDate} />
                </F>
              )}

              {/* Result */}
              {prorateFactor !== null && (
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Sub-period breakdown for period mode */}
                  {prorateBreakdown && (
                    <div style={{ borderBottom: '1px solid var(--border)' }}>
                      {prorateBreakdown.map((row, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', borderBottom: i < prorateBreakdown.length - 1 ? '1px solid var(--border-subtle, var(--border))' : 'none', opacity: row.pct === 0 ? 0.45 : 1 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Periode {i + 1} · {row.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{row.note}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: row.pct === 0 ? 'var(--danger)' : row.pct === 1 ? 'var(--success)' : 'var(--accent)', minWidth: 40, textAlign: 'right' }}>{(row.pct * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Summary row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Faktor prorate: <strong style={{ color: 'var(--text-primary)' }}>{(prorateFactor * 100).toFixed(1)}%</strong>
                    </div>
                    {emp && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)', marginRight: 6 }}>{formatCurrency(Number(emp.baseSalary))}</span>
                        <strong style={{ color: 'var(--accent)' }}>{formatCurrency(basePay)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deductions */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="section-label">Potongan Tambahan</p>
            <button type="button" onClick={addDeduction} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
              <Plus style={{ width: 12, height: 12 }} /> Tambah
            </button>
          </div>
          {deductions.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>PPh 21 dan BPJS dihitung otomatis. Tambahkan potongan lain jika perlu.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deductions.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="input" style={{ flex: 1 }} placeholder="Nama potongan" value={d.name} onChange={e => updateDeduction(i, 'name', e.target.value)} />
                  <div className="input-prefix" style={{ flex: 1 }}><span className="prefix">Rp</span><input type="number" className="input" value={d.amount} onChange={e => updateDeduction(i, 'amount', Number(e.target.value))} /></div>
                  <button type="button" onClick={() => removeDeduction(i)} className="btn btn-ghost btn-icon btn-sm" style={{ flexShrink: 0, color: 'var(--danger)' }}><X style={{ width: 14, height: 14 }} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <F label="Catatan">
            <textarea className="input" style={{ height: 'auto', paddingTop: '8px', paddingBottom: '8px', resize: 'none', lineHeight: '1.5' }} rows={3} placeholder="Catatan opsional untuk slip gaji ini..." {...form.register('notes')} />
          </F>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => previewOp.execute()} disabled={previewOp.isLoading || generateOp.isLoading} className="btn btn-secondary btn-lg" style={{ flex: '0 0 auto' }}>
            {previewOp.isLoading ? <Loader2 style={{ width: 16, height: 16, ...SPIN }} /> : <Eye style={{ width: 16, height: 16 }} />}
            Preview
          </button>
          <button onClick={() => generateOp.execute()} disabled={generateOp.isLoading} className="btn btn-primary btn-lg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {generateOp.isLoading && <Loader2 style={{ width: 16, height: 16, ...SPIN }} />}
            {generateOp.isLoading ? 'Memproses...' : 'Generate Slip Gaji'}
          </button>
        </div>
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
