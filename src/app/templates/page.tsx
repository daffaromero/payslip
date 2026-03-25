export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/db'
import { deserializeTemplate } from '@/lib/api/template-serializer'
import { FileText, Star, Layout, Eye } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import Link from 'next/link'

export default async function TemplatesPage() {
  const raw = await prisma.template.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  const templates = raw.map(t => deserializeTemplate(t as Parameters<typeof deserializeTemplate>[0]))

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <PageHeader title="Template" subtitle={`${templates.length} template tersedia`} />

      <div style={{ padding: 12 }}>
        {templates.length === 0 ? (
          <div className="card" style={{ padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', width: 48, height: 48, borderRadius: 12 }}>
              <Layout style={{ color: 'var(--text-tertiary)', width: 20, height: 20 }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 16 }}>Belum ada template</p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Jalankan <code style={{ background: 'var(--bg-hover)', fontFamily: 'var(--font-mono)', fontSize: 12, borderRadius: 4, padding: '2px 6px' }}>npm run db:seed</code> untuk menambahkan template awal
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {templates.map(t => (
              <div key={t.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                {/* Icon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-light)', width: 40, height: 40, borderRadius: 8, marginBottom: 16 }}>
                  <FileText style={{ color: 'var(--accent)', width: 20, height: 20 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {t.type === 'preset' ? 'Preset' : 'Custom'} · {t.layout.orientation === 'portrait' ? 'Portrait' : 'Landscape'} · {t.layout.pageSize}
                    </p>
                  </div>
                  {t.isDefault && (
                    <span className="badge badge-amber" style={{ flexShrink: 0 }}>
                      <Star style={{ width: 10, height: 10 }} /> Default
                    </span>
                  )}
                </div>

                {/* Color swatches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: t.theme.primaryColor, width: 16, height: 16, borderRadius: '50%', boxShadow: '0 0 0 1px rgba(0,0,0,0.05)' }} title={t.theme.primaryColor} />
                  <div style={{ background: t.theme.secondaryColor, width: 16, height: 16, borderRadius: '50%', boxShadow: '0 0 0 1px rgba(0,0,0,0.05)' }} title={t.theme.secondaryColor} />
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.language === 'id' ? 'Bahasa Indonesia' : 'English'}</span>
                </div>

                {/* Section tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                  {(Object.entries(t.sections) as [string, boolean][]).filter(([, v]) => v).slice(0, 5).map(([k]) => {
                    const L: Record<string, string> = { companyHeader: 'Header', employeeInfo: 'Karyawan', earnings: 'Penerimaan', deductions: 'Potongan', netPay: 'Gaji Bersih', ytdSummary: 'YTD', bankDetails: 'Bank', signature: 'TTD' }
                    return <span key={k} className="badge badge-gray">{L[k] ?? k}</span>
                  })}
                </div>

                {/* Preview button */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <Link
                    href={`/api/templates/${t.id}/preview`}
                    target="_blank"
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                  >
                    <Eye style={{ width: 14, height: 14 }} /> Pratinjau
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
