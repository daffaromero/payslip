import { prisma } from '@/lib/db'
import { deserializeTemplate } from '@/lib/api/template-serializer'
import { FileText, Star, Layout } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

export default async function TemplatesPage() {
  const raw = await prisma.template.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  const templates = raw.map(t => deserializeTemplate(t as Parameters<typeof deserializeTemplate>[0]))

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <PageHeader title="Template" subtitle={`${templates.length} template tersedia`} />

      <div style={{ padding: 32 }}>
        {templates.length === 0 ? (
          <div className="card flex flex-col items-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <Layout className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Belum ada template</p>
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>
              Jalankan <code className="rounded px-1 py-0.5 text-[11px]" style={{ background: 'var(--bg-hover)', fontFamily: 'var(--font-mono)' }}>npm run db:seed</code> untuk menambahkan template awal
            </p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {templates.map(t => (
              <div key={t.id} className="card" style={{ padding: 20 }}>
                {/* Icon */}
                <div className="flex items-center justify-center rounded-lg" style={{ background: 'var(--accent-light)', width: 40, height: 40, marginBottom: 16 }}>
                  <FileText className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                </div>

                <div className="flex items-start justify-between gap-2 mb-3" style={{ gap: 8 }}>
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {t.type === 'preset' ? 'Preset' : 'Custom'} · {t.layout.orientation === 'portrait' ? 'Portrait' : 'Landscape'} · {t.layout.pageSize}
                    </p>
                  </div>
                  {t.isDefault && (
                    <span className="badge badge-amber flex-shrink-0">
                      <Star className="h-2.5 w-2.5" /> Default
                    </span>
                  )}
                </div>

                {/* Color swatches */}
                <div className="mb-3 flex items-center gap-2" style={{ gap: 8 }}>
                  <div className="h-4 w-4 rounded-full ring-1 ring-black/5" style={{ background: t.theme.primaryColor }} title={t.theme.primaryColor} />
                  <div className="h-4 w-4 rounded-full ring-1 ring-black/5" style={{ background: t.theme.secondaryColor }} title={t.theme.secondaryColor} />
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{t.language === 'id' ? 'Bahasa Indonesia' : 'English'}</span>
                </div>

                {/* Section tags */}
                <div className="flex flex-wrap gap-1.5" style={{ gap: 6 }}>
                  {(Object.entries(t.sections) as [string, boolean][]).filter(([, v]) => v).slice(0, 5).map(([k]) => {
                    const L: Record<string, string> = { companyHeader: 'Header', employeeInfo: 'Karyawan', earnings: 'Penerimaan', deductions: 'Potongan', netPay: 'Gaji Bersih', ytdSummary: 'YTD', bankDetails: 'Bank', signature: 'TTD' }
                    return <span key={k} className="badge badge-gray">{L[k] ?? k}</span>
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
