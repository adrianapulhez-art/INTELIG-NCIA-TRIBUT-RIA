import React, { createContext, useContext, useState, useEffect } from 'react'
import { parseBRNumber } from '@/lib/taxCalculations'

export type TaxRegime = 'presumido' | 'real' | 'simples'
export type ActivityType = 'comercio' | 'industria' | 'servicos'
export type MarkupMode = 'liquid' | 'cost_margin'

export interface MarkupProductItem {
  id: string
  name: string
  mode: MarkupMode // 'liquid' ou 'cost_margin'
  desiredNetRevenue: number // Receita líquida desejada (quando mode === 'liquid')
  cost: number // Custo base (quando mode === 'cost_margin')
  margin: number // Margem de lucro % (quando mode === 'cost_margin' ou margem adicional)
  quantity: number // Quantidade vendida
  // Resultados calculados individualmente ao clicar em Simular:
  salePrice: number // Preço de venda calculado
  taxFactor: number
  completeFactor: number
  totalRevenue: number // salePrice * quantity
  totalCost: number // cost * quantity (no modo cost_margin)
}

export interface AdditionalCostItem {
  id: string
  description: string
  value: number
}

export interface DeductionCostItem {
  id: string
  description: string
  value: number
}

export interface ExpenseItem {
  id: string
  description: string
  value: number
}

export interface CustomTaxItem {
  id: string
  name: string
  rate: number // percentual, ex: 5 para 5%
}

export interface TaxStateSnapshot {
  regime: TaxRegime
  markupMode: MarkupMode
  desiredNetRevenue: number
  additionalMargin: number
  icmsRateMarkup: number
  customTaxesMarkup: CustomTaxItem[]
  markupProducts: MarkupProductItem[]
  simulatedSalePrice: number
  simulatedTaxFactorTotal: number
  simulatedCompleteFactor: number
  isMarkupSimulated: boolean
  totalConsolidatedRevenue: number
  totalConsolidatedQuantity: number
  totalConsolidatedCost: number
  initialInventory: number
  finalInventory: number
  additionalCosts: AdditionalCostItem[]
  nonRecoverableTaxBase: number
  nonRecoverableTaxRate: number
  deductionCosts: DeductionCostItem[]
  icmsPurchasesBase: number
  icmsPurchasesRate: number
  icmsFreightPurchasesBase: number
  icmsFreightPurchasesRate: number
  pisPurchasesBase: number
  pisExcludedIcmsManual: number | null
  cofinsPurchasesBase: number
  cofinsExcludedIcmsManual: number | null
  pisFreightPurchasesBase: number
  cofinsFreightPurchasesBase: number
  presumidoActivity: ActivityType
  presumidoIssRate: number
  presumidoQuantitySold: number
  presumidoExpenses: ExpenseItem[]
  isPresumidoSimulated: boolean
  realActivity: ActivityType
  realIssRate: number
  realAdditions: number
  realExclusions: number
  realQuantitySold: number
  realExpenses: ExpenseItem[]
  isRealSimulated: boolean
  simplesAnexo: string
  simplesRbt12: number
  simplesPayroll12m: number
  simplesQuantitySold: number
  simplesExpenses: ExpenseItem[]
  isSimplesSimulated: boolean
}

export interface TaxContextType {
  // Snapshot export/load para sincronização com banco de dados
  getSnapshot: () => TaxStateSnapshot
  loadSnapshot: (snapshot: TaxStateSnapshot) => void

  // Regime compartilhado entre Markup, Compras e DREs
  regime: TaxRegime
  setRegime: (regime: TaxRegime) => void

  // MARKUP STATE
  markupMode: MarkupMode
  setMarkupMode: (mode: MarkupMode) => void
  desiredNetRevenue: number
  setDesiredNetRevenue: (val: number) => void
  additionalMargin: number
  setAdditionalMargin: (val: number) => void
  icmsRateMarkup: number
  setIcmsRateMarkup: (val: number) => void
  customTaxesMarkup: CustomTaxItem[]
  addCustomTaxMarkup: (name: string, rate: number) => void
  removeCustomTaxMarkup: (id: string) => void
  // Múltiplos Produtos no Markup
  markupProducts: MarkupProductItem[]
  addMarkupProduct: (name?: string, mode?: MarkupMode) => void
  updateMarkupProduct: (
    id: string,
    field: keyof Omit<
      MarkupProductItem,
      'id' | 'salePrice' | 'taxFactor' | 'completeFactor' | 'totalRevenue' | 'totalCost'
    >,
    value: string | number | MarkupMode,
  ) => void
  removeMarkupProduct: (id: string) => void
  // Markup calculado (atualizado apenas ao clicar em "Simular")
  simulatedSalePrice: number // mantido para compatibilidade (preço do 1º produto ou consolidado)
  simulatedTaxFactorTotal: number
  simulatedCompleteFactor: number
  isMarkupSimulated: boolean
  simulateMarkup: () => void
  // Consolidado dos produtos (calculado no simulateMarkup)
  totalConsolidatedRevenue: number // Σ (preço * quantidade)
  totalConsolidatedQuantity: number // Σ quantidade
  totalConsolidatedCost: number // Σ (custo * quantidade)

  // COMPRAS STATE (atualiza dinamicamente)
  initialInventory: number // EI
  setInitialInventory: (val: number) => void
  finalInventory: number // EF
  setFinalInventory: (val: number) => void
  additionalCosts: AdditionalCostItem[]
  addAdditionalCost: (description?: string, value?: number) => void
  updateAdditionalCost: (id: string, field: 'description' | 'value', value: string | number) => void
  removeAdditionalCost: (id: string) => void

  // Tributos não recuperáveis (ex.: IPI)
  nonRecoverableTaxBase: number
  setNonRecoverableTaxBase: (val: number) => void
  nonRecoverableTaxRate: number
  setNonRecoverableTaxRate: (val: number) => void

  // Deduções do custo
  deductionCosts: DeductionCostItem[]
  addDeductionCost: (description?: string, value?: number) => void
  updateDeductionCost: (id: string, field: 'description' | 'value', value: string | number) => void
  removeDeductionCost: (id: string) => void

