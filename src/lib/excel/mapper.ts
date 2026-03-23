import { ParsedExcelRow } from './parser'
import { Employee } from '@/types'

export interface FieldMapping {
  excelColumn: string
  employeeField: string
  transform?: (value: string | number | null) => string | number | boolean | Date | null
}

export interface MappingConfig {
  mappings: FieldMapping[]
  defaultValues?: Partial<Employee>
}

export function mapRowToEmployee(
  row: ParsedExcelRow, 
  config: MappingConfig
): Partial<Employee> {
  const result: Partial<Employee> = { ...config.defaultValues }
  
  for (const mapping of config.mappings) {
    const value = row[mapping.excelColumn]
    
    if (value !== null && value !== undefined) {
      let transformedValue: string | number | boolean | Date | null = value
      
      if (mapping.transform) {
        transformedValue = mapping.transform(value)
      } else if (mapping.employeeField === 'baseSalary') {
        // Ensure salary is number
        transformedValue = typeof value === 'string' 
          ? parseFloat(value.replace(/[^\d.-]/g, ''))
          : Number(value)
      } else if (['overtimeHours', 'hourlyRate'].includes(mapping.employeeField)) {
        transformedValue = Number(value)
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
    
    return {
      data,
      errors,
      valid: errors.length === 0,
    }
  })
}
