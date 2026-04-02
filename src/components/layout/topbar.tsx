'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { MobileMenu } from './mobile-menu'

interface TopBarProps {
  companyName: string
  userInitials: string
  companyLogoUrl?: string | null
  userName?: string | null
  userEmail?: string | null
}

export function TopBar({ companyName, userInitials, companyLogoUrl, userName, userEmail }: TopBarProps) {
  const [open, setOpen] = useState(false)
  const displayName = userName || userEmail?.split('@')[0] || userInitials

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      padding: '0 24px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MobileMenu companyName={companyName} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {companyName}
        </span>
      </div>

      {/* User menu */}
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <Link
          href="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px 4px 4px',
            borderRadius: 20,
            textDecoration: 'none',
            background: open ? 'var(--bg-hover)' : 'transparent',
            transition: 'background 0.15s',
          }}
        >
          {/* Avatar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            fontSize: 12,
            fontWeight: 600,
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {companyLogoUrl
              ? <img src={companyLogoUrl} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : userInitials}
          </div>

          {/* Display name */}
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
        </Link>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 200,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>
            {/* Identity */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              {userName && (
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{userName}</p>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{userEmail}</p>
            </div>

            {/* Settings link */}
            <Link
              href="/settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--text-primary)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Settings style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />
              Pengaturan
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
