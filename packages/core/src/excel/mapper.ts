import type { ParsedExcelRow } from './parser'
import type { Employee } from '../types'

export interface FieldMapping {
  excelColumn: string
  employeeField: string
  transform?: (value: string | number | null) => string | number | boolean | Date | null
}

export interface MappingConfig {
  mappings: FieldMapping[]
  defaultValues?: Partial<Employee>
}

export function mapRowToEmployee(row: ParsedExcelRow, config: MappingConfig): Partial<Employee> {
  const result: Partial<Employee> = { ...config.defaultValues }

  for (const mapping of config.mappings) {
    const value = row[mapping.excelColumn]

    if (value !== null && value !== undefined) {
      let transformedValue: string | number | boolean | Date | null = value

      if (mapping.transform) {
        transformedValue = mapping.transform(value)
      } else if (mapping.employeeField === 'baseSalary') {
        const parsed = typeof value === 'string'
          ? parseFloat(value.replace(/[^\d.-]/g, ''))
          : Number(value)
        transformedValue = isNaN(parsed) ? 0 : parsed
      } else if (['overtimeHours'].includes(mapping.employeeField)) {
        const parsed = Number(value)
        transformedValue = isNaN(parsed) ? 0 : parsed
      }

      (result as Record<string, typeof transformedValue>)[mapping.employeeField] = transformedValue
    }
  }

  return result
}

export function validateEmployeeData(data: Partial<Employee>): string[] {
  const errors: string[] = []
  if (!data.name) errors.push('Nama wajib diisi')
  if (!data.employeeId) errors.push('ID Karyawan wajib diisi')
  if (!data.baseSalary || data.baseSalary <= 0) errors.push('Gaji pokok wajib diisi dan lebih dari 0')
  return errors
}

export function generateImportPreview(
  rows: ParsedExcelRow[],
  config: MappingConfig
): Array<{ data: Partial<Employee>; errors: string[]; valid: boolean }> {
  return rows.map(row => {
    const data = mapRowToEmployee(row, config)
    const errors = validateEmployeeData(data)
    return { data, errors, valid: errors.length === 0 }
  })
}
