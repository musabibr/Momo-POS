import { ipcMain, app, dialog, BrowserWindow } from 'electron'
import { getDb, getDbPath, getImagesPath } from '../db/connection'
import { join, resolve, sep } from 'path'
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync, writeFileSync, unlinkSync, rmSync } from 'fs'
import { promises as fsp } from 'fs'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { execSync } from 'child_process'
import { getSession } from '../session'
import { EmployeeRepo } from '../db/repositories/EmployeeRepo'

let backupMutex = false
let schedulerInterval: any = null

function getRecoveryDir(): string {
  const dir = join(app.getPath('userData'), 'recovery')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/** Pre-flight DB snapshot before destructive ops */
function preFlightSnapshot(opName: string): string {
  const db = getDb()
  db.pragma('wal_checkpoint(TRUNCATE)')
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dest = join(getRecoveryDir(), `momo_pre_${opName}_${ts}.db`)
  try {
    db.exec(`VACUUM INTO '${dest.replace(/\\/g, '/')}'`)
  } catch (err) {
    console.error('[Backup] VACUUM failed, falling back to file copy:', err)
    copyFileSync(getDbPath(), dest)
  }

  // Retain only last 10 recovery files
  const files = readdirSync(getRecoveryDir())
    .filter(f => f.startsWith('momo_pre_'))
    .sort()
  while (files.length > 10) {
    const old = files.shift()!
    try { unlinkSync(join(getRecoveryDir(), old)) } catch { /* ignore */ }
  }

  console.log(`[Backup] Pre-flight snapshot: ${dest}`)
  return dest
}

async function runBackup(targetPath: string): Promise<{ path: string; timestamp: string }> {
  if (!targetPath) throw new Error('مسار النسخ الاحتياطي مطلوب')

  if (!existsSync(targetPath)) {
    mkdirSync(targetPath, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupDir = join(targetPath, `momo_backup_${timestamp}`)
  mkdirSync(backupDir, { recursive: true })

  // 1. Backup database using SQLite Online Backup API
  const db = getDb()
  const dbBackupPath = join(backupDir, 'momo.db')
  try {
    db.exec(`VACUUM INTO '${dbBackupPath.replace(/\\/g, '/')}'`)
  } catch (err) {
    console.error('[Backup] VACUUM failed during runBackup, falling back to file copy:', err)
    db.pragma('wal_checkpoint(TRUNCATE)')
    copyFileSync(getDbPath(), dbBackupPath)
  }

  // 2. Backup images directory
  const imagesDir = getImagesPath()
  let imageCount = 0
  if (existsSync(imagesDir)) {
    const imagesBackupDir = join(backupDir, 'images')
    mkdirSync(imagesBackupDir, { recursive: true })
    const files = readdirSync(imagesDir)
    for (const file of files) {
      const srcFile = join(imagesDir, file)
      const stat = statSync(srcFile)
      if (stat.isFile()) {
        await fsp.copyFile(srcFile, join(imagesBackupDir, file))
        imageCount++
      }
    }
  }

  // 3. Write manifest.json
  const dbSha256 = await computeSha256(dbBackupPath)
  const schemaVersion = (db.prepare(`SELECT value FROM settings WHERE key='schema_version'`).get() as any)?.value || '001'
  const manifest = {
    db_sha256: dbSha256,
    image_count: imageCount,
    app_version: app.getVersion(),
    schema_version: schemaVersion,
    created_at: new Date().toISOString()
  }
  writeFileSync(join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')

  // 4. Retention: keep last 30 backups
  const parent = targetPath
  if (existsSync(parent)) {
    const backups = readdirSync(parent)
      .filter(f => f.startsWith('momo_backup_'))
      .sort()
    while (backups.length > 30) {
      const old = backups.shift()!
      try {
        rmSync(join(parent, old), { recursive: true, force: true })
      } catch { /* ignore */ }
    }
  }

  console.log(`[Backup] Completed: ${backupDir}`)
  return { path: backupDir, timestamp }
}

export function registerBackupIpc(): void {
  ipcMain.handle('backup:run', async (_event, targetPath: string) => {
    try {
      // RBAC: admin or manager only — but allow during setup wizard (≤1 employees)
      const session = getSession()
      const isSetupPhase = EmployeeRepo.list().length <= 1
      if (!isSetupPhase && (!session || !['admin', 'manager'].includes(session.role))) {
        return { error: 'UNAUTHORIZED' }
      }
      // Path validation: prevent writing to arbitrary locations
      if (!targetPath || typeof targetPath !== 'string') throw new Error('مسار النسخ الاحتياطي مطلوب')
      const resolvedTarget = resolve(targetPath)
      // Block obvious system paths
      const blocked = ['C:\\Windows', 'C:\\Program Files', '/usr', '/etc', '/bin']
      if (blocked.some(b => resolvedTarget.toLowerCase().startsWith(b.toLowerCase()))) {
        throw new Error('مسار النسخ الاحتياطي غير مصرح به')
      }
      const result = await runBackup(resolvedTarget)
      return { data: result }
    } catch (err: any) {
      console.error('[Backup] Failed:', err.message)
      return { error: err.message }
    }
  })

  ipcMain.handle('backup:preFlightSnapshot', async (_event, opName: string) => {
    try {
      const path = preFlightSnapshot(opName || 'manual')
      return { data: { path } }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('backup:restore', async (_event, backupPath: string) => {
    try {
      // RBAC: admin only
      const session = getSession()
      if (!session || session.role !== 'admin') {
        return { error: 'UNAUTHORIZED' }
      }
      if (!backupPath) throw new Error('مسار النسخة الاحتياطية مطلوب')

      // Allow restoring from any user-chosen directory
      const resolvedPath = resolve(backupPath)

      const dbFile = join(backupPath, 'momo.db')
      if (!existsSync(dbFile)) throw new Error('ملف قاعدة البيانات غير موجود في النسخة')

      // Validate manifest
      const manifestPath = join(backupPath, 'manifest.json')
      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        const actualSha = await computeSha256(dbFile)
        if (manifest.db_sha256 && manifest.db_sha256 !== actualSha) {
          throw new Error('فشل التحقق من سلامة قاعدة البيانات — SHA256 غير متطابق')
        }
        if (manifest.schema_version) {
          const db = getDb()
          const currentVer = (db.prepare(`SELECT value FROM settings WHERE key='schema_version'`).get() as any)?.value
          if (manifest.schema_version !== currentVer) {
            throw new Error(`إصدار قاعدة البيانات في النسخة (${manifest.schema_version}) لا يطابق النسخة الحالية (${currentVer})`)
          }
        }
      }

      // Pre-flight snapshot of current DB
      preFlightSnapshot('restore')

      const targetDbPath = getDbPath()
      const db = getDb()
      db.pragma('wal_checkpoint(TRUNCATE)')
      db.close()

      copyFileSync(dbFile, targetDbPath)

      // Copy images if present
      const imagesBackup = join(backupPath, 'images')
      if (existsSync(imagesBackup)) {
        const imagesDir = getImagesPath()
        const files = readdirSync(imagesBackup)
        for (const file of files) {
          copyFileSync(join(imagesBackup, file), join(imagesDir, file))
        }
      }

      console.log('[Backup] Restore completed — app needs restart')
      // Relaunch and exit immediately to prevent IPC calls hitting the closed DB
      app.relaunch()
      app.exit(0)
      return { data: { success: true } }
    } catch (err: any) {
      console.error('[Backup] Restore failed:', err.message)
      return { error: err.message }
    }
  })

  ipcMain.handle('backup:listUsbPaths', async () => {
    try {
      if (process.platform === 'win32') {
        // Use PowerShell instead of deprecated wmic
        const output = execSync(
          'powershell -NoProfile -Command "Get-WmiObject Win32_LogicalDisk -Filter \"DriveType=2\" | Select-Object DeviceID,Size,FreeSpace | ConvertTo-Csv -NoTypeInformation"',
          { encoding: 'utf-8' }
        )
        const lines = output.trim().split('\n').slice(1).filter(Boolean)
        const drives = lines.map(line => {
          const parts = line.replace(/"/g, '').trim().split(',')
          return { path: parts[0], size: parseInt(parts[1]) || 0, free: parseInt(parts[2]) || 0 }
        }).filter(d => d.path)
        return { data: drives }
      }
      return { data: [] }
    } catch {
      return { data: [] }
    }
  })

  // Native folder picker for backup destination
  ipcMain.handle('backup:pickFolder', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win!, {
        title: 'اختر مجلد النسخ الاحتياطي',
        properties: ['openDirectory', 'createDirectory'],
      })
      if (result.canceled || !result.filePaths.length) return { data: null }
      return { data: result.filePaths[0] }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  // Native folder picker for selecting a backup to restore
  ipcMain.handle('backup:pickRestoreFolder', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win!, {
        title: 'اختر مجلد النسخة الاحتياطية للاستعادة',
        properties: ['openDirectory'],
      })
      if (result.canceled || !result.filePaths.length) return { data: null }
      // Validate it contains momo.db
      const selected = result.filePaths[0]
      if (!existsSync(join(selected, 'momo.db'))) {
        return { error: 'المجلد المحدد لا يحتوي على نسخة احتياطية صالحة (momo.db غير موجود)' }
      }
      return { data: selected }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  console.log('[IPC] Backup handlers registered')
}

/** Start the backup scheduler based on settings */
export function startBackupScheduler(): void {
  if (schedulerInterval) clearInterval(schedulerInterval)

  // Check every 5 minutes
  schedulerInterval = setInterval(async () => {
    if (backupMutex) {
      console.log('[Backup Scheduler] Skipped — previous backup still running')
      try {
        const db = getDb()
        db.prepare(`INSERT INTO action_log (action, detail, created_at) VALUES ('BACKUP_SKIPPED', 'Previous still running', datetime('now'))`).run()
      } catch { /* ignore */ }
      return
    }

    try {
      const db = getDb()
      const schedule = (db.prepare(`SELECT value FROM settings WHERE key='backup_schedule'`).get() as any)?.value || 'shift'
      const usbPath = (db.prepare(`SELECT value FROM settings WHERE key='backup_usb_path'`).get() as any)?.value

      if (!usbPath || schedule === 'shift') return // shift-based backup is triggered at shift close, not by interval

      const lastBackup = (db.prepare(`SELECT value FROM settings WHERE key='last_backup_at'`).get() as any)?.value
      const lastTime = lastBackup ? new Date(lastBackup).getTime() : 0
      const now = Date.now()
      const hourMs = 60 * 60 * 1000

      const shouldRun = schedule === 'hourly'
        ? (now - lastTime > hourMs)
        : schedule === 'daily'
          ? (now - lastTime > 24 * hourMs)
          : false

      if (!shouldRun) return

      backupMutex = true
      await runBackup(usbPath)
      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup_at', ?)`).run(new Date().toISOString())
      db.prepare(`INSERT INTO action_log (action, detail, created_at) VALUES ('BACKUP_SUCCESS', ?, datetime('now'))`).run(usbPath)
      console.log('[Backup Scheduler] Automatic backup completed')
    } catch (err: any) {
      console.error('[Backup Scheduler] Failed:', err.message)
    } finally {
      backupMutex = false
    }
  }, 5 * 60 * 1000) // every 5 minutes
}
