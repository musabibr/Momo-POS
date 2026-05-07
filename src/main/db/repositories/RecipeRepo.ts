import { getDb } from '../connection'

/**
 * RecipeRepo — menu item recipe definitions (ingredient → quantity mappings).
 *
 * Ownership: MENU MODULE.
 * A recipe is a property of a menu item, not of an inventory item.
 * Used by OrderRepo for stock deduction and by the Menu UI for recipe editing.
 */
export class RecipeRepo {

  static getRecipe(itemId: number) {
    const db = getDb()
    return db.prepare(`
      SELECT r.*, inv.name as ingredient_name, inv.unit
      FROM recipes r
      JOIN inventory_items inv ON inv.id = r.ingredient_id
      WHERE r.item_id = ?
    `).all(itemId)
  }

  static saveRecipe(itemId: number, lines: any[]) {
    const db = getDb()
    return db.transaction(() => {
      db.prepare(`DELETE FROM recipes WHERE item_id = ?`).run(itemId)
      const stmt = db.prepare(`INSERT INTO recipes (item_id, ingredient_id, quantity) VALUES (?, ?, ?)`)
      for (const line of lines) {
        stmt.run(itemId, line.ingredientId, line.quantity)
      }
    })()
  }
}
