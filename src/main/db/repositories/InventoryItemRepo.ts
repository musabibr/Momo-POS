import { getDb } from '../connection'

/**
 * InventoryItemRepo — CRUD for inventory items (formerly "ingredients").
 * Single responsibility: item lifecycle (create, read, update, archive/delete).
 * Stock quantities live in StockRepo; packagings in PackagingRepo.
 */
export class InventoryItemRepo {

  static listItems(filters: { type?: string; archived?: boolean; locationId?: string } = {}) {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params: any[] = []
    if (filters.type) { where += ' AND inv.type = ?'; params.push(filters.type) }
    if (filters.archived === false) { where += ' AND inv.archived = 0' }
    else if (filters.archived === true) { where += ' AND inv.archived = 1' }
    else { where += ' AND inv.archived = 0' } // default: hide archived

    const items = db.prepare(`
      SELECT inv.*,
        COALESCE(sm.quantity, 0) as stock_main,
        COALESCE(sk.quantity, 0) as stock_kitchen
      FROM inventory_items inv
      LEFT JOIN inventory_stock sm ON sm.item_id = inv.id AND sm.location_id = 'main'
      LEFT JOIN inventory_stock sk ON sk.item_id = inv.id AND sk.location_id = 'kitchen'
      ${where}
      ORDER BY inv.name
    `).all(...params)

    return items.map((item: any) => ({
      ...item,
      // Keep backward compat: 'stock' = main stock for now
      stock: item.stock_main,
      packagings: db.prepare(`SELECT * FROM item_packagings WHERE item_id = ?`).all(item.id)
    }))
  }



