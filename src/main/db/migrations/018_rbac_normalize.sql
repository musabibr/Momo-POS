-- 018_rbac_normalize.sql
-- Permissions become the single source of truth for access control.
-- Roles remain as presets/labels only. This migration normalizes stored
-- permission data so every employee row has a valid JSON array of known
-- permission keys, and retires the vestigial pin_hash column.

-- 1) Re-derive permissions from the role preset where the stored value is
--    missing, empty, or not a valid JSON array.
UPDATE employees SET permissions = CASE
    WHEN role = 'admin'   THEN '["*"]'
    WHEN role = 'manager' THEN '["pos_access","pos_void","pos_discount","shift_manage","transactions_view","transactions_view_all","kitchen_view","menu_manage","inventory_manage","purchase_manage","customers_manage","reports_view","users_manage"]'
    WHEN role = 'cashier' THEN '["pos_access","shift_manage","transactions_view"]'
    WHEN role = 'kitchen' THEN '["kitchen_view"]'
    ELSE '[]'
  END
WHERE permissions IS NULL
   OR TRIM(permissions) = ''
   OR json_valid(permissions) = 0
   OR json_type(permissions) <> 'array';

-- 2) Strip role-name tokens that leaked into permission arrays back when the
--    IPC guard confused roles with permissions.
UPDATE employees SET permissions = COALESCE((
    SELECT json_group_array(value) FROM json_each(employees.permissions)
    WHERE value NOT IN ('admin','manager','cashier','kitchen')
  ), '[]')
WHERE json_valid(permissions) = 1
  AND (permissions LIKE '%"admin"%' OR permissions LIKE '%"manager"%'
    OR permissions LIKE '%"cashier"%' OR permissions LIKE '%"kitchen"%');

-- 3) Managers who could previously see all orders (role-based check) keep that
--    ability via the new transactions_view_all permission.
UPDATE employees SET permissions = json_insert(permissions, '$[#]', 'transactions_view_all')
WHERE role = 'manager'
  AND json_valid(permissions) = 1
  AND permissions NOT LIKE '%"*"%'
  AND permissions LIKE '%"transactions_view"%'
  AND permissions NOT LIKE '%"transactions_view_all"%';

-- 4) pin_hash has been write-only since 014 (login uses password_hash) and its
--    NOT NULL constraint forces every INSERT to carry a duplicate hash. Drop it.
ALTER TABLE employees DROP COLUMN pin_hash;

-- 5) Normalize schema_version (was left inconsistent by 003/014/seed).
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '018');
