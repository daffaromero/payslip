import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export { formatCurrency, formatDate } from '@payslip/core'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Given a startDate string (YYYY-MM-DD), period type, and months count,
 * returns the endDate string (YYYY-MM-DD) as startDate + period - 1 day.
 * Uses local date arithmetic to avoid UTC timezone shifts.
 */
export function calcPeriodEndDate(startDateStr: string, periodType: string, months = 1): string {
  const s = new Date(startDateStr + 'T00:00:00')
  let en: Date
  switch (periodType) {
    case 'weekly':
      en = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
      break
    case 'quarterly':
      en = new Date(s.getFullYear(), s.getMonth() + 3, s.getDate() - 1)
      break
    case 'semi-annual':
      en = new Date(s.getFullYear(), s.getMonth() + 6, s.getDate() - 1)
      break
    case 'annual':
      en = new Date(s.getFullYear() + 1, s.getMonth(), s.getDate() - 1)
      break
    default: // monthly
      en = new Date(s.getFullYear(), s.getMonth() + months, s.getDate() - 1)
  }
  return localDateStr(en)
}
