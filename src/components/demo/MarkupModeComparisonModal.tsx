import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRightLeft,
  Target,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Scale,
} from 'lucide-react'
import { formatBRL, formatNumberBR, formatPercentBR } from '@/lib/taxCalculations'
import { calculatePgdas, SimplesAnexoId } from '@/lib/simplesCalculations'
import { calculateLiquidDreChain } from '@/lib/liquidMarkupCalculations'
import {
  MarkupProductItem,
  TaxRegime,
  CustomTaxItem,
  VariableExpenseItem,
  SimplesScenarioKey,
  useTaxContext,
} from '@/contexts/TaxContext'

export interface MarkupModeComparisonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: MarkupProductItem | null
  currentRegime: TaxRegime
  icmsRateMarkup: number
  customTaxesMarkup: CustomTaxItem[]
  simplesAnexo: string
  simplesRbt12: number
  effectiveSimplesRbt12?: number
  variableExpenses?: VariableExpenseItem[]
  totalVariableExpenseRate?: number
  simplesIsActiveMoreThan12m?: boolean
  simplesActivityMonths?: number
  simplesMonthlyProjectedRevenue?: number
  simplesSelectedScenario?: SimplesScenarioKey
}

export interface ModeTriadResult {
  mode: 'liquid' | 'cost_margin'
  modeLabel: string
  anchorLabel: string
  anchorValue: number
  anchorFormatted: string
  salePrice: number
  salePriceFormatted: string
  // Margem de entrada (semântica de formação de preço / Custo + Margem)
  entryMarginPct?: number
  entryMarginFormatted?: string
  entryMarginLabel?: string
  // Margem líquida apurada (métrica canônica: pós-IRPJ/CSLL sobre RL aditiva)
  netMarginPct: number
  netMarginFormatted: string
  netMarginDerived: boolean
  lle?: number
  isViable?: boolean
  notes?: string
}

export interface ModeComparisonData {
  regime: TaxRegime
  regimeLabel: string
  productName: string
  activeMode: 'liquid' | 'cost_margin'
  hasValidData: boolean
  invalidReason?: string
  activeTriad: ModeTriadResult
  alternativeTriad: ModeTriadResult | null
  unitCost: number
  divisorActive: number
  divisorAlternative: number
}

/**
 * Calcula a tríade (âncora, preço de venda, margem líquida) para os dois modos
 * de formação de preço EXCLUSIVAMENTE para o regime tributário selecionado.
 *
 * Premissa honesta da usuária:
 * - Modo ativo = "Receita Líquida": o modo alternativo ("Custo + Margem") utiliza
 *   a MARGEM LÍQUIDA IMPLÍCITA produzida pelo modo ativo, demonstrando como os dois
 *   caminhos convergem no mesmo nível de rentabilidade para o regime ativo.
 * - Modo ativo = "Custo + Margem": o modo alternativo ("Receita Líquida") deriva a
 *   meta líquida implícita gerada pelo preço de custo+margem, permitindo comparar
 *   com honestidade matemática os dois modelos sem inventar dados nem modificar o estado ativo.
 */
