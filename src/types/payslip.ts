import { PeriodType, Employee } from './index'

export interface Allowance {
  name: string
  amount: number
}

export interface Deduction {
  name: string
  amount: number
}

export interface PayslipData {
  id?: string
  companyId: string
  employeeId: string
  templateId: string
  periodType: PeriodType
  startDate: Date
  endDate: Date
  
  // Earnings
  basePay: number
  overtimeHours?: number
  overtimePay: number
  bonus: number
  thr: number
  allowances: Allowance[]
  
  // Deductions
  pph21: number
  bpjsKesehatan: number
  bpjsKetenagakerjaan: number
  otherDeductions: Deduction[]
  
  // Totals
  grossPay: number
  totalDeductions: number
  netPay: number
  
  // YTD
  ytdGross: number
  ytdPph21: number
  
  // Metadata
  notes?: string
}

export interface PayslipWithEmployee extends PayslipData {
  employee: Employee
}

export interface PayslipCalculationInput {
  baseSalary: number
  overtimeHours?: number
  hourlyRate?: number
  bonus?: number
  thr?: number
  allowances?: Allowance[]
  otherDeductions?: Deduction[]
  pph21Status: string
  isThr?: boolean
  monthCount?: number // for multi-month
}
