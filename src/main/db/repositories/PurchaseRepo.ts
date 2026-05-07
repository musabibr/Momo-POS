import { getDb } from '../connection'

/**
 * PurchaseRepo — procurement domain.
 *
 * Single responsibility: purchase record lifecycle and stock intake.
 * Does NOT reach into menu-item tables or compute cost alerts —
 * that orchestration belongs in the handler layer if needed.
 */
export class PurchaseRepo {
  /**
   * Create a purchase: inserts purchase records, adds stock to 'main',
   * updates cost_per_unit to the newest purchase price.
   */
  static create(data: {
    supplierId: number
    items: Array<{
      itemId: number
      quantity: number
      packagingId?: number
      packagingQty?: number
      unitCost: number
    }>
    note?: string
    employeeId?: number
  }) {
    const db = getDb()

    return db.transaction(() => {
      // 1. Calculate total cost
      let totalCost = 0
      for (const item of data.items) {
        totalCost += item.quantity * item.unitCost
      }

      // 2. Insert purchase header
      const result = db.prepare(`
        INSERT INTO purchases (supplier_id, total_cost, note, employee_id)
        VALUES (?, ?, ?, ?)
      `).run(data.supplierId, totalCost, data.note || null, data.employeeId || null)
      const purchaseId = result.lastInsertRowid as number

      // 3. Process each item — stock intake + cost update
      for (const item of data.items) {
        const itemTotalCost = item.quantity * item.unitCost

        // Insert purchase_items row
        db.prepare(`
          INSERT INTO purchase_items (purchase_id, item_id, quantity, packaging_id, packaging_qty, unit_cost, total_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(purchaseId, item.itemId, item.quantity, item.packagingId || null,
          item.packagingQty || null, item.unitCost, itemTotalCost)

        // Add stock to 'main' location
        db.prepare(`
          INSERT INTO inventory_stock (item_id, location_id, quantity)
          VALUES (?, 'main', ?)
          ON CONFLICT(item_id, location_id) DO UPDATE SET quantity = quantity + ?
        `).run(item.itemId, item.quantity, item.quantity)

        // Update cost_per_unit to newest purchase price
        db.prepare(`UPDATE inventory_items SET cost_per_unit = ? WHERE id = ?`)
          .run(item.unitCost, item.itemId)

        // Log stock adjustment
        db.prepare(`
          INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
          VALUES (?, ?, 'add', ?, ?, 'main')
        `).run(item.itemId, item.quantity, `شراء #${purchaseId}`, data.employeeId || null)

        // Keep legacy stock column in sync
        const mainStock = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = 'main'`)
          .get(item.itemId) as any
        if (mainStock) {
          db.prepare(`UPDATE inventory_items SET stock = ? WHERE id = ?`).run(mainStock.quantity, item.itemId)
        }
      }

      // 4. Audit log
      db.prepare(`
        INSERT INTO action_log (employee_id, action, detail)
        VALUES (?, 'PURCHASE_CREATED', ?)
      `).run(data.employeeId || null, JSON.stringify({
        purchaseId, supplierId: data.supplierId, itemCount: data.items.length, totalCost
      }))

      return { purchaseId, totalCost }
    })()
  }

  static list(filters: { supplierId?: number; startDate?: string; endDate?: string; limit?: number } = {}) {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params: any[] = []
    if (filters.supplierId) { where += ' AND p.supplier_id = ?'; params.push(filters.supplierId) }
    if (filters.startDate) { where += ' AND p.created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND p.created_at <= ?'; params.push(filters.endDate + ' 23:59:59') }
    const limit = filters.limit || 500

    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      ${where} ORDER BY p.created_at DESC LIMIT ?
    `).all(...params, limit)

    return purchases.map((p: any) => ({
      ...p,
      items: db.prepare(`
        SELECT pi.*, inv.name as item_name, inv.unit,
               pkg.label as packaging_label
        FROM purchase_items pi
        JOIN inventory_items inv ON inv.id = pi.item_id
        LEFT JOIN item_packagings pkg ON pkg.id = pi.packaging_id
        WHERE pi.purchase_id = ?
      `).all(p.id)
    }))
  }

  static getById(id: number) {
    const db = getDb()
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id = ?
    `).get(id) as any
    if (!purchase) return null
    purchase.items = db.prepare(`
      SELECT pi.*, inv.name as item_name, inv.unit,
             pkg.label as packaging_label
      FROM purchase_items pi
      JOIN inventory_items inv ON inv.id = pi.item_id
      LEFT JOIN item_packagings pkg ON pkg.id = pi.packaging_id
      WHERE pi.purchase_id = ?
    `).all(id)
    return purchase
  }
}
