# موموـ POS — Implementation Plan & Developer Handbook

> **Momo** · A fully offline, single-device restaurant management system for a desserts & drinks café.
> Arabic RTL · Luxury pink-purple theme · 8 modules · 2 thermal printers · SQLite · No internet, ever.

---

## Table of Contents

1. [How to Fetch the Design](#1-how-to-fetch-the-design)
2. [Project Overview](#2-project-overview)
3. [Tech Stack Decisions](#3-tech-stack-decisions)
4. [Repository Structure](#4-repository-structure)
5. [Database Schema](#5-database-schema)
6. [IPC Bridge Contract](#6-ipc-bridge-contract)
7. [RBAC — Roles & Permissions](#7-rbac--roles--permissions)
8. [Module Specifications](#8-module-specifications)
9. [Implementation Phases](#9-implementation-phases)
10. [Hardware Integration](#10-hardware-integration)
11. [Backup & Restore](#11-backup--restore)
12. [Key Risks & Mitigations](#12-key-risks--mitigations)
13. [Definition of Done](#13-definition-of-done)
14. [Coding Agent Prompts](#14-coding-agent-prompts)

---

## 1. How to Fetch the Design

The design was built in [Claude Design](https://claude.ai/design) and exported as a handoff bundle.
Use the following command or prompt to fetch, decompress, and read the full design package.

### Shell commands

```bash
# 1. Download the gzipped tar bundle
curl -s "https://api.anthropic.com/v1/design/h/CGbNb4dTdNo6O54mqcPllg?open_file=Momo+POS.html" \
  -o momo_design.tar.gz

# 2. Decompress
gunzip -c momo_design.tar.gz > momo_design.tar

# 3. Extract
tar xf momo_design.tar

# 4. You now have:
#    momo/README.md               ← handoff instructions
#    momo/chats/chat1.md          ← full design conversation (READ THIS)
#    momo/project/Momo POS.html   ← 1685-line React prototype (primary file)
#    momo/project/momo-data.js    ← seed data (items, categories, banks, etc.)
#    momo/project/tweaks-panel.jsx
#    momo/project/sections/       ← screenshot reference images
```

### Prompt for a coding agent

Paste this prompt verbatim to any coding agent (Claude Code, Cursor, etc.) to load the design
context before starting implementation:

```
Fetch this design bundle and read it completely before writing any code:
https://api.anthropic.com/v1/design/h/CGbNb4dTdNo6O54mqcPllg?open_file=Momo+POS.html

Steps to follow:
1. Download and decompress the .tar.gz bundle (it is gzip → tar).
2. Read momo/README.md first — it contains handoff instructions.
3. Read momo/chats/chat1.md in full — this is the design conversation and
   contains all the intent, iteration history, and final decisions.
4. Read momo/project/Momo POS.html in full (1685 lines) — this is the
   interactive React prototype. Every screen, component, color token,
   Arabic string, and interaction pattern lives here.
5. Read momo/project/momo-data.js — seed data for items, categories,
   variation groups, and banks.

After reading, implement the system described in MOMO_POS_README.md.
The prototype is the source of truth for all UI. Match it pixel-for-pixel.
```

### What the design file contains

| File | Size | Purpose |
|---|---|---|
| `momo/README.md` | 2 KB | Handoff instructions for coding agents |
| `momo/chats/chat1.md` | ~8 KB | Full design conversation — intent, iterations, final decisions |
| `momo/project/Momo POS.html` | 1,685 lines | Interactive React prototype, all 8 modules wired |
| `momo/project/momo-data.js` | ~4 KB | Seed data: 16 items, 11 categories, 6 variation groups, 4 banks |
| `momo/project/tweaks-panel.jsx` | ~2 KB | Design tool panel (not part of production) |
| `momo/project/sections/*.png` | — | Screenshot reference images used during design |

---

## 2. Project Overview

### What Momo is

Momo (موموـ) is a point-of-sale and back-office system for a desserts and drinks café operating in
Sudan. The system runs on a **single PC or touch-screen device** with **no internet connection,
ever**. All data is stored locally in SQLite. Two USB thermal printers handle receipts and kitchen
tickets. A USB drive handles backups.

### What Momo is not

- Not a cloud system. No server. No sync. No subscriptions.
- Not a multi-branch system. One device, one location.
- Not networked. The single device IS the system.
- Not a delivery platform. In-house orders only.
- No e-payments. Cash and bank transfer only.
- No VAT calculations. No multi-currency. SDG only.
- No kitchen display screen. Kitchen gets a printed ticket from Printer 2.
- No table management. Counter service.
- No reservations. Walk-in only.

### Core constraints

```
✓ 100% offline — pulling the ethernet cable must not affect any feature
✓ Single device — all processes run on one machine
✓ Arabic RTL — full right-to-left layout, Tajawal font, bundled (no CDN)
✓ 2 thermal printers — Printer 1 = cashier receipt, Printer 2 = kitchen ticket
✓ 3 payment modes — cash, bank transfer, split (cash + bank)
✓ Banks configured by admin — names stored in settings, selectable at POS
✓ Barcode scanner — USB HID, inventory only, not at POS
✓ USB backup — hourly, manual, one-click restore
✓ No VAT, no multi-currency, SDG only
✓ RBAC — 4 roles: admin, manager, cashier, kitchen
```

### The 8 modules

| # | Module (Arabic) | Key purpose |
|---|---|---|
| 1 | نقطة البيع (POS) | Order entry, payment, print to 2 printers |
| 2 | إدارة القائمة (Menu) | Items, categories, variations, images |
| 3 | المخزون (Inventory) | Stock levels, recipes, auto-deduct, barcode |
| 4 | العملاء (Customers) | Profiles, visit history, loyalty points |
| 5 | الصندوق (Cash) | Float, EOD reconciliation, Z-report |
| 6 | التقارير (Reports) | Sales, items, payments, audit log |
| 7 | الورديات (Shifts & RBAC) | Shift management, employee roles, PIN login |
| 8 | الإعدادات (Settings) | Banks, printers, backup, receipt branding |

---

## 3. Tech Stack Decisions

Every decision below is grounded in what the design file specifies (the prototype already
uses React 18, references "SQLite 3.42", mentions USB backup, and describes ESC/POS printing).

### Application shell

**Electron 30** — the only viable choice for a fully-offline, single-device, hardware-integrated
desktop app that runs on Windows (primary target) and Linux (fallback). Gives access to:
- `better-sqlite3` in the main process (synchronous SQLite, no async overhead)
- `node-thermal-printer` for USB thermal printers
- `fs` and `path` for local image storage and USB backup
- `app.setLoginItemSettings` for auto-launch on Windows startup

### Frontend

**React 18 + Vite + TypeScript** — the prototype is already written in React 18. Porting it to
production is a matter of replacing `useState` with DB calls via IPC, not a rewrite.

- **No React Router** — screen switching is a simple enum state variable (`active: Screen`),
  identical to the prototype's `SCREENS` object.
- **No Redux or Zustand** — state is either local component state or lifted to the App root,
  exactly as in the prototype. SQLite is the persistent store.
- **No Tailwind** — the prototype uses inline styles with CSS custom properties. Keep this
  approach to match the design exactly. Move repeated inline styles to a single `tokens.ts` file.

### Database

**better-sqlite3** (synchronous SQLite3 for Node.js) — runs in Electron's main process.
All DB access goes through IPC handlers. The renderer process never touches the DB directly.

- WAL journal mode enabled for performance.
- Versioned migration files in `src/main/db/migrations/`.
- One repository class per domain entity.
- Foreign keys enforced (`PRAGMA foreign_keys = ON`).

### Printing

**node-thermal-printer** — ESC/POS command library for Node.js. Handles:
- Arabic text encoding (CP864 or CP720 — test with actual printer hardware).
- Text alignment, bold, line feeds, cut command.
- Bitmap printing fallback if the printer does not support Arabic Unicode.

### Other dependencies

| Package | Purpose |
|---|---|
| `electron-builder` | Windows NSIS installer + portable ZIP |
| `electron-forge` | Dev scaffold and build tooling |
| `bcryptjs` | PIN hashing (never store PINs in plain text) |
| `archiver` | ZIP backup bundles to USB |
| `dayjs` | Date formatting (Arabic locale) |
| `@types/better-sqlite3` | TypeScript types |

### What is explicitly NOT used

- No cloud SDK (Firebase, Supabase, AWS, etc.)
- No analytics or telemetry
- No auto-updater that phones home
- No CDN-loaded fonts, icons, or libraries (everything bundled in `/assets`)
- No WebSocket server (single device, no LAN)
- No HTTP server
- No external authentication service

---

## 4. Repository Structure

```
momo-pos/
├── package.json
├── electron.vite.config.ts
├── electron-builder.config.ts
│
├── src/
│   ├── main/                          # Electron main process
│   │   ├── index.ts                   # App entry, BrowserWindow, IPC registration
│   │   ├── db/
│   │   │   ├── connection.ts          # better-sqlite3 init, WAL mode, FK pragma
│   │   │   ├── migrations/
│   │   │   │   ├── 001_initial.sql
│   │   │   │   ├── 002_add_barcode.sql
│   │   │   │   └── runner.ts          # Reads & runs pending migrations on startup
│   │   │   ├── seed.ts                # Inserts momo-data.js defaults on first run
│   │   │   └── repositories/
│   │   │       ├── ItemRepo.ts
│   │   │       ├── CategoryRepo.ts
│   │   │       ├── VariationRepo.ts
│   │   │       ├── OrderRepo.ts
│   │   │       ├── InventoryRepo.ts
│   │   │       ├── CustomerRepo.ts
│   │   │       ├── EmployeeRepo.ts
│   │   │       ├── ShiftRepo.ts
│   │   │       ├── CashRepo.ts
│   │   │       ├── ReportRepo.ts
│   │   │       └── SettingsRepo.ts
│   │   ├── ipc/
│   │   │   ├── register.ts            # Registers all IPC handlers
│   │   │   ├── items.ts
│   │   │   ├── orders.ts
│   │   │   ├── inventory.ts
│   │   │   ├── customers.ts
│   │   │   ├── employees.ts
│   │   │   ├── shifts.ts
│   │   │   ├── cash.ts
│   │   │   ├── reports.ts
│   │   │   └── settings.ts
│   │   ├── print/
│   │   │   ├── printer.ts             # node-thermal-printer wrapper
│   │   │   ├── templates/
│   │   │   │   ├── cashierReceipt.ts  # Printer 1 format
│   │   │   │   ├── kitchenTicket.ts   # Printer 2 format
│   │   │   │   ├── zReport.ts
│   │   │   │   └── purchaseOrder.ts
│   │   └── backup/
│   │       ├── backup.ts              # ZIP DB + images → USB
│   │       ├── restore.ts             # Unzip → replace DB → restart
│   │       └── scheduler.ts          # setInterval hourly backup
│   │
│   ├── preload/
│   │   └── index.ts                   # contextBridge — exposes typed window.api
│   │
│   └── renderer/                      # React app (Vite)
│       ├── index.html                 # Sets lang="ar" dir="rtl"
│       ├── main.tsx                   # ReactDOM.createRoot
│       ├── App.tsx                    # Root: sidebar + topbar + screen switcher
│       ├── tokens.ts                  # All CSS custom properties as JS constants (P object)
│       ├── types.ts                   # Shared TypeScript interfaces
│       │
│       ├── components/                # Shared UI (ported from prototype verbatim)
│       │   ├── Modal.tsx
│       │   ├── Field.tsx
│       │   ├── Inp.tsx
│       │   ├── Sel.tsx
│       │   ├── Btn.tsx
│       │   ├── Toggle.tsx
│       │   ├── Card.tsx
│       │   ├── TabBar.tsx
│       │   ├── Badge.tsx
│       │   ├── Icon.tsx               # SVG path icons (IC map from prototype)
│       │   ├── Toast.tsx              # ToastHost + toast() function
│       │   ├── ProductImage.tsx
│       │   ├── ImagePicker.tsx
│       │   └── VariationModal.tsx
│       │
│       ├── layout/
│       │   ├── Sidebar.tsx            # Right-side nav, role-filtered
│       │   ├── Topbar.tsx             # Module title, date, role badge
│       │   └── MobileNav.tsx          # Bottom nav for small screens
│       │
│       ├── screens/
│       │   ├── POS/
│       │   │   ├── POSScreen.tsx
│       │   │   ├── OrderPanel.tsx
│       │   │   ├── ItemGrid.tsx
│       │   │   ├── CategoryPills.tsx
│       │   │   ├── DiscountPanel.tsx
│       │   │   ├── PaymentFlow.tsx
│       │   │   ├── ReceiptScreen.tsx
│       │   │   ├── HeldOrdersModal.tsx
│       │   │   └── VoidModal.tsx
│       │   ├── Menu/
│       │   │   ├── MenuScreen.tsx
│       │   │   ├── ItemsTab.tsx
│       │   │   ├── CategoriesTab.tsx
│       │   │   ├── VariationsTab.tsx
│       │   │   ├── ModifiersTab.tsx
│       │   │   └── ItemForm.tsx
│       │   ├── Inventory/
│       │   │   ├── InventoryScreen.tsx
│       │   │   ├── StockTab.tsx
│       │   │   ├── RecipesTab.tsx
│       │   │   ├── SuppliersTab.tsx
│       │   │   └── AdjustModal.tsx
│       │   ├── Customers/
│       │   │   ├── CustomersScreen.tsx
│       │   │   ├── CustomerCard.tsx
│       │   │   └── RedeemModal.tsx
│       │   ├── Cash/
│       │   │   ├── CashScreen.tsx
│       │   │   ├── FloatPanel.tsx
│       │   │   ├── ReconcilePanel.tsx
│       │   │   ├── PettyCashTab.tsx
│       │   │   └── ExpensesTab.tsx
│       │   ├── Reports/
│       │   │   ├── ReportsScreen.tsx
│       │   │   ├── SalesTab.tsx
│       │   │   ├── ItemsTab.tsx
│       │   │   ├── PaymentsTab.tsx
│       │   │   └── AuditTab.tsx
│       │   ├── Shifts/
│       │   │   ├── ShiftsScreen.tsx
│       │   │   ├── ShiftControls.tsx
│       │   │   ├── ClockLog.tsx
│       │   │   ├── EmployeeList.tsx
│       │   │   ├── PermissionsMatrix.tsx
│       │   │   └── ActionLog.tsx
│       │   └── Settings/
│       │       ├── SettingsScreen.tsx
│       │       ├── RestaurantTab.tsx
│       │       ├── BanksTab.tsx
│       │       ├── PrintersTab.tsx
│       │       ├── BackupTab.tsx
│       │       └── SystemTab.tsx
│       │
│       └── hooks/
│           ├── useDb.ts               # Typed wrappers around window.api IPC calls
│           ├── useSession.ts          # Current employee, role, shift
│           └── useSettings.ts         # Reactive settings from DB
│
├── assets/
│   ├── fonts/
│   │   └── Tajawal-*.woff2            # All Tajawal weights, bundled
│   └── icons/
│       └── momo.ico / momo.icns       # App icon
│
└── resources/
    └── db/
        └── .gitkeep                   # SQLite DB created here at runtime
```

---

## 5. Database Schema

Complete SQL schema. Run via migration `001_initial.sql`.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────
-- MENU
-- ─────────────────────────────────────────────

CREATE TABLE categories (
  id         TEXT PRIMARY KEY,          -- e.g. 'sig', 'cake', 'hot-coffee'
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#a855f7',
  parent_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE variation_groups (
  id    TEXT PRIMARY KEY,               -- e.g. 'size', 'flavor'
  name  TEXT NOT NULL,
  type  TEXT NOT NULL CHECK(type IN ('single','multi'))
);

CREATE TABLE variation_options (
  id         TEXT PRIMARY KEY,
  group_id   TEXT NOT NULL REFERENCES variation_groups(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price_adj  INTEGER NOT NULL DEFAULT 0  -- adjustment in SDG piastres (× 100 if needed)
);

CREATE TABLE items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  description      TEXT,
  price            INTEGER NOT NULL,    -- in SDG
  cost             INTEGER,             -- in SDG, for margin calc
  cat_id           TEXT REFERENCES categories(id),
  subcat_id        TEXT REFERENCES categories(id),
  emoji            TEXT DEFAULT '🍮',
  image_path       TEXT,               -- relative path in userData/images/
  available        INTEGER NOT NULL DEFAULT 1,  -- 0 = hidden from POS
  barcode          TEXT,               -- for inventory barcode scanner
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE item_variation_groups (
  item_id   INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  group_id  TEXT NOT NULL REFERENCES variation_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, group_id)
);

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────

CREATE TABLE orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_num    INTEGER NOT NULL,        -- sequential display number
  subtotal     INTEGER NOT NULL,
  disc_amount  INTEGER NOT NULL DEFAULT 0,
  disc_reason  TEXT,
  disc_type    TEXT CHECK(disc_type IN ('pct','amt')),
  disc_value   INTEGER,
  total        INTEGER NOT NULL,
  pay_mode     TEXT NOT NULL CHECK(pay_mode IN ('cash','bank','split')),
  bank_name    TEXT,                    -- from settings bank list
  bank_ref     TEXT,
  cash_in      INTEGER,                -- tendered amount
  cash_change  INTEGER,
  cash_part    INTEGER,                -- split: cash portion
  bank_part    INTEGER,                -- split: bank portion
  customer_id  INTEGER REFERENCES customers(id),
  employee_id  INTEGER REFERENCES employees(id),
  shift_id     INTEGER REFERENCES shifts(id),
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_shift ON orders(shift_id);

CREATE TABLE order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id          INTEGER NOT NULL REFERENCES items(id),
  qty              INTEGER NOT NULL DEFAULT 1,
  unit_price       INTEGER NOT NULL,   -- price at time of sale (incl. variation adj)
  variation_label  TEXT,               -- human-readable summary, e.g. "كبير، شوفان"
  selections       TEXT,               -- JSON: {groupId: optionId | optionId[]}
  note             TEXT
);

-- ─────────────────────────────────────────────
-- INVENTORY
-- ─────────────────────────────────────────────

CREATE TABLE ingredients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'g',  -- g, kg, ml, l, pcs
  stock         REAL NOT NULL DEFAULT 0,
  low_threshold REAL NOT NULL DEFAULT 0,
  cost_per_unit REAL,                  -- cost in SDG per unit, for COGS
  barcode       TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE recipes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id        INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity       REAL NOT NULL,        -- per 1 unit of the item
  UNIQUE(item_id, ingredient_id)
);

CREATE TABLE stock_adjustments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id),
  quantity       REAL NOT NULL,        -- positive = add, negative = deduct
  type           TEXT NOT NULL CHECK(type IN ('add','remove','waste','sale')),
  reason         TEXT,
  employee_id    INTEGER REFERENCES employees(id),
  order_id       INTEGER REFERENCES orders(id),  -- set when type='sale'
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_stock_adj_ingredient ON stock_adjustments(ingredient_id);

-- ─────────────────────────────────────────────
-- SUPPLIERS
-- ─────────────────────────────────────────────

CREATE TABLE suppliers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT,
  notes      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE supplier_ingredients (
  supplier_id    INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price_per_unit REAL,                 -- supplier's price in SDG
  PRIMARY KEY (supplier_id, ingredient_id)
);

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────

CREATE TABLE customers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  phone         TEXT UNIQUE,
  notes         TEXT,
  birthday      TEXT,                  -- MM-DD format for annual alert
  is_vip        INTEGER NOT NULL DEFAULT 0,
  is_blacklist  INTEGER NOT NULL DEFAULT 0,
  points        INTEGER NOT NULL DEFAULT 0,
  total_spend   INTEGER NOT NULL DEFAULT 0,
  visit_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_customers_phone ON customers(phone);

-- ─────────────────────────────────────────────
-- EMPLOYEES & SESSIONS
-- ─────────────────────────────────────────────

CREATE TABLE employees (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK(role IN ('admin','manager','cashier','kitchen')),
  pin_hash   TEXT NOT NULL,            -- bcrypt hash, never store plain PIN
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE shifts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id  INTEGER NOT NULL REFERENCES employees(id),
  opened_at    TEXT DEFAULT (datetime('now')),
  closed_at    TEXT,
  open_float   INTEGER NOT NULL DEFAULT 0,
  close_float  INTEGER,
  total_orders INTEGER,
  total_revenue INTEGER
);

CREATE TABLE clock_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id  INTEGER NOT NULL REFERENCES employees(id),
  shift_id     INTEGER REFERENCES shifts(id),
  type         TEXT NOT NULL CHECK(type IN ('in','out')),
  created_at   TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- CASH & ACCOUNTING
-- ─────────────────────────────────────────────

CREATE TABLE petty_cash (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL CHECK(type IN ('in','out')),
  amount      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  shift_id    INTEGER REFERENCES shifts(id),
  employee_id INTEGER REFERENCES employees(id),
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      INTEGER NOT NULL,
  category    TEXT NOT NULL,           -- e.g. 'مشتريات', 'فواتير', 'صيانة'
  note        TEXT,
  shift_id    INTEGER REFERENCES shifts(id),
  employee_id INTEGER REFERENCES employees(id),
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- AUDIT LOG (IMMUTABLE)
-- ─────────────────────────────────────────────

CREATE TABLE action_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  action      TEXT NOT NULL,           -- e.g. 'ORDER_CONFIRM', 'VOID', 'DISCOUNT'
  detail      TEXT,                    -- JSON with context
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_action_log_created ON action_log(created_at);

-- ─────────────────────────────────────────────
-- SETTINGS (key-value store)
-- ─────────────────────────────────────────────

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Default settings inserted by seed.ts:
-- restaurant_name, receipt_header, receipt_footer, logo_path,
-- banks (JSON array), printer1_port, printer2_port,
-- loyalty_rate (SDG per point), loyalty_redemption_value,
-- cashier_max_discount_pct, manager_max_discount_pct,
-- backup_schedule ('hourly'|'shift'|'daily'), backup_usb_path,
-- app_version, currency ('SDG')
```

---

## 6. IPC Bridge Contract

All communication between renderer and main process goes through `window.api`.
Defined in `src/preload/index.ts` via `contextBridge.exposeInMainWorld`.

### Type definitions (`src/renderer/types.ts` excerpt)

```typescript
// Every IPC call returns: { data: T } | { error: string }
// Renderer always checks for error before using data.

export interface Item {
  id: number; name: string; description?: string;
  price: number; cost?: number; catId: string; subcatId?: string;
  emoji: string; imagePath?: string; available: boolean;
  variationGroups: string[];
}

export interface Order {
  id: number; orderNum: number; subtotal: number;
  discAmount: number; discReason?: string; total: number;
  payMode: 'cash' | 'bank' | 'split';
  bankName?: string; bankRef?: string;
  cashIn?: number; cashChange?: number;
  cashPart?: number; bankPart?: number;
  customerId?: number; employeeId?: number; shiftId?: number;
  items: OrderItem[]; createdAt: string;
}

export interface OrderItem {
  itemId: number; name: string; qty: number; unitPrice: number;
  variationLabel?: string; selections?: Record<string, string | string[]>;
  note?: string;
}
```

### IPC channel map

```typescript
// window.api exposes these methods (all async, all typed):

// ── Items ──────────────────────────────────────────────────────────
window.api.items.list(): Promise<Item[]>
window.api.items.create(data: Omit<Item,'id'>): Promise<Item>
window.api.items.update(id: number, data: Partial<Item>): Promise<Item>
window.api.items.delete(id: number): Promise<void>
window.api.items.setAvailable(id: number, available: boolean): Promise<void>
window.api.items.saveImage(itemId: number, base64: string): Promise<string> // returns path

// ── Categories ─────────────────────────────────────────────────────
window.api.categories.list(): Promise<Category[]>
window.api.categories.create(data: Omit<Category,'id'>): Promise<Category>
window.api.categories.update(id: string, data: Partial<Category>): Promise<Category>
window.api.categories.delete(id: string): Promise<void>

// ── Variation Groups ───────────────────────────────────────────────
window.api.variations.listGroups(): Promise<VariationGroup[]>
window.api.variations.createGroup(data): Promise<VariationGroup>
window.api.variations.updateGroup(id: string, data): Promise<VariationGroup>
window.api.variations.deleteGroup(id: string): Promise<void>
window.api.variations.addOption(groupId: string, option): Promise<VariationOption>
window.api.variations.updateOption(id: string, option): Promise<VariationOption>
window.api.variations.deleteOption(id: string): Promise<void>

// ── Orders ─────────────────────────────────────────────────────────
window.api.orders.create(order: CreateOrderInput): Promise<Order>
  // CreateOrderInput includes items[], payment details, customerId?, employeeId, shiftId
  // Main process: writes order + order_items, deducts recipe stock, logs to action_log
window.api.orders.list(filters: OrderFilters): Promise<Order[]>
  // filters: { startDate?, endDate?, shiftId?, employeeId?, payMode? }
window.api.orders.get(id: number): Promise<Order>

// ── Inventory ──────────────────────────────────────────────────────
window.api.inventory.listIngredients(): Promise<Ingredient[]>
window.api.inventory.createIngredient(data): Promise<Ingredient>
window.api.inventory.updateIngredient(id: number, data): Promise<Ingredient>
window.api.inventory.deleteIngredient(id: number): Promise<void>
window.api.inventory.adjust(ingredientId: number, qty: number, type: string, reason: string): Promise<void>
window.api.inventory.getRecipe(itemId: number): Promise<RecipeLine[]>
window.api.inventory.saveRecipe(itemId: number, lines: RecipeLine[]): Promise<void>
window.api.inventory.listSuppliers(): Promise<Supplier[]>
window.api.inventory.createSupplier(data): Promise<Supplier>
window.api.inventory.linkSupplierIngredient(supplierId, ingredientId, price): Promise<void>
window.api.inventory.getLowStock(): Promise<Ingredient[]>

// ── Customers ──────────────────────────────────────────────────────
window.api.customers.list(search?: string): Promise<Customer[]>
window.api.customers.get(id: number): Promise<Customer>
window.api.customers.findByPhone(phone: string): Promise<Customer | null>
window.api.customers.create(data): Promise<Customer>
window.api.customers.update(id: number, data): Promise<Customer>
window.api.customers.addPoints(id: number, orderId: number, amount: number): Promise<void>
  // Calculates points from settings.loyalty_rate, credits to customer
window.api.customers.redeemPoints(id: number, points: number): Promise<number>
  // Returns SDG discount amount based on settings.loyalty_redemption_value

// ── Employees & Sessions ───────────────────────────────────────────
window.api.employees.list(): Promise<Employee[]>
window.api.employees.create(data: {name, role, pin}): Promise<Employee>
  // Hashes PIN with bcrypt before storing
window.api.employees.update(id: number, data): Promise<Employee>
window.api.employees.delete(id: number): Promise<void>
window.api.employees.verifyPin(id: number, pin: string): Promise<boolean>
  // bcrypt compare — never returns the hash

// ── Shifts ─────────────────────────────────────────────────────────
window.api.shifts.open(employeeId: number, openFloat: number): Promise<Shift>
window.api.shifts.close(shiftId: number, closeFloat: number): Promise<Shift>
window.api.shifts.getCurrent(): Promise<Shift | null>
window.api.shifts.list(): Promise<Shift[]>
window.api.shifts.clockIn(employeeId: number, shiftId: number): Promise<void>
window.api.shifts.clockOut(employeeId: number, shiftId: number): Promise<void>
window.api.shifts.getClockLog(shiftId: number): Promise<ClockEntry[]>

// ── Cash & Accounting ──────────────────────────────────────────────
window.api.cash.getRevenueSummary(shiftId?: number): Promise<RevenueSummary>
  // Returns: total, byCash, byBank, byBankName{bankName: amount}, byShift
window.api.cash.logPettyCash(type, amount, reason, shiftId, employeeId): Promise<void>
window.api.cash.listPettyCash(shiftId?: number): Promise<PettyCashEntry[]>
window.api.cash.logExpense(amount, category, note, shiftId, employeeId): Promise<void>
window.api.cash.listExpenses(shiftId?: number): Promise<Expense[]>
window.api.cash.getCogs(startDate: string, endDate: string): Promise<number>

// ── Reports ────────────────────────────────────────────────────────
window.api.reports.getSalesSummary(start, end): Promise<SalesSummary>
  // Returns: totalRevenue, orderCount, avgCheck, hourlyBuckets[24]
window.api.reports.getTopItems(start, end, limit?: number): Promise<ItemStat[]>
window.api.reports.getBottomItems(start, end, limit?: number): Promise<ItemStat[]>
window.api.reports.getPaymentBreakdown(start, end): Promise<PaymentBreakdown>
window.api.reports.getDiscountLog(start, end): Promise<DiscountEntry[]>
window.api.reports.getVoidLog(start, end): Promise<VoidEntry[]>
window.api.reports.getStockMovement(start, end): Promise<StockMovement[]>
window.api.reports.getStaffPerformance(start, end): Promise<StaffStat[]>
window.api.reports.exportCsv(type, start, end): Promise<string> // returns file path on USB

// ── Settings ───────────────────────────────────────────────────────
window.api.settings.get(key: string): Promise<string | null>
window.api.settings.set(key: string, value: string): Promise<void>
window.api.settings.getAll(): Promise<Record<string, string>>
window.api.settings.getBanks(): Promise<string[]>
window.api.settings.setBanks(banks: string[]): Promise<void>

// ── Print ──────────────────────────────────────────────────────────
window.api.print.cashierReceipt(order: Order): Promise<void>
window.api.print.kitchenTicket(order: Order): Promise<void>
window.api.print.zReport(shiftId: number): Promise<void>
window.api.print.purchaseOrder(supplierId: number, lines: POLine[]): Promise<void>
window.api.print.testPrint(printerNum: 1 | 2): Promise<void>

// ── Backup ─────────────────────────────────────────────────────────
window.api.backup.now(): Promise<string>        // returns zip path
window.api.backup.restore(zipPath: string): Promise<void>
window.api.backup.getLastBackupTime(): Promise<string | null>
window.api.backup.listUsbPaths(): Promise<string[]>  // detect USB drives

// ── Action Log ─────────────────────────────────────────────────────
window.api.actionLog.list(filters): Promise<ActionEntry[]>
window.api.actionLog.write(action: string, detail: object): Promise<void>
```

---

## 7. RBAC — Roles & Permissions

Four roles, permission enforced in both the renderer (navigation filter) and the main
process (IPC handler guard). Never rely on the renderer alone for security.

| Screen / Action | admin | manager | cashier | kitchen |
|---|:---:|:---:|:---:|:---:|
| POS — create order | ✓ | ✓ | ✓ | — |
| POS — apply discount | ✓ | ✓ | up to cashier max% | — |
| POS — void order | ✓ | ✓ | manager PIN required | — |
| Menu management | ✓ | ✓ | — | — |
| Inventory | ✓ | ✓ | — | — |
| Customers | ✓ | ✓ | read-only | — |
| Cash & Accounting | ✓ | ✓ | own shift only | — |
| Reports | ✓ | ✓ | — | — |
| Shifts — open/close | ✓ | ✓ | own shift only | — |
| Shifts — employee management | ✓ | — | — | — |
| Shifts — permissions matrix | ✓ | — | — | — |
| Settings | ✓ | — | — | — |

### PIN login flow

1. App starts → shows employee selector screen (name + avatar, no PIN shown)
2. Employee selects their card → PIN input modal appears
3. Renderer calls `window.api.employees.verifyPin(id, pin)` → main process bcrypt compare
4. On success: role loaded into session context, nav filtered, app opens to POS
5. Session stored in memory only — never in localStorage or DB
6. On screen lock / inactivity timeout: return to employee selector

### Manager PIN override

Used for: void order, discount above cashier max %, any admin-only action triggered by cashier.

1. Cashier initiates action (e.g. void)
2. App shows manager PIN modal (does not log out cashier)
3. Manager enters their PIN → verifyPin called for any employee with role manager or admin
4. On success: action proceeds, action_log entry written with both cashier ID and authorizer ID
5. Cashier session resumes unchanged

---

## 8. Module Specifications

### Module 1 — نقطة البيع (POS)

#### Screen layout
The POS screen is split into two panels:
- **Right panel** (items grid) — category pills, subcategory pills, search bar, customer phone input, item card grid
- **Left panel** (order panel) — current order list, totals, discount section, payment flow

This is the **inverse of web convention** because the layout is RTL: the order panel is on the left
in screen coordinates but on the right side of the content flow in Arabic reading order.

#### Item card behavior
- Each card shows: image (if set) or emoji fallback, item name, price in SDG
- If `item.variationGroups.length > 0`: clicking opens `VariationModal` before adding to order
- If no variations: item is added directly to order with `qty: 1`
- Unavailable items (`available = false`) are not shown

#### Variation modal
- Groups rendered in the order defined in `item_variation_groups`
- `single` type groups: pill buttons (one active at a time), first option pre-selected
- `multi` type groups: toggle buttons (any number active)
- Price adjustment shown per option, running total shown at bottom
- Quantity stepper in modal (default 1)
- Special note field (optional, free text)
- "إضافة للطلب" adds the fully-configured entry to the order

#### Order line key
Each line in the order is keyed as `{itemId}_{variationLabel}`. This means:
- Same item with same variations: increments qty of existing line
- Same item with different variations: creates a separate line

#### Discount logic
- Discount panel is hidden until the "إضافة خصم" button is pressed
- Two sub-modes: percentage (0–100) or fixed amount (SDG)
- `disc_reason` is required — the confirm button is disabled until reason is non-empty
- `discAmt = discountType === 'pct' ? round(subtotal × discount / 100) : discount`
- `total = max(0, subtotal − discAmt)`
- If cashier's `discountValue > settings.cashier_max_discount_pct`: manager PIN required

#### Payment flow
- Three mode tabs: نقداً (cash) / بنكي (bank) / مقسم (split)
- Cash: `cashIn` field, `change = max(0, cashIn − total)` shown in green
- Bank: bank selector (populated from `settings.banks`), reference number field
- Split: cash portion field, `bankPart = total − cashPart` auto-calculated, bank selector
- Confirm button disabled until: mode selected, and for cash: `cashIn ≥ total`

#### Order confirmation
On confirm:
1. Write `orders` row + `order_items` rows to DB
2. For each order item: look up recipe, multiply quantities by `qty`, deduct from `ingredients.stock`
   via `stock_adjustments` row with `type = 'sale'` and `order_id` set
3. If customer attached: add loyalty points (`amount / settings.loyalty_rate`), increment `visit_count`,
   add to `total_spend`
4. Write `action_log` entry: `ORDER_CONFIRM`, detail includes order total and payment mode
5. Auto-print cashier receipt to Printer 1
6. Auto-print kitchen ticket to Printer 2
7. Show receipt confirmation screen
8. "طلب جديد" resets all state

#### Hold order
- "تعليق" saves `{id: timestamp, items: [...orderItems], time}` to component state array
- "استئناف (N)" button visible when held orders exist
- Held orders list modal: each entry shows item count, time, first few item names
- Resume: restores items to current order, removes from held list
- Held orders exist in memory only — not persisted to DB

#### Void order
- "إلغاء" disabled when order is empty
- Manager PIN modal: enter PIN, system verifies against any manager/admin employee
- On success: order cleared, `action_log` entry written: `ORDER_VOID`, reason and authorizer ID
- On fail: "رمز PIN خاطئ" toast, PIN field cleared

---

### Module 2 — إدارة القائمة (Menu Management)

Four tabs: الأصناف / التصنيفات / الخيارات / الإضافات

#### Items tab
- Filterable by category (pills above table)
- Table columns: image/emoji thumbnail (44×44 px), name + description, category badge + subcategory badge,
  variation group tags, price, margin % (color-coded: >55% green, >35% amber, else red), availability toggle
- Margin = `round((price − cost) / price × 100)` — shown as `—` if cost not set
- Add/edit form fields: emoji, name (required), price (required), cost, description,
  main category (select), subcategory (select, filtered by main category),
  image picker (URL or file upload), variation group multi-select (toggleable pills)
- Delete: removes item and all its `order_items` references (set null on FK) and recipe lines

#### Image picker
- Two modes: URL input or file upload
- File upload: `FileReader.readAsDataURL` → send base64 to main via `window.api.items.saveImage()`
  → main writes to `userData/images/{itemId}_{timestamp}.jpg` → returns relative path → stored in DB
- URL mode: URL stored directly (works for local file URLs; web URLs won't load offline)
- Preview shown with ×clear button

#### Categories tab
- Root categories grid: add with name + color picker, edit inline, delete (items reassigned to default)
- Subcategories grid: same as root but with parent selector shown as badge
- Color picker: native `<input type="color">` wrapped in the styled UI

#### Variation groups tab
- Read-only display of all groups with their options and price adjustments
- Add group: name, type (single/multi), then add options one by one
- Each option: name + price adjustment (default 0)
- Delete group: removes all `item_variation_groups` links

#### Modifiers tab
- Same data structure as variation groups but semantically used for additions/removals
- Displayed and managed identically

---

### Module 3 — المخزون (Inventory)

Four tabs: المخزون / الوصفات / الموردون / طلبات الشراء

#### Stock tab
- Ingredients table: name, unit, current stock (colored: red if ≤ threshold, amber if ≤ 2×, green otherwise),
  low threshold, last adjustment time
- Low-stock alert banner at top if any ingredients below threshold
- Barcode scanner: if the stock tab is active and a barcode is scanned (USB HID keyboard input),
  the system searches `ingredients.barcode`, selects that row, and opens the adjust modal
- Adjust modal: three type buttons (إضافة / خصم / هدر), quantity input, reason text (required for remove/waste)

#### Recipes tab
- Item selector: dropdown of all menu items
- For selected item: ingredient lines (ingredient name, quantity, unit), add line, delete line
- "Auto-deduct on sale" note shown — this is handled by the order confirmation IPC handler

#### Suppliers tab
- Supplier cards: name, phone, notes, linked ingredients with price per unit
- Add supplier form
- Link ingredient to supplier: ingredient select + price input

#### Purchase orders tab
- Select supplier → shows their linked ingredients with current stock and low threshold
- Tick ingredients to order, enter quantity
- "Print" → sends formatted PO to Printer 1

---

### Module 4 — العملاء (Customers & Loyalty)

#### Customer list
- Search by name or phone (live filter)
- Customer cards: name, phone, VIP badge (gold star icon), blacklist badge (red warning)
- Click opens customer profile panel

#### Customer profile
- Fields: name, phone, notes, birthday (MM-DD)
- Stats: visit count, total spend, points balance
- VIP toggle, blacklist toggle
- Visit history: last 10 orders with date and total
- Loyalty: current points, "استبدال نقاط" button opens redeem modal

#### Redeem modal
- Shows: points balance, redemption rate (from settings), SDG value of their points
- Input: how many points to redeem (max = their balance)
- Applies as a discount when the customer is attached at POS

#### Birthday alert
- At POS, when customer phone is entered and a matching customer is found:
  - If today's MM-DD matches `customer.birthday`: show birthday alert toast
  - "عيد ميلاد سعيد! 🎂 يمكنك تطبيق خصم خاص" — cashier applies discount manually

---

### Module 5 — الصندوق (Cash & Accounting)

Four tabs: الفتح والإغلاق / الدرج / المصروفات / التسوية

#### Opening float tab
- When shift is opened, cashier enters the starting cash amount
- This is `shifts.open_float`, used in EOD reconciliation

#### Petty cash tab
- Running log of in/out cash movements (not order revenue)
- Add entry: type (in/out), amount, reason (required)
- Running balance displayed

#### Expenses tab
- Log non-petty-cash expenses: amount, category select, note
- Categories: مشتريات / فواتير / صيانة / رواتب / أخرى (configurable in settings)

#### EOD reconciliation tab
- Summary cards: total orders, total revenue (from DB), breakdown by payment type + bank name
- "المبلغ المعدود" field: cashier physically counts cash and enters it
- Expected cash = `sum of cash orders + cash_part of split orders − petty cash out + petty cash in`
- Difference shown in green (surplus) or red (shortage)
- "إغلاق الوردية" → writes `shifts.close_float = entered amount`, sets `shifts.closed_at`,
  auto-triggers Z-report print to Printer 1

---

### Module 6 — التقارير (Reports)

Four tabs: المبيعات / الأصناف / المدفوعات / المخالفات

#### Date range selector
- Quick: اليوم / هذا الأسبوع / هذا الشهر
- Custom: two date pickers (Arabic locale, Gregorian calendar)
- All queries use `ORDER.created_at BETWEEN :start AND :end`

#### Sales tab
- KPI cards: إجمالي المبيعات (SDG), عدد الطلبات, متوسط الطلب
- Hourly heatmap: 24 columns (0–23h), each column's height proportional to revenue in that hour
  — rendered as pure CSS/HTML bars, no charting library needed
- Data query: `SELECT strftime('%H', created_at) as hour, SUM(total) FROM orders GROUP BY hour`

#### Items tab
- Top-selling items (by quantity): ranked list, item name, qty sold, revenue
- Bottom-selling items: same, sorted ascending
- "الأصناف غير المباعة" count shown

#### Payments tab
- Bar chart: cash vs. bank vs. split totals (pure CSS flex bars)
- Per-bank breakdown table: bank name, order count, total SDG

#### Discounts & voids tab (audit log)
- Table: order #, type (discount/void), amount, reason, employee name, timestamp
- Totals: total discounted, total voided
- This data is sourced from `action_log` + joining `orders`

#### Export
- Any tab: "تصدير CSV" → writes a CSV file to USB drive path (from settings)
- Any tab: "طباعة" → formats the visible data and sends to Printer 1 as text

---

### Module 7 — الورديات (Shifts & RBAC)

Four tabs: الوردية الحالية / سجل التوقيت / الموظفون / صلاحيات الأدوار

#### Shift controls tab
- If no active shift: "فتح وردية" button → opens float entry modal → creates shift
- If active shift: shift info (employee, opened at, current revenue) + "إغلاق الوردية" button
- Close shift triggers reconciliation flow (see Cash module)

#### Clock log tab
- Table of clock-in / clock-out entries for the current shift
- "تسجيل الدخول" / "تسجيل الخروج" buttons per employee
- Total hours per employee per shift shown

#### Employees tab
- Employee cards: name, role badge (color-coded), active toggle
- Add employee form: name, role select, PIN input (min 4 digits), confirm PIN
- Edit employee: same form pre-filled (PIN field shows placeholder, new PIN optional)
- Delete: only if employee has no orders or shifts (soft-delete: set active = 0)

#### Role permissions matrix tab
- Read-only matrix showing which screens each role can access
- Matches the logic in `Sidebar.tsx` (filtering allowed nav items by role)
- Admin can adjust `cashier_max_discount_pct` and `manager_max_discount_pct` here

#### Action log tab
- Full audit trail: timestamp, employee name, action type, detail
- Filterable by employee and date range
- Not editable, not deletable — append-only

---

### Module 8 — الإعدادات (Settings)

Five tabs: المطعم / البنوك / الطابعات / النسخ الاحتياطي / النظام

#### Restaurant tab
- Fields: restaurant name, logo (file upload → stored in userData), receipt header (2 lines),
  receipt footer (e.g. "شكراً لزيارتكم · موموـ")
- "حفظ" → writes to settings table, shows ✓ feedback
- Receipt template section: toggles for which fields appear on printed receipt

#### Banks tab
- List of configured banks (from `settings.banks` JSON array)
- Each entry: bank name, edit button, disable button
- "إضافة بنك" field + button
- These bank names are what appear in the POS payment selector
- Disabling a bank removes it from the POS selector but preserves historical order data

#### Printers tab
- Printer 1 card: label "طابعة الكاشير", port field (e.g. `USB001` or `COM3`), "اختبار" button
- Printer 2 card: label "طابعة المطبخ", port field, "اختبار" button
- Test print sends a minimal ESC/POS test page with the printer number and timestamp

#### Backup tab
- Schedule selector: كل ساعة / نهاية الوردية / يومياً
- USB path: auto-detected removable drives listed, user selects one
- "نسخ الآن" → immediate backup, shows progress toast, confirms with file path
- "استعادة من ملف" → file picker (`.zip`), confirmation modal, app restarts after restore
- "آخر نسخة احتياطية" timestamp shown

#### System tab
- Read-only info: app version, DB file size, images folder size, device name, currency (SDG), last backup
- **Danger zone**: "إعادة ضبط المصنع" — double-confirm modal with red warning
  - Wipes all tables, re-runs seed, clears images folder
  - Intended for when the system needs to start fresh at a new location

---

## 9. Implementation Phases

### Phase 0 — Project Foundation (Week 1)

**Goal**: Runnable Electron + React app with correct RTL layout and all shared components.

**Tasks**:
- [ ] Scaffold with `electron-forge` using the Vite + TypeScript template
- [ ] Configure `electron.vite.config.ts` for renderer and main entry points
- [ ] Set `lang="ar" dir="rtl"` on the root `<html>` element in `index.html`
- [ ] Bundle Tajawal font (all weights: 300, 400, 500, 700, 800, 900) in `assets/fonts/`
  and declare via `@font-face` in global CSS — **do not use Google Fonts CDN**
- [ ] Port the design tokens `P` object from prototype to `src/renderer/tokens.ts`
  (exact hex values: `--bg: #fdf7ff`, `--purple: #9333ea`, `--pink: #db2777`, etc.)
- [ ] Create `src/renderer/index.html` with all CSS custom properties on `:root`
- [ ] Port all shared components from the prototype, one file each:
  - `Modal.tsx` (backdrop blur overlay, close button, title + icon)
  - `Field.tsx` (label, required indicator, hint)
  - `Inp.tsx` (styled text input, focus/blur border color)
  - `Sel.tsx` (styled select)
  - `Btn.tsx` (7 variants: primary, secondary, ghost, danger, pink, success, gold)
  - `Toggle.tsx` (animated pill toggle)
  - `Card.tsx` (hover lift, border, shadow)
  - `TabBar.tsx` (segment control)
  - `Badge.tsx` (pill label)
  - `Icon.tsx` (SVG path renderer, IC map with all 40+ icons from prototype)
  - `Toast.tsx` (fixed position, slide-in animation, 2.6 s auto-dismiss)
- [ ] Build app shell in `App.tsx`:
  - Sidebar on the right (CSS: `flex-direction: row`, sidebar last child)
  - Topbar with module name, date (Arabic locale), role badge, offline indicator
  - Content area fills remaining width
  - Mobile bottom nav (hidden above 640 px)
- [ ] Implement dummy screen switcher (enum state, no DB yet)
- [ ] Confirm: app launches, RTL renders correctly, all shared components render without errors

**Deliverable**: `npm run dev` opens a desktop window with correct layout, RTL, Tajawal font,
and all shared components visible in a component playground screen.

---

### Phase 1 — Database Layer (Week 2)

**Goal**: SQLite connected, all tables created, repositories implemented, IPC bridge live.

**Tasks**:
- [ ] Install `better-sqlite3` and `@types/better-sqlite3`
- [ ] Create `src/main/db/connection.ts`:
  - Open DB at `app.getPath('userData') + '/momo.db'`
  - `PRAGMA journal_mode = WAL`
  - `PRAGMA foreign_keys = ON`
- [ ] Write migration runner `src/main/db/migrations/runner.ts`:
  - Reads all `.sql` files in `migrations/` alphabetically
  - Tracks applied migrations in a `_migrations` table
  - Runs pending migrations on every app startup
- [ ] Write `001_initial.sql` with the full schema from Section 5
- [ ] Write `src/main/db/seed.ts`:
  - Inserts all data from `momo-data.js` (16 items, 11 categories, 6 variation groups)
  - Inserts default banks: بنك الخرطوم, بنك فيصل الإسلامي, مصرف البركة, بنك أمدرمان
  - Inserts default settings (receipt header, loyalty rate, etc.)
  - Inserts one default admin employee: name "مدير", role "admin", PIN "1234" (bcrypt hash)
  - Only runs if `employees` table is empty (first launch guard)
- [ ] Implement all repository classes (see Section 5 for method contracts)
- [ ] Create `src/preload/index.ts` — `contextBridge.exposeInMainWorld('api', {...})`
- [ ] Register all IPC handlers in `src/main/ipc/register.ts`
- [ ] Create `src/renderer/hooks/useDb.ts` — typed async wrappers with error handling
- [ ] Write a simple DB inspector screen (admin-only) to verify data is seeded correctly

**Deliverable**: `window.api.items.list()` returns the 16 seeded items in the renderer.
All IPC channels respond. Migration runner logs applied migrations on startup.

---

### Phase 2 — POS Module (Weeks 3–4)

**Goal**: End-to-end order flow working — add items, configure variations, pay, print.

**Tasks**:

*Item grid:*
- [ ] `ItemGrid.tsx`: fetch items and categories via `useDb`, render item cards in CSS grid
- [ ] `CategoryPills.tsx`: root category pills + subcategory pills (conditional on parent selection)
- [ ] Search bar: `useMemo` filter on `item.name.includes(search)` — no DB call per keystroke
- [ ] Customer phone input: calls `window.api.customers.findByPhone` on input change with 300 ms debounce
- [ ] Birthday alert: if customer found and `today's MM-DD === customer.birthday`, show toast

*Variation modal:*
- [ ] Port `VariationModal.tsx` from prototype exactly
- [ ] Replace `VARIATION_GROUPS` global with `window.api.variations.listGroups()` result
- [ ] Price adjustment calculation: same logic as prototype
- [ ] On confirm: call `addToOrder()` with fully-built `OrderItem` object

*Order panel:*
- [ ] `OrderPanel.tsx`: order list, subtotal, discount, total, payment buttons
- [ ] `DiscountPanel.tsx`: type toggle, value input, reason field — disabled confirm until reason filled
- [ ] Cashier max discount check: if `discountValue > settings.cashier_max_discount_pct`, trigger
  manager PIN modal before allowing
- [ ] Hold/resume: state managed in `POSScreen` component, not persisted
- [ ] `VoidModal.tsx`: PIN input, calls `window.api.employees.verifyPin`, clears order on success

*Payment flow:*
- [ ] `PaymentFlow.tsx`: 3-tab mode selector
- [ ] Cash mode: `cashIn` input, change calculation, confirm disabled if `cashIn < total`
- [ ] Bank mode: bank selector from `window.api.settings.getBanks()`, ref input
- [ ] Split mode: cash portion input, bank portion auto, bank selector
- [ ] Confirm button: calls `window.api.orders.create(...)` with full order payload

*Order confirmation:*
- [ ] `ReceiptScreen.tsx`: port from prototype exactly
- [ ] "إيصال كاشير" button: calls `window.api.print.cashierReceipt(order)`
- [ ] "تذكرة مطبخ" button: calls `window.api.print.kitchenTicket(order)`
- [ ] Auto-print both on confirmation (not just on button press — print is automatic,
  buttons are for re-print)
- [ ] "طلب جديد" resets all state

**Deliverable**: Full order flow: select items → configure variations → apply discount →
pay with any mode → confirmation screen → re-print buttons work. Order saved to DB.
Stock deducted via recipes. Customer points credited if customer attached.

---

### Phase 3 — Menu Management (Weeks 4–5)

**Goal**: Full CRUD for items (with images), categories, variation groups, modifiers.

**Tasks**:
- [ ] `ItemsTab.tsx`: table with all columns, filter pills, inline availability toggle
- [ ] `ItemForm.tsx`: shared add/edit modal — all fields including image picker and variation
  group multi-select
- [ ] `ImagePicker.tsx`: port from prototype — file upload saves via `window.api.items.saveImage()`,
  URL mode stores as-is
- [ ] `CategoriesTab.tsx`: root and subcategory grids, add/edit/delete modals
- [ ] `VariationsTab.tsx`: display groups + options, add/edit/delete flow
- [ ] `ModifiersTab.tsx`: same structure as variations tab
- [ ] Availability toggle: calls `window.api.items.setAvailable()`, change reflected immediately
  in POS (POS fetches items on mount, toggle triggers re-fetch via event or shared state)

**Deliverable**: Admin can add a new dessert with a photo, assign it to a subcategory,
attach variation groups, set cost and price. Item appears in POS immediately.

---

### Phase 4 — Inventory (Weeks 5–6)

**Tasks**:
- [ ] `StockTab.tsx`: ingredients table, low-stock banner (query `window.api.inventory.getLowStock()`),
  barcode scan listener (global keydown handler active when this tab is open, reads scan as fast
  keyboard input terminated by Enter)
- [ ] `AdjustModal.tsx`: type selector (add/remove/waste), quantity, reason (required for remove/waste)
- [ ] `RecipesTab.tsx`: item selector, ingredient lines, quantity inputs, save via
  `window.api.inventory.saveRecipe()`
- [ ] `SuppliersTab.tsx`: supplier cards, link ingredient modal, price input
- [ ] `PurchaseOrderTab.tsx`: supplier select, ingredient checklist with quantity inputs, print button

**Deliverable**: Stock is deducted correctly when POS orders are placed.
Barcode scan opens adjust modal for correct ingredient. PO prints to Printer 1.

---

### Phase 5 — Customers & Loyalty (Week 6)

**Tasks**:
- [ ] `CustomersScreen.tsx`: search bar, customer list, add customer button
- [ ] `CustomerCard.tsx`: profile panel — all fields, stats, VIP/blacklist toggles, visit history
- [ ] `RedeemModal.tsx`: points balance, SDG conversion, points input, apply to next order
- [ ] Points calculation: on order confirm if `customerId` is set, call
  `window.api.customers.addPoints(id, orderId, orderTotal)`
  — main process: `newPoints = floor(total / settings.loyalty_rate)`, add to `customers.points`

**Deliverable**: Customer created, attached to POS order, points credited, redeemable as discount.

---

### Phase 6 — Cash & Accounting (Week 7)

**Tasks**:
- [ ] `FloatPanel.tsx`: opening float input on shift open (handled in Shifts module,
  but Cash module shows current float and running balance)
- [ ] `ReconcilePanel.tsx`: expected vs. counted, difference display, close shift button
- [ ] `PettyCashTab.tsx`: entry form, running log, running balance
- [ ] `ExpensesTab.tsx`: entry form with category select, log
- [ ] Revenue summary cards: query `window.api.cash.getRevenueSummary(currentShiftId)`
- [ ] COGS display: query `window.api.cash.getCogs(shiftStart, now)` — sums
  `ingredient.cost_per_unit × qty_deducted` from `stock_adjustments` where `type = 'sale'`
- [ ] CSV export: orders + petty cash + expenses written to USB

**Deliverable**: Cashier opens shift with float, manages petty cash, closes shift with Z-report.

---

### Phase 7 — Reports & Analytics (Weeks 7–8)

**Tasks**:
- [ ] Date range selector with quick tabs and custom date pickers
- [ ] `SalesTab.tsx`: KPI cards + hourly heatmap (24 CSS flex bars, no chart library)
- [ ] `ItemsTab.tsx` (reports version): top/bottom item ranked lists
- [ ] `PaymentsTab.tsx`: horizontal CSS flex bars for payment type breakdown,
  per-bank table
- [ ] `AuditTab.tsx`: discount + void log table, joined with employee names
- [ ] All queries: parameterized SQL via repository methods, passed to renderer via IPC
- [ ] Print tab: format current view as ESC/POS text, send to Printer 1
- [ ] Export tab: write current query results as CSV to USB

**Deliverable**: Owner/manager can see today's revenue, top items, and payment breakdown.
All reports filterable by date range. Export to USB works.

---

### Phase 8 — Shifts & RBAC (Week 8)

**Tasks**:
- [ ] Login screen: shown on app start and after lock — employee grid → PIN modal
- [ ] `ShiftControls.tsx`: open/close shift with float entry, current shift stats
- [ ] `ClockLog.tsx`: clock-in/out buttons and log
- [ ] `EmployeeList.tsx`: employee cards, add/edit (with PIN input), deactivate
- [ ] `PermissionsMatrix.tsx`: read-only table — matches `Sidebar.tsx` nav filter logic exactly
- [ ] `ActionLog.tsx`: full audit log with filters
- [ ] Session context: `useSession.ts` hook provides `{employee, role, shiftId}` to all screens
- [ ] RBAC enforcement in IPC handlers:
  - Each handler checks `session.role` (passed as part of every IPC call or stored in main process)
  - If insufficient role: return `{error: 'UNAUTHORIZED'}`
- [ ] Inactivity lock: `setInterval` checks last user interaction, after N minutes returns to
  employee selector (N configurable in settings)

**Deliverable**: App starts with PIN login. Role-appropriate navigation shown.
Void and high-discount actions require manager PIN without logging cashier out.

---

### Phase 9 — Settings Module (Week 9)

**Tasks**:
- [ ] `RestaurantTab.tsx`: name, logo, receipt header/footer — all persisted to settings table
- [ ] `BanksTab.tsx`: list from `settings.banks` JSON, add/disable/edit, saved via
  `window.api.settings.setBanks()`
- [ ] `PrintersTab.tsx`: port and test print per printer
- [ ] `BackupTab.tsx`: schedule selector, USB path selector (`window.api.backup.listUsbPaths()`),
  manual backup, restore from file picker
- [ ] `SystemTab.tsx`: read-only info, factory reset with double-confirm
- [ ] Factory reset: truncates all tables except `_migrations`, re-runs `seed.ts`, clears images folder,
  restarts app

**Deliverable**: Admin can configure banks, printer ports, and run a manual backup.
Receipt header appears on printed receipts.

---

### Phase 10 — Hardware Integration (Weeks 9–10)

#### Thermal printers

The most risk-prone phase. Do this in parallel with Phase 9, not after.

**Cashier receipt (Printer 1) format:**
```
[LOGO if set — bitmap print]
        موموـ
[receipt header line 1]
[receipt header line 2]
────────────────────────
طلب #123       14:35 م
────────────────────────
كريم بروليه × 2  2,400
  كبير، كريمة إضافية
لافا شوكولاتة × 1 1,400
────────────────────────
المجموع الفرعي   3,800
خصم (10%)         -380
الإجمالي         3,420
────────────────────────
نقداً           5,000
الباقي          1,580
[OR: تحويل بنكي
 بنك فيصل الإسلامي
 المرجع: TXN123456]
────────────────────────
[receipt footer]
```

**Kitchen ticket (Printer 2) format:**
```
══════ طلب #123 ══════
14:35 م

كريم بروليه × 2
  → كبير، كريمة إضافية
  → ملاحظة: بدون سكر

لافا شوكولاتة × 1
  → شوكولاتة
══════════════════════
```

**Arabic encoding strategy:**

Test this immediately with the target hardware:
1. Try `CharacterSet.PC864_ARABIC` in node-thermal-printer
2. Try `CharacterSet.PC720`
3. If neither works: render receipt as canvas (using `node-canvas` or `electron`'s Chromium), convert
   to monochrome bitmap, send as `printImage()` command — this always works regardless of printer
   firmware but is slower

**Tasks:**
- [ ] Install `node-thermal-printer`
- [ ] Create `src/main/print/printer.ts` wrapper:
  - `initPrinter(num: 1 | 2)` — loads port from settings, creates Printer instance
  - Caches printer instances, re-initializes on port change
- [ ] Implement all 4 print template files
- [ ] Arabic encoding test: print a test page with sample Arabic text on the actual printer
- [ ] If Unicode fails: implement bitmap fallback (render to Electron BrowserWindow offscreen,
  capture screenshot, convert to 1-bit, print via `printImageBuffer()`)
- [ ] Error handling: if printer throws, catch, log to action_log, show toast — never block
  the order confirmation

#### Barcode scanner

- [ ] USB HID barcode scanners send characters as keyboard events — no special driver needed
- [ ] In `StockTab.tsx`: add a hidden `<input>` that auto-focuses when tab is active
- [ ] Listen for rapid keystroke sequences ending in Enter (scan speed > 10 chars/100 ms)
- [ ] On scan: call `window.api.inventory.findByBarcode(code)` → auto-fill adjust modal

#### USB backup

- [ ] `window.api.backup.listUsbPaths()`: on Windows, list drive letters where `type = 'Removable'`
  via `wmic logicaldisk where drivetype=2 get caption` or the `drivelist` npm package
- [ ] `window.api.backup.now()`:
  1. Copy `userData/momo.db` to zip
  2. Copy `userData/images/` folder to zip
  3. Write zip as `momo_backup_{YYYY-MM-DD_HH-mm}.zip` to selected USB path
  4. Update `settings.last_backup_at`
- [ ] `window.api.backup.restore(zipPath)`:
  1. Show confirmation modal (data will be overwritten)
  2. Extract zip to a temp folder
  3. Copy `momo.db` to userData (replaces existing)
  4. Copy `images/` to userData
  5. Call `app.relaunch()` then `app.quit()`
- [ ] Scheduled backup: in `src/main/backup/scheduler.ts`, `setInterval` based on
  `settings.backup_schedule` value, calls `backup.now()` silently

---

### Phase 11 — QA & Hardening (Weeks 10–11)

**Tests to run manually (no test framework required for v1):**

| Test | Pass criteria |
|---|---|
| RTL layout audit | Every screen: text flows right-to-left, icons not mirrored where inappropriate, no overflow |
| Offline guarantee | Disconnect all network interfaces → every feature works identically |
| RBAC: cashier | Can only see POS screen, cannot apply discount above max%, void requires manager PIN |
| RBAC: manager | Cannot access Settings, can approve voids and discounts |
| RBAC: kitchen | (if used) sees only POS screen, cannot place orders |
| PIN lockout | After 5 failed PINs: account locked for 15 minutes |
| Stock deduction | Place 10 orders with recipes → verify ingredient stock decreased correctly |
| Stock deduction race | Place 2 orders simultaneously (two windows) → stock not double-counted |
| Printer offline | Unplug Printer 1 → order confirmation still works, toast shown, re-print available later |
| Large order | Order with 20 line items → receipt and kitchen ticket print correctly |
| Arabic in thermal | Test full receipt in Arabic on actual target printer hardware |
| Backup round-trip | Backup → factory reset → restore from USB → verify all orders, customers, items restored |
| Long-running DB | Insert 1,000 orders via seed script → all reports load in < 2 seconds |
| Image storage | Upload 50 product images (2 MB each) → verify app doesn't slow down, cleanup works |
| Birthday alert | Set customer birthday to today → attach to order → alert shown |
| Loyalty points | Place 10 orders with customer attached → verify points accumulated correctly |
| Points redemption | Redeem points → order total reduced → points balance decremented |
| Hold order | Hold 3 orders → place unrelated order → resume first held order → correct items |
| Split payment | Cash + bank transfer → Z-report shows both split correctly |
| Z-report accuracy | Manual spot-check: sum all cash orders = cash column in Z-report |
| Settings persistence | Change restaurant name → restart app → name still shown |
| Bank list | Add bank in Settings → verify it appears in POS bank selector |

**Performance targets:**
- App startup (cold): < 3 seconds
- POS screen load (after startup): < 200 ms
- Add item to order: < 100 ms (no DB call, in-memory)
- Order confirmation (DB write + stock deduction + print trigger): < 1 second
- Reports query (1,000 orders, 30-day range): < 2 seconds

**Security hardening:**
- [ ] All IPC handlers validate input types — never trust renderer data
- [ ] `PIN_hash` never sent to renderer — `verifyPin()` returns boolean only
- [ ] `action_log` table has no DELETE handler — append only
- [ ] Electron: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` in `webPreferences`
- [ ] No `shell.openExternal()` calls with user-provided URLs

---

### Phase 12 — Packaging & Delivery (Weeks 11–12)

**Tasks:**
- [ ] `electron-builder.config.ts`:
  - Target: `nsis` (Windows installer) + `portable` (no-install ZIP)
  - App ID: `com.momo.pos`
  - Product name: `موموـ POS`
  - Include `resources/db/` in extraResources (empty folder for DB creation)
- [ ] App icon: export the Momo spark logo (purple-pink gradient) to `256×256 ICO` and `1024×1024 ICNS`
- [ ] First-run setup wizard (shown when `employees` table is empty after seed check):
  - Screen 1: Welcome + restaurant name
  - Screen 2: Create first admin employee + set PIN
  - Screen 3: Printer port configuration + test print for each
  - Screen 4: Done — opens POS
- [ ] Auto-launch on Windows startup: `app.setLoginItemSettings({ openAtLogin: true })`
  (user can disable in Windows Startup settings)
- [ ] Manual update flow: user runs new installer on top of existing install — NSIS handles in-place
  upgrade, userData/momo.db is preserved, new migrations run on startup
- [ ] Print Arabic staff cheat sheet: one A4 page covering POS workflow, shift open/close,
  void procedure, backup procedure — print to Printer 1 from Settings > System tab
- [ ] On-site deployment checklist:
  - [ ] Install Windows app
  - [ ] Connect Printer 1 (cashier) via USB → configure port in Settings → test print
  - [ ] Connect Printer 2 (kitchen) via USB → configure port in Settings → test print
  - [ ] Insert USB drive → configure backup path in Settings → test manual backup
  - [ ] Complete first-run setup wizard
  - [ ] Add all employees with PINs
  - [ ] Verify all seeded menu items and adjust prices if needed
  - [ ] Open first shift → run test order end-to-end
  - [ ] Hand over admin PIN to owner

---

## 10. Hardware Integration

### Supported thermal printer types

| Interface | Support |
|---|---|
| USB direct (most common) | ✓ via node-thermal-printer USB mode |
| Serial (COM port) | ✓ via node-thermal-printer Serial mode |
| Network (LAN/Wi-Fi) | Not needed — single device, no LAN |
| Bluetooth | Not supported |

### Printer port formats

| OS | Format | Example |
|---|---|---|
| Windows | `USB001`, `USB002`, or `\\.\COM3` | `USB001` |
| Linux | `/dev/usb/lp0`, `/dev/ttyUSB0` | `/dev/usb/lp0` |

Admin enters the port string in Settings > Printers. The test print button immediately
confirms if the port is correct.

### Arabic encoding priority order

1. `CharacterSet.PC864_ARABIC` — for printers with Arabic code page support
2. `CharacterSet.PC720` — alternative Arabic encoding
3. Bitmap fallback — render receipt in Electron's Chromium, capture as image, print via
   `printImageBuffer()`. This works on any printer that supports raster images.
   Performance cost: ~500 ms per receipt. Acceptable.

### Barcode scanner

USB HID scanners require zero configuration. They present as a keyboard device.
The app intercepts the barcode input via a focused hidden `<input>` in the Inventory screen's
stock tab. A scan is detected as: ≥ 6 characters received within 150 ms, terminated by Enter.

---

## 11. Backup & Restore

### What is backed up

```
momo_backup_2025-12-01_14-00.zip
├── momo.db            ← complete SQLite database (all orders, items, customers, etc.)
└── images/            ← all product photos uploaded by admin
    ├── item_1_1701234567.jpg
    └── ...
```

### Backup schedule behavior

| Setting | Trigger |
|---|---|
| كل ساعة (hourly) | `setInterval(backup, 60 * 60 * 1000)` on main process startup |
| نهاية الوردية | Called during shift close flow |
| يومياً (daily) | `setInterval(backup, 24 * 60 * 60 * 1000)` |

The backup is silent. A toast is shown only if it fails.
If no USB drive is configured or inserted: backup is skipped, warning shown in Settings.

### Restore procedure

1. User selects backup ZIP from USB via file picker
2. Confirmation modal: "سيتم استبدال جميع البيانات الحالية بالنسخة الاحتياطية"
3. On confirm:
   - Copy current DB to `momo_before_restore.db` in userData (safety net)
   - Extract ZIP to temp folder
   - `fs.copyFileSync(temp/momo.db, userData/momo.db)`
   - `fs.cpSync(temp/images/, userData/images/, { recursive: true })`
   - `app.relaunch()` + `app.quit()`
4. App restarts, migration runner runs, app is restored

### Disaster recovery time

Target: < 5 minutes from "PC is dead" to "taking orders on new PC"

1. Install Momo POS on new PC (offline installer from USB): ~2 min
2. Insert backup USB, open app, go to Settings > Backup > Restore: ~30 sec
3. Select most recent backup ZIP, confirm, app restarts: ~1 min
4. Verify data, open shift: ~1 min

---

## 12. Key Risks & Mitigations

### Risk 1 — Arabic in thermal printing (HIGH)

**Risk**: Many budget thermal printers (common in Sudan) do not support Arabic code pages.
Sending Arabic UTF-8 or CP864 will produce garbled output.

**Mitigation**:
- Test with actual printer hardware in Phase 10, before QA
- Implement bitmap print fallback from day one: render receipt to an offscreen Electron `BrowserWindow`,
  call `webContents.capturePage()`, convert to 1-bit monochrome bitmap, send as
  `printImageBuffer(width, height, data)` via node-thermal-printer
- Bitmap mode always works. Performance cost (~500 ms extra) is acceptable for a receipt

### Risk 2 — Single device is single point of failure (HIGH)

**Risk**: If the PC fails (hard drive crash, power surge), all data is lost and operations stop.

**Mitigation**:
- Hourly USB backup running by default (configured during first-run setup)
- Restore takes < 5 minutes on a replacement PC
- Print the restore procedure on a card and leave it next to the cash register

### Risk 3 — PIN security without network (MEDIUM)

**Risk**: Employee discovers another employee's PIN (shoulder surfing, etc.).

**Mitigation**:
- PINs stored as bcrypt hashes — even if someone reads the DB file, PINs cannot be recovered
- Recommend 6-digit PINs (settings enforces minimum 4)
- Add PIN lockout after 5 failed attempts (15-minute lock, resettable by admin)
- Admin can reset any employee's PIN from Settings

### Risk 4 — Product image storage growth (MEDIUM)

**Risk**: If many product photos are uploaded at full resolution, the userData folder could
grow large, slowing down backups.

**Mitigation**:
- On upload: compress to max 1,200 × 1,200 px and max 800 KB using Electron's `nativeImage.resize()`
  or a canvas resize before saving
- Settings > System tab shows current images folder size
- Warn admin in Settings when images folder exceeds 500 MB

### Risk 5 — SQLite concurrency (LOW)

**Risk**: In a single-device app, there is no real concurrency. But Electron's main process and
renderer run on different threads; if both attempt to write simultaneously, WAL mode handles it.

**Mitigation**:
- All DB writes happen in the main process (IPC handlers) — renderer never writes directly
- `better-sqlite3` is synchronous — no async write conflicts
- WAL mode already enabled — reads never block writes

### Risk 6 — First-run data entry burden (LOW)

**Risk**: Owner needs to enter all menu items, prices, and categories before first use —
potentially 50+ items if the seed data doesn't match their actual menu.

**Mitigation**:
- Seeded data (16 items from momo-data.js) closely matches a desserts & drinks café
- Prices in seed data are set to 0 — owner prompted to set prices on first run
- CSV import for bulk menu entry can be added in v1.1

---

## 13. Definition of Done

A phase is "done" when all of the following are true:

- [ ] All tasks in the phase checklist are complete
- [ ] Every screen in the phase renders without console errors
- [ ] Every interactive element (button, toggle, input) produces the expected result
- [ ] All DB writes are reflected correctly on re-query
- [ ] Arabic text renders correctly at all font sizes
- [ ] RTL layout is correct (no LTR-only artifacts)
- [ ] The offline guarantee holds: feature works with all network interfaces disabled
- [ ] Action log entries are written for all auditable actions in the phase

The system is "done" (v1.0 release) when:

- [ ] All 12 phases are done
- [ ] Arabic thermal printing works on the target printer (or bitmap fallback confirmed)
- [ ] Backup and restore round-trip tested and verified
- [ ] RBAC enforcement tested for all 4 roles
- [ ] First-run setup wizard completes without errors
- [ ] A real shift has been opened, orders placed, and shift closed with Z-report

---

## 14. Coding Agent Prompts

Use these prompts in sequence to build the system phase by phase.
Each prompt assumes the previous phase is complete and the agent has read the design file
(see Section 1 for the fetch prompt).

---

### Prompt 0 — Read the design first

```
Before writing any code, fetch and read the Momo POS design bundle:

curl -s "https://api.anthropic.com/v1/design/h/CGbNb4dTdNo6O54mqcPllg?open_file=Momo+POS.html" \
  -o momo_design.tar.gz && gunzip -c momo_design.tar.gz > momo_design.tar && tar xf momo_design.tar

Read these files completely:
1. momo/README.md
2. momo/chats/chat1.md (the full design conversation)
3. momo/project/Momo POS.html (1685 lines — read every line)
4. momo/project/momo-data.js

The HTML file is the source of truth for all UI. Match it pixel-for-pixel.
Every component, color, Arabic string, and interaction is defined there.
Only after reading these files should you write any code.
```

---

### Prompt 1 — Phase 0: Scaffold

```
Implement Phase 0 of the Momo POS system as described in MOMO_POS_README.md.

Set up: Electron 30 + React 18 + Vite + TypeScript using electron-forge.

Requirements:
- html element must have lang="ar" dir="rtl"
- Tajawal font (all 6 weights) bundled in assets/fonts/, declared via @font-face — no Google Fonts CDN
- CSS custom properties on :root matching the prototype's P object exactly (hex values from the design)
- Port ALL shared components from momo/project/Momo POS.html: Modal, Field, Inp, Sel, Btn (all 7 variants),
  Toggle, Card, TabBar, Badge, Icon (all 40+ paths from IC map), Toast
- App shell: sidebar on RIGHT, topbar, content area, mobile bottom nav
- Dummy screen switcher (no DB yet) — show each module as a placeholder div
- IPC bridge skeleton: preload.ts with contextBridge, empty window.api object typed with all channels

The app must launch with: npm run dev
All shared components must render without errors.
Arabic text must display in Tajawal font.
RTL layout must be correct (content flows right to left).
```

---

### Prompt 2 — Phase 1: Database

```
Implement Phase 1 of the Momo POS system: database layer.

Using better-sqlite3 in the Electron main process:
1. Create src/main/db/connection.ts — opens DB at app.getPath('userData')/momo.db, enables WAL and FK
2. Create migration runner (reads .sql files alphabetically, tracks applied in _migrations table)
3. Write 001_initial.sql with the complete schema from MOMO_POS_README.md Section 5
4. Write seed.ts that inserts: all 16 items and 11 categories from momo-data.js, all 6 variation groups
   and their options, 4 default banks, default settings, 1 admin employee (name: مدير, PIN: 1234 bcrypt hashed)
   — seed runs only if employees table is empty
5. Implement ALL repository classes listed in MOMO_POS_README.md Section 4
6. Register ALL IPC handlers defined in MOMO_POS_README.md Section 6
7. Expose all handlers via contextBridge in preload.ts

Test: window.api.items.list() must return 16 seeded items in the renderer console.
```

---

### Prompt 3 — Phase 2: POS

```
Implement Phase 2 of the Momo POS system: the POS module.

Source of truth: momo/project/Momo POS.html, the POSScreen component (starts around line 600).
Recreate it exactly, replacing useState with DB calls via window.api where data is persistent.

Key requirements:
1. Item grid with category pills, subcategory pills, search — items fetched from window.api.items.list()
2. VariationModal — port from prototype exactly, variation groups fetched from window.api.variations.listGroups()
3. Order panel with qty controls, discount panel (reason required, cashier max% enforced)
4. Payment flow: 3 modes (cash/bank/split), banks from window.api.settings.getBanks()
5. On confirm: window.api.orders.create() — main process handles: DB write, stock deduction,
   loyalty points, action_log entry, auto-print to both printers
6. ReceiptScreen after confirm — port from prototype
7. Hold order (in memory), VoidModal with manager PIN verification
8. Customer phone lookup with birthday alert

All Arabic strings must match the prototype exactly.
All interactions must produce the correct toast notifications (port toast strings from prototype).
```

---

### Prompt 4 — Phase 3: Menu Management

```
Implement Phase 3 of the Momo POS system: menu management module.

Source of truth: momo/project/Momo POS.html, the MenuScreen component.

Requirements:
1. Items tab: table with all columns (image, name/desc, category badges, variation tags, price, margin%, toggle)
2. Add/edit item modal with ImagePicker: file upload saves via window.api.items.saveImage(),
   returns path stored in DB; URL mode stored as-is
3. Categories tab: root and subcategory grids with add/edit/delete
4. Variation groups tab: display and full CRUD (add group, add options with price adjustments)
5. Modifiers tab: same structure as variations
6. Availability toggle: calls window.api.items.setAvailable(), reflected in POS immediately

Port all Arabic strings, color usage, and interaction patterns from the prototype exactly.
```

---

### Prompt 5 — Phases 4–9 (remaining modules)

```
Implement Phases 4 through 9 of the Momo POS system, one module at a time.

For each module, use the corresponding screen component in momo/project/Momo POS.html as the
visual and interaction source of truth. Replace all in-memory state and mock data with real
DB calls via window.api.

Modules to implement:
- Phase 4: Inventory (InvScreen) — stock table, adjust modal, recipes, suppliers, purchase orders
- Phase 5: Customers (CustScreen) — customer list, profile panel, loyalty points, redeem modal
- Phase 6: Cash (CashScreen) — float, reconciliation, petty cash, expenses, Z-report
- Phase 7: Reports (RepScreen) — sales KPIs, hourly heatmap, items, payments, audit log
- Phase 8: Shifts & RBAC (ShiftScreen) — shift open/close, clock log, employees, permissions matrix,
  action log, PIN login screen replacing the tweaks panel
- Phase 9: Settings (SettScreen) — restaurant info, banks manager, printer config, backup, system info

After all modules: implement PIN login screen (replaces tweaks panel), session context,
and RBAC nav filtering for all 4 roles.
```

---

### Prompt 6 — Phase 10: Hardware

```
Implement Phase 10 of the Momo POS system: hardware integration.

1. Thermal printer integration using node-thermal-printer:
   - Printer 1 (cashier receipt): header, items with variation labels, totals, payment method + bank name
   - Printer 2 (kitchen ticket): items and notes only, no prices, order number and time
   - Z-report format: shift summary, totals by payment type, per-bank breakdown
   - Purchase order format: supplier name, ingredient list with quantities
   - Test print for each printer from Settings > Printers
   - Error handling: catch all printer errors, show toast, never block order confirmation
   - Arabic encoding: try CP864 first, then PC720, then implement bitmap fallback using
     Electron offscreen BrowserWindow capture + printImageBuffer()

2. Barcode scanner (USB HID):
   - Hidden input field in Inventory > Stock tab that auto-focuses when tab is active
   - Detect scan as: ≥6 chars within 150ms, terminated by Enter
   - On scan: window.api.inventory.findByBarcode(code) → open AdjustModal for found ingredient

3. USB backup:
   - window.api.backup.listUsbPaths(): detect removable drives (Windows: wmic, Linux: /dev/disk)
   - window.api.backup.now(): ZIP userData/momo.db + userData/images/ → write to USB path
   - window.api.backup.restore(zipPath): extract, replace DB, copy images, app.relaunch()
   - Scheduler: setInterval based on settings.backup_schedule, silent background execution
```

---

### Prompt 7 — Phase 12: Packaging

```
Implement Phase 12 of the Momo POS system: packaging and delivery.

1. Configure electron-builder.config.ts:
   - Windows target: NSIS installer + portable ZIP
   - App name: موموـ POS, App ID: com.momo.pos
   - Include assets/fonts/ and resources/db/ in the bundle

2. First-run setup wizard (shown when employees table is empty):
   - Screen 1: Welcome, restaurant name input
   - Screen 2: Create first admin employee (name + PIN + confirm PIN)
   - Screen 3: Printer 1 port config + test print, Printer 2 port config + test print
   - Screen 4: Success — click "ابدأ" to open POS

3. Auto-launch on Windows startup: app.setLoginItemSettings({ openAtLogin: true })

4. In Settings > System tab: "طباعة دليل الموظفين" button prints a staff cheat sheet
   covering POS workflow, shift procedures, and backup steps — in Arabic — to Printer 1

Build the final installer: npm run build
```

---

*This document is the single source of truth for all implementation decisions.
When in doubt, read the design file first, then this document.*

*Design bundle: `https://api.anthropic.com/v1/design/h/CGbNb4dTdNo6O54mqcPllg?open_file=Momo+POS.html`*
