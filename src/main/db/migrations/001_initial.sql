-- 001_initial.sql — Full Momo POS schema
-- Tables ordered to satisfy foreign key dependencies

-- ─────── SETTINGS ───────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ─────── EMPLOYEES ───────
CREATE TABLE IF NOT EXISTS employees (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK(role IN ('admin','manager','cashier','kitchen')),
  pin_hash   TEXT NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─────── SHIFTS ───────
CREATE TABLE IF NOT EXISTS shifts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id    INTEGER NOT NULL REFERENCES employees(id),
  opened_at      TEXT DEFAULT (datetime('now')),
  closed_at      TEXT,
  open_float     INTEGER NOT NULL DEFAULT 0,
  close_float    INTEGER,
  total_orders   INTEGER,
  total_revenue  INTEGER
);

-- ─────── CUSTOMERS ───────
CREATE TABLE IF NOT EXISTS customers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  phone         TEXT UNIQUE,
  notes         TEXT,
  birthday      TEXT,
  is_vip        INTEGER NOT NULL DEFAULT 0,
  is_blacklist  INTEGER NOT NULL DEFAULT 0,
  points        INTEGER NOT NULL DEFAULT 0,
  total_spend   INTEGER NOT NULL DEFAULT 0,
  visit_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ─────── CATEGORIES ───────
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#a855f7',
  parent_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ─────── VARIATION GROUPS ───────
CREATE TABLE IF NOT EXISTS variation_groups (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  type  TEXT NOT NULL CHECK(type IN ('single','multi'))
);

CREATE TABLE IF NOT EXISTS variation_options (
  id         TEXT PRIMARY KEY,
  group_id   TEXT NOT NULL REFERENCES variation_groups(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price_adj  INTEGER NOT NULL DEFAULT 0
);

-- ─────── ITEMS ───────
CREATE TABLE IF NOT EXISTS items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  description      TEXT,
  price            INTEGER NOT NULL,
  cost             INTEGER,
  cat_id           TEXT REFERENCES categories(id),
  subcat_id        TEXT REFERENCES categories(id),
  emoji            TEXT DEFAULT '🍮',
  image_path       TEXT,
  available        INTEGER NOT NULL DEFAULT 1,
  barcode          TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_variation_groups (
  item_id   INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  group_id  TEXT NOT NULL REFERENCES variation_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, group_id)
);

-- ─────── ORDERS ───────
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  client_order_id TEXT UNIQUE,
  order_num       INTEGER NOT NULL,
  subtotal        INTEGER NOT NULL,
  disc_amount     INTEGER NOT NULL DEFAULT 0,
  disc_reason     TEXT,
  disc_type       TEXT CHECK(disc_type IN ('pct','amt')),
  disc_value      INTEGER,
  total           INTEGER NOT NULL CHECK(total >= 0),
  pay_mode        TEXT NOT NULL CHECK(pay_mode IN ('cash','bank','split')),
  bank_name       TEXT,
  bank_ref        TEXT,
  cash_in         INTEGER,
  cash_change     INTEGER,
  cash_part       INTEGER,
  bank_part       INTEGER,
  customer_id     INTEGER REFERENCES customers(id),
  employee_id     INTEGER REFERENCES employees(id),
  shift_id        INTEGER REFERENCES shifts(id),
  status          TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','voided')),
  created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);

CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id          INTEGER NOT NULL REFERENCES items(id),
  qty              INTEGER NOT NULL DEFAULT 1,
  unit_price       INTEGER NOT NULL,
  variation_label  TEXT,
  selections       TEXT,
  note             TEXT
);

-- ─────── INVENTORY ───────
CREATE TABLE IF NOT EXISTS ingredients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'g',
  stock         REAL NOT NULL DEFAULT 0,
  low_threshold REAL NOT NULL DEFAULT 0,
  cost_per_unit REAL,
  barcode       TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id        INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity       REAL NOT NULL,
  UNIQUE(item_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id),
  quantity       REAL NOT NULL CHECK(quantity != 0),
  type           TEXT NOT NULL CHECK(type IN ('add','remove','waste','sale')),
  reason         TEXT,
  employee_id    INTEGER REFERENCES employees(id),
  order_id       INTEGER REFERENCES orders(id),
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stock_adj_ingredient ON stock_adjustments(ingredient_id);

-- ─────── SUPPLIERS ───────
CREATE TABLE IF NOT EXISTS suppliers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT,
  notes      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_ingredients (
  supplier_id    INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price_per_unit REAL,
  PRIMARY KEY (supplier_id, ingredient_id)
);

-- ─────── CLOCK LOG ───────
CREATE TABLE IF NOT EXISTS clock_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id  INTEGER NOT NULL REFERENCES employees(id),
  shift_id     INTEGER REFERENCES shifts(id),
  type         TEXT NOT NULL CHECK(type IN ('in','out')),
  created_at   TEXT DEFAULT (datetime('now'))
);

-- ─────── CASH & ACCOUNTING ───────
CREATE TABLE IF NOT EXISTS petty_cash (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL CHECK(type IN ('in','out')),
  amount      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  shift_id    INTEGER REFERENCES shifts(id),
  employee_id INTEGER REFERENCES employees(id),
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      INTEGER NOT NULL CHECK(amount > 0),
  category    TEXT NOT NULL,
  note        TEXT,
  shift_id    INTEGER REFERENCES shifts(id),
  employee_id INTEGER REFERENCES employees(id),
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─────── AUDIT LOG ───────
CREATE TABLE IF NOT EXISTS action_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  action      TEXT NOT NULL,
  detail      TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_action_log_created ON action_log(created_at);
