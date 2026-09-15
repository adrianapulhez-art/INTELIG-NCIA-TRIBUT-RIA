import React, { useState, useMemo } from 'react'
import {
  ChevronDown,
  Layers,
  ArrowRightLeft,
  Info,
  Trophy,
  AlertCircle,
  TrendingUp,
  Percent,
} from 'lucide-react'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatPercentBR, formatNumberBR } from '@/lib/taxCalculations'
import {
  TaxRegime,
  MarkupProductItem,
  PurchaseItem,
  DesiredLiquidRevenueByRegime,
  CustomTaxItem,
} from '@/contexts/TaxContext'
import { calculatePgdas, SimplesAnexoId } from '@/lib/simplesCalculations'

export type ResultPricingBase = 'cost_margin' | 'liquid'

export interface ResultBaseComparisonProps {
  // Contexto de Markup e Produtos
  markupProducts: MarkupProductItem[]
  purchasesItems: PurchaseItem[]
  getPurchaseItemUnitNetCost?: (
    item: PurchaseItem,
    regime: 'presumido' | 'real' | 'simples',
  ) => number
  // Tributos compartilhados
  icmsRateMarkup: number
  customTaxesMarkup: CustomTaxItem[]
  totalVariableExpenseRate: number
  // Simples
  simplesAnexo: string
  simplesRbt12: number
  effectiveSimplesRbt12?: number
  // Metas do modo liquid
  desiredLiquidRevenueByRegime?: DesiredLiquidRevenueByRegime
  // CMV global vindo de Compras
  calculatedPurchases: {
    cmvPresumido: number
    cmvReal: number
    cmvSimples: number
    unitCostPresumidoEffective: number
    unitCostRealEffective: number
    unitCostSimplesEffective: number
    autoInventoryDeductionActive: boolean
  }
  // Despesas operacionais consolidadas e Folha
  totalGlobalOperatingExpenses: number
  totalGlobalOperatingRevenues: number
  directPayrollExpenses: number
  patronalCharges: number
  // Atividades
  presumidoActivity: 'comercio' | 'industria' | 'servicos'
  realActivity: 'comercio' | 'industria' | 'servicos'
  presumidoIssRate: number
  realIssRate: number
  realAdditions: number
  realExclusions: number
  // Quantidade geral ativa
  qty: number
}

interface RegimeCalculatedResult {
  regimeKey: 'presumido' | 'real' | 'simples'
  regimeName: string
  hasValidData: boolean
  invalidReason?: string
  grossRevenue: number
  cmv: number
  taxesTotal: number
  netProfit: number
  netMargin: number
  effectiveTaxRate: number
  breakdown: {
    municipalStateTax: number
    pis: number
    cofins: number
    patronal: number
    irpjCsll: number
    dasTotal?: number
  }
}

