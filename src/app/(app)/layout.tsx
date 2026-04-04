import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, COOKIE } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  const claims = token ? await verifyToken(token) : null

  let companyName = 'Payslip'
  let userInitials = 'P'
  let companyLogoUrl: string | null = null
  let userName: string | null = null
  let userEmail: string | null = null
  let userRole: 'admin' | 'viewer' = 'viewer'

  if (claims) {
    const [company, user] = await Promise.all([
      prisma.company.findUnique({
        where: { id: claims.companyId },
        select: { name: true, logoUrl: true },
      }),
      prisma.user.findUnique({
        where: { id: claims.userId },
        select: { email: true, name: true, role: true },
      }),
    ])
    if (company) {
      companyName = company.name
      companyLogoUrl = company.logoUrl ?? null
    }
    if (user) {
      userEmail = user.email
      userName = user.name?.trim() || null
      userRole = user.role === 'admin' ? 'admin' : 'viewer'
      const source = userName || user.email.split('@')[0]
      const parts = source.split(/[\s._-]/).filter(Boolean)
      userInitials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase()
    }
  }

  return (
    <div className="flex min-h-screen bg-[--bg-app]">
      <Sidebar companyName={companyName} role={userRole} />
      <main className="flex flex-col flex-1 min-h-screen" style={{ paddingLeft: 'var(--sidebar-width)', transition: 'padding-left 200ms ease' }}>
        <TopBar companyName={companyName} userInitials={userInitials} companyLogoUrl={companyLogoUrl} userName={userName} userEmail={userEmail} role={userRole} />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  )
}
