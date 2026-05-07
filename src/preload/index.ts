import { contextBridge, ipcRenderer } from 'electron'

function invoke(channel: string, ...args: any[]) {
  return ipcRenderer.invoke(channel, ...args).then((result: any) => {
    if (result && result.error) throw new Error(result.error)
    return result?.data
  })
}

/**
 * Invoke that does NOT throw on error — returns the raw result object.
 * Used for login where we need to inspect `{ valid, locked, lockedUntil }`.
 */
function invokeRaw(channel: string, ...args: any[]) {
  return ipcRenderer.invoke(channel, ...args).then((result: any) => {
    return result?.data
  })
}

const api = {
  // ── SESSION ──────────────────────────────────────────────────────
  session: {
    login: (username: string, pass: string) => invokeRaw('session:login', username, pass),
    logout: () => invoke('session:logout'),
    current: () => invokeRaw('session:current'),
  },

  // ── MENU MODULE ─────────────────────────────────────────────────
  menu: {
    // Items
    listItems: () => invoke('menu:listItems'),
    listAvailable: () => invoke('menu:listAvailable'),
    getItem: (id: number) => invoke('menu:getItem', id),
    createItem: (data: any) => invoke('menu:createItem', data),
    updateItem: (id: number, data: any) => invoke('menu:updateItem', id, data),
    deleteItem: (id: number) => invoke('menu:deleteItem', id),
    setAvailable: (id: number, available: boolean) => invoke('menu:setAvailable', id, available),
    saveImage: (itemId: number, base64: string) => invoke('menu:saveImage', itemId, base64),
    calculateCost: (id: number) => invoke('menu:calculateCost', id),
    // Categories
    listCategories: () => invoke('menu:listCategories'),
    createCategory: (data: any) => invoke('menu:createCategory', data),
    updateCategory: (id: string, data: any) => invoke('menu:updateCategory', id, data),
    deleteCategory: (id: string) => invoke('menu:deleteCategory', id),
    // Recipes
    getRecipe: (itemId: number) => invoke('menu:getRecipe', itemId),
    saveRecipe: (itemId: number, lines: any[]) => invoke('menu:saveRecipe', itemId, lines),
  },

  // ── INVENTORY MODULE ────────────────────────────────────────────
  inventory: {
    // Items
    listItems: (filters?: any) => invoke('inventory:listItems', filters),
    createItem: (data: any) => invoke('inventory:createItem', data),
    updateItem: (id: number, data: any) => invoke('inventory:updateItem', id, data),
    deleteItem: (id: number) => invoke('inventory:deleteItem', id),
    getItemById: (id: number) => invoke('inventory:getItemById', id),
    getLowStock: () => invoke('inventory:getLowStock'),
    findByBarcode: (barcode: string) => invoke('inventory:findByBarcode', barcode),
    listUnits: () => invoke('inventory:listUnits'),
    createUnit: (id: string, name: string, type?: string) => invoke('inventory:createUnit', id, name, type),
    deleteUnit: (id: string) => invoke('inventory:deleteUnit', id),
    updateUnit: (oldId: string, newId: string, name: string) => invoke('inventory:updateUnit', oldId, newId, name),
    // Conversions
    listConversions: () => invoke('inventory:listConversions'),
    createConversion: (fromUnit: string, toUnit: string, factor: number) => invoke('inventory:createConversion', fromUnit, toUnit, factor),
    deleteConversion: (id: number) => invoke('inventory:deleteConversion', id),
    calcSubPrice: (fromUnit: string, toUnit: string, bulkPrice: number) => invoke('inventory:calcSubPrice', fromUnit, toUnit, bulkPrice),
    // Stock
    adjust: (ingredientId: number, qty: number, type: string, reason: string, employeeId?: number, locationId?: string) =>
      invoke('inventory:adjust', ingredientId, qty, type, reason, employeeId, locationId),
    correctStock: (data: any) => invoke('inventory:correctStock', data),
    reportDamage: (data: any) => invoke('inventory:reportDamage', data),
    // Transfers
    transfer: (data: any) => invoke('inventory:transfer', data),
    listTransfers: (filters?: any) => invoke('inventory:listTransfers', filters),
    // Packagings
    listPackagings: (itemId: number) => invoke('inventory:listPackagings', itemId),
    addPackaging: (itemId: number, label: string, qtyPerBase: number) =>
      invoke('inventory:addPackaging', itemId, label, qtyPerBase),
    deletePackaging: (id: number) => invoke('inventory:deletePackaging', id),
  },

  // ── PROCUREMENT MODULE ──────────────────────────────────────────
  procurement: {
    // Suppliers
    listSuppliers: () => invoke('procurement:listSuppliers'),
    createSupplier: (data: any) => invoke('procurement:createSupplier', data),
    updateSupplier: (id: number, data: any) => invoke('procurement:updateSupplier', id, data),
    deleteSupplier: (id: number) => invoke('procurement:deleteSupplier', id),
    linkSupplierIngredient: (supplierId: number, ingredientId: number, price: number) =>
      invoke('procurement:linkSupplierIngredient', supplierId, ingredientId, price),
    unlinkSupplierIngredient: (supplierId: number, ingredientId: number) =>
      invoke('procurement:unlinkSupplierIngredient', supplierId, ingredientId),
    // Purchases
    createPurchase: (data: any) => invoke('procurement:createPurchase', data),
    listPurchases: (filters?: any) => invoke('procurement:listPurchases', filters),
    getPurchase: (id: number) => invoke('procurement:getPurchase', id),
  },

  // ── KITCHEN MODULE ──────────────────────────────────────────────
  kitchen: {
    getStock: () => invoke('kitchen:getStock'),
    createPremade: (data: any) => invoke('kitchen:createPremade', data),
    editPremade: (data: any) => invoke('kitchen:editPremade', data),
    deletePremade: (id: number) => invoke('kitchen:deletePremade', id),
    getTransfers: (limit?: number) => invoke('kitchen:getTransfers', limit),
    adjustStock: (data: any) => invoke('kitchen:adjustStock', data),
    correctStock: (data: any) => invoke('kitchen:correctStock', data),
    reportDamage: (itemId: number, quantity: number, reason: string) =>
      invoke('kitchen:reportDamage', { itemId, quantity, reason }),
    damageHistory: (filters?: any) => invoke('kitchen:damageHistory', filters),
    reportUsage: (data: any) => invoke('kitchen:reportUsage', data),
    produce: (data: any) => invoke('kitchen:produce', data),
    todaysTickets: (filters?: any) => invoke('kitchen:todaysTickets', filters),
  },

  // ── ORDERS ──────────────────────────────────────────────────────
  orders: {
    create: (data: any) => invoke('orders:create', data),
    list: (filters?: any) => invoke('orders:list', filters),
    get: (id: number) => invoke('orders:get', id),
    void: (orderId: number, employeeId: number, reason: string) => invoke('orders:void', orderId, employeeId, reason),
    correct: (orderId: number, reason: string, correctedItems: any[]) => invoke('orders:correct', orderId, reason, correctedItems),
    myOrders: (filters?: any) => invoke('orders:myOrders', filters),
    salesSummary: (filters?: any) => invoke('orders:salesSummary', filters),
    itemRanking: (filters?: any) => invoke('orders:itemRanking', filters),
    profitByItem: (filters?: any) => invoke('orders:profitByItem', filters)
  },

  // ── CUSTOMERS ───────────────────────────────────────────────────
  customers: {
    list: (search?: string) => invoke('customers:list', search),
    search: (query: string) => invoke('customers:list', query),
    get: (id: number) => invoke('customers:get', id),
    findByPhone: (phone: string) => invoke('customers:findByPhone', phone),
    create: (data: any) => invoke('customers:create', data),
    update: (id: number, data: any) => invoke('customers:update', id, data),
    addPoints: (id: number, orderId: number, amount: number) => invoke('customers:addPoints', id, orderId, amount),
    redeemPoints: (id: number, points: number) => invoke('customers:redeemPoints', id, points),
    getOrderHistory: (customerId: number, limit?: number) => invoke('customers:getOrderHistory', customerId, limit),
    getTopItems: (customerId: number, limit?: number) => invoke('customers:getTopItems', customerId, limit)
  },

  // ── EMPLOYEES ───────────────────────────────────────────────────
  employees: {
    list: () => invoke('employees:list'),
    get: (id: number) => invoke('employees:get', id),
    create: (data: any) => invoke('employees:create', data),
    update: (id: number, data: any) => invoke('employees:update', id, data),
    delete: (id: number) => invoke('employees:delete', id),
    login: (username: string, pass: string) => invokeRaw('employees:login', username, pass),
    getSecurityQuestion: (username: string) => invokeRaw('employees:getSecurityQuestion', username),
    resetPasswordWithSecurityAnswer: (username: string, answer: string, newPassword: string) => invokeRaw('employees:resetPasswordWithSecurityAnswer', username, answer, newPassword),
    verifyAnyManagerPin: (pin: string) => invokeRaw('employees:verifyAnyManagerPin', pin),
    unlock: (id: number) => invoke('employees:unlock', id)
  },

  // ── SHIFTS ──────────────────────────────────────────────────────
  shifts: {
    open: (openFloat: number) => invoke('shifts:open', openFloat),
    close: (shiftId: number, closeFloat: number) => invoke('shifts:close', shiftId, closeFloat),
    getCurrent: () => invoke('shifts:getCurrent'),
    list: () => invoke('shifts:list'),
    listPaginated: (page: number, pageSize: number, filters?: any) => invoke('shifts:listPaginated', page, pageSize, filters),
    updateOpenFloat: (shiftId: number, newFloat: number, reason: string) => invoke('shifts:updateOpenFloat', shiftId, newFloat, reason)
  },

  // ── CASH ────────────────────────────────────────────────────────
  cash: {
    getRevenueSummary: (shiftId?: number) => invoke('cash:getRevenueSummary', shiftId),
    getBankBreakdown: (shiftId?: number) => invoke('cash:getBankBreakdown', shiftId),
    logPettyCash: (type: string, amount: number, reason: string, shiftId?: number) =>
      invoke('cash:logPettyCash', type, amount, reason, shiftId),
    listPettyCash: (shiftId?: number) => invoke('cash:listPettyCash', shiftId),
    logExpense: (amount: number, category: string, note: string, shiftId?: number) =>
      invoke('cash:logExpense', amount, category, note, shiftId),
    listExpenses: (shiftId?: number) => invoke('cash:listExpenses', shiftId),
    getZReportData: (shiftId: number) => invoke('cash:getZReportData', shiftId),
    expensesSummary: (filters?: any) => invoke('cash:expensesSummary', filters)
  },

  // ── SETTINGS ────────────────────────────────────────────────────
  settings: {
    get: (key: string) => invoke('settings:get', key),
    set: (key: string, value: string) => invoke('settings:set', key, value),
    getAll: () => invoke('settings:getAll'),
    getBanks: () => invoke('settings:getBanks'),
    setBanks: (banks: string[]) => invoke('settings:setBanks', banks),
    getExpenseCategories: () => invoke('settings:getExpenseCategories'),
    setExpenseCategories: (cats: string[]) => invoke('settings:setExpenseCategories', cats),
    getWithdrawReasons: () => invoke('settings:getWithdrawReasons'),
    setWithdrawReasons: (reasons: string[]) => invoke('settings:setWithdrawReasons', reasons)
  },

  // ── REPORTS ─────────────────────────────────────────────────────
  reports: {
    salesSummary: (filters?: any) => invoke('reports:salesSummary', filters),
    hourlySales: (filters?: any) => invoke('reports:hourlySales', filters),
    itemRanking: (filters?: any) => invoke('reports:itemRanking', filters),
    paymentBreakdown: (filters?: any) => invoke('reports:paymentBreakdown', filters),
    inventoryStats: (filters?: any) => invoke('reports:inventoryStats', filters),
    employeeStats: (filters?: any) => invoke('reports:employeeStats', filters),
    customerStats: (filters?: any) => invoke('reports:customerStats', filters),
    exportPDF: (reportType: string, filters?: any) => invoke('reports:exportPDF', reportType, filters)
  },

  // ── ACTION LOG ──────────────────────────────────────────────────
  actionLog: {
    list: (filters?: any) => invoke('actionLog:list', filters),
    write: (action: string, detail: any, employeeId?: number) => invoke('actionLog:write', action, detail, employeeId)
  },

  // ── BACKUP ──────────────────────────────────────────────────────
  backup: {
    run: (targetPath: string) => invoke('backup:run', targetPath),
    restore: (backupPath: string) => invoke('backup:restore', backupPath),
    pickFolder: () => invoke('backup:pickFolder'),
    pickRestoreFolder: () => invoke('backup:pickRestoreFolder'),
  },

  // ── PRINTER ─────────────────────────────────────────────────────
  printer: {
    print: (receiptData: any) => invoke('printer:print', receiptData),
    printKitchen: (receiptData: any) => invoke('printer:printKitchen', receiptData),
    printZReport: (reportData: any) => invoke('printer:printZReport', reportData),
    previewPDF: (receiptData: any) => invoke('printer:previewPDF', receiptData),
    saveShiftReportPDF: (html: string) => invoke('printer:saveShiftReportPDF', html),
    testPrint: (printerNum: number) => invoke('printer:testPrint', printerNum)
  }
}

/**
 * Domain-shaped façade — matches the workflow-first nav structure.
 */
const shift = {
  // Lifecycle
  open: api.shifts.open,
  close: api.shifts.close,
  getCurrent: api.shifts.getCurrent,
  list: api.shifts.list,
  listPaginated: api.shifts.listPaginated,
  updateOpenFloat: api.shifts.updateOpenFloat,
  // Cash flow during the shift
  getRevenueSummary: api.cash.getRevenueSummary,
  getBankBreakdown: api.cash.getBankBreakdown,
  logPettyCash: api.cash.logPettyCash,
  listPettyCash: api.cash.listPettyCash,
  logExpense: api.cash.logExpense,
  listExpenses: api.cash.listExpenses,
  // Close-of-day
  getZReportData: api.cash.getZReportData,
}

const apiWithFacade = { ...api, shift }

contextBridge.exposeInMainWorld('api', apiWithFacade)

export type ApiType = typeof apiWithFacade
