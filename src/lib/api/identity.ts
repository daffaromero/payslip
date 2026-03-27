import { NextRequest } from 'next/server'

export function getCompanyId(req: NextRequest): string | null {
  return req.headers.get('x-company-id')
}
