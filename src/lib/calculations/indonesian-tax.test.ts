import { describe, it, expect } from 'vitest'
import { getPtkpAmount, calculatePph21Annual, calculatePph21Monthly, calculatePph21ForPeriod } from './indonesian-tax'

describe('Indonesian Tax Calculations - PPh 21', () => {
  describe('getPtkpAmount', () => {
    it('returns correct PTKP amount for TK/0 (single, no dependents)', () => {
      expect(getPtkpAmount('TK/0')).toBe(54000000)
    })

    it('returns correct PTKP amount for TK/1', () => {
      expect(getPtkpAmount('TK/1')).toBe(58500000)
    })

    it('returns correct PTKP amount for TK/2', () => {
      expect(getPtkpAmount('TK/2')).toBe(63000000)
    })

    it('returns correct PTKP amount for TK/3', () => {
      expect(getPtkpAmount('TK/3')).toBe(67500000)
    })

    it('returns correct PTKP amount for K/0 (married, no dependents)', () => {
      expect(getPtkpAmount('K/0')).toBe(58500000)
    })

    it('returns correct PTKP amount for K/1', () => {
      expect(getPtkpAmount('K/1')).toBe(63000000)
    })

    it('returns correct PTKP amount for K/2', () => {
      expect(getPtkpAmount('K/2')).toBe(67500000)
    })

    it('returns correct PTKP amount for K/3', () => {
      expect(getPtkpAmount('K/3')).toBe(72000000)
    })

    it('returns correct PTKP amount for K/I/0 (married with spouse income)', () => {
      expect(getPtkpAmount('K/I/0')).toBe(112500000)
    })

    it('returns correct PTKP amount for K/I/1', () => {
      expect(getPtkpAmount('K/I/1')).toBe(117000000)
    })

    it('returns correct PTKP amount for K/I/2', () => {
      expect(getPtkpAmount('K/I/2')).toBe(121500000)
    })

    it('returns correct PTKP amount for K/I/3', () => {
      expect(getPtkpAmount('K/I/3')).toBe(126000000)
    })

    it('returns TK/0 default for invalid status', () => {
      expect(getPtkpAmount('INVALID')).toBe(54000000)
      expect(getPtkpAmount('')).toBe(54000000)
      expect(getPtkpAmount('TK/4')).toBe(54000000)
    })
  })

  describe('calculatePph21Annual', () => {
    it('returns zero tax for zero income', () => {
      expect(calculatePph21Annual(0, 'TK/0')).toBe(0)
    })

    it('returns zero tax when income equals PTKP (TK/0)', () => {
      expect(calculatePph21Annual(54000000, 'TK/0')).toBe(0)
    })

    it('returns zero tax when income is below PTKP (TK/0)', () => {
      expect(calculatePph21Annual(50000000, 'TK/0')).toBe(0)
    })

    it('calculates tax correctly in single bracket (5%) for income below 60M', () => {
      const taxableIncome = 60000000 - 54000000
      const expectedTax = taxableIncome * 0.05
      expect(calculatePph21Annual(60000000, 'TK/0')).toBe(expectedTax)
    })

    it('calculates tax correctly for 60M gross annual with TK/0 status', () => {
      const grossAnnual = 60000000
      const ptkp = 54000000
      const taxableIncome = grossAnnual - ptkp
      const expectedTax = taxableIncome * 0.05
      expect(calculatePph21Annual(grossAnnual, 'TK/0')).toBe(expectedTax)
    })

    it('calculates tax correctly across two brackets (5% and 15%)', () => {
      const grossAnnual = 150000000
      const ptkp = 54000000
      const taxableIncome = grossAnnual - ptkp

      const bracket1Tax = (60000000) * 0.05
      const bracket2Tax = (taxableIncome - 60000000) * 0.15
      const expectedTax = bracket1Tax + bracket2Tax

      expect(calculatePph21Annual(grossAnnual, 'TK/0')).toBe(expectedTax)
    })

    it('calculates tax correctly across three brackets (5%, 15%, 25%)', () => {
      const grossAnnual = 350000000
      const ptkp = 54000000
      const taxableIncome = grossAnnual - ptkp

      const bracket1Tax = 60000000 * 0.05
      const bracket2Tax = (250000000 - 60000000) * 0.15
      const bracket3Tax = (taxableIncome - 250000000) * 0.25
      const expectedTax = bracket1Tax + bracket2Tax + bracket3Tax

      expect(calculatePph21Annual(grossAnnual, 'TK/0')).toBe(expectedTax)
    })

    it('calculates tax correctly across four brackets (5%, 15%, 25%, 30%)', () => {
      const grossAnnual = 1000000000
      const ptkp = 54000000
      const taxableIncome = grossAnnual - ptkp

      const bracket1Tax = 60000000 * 0.05
      const bracket2Tax = (250000000 - 60000000) * 0.15
      const bracket3Tax = (500000000 - 250000000) * 0.25
      const bracket4Tax = (taxableIncome - 500000000) * 0.30
      const expectedTax = bracket1Tax + bracket2Tax + bracket3Tax + bracket4Tax

      expect(calculatePph21Annual(grossAnnual, 'TK/0')).toBe(expectedTax)
    })

    it('calculates tax correctly across all five brackets including 35%', () => {
      const grossAnnual = 6000000000
      const ptkp = 54000000
      const taxableIncome = grossAnnual - ptkp

      const bracket1Tax = 60000000 * 0.05
      const bracket2Tax = (250000000 - 60000000) * 0.15
      const bracket3Tax = (500000000 - 250000000) * 0.25
      const bracket4Tax = (5000000000 - 500000000) * 0.30
      const bracket5Tax = (taxableIncome - 5000000000) * 0.35
      const expectedTax = bracket1Tax + bracket2Tax + bracket3Tax + bracket4Tax + bracket5Tax

      expect(calculatePph21Annual(grossAnnual, 'TK/0')).toBe(expectedTax)
    })

    it('uses TK/0 PTKP for invalid ptkpStatus', () => {
      const grossAnnual = 60000000
      expect(calculatePph21Annual(grossAnnual, 'INVALID')).toBe(
        calculatePph21Annual(grossAnnual, 'TK/0')
      )
    })

    it('calculates correctly with K/0 status (higher PTKP)', () => {
      const grossAnnual = 100000000
      const ptkpK0 = 58500000
      const ptkpTK0 = 54000000
      const taxableIncomeK0 = grossAnnual - ptkpK0
      const taxableIncomeTK0 = grossAnnual - ptkpTK0

      expect(taxableIncomeK0).toBeLessThan(taxableIncomeTK0)
      expect(calculatePph21Annual(grossAnnual, 'K/0')).toBeLessThan(
        calculatePph21Annual(grossAnnual, 'TK/0')
      )
    })

    it('calculates correctly with K/I/0 status (highest PTKP)', () => {
      const grossAnnual = 200000000
      expect(calculatePph21Annual(grossAnnual, 'K/I/0')).toBeLessThan(
        calculatePph21Annual(grossAnnual, 'K/0')
      )
      expect(calculatePph21Annual(grossAnnual, 'K/I/0')).toBeLessThan(
        calculatePph21Annual(grossAnnual, 'TK/0')
      )
    })
  })

  describe('calculatePph21Monthly', () => {
    it('returns zero tax for zero monthly gross', () => {
      expect(calculatePph21Monthly(0, 'TK/0')).toBe(0)
    })

    it('returns zero tax when annualized income is below PTKP', () => {
      const monthlyGross = 4000000
      expect(calculatePph21Monthly(monthlyGross, 'TK/0')).toBe(0)
    })

    it('annualizes then divides by 12 correctly', () => {
      const monthlyGross = 5000000
      const annualGross = monthlyGross * 12
      const annualTax = calculatePph21Annual(annualGross, 'TK/0')
      const expectedMonthly = Math.round(annualTax / 12)
      expect(calculatePph21Monthly(monthlyGross, 'TK/0')).toBe(expectedMonthly)
    })

    it('calculates correctly for 5M monthly (60M annual)', () => {
      const monthlyGross = 5000000
      const annualGross = monthlyGross * 12
      const annualTax = calculatePph21Annual(annualGross, 'TK/0')
      const expectedMonthly = Math.round(annualTax / 12)
      expect(calculatePph21Monthly(monthlyGross, 'TK/0')).toBe(expectedMonthly)
      expect(expectedMonthly).toBe(25000)
    })

    it('calculates correctly for 10M monthly (120M annual)', () => {
      const monthlyGross = 10000000
      const annualGross = 120000000
      const annualTax = calculatePph21Annual(annualGross, 'TK/0')
      const expectedMonthly = Math.round(annualTax / 12)
      expect(calculatePph21Monthly(monthlyGross, 'TK/0')).toBe(expectedMonthly)
    })

    it('calculates correctly for 15M monthly (180M annual)', () => {
      const monthlyGross = 15000000
      const annualGross = 180000000
      const annualTax = calculatePph21Annual(annualGross, 'TK/0')
      const expectedMonthly = Math.round(annualTax / 12)
      expect(calculatePph21Monthly(monthlyGross, 'TK/0')).toBe(expectedMonthly)
    })

    it('calculates correctly for high income (50M monthly)', () => {
      const monthlyGross = 50000000
      const annualGross = 600000000
      const annualTax = calculatePph21Annual(annualGross, 'TK/0')
      const expectedMonthly = Math.round(annualTax / 12)
      expect(calculatePph21Monthly(monthlyGross, 'TK/0')).toBe(expectedMonthly)
    })

    it('works correctly with different PTKP statuses', () => {
      const monthlyGross = 10000000
      expect(calculatePph21Monthly(monthlyGross, 'TK/0')).toBeGreaterThan(0)
      expect(calculatePph21Monthly(monthlyGross, 'K/0')).toBeGreaterThan(0)
      expect(calculatePph21Monthly(monthlyGross, 'K/I/0')).toBeGreaterThan(0)
    })

    it('results in lower tax with higher PTKP status', () => {
      const monthlyGross = 15000000
      const taxTK0 = calculatePph21Monthly(monthlyGross, 'TK/0')
      const taxK0 = calculatePph21Monthly(monthlyGross, 'K/0')
      const taxKI0 = calculatePph21Monthly(monthlyGross, 'K/I/0')

      expect(taxK0).toBeLessThan(taxTK0)
      expect(taxKI0).toBeLessThan(taxK0)
    })
  })

  describe('calculatePph21ForPeriod', () => {
    it('returns same result as monthly calculation for monthCount=1', () => {
      const grossAmount = 10000000
      expect(calculatePph21ForPeriod(grossAmount, 'TK/0', 1)).toBe(
        calculatePph21Monthly(grossAmount, 'TK/0')
      )
    })

    it('verifies monthlyAverage equals grossAmount / monthCount for quarterly', () => {
      const grossAmount = 30000000
      const monthCount = 3
      const monthlyAverage = grossAmount / monthCount
      expect(monthlyAverage).toBe(10000000)
    })

    it('calculates correctly for quarterly period (3 months)', () => {
      const grossAmount = 30000000
      const monthlyTax = calculatePph21Monthly(10000000, 'TK/0')
      const expectedTax = Math.round(monthlyTax * 3)
      expect(calculatePph21ForPeriod(grossAmount, 'TK/0', 3)).toBe(expectedTax)
    })

    it('calculates correctly for semi-annual period (6 months)', () => {
      const grossAmount = 60000000
      const monthlyTax = calculatePph21Monthly(10000000, 'TK/0')
      const expectedTax = Math.round(monthlyTax * 6)
      expect(calculatePph21ForPeriod(grossAmount, 'TK/0', 6)).toBe(expectedTax)
    })

    it('calculates correctly for annual period (12 months)', () => {
      const grossAmount = 120000000
      const monthlyTax = calculatePph21Monthly(10000000, 'TK/0')
      const expectedTax = Math.round(monthlyTax * 12)
      expect(calculatePph21ForPeriod(grossAmount, 'TK/0', 12)).toBe(expectedTax)
    })

    it('verifies monthlyAverage is correct for various periods', () => {
      const quarterly = calculatePph21ForPeriod(30000000, 'TK/0', 3)
      const semiannual = calculatePph21ForPeriod(60000000, 'TK/0', 6)
      const annual = calculatePph21ForPeriod(120000000, 'TK/0', 12)

      expect(quarterly).toBeLessThan(semiannual)
      expect(semiannual).toBeLessThan(annual)
    })

    it('handles different PTKP statuses correctly for period calculations', () => {
      const grossAmount = 30000000
      const taxTK0 = calculatePph21ForPeriod(grossAmount, 'TK/0', 3)
      const taxK0 = calculatePph21ForPeriod(grossAmount, 'K/0', 3)
      const taxKI0 = calculatePph21ForPeriod(grossAmount, 'K/I/0', 3)

      expect(taxK0).toBeLessThan(taxTK0)
      expect(taxKI0).toBeLessThan(taxK0)
    })

    it('returns zero for zero gross amount regardless of period', () => {
      expect(calculatePph21ForPeriod(0, 'TK/0', 1)).toBe(0)
      expect(calculatePph21ForPeriod(0, 'TK/0', 3)).toBe(0)
      expect(calculatePph21ForPeriod(0, 'TK/0', 12)).toBe(0)
    })
  })
})
