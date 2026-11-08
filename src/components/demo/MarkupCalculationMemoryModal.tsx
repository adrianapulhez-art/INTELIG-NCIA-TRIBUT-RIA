import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Calculator,
  Info,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  Percent,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { formatBRL, formatNumberBR, formatPercentBR, formatFactorBR } from '@/lib/taxCalculations'
import { calculatePgdas, SimplesAnexoId, SIMPLES_ANEXOS } from '@/lib/simplesCalculations'
import { calculateLiquidDreChain } from '@/lib/liquidMarkupCalculations'
import {
  calcularMarkupDivisorPre,
  precoPeloDivisorPre,
  decomporPrecoVendaPre,
  type MarkupPreRegime,
} from '@/lib/markupPreDivisor'
import {
  MarkupProductItem,
  TaxRegime,
  CustomTaxItem,
  VariableExpenseItem,
  SimplesScenarioKey,
  useTaxContext,
} from '@/contexts/TaxContext'

export interface MarkupCalculationMemoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: MarkupProductItem | null
  currentRegime: TaxRegime
  icmsRateMarkup: number
  customTaxesMarkup: CustomTaxItem[]
  simplesAnexo: string
  simplesRbt12: number
  simplesIsInicioAtividade?: boolean
  // Novos campos enriquecidos da Portas 1 e 2 e Despesas Variáveis
  simplesIsActiveMoreThan12m?: boolean
  simplesActivityMonths?: number
  simplesMonthlyProjectedRevenue?: number
  simplesSelectedScenario?: SimplesScenarioKey
  effectiveSimplesRbt12?: number
  variableExpenses?: VariableExpenseItem[]
  totalVariableExpenseRate?: number
}

