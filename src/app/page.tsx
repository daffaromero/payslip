import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Users } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

export default async function DashboardPage() {
  const totalEmployees = await prisma.employee.count({
    where: { isActive: true },
  })

  const totalPayslips = await prisma.payslip.count()

  const recentPayslips = await prisma.payslip.findMany({
    take: 5,
    orderBy: { generatedAt: 'desc' },
    include: {
      employee: true,
    },
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Kelola slip gaji dan data karyawan
          </p>
        </div>
        <Link href="/generate">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Buat Slip Gaji
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Karyawan Aktif
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Slip Gaji
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayslips}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Slip Gaji Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayslips.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              Belum ada slip gaji yang dibuat
            </p>
          ) : (
            <div className="space-y-4">
              {recentPayslips.map((payslip) => (
                <div
                  key={payslip.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{payslip.employee.name}</p>
                    <p className="text-sm text-gray-500">
                      {payslip.startDate.toLocaleDateString('id-ID')} -{' '}
                      {payslip.endDate.toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(Number(payslip.netPay))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
