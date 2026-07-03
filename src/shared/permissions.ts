/**
 * Single source of truth for RBAC: a two-level permission tree (domain groups
 * with granular sub-permissions), the Arabic catalog shown in the Users screen,
 * role presets, and the checks used by both the main-process IPC guard and the
 * renderer UI gating.
 *
 * Hierarchy rule: holding a GROUP key implies all of its child keys. So a user
 * granted `shift_manage` can do everything under shifts, while a user granted
 * only `shift_open_close` can just open/close shifts. Children never imply their
 * parent or siblings.
 *
 * Must stay dependency-free (no electron/db/react imports) — it is bundled into
 * main, preload and renderer alike.
 */

export const PERM = {
  ALL: '*',
  // POS (atomic)
  POS_ACCESS: 'pos_access',
  POS_VOID: 'pos_void',
  POS_DISCOUNT: 'pos_discount',
  // Transactions (atomic)
  TRANSACTIONS_VIEW: 'transactions_view',
  TRANSACTIONS_VIEW_ALL: 'transactions_view_all',
  // Kitchen (atomic)
  KITCHEN_VIEW: 'kitchen_view',
  // Shifts (group)
  SHIFT_MANAGE: 'shift_manage',
  SHIFT_OPEN_CLOSE: 'shift_open_close',
  SHIFT_PETTY_CASH: 'shift_petty_cash',
  SHIFT_EXPENSES: 'shift_expenses',
  SHIFT_FLOAT_EDIT: 'shift_float_edit',
  // Menu (group)
  MENU_MANAGE: 'menu_manage',
  MENU_ITEMS: 'menu_items',
  MENU_CATEGORIES: 'menu_categories',
  MENU_RECIPES: 'menu_recipes',
  // Inventory (group)
  INVENTORY_MANAGE: 'inventory_manage',
  INVENTORY_ITEMS: 'inventory_items',
  INVENTORY_ADJUST: 'inventory_adjust',
  INVENTORY_TRANSFER: 'inventory_transfer',
  INVENTORY_DAMAGE: 'inventory_damage',
  // Purchase (group)
  PURCHASE_MANAGE: 'purchase_manage',
  PURCHASE_SUPPLIERS: 'purchase_suppliers',
  PURCHASE_ORDERS: 'purchase_orders',
  // Customers (group)
  CUSTOMERS_MANAGE: 'customers_manage',
  CUSTOMERS_EDIT: 'customers_edit',
  CUSTOMERS_LOYALTY: 'customers_loyalty',
  // Reports / Users (atomic)
  REPORTS_VIEW: 'reports_view',
  USERS_MANAGE: 'users_manage',
  // Settings (group)
  SETTINGS_MANAGE: 'settings_manage',
  SETTINGS_GENERAL: 'settings_general',
  SETTINGS_PRINTERS: 'settings_printers',
  SETTINGS_BACKUP: 'settings_backup',
} as const

export type PermissionKey = string

export interface PermissionChild {
  id: string
  label: string
  desc: string
}
export interface PermissionNode {
  id: string
  label: string
  desc: string
  children?: PermissionChild[]
}

/**
 * The permission catalog rendered (as a tree) in the Users screen.
 * Group nodes carry `children`; granting the group implies all children.
 */
