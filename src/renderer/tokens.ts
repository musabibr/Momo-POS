/** Design tokens — exact palette from the Momo prototype */
export const P = {
  bg:'#fdf7ff',bg2:'#f8f0ff',bg3:'#f3e8ff',
  surface:'#ffffff',surf2:'#fefbff',
  border:'#ede5ff',borderM:'#d8b4fe',borderS:'#c084fc',
  plum:'#1a0a2e',ink:'#2d1657',mid:'#7c3aed',muted:'#9d6fd4',faint:'#c4a8e8',ghost:'#f5edff',
  purple:'#9333ea',purpleL:'#a855f7',purpleXL:'#e9d5ff',
  pink:'#db2777',pinkL:'#f472b6',pinkXL:'#fce7f3',
  rose:'#e11d48',roseL:'#fecdd3',roseXL:'#fff1f2',
  gold:'#b45309',goldL:'#fde68a',goldXL:'#fffbeb',
  green:'#047857',greenL:'#6ee7b7',greenXL:'#ecfdf5',
  blue:'#0e7490',blueXL:'#f0f9ff',
  purpleGrad: 'linear-gradient(135deg, #9333ea, #db2777)',
  pinkGrad: 'linear-gradient(135deg, #db2777, #f472b6)',
  radius: 16,
  radiusSm: 10,
  sidebarW: 230,
  topbarH: 50
} as const

/**
 * Screen IDs map to the workflow-first 8-domain navigation. Each domain owns
 * a single concern; admin operations live under `setup`. See plans/README.md.
 *
 * Internal routing: some IDs reuse existing screen components with restricted
 * tab sets (e.g. `stock` → InventoryScreen with stock tab only; `procurement`
 * → InventoryScreen with suppliers + POs tabs). Kitchen role lands on
 * `kitchen` (KitchenConsole).
 */
export type Screen =
  | 'pos'          // نقطة البيع — order entry
  | 'transactions' // المعاملات — order history, void, corrections
  | 'shift'        // الوردية — open/operate/close, petty cash, expenses, reconcile
  | 'catalog'      // القائمة — items / categories / variations / modifiers / recipes
  | 'stock'        // المخزون — ingredients + adjustments + low alerts
  | 'cust'         // العملاء — customers + loyalty
  | 'procurement'  // المشتريات — suppliers + purchase orders (admin/manager)
  | 'insights'     // التقارير — analytics, no audit
  | 'setup'        // الإعدادات — branding + banks + printers + backup + employees + RBAC + audit
  | 'users'        // الموظفون — user management
  | 'kitchen'      // المطبخ — kitchen role landing screen

export type Role = 'admin' | 'manager' | 'cashier' | 'kitchen'

export interface NavSlot {
  id: Screen
  label: string
  icon: string
  accent: string
  /** Roles allowed to see this slot in the sidebar. */
  roles: readonly Role[]
  perm?: string
}

export const NAV: readonly NavSlot[] = [
  { id: 'pos',         label: 'نقطة البيع',  icon: 'pos',    accent: P.pink,    roles: ['admin', 'manager', 'cashier'], perm: 'pos_access' },
  { id: 'transactions',label: 'المعاملات',   icon: 'note',   accent: P.blue,    roles: ['admin', 'manager', 'cashier'], perm: 'transactions_view' },
  { id: 'shift',       label: 'الوردية',     icon: 'cash',   accent: P.green,   roles: ['admin', 'manager', 'cashier'], perm: 'shift_manage' },
  { id: 'catalog',     label: 'القائمة',     icon: 'menu',   accent: P.purple,  roles: ['admin', 'manager'], perm: 'menu_manage' },
  { id: 'stock',       label: 'المخزون',     icon: 'inv',    accent: '#7c3aed', roles: ['admin', 'manager'], perm: 'inventory_manage' },
  { id: 'kitchen',     label: 'المطبخ',      icon: 'box',    accent: P.gold,    roles: ['admin', 'manager'], perm: 'kitchen_view' },
  { id: 'cust',        label: 'العملاء',     icon: 'cust',   accent: P.pink,    roles: ['admin', 'manager'], perm: 'customers_manage' },
  { id: 'procurement', label: 'المشتريات',   icon: 'usb',    accent: P.gold,    roles: ['admin', 'manager'], perm: 'purchase_manage' },
  { id: 'insights',    label: 'التقارير',    icon: 'rep',    accent: '#4f46e5', roles: ['admin', 'manager'], perm: 'reports_view' },
  { id: 'users',       label: 'الموظفون',    icon: 'user',   accent: P.rose,    roles: ['admin'], perm: 'users_manage' },
  { id: 'setup',       label: 'الإعدادات',   icon: 'sett',   accent: P.muted,   roles: ['admin'], perm: 'settings_manage' },
] as const

