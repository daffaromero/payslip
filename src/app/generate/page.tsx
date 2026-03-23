import { prisma } from '@/lib/db'
import { PayslipGeneratorForm } from './form'

export default async function GeneratePage() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  const templates = await prisma.template.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Buat Slip Gaji</h1>
      <PayslipGeneratorForm 
        employees={employees} 
        templates={templates} 
      />
    </div>
  )
}
