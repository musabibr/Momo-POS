import { getDb } from '../connection'

export class ActionLogRepo {
  /** Append-only: write a new log entry */
  static write(action: string, detail: any, employeeId?: number) {
    getDb().prepare(`INSERT INTO action_log (employee_id, action, detail) VALUES (?, ?, ?)`)
      .run(employeeId || null, action, typeof detail === 'string' ? detail : JSON.stringify(detail))
  }

  /** List log entries with optional filters. No DELETE handler exists — append-only by design. */
  static list(filters?: { startDate?: string; endDate?: string; employeeId?: number; action?: string; limit?: number }) {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params: any[] = []
    if (filters?.startDate) { where += ' AND al.created_at >= ?'; params.push(filters.startDate) }
    if (filters?.endDate) { where += ' AND al.created_at <= ?'; params.push(filters.endDate + ' 23:59:59') }
    if (filters?.employeeId) { where += ' AND al.employee_id = ?'; params.push(filters.employeeId) }
    if (filters?.action) { where += ' AND al.action = ?'; params.push(filters.action) }
    const limit = filters?.limit || 200

    return db.prepare(`
      SELECT al.*, e.name as employee_name FROM action_log al
      LEFT JOIN employees e ON e.id = al.employee_id
      ${where} ORDER BY al.created_at DESC LIMIT ?
    `).all(...params, limit)
  }
}
