import * as XLSX from 'xlsx'

export interface ParsedExcelRow {
  [key: string]: string | number | null
}

export interface ExcelParseResult {
  headers: string[]
  rows: ParsedExcelRow[]
  sheetNames: string[]
  currentSheet: string
}

export function parseExcelFile(buffer: Buffer): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // Convert to JSON with headers
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[]
  
  if (rawData.length === 0) {
    return {
      headers: [],
      rows: [],
      sheetNames: workbook.SheetNames,
      currentSheet: sheetName,
    }
  }
  
  const headers = rawData[0] as string[]
  const rows = (rawData.slice(1) as unknown[][]).map((row) => {
    const obj: ParsedExcelRow = {} as ParsedExcelRow
    headers.forEach((header, index) => {
      const value = row[index]
      ;(obj as Record<string, unknown>)[header] = value !== undefined ? value : null
    })
    return obj
  })
  
  return {
    headers,
    rows,
    sheetNames: workbook.SheetNames,
    currentSheet: sheetName,
  }
}

export function detectColumnType(values: (string | number | null)[]): 'text' | 'number' | 'date' {
  const nonNullValues = values.filter(v => v !== null && v !== undefined)
  if (nonNullValues.length === 0) return 'text'
  
  // Check if all values are numbers
  const numericValues = nonNullValues.filter(v => typeof v === 'number' || !isNaN(parseFloat(String(v))))
  if (numericValues.length === nonNullValues.length) return 'number'
  
  // Check if looks like dates
  const datePattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/
  const dateValues = nonNullValues.filter(v => datePattern.test(String(v)))
  if (dateValues.length > nonNullValues.length * 0.5) return 'date'
  
  return 'text'
}

export function autoMapColumns(headers: string[]): Map<string, string> {
  const mappings = new Map<string, string>()
  
  const fieldPatterns: Record<string, RegExp[]> = {
    'name': [/^nama$/i, /^name$/i, /employee name/i, /nama karyawan/i],
    'employeeId': [/id karyawan/i, /employee id/i, /nik/i, /nomor induk/i, /id$/i],
    'email': [/email/i, /e-mail/i, /surel/i],
    'department': [/department/i, /departemen/i, /divisi/i, /division/i],
    'position': [/position/i, /jabatan/i, /posisi/i, /job title/i],
    'baseSalary': [/gaji pokok/i, /base salary/i, /gaji/i, /salary/i, /upah/i],
    'overtimeHours': [/jam lembur/i, /overtime hours/i, /lembur/i, /ot hours/i],
    'bonus': [/bonus/i, /tunjangan/i, /insentif/i, /allowance/i],
    'whatsappNumber': [/whatsapp/i, /wa number/i, /no wa/i, /nomor wa/i, /telepon/i, /phone/i],
    'pph21Status': [/status pph/i, /pph21/i, /ptkp/i, /tax status/i],
    'npwp': [/npwp/i, /tax id/i, /nomor pokok wajib pajak/i],
    'bankAccount': [/rekening/i, /bank account/i, /no rekening/i, /account number/i],
    'bankName': [/nama bank/i, /bank name/i, /bank$/i],
    'site': [/site/i, /lokasi/i, /location/i, /cabang/i],
  }
  
  for (const header of headers) {
    const lowerHeader = header.toLowerCase()
    
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      if (patterns.some(pattern => pattern.test(lowerHeader))) {
        mappings.set(header, field)
        break
      }
    }
  }
  
  return mappings
}
