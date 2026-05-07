import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'momo.db')

  // Ensure images directory exists
  const imagesDir = join(userDataPath, 'images')
  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true })
  }

  // Ensure recovery directory exists
  const recoveryDir = join(userDataPath, 'recovery')
  if (!existsSync(recoveryDir)) {
    mkdirSync(recoveryDir, { recursive: true })
  }

  db = new Database(dbPath)

  // Critical pragmas — set on every connection
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = FULL')

  console.log(`[DB] Opened database at ${dbPath}`)
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function getDbPath(): string {
  return join(app.getPath('userData'), 'momo.db')
}

export function getImagesPath(): string {
  return join(app.getPath('userData'), 'images')
}
