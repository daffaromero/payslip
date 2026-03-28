import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE } from '@/lib/auth'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // /api/* is handled by Hono (via Caddy in prod, rewrite in dev) — let it through
  if (pathname.startsWith('/login') || pathname.startsWith('/api/') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE)?.value
  if (token) {
    const claims = await verifyToken(token)
    if (claims) return NextResponse.next()
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
