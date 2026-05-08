import { app, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { pathToFileURL } from 'url'
import { initDatabase, getDb } from './db/connection'
import { runMigrations } from './db/migrations/runner'
import { runSeed } from './db/seed'
import { runDemoData } from './db/demo-data'
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

app.whenReady().then(() => {
  // Register custom image protocol before creating the window
  registerImageProtocol()

  // Initialize database
  initDatabase()
  runMigrations()
  // Seeding is now handled dynamically by seed.ts
  // runSeed() // Disabled for production to trigger Setup Wizard
  // runDemoData() // Disabled for production build

  // Register IPC handlers
  registerAllIpc()
  registerBackupIpc()
  registerPrinterIpc()
  registerReportExportIpc()

  createWindow()
  startBackupScheduler()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

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
