/**
 * PDF Report Export IPC Handlers
 * Registered separately because they use async dialog APIs.
 */
import { ipcMain } from 'electron'
import { PDFExporter } from '../reports/pdfExporter'
import { getSession } from '../session'

export function registerReportExportIpc(): void {
  ipcMain.handle('reports:exportPDF', async (_event, reportType: string, filters: any) => {
    try {
      // RBAC: admin or manager only
      const session = getSession()
      if (!session || !['admin', 'manager'].includes(session.role)) {
        return { error: 'UNAUTHORIZED' }
      }

      let html: string
      switch (reportType) {
        case 'sales': html = PDFExporter.generateSalesHTML(filters); break
        case 'items': html = PDFExporter.generateItemsHTML(filters); break
        case 'pays':  html = PDFExporter.generatePaymentsHTML(filters); break
        case 'audit': html = PDFExporter.generateAuditHTML(filters); break
        default: return { error: `نوع التقرير غير معروف: ${reportType}` }
      }

      const pdfBuffer = await PDFExporter.htmlToPDF(html)
      const filePath = await PDFExporter.saveToFile(pdfBuffer, reportType, filters)
      return { data: { success: true, path: filePath } }
    } catch (err: any) {
      console.error('[Reports] PDF export error:', err.message)
      return { error: err.message }
    }
  })

  console.log('[IPC] Report export handlers registered')
}