/** Filter NAV by current session permissions. Kitchen role is handled separately
 *  (lands on KitchenConsole, no sidebar). */
export function navForRole(role: string, perms: string[] = []): NavSlot[] {
  if (role === 'kitchen') return []
  if (perms.includes('*')) return NAV as any
  return NAV.filter((n: any) => perms.includes(n.perm))
}

export const IC: Record<string, string> = {
  pos:    'M2 3h20v14a2 2 0 01-2 2H4a2 2 0 01-2-2V3zM8 21h8M12 17v4',
  menu:   'M3 5h18M3 12h18M3 19h18',
  inv:    'M20 7L12 3 4 7v10l8 4 8-4V7zM12 3v18M4 7l8 4 8-4',
  cust:   'M12 4a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.6-7 8-7s8 3 8 7',
  cash:   'M2 5h20v14H2V5zM12 9a3 3 0 100 6 3 3 0 000-6z',
  rep:    'M3 3v18h18M7 16l4-6 4 4 4-8',
  shift:  'M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2',
  sett:   'M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  plus:   'M12 5v14M5 12h14',
  minus:  'M5 12h14',
  trash:  'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  print:  'M6 9V2h12v7M2 9h20v10H2V9zM6 14h12M6 17h6',
  check:  'M20 6L9 17l-5-5',
  search: 'M21 21l-4.35-4.35M11 18A7 7 0 1111 4a7 7 0 010 14z',
  tag:    'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  hold:   'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-5h2V9h-2v6z',
  void:   'M12 2a10 10 0 100 20A10 10 0 0012 2zM15 9l-6 6M9 9l6 6',
  user:   'M12 4a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.6-7 8-7s8 3 8 7',
  lock:   'M5 11h14v10H5V11zM8 11V7a4 4 0 018 0v4',
  alert:  'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  usb:    'M12 2v10M8 8l4 4 4-4M7 16a2 2 0 100 4 2 2 0 000-4M17 16a2 2 0 100 4 2 2 0 000-4M7 18h10',
  bar:    'M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3M7 8v8M10 8v8M13 8v8M16 8v8',
  star:   'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  gift:   'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z',
  close:  'M18 6L6 18M6 6l12 12',
  edit:   'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  save:   'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8',
  spark:  'M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z',
  img:    'M21 15l-5-5L5 21M2 2h20v20H2V2zM8.5 8.5a2 2 0 100-4 2 2 0 000 4z',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  link:   'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  clock:  'M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2',
  phone:  'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.1 .18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z',
  refresh:'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  note:   'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  chevR:  'M9 18l6-6-6-6',
  chevD:  'M6 9l6 6 6-6',
  layers: 'M12 2l10 6.5v7L12 22 2 15.5v-7L12 2zM12 22V15M22 15l-10-6.5M2 15l10-6.5',
  palette:'M12 2a10 10 0 110 20c-5.52 0-9-4.5-7-9 1-2.3 3.9-2 5 0 .9 1.7 2.9 1.7 3.9 0 2-3.5-1-7-4-7a10 10 0 00-8 10',
  box:    'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  sync:   'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  del:    'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  info:   'M12 2a10 10 0 100 20A10 10 0 0012 2zM12 16v-4M12 8h.01',
}
