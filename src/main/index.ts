import { app, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { pathToFileURL } from 'url'
import { initDatabase, getDb } from './db/connection'
import { ActionLogRepo } from './db/repositories/ActionLogRepo'
import { runMigrations } from './db/migrations/runner'
// NOTE: runSeed and runDemoData are intentionally NOT imported.
// The Setup Wizard handles first-run admin creation.
// Demo data should NEVER run in production.
import { registerAllIpc } from './ipc/register'
import { registerBackupIpc, startBackupScheduler } from './ipc/backup'
import { registerPrinterIpc } from './ipc/printer'
import { registerReportExportIpc } from './ipc/reportExport'
import { getImagesPath } from './db/connection'

let mainWindow: BrowserWindow | null = null

// Suppress noisy Chromium disk cache errors (backend_impl.cc / entry_impl.cc)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disk-cache-size', '0')

/**
 * Register custom protocol `momo-img://` to serve product images from userData/images/.
 * This avoids file:// cross-origin issues when the renderer runs on http://localhost (dev mode).
 * Usage: <img src="momo-img://item_1_17150.jpg" />
 */
function registerImageProtocol(): void {
  protocol.handle('momo-img', (request) => {
    // Extract filename from URL: momo-img://filename.jpg
    const filename = decodeURIComponent(request.url.replace('momo-img://', ''))
    const filePath = join(getImagesPath(), filename)

    if (!existsSync(filePath)) {
      return new Response('Not found', { status: 404 })
    }

    return net.fetch(pathToFileURL(filePath).toString())
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'موموـ POS',
    icon: join(__dirname, '../../assets/icons/momo.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false // needed for better-sqlite3 native module
    }
  })

  mainWindow.setMenuBarVisibility(false)

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // Register custom image protocol before creating the window
    registerImageProtocol()

    // Initialize database
    initDatabase()
    runMigrations()

    // R3-H4: Auto-close orphan shifts from previous crashes
    try {
      const db = getDb()
      const orphans = db.prepare(`SELECT id, opened_at FROM shifts WHERE closed_at IS NULL ORDER BY opened_at DESC`).all() as any[]
      if (orphans.length > 1) {
        for (let i = 1; i < orphans.length; i++) {
          db.prepare(`UPDATE shifts SET closed_at = datetime('now','localtime'), close_float = open_float WHERE id = ?`).run(orphans[i].id)
          ActionLogRepo.write('shift_auto_closed_orphan', String(orphans[i].id))
        }
        console.log(`[Startup] Auto-closed ${orphans.length - 1} orphan shift(s)`)
      }
    } catch (_) {}

    // NOTE: No seed or demo data in production — Setup Wizard handles first-run.

    // Register IPC handlers
    registerAllIpc()
    registerBackupIpc()
    registerPrinterIpc()
    registerReportExportIpc()

    createWindow()

    // R3-H5: WAL checkpoint on renderer crash
    if (mainWindow) {
      mainWindow.webContents.on('render-process-gone', (_e, details) => {
        console.error('[Renderer] crashed:', details)
        try { getDb().pragma('wal_checkpoint(TRUNCATE)') } catch (_) {}
      })
    }
    startBackupScheduler()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  // WAL checkpoint on shutdown
  try {
    const db = getDb()
    db.pragma('wal_checkpoint(TRUNCATE)')
  } catch (_) {}
  if (process.platform !== 'darwin') app.quit()
})

// Fallback: checkpoint WAL on process exit regardless of how app exits
process.on('exit', () => {
  try {
    const db = getDb()
    db.pragma('wal_checkpoint(TRUNCATE)')
  } catch (_) {}
})
