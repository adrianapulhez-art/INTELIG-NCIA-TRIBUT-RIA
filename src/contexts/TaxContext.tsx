import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { parseBRNumber } from '@/lib/taxCalculations'
import {
  StSubsystemState,
  INITIAL_ST_SUBSYSTEM,
  InterstateSubsystemState,
  INITIAL_INTERSTATE_SUBSYSTEM,
} from '@/lib/specialOperationsCalculations'
import { ReformaState, ReformaYear, INITIAL_REFORMA_STATE } from '@/lib/reformaCalculations'

export type TaxRegime = 'presumido' | 'real' | 'simples'
export type ActivityType = 'comercio' | 'industria' | 'servicos'
export type MarkupMode = 'liquid' | 'cost_margin'

export interface CostCompositionItem {
  id: string
  description: string
  value: number
}

export interface CostComposition {
  directCosts: CostCompositionItem[] // Custos diretos (ex: matéria-prima, mercadoria, embalagem, frete de aquisição)
  indirectCosts: CostCompositionItem[] // Custos indiretos (ex: aluguel rateado, energia, telefone, software)
  fixedCosts: CostCompositionItem[] // Custos fixos (ex: folha, contador, pró-labore, encargos)
}

export interface MarkupProductItem {
  id: string
  name: string
  mode: MarkupMode // 'liquid' ou 'cost_margin'
  desiredNetRevenue: number // Receita líquida desejada (quando mode === 'liquid')
  cost: number // Custo base (quando mode === 'cost_margin')
  margin: number // Margem de lucro % (quando mode === 'cost_margin' ou margem adicional)
  quantity: number // Quantidade vendida
  // Subsistema de Composição do Custo (modo cost_margin)
  costComposition?: CostComposition
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

export interface PurchaseItem {
  id: string
  name: string
  quantity: number // Quantidade comprada do item
  unitPrice: number // Valor unitário da mercadoria (opcional / informativo)
  merchandiseValue: number // Valor total da mercadoria do item (base de cálculo)
  // Frete do item e ICMS s/ frete
  freightValue?: number // Valor do frete atribuível ao item (R$)
  icmsFreightRate?: number // Alíquota % do ICMS sobre o frete do item
  // Alíquotas e tributos por item
  ipiRate: number // Alíquota % IPI / Tributos não recuperáveis
  icmsRate: number // Alíquota % ICMS próprio
  icmsFreightValue: number // ICMS sobre frete calculado (freightValue * icmsFreightRate / 100) ou valor legado
  hasSt: boolean // Se o item possui incidência de ICMS-ST
  stValue: number // ICMS-ST recolhido na entrada do item (integra custo)
  // Resultados calculados por item
  calculatedIpi: number
  calculatedIcms: number
  calculatedPis: number
  calculatedCofins: number
  // Custo unitário e total por regime para este item:
  costPresumido: number // mercadoria + frete + ipi + st - icms - icmsFreightValue
  costReal: number // mercadoria + frete + ipi + st - icms - icmsFreightValue - pis - cofins
  costSimples: number // mercadoria + frete + ipi + st (sem créditos)
  unitCostPresumido: number
  unitCostReal: number
  unitCostSimples: number
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

export type LalurEntryType = 'addition' | 'exclusion'

export interface LalurEntryItem {
  id: string
  description: string
  value: number
  type: LalurEntryType
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
  totalConsolidatedQuantity: number // Σ quantidade Markup
  totalConsolidatedCost: number
  // COMPRAS
  purchasesItems?: PurchaseItem[]
  totalPurchasesQuantity?: number // Σ quantidade Compras
  initialInventory: number
  finalInventory: number
  autoInventoryDeduction?: boolean // Baixa automática de estoque por quantidade
  initialInventoryUnits?: number // Estoque inicial em unidades (opcional)
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
  realLalurEntries?: LalurEntryItem[]
  realQuantitySold: number
  realExpenses: ExpenseItem[]
  isRealSimulated: boolean
  simplesAnexo: string
  simplesRbt12: number
  simplesPayroll12m: number
  simplesQuantitySold: number
  simplesExpenses: ExpenseItem[]
  isSimplesSimulated: boolean
  // Empresa em início de atividade (LC 123/2006, art. 3º, § 9º)
  simplesIsInicioAtividade?: boolean
  simplesMonthlyRevenues?: number[]
  // Folha de Salários e Pró-labore
  payrollSalaries: number
  payrollProLabore: number
  payrollInssRate: number
  payrollRatRate: number
  payrollTerceirosRate: number
  // Subsistemas Especializados (Opt-in)
  stSubsystem?: StSubsystemState
  interstateSubsystem?: InterstateSubsystemState
  // Subsistema Reforma Tributária — IBS/CBS (EC 132/23 e LC 214/25)
  reformaState?: ReformaState
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
    value: string | number | MarkupMode | CostComposition,
  ) => void
  removeMarkupProduct: (id: string) => void
  // Composição de custos no produto
  addCostCompositionItem: (
    productId: string,
    category: 'directCosts' | 'indirectCosts' | 'fixedCosts',
    description?: string,
    value?: number,
  ) => void
  updateCostCompositionItem: (
    productId: string,
    category: 'directCosts' | 'indirectCosts' | 'fixedCosts',
    itemId: string,
    field: 'description' | 'value',
    val: string | number,
  ) => void
  removeCostCompositionItem: (
    productId: string,
    category: 'directCosts' | 'indirectCosts' | 'fixedCosts',
    itemId: string,
  ) => void
  clearCostComposition: (productId: string) => void
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

  // COMPRAS STATE (multi-itens + parâmetros globais)
  purchasesItems: PurchaseItem[]
  addPurchaseItem: (name?: string) => void
  updatePurchaseItem: (
    id: string,
    field: keyof Omit<
      PurchaseItem,
      | 'id'
      | 'calculatedIpi'
      | 'calculatedIcms'
      | 'calculatedPis'
      | 'calculatedCofins'
      | 'costPresumido'
      | 'costReal'
      | 'costSimples'
      | 'unitCostPresumido'
      | 'unitCostReal'
      | 'unitCostSimples'
    >,
    value: string | number | boolean,
  ) => void
  removePurchaseItem: (id: string) => void
  totalPurchasesQuantity: number // Σ quantidade dos itens de compras
  totalPurchasesMerchandise: number // Σ mercadorias dos itens
  isPurchasesCalculated: boolean // indica se há compras ativas simuladas/calculadas

  initialInventory: number // EI
  setInitialInventory: (val: number) => void
  finalInventory: number // EF
  setFinalInventory: (val: number) => void
  autoInventoryDeduction: boolean // Baixa automática de estoque por quantidade
  setAutoInventoryDeduction: (val: boolean) => void
  initialInventoryUnits: number // Estoque inicial em unidades
  setInitialInventoryUnits: (val: number) => void
  additionalCosts: AdditionalCostItem[] // Custos adicionais globais (frete rateado, seguro, outros)
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
  realLalurEntries: LalurEntryItem[]
  setRealLalurEntries: React.Dispatch<React.SetStateAction<LalurEntryItem[]>>
  addRealLalurEntry: (description?: string, value?: number, type?: LalurEntryType) => void
  updateRealLalurEntry: (
    id: string,
    field: 'description' | 'value' | 'type',
    value: string | number | LalurEntryType,
  ) => void
  removeRealLalurEntry: (id: string) => void
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
  simplesRbt12: number // Receita bruta acumulada 12 meses (manual ou efetiva quando início de atividade)
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

  // Empresa em início de atividade (LC 123/2006, art. 3º, § 9º)
  simplesIsInicioAtividade: boolean
  setSimplesIsInicioAtividade: (val: boolean) => void
  simplesMonthlyRevenues: number[]
  setSimplesMonthlyRevenues: React.Dispatch<React.SetStateAction<number[]>>
  addSimplesMonthlyRevenue: (val?: number) => void
  updateSimplesMonthlyRevenue: (index: number, val: number) => void
  removeSimplesMonthlyRevenue: (index: number) => void
  // RBT12 calculada proporcionalmente para início de atividade
  calculatedInicioAtividadeRbt12: number
  // RBT12 efetiva considerada no sistema (calculada se início de atividade, ou simplesRbt12 manual)
  effectiveSimplesRbt12: number

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
    // Campos da Baixa Automática de Estoque por Quantidade (toggle autoInventoryDeduction)
    autoInventoryDeductionActive: boolean
    totalAvailableUnits: number // Σ compras + estoque inicial em unidades
    totalSoldUnitsEffective: number // Quantidade vendida considerada
    isQuantityExceeded: boolean // se sold > available
    unitCostPresumidoEffective: number
    unitCostRealEffective: number
    unitCostSimplesEffective: number
    autoFinalInventoryPresumido: number
    autoFinalInventoryReal: number
    autoFinalInventorySimples: number
  }

  // FOLHA E PRÓ-LABORE STATE (Compartilhado entre as DREs e Comparação)
  payrollSalaries: number
  setPayrollSalaries: (val: number) => void
  payrollProLabore: number
  setPayrollProLabore: (val: number) => void
  payrollInssRate: number
  setPayrollInssRate: (val: number) => void
  payrollRatRate: number
  setPayrollRatRate: (val: number) => void
  payrollTerceirosRate: number
  setPayrollTerceirosRate: (val: number) => void

