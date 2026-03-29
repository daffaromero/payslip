import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAsyncOperation } from './use-async-operation'

describe('useAsyncOperation', () => {
  it('should track idle/loading/error states', async () => {
    const { result } = renderHook(() =>
      useAsyncOperation(async () => {
        await new Promise(r => setTimeout(r, 10))
        return 'success'
      })
    )

    expect(result.current.status).toBe('idle')
    
    let resolve: (v: string) => void
    const promise = new Promise<string>(r => { resolve = r })
    
    const { result: hook } = renderHook(() =>
      useAsyncOperation(() => promise)
    )
    
    await act(async () => {
      hook.current.execute()
    })
    
    expect(hook.current.status).toBe('loading')
    
    await act(async () => {
      resolve!('done')
    })
    
    expect(hook.current.status).toBe('success')
  })
})
