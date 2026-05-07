import { getDb } from '../connection'

export class ShiftRepo {
  static open(employeeId: number, openFloat: number) {
    const db = getDb()
    const result = db.prepare(
      `INSERT INTO shifts (employee_id, open_float, opened_at) VALUES (?, ?, datetime('now','localtime'))`
    ).run(employeeId, openFloat)
    return db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(result.lastInsertRowid)
  }

  static close(shiftId: number, closeFloat: number) {
    const db = getDb()
    const result = db.transaction(() => {
      const stats = db.prepare(`
        SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue
        FROM orders WHERE shift_id = ? AND status = 'confirmed'
      `).get(shiftId) as any

      db.prepare(`
        UPDATE shifts SET closed_at = datetime('now','localtime'), close_float = ?,
          total_orders = ?, total_revenue = ?
        WHERE id = ?
      `).run(closeFloat, stats.total_orders, stats.total_revenue, shiftId)

      return db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(shiftId)
    })()

    // WAL checkpoint AFTER transaction commits — running inside causes lock
    try { db.pragma('wal_checkpoint(TRUNCATE)') } catch (_) {}

    return result
  }

  /** Update the opening float — records old/new in action_log */
  static updateOpenFloat(shiftId: number, newFloat: number, employeeId: number, reason: string) {
    const db = getDb()
    return db.transaction(() => {
      const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(shiftId) as any
      if (!shift) throw new Error('الوردية غير موجودة')
      if (shift.closed_at) throw new Error('لا يمكن تعديل وردية مغلقة')

      const oldFloat = shift.open_float
      db.prepare(`UPDATE shifts SET open_float = ? WHERE id = ?`).run(newFloat, shiftId)

      db.prepare(`INSERT INTO action_log (employee_id, action, detail) VALUES (?, 'SHIFT_FLOAT_EDIT', ?)`)
        .run(employeeId, JSON.stringify({ shiftId, oldFloat, newFloat, reason }))

      return db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(shiftId)
    })()
  }

  static getCurrent() {
    return getDb().prepare(`SELECT * FROM shifts WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1`).get() || null
  }

  static list() {
    return getDb().prepare(`SELECT * FROM shifts ORDER BY opened_at DESC LIMIT 200`).all()
  }

  /** Paginated list with filters and employee name */
  static listPaginated(page: number = 1, pageSize: number = 10, filters: any = {}) {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params: any[] = []

    if (filters.startDate) { where += ' AND s.opened_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND s.opened_at <= ?'; params.push(filters.endDate + ' 23:59:59') }
    if (filters.employeeId) { where += ' AND s.employee_id = ?'; params.push(filters.employeeId) }
    if (filters.status === 'open') { where += ' AND s.closed_at IS NULL' }
    if (filters.status === 'closed') { where += ' AND s.closed_at IS NOT NULL' }

    const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM shifts s ${where}`).get(...params) as any
    const total = countRow.cnt

    const offset = (page - 1) * pageSize
    const rows = db.prepare(`
      SELECT s.*, e.name as employee_name
      FROM shifts s
      LEFT JOIN employees e ON e.id = s.employee_id
      ${where}
      ORDER BY s.opened_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset)

    return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }
}
