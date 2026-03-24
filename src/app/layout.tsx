import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'

export const metadata: Metadata = {
  title: 'Payslip — Payroll Management',
  description: 'Payroll management for Indonesian companies',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen bg-[--bg-app]">
          <Sidebar />
          <main className="flex flex-col flex-1 min-h-screen" style={{ paddingLeft: 'var(--sidebar-width)' }}>
            <TopBar />
            <div className="flex-1">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
