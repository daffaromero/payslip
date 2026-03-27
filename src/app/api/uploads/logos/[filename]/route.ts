import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, statSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads/logos')

export async function GET(req: NextRequest) {
  const { pathname } = req.nextUrl
  const filename = pathname.split('/').pop()
  if (!filename || /[^a-zA-Z0-9._-]/.test(filename)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const filepath = path.join(UPLOAD_DIR, filename)

  try {
    const stat = statSync(filepath)
    const stream = createReadStream(filepath)
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentType: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml',
    }
    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType[ext ?? ''] ?? 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
