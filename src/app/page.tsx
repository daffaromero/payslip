export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { verifyToken, COOKIE } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, FileText, TrendingUp, Plus, Banknote, CalendarDays, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  const claims = token ? await verifyToken(token) : null
  if (!claims) redirect('/login')

  const { companyId } = claims
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart  = new Date(now.getFullYear(), 0, 1)

  const [totalEmployees, totalPayslips, recentPayslips, thisMonthPayslips, thisMonthPayroll, ytdPayroll, avgNetPay] = await Promise.all([
    prisma.employee.count({ where: { companyId, isActive: true } }),
    prisma.payslip.count({ where: { companyId } }),
    prisma.payslip.findMany({
      where: { companyId },
      take: 8,
      orderBy: { generatedAt: 'desc' },
      include: { employee: { select: { name: true, employeeId: true } } },
    }),
    prisma.payslip.count({
      where: { companyId, startDate: { gte: monthStart } },
    }),
    prisma.payslip.aggregate({
      where: { companyId, startDate: { gte: monthStart } },
      _sum: { netPay: true },
    }),
    prisma.payslip.aggregate({
      where: { companyId, startDate: { gte: yearStart } },
      _sum: { netPay: true },
    }),
    prisma.payslip.aggregate({
      where: { companyId },
      _avg: { netPay: true },
    }),
  ])

  const countStats = [
    { label: 'Karyawan Aktif',  value: String(totalEmployees),    icon: Users,      href: '/employees', color: '#0066ff', bg: '#eff6ff' },
    { label: 'Total Slip Gaji', value: String(totalPayslips),     icon: FileText,   href: '/payslips',  color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Slip Bulan Ini',  value: String(thisMonthPayslips), icon: TrendingUp, href: null,         color: '#059669', bg: '#ecfdf5' },
  ]

  const payrollStats = [
    { label: 'Payroll Bulan Ini', value: formatCurrency(Number(thisMonthPayroll._sum.netPay) || 0), icon: Banknote,     color: '#0066ff', bg: '#eff6ff' },
    { label: 'Payroll YTD',       value: formatCurrency(Number(ytdPayroll._sum.netPay) || 0),       icon: CalendarDays, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Rata-rata Bersih',  value: formatCurrency(Number(avgNetPay._avg.netPay) || 0),         icon: BarChart3,    color: '#059669', bg: '#ecfdf5' },
  ]

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <PageHeader title="Dashboard" subtitle="Ringkasan aktivitas payroll perusahaan">
        <Link href="/generate" className="btn btn-primary">
          <Plus className="h-3.5 w-3.5" /> Buat Slip Gaji
        </Link>
      </PageHeader>

      <div style={{ padding: 12 }}>
        {/* Count stats */}
        <div className="stat-grid" style={{ gap: 12, marginBottom: 12 }}>
          {countStats.map(({ label, value, icon: Icon, href, color, bg }) => (
            <div key={label} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="flex items-center justify-center rounded-xl" style={{ background: bg, width: 52, height: 52, flexShrink: 0 }}>
                <Icon style={{ color, width: 24, height: 24 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{label}</p>
                <p style={{ color: 'var(--text-primary)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 4 }}>
                  {value}
                </p>
                {href && (
                  <Link href={href} className="inline-flex items-center font-medium transition-opacity hover:opacity-70" style={{ color, marginTop: 8, fontSize: 13, gap: 4 }}>
                    Lihat semua →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Payroll stats */}
        <div className="stat-grid" style={{ gap: 12, marginBottom: 12 }}>
          {payrollStats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="flex items-center justify-center rounded-xl" style={{ background: bg, width: 52, height: 52, flexShrink: 0 }}>
                <Icon style={{ color, width: 24, height: 24 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{label}</p>
                <p style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent payslips */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Slip Gaji Terbaru</p>
            <Link href="/payslips" className="text-[12px] font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              Lihat semua
            </Link>
          </div>

          {recentPayslips.length === 0 ? (
            <div className="flex flex-col items-center text-center" style={{ padding: '64px 0' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <FileText className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Belum ada slip gaji</p>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>Generate slip gaji pertama untuk mulai</p>
              <Link href="/generate" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
                <Plus className="h-3.5 w-3.5" /> Buat Slip Gaji
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Periode</th>
                  <th>Tipe</th>
                  <th style={{ textAlign: 'right' }}>Gaji Bersih</th>
                </tr>
              </thead>
              <tbody>
                {recentPayslips.map((p: typeof recentPayslips[number]) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3" style={{ gap: 12 }}>
                        <div className="avatar avatar-sm avatar-blue">
                          {p.employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{p.employee.name}</p>
                          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.employee.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(p.startDate)} — {formatDate(p.endDate)}
                    </td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: 13, fontWeight: 500 }}>
                        {p.periodType === 'monthly' ? 'Bulanan' : p.periodType === 'weekly' ? 'Mingguan' : p.periodType === 'quarterly' ? '3 Bulanan' : p.periodType}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(Number(p.netPay))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
