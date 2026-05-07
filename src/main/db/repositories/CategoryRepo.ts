import { getDb } from '../connection'

export class CategoryRepo {
  static list() {
    return getDb().prepare(`SELECT * FROM categories ORDER BY sort_order`).all()
  }

  static create(data: any) {
    const db = getDb()
    db.prepare(`INSERT INTO categories (id, name, color, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)`)
      .run(data.id, data.name, data.color || '#a855f7', data.parentId || null, data.sortOrder || 0)
    return db.prepare(`SELECT * FROM categories WHERE id = ?`).get(data.id)
  }

  static update(id: string, data: any) {
    const db = getDb()
    const sets: string[] = []
    const vals: any[] = []
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
    if (data.color !== undefined) { sets.push('color = ?'); vals.push(data.color) }
    if (data.parentId !== undefined) { sets.push('parent_id = ?'); vals.push(data.parentId) }
    if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); vals.push(data.sortOrder) }
    if (sets.length > 0) {
      vals.push(id)
      db.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    }
    return db.prepare(`SELECT * FROM categories WHERE id = ?`).get(id)
  }

  static delete(id: string) {
    const db = getDb()
    // Move items to null category
    db.prepare(`UPDATE items SET cat_id = NULL WHERE cat_id = ?`).run(id)
    db.prepare(`UPDATE items SET subcat_id = NULL WHERE subcat_id = ?`).run(id)
    // Move subcategories to no parent
    db.prepare(`UPDATE categories SET parent_id = NULL WHERE parent_id = ?`).run(id)
    db.prepare(`DELETE FROM categories WHERE id = ?`).run(id)
  }
}
