import { describe, it, expect } from 'vitest'
import {
  calculateBpjsKesehatan,
  calculateBpjsKetenagakerjaan,
  calculateTotalBpjsDeductions,
  calculateTotalBpjsEmployerContribution,
} from './bpjs'

describe('calculateBpjsKesehatan', () => {
  it('calculates correct employee and employer for salary below cap', () => {
    const result = calculateBpjsKesehatan(5000000)
    expect(result.employee).toBe(50000) // 1% of 5M
    expect(result.employer).toBe(200000) // 4% of 5M
  })

  it('caps employee and employer at 12,000,000', () => {
    const result = calculateBpjsKesehatan(15000000)
    expect(result.employee).toBe(120000) // 1% of 12M cap
    expect(result.employer).toBe(480000) // 4% of 12M cap
  })

  it('calculates correctly at exact cap amount', () => {
    const result = calculateBpjsKesehatan(12000000)
    expect(result.employee).toBe(120000) // 1% of 12M
    expect(result.employer).toBe(480000) // 4% of 12M
  })

  it('returns zero for zero salary', () => {
    const result = calculateBpjsKesehatan(0)
    expect(result.employee).toBe(0)
    expect(result.employer).toBe(0)
  })

  it('calculates correctly for salary between cap and 15M', () => {
    const result = calculateBpjsKesehatan(8000000)
    expect(result.employee).toBe(80000) // 1% of 8M
    expect(result.employer).toBe(320000) // 4% of 8M
  })
})

describe('calculateBpjsKetenagakerjaan', () => {
  it('calculates all components for salary below cap', () => {
    const result = calculateBpjsKetenagakerjaan(5000000)
    
    expect(result.jkk).toBe(12000) // 0.24% of 5M
    expect(result.jkm).toBe(15000) // 0.3% of 5M
    expect(result.jht.employee).toBe(100000) // 2% of 5M
    expect(result.jht.employer).toBe(185000) // 3.7% of 5M
    expect(result.jp.employee).toBe(50000) // 1% of 5M
    expect(result.jp.employer).toBe(100000) // 2% of 5M
  })

  it('caps JHT and JP at 10,000,000', () => {
    const result = calculateBpjsKetenagakerjaan(15000000)
    
    expect(result.jht.employee).toBe(200000) // 2% of 10M cap
    expect(result.jht.employer).toBe(370000) // 3.7% of 10M cap
    expect(result.jp.employee).toBe(100000) // 1% of 10M cap
    expect(result.jp.employer).toBe(200000) // 2% of 10M cap
  })

  it('calculates correctly at exact cap amount', () => {
    const result = calculateBpjsKetenagakerjaan(10000000)
    
    expect(result.jkk).toBe(24000) // 0.24% of 10M
    expect(result.jkm).toBe(30000) // 0.3% of 10M
    expect(result.jht.employee).toBe(200000) // 2% of 10M
    expect(result.jht.employer).toBe(370000) // 3.7% of 10M
    expect(result.jp.employee).toBe(100000) // 1% of 10M
    expect(result.jp.employer).toBe(200000) // 2% of 10M
  })

  it('returns zeros for zero salary', () => {
    const result = calculateBpjsKetenagakerjaan(0)
    
    expect(result.jkk).toBe(0)
    expect(result.jkm).toBe(0)
    expect(result.jht.employee).toBe(0)
    expect(result.jht.employer).toBe(0)
    expect(result.jp.employee).toBe(0)
    expect(result.jp.employer).toBe(0)
  })

  it('calculates correctly for 10M salary (boundary)', () => {
    const result = calculateBpjsKetenagakerjaan(10000000)
    
    expect(result.jkk).toBe(24000)
    expect(result.jkm).toBe(30000)
    expect(result.jht.employee).toBe(200000)
    expect(result.jht.employer).toBe(370000)
    expect(result.jp.employee).toBe(100000)
    expect(result.jp.employer).toBe(200000)
  })
})

describe('calculateTotalBpjsDeductions', () => {
  it('sums employee deductions: Kesehatan + JHT + JP', () => {
    const result = calculateTotalBpjsDeductions(5000000)
    // Kesehatan employee: 50,000
    // JHT employee: 100,000
    // JP employee: 50,000
    expect(result).toBe(200000)
  })

  it('caps at 12M for Kesehatan and 10M for JHT/JP', () => {
    const result = calculateTotalBpjsDeductions(15000000)
    // Kesehatan employee: 120,000 (capped at 12M)
    // JHT employee: 200,000 (capped at 10M)
    // JP employee: 100,000 (capped at 10M)
    expect(result).toBe(420000)
  })

  it('calculates correctly at exact Kesehatan cap', () => {
    const result = calculateTotalBpjsDeductions(12000000)
    // Kesehatan employee: 120,000
    // JHT employee: 200,000 (capped at 10M)
    // JP employee: 100,000 (capped at 10M)
    expect(result).toBe(420000)
  })

  it('returns zero for zero salary', () => {
    const result = calculateTotalBpjsDeductions(0)
    expect(result).toBe(0)
  })
})

describe('calculateTotalBpjsEmployerContribution', () => {
  it('sums employer contributions: Kesehatan + JKK + JKM + JHT + JP', () => {
    const result = calculateTotalBpjsEmployerContribution(5000000)
    // Kesehatan employer: 200,000
    // JKK: 12,000
    // JKM: 15,000
    // JHT employer: 185,000
    // JP employer: 100,000
    expect(result).toBe(512000)
  })

  it('caps contributions correctly', () => {
    const result = calculateTotalBpjsEmployerContribution(15000000)
    // Kesehatan employer: 480,000 (capped at 12M)
    // JKK: 24,000 (capped at 10M)
    // JKM: 30,000 (capped at 10M)
    // JHT employer: 370,000 (capped at 10M)
    // JP employer: 200,000 (capped at 10M)
    expect(result).toBe(1104000)
  })

  it('calculates correctly at exact caps', () => {
    const result = calculateTotalBpjsEmployerContribution(12000000)
    // Kesehatan employer: 480,000 (12M * 4%)
    // JKK: 24,000 (capped at 10M)
    // JKM: 30,000 (capped at 10M)
    // JHT employer: 370,000 (capped at 10M)
    // JP employer: 200,000 (capped at 10M)
    expect(result).toBe(1104000)
  })

  it('returns zero for zero salary', () => {
    const result = calculateTotalBpjsEmployerContribution(0)
    expect(result).toBe(0)
  })

  it('calculates correctly for realistic salary of 8M', () => {
    const result = calculateTotalBpjsEmployerContribution(8000000)
    // Kesehatan employer: 320,000 (8M * 4%)
    // JKK: 19,200 (8M * 0.24%)
    // JKM: 24,000 (8M * 0.3%)
    // JHT employer: 296,000 (8M * 3.7%)
    // JP employer: 160,000 (8M * 2%)
    expect(result).toBe(819200)
  })
})
