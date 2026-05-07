-- 006_fix_topping_kind.sql
-- Fix topping group to be a modifier (add-on) instead of a variation

UPDATE variation_groups SET kind = 'modifier' WHERE id = 'topping';

-- Update Schema Version
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '006');
