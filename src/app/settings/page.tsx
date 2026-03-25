'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Loader2, Wifi, WifiOff, RefreshCw, LogOut, Smartphone } from 'lucide-react'

type WAStatus = 'disconnected' | 'connecting' | 'connected'

interface StatusData {
  status: WAStatus
  qrDataUrl: string | null
  error: string | null
}

export default function SettingsPage() {
  const [wa, setWa] = useState<StatusData>({ status: 'disconnected', qrDataUrl: null, error: null })
  const [acting, setActing] = useState(false)

  const poll = useCallback(async () => {
    const res = await fetch('/api/whatsapp/status')
    if (res.ok) setWa(await res.json())
  }, [])

  // Poll every 2s while connecting (waiting for QR scan)
  useEffect(() => {
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [poll])

  const connect = async () => {
    setActing(true)
    await fetch('/api/whatsapp/connect', { method: 'POST' })
    await poll()
    setActing(false)
  }

  const disconnect = async () => {
    if (!confirm('Putuskan koneksi WhatsApp dan hapus sesi?')) return
    setActing(true)
    await fetch('/api/whatsapp/disconnect', { method: 'POST' })
    await poll()
    setActing(false)
  }

  const statusColor: Record<WAStatus, string> = {
    connected: '#16a34a',
    connecting: '#d97706',
    disconnected: '#6b7280',
  }
  const statusLabel: Record<WAStatus, string> = {
    connected: 'Terhubung',
    connecting: 'Menghubungkan...',
    disconnected: 'Tidak terhubung',
  }

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <PageHeader title="Pengaturan" subtitle="Kelola koneksi dan preferensi aplikasi" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>

        {/* WhatsApp card */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone style={{ width: 20, height: 20, color: '#16a34a' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>WhatsApp</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Kirim slip gaji langsung ke WhatsApp karyawan</p>
            </div>
          </div>

          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'var(--bg-subtle)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {wa.status === 'connected'
                ? <Wifi style={{ width: 15, height: 15, color: statusColor[wa.status] }} />
                : <WifiOff style={{ width: 15, height: 15, color: statusColor[wa.status] }} />}
              <span style={{ fontSize: 13, fontWeight: 500, color: statusColor[wa.status] }}>{statusLabel[wa.status]}</span>
            </div>
            {wa.status === 'connecting' && <Loader2 style={{ width: 14, height: 14, color: '#d97706', animation: 'spin 1s linear infinite' }} />}
          </div>

          {wa.error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {wa.error}
            </div>
          )}

          {/* QR code */}
          {wa.qrDataUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Scan dengan WhatsApp di ponsel Anda</p>
              <img src={wa.qrDataUrl} alt="WhatsApp QR Code" style={{ width: 200, height: 200, borderRadius: 8 }} />
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
                Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            {wa.status === 'disconnected' && (
              <button
                onClick={connect}
                disabled={acting}
                className="btn btn-primary"
              >
                {acting ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Smartphone style={{ width: 14, height: 14 }} />}
                Hubungkan WhatsApp
              </button>
            )}
            {wa.status === 'connecting' && (
              <button
                onClick={connect}
                disabled={acting}
                className="btn btn-secondary"
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Muat Ulang QR
              </button>
            )}
            {wa.status === 'connected' && (
              <button
                onClick={disconnect}
                disabled={acting}
                className="btn btn-secondary"
                style={{ color: 'var(--danger)' }}
              >
                <LogOut style={{ width: 14, height: 14 }} />
                Putuskan
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
