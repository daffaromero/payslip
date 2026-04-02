'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Loader2, Wifi, WifiOff, RefreshCw, LogOut, Smartphone, Building2, Lock, Users, Plus, Trash2, UserCircle } from 'lucide-react'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { useRole } from '@/lib/hooks/use-role'

type WAStatus = 'disconnected' | 'connecting' | 'connected'
interface WAData { status: WAStatus; qrDataUrl: string | null; error: string | null }
interface Company { name: string; address: string; taxId: string; phone: string; email: string; logoUrl: string | null }
interface TeamUser { id: string; email: string; name: string | null; role: string; createdAt: string }

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
  const role = useRole()

  // ── Profile ───────────────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) { setProfileName(d.user.name ?? ''); setProfileEmail(d.user.email) } })
      .finally(() => setLoadingProfile(false))
  }, [])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menyimpan')
      toast.success('Profil berhasil disimpan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Team ─────────────────────────────────────────────────────────────────
  const [team, setTeam] = useState<TeamUser[]>([])
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer')
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const loadTeam = useCallback(async () => {
    setLoadingTeam(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) { const d = await res.json(); setTeam(d.users ?? []) }
    } finally { setLoadingTeam(false) }
  }, [])

  useEffect(() => { loadTeam() }, [loadTeam])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName || undefined, password: invitePassword, role: inviteRole }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal menambahkan pengguna')
      toast.success(`Pengguna ${inviteEmail} berhasil ditambahkan`)
      setShowInvite(false); setInviteEmail(''); setInviteName(''); setInvitePassword(''); setInviteRole('viewer')
      loadTeam()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan') }
    finally { setInviting(false) }
  }

  const removeUser = async (user: TeamUser) => {
    if (!confirm(`Hapus pengguna ${user.email}?`)) return
    setRemovingId(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal menghapus pengguna')
      toast.success('Pengguna dihapus')
      loadTeam()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan') }
    finally { setRemovingId(null) }
  }

  const changeRole = async (user: TeamUser, newRole: 'admin' | 'viewer') => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal mengubah role')
      toast.success('Role diperbarui')
      loadTeam()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan') }
  }

  // ── Company ──────────────────────────────────────────────────────────────
  const [company, setCompany] = useState<Company>({ name: '', address: '', taxId: '', phone: '', email: '', logoUrl: null })
  const [savingCompany, setSavingCompany] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const setC = (k: keyof Company, v: string) => setCompany(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch('/api/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.company) setCompany({ name: d.company.name ?? '', address: d.company.address ?? '', taxId: d.company.taxId ?? '', phone: d.company.phone ?? '', email: d.company.email ?? '', logoUrl: d.company.logoUrl ?? null }) })
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
  const [changingPw, setChangingPw] = useState(false)

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

        {/* Profile */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCircle style={{ width: 20, height: 20, color: '#0284c7' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Profil Saya</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Nama ditampilkan di avatar dan daftar tim</p>
            </div>
          </div>

          {loadingProfile ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Loader2 style={{ width: 18, height: 18, ...SPIN, color: 'var(--text-tertiary)' }} />
            </div>
          ) : (
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <F label="Email">
                <input className="input" value={profileEmail} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </F>
              <F label="Nama" hint="Opsional. Jika kosong, inisial diambil dari email.">
                <input className="input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Contoh: Budi Santoso" />
              </F>
              <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                {savingProfile && <Loader2 style={{ width: 14, height: 14, ...SPIN }} />}
                {savingProfile ? 'Menyimpan...' : 'Simpan'}
              </button>
            </form>
          )}
        </div>

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
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <Building2 style={{ width: 24, height: 24, color: 'var(--text-tertiary)' }} />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      id="logo-upload"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const fd = new FormData()
                        fd.append('file', file)
                        const res = await fetch('/api/company/logo', { method: 'POST', body: fd })
                        const d = await res.json()
                        if (!res.ok) { toast.error(d.error || 'Gagal upload logo'); return }
                        setCompany(c => ({ ...c, logoUrl: d.logoUrl }))
                        toast.success('Logo berhasil diupload')
                        e.target.value = ''
                      }}
                    />
                    <label htmlFor="logo-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                      Upload Logo
                    </label>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>JPG, PNG, WebP, atau SVG. Maks 2MB.</p>
                  </div>
                </div>
              </div>

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

        {/* Team — admin only */}
        {role === 'admin' && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: 20, height: 20, color: '#16a34a' }} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Tim</p>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Kelola akses pengguna dalam perusahaan</p>
                </div>
              </div>
              <button onClick={() => setShowInvite(v => !v)} className="btn btn-secondary btn-sm">
                <Plus style={{ width: 13, height: 13 }} /> Tambah
              </button>
            </div>

            {/* Invite form */}
            {showInvite && (
              <form onSubmit={invite} style={{ padding: 16, background: 'var(--bg-subtle)', borderRadius: 8, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Tambah Pengguna Baru</p>
                <F label="Email">
                  <input type="email" required className="input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="hr@perusahaan.co.id" />
                </F>
                <F label="Nama" hint="Opsional">
                  <input className="input" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Contoh: Budi Santoso" />
                </F>
                <F label="Password Sementara">
                  <input type="text" required minLength={8} className="input" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Minimal 8 karakter" />
                </F>
                <F label="Role">
                  <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value as 'admin' | 'viewer')}>
                    <option value="viewer">Viewer — hanya bisa melihat</option>
                    <option value="admin">Admin — akses penuh</option>
                  </select>
                </F>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={inviting} className="btn btn-primary btn-sm">
                    {inviting && <Loader2 style={{ width: 13, height: 13, ...SPIN }} />}
                    {inviting ? 'Menyimpan...' : 'Tambah Pengguna'}
                  </button>
                  <button type="button" onClick={() => setShowInvite(false)} className="btn btn-secondary btn-sm">Batal</button>
                </div>
              </form>
            )}

            {/* User list */}
            {loadingTeam ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <Loader2 style={{ width: 16, height: 16, ...SPIN, color: 'var(--text-tertiary)' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'clip' }}>
                {team.map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < team.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ minWidth: 0 }}>
                      {u.name && <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>}
                      <p style={{ fontSize: u.name ? 11 : 13, fontWeight: u.name ? 400 : 500, color: u.name ? 'var(--text-tertiary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        Bergabung {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <select
                        className="input"
                        value={u.role}
                        onChange={e => changeRole(u, e.target.value as 'admin' | 'viewer')}
                        style={{ height: 30, fontSize: 12, padding: '0 8px', width: 'auto' }}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => removeUser(u)}
                        disabled={removingId === u.id}
                        className="btn btn-danger btn-sm btn-icon"
                        title="Hapus pengguna"
                      >
                        {removingId === u.id ? <Loader2 style={{ width: 13, height: 13, ...SPIN }} /> : <Trash2 style={{ width: 13, height: 13 }} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

        {/* Change Password */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock style={{ width: 20, height: 20, color: '#7c3aed' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Ubah Password</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Untuk keamanan, gunakan password yang kuat dan berbeda</p>
            </div>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const current = fd.get('currentPassword') as string
            const next = fd.get('newPassword') as string
            const confirm = fd.get('confirmPassword') as string
            if (next !== confirm) { toast.error('Password baru dan konfirmasi tidak cocok'); return }
            setChangingPw(true)
            try {
              const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: current, newPassword: next }),
              })
              const d = await res.json()
              if (!res.ok) throw new Error(d.error || 'Gagal mengubah password')
              toast.success('Password berhasil diubah')
              ;(e.target as HTMLFormElement).reset()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
            } finally {
              setChangingPw(false)
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Password Lama</label>
              <input name="currentPassword" type="password" required className="input" placeholder="••••••••" autoComplete="current-password" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Password Baru</label>
              <input name="newPassword" type="password" required minLength={8} className="input" placeholder="Minimal 8 karakter" autoComplete="new-password" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Konfirmasi Password Baru</label>
              <input name="confirmPassword" type="password" required minLength={8} className="input" placeholder="Ulangi password baru" autoComplete="new-password" />
            </div>
            <button type="submit" disabled={changingPw} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              {changingPw && <Loader2 style={{ width: 14, height: 14, ...SPIN }} />}
              {changingPw ? 'Menyimpan...' : 'Ubah Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
