'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Loader2, Wifi, WifiOff, RefreshCw, LogOut, Smartphone, Building2 } from 'lucide-react'
import { ToastContainer, useToast } from '@/components/ui/toast'

type WAStatus = 'disconnected' | 'connecting' | 'connected'
interface WAData { status: WAStatus; qrDataUrl: string | null; error: string | null }
interface Company { name: string; address: string; taxId: string; phone: string; email: string }

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

export default function SettingsPage() {
  const toast = useToast()

  // ── Company ──────────────────────────────────────────────────────────────
  const [company, setCompany] = useState<Company>({ name: '', address: '', taxId: '', phone: '', email: '' })
  const [savingCompany, setSavingCompany] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const setC = (k: keyof Company, v: string) => setCompany(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch('/api/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.company) setCompany({ name: d.company.name ?? '', address: d.company.address ?? '', taxId: d.company.taxId ?? '', phone: d.company.phone ?? '', email: d.company.email ?? '' }) })
      .finally(() => setLoadingCompany(false))
  }, [])

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCompany(true)
    try {
      const res = await fetch('/api/company', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...company, address: company.address || null, taxId: company.taxId || null, phone: company.phone || null, email: company.email || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menyimpan')
      toast.success('Data perusahaan berhasil disimpan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSavingCompany(false)
    }
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  const [wa, setWa] = useState<WAData>({ status: 'disconnected', qrDataUrl: null, error: null })
  const [acting, setActing] = useState(false)

  const pollWa = useCallback(async () => {
    const res = await fetch('/api/whatsapp/status')
    if (res.ok) setWa(await res.json())
  }, [])

  useEffect(() => {
    pollWa()
    const id = setInterval(pollWa, 2000)
    return () => clearInterval(id)
  }, [pollWa])

  const connectWa = async () => {
    setActing(true)
    await fetch('/api/whatsapp/connect', { method: 'POST' })
    await pollWa()
    setActing(false)
  }

  const disconnectWa = async () => {
    if (!confirm('Putuskan koneksi WhatsApp dan hapus sesi?')) return
    setActing(true)
    await fetch('/api/whatsapp/disconnect', { method: 'POST' })
    await pollWa()
    setActing(false)
  }

  const waColor: Record<WAStatus, string> = { connected: '#16a34a', connecting: '#d97706', disconnected: '#6b7280' }
  const waLabel: Record<WAStatus, string> = { connected: 'Terhubung', connecting: 'Menghubungkan...', disconnected: 'Tidak terhubung' }

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Pengaturan" subtitle="Kelola profil perusahaan dan koneksi" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>

        {/* Company */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 style={{ width: 20, height: 20, color: '#2563eb' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Profil Perusahaan</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Tampil di semua slip gaji yang diterbitkan</p>
            </div>
          </div>

          {loadingCompany ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Loader2 style={{ width: 18, height: 18, ...SPIN, color: 'var(--text-tertiary)' }} />
            </div>
          ) : (
            <form onSubmit={saveCompany} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <F label="Nama Perusahaan *">
                <input required className="input" value={company.name} onChange={e => setC('name', e.target.value)} placeholder="PT Contoh Indonesia" />
              </F>
              <F label="Alamat">
                <input className="input" value={company.address} onChange={e => setC('address', e.target.value)} placeholder="Jl. Sudirman No. 1, Jakarta" />
              </F>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <F label="NPWP Perusahaan">
                  <input className="input" value={company.taxId} onChange={e => setC('taxId', e.target.value)} placeholder="09.123.456.7-123.000" />
                </F>
                <F label="Telepon">
                  <input className="input" value={company.phone} onChange={e => setC('phone', e.target.value)} placeholder="(021) 1234-5678" />
                </F>
              </div>
              <F label="Email">
                <input type="email" className="input" value={company.email} onChange={e => setC('email', e.target.value)} placeholder="hr@perusahaan.co.id" />
              </F>
              <button type="submit" disabled={savingCompany} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                {savingCompany && <Loader2 style={{ width: 14, height: 14, ...SPIN }} />}
                {savingCompany ? 'Menyimpan...' : 'Simpan'}
              </button>
            </form>
          )}
        </div>

        {/* WhatsApp */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone style={{ width: 20, height: 20, color: '#16a34a' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>WhatsApp</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Kirim slip gaji langsung ke WhatsApp karyawan</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-subtle)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {wa.status === 'connected'
                ? <Wifi style={{ width: 15, height: 15, color: waColor[wa.status] }} />
                : <WifiOff style={{ width: 15, height: 15, color: waColor[wa.status] }} />}
              <span style={{ fontSize: 13, fontWeight: 500, color: waColor[wa.status] }}>{waLabel[wa.status]}</span>
            </div>
            {wa.status === 'connecting' && <Loader2 style={{ width: 14, height: 14, color: '#d97706', ...SPIN }} />}
          </div>

          {wa.error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {wa.error}
            </div>
          )}

          {wa.qrDataUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Scan dengan WhatsApp di ponsel Anda</p>
              <img src={wa.qrDataUrl} alt="WhatsApp QR Code" style={{ width: 200, height: 200, borderRadius: 8 }} />
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
                Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {wa.status === 'disconnected' && (
              <button onClick={connectWa} disabled={acting} className="btn btn-primary">
                {acting ? <Loader2 style={{ width: 14, height: 14, ...SPIN }} /> : <Smartphone style={{ width: 14, height: 14 }} />}
                Hubungkan WhatsApp
              </button>
            )}
            {wa.status === 'connecting' && (
              <button onClick={connectWa} disabled={acting} className="btn btn-secondary">
                <RefreshCw style={{ width: 14, height: 14 }} /> Muat Ulang QR
              </button>
            )}
            {wa.status === 'connected' && (
              <button onClick={disconnectWa} disabled={acting} className="btn btn-secondary" style={{ color: 'var(--danger)' }}>
                <LogOut style={{ width: 14, height: 14 }} /> Putuskan
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
