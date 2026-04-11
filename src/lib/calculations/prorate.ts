export type ProrateType = 'join' | 'resign'
export type ProrateCalcMode = 'period' | 'span'
export type ProrateDayBasis = 'calendar' | 'working'

export interface SubPeriod {
  start: Date
  end: Date
}

export interface ProrateBreakdownRow {
  label: string
  pct: number
  note: string
}

export interface ProrateResult {
  prorateFactor: number | null
  prorateBreakdown: ProrateBreakdownRow[] | null
}

export function countWorkingDays(start: Date, end: Date): number {
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

export function getSubPeriods(s: Date, e: Date, n: number): SubPeriod[] {
  if (n === 1) return [{ start: s, end: e }]
  return Array.from({ length: n }, (_, i) => ({
    start: new Date(s.getFullYear(), s.getMonth() + i, s.getDate()),
    end: i === n - 1 ? e : new Date(s.getFullYear(), s.getMonth() + i + 1, s.getDate() - 1),
  }))
}

export function calcProrate({
  startDate,
  endDate,
  prorateDate,
  prorateType,
  prorateCalcMode,
  prorateUseCount,
  prorateCount,
  periodCount,
  prorateDayBasis,
  workingDaysActual,
  workingDaysTotal,
}: {
  startDate: Date
  endDate: Date
  prorateDate?: Date
  prorateType: ProrateType
  prorateCalcMode: ProrateCalcMode
  prorateUseCount: boolean
  prorateCount: number
  periodCount: number
  prorateDayBasis: ProrateDayBasis
  workingDaysActual?: number
  workingDaysTotal?: number
}): ProrateResult {
  // Hari Kerja mode: explicit actual/total working day counts
  if (workingDaysActual != null && workingDaysTotal != null && workingDaysTotal > 0) {
    const factor = Math.min(1, Math.max(0, workingDaysActual / workingDaysTotal))
    return {
      prorateFactor: factor,
      prorateBreakdown: [{ label: 'Hari Kerja', pct: factor, note: `${workingDaysActual}/${workingDaysTotal} hari kerja` }],
    }
  }
  const s = startDate
  const e = endDate

  if (prorateUseCount) {
    return { prorateFactor: Math.min(1, Math.max(0, prorateCount / periodCount)), prorateBreakdown: null }
  }

  if (!prorateDate) return { prorateFactor: null, prorateBreakdown: null }
  const d = prorateDate

  if (prorateCalcMode === 'span' || periodCount === 1) {
    const useWD = prorateDayBasis === 'working'
    const total = useWD ? countWorkingDays(s, e) : Math.round((e.getTime() - s.getTime()) / 86400000) + 1
    const workedStart = prorateType === 'join' ? d : s
    const workedEnd = prorateType === 'join' ? e : d
    const worked = Math.max(0, useWD
      ? countWorkingDays(workedStart, workedEnd)
      : Math.round((workedEnd.getTime() - workedStart.getTime()) / 86400000) + 1)
    return { prorateFactor: total > 0 ? Math.min(1, worked / total) : null, prorateBreakdown: null }
  }

  const subs = getSubPeriods(s, e, periodCount)
  const idx = subs.findIndex(p => d >= p.start && d <= p.end)
  if (idx === -1) {
    const f = prorateType === 'join' ? (d <= s ? 1 : 0) : (d >= e ? 1 : 0)
    return { prorateFactor: f, prorateBreakdown: null }
  }

  const sp = subs[idx]
  const useWD = prorateDayBasis === 'working'
  const dayLabel = useWD ? 'hari kerja' : 'hari'
  const spDays = useWD ? countWorkingDays(sp.start, sp.end) : Math.round((sp.end.getTime() - sp.start.getTime()) / 86400000) + 1
  const workedInSp = Math.max(0, useWD
    ? (prorateType === 'join' ? countWorkingDays(d, sp.end) : countWorkingDays(sp.start, d))
    : (prorateType === 'join'
        ? Math.round((sp.end.getTime() - d.getTime()) / 86400000) + 1
        : Math.round((d.getTime() - sp.start.getTime()) / 86400000) + 1))
  const partial = Math.max(0, Math.min(1, spDays > 0 ? workedInSp / spDays : 0))
  const full = prorateType === 'join' ? periodCount - idx - 1 : idx
  const factor = (partial + full) / periodCount

  const fmt = (dt: Date) => dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const breakdown = subs.map((p, i) => {
    const pDays = useWD ? countWorkingDays(p.start, p.end) : Math.round((p.end.getTime() - p.start.getTime()) / 86400000) + 1
    if (prorateType === 'join') {
      if (i < idx) return { label: `${fmt(p.start)}–${fmt(p.end)}`, pct: 0, note: 'tidak bekerja' }
      if (i === idx) return { label: `${fmt(p.start)}–${fmt(p.end)}`, pct: partial, note: `${workedInSp}/${pDays} ${dayLabel}` }
      return { label: `${fmt(p.start)}–${fmt(p.end)}`, pct: 1, note: 'penuh' }
    } else {
      if (i > idx) return { label: `${fmt(p.start)}–${fmt(p.end)}`, pct: 0, note: 'tidak bekerja' }
      if (i === idx) return { label: `${fmt(p.start)}–${fmt(p.end)}`, pct: partial, note: `${workedInSp}/${pDays} ${dayLabel}` }
      return { label: `${fmt(p.start)}–${fmt(p.end)}`, pct: 1, note: 'penuh' }
    }
  })

  return { prorateFactor: factor, prorateBreakdown: breakdown }
}
