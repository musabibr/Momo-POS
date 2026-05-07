import { handle, requireActiveShiftIfNeeded } from '../helpers'
import { PurchaseRepo } from '../../db/repositories/PurchaseRepo'
import { SupplierRepo } from '../../db/repositories/SupplierRepo'
import { createPurchaseSchema } from '../schemas/procurement.schemas'
import { getSession } from '../../session'

/**
 * Procurement IPC handlers — suppliers + purchases.
 * Owns the procurement domain independently from Inventory.
 */
export function registerProcurementHandlers() {
  // ── Suppliers ──────────────────
  handle('procurement:listSuppliers', () => SupplierRepo.listSuppliers(), ['admin', 'manager'])
  handle('procurement:createSupplier', (data) => SupplierRepo.createSupplier(data), ['admin', 'manager'])
  handle('procurement:updateSupplier', (id: number, data) => SupplierRepo.updateSupplier(id, data), ['admin', 'manager'])
  handle('procurement:deleteSupplier', (id: number) => SupplierRepo.deleteSupplier(id), ['admin', 'manager'])
  handle('procurement:linkSupplierIngredient', (supplierId: number, ingredientId: number, price: number) =>
    SupplierRepo.linkSupplierIngredient(supplierId, ingredientId, price), ['admin', 'manager'])
  handle('procurement:unlinkSupplierIngredient', (supplierId: number, ingredientId: number) =>
    SupplierRepo.unlinkSupplierIngredient(supplierId, ingredientId), ['admin', 'manager'])

  // ── Purchases ──────────────────
  handle('procurement:createPurchase', (data) => {
    requireActiveShiftIfNeeded()
    const validated = createPurchaseSchema.parse(data)
    const session = getSession()
    return PurchaseRepo.create({
      supplierId: validated.supplierId,
      items: validated.items.map(i => ({
        itemId: i.itemId,
        quantity: i.quantity,
        unitCost: i.unitCost,
        packagingId: i.packagingId ?? undefined,
        packagingQty: i.packagingQty ?? undefined
      })),
      note: validated.note ?? undefined,
      employeeId: session?.employeeId ?? undefined
    })
  }, ['admin', 'manager'])

  handle('procurement:listPurchases', (filters?: any) => PurchaseRepo.list(filters), ['admin', 'manager'])
  handle('procurement:getPurchase', (id: number) => PurchaseRepo.getById(id), ['admin', 'manager'])
}
