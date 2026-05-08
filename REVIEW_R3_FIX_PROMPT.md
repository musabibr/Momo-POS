# Prompt — Implement Round 3 Code Review Fixes (Momo POS)

## Role

You are a senior full-stack engineer working on **Momo POS**, an offline-first Electron + React + better-sqlite3 desktop application for a Sudanese desserts café. The app runs in Arabic RTL with PIN-based RBAC and two thermal printers. **Money correctness, data integrity, and crash-survivability are non-negotiable.**

## Working Directory

`d:\projects\Momo`

## Goal

Apply the fixes listed below. Two prior review rounds (rounds 1 and 2) have already been applied; do **not** redo their work. This is **Round 3**, focused on transactional boundaries, crash recovery, lifecycle leaks, and end-user edge cases that the earlier rounds missed.

## Operating Rules

1. **Never weaken existing safeguards.** Every change must be additive (new transaction wrappers, new guards, new pragmas) or a tightening (replace check-then-act with atomic UPDATE, replace caller-supplied `employeeId` with session value).
2. **Preserve Arabic user-facing strings.** Toasts, error messages, modal titles must stay in Arabic. Internal logs are English.
3. **Keep edits minimal and surgical.** Do not refactor surrounding code. Do not change unrelated formatting. Do not add comments unless the *why* is non-obvious.
4. **No backwards-compat shims.** If a parameter is now ignored, prefix with `_` and move on. Do not leave `// removed` markers.
5. **One commit per category** (Critical, High, Medium) so the diff is reviewable. Do **not** push or force-push.
6. **Run `npm run typecheck` after each commit.** Fix type errors before moving on.
7. **Verify each fix using the verification step listed at the bottom** before marking the task done.
8. **Do NOT touch the items in the "Verified Correct" section** — they were checked in this review and are intentionally as-is.

## Stack

- Electron 30 + React 18 + TypeScript 5.5 strict
- better-sqlite3 (synchronous, WAL mode, FK enforcement, synchronous=FULL)
- Zod for IPC validation
- bcrypt cost 10 for PIN/password hashing
- contextBridge IPC boundary; no nodeIntegration

---

# 🔴 CRITICAL FIXES — Data Integrity & Multi-Process Safety

## R3-C1 · Wrap CategoryRepo.delete in a transaction

**File:** `src/main/db/repositories/CategoryRepo.ts` lines 30–38

The current method runs four writes sequentially (clear `cat_id` on items, clear `subcat_id`, reparent children, delete row). A crash between any pair leaves orphans. Replace with:

```typescript
static delete(id: string) {
  const db = getDb()
  db.transaction(() => {
    db.prepare(`UPDATE items SET cat_id = NULL WHERE cat_id = ?`).run(id)
    db.prepare(`UPDATE items SET subcat_id = NULL WHERE subcat_id = ?`).run(id)
    db.prepare(`UPDATE categories SET parent_id = NULL WHERE parent_id = ?`).run(id)
    db.prepare(`DELETE FROM categories WHERE id = ?`).run(id)
  })()
}
```

## R3-C2 · Wrap EmployeeRepo.delete in a transaction

**File:** `src/main/db/repositories/EmployeeRepo.ts` lines 67–76

Check-then-update race: a concurrent `orders:create` between SELECT and DELETE deletes an employee that just received an order. Replace with:

