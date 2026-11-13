import { z } from 'zod'

// Mirrors the constraints in db/migrations/0001_init.sql.
export const fillUpSchema = z.object({
  odometerKm: z.number().positive(),
  litres: z.number().positive(),
  totalCost: z.number().nonnegative(),
  computerL100km: z.number().nullable(),
  rangeEstimateKm: z.number().nonnegative().nullable(),
  isFullTank: z.boolean(),
  missedPrevious: z.boolean(),
  filledAt: z.string(),
  station: z.string().nullable(),
  fuelGrade: z.string().nullable(),
  notes: z.string().nullable(),
})

export type FillUpFormValues = z.infer<typeof fillUpSchema>

export function parseDecimal(input: string): number | null {
  if (input.trim() === '') return null
  const n = Number(input)
  return Number.isFinite(n) ? n : null
}
