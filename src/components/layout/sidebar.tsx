'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Users, FileText, PanelTop, Receipt, Settings, LogOut, ArrowUpDown, Copy, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const nav = [
  { href: '/',              label: 'Dashboard',      icon: LayoutDashboard, exact: true, adminOnly: false },
  { href: '/employees',     label: 'Karyawan',        icon: Users,                        adminOnly: false },
  { href: '/payslips',      label: 'Slip Gaji',       icon: Receipt,                      adminOnly: false },
  { href: '/generate',      label: 'Buat Slip Gaji',  icon: FileText,        exact: true,  adminOnly: true  },
  { href: '/generate/bulk', label: 'Generate Massal', icon: Copy,                          adminOnly: true  },
  { href: '/data',          label: 'Import / Export', icon: ArrowUpDown,                   adminOnly: true  },
  { href: '/templates',     label: 'Template',        icon: PanelTop,                      adminOnly: true  },
  { href: '/settings',      label: 'Pengaturan',      icon: Settings,                      adminOnly: false },
]

const COLLAPSED_W = '56px'
const EXPANDED_W  = '260px'

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('sidebar-collapsed') === 'true'
}

export function Sidebar({ companyName, role }: { companyName: string; role: 'admin' | 'viewer' }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? COLLAPSED_W : EXPANDED_W)
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  const toggle = () => {
    setCollapsed(!collapsed)
  }

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }, [router])

  const width = collapsed ? COLLAPSED_W : EXPANDED_W

  return (
    <aside className="desktop-only" style={{
      position: 'fixed',
      inset: '0 auto 0 0',
      width,
      zIndex: 50,
      flexDirection: 'column',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      transition: 'width 200ms ease',
      overflow: 'hidden',
    }}>

      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: 56,
        padding: '0 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--accent)',
          flexShrink: 0,
        }}>
          <FileText style={{ width: 18, height: 18, color: '#fff' }} />
        </div>
        {!collapsed && (
          <span style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            Payslip
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1,
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
      }}>
        {nav.filter(item => !item.adminOnly || role === 'admin').map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <NavItem key={href} href={href} label={label} icon={Icon} active={active} collapsed={collapsed} />
          )
        })}
      </nav>

      {/* Toggle + Footer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Collapse toggle */}
        <button
          onClick={toggle}
          title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            transition: 'color 150ms, background 150ms',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'none'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'
          }}
        >
          {collapsed
            ? <PanelLeftOpen style={{ width: 15, height: 15 }} />
            : <PanelLeftClose style={{ width: 15, height: 15 }} />}
        </button>

        {/* Logout */}
        <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {companyName}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>v0.1.0</p>
            </div>
          )}
          <button
            onClick={logout}
            title="Keluar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px 6px',
              borderRadius: 6,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            {!collapsed && 'Keluar'}
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ href, label, icon: Icon, active, collapsed }: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-light)' : 'transparent',
        transition: 'background 100ms ease, color 100ms ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
        }
      }}
    >
      <Icon style={{
        width: 20,
        height: 20,
        flexShrink: 0,
        color: active ? 'var(--accent)' : 'var(--text-tertiary)',
      }} />
      {!collapsed && label}
    </Link>
  )
}
