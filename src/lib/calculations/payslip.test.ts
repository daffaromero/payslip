import { describe, it, expect } from 'vitest'
import { calculatePayslip, getPeriodLabel, getPeriodMonths } from './payslip'
import { calculatePph21Monthly } from './indonesian-tax'
import { calculateBpjsKesehatan, calculateBpjsKetenagakerjaan } from './bpjs'

describe('calculatePayslip', () => {
  describe('Basic Calculation', () => {
    it('calculates all components correctly for simple salary with no extras', () => {
      const input = {
        baseSalary: 10000000,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      // Overtime: 0 hours, so 0
      expect(result.grossPay).toBe(10000000)

      // BPJS Kesehatan: 1% of baseSalary (capped at 12M)
      const expectedBpjsKesehatan = calculateBpjsKesehatan(10000000).employee
      expect(result.bpjsKesehatan).toBe(expectedBpjsKesehatan)

      // BPJS Ketenagakerjaan: JHT(2%) + JP(1%) of baseSalary (capped at 10M)
      const ketenaga = calculateBpjsKetenagakerjaan(10000000)
      const expectedBpjsKetenagakerjaan = ketenaga.jht.employee + ketenaga.jp.employee
      expect(result.bpjsKetenagakerjaan).toBe(expectedBpjsKetenagakerjaan)

      // PPh 21: based on grossPay (which is just baseSalary here)
      const expectedPph21 = calculatePph21Monthly(10000000, 'TK/0')
      expect(result.pph21).toBe(expectedPph21)

      // Other deductions: none
      expect(result.otherDeductions).toEqual([])

      // Total deductions
      const expectedTotalDeductions = expectedPph21 + expectedBpjsKesehatan + expectedBpjsKetenagakerjaan
      expect(result.totalDeductions).toBe(expectedTotalDeductions)

      // Net pay
      expect(result.netPay).toBe(result.grossPay - result.totalDeductions)
    })

    it('calculates correctly for employee with 10M salary, 5M bonus, 2 hours OT', () => {
      const input = {
        baseSalary: 10000000,
        bonus: 5000000,
        overtimeHours: 2,
        hourlyRate: 100000,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      // Overtime: 1st hour at 1.5x, 2nd hour at 2x
      // 1 * 100000 * 1.5 + 1 * 100000 * 2 = 150000 + 200000 = 350000
      const expectedOvertimePay = 350000
      expect(result.grossPay).toBe(10000000 + expectedOvertimePay + 5000000)

      // Verify net pay calculation
      expect(result.netPay).toBe(result.grossPay - result.totalDeductions)
    })
  })

  describe('Overtime', () => {
    it('calculates 1 hour overtime at 1.5x rate', () => {
      const input = {
        baseSalary: 10000000,
        overtimeHours: 1,
        hourlyRate: 100000,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      // 1 hour at 1.5x = 150000
      expect(result.grossPay).toBe(10000000 + 150000)
    })

    it('calculates 3 hours overtime (1.5x first hour, 2x subsequent)', () => {
      const input = {
        baseSalary: 10000000,
        overtimeHours: 3,
        hourlyRate: 100000,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      // 1 hour at 1.5x = 150000
      // 2 hours at 2x = 400000
      // Total = 550000
      expect(result.grossPay).toBe(10000000 + 550000)
    })

    it('returns 0 overtimePay when no hourly rate provided', () => {
      const input = {
        baseSalary: 10000000,
        overtimeHours: 5,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      expect(result.grossPay).toBe(10000000) // No overtime pay added
    })

    it('returns 0 overtimePay when hourly rate is 0', () => {
      const input = {
        baseSalary: 10000000,
        overtimeHours: 5,
        hourlyRate: 0,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      expect(result.grossPay).toBe(10000000) // No overtime pay added
    })
  })

  describe('Allowances', () => {
    it('calculates correctly with single allowance', () => {
      const input = {
        baseSalary: 10000000,
        allowances: [{ name: 'Transport', amount: 500000 }],
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      expect(result.grossPay).toBe(10500000)
    })

    it('calculates correctly with multiple allowances', () => {
      const input = {
        baseSalary: 10000000,
        allowances: [
          { name: 'Transport', amount: 500000 },
          { name: 'Meal', amount: 300000 },
          { name: 'Phone', amount: 200000 },
        ],
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      expect(result.grossPay).toBe(11000000) // 10M + 500k + 300k + 200k
    })

    it('calculates correctly with no allowances', () => {
      const input = {
        baseSalary: 10000000,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      expect(result.grossPay).toBe(10000000)
    })
  })

  describe('Other Deductions', () => {
    it('calculates correctly with single other deduction', () => {
      const input = {
        baseSalary: 10000000,
        otherDeductions: [{ name: 'Union Dues', amount: 50000 }],
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      expect(result.otherDeductions).toEqual([{ name: 'Union Dues', amount: 50000 }])
      expect(result.totalDeductions).toBeGreaterThan(result.pph21 + result.bpjsKesehatan + result.bpjsKetenagakerjaan)
    })

    it('calculates correctly with multiple other deductions', () => {
      const input = {
        baseSalary: 10000000,
        otherDeductions: [
          { name: 'Union Dues', amount: 50000 },
          { name: 'Savings', amount: 100000 },
        ],
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      expect(result.otherDeductions).toHaveLength(2)
    })

    it('includes other deductions in totalDeductions', () => {
      const otherDeductionTotal = 150000
      const input = {
        baseSalary: 10000000,
        otherDeductions: [
          { name: 'Union Dues', amount: 50000 },
          { name: 'Savings', amount: 100000 },
        ],
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      const expectedTotalDeductions =
        result.pph21 + result.bpjsKesehatan + result.bpjsKetenagakerjaan + otherDeductionTotal
      expect(result.totalDeductions).toBe(expectedTotalDeductions)
    })
  })

  describe('THR (Tunjangan Hari Raya)', () => {
    it('THR affects grossPay but not BPJS', () => {
      const thrAmount = 10000000
      const input = {
        baseSalary: 10000000,
        thr: thrAmount,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      // THR should be included in gross pay
      expect(result.grossPay).toBe(20000000) // baseSalary + THR

      // BPJS should be calculated from baseSalary only, not including THR
      const bpjsKesehatan = calculateBpjsKesehatan(10000000).employee
      const ketenaga = calculateBpjsKetenagakerjaan(10000000)
      const bpjsKetenagakerjaan = ketenaga.jht.employee + ketenaga.jp.employee

      expect(result.bpjsKesehatan).toBe(bpjsKesehatan)
      expect(result.bpjsKetenagakerjaan).toBe(bpjsKetenagakerjaan)
    })
  })

  describe('Multi-period', () => {
    it('calculates correctly for monthly period (monthCount=1)', () => {
      const input = {
        baseSalary: 10000000,
        pph21Status: 'TK/0',
        monthCount: 1,
      }

      const result = calculatePayslip(input)

      // PPh 21 for 1 month = monthly tax
      const expectedPph21 = calculatePph21Monthly(10000000, 'TK/0')
      expect(result.pph21).toBe(expectedPph21)
    })

    it('calculates correctly for quarterly period (monthCount=3)', () => {
      // For quarterly, grossPay is total for 3 months (baseSalary * 3)
      const input = {
        baseSalary: 30000000,
        pph21Status: 'TK/0',
        monthCount: 3,
      }

      const result = calculatePayslip(input)

      // PPh 21 for 3 months = monthly tax * 3
      const monthlyTax = calculatePph21Monthly(10000000, 'TK/0')
      const expectedPph21 = Math.round(monthlyTax * 3)
      expect(result.pph21).toBe(expectedPph21)
    })

    it('calculates correctly for semi-annual period (monthCount=6)', () => {
      // For semi-annual, grossPay is total for 6 months (baseSalary * 6)
      const input = {
        baseSalary: 60000000,
        pph21Status: 'TK/0',
        monthCount: 6,
      }

      const result = calculatePayslip(input)

      const monthlyTax = calculatePph21Monthly(10000000, 'TK/0')
      const expectedPph21 = Math.round(monthlyTax * 6)
      expect(result.pph21).toBe(expectedPph21)
    })

    it('calculates correctly for annual period (monthCount=12)', () => {
      // For annual, grossPay is total for 12 months (baseSalary * 12)
      const input = {
        baseSalary: 120000000,
        pph21Status: 'TK/0',
        monthCount: 12,
      }

      const result = calculatePayslip(input)

      const monthlyTax = calculatePph21Monthly(10000000, 'TK/0')
      const expectedPph21 = Math.round(monthlyTax * 12)
      expect(result.pph21).toBe(expectedPph21)
    })
  })

  describe('Edge Cases', () => {
    it('handles zero base salary', () => {
      const input = {
        baseSalary: 0,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      expect(result.grossPay).toBe(0)
      expect(result.pph21).toBe(0)
      expect(result.bpjsKesehatan).toBe(0)
      expect(result.bpjsKetenagakerjaan).toBe(0)
      expect(result.netPay).toBe(0)
    })

    it('handles missing optional fields with defaults', () => {
      const input = {
        baseSalary: 5000000,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      expect(result.grossPay).toBe(5000000)
      expect(result.otherDeductions).toEqual([])
    })

    it('handles high salary above BPJS caps', () => {
      const input = {
        baseSalary: 20000000,
        pph21Status: 'TK/0',
      }

      const result = calculatePayslip(input)

      // BPJS Kesehatan capped at 12M: 1% = 120000
      expect(result.bpjsKesehatan).toBe(120000)

      // BPJS Ketenagakerjaan JHT+JP capped at 10M: 2% + 1% = 300000
      expect(result.bpjsKetenagakerjaan).toBe(300000)
    })
  })

  describe('Net Pay Verification', () => {
    it('netPay equals grossPay minus totalDeductions', () => {
      const input = {
        baseSalary: 10000000,
        bonus: 2000000,
        overtimeHours: 2,
        hourlyRate: 75000,
        allowances: [{ name: 'Transport', amount: 500000 }],
        otherDeductions: [{ name: 'Savings', amount: 100000 }],
        pph21Status: 'K/0',
      }

      const result = calculatePayslip(input)

      expect(result.netPay).toBe(result.grossPay - result.totalDeductions)
    })

    it('netPay is always grossPay minus all deductions', () => {
      const input = {
        baseSalary: 15000000,
        bonus: 5000000,
        thr: 15000000,
        overtimeHours: 5,
        hourlyRate: 150000,
        allowances: [
          { name: 'Transport', amount: 1000000 },
          { name: 'Meal', amount: 500000 },
        ],
        otherDeductions: [
          { name: 'Union', amount: 100000 },
          { name: 'Savings', amount: 500000 },
        ],
        pph21Status: 'TK/2',
      }

      const result = calculatePayslip(input)

      const expectedTotalDeductions =
        result.pph21 +
        result.bpjsKesehatan +
        result.bpjsKetenagakerjaan +
        result.otherDeductions.reduce((sum, d) => sum + d.amount, 0)

      expect(result.totalDeductions).toBe(expectedTotalDeductions)
      expect(result.netPay).toBe(result.grossPay - result.totalDeductions)
    })
  })
})

describe('getPeriodLabel', () => {
  it('returns "Mingguan" for weekly', () => {
    expect(getPeriodLabel('weekly')).toBe('Mingguan')
  })

  it('returns "Bulanan" for monthly', () => {
    expect(getPeriodLabel('monthly')).toBe('Bulanan')
  })

  it('returns "3 Bulanan" for quarterly', () => {
    expect(getPeriodLabel('quarterly')).toBe('3 Bulanan')
  })

  it('returns "6 Bulanan" for semi-annual', () => {
    expect(getPeriodLabel('semi-annual')).toBe('6 Bulanan')
  })

  it('returns "Tahunan" for annual', () => {
    expect(getPeriodLabel('annual')).toBe('Tahunan')
  })

  it('returns the input type for invalid period type', () => {
    expect(getPeriodLabel('invalid')).toBe('invalid')
  })

  it('handles period type with count parameter', () => {
    expect(getPeriodLabel('monthly', 3)).toBe('Bulanan')
  })
})

describe('getPeriodMonths', () => {
  it('returns 0.25 for weekly', () => {
    expect(getPeriodMonths('weekly')).toBe(0.25)
  })

  it('returns 1 for monthly', () => {
    expect(getPeriodMonths('monthly')).toBe(1)
  })

  it('returns 3 for quarterly', () => {
    expect(getPeriodMonths('quarterly')).toBe(3)
  })

  it('returns 6 for semi-annual', () => {
    expect(getPeriodMonths('semi-annual')).toBe(6)
  })

  it('returns 12 for annual', () => {
    expect(getPeriodMonths('annual')).toBe(12)
  })

  it('returns 1 (default) for invalid period type', () => {
    expect(getPeriodMonths('invalid')).toBe(1)
    expect(getPeriodMonths('')).toBe(1)
    expect(getPeriodMonths('unknown')).toBe(1)
  })
})
