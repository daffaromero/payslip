import { SignJWT, jwtVerify } from 'jose'

const COOKIE = 'ps_session'
const ALG = 'HS256'

export interface TokenClaims {
  userId: string
  companyId: string
  role: string
}

function secret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(s)
}

export async function signToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    const { userId, companyId, role } = payload as Record<string, unknown>
    if (typeof userId !== 'string' || typeof companyId !== 'string' || typeof role !== 'string') {
      return null
    }
    return { userId, companyId, role }
  } catch {
    return null
  }
}

export { COOKIE }
