import { handle } from '../helpers'
import { InventoryItemRepo } from '../../db/repositories/InventoryItemRepo'
import { StockRepo } from '../../db/repositories/StockRepo'
import { TransferRepo } from '../../db/repositories/TransferRepo'
import { PackagingRepo } from '../../db/repositories/PackagingRepo'
import {
  createInventoryItemSchema, adjustStockSchema,
  transferSchema, damageReportSchema, stockCorrectionSchema, updateInventoryItemSchema
} from '../schemas/inventory.schemas'
import { getSession } from '../../session'

/**
 * Inventory IPC handlers — items, stock, transfers, packagings, units.
 *
 * This handler is focused ONLY on inventory-domain operations.
 * Suppliers + Purchases → procurement handler.
 * Recipes → menu handler.
 * Kitchen-specific stock → kitchen handler.
 */
export function registerInventoryHandlers() {
  // ── Items ──────────────────
  handle('inventory:listItems', (filters?: any) => InventoryItemRepo.listItems(filters), ['admin', 'manager'])
  handle('inventory:createItem', (data) => {
    const validated = createInventoryItemSchema.parse(data)
    return InventoryItemRepo.createItem(validated)
  }, ['admin', 'manager'])
  handle('inventory:updateItem', (id: number, data) => {
    const validated = updateInventoryItemSchema.parse(data)
    return InventoryItemRepo.updateItem(id, validated)
  }, ['admin', 'manager'])
  handle('inventory:deleteItem', (id: number) => InventoryItemRepo.deleteItem(id), ['admin', 'manager'])
  handle('inventory:getItemById', (id: number) => InventoryItemRepo.getItemById(id), ['admin', 'manager'])
  handle('inventory:getLowStock', () => InventoryItemRepo.getLowStock(), ['admin', 'manager'])
  handle('inventory:findByBarcode', (barcode: string) => InventoryItemRepo.findByBarcode(barcode), ['admin', 'manager'])
  handle('inventory:listUnits', () => InventoryItemRepo.listUnits(), ['admin', 'manager'])
  handle('inventory:createUnit', (id: string, name: string, type?: string) => InventoryItemRepo.createUnit(id, name, type), ['admin', 'manager'])
  handle('inventory:updateUnit', (oldId: string, newId: string, name: string) => InventoryItemRepo.updateUnit(oldId, newId, name), ['admin', 'manager'])
  handle('inventory:deleteUnit', (id: string) => InventoryItemRepo.deleteUnit(id), ['admin', 'manager'])

  // ── Unit Conversions ──────────────────
  handle('inventory:listConversions', () => InventoryItemRepo.listConversions(), ['admin', 'manager'])
  handle('inventory:createConversion', (fromUnit: string, toUnit: string, factor: number) =>
    InventoryItemRepo.createConversion(fromUnit, toUnit, factor), ['admin', 'manager'])
  handle('inventory:deleteConversion', (id: number) => InventoryItemRepo.deleteConversion(id), ['admin', 'manager'])
  handle('inventory:calcSubPrice', (fromUnit: string, toUnit: string, bulkPrice: number) =>
    InventoryItemRepo.calcSubPrice(fromUnit, toUnit, bulkPrice), ['admin', 'manager'])

  // ── Stock Adjustments ──────────────────
  handle('inventory:adjust', (ingredientId: number, qty: number, type: string, reason: string, employeeId?: number, locationId?: string) => {
    adjustStockSchema.parse({ ingredientId, quantity: qty, type, reason, employeeId, locationId })
    return StockRepo.adjust(ingredientId, qty, type, reason, employeeId, locationId)
  }, ['admin', 'manager'])

  // ── Stock Corrections ──────────────────
  handle('inventory:correctStock', (data) => {
    const validated = stockCorrectionSchema.parse(data)
    const session = getSession()
    return StockRepo.correctStock(validated.itemId, validated.locationId, validated.newQuantity,
      validated.reason, session?.employeeId)
  }, ['admin', 'manager'])

  // ── Transfers ──────────────────
  handle('inventory:transfer', (data) => {
    const validated = transferSchema.parse(data)
    const session = getSession()
    return TransferRepo.transfer({
      itemId: validated.itemId,
      fromLocation: validated.fromLocation,
      toLocation: validated.toLocation,
      quantity: validated.quantity,
      packagingId: validated.packagingId ?? undefined,
      packagingQty: validated.packagingQty ?? undefined,
      employeeId: session?.employeeId ?? undefined,
      note: validated.note ?? undefined
    })
  }, ['admin', 'manager'])
  handle('inventory:listTransfers', (filters?: any) => TransferRepo.listTransfers(filters), ['admin', 'manager'])

  // ── Damage Reports ──────────────────
  handle('inventory:reportDamage', (data) => {
    const validated = damageReportSchema.parse(data)
    const session = getSession()
    return StockRepo.reportDamage(validated.itemId, validated.quantity, validated.locationId,
      validated.reason, session?.employeeId)
  }, ['admin', 'manager'])

  // ── Packagings ──────────────────
  handle('inventory:listPackagings', (itemId: number) => PackagingRepo.listPackagings(itemId), ['admin', 'manager'])
  handle('inventory:addPackaging', (itemId: number, label: string, qtyPerBase: number, customCost?: number) =>
    PackagingRepo.addPackaging(itemId, label, qtyPerBase, customCost), ['admin', 'manager'])
  handle('inventory:deletePackaging', (id: number) => PackagingRepo.deletePackaging(id), ['admin', 'manager'])
}
