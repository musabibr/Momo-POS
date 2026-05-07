import { getDb } from '../connection'

export class ReportRepo {
  static salesSummary(filters?: { startDate?: string; endDate?: string; shiftId?: number }) {
    const db = getDb()
    let where = "WHERE o.status = 'confirmed'"
    const params: any[] = []
    if (filters?.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters?.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate) }
    if (filters?.shiftId) { where += ' AND o.shift_id = ?'; params.push(filters.shiftId) }

    return db.prepare(`
      SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(o.total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN o.pay_mode = 'cash' THEN o.total WHEN o.pay_mode = 'split' THEN o.cash_part ELSE 0 END), 0) as total_cash,
        COALESCE(SUM(CASE WHEN o.pay_mode = 'bank' THEN o.total WHEN o.pay_mode = 'split' THEN o.bank_part ELSE 0 END), 0) as total_bank,
        COALESCE(SUM(o.disc_amount), 0) as total_discount
      FROM orders o ${where}
    `).get(...params)
  }

  static hourlySales(filters?: { startDate?: string; endDate?: string }) {
    const db = getDb()
    let where = "WHERE o.status = 'confirmed'"
    const params: any[] = []
    if (filters?.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters?.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate) }

    return db.prepare(`
      SELECT
        CAST(strftime('%H', o.created_at) AS INTEGER) as hour,
        COUNT(*) as order_count,
        COALESCE(SUM(o.total), 0) as total
      FROM orders o ${where}
      GROUP BY hour ORDER BY hour
    `).all(...params)
  }

  static itemRanking(filters?: { startDate?: string; endDate?: string; limit?: number }) {
    const db = getDb()
    let where = "WHERE o.status = 'confirmed'"
    const params: any[] = []
    if (filters?.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters?.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate) }
    const limit = filters?.limit || 20

    return db.prepare(`
      SELECT
        oi.item_id,
        i.name as item_name,
        i.emoji,
        SUM(oi.qty) as total_qty,
        SUM(oi.unit_price * oi.qty) as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN items i ON i.id = oi.item_id
      ${where}
      GROUP BY oi.item_id
      ORDER BY total_qty DESC
      LIMIT ?
    `).all(...params, limit)
  }

  static paymentBreakdown(filters?: { startDate?: string; endDate?: string }) {
    const db = getDb()
    let where = "WHERE o.status = 'confirmed'"
    const params: any[] = []
    if (filters?.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters?.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate) }

    return db.prepare(`
      SELECT
        o.pay_mode,
        COUNT(*) as count,
        COALESCE(SUM(o.total), 0) as total
      FROM orders o ${where}
      GROUP BY o.pay_mode
    `).all(...params)
  }
}
