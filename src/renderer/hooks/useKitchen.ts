import { useState, useEffect, useCallback } from 'react'

const api = (window as any).api

/** Hook: fetch kitchen stock. */
export function useKitchenStock() {
  const [stock, setStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.kitchen?.getStock?.()
      setStock(Array.isArray(d) ? d : [])
    } catch { setStock([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { stock, loading, reload }
}

/** Hook: fetch kitchen transfer history. */
export function useKitchenTransfers(limit = 50) {
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.kitchen?.getTransfers?.(limit)
      setTransfers(Array.isArray(d) ? d : [])
    } catch { setTransfers([]) }
    finally { setLoading(false) }
  }, [limit])

  useEffect(() => { reload() }, [reload])
  return { transfers, loading, reload }
}

/** Hook: fetch kitchen tickets with optional date filters. */
export function useTickets(filters?: { startDate?: string; endDate?: string }) {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const filtersKey = JSON.stringify(filters || {})

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.kitchen?.todaysTickets?.(filters)
      setTickets(Array.isArray(d) ? d : [])
    } catch { setTickets([]) }
    finally { setLoading(false) }
  }, [filtersKey])

  useEffect(() => { reload() }, [reload])
  return { tickets, loading, reload }
}
