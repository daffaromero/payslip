import { NextResponse } from 'next/server'
import { getStatus } from '@/lib/whatsapp/client'

export async function GET() {
  return NextResponse.json(getStatus())
}
