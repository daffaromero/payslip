import { calculatePph21ForPeriod } from './indonesian-tax'
import { calculateBpjsKesehatan, calculateBpjsKetenagakerjaan } from './bpjs'
import { PayslipCalculationInput, Allowance, Deduction } from '@/types'

export interface CalculationResult {
  grossPay: number
  pph21: number
  bpjsKesehatan: number
  bpjsKetenagakerjaan: number
  otherDeductions: Deduction[]
  totalDeductions: number
  netPay: number
}

export function calculatePayslip(
  input: PayslipCalculationInput
): CalculationResult {
  const {
    baseSalary,
    overtimeHours = 0,
    hourlyRate = 0,
    bonus = 0,
    thr = 0,
    allowances = [],
    pph21Status,
    isThr = false,
    monthCount = 1,
  } = input

  // Calculate overtime pay (1.5x hourly rate for first hour, 2x after)
  let overtimePay = 0
  if (overtimeHours > 0 && hourlyRate > 0) {
    if (overtimeHours <= 1) {
      overtimePay = overtimeHours * hourlyRate * 1.5
    } else {
      overtimePay = hourlyRate * 1.5 + (overtimeHours - 1) * hourlyRate * 2
    }
  }

  // Calculate total allowances
  const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0)

  // Calculate gross pay
  const grossPay = baseSalary + overtimePay + bonus + thr + totalAllowances

  // Calculate BPJS (based on base salary, not gross)
  const bpjsKesehatan = calculateBpjsKesehatan(baseSalary).employee
  const bpjsKetenagakerjaan = 
    calculateBpjsKetenagakerjaan(baseSalary).jht.employee +
    calculateBpjsKetenagakerjaan(baseSalary).jp.employee

  // Calculate PPh 21
  let pph21 = 0
  if (isThr) {
    // THR uses different calculation (gross-up method or separate calculation)
    // For simplicity, calculate on total including THR
    pph21 = calculatePph21ForPeriod(grossPay, pph21Status, monthCount)
  } else {
    pph21 = calculatePph21ForPeriod(grossPay, pph21Status, monthCount)
  }

  // Total deductions
  const totalDeductions = pph21 + bpjsKesehatan + bpjsKetenagakerjaan

  // Net pay
  const netPay = grossPay - totalDeductions

  return {
    grossPay,
    pph21,
    bpjsKesehatan,
    bpjsKetenagakerjaan,
    otherDeductions: [],
    totalDeductions,
    netPay,
  }
}

export function getPeriodLabel(type: string, count: number = 1): string {
  const labels: Record<string, string> = {
    'weekly': 'Mingguan',
    'monthly': 'Bulanan',
    'quarterly': '3 Bulanan',
    'semi-annual': '6 Bulanan',
    'annual': 'Tahunan',
  }
  return labels[type] || type
}

export function getPeriodMonths(type: string): number {
  const months: Record<string, number> = {
    'weekly': 0.25, // approx
    'monthly': 1,
    'quarterly': 3,
    'semi-annual': 6,
    'annual': 12,
  }
  return months[type] || 1
}
