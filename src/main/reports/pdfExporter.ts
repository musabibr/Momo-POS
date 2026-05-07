/**
 * PDF Report Exporter
 *
 * Uses Electron's built-in BrowserWindow.printToPDF() to generate
 * professional Arabic RTL reports. No external dependencies needed.
 */
import { BrowserWindow, app, dialog } from 'electron'
import { getDb } from '../db/connection'
import { writeFileSync } from 'fs'
import { join } from 'path'

// ─── Shared HTML Template Shell ──────────────────────────────

function htmlShell(title: string, dateRange: string, body: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Tajawal', 'Segoe UI', sans-serif;
    direction: rtl; color: #1e1b4b; background: #fff;
    font-size: 12px; line-height: 1.6; padding: 32px 36px;
  }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 3px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px;
  }
  .header h1 { font-size: 22px; font-weight: 900; color: #581c87; }
  .header .brand { font-size: 28px; font-weight: 900; color: #7c3aed; }
  .header .meta { text-align: left; color: #64748b; font-size: 11px; }
  .section-title {
    font-size: 15px; font-weight: 800; color: #581c87;
    margin: 20px 0 10px; padding: 6px 12px;
    background: #f5f3ff; border-right: 4px solid #7c3aed; border-radius: 0 6px 6px 0;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  thead th {
    background: #f5f3ff; color: #581c87; font-size: 11px; font-weight: 800;
    padding: 8px 10px; text-align: right; border-bottom: 2px solid #ddd6fe;
  }
  tbody td {
    padding: 7px 10px; border-bottom: 1px solid #f1f0fb;
    font-size: 11.5px; color: #334155;
  }
  tbody tr:nth-child(even) { background: #faf9ff; }
  .kpi-grid { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
  .kpi-card {
    flex: 1; min-width: 140px; padding: 14px 16px;
    border: 1.5px solid #ede9fe; border-radius: 10px; text-align: center;
  }
  .kpi-label { font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px; }
  .kpi-value { font-size: 20px; font-weight: 900; color: #7c3aed; }
  .kpi-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .summary-row {
    display: flex; justify-content: space-between; padding: 8px 14px;
    background: #f5f3ff; border-radius: 8px; margin-top: 12px; font-weight: 800;
    font-size: 14px; color: #581c87;
  }
  .footer {
    margin-top: 30px; padding-top: 12px; border-top: 1.5px solid #e2e8f0;
    text-align: center; color: #94a3b8; font-size: 10px;
  }
  .badge {
    display: inline-block; padding: 2px 10px; border-radius: 99px;
    font-size: 10px; font-weight: 700;
  }
  .badge-green { background: #ecfdf5; color: #047857; }
  .badge-blue { background: #eff6ff; color: #1d4ed8; }
  .badge-amber { background: #fffbeb; color: #b45309; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Momo</div>
      <h1>${title}</h1>
    </div>
    <div class="meta">
      <div>${dateRange}</div>
      <div>تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  </div>
  ${body}
  <div class="footer">
    تم إنشاء هذا التقرير بواسطة نظام Momo لإدارة المطاعم &bull;
    ${new Date().getFullYear()}
  </div>
</body>
</html>`
}

function fmtNum(n: number | null | undefined): string {
  return (n || 0).toLocaleString('ar-SA')
}

function payLabel(mode: string): string {
  if (mode === 'cash') return 'نقداً'
  if (mode === 'bank') return 'بنكي'
  return 'مقسم'
}

function payBadge(mode: string): string {
  const cls = mode === 'cash' ? 'badge-green' : mode === 'bank' ? 'badge-blue' : 'badge-amber'
  return `<span class="badge ${cls}">${payLabel(mode)}</span>`
}

// ─── Report Generators ──────────────────────────────────────

export class PDFExporter {

  static generateSalesHTML(filters: { startDate?: string; endDate?: string }): string {
    const db = getDb()
    let where = "WHERE o.status = 'confirmed'"
    const params: any[] = []
    if (filters.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate + ' 23:59:59') }

    const orders = db.prepare(`
      SELECT o.order_num, o.total, o.disc_amount, o.pay_mode, o.bank_name,
             o.cash_in, o.cash_change, o.cash_part, o.bank_part,
             o.created_at, e.name as employee_name, c.name as customer_name
      FROM orders o
      LEFT JOIN employees e ON e.id = o.employee_id
      LEFT JOIN customers c ON c.id = o.customer_id
      ${where}
      ORDER BY o.created_at DESC
    `).all(...params) as any[]

    // Summary KPIs
    const total = orders.reduce((s, o) => s + (o.total || 0), 0)
    const discount = orders.reduce((s, o) => s + (o.disc_amount || 0), 0)
    const cashSum = orders.filter(o => o.pay_mode === 'cash').reduce((s, o) => s + (o.total || 0), 0)
    const bankSum = orders.filter(o => o.pay_mode === 'bank').reduce((s, o) => s + (o.total || 0), 0)
    const splitSum = orders.filter(o => o.pay_mode === 'split').reduce((s, o) => s + (o.total || 0), 0)
    const avg = orders.length > 0 ? Math.round(total / orders.length) : 0

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">إجمالي الإيرادات</div><div class="kpi-value">${fmtNum(total)} ج.س</div></div>
        <div class="kpi-card"><div class="kpi-label">إجمالي الطلبات</div><div class="kpi-value">${fmtNum(orders.length)}</div></div>
        <div class="kpi-card"><div class="kpi-label">متوسط الطلب</div><div class="kpi-value">${fmtNum(avg)} ج.س</div></div>
        <div class="kpi-card"><div class="kpi-label">إجمالي الخصومات</div><div class="kpi-value" style="color:#e11d48">${fmtNum(discount)} ج.س</div></div>
      </div>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">مبيعات نقدية</div><div class="kpi-value" style="color:#047857">${fmtNum(cashSum)} ج.س</div></div>
        <div class="kpi-card"><div class="kpi-label">مبيعات بنكية</div><div class="kpi-value" style="color:#1d4ed8">${fmtNum(bankSum)} ج.س</div></div>
        <div class="kpi-card"><div class="kpi-label">دفع مقسم</div><div class="kpi-value" style="color:#b45309">${fmtNum(splitSum)} ج.س</div></div>
      </div>

      <div class="section-title">تفاصيل الطلبات (${fmtNum(orders.length)} طلب)</div>
      <table>
        <thead><tr>
          <th>رقم الطلب</th><th>الإجمالي</th><th>الخصم</th><th>طريقة الدفع</th>
          <th>البنك</th><th>الموظف</th><th>العميل</th><th>التاريخ</th>
        </tr></thead>
        <tbody>
          ${orders.map(o => `<tr>
            <td style="font-weight:800;color:#581c87">#${o.order_num}</td>
            <td style="font-weight:700;color:#7c3aed">${fmtNum(o.total)} ج.س</td>
            <td>${o.disc_amount > 0 ? `<span style="color:#e11d48">−${fmtNum(o.disc_amount)}</span>` : '—'}</td>
            <td>${payBadge(o.pay_mode)}</td>
            <td>${o.bank_name || '—'}</td>
            <td>${o.employee_name || '—'}</td>
            <td>${o.customer_name || '—'}</td>
            <td style="color:#64748b;font-size:10px">${o.created_at?.slice(0, 16) || ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="summary-row">
        <span>الإجمالي</span><span>${fmtNum(total)} ج.س</span>
      </div>
    `

    const dateRange = `${filters.startDate || 'البداية'} — ${filters.endDate || 'الآن'}`
    return htmlShell('تقرير المبيعات', dateRange, body)
  }

  static generateItemsHTML(filters: { startDate?: string; endDate?: string }): string {
    const db = getDb()
    let where = "WHERE o.status = 'confirmed'"
    const params: any[] = []
    if (filters.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate + ' 23:59:59') }

    const items = db.prepare(`
      SELECT i.name, SUM(oi.qty) as total_qty, SUM(oi.unit_price * oi.qty) as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN items i ON i.id = oi.item_id
      ${where}
      GROUP BY oi.item_id
      ORDER BY total_qty DESC
    `).all(...params) as any[]

    const totalRev = items.reduce((s, i) => s + (i.total_revenue || 0), 0)
    const totalQty = items.reduce((s, i) => s + (i.total_qty || 0), 0)
    const maxRev = items.length > 0 ? items[0].total_revenue : 1

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">إجمالي الأصناف المباعة</div><div class="kpi-value">${fmtNum(totalQty)}</div></div>
        <div class="kpi-card"><div class="kpi-label">إجمالي الإيرادات</div><div class="kpi-value">${fmtNum(totalRev)} ج.س</div></div>
        <div class="kpi-card"><div class="kpi-label">عدد الأصناف الفريدة</div><div class="kpi-value">${fmtNum(items.length)}</div></div>
      </div>

      <div class="section-title">تصنيف الأصناف حسب المبيعات</div>
      <table>
        <thead><tr>
          <th>#</th><th>الصنف</th><th>الكمية المباعة</th><th>الإيرادات</th><th>النسبة</th>
        </tr></thead>
        <tbody>
          ${items.map((it, i) => {
            const pct = Math.round((it.total_revenue || 0) / (totalRev || 1) * 100)
            const barW = Math.round((it.total_revenue || 0) / maxRev * 100)
            return `<tr>
              <td style="font-weight:800;color:${i < 3 ? '#b45309' : '#94a3b8'}">#${i + 1}</td>
              <td style="font-weight:700;color:#1e1b4b">${it.name}</td>
              <td style="font-weight:700;color:#7c3aed">${fmtNum(it.total_qty)}</td>
              <td style="font-weight:700;color:#047857">${fmtNum(it.total_revenue)} ج.س</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="flex:1;height:6px;background:#f1f0fb;border-radius:99px">
                    <div style="height:100%;width:${barW}%;background:linear-gradient(90deg,#7c3aed,#ec4899);border-radius:99px"></div>
                  </div>
                  <span style="font-size:10px;font-weight:700;color:#7c3aed">${pct}%</span>
                </div>
              </td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
      <div class="summary-row">
        <span>إجمالي الإيرادات</span><span>${fmtNum(totalRev)} ج.س</span>
      </div>
    `

    const dateRange = `${filters.startDate || 'البداية'} — ${filters.endDate || 'الآن'}`
    return htmlShell('تقرير الأصناف', dateRange, body)
  }

  static generatePaymentsHTML(filters: { startDate?: string; endDate?: string }): string {
    const db = getDb()
    let where = "WHERE o.status = 'confirmed'"
    const params: any[] = []
    if (filters.startDate) { where += ' AND o.created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND o.created_at <= ?'; params.push(filters.endDate + ' 23:59:59') }

    const data = db.prepare(`
      SELECT pay_mode, COALESCE(bank_name, 'نقداً') as bank_name,
             COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM orders o ${where}
      GROUP BY pay_mode, bank_name
      ORDER BY total DESC
    `).all(...params) as any[]

    const grandTotal = data.reduce((s, d) => s + (d.total || 0), 0)

    // Group by pay mode for summary
    const cashTotal = data.filter(d => d.pay_mode === 'cash').reduce((s, d) => s + (d.total || 0), 0)
    const bankTotal = data.filter(d => d.pay_mode === 'bank').reduce((s, d) => s + (d.total || 0), 0)
    const splitTotal = data.filter(d => d.pay_mode === 'split').reduce((s, d) => s + (d.total || 0), 0)

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">نقداً</div>
          <div class="kpi-value" style="color:#047857">${fmtNum(cashTotal)} ج.س</div>
          <div class="kpi-sub">${grandTotal > 0 ? Math.round(cashTotal / grandTotal * 100) : 0}% من الإجمالي</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">تحويل بنكي</div>
          <div class="kpi-value" style="color:#1d4ed8">${fmtNum(bankTotal)} ج.س</div>
          <div class="kpi-sub">${grandTotal > 0 ? Math.round(bankTotal / grandTotal * 100) : 0}% من الإجمالي</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">دفع مقسم</div>
          <div class="kpi-value" style="color:#b45309">${fmtNum(splitTotal)} ج.س</div>
          <div class="kpi-sub">${grandTotal > 0 ? Math.round(splitTotal / grandTotal * 100) : 0}% من الإجمالي</div>
        </div>
      </div>

      <div class="section-title">تفصيل حسب طريقة الدفع والبنك</div>
      <table>
        <thead><tr>
          <th>طريقة الدفع</th><th>البنك / القناة</th><th>عدد العمليات</th><th>المبلغ</th><th>النسبة</th>
        </tr></thead>
        <tbody>
          ${data.map(d => {
            const pct = grandTotal > 0 ? Math.round(d.total / grandTotal * 100) : 0
            return `<tr>
              <td>${payBadge(d.pay_mode)}</td>
              <td style="font-weight:600">${d.bank_name}</td>
              <td>${fmtNum(d.count)} عملية</td>
              <td style="font-weight:700;color:#7c3aed">${fmtNum(d.total)} ج.س</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="flex:1;height:6px;background:#f1f0fb;border-radius:99px">
                    <div style="height:100%;width:${pct}%;background:#7c3aed;border-radius:99px"></div>
                  </div>
                  <span style="font-size:10px;font-weight:700;color:#7c3aed">${pct}%</span>
                </div>
              </td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
      <div class="summary-row">
        <span>الإجمالي</span><span>${fmtNum(grandTotal)} ج.س</span>
      </div>
    `

    const dateRange = `${filters.startDate || 'البداية'} — ${filters.endDate || 'الآن'}`
    return htmlShell('تقرير طرق الدفع', dateRange, body)
  }

  static generateAuditHTML(filters: { startDate?: string; endDate?: string }): string {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params: any[] = []
    if (filters.startDate) { where += ' AND al.created_at >= ?'; params.push(filters.startDate) }
    if (filters.endDate) { where += ' AND al.created_at <= ?'; params.push(filters.endDate + ' 23:59:59') }

    const logs = db.prepare(`
      SELECT al.action, al.detail, al.created_at, e.name as employee_name
      FROM action_log al
      LEFT JOIN employees e ON e.id = al.employee_id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT 5000
    `).all(...params) as any[]

    const actionLabels: Record<string, string> = {
      ORDER_CONFIRM: 'تأكيد طلب', ORDER_VOID: 'إلغاء طلب', SHIFT_OPEN: 'فتح وردية',
      SHIFT_CLOSE: 'إغلاق وردية', ITEM_CREATE: 'إضافة صنف', ITEM_UPDATE: 'تعديل صنف',
      ITEM_DELETE: 'حذف صنف', PO_CREATED: 'أمر شراء', VOID_ORDER: 'إلغاء طلب',
      LOYALTY_POINTS: 'نقاط ولاء'
    }

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">إجمالي العمليات</div><div class="kpi-value">${fmtNum(logs.length)}</div></div>
      </div>

      <div class="section-title">سجل العمليات</div>
      <table>
        <thead><tr>
          <th>العملية</th><th>الموظف</th><th>التفاصيل</th><th>التاريخ</th>
        </tr></thead>
        <tbody>
          ${logs.map(l => `<tr>
            <td><span class="badge badge-gray">${actionLabels[l.action] || l.action}</span></td>
            <td style="font-weight:600">${l.employee_name || 'النظام'}</td>
            <td style="color:#64748b;font-size:10.5px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.detail || '—'}</td>
            <td style="color:#64748b;font-size:10px">${l.created_at?.slice(0, 16) || ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `

    const dateRange = `${filters.startDate || 'البداية'} — ${filters.endDate || 'الآن'}`
    return htmlShell('سجل العمليات', dateRange, body)
  }

  // ─── PDF Generation via hidden BrowserWindow ──────────────

  static async htmlToPDF(html: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: { offscreen: true }
      })

      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      win.webContents.on('did-finish-load', async () => {
        try {
          // Small delay for fonts & CSS to settle
          await new Promise(r => setTimeout(r, 300))
          const pdf = await win.webContents.printToPDF({
            printBackground: true,
            landscape: false,
            pageSize: 'A4',
            margins: { top: 0.4, bottom: 0.4, left: 0.3, right: 0.3 }
          })
          resolve(Buffer.from(pdf))
        } catch (err) {
          reject(err)
        } finally {
          win.destroy()
        }
      })

      win.webContents.on('did-fail-load', (_e, code, desc) => {
        win.destroy()
        reject(new Error(`Failed to load report: ${desc} (${code})`))
      })
    })
  }

  // ─── Save to file ─────────────────────────────────────────

  static async saveToFile(pdfBuffer: Buffer, reportType: string, filters: { startDate?: string; endDate?: string }): Promise<string> {
    const reportNames: Record<string, string> = {
      sales: 'مبيعات', items: 'أصناف', pays: 'طرق_الدفع', audit: 'سجل_العمليات'
    }
    const start = filters.startDate || 'all'
    const end = filters.endDate || 'all'
    const fileName = `momo_${reportNames[reportType] || reportType}_${start}_${end}.pdf`

    // Use USB path as default dir if set, otherwise Documents
    const db = getDb()
    const usbPath = (db.prepare(`SELECT value FROM settings WHERE key = 'backup_usb_path'`).get() as any)?.value
    const defaultDir = usbPath || app.getPath('documents')

    // Always show save dialog so the user picks the folder
    const result = await dialog.showSaveDialog({
      title: 'تصدير التقرير PDF',
      defaultPath: join(defaultDir, fileName),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })
    if (result.canceled || !result.filePath) throw new Error('تم إلغاء التصدير')

    writeFileSync(result.filePath, pdfBuffer)
    console.log(`[PDF] Exported ${reportType} to ${result.filePath}`)
    return result.filePath
  }
}
