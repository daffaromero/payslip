import { prisma } from '@/lib/db'
import { PayslipGeneratorForm } from './form'
import { Employee } from '@/types'

export default async function GeneratePage() {
  const employeesRaw = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  const employees = employeesRaw.map(e => ({
    ...e,
    pph21Status: e.pph21Status as Employee['pph21Status']
  }))

  const templatesRaw = await prisma.template.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Buat Slip Gaji</h1>
      <PayslipGeneratorForm 
        employees={employees as Employee[]} 
        templates={templatesRaw as any[]} 
      />
    </div>
  )
}
