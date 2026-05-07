-- 007_item_scoped_variations.sql
-- Move from global shared variation groups to item-scoped option groups/options.

-- 1. Create item-scoped option groups
CREATE TABLE IF NOT EXISTS item_option_groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'single' CHECK(type IN ('single','multi')),
  kind       TEXT NOT NULL DEFAULT 'variation' CHECK(kind IN ('variation','modifier')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 2. Create item-scoped options
CREATE TABLE IF NOT EXISTS item_options (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id   INTEGER NOT NULL REFERENCES item_option_groups(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price_adj  REAL NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 3. Migrate existing data: for each item-group link, create a scoped copy
INSERT INTO item_option_groups (item_id, name, type, kind, sort_order)
  SELECT ivg.item_id, vg.name, vg.type, COALESCE(vg.kind, 'variation'), ROW_NUMBER() OVER (PARTITION BY ivg.item_id ORDER BY vg.name) - 1
  FROM item_variation_groups ivg
  JOIN variation_groups vg ON vg.id = ivg.group_id;

-- 4. Migrate options into scoped groups
-- We match by (item_id + group name) to find the correct new group_id
INSERT INTO item_options (group_id, name, price_adj, is_default, sort_order)
  SELECT iog.id, vo.name, vo.price_adj, 0, ROW_NUMBER() OVER (PARTITION BY iog.id ORDER BY vo.name) - 1
  FROM item_option_groups iog
  JOIN item_variation_groups ivg ON ivg.item_id = iog.item_id
  JOIN variation_groups vg ON vg.id = ivg.group_id AND vg.name = iog.name AND COALESCE(vg.kind, 'variation') = iog.kind
  JOIN variation_options vo ON vo.group_id = vg.id;

-- 5. Update schema version
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '007');
