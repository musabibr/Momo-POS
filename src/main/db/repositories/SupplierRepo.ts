import { getDb } from '../connection'

/**
 * SupplierRepo — supplier CRUD and supplier-ingredient linking.
 * Single responsibility: supplier lifecycle and associations.
 */
export class SupplierRepo {

  static listSuppliers() {
    const db = getDb()
    const suppliers = db.prepare(`SELECT * FROM suppliers ORDER BY name`).all()
    return suppliers.map((s: any) => ({
      ...s,
      ingredients: db.prepare(`
        SELECT si.*, inv.name as ingredient_name, inv.unit
        FROM supplier_ingredients si
        JOIN inventory_items inv ON inv.id = si.ingredient_id
        WHERE si.supplier_id = ?
      `).all(s.id)
    }))
  }

  static createSupplier(data: any) {
    const db = getDb()
    const result = db.prepare(`INSERT INTO suppliers (name, phone, notes) VALUES (?, ?, ?)`)
      .run(data.name, data.phone || null, data.notes || null)
    return db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(result.lastInsertRowid)
  }

  static updateSupplier(id: number, data: any) {
    const db = getDb()
    const sets: string[] = []
    const vals: any[] = []
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
    if (data.phone !== undefined) { sets.push('phone = ?'); vals.push(data.phone) }
    if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(data.notes) }
    if (sets.length > 0) {
      vals.push(id)
      db.prepare(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    }
    return db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id)
  }

  static deleteSupplier(id: number) {
    const db = getDb()
    db.transaction(() => {
      const hasPurchases = db.prepare(`SELECT COUNT(*) as cnt FROM purchases WHERE supplier_id = ?`).get(id) as any
      if (hasPurchases && hasPurchases.cnt > 0) {
        throw new Error('لا يمكن حذف مورد لديه مشتريات سابقة')
      }
      db.prepare(`DELETE FROM supplier_ingredients WHERE supplier_id = ?`).run(id)
      db.prepare(`DELETE FROM suppliers WHERE id = ?`).run(id)
    })()
  }

  static linkSupplierIngredient(supplierId: number, ingredientId: number, price: number) {
    getDb().prepare(`
      INSERT OR REPLACE INTO supplier_ingredients (supplier_id, ingredient_id, price_per_unit)
      VALUES (?, ?, ?)
    `).run(supplierId, ingredientId, price)
  }

  static unlinkSupplierIngredient(supplierId: number, ingredientId: number) {
    getDb().prepare(`DELETE FROM supplier_ingredients WHERE supplier_id = ? AND ingredient_id = ?`).run(supplierId, ingredientId)
  }
}
