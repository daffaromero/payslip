import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExcelFile, detectColumnType, autoMapColumns } from './parser'

function createExcelBuffer(data: unknown[][]): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  const excelData = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(excelData)
}

describe('parseExcelFile', () => {
  it('parses valid xlsx file with headers and data', () => {
    const data = [
      ['Nama', 'ID Karyawan', 'Gaji Pokok'],
      ['Budi Santoso', 'EMP001', 10000000],
      ['Ani Wijaya', 'EMP002', 15000000],
    ]
    const buffer = createExcelBuffer(data)
    
    const result = parseExcelFile(buffer)
    
    expect(result.headers).toEqual(['Nama', 'ID Karyawan', 'Gaji Pokok'])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({
      'Nama': 'Budi Santoso',
      'ID Karyawan': 'EMP001',
      'Gaji Pokok': 10000000,
    })
    expect(result.rows[1]).toEqual({
      'Nama': 'Ani Wijaya',
      'ID Karyawan': 'EMP002',
      'Gaji Pokok': 15000000,
    })
    expect(result.sheetNames).toContain('Sheet1')
    expect(result.currentSheet).toBe('Sheet1')
  })

  it('returns empty arrays for empty file', () => {
    const data: unknown[][] = []
    const buffer = createExcelBuffer(data)
    
    const result = parseExcelFile(buffer)
    
    expect(result.headers).toEqual([])
    expect(result.rows).toEqual([])
  })

  it('handles single row of headers only', () => {
    const data = [['Nama', 'ID Karyawan', 'Email']]
    const buffer = createExcelBuffer(data)
    
    const result = parseExcelFile(buffer)
    
    expect(result.headers).toEqual(['Nama', 'ID Karyawan', 'Email'])
    expect(result.rows).toEqual([])
  })

  it('handles mixed data types in cells', () => {
    const data = [
      ['Nama', 'Gaji', 'Aktif'],
      ['Test User', 5000000, true],
      ['Another User', '7500000', false],
    ]
    const buffer = createExcelBuffer(data)
    
    const result = parseExcelFile(buffer)
    
    expect(result.rows[0]['Nama']).toBe('Test User')
    expect(result.rows[0]['Gaji']).toBe(5000000)
    expect(result.rows[0]['Aktif']).toBe(true)
  })

  it('handles null values in cells', () => {
    const data = [
      ['Nama', 'Email', 'Departemen'],
      ['Budi Santoso', null, 'IT'],
      ['Ani Wijaya', 'ani@company.com', null],
    ]
    const buffer = createExcelBuffer(data)
    
    const result = parseExcelFile(buffer)
    
    expect(result.rows[0]['Nama']).toBe('Budi Santoso')
    expect(result.rows[0]['Email']).toBeNull()
    expect(result.rows[0]['Departemen']).toBe('IT')
  })
})

describe('detectColumnType', () => {
  it('returns number when all values are numeric', () => {
    const values: (string | number | null)[] = [1000000, 2000000, 3000000, 4000000]
    expect(detectColumnType(values)).toBe('number')
  })

  it('returns number when all values are numeric strings', () => {
    const values: (string | number | null)[] = ['1000000', '2000000', '3000000']
    expect(detectColumnType(values)).toBe('number')
  })

  it('returns number for mixed numeric strings and numbers', () => {
    const values: (string | number | null)[] = [1000000, '2000000', 3000000]
    expect(detectColumnType(values)).toBe('number')
  })

  it('returns text for mixed values', () => {
    const values: (string | number | null)[] = ['Budi Santoso', 'EMP001', 10000000]
    expect(detectColumnType(values)).toBe('text')
  })

  it('returns number when date-like values can be parsed as numbers', () => {
    const values: (string | number | null)[] = ['01/01/2024', '15/03/2024', '31/12/2024']
    expect(detectColumnType(values)).toBe('number')
  })

  it('returns number when date-like values with dash can be parsed', () => {
    const values: (string | number | null)[] = ['01-01-2024', '15-03-2024', '31-12-2024']
    expect(detectColumnType(values)).toBe('number')
  })

  it('returns number when date-like values with dot can be parsed', () => {
    const values: (string | number | null)[] = ['01.01.2024', '15.03.2024', '31.12.2024']
    expect(detectColumnType(values)).toBe('number')
  })

  it('returns text when less than half of values are date-like', () => {
    const values: (string | number | null)[] = ['Budi', '01/01/2024', 'Ani', 'Santoso']
    expect(detectColumnType(values)).toBe('text')
  })

  it('returns text for empty array', () => {
    const values: (string | number | null)[] = []
    expect(detectColumnType(values)).toBe('text')
  })

  it('returns text for array with only null values', () => {
    const values: (string | number | null)[] = [null, null, null]
    expect(detectColumnType(values)).toBe('text')
  })

  it('returns text for text with occasional numbers', () => {
    const values: (string | number | null)[] = ['abc', '123', 'def', '456', 'ghi']
    expect(detectColumnType(values)).toBe('text')
  })
})

