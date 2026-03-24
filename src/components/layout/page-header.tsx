import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  back,
  children,
}: {
  title: string
  subtitle?: string
  back?: { href: string; label: string }
  children?: ReactNode
}) {
  return (
    <div style={{
      position: 'sticky',
      top: 56,
      zIndex: 30,
      flexShrink: 0,
      padding: '20px 32px 18px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
    }}>
      {back && (
        <Link
          href={back.href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--text-tertiary)',
            marginBottom: 8,
            opacity: 1,
            transition: 'opacity 150ms',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        >
          <ArrowLeft style={{ width: 12, height: 12 }} />
          {back.label}
        </Link>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
            margin: 0,
            lineHeight: 1.3,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 13,
              color: 'var(--text-tertiary)',
              margin: '3px 0 0',
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 8 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
