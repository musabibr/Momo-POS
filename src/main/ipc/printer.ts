/**
 * Smart Auto-Detect Printer Service
 * 
 * Uses Electron's built-in webContents.print() to render HTML receipts
 * and send them to auto-detected system printers.
 * 
 * Key behaviors:
 * - Auto-detects all OS printers on startup and on-demand
 * - Smart role assignment: 1 printer → both roles; 2+ → auto-match by name
 * - Silent printing (no dialog) by default, configurable via settings
 * - Print failures NEVER block order commit — all calls are try/catch wrapped
 * - Prints on user click only (not auto-print on order confirm)
 */

import { ipcMain, BrowserWindow, shell, app } from 'electron'
import { getDb } from '../db/connection'
import { checkPermission } from './helpers'
import { PERM } from '@shared/permissions'
import { cashierReceipt, kitchenTicket, zReport, purchaseOrder } from '../print/templates'
import type { ReceiptData, KitchenTicketData, ZReportData, POData } from '../print/templates'
import { buildCashierReceiptHtml, buildKitchenTicketHtml, buildZReportHtml, buildTestPageHtml } from '../print/receiptHtml'
import path from 'path'
import fs from 'fs'

// ── Settings helpers ─────────────────────────────────────────────────

function getSetting(key: string): string {
  try {
    const db = getDb()
    return (db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as any)?.value || ''
  } catch { return '' }
}

function setSetting(key: string, value: string): void {
  try {
    const db = getDb()
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value)
  } catch { /* ignore */ }
}

function logPrintFailure(type: string, error: string): void {
  try {
    const db = getDb()
    db.prepare(`INSERT INTO action_log (action, detail, created_at) VALUES ('PRINT_FAILED', ?, datetime('now'))`)
      .run(JSON.stringify({ type, error }))
  } catch { /* ignore */ }
}

// ── Printer detection keywords for smart matching ────────────────────

const KITCHEN_KEYWORDS = ['kitchen', 'مطبخ', 'cook', 'prep', 'ticket', 'back']
const CASHIER_KEYWORDS = ['cashier', 'كاشير', 'receipt', 'front', 'pos', 'counter', 'إيصال']

function matchesRole(printerName: string, keywords: string[]): boolean {
  const lower = printerName.toLowerCase()
  return keywords.some(kw => lower.includes(kw))
}

// ── Core print function ──────────────────────────────────────────────

interface PrintOptions {
  html: string
  printerName?: string
  silent?: boolean
}

async function printHtml(opts: PrintOptions): Promise<{ printed: boolean; printerName?: string; error?: string }> {
  const { html, printerName, silent = true } = opts

  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      width: 380,
      height: 600,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })

    const tmpFile = path.join(app.getPath('temp'), `momo_print_${Date.now()}.html`)
    fs.writeFileSync(tmpFile, html, 'utf-8')

    win.loadURL('file:///' + tmpFile.replace(/\\/g, '/'))

    win.webContents.on('did-finish-load', () => {
      // Small delay to ensure CSS rendering completes
      setTimeout(() => {
        const printOpts: Electron.WebContentsPrintOptions = {
          silent,
          printBackground: true,
          pageSize: { width: 80000, height: 297000 } as any, // 80mm width in microns
          margins: { marginType: 'none' }
        }

        if (printerName) {
          printOpts.deviceName = printerName
        }

        win.webContents.print(printOpts, (success, failureReason) => {
          win.destroy()
          try { fs.unlinkSync(tmpFile) } catch { /* ignore */ }

          if (success) {
            resolve({ printed: true, printerName })
          } else {
            resolve({ printed: false, printerName, error: failureReason || 'Print failed' })
          }
        })
      }, 400)
    })

    // Safety timeout — don't hang forever
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.destroy()
        try { fs.unlinkSync(tmpFile) } catch { /* ignore */ }
        resolve({ printed: false, error: 'Print timeout' })
      }
    }, 15000)
  })
}

// ── Smart printer resolution ─────────────────────────────────────────

async function getSystemPrinters(): Promise<Electron.PrinterInfo[]> {
  try {
    const wins = BrowserWindow.getAllWindows()
    const win = wins[0]
    if (!win) return []
    return await win.webContents.getPrintersAsync()
  } catch {
    return []
  }
}

