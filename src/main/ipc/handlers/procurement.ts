import { handle, requireActiveShiftIfNeeded } from '../helpers'
import { PurchaseRepo } from '../../db/repositories/PurchaseRepo'
import { SupplierRepo } from '../../db/repositories/SupplierRepo'
import { createPurchaseSchema } from '../schemas/procurement.schemas'
import { getSession } from '../../session'
import { PERM, descendants } from '@shared/permissions'

// Any procurement permission — for reads needed across the domain (e.g. an
// orders-only user still needs to read the supplier list to build a PO).
const PURCHASE_ANY = descendants(PERM.PURCHASE_MANAGE)

/**
 * Procurement IPC handlers — suppliers + purchases.
 * Owns the procurement domain independently from Inventory.
 */
export function registerProcurementHandlers() {
  // ── Suppliers ──────────────────
  handle('procurement:listSuppliers', () => SupplierRepo.listSuppliers(), PURCHASE_ANY)
  handle('procurement:createSupplier', (data) => SupplierRepo.createSupplier(data), [PERM.PURCHASE_SUPPLIERS])
  handle('procurement:updateSupplier', (id: number, data) => SupplierRepo.updateSupplier(id, data), [PERM.PURCHASE_SUPPLIERS])
  handle('procurement:deleteSupplier', (id: number) => SupplierRepo.deleteSupplier(id), [PERM.PURCHASE_SUPPLIERS])
  handle('procurement:linkSupplierIngredient', (supplierId: number, ingredientId: number, price: number) =>
    SupplierRepo.linkSupplierIngredient(supplierId, ingredientId, price), [PERM.PURCHASE_SUPPLIERS])
  handle('procurement:unlinkSupplierIngredient', (supplierId: number, ingredientId: number) =>
    SupplierRepo.unlinkSupplierIngredient(supplierId, ingredientId), [PERM.PURCHASE_SUPPLIERS])

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
  }, [PERM.PURCHASE_ORDERS])

  handle('procurement:listPurchases', (filters?: any) => PurchaseRepo.list(filters), PURCHASE_ANY)
  handle('procurement:getPurchase', (id: number) => PurchaseRepo.getById(id), PURCHASE_ANY)
}
