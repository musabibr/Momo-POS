-- Performance indexes for hot query columns
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_shift_id      ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_stock_adj_employee   ON stock_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_order      ON stock_adjustments(order_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_item_loc   ON inventory_stock(item_id, location_id);
CREATE INDEX IF NOT EXISTS idx_action_log_employee  ON action_log(employee_id);
-- Speeds up ShiftRepo.getCurrent() which scans for closed_at IS NULL
CREATE INDEX IF NOT EXISTS idx_shifts_closed_at     ON shifts(closed_at);
