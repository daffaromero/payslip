import { describe, it, expect } from 'vitest'
import { mapRowToEmployee, validateEmployeeData, generateImportPreview } from './mapper'
import { ParsedExcelRow } from './parser'

describe('mapRowToEmployee', () => {
  it('maps basic fields from row to employee', () => {
    const row: ParsedExcelRow = {
      'Nama': 'Budi Santoso',
      'ID Karyawan': 'EMP001',
      'Gaji Pokok': 10000000,
    }
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.name).toBe('Budi Santoso')
    expect(result.employeeId).toBe('EMP001')
    expect(result.baseSalary).toBe(10000000)
  })

  it('handles numeric salary string', () => {
    const row: ParsedExcelRow = {
      'Nama': 'Ani Wijaya',
      'Gaji Pokok': '10000000',
    }
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.baseSalary).toBe(10000000)
  })

  it('handles numeric salary as number', () => {
    const row: ParsedExcelRow = {
      'Nama': 'Test User',
      'Gaji Pokok': 5000000,
    }
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.baseSalary).toBe(5000000)
  })

  it('returns NaN for invalid salary strings', () => {
    const row: ParsedExcelRow = {
      'Nama': 'Test User',
      'Gaji Pokok': 'invalid',
    }
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.baseSalary).toBe(0)
  })

  it('handles overtime hours as number', () => {
    const row: ParsedExcelRow = {
      'Nama': 'Test User',
      'Jam Lembur': 8,
    }
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'Jam Lembur', employeeField: 'overtimeHours' },
      ],
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.overtimeHours).toBe(8)
  })

  it('respects custom transform function', () => {
    const row: ParsedExcelRow = {
      'Tanggal': '2024-01-15',
    }
    const config = {
      mappings: [
        { 
          excelColumn: 'Tanggal', 
          employeeField: 'joinedAt',
          transform: (value) => {
            if (typeof value === 'string') {
              return new Date(value)
            }
            return value
          },
        },
      ],
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.joinedAt).toBeInstanceOf(Date)
    expect((result.joinedAt as Date).getFullYear()).toBe(2024)
  })

  it('applies default values from config', () => {
    const row: ParsedExcelRow = {
      'Nama': 'Test User',
      'ID Karyawan': 'EMP001',
    }
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
      ],
      defaultValues: {
        baseSalary: 5000000,
        isActive: true,
      },
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.baseSalary).toBe(5000000)
    expect(result.isActive).toBe(true)
  })

  it('overrides default values with actual data', () => {
    const row: ParsedExcelRow = {
      'Nama': 'Test User',
      'ID Karyawan': 'EMP001',
      'Gaji Pokok': 8000000,
    }
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
      defaultValues: {
        baseSalary: 5000000,
        isActive: false,
      },
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.baseSalary).toBe(8000000)
    expect(result.isActive).toBe(false)
  })

  it('skips null and undefined values', () => {
    const row: ParsedExcelRow = {
      'Nama': null,
      'ID Karyawan': 'EMP001',
      'Email': undefined,
    }
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Email', employeeField: 'email' },
      ],
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.name).toBeUndefined()
    expect(result.employeeId).toBe('EMP001')
    expect(result.email).toBeUndefined()
  })

  it('handles multiple field mappings', () => {
    const row: ParsedExcelRow = {
      'Nama': 'Budi Santoso',
      'ID Karyawan': 'EMP001',
      'Email': 'budi@company.com',
      'Departemen': 'Engineering',
      'Jabatan': 'Software Engineer',
      'Gaji Pokok': 12000000,
      'NPWP': '12.345.678.9-012.345',
      'Nama Bank': 'Bank Central Asia',
      'No Rekening': '1234567890',
    }
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Email', employeeField: 'email' },
        { excelColumn: 'Departemen', employeeField: 'department' },
        { excelColumn: 'Jabatan', employeeField: 'position' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
        { excelColumn: 'NPWP', employeeField: 'npwp' },
        { excelColumn: 'Nama Bank', employeeField: 'bankName' },
        { excelColumn: 'No Rekening', employeeField: 'bankAccount' },
      ],
    }
    
    const result = mapRowToEmployee(row, config)
    
    expect(result.name).toBe('Budi Santoso')
    expect(result.employeeId).toBe('EMP001')
    expect(result.email).toBe('budi@company.com')
    expect(result.department).toBe('Engineering')
    expect(result.position).toBe('Software Engineer')
    expect(result.baseSalary).toBe(12000000)
    expect(result.npwp).toBe('12.345.678.9-012.345')
    expect(result.bankName).toBe('Bank Central Asia')
    expect(result.bankAccount).toBe('1234567890')
  })
})

