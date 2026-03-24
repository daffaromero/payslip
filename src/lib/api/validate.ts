import { NextResponse } from 'next/server'
import { z, ZodSchema } from 'zod'
import { apiError } from './respond'

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }

export function parseData<T>(schema: ZodSchema<T>, data: unknown): ParseResult<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    return {
      ok: false,
      response: apiError(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.error.issues.map((e: any) => `${(e.path as (string | number)[]).join('.')}: ${e.message as string}`).join(', '),
        400
      ),
    }
  }
  return { ok: true, data: result.data }
}

export { z }