export function computeMarkupModeComparison(params: {
  product: MarkupProductItem
  currentRegime: TaxRegime
  icmsRateMarkup: number
  customTaxesMarkup: CustomTaxItem[]
  simplesAnexo: string
  simplesRbt12: number
  effectiveSimplesRbt12?: number
  totalVariableExpenseRate?: number
  resolveUnitCost: (targetRegime: TaxRegime) => number
}): ModeComparisonData {
  const {
    product,
    currentRegime,
    icmsRateMarkup,
    customTaxesMarkup = [],
    simplesAnexo,
    simplesRbt12,
    effectiveSimplesRbt12,
    totalVariableExpenseRate = 0,
    resolveUnitCost,
  } = params

  const regimeLabels: Record<TaxRegime, string> = {
    presumido: 'Lucro Presumido',
    real: 'Lucro Real',
    simples: 'Simples Nacional',
  }

  const activeMode = product.mode === 'liquid' ? 'liquid' : 'cost_margin'
  const unitCost = resolveUnitCost(currentRegime)

  // Taxas e deduções para o regime ativo
  const customTaxesSum = customTaxesMarkup.reduce((acc, t) => acc + (t.rate || 0), 0)
  const dvRate = totalVariableExpenseRate || 0
  const dvDecimal = dvRate / 100
  const dvFactor = 1 - dvDecimal

  let customTaxesFactor = 1
  for (const ct of customTaxesMarkup) {
    customTaxesFactor *= 1 - (ct.rate || 0) / 100
  }

  // Divisores base de cada regime:
  // Modo Preço Líquido Desejado: multiplicativo de deduções (tributos + DV), SEM fator margem
  // Presumido: (1 - ICMS) * (1 - 0,0365) * (1 - DV) * customTaxesFactor
  // Real: (1 - ICMS) * (1 - 0,0925) * (1 - DV) * customTaxesFactor
  // Simples: (1 - alíquota efetiva PGDAS) * (1 - DV) * customTaxesFactor
  // Modo Custo + Margem: divisor multiplicativo com todos os fatores (deduções + margem)
  let baseLiquidDivisor = 0.7308147
  let baseCostMultiplicativeTaxFactor = 1

  if (currentRegime === 'simples') {
    const anexoClean = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
    const rbt12Clean =
      effectiveSimplesRbt12 && effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0
    const pgdasRes = calculatePgdas(anexoClean, rbt12Clean)
    const effectiveSimplesRate = pgdasRes.aliquotaEfetiva
    baseCostMultiplicativeTaxFactor =
      (1 - effectiveSimplesRate / 100) * customTaxesFactor * (dvFactor > 0 ? dvFactor : 1)
    baseLiquidDivisor = Math.max(0.0001, baseCostMultiplicativeTaxFactor)
  } else if (currentRegime === 'presumido') {
    const icms = Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0
    const icmsFactor = 1 - icms / 100
    const pisCofinsFactor = 1 - 0.0365 // 0.9635
    baseCostMultiplicativeTaxFactor =
      icmsFactor * pisCofinsFactor * customTaxesFactor * (dvFactor > 0 ? dvFactor : 1)
    baseLiquidDivisor = Math.max(0.0001, baseCostMultiplicativeTaxFactor)
  } else {
    // Lucro Real
    const icms = Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0
    const icmsFactor = 1 - icms / 100
    const pisCofinsFactor = 1 - 0.0925 // 0.9075
    baseCostMultiplicativeTaxFactor =
      icmsFactor * pisCofinsFactor * customTaxesFactor * (dvFactor > 0 ? dvFactor : 1)
    baseLiquidDivisor = Math.max(0.0001, baseCostMultiplicativeTaxFactor)
  }

  const activeRegimeMargin = product.marginByRegime?.[currentRegime] ?? (product.margin || 0)
  const activeRegimeDesiredNetRev =
    product.desiredNetRevenueByRegime?.[currentRegime] ?? (product.desiredNetRevenue || 0)

  // Validação: caso o modo ativo seja Custo+Margem mas não haja custo definido
  if (activeMode === 'cost_margin' && unitCost <= 0 && (!product.cost || product.cost <= 0)) {
    const activeTriadFallback: ModeTriadResult = {
      mode: 'cost_margin',
      modeLabel: 'Custo + Margem (Ativo)',
      anchorLabel: 'Custo Base',
      anchorValue: 0,
      anchorFormatted: 'R$ 0,00',
      salePrice: 0,
      salePriceFormatted: 'Não apurado',
      netMarginPct: activeRegimeMargin,
      netMarginFormatted: `${formatNumberBR(activeRegimeMargin)}%`,
      netMarginDerived: false,
      notes: 'Custo unitário não cadastrado para o regime ativo.',
    }
    return {
      regime: currentRegime,
      regimeLabel: regimeLabels[currentRegime],
      productName: product.name || 'Produto',
      activeMode,
      hasValidData: false,
      invalidReason:
        'O modo Custo + Margem necessita que o custo unitário da mercadoria esteja preenchido neste regime ou importado da Calculadora de Compras.',
      activeTriad: activeTriadFallback,
      alternativeTriad: null,
      unitCost: 0,
      divisorActive: baseCostMultiplicativeTaxFactor,
      divisorAlternative: baseLiquidDivisor,
    }
  }

  // Validação: caso o modo ativo seja Receita Líquida mas a RL informada seja zero
  if (activeMode === 'liquid' && activeRegimeDesiredNetRev <= 0) {
    const activeTriadFallback: ModeTriadResult = {
      mode: 'liquid',
      modeLabel: 'Receita Líquida (Ativo)',
      anchorLabel: 'Meta Líquida Desejada',
      anchorValue: 0,
      anchorFormatted: 'R$ 0,00',
      salePrice: 0,
      salePriceFormatted: 'Não apurada',
      netMarginPct: 0,
      netMarginFormatted: '0,00%',
      netMarginDerived: true,
      notes: 'Receita Líquida alvo ainda não informada.',
    }
    return {
      regime: currentRegime,
      regimeLabel: regimeLabels[currentRegime],
      productName: product.name || 'Produto',
      activeMode,
      hasValidData: false,
      invalidReason:
        'A Receita Líquida Desejada deste produto ainda não foi preenchida. Informe uma meta líquida para habilitar a comparação entre os modos.',
      activeTriad: activeTriadFallback,
      alternativeTriad: null,
      unitCost,
      divisorActive: baseLiquidDivisor,
      divisorAlternative: baseCostMultiplicativeTaxFactor,
    }
  }

  // =========================================================================
  // CASO 1: MODO ATIVO = RECEITA LÍQUIDA (Fluxo B)
  // =========================================================================
  if (activeMode === 'liquid') {
    const desiredNetRevenue = activeRegimeDesiredNetRev
    // Cadeia DRE da RL
    const anexoClean = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
    const rbt12Clean =
      effectiveSimplesRbt12 && effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0
    const pgdasCalc = calculatePgdas(anexoClean, rbt12Clean)

    const chain = calculateLiquidDreChain({
      desiredNetRevenue,
      regime: currentRegime,
      effectiveSimplesRate: pgdasCalc.aliquotaEfetiva,
      icmsRate: icmsRateMarkup || 0,
      customTaxesRate: customTaxesSum,
      variableExpensesRate: dvRate,
      unitCost,
      operatingExpensesUnit: 0,
      presumidoActivity: 'comercio',
    })

    const activeSalePrice = chain.rbv
    const implicitMarginPct = chain.derivedMarginPct

    const activeTriad: ModeTriadResult = {
      mode: 'liquid',
      modeLabel: 'Receita Líquida (Ativo)',
      anchorLabel: 'Receita Líquida Alvo (RL)',
      anchorValue: desiredNetRevenue,
      anchorFormatted: formatBRL(desiredNetRevenue),
      salePrice: activeSalePrice,
      salePriceFormatted: formatBRL(activeSalePrice),
      netMarginPct: implicitMarginPct,
      netMarginFormatted: `${formatNumberBR(implicitMarginPct)}%`,
      netMarginDerived: true,
      lle: chain.lle,
      isViable: chain.isViable,
      notes:
        'Âncora definida pelo valor líquido desejado após deduzir tributos e despesas de venda.',
    }

    // MODO ALTERNATIVO: Custo + Margem com a PREMISSA HONESTA de CONVERGÊNCIA REAL:
    // Custo base = custo unitário líquido deste regime (unitCost).
    // Se não há custo cadastrado neste regime, avisa honestamente.
    if (unitCost <= 0) {
      return {
        regime: currentRegime,
        regimeLabel: regimeLabels[currentRegime],
        productName: product.name || 'Produto',
        activeMode,
        hasValidData: true,
        invalidReason: undefined,
        activeTriad,
        alternativeTriad: {
          mode: 'cost_margin',
          modeLabel: 'Custo + Margem (Alternativo)',
          anchorLabel: 'Custo Unitário da Mercadoria',
          anchorValue: 0,
          anchorFormatted: 'Não cadastrado',
          salePrice: 0,
          salePriceFormatted: 'Indisponível',
          entryMarginPct: 0,
          entryMarginFormatted: 'Não calculável',
          entryMarginLabel: 'Margem de Entrada Equivalente',
          netMarginPct: implicitMarginPct,
          netMarginFormatted: `${formatNumberBR(implicitMarginPct)}%`,
          netMarginDerived: true,
          notes:
            'Para simular o modo alternativo Custo + Margem, cadastre o custo da mercadoria ou importe os itens da Calculadora de Compras.',
        },
        unitCost: 0,
        divisorActive: baseLiquidDivisor,
        divisorAlternative: baseCostMultiplicativeTaxFactor,
      }
    }

    // Modo Alternativo Custo + Margem:
    // Como os modos têm formulações estruturalmente independentes (Custo + Margem usa custo + margem comercial,
    // enquanto Preço Líquido Desejado usa a meta líquida com divisor multiplicativo de deduções),
    // apura o modo Custo + Margem com a margem do produto (ou margem derivada caso 0)
    // sem forçar equivalência artificial.
    const explicitProductMargin = activeRegimeMargin
    const altMarginPct =
      explicitProductMargin > 0
        ? explicitProductMargin
        : implicitMarginPct > 0
          ? implicitMarginPct
          : 0
    const altMarginFactor = Math.max(0.0001, 1 - altMarginPct / 100)
    const divisorAlt = Math.max(0.0001, baseCostMultiplicativeTaxFactor * altMarginFactor)
    const alternativeSalePrice = Math.round((unitCost / divisorAlt) * 100) / 100

    // Margem líquida apurada do alternativo (pós-IRPJ/CSLL sobre RL multiplicativa)
    const altRL = Math.round(alternativeSalePrice * baseLiquidDivisor * 100) / 100
    const altGrossProfit = Math.round((altRL - unitCost) * 100) / 100
    let altLle = altGrossProfit
    if (currentRegime === 'presumido') {
      const irpjBase = alternativeSalePrice * 0.08
      const irpj = Math.round(irpjBase * 0.15 * 100) / 100
      const csll = Math.round(alternativeSalePrice * 0.12 * 0.09 * 100) / 100
      altLle = Math.round((altGrossProfit - (irpj + csll)) * 100) / 100
    } else if (currentRegime === 'real') {
      const baseReal = Math.max(0, altGrossProfit)
      const irpj = Math.round(baseReal * 0.15 * 100) / 100
      const csll = Math.round(baseReal * 0.09 * 100) / 100
      altLle = Math.round((altGrossProfit - (irpj + csll)) * 100) / 100
    } else if (currentRegime === 'simples') {
      // No Simples Nacional, os tributos já estão deduzidos pelo divisor baseLiquidDivisor
      // Logo, o Lucro Líquido = Receita Líquida - Custo
      altLle = altGrossProfit
    }
    const altCanonicalMarginPct =
      altRL > 0 ? Math.round((altLle / altRL) * 10000) / 100 : altMarginPct

    const isConvergent = Math.abs(activeSalePrice - alternativeSalePrice) < 0.05

    // Adiciona margem de entrada do produto na tríade ativa para rotulagem clara
    activeTriad.entryMarginPct = explicitProductMargin
    activeTriad.entryMarginFormatted = `${formatNumberBR(explicitProductMargin)}%`
    activeTriad.entryMarginLabel = 'Margem de Entrada'

    const alternativeTriad: ModeTriadResult = {
      mode: 'cost_margin',
      modeLabel: 'Custo + Margem (Alternativo)',
      anchorLabel: 'Custo Unitário + Margem',
      anchorValue: unitCost,
      anchorFormatted: `${formatBRL(unitCost)} (+ ${formatNumberBR(altMarginPct)}% margem)`,
      salePrice: alternativeSalePrice,
      salePriceFormatted: formatBRL(alternativeSalePrice),
      entryMarginPct: altMarginPct,
      entryMarginFormatted: `${formatNumberBR(altMarginPct)}%`,
      entryMarginLabel: 'Margem de Entrada',
      netMarginPct: altCanonicalMarginPct,
      netMarginFormatted: `${formatNumberBR(altCanonicalMarginPct)}%`,
      netMarginDerived: true,
      lle: altLle,
      isViable: altLle >= 0,
      notes:
        'Calculado de forma independente no modo Custo + Margem com o CMV e a margem cadastrada, seguindo sua própria lógica multiplicativa.',
    }

    return {
      regime: currentRegime,
      regimeLabel: regimeLabels[currentRegime],
      productName: product.name || 'Produto',
      activeMode,
      hasValidData: true,
      activeTriad,
      alternativeTriad,
      unitCost,
      divisorActive: baseLiquidDivisor,
      divisorAlternative: divisorAlt,
    }
  }

  // =========================================================================
  // CASO 2: MODO ATIVO = CUSTO + MARGEM
  // =========================================================================
  const explicitMarginPct = activeRegimeMargin
  const marginFactorActive = Math.max(0.0001, 1 - explicitMarginPct / 100)
  const divisorActiveCost = Math.max(0.0001, baseCostMultiplicativeTaxFactor * marginFactorActive)
  const costAnchor = unitCost > 0 ? unitCost : product.cost || 0
  const activeSalePrice = Math.round((costAnchor / divisorActiveCost) * 100) / 100

  // No modo Custo + Margem, derivar a Receita Líquida resultante do preço praticado:
  // RL implícita = Preço de Venda × divisor do gross-up multiplicativo
  const implicitNetRevenue = Math.round(activeSalePrice * baseLiquidDivisor * 100) / 100

  // Margem líquida apurada
  const grossProfitActive = Math.round((implicitNetRevenue - costAnchor) * 100) / 100
  let activeLle = grossProfitActive
  if (currentRegime === 'presumido') {
    const irpjBase = activeSalePrice * 0.08
    const irpj = Math.round(irpjBase * 0.15 * 100) / 100
    const csll = Math.round(activeSalePrice * 0.12 * 0.09 * 100) / 100
    activeLle = Math.round((grossProfitActive - (irpj + csll)) * 100) / 100
  } else if (currentRegime === 'real') {
    const baseReal = Math.max(0, grossProfitActive)
    const irpj = Math.round(baseReal * 0.15 * 100) / 100
    const csll = Math.round(baseReal * 0.09 * 100) / 100
    activeLle = Math.round((grossProfitActive - (irpj + csll)) * 100) / 100
  } else if (currentRegime === 'simples') {
    activeLle = grossProfitActive
  }
  const effectiveMarginPct =
    implicitNetRevenue > 0
      ? Math.round((activeLle / implicitNetRevenue) * 10000) / 100
      : explicitMarginPct

  const activeTriad: ModeTriadResult = {
    mode: 'cost_margin',
    modeLabel: 'Custo + Margem (Ativo)',
    anchorLabel: 'Custo Base Informado',
    anchorValue: costAnchor,
    anchorFormatted: `${formatBRL(costAnchor)} (${formatNumberBR(explicitMarginPct)}% margem)`,
    salePrice: activeSalePrice,
    salePriceFormatted: formatBRL(activeSalePrice),
    entryMarginPct: explicitMarginPct,
    entryMarginFormatted: `${formatNumberBR(explicitMarginPct)}%`,
    entryMarginLabel: 'Margem de Entrada',
    netMarginPct: effectiveMarginPct,
    netMarginFormatted: `${formatNumberBR(effectiveMarginPct)}%`,
    netMarginDerived: true,
    lle: activeLle,
    isViable: activeLle >= 0,
    notes: 'Âncora definida pelo custo de aquisição/produção com margem percentual direta.',
  }

  // MODO ALTERNATIVO: Receita Líquida
  // Se o produto tiver meta cadastrada em desiredNetRevenue, usa essa meta; caso contrário usa a implícita
  const altDesiredNetRev =
    activeRegimeDesiredNetRev > 0 ? activeRegimeDesiredNetRev : implicitNetRevenue

  const anexoCleanAlt = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const rbt12CleanAlt =
    effectiveSimplesRbt12 && effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0
  const pgdasCalcAlt = calculatePgdas(anexoCleanAlt, rbt12CleanAlt)

  const altChain = calculateLiquidDreChain({
    desiredNetRevenue: altDesiredNetRev,
    regime: currentRegime,
    effectiveSimplesRate: pgdasCalcAlt.aliquotaEfetiva,
    icmsRate: icmsRateMarkup || 0,
    customTaxesRate: customTaxesSum,
    variableExpensesRate: dvRate,
    unitCost: costAnchor,
    operatingExpensesUnit: 0,
    presumidoActivity: 'comercio',
  })

  const alternativeSalePrice = altChain.rbv
  const altLle = altChain.lle
  const altMarginPct = altChain.derivedMarginPct

  const alternativeTriad: ModeTriadResult = {
    mode: 'liquid',
    modeLabel: 'Receita Líquida (Alternativo)',
    anchorLabel:
      activeRegimeDesiredNetRev > 0
        ? 'Receita Líquida Alvo (RL)'
        : 'Receita Líquida Implícita (RL)',
    anchorValue: altDesiredNetRev,
    anchorFormatted: formatBRL(altDesiredNetRev),
    salePrice: alternativeSalePrice,
    salePriceFormatted: formatBRL(alternativeSalePrice),
    entryMarginPct: explicitMarginPct,
    entryMarginFormatted: `${formatNumberBR(explicitMarginPct)}%`,
    entryMarginLabel: 'Margem de Entrada (Custo+Margem)',
    netMarginPct: altMarginPct,
    netMarginFormatted: `${formatNumberBR(altMarginPct)}%`,
    netMarginDerived: true,
    lle: altLle,
    isViable: altChain.isViable,
    notes:
      'Calculado no modo Preço Líquido Desejado pela sua própria lógica multiplicativa (RL ÷ divisor de deduções).',
  }

  return {
    regime: currentRegime,
    regimeLabel: regimeLabels[currentRegime],
    productName: product.name || 'Produto',
    activeMode,
    hasValidData: true,
    activeTriad,
    alternativeTriad,
    unitCost: costAnchor,
    divisorActive: divisorActiveCost,
    divisorAlternative: baseLiquidDivisor,
  }
}

