import { NextResponse } from 'next/server'
import { disconnect } from '@/lib/whatsapp/client'

export async function POST() {
  await disconnect()
  return NextResponse.json({ status: 'disconnected' })
}
