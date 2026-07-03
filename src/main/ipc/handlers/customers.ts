import { handle } from '../helpers'
import { CustomerRepo } from '../../db/repositories/CustomerRepo'
import { createCustomerSchema, updateCustomerSchema } from '../schemas'
import { PERM, descendants } from '@shared/permissions'

const CUST_ANY = descendants(PERM.CUSTOMERS_MANAGE) // group + edit/loyalty
/** POS needs to search/read customers inline while taking an order. */
const CUST_READ = [PERM.POS_ACCESS, ...CUST_ANY]

export function registerCustomerHandlers() {
  handle('customers:list', (search?: string) => CustomerRepo.list(search), CUST_READ)
  handle('customers:get', (id: number) => CustomerRepo.getById(id), CUST_ANY)
  handle('customers:findByPhone', (phone: string) => CustomerRepo.findByPhone(phone), CUST_READ)
  handle('customers:create', (data) => {
    const validated = createCustomerSchema.parse(data)
    return CustomerRepo.create(validated)
  }, [PERM.POS_ACCESS, PERM.CUSTOMERS_EDIT])
  handle('customers:update', (id: number, data) => {
    const validated = updateCustomerSchema.parse(data)
    return CustomerRepo.update(id, validated)
  }, [PERM.CUSTOMERS_EDIT])
  handle('customers:addPoints', (id: number, orderId: number, amount: number) =>
    CustomerRepo.addPoints(id, orderId, amount), [PERM.CUSTOMERS_LOYALTY])
  handle('customers:redeemPoints', (id: number, points: number) =>
    CustomerRepo.redeemPoints(id, points), [PERM.POS_ACCESS, PERM.CUSTOMERS_LOYALTY])
  handle('customers:getOrderHistory', (customerId: number, limit?: number) =>
    CustomerRepo.getOrderHistory(customerId, limit), CUST_ANY)
  handle('customers:getTopItems', (customerId: number, limit?: number) =>
    CustomerRepo.getTopItems(customerId, limit), CUST_ANY)
}
