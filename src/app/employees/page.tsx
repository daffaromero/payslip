'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ImportDialog } from '@/components/employees/import-dialog'
import { Upload, Plus, Search, User, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Employee {
  id: string
  employeeId: string
  name: string
  email: string | null
  department: string | null
  position: string | null
  baseSalary: number
}

export default function EmployeesPage() {
  const [importOpen, setImportOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.department && e.department.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Data Karyawan</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-5 w-5" />
            Import
          </Button>
          <Link href="/employees/new">
            <Button>
              <Plus className="mr-2 h-5 w-5" />
              Tambah
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari karyawan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Memuat...</p>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Belum ada karyawan. Tambahkan karyawan pertama.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between py-4 hover:bg-gray-50 px-2 rounded"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-sm text-gray-500">
                        {employee.employeeId} • {employee.department || '-'} • {employee.position || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(employee.baseSalary)}</p>
                      <p className="text-sm text-gray-500">Gaji Pokok</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
