'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Data Karyawan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />
          {file && (
            <p className="text-sm text-gray-600">
              File: {file.name}
            </p>
          )}
          <Button disabled={!file} className="w-full">
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
