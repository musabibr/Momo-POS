import { getDb } from '../connection'
import { StockRepo } from './StockRepo'

/**
 * TransferRepo — move stock between locations (main ↔ kitchen).
 * Single responsibility: inter-location stock transfers.
 */
export class TransferRepo {

  static transfer(data: {
    itemId: number
    fromLocation: string
    toLocation: string
    quantity: number          // in base units
    packagingId?: number
    packagingQty?: number
    employeeId?: number
    note?: string
  }) {
    const db = getDb()
    return db.transaction(() => {
      // Calculate base-unit quantity
      let baseQty = data.quantity
      if (data.packagingId && data.packagingQty) {
        const pkg = db.prepare(`SELECT qty_per_base FROM item_packagings WHERE id = ?`).get(data.packagingId) as any
        if (pkg) {
          baseQty = data.packagingQty * pkg.qty_per_base
        }
      }

      // Check enforcement setting
      const enforceSetting = db.prepare(`SELECT value FROM settings WHERE key = 'enforce_kitchen_stock'`).get() as any
      const enforce = enforceSetting?.value === 'true'

      // Always check source stock — enforce controls block vs allow-with-warning
      const fromStock = db.prepare(`SELECT quantity FROM inventory_stock WHERE item_id = ? AND location_id = ?`)
        .get(data.itemId, data.fromLocation) as any
      if (!fromStock || fromStock.quantity < baseQty) {
        if (enforce) {
          throw new Error('المخزون في الموقع المصدر غير كافي')
        }
        // Non-enforced: cap transfer at available stock to prevent negatives
        if (!fromStock || fromStock.quantity <= 0) {
          throw new Error('لا يوجد مخزون في الموقع المصدر')
        }
        baseQty = Math.min(baseQty, fromStock.quantity)
      }

      // Deduct from source
      db.prepare(`UPDATE inventory_stock SET quantity = quantity - ? WHERE item_id = ? AND location_id = ?`)
        .run(baseQty, data.itemId, data.fromLocation)

      // Add to destination (upsert)
      db.prepare(`
        INSERT INTO inventory_stock (item_id, location_id, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(item_id, location_id) DO UPDATE SET quantity = quantity + ?
      `).run(data.itemId, data.toLocation, baseQty, baseQty)

      // Log transfer
      db.prepare(`
        INSERT INTO inventory_transfers (item_id, from_location, to_location, quantity, packaging_id, packaging_qty, employee_id, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(data.itemId, data.fromLocation, data.toLocation, baseQty,
        data.packagingId || null, data.packagingQty || null,
        data.employeeId || null, data.note || null)

      // Stock adjustment log entries
      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (?, ?, 'remove', ?, ?, ?)
      `).run(data.itemId, -baseQty, `تحويل إلى ${data.toLocation}`, data.employeeId || null, data.fromLocation)

      db.prepare(`
        INSERT INTO stock_adjustments (ingredient_id, quantity, type, reason, employee_id, location_id)
        VALUES (?, ?, 'add', ?, ?, ?)
      `).run(data.itemId, baseQty, `تحويل من ${data.fromLocation}`, data.employeeId || null, data.toLocation)

      // Keep legacy stock column in sync
      StockRepo._syncLegacyStock(data.itemId, 'main')
    })()
  }

  static listTransfers(filters: { locationId?: string; itemId?: number; limit?: number } = {}) {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params: any[] = []
    if (filters.locationId) {
      where += ' AND (t.from_location = ? OR t.to_location = ?)'
      params.push(filters.locationId, filters.locationId)
    }
    if (filters.itemId) { where += ' AND t.item_id = ?'; params.push(filters.itemId) }
    const limit = filters.limit || 200

    return db.prepare(`
      SELECT t.*, inv.name as item_name, inv.unit,
             e.name as employee_name,
             pkg.label as packaging_label
      FROM inventory_transfers t
      JOIN inventory_items inv ON inv.id = t.item_id
      LEFT JOIN employees e ON e.id = t.employee_id
      LEFT JOIN item_packagings pkg ON pkg.id = t.packaging_id
      ${where}
      ORDER BY t.created_at DESC LIMIT ?
    `).all(...params, limit)
  }

}
