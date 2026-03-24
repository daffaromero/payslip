'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Settings, Receipt } from 'lucide-react'

const nav = [
  { href: '/',           label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/employees',  label: 'Karyawan',        icon: Users           },
  { href: '/payslips',   label: 'Slip Gaji',       icon: Receipt         },
  { href: '/generate',   label: 'Buat Slip Gaji',  icon: FileText        },
  { href: '/templates',  label: 'Template',        icon: Settings        },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      position: 'fixed',
      inset: '0 auto 0 0',
      width: 'var(--sidebar-width)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
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
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
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
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <NavItem key={href} href={href} label={label} icon={Icon} active={active} />
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          PT Contoh Indonesia
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-disabled)', margin: '2px 0 0' }}>v0.1.0</p>
      </div>
    </aside>
  )
}

function NavItem({ href, label, icon: Icon, active }: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 6,
        fontSize: 13.5,
        fontWeight: 500,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-light)' : 'transparent',
        transition: 'background 100ms ease, color 100ms ease',
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
      {label}
    </Link>
  )
}
