import { readFileSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads/logos')

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml',
}

export function resolveLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null
  if (logoUrl.startsWith('data:') || logoUrl.startsWith('http')) return logoUrl
  const filename = logoUrl.split('/').pop()
  if (!filename || /[^a-zA-Z0-9._-]/.test(filename)) return null
  try {
    const filepath = path.join(UPLOAD_DIR, filename)
    const buffer = readFileSync(filepath)
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const mime = CONTENT_TYPES[ext] ?? 'image/png'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return logoUrl
  }
}
