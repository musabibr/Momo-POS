import { getDb } from '../connection'

export class SettingsRepo {
  static get(key: string): string | null {
    const row = getDb().prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as any
    return row ? row.value : null
  }

  static set(key: string, value: string) {
    getDb().prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value)
  }

  static getAll(): Record<string, string> {
    const rows = getDb().prepare(`SELECT * FROM settings`).all() as any[]
    const result: Record<string, string> = {}
    for (const r of rows) result[r.key] = r.value
    return result
  }

  static getBanks(): string[] {
    const val = SettingsRepo.get('banks')
    try { return val ? JSON.parse(val) : [] } catch { return [] }
  }

  static setBanks(banks: string[]) {
    SettingsRepo.set('banks', JSON.stringify(banks))
  }
}