async function resolvePrinter(role: 'cashier' | 'kitchen'): Promise<string | undefined> {
  // 1. Check if user has explicitly assigned a printer for this role
  const settingKey = role === 'cashier' ? 'printer_cashier_name' : 'printer_kitchen_name'
  const assigned = getSetting(settingKey)
  if (assigned) return assigned

  // 2. Auto-detect from system printers
  const printers = await getSystemPrinters()
  if (printers.length === 0) return undefined

  // 3. If only 1 printer → use it for everything
  if (printers.length === 1) return printers[0].name

  // 4. Try smart name matching
  const keywords = role === 'kitchen' ? KITCHEN_KEYWORDS : CASHIER_KEYWORDS
  const matched = printers.find(p => matchesRole(p.name, keywords))
  if (matched) return matched.name

  // 5. Fallback: use the default printer or first available
  const defaultPrinter = printers.find(p => p.isDefault)
  if (role === 'cashier') return defaultPrinter?.name || printers[0].name

  // For kitchen: if we have 2+ printers and cashier would get the first/default,
  // give kitchen the second printer
  const cashierPrinter = defaultPrinter?.name || printers[0].name
  const otherPrinter = printers.find(p => p.name !== cashierPrinter)
  return otherPrinter?.name || cashierPrinter // fallback to same printer if only 1
}

function isSilentMode(): boolean {
  const mode = getSetting('printer_silent_mode')
  // Default to silent (true) unless explicitly set to '0'
  return mode !== '0'
}

// ── Register IPC handlers ────────────────────────────────────────────

