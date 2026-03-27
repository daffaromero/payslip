import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { prisma } from '@/lib/db'
import { verifyToken, COOKIE } from '@/lib/auth'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'

export const metadata: Metadata = {
  title: 'Payslip — Payroll Management',
  description: 'Payroll management for Indonesian companies',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  const claims = token ? await verifyToken(token) : null

  let companyName = 'Payslip'
  let userInitial = 'P'

  if (claims) {
    const company = await prisma.company.findUnique({
      where: { id: claims.companyId },
      select: { name: true },
    })
    if (company) {
      companyName = company.name
      userInitial = company.name.charAt(0).toUpperCase()
    }
  }

  return (
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen bg-[--bg-app]">
          <Sidebar companyName={companyName} />
          <main className="flex flex-col flex-1 min-h-screen" style={{ paddingLeft: 'var(--sidebar-width)' }}>
            <TopBar companyName={companyName} userInitial={userInitial} />
            <div className="flex-1">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
