'use client'

import { useState, useCallback } from 'react'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useAsyncOperation<T, Args extends unknown[] = unknown[]>(
  fn: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
) {
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  const execute = useCallback(async (...args: Args) => {
    setStatus('loading')
    setError(null)
    try {
      const result = await fn(...args)
      setData(result)
      setStatus('success')
      options.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setStatus('error')
      options.onError?.(error)
      throw error
    }
  }, [fn, options])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setData(null)
  }, [])

  return {
    status,
    error,
    data,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    execute,
    reset,
  }
}
