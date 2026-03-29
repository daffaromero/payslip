'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, FileText, LayoutDashboard, Users, Receipt, Settings, ArrowUpDown, Copy, PanelTop, LogOut } from 'lucide-react'

const nav = [
  { href: '/',              label: 'Dashboard',      icon: LayoutDashboard, exact: true },
  { href: '/employees',     label: 'Karyawan',        icon: Users },
  { href: '/payslips',      label: 'Slip Gaji',       icon: Receipt },
  { href: '/generate',      label: 'Buat Slip Gaji',  icon: FileText, exact: true },
  { href: '/generate/bulk', label: 'Generate Massal', icon: Copy },
  { href: '/data',          label: 'Import / Export', icon: ArrowUpDown },
  { href: '/templates',     label: 'Template',        icon: PanelTop },
  { href: '/settings',      label: 'Pengaturan',      icon: Settings },
]

export function MobileMenu({ companyName }: { companyName: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      <button
        className="mobile-only"
        onClick={() => setOpen(true)}
        style={{ alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, flexShrink: 0 }}
        aria-label="Buka menu"
      >
        <Menu style={{ width: 20, height: 20 }} />
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 272,
              background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText style={{ width: 15, height: 15, color: '#fff' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Payslip</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex' }}
                aria-label="Tutup menu"
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
              {nav.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6,
                      fontSize: 14, fontWeight: 500,
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      background: active ? 'var(--accent-light)' : 'transparent',
                    }}
                  >
                    <Icon style={{ width: 17, height: 17, flexShrink: 0, color: active ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                    {label}
                  </Link>
                )
              })}
            </nav>

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>v0.1.0</p>
                </div>
                <button onClick={logout} title="Keluar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', flexShrink: 0 }}>
                  <LogOut style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
