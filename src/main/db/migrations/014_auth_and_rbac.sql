-- 014_auth_and_rbac.sql
-- Add Username/Password authentication, Security Questions, and granular JSON Permissions
-- to the existing employees table using non-destructive ALTER TABLE statements.
-- This avoids the DROP TABLE + RENAME pattern which fails when FK constraints exist.

-- Add new columns (SQLite silently ignores ADD COLUMN if it already exists when using IF NOT EXISTS-style checks isn't available,
-- but since this migration only runs once via the _migrations tracker, we're safe).

ALTER TABLE employees ADD COLUMN username TEXT;
ALTER TABLE employees ADD COLUMN password_hash TEXT;
ALTER TABLE employees ADD COLUMN permissions TEXT;
ALTER TABLE employees ADD COLUMN security_question TEXT;
ALTER TABLE employees ADD COLUMN security_answer_hash TEXT;

-- Backfill: generate usernames from name + id, copy pin_hash → password_hash
UPDATE employees SET
  username = LOWER(REPLACE(name, ' ', '')) || id,
  password_hash = pin_hash,
  permissions = CASE
    WHEN role = 'admin'   THEN '["*"]'
    WHEN role = 'manager' THEN '["pos_access","pos_void","pos_discount","shift_manage","transactions_view","menu_manage","inventory_manage","purchase_manage","customers_manage","reports_view","users_manage","kitchen_view"]'
    WHEN role = 'cashier'  THEN '["pos_access","shift_manage","transactions_view"]'
    WHEN role = 'kitchen'  THEN '["kitchen_view"]'
    ELSE '[]'
  END
WHERE username IS NULL;

-- Create a unique index on username (allows NULLs but enforces uniqueness for non-NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username ON employees(username);

-- Update schema version
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '014');