export const ResultBaseComparison: React.FC<ResultBaseComparisonProps> = ({
  markupProducts,
  purchasesItems,
  getPurchaseItemUnitNetCost,
  icmsRateMarkup,
  customTaxesMarkup,
  totalVariableExpenseRate,
  simplesAnexo,
  simplesRbt12,
  effectiveSimplesRbt12,
  desiredLiquidRevenueByRegime,
  calculatedPurchases,
  totalGlobalOperatingExpenses,
  totalGlobalOperatingRevenues,
  directPayrollExpenses,
  patronalCharges,
  presumidoActivity,
  realActivity,
  presumidoIssRate,
  realIssRate,
  realAdditions,
  realExclusions,
  qty,
}) => {
  // Camada recolhida por padrão
  const [isOpen, setIsOpen] = useState<boolean>(false)
  // Base de precificação selecionada dentro da camada (cost_margin ou liquid)
  const [selectedBase, setSelectedBase] = useState<ResultPricingBase>('cost_margin')

  const effectiveQty = qty > 0 ? qty : 1
  const validProducts = Array.isArray(markupProducts) ? markupProducts : []

  // Alíquotas e divisores
  const currentAnexoId = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const rbt12Clean =
    effectiveSimplesRbt12 && effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0
  const pgdas = useMemo(() => {
    return calculatePgdas(currentAnexoId, rbt12Clean)
  }, [currentAnexoId, rbt12Clean])

  const sumCustomTaxesPct = useMemo(() => {
    if (!Array.isArray(customTaxesMarkup)) return 0
    return customTaxesMarkup.reduce((acc, t) => acc + (t.rate || 0), 0)
  }, [customTaxesMarkup])

  const dvRate =
    typeof totalVariableExpenseRate === 'number' && Number.isFinite(totalVariableExpenseRate)
      ? totalVariableExpenseRate
      : 0
  const icms =
    typeof icmsRateMarkup === 'number' && Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0
  const simplesEffectiveRate = pgdas.aliquotaEfetiva || 0

  // Helper: Custo unitário de um produto por regime (respeitando a regra de recuperação dos créditos)
  const getProductUnitCost = (
    p: MarkupProductItem,
    regimeKey: 'presumido' | 'real' | 'simples',
  ): number => {
    if (p.purchaseItemId && purchasesItems && getPurchaseItemUnitNetCost) {
      const pItem = purchasesItems.find((pi) => pi.id === p.purchaseItemId)
      if (pItem) {
        const uCost = getPurchaseItemUnitNetCost(pItem, regimeKey)
        if (uCost > 0) return uCost
      }
    }
    if (regimeKey === 'presumido' && calculatedPurchases.unitCostPresumidoEffective > 0) {
      return calculatedPurchases.unitCostPresumidoEffective
    }
    if (regimeKey === 'real' && calculatedPurchases.unitCostRealEffective > 0) {
      return calculatedPurchases.unitCostRealEffective
    }
    if (regimeKey === 'simples' && calculatedPurchases.unitCostSimplesEffective > 0) {
      return calculatedPurchases.unitCostSimplesEffective
    }
    return typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : 0
  }

  // Divisor multiplicativo do modo Preço Líquido Desejado: fatores de dedução (tributos + DV), SEM margem
  // Presumido: (1 - ICMS) * (1 - 0,0365 [0,65% + 3,00%]) * (1 - DV) * customTaxesFactor
  // Real: (1 - ICMS) * (1 - 0,0925 [1,65% + 7,60%]) * (1 - DV) * customTaxesFactor
  // Simples: (1 - alíquota efetiva PGDAS) * (1 - DV) * customTaxesFactor
  const computeLiquidDivisor = (regimeKey: 'presumido' | 'real' | 'simples') => {
    const icmsFactor = 1 - icms / 100
    const dvFactor = 1 - dvRate / 100
    let divisor = 1
    if (regimeKey === 'presumido') {
      divisor = icmsFactor * (1 - 0.0365) * (dvFactor > 0 ? dvFactor : 1)
    } else if (regimeKey === 'real') {
      divisor = icmsFactor * (1 - 0.0925) * (dvFactor > 0 ? dvFactor : 1)
    } else {
      divisor = (1 - simplesEffectiveRate / 100) * (dvFactor > 0 ? dvFactor : 1)
    }
    for (const tax of customTaxesMarkup) {
      divisor *= 1 - (tax.rate || 0) / 100
    }
    return Math.max(0.0001, divisor)
  }

  // Divisor composto do modo Custo + Margem: (1 - (Σtributos + %DV)/100) * (1 - margem/100)
  const computeCostMarginDivisor = (
    regimeKey: 'presumido' | 'real' | 'simples',
    margin: number,
  ) => {
    let taxesRate = 0
    if (regimeKey === 'presumido') {
      taxesRate = icms + 0.65 + 3.0 + sumCustomTaxesPct
    } else if (regimeKey === 'real') {
      taxesRate = icms + 1.65 + 7.6 + sumCustomTaxesPct
    } else {
      taxesRate = simplesEffectiveRate + sumCustomTaxesPct
    }
    const taxDvFactor = 1 - (taxesRate + dvRate) / 100
    const safeMargin = typeof margin === 'number' && Number.isFinite(margin) ? margin : 0
    const marginFactor = safeMargin > 0 ? 1 - safeMargin / 100 : 1
    return Math.max(0.0001, taxDvFactor * marginFactor)
  }

  // Motor analítico de cálculo do resultado completo para um regime e uma base
  const computeRegimeResult = (
    regimeKey: 'presumido' | 'real' | 'simples',
    base: ResultPricingBase,
  ): RegimeCalculatedResult => {
    const regimeNames: Record<'presumido' | 'real' | 'simples', string> = {
      presumido: 'Lucro Presumido',
      real: 'Lucro Real',
      simples: 'Simples Nacional',
    }

    // 1. Apurar Receita Bruta e CMV do regime conforme a base selecionada
    let totalGrossRevenue = 0
    let totalCmv = 0
    let hasValidData = true
    let invalidReason: string | undefined

    if (base === 'cost_margin') {
      // Modo CUSTO + MARGEM
      if (validProducts.length > 0) {
        let revSum = 0
        let cmvSum = 0
        let itemsWithZeroCost = 0

        for (const p of validProducts) {
          const productQty =
            typeof p.quantity === 'number' && Number.isFinite(p.quantity)
              ? Math.max(0, p.quantity)
              : 0
          const effectiveItemQty = productQty > 0 ? productQty : qty > 0 ? qty : 1
          const unitCost = getProductUnitCost(p, regimeKey)

          if (unitCost <= 0) {
            itemsWithZeroCost++
          }

          const pMargin = typeof p.margin === 'number' && Number.isFinite(p.margin) ? p.margin : 0
          const divisor = computeCostMarginDivisor(regimeKey, pMargin)
          const unitPrice =
            divisor > 0.0001 && unitCost > 0 ? Math.round((unitCost / divisor) * 100) / 100 : 0

          revSum += Math.round(unitPrice * effectiveItemQty * 100) / 100
          cmvSum += Math.round(unitCost * effectiveItemQty * 100) / 100
        }

        if (cmvSum <= 0 && revSum <= 0) {
          hasValidData = false
          invalidReason =
            'Custo unitário da mercadoria não cadastrado para este regime. Cadastre o custo ou importe da Calculadora de Compras.'
        }

        totalGrossRevenue = Math.round(revSum * 100) / 100
        totalCmv = Math.round(cmvSum * 100) / 100
      } else {
        // Sem produtos cadastrados
        let fallbackCost = 0
        if (regimeKey === 'presumido') fallbackCost = calculatedPurchases.unitCostPresumidoEffective
        else if (regimeKey === 'real') fallbackCost = calculatedPurchases.unitCostRealEffective
        else fallbackCost = calculatedPurchases.unitCostSimplesEffective

        if (fallbackCost <= 0) {
          hasValidData = false
          invalidReason = 'Nenhum custo cadastrado para este regime no Markup ou nas Compras.'
        } else {
          const divisor = computeCostMarginDivisor(regimeKey, 0)
          const unitPrice = Math.round((fallbackCost / divisor) * 100) / 100
          totalGrossRevenue = Math.round(unitPrice * effectiveQty * 100) / 100
          totalCmv = Math.round(fallbackCost * effectiveQty * 100) / 100
        }
      }
    } else {
      // Modo PREÇO LÍQUIDO DESEJADO (Meta Líquida)
      if (validProducts.length > 0) {
        let revSum = 0
        let cmvSum = 0

        for (const p of validProducts) {
          const productQty =
            typeof p.quantity === 'number' && Number.isFinite(p.quantity)
              ? Math.max(0, p.quantity)
              : 0
          const effectiveItemQty = productQty > 0 ? productQty : qty > 0 ? qty : 1
          const itemMeta =
            p.desiredNetRevenueByRegime?.[regimeKey] ??
            desiredLiquidRevenueByRegime?.[regimeKey] ??
            p.desiredNetRevenue ??
            0
          const divisor = computeLiquidDivisor(regimeKey)
          const unitPrice =
            divisor > 0.0001 && itemMeta > 0 ? Math.round((itemMeta / divisor) * 100) / 100 : 0
          const unitCost = getProductUnitCost(p, regimeKey)

          revSum += Math.round(unitPrice * effectiveItemQty * 100) / 100
          cmvSum += Math.round(unitCost * effectiveItemQty * 100) / 100
        }

        if (revSum <= 0) {
          hasValidData = false
          invalidReason =
            'Preço Líquido Desejado (meta líquida) não preenchido para este regime no Markup.'
        }

        totalGrossRevenue = Math.round(revSum * 100) / 100
        totalCmv = Math.round(cmvSum * 100) / 100
      } else {
        const globalMeta = desiredLiquidRevenueByRegime?.[regimeKey] ?? 0
        if (globalMeta <= 0) {
          hasValidData = false
          invalidReason = 'Preço Líquido Desejado global não informado para este regime.'
        } else {
          const divisor = computeLiquidDivisor(regimeKey)
          const unitPrice = Math.round((globalMeta / divisor) * 100) / 100
          totalGrossRevenue = Math.round(unitPrice * effectiveQty * 100) / 100
          let fallbackCost = 0
          if (regimeKey === 'presumido')
            fallbackCost = calculatedPurchases.unitCostPresumidoEffective
          else if (regimeKey === 'real') fallbackCost = calculatedPurchases.unitCostRealEffective
          else fallbackCost = calculatedPurchases.unitCostSimplesEffective
          totalCmv = Math.round(fallbackCost * effectiveQty * 100) / 100
        }
      }
    }

    // Se não há dados válidos ou receita/custo é 0, retorna estado não apurado com justificativa honesta
    if (!hasValidData || (totalGrossRevenue <= 0 && totalCmv <= 0)) {
      return {
        regimeKey,
        regimeName: regimeNames[regimeKey],
        hasValidData: false,
        invalidReason:
          invalidReason || 'Complete a simulação no Markup para habilitar a apuração deste regime.',
        grossRevenue: 0,
        cmv: 0,
        taxesTotal: 0,
        netProfit: 0,
        netMargin: 0,
        effectiveTaxRate: 0,
        breakdown: {
          municipalStateTax: 0,
          pis: 0,
          cofins: 0,
          patronal: 0,
          irpjCsll: 0,
        },
      }
    }

    // 2. Apuração da Carga Tributária e Lucro Líquido por Regime
    if (regimeKey === 'presumido') {
      const isServices = presumidoActivity === 'servicos'
      const irpjPresumptionRate = isServices ? 32.0 : 8.0
      const csllPresumptionRate = isServices ? 32.0 : 12.0
      const issRate = isServices ? presumidoIssRate : 0
      const municipalStateTax =
        Math.round(
          (isServices ? (totalGrossRevenue * issRate) / 100 : (totalGrossRevenue * icms) / 100) *
            100,
        ) / 100
      const pisCofinsBase = isServices
        ? totalGrossRevenue
        : Math.round(Math.max(0, totalGrossRevenue - municipalStateTax) * 100) / 100
      const pis = Math.round(((pisCofinsBase * 0.65) / 100) * 100) / 100
      const cofins = Math.round(((pisCofinsBase * 3.0) / 100) * 100) / 100
      const netRevenue =
        Math.round((totalGrossRevenue - municipalStateTax - pis - cofins) * 100) / 100
      const grossProfit = Math.round((netRevenue - totalCmv) * 100) / 100

      const totalExpenses = totalGlobalOperatingExpenses + directPayrollExpenses + patronalCharges
      const resultBeforeTax = grossProfit - totalExpenses + totalGlobalOperatingRevenues

      const irpjBase = (totalGrossRevenue * irpjPresumptionRate) / 100
      const csllBase = (totalGrossRevenue * csllPresumptionRate) / 100
      const irpj = (irpjBase * 15.0) / 100
      const irpjExcess = Math.max(0, irpjBase - 60000.0)
      const irpjAdditional = (irpjExcess * 10.0) / 100
      const csll = (csllBase * 9.0) / 100
      const irpjCsllTotal = irpj + irpjAdditional + csll

      const netProfit = resultBeforeTax - irpjCsllTotal
      const totalTaxBurden = municipalStateTax + pis + cofins + irpjCsllTotal + patronalCharges
      const netMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0
      const effectiveTaxRate =
        totalGrossRevenue > 0 ? (totalTaxBurden / totalGrossRevenue) * 100 : 0

      return {
        regimeKey: 'presumido',
        regimeName: 'Lucro Presumido',
        hasValidData: true,
        grossRevenue: totalGrossRevenue,
        cmv: totalCmv,
        taxesTotal: totalTaxBurden,
        netProfit,
        netMargin,
        effectiveTaxRate,
        breakdown: {
          municipalStateTax,
          pis,
          cofins,
          patronal: patronalCharges,
          irpjCsll: irpjCsllTotal,
        },
      }
    }

    if (regimeKey === 'real') {
      const isServices = realActivity === 'servicos'
      const issRate = isServices ? realIssRate : 0
      const municipalStateTax =
        Math.round(
          (isServices ? (totalGrossRevenue * issRate) / 100 : (totalGrossRevenue * icms) / 100) *
            100,
        ) / 100
      const pisCofinsBase = isServices
        ? totalGrossRevenue
        : Math.round(Math.max(0, totalGrossRevenue - municipalStateTax) * 100) / 100
      const pis = Math.round(((pisCofinsBase * 1.65) / 100) * 100) / 100
      const cofins = Math.round(((pisCofinsBase * 7.6) / 100) * 100) / 100
      const netRevenue =
        Math.round((totalGrossRevenue - municipalStateTax - pis - cofins) * 100) / 100
      const grossProfit = Math.round((netRevenue - totalCmv) * 100) / 100

      const totalExpenses = totalGlobalOperatingExpenses + directPayrollExpenses + patronalCharges
      const resultBeforeTax = grossProfit - totalExpenses + totalGlobalOperatingRevenues

      const additions = realAdditions || 0
      const exclusions = realExclusions || 0
      const taxableRealProfit = Math.max(0, resultBeforeTax + additions - exclusions)

      const irpj = (taxableRealProfit * 15.0) / 100
      const irpjExcess = Math.max(0, taxableRealProfit - 60000.0)
      const irpjAdditional = (irpjExcess * 10.0) / 100
      const csll = (taxableRealProfit * 9.0) / 100
      const irpjCsllTotal = irpj + irpjAdditional + csll

      const netProfit = resultBeforeTax - irpjCsllTotal
      const totalTaxBurden = municipalStateTax + pis + cofins + irpjCsllTotal + patronalCharges
      const netMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0
      const effectiveTaxRate =
        totalGrossRevenue > 0 ? (totalTaxBurden / totalGrossRevenue) * 100 : 0

      return {
        regimeKey: 'real',
        regimeName: 'Lucro Real',
        hasValidData: true,
        grossRevenue: totalGrossRevenue,
        cmv: totalCmv,
        taxesTotal: totalTaxBurden,
        netProfit,
        netMargin,
        effectiveTaxRate,
        breakdown: {
          municipalStateTax,
          pis,
          cofins,
          patronal: patronalCharges,
          irpjCsll: irpjCsllTotal,
        },
      }
    }

    // SIMPLES NACIONAL
    const effectiveRateDec = (pgdas.aliquotaEfetiva || 0) / 100
    const dasTotal = Math.round(totalGrossRevenue * effectiveRateDec * 100) / 100
    const netRevenue = Math.round((totalGrossRevenue - dasTotal) * 100) / 100
    const grossProfit = Math.round((netRevenue - totalCmv) * 100) / 100

    const totalExpenses = totalGlobalOperatingExpenses + directPayrollExpenses
    const netProfit = grossProfit - totalExpenses + totalGlobalOperatingRevenues
    const totalTaxBurden = dasTotal
    const netMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0
    const effectiveTaxRate = pgdas.aliquotaEfetiva

    return {
      regimeKey: 'simples',
      regimeName: 'Simples Nacional',
      hasValidData: true,
      grossRevenue: totalGrossRevenue,
      cmv: totalCmv,
      taxesTotal: totalTaxBurden,
      netProfit,
      netMargin,
      effectiveTaxRate,
      breakdown: {
        municipalStateTax: 0,
        pis: 0,
        cofins: 0,
        patronal: 0,
        irpjCsll: 0,
        dasTotal,
      },
    }
  }

  // Resultados dos 3 regimes para a base selecionada
  const resultsByRegime = useMemo(() => {
    return {
      presumido: computeRegimeResult('presumido', selectedBase),
      real: computeRegimeResult('real', selectedBase),
      simples: computeRegimeResult('simples', selectedBase),
    }
  }, [
    selectedBase,
    validProducts,
    purchasesItems,
    calculatedPurchases,
    desiredLiquidRevenueByRegime,
    icms,
    dvRate,
    sumCustomTaxesPct,
    pgdas,
    presumidoActivity,
    realActivity,
    presumidoIssRate,
    realIssRate,
    realAdditions,
    realExclusions,
    totalGlobalOperatingExpenses,
    totalGlobalOperatingRevenues,
    directPayrollExpenses,
    patronalCharges,
    qty,
  ])

  // Identificação do melhor regime sob esta base
  const bestKey = useMemo(() => {
    const list = [resultsByRegime.presumido, resultsByRegime.real, resultsByRegime.simples]
    const validOnes = list.filter((r) => r.hasValidData && r.grossRevenue > 0)
    if (validOnes.length === 0) return 'presumido'
    const sorted = [...validOnes].sort((a, b) => {
      if (b.netProfit !== a.netProfit) return b.netProfit - a.netProfit
      return a.taxesTotal - b.taxesTotal
    })
    return sorted[0].regimeKey
  }, [resultsByRegime])

  const hasAnyValidData =
    resultsByRegime.presumido.hasValidData ||
    resultsByRegime.real.hasValidData ||
    resultsByRegime.simples.hasValidData

  return (
    <div className="space-y-3">
      {/* Botão de Camada (Collapsible no mesmo padrão dos existentes) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
          title="Abrir quadro de comparação de resultado por base de precificação (Custo + Margem vs Preço Líquido Desejado)"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Comparação de resultado por base de precificação ›</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-emerald-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
          Custo + Margem · Preço Líquido Desejado · Receita, CMV e Carga Tributária
        </span>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="animate-in fade-in-0 duration-200">
          <div className="bg-[#0b101b]/95 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
            {/* Cabeçalho interno com Seletor de Base */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Quadro Comparativo de Resultado por Base de Precificação
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecione a base desejada para comparar simultaneamente a Receita Bruta, CMV
                  próprio de cada regime, Carga Tributária Total, Lucro Líquido e Margem Líquida.
                </p>
              </div>

              {/* Seletor entre Custo + Margem e Preço Líquido Desejado */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-700/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedBase('cost_margin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    selectedBase === 'cost_margin'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Custo + Margem
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBase('liquid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    selectedBase === 'liquid'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Preço Líquido Desejado
                </button>
              </div>
            </div>

            {/* Aviso Informativo sobre a Natureza do Quadro (Requisito 5) */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Base selecionada:{' '}
                  <strong className="text-emerald-300">
                    {selectedBase === 'cost_margin' ? 'Custo + Margem' : 'Preço Líquido Desejado'}
                  </strong>{' '}
                  · Comparação analítica independente (não altera o cálculo nem o preço sugerido
                  ativo no Markup).
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                {selectedBase === 'cost_margin'
                  ? 'Créditos: Presumido (ICMS) · Real (ICMS+PIS+COFINS) · Simples (sem crédito)'
                  : 'Gross-up aditivo por regime: RBV = Meta Líquida / (1 - Tributos - %DV)'}
              </span>
            </div>

            {/* Tabela Lado a Lado dos Três Regimes */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-3 px-3 text-left font-semibold text-slate-300 w-1/3">
                      Linha de Resultado
                    </th>
                    <th
                      className={`py-3 px-3 text-right font-semibold ${
                        bestKey === 'presumido' && resultsByRegime.presumido.hasValidData
                          ? 'text-emerald-400 bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Lucro Presumido</span>
                        {bestKey === 'presumido' && resultsByRegime.presumido.hasValidData && (
                          <Trophy className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className={`py-3 px-3 text-right font-semibold ${
                        bestKey === 'real' && resultsByRegime.real.hasValidData
                          ? 'text-emerald-400 bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Lucro Real</span>
                        {bestKey === 'real' && resultsByRegime.real.hasValidData && (
                          <Trophy className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className={`py-3 px-3 text-right font-semibold ${
                        bestKey === 'simples' && resultsByRegime.simples.hasValidData
                          ? 'text-emerald-400 bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Simples Nacional</span>
                        {bestKey === 'simples' && resultsByRegime.simples.hasValidData && (
                          <Trophy className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {/* 1. Receita Bruta */}
                  <tr>
                    <td className="py-2.5 px-3 text-left font-medium text-slate-200">
                      Receita Bruta
                    </td>
                    {(['presumido', 'real', 'simples'] as const).map((reg) => {
                      const res = resultsByRegime[reg]
                      const isBest = bestKey === reg && res.hasValidData
                      return (
                        <td
                          key={`gross-${reg}`}
                          className={`py-2.5 px-3 text-right text-slate-200 ${
                            isBest
                              ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 font-semibold'
                              : ''
                          }`}
                        >
                          {res.hasValidData ? (
                            formatBRL(res.grossRevenue)
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Não apurado</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>

                  {/* 2. CMV (custo líquido próprio de cada regime) */}
                  <tr>
                    <td className="py-2.5 px-3 text-left text-slate-400">
                      <div className="flex flex-col">
                        <span>(−) CMV (Custo Líquido Próprio)</span>
                        <span className="text-[10px] text-slate-500">
                          {selectedBase === 'cost_margin'
                            ? 'Créditos recuperados conforme regime'
                            : 'Custo deduzido no regime'}
                        </span>
                      </div>
                    </td>
                    {(['presumido', 'real', 'simples'] as const).map((reg) => {
                      const res = resultsByRegime[reg]
                      const isBest = bestKey === reg && res.hasValidData
                      return (
                        <td
                          key={`cmv-${reg}`}
                          className={`py-2.5 px-3 text-right text-slate-400 ${
                            isBest ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30' : ''
                          }`}
                        >
                          {res.hasValidData ? (
                            `-${formatBRL(res.cmv)}`
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>

                  {/* 3. Carga Tributária Total */}
                  <tr className="bg-slate-900/40 font-semibold">
                    <td className="py-2.5 px-3 text-left text-slate-300">Carga Tributária Total</td>
                    {(['presumido', 'real', 'simples'] as const).map((reg) => {
                      const res = resultsByRegime[reg]
                      const isBest = bestKey === reg && res.hasValidData
                      return (
                        <td
                          key={`tax-${reg}`}
                          className={`py-2.5 px-3 text-right text-slate-200 ${
                            isBest
                              ? 'bg-emerald-500/10 border-l border-r border-emerald-500/40 text-emerald-300 font-bold'
                              : ''
                          }`}
                        >
                          {res.hasValidData ? (
                            <div>
                              <span>{formatBRL(res.taxesTotal)}</span>
                              <span className="text-[10px] text-slate-500 block">
                                {formatNumberBR(res.effectiveTaxRate, 2)}% efetivo
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>

                  {/* 4. Lucro Líquido Final */}
                  <tr className="bg-emerald-950/30 font-bold border-t border-emerald-500/30">
                    <td className="py-3 px-3 text-left text-emerald-400">= Lucro Líquido</td>
                    {(['presumido', 'real', 'simples'] as const).map((reg) => {
                      const res = resultsByRegime[reg]
                      const isBest = bestKey === reg && res.hasValidData
                      return (
                        <td
                          key={`profit-${reg}`}
                          className={`py-3 px-3 text-right ${
                            isBest
                              ? 'bg-emerald-500/20 border-l border-r border-emerald-500 text-emerald-300 font-black text-sm'
                              : 'text-slate-100'
                          }`}
                        >
                          {res.hasValidData ? (
                            formatBRL(res.netProfit)
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Não apurado</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>

                  {/* 5. % da Margem Líquida */}
                  <tr className="bg-slate-950/60 font-semibold text-slate-300">
                    <td className="py-2.5 px-3 text-left">Margem Líquida (%)</td>
                    {(['presumido', 'real', 'simples'] as const).map((reg) => {
                      const res = resultsByRegime[reg]
                      const isBest = bestKey === reg && res.hasValidData
                      return (
                        <td
                          key={`margin-${reg}`}
                          className={`py-2.5 px-3 text-right ${
                            isBest
                              ? 'bg-emerald-500/10 border-l border-r border-emerald-500/40 text-emerald-400 font-bold'
                              : ''
                          }`}
                        >
                          {res.hasValidData ? (
                            formatPercentBR(res.netMargin)
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Justificativa honesta por coluna caso falte dados (Requisito 6) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
              {(['presumido', 'real', 'simples'] as const).map((reg) => {
                const res = resultsByRegime[reg]
                if (res.hasValidData) {
                  return (
                    <div
                      key={`card-ok-${reg}`}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{res.regimeName}</span>
                        <span className="text-[10px] text-emerald-400">Integrado</span>
                      </div>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        {reg === 'presumido' &&
                          'Crédito de ICMS deduzido do CMV. PIS 0,65% e COFINS 3,00% cumulativos.'}
                        {reg === 'real' &&
                          'Crédito integral de ICMS, PIS (1,65%) e COFINS (7,60%) recuperáveis no CMV.'}
                        {reg === 'simples' &&
                          'Tributos de compra integram o CMV (sem crédito). Guia única DAS.'}
                      </p>
                    </div>
                  )
                }

                return (
                  <div
                    key={`card-err-${reg}`}
                    className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/30 text-[11px] font-mono text-amber-300 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{res.regimeName}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      {res.invalidReason}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
