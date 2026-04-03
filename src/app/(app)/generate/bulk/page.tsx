'use client'

import { useState, useEffect, Fragment } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { Loader2, CheckCircle2, XCircle, Mail, MessageCircle, Users, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAdminGuard } from '@/lib/hooks/use-role'

interface Employee { 
  id: string; name: string; employeeId: string; baseSalary: number; email: string | null; whatsappNumber: string | null
  salaryComponents?: SalaryComponents | null
}
interface Template { id: string; name: string; isDefault: boolean }

interface SalaryComponents {
  tunjangan_jabatan: { amount: number; enabled: boolean }
  tunjangan_luar_kota: { amount: number; enabled: boolean }
  tunjangan_makan: { amount: number; enabled: boolean }
  tunjangan_transport: { amount: number; enabled: boolean }
  tunjangan_lama_bekerja: { amount: number; enabled: boolean }
  tunjangan_pph21: { amount: number; enabled: boolean }
}

interface SalaryComponentsOverride {
  tunjangan_jabatan: { amount: number; enabled: boolean; override: boolean }
  tunjangan_luar_kota: { amount: number; enabled: boolean; override: boolean }
  tunjangan_makan: { amount: number; enabled: boolean; override: boolean }
  tunjangan_transport: { amount: number; enabled: boolean; override: boolean }
  tunjangan_lama_bekerja: { amount: number; enabled: boolean; override: boolean }
  tunjangan_pph21: { amount: number; enabled: boolean; override: boolean }
}

interface ManualPeriod { id: string; startDate: string; endDate: string; label: string }

interface EmployeeOverride { id: string; expanded: boolean; salaryComponents: SalaryComponentsOverride }

type ResultItem = { employeeId: string; employeeName: string; period: string; ok: boolean; payslipId?: string; error?: string }

const SPIN = { animation: 'spin 1s linear infinite' } as const
const ID_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const SALARY_COMPONENT_LABELS: Record<keyof Omit<SalaryComponents, ''>, string> = {
  tunjangan_jabatan: 'Tunjangan Jabatan',
  tunjangan_luar_kota: 'Tunjangan Luar Kota',
  tunjangan_makan: 'Tunjangan Makan',
  tunjangan_transport: 'Tunjangan Transport',
  tunjangan_lama_bekerja: 'Tunjangan Lama Kerja',
  tunjangan_pph21: 'Tunjangan PPh 21',
}

function defaultOverride(sc?: SalaryComponents | null): SalaryComponentsOverride {
  const defaults = {
    tunjangan_jabatan: { amount: sc?.tunjangan_jabatan?.amount ?? 0, enabled: sc?.tunjangan_jabatan?.enabled ?? false, override: false },
    tunjangan_luar_kota: { amount: sc?.tunjangan_luar_kota?.amount ?? 0, enabled: sc?.tunjangan_luar_kota?.enabled ?? false, override: false },
    tunjangan_makan: { amount: sc?.tunjangan_makan?.amount ?? 0, enabled: sc?.tunjangan_makan?.enabled ?? false, override: false },
    tunjangan_transport: { amount: sc?.tunjangan_transport?.amount ?? 0, enabled: sc?.tunjangan_transport?.enabled ?? false, override: false },
    tunjangan_lama_bekerja: { amount: sc?.tunjangan_lama_bekerja?.amount ?? 0, enabled: sc?.tunjangan_lama_bekerja?.enabled ?? false, override: false },
    tunjangan_pph21: { amount: sc?.tunjangan_pph21?.amount ?? 0, enabled: sc?.tunjangan_pph21?.enabled ?? false, override: false },
  }
  return defaults
}

function monthLabel(year: number, month: number) {
  return `${ID_MONTHS[month]} ${year}`
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    label: monthLabel(year, month),
  }
}

