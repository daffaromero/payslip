export const PERIOD_TYPE_MAP: Record<string, string> = {
  bulanan: 'monthly',      monthly: 'monthly',
  mingguan: 'weekly',      weekly: 'weekly',
  triwulan: 'quarterly',   quarterly: 'quarterly',
  '3 bulanan': 'quarterly',
  'semi tahunan': 'semi-annual', 'semi-annual': 'semi-annual',
  tahunan: 'annual',       annual: 'annual',
}

export const TUNJANGAN_COLS = [
  { col: 'Tunjangan Jabatan',    name: 'Tunjangan Jabatan',    component: 'tunjangan_jabatan' },
  { col: 'Tunjangan Luar Kota',  name: 'Tunjangan Luar Kota',  component: 'tunjangan_luar_kota' },
  { col: 'Tunjangan Makan',      name: 'Tunjangan Makan',      component: 'tunjangan_makan' },
  { col: 'Tunjangan Transport',  name: 'Tunjangan Transport',  component: 'tunjangan_transport' },
  { col: 'Tunjangan Lama Kerja', name: 'Tunjangan Lama Kerja', component: 'tunjangan_lama_bekerja' },
  { col: 'Insentif',             name: 'Insentif',             component: 'insentif' },
  { col: 'Tunjangan PPh 21',     name: 'Tunjangan PPh 21',     component: 'tunjangan_pph21' },
] as const

/** Convert an Excel date serial (days since 1899-12-30) to YYYY-MM-DD. */
export function excelSerialToDateStr(serial: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400 * 1000)
  return d.toISOString().split('T')[0]
}

/** Parse a raw cell value to a YYYY-MM-DD string, handling Excel serials. */
export function parseDateCell(val: string | number | null | undefined): string {
  if (val == null || val === '') return ''
  if (typeof val === 'number') return excelSerialToDateStr(val)
  const s = String(val).trim()
  if (/^\d{4,6}$/.test(s)) return excelSerialToDateStr(Number(s))
  return s
}

type Row = Record<string, string | number | null>
type Defaults = { templateId: string; periodType: string; startDate: string; endDate: string }

/** Resolve per-row period/date/template overrides against form-level defaults. */
export function resolveRowMeta(row: Row, defaults: Defaults) {
  const rawPeriod = String(row['Periode (Opsional)'] ?? row['Periode'] ?? row['periode'] ?? '').trim().toLowerCase()
  const periodType = rawPeriod ? (PERIOD_TYPE_MAP[rawPeriod] ?? rawPeriod) : defaults.periodType

  const rawStart = row['Tanggal Mulai (Opsional)'] ?? row['Tanggal Mulai'] ?? row['tanggal mulai'] ?? null
  const rawEnd   = row['Tanggal Selesai (Opsional)'] ?? row['Tanggal Selesai'] ?? row['tanggal selesai'] ?? null
  const startDate    = parseDateCell(rawStart) || defaults.startDate
  const endDate      = parseDateCell(rawEnd)   || defaults.endDate
  const templateName = String(row['Template (Opsional)'] ?? row['Template'] ?? row['template'] ?? '').trim() || null

  return { periodType, startDate, endDate, templateName }
}

/** Parse payroll values from an import row. */
export function parseImportRow(row: Row, empBaseSalary: number) {
  const basePay = Number(row['Gaji Pokok']   ?? row['gaji pokok']   ?? empBaseSalary)
  const bonus   = Number(row['Bonus']        ?? row['bonus']        ?? 0)
  const thr     = Number(row['THR']          ?? row['thr']          ?? 0)
  const notes   = String(row['Catatan']      ?? row['catatan']      ?? '') || null

  const allowances = TUNJANGAN_COLS
    .map(t => ({ name: t.name, amount: Number(row[t.col] ?? 0), component: t.component }))
    .filter(a => a.amount > 0)

  const otherDeductionAmt = Number(row['Potongan Lain'] ?? row['potongan lain'] ?? 0)
  const otherDeductions = otherDeductionAmt > 0 ? [{ name: 'Potongan Lain', amount: otherDeductionAmt }] : []

  return { basePay, bonus, thr, notes, allowances, otherDeductions }
}
