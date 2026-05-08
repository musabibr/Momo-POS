/**
 * HTML Receipt Templates for Thermal Printing (80mm)
 * 
 * Generates beautiful, bold Arabic RTL receipts rendered via Electron's
 * webContents.print(). Designed for 80mm thermal printers.
 */

import type { ReceiptData, KitchenTicketData, ZReportData } from './templates'

// ── Shared CSS ───────────────────────────────────────────────────────

const BASE_CSS = `
@page {
  size: 80mm auto;
  margin: 0;
}
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
  font-size: 13px;
  color: #111;
  width: 80mm;
  padding: 3mm 2mm;
  direction: rtl;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.center { text-align: center; }
.bold { font-weight: 900; }
.sep {
  border: none;
  border-top: 1.5px dashed #444;
  margin: 6px 0;
}
.sep-thick {
  border: none;
  border-top: 2.5px solid #111;
  margin: 8px 0;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 2px 0;
}
.row .label { font-weight: 700; }
.row .value { font-weight: 900; }
table {
  width: 100%;
  border-collapse: collapse;
}
td, th {
  padding: 3px 2px;
  vertical-align: top;
  text-align: right;
}
th {
  font-weight: 900;
  font-size: 12px;
  border-bottom: 1.5px solid #333;
  padding-bottom: 4px;
}
`

// ── Cashier Receipt ──────────────────────────────────────────────────

