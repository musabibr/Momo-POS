-- 012_expand_stock_adjustment_types.sql
-- Expand stock_adjustments.type CHECK to include kitchen production/usage types
-- and order correction types that are already in use by the application.

-- SQLite cannot ALTER CHECK constraints, so we recreate the table.
-- We DROP the CHECK entirely to be future-proof — validation is done at the app layer.
CREATE TABLE IF NOT EXISTS stock_adjustments_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id  INTEGER,
  quantity       REAL NOT NULL,
  type           TEXT NOT NULL,
  reason         TEXT,
  employee_id    INTEGER REFERENCES employees(id),
  order_id       INTEGER REFERENCES orders(id),
  location_id    TEXT DEFAULT 'main',
  created_at     TEXT DEFAULT (datetime('now'))
);

INSERT INTO stock_adjustments_new (id, ingredient_id, quantity, type, reason, employee_id, order_id, location_id, created_at)
  SELECT id, ingredient_id, quantity, type, reason, employee_id, order_id, location_id, created_at FROM stock_adjustments;

DROP TABLE stock_adjustments;
ALTER TABLE stock_adjustments_new RENAME TO stock_adjustments;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_stock_adj_ingredient ON stock_adjustments(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_employee   ON stock_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_order      ON stock_adjustments(order_id);

INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '012');
