'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ImportDialog } from '@/components/employees/import-dialog'
import { Upload, Plus, Search } from 'lucide-react'

export default function EmployeesPage() {
  const [importOpen, setImportOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Data Karyawan</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-5 w-5" />
            Import
          </Button>
          <Button>
            <Plus className="mr-2 h-5 w-5" />
            Tambah
          </Button>
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
          <p className="text-center py-8 text-gray-500">
            Fitur daftar karyawan akan ditampilkan di sini
          </p>
        </CardContent>
      </Card>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