  // Blocos dinâmicos de tributos sobre compras
  icmsPurchasesBase: number
  setIcmsPurchasesBase: (val: number) => void
  icmsPurchasesRate: number
  setIcmsPurchasesRate: (val: number) => void

  icmsFreightPurchasesBase: number
  setIcmsFreightPurchasesBase: (val: number) => void
  icmsFreightPurchasesRate: number
  setIcmsFreightPurchasesRate: (val: number) => void

  // Exclusão manual do ICMS na tese do século para PIS/COFINS (se vazia, usa o ICMS calculado)
  pisPurchasesBase: number
  setPisPurchasesBase: (val: number) => void
  pisExcludedIcmsManual: number | null
  setPisExcludedIcmsManual: (val: number | null) => void

  cofinsPurchasesBase: number
  setCofinsPurchasesBase: (val: number) => void
  cofinsExcludedIcmsManual: number | null
  setCofinsExcludedIcmsManual: (val: number | null) => void

  pisFreightPurchasesBase: number
  setPisFreightPurchasesBase: (val: number) => void

  cofinsFreightPurchasesBase: number
  setCofinsFreightPurchasesBase: (val: number) => void

  // DRE PRESUMIDO STATE
  presumidoActivity: ActivityType
  setPresumidoActivity: (act: ActivityType) => void
  presumidoIssRate: number
  setPresumidoIssRate: (rate: number) => void
  presumidoQuantitySold: number
  setPresumidoQuantitySold: (qty: number) => void
  presumidoExpenses: ExpenseItem[]
  addPresumidoExpense: (desc?: string, val?: number) => void
  updatePresumidoExpense: (
    id: string,
    field: 'description' | 'value',
    value: string | number,
  ) => void
  removePresumidoExpense: (id: string) => void
  isPresumidoSimulated: boolean
  simulatePresumido: () => void

  // DRE REAL STATE
  realActivity: ActivityType
  setRealActivity: (act: ActivityType) => void
  realIssRate: number
  setRealIssRate: (rate: number) => void
  realAdditions: number
  setRealAdditions: (val: number) => void
  realExclusions: number
  setRealExclusions: (val: number) => void
  realQuantitySold: number
  setRealQuantitySold: (qty: number) => void
  realExpenses: ExpenseItem[]
  addRealExpense: (desc?: string, val?: number) => void
  updateRealExpense: (id: string, field: 'description' | 'value', value: string | number) => void
  removeRealExpense: (id: string) => void
  isRealSimulated: boolean
  simulateReal: () => void

  // DRE SIMPLES NACIONAL STATE
  simplesAnexo: string // 'anexo_1' | 'anexo_2' | 'anexo_3' | 'anexo_4' | 'anexo_5'
  setSimplesAnexo: (anexo: string) => void
  simplesRbt12: number // Receita bruta acumulada 12 meses
  setSimplesRbt12: (val: number) => void
  simplesPayroll12m: number // Folha de salários 12 meses (para Fator R)
  setSimplesPayroll12m: (val: number) => void
  simplesQuantitySold: number
  setSimplesQuantitySold: (qty: number) => void
  simplesExpenses: ExpenseItem[]
  addSimplesExpense: (desc?: string, val?: number) => void
  updateSimplesExpense: (id: string, field: 'description' | 'value', value: string | number) => void
  removeSimplesExpense: (id: string) => void
  isSimplesSimulated: boolean
  simulateSimples: () => void

  // CÁLCULOS DERIVADOS DE COMPRAS
  calculatedPurchases: {
    totalAdditionalCosts: number
    nonRecoverableTaxResult: number
    totalAdditions: number
    totalDeductionsBase: number
    icmsResult: number
    icmsFreightResult: number
    effectiveIcmsToExclude: number
    pisAdjustedBase: number
    pisResult: number
    cofinsAdjustedBase: number
    cofinsResult: number
    pisFreightResult: number
    cofinsFreightResult: number
    // CMV Presumido: EI + (Acréscimos - DeduçõesBase - ICMS - ICMSFrete) - EF
    cmvPresumidoNetPurchases: number
    cmvPresumido: number
    // CMV Real: EI + (Acréscimos - DeduçõesBase - ICMS - ICMSFrete - PIS - COFINS - PISFrete - COFINSFrete) - EF
    cmvRealNetPurchases: number
    cmvReal: number
    // CMV Simples: No Simples Nacional, os tributos da compra não são recuperáveis (integram o custo)
    cmvSimplesNetPurchases: number
    cmvSimples: number
  }

  // Limpar/Resetar tudo para zerado
  resetAll: () => void
}

const LOCAL_STORAGE_KEY = 'it_tax_context_v1'

const TaxContext = createContext<TaxContextType | undefined>(undefined)

