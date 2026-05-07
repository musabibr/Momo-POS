import { handle } from '../helpers'
import { KitchenRepo } from '../../db/repositories/KitchenRepo'
import { kitchenAdjustSchema, kitchenCorrectionSchema, kitchenDamageSchema, kitchenProduceSchema, kitchenUsageSchema } from '../schemas/kitchen.schemas'
import { getSession } from '../../session'

/**
 * Kitchen IPC handlers — all kitchen-domain operations.
 * The kitchen module is self-contained: stock, adjustments, damage,
 * production, transfers, and order tickets (KDS).
 */
export function registerKitchenHandlers() {
  // ── Kitchen Stock ──────────────────
  handle('kitchen:getStock', () => KitchenRepo.getStock(), ['admin', 'manager', 'kitchen'])
  handle('kitchen:createPremade', (data) => {
    const session = getSession()
    return KitchenRepo.createPremade(data, session?.employeeId)
  }, ['admin', 'manager', 'kitchen'])
  handle('kitchen:editPremade', (data: any) => {
    return KitchenRepo.editPremade(data.id, { name: data.name, unit: data.unit })
  }, ['admin', 'manager', 'kitchen'])
  handle('kitchen:deletePremade', (id: number) => {
    return KitchenRepo.deletePremade(id)
  }, ['admin', 'manager', 'kitchen'])

  // ── Kitchen Stock Adjustments ──────────────────
  handle('kitchen:adjustStock', (data) => {
    const validated = kitchenAdjustSchema.parse(data)
    const session = getSession()
    return KitchenRepo.adjustStock(
      validated.itemId, validated.quantity, validated.type,
      validated.reason, session?.employeeId
    )
  }, ['admin', 'manager', 'kitchen'])

  // ── Kitchen Stock Correction ──────────────────
  handle('kitchen:correctStock', (data) => {
    const validated = kitchenCorrectionSchema.parse(data)
    const session = getSession()
    return KitchenRepo.correctStock(
      validated.itemId, validated.newQuantity,
      validated.reason, session?.employeeId
    )
  }, ['admin', 'manager', 'kitchen'])

  // ── Kitchen Damage ──────────────────
  handle('kitchen:reportDamage', (data) => {
    const validated = kitchenDamageSchema.parse(data)
    const session = getSession()
    return KitchenRepo.reportDamage(validated.itemId, validated.quantity, validated.reason, session?.employeeId)
  }, ['admin', 'manager', 'kitchen'])
  handle('kitchen:damageHistory', (filters?: any) => KitchenRepo.getDamageHistory(filters), ['admin', 'manager', 'kitchen'])

  // ── Material Usage ──────────────────
  handle('kitchen:reportUsage', (data) => {
    const validated = kitchenUsageSchema.parse(data)
    const session = getSession()
    return KitchenRepo.reportUsage(validated.itemId, validated.quantity, validated.reason, session?.employeeId)
  }, ['admin', 'manager', 'kitchen'])

  // ── Production ──────────────────
  handle('kitchen:produce', (data) => {
    const validated = kitchenProduceSchema.parse(data)
    const session = getSession()
    return KitchenRepo.produce(validated, session?.employeeId)
  }, ['admin', 'manager', 'kitchen'])

  // ── Kitchen Transfers ──────────────────
  handle('kitchen:getTransfers', (limit?: number) => KitchenRepo.getTransfers(limit), ['admin', 'manager', 'kitchen'])

  // ── Kitchen Tickets ──────────────────
  handle('kitchen:todaysTickets', (filters?: any) => KitchenRepo.getTickets(filters), ['admin', 'manager', 'kitchen'])
}
