import { z } from 'zod'

const PPH21_STATUSES = [
  'TK/0', 'TK/1', 'TK/2', 'TK/3',
  'K/0', 'K/1', 'K/2', 'K/3',
  'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3',
] as const

const SalaryComponentSchema = z.object({
  amount: z.number().nonnegative(),
  enabled: z.boolean(),
})

export const SalaryComponentsSchema = z.object({
  tunjangan_jabatan: SalaryComponentSchema,
  tunjangan_luar_kota: SalaryComponentSchema,
  tunjangan_makan: SalaryComponentSchema,
  tunjangan_transport: SalaryComponentSchema,
  tunjangan_lama_bekerja: SalaryComponentSchema,
  tunjangan_pph21: SalaryComponentSchema,
})

export const EmployeeSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  npwp: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  baseSalary: z.number().positive(),
  hourlyRate: z.number().nonnegative().nullable().optional(),
  pph21Status: z.enum(PPH21_STATUSES).default('TK/0'),
  isActive: z.boolean().optional(),
  salaryComponents: SalaryComponentsSchema.optional().nullable(),
})

export const EmployeePatchSchema = EmployeeSchema.partial()
