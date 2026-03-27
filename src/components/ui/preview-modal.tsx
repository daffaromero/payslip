'use client'

import { useEffect } from 'react'
import { X, Download } from 'lucide-react'

interface Props {
  open: boolean
  src: string       // blob URL — works for both PDF and HTML blobs
  filename?: string
  onClose: () => void
}

export function PreviewModal({ open, src, filename = 'preview', onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const download = () => {
    const a = Object.assign(document.createElement('a'), { href: src, download: filename })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{filename}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={download} className="btn btn-secondary btn-sm">
            <Download style={{ width: 14, height: 14 }} /> Download
          </button>
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* iframe */}
      <div style={{ flex: 1, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <iframe
          src={src}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title="Preview"
        />
      </div>
    </div>
  )
}
