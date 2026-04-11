'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Loader2, Users, Receipt, FileInput } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { useImportWizard, PreviewRow } from '@/lib/hooks/use-import-wizard'
import { useAdminGuard } from '@/lib/hooks/use-role'

const EMPLOYEE_FIELDS = [
  { value: '',               label: '— tidak dipetakan —' },
  { value: 'name',           label: 'Nama' },
  { value: 'employeeId',     label: 'ID Karyawan' },
  { value: 'email',          label: 'Email' },
  { value: 'whatsappNumber', label: 'WhatsApp' },
  { value: 'department',     label: 'Divisi' },
  { value: 'position',       label: 'Jabatan' },
  { value: 'site',           label: 'Site' },
  { value: 'baseSalary',     label: 'Gaji Pokok' },
  { value: 'pph21Status',    label: 'Status PPh21' },
  { value: 'npwp',           label: 'NPWP' },
  { value: 'bankAccount',    label: 'No Rekening' },
  { value: 'bankName',       label: 'Nama Bank' },
]

// ─── Shared toast type ────────────────────────────────────────────────────────

type ToastHandle = ReturnType<typeof useToast>

// ─── Export Section ───────────────────────────────────────────────────────────

function ExportSection({ toast }: { toast: ToastHandle }) {
  const [payslipMonth, setPayslipMonth] = useState('')
  const [dlEmployee, setDlEmployee] = useState(false)
  const [dlPayslip, setDlPayslip] = useState(false)

  const download = useCallback(async (url: string, filename: string, setLoading: (v: boolean) => void) => {
    setLoading(true)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Gagal mengunduh file')
        return
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch {
      toast.error('Gagal mengunduh file')
    } finally {
      setLoading(false)
    }
  }, [toast])

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
        Export Data
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
        Unduh data karyawan atau rekapitulasi slip gaji dalam format .xlsx
      </p>

      <div className="form-grid-2" style={{ gap: 12 }}>
        {/* Employee export */}
        <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Users style={{ width: 16, height: 16, color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Karyawan</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 14px' }}>
            Semua karyawan aktif beserta detail kompensasi dan data bank
          </p>
          <button
            className="btn btn-secondary btn-sm"
            disabled={dlEmployee}
            onClick={() => download('/api/employees/export', 'karyawan.xlsx', setDlEmployee)}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {dlEmployee
              ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              : <Download style={{ width: 14, height: 14 }} />
            }
            Export Karyawan
          </button>
        </div>

        {/* Payslip export */}
        <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Receipt style={{ width: 16, height: 16, color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Slip Gaji</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
            Rekap slip gaji per bulan (atau semua waktu jika tidak difilter)
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="month"
              value={payslipMonth}
              onChange={e => setPayslipMonth(e.target.value)}
              className="input"
              style={{ flex: 1, fontSize: 13, height: 32 }}
              placeholder="Semua bulan"
            />
            <button
              className="btn btn-secondary btn-sm"
              disabled={dlPayslip}
              onClick={() => {
                const qs = payslipMonth ? `?month=${payslipMonth}` : ''
                const name = payslipMonth ? `slip-gaji-${payslipMonth}.xlsx` : 'slip-gaji-semua.xlsx'
                download(`/api/payslips/export${qs}`, name, setDlPayslip)
              }}
              style={{ flexShrink: 0 }}
            >
              {dlPayslip
                ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                : <Download style={{ width: 14, height: 14 }} />
              }
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Import Section ───────────────────────────────────────────────────────────

function ImportSection({ toast }: { toast: ToastHandle }) {
  const wizard = useImportWizard()
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Format file harus .xlsx, .xls, atau .csv')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import-excel', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal memproses file'); return }
      wizard.setParsedFile(data)
      wizard.goToStep('map')
    } finally {
      setLoading(false)
    }
  }, [toast, wizard])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  const loadPreview = useCallback(async () => {
    if (!wizard.parsedFile) return
    setLoading(true)
    try {
      const res = await fetch('/api/import-excel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: wizard.parsedFile.rows, mappings: wizard.mappings }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal membuat preview'); return }
      wizard.setPreviewResults(data.preview, data.totalValid, data.totalInvalid)
      wizard.goToStep('preview')
    } finally {
      setLoading(false)
    }
  }, [wizard, toast])

  const commit = useCallback(async () => {
    if (!wizard.parsedFile) return
    setLoading(true)
    try {
      const res = await fetch('/api/import-excel/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: wizard.parsedFile.rows, mappings: wizard.mappings, skipInvalid: wizard.totalInvalid > 0 }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal menyimpan data'); return }
      wizard.setResult(data)
      wizard.goToStep('done')
    } finally {
      setLoading(false)
    }
  }, [wizard, toast])

  const reset = () => {
    wizard.reset()
  }

  // ── Step: upload ────────────────────────────────────────────────────────────
  if (wizard.step === 'upload') {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Import Karyawan
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          Upload file Excel atau CSV dengan data karyawan untuk diimpor secara massal
        </p>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--accent-light)' : 'var(--bg-subtle)',
            transition: 'border-color 150ms, background 150ms',
          }}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onFileInput} />
          {loading ? (
            <Loader2 style={{ width: 32, height: 32, color: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          ) : (
            <FileSpreadsheet style={{ width: 32, height: 32, color: 'var(--text-tertiary)', margin: '0 auto 12px' }} />
          )}
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            {loading ? 'Memproses file...' : 'Klik atau drag & drop file di sini'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
            Format yang didukung: .xlsx, .xls, .csv
          </p>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Kolom yang didukung:</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
              ID Karyawan, Nama, Email, WhatsApp, Divisi, Jabatan, Site, Gaji Pokok, Status PPh21, NPWP, Nama Bank, No Rekening
            </p>
          </div>
          <a
            href="/api/employees/import-template"
            download="template-import-karyawan.xlsx"
            className="btn btn-secondary btn-sm"
            style={{ flexShrink: 0 }}
          >
            <Download style={{ width: 13, height: 13 }} /> Unduh Template
          </a>
        </div>
      </div>
    )
  }

  // ── Step: map ───────────────────────────────────────────────────────────────
  if (wizard.step === 'map' && wizard.parsedFile) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Pemetaan Kolom
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{wizard.parsedFile.totalRows} baris ditemukan</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          Cocokkan kolom dari file Excel dengan field karyawan. Kolom yang sudah dideteksi otomatis ditampilkan di bawah.
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  Kolom di File
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  Contoh Data
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', width: 200 }}>
                  Field Karyawan
                </th>
              </tr>
            </thead>
            <tbody>
              {wizard.parsedFile.headers.map((header: string, i: number) => {
                const sample = wizard.parsedFile?.rows[0]?.[header]
                return (
                  <tr key={header} style={{ borderBottom: i < wizard.parsedFile!.headers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{header}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: 12 }}>
                      {sample !== null && sample !== undefined ? String(sample) : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <select
                        value={wizard.mappings[header] ?? ''}
                        onChange={e => wizard.setMappings({ ...wizard.mappings, [header]: e.target.value })}
                        style={{ fontSize: 12, height: 28, width: '100%', padding: '0 6px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-input, #fff)', color: 'var(--text-primary)', outline: 'none' }}
                      >
                        {EMPLOYEE_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={reset}>Batal</button>
          <button className="btn btn-primary" onClick={loadPreview} disabled={loading}>
            {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
            Lihat Preview
          </button>
        </div>
      </div>
    )
  }

  // ── Step: preview ────────────────────────────────────────────────────────────
  if (wizard.step === 'preview') {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Preview Import</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 5, padding: '3px 10px' }}>
              {wizard.totalValid} valid
            </span>
            {wizard.totalInvalid > 0 && (
              <span style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, padding: '3px 10px' }}>
                {wizard.totalInvalid} tidak valid
              </span>
            )}
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          Menampilkan hingga 10 baris pertama.{wizard.totalInvalid > 0 ? ' Baris tidak valid akan dilewati.' : ''}
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', width: 32 }}></th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>ID</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Nama</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Divisi</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Gaji Pokok</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Masalah</th>
              </tr>
            </thead>
            <tbody>
              {wizard.previewRows.map((row: PreviewRow, i: number) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < wizard.previewRows.length - 1 ? '1px solid var(--border)' : 'none',
                    background: row.valid ? undefined : '#fff8f8',
                  }}
                >
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    {row.valid
                      ? <CheckCircle2 style={{ width: 14, height: 14, color: '#16a34a' }} />
                      : <XCircle style={{ width: 14, height: 14, color: '#dc2626' }} />
                    }
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: 12 }}>
                    {String(row.data.employeeId ?? '—')}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {String(row.data.name ?? '—')}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                    {String(row.data.department ?? '—')}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.data.baseSalary != null
                      ? Number(row.data.baseSalary).toLocaleString('id-ID')
                      : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {row.errors.length > 0 && (
                      <span style={{ fontSize: 12, color: '#dc2626' }}>{row.errors.join(', ')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {wizard.totalInvalid > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 16 }}>
            <AlertCircle style={{ width: 14, height: 14, color: '#d97706', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
              {wizard.totalInvalid} baris tidak valid akan dilewati. Hanya {wizard.totalValid} baris yang akan diimpor.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => wizard.goToStep('map')}>Kembali</button>
          <button className="btn btn-primary" onClick={commit} disabled={loading || wizard.totalValid === 0}>
            {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
            Import {wizard.totalValid} Karyawan
          </button>
        </div>
      </div>
    )
  }

  // ── Step: done ───────────────────────────────────────────────────────────────
  if (wizard.step === 'done' && wizard.result) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <CheckCircle2 style={{ width: 40, height: 40, color: '#16a34a', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Import Selesai
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          {wizard.result.created} karyawan berhasil diimpor{wizard.result.skipped > 0 ? `, ${wizard.result.skipped} baris dilewati` : ''}.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Link href="/employees" className="btn btn-secondary">Lihat Karyawan</Link>
          <button className="btn btn-primary" onClick={reset}>Import Lagi</button>
        </div>
      </div>
    )
  }

  return null
}

// ─── Payslip Import Section ──────────────────────────────────────────────────

type PayslipPreviewRow = {
  valid: boolean
  errors: string[]
  warnings: string[]
  row: Record<string, string | number | null>
  employee: { id: string; employeeId: string; name: string } | null
  payslip: { basePay: number; bonus: number; thr: number; pph21: number; grossPay: number; netPay: number } | null
}

function PayslipImportSection({ toast }: { toast: ToastHandle }) {
  const [step, setStep] = useState<'upload' | 'configure' | 'preview' | 'done'>('upload')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [rows, setRows] = useState<Record<string, string | number | null>[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [templateId, setTemplateId] = useState('')
  const [periodType, setPeriodType] = useState('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [preview, setPreview] = useState<PayslipPreviewRow[]>([])
  const [totalValid, setTotalValid] = useState(0)
  const [totalInvalid, setTotalInvalid] = useState(0)
  const [totalWarnings, setTotalWarnings] = useState(0)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: { row: number; error: string }[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(d => {
      setTemplates(d.templates ?? [])
      if (d.templates?.length) setTemplateId(d.templates.find((t: { isDefault: boolean }) => t.isDefault)?.id ?? d.templates[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (periodType === 'monthly') {
      const now = new Date()
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setStartDate(s.toISOString().split('T')[0])
      setEndDate(e.toISOString().split('T')[0])
    }
  }, [periodType])

  const rowHasAllMeta = (row: Record<string, string | number | null>) => {
    const get = (keys: string[]) => keys.reduce<string>((acc, k) => acc || String(row[k] ?? '').trim(), '')
    return (
      get(['Periode (Opsional)', 'Periode', 'periode']) &&
      get(['Tanggal Mulai (Opsional)', 'Tanggal Mulai', 'tanggal mulai']) &&
      get(['Tanggal Selesai (Opsional)', 'Tanggal Selesai', 'tanggal selesai']) &&
      get(['Template (Opsional)', 'Template', 'template'])
    )
  }

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { toast.error('Format file harus .xlsx, .xls, atau .csv'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/payslips/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal memproses file'); return }
      setRows(data.rows)
      setTotalRows(data.totalRows)

      // If every row already has period/dates/template, skip configure and go straight to preview
      if (data.rows.length > 0 && data.rows.every(rowHasAllMeta)) {
        const previewRes = await fetch('/api/payslips/import/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: data.rows, templateId: '', periodType: '', startDate: '', endDate: '' }),
        })
        const previewData = await previewRes.json()
        if (!previewRes.ok) { toast.error(previewData.error || 'Gagal membuat preview'); return }
        setPreview(previewData.preview)
        setTotalValid(previewData.totalValid)
        setTotalInvalid(previewData.totalInvalid)
        setTotalWarnings(previewData.totalWarnings)
        setStep('preview')
      } else {
        setStep('configure')
      }
    } finally { setLoading(false) }
  }, [toast])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f)
  }

  const loadPreview = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payslips/import/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, templateId, periodType, startDate, endDate }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal membuat preview'); return }
      setPreview(data.preview)
      setTotalValid(data.totalValid)
      setTotalInvalid(data.totalInvalid)
      setTotalWarnings(data.totalWarnings)
      setStep('preview')
    } finally { setLoading(false) }
  }, [rows, templateId, periodType, startDate, endDate, toast])

  const commit = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payslips/import/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, templateId, periodType, startDate, endDate, skipDuplicates: true }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal menyimpan slip gaji'); return }
      setResult(data)
      setStep('done')
    } finally { setLoading(false) }
  }, [rows, templateId, periodType, startDate, endDate, toast])

  const reset = () => {
    setStep('upload'); setRows([]); setPreview([]); setResult(null)
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  if (step === 'upload') return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Import Slip Gaji</h2>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
        Upload file Excel dengan data slip gaji. Karyawan harus sudah terdaftar di sistem.
      </p>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'var(--accent-light)' : 'var(--bg-subtle)', transition: 'border-color 150ms, background 150ms' }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onFileInput} />
        {loading
          ? <Loader2 style={{ width: 32, height: 32, color: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          : <FileInput style={{ width: 32, height: 32, color: 'var(--text-tertiary)', margin: '0 auto 12px' }} />
        }
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          {loading ? 'Memproses file...' : 'Klik atau drag & drop file di sini'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>Format: .xlsx, .xls, .csv</p>
      </div>
      <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Kolom yang didukung:</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
            ID Karyawan (wajib), Periode, Tanggal Mulai, Tanggal Selesai, Template, Gaji Pokok, Tunjangan Jabatan, Tunjangan Luar Kota, Tunjangan Makan, Tunjangan Transport, Tunjangan Lama Kerja, Insentif, Tunjangan PPh 21, Bonus, THR, PPh21, BPJS Kesehatan, BPJS TK JHT, BPJS TK JP, Potongan Lain, Catatan
          </p>
        </div>
        <a href="/api/payslips/import/template" download="template-import-slip-gaji.xlsx" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
          <Download style={{ width: 13, height: 13 }} /> Unduh Template
        </a>
      </div>
    </div>
  )

  if (step === 'configure') return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Konfigurasi Periode</h2>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{totalRows} baris ditemukan</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
        Tentukan periode dan template untuk semua slip gaji yang akan diimpor.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Template</label>
          <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)} style={{ fontSize: 13 }}>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Tipe Periode</label>
          <select className="input" value={periodType} onChange={e => setPeriodType(e.target.value)} style={{ fontSize: 13 }}>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
            <option value="quarterly">3 Bulanan</option>
            <option value="semi-annual">6 Bulanan</option>
            <option value="annual">Tahunan</option>
          </select>
        </div>
        <div className="form-grid-2" style={{ gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Tanggal Mulai</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Tanggal Selesai</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ fontSize: 13 }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={reset}>Batal</button>
        <button className="btn btn-primary" onClick={loadPreview} disabled={loading || !templateId || !startDate || !endDate}>
          {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
          Lihat Preview
        </button>
      </div>
    </div>
  )

  if (step === 'preview') return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Preview Import Slip Gaji</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 5, padding: '3px 10px' }}>{totalValid} valid</span>
          {totalInvalid > 0 && <span style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, padding: '3px 10px' }}>{totalInvalid} error</span>}
          {totalWarnings > 0 && <span style={{ fontSize: 12, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: '3px 10px' }}>{totalWarnings} duplikat</span>}
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
        Periode: {startDate} s/d {endDate}. Duplikat akan dilewati.
      </p>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)' }}>
              {['', 'ID', 'Nama', 'Gaji Pokok', 'Gaji Kotor', 'Gaji Bersih', 'Keterangan'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Gaji Pokok' || h === 'Gaji Kotor' || h === 'Gaji Bersih' ? 'right' : 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((p, i) => (
              <tr key={i} style={{ borderBottom: i < preview.length - 1 ? '1px solid var(--border)' : 'none', background: !p.valid ? '#fff8f8' : p.warnings?.length ? '#fffbeb' : undefined }}>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  {p.valid
                    ? p.warnings?.length ? <AlertCircle style={{ width: 14, height: 14, color: '#d97706' }} /> : <CheckCircle2 style={{ width: 14, height: 14, color: '#16a34a' }} />
                    : <XCircle style={{ width: 14, height: 14, color: '#dc2626' }} />
                  }
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: 12 }}>{p.employee?.employeeId ?? String(p.row['ID Karyawan'] ?? '—')}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.employee?.name ?? '—'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{p.payslip ? formatCurrency(p.payslip.basePay) : '—'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{p.payslip ? formatCurrency(p.payslip.grossPay) : '—'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{p.payslip ? formatCurrency(p.payslip.netPay) : '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: 12 }}>
                  {p.errors?.length ? <span style={{ color: '#dc2626' }}>{p.errors.join(', ')}</span>
                    : p.warnings?.length ? <span style={{ color: '#d97706' }}>{p.warnings.join(', ')}</span>
                    : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={() => setStep('configure')}>Kembali</button>
        <button className="btn btn-primary" onClick={commit} disabled={loading || totalValid === 0}>
          {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
          Import {totalValid} Slip Gaji
        </button>
      </div>
    </div>
  )

  if (step === 'done' && result) return (
    <div className="card" style={{ padding: 24, textAlign: 'center' }}>
      <CheckCircle2 style={{ width: 40, height: 40, color: '#16a34a', margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>Import Selesai</h2>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
        {result.created} slip gaji berhasil dibuat{result.skipped > 0 ? `, ${result.skipped} duplikat dilewati` : ''}.
      </p>
      {result.errors.length > 0 && (
        <div style={{ textAlign: 'left', marginBottom: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          {result.errors.map((e, i) => <p key={i} style={{ fontSize: 12, color: '#dc2626', margin: '2px 0' }}>Baris {e.row}: {e.error}</p>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Link href="/payslips" className="btn btn-secondary">Lihat Slip Gaji</Link>
        <button className="btn btn-primary" onClick={reset}>Import Lagi</button>
      </div>
    </div>
  )

  return null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DataPage() {
  const role = useAdminGuard()
  const toast = useToast()

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Data" subtitle="Import dan export data karyawan & slip gaji" />
      <div style={{ padding: 12, maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ExportSection toast={toast} />
        <ImportSection toast={toast} />
        <PayslipImportSection toast={toast} />
      </div>
    </div>
  )
}
