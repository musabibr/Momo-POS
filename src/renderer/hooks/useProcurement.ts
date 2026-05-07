import { useState, useEffect, useCallback } from 'react'

const api = (window as any).api

/** Hook: fetch suppliers with their linked ingredients. */
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.procurement?.listSuppliers?.()
      setSuppliers(Array.isArray(d) ? d : [])
    } catch { setSuppliers([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { suppliers, loading, reload }
}

/** Hook: fetch purchases with optional filters. */
export function usePurchases(filters?: { limit?: number }) {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.procurement?.listPurchases?.(filters)
      setPurchases(Array.isArray(d) ? d : [])
    } catch { setPurchases([]) }
    finally { setLoading(false) }
  }, [filters?.limit])

  useEffect(() => { reload() }, [reload])
  return { purchases, loading, reload }
}
