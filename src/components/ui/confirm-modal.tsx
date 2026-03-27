'use client'

import { useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ open, title, description, confirmLabel = 'Hapus', loading, onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onClick={() => { if (!loading) onCancel() }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 12,
          padding: 24,
          width: 380,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8, background: '#fef2f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle style={{ width: 18, height: 18, color: '#dc2626' }} />
          </div>
          <div style={{ paddingTop: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{title}</p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '5px 0 0', lineHeight: 1.5 }}>{description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn btn-secondary" disabled={loading}>Batal</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn"
            style={{ background: '#dc2626', color: '#fff', border: 'none', gap: 6 }}
          >
            {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
