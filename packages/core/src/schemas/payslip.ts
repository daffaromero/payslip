import { z } from 'zod'

const AllowanceSchema = z.object({
  name: z.string(),
  amount: z.number(),
})

const DeductionSchema = z.object({
  name: z.string(),
  amount: z.number(),
})

const PERIOD_TYPES = ['weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'] as const

export const PayslipPatchSchema = z.object({
  notes: z.string().nullable().optional(),
  basePay: z.number().positive().optional(),
  overtimeHours: z.number().nonnegative().optional(),
  bonus: z.number().nonnegative().optional(),
  thr: z.number().nonnegative().optional(),
  allowances: z.array(AllowanceSchema).optional(),
  otherDeductions: z.array(DeductionSchema).optional(),
  templateId: z.string().optional(),
})

export const BulkPayslipSchema = z.object({
  employeeIds: z.array(z.string()).min(1).max(500),
  templateId: z.string(),
  periodType: z.enum(PERIOD_TYPES),
  startDate: z.string(),
  endDate: z.string(),
  overtimeHours: z.number().nonnegative().optional(),
  bonus: z.number().nonnegative().optional(),
  notes: z.string().optional(),
})
