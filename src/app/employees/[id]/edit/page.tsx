'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useAdminGuard } from '@/lib/hooks/use-role'

const PPH21 = ['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3','K/I/0','K/I/1','K/I/2','K/I/3']

function F({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium" style={{ color: 'var(--text-primary)', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

export default function EditEmployeePage() {
  useAdminGuard()
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employeeId: '', name: '', email: '', whatsappNumber: '', department: '', position: '',
    npwp: '', bankAccount: '', bankName: '', baseSalary: '', hourlyRate: '', pph21Status: 'TK/0',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then(r => r.json())
      .then(({ employee: e }) => setForm({
        employeeId: e.employeeId, name: e.name, email: e.email ?? '', whatsappNumber: e.whatsappNumber ?? '',
        department: e.department ?? '', position: e.position ?? '', npwp: e.npwp ?? '',
        bankAccount: e.bankAccount ?? '', bankName: e.bankName ?? '',
        baseSalary: String(e.baseSalary), hourlyRate: e.hourlyRate ? String(e.hourlyRate) : '', pph21Status: e.pph21Status,
      }))
      .finally(() => setLoading(false))
  }, [id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, baseSalary: Number(form.baseSalary), hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null, email: form.email || null, whatsappNumber: form.whatsappNumber || null, department: form.department || null, position: form.position || null, npwp: form.npwp || null, bankAccount: form.bankAccount || null, bankName: form.bankName || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal menyimpan')
      router.push('/employees')
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Terjadi kesalahan') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center" style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-(--accent) border-t-transparent" />
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <PageHeader
        title="Edit Karyawan"
        subtitle="Perbarui informasi karyawan"
        back={{ href: '/employees', label: 'Kembali ke Karyawan' }}
      />

      <div style={{ padding: 12 }}>
      <form onSubmit={submit}>
        <div className="grid grid-cols-3 gap-5" style={{ gap: 20 }}>
          <div className="col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <p className="section-label" style={{ marginBottom: 20 }}>Identitas</p>
              <div className="grid grid-cols-2 gap-4" style={{ gap: 16 }}>
                <F label="ID Karyawan" required><input required className="input" value={form.employeeId} onChange={e => set('employeeId', e.target.value)} /></F>
                <F label="Nama Lengkap" required><input required className="input" value={form.name} onChange={e => set('name', e.target.value)} /></F>
                <F label="Email"><input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} /></F>
                <F label="WhatsApp" hint="Format: 628xxx (tanpa +)"><input className="input" placeholder="628123456789" value={form.whatsappNumber} onChange={e => set('whatsappNumber', e.target.value)} /></F>
                <F label="NPWP"><input className="input" value={form.npwp} onChange={e => set('npwp', e.target.value)} /></F>
                <F label="Departemen"><input className="input" value={form.department} onChange={e => set('department', e.target.value)} /></F>
                <F label="Jabatan"><input className="input" value={form.position} onChange={e => set('position', e.target.value)} /></F>
              </div>
            </div>
            <div className="card" style={{ padding: 24 }}>
              <p className="section-label" style={{ marginBottom: 20 }}>Bank</p>
              <div className="grid grid-cols-2 gap-4" style={{ gap: 16 }}>
                <F label="Nama Bank"><input className="input" value={form.bankName} onChange={e => set('bankName', e.target.value)} /></F>
                <F label="Nomor Rekening"><input className="input" value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} /></F>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <p className="section-label" style={{ marginBottom: 20 }}>Kompensasi & Pajak</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <F label="Gaji Pokok" required>
                  <div className="input-prefix"><span className="prefix">Rp</span><input required type="number" className="input" value={form.baseSalary} onChange={e => set('baseSalary', e.target.value)} /></div>
                </F>
                <F label="Tarif Lembur / Jam">
                  <div className="input-prefix"><span className="prefix">Rp</span><input type="number" className="input" value={form.hourlyRate} onChange={e => set('hourlyRate', e.target.value)} /></div>
                </F>
                <F label="Status PTKP" required>
                  <select className="input" value={form.pph21Status} onChange={e => set('pph21Status', e.target.value)}>
                    {PPH21.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </F>
              </div>
            </div>
            {error && <div className="rounded-lg text-[13px]" style={{ padding: '12px 16px', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fecaca' }}>{error}</div>}
            <button type="submit" disabled={saving} className="btn btn-primary btn-lg w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <Link href="/employees" className="btn btn-secondary btn-lg w-full">Batal</Link>
          </div>
        </div>
      </form>
      </div>
    </div>
  )
}
