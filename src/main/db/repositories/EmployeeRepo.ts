import { getDb } from '../connection'
import bcrypt from 'bcryptjs'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

/** Public view — safe for pre-auth (LoginScreen) endpoints */
const PUBLIC_COLS = 'id, name, role, username, active, created_at'
/** Admin view — includes lockout info for admin management panels */
const ADMIN_COLS = 'id, name, role, username, permissions, security_question, active, failed_attempts, locked_until, created_at'

export class EmployeeRepo {
  static list() {
    return getDb().prepare(`SELECT ${PUBLIC_COLS} FROM employees ORDER BY name`).all()
  }

  static getById(id: number) {
    return getDb().prepare(`SELECT ${ADMIN_COLS} FROM employees WHERE id = ?`).get(id)
  }

  static create(data: any) {
    const db = getDb()
    const pwHash = bcrypt.hashSync(data.password, 10)
    const secHash = data.securityAnswer ? bcrypt.hashSync(data.securityAnswer, 10) : null
    const perms = data.permissions ? JSON.stringify(data.permissions) : '[]'
    const result = db.prepare(`INSERT INTO employees (name, role, username, password_hash, pin_hash, permissions, security_question, security_answer_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(data.name, data.role, data.username, pwHash, pwHash, perms, data.securityQuestion || null, secHash)
    return db.prepare(`SELECT ${ADMIN_COLS} FROM employees WHERE id = ?`).get(result.lastInsertRowid)
  }

  static update(id: number, data: any) {
    const db = getDb()
    const sets: string[] = []
    const vals: any[] = []
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
    if (data.role !== undefined) { sets.push('role = ?'); vals.push(data.role) }
    if (data.username !== undefined) { sets.push('username = ?'); vals.push(data.username) }
    if (data.permissions !== undefined) { sets.push('permissions = ?'); vals.push(JSON.stringify(data.permissions)) }
    if (data.active !== undefined) { sets.push('active = ?'); vals.push(data.active ? 1 : 0) }
    if (data.password) {
      sets.push('password_hash = ?')
      vals.push(bcrypt.hashSync(data.password, 10))
    }
    if (data.securityQuestion !== undefined) {
      sets.push('security_question = ?')
      vals.push(data.securityQuestion)
    }
    if (data.securityAnswer) {
      sets.push('security_answer_hash = ?')
      vals.push(bcrypt.hashSync(data.securityAnswer, 10))
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
   * Login with username and password.
   * Returns `{ valid, employee, locked, lockedUntil }`.
   */
  static login(username: string, password: string): { valid: boolean; employee?: any; locked?: boolean; lockedUntil?: string } {
    const db = getDb()
    const emp = db.prepare(
      `SELECT id, password_hash, failed_attempts, locked_until FROM employees WHERE username = ? AND active = 1`
    ).get(username) as any
    if (!emp) return { valid: false }

    // Check lockout
    if (emp.locked_until) {
      const until = new Date(emp.locked_until)
      if (until > new Date()) {
        return { valid: false, locked: true, lockedUntil: emp.locked_until }
      }
      // Lockout expired — reset
      db.prepare(`UPDATE employees SET failed_attempts = 0, locked_until = NULL WHERE id = ?`).run(emp.id)
    }

    const match = bcrypt.compareSync(password, emp.password_hash)
    if (match) {
      // Success — reset counter
      if (emp.failed_attempts > 0) {
        db.prepare(`UPDATE employees SET failed_attempts = 0 WHERE id = ?`).run(emp.id)
      }
      return { valid: true, employee: EmployeeRepo.getById(emp.id) }
    }

    // Failed — increment counter
    const newAttempts = (emp.failed_attempts || 0) + 1
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      const lockUntilStr = `${lockUntil.getFullYear()}-${String(lockUntil.getMonth()+1).padStart(2,'0')}-${String(lockUntil.getDate()).padStart(2,'0')} ${String(lockUntil.getHours()).padStart(2,'0')}:${String(lockUntil.getMinutes()).padStart(2,'0')}:${String(lockUntil.getSeconds()).padStart(2,'0')}`
      db.prepare(`UPDATE employees SET failed_attempts = ?, locked_until = ? WHERE id = ?`)
        .run(newAttempts, lockUntilStr, emp.id)
      return { valid: false, locked: true, lockedUntil: lockUntilStr }
    }

    db.prepare(`UPDATE employees SET failed_attempts = ? WHERE id = ?`).run(newAttempts, emp.id)
    return { valid: false }
  }

  static verifyAnyManagerPin(pin: string): { valid: boolean; employeeId?: number } {
    const managers = getDb().prepare(
      `SELECT id, password_hash, permissions FROM employees WHERE active = 1 AND (locked_until IS NULL OR locked_until < datetime('now'))`
    ).all() as any[]
    
    for (const m of managers) {
      let perms = []
      try { perms = JSON.parse(m.permissions) } catch {}
      if (perms.includes('*') || perms.includes('pos_void')) {
        // Now using password_hash for the void PIN as well (the user can type their password in the void prompt)
        if (bcrypt.compareSync(pin, m.password_hash)) {
          return { valid: true, employeeId: m.id }
        }
      }
    }
    return { valid: false }
  }

  static getSecurityQuestion(username: string): string | null {
    const emp = getDb().prepare(`SELECT security_question FROM employees WHERE username = ? AND active = 1`).get(username) as any
    return emp ? emp.security_question : null
  }

  static resetPasswordWithSecurityAnswer(username: string, answer: string, newPassword: string): boolean {
    const db = getDb()
    const emp = db.prepare(`SELECT id, security_answer_hash FROM employees WHERE username = ? AND active = 1`).get(username) as any
    if (!emp || !emp.security_answer_hash) return false
    
    const match = bcrypt.compareSync(answer, emp.security_answer_hash)
    if (match) {
      const pwHash = bcrypt.hashSync(newPassword, 10)
      db.prepare(`UPDATE employees SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?`).run(pwHash, emp.id)
      return true
    }
    return false
  }

  /** Admin can clear lockout for any employee */
  static unlockEmployee(id: number) {
    getDb().prepare(`UPDATE employees SET failed_attempts = 0, locked_until = NULL WHERE id = ?`).run(id)
    return EmployeeRepo.getById(id)
  }
}
