export * from './payslip'
export * from './template'

export type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual'

export interface Company {
  id: string
  name: string
  address?: string
  taxId?: string
  phone?: string
  email?: string
  logoUrl?: string
}

export interface Employee {
  id: string
  companyId: string
  employeeId: string
  name: string
  email?: string
  department?: string
  position?: string
  npwp?: string
  bankAccount?: string
  bankName?: string
  baseSalary: number
  hourlyRate?: number
  pph21Status: Pph21Status
  isActive: boolean
  joinedAt: Date
}

export type Pph21Status = 
  | 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3'
  | 'K/0' | 'K/1' | 'K/2' | 'K/3'
  | 'K/I/0' | 'K/I/1' | 'K/I/2' | 'K/I/3'

export const PPH21_STATUS_OPTIONS: Pph21Status[] = [
  'TK/0', 'TK/1', 'TK/2', 'TK/3',
  'K/0', 'K/1', 'K/2', 'K/3',
  'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3'
]