export function registerPrinterIpc(): void {

  // Get list of system printers
  ipcMain.handle('printer:getSystemPrinters', async () => {
    try {
      const denied = checkPermission([PERM.SETTINGS_PRINTERS]); if (denied) return denied
      const printers = await getSystemPrinters()
      const mapped = printers.map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        isDefault: p.isDefault,
        status: p.status
      }))
      return { data: mapped }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  // Save printer assignment
  ipcMain.handle('printer:setAssignment', async (_event, role: string, printerName: string) => {
    try {
      const denied = checkPermission([PERM.SETTINGS_PRINTERS]); if (denied) return denied
      const key = role === 'kitchen' ? 'printer_kitchen_name' : 'printer_cashier_name'
      setSetting(key, printerName)
      return { data: { success: true } }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  // Get current assignments
  ipcMain.handle('printer:getAssignments', async () => {
    try {
      const denied = checkPermission([PERM.SETTINGS_PRINTERS]); if (denied) return denied
      return {
        data: {
          cashier: getSetting('printer_cashier_name'),
          kitchen: getSetting('printer_kitchen_name'),
          silentMode: isSilentMode()
        }
      }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  // Set silent mode
  ipcMain.handle('printer:setSilentMode', async (_event, silent: boolean) => {
    try {
      const denied = checkPermission([PERM.SETTINGS_PRINTERS]); if (denied) return denied
      setSetting('printer_silent_mode', silent ? '1' : '0')
      return { data: { success: true } }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  // ── Cashier Receipt (Printer 1) ──────────────────────────────────

  ipcMain.handle('printer:print', async (_event, receiptData: ReceiptData) => {
    try {
      const denied = checkPermission([PERM.POS_ACCESS, PERM.TRANSACTIONS_VIEW]); if (denied) return denied
      const header = getSetting('receipt_header') || 'مومو POS'
      const footer = getSetting('receipt_footer') || 'شكراً لزيارتكم'
      const html = buildCashierReceiptHtml(receiptData, header, footer)
      const printerName = await resolvePrinter('cashier')
      const silent = isSilentMode()

      if (!printerName) {
        console.log('[Printer] No cashier printer detected — skipping')
        // Fallback: log the text version
        const text = cashierReceipt(receiptData, header, footer)
        console.log('[Printer 1] Cashier receipt (text fallback):\n' + text)
        return { data: { printed: false, reason: 'no_printer' } }
      }

      console.log(`[Printer] Printing cashier receipt to: ${printerName} (silent: ${silent})`)
      const result = await printHtml({ html, printerName, silent })

      if (!result.printed) {
        logPrintFailure('cashier_receipt', result.error || 'Unknown error')
        console.error(`[Printer] Cashier print failed: ${result.error}`)
      }

      return { data: result }
    } catch (err: any) {
      logPrintFailure('cashier_receipt', err.message)
      console.error('[Printer 1] Error:', err.message)
      return { error: err.message }
    }
  })

  // ── Kitchen Ticket (Printer 2) ───────────────────────────────────

  ipcMain.handle('printer:printKitchen', async (_event, ticketData: KitchenTicketData) => {
    try {
      const denied = checkPermission([PERM.POS_ACCESS, PERM.TRANSACTIONS_VIEW, PERM.KITCHEN_VIEW]); if (denied) return denied
      const html = buildKitchenTicketHtml(ticketData)
      const printerName = await resolvePrinter('kitchen')
      const silent = isSilentMode()

      if (!printerName) {
        console.log('[Printer] No kitchen printer detected — skipping')
        const text = kitchenTicket(ticketData)
        console.log('[Printer 2] Kitchen ticket (text fallback):\n' + text)
        return { data: { printed: false, reason: 'no_printer' } }
      }

      console.log(`[Printer] Printing kitchen ticket to: ${printerName} (silent: ${silent})`)
      const result = await printHtml({ html, printerName, silent })

      if (!result.printed) {
        logPrintFailure('kitchen_ticket', result.error || 'Unknown error')
        console.error(`[Printer] Kitchen print failed: ${result.error}`)
      }

      return { data: result }
    } catch (err: any) {
      logPrintFailure('kitchen_ticket', err.message)
      console.error('[Printer 2] Error:', err.message)
      return { error: err.message }
    }
  })

  // ── Z-Report (Printer 1) ─────────────────────────────────────────

  ipcMain.handle('printer:printZReport', async (_event, reportData: ZReportData) => {
    try {
      const denied = checkPermission([PERM.SHIFT_MANAGE, PERM.REPORTS_VIEW]); if (denied) return denied
      const name = getSetting('restaurant_name') || 'مومو'
      const html = buildZReportHtml(reportData, name)
      const printerName = await resolvePrinter('cashier')
      const silent = isSilentMode()

      if (!printerName) {
        console.log('[Printer] No printer detected for Z-Report — skipping')
        const text = zReport(reportData, name)
        console.log('[Printer 1] Z-Report (text fallback):\n' + text)
        return { data: { printed: false, reason: 'no_printer' } }
      }

      console.log(`[Printer] Printing Z-Report to: ${printerName}`)
      const result = await printHtml({ html, printerName, silent })

      if (!result.printed) {
        logPrintFailure('z_report', result.error || 'Unknown error')
      }

      return { data: result }
    } catch (err: any) {
      logPrintFailure('z_report', err.message)
      console.error('[Printer 1] Error:', err.message)
      return { error: err.message }
    }
  })

  // ── Purchase Order (Printer 1) ───────────────────────────────────

  ipcMain.handle('printer:printPO', async (_event, poData: POData) => {
    try {
      const denied = checkPermission([PERM.PURCHASE_MANAGE]); if (denied) return denied
      const name = getSetting('restaurant_name') || 'مومو'
      const text = purchaseOrder(poData, name)
      // PO doesn't have an HTML template yet — use cashier printer for now
      const printerName = await resolvePrinter('cashier')
      const silent = isSilentMode()

      if (!printerName) {
        console.log('[Printer 1] Purchase Order (text fallback):\n' + text)
        return { data: { printed: false, reason: 'no_printer' } }
      }

      // Wrap text in simple HTML
      const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
        <style>@page{size:80mm auto;margin:0}body{font-family:'Segoe UI',Tahoma,sans-serif;font-size:13px;color:#111;width:80mm;padding:3mm 2mm;direction:rtl;white-space:pre-wrap;font-weight:700;}</style>
        </head><body><pre>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`

      const result = await printHtml({ html, printerName, silent })

      if (!result.printed) {
        logPrintFailure('purchase_order', result.error || 'Unknown error')
      }

      return { data: result }
    } catch (err: any) {
      logPrintFailure('purchase_order', err.message)
      console.error('[Printer 1] Error:', err.message)
      return { error: err.message }
    }
  })

  // ── Test Print ───────────────────────────────────────────────────

  ipcMain.handle('printer:testPrint', async (_event, printerNum: number) => {
    try {
      const denied = checkPermission([PERM.SETTINGS_PRINTERS]); if (denied) return denied
      const role = printerNum === 2 ? 'kitchen' : 'cashier'
      const printerName = await resolvePrinter(role as any)
      const silent = isSilentMode()

      if (!printerName) {
        return { data: { success: false, message: 'لم يتم العثور على طابعة' } }
      }

      const html = buildTestPageHtml(role)
      console.log(`[Printer] Test print to: ${printerName} (role: ${role})`)
      const result = await printHtml({ html, printerName, silent })

      return {
        data: {
          success: result.printed,
          printerName,
          message: result.printed
            ? `✅ تمت الطباعة على: ${printerName}`
            : `❌ فشل: ${result.error}`
        }
      }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  // ── PDF Preview (Save to file — unchanged logic) ─────────────────

  ipcMain.handle('printer:previewPDF', async (_event, receiptData: ReceiptData) => {
    try {
      const denied = checkPermission([PERM.POS_ACCESS, PERM.TRANSACTIONS_VIEW]); if (denied) return denied
      const { dialog } = require('electron')
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

  // ── Shift Report PDF — save to disk ──────────────────────────────

  ipcMain.handle('printer:saveShiftReportPDF', async (_event, reportHtml: string) => {
    try {
      const denied = checkPermission([PERM.SHIFT_MANAGE, PERM.REPORTS_VIEW]); if (denied) return denied
      const { dialog } = require('electron')
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

  console.log('[IPC] Printer handlers registered (smart auto-detect mode)')
}