describe('autoMapColumns', () => {
  it('maps Indonesian column names to employee fields', () => {
    const headers = ['Nama', 'ID Karyawan', 'Email', 'Departemen', 'Gaji Pokok']
    const mappings = autoMapColumns(headers)
    
    expect(mappings.get('Nama')).toBe('name')
    expect(mappings.get('ID Karyawan')).toBe('employeeId')
    expect(mappings.get('Email')).toBe('email')
    expect(mappings.get('Departemen')).toBe('department')
    expect(mappings.get('Gaji Pokok')).toBe('baseSalary')
  })

  it('maps English column names to employee fields', () => {
    const headers = ['Name', 'Employee ID', 'Email', 'Department', 'Base Salary']
    const mappings = autoMapColumns(headers)
    
    expect(mappings.get('Name')).toBe('name')
    expect(mappings.get('Employee ID')).toBe('employeeId')
    expect(mappings.get('Email')).toBe('email')
    expect(mappings.get('Department')).toBe('department')
    expect(mappings.get('Base Salary')).toBe('baseSalary')
  })

  it('maps common salary variations', () => {
    const headers = ['Gaji', 'Salary', 'Upah', 'Gaji Pokok']
    const mappings = autoMapColumns(headers)
    
    expect(mappings.get('Gaji')).toBe('baseSalary')
    expect(mappings.get('Salary')).toBe('baseSalary')
    expect(mappings.get('Upah')).toBe('baseSalary')
    expect(mappings.get('Gaji Pokok')).toBe('baseSalary')
  })

  it('maps bank account columns', () => {
    const headers = ['No Rekening', 'Rekening']
    const mappings = autoMapColumns(headers)
    
    expect(mappings.get('No Rekening')).toBe('bankAccount')
    expect(mappings.get('Rekening')).toBe('bankAccount')
  })

  it('maps position and department variations', () => {
    const headers = ['Jabatan', 'Posisi', 'Department', 'Divisi']
    const mappings = autoMapColumns(headers)
    
    expect(mappings.get('Jabatan')).toBe('position')
    expect(mappings.get('Posisi')).toBe('position')
    expect(mappings.get('Department')).toBe('department')
    expect(mappings.get('Divisi')).toBe('department')
  })

  it('is case insensitive', () => {
    const headers = ['NAMA', 'NAME', 'Nama Karyawan', 'Employee Name']
    const mappings = autoMapColumns(headers)
    
    expect(mappings.get('NAMA')).toBe('name')
    expect(mappings.get('NAME')).toBe('name')
    expect(mappings.get('Nama Karyawan')).toBe('name')
    expect(mappings.get('Employee Name')).toBe('name')
  })

  it('does not map unrecognized columns', () => {
    const headers = ['Random Column', 'Unknown Field', 'xyz123']
    const mappings = autoMapColumns(headers)
    
    expect(mappings.size).toBe(0)
  })

  it('maps columns in pattern order', () => {
    const headers = ['Nama', 'Email', 'NPWP']
    const mappings = autoMapColumns(headers)
    
    expect(mappings.get('Nama')).toBe('name')
    expect(mappings.get('Email')).toBe('email')
    expect(mappings.get('NPWP')).toBe('npwp')
  })

  it('maps Indonesian overtime column', () => {
    const headers = ['Jam Lembur', 'Lembur', 'Overtime Hours']
    const mappings = autoMapColumns(headers)
    
    expect(mappings.get('Jam Lembur')).toBe('overtimeHours')
    expect(mappings.get('Lembur')).toBe('overtimeHours')
    expect(mappings.get('Overtime Hours')).toBe('overtimeHours')
  })

  it('maps bonus and allowance columns', () => {
    const headers = ['Bonus', 'Tunjangan', 'Insentif', 'Allowance']
    const mappings = autoMapColumns(headers)

    expect(mappings.get('Bonus')).toBe('bonus')
    expect(mappings.get('Tunjangan')).toBe('bonus')
    expect(mappings.get('Insentif')).toBe('bonus')
    expect(mappings.get('Allowance')).toBe('bonus')
  })

  it('does not map "Nama Bank" to name — it must map to bankName', () => {
    const headers = ['Nama', 'Nama Bank', 'No Rekening']
    const mappings = autoMapColumns(headers)

    expect(mappings.get('Nama')).toBe('name')
    expect(mappings.get('Nama Bank')).toBe('bankName')
    expect(mappings.get('No Rekening')).toBe('bankAccount')
  })

  it('maps full employee import template headers without name/bank swap', () => {
    const headers = [
      'ID Karyawan', 'Nama', 'Email', 'WhatsApp', 'Divisi', 'Jabatan', 'Site',
      'Gaji Pokok', 'Status PPh21', 'NPWP', 'Nama Bank', 'No Rekening',
    ]
    const mappings = autoMapColumns(headers)

    expect(mappings.get('Nama')).toBe('name')
    expect(mappings.get('Nama Bank')).toBe('bankName')
    expect(mappings.get('No Rekening')).toBe('bankAccount')
    expect(mappings.get('ID Karyawan')).toBe('employeeId')
    expect(mappings.get('Gaji Pokok')).toBe('baseSalary')
  })
})
