import { handle } from '../helpers'
import { KitchenRepo } from '../../db/repositories/KitchenRepo'
import { kitchenAdjustSchema, kitchenCorrectionSchema, kitchenDamageSchema, kitchenProduceSchema, kitchenUsageSchema } from '../schemas/kitchen.schemas'
import { getSession } from '../../session'
import { PERM } from '@shared/permissions'

/**
 * Kitchen IPC handlers — all kitchen-domain operations.
 * The kitchen module is self-contained: stock, adjustments, damage,
 * production, transfers, and order tickets (KDS).
 */
export function registerKitchenHandlers() {
  // ── Kitchen Stock ──────────────────
  handle('kitchen:getStock', () => KitchenRepo.getStock(), [PERM.KITCHEN_VIEW])
  handle('kitchen:createPremade', (data) => {
    const session = getSession()
    return KitchenRepo.createPremade(data, session?.employeeId)
  }, [PERM.KITCHEN_VIEW])
  handle('kitchen:editPremade', (data: any) => {
    return KitchenRepo.editPremade(data.id, { name: data.name, unit: data.unit })
  }, [PERM.KITCHEN_VIEW])
  handle('kitchen:deletePremade', (id: number) => {
    return KitchenRepo.deletePremade(id)
  }, [PERM.KITCHEN_VIEW])

  // ── Kitchen Stock Adjustments ──────────────────
  handle('kitchen:adjustStock', (data) => {
    const validated = kitchenAdjustSchema.parse(data)
    const session = getSession()
    return KitchenRepo.adjustStock(
      validated.itemId, validated.quantity, validated.type,
      validated.reason, session?.employeeId
    )
  }, [PERM.KITCHEN_VIEW])

  // ── Kitchen Stock Correction ──────────────────
  handle('kitchen:correctStock', (data) => {
    const validated = kitchenCorrectionSchema.parse(data)
    const session = getSession()
    return KitchenRepo.correctStock(
      validated.itemId, validated.newQuantity,
      validated.reason, session?.employeeId
    )
  }, [PERM.KITCHEN_VIEW])

  // ── Kitchen Damage ──────────────────
  handle('kitchen:reportDamage', (data) => {
    const validated = kitchenDamageSchema.parse(data)
    const session = getSession()
    return KitchenRepo.reportDamage(validated.itemId, validated.quantity, validated.reason, session?.employeeId)
  }, [PERM.KITCHEN_VIEW])
  handle('kitchen:damageHistory', (filters?: any) => KitchenRepo.getDamageHistory(filters), [PERM.KITCHEN_VIEW])

  // ── Material Usage ──────────────────
  handle('kitchen:reportUsage', (data) => {
    const validated = kitchenUsageSchema.parse(data)
    const session = getSession()
    return KitchenRepo.reportUsage(validated.itemId, validated.quantity, validated.reason, session?.employeeId)
  }, [PERM.KITCHEN_VIEW])

  // ── Production ──────────────────
  handle('kitchen:produce', (data) => {
    const validated = kitchenProduceSchema.parse(data)
    const session = getSession()
    return KitchenRepo.produce(validated, session?.employeeId)
  }, [PERM.KITCHEN_VIEW])

  // ── Kitchen Transfers ──────────────────
  handle('kitchen:getTransfers', (limit?: number) => KitchenRepo.getTransfers(limit), [PERM.KITCHEN_VIEW])

  // ── Kitchen Tickets ──────────────────
  handle('kitchen:todaysTickets', (filters?: any) => KitchenRepo.getTickets(filters), [PERM.KITCHEN_VIEW])
}
