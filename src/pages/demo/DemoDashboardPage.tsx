import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'
import { useTaxContext } from '@/contexts/TaxContext'
import {
  computeDreComparativeForRegime,
  RegimeDreComparativeData,
} from '@/components/demo/DreRegimeComparativeSection'
import { calculateCmvDetailedBreakdown } from '@/lib/cmvBreakdownCalculations'
import { calculateFatorR, calculatePgdas } from '@/lib/simplesCalculations'
import { calculatePayroll } from '@/lib/payrollCalculations'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'
import { exportDashboardToPdf, exportDashboardToExcel } from '@/lib/exportReports'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import {
  TrendingUp,
  Receipt,
  Building2,
  Factory,
  Briefcase,
  Sparkles,
  Download,
  FileSpreadsheet,
  DollarSign,
  PieChart,
  ShoppingBag,
  Calculator,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function DemoDashboardPage() {
  const navigate = useNavigate()
  const taxContext = useTaxContext()

  const {
    markupProducts = [],
    purchasesItems = [],
    getPurchaseItemUnitNetCost,
    icmsRateMarkup = 18,
    customTaxesMarkup = [],
    totalVariableExpenseRate = 0,
    simplesAnexo = 'anexo_1',
    desiredLiquidRevenueByRegime,
    calculatedPurchases,
    totalOperatingExpenses = 0,
    totalOperatingRevenues = 0,
    payrollSalaries = 0,
    payrollProLabore = 0,
    payrollInssRate = 20,
    payrollRatRate = 2,
    payrollTerceirosRate = 5.8,
    presumidoActivity = 'comercio',
    realActivity = 'comercio',
    presumidoIssRate = 0,
    realIssRate = 0,
    realAdditions = 0,
    realExclusions = 0,
    presumidoQuantitySold,
    realQuantitySold,
    simplesQuantitySold,
    totalConsolidatedQuantity = 0,
    totalPurchasesQuantity = 0,
    simplesPayroll12m = 0,
    simplesRbt12 = 0,
    effectiveSimplesRbt12,
    additionalCosts = [],
    deductionCosts = [],
    initialInventory = 0,
    finalInventory = 0,
    autoInventoryDeduction = false,
    initialInventoryUnits = 0,
    nonRecoverableTaxBase = 0,
    nonRecoverableTaxRate = 0,
    icmsPurchasesBase = 0,
    icmsPurchasesRate = 0,
    icmsFreightPurchasesBase = 0,
    icmsFreightPurchasesRate = 0,
    pisPurchasesBase = 0,
    cofinsPurchasesBase = 0,
    pisFreightPurchasesBase = 0,
    cofinsFreightPurchasesBase = 0,
    pisExcludedIcmsManual = 0,
    cofinsExcludedIcmsManual = 0,
    stSubsystem,
    operatingExpenses = [],
  } = taxContext

  // Quantidade automática canônica: prioriza totalConsolidatedQuantity do Markup, depois totalPurchasesQuantity, depois 1
  const automaticQty =
    totalConsolidatedQuantity > 0
      ? totalConsolidatedQuantity
      : (totalPurchasesQuantity || 0) > 0
        ? totalPurchasesQuantity || 0
        : 1

  // Helper de resolução de quantidade por regime
  const resolveRegimeQty = (regime: 'presumido' | 'real' | 'simples') => {
    if (
      regime === 'presumido' &&
      typeof presumidoQuantitySold === 'number' &&
      presumidoQuantitySold > 0
    ) {
      return presumidoQuantitySold
    }
    if (regime === 'real' && typeof realQuantitySold === 'number' && realQuantitySold > 0) {
      return realQuantitySold
    }
    if (
      regime === 'simples' &&
      typeof simplesQuantitySold === 'number' &&
      simplesQuantitySold > 0
    ) {
      return simplesQuantitySold
    }
    return automaticQty
  }

  // Folha de pagamento e encargos patronais canônicos
  const payrollResult = useMemo(
    () =>
      calculatePayroll({
        payrollSalaries,
        proLabore: payrollProLabore,
        inssPatronalRate: payrollInssRate,
        ratRate: payrollRatRate,
        terceirosRate: payrollTerceirosRate,
      }),
    [payrollSalaries, payrollProLabore, payrollInssRate, payrollRatRate, payrollTerceirosRate],
  )

  const directPayrollExpenses = payrollSalaries + payrollProLabore
  const patronalCharges = payrollResult.patronalChargesTotal

  // Alíquota efetiva do Simples Nacional via PGDAS oficial
  const rbtBase = effectiveSimplesRbt12 !== undefined ? effectiveSimplesRbt12 : simplesRbt12
  const currentAnexo =
    (simplesAnexo as 'anexo_1' | 'anexo_2' | 'anexo_3' | 'anexo_4' | 'anexo_5') || 'anexo_1'
  const pgdas = useMemo(() => calculatePgdas(currentAnexo, rbtBase), [currentAnexo, rbtBase])

  // 1. Apuração Canônica dos 3 Regimes via computeDreComparativeForRegime
  const dreComparative = useMemo(() => {
    const commonParams = {
      markupProducts,
      purchasesItems,
      getPurchaseItemUnitNetCost,
      icmsRate: icmsRateMarkup,
      customTaxesMarkup,
      dvRate: totalVariableExpenseRate,
      simplesEffectiveRate: pgdas.aliquotaEfetiva,
      desiredLiquidRevenueByRegime,
      calculatedPurchases,
      totalGlobalOperatingExpenses: totalOperatingExpenses,
      totalGlobalOperatingRevenues: totalOperatingRevenues,
      directPayrollExpenses,
      patronalCharges,
      presumidoActivity,
      realActivity,
      presumidoIssRate,
      realIssRate,
      realAdditions,
      realExclusions,
    }

    return {
      presumido: computeDreComparativeForRegime({
        ...commonParams,
        regimeKey: 'presumido',
        regimeQuantity: resolveRegimeQty('presumido'),
      }),
      real: computeDreComparativeForRegime({
        ...commonParams,
        regimeKey: 'real',
        regimeQuantity: resolveRegimeQty('real'),
      }),
      simples: computeDreComparativeForRegime({
        ...commonParams,
        regimeKey: 'simples',
        regimeQuantity: resolveRegimeQty('simples'),
      }),
    }
  }, [
    markupProducts,
    purchasesItems,
    getPurchaseItemUnitNetCost,
    icmsRateMarkup,
    customTaxesMarkup,
    totalVariableExpenseRate,
    pgdas.aliquotaEfetiva,
    desiredLiquidRevenueByRegime,
    calculatedPurchases,
    totalOperatingExpenses,
    totalOperatingRevenues,
    directPayrollExpenses,
    patronalCharges,
    presumidoActivity,
    realActivity,
    presumidoIssRate,
    realIssRate,
    realAdditions,
    realExclusions,
    presumidoQuantitySold,
    realQuantitySold,
    simplesQuantitySold,
    automaticQty,
  ])
  // Detalhamento do CMV oficial para os 3 regimes
  const cmvBreakdowns = useMemo(() => {
    const makeBreakdown = (regime: 'presumido' | 'real' | 'simples') => {
      const effectiveQty = resolveRegimeQty(regime)
      return calculateCmvDetailedBreakdown({
        regime,
        purchasesItems,
        additionalCosts,
        deductionCosts,
        initialInventory,
        finalInventory,
        autoInventoryDeduction,
        initialInventoryUnits,
        nonRecoverableTaxBase,
        nonRecoverableTaxRate,
        icmsPurchasesBase,
        icmsPurchasesRate,
        icmsFreightPurchasesBase,
        icmsFreightPurchasesRate,
        pisPurchasesBase,
        pisRatePurchases: 1.65,
        cofinsPurchasesBase,
        cofinsRatePurchases: 7.6,
        pisFreightPurchasesBase,
        cofinsFreightPurchasesBase,
        pisExcludedIcmsManual,
        cofinsExcludedIcmsManual,
        stSubsystemEnabled: stSubsystem?.enabled || false,
        stSubsystemPurchasesPaid: stSubsystem?.purchasesStPaid || 0,
        quantitySold: effectiveQty,
        cmvPresumidoNetPurchasesContext: calculatedPurchases.cmvPresumidoNetPurchases,
        cmvPresumidoContext: calculatedPurchases.cmvPresumido,
        cmvRealNetPurchasesContext: calculatedPurchases.cmvRealNetPurchases,
        cmvRealContext: calculatedPurchases.cmvReal,
        cmvSimplesNetPurchasesContext: calculatedPurchases.cmvSimplesNetPurchases,
        cmvSimplesContext: calculatedPurchases.cmvSimples,
        unitCostPresumidoContext: calculatedPurchases.unitCostPresumidoEffective,
        unitCostRealContext: calculatedPurchases.unitCostRealEffective,
        unitCostSimplesContext: calculatedPurchases.unitCostSimplesEffective,
        autoFinalInventoryPresumidoContext: calculatedPurchases.autoFinalInventoryPresumido,
        autoFinalInventoryRealContext: calculatedPurchases.autoFinalInventoryReal,
        autoFinalInventorySimplesContext: calculatedPurchases.autoFinalInventorySimples,
      })
    }

    return {
      presumido: makeBreakdown('presumido'),
      real: makeBreakdown('real'),
      simples: makeBreakdown('simples'),
    }
  }, [
    purchasesItems,
    additionalCosts,
    deductionCosts,
    initialInventory,
    finalInventory,
    autoInventoryDeduction,
    initialInventoryUnits,
    nonRecoverableTaxBase,
    nonRecoverableTaxRate,
    icmsPurchasesBase,
    icmsPurchasesRate,
    icmsFreightPurchasesBase,
    icmsFreightPurchasesRate,
    pisPurchasesBase,
    cofinsPurchasesBase,
    pisFreightPurchasesBase,
    cofinsFreightPurchasesBase,
    pisExcludedIcmsManual,
    cofinsExcludedIcmsManual,
    stSubsystem,
    calculatedPurchases,
    presumidoQuantitySold,
    realQuantitySold,
    simplesQuantitySold,
  ])

  // Fator R Canônico Simples Nacional
  const fatorRResult = useMemo(() => {
    return calculateFatorR(simplesPayroll12m, rbtBase)
  }, [simplesPayroll12m, rbtBase])

  // Despesas por Categoria
  const expensesByCategory = useMemo(() => {
    const cats: Record<string, number> = {
      vendas: 0,
      administrativas: 0,
      financeiras: 0,
      outras: 0,
    }
    if (Array.isArray(operatingExpenses)) {
      operatingExpenses.forEach((exp) => {
        const cat = exp.category?.toLowerCase() || 'outras'
        const val = Number(exp.value) || 0
        if (cat.includes('venda')) cats.vendas += val
        else if (cat.includes('admin') || cat.includes('pessoal') || cat.includes('folha'))
          cats.administrativas += val
        else if (cat.includes('financ')) cats.financeiras += val
        else cats.outras += val
      })
    }
    return cats
  }, [operatingExpenses])

  // Decisão do melhor regime (baseado no Preço Líquido Desejado, e com fallback para Custo + Margem)
  const regimeStats = useMemo(() => {
    const getBestPair = (d: RegimeDreComparativeData) => {
      // Prioriza liquid se hasValidData, senão costMargin
      if (d.liquid.hasValidData && d.liquid.consolidated.grossRevenue > 0) {
        return {
          mode: 'liquid' as const,
          values: d.liquid.consolidated,
          unitValues: d.liquid.unit,
        }
      }
      if (d.costMargin.hasValidData && d.costMargin.consolidated.grossRevenue > 0) {
        return {
          mode: 'costMargin' as const,
          values: d.costMargin.consolidated,
          unitValues: d.costMargin.unit,
        }
      }
      return {
        mode: 'liquid' as const,
        values: d.liquid.consolidated,
        unitValues: d.liquid.unit,
      }
    }

    const p = getBestPair(dreComparative.presumido)
    const r = getBestPair(dreComparative.real)
    const s = getBestPair(dreComparative.simples)

    const list = [
      {
        key: 'presumido',
        name: 'Lucro Presumido',
        color: '#f97316',
        values: p.values,
        unit: p.unitValues,
        hasData:
          dreComparative.presumido.liquid.hasValidData ||
          dreComparative.presumido.costMargin.hasValidData,
      },
      {
        key: 'real',
        name: 'Lucro Real',
        color: '#38bdf8',
        values: r.values,
        unit: r.unitValues,
        hasData:
          dreComparative.real.liquid.hasValidData || dreComparative.real.costMargin.hasValidData,
      },
      {
        key: 'simples',
        name: 'Simples Nacional',
        color: '#10b981',
        values: s.values,
        unit: s.unitValues,
        hasData:
          dreComparative.simples.liquid.hasValidData ||
          dreComparative.simples.costMargin.hasValidData,
      },
    ]

    // Regime mais vantajoso = maior Lucro Líquido
    const activeList = list.filter((item) => item.hasData && item.values.grossRevenue > 0)
    let best = activeList[0] || list[0]
    for (const item of activeList) {
      if (item.values.netProfit > best.values.netProfit) {
        best = item
      }
    }

    // Economia comparada ao pior regime
    let worst = activeList[0] || list[0]
    for (const item of activeList) {
      if (item.values.netProfit < worst.values.netProfit) {
        worst = item
      }
    }
    const economy = Math.max(0, best.values.netProfit - worst.values.netProfit)

    return { list, best, worst, economy, hasAnyData: activeList.length > 0 }
  }, [dreComparative])

  // Dados para o Gráfico Recharts de Comparação dos 3 Regimes
  const barChartData = useMemo(() => {
    return [
      {
        name: 'Lucro Presumido',
        regimeKey: 'presumido',
        receitaLiquida: dreComparative.presumido.liquid.hasValidData
          ? dreComparative.presumido.liquid.consolidated.netRevenue
          : dreComparative.presumido.costMargin.consolidated.netRevenue,
        cargaTributaria: dreComparative.presumido.liquid.hasValidData
          ? dreComparative.presumido.liquid.consolidated.taxesTotal +
            dreComparative.presumido.liquid.consolidated.irpj +
            dreComparative.presumido.liquid.consolidated.irpjAdditional +
            dreComparative.presumido.liquid.consolidated.csll
          : dreComparative.presumido.costMargin.consolidated.taxesTotal +
            dreComparative.presumido.costMargin.consolidated.irpj +
            dreComparative.presumido.costMargin.consolidated.irpjAdditional +
            dreComparative.presumido.costMargin.consolidated.csll,
        lucroLiquido: dreComparative.presumido.liquid.hasValidData
          ? dreComparative.presumido.liquid.consolidated.netProfit
          : dreComparative.presumido.costMargin.consolidated.netProfit,
        cmv: dreComparative.presumido.liquid.hasValidData
          ? dreComparative.presumido.liquid.consolidated.cmv
          : dreComparative.presumido.costMargin.consolidated.cmv,
      },
      {
        name: 'Lucro Real',
        regimeKey: 'real',
        receitaLiquida: dreComparative.real.liquid.hasValidData
          ? dreComparative.real.liquid.consolidated.netRevenue
          : dreComparative.real.costMargin.consolidated.netRevenue,
        cargaTributaria: dreComparative.real.liquid.hasValidData
          ? dreComparative.real.liquid.consolidated.taxesTotal +
            dreComparative.real.liquid.consolidated.irpj +
            dreComparative.real.liquid.consolidated.irpjAdditional +
            dreComparative.real.liquid.consolidated.csll
          : dreComparative.real.costMargin.consolidated.taxesTotal +
            dreComparative.real.costMargin.consolidated.irpj +
            dreComparative.real.costMargin.consolidated.irpjAdditional +
            dreComparative.real.costMargin.consolidated.csll,
        lucroLiquido: dreComparative.real.liquid.hasValidData
          ? dreComparative.real.liquid.consolidated.netProfit
          : dreComparative.real.costMargin.consolidated.netProfit,
        cmv: dreComparative.real.liquid.hasValidData
          ? dreComparative.real.liquid.consolidated.cmv
          : dreComparative.real.costMargin.consolidated.cmv,
      },
      {
        name: 'Simples Nacional',
        regimeKey: 'simples',
        receitaLiquida: dreComparative.simples.liquid.hasValidData
          ? dreComparative.simples.liquid.consolidated.netRevenue
          : dreComparative.simples.costMargin.consolidated.netRevenue,
        cargaTributaria: dreComparative.simples.liquid.hasValidData
          ? dreComparative.simples.liquid.consolidated.dasTotal
          : dreComparative.simples.costMargin.consolidated.dasTotal,
        lucroLiquido: dreComparative.simples.liquid.hasValidData
          ? dreComparative.simples.liquid.consolidated.netProfit
          : dreComparative.simples.costMargin.consolidated.netProfit,
        cmv: dreComparative.simples.liquid.hasValidData
          ? dreComparative.simples.liquid.consolidated.cmv
          : dreComparative.simples.costMargin.consolidated.cmv,
      },
    ]
  }, [dreComparative])

  // Exportação PDF/Excel
  const handleExport = (type: 'pdf' | 'excel') => {
    const bestItem = regimeStats.best
    const summaryRegimes = regimeStats.list.map((r) => {
      const taxes =
        r.key === 'simples'
          ? r.values.dasTotal
          : r.values.taxesTotal + r.values.irpj + r.values.irpjAdditional + r.values.csll
      const effRate = r.values.grossRevenue > 0 ? (taxes / r.values.grossRevenue) * 100 : 0
      return {
        name: r.name,
        taxBurden: taxes,
        effectiveTaxRate: effRate,
        netProfit: r.values.netProfit,
        netMargin: r.values.netMargin,
        isBest: r.key === bestItem.key,
      }
    })

    const rows = [
      {
        line: 'Receita Bruta',
        presumido: dreComparative.presumido.liquid.consolidated.grossRevenue,
        real: dreComparative.real.liquid.consolidated.grossRevenue,
        simples: dreComparative.simples.liquid.consolidated.grossRevenue,
        isHeader: true,
      },
      {
        line: 'Deduções e Tributos sobre Receita',
        presumido: dreComparative.presumido.liquid.consolidated.taxesTotal,
        real: dreComparative.real.liquid.consolidated.taxesTotal,
        simples: dreComparative.simples.liquid.consolidated.dasTotal,
      },
      {
        line: 'Receita Líquida',
        presumido: dreComparative.presumido.liquid.consolidated.netRevenue,
        real: dreComparative.real.liquid.consolidated.netRevenue,
        simples: dreComparative.simples.liquid.consolidated.netRevenue,
        isHighlight: true,
      },
      {
        line: 'CMV (Custo das Mercadorias)',
        presumido: dreComparative.presumido.liquid.consolidated.cmv,
        real: dreComparative.real.liquid.consolidated.cmv,
        simples: dreComparative.simples.liquid.consolidated.cmv,
      },
      {
        line: 'Lucro Bruto',
        presumido: dreComparative.presumido.liquid.consolidated.grossProfit,
        real: dreComparative.real.liquid.consolidated.grossProfit,
        simples: dreComparative.simples.liquid.consolidated.grossProfit,
      },
      {
        line: 'Despesas Operacionais',
        presumido: dreComparative.presumido.liquid.consolidated.operatingExpenses,
        real: dreComparative.real.liquid.consolidated.operatingExpenses,
        simples: dreComparative.simples.liquid.consolidated.operatingExpenses,
      },
      {
        line: 'LAIR',
        presumido: dreComparative.presumido.liquid.consolidated.lair,
        real: dreComparative.real.liquid.consolidated.lair,
        simples: dreComparative.simples.liquid.consolidated.lair,
      },
      {
        line: 'IRPJ + CSLL',
        presumido:
          dreComparative.presumido.liquid.consolidated.irpj +
          dreComparative.presumido.liquid.consolidated.irpjAdditional +
          dreComparative.presumido.liquid.consolidated.csll,
        real:
          dreComparative.real.liquid.consolidated.irpj +
          dreComparative.real.liquid.consolidated.irpjAdditional +
          dreComparative.real.liquid.consolidated.csll,
        simples: 0,
      },
      {
        line: 'Lucro Líquido Final',
        presumido: dreComparative.presumido.liquid.consolidated.netProfit,
        real: dreComparative.real.liquid.consolidated.netProfit,
        simples: dreComparative.simples.liquid.consolidated.netProfit,
        isTotal: true,
      },
    ]

    const options = {
      quantity: resolveRegimeQty(bestItem.key as 'presumido' | 'real' | 'simples'),
      unitGrossRevenue: bestItem.unit.grossRevenue,
      totalGrossRevenue: bestItem.values.grossRevenue,
      bestRegime: {
        key: bestItem.key,
        name: bestItem.name,
      },
      economyDifference: regimeStats.economy,
      worstRegimeName: regimeStats.worst.name,
      summaryRegimes,
      comparisonRows: rows,
      notes: [
        'Demonstrativo gerado a partir do motor canônico do IT — Inteligência Tributária.',
        'Sem duplicidade de cálculo: valores derivados das DREs oficiais e Calculadora de Markup.',
        'Regras do Tema 69/STF aplicadas na apuração não-cumulativa de PIS/COFINS.',
      ],
    }

    if (type === 'pdf') {
      exportDashboardToPdf(options)
    } else {
      exportDashboardToExcel(options)
    }
  }

  return (
    <DemoLayout currentTab="dashboard">
      <div className="space-y-6">
        {/* HERO */}
        <PageHero
          title="Dashboard de Inteligência Tributária"
          subtitle="Visão executiva integrada com KPIs consolidados, confronto direto dos três regimes, composição de CMV e diagnóstico do Fator R."
          badge="ANÁLISE ESTRATÉGICA EM TEMPO REAL"
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs h-8 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Exportar PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs h-8 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Exportar Excel
              </Button>
            </div>
          }
        />

        {/* 1. SEÇÃO DE KPIS DO TOPO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Receita Bruta Consolidada */}
          <div className="rounded-2xl border border-slate-800 bg-[#091310]/80 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">Receita Consolidada</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {regimeStats.hasAnyData ? formatBRL(regimeStats.best.values.grossRevenue) : 'R$ 0,00'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Base do regime vencedor ({regimeStats.best.name})
            </p>
          </div>

          {/* Card 2: Custo das Mercadorias (CMV) */}
          <div className="rounded-2xl border border-slate-800 bg-[#091310]/80 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">CMV Total</span>
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {regimeStats.hasAnyData ? formatBRL(regimeStats.best.values.cmv) : 'R$ 0,00'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Deduz créditos fiscais permitidos
            </p>
          </div>

          {/* Card 3: Lucro Líquido Final */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between text-emerald-300 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider font-bold">Lucro Líquido</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
              {regimeStats.hasAnyData ? formatBRL(regimeStats.best.values.netProfit) : 'R$ 0,00'}
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1 font-mono font-semibold">
              Margem Líquida: {formatPercentBR(regimeStats.best.values.netMargin)}
            </p>
          </div>

          {/* Card 4: Regime Mais Vantajoso */}
          <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-[#0c241d] to-[#081713] p-4 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-teal-300 text-xs mb-1">
                <span className="font-mono uppercase tracking-wider font-bold">Mais Vantajoso</span>
                <Sparkles className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-lg font-black text-white tracking-tight flex items-center gap-1.5 mt-1">
                <span>{regimeStats.best.name}</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Vantagem:</span>
              <span className="text-emerald-400 font-bold">
                {regimeStats.economy > 0 ? `+${formatBRL(regimeStats.economy)}` : 'Empate técnico'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. GRÁFICO RECHARTS DE CONFRONTO DOS 3 REGIMES */}
        <div className="rounded-2xl border border-slate-800 bg-[#091310]/90 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Confronto Triplo dos Regimes Tributários
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                >
                  PRESUMIDO × REAL × SIMPLES
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparativo de Receita Líquida, Carga Tributária e Lucro Líquido apurados pelas
                DREs.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-orange-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                Presumido
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                Real
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                Simples
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: number) => [formatBRL(val), '']}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  contentStyle={{
                    backgroundColor: '#05110d',
                    borderColor: '#059669',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar
                  dataKey="receitaLiquida"
                  name="Receita Líquida"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="cargaTributaria"
                  name="Carga Tributária Total"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="lucroLiquido"
                  name="Lucro Líquido Final"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. COMPARADOR CUSTO + MARGEM × RECEITA LÍQUIDA DESEJADA */}
        <div className="rounded-2xl border border-slate-800 bg-[#091310]/90 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Comparador de Metodologias: Preço Líquido Desejado vs Custo + Margem
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comportamento das duas metodologias canônicas da Calculadora Markup em cada regime.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/demo/markup')}
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 font-mono"
            >
              Ajustar na Markup &rarr;
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/60 text-slate-300">
                  <th className="py-2.5 px-3 text-left">Regime</th>
                  <th className="py-2.5 px-3 text-right">Preço Bruto (Líquido Desejado)</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                    Lucro Líq. (Líquido)
                  </th>
                  <th className="py-2.5 px-3 text-right">Preço Bruto (Custo + Margem)</th>
                  <th className="py-2.5 px-3 text-right text-sky-400 font-bold">
                    Lucro Líq. (Custo + Margem)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {regimeStats.list.map((r) => {
                  const compData = dreComparative[r.key as 'presumido' | 'real' | 'simples']
                  return (
                    <tr key={r.key} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 text-white font-semibold flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: r.color }}
                        />
                        {r.name}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {compData.liquid.hasValidData
                          ? formatBRL(compData.liquid.consolidated.grossRevenue)
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        {compData.liquid.hasValidData
                          ? formatBRL(compData.liquid.consolidated.netProfit)
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {compData.costMargin.hasValidData
                          ? formatBRL(compData.costMargin.consolidated.grossRevenue)
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-sky-400 font-bold">
                        {compData.costMargin.hasValidData
                          ? formatBRL(compData.costMargin.consolidated.netProfit)
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. COMPOSIÇÃO DE CUSTOS: CMV DETALHADO + DESPESAS POR CATEGORIA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Composição do CMV */}
          <div className="rounded-2xl border border-slate-800 bg-[#091310]/90 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Composição Canônica do CMV</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/demo/compras')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-6 font-mono"
              >
                Calculadora Compras &rarr;
              </Button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <span className="text-slate-400">Mercadoria Bruta de Compra:</span>
                <span className="text-slate-200 font-semibold">
                  {formatBRL(cmvBreakdowns.presumido.merchandiseTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <span className="text-slate-400">Frete & Encargos de Entrada:</span>
                <span className="text-slate-200 font-semibold">
                  {formatBRL(
                    cmvBreakdowns.presumido.freightTotal + cmvBreakdowns.presumido.otherCostsTotal,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                <span className="text-emerald-300">Créditos Tributários (Real):</span>
                <span className="text-emerald-400 font-bold">
                  -
                  {formatBRL(
                    cmvBreakdowns.real.totalIcms +
                      cmvBreakdowns.real.totalPis +
                      cmvBreakdowns.real.totalCofins,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <span className="text-slate-400">CMV Final (Presumido):</span>
                <span className="text-orange-400 font-bold">
                  {formatBRL(cmvBreakdowns.presumido.totalCmv)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <span className="text-slate-400">CMV Final (Real - c/ créditos plenos):</span>
                <span className="text-sky-400 font-bold">
                  {formatBRL(cmvBreakdowns.real.totalCmv)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <span className="text-slate-400">CMV Final (Simples - sem créditos):</span>
                <span className="text-emerald-400 font-bold">
                  {formatBRL(cmvBreakdowns.simples.totalCmv)}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Despesas por Categoria */}
          <div className="rounded-2xl border border-slate-800 bg-[#091310]/90 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Despesas Operacionais por Categoria
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/demo/despesas-operacionais')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-6 font-mono"
              >
                Gerenciar Despesas &rarr;
              </Button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <span className="text-slate-400">Despesas com Vendas:</span>
                <span className="text-slate-200 font-semibold">
                  {formatBRL(expensesByCategory.vendas)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <span className="text-slate-400">Despesas Administrativas & Folha:</span>
                <span className="text-slate-200 font-semibold">
                  {formatBRL(expensesByCategory.administrativas + directPayrollExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <span className="text-slate-400">Despesas Financeiras:</span>
                <span className="text-slate-200 font-semibold">
                  {formatBRL(expensesByCategory.financeiras)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                <span className="text-slate-400">Outras Despesas Operacionais:</span>
                <span className="text-slate-200 font-semibold">
                  {formatBRL(expensesByCategory.outras)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                <span className="text-emerald-300 font-bold">Total Geral de Despesas:</span>
                <span className="text-emerald-400 font-bold">
                  {formatBRL(totalOperatingExpenses + directPayrollExpenses)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. PAINEL DESPESAS × RECEITAS OPERACIONAIS + FATOR R */}
        <div className="rounded-2xl border border-slate-800 bg-[#091310]/90 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Painel de Eficiência Operacional & Análise de Fator R (LC 123/2006)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Enquadramento no Simples Nacional: Anexo III (alíquota a partir de 6%) se
                Folha/RBT12 &ge; 28%, caso contrário Anexo V (a partir de 15,5%).
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/demo/simples')}
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 font-mono"
            >
              Ver DRE Simples &rarr;
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            {/* Bloco 1: Folha 12 Meses */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">
                Folha Salarial + Encargos (12m)
              </span>
              <span className="text-base font-bold text-white mt-1 block">
                {formatBRL(simplesPayroll12m)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Salários, pró-labore e CPP
              </span>
            </div>

            {/* Bloco 2: RBT12 Acumulado */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">RBT12 Acumulado</span>
              <span className="text-base font-bold text-white mt-1 block">
                {formatBRL(
                  effectiveSimplesRbt12 !== undefined ? effectiveSimplesRbt12 : simplesRbt12,
                )}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Receita bruta últimos 12 meses
              </span>
            </div>

            {/* Bloco 3: Diagnóstico Fator R */}
            <div
              className={`p-3.5 rounded-xl border ${
                fatorRResult.isElegibleAnexo3
                  ? 'bg-emerald-950/30 border-emerald-500/30'
                  : 'bg-amber-950/30 border-amber-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-semibold">Fator R Apurado</span>
                <Badge
                  variant="outline"
                  className={
                    fatorRResult.isElegibleAnexo3
                      ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                      : 'border-amber-500 text-amber-300 bg-amber-500/10'
                  }
                >
                  {fatorRResult.isElegibleAnexo3 ? 'ANEXO III' : 'ANEXO V'}
                </Badge>
              </div>
              <span className="text-base font-bold text-white mt-1 block">
                {formatPercentBR(fatorRResult.fatorRPercent)}
              </span>
              <span
                className={`text-[10px] mt-0.5 block font-semibold ${
                  fatorRResult.isElegibleAnexo3 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {fatorRResult.isElegibleAnexo3
                  ? '✓ Folha ≥ 28%: Tributação no Anexo III'
                  : '⚠ Folha < 28%: Sujeito ao Anexo V'}
              </span>
            </div>
          </div>
        </div>

        {/* 6. ATALHOS RÁPIDOS PARA OUTROS MÓDULOS */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <h4 className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Atalhos Rápidos para Aprofundamento Detalhado
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Calculadora Markup', path: '/demo/markup', icon: Calculator },
              { label: 'Calculadora Compras', path: '/demo/compras', icon: ShoppingBag },
              {
                label: 'Despesas Operacionais',
                path: '/demo/despesas-operacionais',
                icon: PieChart,
              },
              { label: 'DRE Lucro Presumido', path: '/demo/dre-presumido', icon: Briefcase },
              { label: 'DRE Lucro Real', path: '/demo/dre-real', icon: Factory },
              { label: 'DRE Simples Nacional', path: '/demo/simples', icon: Building2 },
            ].map((shortcut) => {
              const Icon = shortcut.icon
              return (
                <button
                  key={shortcut.path}
                  type="button"
                  onClick={() => navigate(shortcut.path)}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/80 transition-all text-left group cursor-pointer flex flex-col justify-between h-20"
                >
                  <Icon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-slate-300 font-semibold group-hover:text-white leading-tight">
                    {shortcut.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </DemoLayout>
  )
}
