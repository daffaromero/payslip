'use client'

import { useState, useCallback } from 'react'

interface UsePayslipFiltersReturn {
  filterEmployee: string
  filterYear: string
  filterMonth: string
  setFilterEmployee: (value: string) => void
  setFilterYear: (value: string) => void
  setFilterMonth: (value: string) => void
  clearFilters: () => void
  hasFilter: boolean
}

export function usePayslipFilters(): UsePayslipFiltersReturn {
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  const clearFilters = useCallback(() => {
    setFilterEmployee('')
    setFilterYear('')
    setFilterMonth('')
  }, [])

  const hasFilter = !!(filterEmployee || filterYear || filterMonth)

  return {
    filterEmployee,
    filterYear,
    filterMonth,
    setFilterEmployee,
    setFilterYear,
    setFilterMonth,
    clearFilters,
    hasFilter,
  }
}
