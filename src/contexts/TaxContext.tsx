import React, { createContext, useContext, useState, useEffect } from 'react'
import { parseBRNumber } from '@/lib/taxCalculations'

export type TaxRegime = 'presumido' | 'real'
export type ActivityType = 'comercio' | 'industria' | 'servicos'
export type MarkupMode = 'liquid' | 'cost_margin'

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

export interface TaxContextType {
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
  // Markup calculado (atualizado apenas ao clicar em "Simular")
  simulatedSalePrice: number
  simulatedTaxFactorTotal: number
  simulatedCompleteFactor: number
  isMarkupSimulated: boolean
  simulateMarkup: () => void

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
        simulatedSalePrice,
        simulatedTaxFactorTotal,
        simulatedCompleteFactor,
        isMarkupSimulated,
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
        presumidoQuantitySold,
        presumidoExpenses,
        isPresumidoSimulated,
        realAdditions,
        realExclusions,
        realQuantitySold,
        realExpenses,
        isRealSimulated,
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
    simulatedSalePrice,
    simulatedTaxFactorTotal,
    simulatedCompleteFactor,
    isMarkupSimulated,
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
    presumidoQuantitySold,
    presumidoExpenses,
    isPresumidoSimulated,
    realAdditions,
    realExclusions,
    realQuantitySold,
    realExpenses,
    isRealSimulated,
  ])

  // Handlers para itens dinâmicos
  const addCustomTaxMarkup = (name: string, rate: number) => {
    setCustomTaxesMarkup((prev) => [...prev, { id: String(Date.now()), name, rate }])
  }

  const removeCustomTaxMarkup = (id: string) => {
    setCustomTaxesMarkup((prev) => prev.filter((t) => t.id !== id))
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

  // SIMULAÇÃO DO MARKUP
  const simulateMarkup = () => {
    // Alíquotas conforme regime
    const pisRate = regime === 'presumido' ? 0.0065 : 0.0165
    const cofinsRate = regime === 'presumido' ? 0.03 : 0.076
    const icmsFactor = 1 - (icmsRateMarkup || 0) / 100
    const pisFactor = 1 - pisRate
    const cofinsFactor = 1 - cofinsRate

    let taxFactor = icmsFactor * pisFactor * cofinsFactor

    // Tributos customizados
    for (const tax of customTaxesMarkup) {
      taxFactor *= 1 - (tax.rate || 0) / 100
    }

    // Fator de margem (se houver margem adicional)
    const marginFactor = 1 - (additionalMargin || 0) / 100
    const completeFactor = taxFactor * marginFactor

    let salePrice = 0
    if (markupMode === 'liquid') {
      salePrice = completeFactor > 0 ? desiredNetRevenue / completeFactor : 0
    } else {
      // A partir do custo + margem:
      // se desiredNetRevenue for interpretado como custo base
      // preço = custo / (1 - margem - tributos) ou custo / completeFactor
      salePrice = completeFactor > 0 ? desiredNetRevenue / completeFactor : 0
    }

    setSimulatedTaxFactorTotal(taxFactor)
    setSimulatedCompleteFactor(completeFactor)
    setSimulatedSalePrice(Math.round(salePrice * 100) / 100)
    setIsMarkupSimulated(true)
  }

  const simulatePresumido = () => {
    setIsPresumidoSimulated(true)
  }

  const simulateReal = () => {
    setIsRealSimulated(true)
  }

  const resetAll = () => {
    setRegime('presumido')
    setMarkupMode('liquid')
    setDesiredNetRevenue(0)
    setAdditionalMargin(0)
    setIcmsRateMarkup(0)
    setCustomTaxesMarkup([])
    setSimulatedSalePrice(0)
    setSimulatedTaxFactorTotal(0)
    setSimulatedCompleteFactor(0)
    setIsMarkupSimulated(false)

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
    setPresumidoQuantitySold(0)
    setPresumidoExpenses([
      { id: '1', description: 'Despesas com pessoal', value: 0 },
      { id: '2', description: 'Aluguel e utilidades', value: 0 },
    ])
    setIsPresumidoSimulated(false)

    setRealAdditions(0)
    setRealExclusions(0)
    setRealQuantitySold(0)
    setRealExpenses([{ id: '1', description: 'Despesas operacionais e administrativas', value: 0 }])
    setIsRealSimulated(false)

    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } catch {
      // Ignora
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
        simulatedSalePrice,
        simulatedTaxFactorTotal,
        simulatedCompleteFactor,
        isMarkupSimulated,
        simulateMarkup,

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
        presumidoQuantitySold,
        setPresumidoQuantitySold,
        presumidoExpenses,
        addPresumidoExpense,
        updatePresumidoExpense,
        removePresumidoExpense,
        isPresumidoSimulated,
        simulatePresumido,

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