export const TaxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Carregar dados salvos ou inicializar zerado
  const savedState = (() => {
    try {
      const item = localStorage.getItem(LOCAL_STORAGE_KEY)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  })()

  // REGIME
  const [regime, setRegime] = useState<TaxRegime>(savedState?.regime || 'presumido')

  // MARKUP
  const [markupMode, setMarkupMode] = useState<MarkupMode>(savedState?.markupMode || 'liquid')
  const [desiredNetRevenue, setDesiredNetRevenue] = useState<number>(
    savedState?.desiredNetRevenue || 0,
  )
  const [additionalMargin, setAdditionalMargin] = useState<number>(
    savedState?.additionalMargin || 0,
  )
  const [icmsRateMarkup, setIcmsRateMarkup] = useState<number>(savedState?.icmsRateMarkup || 0)
  const [customTaxesMarkup, setCustomTaxesMarkup] = useState<CustomTaxItem[]>(
    savedState?.customTaxesMarkup || [],
  )
  // Inicialização dos produtos com suporte a estado anterior
  const initialProducts: MarkupProductItem[] = (() => {
    if (
      savedState?.markupProducts &&
      Array.isArray(savedState.markupProducts) &&
      savedState.markupProducts.length > 0
    ) {
      return savedState.markupProducts
    }
    // Cria 1 produto padrão inicial para não quebrar fluxos legados
    return [
      {
        id: 'prod-1',
        name: 'Produto 1',
        mode: savedState?.markupMode || 'liquid',
        desiredNetRevenue: savedState?.desiredNetRevenue || 0,
        cost: savedState?.markupMode === 'cost_margin' ? savedState?.desiredNetRevenue || 0 : 0,
        margin: savedState?.additionalMargin || 0,
        quantity: 0,
        salePrice: savedState?.simulatedSalePrice || 0,
        taxFactor: savedState?.simulatedTaxFactorTotal || 0,
        completeFactor: savedState?.simulatedCompleteFactor || 0,
        totalRevenue: (savedState?.simulatedSalePrice || 0) * 0,
        totalCost: 0,
      },
    ]
  })()
  const [markupProducts, setMarkupProducts] = useState<MarkupProductItem[]>(initialProducts)

  const [simulatedSalePrice, setSimulatedSalePrice] = useState<number>(
    savedState?.simulatedSalePrice || 0,
  )
  const [simulatedTaxFactorTotal, setSimulatedTaxFactorTotal] = useState<number>(
    savedState?.simulatedTaxFactorTotal || 0,
  )
  const [simulatedCompleteFactor, setSimulatedCompleteFactor] = useState<number>(
    savedState?.simulatedCompleteFactor || 0,
  )
  const [isMarkupSimulated, setIsMarkupSimulated] = useState<boolean>(
    savedState?.isMarkupSimulated || false,
  )
  const [totalConsolidatedRevenue, setTotalConsolidatedRevenue] = useState<number>(
    savedState?.totalConsolidatedRevenue || 0,
  )
  const [totalConsolidatedQuantity, setTotalConsolidatedQuantity] = useState<number>(
    savedState?.totalConsolidatedQuantity || 0,
  )
  const [totalConsolidatedCost, setTotalConsolidatedCost] = useState<number>(
    savedState?.totalConsolidatedCost || 0,
  )

  // COMPRAS
  const [initialInventory, setInitialInventory] = useState<number>(
    savedState?.initialInventory || 0,
  )
  const [finalInventory, setFinalInventory] = useState<number>(savedState?.finalInventory || 0)
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCostItem[]>(
    savedState?.additionalCosts || [
      { id: '1', description: 'Compras brutas', value: 0 },
      { id: '2', description: 'Frete e seguro s/ compras', value: 0 },
    ],
  )
  const [nonRecoverableTaxBase, setNonRecoverableTaxBase] = useState<number>(
    savedState?.nonRecoverableTaxBase || 0,
  )
  const [nonRecoverableTaxRate, setNonRecoverableTaxRate] = useState<number>(
    savedState?.nonRecoverableTaxRate || 0,
  )

  const [deductionCosts, setDeductionCosts] = useState<DeductionCostItem[]>(
    savedState?.deductionCosts || [
      { id: '1', description: 'Devoluções / abatimentos / descontos', value: 0 },
    ],
  )

  const [icmsPurchasesBase, setIcmsPurchasesBase] = useState<number>(
    savedState?.icmsPurchasesBase || 0,
  )
  const [icmsPurchasesRate, setIcmsPurchasesRate] = useState<number>(
    savedState?.icmsPurchasesRate || 0,
  )

  const [icmsFreightPurchasesBase, setIcmsFreightPurchasesBase] = useState<number>(
    savedState?.icmsFreightPurchasesBase || 0,
  )
  const [icmsFreightPurchasesRate, setIcmsFreightPurchasesRate] = useState<number>(
    savedState?.icmsFreightPurchasesRate || 0,
  )

  const [pisPurchasesBase, setPisPurchasesBase] = useState<number>(
    savedState?.pisPurchasesBase || 0,
  )
  const [pisExcludedIcmsManual, setPisExcludedIcmsManual] = useState<number | null>(
    savedState?.pisExcludedIcmsManual !== undefined ? savedState.pisExcludedIcmsManual : null,
  )

  const [cofinsPurchasesBase, setCofinsPurchasesBase] = useState<number>(
    savedState?.cofinsPurchasesBase || 0,
  )
  const [cofinsExcludedIcmsManual, setCofinsExcludedIcmsManual] = useState<number | null>(
    savedState?.cofinsExcludedIcmsManual !== undefined ? savedState.cofinsExcludedIcmsManual : null,
  )

  const [pisFreightPurchasesBase, setPisFreightPurchasesBase] = useState<number>(
    savedState?.pisFreightPurchasesBase || 0,
  )
  const [cofinsFreightPurchasesBase, setCofinsFreightPurchasesBase] = useState<number>(
    savedState?.cofinsFreightPurchasesBase || 0,
  )

  // DRE PRESUMIDO
  const [presumidoActivity, setPresumidoActivity] = useState<ActivityType>(
    savedState?.presumidoActivity || 'comercio',
  )
  const [presumidoIssRate, setPresumidoIssRate] = useState<number>(
    savedState?.presumidoIssRate || 0,
  )
  const [presumidoQuantitySold, setPresumidoQuantitySold] = useState<number>(
    savedState?.presumidoQuantitySold || 0,
  )
  const [presumidoExpenses, setPresumidoExpenses] = useState<ExpenseItem[]>(
    savedState?.presumidoExpenses || [
      { id: '1', description: 'Despesas com pessoal', value: 0 },
      { id: '2', description: 'Aluguel e utilidades', value: 0 },
    ],
  )
  const [isPresumidoSimulated, setIsPresumidoSimulated] = useState<boolean>(
    savedState?.isPresumidoSimulated || false,
  )

  // DRE REAL
  const [realActivity, setRealActivity] = useState<ActivityType>(
    savedState?.realActivity || 'comercio',
  )
  const [realIssRate, setRealIssRate] = useState<number>(savedState?.realIssRate || 0)
  const [realAdditions, setRealAdditions] = useState<number>(savedState?.realAdditions || 0)
  const [realExclusions, setRealExclusions] = useState<number>(savedState?.realExclusions || 0)
  const [realQuantitySold, setRealQuantitySold] = useState<number>(
    savedState?.realQuantitySold || 0,
  )
  const [realExpenses, setRealExpenses] = useState<ExpenseItem[]>(
    savedState?.realExpenses || [
      { id: '1', description: 'Despesas operacionais e administrativas', value: 0 },
    ],
  )
  const [isRealSimulated, setIsRealSimulated] = useState<boolean>(
    savedState?.isRealSimulated || false,
  )

  // DRE SIMPLES NACIONAL
  const [simplesAnexo, setSimplesAnexo] = useState<string>(savedState?.simplesAnexo || 'anexo_1')
  const [simplesRbt12, setSimplesRbt12] = useState<number>(savedState?.simplesRbt12 || 0)
  const [simplesPayroll12m, setSimplesPayroll12m] = useState<number>(
    savedState?.simplesPayroll12m || 0,
  )
  const [simplesQuantitySold, setSimplesQuantitySold] = useState<number>(
    savedState?.simplesQuantitySold || 0,
  )
  const [simplesExpenses, setSimplesExpenses] = useState<ExpenseItem[]>(
    savedState?.simplesExpenses || [
      { id: '1', description: 'Despesas com pessoal e encargos', value: 0 },
      { id: '2', description: 'Aluguel e custos operacionais', value: 0 },
    ],
  )
  const [isSimplesSimulated, setIsSimplesSimulated] = useState<boolean>(
    savedState?.isSimplesSimulated || false,
  )

  // Persistir em localStorage
  useEffect(() => {
    try {
      const stateToSave = {
        regime,
        markupMode,
        desiredNetRevenue,
        additionalMargin,
        icmsRateMarkup,
        customTaxesMarkup,
        markupProducts,
        simulatedSalePrice,
        simulatedTaxFactorTotal,
        simulatedCompleteFactor,
        isMarkupSimulated,
        totalConsolidatedRevenue,
        totalConsolidatedQuantity,
        totalConsolidatedCost,
        initialInventory,
        finalInventory,
        additionalCosts,
        nonRecoverableTaxBase,
        nonRecoverableTaxRate,
        deductionCosts,
        icmsPurchasesBase,
        icmsPurchasesRate,
        icmsFreightPurchasesBase,
        icmsFreightPurchasesRate,
        pisPurchasesBase,
        pisExcludedIcmsManual,
        cofinsPurchasesBase,
        cofinsExcludedIcmsManual,
        pisFreightPurchasesBase,
        cofinsFreightPurchasesBase,
        presumidoActivity,
        presumidoIssRate,
        presumidoQuantitySold,
        presumidoExpenses,
        isPresumidoSimulated,
        realActivity,
        realIssRate,
        realAdditions,
        realExclusions,
        realQuantitySold,
        realExpenses,
        isRealSimulated,
        simplesAnexo,
        simplesRbt12,
        simplesPayroll12m,
        simplesQuantitySold,
        simplesExpenses,
        isSimplesSimulated,
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave))
    } catch {
      // Ignora erro se localStorage indisponível
    }
  }, [
    regime,
    markupMode,
    desiredNetRevenue,
    additionalMargin,
    icmsRateMarkup,
    customTaxesMarkup,
    markupProducts,
    simulatedSalePrice,
    simulatedTaxFactorTotal,
    simulatedCompleteFactor,
    isMarkupSimulated,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
    totalConsolidatedCost,
    initialInventory,
    finalInventory,
    additionalCosts,
    nonRecoverableTaxBase,
    nonRecoverableTaxRate,
    deductionCosts,
    icmsPurchasesBase,
    icmsPurchasesRate,
    icmsFreightPurchasesBase,
    icmsFreightPurchasesRate,
    pisPurchasesBase,
    pisExcludedIcmsManual,
    cofinsPurchasesBase,
    cofinsExcludedIcmsManual,
    pisFreightPurchasesBase,
    cofinsFreightPurchasesBase,
    presumidoActivity,
    presumidoIssRate,
    presumidoQuantitySold,
    presumidoExpenses,
    isPresumidoSimulated,
    realActivity,
    realIssRate,
    realAdditions,
    realExclusions,
    realQuantitySold,
    realExpenses,
    isRealSimulated,
    simplesAnexo,
    simplesRbt12,
    simplesPayroll12m,
    simplesQuantitySold,
    simplesExpenses,
    isSimplesSimulated,
  ])

  // Handlers para itens dinâmicos
  const addCustomTaxMarkup = (name: string, rate: number) => {
    setCustomTaxesMarkup((prev) => [...prev, { id: String(Date.now()), name, rate }])
  }

  const removeCustomTaxMarkup = (id: string) => {
    setCustomTaxesMarkup((prev) => prev.filter((t) => t.id !== id))
  }

  const addMarkupProduct = (name?: string, mode?: MarkupMode) => {
    setMarkupProducts((prev) => {
      const nextNum = prev.length + 1
      const newProduct: MarkupProductItem = {
        id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name || `Produto ${nextNum}`,
        mode: mode || markupMode || 'liquid',
        desiredNetRevenue: 0,
        cost: 0,
        margin: 0,
        quantity: 0,
        salePrice: 0,
        taxFactor: 0,
        completeFactor: 0,
        totalRevenue: 0,
        totalCost: 0,
      }
      return [...prev, newProduct]
    })
  }

  const updateMarkupProduct = (
    id: string,
    field: keyof Omit<
      MarkupProductItem,
      'id' | 'salePrice' | 'taxFactor' | 'completeFactor' | 'totalRevenue' | 'totalCost'
    >,
    value: string | number | MarkupMode,
  ) => {
    setMarkupProducts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (field === 'mode') {
          return { ...item, mode: value as MarkupMode }
        }
        if (field === 'name') {
          return { ...item, name: String(value) }
        }
        if (field === 'quantity') {
          const parsed = typeof value === 'number' ? value : parseInt(String(value), 10)
          return { ...item, quantity: isNaN(parsed) || parsed < 0 ? 0 : parsed }
        }
        // Campos numéricos (desiredNetRevenue, cost, margin)
        const numVal = typeof value === 'number' ? value : parseBRNumber(String(value))
        return {
          ...item,
          [field]: numVal,
        }
      }),
    )
  }

  const removeMarkupProduct = (id: string) => {
    setMarkupProducts((prev) => {
      // Garantir que sempre haja pelo menos um produto
      if (prev.length <= 1) {
        return [
          {
            id: `prod-${Date.now()}`,
            name: 'Produto 1',
            mode: 'liquid',
            desiredNetRevenue: 0,
            cost: 0,
            margin: 0,
            quantity: 0,
            salePrice: 0,
            taxFactor: 0,
            completeFactor: 0,
            totalRevenue: 0,
            totalCost: 0,
          },
        ]
      }
      return prev.filter((p) => p.id !== id)
    })
  }

  const addAdditionalCost = (description = 'Novo acréscimo', value = 0) => {
    setAdditionalCosts((prev) => [...prev, { id: String(Date.now()), description, value }])
  }

  const updateAdditionalCost = (
    id: string,
    field: 'description' | 'value',
    value: string | number,
  ) => {
    setAdditionalCosts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          [field]: field === 'value' ? parseBRNumber(value) : value,
        }
      }),
    )
  }

  const removeAdditionalCost = (id: string) => {
    setAdditionalCosts((prev) => prev.filter((item) => item.id !== id))
  }

  const addDeductionCost = (description = 'Nova dedução', value = 0) => {
    setDeductionCosts((prev) => [...prev, { id: String(Date.now()), description, value }])
  }

  const updateDeductionCost = (
    id: string,
    field: 'description' | 'value',
    value: string | number,
  ) => {
    setDeductionCosts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          [field]: field === 'value' ? parseBRNumber(value) : value,
        }
      }),
    )
  }

  const removeDeductionCost = (id: string) => {
    setDeductionCosts((prev) => prev.filter((item) => item.id !== id))
  }

  const addPresumidoExpense = (description = 'Nova despesa', value = 0) => {
    setPresumidoExpenses((prev) => [...prev, { id: String(Date.now()), description, value }])
  }

  const updatePresumidoExpense = (
    id: string,
    field: 'description' | 'value',
    value: string | number,
  ) => {
    setPresumidoExpenses((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          [field]: field === 'value' ? parseBRNumber(value) : value,
        }
      }),
    )
  }

  const removePresumidoExpense = (id: string) => {
    setPresumidoExpenses((prev) => prev.filter((item) => item.id !== id))
  }

  const addRealExpense = (description = 'Nova despesa', value = 0) => {
    setRealExpenses((prev) => [...prev, { id: String(Date.now()), description, value }])
  }

  const updateRealExpense = (
    id: string,
    field: 'description' | 'value',
    value: string | number,
  ) => {
    setRealExpenses((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          [field]: field === 'value' ? parseBRNumber(value) : value,
        }
      }),
    )
  }

  const removeRealExpense = (id: string) => {
    setRealExpenses((prev) => prev.filter((item) => item.id !== id))
  }

  const addSimplesExpense = (description = 'Nova despesa operacional', value = 0) => {
    setSimplesExpenses((prev) => [...prev, { id: String(Date.now()), description, value }])
  }

  const updateSimplesExpense = (
    id: string,
    field: 'description' | 'value',
    value: string | number,
  ) => {
    setSimplesExpenses((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          [field]: field === 'value' ? parseBRNumber(value) : value,
        }
      }),
    )
  }

  const removeSimplesExpense = (id: string) => {
    setSimplesExpenses((prev) => prev.filter((item) => item.id !== id))
  }

  // CÁLCULO DE COMPRAS DERIVADO
  const totalAdditionalCosts = additionalCosts.reduce((acc, c) => acc + (c.value || 0), 0)
  const nonRecoverableTaxResult = (nonRecoverableTaxBase * nonRecoverableTaxRate) / 100
  const totalAdditions = totalAdditionalCosts + nonRecoverableTaxResult

  const totalDeductionsBase = deductionCosts.reduce((acc, d) => acc + (d.value || 0), 0)

  const icmsResult = (icmsPurchasesBase * icmsPurchasesRate) / 100
  const icmsFreightResult = (icmsFreightPurchasesBase * icmsFreightPurchasesRate) / 100

  // Tese do século: ICMS a excluir
  // Se pisExcludedIcmsManual for null ou undefined, usa o icmsResult calculado
  const effectiveIcmsToExclude = pisExcludedIcmsManual !== null ? pisExcludedIcmsManual : icmsResult

  // PIS / COFINS (regime Real utiliza 1.65% e 7.60%)
  const pisRatePurchases = regime === 'real' ? 1.65 : 0.65
  const cofinsRatePurchases = regime === 'real' ? 7.6 : 3.0

  const pisAdjustedBase = Math.max(0, pisPurchasesBase - effectiveIcmsToExclude)
  const pisResult = (pisAdjustedBase * pisRatePurchases) / 100

  const cofinsAdjustedBase = Math.max(
    0,
    cofinsPurchasesBase -
      (cofinsExcludedIcmsManual !== null ? cofinsExcludedIcmsManual : icmsResult),
  )
  const cofinsResult = (cofinsAdjustedBase * cofinsRatePurchases) / 100

  const pisFreightResult = (pisFreightPurchasesBase * pisRatePurchases) / 100
  const cofinsFreightResult = (cofinsFreightPurchasesBase * cofinsRatePurchases) / 100

  // CMV Presumido: Apenas ICMS e ICMS s/ frete são recuperáveis
  const cmvPresumidoNetPurchases =
    totalAdditions - totalDeductionsBase - icmsResult - icmsFreightResult
  const cmvPresumido = Math.max(0, initialInventory + cmvPresumidoNetPurchases - finalInventory)

  // CMV Real: ICMS, ICMS frete, PIS, COFINS, PIS frete, COFINS frete deduzem
  const cmvRealNetPurchases =
    totalAdditions -
    totalDeductionsBase -
    icmsResult -
    icmsFreightResult -
    pisResult -
    cofinsResult -
    pisFreightResult -
    cofinsFreightResult
  const cmvReal = Math.max(0, initialInventory + cmvRealNetPurchases - finalInventory)

  // CMV Simples Nacional: Tributos sobre compras NÃO são recuperáveis (integram integralmente o custo)
  // CL = totalAdditions - totalDeductionsBase (sem deduzir ICMS, PIS ou COFINS)
  const cmvSimplesNetPurchases = totalAdditions - totalDeductionsBase
  const cmvSimples = Math.max(0, initialInventory + cmvSimplesNetPurchases - finalInventory)

  // SIMULAÇÃO DO MARKUP
  const simulateMarkup = () => {
    // Alíquotas conforme regime
    // No Simples Nacional, não há incidência de PIS/COFINS em separado (o recolhimento é unificado no DAS).
    // Fator de PIS e COFINS = 1.0 (0% separados). O ICMS pode ser destacado ou mantido livre.
    const pisRate = regime === 'simples' ? 0 : regime === 'presumido' ? 0.0065 : 0.0165
    const cofinsRate = regime === 'simples' ? 0 : regime === 'presumido' ? 0.03 : 0.076
    const icmsFactor = 1 - (icmsRateMarkup || 0) / 100
    const pisFactor = regime === 'simples' ? 1 : 1 - pisRate
    const cofinsFactor = regime === 'simples' ? 1 : 1 - cofinsRate

    let baseTaxFactor = icmsFactor * pisFactor * cofinsFactor

    // Tributos customizados
    for (const tax of customTaxesMarkup) {
      baseTaxFactor *= 1 - (tax.rate || 0) / 100
    }

    // Calcular cada produto individualmente
    const updatedProducts = markupProducts.map((p) => {
      const margin = p.margin || 0
      const marginFactor = 1 - margin / 100
      const completeFactor = baseTaxFactor * marginFactor

      let baseValue = 0
      if (p.mode === 'liquid') {
        baseValue = p.desiredNetRevenue || 0
      } else {
        baseValue = p.cost || 0
      }

      const salePrice = completeFactor > 0 ? baseValue / completeFactor : 0
      const roundedPrice = Math.round(salePrice * 100) / 100
      const qty = p.quantity || 0
      const totalRev = roundedPrice * qty
      const totalCost = (p.cost || 0) * qty

      return {
        ...p,
        salePrice: roundedPrice,
        taxFactor: baseTaxFactor,
        completeFactor,
        totalRevenue: Math.round(totalRev * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
      }
    })

    setMarkupProducts(updatedProducts)

    // Totais consolidados
    const consolidatedRevenue = updatedProducts.reduce((acc, p) => acc + (p.totalRevenue || 0), 0)
    const consolidatedQty = updatedProducts.reduce((acc, p) => acc + (p.quantity || 0), 0)
    const consolidatedCost = updatedProducts.reduce((acc, p) => acc + (p.totalCost || 0), 0)

    setTotalConsolidatedRevenue(Math.round(consolidatedRevenue * 100) / 100)
    setTotalConsolidatedQuantity(consolidatedQty)
    setTotalConsolidatedCost(Math.round(consolidatedCost * 100) / 100)

    // Se houver pelo menos 1 produto, sincronizar também com os campos legados para retrocompatibilidade
    const firstProduct = updatedProducts[0]
    const legacyCompleteFactor = firstProduct
      ? firstProduct.completeFactor
      : baseTaxFactor * (1 - (additionalMargin || 0) / 100)
    const legacySalePrice = firstProduct ? firstProduct.salePrice : 0

    setSimulatedTaxFactorTotal(baseTaxFactor)
    setSimulatedCompleteFactor(legacyCompleteFactor)
    setSimulatedSalePrice(legacySalePrice)
    setIsMarkupSimulated(true)
  }

  const simulatePresumido = () => {
    setIsPresumidoSimulated(true)
  }

  const simulateReal = () => {
    setIsRealSimulated(true)
  }

  const simulateSimples = () => {
    setIsSimplesSimulated(true)
  }

  const resetAll = () => {
    setRegime('presumido')
    setMarkupMode('liquid')
    setDesiredNetRevenue(0)
    setAdditionalMargin(0)
    setIcmsRateMarkup(0)
    setCustomTaxesMarkup([])
    setMarkupProducts([
      {
        id: 'prod-1',
        name: 'Produto 1',
        mode: 'liquid',
        desiredNetRevenue: 0,
        cost: 0,
        margin: 0,
        quantity: 0,
        salePrice: 0,
        taxFactor: 0,
        completeFactor: 0,
        totalRevenue: 0,
        totalCost: 0,
      },
    ])
    setSimulatedSalePrice(0)
    setSimulatedTaxFactorTotal(0)
    setSimulatedCompleteFactor(0)
    setIsMarkupSimulated(false)
    setTotalConsolidatedRevenue(0)
    setTotalConsolidatedQuantity(0)
    setTotalConsolidatedCost(0)

    setInitialInventory(0)
    setFinalInventory(0)
    setAdditionalCosts([
      { id: '1', description: 'Compras brutas', value: 0 },
      { id: '2', description: 'Frete e seguro s/ compras', value: 0 },
    ])
    setNonRecoverableTaxBase(0)
    setNonRecoverableTaxRate(0)
    setDeductionCosts([{ id: '1', description: 'Devoluções / abatimentos / descontos', value: 0 }])
    setIcmsPurchasesBase(0)
    setIcmsPurchasesRate(0)
    setIcmsFreightPurchasesBase(0)
    setIcmsFreightPurchasesRate(0)
    setPisPurchasesBase(0)
    setPisExcludedIcmsManual(null)
    setCofinsPurchasesBase(0)
    setCofinsExcludedIcmsManual(null)
    setPisFreightPurchasesBase(0)
    setCofinsFreightPurchasesBase(0)

    setPresumidoActivity('comercio')
    setPresumidoIssRate(0)
    setPresumidoQuantitySold(0)
    setPresumidoExpenses([
      { id: '1', description: 'Despesas com pessoal', value: 0 },
      { id: '2', description: 'Aluguel e utilidades', value: 0 },
    ])
    setIsPresumidoSimulated(false)

    setRealActivity('comercio')
    setRealIssRate(0)
    setRealAdditions(0)
    setRealExclusions(0)
    setRealQuantitySold(0)
    setRealExpenses([{ id: '1', description: 'Despesas operacionais e administrativas', value: 0 }])
    setIsRealSimulated(false)

    setSimplesAnexo('anexo_1')
    setSimplesRbt12(0)
    setSimplesPayroll12m(0)
    setSimplesQuantitySold(0)
    setSimplesExpenses([
      { id: '1', description: 'Despesas com pessoal e encargos', value: 0 },
      { id: '2', description: 'Aluguel e custos operacionais', value: 0 },
    ])
    setIsSimplesSimulated(false)

    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } catch {
      // Ignora
    }
  }

  // Obter snapshot completo do estado atual para salvar no banco
  const getSnapshot = (): TaxStateSnapshot => {
    return {
      regime,
      markupMode,
      desiredNetRevenue,
      additionalMargin,
      icmsRateMarkup,
      customTaxesMarkup,
      markupProducts,
      simulatedSalePrice,
      simulatedTaxFactorTotal,
      simulatedCompleteFactor,
      isMarkupSimulated,
      totalConsolidatedRevenue,
      totalConsolidatedQuantity,
      totalConsolidatedCost,
      initialInventory,
      finalInventory,
      additionalCosts,
      nonRecoverableTaxBase,
      nonRecoverableTaxRate,
      deductionCosts,
      icmsPurchasesBase,
      icmsPurchasesRate,
      icmsFreightPurchasesBase,
      icmsFreightPurchasesRate,
      pisPurchasesBase,
      pisExcludedIcmsManual,
      cofinsPurchasesBase,
      cofinsExcludedIcmsManual,
      pisFreightPurchasesBase,
      cofinsFreightPurchasesBase,
      presumidoActivity,
      presumidoIssRate,
      presumidoQuantitySold,
      presumidoExpenses,
      isPresumidoSimulated,
      realActivity,
      realIssRate,
      realAdditions,
      realExclusions,
      realQuantitySold,
      realExpenses,
      isRealSimulated,
      simplesAnexo,
      simplesRbt12,
      simplesPayroll12m,
      simplesQuantitySold,
      simplesExpenses,
      isSimplesSimulated,
    }
  }

  // Carregar snapshot vindo do banco e sobrescrever todos os campos
  const loadSnapshot = (snapshot: TaxStateSnapshot) => {
    if (!snapshot) return

    if (snapshot.regime) setRegime(snapshot.regime)
    if (snapshot.markupMode) setMarkupMode(snapshot.markupMode)
    setDesiredNetRevenue(snapshot.desiredNetRevenue ?? 0)
    setAdditionalMargin(snapshot.additionalMargin ?? 0)
    setIcmsRateMarkup(snapshot.icmsRateMarkup ?? 0)
    setCustomTaxesMarkup(
      Array.isArray(snapshot.customTaxesMarkup) ? snapshot.customTaxesMarkup : [],
    )

    if (Array.isArray(snapshot.markupProducts) && snapshot.markupProducts.length > 0) {
      setMarkupProducts(snapshot.markupProducts)
    } else {
      setMarkupProducts([
        {
          id: 'prod-1',
          name: 'Produto 1',
          mode: snapshot.markupMode || 'liquid',
          desiredNetRevenue: snapshot.desiredNetRevenue || 0,
          cost: snapshot.markupMode === 'cost_margin' ? snapshot.desiredNetRevenue || 0 : 0,
          margin: snapshot.additionalMargin || 0,
          quantity: 0,
          salePrice: snapshot.simulatedSalePrice || 0,
          taxFactor: snapshot.simulatedTaxFactorTotal || 0,
          completeFactor: snapshot.simulatedCompleteFactor || 0,
          totalRevenue: 0,
          totalCost: 0,
        },
      ])
    }

    setSimulatedSalePrice(snapshot.simulatedSalePrice ?? 0)
    setSimulatedTaxFactorTotal(snapshot.simulatedTaxFactorTotal ?? 0)
    setSimulatedCompleteFactor(snapshot.simulatedCompleteFactor ?? 0)
    setIsMarkupSimulated(Boolean(snapshot.isMarkupSimulated))
    setTotalConsolidatedRevenue(snapshot.totalConsolidatedRevenue ?? 0)
    setTotalConsolidatedQuantity(snapshot.totalConsolidatedQuantity ?? 0)
    setTotalConsolidatedCost(snapshot.totalConsolidatedCost ?? 0)

    setInitialInventory(snapshot.initialInventory ?? 0)
    setFinalInventory(snapshot.finalInventory ?? 0)
    setAdditionalCosts(
      Array.isArray(snapshot.additionalCosts) && snapshot.additionalCosts.length > 0
        ? snapshot.additionalCosts
        : [
            { id: '1', description: 'Compras brutas', value: 0 },
            { id: '2', description: 'Frete e seguro s/ compras', value: 0 },
          ],
    )
    setNonRecoverableTaxBase(snapshot.nonRecoverableTaxBase ?? 0)
    setNonRecoverableTaxRate(snapshot.nonRecoverableTaxRate ?? 0)
    setDeductionCosts(
      Array.isArray(snapshot.deductionCosts) && snapshot.deductionCosts.length > 0
        ? snapshot.deductionCosts
        : [{ id: '1', description: 'Devoluções / abatimentos / descontos', value: 0 }],
    )

    setIcmsPurchasesBase(snapshot.icmsPurchasesBase ?? 0)
    setIcmsPurchasesRate(snapshot.icmsPurchasesRate ?? 0)
    setIcmsFreightPurchasesBase(snapshot.icmsFreightPurchasesBase ?? 0)
    setIcmsFreightPurchasesRate(snapshot.icmsFreightPurchasesRate ?? 0)

    setPisPurchasesBase(snapshot.pisPurchasesBase ?? 0)
    setPisExcludedIcmsManual(
      snapshot.pisExcludedIcmsManual !== undefined ? snapshot.pisExcludedIcmsManual : null,
    )
    setCofinsPurchasesBase(snapshot.cofinsPurchasesBase ?? 0)
    setCofinsExcludedIcmsManual(
      snapshot.cofinsExcludedIcmsManual !== undefined ? snapshot.cofinsExcludedIcmsManual : null,
    )
    setPisFreightPurchasesBase(snapshot.pisFreightPurchasesBase ?? 0)
    setCofinsFreightPurchasesBase(snapshot.cofinsFreightPurchasesBase ?? 0)

    if (snapshot.presumidoActivity) setPresumidoActivity(snapshot.presumidoActivity)
    setPresumidoIssRate(snapshot.presumidoIssRate ?? 0)
    setPresumidoQuantitySold(snapshot.presumidoQuantitySold ?? 0)
    setPresumidoExpenses(
      Array.isArray(snapshot.presumidoExpenses) && snapshot.presumidoExpenses.length > 0
        ? snapshot.presumidoExpenses
        : [
            { id: '1', description: 'Despesas com pessoal', value: 0 },
            { id: '2', description: 'Aluguel e utilidades', value: 0 },
          ],
    )
    setIsPresumidoSimulated(Boolean(snapshot.isPresumidoSimulated))

    if (snapshot.realActivity) setRealActivity(snapshot.realActivity)
    setRealIssRate(snapshot.realIssRate ?? 0)
    setRealAdditions(snapshot.realAdditions ?? 0)
    setRealExclusions(snapshot.realExclusions ?? 0)
    setRealQuantitySold(snapshot.realQuantitySold ?? 0)
    setRealExpenses(
      Array.isArray(snapshot.realExpenses) && snapshot.realExpenses.length > 0
        ? snapshot.realExpenses
        : [{ id: '1', description: 'Despesas operacionais e administrativas', value: 0 }],
    )
    setIsRealSimulated(Boolean(snapshot.isRealSimulated))

    if (snapshot.simplesAnexo) setSimplesAnexo(snapshot.simplesAnexo)
    setSimplesRbt12(snapshot.simplesRbt12 ?? 0)
    setSimplesPayroll12m(snapshot.simplesPayroll12m ?? 0)
    setSimplesQuantitySold(snapshot.simplesQuantitySold ?? 0)
    setSimplesExpenses(
      Array.isArray(snapshot.simplesExpenses) && snapshot.simplesExpenses.length > 0
        ? snapshot.simplesExpenses
        : [
            { id: '1', description: 'Despesas com pessoal e encargos', value: 0 },
            { id: '2', description: 'Aluguel e custos operacionais', value: 0 },
          ],
    )
    setIsSimplesSimulated(Boolean(snapshot.isSimplesSimulated))

    // Atualiza também imediatamente o localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // Ignora erro de cota
    }
  }

  return (
    <TaxContext.Provider
      value={{
        regime,
        setRegime,
        markupMode,
        setMarkupMode,
        desiredNetRevenue,
        setDesiredNetRevenue,
        additionalMargin,
        setAdditionalMargin,
        icmsRateMarkup,
        setIcmsRateMarkup,
        customTaxesMarkup,
        addCustomTaxMarkup,
        removeCustomTaxMarkup,
        markupProducts,
        addMarkupProduct,
        updateMarkupProduct,
        removeMarkupProduct,
        simulatedSalePrice,
        simulatedTaxFactorTotal,
        simulatedCompleteFactor,
        isMarkupSimulated,
        simulateMarkup,
        totalConsolidatedRevenue,
        totalConsolidatedQuantity,
        totalConsolidatedCost,

        initialInventory,
        setInitialInventory,
        finalInventory,
        setFinalInventory,
        additionalCosts,
        addAdditionalCost,
        updateAdditionalCost,
        removeAdditionalCost,
        nonRecoverableTaxBase,
        setNonRecoverableTaxBase,
        nonRecoverableTaxRate,
        setNonRecoverableTaxRate,
        deductionCosts,
        addDeductionCost,
        updateDeductionCost,
        removeDeductionCost,
        icmsPurchasesBase,
        setIcmsPurchasesBase,
        icmsPurchasesRate,
        setIcmsPurchasesRate,
        icmsFreightPurchasesBase,
        setIcmsFreightPurchasesBase,
        icmsFreightPurchasesRate,
        setIcmsFreightPurchasesRate,
        pisPurchasesBase,
        setPisPurchasesBase,
        pisExcludedIcmsManual,
        setPisExcludedIcmsManual,
        cofinsPurchasesBase,
        setCofinsPurchasesBase,
        cofinsExcludedIcmsManual,
        setCofinsExcludedIcmsManual,
        pisFreightPurchasesBase,
        setPisFreightPurchasesBase,
        cofinsFreightPurchasesBase,
        setCofinsFreightPurchasesBase,

        presumidoActivity,
        setPresumidoActivity,
        presumidoIssRate,
        setPresumidoIssRate,
        presumidoQuantitySold,
        setPresumidoQuantitySold,
        presumidoExpenses,
        addPresumidoExpense,
        updatePresumidoExpense,
        removePresumidoExpense,
        isPresumidoSimulated,
        simulatePresumido,

        realActivity,
        setRealActivity,
        realIssRate,
        setRealIssRate,
        realAdditions,
        setRealAdditions,
        realExclusions,
        setRealExclusions,
        realQuantitySold,
        setRealQuantitySold,
        realExpenses,
        addRealExpense,
        updateRealExpense,
        removeRealExpense,
        isRealSimulated,
        simulateReal,

        simplesAnexo,
        setSimplesAnexo,
        simplesRbt12,
        setSimplesRbt12,
        simplesPayroll12m,
        setSimplesPayroll12m,
        simplesQuantitySold,
        setSimplesQuantitySold,
        simplesExpenses,
        addSimplesExpense,
        updateSimplesExpense,
        removeSimplesExpense,
        isSimplesSimulated,
        simulateSimples,

        getSnapshot,
        loadSnapshot,

        calculatedPurchases: {
          totalAdditionalCosts,
          nonRecoverableTaxResult,
          totalAdditions,
          totalDeductionsBase,
          icmsResult,
          icmsFreightResult,
          effectiveIcmsToExclude,
          pisAdjustedBase,
          pisResult,
          cofinsAdjustedBase,
          cofinsResult,
          pisFreightResult,
          cofinsFreightResult,
          cmvPresumidoNetPurchases,
          cmvPresumido,
          cmvRealNetPurchases,
          cmvReal,
          cmvSimplesNetPurchases,
          cmvSimples,
        },

        resetAll,
      }}
    >
      {children}
    </TaxContext.Provider>
  )
}

export function useTaxContext() {
  const context = useContext(TaxContext)
  if (!context) {
    throw new Error('useTaxContext must be used within a TaxProvider')
  }
  return context
}
