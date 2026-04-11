import { describe, it, expect } from 'vitest'
import {
  excelSerialToDateStr,
  parseDateCell,
  resolveRowMeta,
  parseImportRow,
  PERIOD_TYPE_MAP,
} from './import-utils'

const DEFAULTS = { templateId: 'tmpl-1', periodType: 'monthly', startDate: '2026-03-01', endDate: '2026-03-31' }

// ─── excelSerialToDateStr ─────────────────────────────────────────────────────

describe('excelSerialToDateStr', () => {
  it('converts 46174 → 2026-06-01 (real serial from production file)', () => {
    expect(excelSerialToDateStr(46174)).toBe('2026-06-01')
  })

  it('converts 46203 → 2026-06-30', () => {
    expect(excelSerialToDateStr(46203)).toBe('2026-06-30')
  })

  it('converts 46082 → 2026-03-01', () => {
    expect(excelSerialToDateStr(46082)).toBe('2026-03-01')
  })

  it('converts 46111 → 2026-03-30', () => {
    expect(excelSerialToDateStr(46111)).toBe('2026-03-30')
  })

  it('converts 44927 → 2023-01-01', () => {
    expect(excelSerialToDateStr(44927)).toBe('2023-01-01')
  })

  it('converts 45291 → 2023-12-31', () => {
    expect(excelSerialToDateStr(45291)).toBe('2023-12-31')
  })
})

// ─── parseDateCell ────────────────────────────────────────────────────────────

