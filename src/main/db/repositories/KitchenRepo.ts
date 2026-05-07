import { getDb } from '../connection'

/**
 * KitchenRepo — all kitchen-domain business logic.
 *
 * Single responsibility: kitchen stock reads, adjustments, damage,
 * production (premade item creation), and today's order tickets (KDS).
 *
 * This repo is the SOLE owner of kitchen-location data access.
 * Other modules should NOT query inventory_stock WHERE location_id='kitchen' directly.
 */
export class KitchenRepo {

  // ── Kitchen Stock Reads ──────────────────

  static getStock() {
    const db = getDb()
    return db.prepare(`
      SELECT inv.*, ist.quantity as kitchen_stock,
        COALESCE((SELECT quantity FROM inventory_stock WHERE item_id = inv.id AND location_id = 'main'), 0) as main_stock
      FROM inventory_stock ist
      JOIN inventory_items inv ON inv.id = ist.item_id
      WHERE ist.location_id = 'kitchen' AND ist.quantity > 0 AND inv.archived = 0
      ORDER BY inv.name
    `).all()
  }

  // ── Create Premade Material (kitchen-only) ──────────────────

  /**
   * Create a new premade material directly in the kitchen.
   * This creates the inventory_items row + kitchen stock in one atomic operation.
   */
  static createPremade(data: { name: string; unit: string; quantity: number }, employeeId?: number) {
    const db = getDb()
    return db.transaction(() => {
      if (!data.name?.trim()) throw new Error('اسم المادة مطلوب')
      if (!data.unit?.trim()) throw new Error('الوحدة مطلوبة')
      if (data.quantity < 0) throw new Error('الكمية غير صالحة')

      // Check for duplicate name
      const existing = db.prepare(`SELECT id FROM inventory_items WHERE name = ? AND archived = 0`).get(data.name.trim()) as any
      if (existing) throw new Error(`المادة "${data.name}" موجودة بالفعل`)

      // Create inventory item with type='premade'
      const result = db.prepare(`
        INSERT INTO inventory_items (name, unit, stock, low_threshold, cost_per_unit, type)
        VALUES (?, ?, 0, 0, 0, 'premade')
      `).run(data.name.trim(), data.unit.trim())
      const itemId = result.lastInsertRowid as number

      // Initialize main stock at 0
      db.prepare(`INSERT OR IGNORE INTO inventory_stock (item_id, location_id, quantity) VALUES (?, 'main', 0)`).run(itemId)
      // Initialize kitchen stock with given quantity
      db.prepare(`INSERT OR IGNORE INTO inventory_stock (item_id, location_id, quantity) VALUES (?, 'kitchen', ?)`).run(itemId, data.quantity || 0)

      // Log the adjustment
      if (data.quantity > 0) {
        db.prepare(`
          INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
          VALUES (?, ?, 'add', ?, ?, 'kitchen')
        `).run(itemId, data.quantity, `إنشاء مادة جاهزة: ${data.name}`, employeeId || null)
      }

      return { id: itemId, name: data.name, unit: data.unit, quantity: data.quantity }
    })()
  }

  static editPremade(itemId: number, data: { name?: string; unit?: string }) {
    const db = getDb()
    return db.transaction(() => {
      const item = db.prepare(`SELECT * FROM inventory_items WHERE id = ? AND type = 'premade'`).get(itemId) as any
      if (!item) throw new Error('المادة غير موجودة أو ليست جاهزة')
      if (data.name?.trim()) {
        const dup = db.prepare(`SELECT id FROM inventory_items WHERE name = ? AND id != ? AND archived = 0`).get(data.name.trim(), itemId) as any
        if (dup) throw new Error(`الاسم "${data.name}" مستخدم بالفعل`)
        db.prepare(`UPDATE inventory_items SET name = ? WHERE id = ?`).run(data.name.trim(), itemId)
      }
      if (data.unit?.trim()) {
        db.prepare(`UPDATE inventory_items SET unit = ? WHERE id = ?`).run(data.unit.trim(), itemId)
      }
    })()
  }

  static deletePremade(itemId: number) {
    const db = getDb()
    return db.transaction(() => {
      const item = db.prepare(`SELECT * FROM inventory_items WHERE id = ? AND type = 'premade'`).get(itemId) as any
      if (!item) throw new Error('المادة غير موجودة أو ليست جاهزة')
      // Archive instead of hard delete
      db.prepare(`UPDATE inventory_items SET archived = 1 WHERE id = ?`).run(itemId)
      db.prepare(`DELETE FROM inventory_stock WHERE item_id = ?`).run(itemId)
    })()
  }

