import { z } from 'zod'

// ── Menu Items ──────────────────────────────────────────────────

const itemOptionSchema = z.object({
  name: z.string().min(1),
  priceAdj: z.number().default(0),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

const itemOptionGroupSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['single', 'multi']).default('single'),
  kind: z.enum(['variation', 'modifier']).default('variation'),
  sortOrder: z.number().optional(),
  options: z.array(itemOptionSchema).default([]),
})

export const createMenuItemSchema = z.object({
  name: z.string().min(1, 'اسم الصنف مطلوب'),
  price: z.number().int().min(0, 'السعر يجب أن يكون رقم صحيح'),
  cost: z.number().int().min(0).optional().nullable(),
  catId: z.string().optional().nullable(),
  subcatId: z.string().optional().nullable(),
  emoji: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imagePath: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  displayMode: z.enum(['icon', 'image']).optional(),
  optionGroups: z.array(itemOptionGroupSchema).optional(),
})

export const updateMenuItemSchema = createMenuItemSchema.partial()

// ── Recipes ─────────────────────────────────────────────────────

export const recipeLineSchema = z.object({
  ingredientId: z.number().int(),
  quantity: z.number().positive(),
})
