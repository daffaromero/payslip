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

const COLLAPSED_W = '72px'
const EXPANDED_W  = '260px'

export function Sidebar({ companyName, role }: { companyName: string; role: 'admin' | 'viewer' }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed') === 'true'
    setCollapsed(stored)
    document.documentElement.style.setProperty('--sidebar-width', stored ? COLLAPSED_W : EXPANDED_W)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
    document.documentElement.style.setProperty('--sidebar-width', next ? COLLAPSED_W : EXPANDED_W)
  }

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }, [router])

  if (!mounted) return null

  const labelStyle: React.CSSProperties = {
    opacity: collapsed ? 0 : 1,
    width: collapsed ? 0 : undefined,
    overflow: 'hidden',
    transition: 'opacity 150ms ease, width 200ms ease',
    pointerEvents: 'none',
  }

  return (
    <aside className="desktop-only" style={{
      position: 'fixed',
      inset: '0 auto 0 0',
      width: collapsed ? COLLAPSED_W : EXPANDED_W,
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
        gap: 12,
        height: 56,
        padding: '0 20px',
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
          <FileText style={{ width: 16, height: 16, color: '#fff' }} />
        </div>
        <span style={{
          ...labelStyle,
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
        }}>
          Payslip
        </span>
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
            <NavItem key={href} href={href} label={label} icon={Icon} active={active} collapsed={collapsed} labelStyle={labelStyle} />
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>

        {/* Toggle */}
        <button
          onClick={toggle}
          title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
        <div style={{
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{
            minWidth: 0,
            marginRight: 8,
            maxWidth: collapsed ? 0 : '100%',
            overflow: 'hidden',
            opacity: collapsed ? 0 : 1,
            transition: 'opacity 150ms ease, max-width 200ms ease',
            flexShrink: 1,
          }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {companyName}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>v0.1.0</p>
          </div>
          <button
            onClick={logout}
            title="Keluar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
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
            <span style={labelStyle}>Keluar</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ href, label, icon: Icon, active, collapsed, labelStyle }: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  collapsed: boolean
  labelStyle: React.CSSProperties
}) {
  return (
    <Link
      href={href}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : undefined,
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
        width: 17,
        height: 17,
        flexShrink: 0,
        color: active ? 'var(--accent)' : 'var(--text-tertiary)',
      }} />
      <span style={labelStyle}>{label}</span>
    </Link>
  )
}
