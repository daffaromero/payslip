'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Users, Pencil, Trash2, FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface Employee {
  id: string; employeeId: string; name: string; email: string | null
  department: string | null; position: string | null; baseSalary: number; pph21Status: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/employees')
    if (res.ok) setEmployees((await res.json()).employees ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeletingId(pendingDelete.id)
    const res = await fetch(`/api/employees/${pendingDelete.id}`, { method: 'DELETE' })
    if (res.ok) setEmployees(p => p.filter(e => e.id !== pendingDelete.id))
    setDeletingId(null)
    setPendingDelete(null)
  }

  const filtered = employees.filter(e => {
    const s = q.toLowerCase()
    return e.name.toLowerCase().includes(s) || e.employeeId.toLowerCase().includes(s) || (e.department?.toLowerCase().includes(s) ?? false)
  })

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <ConfirmModal
        open={pendingDelete !== null}
        title={`Hapus karyawan?`}
        description={`"${pendingDelete?.name}" akan dihapus permanen dan tidak bisa dikembalikan.`}
        confirmLabel="Hapus"
        loading={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <PageHeader title="Karyawan" subtitle={loading ? '' : `${employees.length} karyawan aktif`}>
        <Link href="/employees/new" className="btn btn-primary">
          <Plus className="h-3.5 w-3.5" /> Tambah Karyawan
        </Link>
      </PageHeader>

      <div style={{ padding: 12 }}>
        <div className="card overflow-hidden">
          {/* Search toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 384 }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-tertiary)' }} />
              <input
                type="text" placeholder="Cari nama, ID, departemen..."
                value={q} onChange={e => setQ(e.target.value)}
                className="input" style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center" style={{ padding: '80px 0' }}>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-(--accent) border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center text-center" style={{ padding: '80px 0' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <Users className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
                {q ? 'Tidak ada hasil' : 'Belum ada karyawan'}
              </p>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>
                {q ? 'Coba kata kunci lain' : 'Tambah karyawan untuk mulai'}
              </p>
              {!q && (
                <Link href="/employees/new" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
                  <Plus className="h-3.5 w-3.5" /> Tambah Karyawan
                </Link>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Departemen / Jabatan</th>
                  <th>Status PTKP</th>
                  <th style={{ textAlign: 'right' }}>Gaji Pokok</th>
                  <th style={{ width: '100px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="group">
                    <td>
                      <div className="flex items-center gap-3" style={{ gap: 12 }}>
                        <div className="avatar avatar-md avatar-blue">{e.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <Link href={`/employees/${e.id}`} style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{e.name}</Link>
                          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {e.employeeId}{e.email ? ` · ${e.email}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p style={{ fontSize: 15, color: 'var(--text-primary)' }}>{e.department || '—'}</p>
                      {e.position && <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{e.position}</p>}
                    </td>
                    <td>
                      <span className="badge badge-blue">{e.pph21Status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(Number(e.baseSalary))}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ gap: 4 }}>
                        <Link href={`/employees/${e.id}/edit`} className="btn btn-ghost btn-icon btn-sm" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <Link href={`/generate?employeeId=${e.id}`} className="btn btn-ghost btn-icon btn-sm" title="Buat Slip Gaji">
                          <FileText className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => setPendingDelete({ id: e.id, name: e.name })}
                          disabled={deletingId === e.id}
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--text-tertiary)' }}
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {filtered.length > 0 && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {filtered.length} dari {employees.length} karyawan
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
