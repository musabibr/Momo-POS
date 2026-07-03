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
import { PERM, descendants } from '@shared/permissions'

const INV_ANY = descendants(PERM.INVENTORY_MANAGE)   // group + items/adjust/transfer/damage
const PURCHASE_ANY = descendants(PERM.PURCHASE_MANAGE)
/** Reads visible to any inventory holder, kitchen staff, and procurement. */
const INV_READ_SHARED = [...INV_ANY, PERM.KITCHEN_VIEW, ...PURCHASE_ANY]
/** Reads/creates also needed by the procurement PO tab (quick item/unit create). */
const INV_PROCUREMENT_SHARED = [...INV_ANY, ...PURCHASE_ANY]
/** Reads shared with the kitchen (units, item list). */
const INV_KITCHEN_SHARED = [...INV_ANY, PERM.KITCHEN_VIEW]

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
  handle('inventory:listItems', (filters?: any) => InventoryItemRepo.listItems(filters), INV_READ_SHARED)
  handle('inventory:createItem', (data) => {
    const validated = createInventoryItemSchema.parse(data)
    return InventoryItemRepo.createItem(validated)
  }, [PERM.INVENTORY_ITEMS, PERM.PURCHASE_ORDERS])
  handle('inventory:updateItem', (id: number, data) => {
    const validated = updateInventoryItemSchema.parse(data)
    return InventoryItemRepo.updateItem(id, validated)
  }, [PERM.INVENTORY_ITEMS])
  handle('inventory:deleteItem', (id: number) => InventoryItemRepo.deleteItem(id), [PERM.INVENTORY_ITEMS])
  handle('inventory:getItemById', (id: number) => InventoryItemRepo.getItemById(id), INV_PROCUREMENT_SHARED)
  handle('inventory:getLowStock', () => InventoryItemRepo.getLowStock(), INV_ANY)
  handle('inventory:findByBarcode', (barcode: string) => InventoryItemRepo.findByBarcode(barcode), INV_ANY)
  handle('inventory:listUnits', () => InventoryItemRepo.listUnits(), INV_READ_SHARED)
  handle('inventory:createUnit', (id: string, name: string, type?: string) => InventoryItemRepo.createUnit(id, name, type), [PERM.INVENTORY_ITEMS, PERM.KITCHEN_VIEW])
  handle('inventory:updateUnit', (oldId: string, newId: string, name: string) => InventoryItemRepo.updateUnit(oldId, newId, name), [PERM.INVENTORY_ITEMS])
  handle('inventory:deleteUnit', (id: string) => InventoryItemRepo.deleteUnit(id), [PERM.INVENTORY_ITEMS])

  // ── Unit Conversions ──────────────────
  handle('inventory:listConversions', () => InventoryItemRepo.listConversions(), INV_ANY)
  handle('inventory:createConversion', (fromUnit: string, toUnit: string, factor: number) =>
    InventoryItemRepo.createConversion(fromUnit, toUnit, factor), [PERM.INVENTORY_ITEMS])
  handle('inventory:deleteConversion', (id: number) => InventoryItemRepo.deleteConversion(id), [PERM.INVENTORY_ITEMS])
  handle('inventory:calcSubPrice', (fromUnit: string, toUnit: string, bulkPrice: number) =>
    InventoryItemRepo.calcSubPrice(fromUnit, toUnit, bulkPrice), INV_PROCUREMENT_SHARED)

  // ── Stock Adjustments ──────────────────
  handle('inventory:adjust', (ingredientId: number, qty: number, type: string, reason: string, _employeeId?: number, locationId?: string) => {
    // Attribution comes from the session, never the renderer arg.
    const session = getSession()
    adjustStockSchema.parse({ ingredientId, quantity: qty, type, reason, employeeId: session?.employeeId, locationId })
    return StockRepo.adjust(ingredientId, qty, type, reason, session?.employeeId, locationId)
  }, [PERM.INVENTORY_ADJUST])

  // ── Stock Corrections ──────────────────
  handle('inventory:correctStock', (data) => {
    const validated = stockCorrectionSchema.parse(data)
    const session = getSession()
    return StockRepo.correctStock(validated.itemId, validated.locationId, validated.newQuantity,
      validated.reason, session?.employeeId)
  }, [PERM.INVENTORY_ADJUST])

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
  }, [PERM.INVENTORY_TRANSFER])
  handle('inventory:listTransfers', (filters?: any) => TransferRepo.listTransfers(filters), INV_ANY)

  // ── Damage Reports ──────────────────
  handle('inventory:reportDamage', (data) => {
    const validated = damageReportSchema.parse(data)
    const session = getSession()
    return StockRepo.reportDamage(validated.itemId, validated.quantity, validated.locationId,
      validated.reason, session?.employeeId)
  }, [PERM.INVENTORY_DAMAGE])

  // ── Packagings ──────────────────
  handle('inventory:listPackagings', (itemId: number) => PackagingRepo.listPackagings(itemId), INV_PROCUREMENT_SHARED)
  handle('inventory:addPackaging', (itemId: number, label: string, qtyPerBase: number, customCost?: number) =>
    PackagingRepo.addPackaging(itemId, label, qtyPerBase, customCost), [PERM.INVENTORY_ITEMS])
  handle('inventory:deletePackaging', (id: number) => PackagingRepo.deletePackaging(id), [PERM.INVENTORY_ITEMS])
}
