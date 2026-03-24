'use client'

import { useState, useEffect } from 'react'
import { Employee, Template } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Download, Eye, Loader2, Plus, Minus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { calculatePayslip } from '@/lib/calculations/payslip'

interface PayslipGeneratorFormProps {
  employees: Employee[]
  templates: Template[]
}

export function PayslipGeneratorForm({ employees, templates }: PayslipGeneratorFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [employeeId, setEmployeeId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [periodType, setPeriodType] = useState('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [basePay, setBasePay] = useState(0)
  const [overtimeHours, setOvertimeHours] = useState(0)
  const [hourlyRate, setHourlyRate] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [thr, setThr] = useState(0)
  const [allowances, setAllowances] = useState<{name: string; amount: number}[]>([])
  const [otherDeductions, setOtherDeductions] = useState<{name: string; amount: number}[]>([])
  const [notes, setNotes] = useState('')
  
  // Preview state
  const [previewData, setPreviewData] = useState<any>(null)
  const [generatedPayslipId, setGeneratedPayslipId] = useState<string | null>(null)

  const selectedEmployee = employees.find(e => e.id === employeeId)

  // Auto-fill dates based on period type
  useEffect(() => {
    const now = new Date()
    let start: Date
    let end: Date
    
    switch(periodType) {
      case 'weekly':
        start = new Date(now.setDate(now.getDate() - 7))
        end = new Date()
        break
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), quarter * 3, 1)
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [periodType])

  // Auto-fill salary when employee selected
  useEffect(() => {
    if (selectedEmployee) {
      setBasePay(selectedEmployee.baseSalary || 0)
      setHourlyRate(selectedEmployee.hourlyRate || 0)
    }
  }, [employeeId, selectedEmployee])

  const calculatePreview = () => {
    if (!selectedEmployee) return null
    
    const result = calculatePayslip({
      baseSalary: basePay,
      overtimeHours,
      hourlyRate,
      bonus,
      thr,
      allowances,
      otherDeductions,
      pph21Status: selectedEmployee.pph21Status || 'TK/0',
      monthCount: periodType === 'monthly' ? 1 : periodType === 'quarterly' ? 3 : 1
    })
    
    return result
  }

  const handlePreview = () => {
    const preview = calculatePreview()
    setPreviewData(preview)
    setError('')
    setSuccess('')
  }

  const handleGenerate = async () => {
    if (!employeeId || !templateId) {
      setError('Pilih karyawan dan template terlebih dahulu')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/payslips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          templateId,
          periodType,
          startDate,
          endDate,
          basePay,
          overtimeHours,
          hourlyRate,
          bonus,
          thr,
          allowances,
          otherDeductions,
          notes
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Gagal membuat slip gaji')
      }
      
      const result = await response.json()
      setGeneratedPayslipId(result.payslipId)
      setSuccess('Slip gaji berhasil dibuat!')
      handlePreview()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!generatedPayslipId) {
      setError('Generate slip gaji terlebih dahulu')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslipId: generatedPayslipId })
      })
      
      if (!response.ok) throw new Error('Gagal generate PDF')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `slip-gaji-${selectedEmployee?.name}-${startDate}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addAllowance = () => setAllowances([...allowances, { name: '', amount: 0 }])
  const removeAllowance = (i: number) => setAllowances(allowances.filter((_, idx) => idx !== i))
  const updateAllowance = (i: number, field: 'name' | 'amount', value: any) => {
    const updated = [...allowances]
    updated[i] = { ...updated[i], [field]: field === 'amount' ? Number(value) : value }
    setAllowances(updated)
  }

  const addDeduction = () => setOtherDeductions([...otherDeductions, { name: '', amount: 0 }])
  const removeDeduction = (i: number) => setOtherDeductions(otherDeductions.filter((_, idx) => idx !== i))
  const updateDeduction = (i: number, field: 'name' | 'amount', value: any) => {
    const updated = [...otherDeductions]
    updated[i] = { ...updated[i], [field]: field === 'amount' ? Number(value) : value }
    setOtherDeductions(updated)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Karyawan *</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Template *</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipe Periode</Label>
                <Select value={periodType} onValueChange={setPeriodType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="quarterly">3 Bulanan</SelectItem>
                    <SelectItem value="semi-annual">6 Bulanan</SelectItem>
                    <SelectItem value="annual">Tahunan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Mulai</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Tanggal Selesai</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Penerimaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Gaji Pokok</Label>
                <Input type="number" value={basePay} onChange={(e) => setBasePay(Number(e.target.value))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Jam Lembur</Label>
                  <Input type="number" step="0.5" value={overtimeHours} onChange={(e) => setOvertimeHours(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Tarif/Jam</Label>
                  <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bonus</Label>
                  <Input type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} />
                </div>
                <div>
                  <Label>THR</Label>
                  <Input type="number" value={thr} onChange={(e) => setThr(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Tunjangan</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addAllowance}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah
                  </Button>
                </div>
                {allowances.map((a, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input placeholder="Nama" value={a.name} onChange={(e) => updateAllowance(i, 'name', e.target.value)} />
                    <Input type="number" placeholder="Jumlah" value={a.amount} onChange={(e) => updateAllowance(i, 'amount', e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAllowance(i)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={loading}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleGenerate} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Slip Gaji
            </Button>
            {generatedPayslipId && (
              <Button variant="secondary" onClick={handleDownloadPDF} disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Preview Perhitungan</CardTitle>
            </CardHeader>
            <CardContent>
              {previewData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Gaji Pokok</p>
                      <p className="font-medium">{formatCurrency(previewData.grossPay - previewData.bonus - previewData.thr)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Gaji Kotor</p>
                      <p className="font-medium">{formatCurrency(previewData.grossPay)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">PPh 21</p>
                      <p className="font-medium text-red-600">-{formatCurrency(previewData.pph21)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">BPJS Kesehatan</p>
                      <p className="font-medium text-red-600">-{formatCurrency(previewData.bpjsKesehatan)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">BPJS Ketenagakerjaan</p>
                      <p className="font-medium text-red-600">-{formatCurrency(previewData.bpjsKetenagakerjaan)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Potongan</p>
                      <p className="font-medium text-red-600">-{formatCurrency(previewData.totalDeductions)}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-gray-500 text-sm">GAJI BERSIH</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(previewData.netPay)}</p>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <p>Klik Preview untuk melihat perhitungan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
