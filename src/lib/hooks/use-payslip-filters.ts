'use client'

import { useState, useCallback } from 'react'

interface UsePayslipFiltersReturn {
  filterEmployee: string
  filterYear: string
  filterMonth: string
  filterPeriodType: string
  page: number
  setFilterEmployee: (value: string) => void
  setFilterYear: (value: string) => void
  setFilterMonth: (value: string) => void
  setFilterPeriodType: (value: string) => void
  setPage: (value: number | ((prev: number) => number)) => void
  clearFilters: () => void
  hasFilter: boolean
}

export function usePayslipFilters(): UsePayslipFiltersReturn {
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterPeriodType, setFilterPeriodType] = useState('')
  const [page, setPage] = useState(1)

  const clearFilters = useCallback(() => {
    setFilterEmployee('')
    setFilterYear('')
    setFilterMonth('')
    setFilterPeriodType('')
    setPage(1)
  }, [])

  const hasFilter = !!(filterEmployee || filterYear || filterMonth || filterPeriodType)

  return {
    filterEmployee,
    filterYear,
    filterMonth,
    filterPeriodType,
    page,
    setFilterEmployee,
    setFilterYear,
    setFilterMonth,
    setFilterPeriodType,
    setPage,
    clearFilters,
    hasFilter,
  }
}