```typescript
static delete(id: number) {
  const db = getDb()
  db.transaction(() => {
    const hasOrders = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE employee_id = ?`).get(id) as any
    const hasShifts = db.prepare(`SELECT COUNT(*) as cnt FROM shifts WHERE employee_id = ?`).get(id) as any
    if ((hasOrders?.cnt ?? 0) > 0 || (hasShifts?.cnt ?? 0) > 0) {
      db.prepare(`UPDATE employees SET active = 0 WHERE id = ?`).run(id)
    } else {
      db.prepare(`DELETE FROM employees WHERE id = ?`).run(id)
    }
  })()
}
```

## R3-C3 · Wrap SupplierRepo.deleteSupplier and ItemRepo.delete in transactions

**Files:** `src/main/db/repositories/SupplierRepo.ts` and `src/main/db/repositories/ItemRepo.ts`

Audit both files for multi-statement deletes/updates that aren't wrapped in `db.transaction(() => {...})()`. Wrap any you find. `ItemRepo.update` is already wrapped (good). `ItemRepo.delete` is not.

## R3-C4 · Atomic stock deduction in OrderRepo.correctOrder

**File:** `src/main/db/repositories/OrderRepo.ts` lines ~295–304

Round 1 already replaced check-then-deduct in `OrderRepo.create`. The `correctOrder` path still has the same pattern. Replace it with:

```typescript
const result = db.prepare(`
  UPDATE inventory_stock SET quantity = quantity - ?
  WHERE item_id = ? AND location_id = 'kitchen' AND quantity >= ?
`).run(deductQty, recipe.ingredient_id, deductQty)
if (result.changes === 0) throw new Error(`مخزون المطبخ غير كافي: ${itemName}`)
```

## R3-C5 · Add single-instance lock

**File:** `src/main/index.ts` lines 1–88

Wrap the `app.whenReady()` block so a second app launch focuses the existing window and exits.

```typescript
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    /* existing init body — registerImageProtocol, initDatabase,
       runMigrations, registerAllIpc, registerBackupIpc, registerPrinterIpc,
       registerReportExportIpc, createWindow, startBackupScheduler, activate handler */
  })
}
```

## R3-C6 · Validate schema_version on backup restore

**File:** `src/main/ipc/backup.ts` lines 168–176 (restore) and the backup writer

After SHA256 validation in `backup:restore`, also enforce schema_version:

```typescript
if (manifest.schema_version) {
  const currentVer = (db.prepare(`SELECT value FROM settings WHERE key='schema_version'`).get() as any)?.value
  if (manifest.schema_version !== currentVer) {
    throw new Error(`إصدار قاعدة البيانات في النسخة (${manifest.schema_version}) لا يطابق النسخة الحالية (${currentVer})`)
  }
}
```

In the backup-write path, include `schema_version` (read from `settings`) in the manifest JSON.

## R3-C7 · Restore CHECK(quantity != 0) on stock_adjustments

**Files:** `src/main/db/migrations/004_inventory_restructure.sql` (do NOT edit) and a NEW file `src/main/db/migrations/010_restore_stock_adj_check.sql`

Migration 004 dropped the original CHECK constraint. SQLite cannot ALTER CHECK, so create a new migration that recreates the table with the constraint:

```sql
-- 010_restore_stock_adj_check.sql — restore CHECK(quantity != 0)
CREATE TABLE IF NOT EXISTS stock_adjustments_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id  INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity       REAL NOT NULL CHECK(quantity != 0),
  type           TEXT NOT NULL CHECK(type IN ('add','remove','waste','sale','damage','correction')),
  reason         TEXT,
  employee_id    INTEGER REFERENCES employees(id),
  order_id       INTEGER REFERENCES orders(id),
  location_id    TEXT DEFAULT 'main',
  created_at     TEXT DEFAULT (datetime('now'))
);
INSERT INTO stock_adjustments_new
  SELECT id, ingredient_id, quantity, type, reason, employee_id, order_id, location_id, created_at
  FROM stock_adjustments WHERE quantity != 0;
DROP TABLE stock_adjustments;
ALTER TABLE stock_adjustments_new RENAME TO stock_adjustments;
CREATE INDEX IF NOT EXISTS idx_stock_adj_ingredient ON stock_adjustments(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_employee   ON stock_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_order      ON stock_adjustments(order_id);
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '010');
```

## R3-C8 · Add SQLite pragmas for concurrency and performance

**File:** `src/main/db/connection.ts` (in `initDatabase`, after the existing pragmas)

```typescript
db.pragma('busy_timeout = 5000')
db.pragma('cache_size = -64000')   // 64 MB page cache
db.pragma('temp_store = MEMORY')
```

## R3-C9 · Migration 009 must update schema_version

**File:** `src/main/db/migrations/009_performance_indexes.sql`

Append the schema_version write that 004 has but 009 forgot:

```sql
INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '009');
```

(If you also create migration 010 from R3-C7, make sure 010's schema_version write supersedes 009's correctly.)

## R3-C10 · `shifts:clockIn` / `shifts:clockOut` must use the session, not caller-supplied employeeId

**File:** `src/main/ipc/handlers/shifts.ts` lines 26–27

Replace both handlers:

```typescript
handle('shifts:clockIn', (_employeeId: number, shiftId: number) => {
  const session = getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return ShiftRepo.clockIn(session.employeeId, shiftId)
}, ['admin', 'manager', 'cashier', 'kitchen'])

