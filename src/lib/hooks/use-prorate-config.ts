'use client'

import { useState, useCallback } from 'react'

export type ProrateType = 'join' | 'resign'
export type ProrateCalcMode = 'period' | 'span'

export interface ProrateConfig {
  enabled: boolean
  prorateType: ProrateType
  prorateDate: string
  prorateCalcMode: ProrateCalcMode
  prorateUseCount: boolean
  prorateCount: number
  prorateDayBasis: 'calendar' | 'working'
}

const DEFAULT_CONFIG: ProrateConfig = {
  enabled: false,
  prorateType: 'join',
  prorateDate: '',
  prorateCalcMode: 'period',
  prorateUseCount: false,
  prorateCount: 1,
  prorateDayBasis: 'calendar',
}

export function useProrateConfig() {
  const [config, setConfig] = useState<ProrateConfig>(DEFAULT_CONFIG)

  const toggle = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  const setType = useCallback((type: ProrateType) => {
    setConfig(prev => ({ ...prev, prorateType: type }))
  }, [])

  const setCalcMode = useCallback((mode: ProrateCalcMode) => {
    setConfig(prev => ({ 
      ...prev, 
      prorateCalcMode: mode,
      prorateUseCount: false 
    }))
  }, [])

  const setUseCount = useCallback((useCount: boolean) => {
    setConfig(prev => ({ ...prev, prorateUseCount: useCount }))
  }, [])

  const setCount = useCallback((count: number) => {
    setConfig(prev => ({ ...prev, prorateCount: count }))
  }, [])

  const setDayBasis = useCallback((basis: 'calendar' | 'working') => {
    setConfig(prev => ({ ...prev, prorateDayBasis: basis }))
  }, [])

  const setDate = useCallback((date: string) => {
    setConfig(prev => ({ ...prev, prorateDate: date }))
  }, [])

  const reset = useCallback(() => {
    setConfig(DEFAULT_CONFIG)
  }, [])

  return {
    ...config,
    toggle,
    setType,
    setCalcMode,
    setUseCount,
    setCount,
    setDayBasis,
    setDate,
    reset,
  }
}
