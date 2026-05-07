import { useState, useEffect, useCallback } from 'react'

const api = (window as any).api

/** Hook: fetch menu items. */
export function useMenuItems() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.menu?.listItems?.()
      setItems(Array.isArray(d) ? d : [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { items, loading, reload }
}

/** Hook: fetch available menu items only. */
export function useAvailableMenuItems() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.menu?.listAvailable?.()
      setItems(Array.isArray(d) ? d : [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { items, loading, reload }
}

/** Hook: fetch categories. */
export function useCategories() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api?.menu?.listCategories?.()
      setCategories(Array.isArray(d) ? d : [])
    } catch { setCategories([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { categories, loading, reload }
}

/** Hook: fetch recipe for a specific menu item. */
export function useRecipe(itemId: number | null) {
  const [recipe, setRecipe] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!itemId) { setRecipe([]); return }
    setLoading(true)
    try {
      const d = await api?.menu?.getRecipe?.(itemId)
      setRecipe(Array.isArray(d) ? d : [])
    } catch { setRecipe([]) }
    finally { setLoading(false) }
  }, [itemId])

  useEffect(() => { reload() }, [reload])
  return { recipe, loading, reload }
}
