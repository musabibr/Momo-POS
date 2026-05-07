import { z } from 'zod'

// ── Purchases ─────────────────────────────────────────────────────

export const createPurchaseSchema = z.object({
  supplierId: z.number().int(),
  items: z.array(z.object({
    itemId: z.number().int(),
    quantity: z.number().positive(),
    packagingId: z.number().int().optional().nullable(),
    packagingQty: z.number().optional().nullable(),
    unitCost: z.number().positive(),
  })).min(1, 'يجب إضافة صنف واحد على الأقل'),
  note: z.string().optional().nullable(),
  employeeId: z.number().int().optional().nullable(),
})
