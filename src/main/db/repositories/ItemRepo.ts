import { getDb } from '../connection'

export class ItemRepo {
  /**
   * Attach option groups + options to an item row.
   */
  private static attachOptions(item: any): any {
    const db = getDb()
    const groups = db.prepare(`SELECT * FROM item_option_groups WHERE item_id = ? ORDER BY sort_order, id`).all(item.id)
    const optionGroups = groups.map((g: any) => {
      const opts = db.prepare(`SELECT * FROM item_options WHERE group_id = ? ORDER BY sort_order, id`).all(g.id)
      return {
        id: g.id,
        name: g.name,
        type: g.type,
        kind: g.kind,
        sortOrder: g.sort_order,
        options: opts.map((o: any) => ({
          id: o.id,
          name: o.name,
          priceAdj: o.price_adj,
          isDefault: o.is_default === 1,
          sortOrder: o.sort_order
        }))
      }
    })
    return { ...item, available: item.available === 1, optionGroups }
  }

  static list() {
    const db = getDb()
    const items = db.prepare(`SELECT * FROM items ORDER BY created_at DESC`).all()
    return items.map((item: any) => ItemRepo.attachOptions(item))
  }

  static listAvailable() {
    const db = getDb()
    const items = db.prepare(`SELECT * FROM items WHERE available = 1 ORDER BY created_at DESC`).all()
    return items.map((item: any) => ItemRepo.attachOptions(item))
  }

  static getById(id: number) {
    const db = getDb()
    const item = db.prepare(`SELECT * FROM items WHERE id = ?`).get(id) as any
    if (!item) return null
    return ItemRepo.attachOptions(item)
  }

  static create(data: any) {
    const db = getDb()
    return db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO items (name, description, price, cost, cat_id, subcat_id, emoji, image_path, available, barcode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name, data.description || null, data.price, data.cost || null,
        data.catId || null, data.subcatId || null, data.emoji || '🍮',
        data.imagePath || null, data.available !== false ? 1 : 0, data.barcode || null
      )
      const itemId = result.lastInsertRowid as number

      // Insert item-scoped option groups + options
      if (data.optionGroups && data.optionGroups.length > 0) {
        ItemRepo.saveOptionGroups(itemId, data.optionGroups)
      }

      return ItemRepo.getById(itemId)
    })()
  }

  static update(id: number, data: any) {
    const db = getDb()
    return db.transaction(() => {
      const sets: string[] = []
      const vals: any[] = []
      if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
      if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description) }
      if (data.price !== undefined) { sets.push('price = ?'); vals.push(data.price) }
      if (data.cost !== undefined) { sets.push('cost = ?'); vals.push(data.cost) }
      if (data.catId !== undefined) { sets.push('cat_id = ?'); vals.push(data.catId) }
      if (data.subcatId !== undefined) { sets.push('subcat_id = ?'); vals.push(data.subcatId) }
      if (data.emoji !== undefined) { sets.push('emoji = ?'); vals.push(data.emoji) }
      if (data.imagePath !== undefined) { sets.push('image_path = ?'); vals.push(data.imagePath) }
      if (data.available !== undefined) { sets.push('available = ?'); vals.push(data.available ? 1 : 0) }
      if (data.barcode !== undefined) { sets.push('barcode = ?'); vals.push(data.barcode) }

      if (sets.length > 0) {
        vals.push(id)
        db.prepare(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
      }

      // Replace option groups if provided
      if (data.optionGroups !== undefined) {
        // Delete old groups (CASCADE deletes options too)
        db.prepare(`DELETE FROM item_option_groups WHERE item_id = ?`).run(id)
        if (data.optionGroups.length > 0) {
          ItemRepo.saveOptionGroups(id, data.optionGroups)
        }
      }

      return ItemRepo.getById(id)
    })()
  }

  /**
   * Insert option groups + their options for an item.
   */
  private static saveOptionGroups(itemId: number, groups: any[]) {
    const db = getDb()
    const grpStmt = db.prepare(`INSERT INTO item_option_groups (item_id, name, type, kind, sort_order) VALUES (?, ?, ?, ?, ?)`)
    const optStmt = db.prepare(`INSERT INTO item_options (group_id, name, price_adj, is_default, sort_order) VALUES (?, ?, ?, ?, ?)`)

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      const result = grpStmt.run(itemId, g.name, g.type || 'single', g.kind || 'variation', g.sortOrder ?? gi)
      const groupId = result.lastInsertRowid as number
      if (g.options && g.options.length > 0) {
        for (let oi = 0; oi < g.options.length; oi++) {
          const o = g.options[oi]
          optStmt.run(groupId, o.name, o.priceAdj ?? 0, o.isDefault ? 1 : 0, o.sortOrder ?? oi)
        }
      }
    }
  }

  static delete(id: number) {
    const db = getDb()
    const hasOrders = db.prepare(`SELECT COUNT(*) as cnt FROM order_items WHERE item_id = ?`).get(id) as any
    if (hasOrders && hasOrders.cnt > 0) {
      db.prepare(`UPDATE items SET available = 0 WHERE id = ?`).run(id)
    } else {
      db.prepare(`DELETE FROM items WHERE id = ?`).run(id)
    }
  }

  static setAvailable(id: number, available: boolean) {
    const db = getDb()
    db.prepare(`UPDATE items SET available = ? WHERE id = ?`).run(available ? 1 : 0, id)
  }

  /**
   * Calculate the cost of a menu item from its recipe ingredients' current cost_per_unit.
   */
  static calculateCost(itemId: number): number | null {
    const db = getDb()
    const recipe = db.prepare(`
      SELECT r.quantity, inv.cost_per_unit
      FROM recipes r
      JOIN inventory_items inv ON inv.id = r.ingredient_id
      WHERE r.item_id = ?
    `).all(itemId) as any[]

    if (recipe.length === 0) return null

    let total = 0
    for (const line of recipe) {
      if (line.cost_per_unit == null) return null
      total += line.quantity * line.cost_per_unit
    }
    return Math.round(total)
  }
}
