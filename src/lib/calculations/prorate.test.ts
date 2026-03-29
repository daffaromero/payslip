import { describe, it, expect } from 'vitest'
import { countWorkingDays, getSubPeriods, calcProrate } from './prorate'

// Helpers
// Use local-time Date constructor to avoid UTC-offset issues in timezone environments
const d = (iso: string) => {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(y, m - 1, day)
}
const isoDate = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
const base = {
  prorateType: 'join' as const,
  prorateCalcMode: 'period' as const,
  prorateUseCount: false,
  prorateCount: 1,
  periodCount: 1,
  prorateDayBasis: 'calendar' as const,
}

describe('countWorkingDays', () => {
  it('counts Mon–Fri only', () => {
    // 2025-01-06 (Mon) to 2025-01-10 (Fri) = 5 working days
    expect(countWorkingDays(d('2025-01-06'), d('2025-01-10'))).toBe(5)
  })

  it('skips weekends', () => {
    // 2025-01-04 (Sat) to 2025-01-05 (Sun) = 0 working days
    expect(countWorkingDays(d('2025-01-04'), d('2025-01-05'))).toBe(0)
  })

  it('counts a full week correctly', () => {
    // 2025-01-06 (Mon) to 2025-01-12 (Sun) = 5 working days
    expect(countWorkingDays(d('2025-01-06'), d('2025-01-12'))).toBe(5)
  })

  it('same-day weekday = 1', () => {
    expect(countWorkingDays(d('2025-01-07'), d('2025-01-07'))).toBe(1)
  })

  it('same-day weekend = 0', () => {
    expect(countWorkingDays(d('2025-01-04'), d('2025-01-04'))).toBe(0)
  })
})

describe('getSubPeriods', () => {
  it('n=1 returns single period as-is', () => {
    const subs = getSubPeriods(d('2025-01-01'), d('2025-01-31'), 1)
    expect(subs).toHaveLength(1)
    expect(subs[0].start).toEqual(d('2025-01-01'))
    expect(subs[0].end).toEqual(d('2025-01-31'))
  })

  it('n=3 splits into 3 monthly sub-periods from start date', () => {
    const subs = getSubPeriods(d('2024-12-28'), d('2025-03-27'), 3)
    expect(subs).toHaveLength(3)
    // First sub: Dec 28 – Jan 27
    expect(isoDate(subs[0].start)).toBe('2024-12-28')
    expect(isoDate(subs[0].end)).toBe('2025-01-27')
    // Second sub: Jan 28 – Feb 27
    expect(isoDate(subs[1].start)).toBe('2025-01-28')
    expect(isoDate(subs[1].end)).toBe('2025-02-27')
    // Third sub: Feb 28 – Mar 27 (end matches original)
    expect(isoDate(subs[2].start)).toBe('2025-02-28')
    expect(isoDate(subs[2].end)).toBe('2025-03-27')
  })
})

describe('calcProrate — useCount mode', () => {
  it('2 out of 3 periods = 2/3', () => {
    const r = calcProrate({ ...base, startDate: d('2025-01-01'), endDate: d('2025-03-31'), prorateUseCount: true, prorateCount: 2, periodCount: 3 })
    expect(r.prorateFactor).toBeCloseTo(2 / 3)
    expect(r.prorateBreakdown).toBeNull()
  })

  it('clamps to 1 when count exceeds periods', () => {
    const r = calcProrate({ ...base, startDate: d('2025-01-01'), endDate: d('2025-03-31'), prorateUseCount: true, prorateCount: 5, periodCount: 3 })
    expect(r.prorateFactor).toBe(1)
  })
})

describe('calcProrate — span mode (calendar)', () => {
  it('join mid-period: gaji pokok 8.5M, joined Jan 10, period Jan 1–31', () => {
    // Jan 10–31 = 22 days worked out of 31 total
    const r = calcProrate({ ...base, startDate: d('2025-01-01'), endDate: d('2025-01-31'), prorateDate: d('2025-01-10'), prorateType: 'join', prorateCalcMode: 'span', periodCount: 1, prorateDayBasis: 'calendar' })
    expect(r.prorateFactor).toBeCloseTo(22 / 31)
  })

  it('resign: last day Jan 20, period Jan 1–31', () => {
    // Jan 1–20 = 20 days worked out of 31
    const r = calcProrate({ ...base, startDate: d('2025-01-01'), endDate: d('2025-01-31'), prorateDate: d('2025-01-20'), prorateType: 'resign', prorateCalcMode: 'span', periodCount: 1, prorateDayBasis: 'calendar' })
    expect(r.prorateFactor).toBeCloseTo(20 / 31)
  })

  it('join on first day = factor 1', () => {
    const r = calcProrate({ ...base, startDate: d('2025-01-01'), endDate: d('2025-01-31'), prorateDate: d('2025-01-01'), prorateType: 'join', prorateCalcMode: 'span', periodCount: 1, prorateDayBasis: 'calendar' })
    expect(r.prorateFactor).toBe(1)
  })
})

