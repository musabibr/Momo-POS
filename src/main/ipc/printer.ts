/**
 * Thermal Printer Service (ESC/POS)
 * 
 * Stub mode: formats receipts and logs to console.
 * When node-thermal-printer is installed, uncomment the real implementation.
 * Print failures NEVER block order commit — all calls are try/catch wrapped.
 */

import { ipcMain, shell } from 'electron'
import { getDb } from '../db/connection'
import { cashierReceipt, kitchenTicket, zReport, purchaseOrder } from '../print/templates'
import type { ReceiptData, KitchenTicketData, ZReportData, POData } from '../print/templates'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

function getSetting(key: string): string {
  const db = getDb()
  return (db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as any)?.value || ''
}

function logPrintFailure(type: string, error: string): void {
  try {
    const db = getDb()
    db.prepare(`INSERT INTO action_log (action, detail, created_at) VALUES ('PRINT_FAILED', ?, datetime('now'))`)
      .run(JSON.stringify({ type, error }))
  } catch { /* ignore */ }
}

export function registerPrinterIpc(): void {
  // Cashier receipt (Printer 1)
  ipcMain.handle('printer:print', async (_event, receiptData: ReceiptData) => {
    try {
      const header = getSetting('receipt_header') || 'موموـ POS'
      const footer = getSetting('receipt_footer') || 'شكراً لزيارتكم'
      const text = cashierReceipt(receiptData, header, footer)

      // TODO: Replace with actual printer integration
      console.log('[Printer 1] Cashier receipt:\n' + text)
      return { data: { printed: false, stub: true, text } }
    } catch (err: any) {
      logPrintFailure('cashier_receipt', err.message)
      console.error('[Printer 1] Error:', err.message)
      return { error: err.message }
    }
  })

  // Kitchen ticket (Printer 2)
  ipcMain.handle('printer:printKitchen', async (_event, ticketData: KitchenTicketData) => {
    try {
      const text = kitchenTicket(ticketData)
      console.log('[Printer 2] Kitchen ticket:\n' + text)
      return { data: { printed: false, stub: true, text } }
    } catch (err: any) {
      logPrintFailure('kitchen_ticket', err.message)
      console.error('[Printer 2] Error:', err.message)
      return { error: err.message }
    }
  })

  // Z-Report (Printer 1)
  ipcMain.handle('printer:printZReport', async (_event, reportData: ZReportData) => {
    try {
      const name = getSetting('restaurant_name') || 'موموـ'
      const text = zReport(reportData, name)
      console.log('[Printer 1] Z-Report:\n' + text)
      return { data: { printed: false, stub: true, text } }
    } catch (err: any) {
      logPrintFailure('z_report', err.message)
      console.error('[Printer 1] Error:', err.message)
      return { error: err.message }
    }
  })

  // Purchase Order (Printer 1)
  ipcMain.handle('printer:printPO', async (_event, poData: POData) => {
    try {
      const name = getSetting('restaurant_name') || 'موموـ'
      const text = purchaseOrder(poData, name)
      console.log('[Printer 1] Purchase Order:\n' + text)
      return { data: { printed: false, stub: true, text } }
    } catch (err: any) {
      logPrintFailure('purchase_order', err.message)
      console.error('[Printer 1] Error:', err.message)
      return { error: err.message }
    }
  })

  // Test print
  ipcMain.handle('printer:testPrint', async (_event, printerNum: number) => {
    try {
      const port = getSetting(`printer${printerNum}_port`)
      console.log(`[Printer ${printerNum}] Test print on port: ${port || 'not configured'}`)
      return { data: { success: false, stub: true, message: `Printer ${printerNum} — stub mode (port: ${port || 'none'})` } }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  // Save receipts as real PDF — with folder picker
  ipcMain.handle('printer:previewPDF', async (_event, receiptData: ReceiptData) => {
    try {
      const { dialog, BrowserWindow } = require('electron')
      const { canceled, filePath: savePath } = await dialog.showSaveDialog({
        title: 'حفظ الإيصال كـ PDF',
        defaultPath: path.join(app.getPath('documents'), `receipt_${receiptData.orderNum}.pdf`),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
      if (canceled || !savePath) return { data: { cancelled: true } }

      const header = getSetting('receipt_header') || 'مومو POS'
      const footer = getSetting('receipt_footer') || 'شكراً لزيارتكم'
      const cashText = cashierReceipt(receiptData, header, footer).replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const kitchenText = kitchenTicket(receiptData as any).replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const isTA = (receiptData as any).orderType === 'takeaway'
      const orderType = isTA ? 'سفري' : 'محلي'
      const badgeBg = isTA ? '#fef3c7' : '#d1fae5'
      const badgeColor = isTA ? '#d97706' : '#059669'
      const badgeBorder = isTA ? '#fcd34d' : '#6ee7b7'

      const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8">
<style>
@page { size: A5 portrait; margin: 15mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1e1b4b; }
.receipt { padding: 24px; border: 1.5px solid #e5e7eb; border-radius: 14px; max-width: 360px; margin: 0 auto; }
.receipt-title { text-align: center; font-size: 18px; font-weight: 900; color: #581c87; margin-bottom: 8px; }
.badge { display: block; text-align: center; margin: 0 auto 14px; }
.badge span { display: inline-block; padding: 3px 18px; border-radius: 99px; font-size: 13px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; }
pre { white-space: pre-wrap; word-break: break-word; font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.7; }
.page2 { page-break-before: always; }
</style>
</head>
<body>

<div class="receipt">
  <div class="receipt-title">إيصال كاشير</div>
  <div class="badge"><span>${orderType}</span></div>
  <pre>${cashText}</pre>
</div>

<div class="page2">
<div class="receipt">
  <div class="receipt-title">تذكرة مطبخ</div>
  <div class="badge"><span>${orderType}</span></div>
  <pre>${kitchenText}</pre>
</div>
</div>

</body>
</html>`

      const tmpFile = path.join(app.getPath('temp'), `momo_rcpt_${Date.now()}.html`)
      fs.writeFileSync(tmpFile, html, 'utf-8')

      const win = new BrowserWindow({ show: false, width: 600, height: 900 })
      const fileUrl = 'file:///' + tmpFile.replace(/\\/g, '/')
      await win.loadURL(fileUrl)
      // Small delay to ensure rendering completes
      await new Promise(r => setTimeout(r, 800))
      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'A5',
      })
      fs.writeFileSync(savePath, pdfData)
      win.destroy()
      try { fs.unlinkSync(tmpFile) } catch {}
      await shell.openPath(savePath)
      return { data: { path: savePath } }
    } catch (err: any) {
      console.error('[PDF] Error:', err.message)
      return { error: err.message }
    }
  })

  // Shift Report PDF — save to disk
  ipcMain.handle('printer:saveShiftReportPDF', async (_event, reportHtml: string) => {
    try {
      const { dialog, BrowserWindow } = require('electron')
      const { canceled, filePath: savePath } = await dialog.showSaveDialog({
        title: 'حفظ تقرير الوردية كـ PDF',
        defaultPath: path.join(app.getPath('documents'), `shift_report_${Date.now()}.pdf`),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
      if (canceled || !savePath) return { data: { cancelled: true } }

      const tmpFile = path.join(app.getPath('temp'), `momo_shift_${Date.now()}.html`)
      fs.writeFileSync(tmpFile, reportHtml, 'utf-8')

      const win = new BrowserWindow({ show: false, width: 900, height: 1200 })
      await win.loadURL('file:///' + tmpFile.replace(/\\/g, '/'))
      await new Promise(r => setTimeout(r, 800))
      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
      })
      fs.writeFileSync(savePath, pdfData)
      win.destroy()
      try { fs.unlinkSync(tmpFile) } catch {}
      await shell.openPath(savePath)
      return { data: { path: savePath } }
    } catch (err: any) {
      console.error('[PDF] Shift report error:', err.message)
      return { error: err.message }
    }
  })

  console.log('[IPC] Printer handlers registered (stub mode)')
}
