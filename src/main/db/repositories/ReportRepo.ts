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

  static inventoryStats(filters?: { startDate?: string; endDate?: string }) {
    const db = getDb()
    
    // Total Inventory Value (Current snapshot, ignoring date filters)
    const valuation = db.prepare(`
      SELECT COALESCE(SUM(s.quantity * i.cost_per_unit), 0) as total_value
      FROM inventory_stock s
      JOIN inventory_items i ON i.id = s.item_id
      WHERE i.cost_per_unit > 0
    `).get() as any

    // Procurement Spend over time
    let pWhere = "WHERE 1=1"
    const pParams: any[] = []
    if (filters?.startDate) { pWhere += ' AND created_at >= ?'; pParams.push(filters.startDate) }
    if (filters?.endDate) { pWhere += ' AND created_at <= ?'; pParams.push(filters.endDate) }
    const purchases = db.prepare(`SELECT COALESCE(SUM(total_cost), 0) as total_spent FROM purchases ${pWhere}`).get(...pParams) as any

    // Wastage & Damages impact over time
    let dWhere = "WHERE sa.type = 'damage'"
    const dParams: any[] = []
    if (filters?.startDate) { dWhere += ' AND sa.created_at >= ?'; dParams.push(filters.startDate) }
    if (filters?.endDate) { dWhere += ' AND sa.created_at <= ?'; dParams.push(filters.endDate) }
    const damages = db.prepare(`
      SELECT COALESCE(SUM(sa.quantity * i.cost_per_unit), 0) as total_damage_cost
      FROM stock_adjustments sa
      JOIN inventory_items i ON i.id = sa.ingredient_id
      ${dWhere}
    `).get(...dParams) as any

    return {
      currentValuation: valuation.total_value,
      totalSpent: purchases.total_spent,
      totalDamageCost: damages.total_damage_cost
    }
  }

  static employeeStats(filters?: { startDate?: string; endDate?: string }) {
    const db = getDb()
    let where = "WHERE o.status = 'confirmed'"
    const params: any[] = []
    if (filters?.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters?.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate) }

    // Actually, let's just do an inner join for employees who made sales:
    const activeSalesByEmp = db.prepare(`
      SELECT 
        e.id, e.name, e.role,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total), 0) as total_sales,
        COALESCE(SUM(o.disc_amount), 0) as total_discounts
      FROM orders o
      JOIN employees e ON e.id = o.employee_id
      ${where}
      GROUP BY e.id
      ORDER BY total_sales DESC
    `).all(...params)

    // Void orders
    let voidWhere = "WHERE action = 'ORDER_VOID' OR action = 'VOID_ORDER'"
    const vParams: any[] = []
    if (filters?.startDate) { voidWhere += ' AND created_at >= ?'; vParams.push(filters.startDate) }
    if (filters?.endDate) { voidWhere += ' AND created_at <= ?'; vParams.push(filters.endDate) }
    const voids = db.prepare(`
      SELECT employee_id, COUNT(*) as void_count 
      FROM action_log 
      ${voidWhere}
      GROUP BY employee_id
    `).all(...vParams)

    return activeSalesByEmp.map((emp: any) => {
      const empVoid = (voids as any[]).find(v => v.employee_id === emp.id)
      return {
        ...emp,
        void_count: empVoid ? empVoid.void_count : 0
      }
    })
  }

  static customerStats(filters?: { startDate?: string; endDate?: string }) {
    const db = getDb()
    
    // Base stats
    const totalCustomers = db.prepare(`SELECT COUNT(*) as cnt FROM customers`).get() as any
    const totalVip = db.prepare(`SELECT COUNT(*) as cnt FROM customers WHERE is_vip = 1`).get() as any
    const totalPointsLiability = db.prepare(`SELECT COALESCE(SUM(points), 0) as total_points FROM customers`).get() as any

    // Points redeemed over time (from orders)
    let pWhere = "WHERE status = 'confirmed'"
    const pParams: any[] = []
    if (filters?.startDate) { pWhere += ' AND created_at >= ?'; pParams.push(filters.startDate) }
    if (filters?.endDate) { pWhere += ' AND created_at <= ?'; pParams.push(filters.endDate) }
    const pointsRedeemed = db.prepare(`
      SELECT COALESCE(SUM(disc_amount), 0) as total_points_discount 
      FROM orders 
      ${pWhere} AND disc_reason LIKE '%نقاط%'
    `).get(...pParams) as any

    // VIP upgrades over time (from action log)
    let vWhere = "WHERE action = 'AUTO_VIP_UPGRADE'"
    const vParams: any[] = []
    if (filters?.startDate) { vWhere += ' AND created_at >= ?'; vParams.push(filters.startDate) }
    if (filters?.endDate) { vWhere += ' AND created_at <= ?'; vParams.push(filters.endDate) }
    const upgrades = db.prepare(`SELECT COUNT(*) as cnt FROM action_log ${vWhere}`).get(...vParams) as any

    return {
      totalCustomers: totalCustomers.cnt,
      totalVip: totalVip.cnt,
      totalPointsLiability: totalPointsLiability.total_points,
      pointsRedeemedValue: pointsRedeemed.total_points_discount,
      vipUpgrades: upgrades.cnt
    }
  }
}
