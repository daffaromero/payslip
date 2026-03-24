'use client'

export function TopBar() {
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
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        PT Contoh Indonesia
      </span>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'var(--accent-light)',
        color: 'var(--accent)',
        fontSize: 11,
        fontWeight: 600,
      }}>
        A
      </div>
    </header>
  )
}