describe('calcProrate — span mode (working days)', () => {
  it('join Jan 10, period Jan 1–31, working days basis', () => {
    // Jan has 23 working days (1–31). Jan 10 (Thu) to Jan 31:
    // Jan 10–31 working days: let's count manually. Jan 10 Thu, 13 Mon–17 Fri (5), 20 Mon–24 Fri (5), 27 Mon–31 Fri (5) + Jan 10 Thu = 1+5+5+5+1=17? Let me just trust the function
    const total = countWorkingDays(d('2025-01-01'), d('2025-01-31'))
    const worked = countWorkingDays(d('2025-01-10'), d('2025-01-31'))
    const r = calcProrate({ ...base, startDate: d('2025-01-01'), endDate: d('2025-01-31'), prorateDate: d('2025-01-10'), prorateType: 'join', prorateCalcMode: 'span', periodCount: 1, prorateDayBasis: 'working' })
    expect(r.prorateFactor).toBeCloseTo(worked / total)
  })
})

describe('calcProrate — period mode (3-month, calendar)', () => {
  // The original bug: 8.5M salary, joined Jan 10, period Dec 28–Mar 27 (3 months)
  // Expected: only the first sub-period (Dec 28–Jan 27) is prorated; Jan 28–Mar 27 is full pay
  const startDate = d('2024-12-28')
  const endDate = d('2025-03-27')
  const prorateDate = d('2025-01-10')

  it('join Jan 10 in 3-month period: only first sub-period is partial', () => {
    const r = calcProrate({ ...base, startDate, endDate, prorateDate, prorateType: 'join', prorateCalcMode: 'period', periodCount: 3, prorateDayBasis: 'calendar' })
    expect(r.prorateFactor).not.toBeNull()
    expect(r.prorateBreakdown).toHaveLength(3)
    // First sub-period should be partial (not 0, not 1)
    expect(r.prorateBreakdown![0].pct).toBeGreaterThan(0)
    expect(r.prorateBreakdown![0].pct).toBeLessThan(1)
    // Second and third sub-periods should be full pay
    expect(r.prorateBreakdown![1].pct).toBe(1)
    expect(r.prorateBreakdown![2].pct).toBe(1)
  })

  it('factor is above 2/3 (two full + one partial period)', () => {
    const r = calcProrate({ ...base, startDate, endDate, prorateDate, prorateType: 'join', prorateCalcMode: 'period', periodCount: 3, prorateDayBasis: 'calendar' })
    expect(r.prorateFactor!).toBeGreaterThan(2 / 3)
    expect(r.prorateFactor!).toBeLessThanOrEqual(1)
  })

  it('applied to 8.5M: join Jan 10 in sub-period Dec 28–Jan 27 (18/31 partial + 2 full)', () => {
    // Sub-period 0: Dec 28–Jan 27 = 31 days. Joined Jan 10 → worked 18 days.
    // Factor = (18/31 + 2) / 3 ≈ 0.8602
    const r = calcProrate({ ...base, startDate, endDate, prorateDate, prorateType: 'join', prorateCalcMode: 'period', periodCount: 3, prorateDayBasis: 'calendar' })
    const expectedFactor = (18 / 31 + 2) / 3
    expect(r.prorateFactor!).toBeCloseTo(expectedFactor, 4)
    expect(Math.round(8500000 * r.prorateFactor!)).toBe(Math.round(8500000 * expectedFactor))
  })

  it('resign: last day Jan 20 means first two sub-periods 0, Jan partial', () => {
    // Dec 28–Jan 27 is sub-period 0. Jan 20 falls in sub-period 0.
    // For resign: sub-periods after idx are 0, sub-period at idx is partial, before idx are full
    const r = calcProrate({ ...base, startDate, endDate, prorateDate: d('2025-01-20'), prorateType: 'resign', prorateCalcMode: 'period', periodCount: 3, prorateDayBasis: 'calendar' })
    expect(r.prorateBreakdown![0].pct).toBeGreaterThan(0)
    expect(r.prorateBreakdown![0].pct).toBeLessThan(1)
    expect(r.prorateBreakdown![1].pct).toBe(0)
    expect(r.prorateBreakdown![2].pct).toBe(0)
  })
})

describe('calcProrate — period mode (working days)', () => {
  it('note shows "hari kerja" instead of "hari"', () => {
    const r = calcProrate({ ...base, startDate: d('2024-12-28'), endDate: d('2025-03-27'), prorateDate: d('2025-01-10'), prorateType: 'join', prorateCalcMode: 'period', periodCount: 3, prorateDayBasis: 'working' })
    const partialRow = r.prorateBreakdown!.find(row => row.pct > 0 && row.pct < 1)
    expect(partialRow?.note).toMatch(/hari kerja/)
  })
})

describe('calcProrate — edge cases', () => {
  it('returns null factor when prorateDate is missing', () => {
    const r = calcProrate({ ...base, startDate: d('2025-01-01'), endDate: d('2025-01-31'), prorateDate: undefined, periodCount: 1 })
    expect(r.prorateFactor).toBeNull()
  })

  it('join date before period start = factor 1', () => {
    const r = calcProrate({ ...base, startDate: d('2025-01-01'), endDate: d('2025-03-31'), prorateDate: d('2024-12-01'), prorateType: 'join', prorateCalcMode: 'period', periodCount: 3, prorateDayBasis: 'calendar' })
    expect(r.prorateFactor).toBe(1)
  })

  it('resign date after period end = factor 1', () => {
    const r = calcProrate({ ...base, startDate: d('2025-01-01'), endDate: d('2025-03-31'), prorateDate: d('2025-04-15'), prorateType: 'resign', prorateCalcMode: 'period', periodCount: 3, prorateDayBasis: 'calendar' })
    expect(r.prorateFactor).toBe(1)
  })
})
