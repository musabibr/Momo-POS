import { getDb } from '../connection'

export class CashRepo {
  static getRevenueSummary(shiftId?: number) {
    const db = getDb()
    const where = shiftId ? "WHERE shift_id = ? AND status = 'confirmed'" : "WHERE status = 'confirmed'"
    const params = shiftId ? [shiftId] : []

    const row = db.prepare(`
      SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as total,
        COALESCE(SUM(CASE WHEN pay_mode = 'cash' THEN total ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN pay_mode = 'bank' THEN total ELSE 0 END), 0) as bank_total,
        COALESCE(SUM(CASE WHEN pay_mode = 'split' THEN cash_part ELSE 0 END), 0) as split_cash,
        COALESCE(SUM(CASE WHEN pay_mode = 'split' THEN bank_part ELSE 0 END), 0) as split_bank,
        COALESCE(SUM(disc_amount), 0) as total_discount
      FROM orders ${where}
    `).get(...params) as any

    return {
      total: row.total,
      orderCount: row.order_count,
      byCash: row.cash_total + row.split_cash,
      byBank: row.bank_total + row.split_bank,
      bySplit: (row.split_cash || 0) + (row.split_bank || 0),
      totalDiscount: row.total_discount
    }
  }

  /** Per-bank breakdown for Z-reports and payment analysis */
  static getBankBreakdown(shiftId?: number) {
    const db = getDb()
    const where = shiftId ? "WHERE shift_id = ? AND status = 'confirmed'" : "WHERE status = 'confirmed'"
    const params = shiftId ? [shiftId] : []

    return db.prepare(`
      SELECT
        COALESCE(bank_name, 'غير محدد') as bank_name,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN pay_mode = 'bank' THEN total ELSE bank_part END), 0) as total
      FROM orders ${where} AND pay_mode IN ('bank', 'split')
      GROUP BY bank_name
      ORDER BY total DESC
    `).all(...params)
  }

  static logPettyCash(type: string, amount: number, reason: string, shiftId?: number, employeeId?: number) {
    getDb().prepare(`INSERT INTO petty_cash (type, amount, reason, shift_id, employee_id) VALUES (?, ?, ?, ?, ?)`)
      .run(type, amount, reason, shiftId || null, employeeId || null)
  }

  static listPettyCash(shiftId?: number) {
    if (shiftId) {
      return getDb().prepare(`
        SELECT p.*, e.name as employee_name FROM petty_cash p
        LEFT JOIN employees e ON e.id = p.employee_id
        WHERE p.shift_id = ? ORDER BY p.created_at DESC
      `).all(shiftId)
    }
    return getDb().prepare(`
      SELECT p.*, e.name as employee_name FROM petty_cash p
      LEFT JOIN employees e ON e.id = p.employee_id
      ORDER BY p.created_at DESC LIMIT 500
    `).all()
  }

  static logExpense(amount: number, category: string, note: string, shiftId?: number, employeeId?: number) {
    getDb().prepare(`INSERT INTO expenses (amount, category, note, shift_id, employee_id) VALUES (?, ?, ?, ?, ?)`)
      .run(amount, category, note || null, shiftId || null, employeeId || null)
  }

  static listExpenses(shiftId?: number) {
    if (shiftId) {
      return getDb().prepare(`
        SELECT ex.*, e.name as employee_name FROM expenses ex
        LEFT JOIN employees e ON e.id = ex.employee_id
        WHERE ex.shift_id = ? ORDER BY ex.created_at DESC
      `).all(shiftId)
    }
    return getDb().prepare(`
      SELECT ex.*, e.name as employee_name FROM expenses ex
      LEFT JOIN employees e ON e.id = ex.employee_id
      ORDER BY ex.created_at DESC LIMIT 500
    `).all()
  }

  /** Full Z-Report data object per plan 06 spec */
  static getZReportData(shiftId: number) {
    const db = getDb()
    const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(shiftId) as any
    if (!shift) throw new Error('وردية غير موجودة')

    const revenue = CashRepo.getRevenueSummary(shiftId)
    const banks = CashRepo.getBankBreakdown(shiftId)
    const pettyCash = CashRepo.listPettyCash(shiftId) as any[]
    const expenses = CashRepo.listExpenses(shiftId) as any[]

    const pettyCashIn = pettyCash.filter(p => p.type === 'in').reduce((s, p) => s + p.amount, 0)
    const pettyCashOut = pettyCash.filter(p => p.type === 'out').reduce((s, p) => s + p.amount, 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

    const expected = (shift.open_float || 0) + revenue.byCash + pettyCashIn - pettyCashOut - totalExpenses

    return {
      shift: {
        id: shift.id,
        openedAt: shift.opened_at,
        closedAt: shift.closed_at,
        employeeId: shift.employee_id
      },
      openFloat: shift.open_float || 0,
      closeFloat: shift.close_float || 0,
      totalOrders: revenue.orderCount,
      totalRevenue: revenue.total,
      totalDiscount: revenue.totalDiscount,
      byPayMode: {
        cash: revenue.byCash,
        bank: revenue.byBank,
        split: revenue.bySplit
      },
      byBank: banks,
      pettyCashIn,
      pettyCashOut,
      pettyCashItems: pettyCash,
      expenses: totalExpenses,
      expenseItems: expenses,
      expected,
      counted: shift.close_float || 0,
      diff: (shift.close_float || 0) - expected
    }
  }

  /** Expenses summary for P&L report — totals by category within date range */
  static expensesSummary(filters: any = {}) {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params: any[] = []
    if (filters.startDate) { where += ' AND ex.created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND ex.created_at <= ?'; params.push(filters.endDate + ' 23:59:59') }

    const total = db.prepare(`
      SELECT COALESCE(SUM(ex.amount), 0) as total_expenses
      FROM expenses ex ${where}
    `).get(...params) as any

    const byCategory = db.prepare(`
      SELECT ex.category, COALESCE(SUM(ex.amount), 0) as cat_total, COUNT(*) as cat_count
      FROM expenses ex ${where}
      GROUP BY ex.category ORDER BY cat_total DESC
    `).all(...params)

    return {
      totalExpenses: total.total_expenses,
      byCategory
    }
  }
}
