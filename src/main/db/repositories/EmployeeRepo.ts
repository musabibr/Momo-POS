import { getDb } from '../connection'
import bcrypt from 'bcryptjs'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

/** Public view — safe for pre-auth (LoginScreen) endpoints */
const PUBLIC_COLS = 'id, name, role, active, created_at'
/** Admin view — includes lockout info for admin management panels */
const ADMIN_COLS = 'id, name, role, active, failed_attempts, locked_until, created_at'

export class EmployeeRepo {
  static list() {
    return getDb().prepare(`SELECT ${PUBLIC_COLS} FROM employees ORDER BY name`).all()
  }

  static getById(id: number) {
    return getDb().prepare(`SELECT ${ADMIN_COLS} FROM employees WHERE id = ?`).get(id)
  }

  static create(data: any) {
    const db = getDb()
    const pinHash = bcrypt.hashSync(data.pin, 10)
    const result = db.prepare(`INSERT INTO employees (name, role, pin_hash) VALUES (?, ?, ?)`)
      .run(data.name, data.role, pinHash)
    return db.prepare(`SELECT ${ADMIN_COLS} FROM employees WHERE id = ?`).get(result.lastInsertRowid)
  }

  static update(id: number, data: any) {
    const db = getDb()
    const sets: string[] = []
    const vals: any[] = []
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
    if (data.role !== undefined) { sets.push('role = ?'); vals.push(data.role) }
    if (data.active !== undefined) { sets.push('active = ?'); vals.push(data.active ? 1 : 0) }
    if (data.pin) {
      sets.push('pin_hash = ?')
      vals.push(bcrypt.hashSync(data.pin, 10))
    }
    if (data.locked_until !== undefined) {
      sets.push('locked_until = ?')
      vals.push(data.locked_until)
    }
    if (data.failed_attempts !== undefined) {
      sets.push('failed_attempts = ?')
      vals.push(data.failed_attempts)
    }
    if (sets.length > 0) {
      vals.push(id)
      db.prepare(`UPDATE employees SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    }
    return db.prepare(`SELECT ${ADMIN_COLS} FROM employees WHERE id = ?`).get(id)
  }

  static delete(id: number) {
    const db = getDb()
    const hasOrders = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE employee_id = ?`).get(id) as any
    const hasShifts = db.prepare(`SELECT COUNT(*) as cnt FROM shifts WHERE employee_id = ?`).get(id) as any
    if ((hasOrders && hasOrders.cnt > 0) || (hasShifts && hasShifts.cnt > 0)) {
      db.prepare(`UPDATE employees SET active = 0 WHERE id = ?`).run(id)
    } else {
      db.prepare(`DELETE FROM employees WHERE id = ?`).run(id)
    }
  }

  /**
   * Verify a specific employee's PIN with lockout enforcement.
   * Returns `{ valid, locked, lockedUntil }`.
   */
  static verifyPin(id: number, pin: string): { valid: boolean; locked?: boolean; lockedUntil?: string } {
    const db = getDb()
    const emp = db.prepare(
      `SELECT pin_hash, failed_attempts, locked_until FROM employees WHERE id = ? AND active = 1`
    ).get(id) as any
    if (!emp) return { valid: false }

    // Check lockout
    if (emp.locked_until) {
      const until = new Date(emp.locked_until)
      if (until > new Date()) {
        return { valid: false, locked: true, lockedUntil: emp.locked_until }
      }
      // Lockout expired — reset
      db.prepare(`UPDATE employees SET failed_attempts = 0, locked_until = NULL WHERE id = ?`).run(id)
    }

    const match = bcrypt.compareSync(pin, emp.pin_hash)
    if (match) {
      // Success — reset counter
      if (emp.failed_attempts > 0) {
        db.prepare(`UPDATE employees SET failed_attempts = 0 WHERE id = ?`).run(id)
      }
      return { valid: true }
    }

    // Failed — increment counter
    const newAttempts = (emp.failed_attempts || 0) + 1
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      const lockUntilStr = `${lockUntil.getFullYear()}-${String(lockUntil.getMonth()+1).padStart(2,'0')}-${String(lockUntil.getDate()).padStart(2,'0')} ${String(lockUntil.getHours()).padStart(2,'0')}:${String(lockUntil.getMinutes()).padStart(2,'0')}:${String(lockUntil.getSeconds()).padStart(2,'0')}`
      db.prepare(`UPDATE employees SET failed_attempts = ?, locked_until = ? WHERE id = ?`)
        .run(newAttempts, lockUntilStr, id)
      return { valid: false, locked: true, lockedUntil: lockUntilStr }
    }

    db.prepare(`UPDATE employees SET failed_attempts = ? WHERE id = ?`).run(newAttempts, id)
    return { valid: false }
  }

  static verifyAnyManagerPin(pin: string): { valid: boolean; employeeId?: number } {
    const managers = getDb().prepare(
      `SELECT id, pin_hash FROM employees WHERE role IN ('admin','manager') AND active = 1 AND (locked_until IS NULL OR locked_until < datetime('now'))`
    ).all() as any[]
    for (const m of managers) {
      if (bcrypt.compareSync(pin, m.pin_hash)) {
        return { valid: true, employeeId: m.id }
      }
    }
    return { valid: false }
  }

  /** Admin can clear lockout for any employee */
  static unlockEmployee(id: number) {
    getDb().prepare(`UPDATE employees SET failed_attempts = 0, locked_until = NULL WHERE id = ?`).run(id)
    return EmployeeRepo.getById(id)
  }
}
