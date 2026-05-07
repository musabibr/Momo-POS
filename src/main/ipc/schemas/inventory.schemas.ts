import { z } from 'zod'

// ── Inventory Items ──────────────────────────────────────────────

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'اسم المكون مطلوب'),
  unit: z.string().min(1, 'الوحدة مطلوبة'),
  stock: z.number().min(0).default(0),
  lowThreshold: z.number().min(0).default(0),
  costPerUnit: z.number().optional().nullable(),
  barcode: z.string().optional().nullable(),
  type: z.enum(['ingredient', 'premade']).default('ingredient'),
  parentId: z.number().int().optional().nullable(),
})

export const updateInventoryItemSchema = z.object({
  name: z.string().optional(),
  unit: z.string().optional(),
  lowThreshold: z.number().min(0).optional().nullable(),
  costPerUnit: z.number().optional().nullable(),
  barcode: z.string().optional().nullable(),
  type: z.enum(['ingredient', 'premade']).optional(),
  parentId: z.number().int().optional().nullable(),
})

// ── Stock ────────────────────────────────────────────────────────

export const adjustStockSchema = z.object({
  ingredientId: z.number().int(),
  quantity: z.number().refine(q => q !== 0, 'الكمية لا يمكن أن تكون صفر'),
  type: z.enum(['add', 'remove', 'waste', 'damage']),
  reason: z.string().min(1, 'السبب مطلوب'),
  employeeId: z.number().int().optional().nullable(),
  locationId: z.string().default('main'),
})

export const stockCorrectionSchema = z.object({
  itemId: z.number().int(),
  locationId: z.string().min(1),
  newQuantity: z.number().min(0),
  reason: z.string().min(1, 'السبب مطلوب'),
  employeeId: z.number().int().optional().nullable(),
})

// ── Transfers ────────────────────────────────────────────────────

export const transferSchema = z.object({
  itemId: z.number().int(),
  fromLocation: z.string().min(1),
  toLocation: z.string().min(1),
  quantity: z.number().positive(),
  packagingId: z.number().int().optional().nullable(),
  packagingQty: z.number().optional().nullable(),
  employeeId: z.number().int().optional().nullable(),
  note: z.string().optional().nullable(),
})

// ── Damage Report ────────────────────────────────────────────────

export const damageReportSchema = z.object({
  itemId: z.number().int(),
  quantity: z.number().positive(),
  locationId: z.string().min(1),
  reason: z.string().min(1, 'السبب مطلوب'),
  employeeId: z.number().int().optional().nullable(),
})