export function MarkupModeComparisonModal({
  open,
  onOpenChange,
  product,
  currentRegime,
  icmsRateMarkup,
  customTaxesMarkup = [],
  simplesAnexo,
  simplesRbt12,
  effectiveSimplesRbt12,
  totalVariableExpenseRate = 0,
}: MarkupModeComparisonModalProps) {
  const { purchasesItems, getPurchaseItemUnitNetCost } = useTaxContext()

  // Resolução segura de custo unitário para o regime atual
  const resolveUnitCost = (targetRegime: TaxRegime): number => {
    if (!product) return 0
    if (
      product.costOrigin !== 'manual' &&
      product.manualCostOverride === undefined &&
      product.purchaseItemId
    ) {
      const matched = purchasesItems?.find((pi) => pi.id === product.purchaseItemId)
      if (matched && getPurchaseItemUnitNetCost) {
        const uCost = getPurchaseItemUnitNetCost(matched, targetRegime)
        if (uCost > 0) return uCost
      }
    }
    return typeof product.cost === 'number' && Number.isFinite(product.cost) ? product.cost : 0
  }

  const comparison = useMemo(() => {
    if (!product) return null
    return computeMarkupModeComparison({
      product,
      currentRegime,
      icmsRateMarkup,
      customTaxesMarkup,
      simplesAnexo,
      simplesRbt12,
      effectiveSimplesRbt12,
      totalVariableExpenseRate,
      resolveUnitCost,
    })
  }, [
    product,
    currentRegime,
    icmsRateMarkup,
    customTaxesMarkup,
    simplesAnexo,
    simplesRbt12,
    effectiveSimplesRbt12,
    totalVariableExpenseRate,
    purchasesItems,
    getPurchaseItemUnitNetCost,
  ])

  if (!product || !comparison) return null

  const { activeTriad, alternativeTriad, regimeLabel, productName, activeMode } = comparison

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-slate-800 p-5 sm:p-6 text-slate-100 shadow-2xl">
        {/* Cabeçalho */}
        <DialogHeader className="border-b border-slate-800 pb-3.5 space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Comparação entre Modos de Precificação</span>
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500/15 text-orange-300 border border-orange-500/40 text-[11px] font-mono uppercase">
                {regimeLabel}
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs">
                {productName}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-400 font-mono">
            &ldquo;E se eu tivesse escolhido o outro modo?&rdquo; — Compare o resultado do modo
            ativo com o modo alternativo, exclusivamente para o regime{' '}
            <strong className="text-orange-300">{regimeLabel}</strong>, com base na premissa honesta
            de convergência de rentabilidade.
          </DialogDescription>
        </DialogHeader>

        {/* Aviso de Isolamento por Regime */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Esta janela é <strong>estritamente informativa</strong> e limitada ao regime selecionado
            (<strong className="text-orange-300 uppercase">{currentRegime}</strong>). Ela não altera
            o cálculo ativo, o preço sugerido do card, as DREs ou qualquer estado do sistema. O modo
            selecionado continua governando todas as integrações.
          </span>
        </div>

        {/* Motivo honesto caso faltem dados */}
        {!comparison.hasValidData && comparison.invalidReason && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Dados insuficientes para cálculo honesto</span>
            </div>
            <p className="text-slate-300 text-[11px]">{comparison.invalidReason}</p>
          </div>
        )}

        {/* Cards Lado a Lado: Modo Ativo vs Modo Alternativo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Card 1: Modo Ativo */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/[0.08] to-slate-950 border-2 border-emerald-500/50 space-y-3.5 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                {activeMode === 'liquid' ? (
                  <Target className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Layers className="w-4 h-4 text-sky-400" />
                )}
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                  {activeTriad.modeLabel}
                </span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono">
                Ativo
              </Badge>
            </div>

            {/* Tríade do Modo Ativo */}
            <div className="space-y-2.5 text-xs font-mono">
              {/* 1. Âncora Usada */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                  1. Âncora Utilizada
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-300 text-[11px]">{activeTriad.anchorLabel}:</span>
                  <span className="text-sm font-bold text-white">
                    {activeTriad.anchorFormatted}
                  </span>
                </div>
              </div>

              {/* 2. Preço de Venda Resultante */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
                <span className="text-[10px] uppercase text-emerald-400 block font-semibold">
                  2. Preço de Venda Resultante
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-300 text-[11px]">Preço Sugerido (PV):</span>
                  <span className="text-base font-black text-emerald-400">
                    {activeTriad.salePriceFormatted}
                  </span>
                </div>
              </div>

              {/* 3. Margens: Entrada e Líquida Apurada */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                  3. Margens do Modo
                </span>
                {/* Linha A: Margem de Entrada */}
                {activeTriad.entryMarginFormatted && (
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-slate-300">
                      {activeTriad.entryMarginLabel || 'Margem de entrada'}:
                    </span>
                    <span className="font-bold text-sky-300">
                      {activeTriad.entryMarginFormatted}
                    </span>
                  </div>
                )}
                {/* Linha B: Margem Líquida Apurada (canônica: pós-IRPJ/CSLL sobre RL aditiva) */}
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Margem líquida apurada:</span>
                  <span className="text-sm font-bold text-amber-300">
                    {activeTriad.netMarginFormatted}
                  </span>
                </div>
                {activeTriad.lle !== undefined && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-850">
                    <span>Lucro Líquido (LLE):</span>
                    <span
                      className={
                        (activeTriad.lle || 0) >= 0
                          ? 'text-emerald-300 font-bold'
                          : 'text-rose-400 font-bold'
                      }
                    >
                      {formatBRL(activeTriad.lle || 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-mono italic">{activeTriad.notes}</p>
          </div>

          {/* Card 2: Modo Alternativo */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-500/[0.08] to-slate-950 border-2 border-sky-500/40 space-y-3.5 shadow-lg shadow-sky-500/5">
            <div className="flex items-center justify-between border-b border-sky-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                {activeMode === 'liquid' ? (
                  <Layers className="w-4 h-4 text-sky-400" />
                ) : (
                  <Target className="w-4 h-4 text-emerald-400" />
                )}
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300">
                  {alternativeTriad?.modeLabel || 'Modo Alternativo'}
                </span>
              </div>
              <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/40 text-[10px] font-mono">
                Alternativo &ldquo;E se?&rdquo;
              </Badge>
            </div>

            {/* Tríade do Modo Alternativo */}
            {alternativeTriad ? (
              <div className="space-y-2.5 text-xs font-mono">
                {/* 1. Âncora Usada */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                    1. Âncora Alternativa (Premissa Honesta)
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-300 text-[11px]">
                      {alternativeTriad.anchorLabel}:
                    </span>
                    <span className="text-sm font-bold text-white">
                      {alternativeTriad.anchorFormatted}
                    </span>
                  </div>
                </div>

                {/* 2. Preço de Venda Resultante */}
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-0.5">
                  <span className="text-[10px] uppercase text-sky-300 block font-semibold">
                    2. Preço de Venda Resultante
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-300 text-[11px]">Preço Sugerido (PV):</span>
                    <span className="text-base font-black text-sky-300">
                      {alternativeTriad.salePriceFormatted}
                    </span>
                  </div>
                </div>

                {/* 3. Margens: Entrada e Líquida Apurada */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                    3. Margens do Modo
                  </span>
                  {/* Linha A: Margem de Entrada */}
                  {alternativeTriad.entryMarginFormatted && (
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="text-slate-300">
                        {alternativeTriad.entryMarginLabel || 'Margem de entrada'}:
                      </span>
                      <span className="font-bold text-sky-300">
                        {alternativeTriad.entryMarginFormatted}
                      </span>
                    </div>
                  )}
                  {/* Linha B: Margem Líquida Apurada (canônica: pós-IRPJ/CSLL sobre RL aditiva) */}
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">Margem líquida apurada:</span>
                    <span className="text-sm font-bold text-amber-300">
                      {alternativeTriad.netMarginFormatted}
                    </span>
                  </div>
                  {alternativeTriad.lle !== undefined && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-850">
                      <span>Lucro Líquido (LLE):</span>
                      <span
                        className={
                          (alternativeTriad.lle || 0) >= 0
                            ? 'text-sky-300 font-bold'
                            : 'text-rose-400 font-bold'
                        }
                      >
                        {formatBRL(alternativeTriad.lle || 0)}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 font-mono italic">
                  {alternativeTriad.notes}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400">
                Dados insuficientes para apurar o modo alternativo.
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Síntese Comparativa da Tríade */}
        {alternativeTriad && (
          <div className="rounded-xl border border-slate-800 overflow-hidden font-mono text-xs">
            <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                Síntese Comparativa da Tríade ({regimeLabel})
              </span>
              <span className="text-[10px] text-slate-400">Valores unitários</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Dimensão da Tríade</th>
                    <th className="py-2 px-3 font-semibold text-emerald-300">
                      Modo Ativo (
                      {activeTriad.mode === 'liquid' ? 'Receita Líquida' : 'Custo + Margem'})
                    </th>
                    <th className="py-2 px-3 font-semibold text-sky-300">
                      Modo Alternativo (
                      {alternativeTriad.mode === 'liquid' ? 'Receita Líquida' : 'Custo + Margem'})
                    </th>
                    <th className="py-2 px-3 font-semibold text-slate-300 text-center">
                      Convergência
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/60 text-slate-200">
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-400">Âncora adotada</td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {activeTriad.anchorFormatted}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-sky-200">
                      {alternativeTriad.anchorFormatted}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] text-slate-400">
                        {activeMode === 'liquid' ? 'Meta Líquida vs CMV' : 'Custo vs Meta Derivada'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-400">Preço de Venda (PV)</td>
                    <td className="py-2.5 px-3 font-black text-emerald-400 text-sm">
                      {activeTriad.salePriceFormatted}
                    </td>
                    <td className="py-2.5 px-3 font-black text-sky-300 text-sm">
                      {alternativeTriad.salePriceFormatted}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {activeTriad.salePrice > 0 && alternativeTriad.salePrice > 0 ? (
                        Math.abs(activeTriad.salePrice - alternativeTriad.salePrice) < 0.05 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Exato (100%)
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-300 font-mono">
                            Δ{' '}
                            {formatBRL(
                              Math.abs(activeTriad.salePrice - alternativeTriad.salePrice),
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                  {/* Linha Margem de Entrada */}
                  {(activeTriad.entryMarginFormatted || alternativeTriad.entryMarginFormatted) && (
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-400">Margem de entrada</td>
                      <td className="py-2.5 px-3 font-bold text-sky-300">
                        {activeTriad.entryMarginFormatted || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-sky-300">
                        {alternativeTriad.entryMarginFormatted || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] text-slate-400">
                          {activeMode === 'liquid' ? 'Equivalente real' : 'Informada vs Implícita'}
                        </span>
                      </td>
                    </tr>
                  )}
                  {/* Linha Margem Líquida Apurada (canônica) */}
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-400">
                      Margem líquida apurada
                      <span className="block text-[9px] text-slate-500 font-normal">
                        (pós-IRPJ/CSLL sobre RL aditiva)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">
                      {activeTriad.netMarginFormatted}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">
                      {alternativeTriad.netMarginFormatted}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Métrica canônica
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Premissa Honesta Explicada */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-200 font-bold">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Independência lógica entre os modos de precificação</span>
          </div>
          <p>
            Os resultados advindos dos cálculos de <strong>Preço de Vendas Líquido</strong> e{' '}
            <strong>Custo + Margem</strong> são independentes e seguem cada um sua própria lógica
            multiplicativa: o modo <strong>Custo + Margem</strong> divide o custo pelo produto de
            todos os fatores (inclusive margem), enquanto o modo{' '}
            <strong>Preço Líquido Desejado</strong> divide a receita líquida exclusivamente pelos
            fatores de dedução (tributos e DV). Exibem-se os dois preços reais e a diferença Δ entre
            eles com total transparência matemática.
          </p>
        </div>

        {/* Rodapé com botão de Fechar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
          <span className="text-[10px] font-mono text-slate-500">
            Regime ativo fixado: <strong>{regimeLabel}</strong> · Sistema em conformidade integral
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            Fechar janela
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
