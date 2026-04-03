const isDev = process.env.NODE_ENV !== 'production'

/**
 * Returns a JSON-safe error body.
 * In development, includes the real exception message as `detail`
 * so you can see the root cause in the browser Network tab without
 * having to check the server terminal.
 */
export function apiError(message: string, cause: unknown): { error: string; detail?: string } {
  if (!isDev) return { error: message }
  const detail = cause instanceof Error ? `${cause.message}${cause.stack ? '\n' + cause.stack.split('\n').slice(1, 4).join('\n') : ''}` : String(cause)
  return { error: message, detail }
}