export const PERMISSION_TREE: readonly PermissionNode[] = [
  { id: '*', label: 'الوصول الكامل (Superadmin)', desc: 'يمنح جميع الصلاحيات في النظام دون استثناء' },

  { id: 'pos_access', label: 'الوصول لنقطة البيع', desc: 'إنشاء طلبات جديدة في الـ POS' },
  { id: 'pos_void', label: 'إلغاء الطلبات', desc: 'إلغاء طلب مدفوع واسترجاع المبلغ' },
  { id: 'pos_discount', label: 'تطبيق الخصومات', desc: 'إضافة خصم على الفاتورة ضمن الحد المسموح' },

  { id: 'transactions_view', label: 'سجل المعاملات', desc: 'فتح سجل المعاملات ورؤية معاملاته الخاصة' },
  { id: 'transactions_view_all', label: 'رؤية جميع المعاملات', desc: 'رؤية معاملات جميع الموظفين وليس معاملاته فقط' },

  { id: 'kitchen_view', label: 'شاشة المطبخ', desc: 'إدارة الطلبات والمخزون من شاشة المطبخ' },

  {
    id: 'shift_manage', label: 'إدارة الورديات (كامل)', desc: 'كل صلاحيات الوردية والنقدية',
    children: [
      { id: 'shift_open_close', label: 'فتح وإغلاق الوردية', desc: 'بدء وإنهاء ورديات العمل' },
      { id: 'shift_petty_cash', label: 'النثرية', desc: 'تسجيل حركات السحب والإيداع النقدي' },
      { id: 'shift_expenses', label: 'المصروفات', desc: 'تسجيل مصروفات الوردية' },
      { id: 'shift_float_edit', label: 'تعديل رصيد الافتتاح', desc: 'تعديل العهدة الافتتاحية للوردية' },
    ],
  },

  {
    id: 'menu_manage', label: 'إدارة القائمة (كامل)', desc: 'كل صلاحيات القائمة',
    children: [
      { id: 'menu_items', label: 'الأصناف', desc: 'إضافة وتعديل وحذف الأصناف والأسعار والصور' },
      { id: 'menu_categories', label: 'التصنيفات', desc: 'إدارة تصنيفات القائمة' },
      { id: 'menu_recipes', label: 'الوصفات', desc: 'تعديل مكونات ووصفات الأصناف' },
    ],
  },

  {
    id: 'inventory_manage', label: 'إدارة المخزون (كامل)', desc: 'كل صلاحيات المخزون',
    children: [
      { id: 'inventory_items', label: 'أصناف المخزون', desc: 'إضافة وتعديل وحذف أصناف المخزون والوحدات' },
      { id: 'inventory_adjust', label: 'تسويات المخزون', desc: 'تعديل وجرد الكميات' },
      { id: 'inventory_transfer', label: 'التحويلات', desc: 'تحويل المخزون بين المواقع' },
      { id: 'inventory_damage', label: 'التالف', desc: 'تسجيل الهدر والتالف' },
    ],
  },

  {
    id: 'purchase_manage', label: 'إدارة المشتريات (كامل)', desc: 'كل صلاحيات المشتريات',
    children: [
      { id: 'purchase_suppliers', label: 'الموردون', desc: 'إدارة بيانات الموردين' },
      { id: 'purchase_orders', label: 'أوامر الشراء', desc: 'إنشاء واستلام أوامر الشراء' },
    ],
  },

  {
    id: 'customers_manage', label: 'إدارة العملاء (كامل)', desc: 'كل صلاحيات العملاء',
    children: [
      { id: 'customers_edit', label: 'تعديل العملاء', desc: 'إضافة وتعديل بيانات العملاء' },
      { id: 'customers_loyalty', label: 'نقاط الولاء', desc: 'إضافة واستبدال نقاط الولاء' },
    ],
  },

  { id: 'reports_view', label: 'التقارير', desc: 'الوصول إلى لوحة المبيعات والتقارير المالية وسجل الأحداث' },
  { id: 'users_manage', label: 'إدارة الموظفين', desc: 'إضافة أو تعديل المستخدمين والصلاحيات' },

  {
    id: 'settings_manage', label: 'إعدادات النظام (كامل)', desc: 'كل إعدادات النظام',
    children: [
      { id: 'settings_general', label: 'الإعدادات العامة', desc: 'اسم المطعم، الضرائب، البنوك، الولاء' },
      { id: 'settings_printers', label: 'الطابعات', desc: 'إعداد وتعيين الطابعات' },
      { id: 'settings_backup', label: 'النسخ الاحتياطي', desc: 'النسخ الاحتياطي والاستعادة' },
    ],
  },
] as const

// ── Derived lookups ────────────────────────────────────────────────────────
const PARENT_OF: Record<string, string> = {}
const CHILDREN_OF: Record<string, string[]> = {}
for (const node of PERMISSION_TREE) {
  const kids = node.children?.map(c => c.id) ?? []
  CHILDREN_OF[node.id] = kids
  for (const k of kids) PARENT_OF[k] = node.id
}

/** All valid permission ids (groups + children), for validating stored/submitted arrays. */
export const ALL_PERMISSION_IDS: readonly string[] = PERMISSION_TREE.flatMap(
  n => [n.id, ...(n.children?.map(c => c.id) ?? [])]
)

/** The group key of a child permission, or undefined for group/atomic keys. */
export function parentOf(id: string): string | undefined {
  return PARENT_OF[id]
}

/** A group key plus all of its children (for "any permission in this domain" checks). */
export function descendants(groupId: string): string[] {
  return [groupId, ...(CHILDREN_OF[groupId] ?? [])]
}

/**
 * Any-of permission check with hierarchy. `'*'` grants everything; an empty
 * `required` list means "any authenticated session". A required child key is
 * satisfied by holding that child OR its parent group.
 */
export function hasPermission(perms: readonly string[] | undefined | null, required: readonly string[]): boolean {
  const p = perms ?? []
  if (p.includes(PERM.ALL)) return true
  if (required.length === 0) return true
  return required.some(r => p.includes(r) || (PARENT_OF[r] !== undefined && p.includes(PARENT_OF[r])))
}

/**
 * True if the user holds ANY permission within a domain (the group key or any
 * of its children). Used for navigation/screen-level visibility.
 */
export function hasDomainAccess(perms: readonly string[] | undefined | null, groupId: string): boolean {
  const p = perms ?? []
  if (p.includes(PERM.ALL)) return true
  return descendants(groupId).some(k => p.includes(k))
}

/**
 * Role = preset + display label. Selecting a role in the Users screen fills the
 * permission tree with its preset; the selection stays editable. Access control
 * reads ONLY the permission array, never the role name. Presets use group keys
 * so a role grants a whole domain by default; admins may narrow it to children.
 */
export const ROLE_PRESETS: Record<string, readonly string[]> = {
  admin: ['*'],
  manager: [
    'pos_access', 'pos_void', 'pos_discount', 'shift_manage',
    'transactions_view', 'transactions_view_all', 'kitchen_view',
    'menu_manage', 'inventory_manage', 'purchase_manage',
    'customers_manage', 'reports_view', 'users_manage',
  ],
  cashier: ['pos_access', 'shift_manage', 'transactions_view'],
  kitchen: ['kitchen_view'],
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'مسؤول', manager: 'مدير', cashier: 'كاشير', kitchen: 'مطبخ',
}

/**
 * A kitchen-only user (only the kitchen_view permission) gets the fullscreen
 * kitchen console with no sidebar.
 */
export function isKitchenOnly(perms: readonly string[] | undefined | null): boolean {
  const p = perms ?? []
  return p.length === 1 && p[0] === PERM.KITCHEN_VIEW
}
