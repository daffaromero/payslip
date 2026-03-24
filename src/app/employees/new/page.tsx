'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const PPH21_OPTIONS = [
  'TK/0', 'TK/1', 'TK/2', 'TK/3',
  'K/0', 'K/1', 'K/2', 'K/3',
  'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3'
]

export default function NewEmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    department: '',
    position: '',
    npwp: '',
    bankAccount: '',
    bankName: '',
    baseSalary: 0,
    hourlyRate: 0,
    pph21Status: 'TK/0'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Gagal menambahkan karyawan')
      }
      
      router.push('/employees')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <Link href="/employees">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Tambah Karyawan Baru</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ID Karyawan *</Label>
                <Input 
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  placeholder="EMP001"
                />
              </div>
              <div>
                <Label>Nama Lengkap *</Label>
                <Input 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nama Karyawan"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Departemen</Label>
                <Input 
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  placeholder="IT, HR, dll"
                />
              </div>
              <div>
                <Label>Jabatan</Label>
                <Input 
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  placeholder="Manager, Staff, dll"
                />
              </div>
            </div>
            
            <div>
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@company.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>NPWP</Label>
                <Input 
                  value={formData.npwp}
                  onChange={(e) => setFormData({...formData, npwp: e.target.value})}
                  placeholder="09.123.456.7-123.000"
                />
              </div>
              <div>
                <Label>Status PTKP *</Label>
                <select 
                  className="w-full border rounded px-3 py-2"
                  value={formData.pph21Status}
                  onChange={(e) => setFormData({...formData, pph21Status: e.target.value})}
                >
                  {PPH21_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Bank</Label>
                <Input 
                  value={formData.bankName}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                  placeholder="BCA, Mandiri, dll"
                />
              </div>
              <div>
                <Label>No. Rekening</Label>
                <Input 
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                  placeholder="1234567890"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gaji Pokok *</Label>
                <Input 
                  type="number"
                  required
                  value={formData.baseSalary || ''}
                  onChange={(e) => setFormData({...formData, baseSalary: Number(e.target.value)})}
                  placeholder="10000000"
                />
              </div>
              <div>
                <Label>Tarif Lembur per Jam</Label>
                <Input 
                  type="number"
                  value={formData.hourlyRate || ''}
                  onChange={(e) => setFormData({...formData, hourlyRate: Number(e.target.value)})}
                  placeholder="50000"
                />
              </div>
            </div>
            
            <div className="pt-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Karyawan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
