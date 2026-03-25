import { NextResponse } from 'next/server'
import { connect, getStatus } from '@/lib/whatsapp/client'

export async function POST() {
  await connect()
  return NextResponse.json(getStatus())
}
