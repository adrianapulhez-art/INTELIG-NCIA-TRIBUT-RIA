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

  // Divisores base de cada regime (modo liquid: aditivo (1 - tributos - DV); modo custo+margem: decomposto)
  let baseLiquidDivisor = 0.7085
  let baseCostMultiplicativeTaxFactor = 1

  if (currentRegime === 'simples') {
    const anexoClean = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
    const rbt12Clean =
      effectiveSimplesRbt12 && effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0
    const pgdasRes = calculatePgdas(anexoClean, rbt12Clean)
    const effectiveSimplesRate = pgdasRes.aliquotaEfetiva
    const totalSimplesTaxRate = effectiveSimplesRate + customTaxesSum
    baseLiquidDivisor = Math.max(0.0001, 1 - (totalSimplesTaxRate + dvRate) / 100)
    baseCostMultiplicativeTaxFactor =
      (1 - effectiveSimplesRate / 100) * customTaxesFactor * (dvFactor > 0 ? dvFactor : 1)
  } else if (currentRegime === 'presumido') {
    const icms = Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0
    const totalPresumidoTaxRate = icms + 0.65 + 3.0 + customTaxesSum
    baseLiquidDivisor = Math.max(0.0001, 1 - (totalPresumidoTaxRate + dvRate) / 100)
    const icmsFactor = 1 - icms / 100
    const pisFactor = 1 - 0.0065
    const cofinsFactor = 1 - 0.03
    baseCostMultiplicativeTaxFactor =
      icmsFactor * pisFactor * cofinsFactor * customTaxesFactor * (dvFactor > 0 ? dvFactor : 1)
  } else {
    // Lucro Real
    const icms = Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0
    const totalRealTaxRate = icms + 1.65 + 7.6 + customTaxesSum
    baseLiquidDivisor = Math.max(0.0001, 1 - (totalRealTaxRate + dvRate) / 100)
    const icmsFactor = 1 - icms / 100
    const pisFactor = 1 - 0.0165
    const cofinsFactor = 1 - 0.076
    baseCostMultiplicativeTaxFactor =
      icmsFactor * pisFactor * cofinsFactor * customTaxesFactor * (dvFactor > 0 ? dvFactor : 1)
  }

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
      netMarginPct: product.margin || 0,
      netMarginFormatted: `${formatNumberBR(product.margin || 0)}%`,
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
  if (activeMode === 'liquid' && (!product.desiredNetRevenue || product.desiredNetRevenue <= 0)) {
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
    const desiredNetRevenue = product.desiredNetRevenue || 0
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

    // MODO ALTERNATIVO: Custo + Margem com a PREMISSA HONESTA da usuária:
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
          netMarginPct: implicitMarginPct,
          netMarginFormatted: `${formatNumberBR(implicitMarginPct)}% (implícita)`,
          netMarginDerived: false,
          notes:
            'Para simular o modo alternativo Custo + Margem, cadastre o custo da mercadoria ou importe os itens da Calculadora de Compras.',
        },
        unitCost: 0,
        divisorActive: baseLiquidDivisor,
        divisorAlternative: baseCostMultiplicativeTaxFactor,
      }
    }

    // Calcula preço pelo modo Custo + Margem usando a margem implícita honesta
    // Divisor alternativo = baseCostMultiplicativeTaxFactor * (1 - implicitMarginPct / 100)
    // Se a margem for muito alta (>= 100%) ou negativa, trata com segurança matemática
    const safeMarginFactor = Math.max(0.0001, 1 - implicitMarginPct / 100)
    const divisorAlt = Math.max(0.0001, baseCostMultiplicativeTaxFactor * safeMarginFactor)
    const alternativeSalePrice = Math.round((unitCost / divisorAlt) * 100) / 100

    const alternativeTriad: ModeTriadResult = {
      mode: 'cost_margin',
      modeLabel: 'Custo + Margem (Alternativo)',
      anchorLabel: 'Custo Unitário + Margem Implícita',
      anchorValue: unitCost,
      anchorFormatted: `${formatBRL(unitCost)} (+ ${formatNumberBR(implicitMarginPct)}% margem)`,
      salePrice: alternativeSalePrice,
      salePriceFormatted: formatBRL(alternativeSalePrice),
      netMarginPct: implicitMarginPct,
      netMarginFormatted: `${formatNumberBR(implicitMarginPct)}% (convergente)`,
      netMarginDerived: false,
      notes:
        'Calculado com o CMV apurado no regime e a margem implícita derivada da meta líquida ativa.',
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
  const explicitMarginPct = product.margin || 0
  const marginFactorActive = Math.max(0.0001, 1 - explicitMarginPct / 100)
  const divisorActiveCost = Math.max(0.0001, baseCostMultiplicativeTaxFactor * marginFactorActive)
  const costAnchor = unitCost > 0 ? unitCost : product.cost || 0
  const activeSalePrice = Math.round((costAnchor / divisorActiveCost) * 100) / 100

  // No modo Custo + Margem, derivar a Receita Líquida resultante do preço praticado:
  // RL implícita = Preço de Venda × divisor do gross-up (1 - Σtributos - %DV)
  const implicitNetRevenue = Math.round(activeSalePrice * baseLiquidDivisor * 100) / 100

  // Margem líquida real apurada sobre a RL ou sobre a venda
  // LLE estimado = RL implícita - CMV
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
    netMarginPct: explicitMarginPct,
    netMarginFormatted: `${formatNumberBR(explicitMarginPct)}%`,
    netMarginDerived: false,
    lle: activeLle,
    isViable: activeLle >= 0,
    notes: 'Âncora definida pelo custo de aquisição/produção com margem percentual direta.',
  }

  // MODO ALTERNATIVO: Receita Líquida (usando a meta líquida implícita honesta)
  // Gross-up da meta líquida: RBV = RL implícita ÷ baseLiquidDivisor
  const alternativeSalePrice =
    baseLiquidDivisor > 0 ? Math.round((implicitNetRevenue / baseLiquidDivisor) * 100) / 100 : 0

  const alternativeTriad: ModeTriadResult = {
    mode: 'liquid',
    modeLabel: 'Receita Líquida (Alternativo)',
    anchorLabel: 'Receita Líquida Implícita (RL)',
    anchorValue: implicitNetRevenue,
    anchorFormatted: formatBRL(implicitNetRevenue),
    salePrice: alternativeSalePrice,
    salePriceFormatted: formatBRL(alternativeSalePrice),
    netMarginPct: effectiveMarginPct,
    netMarginFormatted: `${formatNumberBR(effectiveMarginPct)}% (derivada)`,
    netMarginDerived: true,
    lle: activeLle,
    isViable: activeLle >= 0,
    notes:
      'Calculado a partir da receita líquida que o preço do modo Custo + Margem produz, convergindo no mesmo nível de preço e rentabilidade.',
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

              {/* 3. Margem Líquida Resultante */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                  3. Margem Líquida Resultante
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-300 text-[11px]">
                    {activeTriad.netMarginDerived ? 'Margem Líquida Derivada:' : 'Margem de Lucro:'}
                  </span>
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

                {/* 3. Margem Líquida Resultante */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                    3. Margem Líquida Resultante
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-300 text-[11px]">
                      {alternativeTriad.netMarginDerived
                        ? 'Margem Líquida Derivada:'
                        : 'Margem Implícita Adotada:'}
                    </span>
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
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-400">Margem Líquida</td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">
                      {activeTriad.netMarginFormatted}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">
                      {alternativeTriad.netMarginFormatted}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Mesmo patamar
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
            <span>Como funciona a premissa honesta de comparação?</span>
          </div>
          <p>
            {activeMode === 'liquid' ? (
              <>
                Como o modo ativo é <strong>Receita Líquida</strong>, a calculadora parte da sua
                meta líquida ({activeTriad.anchorFormatted}) e gera o preço de venda e a margem de
                rentabilidade resultante ({activeTriad.netMarginFormatted}). O modo alternativo
                aplica exatamente essa mesma margem implícita sobre o custo da mercadoria (
                {formatBRL(comparison.unitCost)}), mostrando como a precificação convergiria para o
                mesmo patamar de rentabilidade.
              </>
            ) : (
              <>
                Como o modo ativo é <strong>Custo + Margem</strong>, a calculadora parte do custo e
                embute a margem informada ({activeTriad.netMarginFormatted}). O modo alternativo
                extrai a meta líquida implícita que esse preço gera (
                {alternativeTriad?.anchorFormatted}) e a adota como âncora, permitindo comparar os
                dois caminhos sob a mesma ótica financeira.
              </>
            )}
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
