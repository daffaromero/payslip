import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE } from '@/lib/auth'

const PUBLIC = ['/login', '/api/auth/login', '/api/health', '/api/seed', '/api/uploads/logos']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p)) || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE)?.value
  if (token) {
    const claims = await verifyToken(token)
    if (claims) {
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-user-id', claims.userId)
      requestHeaders.set('x-company-id', claims.companyId)
      requestHeaders.set('x-user-role', claims.role)
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
