import { type ZodSchema } from 'zod'

type ParseOk<T> = { ok: true; data: T }
type ParseFail = { ok: false; error: string }
type ParseResult<T> = ParseOk<T> | ParseFail

export function parse<T>(schema: ZodSchema<T>, data: unknown): ParseResult<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues
        .map(e => `${(e.path as (string | number)[]).join('.')}: ${e.message}`)
        .join(', '),
    }
  }
  return { ok: true, data: result.data }
}
