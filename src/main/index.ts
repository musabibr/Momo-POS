import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { initDatabase, getDb } from './db/connection'
import { runMigrations } from './db/migrations/runner'
import { runSeed } from './db/seed'
import { runDemoData } from './db/demo-data'
import { registerAllIpc } from './ipc/register'
import { registerBackupIpc, startBackupScheduler } from './ipc/backup'
import { registerPrinterIpc } from './ipc/printer'
import { registerReportExportIpc } from './ipc/reportExport'

let mainWindow: BrowserWindow | null = null

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
  // Initialize database
  initDatabase()
  runMigrations()
  // Seeding is now handled by migration 015_seed_demo.sql
  // runSeed()
  // runDemoData()

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
