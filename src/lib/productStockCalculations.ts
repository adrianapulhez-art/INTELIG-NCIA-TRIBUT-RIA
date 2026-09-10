/**
 * Subsistema de Controle de Estoque por Produto
 *
 * Módulo para controle individualizado de estoque por produto com:
 * - Estoque inicial (quantidade e valor/custo unitário);
 * - Entradas (compras: quantidade, custo unitário, valor total, data e nota/obs);
 * - Saídas (vendas: quantidade, data e pedido/obs);
 * - Custo Médio Ponderado Móvel recalculado a cada entrada:
 *     Custo Médio = (Valor do Estoque Atual + Valor da Entrada) / (Quantidade Atual + Quantidade da Entrada)
 * - Baixas de saída ao Custo Médio Vigente daquele momento:
 *     Custo do CMV da saída = Quantidade da saída × Custo Médio Vigente
 * - Posição final por produto (quantidade, valor em estoque, custo médio atual, CMV acumulado);
 * - Totais consolidados de todos os produtos cadastrados;
 * - Validações amigáveis: saídas que excedem o saldo em estoque e entradas com custo zerado.
 */

export interface ProductStockInitial {
  quantity: number
  unitCost: number
}

export interface ProductStockEntry {
  id: string
  date?: string
  quantity: number
  unitCost: number
  totalValue: number // quantity * unitCost
  notes?: string
}

export interface ProductStockExit {
  id: string
  date?: string
  quantity: number
  unitCostSnapshot?: number // Custo médio vigente no momento do lançamento da saída
  totalCmvSnapshot?: number // quantity * unitCostSnapshot
  notes?: string
}

export interface ProductStockItem {
  id: string
  productId?: string // ID de vinculação ao MarkupProductItem ou customizado
  name: string
  initial: ProductStockInitial
  entries: ProductStockEntry[]
  exits: ProductStockExit[]
}

export interface ProductStockPosition {
  id: string
  name: string
  // Quantidades
  initialQty: number
  initialUnitCost: number
  initialTotalValue: number
  totalEntriesQty: number
  totalEntriesValue: number
  totalExitsQty: number
  // Posição Vigente
  currentStockQty: number
  currentStockValue: number
  currentAverageCost: number
  accumulatedCmv: number
  // Alertas / Validações
  hasZeroCostEntry: boolean
  isStockNegativeOrExceeded: boolean
  exceededQty: number
  // Linhas cronológicas calculadas para auditoria/extrato
  historyLedger: ProductStockLedgerRow[]
}

export interface ProductStockLedgerRow {
  id: string
  date?: string
  type: 'initial' | 'entry' | 'exit'
  description: string
  quantity: number
  unitCost: number
  totalValue: number
  stockBalanceQty: number
  stockBalanceValue: number
  averageCostAfter: number
  cmvValue: number
  isExceeded?: boolean
}

export interface ProductStockTotals {
  totalInitialQty: number
  totalInitialValue: number
  totalEntriesQty: number
  totalEntriesValue: number
  totalExitsQty: number
  totalStockQty: number
  totalStockValue: number
  totalAccumulatedCmv: number
  hasAnyNegativeStock: boolean
  hasAnyZeroCostEntry: boolean
  productsCount: number
}

export interface ProductStockState {
  enabled: boolean
  products: ProductStockItem[]
}

export const INITIAL_PRODUCT_STOCK_STATE: ProductStockState = {
  enabled: false,
  products: [],
}

/**
 * Arredonda para 2 casas decimais de forma estável para moeda BRL.
 */
export function roundTo2(val: number): number {
  if (!Number.isFinite(val)) return 0
  return Math.round((val + Number.EPSILON) * 100) / 100
}

/**
 * Arredonda para até 4 casas decimais para custos unitários intermediários de precisão.
 */
export function roundTo4(val: number): number {
  if (!Number.isFinite(val)) return 0
  return Math.round((val + Number.EPSILON) * 10000) / 10000
}