handle('shifts:clockOut', (_employeeId: number, shiftId: number) => {
  const session = getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return ShiftRepo.clockOut(session.employeeId, shiftId)
}, ['admin', 'manager', 'cashier', 'kitchen'])
```

---

# 🟠 HIGH FIXES — Real-World Reliability

## R3-H1 · Reconcile shift-required behavior across cash/petty/expense vs purchases

**File:** `src/main/ipc/handlers/shifts.ts` lines 35–53 and `src/main/ipc/handlers/purchases.ts`

Cash uses `requireActiveShiftAlways()`; purchases (after round 2) uses `requireActiveShiftIfNeeded()`. Decide and align: either cash should also respect `enforce_shift_required`, or purchases should always require a shift. **Recommended:** make both respect the setting (call `requireActiveShiftIfNeeded()` everywhere); a setting to disable shift enforcement that some handlers ignore is confusing.

## R3-H2 · TicketsPanel useEffect dependency fix

**File:** `src/renderer/screens/Kitchen/TicketsPanel.tsx` ~line 21

```tsx
useEffect(() => {
  const id = setInterval(reload, 12000)
  return () => clearInterval(id)
}, [reload])
```

## R3-H3 · SettingsScreen setTimeout cleanup

**File:** `src/renderer/screens/Settings/SettingsScreen.tsx` lines ~81, ~163, ~374

Consolidate the three "saved!" timers into one ref:

```tsx
const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }, [])

