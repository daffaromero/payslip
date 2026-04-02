'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PayslipPreviewProps {
  html?: string
  loading?: boolean
}

export function PayslipPreview({ html, loading }: PayslipPreviewProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-gray-500">Memuat preview...</p>
        </CardContent>
      </Card>
    )
  }

  if (!html) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-gray-500 text-center">
            Klik &quot;Preview&quot; untuk melihat<br />tampilan slip gaji
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="border rounded-lg overflow-hidden"
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ maxHeight: '600px', overflow: 'auto' }}
        />
      </CardContent>
    </Card>
  )
}
