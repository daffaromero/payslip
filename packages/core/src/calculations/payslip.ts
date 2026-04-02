import { calculatePph21ForPeriod } from './indonesian-tax'
import { calculateBpjsKesehatan, calculateBpjsKetenagakerjaan } from './bpjs'
import type { PayslipCalculationInput, Allowance, Deduction } from '../types'

export interface CalculationResult {
  grossPay: number
  pph21: number
  bpjsKesehatan: number
  bpjsTkJht: number
  bpjsTkJp: number
  otherDeductions: Deduction[]
  totalDeductions: number
  netPay: number
}

export function calculatePayslip(input: PayslipCalculationInput): CalculationResult {
  const {
    baseSalary,
    overtimeHours = 0,
    hourlyRate = 0,
    bonus = 0,
    thr = 0,
    allowances = [],
    otherDeductions = [],
    pph21Status,
    monthCount = 1,
  } = input

  let overtimePay = 0
  if (overtimeHours > 0 && hourlyRate > 0) {
    if (overtimeHours <= 1) {
      overtimePay = overtimeHours * hourlyRate * 1.5
    } else {
      overtimePay = hourlyRate * 1.5 + (overtimeHours - 1) * hourlyRate * 2
    }
  }

  const totalAllowances = (allowances as Allowance[]).reduce((sum, a) => sum + a.amount, 0)
  const grossPay = baseSalary + overtimePay + bonus + thr + totalAllowances

  const bpjsKesehatan = calculateBpjsKesehatan(baseSalary).employee
  const ketena = calculateBpjsKetenagakerjaan(baseSalary)
  const bpjsTkJht = ketena.jht.employee
  const bpjsTkJp = ketena.jp.employee

  const pph21 = calculatePph21ForPeriod(grossPay, pph21Status, monthCount)

  const otherDeductionsTotal = (otherDeductions as Deduction[]).reduce((sum, d) => sum + d.amount, 0)
  const totalDeductions = pph21 + bpjsKesehatan + bpjsTkJht + bpjsTkJp + otherDeductionsTotal
  const netPay = grossPay - totalDeductions

  return {
    grossPay,
    pph21,
    bpjsKesehatan,
    bpjsTkJht,
    bpjsTkJp,
    otherDeductions: otherDeductions as Deduction[],
    totalDeductions,
    netPay,
  }
}

export function getPeriodLabel(type: string): string {
  const labels: Record<string, string> = {
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    quarterly: '3 Bulanan',
    'semi-annual': '6 Bulanan',
    annual: 'Tahunan',
  }
  return labels[type] || type
}

export function getPeriodMonths(type: string): number {
  const months: Record<string, number> = {
    weekly: 0.25,
    monthly: 1,
    quarterly: 3,
    'semi-annual': 6,
    annual: 12,
  }
  return months[type] || 1
}