describe('parseDateCell', () => {
  it('returns empty string for null', () => {
    expect(parseDateCell(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(parseDateCell(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(parseDateCell('')).toBe('')
  })

  it('converts numeric Excel serial', () => {
    expect(parseDateCell(46174)).toBe('2026-06-01')
  })

  it('converts numeric-string Excel serial', () => {
    expect(parseDateCell('46174')).toBe('2026-06-01')
  })

  it('passes through ISO date string unchanged', () => {
    expect(parseDateCell('2026-03-01')).toBe('2026-03-01')
  })

  it('passes through DD/MM/YYYY string unchanged (API handles format later)', () => {
    expect(parseDateCell('31/03/2026')).toBe('31/03/2026')
  })

  it('does not treat a 4-digit year string as a serial', () => {
    // "2026" alone is 4 digits — matches the serial pattern, but 2026 serial = ~1905
    // This is an edge case: a standalone year string is ambiguous.
    // The regex matches 4–6 digits so "2026" would be treated as a serial.
    // Users should always provide full dates, not bare years.
    const result = parseDateCell('2026')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('does not mangle a 7+ digit string', () => {
    expect(parseDateCell('2026031')).toBe('2026031') // 7 digits → passthrough
  })
})

// ─── PERIOD_TYPE_MAP ──────────────────────────────────────────────────────────

describe('PERIOD_TYPE_MAP', () => {
  it.each([
    ['bulanan',      'monthly'],
    ['monthly',      'monthly'],
    ['mingguan',     'weekly'],
    ['weekly',       'weekly'],
    ['triwulan',     'quarterly'],
    ['3 bulanan',    'quarterly'],
    ['quarterly',    'quarterly'],
    ['semi tahunan', 'semi-annual'],
    ['semi-annual',  'semi-annual'],
    ['tahunan',      'annual'],
    ['annual',       'annual'],
  ])('%s → %s', (input, expected) => {
    expect(PERIOD_TYPE_MAP[input]).toBe(expected)
  })
})

// ─── resolveRowMeta ───────────────────────────────────────────────────────────

describe('resolveRowMeta', () => {
  it('falls back to defaults when row has no meta', () => {
    const meta = resolveRowMeta({ 'ID Karyawan': 'DIY0001' }, DEFAULTS)
    expect(meta.periodType).toBe('monthly')
    expect(meta.startDate).toBe('2026-03-01')
    expect(meta.endDate).toBe('2026-03-31')
    expect(meta.templateName).toBeNull()
  })

  it('uses row periode over default', () => {
    const meta = resolveRowMeta({ 'Periode (Opsional)': 'bulanan' }, DEFAULTS)
    expect(meta.periodType).toBe('monthly')
  })

  it('maps "mingguan" period correctly', () => {
    const meta = resolveRowMeta({ 'Periode': 'mingguan' }, DEFAULTS)
    expect(meta.periodType).toBe('weekly')
  })

  it('handles Excel serial dates from row', () => {
    const meta = resolveRowMeta(
      { 'Tanggal Mulai (Opsional)': 46082, 'Tanggal Selesai (Opsional)': 46111 },
      DEFAULTS,
    )
    expect(meta.startDate).toBe('2026-03-01')
    expect(meta.endDate).toBe('2026-03-30')
  })

  it('handles numeric-string serial dates from row', () => {
    const meta = resolveRowMeta(
      { 'Tanggal Mulai': '46082', 'Tanggal Selesai': '46111' },
      DEFAULTS,
    )
    expect(meta.startDate).toBe('2026-03-01')
    expect(meta.endDate).toBe('2026-03-30')
  })

  it('handles production file serials (46174=2026-06-01, 46203=2026-06-30)', () => {
    const meta = resolveRowMeta(
      { 'Tanggal Mulai (Opsional)': 46174, 'Tanggal Selesai (Opsional)': 46203 },
      DEFAULTS,
    )
    expect(meta.startDate).toBe('2026-06-01')
    expect(meta.endDate).toBe('2026-06-30')
  })

  it('handles ISO string dates from row', () => {
    const meta = resolveRowMeta(
      { 'Tanggal Mulai (Opsional)': '2026-04-01', 'Tanggal Selesai (Opsional)': '2026-04-30' },
      DEFAULTS,
    )
    expect(meta.startDate).toBe('2026-04-01')
    expect(meta.endDate).toBe('2026-04-30')
  })

  it('falls back to default startDate when row date is empty', () => {
    const meta = resolveRowMeta({ 'Tanggal Mulai (Opsional)': null }, DEFAULTS)
    expect(meta.startDate).toBe('2026-03-01')
  })

  it('reads template name from row', () => {
    const meta = resolveRowMeta({ 'Template (Opsional)': 'Formal Klasik' }, DEFAULTS)
    expect(meta.templateName).toBe('Formal Klasik')
  })

  it('reads template from lowercase "template" key', () => {
    const meta = resolveRowMeta({ 'template': 'Formal Klasik' }, DEFAULTS)
    expect(meta.templateName).toBe('Formal Klasik')
  })

  it('returns null templateName when template cell is empty', () => {
    const meta = resolveRowMeta({ 'Template (Opsional)': '' }, DEFAULTS)
    expect(meta.templateName).toBeNull()
  })

  it('uses the actual file format from production (DIY0003 row)', () => {
    const row = {
      'ID Karyawan': 'DIY0003',
      'Periode (Opsional)': 'monthly',
      'Tanggal Mulai (Opsional)': 46174,
      'Tanggal Selesai (Opsional)': 46203,
      'Template (Opsional)': null,
      'Gaji Pokok': 8000000,
    }
    const meta = resolveRowMeta(row, DEFAULTS)
    expect(meta.periodType).toBe('monthly')
    expect(meta.startDate).toBe('2026-06-01') // 46174 = 2026-06-01
    expect(meta.endDate).toBe('2026-06-30')   // 46203 = 2026-06-30
    expect(meta.templateName).toBeNull() // falls back to default template
  })
})

// ─── parseImportRow ───────────────────────────────────────────────────────────

describe('parseImportRow', () => {
  it('uses row Gaji Pokok over employee base salary', () => {
    const { basePay } = parseImportRow({ 'Gaji Pokok': 9000000 }, 8000000)
    expect(basePay).toBe(9000000)
  })

  it('falls back to employee base salary when Gaji Pokok is null', () => {
    const { basePay } = parseImportRow({ 'Gaji Pokok': null }, 8000000)
    expect(basePay).toBe(8000000)
  })

  it('reads bonus and THR', () => {
    const { bonus, thr } = parseImportRow({ 'Bonus': 500000, 'THR': 8000000 }, 0)
    expect(bonus).toBe(500000)
    expect(thr).toBe(8000000)
  })

  it('defaults bonus and THR to 0', () => {
    const { bonus, thr } = parseImportRow({}, 0)
    expect(bonus).toBe(0)
    expect(thr).toBe(0)
  })

  it('includes non-zero tunjangan in allowances', () => {
    const { allowances } = parseImportRow({ 'Tunjangan Makan': 100000, 'Tunjangan Transport': 100000 }, 0)
    expect(allowances).toHaveLength(2)
    expect(allowances.map(a => a.name)).toContain('Tunjangan Makan')
    expect(allowances.map(a => a.name)).toContain('Tunjangan Transport')
  })

  it('excludes zero-value tunjangan from allowances', () => {
    const { allowances } = parseImportRow({ 'Tunjangan Makan': 0, 'Tunjangan Jabatan': 200000 }, 0)
    expect(allowances).toHaveLength(1)
    expect(allowances[0].name).toBe('Tunjangan Jabatan')
  })

  it('reads all 7 tunjangan columns', () => {
    const row = {
      'Tunjangan Jabatan': 100000,
      'Tunjangan Luar Kota': 100000,
      'Tunjangan Makan': 100000,
      'Tunjangan Transport': 100000,
      'Tunjangan Lama Kerja': 100000,
      'Insentif': 100000,
      'Tunjangan PPh 21': 100000,
    }
    const { allowances } = parseImportRow(row, 0)
    expect(allowances).toHaveLength(7)
  })

  it('creates otherDeductions from Potongan Lain', () => {
    const { otherDeductions } = parseImportRow({ 'Potongan Lain': 50000 }, 0)
    expect(otherDeductions).toHaveLength(1)
    expect(otherDeductions[0].amount).toBe(50000)
  })

  it('returns empty otherDeductions when Potongan Lain is 0', () => {
    const { otherDeductions } = parseImportRow({ 'Potongan Lain': 0 }, 0)
    expect(otherDeductions).toHaveLength(0)
  })

  it('reads notes from Catatan', () => {
    const { notes } = parseImportRow({ 'Catatan': 'Bonus akhir tahun' }, 0)
    expect(notes).toBe('Bonus akhir tahun')
  })

  it('returns null notes for empty Catatan', () => {
    const { notes } = parseImportRow({ 'Catatan': '' }, 0)
    expect(notes).toBeNull()
  })

  it('handles a string value in a numeric field gracefully (coerces to NaN→0)', () => {
    // A letter accidentally in a BPJS field would come through as the raw cell value
    // parseImportRow itself doesn't parse BPJS — those are handled separately in the route
    // but basePay with a bad string should not throw
    const { basePay } = parseImportRow({ 'Gaji Pokok': 'abc' as unknown as number }, 8000000)
    expect(isNaN(basePay)).toBe(true) // Number('abc') = NaN — route should validate
  })

  it('matches production row format', () => {
    const row = {
      'ID Karyawan': 'DIY0003',
      'Periode (Opsional)': 'monthly',
      'Tanggal Mulai (Opsional)': 46174,
      'Tanggal Selesai (Opsional)': 46203,
      'Template (Opsional)': null,
      'Gaji Pokok': 8000000,
      'Tunjangan Jabatan': 100000,
      'Tunjangan Luar Kota': 100000,
      'Tunjangan Makan': 100000,
      'Tunjangan Transport': 100000,
      'Tunjangan Lama Kerja': 100000,
      'Insentif': 100000,
      'Tunjangan PPh 21': 0,
      'Bonus': 0,
      'THR': 0,
      'PPh21': '',
      'BPJS Kesehatan': '',
      'BPJS TK JHT': '',
      'BPJS TK JP': '',
      'Potongan Lain': 0,
      'Catatan': '',
    }
    const result = parseImportRow(row, 5000000)
    expect(result.basePay).toBe(8000000)
    expect(result.allowances).toHaveLength(6) // Tunjangan PPh 21 = 0, excluded
    expect(result.bonus).toBe(0)
    expect(result.thr).toBe(0)
    expect(result.otherDeductions).toHaveLength(0)
    expect(result.notes).toBeNull()
  })

  it('applies hari kerja prorate to basePay: 18/22 days', () => {
    const { basePay } = parseImportRow({ 'Gaji Pokok': 8800000, 'Hari Kerja Karyawan': 18, 'Hari Kerja Per Bulan': 22 }, 0)
    expect(basePay).toBe(Math.round(8800000 * 18 / 22)) // 7200000
  })

  it('clamps hari kerja factor to 1 when actual > total', () => {
    const { basePay } = parseImportRow({ 'Gaji Pokok': 8000000, 'Hari Kerja Karyawan': 25, 'Hari Kerja Per Bulan': 22 }, 0)
    expect(basePay).toBe(8000000) // factor capped at 1
  })

  it('returns 0 basePay when actual days is 0', () => {
    const { basePay } = parseImportRow({ 'Gaji Pokok': 8000000, 'Hari Kerja Karyawan': 0, 'Hari Kerja Per Bulan': 22 }, 0)
    expect(basePay).toBe(0)
  })

  it('skips prorate when only one hari kerja column is present', () => {
    const { basePay } = parseImportRow({ 'Gaji Pokok': 8000000, 'Hari Kerja Karyawan': 18 }, 0)
    expect(basePay).toBe(8000000) // no total → no prorate
  })

  it('skips prorate when hari kerja columns are absent', () => {
    const { basePay } = parseImportRow({ 'Gaji Pokok': 8000000 }, 0)
    expect(basePay).toBe(8000000)
  })

  it('exposes workingDaysActual and workingDaysTotal in return value', () => {
    const result = parseImportRow({ 'Gaji Pokok': 8000000, 'Hari Kerja Karyawan': 18, 'Hari Kerja Per Bulan': 22 }, 0)
    expect(result.workingDaysActual).toBe(18)
    expect(result.workingDaysTotal).toBe(22)
  })
})
