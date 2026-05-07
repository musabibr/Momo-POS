import { useState, useEffect, useCallback } from 'react'

const api = (window as any).api

/** Hook: fetch inventory items with optional filters. */
export function useInventoryItems(filters?: { type?: string; archived?: boolean }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.inventory?.listItems?.(filters)
      setItems(Array.isArray(d) ? d : [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [filters?.type, filters?.archived])

  useEffect(() => { reload() }, [reload])
  return { items, loading, reload }
}

/** Hook: fetch transfer history with optional filters. */
export function useTransfers(filters?: { locationId?: string; itemId?: number; limit?: number }) {
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.inventory?.listTransfers?.(filters)
      setTransfers(Array.isArray(d) ? d : [])
    } catch { setTransfers([]) }
    finally { setLoading(false) }
  }, [filters?.locationId, filters?.itemId, filters?.limit])

  useEffect(() => { reload() }, [reload])
  return { transfers, loading, reload }
}
