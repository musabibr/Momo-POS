-- 005_business_logic_refinement.sql
-- Adds configurable units, material variants, and sub-unit pricing

-- 1. Create Units table
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('weight', 'volume', 'quantity'))
);

INSERT OR IGNORE INTO units (id, name, type) VALUES 
  ('g', 'جرام', 'weight'),
  ('kg', 'كيلوجرام', 'weight'),
  ('ml', 'مليلتر', 'volume'),
  ('l', 'لتر', 'volume'),
  ('pcs', 'قطعة', 'quantity'),
  ('box', 'صندوق', 'quantity'),
  ('pack', 'عبوة', 'quantity'),
  ('bottle', 'زجاجة', 'quantity');

-- 2. Enhance inventory_items (Materials)
-- parent_id allows grouping variations of a material (e.g. Base: Chocolate, Variants: White, Dark)
ALTER TABLE inventory_items ADD COLUMN parent_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE;

-- 3. Enhance item_packagings (Sub-units/packagings)
-- custom_cost allows overriding the auto-calculated (base_cost * qty)
ALTER TABLE item_packagings ADD COLUMN custom_cost REAL;

-- 4. Update Schema Version
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '005');
