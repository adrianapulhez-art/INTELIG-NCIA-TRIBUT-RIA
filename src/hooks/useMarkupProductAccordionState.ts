import { useState, useEffect, useCallback } from 'react'

/**
 * Hook para gerenciar o estado acordeão das camadas de produtos cadastrados na Markup.
 * Regra: no máximo 01 produto aberto por vez.
 * Ao abrir um produto, o anterior se recolhe automaticamente.
 * Persistência no localStorage na chave padrão `it-markup-product-open`.
 */
const STORAGE_KEY = 'it-markup-product-open'

export function useMarkupProductAccordionState(productIds: string[]) {
  const [openProductId, setOpenProductId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return stored
      }
    } catch {
      // Ignora erro de leitura do localStorage
    }
    // Inicial padrão: se houver produtos, abre o primeiro item por conveniência
    return productIds.length > 0 ? productIds[0] : null
  })

  // Sincroniza se o produto armazenado não existe mais nos IDs atuais
  useEffect(() => {
    if (productIds.length === 0) {
      setOpenProductId(null)
      return
    }
    if (openProductId && !productIds.includes(openProductId)) {
      // Abre o primeiro produto disponível
      const fallback = productIds[0]
      setOpenProductId(fallback)
      try {
        localStorage.setItem(STORAGE_KEY, fallback)
      } catch {
        // Ignora
      }
    }
  }, [productIds, openProductId])

  const saveOpenId = useCallback((id: string | null) => {
    setOpenProductId(id)
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignora erro de escrita
    }
  }, [])

  const toggleProduct = useCallback(
    (id: string) => {
      saveOpenId(openProductId === id ? null : id)
    },
    [openProductId, saveOpenId],
  )

  const openProduct = useCallback(
    (id: string) => {
      saveOpenId(id)
    },
    [saveOpenId],
  )

  const collapseAll = useCallback(() => {
    saveOpenId(null)
  }, [saveOpenId])

  const expandFirst = useCallback(() => {
    if (productIds.length > 0) {
      saveOpenId(productIds[0])
    }
  }, [productIds, saveOpenId])

  const isOpen = useCallback(
    (id: string) => {
      return openProductId === id
    },
    [openProductId],
  )

  const allCollapsed = openProductId === null || productIds.length === 0
  const hasOpenProduct = openProductId !== null && productIds.includes(openProductId)

  return {
    openProductId,
    isOpen,
    toggleProduct,
    openProduct,
    collapseAll,
    expandFirst,
    allCollapsed,
    hasOpenProduct,
  }
}