export default function BulkGeneratePage() {
  const role = useAdminGuard()
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const [templateId, setTemplateId] = useState('')
  const [periodMode, setPeriodMode] = useState<'auto' | 'manual'>('auto')
  const [startDate, setStartDate] = useState('')
  const [months, setMonths] = useState(1)
  const [manualPeriods, setManualPeriods] = useState<ManualPeriod[]>([])

  const [globalOverrides, setGlobalOverrides] = useState<SalaryComponentsOverride>(defaultOverride())
  const [employeeOverrides, setEmployeeOverrides] = useState<Record<string, SalaryComponentsOverride>>({})
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const [manualPph21, setManualPph21] = useState(0)
  const [manualBpjsKesehatan, setManualBpjsKesehatan] = useState(0)
  const [manualBpjsTkJht, setManualBpjsTkJht] = useState(0)
  const [manualBpjsTkJp, setManualBpjsTkJp] = useState(0)

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
    setManualPeriods([{ id: crypto.randomUUID(), startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0], label: monthLabel(s.getFullYear(), s.getMonth()) }])

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

  // Build periods based on mode
  function buildPeriods() {
    if (periodMode === 'manual') {
      return manualPeriods.map(p => ({ startDate: p.startDate, endDate: p.endDate, label: p.label }))
    }
    if (!startDate) return []
    if (months <= 1) {
      const s = new Date(startDate)
      if (isNaN(s.getTime())) return []
      return [monthRange(s.getFullYear(), s.getMonth())]
    }
    const base = new Date(startDate)
    if (isNaN(base.getTime())) return []
    return Array.from({ length: months }, (_, i) => monthRange(base.getFullYear(), base.getMonth() + i))
  }

  function addManualPeriod() {
    const last = manualPeriods[manualPeriods.length - 1]
    const lastEnd = new Date(last?.endDate || new Date())
    const nextStart = new Date(lastEnd.getFullYear(), lastEnd.getMonth() + 1, 1)
    const nextEnd = new Date(nextStart.getFullYear(), nextStart.getMonth() + 1, 0)
    setManualPeriods([...manualPeriods, {
      id: crypto.randomUUID(),
      startDate: nextStart.toISOString().split('T')[0],
      endDate: nextEnd.toISOString().split('T')[0],
      label: monthLabel(nextStart.getFullYear(), nextStart.getMonth()),
    }])
  }

  function removeManualPeriod(id: string) {
    setManualPeriods(manualPeriods.filter(p => p.id !== id))
  }

  function updateManualPeriod(id: string, field: 'startDate' | 'endDate', value: string) {
    setManualPeriods(periods => periods.map(p => {
      if (p.id !== id) return p
      const newP = { ...p, [field]: value }
      const s = new Date(field === 'startDate' ? value : p.startDate)
      const e = new Date(field === 'endDate' ? value : p.endDate)
      newP.label = `${ID_MONTHS[s.getMonth()]} ${s.getFullYear()}`
      return newP
    }))
  }

  function setGlobalOverride(key: keyof SalaryComponentsOverride, field: 'amount' | 'enabled' | 'override', value: number | boolean) {
    setGlobalOverrides(p => ({ ...p, [key]: { ...p[key], [field]: value } }))
  }

  function toggleEmployeeExpanded(empId: string) {
    setExpandedRows(p => ({ ...p, [empId]: !p[empId] }))
  }

  function setEmployeeOverride(empId: string, key: keyof SalaryComponentsOverride, field: 'amount' | 'enabled' | 'override', value: number | boolean) {
    setEmployeeOverrides(p => ({
      ...p,
      [empId]: {
        ...defaultOverride(employees.find(e => e.id === empId)?.salaryComponents),
        ...p[empId],
        [key]: { ...p[empId]?.[key], [field]: value }
      }
    }))
  }

  function getEffectiveComponents(empId: string): SalaryComponentsOverride {
    const emp = employees.find(e => e.id === empId)
    const defaults = defaultOverride(emp?.salaryComponents)
    const empOverride = employeeOverrides[empId]
    if (!empOverride) return defaults

    const result: SalaryComponentsOverride = { ...defaults }
    for (const key of Object.keys(defaults) as (keyof SalaryComponentsOverride)[]) {
      if (empOverride[key]?.override) {
        result[key] = empOverride[key]
      }
    }
    return result
  }

  function countActiveComponents(empId: string) {
    const comps = getEffectiveComponents(empId)
    return Object.values(comps).filter(c => c.enabled).length
  }

  const total = buildPeriods().length * employees.length

  const generate = async () => {
    if (!templateId) { toast.error('Pilih template terlebih dahulu'); return }
    const periods = buildPeriods()
    setRunning(true); setDone(false); setResults([]); setProgress(0)

    const out: ResultItem[] = []
    let count = 0

    for (const period of periods) {
      for (const emp of employees) {
        const comps = getEffectiveComponents(emp.id)
        const salaryComponents = {} as Record<string, { amount: number; enabled: boolean }>
        for (const [key, val] of Object.entries(comps)) {
          if (val.enabled) {
            salaryComponents[key] = { amount: val.amount, enabled: true }
          }
        }

        try {
          const res = await fetch('/api/payslips', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: emp.id, templateId, periodType: 'monthly',
              startDate: period.startDate, endDate: period.endDate,
              basePay: Number(emp.baseSalary), overtimeHours: 0,
              hourlyRate: 0, bonus: 0, thr: 0,
              salaryComponents,
              allowances: [], otherDeductions: [],
              pph21: manualPph21, bpjsKesehatan: manualBpjsKesehatan,
              bpjsTkJht: manualBpjsTkJht, bpjsTkJp: manualBpjsTkJp,
              notes: '',
            }),
          })
          if (!res.ok) throw new Error((await res.json()).error || 'Gagal')
          const d = await res.json()
          out.push({ employeeId: emp.id, employeeName: emp.name, period: period.label, ok: true, payslipId: d.payslipId })
        } catch (err) {
          out.push({ employeeId: emp.id, employeeName: emp.name, period: period.label, ok: false, error: err instanceof Error ? err.message : 'Error' })
        }
        count++
        setProgress(count)
        setResults([...out])
      }
    }

    setRunning(false); setDone(true)
    const ok = out.filter(r => r.ok).length
    toast.success(`${ok} dari ${total} slip gaji berhasil dibuat`)
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
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900 }}>

        {/* Config */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label" style={{ marginBottom: 16 }}>Konfigurasi</p>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Loader2 style={{ width: 18, height: 18, ...SPIN, color: 'var(--text-tertiary)' }} />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Template</label>
                <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (default)' : ''}</option>)}
                </select>
              </div>

              {/* Period Mode Toggle */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Periode</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setPeriodMode('auto')}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      background: periodMode === 'auto' ? 'var(--accent)' : 'var(--bg-surface)',
                      color: periodMode === 'auto' ? '#fff' : 'var(--text-secondary)',
                      borderColor: periodMode === 'auto' ? 'var(--accent)' : 'var(--border-strong)',
                    }}
                  >
                    Otomatis
                  </button>
                  <button
                    onClick={() => setPeriodMode('manual')}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      background: periodMode === 'manual' ? 'var(--accent)' : 'var(--bg-surface)',
                      color: periodMode === 'manual' ? '#fff' : 'var(--text-secondary)',
                      borderColor: periodMode === 'manual' ? 'var(--accent)' : 'var(--border-strong)',
                    }}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {/* Period inputs */}
              {periodMode === 'auto' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Bulan Mulai</label>
                    <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Jumlah Bulan</label>
                    <input type="number" className="input" min={1} max={12} value={months} onChange={e => setMonths(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {manualPeriods.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 20 }}>{i + 1}.</span>
                      <input type="date" className="input" style={{ flex: 1 }} value={p.startDate} onChange={e => updateManualPeriod(p.id, 'startDate', e.target.value)} />
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>s/d</span>
                      <input type="date" className="input" style={{ flex: 1 }} value={p.endDate} onChange={e => updateManualPeriod(p.id, 'endDate', e.target.value)} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 100 }}>{p.label}</span>
                      {manualPeriods.length > 1 && (
                        <button onClick={() => removeManualPeriod(p.id)} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }}>
                          <X style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addManualPeriod} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', color: 'var(--accent)' }}>
                    <Plus style={{ width: 12, height: 12 }} /> Tambah Bulan
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Apply to All Override */}
        {!loading && employees.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Override Semua Karyawan</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {(Object.keys(globalOverrides) as (keyof SalaryComponentsOverride)[]).map(key => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                  <input
                    type="checkbox"
                    checked={globalOverrides[key].override}
                    onChange={e => setGlobalOverride(key, 'override', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <label style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, minWidth: 0 }}>{SALARY_COMPONENT_LABELS[key]}</label>
                  <input
                    type="number"
                    className="input"
                    style={{ fontSize: 12, width: 90 }}
                    value={globalOverrides[key].amount || ''}
                    onChange={e => setGlobalOverride(key, 'amount', Number(e.target.value) || 0)}
                    placeholder="0"
                    disabled={!globalOverrides[key].override}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Deductions */}
        {!loading && employees.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Potongan Manual</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {([
                { label: 'PPh 21', value: manualPph21, set: setManualPph21 },
                { label: 'BPJS Kesehatan', value: manualBpjsKesehatan, set: setManualBpjsKesehatan },
                { label: 'BPJS TK JHT', value: manualBpjsTkJht, set: setManualBpjsTkJht },
                { label: 'BPJS TK JP', value: manualBpjsTkJp, set: setManualBpjsTkJp },
              ] as const).map(({ label, value, set }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</label>
                  <div className="input-prefix">
                    <span className="prefix">Rp</span>
                    <input
                      type="number"
                      className="input"
                      value={value || ''}
                      onChange={e => set(Number(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              <Users style={{ width: 13, height: 13, display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              {total} slip gaji ({employees.length} karyawan × {buildPeriods().length} periode)
            </span>
            <button onClick={generate} disabled={running || done} className="btn btn-primary">
              {running && <Loader2 style={{ width: 14, height: 14, ...SPIN }} />}
              {running ? `Memproses... (${progress}/${total})` : done ? 'Selesai' : 'Generate Semua'}
            </button>
          </div>
        )}

        {/* Progress */}
        {(running || done) && total > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Progress</p>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{progress}/{total}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'var(--accent)', width: `${(progress / total) * 100}%`, transition: 'width 0.2s ease' }} />
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

        {/* Employee Table */}
        {!loading && employees.length > 0 && (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Karyawan</th>
                  <th style={{ textAlign: 'right' }}>Gaji Pokok</th>
                  <th style={{ textAlign: 'right' }}>Komponen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const override = employeeOverrides[emp.id]
                  const activeCount = countActiveComponents(emp.id)
                  return (
                    <Fragment key={emp.id}>
                      <tr className="group">
                        <td>
                          <button
                            onClick={() => toggleEmployeeExpanded(emp.id)}
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {expandedRows[emp.id] ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar avatar-sm avatar-blue">{emp.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{emp.name}</p>
                              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{emp.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(Number(emp.baseSalary))}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="badge badge-gray">{activeCount} komponen</span>
                        </td>
                        <td>
                          {(() => {
                            const result = results.find(r => r.employeeId === emp.id)
                            if (!result) return null
                            return result.ok
                              ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#16a34a' }}><CheckCircle2 style={{ width: 13, height: 13 }} /> Berhasil</span>
                              : <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--danger)' }}><XCircle style={{ width: 13, height: 13 }} /> {result.error}</span>
                          })()}
                        </td>
                      </tr>
                      {expandedRows[emp.id] && (
                        <tr key={`${emp.id}-expanded`}>
                          <td colSpan={5} style={{ background: 'var(--bg-subtle)', padding: '12px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                              {(Object.keys(defaultOverride()) as (keyof SalaryComponentsOverride)[]).map(key => {
                                const canEdit = globalOverrides[key].override
                                const empVal = employeeOverrides[emp.id]?.[key]
                                const effectiveEnabled = canEdit ? (empVal?.enabled ?? false) : (emp.salaryComponents?.[key]?.enabled ?? false)
                                const effectiveAmount = canEdit ? (empVal?.amount ?? 0) : (emp.salaryComponents?.[key]?.amount ?? 0)
                                return (
                                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canEdit ? 'pointer' : 'default' }}>
                                      <input
                                        type="checkbox"
                                        checked={effectiveEnabled}
                                        onChange={e => { if (canEdit) setEmployeeOverride(emp.id, key, 'enabled', e.target.checked) }}
                                        disabled={!canEdit}
                                        style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: canEdit ? 'pointer' : 'default', flexShrink: 0 }}
                                      />
                                      <span style={{ fontSize: 12, fontWeight: 500, color: canEdit ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{SALARY_COMPONENT_LABELS[key]}</span>
                                    </label>
                                    <div className="input-prefix">
                                      <span className="prefix">Rp</span>
                                      <input
                                        type="number"
                                        className="input"
                                        style={{ fontSize: 13, height: 34 }}
                                        value={effectiveAmount || ''}
                                        onChange={e => { if (canEdit) setEmployeeOverride(emp.id, key, 'amount', Number(e.target.value) || 0) }}
                                        placeholder="0"
                                        disabled={!canEdit}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