describe('validateEmployeeData', () => {
  it('returns empty array for valid employee', () => {
    const data = {
      name: 'Budi Santoso',
      employeeId: 'EMP001',
      baseSalary: 10000000,
    }
    
    const errors = validateEmployeeData(data)
    
    expect(errors).toEqual([])
  })

  it('returns error for missing name', () => {
    const data = {
      employeeId: 'EMP001',
      baseSalary: 10000000,
    }
    
    const errors = validateEmployeeData(data)
    
    expect(errors).toContain('Nama wajib diisi')
  })

  it('returns error for missing employeeId', () => {
    const data = {
      name: 'Budi Santoso',
      baseSalary: 10000000,
    }
    
    const errors = validateEmployeeData(data)
    
    expect(errors).toContain('ID Karyawan wajib diisi')
  })

  it('returns error for invalid baseSalary when 0', () => {
    const data = {
      name: 'Budi Santoso',
      employeeId: 'EMP001',
      baseSalary: 0,
    }
    
    const errors = validateEmployeeData(data)
    
    expect(errors).toContain('Gaji pokok wajib diisi dan lebih dari 0')
  })

  it('returns error for invalid baseSalary when negative', () => {
    const data = {
      name: 'Budi Santoso',
      employeeId: 'EMP001',
      baseSalary: -5000000,
    }
    
    const errors = validateEmployeeData(data)
    
    expect(errors).toContain('Gaji pokok wajib diisi dan lebih dari 0')
  })

  it('returns multiple errors for multiple missing fields', () => {
    const data = {}
    
    const errors = validateEmployeeData(data)
    
    expect(errors).toHaveLength(3)
    expect(errors).toContain('Nama wajib diisi')
    expect(errors).toContain('ID Karyawan wajib diisi')
    expect(errors).toContain('Gaji pokok wajib diisi dan lebih dari 0')
  })

  it('accepts employee with only required fields', () => {
    const data = {
      name: 'Ani Wijaya',
      employeeId: 'EMP002',
      baseSalary: 15000000,
    }
    
    const errors = validateEmployeeData(data)
    
    expect(errors).toEqual([])
  })

  it('passes for minimum valid salary (greater than 0)', () => {
    const data = {
      name: 'Test User',
      employeeId: 'EMP003',
      baseSalary: 1,
    }
    
    const errors = validateEmployeeData(data)
    
    expect(errors).toEqual([])
  })
})

describe('generateImportPreview', () => {
  it('returns array with data, errors, and valid flag', () => {
    const rows: ParsedExcelRow[] = [
      { 'Nama': 'Budi Santoso', 'ID Karyawan': 'EMP001', 'Gaji Pokok': 10000000 },
    ]
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = generateImportPreview(rows, config)
    
    expect(result).toHaveLength(1)
    expect(result[0].data.name).toBe('Budi Santoso')
    expect(result[0].data.employeeId).toBe('EMP001')
    expect(result[0].data.baseSalary).toBe(10000000)
    expect(result[0].errors).toEqual([])
    expect(result[0].valid).toBe(true)
  })

  it('marks row as invalid when required fields are missing', () => {
    const rows: ParsedExcelRow[] = [
      { 'Nama': 'Budi Santoso' },
      { 'ID Karyawan': 'EMP002' },
      {},
    ]
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = generateImportPreview(rows, config)
    
    expect(result[0].valid).toBe(false)
    expect(result[0].errors).toContain('ID Karyawan wajib diisi')
    expect(result[0].errors).toContain('Gaji pokok wajib diisi dan lebih dari 0')
    
    expect(result[1].valid).toBe(false)
    expect(result[1].errors).toContain('Nama wajib diisi')
    expect(result[1].errors).toContain('Gaji pokok wajib diisi dan lebih dari 0')
    
    expect(result[2].valid).toBe(false)
    expect(result[2].errors).toHaveLength(3)
  })

  it('processes multiple rows correctly', () => {
    const rows: ParsedExcelRow[] = [
      { 'Nama': 'Budi Santoso', 'ID Karyawan': 'EMP001', 'Gaji Pokok': 10000000 },
      { 'Nama': 'Ani Wijaya', 'ID Karyawan': 'EMP002', 'Gaji Pokok': 15000000 },
      { 'Nama': 'Charlie Doe', 'ID Karyawan': 'EMP003', 'Gaji Pokok': 8000000 },
    ]
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = generateImportPreview(rows, config)
    
    expect(result).toHaveLength(3)
    expect(result[0].valid).toBe(true)
    expect(result[1].valid).toBe(true)
    expect(result[2].valid).toBe(true)
    expect(result[0].data.name).toBe('Budi Santoso')
    expect(result[1].data.name).toBe('Ani Wijaya')
    expect(result[2].data.name).toBe('Charlie Doe')
  })

  it('handles mixed valid and invalid rows', () => {
    const rows: ParsedExcelRow[] = [
      { 'Nama': 'Budi Santoso', 'ID Karyawan': 'EMP001', 'Gaji Pokok': 10000000 },
      { 'Nama': 'Ani Wijaya' },
      { 'ID Karyawan': 'EMP003', 'Gaji Pokok': 8000000 },
    ]
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = generateImportPreview(rows, config)
    
    expect(result[0].valid).toBe(true)
    expect(result[1].valid).toBe(false)
    expect(result[2].valid).toBe(false)
  })

  it('processes empty rows array', () => {
    const rows: ParsedExcelRow[] = []
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = generateImportPreview(rows, config)
    
    expect(result).toEqual([])
  })

  it('transforms salary strings during preview', () => {
    const rows: ParsedExcelRow[] = [
      { 'Nama': 'Budi Santoso', 'ID Karyawan': 'EMP001', 'Gaji Pokok': '10000000' },
    ]
    const config = {
      mappings: [
        { excelColumn: 'Nama', employeeField: 'name' },
        { excelColumn: 'ID Karyawan', employeeField: 'employeeId' },
        { excelColumn: 'Gaji Pokok', employeeField: 'baseSalary' },
      ],
    }
    
    const result = generateImportPreview(rows, config)
    
    expect(result[0].data.baseSalary).toBe(10000000)
    expect(result[0].valid).toBe(true)
  })
})
