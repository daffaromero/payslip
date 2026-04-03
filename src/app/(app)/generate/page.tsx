export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { verifyToken, COOKIE } from '@/lib/auth'
import { PayslipGeneratorForm } from './form'
import { Employee } from '@/types'
import { PageHeader } from '@/components/layout/page-header'

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  const claims = token ? await verifyToken(token) : null
  if (!claims) redirect('/login')
  if (claims.role !== 'admin') redirect('/')

  const { companyId } = claims
  const { employeeId } = await searchParams

  const employeesRaw = await prisma.employee.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: 'asc' },
  })

  const employees = employeesRaw.map(e => ({
    ...e,
    pph21Status: e.pph21Status as Employee['pph21Status'],
  }))

  const templatesRaw = await prisma.template.findMany({
    where: { companyId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <PageHeader title="Buat Slip Gaji" subtitle="Isi informasi di bawah untuk membuat slip gaji karyawan" />
      <div style={{ padding: 12 }}>
        <PayslipGeneratorForm
          employees={employees as Employee[]}
          templates={templatesRaw as unknown as import('@/types').Template[]}
          defaultEmployeeId={employeeId}
        />
      </div>
    </div>
  )
}
