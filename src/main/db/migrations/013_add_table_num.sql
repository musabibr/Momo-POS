-- 013_add_table_num.sql
-- Add table_num to orders for table management

ALTER TABLE orders ADD COLUMN table_num TEXT;

-- Update schema version
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '013');