  // SUBSISTEMA 1: SUBSTITUIÇÃO TRIBUTÁRIA (ICMS-ST)
  stSubsystem: StSubsystemState
  setStSubsystem: React.Dispatch<React.SetStateAction<StSubsystemState>>
  updateStSubsystem: <K extends keyof StSubsystemState>(key: K, value: StSubsystemState[K]) => void

  // SUBSISTEMA 2: OPERAÇÕES INTERESTADUAIS (DIFAL)
  interstateSubsystem: InterstateSubsystemState
  setInterstateSubsystem: React.Dispatch<React.SetStateAction<InterstateSubsystemState>>
  updateInterstateSubsystem: <K extends keyof InterstateSubsystemState>(
    key: K,
    value: InterstateSubsystemState[K],
  ) => void

  // SUBSISTEMA 3: REFORMA TRIBUTÁRIA — IBS/CBS (EC 132/23)
  reformaState: ReformaState
  setReformaState: React.Dispatch<React.SetStateAction<ReformaState>>
  updateReformaState: <K extends keyof ReformaState>(key: K, value: ReformaState[K]) => void
  setSelectedReformaYear: (year: ReformaYear) => void

  // Limpar/Resetar tudo para zerado
  resetAll: () => void
}

const TaxContext = createContext<TaxContextType | undefined>(undefined)

