import { z } from 'zod'

// ── Kitchen Stock Adjustment ─────────────────────────────────────

export const kitchenAdjustSchema = z.object({
  itemId: z.number().int(),
  quantity: z.number().positive(),
  type: z.enum(['add', 'remove']),
  reason: z.string().optional().default(''),
})

// ── Kitchen Stock Correction ─────────────────────────────────────

export const kitchenCorrectionSchema = z.object({
  itemId: z.number().int(),
  newQuantity: z.number().min(0),
  reason: z.string().optional().default('تصحيح مطبخ'),
})

// ── Kitchen Damage ───────────────────────────────────────────────

export const kitchenDamageSchema = z.object({
  itemId: z.number().int(),
  quantity: z.number().positive(),
  reason: z.string().min(1, 'السبب مطلوب'),
})

// ── Kitchen Production ───────────────────────────────────────────

export const kitchenProduceSchema = z.object({
  menuItemName: z.string().min(1),
  quantity: z.number().positive(),
  consumedMaterials: z.array(z.object({
    itemId: z.number().int(),
    quantity: z.number().positive(),
  })).optional(),
})

// ── Kitchen Material Usage ───────────────────────────────────────

export const kitchenUsageSchema = z.object({
  itemId: z.number().int(),
  quantity: z.number().positive(),
  reason: z.string().optional().default('استهلاك مطبخ'),
})
