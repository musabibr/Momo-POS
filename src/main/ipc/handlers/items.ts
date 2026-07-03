import { handle } from '../helpers'
import { ItemRepo } from '../../db/repositories/ItemRepo'
import { CategoryRepo } from '../../db/repositories/CategoryRepo'
import { RecipeRepo } from '../../db/repositories/RecipeRepo'
import { createMenuItemSchema, updateMenuItemSchema } from '../schemas/menu.schemas'
import { getImagesPath } from '../../db/connection'
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { PERM, descendants } from '@shared/permissions'

const MENU_ANY = descendants(PERM.MENU_MANAGE) // menu_manage + items/categories/recipes
/** POS + anyone with any menu permission can read menu data. */
const MENU_READ_POS = [PERM.POS_ACCESS, ...MENU_ANY]
/** listItems is also read by the kitchen production panel. */
const MENU_LIST_ALL = [PERM.POS_ACCESS, PERM.KITCHEN_VIEW, ...MENU_ANY]

/**
 * Menu IPC handlers — menu items, categories, recipes, gallery.
 * Owns the entire menu domain: items, categories, option groups, recipes, images, galleries.
 */
export function registerMenuHandlers() {
  // ── Menu Items ──────────────────
  handle('menu:listItems', () => ItemRepo.list(), MENU_LIST_ALL)
  handle('menu:listAvailable', () => ItemRepo.listAvailable(), MENU_READ_POS)
  handle('menu:getItem', (id: number) => ItemRepo.getById(id), MENU_READ_POS)
  handle('menu:createItem', (data) => {
    const validated = createMenuItemSchema.parse(data)
    return ItemRepo.create(validated)
  }, [PERM.MENU_ITEMS])
  handle('menu:updateItem', (id: number, data) => {
    const validated = updateMenuItemSchema.parse(data)
    return ItemRepo.update(id, validated)
  }, [PERM.MENU_ITEMS])
  handle('menu:deleteItem', (id: number) => ItemRepo.delete(id), [PERM.MENU_ITEMS])
  handle('menu:setAvailable', (id: number, available: boolean) => ItemRepo.setAvailable(id, available), [PERM.MENU_ITEMS])
  handle('menu:calculateCost', (id: number) => ItemRepo.calculateCost(id), [PERM.MENU_ITEMS])

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
  }, [PERM.MENU_ITEMS])

  // ── Gallery ──────────────────
  handle('menu:getGallery', (itemId: number) => ItemRepo.getGallery(itemId), MENU_READ_POS)

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
  }, [PERM.MENU_ITEMS])

  handle('menu:removeGalleryImage', (id: number) => {
    ItemRepo.removeGalleryImage(id)
  }, [PERM.MENU_ITEMS])

  // ── Categories ──────────────────
  handle('menu:listCategories', () => CategoryRepo.list(), MENU_READ_POS)
  handle('menu:createCategory', (data) => CategoryRepo.create(data), [PERM.MENU_CATEGORIES])
  handle('menu:updateCategory', (id: string, data) => CategoryRepo.update(id, data), [PERM.MENU_CATEGORIES])
  handle('menu:deleteCategory', (id: string) => CategoryRepo.delete(id), [PERM.MENU_CATEGORIES])

  // ── Recipes ──────────────────
  handle('menu:getRecipe', (itemId: number) => RecipeRepo.getRecipe(itemId), [PERM.MENU_RECIPES])
  handle('menu:saveRecipe', (itemId: number, lines: any[]) => RecipeRepo.saveRecipe(itemId, lines), [PERM.MENU_RECIPES])
}
