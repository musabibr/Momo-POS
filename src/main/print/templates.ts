/**
 * Print Templates for ESC/POS Thermal Printers
 * Templates: cashierReceipt, kitchenTicket, zReport, purchaseOrder
 */

const W = 32 // receipt width in chars

function pad(left: string, right: string, width = W): string {
  const gap = width - left.length - right.length
  return left + ' '.repeat(Math.max(1, gap)) + right
}

function center(text: string, width = W): string {
  const gap = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(gap) + text
}

const SEP = '─'.repeat(W)

export interface ReceiptData {
  orderNum: number
  items: { name: string; qty: number; unitPrice: number; variationLabel?: string; modifiers?: string[] }[]
  subtotal: number
  discAmount: number
  total: number
  payMode: string
  cashIn?: number
  cashChange?: number
  bankName?: string
  bankAmount?: number
  customerName?: string
  createdAt: string
  tableNum?: string
}

export function cashierReceipt(data: ReceiptData, header: string, footer: string): string {
  const lines: string[] = []
  lines.push(center(header))
  lines.push(SEP)
  lines.push(pad(`طلب #${data.orderNum}`, data.createdAt?.slice(11, 16) || ''))
  lines.push(data.createdAt?.slice(0, 10) || '')
  if (data.tableNum) lines.push(center(`[ طاولة: ${data.tableNum} ]`))
  if (data.customerName) lines.push(`العميل: ${data.customerName}`)
  lines.push(SEP)

  for (const item of data.items) {
    const name = item.variationLabel ? `${item.name} (${item.variationLabel})` : item.name
    const price = `${item.unitPrice * item.qty}`
    lines.push(pad(`[${item.qty}] ${name}`, price))
    if (item.modifiers?.length) {
      for (const m of item.modifiers) lines.push(`  + ${m}`)
    }
  }

  lines.push(SEP)
  if (data.discAmount > 0) {
    lines.push(pad('المجموع الفرعي:', `${data.subtotal}`))
    lines.push(pad('الخصم:', `-${data.discAmount}`))
  }
  lines.push(pad('الإجمالي:', `${data.total} ج.س`))
  lines.push(SEP)

  if (data.payMode === 'cash' && data.cashIn) {
    lines.push(pad('المدفوع:', `${data.cashIn}`))
    lines.push(pad('الباقي:', `${data.cashChange || 0}`))
  } else if (data.payMode === 'bank') {
    lines.push(`الدفع: ${data.bankName || 'بنكي'}`)
  } else if (data.payMode === 'split') {
    lines.push(pad('نقداً:', `${data.cashIn || 0}`))
    lines.push(pad('بنكي:', `${data.bankAmount || 0} (${data.bankName || ''})`))
  }

  lines.push(SEP)
  lines.push(center(footer))
  return lines.join('\n')
}

export interface KitchenTicketData {
  orderNum: number
  items: { name: string; qty: number; variationLabel?: string; modifiers?: string[]; notes?: string }[]
  createdAt: string
  tableNum?: string
}

export function kitchenTicket(data: KitchenTicketData): string {
  const lines: string[] = []
  lines.push(center('** تذكرة مطبخ **'))
  lines.push(SEP)
  lines.push(pad(`طلب #${data.orderNum}`, data.createdAt?.slice(11, 16) || ''))
  if (data.tableNum) lines.push(center(`[ طاولة: ${data.tableNum} ]`))
  lines.push(SEP)

  for (const item of data.items) {
    const name = item.variationLabel ? `${item.name} (${item.variationLabel})` : item.name
    lines.push(`[${item.qty}]  ${name}`)
    if (item.modifiers?.length) {
      for (const m of item.modifiers) lines.push(`   + ${m}`)
    }
    if (item.notes) lines.push(`   ملاحظة: ${item.notes}`)
  }

  lines.push(SEP)
  lines.push(center(`${data.createdAt?.slice(0, 10) || ''}`))
  return lines.join('\n')
}

export interface ZReportData {
  shiftId: number
  openedAt: string
  closedAt: string
  openFloat: number
  closeFloat: number
  totalOrders: number
  totalRevenue: number
  totalDiscount: number
  byCash: number
  byBank: number
  bySplit: number
  pettyCashIn: number
  pettyCashOut: number
  expenses: number
  expected: number
  counted: number
  diff: number
}

export function zReport(data: ZReportData, restaurantName: string): string {
  const lines: string[] = []
  lines.push(center('═══ تقرير Z ═══'))
  lines.push(center(restaurantName))
  lines.push(SEP)
  lines.push(pad('الوردية:', `#${data.shiftId}`))
  lines.push(pad('الفتح:', data.openedAt?.slice(0, 16) || ''))
  lines.push(pad('الإغلاق:', data.closedAt?.slice(0, 16) || ''))
  lines.push(SEP)
  lines.push(pad('إجمالي الطلبات:', `${data.totalOrders}`))
  lines.push(pad('إجمالي الإيرادات:', `${data.totalRevenue} ج.س`))
  if (data.totalDiscount > 0) lines.push(pad('إجمالي الخصومات:', `-${data.totalDiscount} ج.س`))
  lines.push(SEP)
  lines.push(pad('نقداً:', `${data.byCash} ج.س`))
  lines.push(pad('بنكي:', `${data.byBank} ج.س`))
  lines.push(pad('مقسم:', `${data.bySplit} ج.س`))
  lines.push(SEP)
  lines.push(pad('الرصيد الافتتاحي:', `${data.openFloat} ج.س`))
  lines.push(pad('إيداعات درج:', `+${data.pettyCashIn} ج.س`))
  lines.push(pad('سحوبات درج:', `-${data.pettyCashOut} ج.س`))
  lines.push(pad('مصروفات:', `-${data.expenses} ج.س`))
  lines.push(SEP)
  lines.push(pad('النقد المتوقع:', `${data.expected} ج.س`))
  lines.push(pad('النقد المعدود:', `${data.counted} ج.س`))
  lines.push(pad(data.diff >= 0 ? 'فائض:' : 'عجز:', `${data.diff} ج.س`))
  lines.push(SEP)
  lines.push(center(`طُبع: ${new Date().toLocaleString('ar-SA')}`))
  return lines.join('\n')
}

export interface POData {
  supplierName: string
  lines: { name: string; qty: number; unit: string }[]
}

export function purchaseOrder(data: POData, restaurantName: string): string {
  const out: string[] = []
  out.push(center('═══ أمر شراء ═══'))
  out.push(center(restaurantName))
  out.push(SEP)
  out.push(pad('المورد:', data.supplierName))
  out.push(pad('التاريخ:', new Date().toLocaleDateString('ar-SA')))
  out.push(SEP)

  for (const l of data.lines) {
    out.push(pad(l.name, `${l.qty} ${l.unit}`))
  }

  out.push(SEP)
  out.push(center(`${data.lines.length} صنف`))
  out.push(center('التوقيع: _______________'))
  return out.join('\n')
}
