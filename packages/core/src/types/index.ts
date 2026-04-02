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
  salaryComponents?: SalaryComponents | null
}

export type Pph21Status =
  | 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3'
  | 'K/0'  | 'K/1'  | 'K/2'  | 'K/3'
  | 'K/I/0' | 'K/I/1' | 'K/I/2' | 'K/I/3'

export const PPH21_STATUS_OPTIONS: Pph21Status[] = [
  'TK/0', 'TK/1', 'TK/2', 'TK/3',
  'K/0',  'K/1',  'K/2',  'K/3',
  'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3',
]

export type SalaryComponentKey = 
  | 'tunjangan_jabatan' 
  | 'tunjangan_luar_kota' 
  | 'tunjangan_makan' 
  | 'tunjangan_transport' 
  | 'tunjangan_lama_bekerja'
  | 'tunjangan_pph21'

export interface SalaryComponent {
  key: SalaryComponentKey
  label: string
  amount: number
  enabled: boolean
}

export interface SalaryComponents {
  tunjangan_jabatan: { amount: number; enabled: boolean }
  tunjangan_luar_kota: { amount: number; enabled: boolean }
  tunjangan_makan: { amount: number; enabled: boolean }
  tunjangan_transport: { amount: number; enabled: boolean }
  tunjangan_lama_bekerja: { amount: number; enabled: boolean }
  tunjangan_pph21: { amount: number; enabled: boolean }
}

export const SALARY_COMPONENT_LABELS: Record<SalaryComponentKey, string> = {
  tunjangan_jabatan: 'Tunjangan Jabatan',
  tunjangan_luar_kota: 'Tunjangan Luar Kota',
  tunjangan_makan: 'Tunjangan Makan',
  tunjangan_transport: 'Tunjangan Transport',
  tunjangan_lama_bekerja: 'Tunjangan Lama Kerja',
  tunjangan_pph21: 'Tunjangan PPh 21',
}