/**
 * Calcula a posição e o extrato (Kardex / CMP móvel) de um produto específico.
 * Segue rigorosamente a metodologia contábil do Custo Médio Ponderado Móvel.
 */
export function calculateSingleProductStockPosition(item: ProductStockItem): ProductStockPosition {
  const initialQty = Math.max(0, Number(item.initial?.quantity) || 0)
  const initialUnitCost = Math.max(0, Number(item.initial?.unitCost) || 0)
  const initialTotalValue = roundTo2(initialQty * initialUnitCost)

  let currentQty = initialQty
  let currentVal = initialTotalValue
  let currentAvgCost = initialQty > 0 ? initialTotalValue / initialQty : initialUnitCost
  let accumulatedCmv = 0
  let isStockNegativeOrExceeded = false
  let exceededQty = 0
  let hasZeroCostEntry = false

  const ledger: ProductStockLedgerRow[] = []

  // 1. Linha do Saldo Inicial se houver quantidade ou valor
  if (initialQty > 0 || initialTotalValue > 0) {
    ledger.push({
      id: `init-${item.id}`,
      type: 'initial',
      description: 'Estoque Inicial',
      quantity: initialQty,
      unitCost: currentAvgCost,
      totalValue: initialTotalValue,
      stockBalanceQty: currentQty,
      stockBalanceValue: currentVal,
      averageCostAfter: currentAvgCost,
      cmvValue: 0,
    })
  }

  // 2. Ordenar cronologicamente entradas e saídas mantendo estabilidade
  type ChronoEvent =
    | { type: 'entry'; data: ProductStockEntry; index: number }
    | { type: 'exit'; data: ProductStockExit; index: number }

  const events: ChronoEvent[] = [
    ...(item.entries || []).map((e, idx) => ({ type: 'entry' as const, data: e, index: idx })),
    ...(item.exits || []).map((e, idx) => ({ type: 'exit' as const, data: e, index: idx })),
  ]

  // Se houver datas no formato ISO / YYYY-MM-DD, ordena por data; entradas antes de saídas na mesma data
  events.sort((a, b) => {
    const dateA = a.data.date ? a.data.date.trim() : ''
    const dateB = b.data.date ? b.data.date.trim() : ''
    if (dateA && dateB && dateA !== dateB) {
      return dateA.localeCompare(dateB)
    }
    if (dateA && !dateB) return -1
    if (!dateA && dateB) return 1
    // Na mesma data: entrada antes de saída
    if (a.type !== b.type) {
      return a.type === 'entry' ? -1 : 1
    }
    return a.index - b.index
  })

  let totalEntriesQty = 0
  let totalEntriesValue = 0
  let totalExitsQty = 0

  for (const event of events) {
    if (event.type === 'entry') {
      const e = event.data
      const q = Math.max(0, Number(e.quantity) || 0)
      const u = Math.max(0, Number(e.unitCost) || 0)
      const v =
        e.totalValue !== undefined && e.totalValue > 0 ? Number(e.totalValue) : roundTo2(q * u)

      if (q > 0 && u <= 0) {
        hasZeroCostEntry = true
      }

      totalEntriesQty += q
      totalEntriesValue += v

      const prevQty = currentQty
      const prevVal = currentVal

      currentQty = prevQty + q
      currentVal = roundTo2(prevVal + v)

      if (currentQty > 0) {
        // Custo médio ponderado = valor total / quantidade total
        currentAvgCost = currentVal / currentQty
      }

      ledger.push({
        id: e.id,
        date: e.date,
        type: 'entry',
        description: e.notes || 'Entrada / Compra',
        quantity: q,
        unitCost: u,
        totalValue: v,
        stockBalanceQty: currentQty,
        stockBalanceValue: currentVal,
        averageCostAfter: currentAvgCost,
        cmvValue: 0,
      })
    } else {
      const x = event.data
      const q = Math.max(0, Number(x.quantity) || 0)
      totalExitsQty += q

      let unitCostAtExit = currentAvgCost
      if (unitCostAtExit <= 0 && initialUnitCost > 0) {
        unitCostAtExit = initialUnitCost
      }

      // CMV desta saída = quantidade × custo médio vigente
      const exitCmv = roundTo2(q * unitCostAtExit)
      accumulatedCmv = roundTo2(accumulatedCmv + exitCmv)

      // Validação de saldo
      const isExceededThis = q > currentQty
      if (isExceededThis) {
        isStockNegativeOrExceeded = true
        exceededQty += q - currentQty
      }

      currentQty = currentQty - q
      currentVal = roundTo2(currentVal - exitCmv)

      // Se o estoque zerou ou negativou, o valor mínimo do estoque é 0 para evitar valor fantasma
      if (currentQty <= 0) {
        currentVal = Math.min(0, currentVal)
      }

      ledger.push({
        id: x.id,
        date: x.date,
        type: 'exit',
        description: x.notes || 'Saída / Venda',
        quantity: q,
        unitCost: unitCostAtExit,
        totalValue: exitCmv,
        stockBalanceQty: currentQty,
        stockBalanceValue: currentVal,
        averageCostAfter: currentAvgCost,
        cmvValue: exitCmv,
        isExceeded: isExceededThis,
      })
    }
  }

  return {
    id: item.id,
    name: item.name || 'Produto sem nome',
    initialQty,
    initialUnitCost,
    initialTotalValue,
    totalEntriesQty,
    totalEntriesValue: roundTo2(totalEntriesValue),
    totalExitsQty,
    currentStockQty: currentQty,
    currentStockValue: roundTo2(currentVal),
    currentAverageCost: roundTo4(currentAvgCost),
    accumulatedCmv: roundTo2(accumulatedCmv),
    hasZeroCostEntry,
    isStockNegativeOrExceeded,
    exceededQty,
    historyLedger: ledger,
  }
}

