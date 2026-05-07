import { getDb } from '../connection'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

export function runMigrations(): void {
  const db = getDb()

  // Ensure _migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `)

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((r: any) => r.name)
  )

  // Try multiple paths for dev vs production
  const possibleDirs = [
    join(process.cwd(), 'src/main/db/migrations'),
    join(__dirname, '../db/migrations'),
    join(__dirname, 'migrations')
  ]

  let migrationFiles: { name: string; path: string }[] = []

  for (const dir of possibleDirs) {
    try {
      const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
      if (files.length > 0) {
        migrationFiles = files.map(f => ({ name: f, path: join(dir, f) }))
        break
      }
    } catch (_) {}
  }

  if (migrationFiles.length === 0) {
    console.log('[Migrations] No migration files found')
    return
  }

  for (const file of migrationFiles) {
    if (applied.has(file.name)) continue

    console.log(`[Migrations] Applying: ${file.name}`)
    const sql = readFileSync(file.path, 'utf-8')

    try {
      db.transaction(() => {
        db.exec(sql)
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file.name)
      })()
      console.log(`[Migrations] Applied: ${file.name}`)
    } catch (err: any) {
      console.error(`[Migrations] FAILED: ${file.name}`, err.message)
      throw new Error(`Migration ${file.name} failed: ${err.message}`)
    }
  }

  console.log('[Migrations] All migrations up to date')
}
