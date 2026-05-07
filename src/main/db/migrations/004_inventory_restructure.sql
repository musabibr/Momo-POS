-- 004_inventory_restructure.sql — Multi-location inventory, packagings, purchases, kitchen ops

-- ─────── 1. Rename ingredients → inventory_items + add type ───────
ALTER TABLE ingredients RENAME TO inventory_items;
ALTER TABLE inventory_items ADD COLUMN type TEXT NOT NULL DEFAULT 'ingredient'
  CHECK(type IN ('ingredient', 'premade'));
ALTER TABLE inventory_items ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

-- ─────── 2. Item Packagings ───────
CREATE TABLE IF NOT EXISTS item_packagings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id      INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  qty_per_base REAL NOT NULL,
  UNIQUE(item_id, label)
);

-- ─────── 3. Locations ───────
CREATE TABLE IF NOT EXISTS locations (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
INSERT OR IGNORE INTO locations (id, name) VALUES ('main', 'المستودع الرئيسي');
INSERT OR IGNORE INTO locations (id, name) VALUES ('kitchen', 'المطبخ');

-- ─────── 4. Per-location stock tracking ───────
CREATE TABLE IF NOT EXISTS inventory_stock (
  item_id     INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id),
  quantity    REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, location_id)
);

-- Migrate existing stock to 'main' location
INSERT OR IGNORE INTO inventory_stock (item_id, location_id, quantity)
  SELECT id, 'main', stock FROM inventory_items;
-- Initialize kitchen with zero
INSERT OR IGNORE INTO inventory_stock (item_id, location_id, quantity)
  SELECT id, 'kitchen', 0 FROM inventory_items;

-- ─────── 5. Inventory Transfers ───────
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id         INTEGER NOT NULL REFERENCES inventory_items(id),
  from_location   TEXT NOT NULL REFERENCES locations(id),
  to_location     TEXT NOT NULL REFERENCES locations(id),
  quantity        REAL NOT NULL,
  packaging_id    INTEGER REFERENCES item_packagings(id),
  packaging_qty   REAL,
  employee_id     INTEGER REFERENCES employees(id),
  note            TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON inventory_transfers(created_at);

-- ─────── 6. Purchases ───────
CREATE TABLE IF NOT EXISTS purchases (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id  INTEGER REFERENCES suppliers(id),
  total_cost   REAL NOT NULL DEFAULT 0,
  note         TEXT,
  employee_id  INTEGER REFERENCES employees(id),
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id   INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id       INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity      REAL NOT NULL,
  packaging_id  INTEGER REFERENCES item_packagings(id),
  packaging_qty REAL,
  unit_cost     REAL NOT NULL,
  total_cost    REAL NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- ─────── 7. stock_adjustments: expand type CHECK + add location_id ───────
-- SQLite cannot ALTER CHECK constraints, so we recreate the table.
CREATE TABLE IF NOT EXISTS stock_adjustments_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id  INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity       REAL NOT NULL,
  type           TEXT NOT NULL CHECK(type IN ('add','remove','waste','sale','damage','correction')),
  reason         TEXT,
  employee_id    INTEGER REFERENCES employees(id),
  order_id       INTEGER REFERENCES orders(id),
  location_id    TEXT DEFAULT 'main',
  created_at     TEXT DEFAULT (datetime('now'))
);
INSERT INTO stock_adjustments_new (id, ingredient_id, quantity, type, reason, employee_id, order_id, created_at)
  SELECT id, ingredient_id, quantity, type, reason, employee_id, order_id, created_at FROM stock_adjustments;
DROP TABLE stock_adjustments;
ALTER TABLE stock_adjustments_new RENAME TO stock_adjustments;
CREATE INDEX IF NOT EXISTS idx_stock_adj_ingredient ON stock_adjustments(ingredient_id);
-- ─────── 8. Schema version ───────
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '004');
