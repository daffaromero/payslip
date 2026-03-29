'use client'

import { MobileMenu } from './mobile-menu'

export function TopBar({ companyName, userInitial }: { companyName: string; userInitial: string }) {
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
      }}>
        {userInitial}
      </div>
    </header>
  )
}
