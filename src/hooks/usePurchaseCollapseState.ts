import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to manage collapsed/expanded state of purchase items with localStorage persistence.
 * Storage key format: `it-purchases-item-collapsed-${purchaseId}`
 */
export function usePurchaseCollapseState(purchaseId: string | undefined, itemIds: string[]) {
  const storageKey = `it-purchases-item-collapsed-${purchaseId || 'default'}`

  // State: map of itemId -> boolean (true = collapsed, false = expanded)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        return JSON.parse(stored) as Record<string, boolean>
      }
    } catch {
      // Ignore localStorage read errors
    }
    return {}
  })

  // Re-read when purchaseId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        setCollapsedMap(JSON.parse(stored))
      } else {
        setCollapsedMap({})
      }
    } catch {
      setCollapsedMap({})
    }
  }, [storageKey])

  // Persist to localStorage
  const saveMap = useCallback(
    (newMap: Record<string, boolean>) => {
      setCollapsedMap(newMap)
      try {
        localStorage.setItem(storageKey, JSON.stringify(newMap))
      } catch {
        // Ignore localStorage write errors
      }
    },
    [storageKey],
  )

  const toggleItem = useCallback(
    (itemId: string) => {
      setCollapsedMap((prev) => {
        const next = { ...prev, [itemId]: !prev[itemId] }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // Ignore
        }
        return next
      })
    },
    [storageKey],
  )

  const setItemCollapsed = useCallback(
    (itemId: string, collapsed: boolean) => {
      setCollapsedMap((prev) => {
        const next = { ...prev, [itemId]: collapsed }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // Ignore
        }
        return next
      })
    },
    [storageKey],
  )

  const collapseAll = useCallback(() => {
    const next: Record<string, boolean> = {}
    itemIds.forEach((id) => {
      next[id] = true
    })
    saveMap(next)
  }, [itemIds, saveMap])

  const expandAll = useCallback(() => {
    const next: Record<string, boolean> = {}
    itemIds.forEach((id) => {
      next[id] = false
    })
    saveMap(next)
  }, [itemIds, saveMap])

  const isCollapsed = useCallback(
    (itemId: string) => {
      return !!collapsedMap[itemId]
    },
    [collapsedMap],
  )

  const allCollapsed = itemIds.length > 0 && itemIds.every((id) => !!collapsedMap[id])
  const allExpanded = itemIds.length > 0 && itemIds.every((id) => !collapsedMap[id])

  return {
    collapsedMap,
    isCollapsed,
    toggleItem,
    setItemCollapsed,
    collapseAll,
    expandAll,
    allCollapsed,
    allExpanded,
  }
}
