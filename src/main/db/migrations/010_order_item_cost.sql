-- 010_order_item_cost.sql — Snapshot item cost at order time for P&L reporting
ALTER TABLE order_items ADD COLUMN unit_cost INTEGER NOT NULL DEFAULT 0;