// in each save():
if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
savedTimerRef.current = setTimeout(() => setSaved(false), 2200)
```

## R3-H4 · Orphan-shift recovery on startup

**File:** `src/main/index.ts`, after `runMigrations()`

```typescript
const db = getDb()
const orphans = db.prepare(`SELECT id, opened_at FROM shifts WHERE closed_at IS NULL ORDER BY opened_at DESC`).all() as any[]
if (orphans.length > 1) {
  // multiple opens are an error — auto-close all but the most recent
  for (let i = 1; i < orphans.length; i++) {
    db.prepare(`UPDATE shifts SET closed_at = datetime('now','localtime'), close_float = open_float WHERE id = ?`).run(orphans[i].id)
    ActionLogRepo.write(null, 'shift_auto_closed_orphan', String(orphans[i].id))
  }
}
```

Optionally, on next admin login, surface a one-time toast if the most recent open shift was opened > 24h ago.

## R3-H5 · WAL checkpoint on renderer crash

**File:** `src/main/index.ts` inside `createWindow()` after `mainWindow` is constructed

```typescript
mainWindow.webContents.on('render-process-gone', (_e, details) => {
  console.error('[Renderer] crashed:', details)
  try { getDb().pragma('wal_checkpoint(TRUNCATE)') } catch (_) {}
})
```

## R3-H6 · Async backup image copy

**File:** `src/main/ipc/backup.ts` ~line 303

Replace the `for (const file of files) copyFileSync(...)` loop with `await fs.promises.copyFile(...)` in an async iteration. Mark the enclosing function `async`. If any single copy exceeds 10s, log and bail.

## R3-H7 · Fill audit-log gaps

**Files:** `src/main/db/repositories/OrderRepo.ts` (`correctOrder`) and `src/main/db/repositories/ItemRepo.ts` (`update`, `delete`)

Inside the existing transactions, add:

```typescript
ActionLogRepo.write(employeeId, 'order_corrected', JSON.stringify({ orderId, ... }))
// or
ActionLogRepo.write(employeeId, 'item_updated', JSON.stringify({ id, changedKeys }))
```

## R3-H8 · `settings:set` key allowlist

**File:** `src/main/ipc/handlers/settings.ts`

```typescript
const ALLOWED_SETTING_KEYS = new Set([
  'tax_rate', 'currency_symbol', 'loyalty_rate',
  'enforce_shift_required', 'default_kitchen_printer',
  'default_receipt_printer', 'banks',
  // add other legitimate UI-controlled keys here
])
// In settings:set handler, before write:
if (!ALLOWED_SETTING_KEYS.has(key)) throw new Error(`مفتاح إعدادات غير مسموح: ${key}`)
```

## R3-H9 · Z-Report print failure surfaces a warning

**File:** `src/renderer/screens/Cash/CashScreen.tsx` ~line 44

Replace the silent `.catch(() => {})` with:

```tsx
.catch(_err => toast('تحذير: فشل طباعة تقرير Z — تم حفظ الوردية. يمكن إعادة الطباعة من التقارير'))
```

## R3-H10 · Cash input NaN/negative guard

**File:** `src/renderer/screens/POS/POSScreen.tsx` ~line 542

```tsx
onChange={e => {
  const v = parseInt(e.target.value || '0')
  if (isNaN(v) || v < 0) return
  setCashIn(String(Math.min(v, total)))
}}
```

## R3-H11 · Reset discount when cart empties

**File:** `src/renderer/screens/POS/POSScreen.tsx` `updQty` handler ~line 224

After filtering items, if `order.length === 0` (or `next.length === 0`), also call:
`setDiscount(0); setDiscountReason(''); setDiscountType('pct'); setShowDiscount(false)`

## R3-H12 · Stable receipt item keys

**File:** `src/renderer/screens/POS/POSScreen.tsx` ~line 331

Use receipt-scoped keys: `key={`receipt_${receipt.num}_${i}`}` (include the array index).

---

# 🟡 MEDIUM FIXES — UX & Consistency

## R3-M1 · Reports: end_date >= start_date guard
**File:** `src/renderer/screens/Reports/ReportsScreen.tsx` ~line 44
Before calling `orders:list`, if `startDate && endDate && new Date(endDate) < new Date(startDate)` then `toast('تاريخ النهاية يجب أن يكون بعد تاريخ البداية'); return`.

## R3-M2 · Reports: error state on fetch
**File:** `src/renderer/screens/Reports/ReportsScreen.tsx` ~line 95
Wrap the fetch in try/catch, set `error` state, render an error card instead of stale chart.

## R3-M3 · CashScreen variance warning
**File:** `src/renderer/screens/Cash/CashScreen.tsx` ~line 95
Before calling `shifts:close`, if `Math.abs(diff) > Math.max(1000, expected * 0.05)` show a confirm modal: "الفارق كبير — هل أنت متأكد؟"

## R3-M4 · Receipt: employee name + tax line
**File:** `src/renderer/screens/POS/POSScreen.tsx` receipt section
Add `employeeName` (from session) above items list. After total, if `tax_rate > 0`, render a `<div>ضريبة: {tax}</div>` line.

## R3-M5 · Currency change UX
**File:** `src/renderer/screens/Settings/SettingsScreen.tsx`
Either block currency change while a shift is open (simplest) OR broadcast a setting-changed event that POS subscribes to. Recommend the block-while-open approach.

## R3-M6 · Modal focus trap
**File:** `src/renderer/components/Modal.tsx`
Add Tab/Shift+Tab focus cycling within the modal and restore previous-focus on unmount. Implement with a small custom hook; do not add a new dependency.

## R3-M7 · Card hover via CSS, not useState
**File:** `src/renderer/components/Card.tsx` ~line 13
Drop `useState(false)` for hover. Use a CSS `:hover` selector on the wrapper element.

## R3-M8 · Persist active POS cart to localStorage
**File:** `src/renderer/screens/POS/POSScreen.tsx`
Mirror held-order pattern: on every `setOrder`, write to localStorage; on mount, if a saved cart exists, prompt the cashier to restore.

## R3-M9 · Streaming SHA256 in backup
**File:** `src/main/ipc/backup.ts` `computeSha256`
Replace synchronous read with `crypto.createHash('sha256')` over `fs.createReadStream(path)` to avoid blocking IPC for large DBs.

## R3-M10 · Held-order list cap
**File:** `src/renderer/screens/POS/POSScreen.tsx`
Cap held orders at 50 most recent; when adding the 51st, drop the oldest.

## R3-M11 · Locale on toLocaleString
**Files:** Renderer-wide
Pass `'ar-EG'` (or `'ar-SA'`) to every `toLocaleString()` call that formats currency or counts.

## R3-M12 · Reset payment fields on payMode change
**File:** `src/renderer/screens/POS/POSScreen.tsx`
When `payMode` changes, reset the inactive-mode fields (`cashIn`, `bankRef`, `bank`, `cashPart`).

---

# 🟢 VERIFIED CORRECT — DO NOT TOUCH

- `OrderRepo.create` is already fully wrapped in `db.transaction()`.
- `MAX(0, val1 - val2)` in SQLite is a valid two-argument scalar — leave the loyalty deduction as-is.
- `Toast.tsx` round-1 RTL fix (`insetInlineEnd`) is in place.
- `Modal.tsx` round-1 ARIA additions are in place.
- WAL + foreign_keys + synchronous=FULL are enabled.
- bcrypt cost 10 + lockout-after-5 in `EmployeeRepo.login` is correct.
- contextIsolation + nodeIntegration:false + typed contextBridge — preload boundary is intact.
- Backup restore correctly calls `app.relaunch(); app.exit(0)` after closing the DB; the closed-singleton risk does not actually fire.

---

# Verification — Run All Of These Before Calling This Done

1. **Multi-instance (R3-C5):** Double-click app icon. Second instance should focus the first window and exit.
2. **Schema mismatch (R3-C6):** Take a backup, hand-edit the manifest's `schema_version` to `"001"`, attempt restore — should refuse with the Arabic error.
3. **Crash recovery (R3-H4):** Open a shift, kill app via Task Manager, relaunch, log in as admin — orphan shift should be auto-closed and logged.
4. **Concurrent category delete (R3-C1):** In DevTools, run `await Promise.all([api.categories.delete('X'), api.categories.delete('X')])`. Items should not be left orphaned in either case.
5. **Atomic stock correction (R3-C4):** Set kitchen stock=1, fire two simultaneous `orders:correct` for the same item — exactly one succeeds, the other gets the Arabic insufficient-stock error.
6. **Forged clockIn (R3-C10):** As cashier in DevTools, `await api.shifts.clockIn(SOMEONE_ELSE_ID, shiftId)`. Inspect `clock_log` — must record the *session*'s employeeId, not the parameter.
7. **Long-shift memory (R3-H2, R3-H3):** Leave kitchen screen open 4+ hours with frequent filter changes. Chrome task manager should show flat memory.
8. **Cart persistence (R3-M8):** Add items to cart, press Ctrl+R. Cart should restore via prompt.
9. **Variance warning (R3-M3):** Close shift £E1 short — proceeds. Close £E50,000 short — confirm dialog appears.
10. **Receipt content (R3-M4):** Place an order. Receipt must display employee name; if tax > 0, a tax line.

After all checks pass, run `npm run typecheck` and `npm run build` — both must succeed without warnings.

---

# Out of Scope (Track Separately)

- **Convert REAL → INTEGER for `purchases.total_cost`, `purchase_items.unit_cost`, `purchase_items.total_cost`** — money precision concern, but requires a coordinated migration + UI changes. Open as "Round 4" ticket.
- **Convert REAL → INTEGER for inventory units** — fractional units (grams, ml) are intentional. Float drift is small enough that nightly stocktake corrections absorb it. Defer.
- **Printer reliability hardening** (queueing, retry, offline detection) — feature project, not a bug fix.
