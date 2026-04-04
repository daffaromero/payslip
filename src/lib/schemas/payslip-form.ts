import { z } from 'zod'

const AllowanceSchema = z.object({
  name: z.string(),
  amount: z.number().min(0),
})

const DeductionSchema = z.object({
  name: z.string(),
  amount: z.number().min(0),
})

export const PayslipFormSchema = z.object({
  employeeId: z.string().min(1, 'Pilih karyawan'),
  templateId: z.string().min(1, 'Pilih template'),
  periodType: z.enum(['weekly', 'monthly', 'quarterly', 'semi-annual', 'annual']),
  startDate: z.string().min(1, 'Masukkan tanggal mulai'),
  endDate: z.string().min(1, 'Masukkan tanggal selesai'),
  basePay: z.number().min(0),
  overtimeHours: z.number().min(0).optional().default(0),
  bonus: z.number().min(0).optional().default(0),
  thr: z.number().min(0).optional().default(0),
  allowances: z.array(AllowanceSchema).optional().default([]),
  deductions: z.array(DeductionSchema).optional().default([]),
  notes: z.string().optional().default(''),
})

export type PayslipFormValues = z.infer<typeof PayslipFormSchema>
