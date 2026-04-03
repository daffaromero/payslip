'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { FileText, Star, Layout, Eye, Plus, Trash2, Loader2, Pencil } from 'lucide-react'
import Link from 'next/link'
import { ToastContainer, useToast } from '@/components/ui/toast'
import type { Template } from '@/types'
import { useAdminGuard } from '@/lib/hooks/use-role'

const SECTION_LABELS: Record<string, string> = {
  companyHeader: 'Header Perusahaan',
  employeeInfo: 'Info Karyawan',
  earnings: 'Penerimaan',
  deductions: 'Potongan',
  netPay: 'Gaji Bersih',
  ytdSummary: 'YTD',
  bankDetails: 'Info Bank',
  notes: 'Catatan',
  signature: 'Tanda Tangan',
}

const BADGE_LABELS: Record<string, string> = {
  companyHeader: 'Header',
  employeeInfo: 'Karyawan',
  earnings: 'Penerimaan',
  deductions: 'Potongan',
  netPay: 'Gaji Bersih',
  ytdSummary: 'YTD',
  bankDetails: 'Bank',
  notes: 'Catatan',
  signature: 'TTD',
}

const COLOR_PRESETS = ['#1a365d', '#0066ff', '#7c3aed', '#dc2626', '#059669', '#d97706', '#0f172a', '#475569']

const EMPTY_SECTIONS = {
  companyHeader: true,
  employeeInfo: true,
  earnings: true,
  deductions: true,
  netPay: true,
  ytdSummary: false,
  bankDetails: true,
  notes: false,
  signature: false,
}

interface FormState {
  name: string
  language: 'id' | 'en'
  primaryColor: string
  secondaryColor: string
  fontFamily: 'inter' | 'roboto' | 'open-sans'
  fontSize: 'small' | 'medium' | 'large'
  pageSize: 'A4' | 'letter'
  orientation: 'portrait' | 'landscape'
  isDefault: boolean
  sections: typeof EMPTY_SECTIONS
  header: {
    showLogo: boolean
    companyName: string
    companyTagline: string
    companyAddress: string
  }
  footer: {
    showPageNumber: boolean
    customText: string
    showCompanyName: boolean
  }
}

