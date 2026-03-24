import { z } from 'zod'

const PPH21_STATUSES = [
  'TK/0', 'TK/1', 'TK/2', 'TK/3',
  'K/0', 'K/1', 'K/2', 'K/3',
  'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3',
] as const

export const EmployeeSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  department: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  npwp: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  baseSalary: z.number().positive(),
  hourlyRate: z.number().nonnegative().nullable().optional(),
  pph21Status: z.enum(PPH21_STATUSES).default('TK/0'),
  isActive: z.boolean().optional(),
})

export const EmployeePatchSchema = EmployeeSchema.partial()
