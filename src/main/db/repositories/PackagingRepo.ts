import { getDb } from '../connection'

/**
 * PackagingRepo — item packaging unit definitions.
 * Single responsibility: packaging CRUD (e.g., "1 box = 24 pcs").
 */
export class PackagingRepo {

  static listPackagings(itemId: number) {
    return getDb().prepare(`SELECT * FROM item_packagings WHERE item_id = ?`).all(itemId)
  }

  static addPackaging(itemId: number, label: string, qtyPerBase: number, customCost?: number) {
    const db = getDb()
    const result = db.prepare(`INSERT INTO item_packagings (item_id, label, qty_per_base, custom_cost) VALUES (?, ?, ?, ?)`)
      .run(itemId, label, qtyPerBase, customCost ?? null)
    return db.prepare(`SELECT * FROM item_packagings WHERE id = ?`).get(result.lastInsertRowid)
  }

  static deletePackaging(id: number) {
    getDb().prepare(`DELETE FROM item_packagings WHERE id = ?`).run(id)
  }
}
