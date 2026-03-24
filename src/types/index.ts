export * from './payslip'
export * from './template'

export type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual'

export interface Company {
  id: string
  name: string
  address: string | null
  taxId: string | null
  phone: string | null
  email: string | null
  logoUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Employee {
  id: string
  companyId: string
  employeeId: string
  name: string
  email: string | null
  department: string | null
  position: string | null
  npwp: string | null
  bankAccount: string | null
  bankName: string | null
  baseSalary: number
  hourlyRate: number | null
  pph21Status: Pph21Status
  isActive: boolean
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
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
