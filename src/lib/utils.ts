import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export { formatCurrency, formatDate } from '@payslip/core'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
