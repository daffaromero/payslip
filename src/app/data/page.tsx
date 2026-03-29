'use client'

import { useState, useRef, useCallback } from 'react'
import { Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Loader2, Users, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ToastContainer, useToast } from '@/components/ui/toast'

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'map' | 'preview' | 'done'

interface ParsedFile {
  headers: string[]
  rows: Record<string, string | number | null>[]
  totalRows: number
  autoMappings: Record<string, string>
}

interface PreviewRow {
  data: Record<string, string | number | boolean | null>
  errors: string[]
  valid: boolean
}

interface ImportResult {
  created: number
  skipped: number
  errors: { row: number; errors: string[] }[]
}

const EMPLOYEE_FIELDS = [
  { value: '',             label: '— tidak dipetakan —' },
  { value: 'name',         label: 'Nama' },
  { value: 'employeeId',   label: 'ID Karyawan' },
  { value: 'email',        label: 'Email' },
  { value: 'department',   label: 'Departemen' },
  { value: 'position',     label: 'Jabatan' },
  { value: 'baseSalary',   label: 'Gaji Pokok' },
  { value: 'npwp',         label: 'NPWP' },
  { value: 'bankAccount',  label: 'No Rekening' },
  { value: 'bankName',     label: 'Nama Bank' },
]

// ─── Shared toast type ────────────────────────────────────────────────────────

type ToastHandle = ReturnType<typeof useToast>

// ─── Export Section ───────────────────────────────────────────────────────────

function ExportSection() {
  const [payslipMonth, setPayslipMonth] = useState('')
  const [dlEmployee, setDlEmployee] = useState(false)
  const [dlPayslip, setDlPayslip] = useState(false)

  const download = useCallback((url: string, filename: string, setLoading: (v: boolean) => void) => {
    setLoading(true)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // give a moment for the download to initiate before resetting
    setTimeout(() => setLoading(false), 1200)
  }, [])

  return (
    <div className="card" style={{ padding: 24, marginBottom: 12 }}>
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
            onClick={() => download('/api/export/employees', 'karyawan.xlsx', setDlEmployee)}
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
                download(`/api/export/payslips${qs}`, name, setDlPayslip)
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
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [totalValid, setTotalValid] = useState(0)
  const [totalInvalid, setTotalInvalid] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
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
      setParsedFile(data)
      setMappings(data.autoMappings ?? {})
      setStep('map')
    } finally {
      setLoading(false)
    }
  }, [toast])

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
    if (!parsedFile) return
    setLoading(true)
    try {
      const res = await fetch('/api/import-excel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedFile.rows, mappings }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal membuat preview'); return }
      setPreviewRows(data.preview)
      setTotalValid(data.totalValid)
      setTotalInvalid(data.totalInvalid)
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }, [parsedFile, mappings, toast])

  const commit = useCallback(async () => {
    if (!parsedFile) return
    setLoading(true)
    try {
      const res = await fetch('/api/import-excel/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedFile.rows, mappings, skipInvalid: totalInvalid > 0 }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal menyimpan data'); return }
      setResult(data)
      setStep('done')
    } finally {
      setLoading(false)
    }
  }, [parsedFile, mappings, totalInvalid, toast])

  const reset = () => {
    setStep('upload')
    setParsedFile(null)
    setMappings({})
    setPreviewRows([])
    setResult(null)
  }

  // ── Step: upload ────────────────────────────────────────────────────────────
  if (step === 'upload') {
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

        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Kolom yang disarankan:</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
            ID Karyawan, Nama, Email, Departemen, Jabatan, Gaji Pokok, NPWP, Nama Bank, No Rekening
          </p>
        </div>
      </div>
    )
  }

  // ── Step: map ───────────────────────────────────────────────────────────────
  if (step === 'map' && parsedFile) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Pemetaan Kolom
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{parsedFile.totalRows} baris ditemukan</span>
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
              {parsedFile.headers.map((header, i) => {
                const sample = parsedFile.rows[0]?.[header]
                return (
                  <tr key={header} style={{ borderBottom: i < parsedFile.headers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{header}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: 12 }}>
                      {sample !== null && sample !== undefined ? String(sample) : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <select
                        value={mappings[header] ?? ''}
                        onChange={e => setMappings(m => ({ ...m, [header]: e.target.value }))}
                        className="input"
                        style={{ fontSize: 13, height: 32, width: '100%' }}
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
  if (step === 'preview') {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Preview Import</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 5, padding: '3px 10px' }}>
              {totalValid} valid
            </span>
            {totalInvalid > 0 && (
              <span style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, padding: '3px 10px' }}>
                {totalInvalid} tidak valid
              </span>
            )}
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          Menampilkan hingga 10 baris pertama.{totalInvalid > 0 ? ' Baris tidak valid akan dilewati.' : ''}
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', width: 32 }}></th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>ID</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Nama</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Departemen</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Gaji Pokok</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Masalah</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < previewRows.length - 1 ? '1px solid var(--border)' : 'none',
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

        {totalInvalid > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 16 }}>
            <AlertCircle style={{ width: 14, height: 14, color: '#d97706', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
              {totalInvalid} baris tidak valid akan dilewati. Hanya {totalValid} baris yang akan diimpor.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setStep('map')}>Kembali</button>
          <button className="btn btn-primary" onClick={commit} disabled={loading || totalValid === 0}>
            {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
            Import {totalValid} Karyawan
          </button>
        </div>
      </div>
    )
  }

  // ── Step: done ───────────────────────────────────────────────────────────────
  if (step === 'done' && result) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <CheckCircle2 style={{ width: 40, height: 40, color: '#16a34a', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Import Selesai
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          {result.created} karyawan berhasil diimpor{result.skipped > 0 ? `, ${result.skipped} baris dilewati` : ''}.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <a href="/employees" className="btn btn-secondary">Lihat Karyawan</a>
          <button className="btn btn-primary" onClick={reset}>Import Lagi</button>
        </div>
      </div>
    )
  }

  return null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DataPage() {
  const toast = useToast()

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Data" subtitle="Import dan export data karyawan & slip gaji" />
      <div style={{ padding: 12, maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <ExportSection />
        <ImportSection toast={toast} />
      </div>
    </div>
  )
}
