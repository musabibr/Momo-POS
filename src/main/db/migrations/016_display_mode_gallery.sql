-- 016_display_mode_gallery.sql
-- Adds display_mode to items + item_gallery table for product photo galleries

-- ─────── DISPLAY MODE ───────
-- Controls whether POS/Menu shows the SVG icon or a photo for each item.
-- Default 'icon' preserves existing behavior for all current items.
ALTER TABLE items ADD COLUMN display_mode TEXT NOT NULL DEFAULT 'icon';

-- ─────── ITEM GALLERY ───────
-- Optional multi-image gallery for product photos (separate from the main image_path).
CREATE TABLE IF NOT EXISTS item_gallery (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_item_gallery_item ON item_gallery(item_id);
