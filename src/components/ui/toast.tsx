'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error'

export interface ToastData {
  id: string
  type: ToastType
  message: string
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const show = setTimeout(() => setVisible(true), 10)
    // Start exit after 4s
    const hide = setTimeout(() => setVisible(false), 4000)
    // Remove after exit animation
    const remove = setTimeout(() => onDismiss(toast.id), 4350)
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(remove) }
  }, [toast.id, onDismiss])

  const ok = toast.type === 'success'

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: ok ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        maxWidth: 360, width: '100%',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {ok
        ? <CheckCircle2 style={{ width: 16, height: 16, color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
        : <XCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0, marginTop: 1 }} />}
      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: ok ? '#15803d' : '#b91c1c' }}>
        {toast.message}
      </span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 350) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: ok ? '#15803d' : '#b91c1c', padding: 0, flexShrink: 0, lineHeight: 1, opacity: 0.6 }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'flex-end',
    }}>
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  )
}

// Hook
let _counter = 0
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const push = (type: ToastType, message: string) => {
    const id = String(++_counter)
    setToasts(prev => [...prev, { id, type, message }])
  }

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return {
    toasts,
    dismiss,
    success: (msg: string) => push('success', msg),
    error: (msg: string) => push('error', msg),
  }
}
