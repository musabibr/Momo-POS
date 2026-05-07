/**
 * Schema barrel — re-exports all per-module schemas.
 *
 * New code should import from the specific module schema file.
 * This barrel exists for backward-compat and convenience.
 */

// ── Inventory ─────────────────────────────────────────────────────
export {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  adjustStockSchema,
  stockCorrectionSchema,
  transferSchema,
  damageReportSchema,
} from './inventory.schemas'

// Backward-compat aliases for inventory schemas
export { createInventoryItemSchema as createIngredientSchema } from './inventory.schemas'
export { updateInventoryItemSchema as updateIngredientSchema } from './inventory.schemas'

// ── Menu ──────────────────────────────────────────────────────────
export {
  createMenuItemSchema,
  updateMenuItemSchema,
  recipeLineSchema,
} from './menu.schemas'

// Backward-compat aliases for menu schemas
export { createMenuItemSchema as createItemSchema } from './menu.schemas'
export { updateMenuItemSchema as updateItemSchema } from './menu.schemas'

// ── Kitchen ───────────────────────────────────────────────────────
export {
  kitchenAdjustSchema,
  kitchenCorrectionSchema,
  kitchenDamageSchema,
  kitchenProduceSchema,
} from './kitchen.schemas'

// ── Procurement ───────────────────────────────────────────────────
export { createPurchaseSchema } from './procurement.schemas'

// ── Orders ──────────────────────────────────────────────────────────
import { z } from 'zod'

export const createOrderSchema = z.object({
  clientOrderId: z.string().optional().nullable(),
  subtotal: z.number().int().min(0),
  discAmount: z.number().int().min(0).optional().default(0),
  discReason: z.string().optional().nullable(),
  discType: z.enum(['pct', 'amt']).optional().nullable(),
  discValue: z.number().int().min(0).optional().nullable(),
  total: z.number().int().min(0),
  payMode: z.enum(['cash', 'bank', 'split']),
  bankName: z.string().optional().nullable(),
  bankRef: z.string().optional().nullable(),
  cashIn: z.number().int().optional().nullable(),
  cashChange: z.number().int().optional().nullable(),
  cashPart: z.number().int().optional().nullable(),
  bankPart: z.number().int().optional().nullable(),
  customerId: z.number().int().optional().nullable(),
  employeeId: z.number().int().optional().nullable(),
  shiftId: z.number().int().optional().nullable(),
  orderType: z.enum(['local', 'takeaway', 'delivery']).optional().nullable(),
  orderNote: z.string().optional().nullable(),
  items: z.array(z.object({
    itemId: z.number().int(),
    qty: z.number().int().min(1),
    unitPrice: z.number().int().min(0),
    variationLabel: z.string().optional().nullable(),
    selections: z.any().optional().nullable(),
    note: z.string().optional().nullable(),
  })).min(1, 'الطلب يجب أن يحتوي على صنف واحد على الأقل'),
}).refine(d => (d.discAmount ?? 0) <= d.subtotal, { message: 'مبلغ الخصم أكبر من المجموع الفرعي' })

// ── Employees ──────────────────────────────────────────────────────
export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'اسم الموظف مطلوب'),
  role: z.enum(['admin', 'manager', 'cashier', 'kitchen']),
  pin: z.string().min(4, 'PIN يجب أن يكون 4 أرقام على الأقل'),
})

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'manager', 'cashier', 'kitchen']).optional(),
  pin: z.string().min(4).optional(),
  active: z.boolean().optional(),
})

// ── Customers ──────────────────────────────────────────────────────
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'اسم العميل مطلوب'),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isVip: z.boolean().optional(),
  isBlacklist: z.boolean().optional(),
})

// ── Cash ───────────────────────────────────────────────────────────
export const pettyCashSchema = z.object({
  type: z.enum(['in', 'out']),
  amount: z.number().int().positive('المبلغ يجب أن يكون أكبر من صفر'),
  reason: z.string().min(1, 'السبب مطلوب'),
  shiftId: z.number().int().optional().nullable(),
  employeeId: z.number().int().optional().nullable(),
})

export const expenseSchema = z.object({
  amount: z.number().int().positive('المبلغ يجب أن يكون أكبر من صفر'),
  category: z.string().min(1, 'التصنيف مطلوب'),
  note: z.string().optional().default(''),
  shiftId: z.number().int().optional().nullable(),
  employeeId: z.number().int().optional().nullable(),
})

// ── Settings ──────────────────────────────────────────────────────
export const setSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})