  // ── Kitchen Stock Adjustments ──────────────────

  static adjustStock(itemId: number, qty: number, type: 'add' | 'remove', reason: string, employeeId?: number) {
    const db = getDb()
    return db.transaction(() => {
      const absQty = Math.abs(qty)
      const logQty = type === 'add' ? absQty : -absQty

      // Ensure a kitchen stock row exists for this item
      db.prepare(`INSERT OR IGNORE INTO inventory_stock (item_id, location_id, quantity) VALUES (?, 'kitchen', 0)`)
        .run(itemId)

      if (type === 'add') {
        db.prepare(`UPDATE inventory_stock SET quantity = quantity + ? WHERE item_id = ? AND location_id = 'kitchen'`)
          .run(absQty, itemId)
      } else {
        // Validate sufficient stock before removing
        const current = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = 'kitchen'`)
          .get(itemId) as any
        const currentQty = current?.quantity || 0
        if (currentQty < absQty) {
          throw new Error(`الكمية المتوفرة في المطبخ (${currentQty}) أقل من المطلوب (${absQty})`)
        }
        db.prepare(`UPDATE inventory_stock SET quantity = quantity - ? WHERE item_id = ? AND location_id = 'kitchen'`)
          .run(absQty, itemId)
      }

      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (?, ?, ?, ?, ?, 'kitchen')
      `).run(itemId, logQty, type, reason, employeeId || null)
    })()
  }

  // ── Kitchen Stock Correction ──────────────────

