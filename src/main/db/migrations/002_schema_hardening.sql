-- 002_schema_hardening.sql — Add missing columns and constraints per plans/01-database.md

-- 1. Add 'kind' discriminator to variation_groups (variation vs modifier)
ALTER TABLE variation_groups ADD COLUMN kind TEXT NOT NULL DEFAULT 'variation' CHECK(kind IN ('variation','modifier'));

-- 2. Add 'is_removal' flag to variation_options (for "remove ingredient" modifiers)
ALTER TABLE variation_options ADD COLUMN is_removal INTEGER NOT NULL DEFAULT 0;

-- 3. Update schema_version setting
UPDATE settings SET value = '002' WHERE key = 'schema_version';
