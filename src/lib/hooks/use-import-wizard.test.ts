import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImportWizard } from './use-import-wizard'

describe('useImportWizard', () => {
  it('should manage import step transitions', () => {
    const { result } = renderHook(() => useImportWizard())
    
    expect(result.current.step).toBe('upload')
    
    act(() => result.current.goToStep('map'))
    expect(result.current.step).toBe('map')
    
    act(() => result.current.reset())
    expect(result.current.step).toBe('upload')
  })
})