/**
 * Calcula a posição de todos os produtos do subsistema e consolida totais globais.
 */
export function calculateProductStockSubsystem(products: ProductStockItem[]): {
  positions: ProductStockPosition[]
  totals: ProductStockTotals
} {
  const positions = (products || []).map(calculateSingleProductStockPosition)

  const totals: ProductStockTotals = {
    totalInitialQty: 0,
    totalInitialValue: 0,
    totalEntriesQty: 0,
    totalEntriesValue: 0,
    totalExitsQty: 0,
    totalStockQty: 0,
    totalStockValue: 0,
    totalAccumulatedCmv: 0,
    hasAnyNegativeStock: false,
    hasAnyZeroCostEntry: false,
    productsCount: positions.length,
  }

  for (const pos of positions) {
    totals.totalInitialQty += pos.initialQty
    totals.totalInitialValue += pos.initialTotalValue
    totals.totalEntriesQty += pos.totalEntriesQty
    totals.totalEntriesValue += pos.totalEntriesValue
    totals.totalExitsQty += pos.totalExitsQty
    totals.totalStockQty += pos.currentStockQty
    totals.totalStockValue += pos.currentStockValue
    totals.totalAccumulatedCmv += pos.accumulatedCmv

    if (pos.isStockNegativeOrExceeded) {
      totals.hasAnyNegativeStock = true
    }
    if (pos.hasZeroCostEntry) {
      totals.hasAnyZeroCostEntry = true
    }
  }

  totals.totalInitialValue = roundTo2(totals.totalInitialValue)
  totals.totalEntriesValue = roundTo2(totals.totalEntriesValue)
  totals.totalStockValue = roundTo2(totals.totalStockValue)
  totals.totalAccumulatedCmv = roundTo2(totals.totalAccumulatedCmv)

  return { positions, totals }
}
