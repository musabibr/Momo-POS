import { getDb } from '../connection'

/**
 * StockRepo — stock adjustments, corrections, damage reporting, and per-location queries.
 * Single responsibility: stock level mutations and reads.
 */
export class StockRepo {

  // ── Stock Adjustments (add/remove/waste) ──────────────────

  static adjust(itemId: number, qty: number, type: string, reason: string, employeeId?: number, locationId = 'main') {
    const db = getDb()
    return db.transaction(() => {
      let logQty: number

      if (type === 'add') {
        logQty = Math.abs(qty)
        db.prepare(`UPDATE inventory_stock SET quantity = quantity + ? WHERE item_id = ? AND location_id = ?`)
          .run(Math.abs(qty), itemId, locationId)
      } else if (type === 'remove' || type === 'waste' || type === 'damage') {
        const absQty = Math.abs(qty)
        // Validate sufficient stock
        const current = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = ?`)
          .get(itemId, locationId) as any
        const currentQty = current?.quantity || 0
        if (currentQty < absQty) {
          throw new Error(`الكمية المتوفرة (${currentQty}) أقل من المطلوب (${absQty})`)
        }
        logQty = -absQty
        db.prepare(`UPDATE inventory_stock SET quantity = quantity - ? WHERE item_id = ? AND location_id = ?`)
          .run(absQty, itemId, locationId)
      } else {
        // Unknown type — log as-is but don't mutate stock
        logQty = qty
      }

      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(itemId, logQty, type, reason, employeeId || null, locationId)

      // Keep the legacy stock column in sync (main location)
      StockRepo._syncLegacyStock(itemId, locationId)
    })()
  }

  // ── Stock Correction ──────────────────

  static correctStock(itemId: number, locationId: string, newQuantity: number, reason: string, employeeId?: number) {
    const db = getDb()
    return db.transaction(() => {
      const current = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = ?`)
        .get(itemId, locationId) as any
      const currentQty = current?.quantity || 0
      const delta = newQuantity - currentQty

      db.prepare(`UPDATE inventory_stock SET quantity = ? WHERE item_id = ? AND location_id = ?`)
        .run(newQuantity, itemId, locationId)

      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (?, ?, 'correction', ?, ?, ?)
      `).run(itemId, delta, `تصحيح: ${currentQty} → ${newQuantity}. ${reason}`, employeeId || null, locationId)

      // Keep legacy stock column in sync
      StockRepo._syncLegacyStock(itemId, locationId)
    })()
  }

  // ── Damage Reporting ──────────────────

  static reportDamage(itemId: number, quantity: number, locationId: string, reason: string, employeeId?: number) {
    const db = getDb()
    return db.transaction(() => {
      const absQty = Math.abs(quantity)

      // Validate sufficient stock before subtracting
      const current = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = ?`)
        .get(itemId, locationId) as any
      const currentQty = current?.quantity || 0
      if (currentQty < absQty) {
        throw new Error(`الكمية المتوفرة (${currentQty}) أقل من الكمية التالفة (${absQty})`)
      }

      // Get current cost for financial tracking
      const item = db.prepare(`SELECT cost_per_unit FROM inventory_items WHERE id = ?`).get(itemId) as any
      const costAtTime = item?.cost_per_unit || 0
      const financialLoss = absQty * costAtTime

      db.prepare(`UPDATE inventory_stock SET quantity = quantity - ? WHERE item_id = ? AND location_id = ?`)
        .run(absQty, itemId, locationId)

      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (?, ?, 'damage', ?, ?, ?)
      `).run(itemId, -absQty, `${reason} | خسارة: ${financialLoss}`, employeeId || null, locationId)

      // Keep legacy stock column in sync
      StockRepo._syncLegacyStock(itemId, locationId)
    })()
  }

  // ── Per-Location Reads ──────────────────

  static getStockByLocation(locationId: string) {
    const db = getDb()
    return db.prepare(`
      SELECT inv.*, ist.quantity as stock
      FROM inventory_stock ist
      JOIN inventory_items inv ON inv.id = ist.item_id
      WHERE ist.location_id = ? AND inv.archived = 0
      ORDER BY inv.name
    `).all(locationId)
  }

  // ── Internal helpers ──────────────────

  /** Keep the legacy `inventory_items.stock` column in sync with the main location */
  static _syncLegacyStock(itemId: number, locationId: string) {
    if (locationId === 'main') {
      const db = getDb()
      const mainStock = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = 'main'`)
        .get(itemId) as any
      if (mainStock) {
        db.prepare(`UPDATE inventory_items SET stock = ? WHERE id = ?`).run(mainStock.quantity, itemId)
      }
    }
  }
}
