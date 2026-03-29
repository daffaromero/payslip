import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProrateConfig } from './use-prorate-config'

describe('useProrateConfig', () => {
  it('should toggle prorate on/off', () => {
    const { result } = renderHook(() => useProrateConfig())
    
    expect(result.current.enabled).toBe(false)
    
    act(() => result.current.toggle())
    expect(result.current.enabled).toBe(true)
    
    act(() => result.current.toggle())
    expect(result.current.enabled).toBe(false)
  })

  it('should update individual fields', () => {
    const { result } = renderHook(() => useProrateConfig())
    
    act(() => result.current.setType('resign'))
    expect(result.current.prorateType).toBe('resign')
    
    act(() => result.current.setCalcMode('span'))
    expect(result.current.prorateCalcMode).toBe('span')
  })
})
