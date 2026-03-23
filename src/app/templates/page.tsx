import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Template Slip Gaji</h1>
        <Button>
          <Plus className="mr-2 h-5 w-5" />
          Template Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.isDefault && (
                  <Badge>Default</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {template.type === 'preset' ? 'Template Preset' : 'Template Custom'}
              </p>
              <Button variant="outline" className="w-full">
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
