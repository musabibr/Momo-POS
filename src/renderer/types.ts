// ── Window API type ────────────────────────────────────────────────
declare global {
  interface Window {
    api: import('../preload/index').ApiType
  }
}

// ── Domain entities ────────────────────────────────────────────────

export interface Item {
  id: number
  name: string
  price: number
  category_id: string | null
  subcategory_id: string | null
  description: string | null
  emoji: string | null
  imagePath: string | null
  available: number // 0 or 1
  created_at: string
}

export interface Category {
  id: string
  name: string
  color: string
  parent_id: string | null
  sort_order: number
}

// Item-scoped option groups (replaces legacy global variation system)
export interface ItemOptionGroup {
  id: number
  item_id: number
  name: string
  type: 'single' | 'multi'
  kind: 'variation' | 'modifier'
  sort_order: number
  options: ItemOption[]
}

export interface ItemOption {
  id: number
  group_id: number
  name: string
  price_adj: number
  is_default: number // 0 or 1
  sort_order: number
}

export interface Order {
  id: number
  client_order_id: string
  shift_id: number | null
  employee_id: number | null
  customer_id: number | null
  subtotal: number
  disc_amount: number
  disc_type: string | null
  disc_reason: string | null
  total: number
  pay_mode: 'cash' | 'bank' | 'split'
  cash_in: number | null
  cash_change: number | null
  bank_name: string | null
  bank_ref: string | null
  cash_part: number | null
  bank_part: number | null
  order_type: 'local' | 'takeaway' | 'delivery' | null
  order_note: string | null
  status: 'confirmed' | 'voided'
  voided_by: number | null
  void_reason: string | null
  created_at: string
}

export interface OrderItem {
  id: number
  order_id: number
  item_id: number
  item_name: string
  variation_label: string | null
  note: string | null
  quantity: number
  unit_price: number
  total_price: number
}

export interface Ingredient {
  id: number
  name: string
  unit: string // 'g' | 'kg' | 'ml' | 'l' | 'pcs'
  stock: number
  low_threshold: number
  cost_per_unit: number | null
  barcode: string | null
}

export interface Recipe {
  id: number
  item_id: number
  ingredient_id: number
  quantity: number
  ingredient_name?: string
  unit?: string
}

export interface Supplier {
  id: number
  name: string
  phone: string | null
  notes: string | null
  ingredients?: SupplierIngredient[]
}

export interface SupplierIngredient {
  supplier_id: number
  ingredient_id: number
  price_per_unit: number
  ingredient_name?: string
  unit?: string
}

export interface StockAdjustment {
  id: number
  ingredient_id: number
  quantity: number
  type: 'add' | 'remove' | 'waste' | 'correction'
  reason: string
  employee_id: number | null
  created_at: string
}

export interface Customer {
  id: number
  name: string
  phone: string
  notes: string | null
  points: number
  total_spent: number
  visit_count: number
  vip: number // 0 or 1
  blacklisted: number // 0 or 1
  birthday: string | null
  created_at: string
}

export interface Employee {
  id: number
  name: string
  role: 'admin' | 'manager' | 'cashier' | 'kitchen'
  active: number // 0 or 1
  created_at: string
}

export interface Shift {
  id: number
  employee_id: number
  open_float: number
  close_float: number | null
  opened_at: string
  closed_at: string | null
  employee_name?: string
}

export interface ClockEntry {
  id: number
  employee_id: number
  shift_id: number
  clock_in: string
  clock_out: string | null
  employee_name?: string
}

export interface PettyCash {
  id: number
  type: 'in' | 'out'
  amount: number
  reason: string
  shift_id: number | null
  employee_id: number | null
  created_at: string
}

export interface Expense {
  id: number
  amount: number
  category: string
  note: string
  shift_id: number | null
  employee_id: number | null
  created_at: string
}

export interface ActionLog {
  id: number
  employee_id: number | null
  action: string
  detail: string
  created_at: string
  employee_name?: string
}

export interface RevenueSummary {
  total_cash: number
  total_bank: number
  total_revenue: number
  order_count: number
  voided_count: number
  expenses_total: number
  petty_in: number
  petty_out: number
}

// ── Unit display map (English code → Arabic label) ─────────────────
export const UNIT_AR: Record<string, string> = {
  g: 'جرام',
  kg: 'كيلو',
  ml: 'مل',
  l: 'لتر',
  pcs: 'قطعة',
}

export {}
