import { handle } from '../helpers'
import { CustomerRepo } from '../../db/repositories/CustomerRepo'
import { createCustomerSchema, updateCustomerSchema } from '../schemas'

export function registerCustomerHandlers() {
  handle('customers:list', (search?: string) => CustomerRepo.list(search), ['admin', 'manager'])
  handle('customers:get', (id: number) => CustomerRepo.getById(id), ['admin', 'manager'])
  handle('customers:findByPhone', (phone: string) => CustomerRepo.findByPhone(phone), ['admin', 'manager', 'cashier'])
  handle('customers:create', (data) => {
    const validated = createCustomerSchema.parse(data)
    return CustomerRepo.create(validated)
  }, ['admin', 'manager'])
  handle('customers:update', (id: number, data) => {
    const validated = updateCustomerSchema.parse(data)
    return CustomerRepo.update(id, validated)
  }, ['admin', 'manager'])
  handle('customers:addPoints', (id: number, orderId: number, amount: number) =>
    CustomerRepo.addPoints(id, orderId, amount), ['admin'])
  handle('customers:redeemPoints', (id: number, points: number) =>
    CustomerRepo.redeemPoints(id, points), ['admin', 'manager', 'cashier'])
  handle('customers:getOrderHistory', (customerId: number, limit?: number) =>
    CustomerRepo.getOrderHistory(customerId, limit), ['admin', 'manager'])
  handle('customers:getTopItems', (customerId: number, limit?: number) =>
    CustomerRepo.getTopItems(customerId, limit), ['admin', 'manager'])
}