export function buildCashierReceiptHtml(
  data: ReceiptData,
  header: string,
  footer: string
): string {
  const time = data.createdAt?.slice(11, 16) || ''
  const date = data.createdAt?.slice(0, 10) || ''
  const isTA = (data as any).orderType === 'takeaway'
  const orderTypeLabel = isTA ? 'سفري' : 'محلي'
  const tableNum = data.tableNum

  let itemsHtml = ''
  for (const item of data.items) {
    const name = item.variationLabel ? `${item.name} (${item.variationLabel})` : item.name
    const lineTotal = item.unitPrice * item.qty
    itemsHtml += `
      <tr>
        <td style="font-weight:800; font-size:14px;">${esc(name)}</td>
        <td style="text-align:center; font-weight:700; width:36px;">${item.qty}</td>
        <td style="text-align:left; font-weight:900; width:70px; font-size:14px;">${lineTotal.toLocaleString()}</td>
      </tr>`
    if (item.modifiers?.length) {
      for (const m of item.modifiers) {
        itemsHtml += `<tr><td colspan="3" style="font-size:12px; color:#444; padding-right:12px;">+ ${esc(m)}</td></tr>`
      }
    }
  }

  let payHtml = ''
  if (data.payMode === 'cash' && data.cashIn) {
    payHtml = `
      <div class="row"><span class="label">المدفوع:</span><span class="value">${data.cashIn.toLocaleString()}</span></div>
      <div class="row"><span class="label">الباقي:</span><span class="value">${(data.cashChange || 0).toLocaleString()}</span></div>`
  } else if (data.payMode === 'bank') {
    payHtml = `<div class="row"><span class="label">الدفع:</span><span class="value">${esc(data.bankName || 'بنكي')}</span></div>`
  } else if (data.payMode === 'split') {
    payHtml = `
      <div class="row"><span class="label">نقداً:</span><span class="value">${(data.cashIn || 0).toLocaleString()}</span></div>
      <div class="row"><span class="label">بنكي:</span><span class="value">${(data.bankAmount || 0).toLocaleString()} (${esc(data.bankName || '')})</span></div>`
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><style>${BASE_CSS}
.header-text { font-size: 18px; font-weight: 900; letter-spacing: 1px; line-height: 1.5; }
.order-badge { display: inline-block; padding: 2px 14px; border-radius: 99px; font-size: 12px; font-weight: 900; border: 1.5px solid #333; margin: 4px 0; }
.total-row { font-size: 20px; font-weight: 900; padding: 6px 0; }
</style></head>
<body>

<div class="center">
  <div class="header-text">${esc(header)}</div>
</div>
<hr class="sep-thick">

<div class="row">
  <span style="font-size:16px; font-weight:900;">طلب #${data.orderNum}</span>
  <span style="font-weight:700;">${time}</span>
</div>
<div style="font-size:12px; color:#555; margin-bottom:2px;">${date}</div>
<div class="center">
  <span class="order-badge">${orderTypeLabel}</span>
</div>
${tableNum ? `<div class="center" style="font-size:14px; font-weight:900; margin:4px 0;">[ طاولة: ${esc(tableNum)} ]</div>` : ''}
${data.customerName ? `<div style="font-size:13px; font-weight:700; margin:2px 0;">العميل: ${esc(data.customerName)}</div>` : ''}

<hr class="sep">

<table>
  <thead><tr>
    <th>الصنف</th>
    <th style="text-align:center; width:36px;">عدد</th>
    <th style="text-align:left; width:70px;">المبلغ</th>
  </tr></thead>
  <tbody>${itemsHtml}</tbody>
</table>

<hr class="sep">

${data.discAmount > 0 ? `
  <div class="row"><span class="label">المجموع الفرعي:</span><span class="value">${data.subtotal.toLocaleString()}</span></div>
  <div class="row" style="color:#c00;"><span class="label">الخصم:</span><span class="value">−${data.discAmount.toLocaleString()}</span></div>
` : ''}

<div class="row total-row">
  <span>الإجمالي:</span>
  <span>${data.total.toLocaleString()} ج.س</span>
</div>

<hr class="sep">
${payHtml}
<hr class="sep">

<div class="center" style="font-size:13px; font-weight:700; padding:6px 0; line-height:1.6;">
  ${esc(footer)}
</div>

</body></html>`
}

// ── Kitchen Ticket ───────────────────────────────────────────────────

export function buildKitchenTicketHtml(data: KitchenTicketData): string {
  const time = data.createdAt?.slice(11, 16) || ''
  const date = data.createdAt?.slice(0, 10) || ''
  const isTA = (data as any).orderType === 'takeaway'
  const orderTypeLabel = isTA ? '🛍️ سفري' : '🏠 محلي'

  let itemsHtml = ''
  for (const item of data.items) {
    const name = item.variationLabel ? `${item.name} (${item.variationLabel})` : item.name
    itemsHtml += `
      <div style="display:flex; align-items:baseline; gap:8px; padding:5px 0; border-bottom:1px dotted #ccc;">
        <span style="font-size:22px; font-weight:900; min-width:40px; text-align:center; background:#222; color:#fff; border-radius:6px; padding:2px 8px;">${item.qty}</span>
        <span style="font-size:17px; font-weight:900; flex:1;">${esc(name)}</span>
      </div>`
    if (item.modifiers?.length) {
      for (const m of item.modifiers) {
        itemsHtml += `<div style="font-size:14px; font-weight:700; padding:2px 48px 2px 0; color:#333;">+ ${esc(m)}</div>`
      }
    }
    if (item.notes) {
      itemsHtml += `<div style="font-size:14px; font-weight:700; padding:2px 48px 2px 0; color:#666;">📝 ${esc(item.notes)}</div>`
    }
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><style>${BASE_CSS}
body { font-size: 15px; }
</style></head>
<body>

<div class="center" style="padding:6px 0;">
  <div style="font-size:22px; font-weight:900; letter-spacing:2px;">** تذكرة مطبخ **</div>
</div>
<hr class="sep-thick">

<div class="row" style="padding:4px 0;">
  <span style="font-size:24px; font-weight:900;">طلب #${data.orderNum}</span>
  <span style="font-size:16px; font-weight:800;">${time}</span>
</div>
<div class="center" style="margin:4px 0;">
  <span style="font-size:16px; font-weight:900;">${orderTypeLabel}</span>
</div>
${data.tableNum ? `<div class="center" style="font-size:20px; font-weight:900; padding:6px; margin:4px 0; border:2.5px solid #111; border-radius:8px;">طاولة: ${esc(data.tableNum)}</div>` : ''}

<hr class="sep-thick">

${itemsHtml}

<hr class="sep-thick">
<div class="center" style="font-size:12px; color:#666; padding:4px 0;">${date} · ${time}</div>

</body></html>`
}

// ── Z-Report ─────────────────────────────────────────────────────────

export function buildZReportHtml(data: ZReportData, restaurantName: string): string {
  const row = (label: string, value: string, highlight = false) =>
    `<div class="row" ${highlight ? 'style="font-size:15px;"' : ''}>
      <span class="label">${label}</span>
      <span class="value">${value}</span>
    </div>`

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><style>${BASE_CSS}</style></head>
<body>

<div class="center" style="padding:6px 0;">
  <div style="font-size:18px; font-weight:900;">═══ تقرير Z ═══</div>
  <div style="font-size:16px; font-weight:800; margin-top:4px;">${esc(restaurantName)}</div>
</div>
<hr class="sep-thick">

${row('الوردية:', `#${data.shiftId}`)}
${row('الفتح:', data.openedAt?.slice(0, 16) || '')}
${row('الإغلاق:', data.closedAt?.slice(0, 16) || '')}
<hr class="sep">

${row('إجمالي الطلبات:', `${data.totalOrders}`, true)}
${row('إجمالي الإيرادات:', `${data.totalRevenue.toLocaleString()} ج.س`, true)}
${data.totalDiscount > 0 ? row('إجمالي الخصومات:', `−${data.totalDiscount.toLocaleString()} ج.س`) : ''}
<hr class="sep">

${row('نقداً:', `${data.byCash.toLocaleString()} ج.س`)}
${row('بنكي:', `${data.byBank.toLocaleString()} ج.س`)}
${row('مقسم:', `${data.bySplit.toLocaleString()} ج.س`)}
<hr class="sep">

${row('الرصيد الافتتاحي:', `${data.openFloat.toLocaleString()} ج.س`)}
${row('إيداعات درج:', `+${data.pettyCashIn.toLocaleString()} ج.س`)}
${row('سحوبات درج:', `−${data.pettyCashOut.toLocaleString()} ج.س`)}
${row('مصروفات:', `−${data.expenses.toLocaleString()} ج.س`)}
<hr class="sep">

${row('النقد المتوقع:', `${data.expected.toLocaleString()} ج.س`, true)}
${row('النقد المعدود:', `${data.counted.toLocaleString()} ج.س`, true)}
${row(data.diff >= 0 ? 'فائض:' : 'عجز:', `${data.diff.toLocaleString()} ج.س`, true)}
<hr class="sep-thick">

<div class="center" style="font-size:11px; color:#666; padding:4px 0;">
  طُبع: ${new Date().toLocaleString('ar-SA')}
</div>

</body></html>`
}

// ── Test Print Page ──────────────────────────────────────────────────

export function buildTestPageHtml(printerRole: string): string {
  const roleLabel = printerRole === 'kitchen' ? 'طابعة المطبخ' : 'طابعة الكاشير'
  const now = new Date().toLocaleString('ar-SA')

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><style>${BASE_CSS}</style></head>
<body>

<div class="center" style="padding:12px 0;">
  <div style="font-size:20px; font-weight:900;">═══ طباعة تجريبية ═══</div>
  <div style="font-size:16px; font-weight:800; margin-top:8px;">مومو POS</div>
</div>
<hr class="sep-thick">

<div class="center" style="padding:10px 0;">
  <div style="font-size:16px; font-weight:900;">✅ الطابعة تعمل بنجاح</div>
  <div style="font-size:14px; font-weight:700; margin-top:8px;">${roleLabel}</div>
</div>

<hr class="sep">

<div class="center" style="font-size:14px; font-weight:700; padding:6px 0;">
  اختبار النص العربي: ١٢٣٤٥٦٧٨٩٠
</div>
<div class="center" style="font-size:14px; font-weight:700; padding:2px 0;">
  Test English: ABCDEFGHIJ
</div>
<div class="center" style="font-size:14px; font-weight:700; padding:2px 0;">
  أرقام: 0 1 2 3 4 5 6 7 8 9
</div>

<hr class="sep">

<div class="center" style="font-size:12px; color:#666; padding:4px 0;">
  ${now}
</div>

</body></html>`
}

// ── Utility ──────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}


