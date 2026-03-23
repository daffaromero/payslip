/**
 * Indonesian PPh 21 (Income Tax) Calculation
 * Based on UU HPP (2022) progressive tax brackets
 */

const TAX_BRACKETS = [
  { limit: 60000000, rate: 0.05 },      // 0 - 60jt: 5%
  { limit: 250000000, rate: 0.15 },    // 60jt - 250jt: 15%
  { limit: 500000000, rate: 0.25 },    // 250jt - 500jt: 25%
  { limit: 5000000000, rate: 0.30 },   // 500jt - 5M: 30%
  { limit: Infinity, rate: 0.35 },     // > 5M: 35%
]

// PTKP (Non-Taxable Income) amounts 2024
const PTKP_AMOUNTS: Record<string, number> = {
  'TK/0': 54000000,
  'TK/1': 58500000,
  'TK/2': 63000000,
  'TK/3': 67500000,
  'K/0': 58500000,
  'K/1': 63000000,
  'K/2': 67500000,
  'K/3': 72000000,
  'K/I/0': 112500000,
  'K/I/1': 117000000,
  'K/I/2': 121500000,
  'K/I/3': 126000000,
}

export function getPtkpAmount(status: string): number {
  return PTKP_AMOUNTS[status] || PTKP_AMOUNTS['TK/0']
}

export function calculatePph21Annual(grossAnnual: number, ptkpStatus: string): number {
  const ptkp = getPtkpAmount(ptkpStatus)
  const taxableIncome = Math.max(0, grossAnnual - ptkp)
  
  let tax = 0
  let remainingIncome = taxableIncome
  let previousLimit = 0
  
  for (const bracket of TAX_BRACKETS) {
    if (remainingIncome <= 0) break
    
    const bracketAmount = Math.min(remainingIncome, bracket.limit - previousLimit)
    tax += bracketAmount * bracket.rate
    remainingIncome -= bracketAmount
    previousLimit = bracket.limit
  }
  
  return tax
}

export function calculatePph21Monthly(
  grossMonthly: number, 
  ptkpStatus: string,
  monthOfYear: number = new Date().getMonth() + 1
): number {
  // Annualize the income
  const grossAnnual = grossMonthly * 12
  const annualTax = calculatePph21Annual(grossAnnual, ptkpStatus)
  
  // Divide by 12 for monthly
  return Math.round(annualTax / 12)
}

export function calculatePph21ForPeriod(
  grossAmount: number,
  ptkpStatus: string,
  monthCount: number = 1
): number {
  // For multi-month payslips (quarterly, semi-annual, annual)
  const monthlyAverage = grossAmount / monthCount
  const monthlyTax = calculatePph21Monthly(monthlyAverage, ptkpStatus)
  return Math.round(monthlyTax * monthCount)
}