  static correctStock(itemId: number, newQuantity: number, reason: string, employeeId?: number) {
    const db = getDb()
    return db.transaction(() => {
      // Ensure a kitchen stock row exists
      db.prepare(`INSERT OR IGNORE INTO inventory_stock (item_id, location_id, quantity) VALUES (?, 'kitchen', 0)`)
        .run(itemId)

      const current = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = 'kitchen'`)
        .get(itemId) as any
      const currentQty = current?.quantity || 0
      const delta = newQuantity - currentQty

      db.prepare(`UPDATE inventory_stock SET quantity = ? WHERE item_id = ? AND location_id = 'kitchen'`)
        .run(newQuantity, itemId)

      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (?, ?, 'correction', ?, ?, 'kitchen')
      `).run(itemId, delta, `تصحيح: ${currentQty} → ${newQuantity}. ${reason}`, employeeId || null)
    })()
  }

  // ── Kitchen Damage ──────────────────

  static reportDamage(itemId: number, quantity: number, reason: string, employeeId?: number) {
    const db = getDb()
    return db.transaction(() => {
      const absQty = Math.abs(quantity)

      // Validate sufficient stock
      const current = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = 'kitchen'`)
        .get(itemId) as any
      const currentQty = current?.quantity || 0
      if (currentQty < absQty) {
        throw new Error(`الكمية المتوفرة في المطبخ (${currentQty}) أقل من الكمية التالفة (${absQty})`)
      }

      const item = db.prepare(`SELECT cost_per_unit FROM inventory_items WHERE id = ?`).get(itemId) as any
      const costAtTime = item?.cost_per_unit || 0
      const financialLoss = absQty * costAtTime

      db.prepare(`UPDATE inventory_stock SET quantity = quantity - ? WHERE item_id = ? AND location_id = 'kitchen'`)
        .run(absQty, itemId)

      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (?, ?, 'damage', ?, ?, 'kitchen')
      `).run(itemId, -absQty, `${reason} | خسارة: ${financialLoss}`, employeeId || null)
    })()
  }

  static getDamageHistory(filters?: { startDate?: string; endDate?: string }) {
    const db = getDb()
    let where = `WHERE sa.type = 'damage' AND sa.location_id = 'kitchen'`
    const params: any[] = []
    if (filters?.startDate) { where += ` AND sa.created_at >= ?`; params.push(filters.startDate) }
    if (filters?.endDate) { where += ` AND sa.created_at <= ?`; params.push(filters.endDate + ' 23:59:59') }
    return db.prepare(`
      SELECT sa.*, inv.name as item_name, inv.unit, inv.type as item_type,
             e.name as employee_name
      FROM stock_adjustments sa
      LEFT JOIN inventory_items inv ON inv.id = sa.ingredient_id
      LEFT JOIN employees e ON e.id = sa.employee_id
      ${where}
      ORDER BY sa.created_at DESC
    `).all(...params)
  }

  // ── Production (simple + optional material deduction) ──────────────────

  /**
   * Produce a menu item:
   * 1. Log the production (item name + quantity)
   * 2. Optionally deduct consumed materials from kitchen stock
   */
  static produce(data: {
    menuItemName: string
    quantity: number
    consumedMaterials?: { itemId: number; quantity: number }[]
  }, employeeId?: number) {
    const db = getDb()
    return db.transaction(() => {
      const { menuItemName, quantity, consumedMaterials } = data
      if (!menuItemName || quantity <= 0) throw new Error('بيانات الإنتاج غير صالحة')

      // Deduct consumed materials if specified
      let materialsDeducted = 0
      if (consumedMaterials && consumedMaterials.length > 0) {
        for (const mat of consumedMaterials) {
          const absQty = Math.abs(mat.quantity)
          if (absQty <= 0) continue

          const item = db.prepare(`SELECT id, name FROM inventory_items WHERE id = ?`).get(mat.itemId) as any
          if (!item) throw new Error(`المادة غير موجودة (${mat.itemId})`)

          const current = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = 'kitchen'`)
            .get(mat.itemId) as any
          const currentQty = current?.quantity || 0
          if (currentQty < absQty) {
            throw new Error(`مخزون المطبخ من "${item.name}" (${currentQty}) لا يكفي (مطلوب ${absQty})`)
          }

          db.prepare(`UPDATE inventory_stock SET quantity = quantity - ? WHERE item_id = ? AND location_id = 'kitchen'`)
            .run(absQty, mat.itemId)
          db.prepare(`
            INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
            VALUES (?, ?, 'usage', ?, ?, 'kitchen')
          `).run(mat.itemId, -absQty, `إنتاج ${quantity}× ${menuItemName}`, employeeId || null)
          materialsDeducted++
        }
      }

      // Log the production event
      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (NULL, ?, 'production', ?, ?, 'kitchen')
      `).run(quantity, `إنتاج: ${quantity}× ${menuItemName}`, employeeId || null)

      return { menuItemName, quantity, materialsDeducted }
    })()
  }

  // ── Material Usage Reporting ──────────────────

  /**
   * Report material usage — deduct consumed materials from kitchen stock
   * at any time (not tied to production or orders).
   */
  static reportUsage(itemId: number, quantity: number, reason: string, employeeId?: number) {
    const db = getDb()
    return db.transaction(() => {
      const absQty = Math.abs(quantity)
      const item = db.prepare(`SELECT id, name FROM inventory_items WHERE id = ?`).get(itemId) as any
      if (!item) throw new Error('المنتج غير موجود')

      const current = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = 'kitchen'`)
        .get(itemId) as any
      const currentQty = current?.quantity || 0
      if (currentQty < absQty) {
        throw new Error(`الكمية المتوفرة في المطبخ (${currentQty}) أقل من المستهلك (${absQty})`)
      }

      db.prepare(`UPDATE inventory_stock SET quantity = quantity - ? WHERE item_id = ? AND location_id = 'kitchen'`)
        .run(absQty, itemId)

      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (?, ?, 'usage', ?, ?, 'kitchen')
      `).run(itemId, -absQty, reason || 'استهلاك مطبخ', employeeId || null)

      return { itemId, quantity: absQty, itemName: item.name }
    })()
  }

  // ── Kitchen Transfers ──────────────────

  static getTransfers(limit = 50) {
    const db = getDb()
    return db.prepare(`
      SELECT t.*, inv.name as item_name, inv.unit,
             e.name as employee_name,
             pkg.label as packaging_label
      FROM inventory_transfers t
      JOIN inventory_items inv ON inv.id = t.item_id
      LEFT JOIN employees e ON e.id = t.employee_id
      LEFT JOIN item_packagings pkg ON pkg.id = t.packaging_id
      WHERE t.from_location = 'kitchen' OR t.to_location = 'kitchen'
      ORDER BY t.created_at DESC LIMIT ?
    `).all(limit)
  }

  // ── Kitchen Tickets (KDS) ──────────────────

  static getTickets(filters?: { startDate?: string; endDate?: string }) {
    const db = getDb()
    const now = new Date()
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const start = filters?.startDate || defaultDate
    const end = filters?.endDate ? filters.endDate + ' 23:59:59' : defaultDate + ' 23:59:59'
    return db.prepare(`
      SELECT o.id, o.order_num, o.created_at, o.status, o.total, o.order_type FROM orders o
      WHERE o.created_at >= ? AND o.created_at <= ?
      ORDER BY o.created_at DESC
    `).all(start, end).map((o: any) => ({
      ...o,
      items: db.prepare(`
        SELECT oi.*, i.name FROM order_items oi
        JOIN items i ON i.id = oi.item_id
        WHERE oi.order_id = ?
      `).all(o.id)
    }))
  }
}
