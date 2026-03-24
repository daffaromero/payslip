import { prisma } from '@/lib/db'
import { PayslipGeneratorForm } from './form'
import { Employee } from '@/types'
import { PageHeader } from '@/components/layout/page-header'

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>
}) {
  const { employeeId } = await searchParams

  const employeesRaw = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  const employees = employeesRaw.map(e => ({
    ...e,
    pph21Status: e.pph21Status as Employee['pph21Status'],
  }))

  const templatesRaw = await prisma.template.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: 'calc(100vh - 56px)' }}>
      <PageHeader title="Buat Slip Gaji" subtitle="Isi informasi di bawah untuk membuat slip gaji karyawan" />
      <div className="p-8">
        <PayslipGeneratorForm
          employees={employees as Employee[]}
          templates={templatesRaw as unknown as import('@/types').Template[]}
          defaultEmployeeId={employeeId}
        />
      </div>
    </div>
  )
}
