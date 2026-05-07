import { getDb } from '../connection'

export class CustomerRepo {
  static list(search?: string) {
    const db = getDb()
    if (search) {
      return db.prepare(`SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name`)
        .all(`%${search}%`, `%${search}%`)
    }
    return db.prepare(`SELECT * FROM customers ORDER BY name`).all()
  }

  static getById(id: number) {
    return getDb().prepare(`SELECT * FROM customers WHERE id = ?`).get(id)
  }

  static findByPhone(phone: string) {
    return getDb().prepare(`SELECT * FROM customers WHERE phone = ?`).get(phone) || null
  }

  static create(data: any) {
    const db = getDb()
    const result = db.prepare(`
      INSERT INTO customers (name, phone, notes, is_vip, is_blacklist)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.name, data.phone || null, data.notes || null,
      data.isVip ? 1 : 0, data.isBlacklist ? 1 : 0)
    return db.prepare(`SELECT * FROM customers WHERE id = ?`).get(result.lastInsertRowid)
  }

  static update(id: number, data: any) {
    const db = getDb()
    const sets: string[] = []
    const vals: any[] = []
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
    if (data.phone !== undefined) { sets.push('phone = ?'); vals.push(data.phone) }
    if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(data.notes) }
    if (data.isVip !== undefined) { sets.push('is_vip = ?'); vals.push(data.isVip ? 1 : 0) }
    if (data.isBlacklist !== undefined) { sets.push('is_blacklist = ?'); vals.push(data.isBlacklist ? 1 : 0) }
    if (sets.length > 0) {
      vals.push(id)
      db.prepare(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    }
    return db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id)
  }

  static addPoints(id: number, orderId: number, amount: number) {
    const db = getDb()
    // Idempotency: check if points were already awarded for this order
    const existing = db.prepare(
      `SELECT id FROM action_log WHERE action = 'LOYALTY_POINTS' AND detail LIKE '%"orderId":' || ? || '%' LIMIT 1`
    ).get(orderId) as any
    if (existing) return // Already awarded for this order

    const loyaltyRate = db.prepare(`SELECT value FROM settings WHERE key = 'loyalty_rate'`).get() as any
    const rate = parseInt(loyaltyRate?.value || '1000')
    if (rate <= 0) return
    const newPoints = Math.floor(amount / rate)
    if (newPoints > 0) {
      db.prepare(`UPDATE customers SET points = points + ?, total_spend = total_spend + ?, visit_count = visit_count + 1 WHERE id = ?`)
        .run(newPoints, amount, id)
      db.prepare(`INSERT INTO action_log (action, detail) VALUES ('LOYALTY_POINTS', ?)`)
        .run(JSON.stringify({ customerId: id, orderId, amount, pointsEarned: newPoints }))
    }
  }

  static redeemPoints(id: number, points: number) {
    const db = getDb()
    const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id) as any
    if (!customer || customer.points < points) throw new Error('نقاط غير كافية')
    const redemptionValue = db.prepare(`SELECT value FROM settings WHERE key = 'loyalty_redemption_value'`).get() as any
    const valuePerPoint = parseInt(redemptionValue?.value || '100')
    const discountAmount = Math.floor(points * valuePerPoint / 100)
    db.prepare(`UPDATE customers SET points = points - ? WHERE id = ?`).run(points, id)
    return discountAmount
  }

  static getOrderHistory(customerId: number, limit = 10) {
    const db = getDb()
    const orders = db.prepare(`
      SELECT id, order_num, total, pay_mode, created_at FROM orders
      WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(customerId, limit) as any[]

    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id)
      const placeholders = orderIds.map(() => '?').join(',')
      const items = db.prepare(`
        SELECT oi.id, oi.order_id, oi.qty, oi.unit_price, oi.variation_label, oi.selections, i.name as item_name
        FROM order_items oi
        JOIN items i ON i.id = oi.item_id
        WHERE oi.order_id IN (${placeholders})
      `).all(...orderIds) as any[]

      const itemsByOrder: Record<number, any[]> = {}
      for (const item of items) {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
        itemsByOrder[item.order_id].push(item)
      }

      for (const o of orders) {
        o.items = itemsByOrder[o.id] || []
      }
    }
    return orders
  }

  static getTopItems(customerId: number, limit = 5) {
    const db = getDb()
    return db.prepare(`
      SELECT i.name as item_name, SUM(oi.qty) as total_qty, SUM(oi.unit_price * oi.qty) as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN items i ON i.id = oi.item_id
      WHERE o.customer_id = ? AND o.status = 'confirmed'
      GROUP BY oi.item_id
      ORDER BY total_qty DESC
      LIMIT ?
    `).all(customerId, limit)
  }
}
