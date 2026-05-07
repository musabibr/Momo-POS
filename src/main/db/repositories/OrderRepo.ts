import { getDb } from '../connection'

export class OrderRepo {
  static create(data: any) {
    const db = getDb()

    return db.transaction(() => {
      // 1. Check idempotency
      if (data.clientOrderId) {
        const existing = db.prepare(`SELECT id FROM orders WHERE client_order_id = ?`).get(data.clientOrderId) as any
        if (existing) {
          return OrderRepo.getById(existing.id)
        }
      }

      // 2. Server-side math validation
      const expectedTotal = data.subtotal - (data.discAmount || 0)
      if (data.total !== expectedTotal) {
        throw new Error('الإجمالي لا يتطابق مع المجموع بعد الخصم')
      }
      if (data.payMode === 'split') {
        const splitSum = (data.cashPart || 0) + (data.bankPart || 0)
        if (splitSum !== data.total) {
          throw new Error('مجموع أجزاء الدفع لا يساوي الإجمالي')
        }
      }

      // 3. Generate sequential order_num for this shift
      const maxNum = db.prepare(
        `SELECT COALESCE(MAX(order_num), 0) as max_num FROM orders WHERE shift_id = ?`
      ).get(data.shiftId || null) as any
      const orderNum = (maxNum?.max_num || 0) + 1

      // 4. Insert order
      const result = db.prepare(`
        INSERT INTO orders (client_order_id, order_num, subtotal, disc_amount, disc_reason, disc_type, disc_value,
          total, pay_mode, bank_name, bank_ref, cash_in, cash_change, cash_part, bank_part,
          customer_id, employee_id, shift_id, order_type, order_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
      `).run(
        data.clientOrderId || null, orderNum, data.subtotal, data.discAmount || 0,
        data.discReason || null, data.discType || null, data.discValue || null,
        data.total, data.payMode, data.bankName || null, data.bankRef || null,
        data.cashIn || null, data.cashChange || null, data.cashPart || null, data.bankPart || null,
        data.customerId || null, data.employeeId || null, data.shiftId || null,
        data.orderType || null, data.orderNote || null
      )
      const orderId = result.lastInsertRowid as number

      // 5. Insert order items (snapshot unit_cost for P&L)
      const itemStmt = db.prepare(`
        INSERT INTO order_items (order_id, item_id, qty, unit_price, unit_cost, variation_label, selections, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const costLookup = db.prepare(`SELECT cost FROM items WHERE id = ?`)
      for (const item of data.items) {
        const costRow = costLookup.get(item.itemId) as any
        const unitCost = costRow?.cost || 0
        itemStmt.run(
          orderId, item.itemId, item.qty, item.unitPrice, unitCost,
          item.variationLabel || null,
          item.selections ? JSON.stringify(item.selections) : null,
          item.note || null
        )
      }

      // 6. Deduct stock via recipes — from KITCHEN location
      const enforceSetting = db.prepare(`SELECT value FROM settings WHERE key = 'enforce_kitchen_stock'`).get() as any
      const enforceKitchenStock = enforceSetting?.value === 'true'

      const recipeStmt = db.prepare(`SELECT * FROM recipes WHERE item_id = ?`)
      const adjStmt = db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, order_id, location_id)
        VALUES (?, ?, 'sale', ?, ?, ?, 'kitchen')
      `)
      // Atomic check-and-deduct: only succeeds if current quantity >= deductQty
      const atomicDeductStmt = db.prepare(`
        UPDATE inventory_stock SET quantity = quantity - ?
        WHERE item_id = ? AND location_id = 'kitchen' AND quantity >= ?
      `)
      const nameStmt = db.prepare(`SELECT name FROM inventory_items WHERE id = ?`)

      for (const item of data.items) {
        const recipes = recipeStmt.all(item.itemId) as any[]
        for (const recipe of recipes) {
          const deductQty = recipe.quantity * item.qty

          if (enforceKitchenStock) {
            const result = atomicDeductStmt.run(deductQty, recipe.ingredient_id, deductQty)
            if (result.changes === 0) {
              const itemName = (nameStmt.get(recipe.ingredient_id) as any)?.name || recipe.ingredient_id
              throw new Error(`مخزون المطبخ غير كافي: ${itemName}`)
            }
          } else {
            // Ensure row exists (upsert) then deduct, clamping at zero
            db.prepare(`
              INSERT INTO inventory_stock (item_id, location_id, quantity)
              VALUES (?, 'kitchen', 0)
              ON CONFLICT(item_id, location_id) DO NOTHING
            `).run(recipe.ingredient_id)
            db.prepare(`UPDATE inventory_stock SET quantity = MAX(0, quantity - ?) WHERE item_id = ? AND location_id = 'kitchen'`)
              .run(deductQty, recipe.ingredient_id)
          }

          adjStmt.run(recipe.ingredient_id, -deductQty, `طلب #${orderNum}`, data.employeeId || null, orderId)
        }
      }

      // 7. Customer loyalty
      if (data.customerId) {
        const loyaltyRate = db.prepare(`SELECT value FROM settings WHERE key = 'loyalty_rate'`).get() as any
        const parsedRate = parseInt(loyaltyRate?.value || '1000')
        const rate = Math.max(1, isNaN(parsedRate) ? 1000 : parsedRate)
        const newPoints = Math.floor(data.total / rate)
        db.prepare(`
          UPDATE customers SET points = points + ?, total_spend = total_spend + ?, visit_count = visit_count + 1
          WHERE id = ?
        `).run(newPoints, data.total, data.customerId)
      }

      // 8. Action log
      db.prepare(`
        INSERT INTO action_log (employee_id, action, detail)
        VALUES (?, 'ORDER_CONFIRM', ?)
      `).run(data.employeeId || null, JSON.stringify({
        orderId, orderNum, total: data.total, payMode: data.payMode,
        itemCount: data.items.length
      }))

      return OrderRepo.getById(orderId)
    })()
  }

