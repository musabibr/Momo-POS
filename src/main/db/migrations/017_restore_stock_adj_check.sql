-- 017_restore_stock_adj_check.sql — restore CHECK(quantity != 0) on stock_adjustments
-- Uses the same loose FK / open type approach as 012 (app-layer validation)
-- but re-adds the CHECK constraint to prevent zero-quantity rows.
CREATE TABLE IF NOT EXISTS stock_adjustments_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id  INTEGER,
  quantity       REAL NOT NULL CHECK(quantity != 0),
  type           TEXT NOT NULL,
  reason         TEXT,
  employee_id    INTEGER REFERENCES employees(id),
  order_id       INTEGER REFERENCES orders(id),
  location_id    TEXT DEFAULT 'main',
  created_at     TEXT DEFAULT (datetime('now'))
);
INSERT INTO stock_adjustments_new
  SELECT id, ingredient_id, quantity, type, reason, employee_id, order_id, location_id, created_at
  FROM stock_adjustments WHERE quantity != 0;
DROP TABLE stock_adjustments;
ALTER TABLE stock_adjustments_new RENAME TO stock_adjustments;
CREATE INDEX IF NOT EXISTS idx_stock_adj_ingredient ON stock_adjustments(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_employee   ON stock_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_order      ON stock_adjustments(order_id);
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '017');
