-- 003_rbac.sql — Add PIN lockout tracking to employees

-- 1. Track consecutive failed PIN attempts
ALTER TABLE employees ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;

-- 2. Lockout timestamp — if non-null and in the future, employee cannot login
ALTER TABLE employees ADD COLUMN locked_until TEXT;

-- 3. Update schema_version setting
UPDATE settings SET value = '003' WHERE key = 'schema_version';