  static getById(id: number) {
    const db = getDb()
    const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as any
    if (!order) return null
    const items = db.prepare(`
      SELECT oi.*, i.name FROM order_items oi
      JOIN items i ON i.id = oi.item_id
      WHERE oi.order_id = ?
    `).all(id)
    return { ...order, items }
  }

  static list(filters: any = {}) {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params: any[] = []

    if (filters.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate) }
    if (filters.shiftId) { where += ' AND o.shift_id = ?'; params.push(filters.shiftId) }
    if (filters.employeeId) { where += ' AND o.employee_id = ?'; params.push(filters.employeeId) }
    if (filters.payMode) { where += ' AND o.pay_mode = ?'; params.push(filters.payMode) }
    if (filters.status) { where += ' AND o.status = ?'; params.push(filters.status) }
    if (filters.orderType) { where += ' AND o.order_type = ?'; params.push(filters.orderType) }
    if (filters.orderNum) { where += ' AND o.order_num = ?'; params.push(filters.orderNum) }

    const orders = db.prepare(`
      SELECT o.* FROM orders o ${where} ORDER BY o.created_at DESC LIMIT 5000
    `).all(...params) as any[]

    if (orders.length === 0) return []

    const ids = orders.map((o: any) => o.id)
    // Batch in chunks of 500 to stay under SQLite's SQLITE_MAX_VARIABLE_NUMBER limit
    const itemsByOrder = new Map<number, any[]>()
    const CHUNK = 500
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK)
      const rows = db.prepare(`
        SELECT oi.*, i.name FROM order_items oi
        JOIN items i ON i.id = oi.item_id
        WHERE oi.order_id IN (${chunk.map(() => '?').join(',')})
      `).all(...chunk) as any[]
      for (const it of rows) {
        if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, [])
        itemsByOrder.get(it.order_id)!.push(it)
      }
    }

    return orders.map((o: any) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }))
  }


  static voidOrder(orderId: number, employeeId: number, reason: string) {
    const db = getDb()
    return db.transaction(() => {
      const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as any
      if (!order) throw new Error('الطلب غير موجود')
      if (order.status === 'voided') throw new Error('الطلب ملغي مسبقاً')

      const orderItems = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(orderId) as any[]

      // 1. Mark as voided
      db.prepare(`UPDATE orders SET status = 'voided' WHERE id = ?`).run(orderId)

      // 2. Restore kitchen stock via recipes
      const recipeStmt = db.prepare(`SELECT * FROM recipes WHERE item_id = ?`)
      for (const item of orderItems) {
        const recipes = recipeStmt.all(item.item_id) as any[]
        for (const recipe of recipes) {
          const restoreQty = recipe.quantity * item.qty
          db.prepare(`
            UPDATE inventory_stock SET quantity = quantity + ? WHERE item_id = ? AND location_id = 'kitchen'
          `).run(restoreQty, recipe.ingredient_id)

          db.prepare(`
            INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, order_id, location_id)
            VALUES (?, ?, 'add', ?, ?, ?, 'kitchen')
          `).run(recipe.ingredient_id, restoreQty, `إلغاء طلب #${order.order_num}`, employeeId, orderId)
        }
      }

      // 3. Reverse customer loyalty
      if (order.customer_id) {
        const loyaltyRate = db.prepare(`SELECT value FROM settings WHERE key = 'loyalty_rate'`).get() as any
        const parsedRate = parseInt(loyaltyRate?.value || '1000')
        const rate = Math.max(1, isNaN(parsedRate) ? 1000 : parsedRate)
        const revokedPoints = Math.floor(order.total / rate)
        db.prepare(`
          UPDATE customers SET
            points = MAX(0, points - ?),
            total_spend = MAX(0, total_spend - ?),
            visit_count = MAX(0, visit_count - 1)
          WHERE id = ?
        `).run(revokedPoints, order.total, order.customer_id)
      }

      // 4. Audit log
      db.prepare(`
        INSERT INTO action_log (employee_id, action, detail)
        VALUES (?, 'ORDER_VOID', ?)
      `).run(employeeId, JSON.stringify({ orderId, orderNum: order.order_num, reason }))
    })()
  }

  /**
   * Correct an existing confirmed order — change item quantities or remove items.
   * correctedItems: Array of { orderItemId, newQty } — newQty=0 means remove.
   * Only items present in correctedItems are changed; others stay untouched.
   */
  static correctOrder(orderId: number, employeeId: number, reason: string, correctedItems: { orderItemId: number; newQty: number }[]) {
    const db = getDb()
    return db.transaction(() => {
      const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as any
      if (!order) throw new Error('الطلب غير موجود')
      if (order.status === 'voided') throw new Error('لا يمكن تعديل طلب ملغي')

      const allItems = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(orderId) as any[]
      const recipeStmt = db.prepare(`SELECT * FROM recipes WHERE item_id = ?`)
      const adjStmt = db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, order_id, location_id)
        VALUES (?, ?, ?, ?, ?, ?, 'kitchen')
      `)

      // Build correction map: orderItemId -> newQty
      const corrMap = new Map<number, number>()
      for (const c of correctedItems) corrMap.set(c.orderItemId, Math.max(0, c.newQty))

      let newSubtotal = 0

      for (const item of allItems) {
        const newQty = corrMap.has(item.id) ? corrMap.get(item.id)! : item.qty
        const diff = item.qty - newQty // positive = removed items

        if (diff !== 0) {
          // 1. Restore stock for removed quantity via recipes
          const recipes = recipeStmt.all(item.item_id) as any[]
          for (const recipe of recipes) {
            const restoreQty = recipe.quantity * diff
            db.prepare(`UPDATE inventory_stock SET quantity = quantity + ? WHERE item_id = ? AND location_id = 'kitchen'`)
              .run(restoreQty, recipe.ingredient_id)
            adjStmt.run(recipe.ingredient_id, restoreQty, diff > 0 ? 'correction_restore' : 'correction_deduct',
              `تصحيح طلب #${order.order_num}`, employeeId, orderId)
          }

          // 2. Update or delete the order item
          if (newQty === 0) {
            db.prepare(`DELETE FROM order_items WHERE id = ?`).run(item.id)
          } else {
            db.prepare(`UPDATE order_items SET qty = ? WHERE id = ?`).run(newQty, item.id)
          }
        }

        if (newQty > 0) {
          newSubtotal += item.unit_price * newQty
        }
      }

      // 3. Check if all items removed — void the order instead
      const remainingItems = db.prepare(`SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`).get(orderId) as any
      if (remainingItems.cnt === 0) {
        db.prepare(`UPDATE orders SET status = 'voided' WHERE id = ?`).run(orderId)
        // Reverse customer loyalty fully
        if (order.customer_id) {
          const loyaltyRate = db.prepare(`SELECT value FROM settings WHERE key = 'loyalty_rate'`).get() as any
          const rate = Math.max(1, parseInt(loyaltyRate?.value || '1000') || 1000)
          const revokedPoints = Math.floor(order.total / rate)
          db.prepare(`UPDATE customers SET points = MAX(0, points - ?), total_spend = MAX(0, total_spend - ?), visit_count = MAX(0, visit_count - 1) WHERE id = ?`)
            .run(revokedPoints, order.total, order.customer_id)
        }
        db.prepare(`INSERT INTO action_log (employee_id, action, detail) VALUES (?, 'ORDER_CORRECT_VOID', ?)`)
          .run(employeeId, JSON.stringify({ orderId, orderNum: order.order_num, reason }))
        return OrderRepo.getById(orderId)
      }

      // 4. Recalculate totals — keep same discount type/value
      let newDiscAmt = 0
      if (order.disc_type === 'pct' && order.disc_value) {
        newDiscAmt = Math.round(newSubtotal * order.disc_value / 100)
      } else if (order.disc_type === 'amt' && order.disc_value) {
        newDiscAmt = Math.min(order.disc_value, newSubtotal)
      }
      const newTotal = Math.max(0, newSubtotal - newDiscAmt)

      db.prepare(`UPDATE orders SET subtotal = ?, disc_amount = ?, total = ? WHERE id = ?`)
        .run(newSubtotal, newDiscAmt, newTotal, orderId)

      // 5. Adjust customer loyalty for the difference
      if (order.customer_id) {
        const loyaltyRate = db.prepare(`SELECT value FROM settings WHERE key = 'loyalty_rate'`).get() as any
        const rate = Math.max(1, parseInt(loyaltyRate?.value || '1000') || 1000)
        const oldPoints = Math.floor(order.total / rate)
        const newPoints = Math.floor(newTotal / rate)
        const pointsDiff = oldPoints - newPoints
        if (pointsDiff > 0) {
          db.prepare(`UPDATE customers SET points = MAX(0, points - ?), total_spend = MAX(0, total_spend - ?) WHERE id = ?`)
            .run(pointsDiff, order.total - newTotal, order.customer_id)
        }
      }

      // 6. Audit log
      db.prepare(`INSERT INTO action_log (employee_id, action, detail) VALUES (?, 'ORDER_CORRECT', ?)`)
        .run(employeeId, JSON.stringify({
          orderId, orderNum: order.order_num, reason,
          oldTotal: order.total, newTotal,
          changes: correctedItems
        }))

      return OrderRepo.getById(orderId)
    })()
  }

  /** Server-side sales summary for Reports */
  static salesSummary(filters: any = {}) {
    const db = getDb()
    let where = `WHERE status = 'confirmed'`
    const params: any[] = []
    if (filters.startDate) { where += ' AND created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND created_at <= ?'; params.push(filters.endDate) }

    const stats = db.prepare(`
      SELECT COUNT(*) as total_orders,
             COALESCE(SUM(total), 0) as total_revenue,
             COALESCE(SUM(disc_amount), 0) as total_discount,
             COALESCE(AVG(total), 0) as avg_order
      FROM orders ${where}
    `).get(...params) as any

    // COGS: sum of (unit_cost * qty) across all order items for matching orders
    const cogsRow = db.prepare(`
      SELECT COALESCE(SUM(oi.unit_cost * oi.qty), 0) as total_cost
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      ${where.replace(/\b(status|created_at|shift_id)\b/g, 'o.$1')}
    `).get(...params) as any

    const byCash = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as sum FROM orders ${where} AND pay_mode='cash'`).get(...params) as any
    const byBank = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as sum FROM orders ${where} AND pay_mode='bank'`).get(...params) as any
    const bySplit = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as sum FROM orders ${where} AND pay_mode='split'`).get(...params) as any

    const totalRevenue = stats.total_revenue
    const totalCost = cogsRow.total_cost
    const grossProfit = totalRevenue - totalCost

    return {
      totalOrders: stats.total_orders,
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin: totalRevenue > 0 ? Math.round(grossProfit / totalRevenue * 100) : 0,
      totalDiscount: stats.total_discount,
      avgOrder: Math.round(stats.avg_order),
      cashCount: byCash.cnt, cashSum: byCash.sum,
      bankCount: byBank.cnt, bankSum: byBank.sum,
      splitCount: bySplit.cnt, splitSum: bySplit.sum
    }
  }

  /** Server-side item ranking for Reports */
  static itemRanking(filters: any = {}) {
    const db = getDb()
    let where = `WHERE o.status = 'confirmed'`
    const params: any[] = []
    if (filters.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate) }

    return db.prepare(`
      SELECT i.name, i.emoji, SUM(oi.qty) as total_qty, SUM(oi.qty * oi.unit_price) as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN items i ON i.id = oi.item_id
      ${where}
      GROUP BY oi.item_id
      ORDER BY total_revenue DESC
    `).all(...params)
  }

  /** Per-item profit breakdown for P&L report */
  static profitByItem(filters: any = {}) {
    const db = getDb()
    let where = `WHERE o.status = 'confirmed'`
    const params: any[] = []
    if (filters.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate) }

    return db.prepare(`
      SELECT i.name, i.emoji,
        SUM(oi.qty) as total_qty,
        SUM(oi.unit_price * oi.qty) as revenue,
        SUM(oi.unit_cost * oi.qty) as cost,
        SUM((oi.unit_price - oi.unit_cost) * oi.qty) as profit
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN items i ON i.id = oi.item_id
      ${where}
      GROUP BY oi.item_id
      ORDER BY profit DESC
    `).all(...params)
  }
}
