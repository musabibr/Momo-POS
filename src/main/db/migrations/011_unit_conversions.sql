-- 011_unit_conversions.sql
-- Smart unit conversion chains for packaging hierarchies

-- Unit conversions: 1 from_unit = factor × to_unit
CREATE TABLE IF NOT EXISTS unit_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_unit TEXT NOT NULL REFERENCES units(id),
  to_unit TEXT NOT NULL REFERENCES units(id),
  factor REAL NOT NULL CHECK(factor > 0),
  UNIQUE(from_unit, to_unit)
);

-- Seed standard conversions
INSERT OR IGNORE INTO unit_conversions (from_unit, to_unit, factor) VALUES
  ('kg', 'g', 1000),
  ('l', 'ml', 1000);

INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '011');
