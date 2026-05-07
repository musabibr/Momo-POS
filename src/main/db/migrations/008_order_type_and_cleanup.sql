-- 008_order_type_and_cleanup.sql
-- Add order_type and order_note columns to orders table.
-- Drop orphaned legacy variation tables.

ALTER TABLE orders ADD COLUMN order_type TEXT CHECK(order_type IN ('local','takeaway','delivery'));
ALTER TABLE orders ADD COLUMN order_note TEXT;

-- Drop orphaned legacy variation tables (data migrated to item_option_groups in 007)
DROP TABLE IF EXISTS item_variation_groups;
DROP TABLE IF EXISTS variation_options;
DROP TABLE IF EXISTS variation_groups;

-- Update schema version
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '008');
