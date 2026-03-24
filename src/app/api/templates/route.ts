import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
    })
    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Gagal memuat template' },
      { status: 500 }
    )
  }
}