export const TaxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // A aplicação SEMPRE inicia com todos os campos zerados e sem simulações ativas.
  // Nenhum rascunho persistido restaura valores automáticos ao carregar a página.
  // O carregamento de dados ocorre EXCLUSIVAMENTE quando o usuário clica em "Carregar"
  // em um cenário salvo no PocketBase (ScenarioManagerBar) ou digita manualmente.

  // REGIME
  const [regime, setRegime] = useState<TaxRegime>('presumido')

  // MARKUP
  const [markupMode, setMarkupMode] = useState<MarkupMode>('liquid')
  const [desiredNetRevenue, setDesiredNetRevenue] = useState<number>(0)
  const [additionalMargin, setAdditionalMargin] = useState<number>(0)
  const [icmsRateMarkup, setIcmsRateMarkup] = useState<number>(0)
  const [customTaxesMarkup, setCustomTaxesMarkup] = useState<CustomTaxItem[]>([])

  // Cria 1 produto padrão inicial estritamente zerado
  const [markupProducts, setMarkupProducts] = useState<MarkupProductItem[]>([
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

  const [simulatedSalePrice, setSimulatedSalePrice] = useState<number>(0)
  const [simulatedTaxFactorTotal, setSimulatedTaxFactorTotal] = useState<number>(0)
  const [simulatedCompleteFactor, setSimulatedCompleteFactor] = useState<number>(0)
  const [isMarkupSimulated, setIsMarkupSimulated] = useState<boolean>(false)
  const [totalConsolidatedRevenue, setTotalConsolidatedRevenue] = useState<number>(0)
  const [totalConsolidatedQuantity, setTotalConsolidatedQuantity] = useState<number>(0)
  const [totalConsolidatedCost, setTotalConsolidatedCost] = useState<number>(0)

  // COMPRAS (MULTI-ITENS)
  const [purchasesItems, setPurchasesItems] = useState<PurchaseItem[]>([
    {
      id: 'purch-1',
      name: 'Item 1',
      quantity: 0,
      unitPrice: 0,
      merchandiseValue: 0,
      freightValue: 0,
      icmsFreightRate: 0,
      ipiRate: 0,
      icmsRate: 0,
      icmsFreightValue: 0,
      hasSt: false,
      stValue: 0,
      calculatedIpi: 0,
      calculatedIcms: 0,
      calculatedPis: 0,
      calculatedCofins: 0,
      costPresumido: 0,
      costReal: 0,
      costSimples: 0,
      unitCostPresumido: 0,
      unitCostReal: 0,
      unitCostSimples: 0,
    },
  ])

  const [initialInventory, setInitialInventory] = useState<number>(0)
  const [finalInventory, setFinalInventory] = useState<number>(0)
  const [autoInventoryDeduction, setAutoInventoryDeduction] = useState<boolean>(false)
  const [initialInventoryUnits, setInitialInventoryUnits] = useState<number>(0)
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCostItem[]>([
    { id: '1', description: 'Frete e seguro s/ compras', value: 0 },
  ])
  const [nonRecoverableTaxBase, setNonRecoverableTaxBase] = useState<number>(0)
  const [nonRecoverableTaxRate, setNonRecoverableTaxRate] = useState<number>(0)

  const [deductionCosts, setDeductionCosts] = useState<DeductionCostItem[]>([
    { id: '1', description: 'Devoluções / abatimentos / descontos', value: 0 },
  ])

  const [icmsPurchasesBase, setIcmsPurchasesBase] = useState<number>(0)
  const [icmsPurchasesRate, setIcmsPurchasesRate] = useState<number>(0)

  const [icmsFreightPurchasesBase, setIcmsFreightPurchasesBase] = useState<number>(0)
  const [icmsFreightPurchasesRate, setIcmsFreightPurchasesRate] = useState<number>(0)

  const [pisPurchasesBase, setPisPurchasesBase] = useState<number>(0)
  const [pisExcludedIcmsManual, setPisExcludedIcmsManual] = useState<number | null>(null)

  const [cofinsPurchasesBase, setCofinsPurchasesBase] = useState<number>(0)
  const [cofinsExcludedIcmsManual, setCofinsExcludedIcmsManual] = useState<number | null>(null)

  const [pisFreightPurchasesBase, setPisFreightPurchasesBase] = useState<number>(0)
  const [cofinsFreightPurchasesBase, setCofinsFreightPurchasesBase] = useState<number>(0)

  // DRE PRESUMIDO
  const [presumidoActivity, setPresumidoActivity] = useState<ActivityType>('comercio')
  const [presumidoIssRate, setPresumidoIssRate] = useState<number>(0)
  const [presumidoQuantitySold, setPresumidoQuantitySold] = useState<number>(0)
  const [presumidoExpenses, setPresumidoExpenses] = useState<ExpenseItem[]>([
    { id: '1', description: 'Despesas com pessoal', value: 0 },
    { id: '2', description: 'Aluguel e utilidades', value: 0 },
  ])
  const [isPresumidoSimulated, setIsPresumidoSimulated] = useState<boolean>(false)

  // DRE REAL
  const [realActivity, setRealActivity] = useState<ActivityType>('comercio')
  const [realIssRate, setRealIssRate] = useState<number>(0)
  const [realQuantitySold, setRealQuantitySold] = useState<number>(0)
  const [realExpenses, setRealExpenses] = useState<ExpenseItem[]>([
    { id: '1', description: 'Despesas operacionais e administrativas', value: 0 },
  ])
  const [isRealSimulated, setIsRealSimulated] = useState<boolean>(false)

  // MINI-LALUR STATE: Lista estruturada de lançamentos individuais de Adições e Exclusões
  const [realLalurEntries, setRealLalurEntries] = useState<LalurEntryItem[]>([])

  // Totais calculados a partir dos lançamentos
  const computedRealAdditions = useMemo(() => {
    return realLalurEntries
      .filter((e) => e.type === 'addition')
      .reduce(
        (acc, curr) => acc + (Number.isFinite(curr.value) && curr.value > 0 ? curr.value : 0),
        0,
      )
  }, [realLalurEntries])

  const computedRealExclusions = useMemo(() => {
    return realLalurEntries
      .filter((e) => e.type === 'exclusion')
      .reduce(
        (acc, curr) => acc + (Number.isFinite(curr.value) && curr.value > 0 ? curr.value : 0),
        0,
      )
  }, [realLalurEntries])

  // Backward-compatibility: realAdditions e realExclusions expostos refletem a soma
  const realAdditions = computedRealAdditions
  const realExclusions = computedRealExclusions

  // Se setRealAdditions ou setRealExclusions forem invocados diretamente (ex.: testes ou chamadas legadas),
  // atualizamos o Mini-LALUR criando/atualizando o lançamento consolidado correspondente
  const setRealAdditions = (val: number) => {
    const cleanVal = Math.max(0, Number.isFinite(val) ? val : 0)
    setRealLalurEntries((prev) => {
      const nonAdditions = prev.filter((e) => e.type !== 'addition')
      if (cleanVal <= 0) return nonAdditions
      return [
        ...nonAdditions,
        {
          id: `add-entry-${Date.now()}`,
          description: 'Adições ao Lucro Real',
          value: cleanVal,
          type: 'addition' as LalurEntryType,
        },
      ]
    })
  }

  const setRealExclusions = (val: number) => {
    const cleanVal = Math.max(0, Number.isFinite(val) ? val : 0)
    setRealLalurEntries((prev) => {
      const nonExclusions = prev.filter((e) => e.type !== 'exclusion')
      if (cleanVal <= 0) return nonExclusions
      return [
        ...nonExclusions,
        {
          id: `ex-entry-${Date.now()}`,
          description: 'Exclusões do Lucro Real',
          value: cleanVal,
          type: 'exclusion' as LalurEntryType,
        },
      ]
    })
  }

  const addRealLalurEntry = (
    description = 'Novo lançamento LALUR',
    value = 0,
    type: LalurEntryType = 'addition',
  ) => {
    const cleanVal = Math.max(0, typeof value === 'number' && Number.isFinite(value) ? value : 0)
    setRealLalurEntries((prev) => [
      ...prev,
      {
        id: `lalur-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        description,
        value: cleanVal,
        type,
      },
    ])
  }

  const updateRealLalurEntry = (
    id: string,
    field: 'description' | 'value' | 'type',
    value: string | number | LalurEntryType,
  ) => {
    setRealLalurEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry
        if (field === 'type') {
          return { ...entry, type: value as LalurEntryType }
        }
        if (field === 'value') {
          const numVal =
            typeof value === 'number'
              ? Number.isFinite(value)
                ? Math.max(0, value)
                : 0
              : Math.max(0, parseBRNumber(String(value)))
          return { ...entry, value: numVal }
        }
        if (field === 'description') {
          return { ...entry, description: String(value) }
        }
        return entry
      }),
    )
  }

  const removeRealLalurEntry = (id: string) => {
    setRealLalurEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  // DRE SIMPLES NACIONAL
  const [simplesAnexo, setSimplesAnexo] = useState<string>('anexo_1')
  const [simplesRbt12, setSimplesRbt12] = useState<number>(0)
  const [simplesPayroll12m, setSimplesPayroll12m] = useState<number>(0)
  const [simplesQuantitySold, setSimplesQuantitySold] = useState<number>(0)
  const [simplesExpenses, setSimplesExpenses] = useState<ExpenseItem[]>([
    { id: '1', description: 'Despesas com pessoal e encargos', value: 0 },
    { id: '2', description: 'Aluguel e custos operacionais', value: 0 },
  ])
  const [isSimplesSimulated, setIsSimplesSimulated] = useState<boolean>(false)

  // Empresa em início de atividade (LC 123/2006, art. 3º, § 9º)
  const [simplesIsInicioAtividade, setSimplesIsInicioAtividade] = useState<boolean>(false)
  const [simplesMonthlyRevenues, setSimplesMonthlyRevenues] = useState<number[]>([0])

  // Cálculo proporcional da RBT12 em início de atividade:
  // - 1º mês: receita do mês * 12
  // - Meses seguintes: (soma das receitas dos meses decorridos / meses decorridos) * 12
  const calculatedInicioAtividadeRbt12 = React.useMemo(() => {
    const valid =
      simplesMonthlyRevenues && simplesMonthlyRevenues.length > 0 ? simplesMonthlyRevenues : [0]
    const count = valid.length
    if (count <= 1) {
      return (valid[0] || 0) * 12
    }
    const sum = valid.reduce((acc, curr) => acc + (curr || 0), 0)
    return count > 0 ? (sum / count) * 12 : 0
  }, [simplesMonthlyRevenues])

  // RBT12 efetiva: se toggle de início de atividade ativo, usa o proporcional calculado; senão a digitada
  const effectiveSimplesRbt12 = simplesIsInicioAtividade
    ? calculatedInicioAtividadeRbt12
    : simplesRbt12

  const addSimplesMonthlyRevenue = (val = 0) => {
    setSimplesMonthlyRevenues((prev) => [...prev, Math.max(0, val)])
  }

  const updateSimplesMonthlyRevenue = (index: number, val: number) => {
    setSimplesMonthlyRevenues((prev) =>
      prev.map((item, i) => (i === index ? Math.max(0, val) : item)),
    )
  }

  const removeSimplesMonthlyRevenue = (index: number) => {
    setSimplesMonthlyRevenues((prev) => {
      if (prev.length <= 1) {
        return [0]
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  // FOLHA E PRÓ-LABORE (Iniciados ZERADOS nos valores monetários; alíquotas com padrão legal e editáveis)
  const [payrollSalaries, setPayrollSalaries] = useState<number>(0)
  const [payrollProLabore, setPayrollProLabore] = useState<number>(0)
  const [payrollInssRate, setPayrollInssRate] = useState<number>(20.0)
  const [payrollRatRate, setPayrollRatRate] = useState<number>(3.0)
  const [payrollTerceirosRate, setPayrollTerceirosRate] = useState<number>(5.8)

  // SUBSISTEMA 1: SUBSTITUIÇÃO TRIBUTÁRIA (ICMS-ST)
  const [stSubsystem, setStSubsystem] = useState<StSubsystemState>(INITIAL_ST_SUBSYSTEM)
  const updateStSubsystem = <K extends keyof StSubsystemState>(
    key: K,
    value: StSubsystemState[K],
  ) => {
    setStSubsystem((prev) => ({ ...prev, [key]: value }))
  }

  // SUBSISTEMA 2: OPERAÇÕES INTERESTADUAIS (DIFAL)
  const [interstateSubsystem, setInterstateSubsystem] = useState<InterstateSubsystemState>(
    INITIAL_INTERSTATE_SUBSYSTEM,
  )
  const updateInterstateSubsystem = <K extends keyof InterstateSubsystemState>(
    key: K,
    value: InterstateSubsystemState[K],
  ) => {
    setInterstateSubsystem((prev) => ({ ...prev, [key]: value }))
  }

  // SUBSISTEMA 3: REFORMA TRIBUTÁRIA — IBS/CBS (EC 132/23 e LC 214/25)
  const [reformaState, setReformaState] = useState<ReformaState>(INITIAL_REFORMA_STATE)
  const updateReformaState = <K extends keyof ReformaState>(key: K, value: ReformaState[K]) => {
    setReformaState((prev) => ({ ...prev, [key]: value }))
  }
  const setSelectedReformaYear = (year: ReformaYear) => {
    setReformaState((prev) => ({ ...prev, selectedYear: year }))
  }

  // Limpeza preventiva de rascunhos de versões legadas / antigas no localStorage e sessionStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const legacyKeys = [
          'it_tax_context_v1',
          'it_tax_context_v2',
          'it_tax_context_v3',
          'tax_context_draft',
          'tax_draft',
          'it_tax_state',
          'it_tax_draft',
          'scenario_draft',
          'active_scenario_id',
          'last_scenario_id',
        ]
        legacyKeys.forEach((k) => {
          try {
            localStorage.removeItem(k)
            sessionStorage.removeItem(k)
          } catch {
            // Ignora erro por chave
          }
        })

        // Limpa quaisquer chaves que comecem com tax_ ou it_tax_ exceto as de auth
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i)
            if (
              key &&
              (key.startsWith('it_tax') ||
                key.startsWith('tax_state') ||
                key.startsWith('tax_draft'))
            ) {
              localStorage.removeItem(key)
            }
          }
          for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i)
            if (
              key &&
              (key.startsWith('it_tax') ||
                key.startsWith('tax_state') ||
                key.startsWith('tax_draft'))
            ) {
              sessionStorage.removeItem(key)
            }
          }
        } catch {
          // Ignora
        }
      }
    } catch {
      // Ignora erro de acesso ao localStorage
    }
  }, [])

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
        costComposition: {
          directCosts: [],
          indirectCosts: [],
          fixedCosts: [],
        },
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
    value: string | number | MarkupMode | CostComposition,
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
        if (field === 'costComposition') {
          return { ...item, costComposition: value as CostComposition }
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

  // Helper para recalcular o custo base automaticamente a partir da composição se houver itens com valor
  const calculateTotalComposition = (composition?: CostComposition): number => {
    if (!composition) return 0
    const sumDirect = (composition.directCosts || []).reduce((acc, c) => {
      const v = typeof c.value === 'number' && Number.isFinite(c.value) ? c.value : 0
      return acc + Math.max(0, v)
    }, 0)
    const sumIndirect = (composition.indirectCosts || []).reduce((acc, c) => {
      const v = typeof c.value === 'number' && Number.isFinite(c.value) ? c.value : 0
      return acc + Math.max(0, v)
    }, 0)
    const sumFixed = (composition.fixedCosts || []).reduce((acc, c) => {
      const v = typeof c.value === 'number' && Number.isFinite(c.value) ? c.value : 0
      return acc + Math.max(0, v)
    }, 0)
    const total = sumDirect + sumIndirect + sumFixed
    return Number.isFinite(total) ? Math.round(total * 100) / 100 : 0
  }

  const addCostCompositionItem = (
    productId: string,
    category: 'directCosts' | 'indirectCosts' | 'fixedCosts',
    description = '',
    value = 0,
  ) => {
    setMarkupProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== productId) return prod
        const currentComp = prod.costComposition || {
          directCosts: [],
          indirectCosts: [],
          fixedCosts: [],
        }
        const cleanVal =
          typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
        const updatedCat = [
          ...(currentComp[category] || []),
          {
            id: `cost-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            description,
            value: cleanVal,
          },
        ]
        const updatedComp: CostComposition = {
          ...currentComp,
          [category]: updatedCat,
        }
        const compTotal = calculateTotalComposition(updatedComp)
        return {
          ...prod,
          costComposition: updatedComp,
          // Com composição com itens, cost é derivado da soma
          cost: compTotal > 0 ? compTotal : prod.cost,
        }
      }),
    )
  }

  const updateCostCompositionItem = (
    productId: string,
    category: 'directCosts' | 'indirectCosts' | 'fixedCosts',
    itemId: string,
    field: 'description' | 'value',
    val: string | number,
  ) => {
    setMarkupProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== productId) return prod
        const currentComp = prod.costComposition || {
          directCosts: [],
          indirectCosts: [],
          fixedCosts: [],
        }
        const updatedCat = (currentComp[category] || []).map((item) => {
          if (item.id !== itemId) return item
          const parsedVal =
            field === 'value'
              ? Math.max(
                  0,
                  typeof val === 'number' ? (Number.isFinite(val) ? val : 0) : parseBRNumber(val),
                )
              : val
          return {
            ...item,
            [field]: parsedVal,
          }
        })
        const updatedComp: CostComposition = {
          ...currentComp,
          [category]: updatedCat,
        }
        const compTotal = calculateTotalComposition(updatedComp)
        const hasAnyCompositionItem =
          (updatedComp.directCosts?.length || 0) > 0 ||
          (updatedComp.indirectCosts?.length || 0) > 0 ||
          (updatedComp.fixedCosts?.length || 0) > 0
        return {
          ...prod,
          costComposition: updatedComp,
          // Com itens na composição, cost é derivado da soma; se zerada ou sem itens, mantém
          cost: hasAnyCompositionItem ? compTotal : prod.cost,
        }
      }),
    )
  }

  const removeCostCompositionItem = (
    productId: string,
    category: 'directCosts' | 'indirectCosts' | 'fixedCosts',
    itemId: string,
  ) => {
    setMarkupProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== productId) return prod
        const currentComp = prod.costComposition || {
          directCosts: [],
          indirectCosts: [],
          fixedCosts: [],
        }
        const updatedCat = (currentComp[category] || []).filter((item) => item.id !== itemId)
        const updatedComp: CostComposition = {
          ...currentComp,
          [category]: updatedCat,
        }
        const compTotal = calculateTotalComposition(updatedComp)
        const hasAnyCompositionItem =
          (updatedComp.directCosts?.length || 0) > 0 ||
          (updatedComp.indirectCosts?.length || 0) > 0 ||
          (updatedComp.fixedCosts?.length || 0) > 0
        return {
          ...prod,
          costComposition: updatedComp,
          cost: hasAnyCompositionItem ? compTotal : prod.cost,
        }
      }),
    )
  }

  const clearCostComposition = (productId: string) => {
    setMarkupProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== productId) return prod
        return {
          ...prod,
          costComposition: {
            directCosts: [],
            indirectCosts: [],
            fixedCosts: [],
          },
          cost: 0,
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
            costComposition: {
              directCosts: [],
              indirectCosts: [],
              fixedCosts: [],
            },
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

  // Handlers para itens de compras
  const addPurchaseItem = (name?: string) => {
    setPurchasesItems((prev) => {
      const nextNum = prev.length + 1
      const newItem: PurchaseItem = {
        id: `purch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name || `Item ${nextNum}`,
        quantity: 0,
        unitPrice: 0,
        merchandiseValue: 0,
        freightValue: 0,
        icmsFreightRate: 0,
        ipiRate: 0,
        icmsRate: 0,
        icmsFreightValue: 0,
        hasSt: false,
        stValue: 0,
        calculatedIpi: 0,
        calculatedIcms: 0,
        calculatedPis: 0,
        calculatedCofins: 0,
        costPresumido: 0,
        costReal: 0,
        costSimples: 0,
        unitCostPresumido: 0,
        unitCostReal: 0,
        unitCostSimples: 0,
      }
      return [...prev, newItem]
    })
  }

  const updatePurchaseItem = (
    id: string,
    field: keyof Omit<
      PurchaseItem,
      | 'id'
      | 'calculatedIpi'
      | 'calculatedIcms'
      | 'calculatedPis'
      | 'calculatedCofins'
      | 'costPresumido'
      | 'costReal'
      | 'costSimples'
      | 'unitCostPresumido'
      | 'unitCostReal'
      | 'unitCostSimples'
    >,
    value: string | number | boolean,
  ) => {
    setPurchasesItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (field === 'name') {
          return { ...item, name: String(value) }
        }
        if (field === 'hasSt') {
          return { ...item, hasSt: Boolean(value) }
        }
        if (field === 'quantity') {
          const parsed = typeof value === 'number' ? value : parseInt(String(value), 10)
          const cleanQty = isNaN(parsed) || parsed < 0 ? 0 : parsed
          // Se o usuário já tiver unitPrice informado (> 0), recalcula merchandiseValue = quantity * unitPrice
          // Se merchandiseValue foi digitado diretamente e unitPrice não, deriva unitPrice se cleanQty > 0
          let merch = item.merchandiseValue
          let unit = item.unitPrice
          if (unit > 0) {
            merch = cleanQty * unit
          } else if (cleanQty > 0 && merch > 0) {
            unit = merch / cleanQty
          }
          return { ...item, quantity: cleanQty, unitPrice: unit, merchandiseValue: merch }
        }
        if (field === 'unitPrice') {
          const num = typeof value === 'number' ? value : parseBRNumber(String(value))
          const cleanUnit = Number.isFinite(num) && num >= 0 ? num : 0
          // Se tiver quantidade, calcula merchandiseValue = cleanUnit * quantity
          let merch = item.merchandiseValue
          if (item.quantity > 0) {
            merch = cleanUnit * item.quantity
          }
          return { ...item, unitPrice: cleanUnit, merchandiseValue: merch }
        }
        if (field === 'merchandiseValue') {
          const num = typeof value === 'number' ? value : parseBRNumber(String(value))
          const cleanMerch = Number.isFinite(num) && num >= 0 ? num : 0
          // Se tiver quantidade > 0 e merchandiseValue foi alterado diretamente, deriva unitPrice
          const unit = item.quantity > 0 ? cleanMerch / item.quantity : item.unitPrice
          return { ...item, merchandiseValue: cleanMerch, unitPrice: unit }
        }
        if (field === 'freightValue') {
          const num = typeof value === 'number' ? value : parseBRNumber(String(value))
          const cleanFreight = Number.isFinite(num) && num >= 0 ? num : 0
          const rate = item.icmsFreightRate ?? 0
          const calcIcmsFreight = (cleanFreight * rate) / 100
          return {
            ...item,
            freightValue: cleanFreight,
            icmsFreightValue: calcIcmsFreight,
          }
        }
        if (field === 'icmsFreightRate') {
          const num = typeof value === 'number' ? value : parseBRNumber(String(value))
          const cleanRate = Number.isFinite(num) && num >= 0 ? num : 0
          const freight = item.freightValue ?? 0
          const calcIcmsFreight = (freight * cleanRate) / 100
          return {
            ...item,
            icmsFreightRate: cleanRate,
            icmsFreightValue: calcIcmsFreight,
          }
        }
        // Campos numéricos gerais
        const numVal = typeof value === 'number' ? value : parseBRNumber(String(value))
        const cleanNum = Number.isFinite(numVal) && numVal >= 0 ? numVal : 0
        return {
          ...item,
          [field]: cleanNum,
        }
      }),
    )
  }

  const removePurchaseItem = (id: string) => {
    setPurchasesItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id)
      if (filtered.length === 0) {
        return [
          {
            id: `purch-${Date.now()}`,
            name: 'Item 1',
            quantity: 0,
            unitPrice: 0,
            merchandiseValue: 0,
            freightValue: 0,
            icmsFreightRate: 0,
            ipiRate: 0,
            icmsRate: 0,
            icmsFreightValue: 0,
            hasSt: false,
            stValue: 0,
            calculatedIpi: 0,
            calculatedIcms: 0,
            calculatedPis: 0,
            calculatedCofins: 0,
            costPresumido: 0,
            costReal: 0,
            costSimples: 0,
            unitCostPresumido: 0,
            unitCostReal: 0,
            unitCostSimples: 0,
          },
        ]
      }
      return filtered
    })
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

  // CÁLCULO DE COMPRAS DERIVADO (Multi-itens + Rateio Global + Legado)
  // Alíquotas legais não-cumulativas de PIS/COFINS fixas para o Lucro Real:
  // mercadoria + IPI + frete + ST − ICMS − ICMS s/ frete − (mercadoria × 1,65%) − (mercadoria × 7,60%)
  const PIS_RATE_REAL = 1.65
  const COFINS_RATE_REAL = 7.6
  const pisRatePurchases = PIS_RATE_REAL
  const cofinsRatePurchases = COFINS_RATE_REAL

  // Verifica se há itens de compras preenchidos (> 0)
  const hasPurchasesItemsData = purchasesItems.some(
    (item) =>
      (item.merchandiseValue || 0) > 0 ||
      (item.quantity || 0) > 0 ||
      (item.freightValue || 0) > 0 ||
      (item.stValue || 0) > 0,
  )

  // Cálculo individualizado por item
  const computedPurchasesItems: PurchaseItem[] = useMemo(() => {
    return purchasesItems.map((item) => {
      const merch = Math.max(0, Number.isFinite(item.merchandiseValue) ? item.merchandiseValue : 0)
      const qty = Math.max(0, Number.isFinite(item.quantity) ? item.quantity : 0)
      const freightVal = Math.max(
        0,
        Number.isFinite(item.freightValue) ? (item.freightValue ?? 0) : 0,
      )
      const freightRate = Math.max(
        0,
        Number.isFinite(item.icmsFreightRate) ? (item.icmsFreightRate ?? 0) : 0,
      )
      const ipiR = Math.max(0, Number.isFinite(item.ipiRate) ? item.ipiRate : 0)
      const icmsR = Math.max(0, Number.isFinite(item.icmsRate) ? item.icmsRate : 0)
      const freightIcms = Math.max(
        0,
        Number.isFinite(item.icmsFreightValue) ? item.icmsFreightValue : 0,
      )
      const itemSt = item.hasSt ? Math.max(0, Number.isFinite(item.stValue) ? item.stValue : 0) : 0

      const calculatedIpi = (merch * ipiR) / 100
      const calculatedIcms = (merch * icmsR) / 100

      // Base PIS/COFINS com exclusão do ICMS por item (Tese do Século)
      const pisBase = Math.max(0, merch - calculatedIcms)
      const cofinsBase = Math.max(0, merch - calculatedIcms)

      // Créditos fiscais fixos do Lucro Real (alíquotas legais 1,65% e 7,60%)
      const calculatedPis = (pisBase * PIS_RATE_REAL) / 100
      const calculatedCofins = (cofinsBase * COFINS_RATE_REAL) / 100

      // Custos totais apropriados do item conforme regime:
      // Frete integra o custo de aquisição em todos os regimes.
      // Presumido: mercadoria + frete + IPI + ST - ICMS - ICMS_frete
      const costPresumido = Math.max(
        0,
        merch + freightVal + calculatedIpi + itemSt - calculatedIcms - freightIcms,
      )
      // Real: mercadoria + frete + IPI + ST - ICMS - ICMS_frete - PIS (1,65%) - COFINS (7,60%)
      const costReal = Math.max(
        0,
        merch +
          freightVal +
          calculatedIpi +
          itemSt -
          calculatedIcms -
          freightIcms -
          calculatedPis -
          calculatedCofins,
      )
      // Simples: não recupera ICMS/PIS/COFINS (tudo integra custo)
      const costSimples = Math.max(0, merch + freightVal + calculatedIpi + itemSt)

      const unitCostPresumido = qty > 0 ? costPresumido / qty : 0
      const unitCostReal = qty > 0 ? costReal / qty : 0
      const unitCostSimples = qty > 0 ? costSimples / qty : 0

      return {
        ...item,
        merchandiseValue: merch,
        quantity: qty,
        unitPrice: item.unitPrice || (qty > 0 ? merch / qty : 0),
        freightValue: freightVal,
        icmsFreightRate: freightRate,
        ipiRate: ipiR,
        icmsRate: icmsR,
        icmsFreightValue: freightIcms,
        stValue: itemSt,
        calculatedIpi,
        calculatedIcms,
        calculatedPis,
        calculatedCofins,
        costPresumido,
        costReal,
        costSimples,
        unitCostPresumido: Number.isFinite(unitCostPresumido) ? unitCostPresumido : 0,
        unitCostReal: Number.isFinite(unitCostReal) ? unitCostReal : 0,
        unitCostSimples: Number.isFinite(unitCostSimples) ? unitCostSimples : 0,
      }
    })
  }, [purchasesItems])

  // Somatórios dos itens
  const totalPurchasesQuantity = computedPurchasesItems.reduce(
    (acc, it) => acc + (it.quantity || 0),
    0,
  )
  const totalPurchasesMerchandise = computedPurchasesItems.reduce(
    (acc, it) => acc + (it.merchandiseValue || 0),
    0,
  )
  const totalItemsFreight = computedPurchasesItems.reduce(
    (acc, it) => acc + (it.freightValue || 0),
    0,
  )
  const totalItemsIpi = computedPurchasesItems.reduce((acc, it) => acc + (it.calculatedIpi || 0), 0)
  const totalItemsIcms = computedPurchasesItems.reduce(
    (acc, it) => acc + (it.calculatedIcms || 0),
    0,
  )
  const totalItemsFreightIcms = computedPurchasesItems.reduce(
    (acc, it) => acc + (it.icmsFreightValue || 0),
    0,
  )
  const totalItemsPis = computedPurchasesItems.reduce((acc, it) => acc + (it.calculatedPis || 0), 0)
  const totalItemsCofins = computedPurchasesItems.reduce(
    (acc, it) => acc + (it.calculatedCofins || 0),
    0,
  )
  const totalItemsSt = computedPurchasesItems.reduce((acc, it) => acc + (it.stValue || 0), 0)

  // Custos adicionais globais (frete rateado, seguro, outros)
  const totalAdditionalCosts = additionalCosts.reduce((acc, c) => acc + (c.value || 0), 0)
  const totalDeductionsBase = deductionCosts.reduce((acc, d) => acc + (d.value || 0), 0)

  // Tributos não recuperáveis globais (IPI geral se não lançado nos itens)
  const globalNonRecoverableTax = (nonRecoverableTaxBase * nonRecoverableTaxRate) / 100
  const effectiveIpiAddition = hasPurchasesItemsData ? totalItemsIpi : globalNonRecoverableTax

  // ST global (do subsistema ou dos itens)
  const stPurchaseAddition = stSubsystem.enabled
    ? Math.max(0, stSubsystem.purchasesStPaid || 0)
    : totalItemsSt

  // ICMS global ou dos itens
  const globalIcmsPurchases = (icmsPurchasesBase * icmsPurchasesRate) / 100
  const effectiveIcmsPurchases = hasPurchasesItemsData ? totalItemsIcms : globalIcmsPurchases

  // ICMS sobre frete global ou dos itens
  const globalIcmsFreight = (icmsFreightPurchasesBase * icmsFreightPurchasesRate) / 100
  const effectiveIcmsFreight = hasPurchasesItemsData ? totalItemsFreightIcms : globalIcmsFreight

  // PIS / COFINS compras
  const globalPisFreight = (pisFreightPurchasesBase * pisRatePurchases) / 100
  const globalCofinsFreight = (cofinsFreightPurchasesBase * cofinsRatePurchases) / 100

  // Se multi-itens estiver com dados, PIS/COFINS das mercadorias vem dos itens (+ frete global se houver)
  // Caso contrário, usa as bases globais
  const effectiveIcmsToExclude =
    pisExcludedIcmsManual !== null ? pisExcludedIcmsManual : effectiveIcmsPurchases

  const pisAdjustedBase = Math.max(0, pisPurchasesBase - effectiveIcmsToExclude)
  const globalPisPurchases = (pisAdjustedBase * pisRatePurchases) / 100

  const cofinsAdjustedBase = Math.max(
    0,
    cofinsPurchasesBase -
      (cofinsExcludedIcmsManual !== null ? cofinsExcludedIcmsManual : effectiveIcmsPurchases),
  )
  const globalCofinsPurchases = (cofinsAdjustedBase * cofinsRatePurchases) / 100

  const effectivePisPurchases = hasPurchasesItemsData
    ? totalItemsPis + globalPisFreight
    : globalPisPurchases + globalPisFreight
  const effectiveCofinsPurchases = hasPurchasesItemsData
    ? totalItemsCofins + globalCofinsFreight
    : globalCofinsPurchases + globalCofinsFreight

  // Base de aquisições brutas: mercadorias dos itens + fretes dos itens + encargos globais rateados
  const baseGrossPurchases = hasPurchasesItemsData
    ? totalPurchasesMerchandise + totalItemsFreight + totalAdditionalCosts
    : totalAdditionalCosts

  const totalAdditions = baseGrossPurchases + effectiveIpiAddition

  // CMV Presumido: Apenas ICMS e ICMS s/ frete são recuperáveis + ST pago integra o custo
  const cmvPresumidoNetPurchases =
    totalAdditions +
    stPurchaseAddition -
    totalDeductionsBase -
    effectiveIcmsPurchases -
    effectiveIcmsFreight
  const legacyCmvPresumido = Math.max(
    0,
    initialInventory + cmvPresumidoNetPurchases - finalInventory,
  )

  // CMV Real: ICMS, ICMS frete, PIS, COFINS deduzem + ST pago integra o custo
  const cmvRealNetPurchases =
    totalAdditions +
    stPurchaseAddition -
    totalDeductionsBase -
    effectiveIcmsPurchases -
    effectiveIcmsFreight -
    effectivePisPurchases -
    effectiveCofinsPurchases
  const legacyCmvReal = Math.max(0, initialInventory + cmvRealNetPurchases - finalInventory)

  // CMV Simples Nacional: Tributos sobre compras NÃO são recuperáveis + ST pago
  const cmvSimplesNetPurchases = totalAdditions + stPurchaseAddition - totalDeductionsBase
  const legacyCmvSimples = Math.max(0, initialInventory + cmvSimplesNetPurchases - finalInventory)

  // =========================================================================
  // NOVA DINÂMICA: BAIXA AUTOMÁTICA DE ESTOQUE POR QUANTIDADE (Aditiva / Toggle)
  // =========================================================================
  // Custo total de compras por regime:
  // Se multi-itens estiver cadastrado, soma dos custos dos itens (costPresumido/costReal/costSimples).
  // Caso contrário ou complementando, usa as compras líquidas apuradas.
  const totalItemsCostPresumido = computedPurchasesItems.reduce(
    (acc, it) => acc + (it.costPresumido || 0),
    0,
  )
  const totalItemsCostReal = computedPurchasesItems.reduce((acc, it) => acc + (it.costReal || 0), 0)
  const totalItemsCostSimples = computedPurchasesItems.reduce(
    (acc, it) => acc + (it.costSimples || 0),
    0,
  )

  const purchasesCostPresumido = hasPurchasesItemsData
    ? totalItemsCostPresumido
    : cmvPresumidoNetPurchases
  const purchasesCostReal = hasPurchasesItemsData ? totalItemsCostReal : cmvRealNetPurchases
  const purchasesCostSimples = hasPurchasesItemsData
    ? totalItemsCostSimples
    : cmvSimplesNetPurchases

  // Custo unitário por regime = Σ custo do regime dos itens ÷ Σ quantidade comprada dos itens (protegendo divisão por zero)
  // Permanece SEMPRE disponível (com ou sem toggle de baixa automática de estoque)
  const unitCostPresumidoAuto =
    totalPurchasesQuantity > 0 ? purchasesCostPresumido / totalPurchasesQuantity : 0
  const unitCostRealAuto =
    totalPurchasesQuantity > 0 ? purchasesCostReal / totalPurchasesQuantity : 0
  const unitCostSimplesAuto =
    totalPurchasesQuantity > 0 ? purchasesCostSimples / totalPurchasesQuantity : 0

  // Unidades disponíveis = Σ quantidade comprada + estoque inicial em unidades
  const totalAvailableUnits =
    (totalPurchasesQuantity || 0) + Math.max(0, initialInventoryUnits || 0)

  // Quantidade vendida geral de referência (Markup)
  const generalSoldUnits = (totalConsolidatedQuantity || 0) > 0 ? totalConsolidatedQuantity : 0

  // Quantidade vendida para o cálculo do CMV global na calculadora de Compras:
  // Usa generalSoldUnits limitada às unidades disponíveis
  const cappedSoldUnitsGeneral = Math.min(generalSoldUnits, totalAvailableUnits)
  const isQuantityExceededGeneral =
    totalAvailableUnits > 0 && generalSoldUnits > totalAvailableUnits

  // CMV com toggle ligado
  const autoCmvPresumido = unitCostPresumidoAuto * cappedSoldUnitsGeneral
  const autoCmvReal = unitCostRealAuto * cappedSoldUnitsGeneral
  const autoCmvSimples = unitCostSimplesAuto * cappedSoldUnitsGeneral

  // EF Automático = EI (R$) + custo total do regime das compras − CMV do regime
  const autoFinalInventoryPresumido = Math.max(
    0,
    initialInventory + purchasesCostPresumido - autoCmvPresumido,
  )
  const autoFinalInventoryReal = Math.max(0, initialInventory + purchasesCostReal - autoCmvReal)
  const autoFinalInventorySimples = Math.max(
    0,
    initialInventory + purchasesCostSimples - autoCmvSimples,
  )

  // Valores finais respeitando o toggle (se desligado, estritamente idêntico ao legado)
  const cmvPresumido = autoInventoryDeduction ? autoCmvPresumido : legacyCmvPresumido
  const cmvReal = autoInventoryDeduction ? autoCmvReal : legacyCmvReal
  const cmvSimples = autoInventoryDeduction ? autoCmvSimples : legacyCmvSimples

  const isPurchasesCalculated =
    hasPurchasesItemsData ||
    totalAdditionalCosts > 0 ||
    initialInventory > 0 ||
    finalInventory > 0 ||
    (autoInventoryDeduction && initialInventoryUnits > 0) ||
    cmvPresumido > 0 ||
    cmvReal > 0 ||
    cmvSimples > 0

  // CÁLCULO REATIVO AUTOMÁTICO DO MARKUP (executado sempre que os produtos, taxas ou regime mudam)
  // Mantém a regra de ouro: se tudo estiver zerado (nenhum produto com receita/custo preenchido),
  // os resultados permanecem zerados e isMarkupSimulated = false.
  // Assim que o usuário digita qualquer valor, o cálculo ocorre instantaneamente e alimenta todas as conexões.
  useEffect(() => {
    // Verifica se há pelo menos um produto com valor base preenchido (> 0)
    const hasAnyFilledProduct = markupProducts.some((p) => {
      const desired =
        typeof p.desiredNetRevenue === 'number' && Number.isFinite(p.desiredNetRevenue)
          ? p.desiredNetRevenue
          : 0
      const costVal = typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : 0
      const qty = typeof p.quantity === 'number' && Number.isFinite(p.quantity) ? p.quantity : 0
      const mrg = typeof p.margin === 'number' && Number.isFinite(p.margin) ? p.margin : 0
      return (p.mode === 'liquid' ? desired > 0 : costVal > 0) || qty > 0 || mrg > 0
    })

    // Alíquotas conforme regime
    const pisRate = regime === 'simples' ? 0 : regime === 'presumido' ? 0.0065 : 0.0165
    const cofinsRate = regime === 'simples' ? 0 : regime === 'presumido' ? 0.03 : 0.076
    const cleanIcms = Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0
    const icmsFactor = 1 - cleanIcms / 100
    const pisFactor = regime === 'simples' ? 1 : 1 - pisRate
    const cofinsFactor = regime === 'simples' ? 1 : 1 - cofinsRate

    let baseTaxFactor = icmsFactor * pisFactor * cofinsFactor
    if (!Number.isFinite(baseTaxFactor)) baseTaxFactor = 1

    // Tributos customizados
    for (const tax of customTaxesMarkup) {
      const taxRate = Number.isFinite(tax.rate) ? tax.rate : 0
      baseTaxFactor *= 1 - taxRate / 100
    }
    if (!Number.isFinite(baseTaxFactor)) baseTaxFactor = 1

    // Se não há dados preenchidos, não ativa a simulação automaticamente
    if (!hasAnyFilledProduct) {
      // Se já estava desligado e tudo está zerado, apenas mantém zerado
      setIsMarkupSimulated((prev) => (prev ? false : prev))
      setSimulatedTaxFactorTotal(0)
      setSimulatedCompleteFactor(0)
      setSimulatedSalePrice(0)
      setTotalConsolidatedRevenue(0)
      setTotalConsolidatedQuantity(0)
      setTotalConsolidatedCost(0)
      return
    }

    // Calcular valores de cada produto
    let totalRev = 0
    let totalQty = 0
    let totalCostVal = 0

    const updated = markupProducts.map((p) => {
      const rawMargin = typeof p.margin === 'number' && Number.isFinite(p.margin) ? p.margin : 0
      const marginFactor = 1 - rawMargin / 100
      let completeFactor = baseTaxFactor * marginFactor
      if (!Number.isFinite(completeFactor)) completeFactor = 0

      let baseValue = 0
      if (p.mode === 'liquid') {
        baseValue =
          typeof p.desiredNetRevenue === 'number' && Number.isFinite(p.desiredNetRevenue)
            ? p.desiredNetRevenue
            : 0
      } else {
        baseValue = typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : 0
      }

      // Blindagem contra divisão por zero / NaN / Infinity: safeFactor > 0.0001
      const safeFactor = completeFactor > 0.0001 ? completeFactor : 0
      const rawSalePrice = safeFactor > 0 && baseValue > 0 ? baseValue / safeFactor : 0
      const salePrice = Number.isFinite(rawSalePrice) ? Math.round(rawSalePrice * 100) / 100 : 0
      const qty =
        typeof p.quantity === 'number' && Number.isFinite(p.quantity) ? Math.max(0, p.quantity) : 0
      const rawRev = salePrice * qty
      const rev = Number.isFinite(rawRev) ? Math.round(rawRev * 100) / 100 : 0
      const pCost = typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : 0
      const rawCostItem = pCost * qty
      const costItem = Number.isFinite(rawCostItem) ? Math.round(rawCostItem * 100) / 100 : 0

      totalRev += rev
      totalQty += qty
      totalCostVal += costItem

      return {
        ...p,
        salePrice,
        taxFactor: baseTaxFactor,
        completeFactor,
        totalRevenue: rev,
        totalCost: costItem,
      }
    })

    // Sincroniza produtos internamente sem loop infinito:
    // Comparação com tolerância numérica (> 0.00001 para fatores, > 0.01 para monetários)
    const hasDiff = updated.some((p, i) => {
      const prev = markupProducts[i]
      if (!prev) return true
      const salePriceDiff = Math.abs((p.salePrice || 0) - (prev.salePrice || 0))
      const factorDiff = Math.abs((p.completeFactor || 0) - (prev.completeFactor || 0))
      const taxFactorDiff = Math.abs((p.taxFactor || 0) - (prev.taxFactor || 0))
      const revenueDiff = Math.abs((p.totalRevenue || 0) - (prev.totalRevenue || 0))
      const costDiff = Math.abs((p.totalCost || 0) - (prev.totalCost || 0))
      return (
        salePriceDiff > 0.01 ||
        factorDiff > 0.00001 ||
        taxFactorDiff > 0.00001 ||
        revenueDiff > 0.01 ||
        costDiff > 0.01
      )
    })
    if (hasDiff) {
      setMarkupProducts(updated)
    }

    const firstProduct = updated[0]
    const legacyCompleteFactor = firstProduct
      ? firstProduct.completeFactor
      : baseTaxFactor * (1 - (additionalMargin || 0) / 100)
    const legacySalePrice = firstProduct ? firstProduct.salePrice : 0

    setSimulatedTaxFactorTotal(Number.isFinite(baseTaxFactor) ? baseTaxFactor : 0)
    setSimulatedCompleteFactor(Number.isFinite(legacyCompleteFactor) ? legacyCompleteFactor : 0)
    setSimulatedSalePrice(Number.isFinite(legacySalePrice) ? legacySalePrice : 0)
    setTotalConsolidatedRevenue(Number.isFinite(totalRev) ? Math.round(totalRev * 100) / 100 : 0)
    setTotalConsolidatedQuantity(totalQty)
    setTotalConsolidatedCost(
      Number.isFinite(totalCostVal) ? Math.round(totalCostVal * 100) / 100 : 0,
    )

    // Ativa exibição automática dos resultados apenas quando há preço ou receita calculada
    if (legacySalePrice > 0 || totalRev > 0) {
      setIsMarkupSimulated(true)
    }
  }, [regime, icmsRateMarkup, customTaxesMarkup, additionalMargin, markupProducts])

  // SIMULAÇÃO DO MARKUP MANUAL (mantido para atender cliques no botão "Simular", garantindo reciprocidade)
  const simulateMarkup = () => {
    const pisRate = regime === 'simples' ? 0 : regime === 'presumido' ? 0.0065 : 0.0165
    const cofinsRate = regime === 'simples' ? 0 : regime === 'presumido' ? 0.03 : 0.076
    const icmsFactor = 1 - (icmsRateMarkup || 0) / 100
    const pisFactor = regime === 'simples' ? 1 : 1 - pisRate
    const cofinsFactor = regime === 'simples' ? 1 : 1 - cofinsRate

    let baseTaxFactor = icmsFactor * pisFactor * cofinsFactor
    for (const tax of customTaxesMarkup) {
      baseTaxFactor *= 1 - (tax.rate || 0) / 100
    }

    let consolidatedRevenue = 0
    let consolidatedQty = 0
    let consolidatedCost = 0

    const updatedProducts = markupProducts.map((p) => {
      const rawMargin = typeof p.margin === 'number' && Number.isFinite(p.margin) ? p.margin : 0
      const marginFactor = 1 - rawMargin / 100
      let completeFactor = baseTaxFactor * marginFactor
      if (!Number.isFinite(completeFactor)) completeFactor = 0

      let baseValue = 0
      if (p.mode === 'liquid') {
        baseValue =
          typeof p.desiredNetRevenue === 'number' && Number.isFinite(p.desiredNetRevenue)
            ? p.desiredNetRevenue
            : 0
      } else {
        baseValue = typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : 0
      }

      const safeFactor = completeFactor > 0.0001 ? completeFactor : 0
      const rawSalePrice = safeFactor > 0 && baseValue > 0 ? baseValue / safeFactor : 0
      const roundedPrice = Number.isFinite(rawSalePrice) ? Math.round(rawSalePrice * 100) / 100 : 0
      const qty =
        typeof p.quantity === 'number' && Number.isFinite(p.quantity) ? Math.max(0, p.quantity) : 0
      const rawRev = roundedPrice * qty
      const totalRev = Number.isFinite(rawRev) ? Math.round(rawRev * 100) / 100 : 0
      const pCost = typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : 0
      const rawTotalCost = pCost * qty
      const totalCost = Number.isFinite(rawTotalCost) ? Math.round(rawTotalCost * 100) / 100 : 0

      consolidatedRevenue += totalRev
      consolidatedQty += qty
      consolidatedCost += totalCost

      return {
        ...p,
        salePrice: roundedPrice,
        taxFactor: baseTaxFactor,
        completeFactor,
        totalRevenue: totalRev,
        totalCost,
      }
    })

    setMarkupProducts(updatedProducts)
    setTotalConsolidatedRevenue(Math.round(consolidatedRevenue * 100) / 100)
    setTotalConsolidatedQuantity(consolidatedQty)
    setTotalConsolidatedCost(Math.round(consolidatedCost * 100) / 100)

    const firstProduct = updatedProducts[0]
    const legacyCompleteFactor = firstProduct
      ? firstProduct.completeFactor
      : baseTaxFactor * (1 - (additionalMargin || 0) / 100)
    const legacySalePrice = firstProduct ? firstProduct.salePrice : 0

    setSimulatedTaxFactorTotal(baseTaxFactor)
    setSimulatedCompleteFactor(legacyCompleteFactor)
    setSimulatedSalePrice(legacySalePrice)

    if (legacySalePrice > 0 || consolidatedRevenue > 0) {
      setIsMarkupSimulated(true)
    }
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
        costComposition: {
          directCosts: [],
          indirectCosts: [],
          fixedCosts: [],
        },
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

    setPurchasesItems([
      {
        id: 'purch-1',
        name: 'Item 1',
        quantity: 0,
        unitPrice: 0,
        merchandiseValue: 0,
        freightValue: 0,
        icmsFreightRate: 0,
        ipiRate: 0,
        icmsRate: 0,
        icmsFreightValue: 0,
        hasSt: false,
        stValue: 0,
        calculatedIpi: 0,
        calculatedIcms: 0,
        calculatedPis: 0,
        calculatedCofins: 0,
        costPresumido: 0,
        costReal: 0,
        costSimples: 0,
        unitCostPresumido: 0,
        unitCostReal: 0,
        unitCostSimples: 0,
      },
    ])
    setInitialInventory(0)
    setFinalInventory(0)
    setAutoInventoryDeduction(false)
    setInitialInventoryUnits(0)
    setAdditionalCosts([{ id: '1', description: 'Frete e seguro s/ compras', value: 0 }])
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
    setRealLalurEntries([])
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
    setSimplesIsInicioAtividade(false)
    setSimplesMonthlyRevenues([0])

    setPayrollSalaries(0)
    setPayrollProLabore(0)
    setPayrollInssRate(20.0)
    setPayrollRatRate(3.0)
    setPayrollTerceirosRate(5.8)

    setStSubsystem(INITIAL_ST_SUBSYSTEM)
    setInterstateSubsystem(INITIAL_INTERSTATE_SUBSYSTEM)
    setReformaState(INITIAL_REFORMA_STATE)

    try {
      if (typeof window !== 'undefined') {
        const legacyKeys = [
          'it_tax_context_v1',
          'it_tax_context_v2',
          'it_tax_context_v3',
          'tax_context_draft',
          'tax_draft',
          'it_tax_state',
          'it_tax_draft',
          'scenario_draft',
          'active_scenario_id',
          'last_scenario_id',
        ]
        legacyKeys.forEach((k) => {
          try {
            localStorage.removeItem(k)
            sessionStorage.removeItem(k)
          } catch {
            // Ignora
          }
        })
      }
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
      purchasesItems: computedPurchasesItems,
      totalPurchasesQuantity,
      initialInventory,
      finalInventory,
      autoInventoryDeduction,
      initialInventoryUnits,
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
      realLalurEntries,
      realQuantitySold,
      realExpenses,
      isRealSimulated,
      simplesAnexo,
      simplesRbt12: effectiveSimplesRbt12,
      simplesPayroll12m,
      simplesQuantitySold,
      simplesExpenses,
      isSimplesSimulated,
      simplesIsInicioAtividade,
      simplesMonthlyRevenues,
      payrollSalaries,
      payrollProLabore,
      payrollInssRate,
      payrollRatRate,
      payrollTerceirosRate,
      stSubsystem,
      interstateSubsystem,
      reformaState,
    }
  }

  // Carregar snapshot vindo do banco e sobrescrever todos os campos
  const loadSnapshot = (snapshot: TaxStateSnapshot) => {
    if (!snapshot) return

    if (snapshot.regime) {
      setRegime(snapshot.regime)
    } else {
      setRegime('presumido')
    }
    if (snapshot.markupMode) setMarkupMode(snapshot.markupMode)
    setDesiredNetRevenue(snapshot.desiredNetRevenue ?? 0)
    setAdditionalMargin(snapshot.additionalMargin ?? 0)
    setIcmsRateMarkup(snapshot.icmsRateMarkup ?? 0)
    setCustomTaxesMarkup(
      Array.isArray(snapshot.customTaxesMarkup) ? snapshot.customTaxesMarkup : [],
    )

    if (Array.isArray(snapshot.markupProducts) && snapshot.markupProducts.length > 0) {
      setMarkupProducts(
        snapshot.markupProducts.map((p) => ({
          ...p,
          costComposition: p.costComposition || {
            directCosts: [],
            indirectCosts: [],
            fixedCosts: [],
          },
        })),
      )
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
          costComposition: {
            directCosts: [],
            indirectCosts: [],
            fixedCosts: [],
          },
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

    // Restauração de compras: compatibilidade com snapshots que possuem purchasesItems
    // ou snapshots legados que tinham apenas compra única em additionalCosts / icmsPurchasesBase
    let loadedHasItems = false
    if (Array.isArray(snapshot.purchasesItems) && snapshot.purchasesItems.length > 0) {
      loadedHasItems = true
      setPurchasesItems(
        snapshot.purchasesItems.map((item) => ({
          ...item,
          freightValue: item.freightValue ?? 0,
          icmsFreightRate: item.icmsFreightRate ?? 0,
          icmsFreightValue: item.icmsFreightValue ?? 0,
        })),
      )
    } else {
      // Migração de compra legada:
      // Se additionalCosts[0] tiver valor de compra bruta > 0, cria 1 item com esse valor
      const legacyFirstCost = Array.isArray(snapshot.additionalCosts) && snapshot.additionalCosts[0]
      const legacyMerch = legacyFirstCost && legacyFirstCost.value ? legacyFirstCost.value : 0
      if (legacyMerch > 0) {
        loadedHasItems = true
      }
      setPurchasesItems([
        {
          id: 'purch-1',
          name: 'Item 1',
          quantity: snapshot.totalPurchasesQuantity || 0,
          unitPrice: 0,
          merchandiseValue: legacyMerch,
          freightValue: 0,
          icmsFreightRate: 0,
          ipiRate: snapshot.nonRecoverableTaxRate ?? 0,
          icmsRate: snapshot.icmsPurchasesRate ?? 0,
          icmsFreightValue: 0,
          hasSt: false,
          stValue: 0,
          calculatedIpi: 0,
          calculatedIcms: 0,
          calculatedPis: 0,
          calculatedCofins: 0,
          costPresumido: 0,
          costReal: 0,
          costSimples: 0,
          unitCostPresumido: 0,
          unitCostReal: 0,
          unitCostSimples: 0,
        },
      ])
    }

    setInitialInventory(snapshot.initialInventory ?? 0)
    setFinalInventory(snapshot.finalInventory ?? 0)
    setAutoInventoryDeduction(Boolean(snapshot.autoInventoryDeduction))
    setInitialInventoryUnits(snapshot.initialInventoryUnits ?? 0)

    // Blindagem de additionalCosts:
    // Se o snapshot tiver linhas com descrição "Compras brutas" cujo valor já esteja absorvido
    // em itens de compra, zeramos o valor dessa linha para evitar double-counting silencioso.
    const rawCosts =
      Array.isArray(snapshot.additionalCosts) && snapshot.additionalCosts.length > 0
        ? snapshot.additionalCosts
        : [{ id: '1', description: 'Frete e seguro s/ compras', value: 0 }]

    const sanitizedCosts = rawCosts.map((cost) => {
      if (
        cost.description &&
        cost.description.trim().toLowerCase() === 'compras brutas' &&
        loadedHasItems
      ) {
        return { ...cost, value: 0 }
      }
      return cost
    })
    setAdditionalCosts(sanitizedCosts)
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

    // Restauração do Mini-LALUR com retrocompatibilidade total:
    // Se o snapshot possui realLalurEntries (formato novo), restaura diretamente.
    // Se é um cenário legado que possui apenas realAdditions ou realExclusions > 0,
    // converte cada total num lançamento genérico preservando o valor exato.
    if (Array.isArray(snapshot.realLalurEntries) && snapshot.realLalurEntries.length > 0) {
      setRealLalurEntries(
        snapshot.realLalurEntries.map((e) => ({
          ...e,
          value: typeof e.value === 'number' && Number.isFinite(e.value) ? Math.max(0, e.value) : 0,
          type: e.type === 'exclusion' ? 'exclusion' : 'addition',
        })),
      )
    } else {
      const legacyEntries: LalurEntryItem[] = []
      const legacyAdditions = Number(snapshot.realAdditions) || 0
      const legacyExclusions = Number(snapshot.realExclusions) || 0

      if (legacyAdditions > 0) {
        legacyEntries.push({
          id: `legacy-add-${Date.now()}`,
          description: 'Adições (lançamento importado)',
          value: legacyAdditions,
          type: 'addition',
        })
      }

      if (legacyExclusions > 0) {
        legacyEntries.push({
          id: `legacy-ex-${Date.now()}`,
          description: 'Exclusões (lançamento importado)',
          value: legacyExclusions,
          type: 'exclusion',
        })
      }

      setRealLalurEntries(legacyEntries)
    }

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
    setSimplesIsInicioAtividade(Boolean(snapshot.simplesIsInicioAtividade))
    if (
      Array.isArray(snapshot.simplesMonthlyRevenues) &&
      snapshot.simplesMonthlyRevenues.length > 0
    ) {
      setSimplesMonthlyRevenues(snapshot.simplesMonthlyRevenues.map((v) => Number(v) || 0))
    } else {
      setSimplesMonthlyRevenues([0])
    }

    setPayrollSalaries(snapshot.payrollSalaries ?? 0)
    setPayrollProLabore(snapshot.payrollProLabore ?? 0)
    setPayrollInssRate(snapshot.payrollInssRate ?? 20.0)
    setPayrollRatRate(snapshot.payrollRatRate ?? 3.0)
    setPayrollTerceirosRate(snapshot.payrollTerceirosRate ?? 5.8)

    if (snapshot.stSubsystem) {
      setStSubsystem({ ...INITIAL_ST_SUBSYSTEM, ...snapshot.stSubsystem })
    } else {
      setStSubsystem(INITIAL_ST_SUBSYSTEM)
    }

    if (snapshot.interstateSubsystem) {
      setInterstateSubsystem({
        ...INITIAL_INTERSTATE_SUBSYSTEM,
        ...snapshot.interstateSubsystem,
      })
    } else {
      setInterstateSubsystem(INITIAL_INTERSTATE_SUBSYSTEM)
    }

    if (snapshot.reformaState) {
      setReformaState({
        ...INITIAL_REFORMA_STATE,
        ...snapshot.reformaState,
      })
    } else {
      setReformaState(INITIAL_REFORMA_STATE)
    }

    // Nota: O carregamento de cenários do banco atualiza o estado em memória
    // mantendo a aplicação consistente sem poluir o rascunho de inicialização
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
        addCostCompositionItem,
        updateCostCompositionItem,
        removeCostCompositionItem,
        clearCostComposition,
        simulatedSalePrice,
        simulatedTaxFactorTotal,
        simulatedCompleteFactor,
        isMarkupSimulated,
        simulateMarkup,
        totalConsolidatedRevenue,
        totalConsolidatedQuantity,
        totalConsolidatedCost,

        purchasesItems: computedPurchasesItems,
        addPurchaseItem,
        updatePurchaseItem,
        removePurchaseItem,
        totalPurchasesQuantity,
        totalPurchasesMerchandise,
        isPurchasesCalculated,

        initialInventory,
        setInitialInventory,
        finalInventory,
        setFinalInventory,
        autoInventoryDeduction,
        setAutoInventoryDeduction,
        initialInventoryUnits,
        setInitialInventoryUnits,
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
        realLalurEntries,
        setRealLalurEntries,
        addRealLalurEntry,
        updateRealLalurEntry,
        removeRealLalurEntry,
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

        simplesIsInicioAtividade,
        setSimplesIsInicioAtividade,
        simplesMonthlyRevenues,
        setSimplesMonthlyRevenues,
        addSimplesMonthlyRevenue,
        updateSimplesMonthlyRevenue,
        removeSimplesMonthlyRevenue,
        calculatedInicioAtividadeRbt12,
        effectiveSimplesRbt12,

        payrollSalaries,
        setPayrollSalaries,
        payrollProLabore,
        setPayrollProLabore,
        payrollInssRate,
        setPayrollInssRate,
        payrollRatRate,
        setPayrollRatRate,
        payrollTerceirosRate,
        setPayrollTerceirosRate,

        stSubsystem,
        setStSubsystem,
        updateStSubsystem,

        interstateSubsystem,
        setInterstateSubsystem,
        updateInterstateSubsystem,

        reformaState,
        setReformaState,
        updateReformaState,
        setSelectedReformaYear,

        getSnapshot,
        loadSnapshot,

        calculatedPurchases: {
          totalAdditionalCosts,
          nonRecoverableTaxResult: effectiveIpiAddition,
          totalAdditions,
          totalDeductionsBase,
          icmsResult: effectiveIcmsPurchases,
          icmsFreightResult: effectiveIcmsFreight,
          effectiveIcmsToExclude,
          pisAdjustedBase,
          pisResult: effectivePisPurchases,
          cofinsAdjustedBase,
          cofinsResult: effectiveCofinsPurchases,
          pisFreightResult: globalPisFreight,
          cofinsFreightResult: globalCofinsFreight,
          cmvPresumidoNetPurchases,
          cmvPresumido,
          cmvRealNetPurchases,
          cmvReal,
          cmvSimplesNetPurchases,
          cmvSimples,
          autoInventoryDeductionActive: autoInventoryDeduction,
          totalAvailableUnits,
          totalSoldUnitsEffective: generalSoldUnits,
          isQuantityExceeded: isQuantityExceededGeneral,
          unitCostPresumidoEffective: unitCostPresumidoAuto,
          unitCostRealEffective: unitCostRealAuto,
          unitCostSimplesEffective: unitCostSimplesAuto,
          autoFinalInventoryPresumido,
          autoFinalInventoryReal,
          autoFinalInventorySimples,
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