const DEFAULT_FORM: FormState = {
  name: '',
  language: 'id',
  primaryColor: '#0066ff',
  secondaryColor: '#3b82f6',
  fontFamily: 'inter',
  fontSize: 'medium',
  pageSize: 'A4',
  orientation: 'portrait',
  isDefault: false,
  sections: { ...EMPTY_SECTIONS },
  header: { showLogo: true, companyName: '', companyTagline: '', companyAddress: '' },
  footer: { showPageNumber: true, customText: '', showCompanyName: true },
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {COLOR_PRESETS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            style={{
              width: 24, height: 24, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', flexShrink: 0,
              boxShadow: value === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : '0 0 0 1px rgba(0,0,0,0.1)',
            }}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          title="Warna kustom"
          style={{ width: 24, height: 24, padding: 0, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', background: 'none' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
    </div>
  )
}

function TemplateModal({
  open, onClose, onSaved, editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: Template | null
}) {
  const toast = useToast()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        language: editing.language,
        primaryColor: editing.theme.primaryColor,
        secondaryColor: editing.theme.secondaryColor,
        fontFamily: editing.theme.fontFamily,
        fontSize: editing.theme.fontSize,
        pageSize: editing.layout.pageSize,
        orientation: editing.layout.orientation,
        isDefault: editing.isDefault,
        sections: { ...editing.sections },
        header: {
          showLogo: editing.header?.showLogo ?? true,
          companyName: editing.header?.companyName ?? '',
          companyTagline: editing.header?.companyTagline ?? '',
          companyAddress: editing.header?.companyAddress ?? '',
        },
        footer: {
          showPageNumber: editing.footer?.showPageNumber ?? true,
          customText: editing.footer?.customText ?? '',
          showCompanyName: editing.footer?.showCompanyName ?? true,
        },
      })
    } else {
      setForm({ ...DEFAULT_FORM, sections: { ...EMPTY_SECTIONS } })
    }
  }, [editing, open])

  if (!open) return null

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }))
  const setSection = (k: string, v: boolean) => setForm(p => ({ ...p, sections: { ...p.sections, [k]: v } }))
  const setHeader = <K extends keyof FormState['header']>(k: K, v: string | boolean) => setForm(p => ({ ...p, header: { ...p.header, [k]: v } }))
  const setFooter = <K extends keyof FormState['footer']>(k: K, v: string | boolean) => setForm(p => ({ ...p, footer: { ...p.footer, [k]: v } }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        name: form.name,
        type: 'custom',
        language: form.language,
        isDefault: form.isDefault,
        layout: { orientation: form.orientation, pageSize: form.pageSize, columns: 1 },
        theme: { primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, fontFamily: form.fontFamily, fontSize: form.fontSize },
        sections: form.sections,
        header: form.header,
        footer: form.footer,
        customFields: [],
      }
      const url = editing ? `/api/templates/${editing.id}` : '/api/templates'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menyimpan')
      toast.success(editing ? 'Template diperbarui' : 'Template berhasil dibuat')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', background: 'rgba(0,0,0,0.4)', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 24 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
          {editing ? 'Edit Template' : 'Buat Template Baru'}
        </h2>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Nama Template *</label>
            <input required className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Contoh: Slip Gaji Modern" />
          </div>

          {/* Language */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Bahasa</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['id', 'en'] as const).map(lang => (
                <button key={lang} type="button" onClick={() => set('language', lang)}
                  style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    background: form.language === lang ? 'var(--accent)' : 'var(--bg-surface)',
                    color: form.language === lang ? '#fff' : 'var(--text-secondary)',
                    borderColor: form.language === lang ? 'var(--accent)' : 'var(--border-strong)',
                  }}>
                  {lang === 'id' ? 'Bahasa Indonesia' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <ColorPicker label="Warna Primer" value={form.primaryColor} onChange={v => set('primaryColor', v)} />
          <ColorPicker label="Warna Sekunder" value={form.secondaryColor} onChange={v => set('secondaryColor', v)} />

          {/* Font + Size */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Font</label>
              <select className="input" value={form.fontFamily} onChange={e => set('fontFamily', e.target.value as FormState['fontFamily'])}>
                <option value="inter">Inter</option>
                <option value="roboto">Roboto</option>
                <option value="open-sans">Open Sans</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Ukuran Teks</label>
              <select className="input" value={form.fontSize} onChange={e => set('fontSize', e.target.value as FormState['fontSize'])}>
                <option value="small">Kecil</option>
                <option value="medium">Sedang</option>
                <option value="large">Besar</option>
              </select>
            </div>
          </div>

          {/* Page */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Ukuran Halaman</label>
              <select className="input" value={form.pageSize} onChange={e => set('pageSize', e.target.value as FormState['pageSize'])}>
                <option value="A4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Orientasi</label>
              <select className="input" value={form.orientation} onChange={e => set('orientation', e.target.value as FormState['orientation'])}>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          {/* Sections */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>Bagian yang Ditampilkan</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={form.sections[key as keyof typeof EMPTY_SECTIONS]}
                    onChange={e => setSection(key, e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Header */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>Header</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={form.header.showLogo} onChange={e => setHeader('showLogo', e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
                Tampilkan logo
              </label>
              <input className="input" style={{ fontSize: 13 }} placeholder="Nama perusahaan (untuk header)" value={form.header.companyName} onChange={e => setHeader('companyName', e.target.value)} />
              <input className="input" style={{ fontSize: 13 }} placeholder="Tagline (opsional)" value={form.header.companyTagline} onChange={e => setHeader('companyTagline', e.target.value)} />
              <input className="input" style={{ fontSize: 13 }} placeholder="Alamat (opsional)" value={form.header.companyAddress} onChange={e => setHeader('companyAddress', e.target.value)} />
            </div>
          </div>

          {/* Footer */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>Footer</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={form.footer.showPageNumber} onChange={e => setFooter('showPageNumber', e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
                Tampilkan nomor halaman
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={form.footer.showCompanyName} onChange={e => setFooter('showCompanyName', e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
                Tampilkan nama perusahaan
              </label>
              <input className="input" style={{ fontSize: 13 }} placeholder="Teks kustom footer (opsional)" value={form.footer.customText} onChange={e => setFooter('customText', e.target.value)} />
            </div>
          </div>

          {/* Default */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={e => set('isDefault', e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            Jadikan template default
          </label>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Batal</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
              {saving ? 'Menyimpan...' : (editing ? 'Simpan Perubahan' : 'Buat Template')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const role = useAdminGuard()
  const toast = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/templates')
      if (res.ok) {
        const d = await res.json()
        setTemplates(d.templates ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit = (t: Template) => { setEditing(t); setShowModal(true) }

  const deleteTemplate = async (t: Template) => {
    if (!confirm(`Hapus template "${t.name}"?`)) return
    setDeleting(t.id)
    try {
      const res = await fetch(`/api/templates/${t.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menghapus')
      toast.success('Template dihapus')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus template')
    } finally {
      setDeleting(null)
    }
  }

  const setDefault = async (t: Template) => {
    setSettingDefault(t.id)
    try {
      const res = await fetch(`/api/templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal mengubah')
      toast.success('Template default diperbarui')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah default')
    } finally {
      setSettingDefault(null)
    }
  }

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <TemplateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={load}
        editing={editing}
      />

      <PageHeader title="Template" subtitle={loading ? 'Memuat...' : `${templates.length} template tersedia`}>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus style={{ width: 15, height: 15 }} /> Buat Template
        </button>
      </PageHeader>

      <div style={{ padding: 12 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
          </div>
        ) : templates.length === 0 ? (
          <div className="card" style={{ padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', width: 48, height: 48, borderRadius: 12 }}>
              <Layout style={{ color: 'var(--text-tertiary)', width: 20, height: 20 }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 16 }}>Belum ada template</p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Buat template pertama atau jalankan <code style={{ background: 'var(--bg-hover)', fontFamily: 'var(--font-mono)', fontSize: 12, borderRadius: 4, padding: '2px 6px' }}>npm run db:seed</code> untuk menambahkan preset
            </p>
            <button onClick={openCreate} className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
              <Plus style={{ width: 14, height: 14 }} /> Buat Template
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {templates.map(t => (
              <div key={t.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                {/* Icon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-light)', width: 40, height: 40, borderRadius: 8, marginBottom: 16 }}>
                  <FileText style={{ color: 'var(--accent)', width: 20, height: 20 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {t.type === 'preset' ? 'Preset' : 'Custom'} · {t.layout.orientation === 'portrait' ? 'Portrait' : 'Landscape'} · {t.layout.pageSize}
                    </p>
                  </div>
                  {t.isDefault && (
                    <span className="badge badge-amber" style={{ flexShrink: 0 }}>
                      <Star style={{ width: 10, height: 10 }} /> Default
                    </span>
                  )}
                </div>

                {/* Color swatches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: t.theme.primaryColor, width: 16, height: 16, borderRadius: '50%', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }} title={t.theme.primaryColor} />
                  <div style={{ background: t.theme.secondaryColor, width: 16, height: 16, borderRadius: '50%', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }} title={t.theme.secondaryColor} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.language === 'id' ? 'Bahasa Indonesia' : 'English'}</span>
                </div>

                {/* Section badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                  {(Object.entries(t.sections) as [string, boolean][]).filter(([, v]) => v).slice(0, 5).map(([k]) => (
                    <span key={k} className="badge badge-gray">{BADGE_LABELS[k] ?? k}</span>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                  <Link
                    href={`/api/templates/${t.id}/preview`}
                    target="_blank"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Eye style={{ width: 13, height: 13 }} /> Pratinjau
                  </Link>

                  {!t.isDefault && (
                    <button
                      onClick={() => setDefault(t)}
                      disabled={settingDefault === t.id}
                      className="btn btn-secondary btn-sm"
                      title="Jadikan default"
                    >
                      {settingDefault === t.id
                        ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />
                        : <Star style={{ width: 13, height: 13 }} />}
                    </button>
                  )}

                  {t.type === 'custom' && (
                    <>
                      <button
                        onClick={() => openEdit(t)}
                        className="btn btn-secondary btn-sm"
                        title="Edit template"
                      >
                        <Pencil style={{ width: 13, height: 13 }} />
                      </button>
                      <button
                        onClick={() => deleteTemplate(t)}
                        disabled={deleting === t.id}
                        className="btn btn-danger btn-sm"
                        title="Hapus template"
                      >
                        {deleting === t.id
                          ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />
                          : <Trash2 style={{ width: 13, height: 13 }} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
