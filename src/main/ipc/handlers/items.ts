import { handle } from '../helpers'
import { ItemRepo } from '../../db/repositories/ItemRepo'
import { CategoryRepo } from '../../db/repositories/CategoryRepo'
import { RecipeRepo } from '../../db/repositories/RecipeRepo'
import { createMenuItemSchema, updateMenuItemSchema } from '../schemas/menu.schemas'
import { getImagesPath } from '../../db/connection'
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'

/**
 * Menu IPC handlers — menu items, categories, recipes, gallery.
 * Owns the entire menu domain: items, categories, option groups, recipes, images, galleries.
 */
export function registerMenuHandlers() {
  // ── Menu Items ──────────────────
  handle('menu:listItems', () => ItemRepo.list(), ['admin', 'manager', 'cashier'])
  handle('menu:listAvailable', () => ItemRepo.listAvailable(), ['admin', 'manager', 'cashier'])
  handle('menu:getItem', (id: number) => ItemRepo.getById(id), ['admin', 'manager', 'cashier'])
  handle('menu:createItem', (data) => {
    const validated = createMenuItemSchema.parse(data)
    return ItemRepo.create(validated)
  }, ['admin', 'manager'])
  handle('menu:updateItem', (id: number, data) => {
    const validated = updateMenuItemSchema.parse(data)
    return ItemRepo.update(id, validated)
  }, ['admin', 'manager'])
  handle('menu:deleteItem', (id: number) => ItemRepo.delete(id), ['admin', 'manager'])
  handle('menu:setAvailable', (id: number, available: boolean) => ItemRepo.setAvailable(id, available), ['admin', 'manager'])
  handle('menu:calculateCost', (id: number) => ItemRepo.calculateCost(id), ['admin', 'manager'])

  handle('menu:saveImage', (itemId: number, base64: string) => {
    const MAX_BASE64_SIZE = 4_000_000 // ~3 MB decoded
    if (!base64 || base64.length > MAX_BASE64_SIZE) throw new Error('الصورة كبيرة جداً أو غير صالحة')

    const mimeMatch = base64.match(/^data:image\/(png|jpe?g|gif|webp);base64,/)
    if (!mimeMatch) throw new Error('نوع الملف غير مدعوم — يُقبل PNG وJPEG وGIF وWebP فقط')

    const ext = mimeMatch[1].replace('jpeg', 'jpg')
    const imagesDir = getImagesPath()
    if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true })
    const fileName = `item_${itemId}_${Date.now()}.${ext}`
    const filePath = join(imagesDir, fileName)
    const data = base64.replace(/^data:image\/\w+;base64,/, '')
    writeFileSync(filePath, Buffer.from(data, 'base64'))
    ItemRepo.update(itemId, { imagePath: fileName })
    return fileName
  }, ['admin', 'manager'])

  // ── Gallery ──────────────────
  handle('menu:getGallery', (itemId: number) => ItemRepo.getGallery(itemId), ['admin', 'manager', 'cashier'])

  handle('menu:addGalleryImage', (itemId: number, base64: string) => {
    const MAX_BASE64_SIZE = 4_000_000
    if (!base64 || base64.length > MAX_BASE64_SIZE) throw new Error('الصورة كبيرة جداً أو غير صالحة')

    const mimeMatch = base64.match(/^data:image\/(png|jpe?g|gif|webp);base64,/)
    if (!mimeMatch) throw new Error('نوع الملف غير مدعوم — يُقبل PNG وJPEG وGIF وWebP فقط')

    const ext = mimeMatch[1].replace('jpeg', 'jpg')
    const imagesDir = getImagesPath()
    if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true })
    const fileName = `gallery_${itemId}_${Date.now()}.${ext}`
    const filePath = join(imagesDir, fileName)
    const data = base64.replace(/^data:image\/\w+;base64,/, '')
    writeFileSync(filePath, Buffer.from(data, 'base64'))
    return ItemRepo.addGalleryImage(itemId, fileName)
  }, ['admin', 'manager'])

  handle('menu:removeGalleryImage', (id: number) => {
    ItemRepo.removeGalleryImage(id)
  }, ['admin', 'manager'])

  // ── Categories ──────────────────
  handle('menu:listCategories', () => CategoryRepo.list(), ['admin', 'manager', 'cashier'])
  handle('menu:createCategory', (data) => CategoryRepo.create(data), ['admin', 'manager'])
  handle('menu:updateCategory', (id: string, data) => CategoryRepo.update(id, data), ['admin', 'manager'])
  handle('menu:deleteCategory', (id: string) => CategoryRepo.delete(id), ['admin', 'manager'])

  // ── Recipes ──────────────────
  handle('menu:getRecipe', (itemId: number) => RecipeRepo.getRecipe(itemId), ['admin', 'manager'])
  handle('menu:saveRecipe', (itemId: number, lines: any[]) => RecipeRepo.saveRecipe(itemId, lines), ['admin', 'manager'])
}