  static createItem(data: any) {
    const db = getDb()
    return db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO inventory_items (name, unit, stock, low_threshold, cost_per_unit, barcode, type, parent_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name, data.unit || 'g', data.stock || 0,
        data.lowThreshold || 0, data.costPerUnit || null,
        data.barcode || null, data.type || 'ingredient', data.parentId || null
      )
      const itemId = result.lastInsertRowid as number

      // Initialize stock in both locations
      db.prepare(`INSERT INTO inventory_stock (item_id, location_id, quantity) VALUES (?, 'main', ?)`).run(itemId, data.stock || 0)
      db.prepare(`INSERT INTO inventory_stock (item_id, location_id, quantity) VALUES (?, 'kitchen', 0)`).run(itemId)

      // Create packagings if provided
      if (data.packagings && Array.isArray(data.packagings)) {
        const pkgStmt = db.prepare(`INSERT INTO item_packagings (item_id, label, qty_per_base, custom_cost) VALUES (?, ?, ?, ?)`)
        for (const pkg of data.packagings) {
          if (pkg.label && pkg.qtyPerBase) {
            pkgStmt.run(itemId, pkg.label, pkg.qtyPerBase, pkg.customCost || null)
          }
        }
      }

      return InventoryItemRepo.getItemById(itemId)
    })()
  }



  static getItemById(id: number) {
    const db = getDb()
    const item = db.prepare(`SELECT * FROM inventory_items WHERE id = ?`).get(id) as any
    if (!item) return null
    item.stock_main = (db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = 'main'`).get(id) as any)?.quantity || 0
    item.stock_kitchen = (db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = 'kitchen'`).get(id) as any)?.quantity || 0
    item.stock = item.stock_main
    item.packagings = db.prepare(`SELECT * FROM item_packagings WHERE item_id = ?`).all(id)
    return item
  }

  static updateItem(id: number, data: any) {
    const db = getDb()
    return db.transaction(() => {
      const sets: string[] = []
      const vals: any[] = []
      if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
      if (data.unit !== undefined) { sets.push('unit = ?'); vals.push(data.unit) }
      if (data.lowThreshold !== undefined) { sets.push('low_threshold = ?'); vals.push(data.lowThreshold) }
      if (data.costPerUnit !== undefined) { sets.push('cost_per_unit = ?'); vals.push(data.costPerUnit) }
      if (data.barcode !== undefined) { sets.push('barcode = ?'); vals.push(data.barcode) }
      if (data.type !== undefined) { sets.push('type = ?'); vals.push(data.type) }
      if (data.parentId !== undefined) { sets.push('parent_id = ?'); vals.push(data.parentId) }
      if (sets.length > 0) {
        vals.push(id)
        db.prepare(`UPDATE inventory_items SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
      }

      // Update packagings if provided
      if (data.packagings !== undefined && Array.isArray(data.packagings)) {
        db.prepare(`DELETE FROM item_packagings WHERE item_id = ?`).run(id)
        const pkgStmt = db.prepare(`INSERT INTO item_packagings (item_id, label, qty_per_base, custom_cost) VALUES (?, ?, ?, ?)`)
        for (const pkg of data.packagings) {
          if (pkg.label && pkg.qtyPerBase) {
            pkgStmt.run(id, pkg.label, pkg.qtyPerBase, pkg.customCost || null)
          }
        }
      }

      return InventoryItemRepo.getItemById(id)
    })()
  }



  static deleteItem(id: number) {
    const db = getDb()
    // Check if item has any history
    const hasHistory = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM recipes WHERE ingredient_id = ?) +
        (SELECT COUNT(*) FROM stock_adjustments WHERE ingredient_id = ?) +
        (SELECT COUNT(*) FROM purchase_items WHERE item_id = ?) +
        (SELECT COUNT(*) FROM inventory_transfers WHERE item_id = ?) as cnt
    `).get(id, id, id, id) as any

    if (hasHistory && hasHistory.cnt > 0) {
      // Soft delete — archive
      db.prepare(`UPDATE inventory_items SET archived = 1 WHERE id = ?`).run(id)
    } else {
      db.prepare(`DELETE FROM inventory_stock WHERE item_id = ?`).run(id)
      db.prepare(`DELETE FROM item_packagings WHERE item_id = ?`).run(id)
      db.prepare(`DELETE FROM inventory_items WHERE id = ?`).run(id)
    }
  }



  // ── Low Stock ──────────────────

  static getLowStock() {
    return getDb().prepare(`
      SELECT inv.*,
        COALESCE((SELECT quantity FROM inventory_stock WHERE item_id = inv.id AND location_id = 'main'), 0) as stock_main,
        COALESCE((SELECT quantity FROM inventory_stock WHERE item_id = inv.id AND location_id = 'kitchen'), 0) as stock_kitchen
      FROM inventory_items inv
      WHERE inv.low_threshold > 0 AND inv.archived = 0
        AND COALESCE((SELECT quantity FROM inventory_stock WHERE item_id = inv.id AND location_id = 'main'), 0)
            + COALESCE((SELECT quantity FROM inventory_stock WHERE item_id = inv.id AND location_id = 'kitchen'), 0)
            <= inv.low_threshold
    `).all()
  }

  static findByBarcode(barcode: string) {
    const row = getDb().prepare(`SELECT * FROM inventory_items WHERE barcode = ?`).get(barcode) as any
    if (!row) return null
    return InventoryItemRepo.getItemById(row.id)
  }

  static listUnits() {
    return getDb().prepare(`SELECT * FROM units`).all()
  }

  static createUnit(id: string, name: string, type: string = 'quantity') {
    const db = getDb()
    const exists = db.prepare(`SELECT id FROM units WHERE id = ?`).get(id)
    if (exists) throw new Error('رمز الوحدة موجود مسبقاً')
    db.prepare(`INSERT INTO units (id, name, type) VALUES (?, ?, ?)`).run(id, name, type)
  }

  static updateUnit(oldId: string, newId: string, name: string) {
    const db = getDb()
    return db.transaction(() => {
      if (oldId !== newId) {
        // Check new id doesn't already exist
        const exists = db.prepare(`SELECT id FROM units WHERE id = ?`).get(newId)
        if (exists) throw new Error('رمز الوحدة موجود مسبقاً')
        // Cascade rename across all references
        db.prepare(`UPDATE inventory_items SET unit = ? WHERE unit = ?`).run(newId, oldId)
        db.prepare(`UPDATE unit_conversions SET from_unit = ? WHERE from_unit = ?`).run(newId, oldId)
        db.prepare(`UPDATE unit_conversions SET to_unit = ? WHERE to_unit = ?`).run(newId, oldId)
      }
      db.prepare(`UPDATE units SET id = ?, name = ? WHERE id = ?`).run(newId, name, oldId)
    })()
  }

  static deleteUnit(id: string) {
    const db = getDb()
    const inUse = db.prepare(`SELECT COUNT(*) as c FROM inventory_items WHERE unit = ?`).get(id) as any
    if (inUse?.c > 0) throw new Error('الوحدة مستخدمة في مكونات ولا يمكن حذفها')
    // Also clean up conversions referencing this unit
    db.prepare(`DELETE FROM unit_conversions WHERE from_unit = ? OR to_unit = ?`).run(id, id)
    db.prepare(`DELETE FROM units WHERE id = ?`).run(id)
  }

  // ── Unit Conversions ──────────────────

  static listConversions() {
    return getDb().prepare(`
      SELECT uc.*, uf.name as from_name, ut.name as to_name
      FROM unit_conversions uc
      JOIN units uf ON uf.id = uc.from_unit
      JOIN units ut ON ut.id = uc.to_unit
      ORDER BY uc.from_unit
    `).all()
  }

  static createConversion(fromUnit: string, toUnit: string, factor: number) {
    if (fromUnit === toUnit) throw new Error('لا يمكن التحويل من وحدة لنفسها')
    if (factor <= 0) throw new Error('معامل التحويل يجب أن يكون أكبر من صفر')
    getDb().prepare(`INSERT OR REPLACE INTO unit_conversions (from_unit, to_unit, factor) VALUES (?, ?, ?)`)
      .run(fromUnit, toUnit, factor)
  }

  static deleteConversion(id: number) {
    getDb().prepare(`DELETE FROM unit_conversions WHERE id = ?`).run(id)
  }

  /**
   * Get the conversion factor between two units.
   * Tries direct lookup, then reverse (1/factor), then 2-hop chains.
   * Returns null if no path found.
   */
  static getConversionFactor(fromUnit: string, toUnit: string): number | null {
    if (fromUnit === toUnit) return 1
    const db = getDb()
    // Direct
    const direct = db.prepare(`SELECT factor FROM unit_conversions WHERE from_unit = ? AND to_unit = ?`)
      .get(fromUnit, toUnit) as any
    if (direct) return direct.factor
    // Reverse
    const reverse = db.prepare(`SELECT factor FROM unit_conversions WHERE from_unit = ? AND to_unit = ?`)
      .get(toUnit, fromUnit) as any
    if (reverse) return 1 / reverse.factor
    // 2-hop chain: from → mid → to
    const chain = db.prepare(`
      SELECT c1.factor * c2.factor as total_factor
      FROM unit_conversions c1
      JOIN unit_conversions c2 ON c1.to_unit = c2.from_unit
      WHERE c1.from_unit = ? AND c2.to_unit = ?
      LIMIT 1
    `).get(fromUnit, toUnit) as any
    if (chain) return chain.total_factor
    return null
  }

  /**
   * Calculate sub-unit price from a bulk price.
   * e.g. calcSubPrice('carton', 'pcs', 120) → 5 (if 1 carton = 24 pcs)
   */
  static calcSubPrice(fromUnit: string, toUnit: string, bulkPrice: number): number | null {
    const factor = InventoryItemRepo.getConversionFactor(fromUnit, toUnit)
    if (!factor) return null
    return bulkPrice / factor
  }
}