export function MarkupCalculationMemoryModal({
  open,
  onOpenChange,
  product,
  currentRegime,
  icmsRateMarkup,
  customTaxesMarkup = [],
  simplesAnexo,
  simplesRbt12,
  simplesIsInicioAtividade,
  simplesIsActiveMoreThan12m = false,
  simplesActivityMonths = 1,
  simplesMonthlyProjectedRevenue = 20000,
  simplesSelectedScenario = 'moderado',
  effectiveSimplesRbt12: effectiveRbt12Prop,
  variableExpenses = [],
  totalVariableExpenseRate = 0,
}: MarkupCalculationMemoryModalProps) {
  const { purchasesItems, getPurchaseItemUnitNetCost } = useTaxContext()

  // Aba ativa de regime (padrão inicia no regime atual da empresa)
  const [activeTab, setActiveTab] = useState<TaxRegime>(currentRegime)

  // Atualiza tab se o regime ativo mudar enquanto o modal estiver abrindo
  React.useEffect(() => {
    if (open) {
      setActiveTab(currentRegime)
    }
  }, [open, currentRegime])

  if (!product) return null

  // 1. Dados base do produto
  const isLiquid = product.mode === 'liquid'

  // Determinar o custo real unitário do produto de acordo com o regime (presumido, real ou simples)
  // Se o produto estiver vinculado a item de compras e não tiver override manual, busca o custo unitário líquido do regime
  const resolveRegimeUnitCost = (targetRegime: TaxRegime): number => {
    if (
      product.costOrigin !== 'manual' &&
      product.manualCostOverride === undefined &&
      product.purchaseItemId
    ) {
      const itemsList = purchasesItems
      const matched = itemsList?.find((pi) => pi.id === product.purchaseItemId)
      if (matched && getPurchaseItemUnitNetCost) {
        const uCost = getPurchaseItemUnitNetCost(matched, targetRegime)
        if (uCost > 0) return uCost
      }
    }
    return typeof product.cost === 'number' && Number.isFinite(product.cost) ? product.cost : 0
  }

  const costSimples = resolveRegimeUnitCost('simples')
  const costPresumido = resolveRegimeUnitCost('presumido')
  const costReal = resolveRegimeUnitCost('real')

  // Motor da Cadeia da DRE Líquida (Item 5 do escopo)
  const customTaxesSum = customTaxesMarkup.reduce((acc, t) => acc + (t.rate || 0), 0)
  const effectiveCostForLiquidChain = resolveRegimeUnitCost(currentRegime)

  const desiredNetRevenueSimples =
    product.desiredNetRevenueByRegime?.simples ?? (product.desiredNetRevenue || 0)
  const desiredNetRevenuePresumido =
    product.desiredNetRevenueByRegime?.presumido ?? (product.desiredNetRevenue || 0)
  const desiredNetRevenueReal =
    product.desiredNetRevenueByRegime?.real ?? (product.desiredNetRevenue || 0)

  const liquidChainSimples = isLiquid
    ? calculateLiquidDreChain({
        desiredNetRevenue: desiredNetRevenueSimples,
        regime: 'simples',
        effectiveSimplesRate: calculatePgdas(
          (simplesAnexo as SimplesAnexoId) || 'anexo_1',
          effectiveRbt12Prop && effectiveRbt12Prop > 0 ? effectiveRbt12Prop : simplesRbt12 || 0,
        ).aliquotaEfetiva,
        icmsRate: icmsRateMarkup || 0,
        customTaxesRate: customTaxesSum,
        variableExpensesRate: totalVariableExpenseRate || 0,
        unitCost: costSimples,
        operatingExpensesUnit: 0,
        presumidoActivity: 'comercio',
      })
    : null

  const liquidChainPresumido = isLiquid
    ? calculateLiquidDreChain({
        desiredNetRevenue: desiredNetRevenuePresumido,
        regime: 'presumido',
        effectiveSimplesRate: 0,
        icmsRate: icmsRateMarkup || 0,
        customTaxesRate: customTaxesSum,
        variableExpensesRate: totalVariableExpenseRate || 0,
        unitCost: costPresumido,
        operatingExpensesUnit: 0,
        presumidoActivity: 'comercio',
      })
    : null

  const liquidChainReal = isLiquid
    ? calculateLiquidDreChain({
        desiredNetRevenue: desiredNetRevenueReal,
        regime: 'real',
        effectiveSimplesRate: 0,
        icmsRate: icmsRateMarkup || 0,
        customTaxesRate: customTaxesSum,
        variableExpensesRate: totalVariableExpenseRate || 0,
        unitCost: costReal,
        operatingExpensesUnit: 0,
        presumidoActivity: 'comercio',
      })
    : null

  // Cadeia correspondente ao regime atualmente ativo
  const activeRegimeChain =
    currentRegime === 'simples'
      ? liquidChainSimples
      : currentRegime === 'presumido'
        ? liquidChainPresumido
        : liquidChainReal
  const baseCost =
    typeof product.cost === 'number' && Number.isFinite(product.cost) ? product.cost : 0
  const activeDesiredNetRev =
    product.desiredNetRevenueByRegime?.[currentRegime] ??
    (typeof product.desiredNetRevenue === 'number' && Number.isFinite(product.desiredNetRevenue)
      ? product.desiredNetRevenue
      : 0)
  const desiredNetRevenue = activeDesiredNetRev
  const baseValue = isLiquid ? desiredNetRevenue : baseCost

  const activeMarginByRegime =
    product.marginByRegime?.[currentRegime] ??
    (typeof product.margin === 'number' && Number.isFinite(product.margin) ? product.margin : 0)
  const marginPct = activeMarginByRegime
  const marginDecimal = marginPct / 100
  const marginFactor = 1 - marginDecimal

  const quantity =
    typeof product.quantity === 'number' && Number.isFinite(product.quantity)
      ? Math.max(0, product.quantity)
      : 0

  // Origem do custo
  const costOrigin = product.costOrigin || (product.purchaseItemId ? 'purchases' : 'manual')
  const costOriginLabel =
    costOrigin === 'manual' || product.manualCostOverride !== undefined
      ? 'Manual (editado pelo usuário)'
      : 'Compras líquidas do regime'

  // Despesas Variáveis
  const dvRate =
    typeof totalVariableExpenseRate === 'number' && Number.isFinite(totalVariableExpenseRate)
      ? totalVariableExpenseRate
      : variableExpenses.reduce((sum, item) => sum + (item.rate || 0), 0)
  const dvDecimal = dvRate / 100
  const dvFactor = 1 - dvDecimal

  // Tributos customizados
  let customTaxesFactor = 1
  for (const ct of customTaxesMarkup) {
    customTaxesFactor *= 1 - (ct.rate || 0) / 100
  }

  // -------------------------------------------------------------
  // SIMPLES NACIONAL — Cálculos
  // -------------------------------------------------------------
  const anexoIdClean = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const anexoConfig = SIMPLES_ANEXOS[anexoIdClean] || SIMPLES_ANEXOS.anexo_1

  // Determinar RBT12 real a ser exibida:
  // Se Porta 1 (!simplesIsActiveMoreThan12m):
  //   - Se activityMonths <= 1: mensal * 12
  //   - Se activityMonths 2 a 12: proporcional art. 2º da LC 123/2006: (receitas acumuladas * 12) / meses
  // Se Porta 2 (simplesIsActiveMoreThan12m): simplesRbt12
  let calculatedRbt12 = 0
  if (!simplesIsActiveMoreThan12m) {
    if (effectiveRbt12Prop !== undefined && effectiveRbt12Prop > 0) {
      calculatedRbt12 = effectiveRbt12Prop
    } else {
      const monthly = Math.max(0, simplesMonthlyProjectedRevenue || 0)
      const months = Math.max(1, Math.min(12, simplesActivityMonths || 1))
      calculatedRbt12 =
        months <= 1 ? monthly * 12 : Math.round(((monthly * months * 12) / months) * 100) / 100
    }
  } else {
    calculatedRbt12 = (simplesRbt12 || 0) > 0 ? simplesRbt12 : 0
  }

  const isFallbackRbt12 = calculatedRbt12 <= 0
  const effectiveRbt12ForCalculation = calculatedRbt12

  // Apuração legal LC 123/2006
  const pgdasResult = calculatePgdas(anexoIdClean, effectiveRbt12ForCalculation)
  const effectiveSimplesRate = pgdasResult.aliquotaEfetiva
  const effectiveSimplesDecimal = effectiveSimplesRate / 100
  const dasTaxFactor = 1 - effectiveSimplesDecimal

  // Partilha ICMS da faixa detectada
  const faixaIndex = Math.max(
    0,
    Math.min(pgdasResult.faixaNumero - 1, anexoConfig.faixas.length - 1),
  )
  const faixaDetectada = anexoConfig.faixas[faixaIndex]
  const icmsPartilhaPct = faixaDetectada?.partilha.icms ?? 34
  const icmsIntegradoRate = pgdasResult.reparticao.icmsRate

  // Soma de tributos customizados em percentual
  const sumCustomTaxesRate = customTaxesMarkup.reduce((acc, t) => acc + (t.rate || 0), 0)

  // Preços Canônicos por Regime gravados pelo motor TaxContext
  const canonicalSalePriceSimples =
    product.salePriceByRegime?.simples ??
    (isLiquid
      ? product.salePriceLiquidByRegime?.simples
      : product.salePriceCostMarginByRegime?.simples) ??
    (currentRegime === 'simples' ? product.salePrice : 0) ??
    0

  const canonicalSalePricePresumido =
    product.salePriceByRegime?.presumido ??
    (isLiquid
      ? product.salePriceLiquidByRegime?.presumido
      : product.salePriceCostMarginByRegime?.presumido) ??
    (currentRegime === 'presumido' ? product.salePrice : 0) ??
    0

  const canonicalSalePriceReal =
    product.salePriceByRegime?.real ??
    (isLiquid
      ? product.salePriceLiquidByRegime?.real
      : product.salePriceCostMarginByRegime?.real) ??
    (currentRegime === 'real' ? product.salePrice : 0) ??
    0

  const customTaxesArray: number[] = customTaxesMarkup.map((t) =>
    Number.isFinite(t.rate) ? t.rate : 0,
  )
  const icmsRateClean = Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0

  // Motor único pré-reforma com divisor aditivo
  const divisorResSimples = calcularMarkupDivisorPre({
    regime: 'simples',
    dasEfetivoPct: effectiveSimplesRate,
    customTaxesPct: customTaxesArray,
    dvRatePct: dvRate,
    marginPct,
    comMargem: !isLiquid,
  })
  const divisorSimples = divisorResSimples.divisor

  const divisorResPresumido = calcularMarkupDivisorPre({
    regime: 'presumido',
    icmsRatePct: icmsRateClean,
    customTaxesPct: customTaxesArray,
    dvRatePct: dvRate,
    marginPct,
    comMargem: !isLiquid,
  })
  const divisorPresumido = divisorResPresumido.divisor

  const divisorResReal = calcularMarkupDivisorPre({
    regime: 'real',
    icmsRatePct: icmsRateClean,
    customTaxesPct: customTaxesArray,
    dvRatePct: dvRate,
    marginPct,
    comMargem: !isLiquid,
  })
  const divisorReal = divisorResReal.divisor

  // Preço Sugerido canônico Simples
  const fallbackSimplesPrice = precoPeloDivisorPre(baseValue, divisorSimples)
  const salePriceSimples =
    canonicalSalePriceSimples > 0 ? canonicalSalePriceSimples : fallbackSimplesPrice
  const totalRevenueSimples = Math.round(salePriceSimples * quantity * 100) / 100

  const pvSimples = salePriceSimples
  const custoBaseSimples = isLiquid ? costSimples : baseValue
  const decomposicaoSimples = decomporPrecoVendaPre(pvSimples, custoBaseSimples, divisorResSimples)
  const valorDasSimples = decomposicaoSimples.valorTributos
  const valorDvSimples = decomposicaoSimples.valorDv
  const valorMargemSimples = decomposicaoSimples.valorLucroMargem

  // -------------------------------------------------------------
  // LUCRO PRESUMIDO — Cálculos Canônicos
  // -------------------------------------------------------------
  const pisPresumidoRate = 0.65
  const cofinsPresumidoRate = 3.0
  const totalTaxesPresumidoRate = divisorResPresumido.somaTributosPct

  const fallbackPresumidoPrice = precoPeloDivisorPre(baseValue, divisorPresumido)
  const salePricePresumido =
    canonicalSalePricePresumido > 0 ? canonicalSalePricePresumido : fallbackPresumidoPrice
  const totalRevenuePresumido = Math.round(salePricePresumido * quantity * 100) / 100

  const pvPresumido = salePricePresumido
  const custoBasePresumido = isLiquid ? costPresumido : baseValue
  const decomposicaoPresumido = decomporPrecoVendaPre(
    pvPresumido,
    custoBasePresumido,
    divisorResPresumido,
  )
  const valorIcmsPresumido =
    decomposicaoPresumido.detalheTributos.find((t) => t.nome === 'ICMS')?.valor ??
    Math.round(pvPresumido * (icmsRateClean / 100) * 100) / 100
  const valorPisPresumido =
    decomposicaoPresumido.detalheTributos.find((t) => t.nome === 'PIS')?.valor ??
    Math.round(pvPresumido * 0.0065 * 100) / 100
  const valorCofinsPresumido =
    decomposicaoPresumido.detalheTributos.find((t) => t.nome === 'COFINS')?.valor ??
    Math.round(pvPresumido * 0.03 * 100) / 100
  const valorTributosPresumido = decomposicaoPresumido.valorTributos
  const valorDvPresumido = decomposicaoPresumido.valorDv
  const valorMargemPresumido = decomposicaoPresumido.valorLucroMargem

  // -------------------------------------------------------------
  // LUCRO REAL — Cálculos Canônicos
  // -------------------------------------------------------------
  const pisRealRate = 1.65
  const cofinsRealRate = 7.6
  const totalTaxesRealRate = divisorResReal.somaTributosPct

  const fallbackRealPrice = precoPeloDivisorPre(baseValue, divisorReal)
  const salePriceReal = canonicalSalePriceReal > 0 ? canonicalSalePriceReal : fallbackRealPrice
  const totalRevenueReal = Math.round(salePriceReal * quantity * 100) / 100

  const pvReal = salePriceReal
  const custoBaseReal = isLiquid ? costReal : baseValue
  const decomposicaoReal = decomporPrecoVendaPre(pvReal, custoBaseReal, divisorResReal)
  const valorIcmsReal =
    decomposicaoReal.detalheTributos.find((t) => t.nome === 'ICMS')?.valor ??
    Math.round(pvReal * (icmsRateClean / 100) * 100) / 100
  const valorPisReal =
    decomposicaoReal.detalheTributos.find((t) => t.nome === 'PIS')?.valor ??
    Math.round(pvReal * 0.0165 * 100) / 100
  const valorCofinsReal =
    decomposicaoReal.detalheTributos.find((t) => t.nome === 'COFINS')?.valor ??
    Math.round(pvReal * 0.076 * 100) / 100
  const valorTributosReal = decomposicaoReal.valorTributos
  const valorDvReal = decomposicaoReal.valorDv
  const valorMargemReal = decomposicaoReal.valorLucroMargem

  // Valores ativos do produto no regime corrente
  const activeSalePrice = product.salePrice || 0
  const activeCompleteFactor = product.completeFactor || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 p-5 sm:p-7 shadow-2xl">
        {/* Cabeçalho */}
        <DialogHeader className="border-b border-slate-200 pb-3.5 space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-center text-[#b87c14]">
                <Calculator className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-[#261502] flex items-center gap-2">
                <span>Memória de Cálculo do Preço Sugerido</span>
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-50 text-[#261502] border border-amber-300 font-mono text-xs">
                {product.name || 'Produto'}
              </Badge>
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-mono text-[11px]">
                12 Blocos
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500 font-mono">
            Subcamada analítica: história completa do cálculo em 12 blocos numerados com valores
            reais do estado, formação do Markup divisor aditivo e seção técnica de Blindagem de
            Margem.
          </DialogDescription>
        </DialogHeader>
        {/* Resumo Base do Produto */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono shadow-xs">
            <span className="text-[10px] text-slate-500 block uppercase">
              {isLiquid ? 'Receita Líquida' : 'Custo Unitário'}
            </span>
            <span className="text-sm font-bold text-[#b87c14]">{formatBRL(baseValue)}</span>
            <span
              className="text-[10px] text-slate-500 block mt-0.5 truncate"
              title={costOriginLabel}
            >
              {costOrigin === 'manual' ? 'Manual' : 'Via Compras'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono shadow-xs">
            <span className="text-[10px] text-slate-500 block uppercase">
              {isLiquid ? 'Margem Derivada' : 'Margem Desejada'}
            </span>
            <span className="text-sm font-bold text-amber-800">
              {isLiquid
                ? activeRegimeChain
                  ? `${formatNumberBR(activeRegimeChain.derivedMarginPct)}%`
                  : formatPercentBR(marginPct)
                : formatPercentBR(marginPct)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isLiquid
                ? 'Derivada da Receita Líquida'
                : `Fator: ${formatFactorBR(marginFactor, 4)}`}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono shadow-xs">
            <span className="text-[10px] text-slate-500 block uppercase">Regime Ativo</span>
            <span className="text-sm font-bold text-slate-800 uppercase">{currentRegime}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              DV total: {formatPercentBR(dvRate)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 font-mono shadow-xs">
            <span className="text-[10px] text-[#b87c14] block uppercase font-semibold">
              Preço Sugerido Ativo
            </span>
            <span className="text-sm font-black text-[#261502]">{formatBRL(activeSalePrice)}</span>
            <span className="text-[10px] text-[#b87c14] block mt-0.5">
              Divisor: {formatFactorBR(activeCompleteFactor, 4)}
            </span>
          </div>
        </div>
        {/* Abas dos 3 Regimes */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-700 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#b87c14]" />
              Selecione o regime para visualizar os 12 blocos:
            </span>
            <span className="text-[11px] font-mono text-slate-500">Cálculo com valores reais</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('simples')}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                activeTab === 'simples'
                  ? 'bg-amber-50 border-amber-300 text-slate-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-[#261502]">Simples Nacional</span>
                {currentRegime === 'simples' && (
                  <Badge className="bg-amber-100 text-[#261502] border-0 text-[9px] px-1 py-0">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {isFallbackRbt12
                  ? `DAS: ${formatPercentBR(effectiveSimplesRate)} (1ª faixa)`
                  : `DAS: ${formatPercentBR(effectiveSimplesRate)}`}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presumido')}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                activeTab === 'presumido'
                  ? 'bg-amber-50 border-amber-300 text-slate-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-[#261502]">Presumido</span>
                {currentRegime === 'presumido' && (
                  <Badge className="bg-amber-100 text-[#261502] border-0 text-[9px] px-1 py-0">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                ICMS {formatPercentBR(icmsRateClean)} + PIS 0,65% + COF 3%
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('real')}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                activeTab === 'real'
                  ? 'bg-amber-50 border-amber-300 text-slate-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-[#261502]">Lucro Real</span>
                {currentRegime === 'real' && (
                  <Badge className="bg-amber-100 text-[#261502] border-0 text-[9px] px-1 py-0">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                ICMS {formatPercentBR(icmsRateClean)} + PIS 1,65% + COF 7,6%
              </p>
            </button>
          </div>

          {/* =========================================================
              ABA SIMPLES NACIONAL (12 BLOCOS NUMERADOS)
              ========================================================= */}
          {activeTab === 'simples' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              {/* Box de fórmula sintética */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#b87c14]" />
                  <span className="text-xs font-mono font-bold text-[#261502] uppercase">
                    Markup Divisor Aditivo no Simples Nacional
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto shadow-xs">
                  <code className="text-[#b87c14] font-semibold">
                    {isLiquid ? (
                      <>
                        Divisor = 1 − (DAS% + DV%)
                        <br />
                        Preço Sugerido (RBV) = Receita Líquida ÷ Divisor
                      </>
                    ) : (
                      <>
                        Divisor = 1 − (DAS% + DV% + Margem%)
                        <br />
                        Preço Sugerido = Custo Unitário ÷ Divisor
                      </>
                    )}
                  </code>{' '}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  No Simples Nacional, os tributos sobre receita (ICMS, PIS, COFINS, IRPJ, CSLL e
                  CPP) são unificados no DAS pela alíquota efetiva do PGDAS calculada sobre a RBT12.
                  O motor aditivo deduz os tributos, despesas variáveis e margem sobre a mesma base
                  do preço de venda bruto (PV).
                </p>
              </div>

              {/* Tabela dos 12 Blocos Numerados */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden text-xs font-mono shadow-sm">
                <div className="bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between text-white">
                  <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
                    Memória de Cálculo em 12 Blocos (Simples Nacional)
                  </span>
                  <span className="text-[10px] text-slate-300">LC 123/2006</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {/* ① Perfil */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">① Perfil da Empresa</span>
                      <span className="text-[10px] text-slate-500">
                        {!simplesIsActiveMoreThan12m
                          ? 'Início de atividade (Porta 1 — até 12 meses de operação)'
                          : 'RBT12 consolidada (Porta 2 — mais de 12 meses de operação)'}
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] font-mono">
                        {!simplesIsActiveMoreThan12m
                          ? 'Porta 1 (Início)'
                          : 'Porta 2 (RBT12 Formada)'}
                      </Badge>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {!simplesIsActiveMoreThan12m
                          ? `${simplesActivityMonths}º mês · Cenário ${simplesSelectedScenario}`
                          : 'Histórico > 12 meses'}
                      </span>
                    </div>
                  </div>

                  {/* ② RBT12 */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ② RBT12 (Receita Bruta Acumulada 12 Meses)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {!simplesIsActiveMoreThan12m ? (
                          simplesActivityMonths <= 1 ? (
                            <>
                              1º mês: faturamento mensal projetado × 12 (
                              {formatBRL(simplesMonthlyProjectedRevenue)} × 12)
                            </>
                          ) : (
                            <>
                              Proporcional art. 2º LC 123/2006: (receitas acumuladas × 12) ÷ meses =
                              ({formatBRL(simplesMonthlyProjectedRevenue * simplesActivityMonths)} ×
                              12) ÷ {simplesActivityMonths}
                            </>
                          )
                        ) : (
                          <>Porta 2: RBT12 informada ({formatBRL(simplesRbt12)})</>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block text-sm">
                        {formatBRL(effectiveRbt12ForCalculation)}
                      </span>
                      {isFallbackRbt12 && (
                        <span className="text-[10px] text-amber-700 block font-semibold">
                          1ª faixa aplicada (fallback 4,00%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ③ Anexo e faixa detectada */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ③ Anexo e Faixa Detectada
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {anexoConfig.nome} · Faixa {pgdasResult.faixaNumero} de{' '}
                        {anexoConfig.faixas.length} (até{' '}
                        {formatBRL(faixaDetectada?.limiteSuperior || 180000)})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">
                        Nominal: {formatPercentBR(pgdasResult.aliquotaNominal)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Deduzir: {formatBRL(pgdasResult.parcelaDeduzir)}
                      </span>
                    </div>
                  </div>

                  {/* ④ Alíquota efetiva */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-amber-50/50">
                    <div>
                      <span className="font-bold text-[#261502] block">
                        ④ Alíquota Efetiva do DAS (PGDAS)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {effectiveRbt12ForCalculation > 0 ? (
                          <>
                            ({formatBRL(effectiveRbt12ForCalculation)} ×{' '}
                            {formatNumberBR(pgdasResult.aliquotaNominal)}% −{' '}
                            {formatBRL(pgdasResult.parcelaDeduzir)}) ÷{' '}
                            {formatBRL(effectiveRbt12ForCalculation)}
                          </>
                        ) : (
                          <>1ª faixa (RBT12 zerada ou início 1º mês)</>
                        )}
                      </span>
                    </div>
                    <span className="font-bold text-[#b87c14] text-sm text-right">
                      {formatPercentBR(effectiveSimplesRate, 4)}
                      <span className="block text-[10px] font-mono font-normal text-[#b87c14]">
                        Fator: {formatFactorBR(1 - effectiveSimplesRate / 100, 4)}
                      </span>
                    </span>
                  </div>

                  {/* ⑤ ICMS integrado */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-[#261502] block">
                        ⑤ ICMS Integrado no DAS
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Alíquota efetiva ({formatPercentBR(effectiveSimplesRate, 4)}) × partilha da
                        faixa ({formatPercentBR(icmsPartilhaPct)})
                      </span>
                      <span className="text-[10px] text-[#b87c14] block mt-0.5">
                        Nota: ICMS, PIS e COFINS vivem dentro do DAS no Simples Nacional
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#b87c14] text-sm block">
                        {formatPercentBR(icmsIntegradoRate, 4)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Partilha: {formatPercentBR(icmsPartilhaPct)}
                      </span>
                    </div>
                  </div>

                  {/* ⑥ Custo unitário */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ⑥ Custo Unitário do Produto
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Origem: <strong className="text-slate-700">{costOriginLabel}</strong>
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatBRL(isLiquid ? costSimples : baseValue)}
                    </span>
                  </div>

                  {/* ⑦ Despesas Variáveis */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ⑦ Despesas Variáveis de Venda (Σ DV)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {variableExpenses.length > 0
                          ? variableExpenses
                              .map((dv) => `${dv.name}: ${formatPercentBR(dv.rate)}`)
                              .join(' · ')
                          : 'Nenhuma despesa cadastrada'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-800 text-sm block">
                        {formatPercentBR(dvRate)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Fator DV: {formatFactorBR(dvFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑧ Margem desejada */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑧ Margem de Lucro{' '}
                        {isLiquid ? 'Derivada da Receita Líquida' : 'Desejada (%)'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isLiquid
                          ? 'Informativa (LLE ÷ RBV) — não entra no divisor no modo liquid'
                          : 'Margem aplicada sobre a receita líquida'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {isLiquid && liquidChainSimples
                          ? `${formatNumberBR(liquidChainSimples.derivedMarginPct)}%`
                          : formatPercentBR(marginPct)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isLiquid
                          ? 'Derivada (travada)'
                          : `Fator Margem: ${formatFactorBR(marginFactor, 4)}`}
                      </span>
                    </div>
                  </div>

                  {/* ⑨ Markup divisor */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-amber-500/10">
                    <div>
                      <span className="font-bold text-[#e5b742] block">⑨ Markup divisor</span>
                      <span className="text-[10px] text-amber-200/80">
                        {isLiquid
                          ? `1 − (${formatPercentBR(effectiveSimplesRate, 2)} DAS + ${formatPercentBR(dvRate, 2)} DV) = 1 − Σ deduções`
                          : `1 − (${formatPercentBR(effectiveSimplesRate, 2)} DAS + ${formatPercentBR(dvRate, 2)} DV + ${formatPercentBR(marginPct, 2)} Margem) = 1 − Σ deduções`}
                      </span>
                    </div>
                    <span className="font-black text-[#e5b742] text-base">
                      {formatFactorBR(divisorSimples, 4)}
                    </span>
                  </div>

                  {/* ⑩ Preço sugerido */}
                  <div className="px-3.5 py-3 flex items-center justify-between bg-amber-50 border-t border-amber-300">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[#261502] block text-xs sm:text-sm uppercase tracking-wide">
                          ⑩ Preço de Venda Sugerido (Unitário)
                        </span>
                        <Badge className="bg-amber-100 text-[#261502] border-amber-300 font-mono text-[10px]">
                          Valor canônico do motor
                        </Badge>
                      </div>
                      <span className="text-[10px] text-[#b87c14]">
                        {formatBRL(baseValue)} ÷ {formatFactorBR(divisorSimples, 4)} ={' '}
                        {formatBRL(salePriceSimples)}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-[#261502]">
                      {formatBRL(salePriceSimples)}
                    </span>
                  </div>

                  {/* ⑪ Distribuição do preço em R$ */}
                  <div className="p-3.5 bg-slate-50 space-y-2 border-l-2 border-amber-600">
                    <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                      ⑪ Distribuição Didática do Preço de Venda ({formatBRL(pvSimples)})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-slate-500 block uppercase">
                          Custo Produto
                        </span>
                        <span className="font-bold text-slate-900">{formatBRL(baseValue)}</span>
                        <span className="text-[9px] text-slate-500 block">
                          {pvSimples > 0 ? formatPercentBR((baseValue / pvSimples) * 100, 1) : '0%'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-amber-800 block uppercase">
                          DAS ({formatPercentBR(effectiveSimplesRate, 2)})
                        </span>
                        <span className="font-bold text-amber-700">
                          {formatBRL(valorDasSimples)}
                        </span>
                        <span className="text-[9px] text-slate-500 block">PV × efetiva</span>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-amber-800 block uppercase">
                          DV ({formatPercentBR(dvRate, 2)})
                        </span>
                        <span className="font-bold text-amber-700">
                          {formatBRL(valorDvSimples)}
                        </span>
                        <span className="text-[9px] text-slate-500 block">PV × Σ DV</span>
                      </div>
                      <div className="p-2 rounded bg-amber-50 border border-amber-300 shadow-xs">
                        <span className="text-[10px] text-[#b87c14] block uppercase font-semibold">
                          Margem em R$
                        </span>
                        <span className="font-bold text-[#261502]">
                          {formatBRL(valorMargemSimples)}
                        </span>
                        <span className="text-[9px] text-[#b87c14] block">Sobra líquida</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200">
                      <span>Conferência da soma dos componentes:</span>
                      <span className="font-bold text-[#b87c14]">
                        {formatBRL(baseValue)} + {formatBRL(valorDasSimples)} +{' '}
                        {formatBRL(valorDvSimples)} + {formatBRL(valorMargemSimples)} ={' '}
                        {formatBRL(
                          baseValue + valorDasSimples + valorDvSimples + valorMargemSimples,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* ⑫ Blindagem de Margem */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-b-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#b87c14] shrink-0" />
                      <span className="font-extrabold text-[#261502] uppercase tracking-wider text-xs">
                        ⑫ BLINDAGEM DE MARGEM
                      </span>
                      <Badge className="bg-amber-100 text-[#261502] border-0 text-[9px] font-mono">
                        Técnica Tributária
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                      Precificar com a alíquota de um cenário de faturamento superior (como Moderado
                      ou Otimista)
                      <strong> blinda a sua margem</strong> contra flutuações de vendas. Se a
                      empresa faturar menos do que o projetado e a faixa real de RBT12 cair, a
                      alíquota efetiva do DAS no fechamento do mês será <strong>menor</strong> que a
                      aplicada na formação de preço — fazendo com que a{' '}
                      <strong>margem real no fechamento seja MAIOR que a planejada</strong>. Se o
                      faturamento se confirmar como projetado, a margem se mantém perfeitamente
                      íntegra.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-bloco exclusivo do modo líquido: Cadeia da DRE linha a linha (Item 5) */}
              {isLiquid && liquidChainSimples && (
                <div className="p-4 rounded-xl bg-white border border-amber-300 space-y-3 font-mono text-xs shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#b87c14]" />
                      <span className="font-bold text-[#261502] uppercase tracking-wide text-[11px]">
                        Cadeia da DRE Derivada — Modo Receita Líquida (Simples Nacional)
                      </span>
                    </div>
                    <Badge className="bg-amber-50 text-[#261502] border border-amber-300 text-[10px]">
                      Gross-up Reverso
                    </Badge>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <div className="py-1.5 flex items-center justify-between font-bold text-slate-900">
                      <span>Receita Bruta de Vendas (RBV Sugerida)</span>
                      <span className="text-[#b87c14] text-sm">
                        {formatBRL(liquidChainSimples.rbv)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>
                        (−) Tributos sobre Vendas (
                        {formatPercentBR(liquidChainSimples.tributosRate)}%)
                      </span>
                      <span className="text-rose-700 font-semibold">
                        − {formatBRL(liquidChainSimples.tributosValor)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>
                        (−) Deduções / Despesas Variáveis (
                        {formatPercentBR(liquidChainSimples.deducoesRate)}%)
                      </span>
                      <span className="text-rose-700 font-semibold">
                        − {formatBRL(liquidChainSimples.deducoesValor)}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between bg-amber-50 px-2 rounded font-bold text-[#261502]">
                      <span>(=) Receita Líquida de Vendas (Âncora Informada)</span>
                      <span className="text-[#261502] text-sm">
                        {formatBRL(liquidChainSimples.netRevenue)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>(−) Custo das Mercadorias Vendidas (CMV)</span>
                      <span className="text-rose-700 font-semibold">
                        − {formatBRL(liquidChainSimples.cmv)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between font-semibold text-slate-800">
                      <span>(=) Lucro Bruto</span>
                      <span
                        className={
                          liquidChainSimples.grossProfit >= 0 ? 'text-[#b87c14]' : 'text-rose-700'
                        }
                      >
                        {formatBRL(liquidChainSimples.grossProfit)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>(−) Despesas Operacionais Rateadas</span>
                      <span className="text-slate-800">
                        − {formatBRL(liquidChainSimples.operatingExpenses)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between font-semibold text-slate-800">
                      <span>(=) LAIR (Lucro Antes do IR)</span>
                      <span
                        className={
                          liquidChainSimples.lair >= 0 ? 'text-[#b87c14]' : 'text-rose-700'
                        }
                      >
                        {formatBRL(liquidChainSimples.lair)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>(−) LADIR (IRPJ / CSLL / Adicional)</span>
                      <span className="text-slate-800">
                        − {formatBRL(liquidChainSimples.ladir)}
                      </span>
                    </div>
                    <div
                      className={`py-2 px-2.5 rounded-lg flex items-center justify-between font-bold text-sm ${
                        liquidChainSimples.lle >= 0
                          ? 'bg-amber-50 border border-amber-300 text-[#261502]'
                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {liquidChainSimples.lle >= 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-[#b87c14]" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-700" />
                        )}
                        <span>(=) Lucro Líquido do Exercício (LLE)</span>
                      </div>
                      <div className="text-right">
                        <span>{formatBRL(liquidChainSimples.lle)}</span>
                        <span className="block text-[10px] font-normal opacity-80">
                          Margem derivada: {formatNumberBR(liquidChainSimples.derivedMarginPct)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {!liquidChainSimples.isViable && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Atenção:</strong> Faltam{' '}
                        <strong>{formatBRL(liquidChainSimples.shortfall)}</strong> para LLE
                        positivo. A receita líquida informada é insuficiente para cobrir CMV e
                        encargos.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              ABA LUCRO PRESUMIDO (12 BLOCOS NUMERADOS)
              ========================================================= */}
          {activeTab === 'presumido' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#b87c14]" />
                  <span className="text-xs font-mono font-bold text-[#261502] uppercase">
                    Markup Divisor Aditivo no Lucro Presumido
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto shadow-xs">
                  <code className="text-[#b87c14] font-semibold">
                    {isLiquid ? (
                      <>
                        Divisor = 1 − (ICMS% + PIS 0,65% + COFINS 3,00% + DV%)
                        <br />
                        Preço Sugerido (RBV) = Receita Líquida ÷ Divisor
                      </>
                    ) : (
                      <>
                        Divisor = 1 − (ICMS% + PIS 0,65% + COFINS 3,00% + DV% + Margem%)
                        <br />
                        Preço Sugerido = Custo Unitário ÷ Divisor
                      </>
                    )}
                  </code>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  No Lucro Presumido cumulativo, o PIS (0,65%) e a COFINS (3,00%) incidem
                  diretamente sobre a receita bruta, somados aditivamente à alíquota de ICMS
                  informada, às despesas variáveis de venda e à margem sobre o PV bruto.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden text-xs font-mono shadow-sm">
                <div className="bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between text-white">
                  <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
                    Memória de Cálculo em 12 Blocos (Lucro Presumido)
                  </span>
                  <span className="text-[10px] text-slate-300">Regime Cumulativo</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {/* ① Perfil */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">① Perfil da Empresa</span>
                      <span className="text-[10px] text-slate-500">
                        Regime Lucro Presumido (Decreto-Lei 1.598/77 e Lei 9.718/98)
                      </span>
                    </div>
                    <Badge className="bg-sky-50 text-sky-800 border-sky-200 text-[10px] font-mono">
                      Cumulativo
                    </Badge>
                  </div>

                  {/* ② Faturamento e base */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900 block">② Base de Incidência</span>
                      <span className="text-[10px] text-slate-500">
                        Receita bruta da operação de saída
                      </span>
                    </div>
                    <span className="font-bold text-slate-700">Incidência Direta</span>
                  </div>

                  {/* ③ Tributos Federais */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ③ Tributos Federais Cumulativos
                      </span>
                      <span className="text-[10px] text-slate-500">
                        PIS: {formatPercentBR(pisPresumidoRate)} (Lei 9.718/98) · Parcela:{' '}
                        {formatFactorBR(pisPresumidoRate / 100, 4)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        COFINS: {formatPercentBR(cofinsPresumidoRate)} (Lei 9.718/98) · Parcela:{' '}
                        {formatFactorBR(cofinsPresumidoRate / 100, 4)}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-right">3,65%</span>
                  </div>

                  {/* ④ ICMS Estadual */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-amber-50/50">
                    <div>
                      <span className="font-bold text-[#261502] block">
                        ④ ICMS Estadual sobre Venda
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Alíquota configurada para operações internas
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#b87c14] text-sm block">
                        {formatPercentBR(icmsRateClean)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Parcela: {formatFactorBR(icmsRateClean / 100, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑤ Carga tributária decomposta */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-[#261502] block">
                        ⑤ Carga Tributária Total Aditiva
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ICMS {formatPercentBR(icmsRateClean)} + PIS 0,65% + COFINS 3,00%
                      </span>
                    </div>
                    <span className="font-bold text-[#b87c14]">
                      {formatPercentBR(totalTaxesPresumidoRate)}
                    </span>
                  </div>

                  {/* ⑥ Custo Unitário */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ⑥ Custo Unitário do Produto
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Origem: <strong className="text-slate-700">{costOriginLabel}</strong>
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatBRL(isLiquid ? costPresumido : baseValue)}
                    </span>
                  </div>

                  {/* ⑦ Despesas Variáveis */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ⑦ Despesas Variáveis de Venda (Σ DV)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {variableExpenses.length > 0
                          ? variableExpenses
                              .map((dv) => `${dv.name}: ${formatPercentBR(dv.rate)}`)
                              .join(' · ')
                          : 'Nenhuma despesa cadastrada'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-800 text-sm block">
                        {formatPercentBR(dvRate)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Fator DV: {formatFactorBR(dvFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑧ Margem desejada */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑧ Margem de Lucro{' '}
                        {isLiquid ? 'Derivada da Receita Líquida' : 'Desejada (%)'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isLiquid
                          ? 'Informativa (LLE ÷ RBV) — não entra no divisor no modo liquid'
                          : 'Margem comercial sobre a receita líquida'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {isLiquid && liquidChainPresumido
                          ? `${formatNumberBR(liquidChainPresumido.derivedMarginPct)}%`
                          : formatPercentBR(marginPct)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isLiquid
                          ? 'Derivada (travada)'
                          : `Fator Margem: ${formatFactorBR(marginFactor, 4)}`}
                      </span>
                    </div>
                  </div>

                  {/* ⑨ Markup divisor */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-amber-500/10">
                    <div>
                      <span className="font-bold text-[#e5b742] block">⑨ Markup divisor</span>
                      <span className="text-[10px] text-amber-200/80">
                        {isLiquid
                          ? `1 − (${formatPercentBR(divisorResPresumido.somaTributosPct, 2)} Trib + ${formatPercentBR(dvRate, 2)} DV) [PIS/COF c/ ICMS deduzido da BC - Parecer SEI 14483/2021]`
                          : `1 − (${formatPercentBR(divisorResPresumido.somaTributosPct, 2)} Trib + ${formatPercentBR(dvRate, 2)} DV + ${formatPercentBR(marginPct, 2)} Margem)`}
                      </span>
                    </div>
                    <span className="font-black text-[#e5b742] text-base">
                      {formatFactorBR(divisorPresumido, 4)}
                    </span>
                  </div>

                  {/* ⑩ Preço sugerido */}
                  <div className="px-3.5 py-3 flex items-center justify-between bg-amber-50 border-t border-amber-300">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[#261502] block text-xs sm:text-sm uppercase tracking-wide">
                          ⑩ Preço de Venda Sugerido (Unitário)
                        </span>
                        <Badge className="bg-amber-100 text-[#261502] border-amber-300 font-mono text-[10px]">
                          Valor canônico do motor
                        </Badge>
                      </div>
                      <span className="text-[10px] text-[#b87c14]">
                        {formatBRL(baseValue)} ÷ {formatFactorBR(divisorPresumido, 4)} ={' '}
                        {formatBRL(salePricePresumido)}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-[#261502]">
                      {formatBRL(salePricePresumido)}
                    </span>
                  </div>

                  {/* ⑪ Distribuição do preço em R$ */}
                  <div className="p-3.5 bg-slate-50 space-y-2 border-l-2 border-amber-600">
                    <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                      ⑪ Distribuição Didática do Preço de Venda ({formatBRL(pvPresumido)})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-slate-500 block uppercase">
                          Custo Produto
                        </span>
                        <span className="font-bold text-slate-900">{formatBRL(baseValue)}</span>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-amber-800 block uppercase">
                          Tributos (ICMS/PIS/COF)
                        </span>
                        <span className="font-bold text-amber-700">
                          {formatBRL(valorTributosPresumido)}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-amber-800 block uppercase">
                          DV ({formatPercentBR(dvRate, 2)})
                        </span>
                        <span className="font-bold text-amber-700">
                          {formatBRL(valorDvPresumido)}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-amber-50 border border-amber-300 shadow-xs">
                        <span className="text-[10px] text-[#b87c14] block uppercase font-semibold">
                          Margem em R$
                        </span>
                        <span className="font-bold text-[#261502]">
                          {formatBRL(valorMargemPresumido)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ⑫ Blindagem de Margem */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-b-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#b87c14] shrink-0" />
                      <span className="font-extrabold text-[#261502] uppercase tracking-wider text-xs">
                        ⑫ BLINDAGEM DE MARGEM
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                      A blindagem protege a lucratividade contra volatilidades de mercado e
                      comissões extras. Ao travar as despesas variáveis e a carga integral no
                      divisor aditivo, garante-se que a margem planejada não seja corroída mesmo com
                      aumentos transitórios de custos operacionais.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-bloco exclusivo do modo líquido: Cadeia da DRE linha a linha (Item 5) */}
              {isLiquid && liquidChainPresumido && (
                <div className="p-4 rounded-xl bg-white border border-amber-300 space-y-3 font-mono text-xs shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#b87c14]" />
                      <span className="font-bold text-[#261502] uppercase tracking-wide text-[11px]">
                        Cadeia da DRE Derivada — Modo Receita Líquida (Lucro Presumido)
                      </span>
                    </div>
                    <Badge className="bg-amber-50 text-[#261502] border border-amber-300 text-[10px]">
                      Gross-up Reverso
                    </Badge>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <div className="py-1.5 flex items-center justify-between font-bold text-slate-900">
                      <span>Receita Bruta de Vendas (RBV Sugerida)</span>
                      <span className="text-[#b87c14] text-sm">
                        {formatBRL(liquidChainPresumido.rbv)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>
                        (−) Tributos sobre Vendas (
                        {formatPercentBR(liquidChainPresumido.tributosRate)}%)
                      </span>
                      <span className="text-rose-700 font-semibold">
                        − {formatBRL(liquidChainPresumido.tributosValor)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>
                        (−) Deduções / Despesas Variáveis (
                        {formatPercentBR(liquidChainPresumido.deducoesRate)}%)
                      </span>
                      <span className="text-rose-700 font-semibold">
                        − {formatBRL(liquidChainPresumido.deducoesValor)}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between bg-amber-50 px-2 rounded font-bold text-[#261502]">
                      <span>(=) Receita Líquida de Vendas (Âncora Informada)</span>
                      <span className="text-[#261502] text-sm">
                        {formatBRL(liquidChainPresumido.netRevenue)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>(−) Custo das Mercadorias Vendidas (CMV)</span>
                      <span className="text-rose-700 font-semibold">
                        − {formatBRL(liquidChainPresumido.cmv)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between font-semibold text-slate-800">
                      <span>(=) Lucro Bruto</span>
                      <span
                        className={
                          liquidChainPresumido.grossProfit >= 0 ? 'text-[#b87c14]' : 'text-rose-700'
                        }
                      >
                        {formatBRL(liquidChainPresumido.grossProfit)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>(−) Despesas Operacionais Rateadas</span>
                      <span className="text-slate-800">
                        − {formatBRL(liquidChainPresumido.operatingExpenses)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between font-semibold text-slate-800">
                      <span>(=) LAIR (Lucro Antes do IR)</span>
                      <span
                        className={
                          liquidChainPresumido.lair >= 0 ? 'text-[#b87c14]' : 'text-rose-700'
                        }
                      >
                        {formatBRL(liquidChainPresumido.lair)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>(−) LADIR (IRPJ Presumido + CSLL)</span>
                      <span className="text-slate-800">
                        − {formatBRL(liquidChainPresumido.ladir)}
                      </span>
                    </div>
                    <div
                      className={`py-2 px-2.5 rounded-lg flex items-center justify-between font-bold text-sm ${
                        liquidChainPresumido.lle >= 0
                          ? 'bg-amber-50 border border-amber-300 text-[#261502]'
                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {liquidChainPresumido.lle >= 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-[#b87c14]" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-700" />
                        )}
                        <span>(=) Lucro Líquido do Exercício (LLE)</span>
                      </div>
                      <div className="text-right">
                        <span>{formatBRL(liquidChainPresumido.lle)}</span>
                        <span className="block text-[10px] font-normal opacity-80">
                          Margem derivada: {formatNumberBR(liquidChainPresumido.derivedMarginPct)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {!liquidChainPresumido.isViable && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Atenção:</strong> Faltam{' '}
                        <strong>{formatBRL(liquidChainPresumido.shortfall)}</strong> para LLE
                        positivo. A receita líquida informada é insuficiente para cobrir CMV e
                        tributos.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              ABA LUCRO REAL (12 BLOCOS NUMERADOS)
              ========================================================= */}
          {activeTab === 'real' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#b87c14]" />
                  <span className="text-xs font-mono font-bold text-[#261502] uppercase">
                    Markup Divisor Aditivo no Lucro Real
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto shadow-xs">
                  <code className="text-[#b87c14] font-semibold">
                    {isLiquid ? (
                      <>
                        Divisor = 1 − (ICMS% + PIS 1,65% + COFINS 7,60% + DV%)
                        <br />
                        Preço Sugerido (RBV) = Receita Líquida ÷ Divisor
                      </>
                    ) : (
                      <>
                        Divisor = 1 − (ICMS% + PIS 1,65% + COFINS 7,60% + DV% + Margem%)
                        <br />
                        Preço Sugerido = Custo Unitário ÷ Divisor
                      </>
                    )}
                  </code>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  No Lucro Real não cumulativo, as alíquotas de PIS (1,65%) e COFINS (7,60%)
                  somam-se ao ICMS, despesas variáveis e margem no divisor aditivo sobre o PV bruto.
                  Os créditos das compras reduzem diretamente o CMV líquido na DRE.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden text-xs font-mono shadow-sm">
                <div className="bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between text-white">
                  <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
                    Memória de Cálculo em 12 Blocos (Lucro Real)
                  </span>
                  <span className="text-[10px] text-slate-300">Regime Não Cumulativo</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {/* ① Perfil */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">① Perfil da Empresa</span>
                      <span className="text-[10px] text-slate-500">
                        Regime Lucro Real (Leis 10.637/02 e 10.833/03)
                      </span>
                    </div>
                    <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-mono">
                      Não Cumulativo
                    </Badge>
                  </div>

                  {/* ② Base */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900 block">② Base de Incidência</span>
                      <span className="text-[10px] text-slate-500">Receita bruta da operação</span>
                    </div>
                    <span className="font-bold text-slate-700">Não Cumulativa</span>
                  </div>

                  {/* ③ PIS e COFINS */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ③ PIS e COFINS Não Cumulativos
                      </span>
                      <span className="text-[10px] text-slate-500">
                        PIS: {formatPercentBR(pisRealRate)} · Parcela:{' '}
                        {formatFactorBR(pisRealRate / 100, 4)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        COFINS: {formatPercentBR(cofinsRealRate)} · Parcela:{' '}
                        {formatFactorBR(cofinsRealRate / 100, 4)}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-right">9,25%</span>
                  </div>

                  {/* ④ ICMS */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-amber-50/50">
                    <div>
                      <span className="font-bold text-[#261502] block">
                        ④ ICMS Estadual sobre Venda
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Alíquota configurada para operações internas
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#b87c14] text-sm block">
                        {formatPercentBR(icmsRateClean)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Parcela: {formatFactorBR(icmsRateClean / 100, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑤ Carga tributária decomposta */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-[#261502] block">
                        ⑤ Carga Tributária Total Aditiva
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ICMS {formatPercentBR(icmsRateClean)} + PIS 1,65% + COFINS 7,60%
                      </span>
                    </div>
                    <span className="font-bold text-[#b87c14]">
                      {formatPercentBR(totalTaxesRealRate)}
                    </span>
                  </div>

                  {/* ⑥ Custo Unitário */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ⑥ Custo Unitário do Produto
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Origem: <strong className="text-slate-700">{costOriginLabel}</strong>
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatBRL(isLiquid ? costReal : baseValue)}
                    </span>
                  </div>

                  {/* ⑦ Despesas Variáveis */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ⑦ Despesas Variáveis de Venda (Σ DV)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {variableExpenses.length > 0
                          ? variableExpenses
                              .map((dv) => `${dv.name}: ${formatPercentBR(dv.rate)}`)
                              .join(' · ')
                          : 'Nenhuma despesa cadastrada'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-800 text-sm block">
                        {formatPercentBR(dvRate)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Fator DV: {formatFactorBR(dvFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑧ Margem desejada */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ⑧ Margem de Lucro{' '}
                        {isLiquid ? 'Derivada da Receita Líquida' : 'Desejada (%)'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isLiquid
                          ? 'Informativa (LLE ÷ RBV) — não entra no divisor no modo liquid'
                          : 'Margem comercial sobre a receita líquida'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-800 text-sm block">
                        {isLiquid && liquidChainReal
                          ? `${formatNumberBR(liquidChainReal.derivedMarginPct)}%`
                          : formatPercentBR(marginPct)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isLiquid
                          ? 'Derivada (travada)'
                          : `Fator Margem: ${formatFactorBR(marginFactor, 4)}`}
                      </span>
                    </div>
                  </div>

                  {/* ⑨ Markup divisor */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-amber-50/70">
                    <div>
                      <span className="font-bold text-[#261502] block">⑨ Markup divisor</span>
                      <span className="text-[10px] text-slate-500">
                        {isLiquid
                          ? `1 − (${formatPercentBR(divisorResReal.somaTributosPct, 2)} Trib + ${formatPercentBR(dvRate, 2)} DV)`
                          : `1 − (${formatPercentBR(divisorResReal.somaTributosPct, 2)} Trib + ${formatPercentBR(dvRate, 2)} DV + ${formatPercentBR(marginPct, 2)} Margem)`}
                      </span>
                    </div>
                    <span className="font-black text-[#b87c14] text-base">
                      {formatFactorBR(divisorReal, 4)}
                    </span>
                  </div>

                  {/* ⑩ Preço sugerido */}
                  <div className="px-3.5 py-3 flex items-center justify-between bg-amber-50 border-t border-amber-300">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[#261502] block text-xs sm:text-sm uppercase tracking-wide">
                          ⑩ Preço de Venda Sugerido (Unitário)
                        </span>
                        <Badge className="bg-amber-100 text-[#261502] border-amber-300 font-mono text-[10px]">
                          Valor canônico do motor
                        </Badge>
                      </div>
                      <span className="text-[10px] text-[#b87c14]">
                        {formatBRL(baseValue)} ÷ {formatFactorBR(divisorReal, 4)} ={' '}
                        {formatBRL(salePriceReal)}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-[#261502]">
                      {formatBRL(salePriceReal)}
                    </span>
                  </div>

                  {/* ⑪ Distribuição do preço em R$ */}
                  <div className="p-3.5 bg-slate-50 space-y-2 border-l-2 border-amber-600">
                    <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                      ⑪ Distribuição Didática do Preço de Venda ({formatBRL(pvReal)})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-slate-500 block uppercase">
                          Custo Líquido
                        </span>
                        <span className="font-bold text-slate-900">{formatBRL(baseValue)}</span>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-amber-800 block uppercase">
                          Tributos (ICMS/PIS/COF)
                        </span>
                        <span className="font-bold text-amber-700">
                          {formatBRL(valorTributosReal)}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-amber-800 block uppercase">
                          DV ({formatPercentBR(dvRate, 2)})
                        </span>
                        <span className="font-bold text-amber-700">{formatBRL(valorDvReal)}</span>
                      </div>
                      <div className="p-2 rounded bg-amber-50 border border-amber-300 shadow-xs">
                        <span className="text-[10px] text-[#b87c14] block uppercase font-semibold">
                          Margem em R$
                        </span>
                        <span className="font-bold text-[#261502]">
                          {formatBRL(valorMargemReal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ⑫ Blindagem de Margem */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-b-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#b87c14] shrink-0" />
                      <span className="font-extrabold text-[#261502] uppercase tracking-wider text-xs">
                        ⑫ BLINDAGEM DE MARGEM
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                      No Lucro Real, a blindagem garante que mesmo que o volume de créditos nas
                      compras oscile, o preço praticado mantém a taxa de lucratividade pretendida na
                      venda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-bloco exclusivo do modo líquido: Cadeia da DRE linha a linha (Item 5) */}
              {isLiquid && liquidChainReal && (
                <div className="p-4 rounded-xl bg-white border border-amber-300 space-y-3 font-mono text-xs shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#b87c14]" />
                      <span className="font-bold text-[#261502] uppercase tracking-wide text-[11px]">
                        Cadeia da DRE Derivada — Modo Receita Líquida (Lucro Real)
                      </span>
                    </div>
                    <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
                      Gross-up Reverso
                    </Badge>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <div className="py-1.5 flex items-center justify-between font-bold text-slate-900">
                      <span>Receita Bruta de Vendas (RBV Sugerida)</span>
                      <span className="text-[#b87c14] text-sm">
                        {formatBRL(liquidChainReal.rbv)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>
                        (−) Tributos sobre Vendas ({formatPercentBR(liquidChainReal.tributosRate)}%)
                      </span>
                      <span className="text-rose-700 font-semibold">
                        − {formatBRL(liquidChainReal.tributosValor)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>
                        (−) Deduções / Despesas Variáveis (
                        {formatPercentBR(liquidChainReal.deducoesRate)}%)
                      </span>
                      <span className="text-rose-700 font-semibold">
                        − {formatBRL(liquidChainReal.deducoesValor)}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between bg-amber-50 px-2 rounded font-bold text-[#261502]">
                      <span>(=) Receita Líquida de Vendas (Âncora Informada)</span>
                      <span className="text-[#261502] text-sm">
                        {formatBRL(liquidChainReal.netRevenue)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>(−) Custo das Mercadorias Vendidas (CMV)</span>
                      <span className="text-rose-700 font-semibold">
                        − {formatBRL(liquidChainReal.cmv)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between font-semibold text-slate-800">
                      <span>(=) Lucro Bruto</span>
                      <span
                        className={
                          liquidChainReal.grossProfit >= 0 ? 'text-[#b87c14]' : 'text-rose-700'
                        }
                      >
                        {formatBRL(liquidChainReal.grossProfit)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>(−) Despesas Operacionais Rateadas</span>
                      <span className="text-slate-800">
                        − {formatBRL(liquidChainReal.operatingExpenses)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between font-semibold text-slate-800">
                      <span>(=) LAIR (Lucro Antes do IR)</span>
                      <span
                        className={liquidChainReal.lair >= 0 ? 'text-[#b87c14]' : 'text-rose-700'}
                      >
                        {formatBRL(liquidChainReal.lair)}
                      </span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between text-slate-600">
                      <span>(−) LADIR (IRPJ Real + Adicional + CSLL)</span>
                      <span className="text-slate-800">− {formatBRL(liquidChainReal.ladir)}</span>
                    </div>
                    <div
                      className={`py-2 px-2.5 rounded-lg flex items-center justify-between font-bold text-sm ${
                        liquidChainReal.lle >= 0
                          ? 'bg-amber-50 border border-amber-300 text-[#261502]'
                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {liquidChainReal.lle >= 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-[#b87c14]" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-700" />
                        )}
                        <span>(=) Lucro Líquido do Exercício (LLE)</span>
                      </div>
                      <div className="text-right">
                        <span>{formatBRL(liquidChainReal.lle)}</span>
                        <span className="block text-[10px] font-normal opacity-80">
                          Margem derivada: {formatNumberBR(liquidChainReal.derivedMarginPct)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {!liquidChainReal.isViable && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Atenção:</strong> Faltam{' '}
                        <strong>{formatBRL(liquidChainReal.shortfall)}</strong> para LLE positivo. A
                        receita líquida informada é insuficiente para cobrir CMV e tributos.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Rodapé explicativo e botão de fechar */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Fórmulas idênticas às aplicadas na apuração das DREs e do comparativo.</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold"
          >
            Fechar
          </button>
        </div>{' '}
      </DialogContent>
    </Dialog>
  )
}
