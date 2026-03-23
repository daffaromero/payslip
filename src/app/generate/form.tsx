'use client'

import { useState } from 'react'
import { Employee, Template } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PayslipPreview } from '@/components/payslip/preview'

interface PayslipGeneratorFormProps {
  employees: Employee[]
  templates: Template[]
}

export function PayslipGeneratorForm({ employees, templates }: PayslipGeneratorFormProps) {
  const [previewHtml, setPreviewHtml] = useState<string>()
  const [loading, setLoading] = useState(false)

  const handlePreview = async () => {
    setLoading(true)
    // Simplified - would normally send form data
    setTimeout(() => {
      setPreviewHtml('<div style="padding: 20px;"><h2>Preview Slip Gaji</h2><p>Contoh tampilan slip gaji akan muncul di sini</p></div>')
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Karyawan</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Pilih karyawan" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Template</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Pilih template" />
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
            <Label>Gaji Pokok</Label>
            <Input type="number" placeholder="0" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={loading}>
              Preview
            </Button>
            <Button className="flex-1" disabled={loading}>
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <PayslipPreview html={previewHtml} loading={loading} />
    </div>
  )
}
