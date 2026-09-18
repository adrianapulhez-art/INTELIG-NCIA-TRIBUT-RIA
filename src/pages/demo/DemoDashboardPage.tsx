import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'
import { useTaxContext, TaxRegime } from '@/contexts/TaxContext'
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
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
  LayoutDashboard,
  Layers,
  Percent,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Subcomponentes Dark Cockpit
import { CockpitDonutKpiCard } from '@/components/demo/dashboard/CockpitDonutKpiCard'
import { CockpitAdvantageHeroCard } from '@/components/demo/dashboard/CockpitAdvantageHeroCard'
import { CockpitHeroAreaChart } from '@/components/demo/dashboard/CockpitHeroAreaChart'
import { CockpitFatorRGauge } from '@/components/demo/dashboard/CockpitFatorRGauge'
import {
  CockpitMiniSidebar,
  CockpitSectionItem,
} from '@/components/demo/dashboard/CockpitMiniSidebar'
import {
  CockpitPerspectiveSelector,
  PerspectiveMode,
} from '@/components/demo/dashboard/CockpitPerspectiveSelector'
import { CockpitDrillDownModal } from '@/components/demo/dashboard/CockpitDrillDownModal'
import { CockpitTaxRegimeDonut } from '@/components/demo/dashboard/CockpitTaxRegimeDonut'
import { CockpitProductCostDonut } from '@/components/demo/dashboard/CockpitProductCostDonut'
import { CockpitMethodologyHybridTable } from '@/components/demo/dashboard/CockpitMethodologyHybridTable'
import { CockpitProductRanking } from '@/components/demo/dashboard/CockpitProductRanking'
import { CockpitTaxBulletCharts } from '@/components/demo/dashboard/CockpitTaxBulletCharts'
import { CockpitExpensesBarDistribution } from '@/components/demo/dashboard/CockpitExpensesBarDistribution'

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

  // Estado da perspectiva selecionada no topo ('regime' | 'product' | 'price_mode')
  const [perspective, setPerspective] = useState<PerspectiveMode>('regime')

  // Estado da seção ativa na mini sidebar exclusiva
  const [activeSection, setActiveSection] = useState<string>('quadro-visao-geral')

  // Estado do modal de drill-down por produto
  const [isDrillOpen, setIsDrillOpen] = useState<boolean>(false)
  const [drillTarget, setDrillTarget] = useState<'cmv' | 'despesas' | 'receitas' | null>(null)

  // Estado do produto selecionado para o Donut "Composição do Custo de um Produto"
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isProductDonutHighlighted, setIsProductDonutHighlighted] = useState<boolean>(false)

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

  // Estatísticas e decisão do melhor regime
  const regimeStats = useMemo(() => {
    const getBestPair = (d: RegimeDreComparativeData) => {
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
        key: 'presumido' as const,
        name: 'Lucro Presumido',
        shortName: 'Presumido',
        color: '#f97316',
        values: p.values,
        unit: p.unitValues,
        hasData:
          dreComparative.presumido.liquid.hasValidData ||
          dreComparative.presumido.costMargin.hasValidData,
      },
      {
        key: 'real' as const,
        name: 'Lucro Real',
        shortName: 'Real',
        color: '#38bdf8',
        values: r.values,
        unit: r.unitValues,
        hasData:
          dreComparative.real.liquid.hasValidData || dreComparative.real.costMargin.hasValidData,
      },
      {
        key: 'simples' as const,
        name: 'Simples Nacional',
        shortName: 'Simples',
        color: '#10b981',
        values: s.values,
        unit: s.unitValues,
        hasData:
          dreComparative.simples.liquid.hasValidData ||
          dreComparative.simples.costMargin.hasValidData,
      },
    ]

    const activeList = list.filter((item) => item.hasData && item.values.grossRevenue > 0)
    let best = activeList[0] || list[0]
    for (const item of activeList) {
      if (item.values.netProfit > best.values.netProfit) {
        best = item
      }
    }

    let worst = activeList[0] || list[0]
    for (const item of activeList) {
      if (item.values.netProfit < worst.values.netProfit) {
        worst = item
      }
    }
    const economy = Math.max(0, best.values.netProfit - worst.values.netProfit)

    return { list, best, worst, economy, hasAnyData: activeList.length > 0 }
  }, [dreComparative])

  // Sparkline data derivado de produtos reais cadastrados (para os KPIs do topo)
  const productSparklines = useMemo(() => {
    if (markupProducts.length === 0) return { revenues: [100, 100], costs: [50, 50] }
    const revs = markupProducts.map((p) => p.totalRevenue || p.salePrice || 0)
    const costs = markupProducts.map((p) => p.totalCost || p.cost || 0)
    return {
      revenues: revs.length > 1 ? revs : [revs[0] || 0, revs[0] || 0],
      costs: costs.length > 1 ? costs : [costs[0] || 0, costs[0] || 0],
    }
  }, [markupProducts])

  // Percentuais derivados para os donuts dos KPIs do topo
  const kpiDonuts = useMemo(() => {
    const gross = regimeStats.best.values.grossRevenue || 1
    const cmv = regimeStats.best.values.cmv || 0
    const netProfit = regimeStats.best.values.netProfit || 0
    const margin = regimeStats.best.values.netMargin || 0

    // CMV como % da Receita Bruta
    const cmvPct = Math.min(100, Math.max(0, (cmv / gross) * 100))
    // Margem líquida como %
    const marginPct = Math.min(100, Math.max(0, margin))
    // Receita consolidada (fração padrão 100%)
    const grossPct = 100

    return { cmvPct, marginPct, grossPct }
  }, [regimeStats])

  // Dados para o Gráfico-Hero de Área (Confronto Triplo Luminoso)
  const heroAreaData = useMemo(() => {
    return regimeStats.list.map((r) => {
      const taxes =
        r.key === 'simples'
          ? r.values.dasTotal
          : r.values.taxesTotal + r.values.irpj + r.values.irpjAdditional + r.values.csll
      const effRate = r.values.grossRevenue > 0 ? (taxes / r.values.grossRevenue) * 100 : 0
      return {
        regimeKey: r.key,
        name: r.name,
        shortName: r.shortName,
        receitaLiquida: r.values.netRevenue,
        cargaTributaria: taxes,
        lucroLiquido: r.values.netProfit,
        cmv: r.values.cmv,
        aliquotaEfetiva: effRate,
        isBest: r.key === regimeStats.best.key,
      }
    })
  }, [regimeStats])

  // G) NOTAS EXPLICATIVAS DINÂMICAS COM NÚMEROS REAIS DERIVADOS DO CONTEXTO
  const explanatoryNotes = useMemo(() => {
    // 1. Nota do Gráfico-Hero por Regime: Custo de tributo por R$ 100 vendidos
    const pTaxes =
      dreComparative.presumido.liquid.consolidated.taxesTotal +
      dreComparative.presumido.liquid.consolidated.irpj +
      dreComparative.presumido.liquid.consolidated.irpjAdditional +
      dreComparative.presumido.liquid.consolidated.csll
    const pGross = dreComparative.presumido.liquid.consolidated.grossRevenue || 1
    const pRate = (pTaxes / pGross) * 100

    const sTaxes = dreComparative.simples.liquid.consolidated.dasTotal
    const sGross = dreComparative.simples.liquid.consolidated.grossRevenue || 1
    const sRate = (sTaxes / sGross) * 100

    const rTaxes =
      dreComparative.real.liquid.consolidated.taxesTotal +
      dreComparative.real.liquid.consolidated.irpj +
      dreComparative.real.liquid.consolidated.irpjAdditional +
      dreComparative.real.liquid.consolidated.csll
    const rGross = dreComparative.real.liquid.consolidated.grossRevenue || 1
    const rRate = (rTaxes / rGross) * 100

    const heroNote = `No Lucro Presumido, cada R$ 100 faturados recolhem R$ ${pRate.toFixed(2)} em tributos; no Lucro Real, R$ ${rRate.toFixed(2)}; e no Simples Nacional, R$ ${sRate.toFixed(2)}. O regime ${regimeStats.best.name} gera a maior eficiência líquida final (+${formatBRL(regimeStats.best.values.netProfit)}).`

    // 2. Nota da Composição de Custos / CMV: % da mercadoria sobre o custo total
    const totalCmvBase = cmvBreakdowns.presumido.totalCmv || 1
    const merchandiseBase = cmvBreakdowns.presumido.merchandiseTotal || 0
    const merchandisePct = Math.min(100, (merchandiseBase / totalCmvBase) * 100)
    const cmvNote = `A mercadoria responde por ${merchandisePct.toFixed(0)}% do seu custo de compra (${formatBRL(merchandiseBase)}) — é na negociação da entrada de insumos e no aproveitamento de créditos que uma gestão assertiva gera mais resultado do que qualquer corte linear de despesa.`

    // 3. Nota do Comparador de Modos de Preço
    const bestRegimeKey = regimeStats.best.key
    const compData = dreComparative[bestRegimeKey]
    const pLiquidRev = compData.liquid.consolidated.grossRevenue
    const pCostMarginRev = compData.costMargin.consolidated.grossRevenue
    const diffModes = Math.abs(pLiquidRev - pCostMarginRev)
    const priceModeNote = `No regime ${regimeStats.best.name}, o modo Preço Líquido projeta faturamento de ${formatBRL(pLiquidRev)} vs ${formatBRL(pCostMarginRev)} em Custo + Margem (variação de ${formatBRL(diffModes)}). O Preço Líquido protege a margem alvo contra distorções tributárias.`

    // 4. Nota do Medidor Fator R
    const fatorVal = fatorRResult.fatorRPercent
    const fatorNote = fatorRResult.isElegibleAnexo3
      ? `Sua folha de salários representa ${fatorVal.toFixed(1)}% da RBT12 — situando-se com segurança acima dos 28%, garantindo tributação pela alíquota reduzida do Anexo III (a partir de 6%) em vez do Anexo V (15,5%).`
      : `Sua folha de salários representa ${fatorVal.toFixed(1)}% da RBT12 — abaixo dos 28% legais. Com isso, os serviços ficam retidos no Anexo V (a partir de 15,5%). Aumentar pró-labore ou folha pode rebaixar a alíquota para o Anexo III.`

    // 5. Nota do Donut Carga Tributária por Regime
    const totalTaxGroup = pTaxes + rTaxes + sTaxes
    const pTaxPct = totalTaxGroup > 0 ? (pTaxes / totalTaxGroup) * 100 : 33.3
    const rTaxPct = totalTaxGroup > 0 ? (rTaxes / totalTaxGroup) * 100 : 33.3
    const sTaxPct = totalTaxGroup > 0 ? (sTaxes / totalTaxGroup) * 100 : 33.4
    const taxDonutNote = `A soma dos tributos apurados nos 3 regimes totaliza ${formatBRL(totalTaxGroup)}: o Lucro Presumido responde por ${pTaxPct.toFixed(1)}% (${formatBRL(pTaxes)}), o Lucro Real por ${rTaxPct.toFixed(1)}% (${formatBRL(rTaxes)}) e o Simples por ${sTaxPct.toFixed(1)}% (${formatBRL(sTaxes)}). A menor fatia aponta a menor drenagem de caixa sobre a mesma base de negócios.`

    // 6. Nota dos Bullet Charts de Carga Tributária
    const minTaxRate = Math.min(pRate, rRate, sRate)
    const maxTaxRate = Math.max(pRate, rRate, sRate)
    const bulletTaxNote = `A amplitude de alíquotas efetivas varia entre ${minTaxRate.toFixed(2)}% no melhor enquadramento (${regimeStats.best.shortName}) e ${maxTaxRate.toFixed(2)}% no mais oneroso (spread de ${(maxTaxRate - minTaxRate).toFixed(2)} pontos percentuais). Cada ponto economizado vai integralmente para a margem líquida da empresa.`
    // 7. Nota de Despesas por Categoria
    const totalExpWithPayroll = totalOperatingExpenses + directPayrollExpenses
    const admPct =
      totalExpWithPayroll > 0
        ? ((expensesByCategory.administrativas + directPayrollExpenses) / totalExpWithPayroll) * 100
        : 0
    const expensesNote = `Das despesas operacionais consolidadas (${formatBRL(totalExpWithPayroll)}), a parcela administrativa e folha responde por ${admPct.toFixed(1)}% (${formatBRL(expensesByCategory.administrativas + directPayrollExpenses)}). No Lucro Real, cada R$ 1,00 dessas despesas abate R$ 0,34 em IRPJ/CSLL.`

    return {
      heroNote,
      cmvNote,
      priceModeNote,
      fatorNote,
      taxDonutNote,
      bulletTaxNote,
      expensesNote,
    }
  }, [
    dreComparative,
    regimeStats,
    cmvBreakdowns,
    fatorRResult,
    totalOperatingExpenses,
    directPayrollExpenses,
    expensesByCategory,
  ])
  // Lista de produtos formatada para o modal de Drill-Down
  const productDrillItems = useMemo(() => {
    return markupProducts.map((p) => {
      const pCost = typeof p.cost === 'number' && !isNaN(p.cost) ? p.cost : 0
      const pQty = typeof p.quantity === 'number' && !isNaN(p.quantity) ? p.quantity : 1
      const pSalePrice = typeof p.salePrice === 'number' && !isNaN(p.salePrice) ? p.salePrice : 0
      const pTotalRevenue =
        typeof p.totalRevenue === 'number' && !isNaN(p.totalRevenue) && p.totalRevenue > 0
          ? p.totalRevenue
          : pSalePrice * pQty
      const pTotalCost =
        typeof p.totalCost === 'number' && !isNaN(p.totalCost) && p.totalCost > 0
          ? p.totalCost
          : pCost * pQty

      return {
        id: p.id || `prod-${Math.random()}`,
        name: p.name || 'Produto',
        mode: (p.mode === 'liquid' ? 'liquid' : 'cost_margin') as 'liquid' | 'cost_margin',
        quantity: pQty,
        unitCost: pCost,
        totalCost: pTotalCost,
        unitSalePrice: pSalePrice,
        totalRevenue: pTotalRevenue,
        cmvPresumido: calculatedPurchases.unitCostPresumidoEffective || pCost * 0.82,
        cmvReal: calculatedPurchases.unitCostRealEffective || pCost * 0.7275,
        cmvSimples: calculatedPurchases.unitCostSimplesEffective || pCost,
      }
    })
  }, [markupProducts, calculatedPurchases])

  // Item selecionado para o Donut "Composição do Custo de um produto"
  const activeCostProduct = useMemo(() => {
    if (productDrillItems.length === 0) {
      return {
        id: 'default',
        name: 'Insumo Base / Mercadoria Padrão',
        unitCost: 100,
        quantity: 1,
        mode: 'cost_margin' as const,
        freightUnit: 5,
        chargesUnit: 5,
        merchandiseUnit: 90,
      }
    }

    let found = selectedProductId ? productDrillItems.find((p) => p.id === selectedProductId) : null

    if (!found) {
      // Se nenhum selecionado, pega o produto com maior custo unitário
      found = [...productDrillItems].sort((a, b) => b.unitCost - a.unitCost)[0]
    }

    const unitCost = found.unitCost || 1
    // Proporções canônicas de desdobramento de compras (mercadoria, frete, encargos)
    const totalPurchasesGross = cmvBreakdowns.presumido.merchandiseTotal || unitCost * 0.85
    const totalFreight = cmvBreakdowns.presumido.freightTotal || unitCost * 0.08
    const totalCharges = cmvBreakdowns.presumido.otherCostsTotal || unitCost * 0.07
    const sumComponents = totalPurchasesGross + totalFreight + totalCharges || 1

    const merchRatio = Math.max(0.05, totalPurchasesGross / sumComponents)
    const freightRatio = Math.max(0, totalFreight / sumComponents)
    const chargesRatio = Math.max(0, totalCharges / sumComponents)

    const merchandiseUnit = unitCost * merchRatio
    const freightUnit = unitCost * freightRatio
    const chargesUnit = unitCost * chargesRatio

    return {
      id: found.id,
      name: found.name,
      unitCost,
      quantity: found.quantity,
      mode: found.mode,
      merchandiseUnit,
      freightUnit,
      chargesUnit,
    }
  }, [productDrillItems, selectedProductId, cmvBreakdowns])

  // Fatias do Donut de Composição do Custo
  const productCostSlices = useMemo(() => {
    const total = activeCostProduct.unitCost || 1
    const merch = activeCostProduct.merchandiseUnit || 0
    const freight = activeCostProduct.freightUnit || 0
    const charges = activeCostProduct.chargesUnit || 0

    return [
      {
        key: 'merchandise',
        name: 'Mercadoria Bruta',
        value: merch,
        percentage: Math.min(100, (merch / total) * 100) || 0,
        color: '#f97316', // laranja
      },
      {
        key: 'freight',
        name: 'Frete de Entrada',
        value: freight,
        percentage: Math.min(100, (freight / total) * 100) || 0,
        color: '#38bdf8', // azul
      },
      {
        key: 'charges',
        name: 'Outros Encargos & Seguro',
        value: charges,
        percentage: Math.min(100, (charges / total) * 100) || 0,
        color: '#10b981', // esmeralda
      },
    ]
  }, [activeCostProduct])

  // Nota explicativa do Donut de Custo de Produto
  const productCostNote = useMemo(() => {
    const merchPct = productCostSlices[0]?.percentage || 85
    const merchVal = formatBRL(productCostSlices[0]?.value || 0)
    const totalVal = formatBRL(activeCostProduct.unitCost)
    return `A mercadoria responde por ${merchPct.toFixed(1)}% (${merchVal}) do custo unitário de ${activeCostProduct.name} (${totalVal}). A eficiência nas cotações e a recuperação de créditos de ICMS/PIS/COFINS nesse insumo definem a margem bruta real.`
  }, [productCostSlices, activeCostProduct])

  // Dados para o Donut "Carga Tributária por Regime"
  const taxRegimeDonutData = useMemo(() => {
    const pTaxes =
      dreComparative.presumido.liquid.consolidated.taxesTotal +
      dreComparative.presumido.liquid.consolidated.irpj +
      dreComparative.presumido.liquid.consolidated.irpjAdditional +
      dreComparative.presumido.liquid.consolidated.csll
    const pGross = dreComparative.presumido.liquid.consolidated.grossRevenue || 1
    const pRate = (pTaxes / pGross) * 100

    const rTaxes =
      dreComparative.real.liquid.consolidated.taxesTotal +
      dreComparative.real.liquid.consolidated.irpj +
      dreComparative.real.liquid.consolidated.irpjAdditional +
      dreComparative.real.liquid.consolidated.csll
    const rGross = dreComparative.real.liquid.consolidated.grossRevenue || 1
    const rRate = (rTaxes / rGross) * 100

    const sTaxes = dreComparative.simples.liquid.consolidated.dasTotal
    const sGross = dreComparative.simples.liquid.consolidated.grossRevenue || 1
    const sRate = (sTaxes / sGross) * 100

    const totalTax = pTaxes + rTaxes + sTaxes || 1

    return {
      totalConsolidatedTax: pTaxes + rTaxes + sTaxes,
      items: [
        {
          key: 'presumido' as const,
          name: 'Lucro Presumido',
          shortName: 'Presumido',
          value: pTaxes,
          percentage: (pTaxes / totalTax) * 100,
          effectiveRate: pRate,
          color: '#f97316', // laranja
        },
        {
          key: 'real' as const,
          name: 'Lucro Real',
          shortName: 'Real',
          value: rTaxes,
          percentage: (rTaxes / totalTax) * 100,
          effectiveRate: rRate,
          color: '#38bdf8', // azul
        },
        {
          key: 'simples' as const,
          name: 'Simples Nacional',
          shortName: 'Simples',
          value: sTaxes,
          percentage: (sTaxes / totalTax) * 100,
          effectiveRate: sRate,
          color: '#10b981', // esmeralda
        },
      ],
    }
  }, [dreComparative])

  // Linhas da Tabela Híbrida do Comparador de Metodologias
  const methodologyRows = useMemo(() => {
    return [
      {
        regimeKey: 'presumido' as const,
        regimeName: 'Lucro Presumido',
        color: '#f97316',
        liquidGrossRevenue: dreComparative.presumido.liquid.consolidated.grossRevenue,
        liquidNetProfit: dreComparative.presumido.liquid.consolidated.netProfit,
        costMarginGrossRevenue: dreComparative.presumido.costMargin.consolidated.grossRevenue,
        costMarginNetProfit: dreComparative.presumido.costMargin.consolidated.netProfit,
        hasData:
          dreComparative.presumido.liquid.hasValidData ||
          dreComparative.presumido.costMargin.hasValidData,
      },
      {
        regimeKey: 'real' as const,
        regimeName: 'Lucro Real',
        color: '#38bdf8',
        liquidGrossRevenue: dreComparative.real.liquid.consolidated.grossRevenue,
        liquidNetProfit: dreComparative.real.liquid.consolidated.netProfit,
        costMarginGrossRevenue: dreComparative.real.costMargin.consolidated.grossRevenue,
        costMarginNetProfit: dreComparative.real.costMargin.consolidated.netProfit,
        hasData:
          dreComparative.real.liquid.hasValidData || dreComparative.real.costMargin.hasValidData,
      },
      {
        regimeKey: 'simples' as const,
        regimeName: 'Simples Nacional',
        color: '#10b981',
        liquidGrossRevenue: dreComparative.simples.liquid.consolidated.grossRevenue,
        liquidNetProfit: dreComparative.simples.liquid.consolidated.netProfit,
        costMarginGrossRevenue: dreComparative.simples.costMargin.consolidated.grossRevenue,
        costMarginNetProfit: dreComparative.simples.costMargin.consolidated.netProfit,
        hasData:
          dreComparative.simples.liquid.hasValidData ||
          dreComparative.simples.costMargin.hasValidData,
      },
    ]
  }, [dreComparative])

  // Dados para o Ranking de Produtos (Estilo Customers Activ)
  const productRankingData = useMemo(() => {
    // A métrica depende da perspectiva global:
    // 'regime' -> Ordena pelo Lucro Estimado no regime vencedor
    // 'product' -> Ordena pelo Faturamento Projetado do Produto
    // 'price_mode' -> Ordena pela Margem/Receita gerada pelo modo ativo
    let metricLabel = 'Receita Faturada'
    let perspectiveLabel = 'Por Regime (Base do Vencedor)'

    if (perspective === 'product') {
      perspectiveLabel = 'Por Produto Individual'
      metricLabel = 'Faturamento Bruto'
    } else if (perspective === 'price_mode') {
      perspectiveLabel = 'Por Modo de Preço'
      metricLabel = 'Receita Líquida Alvo'
    }

    const items = productDrillItems.map((prod) => {
      let primary = prod.totalRevenue || prod.unitSalePrice * prod.quantity
      let secondary = prod.totalCost

      if (perspective === 'regime') {
        // Lucro estimado no regime vencedor
        const bestKey = regimeStats.best.key
        const unitCmv =
          bestKey === 'real'
            ? prod.cmvReal
            : bestKey === 'simples'
              ? prod.cmvSimples
              : prod.cmvPresumido
        primary = Math.max(0, prod.totalRevenue - unitCmv * prod.quantity)
        metricLabel = `Lucro Bruto (${regimeStats.best.shortName})`
      }

      return {
        id: prod.id,
        name: prod.name,
        primaryMetric: primary,
        secondaryMetric: secondary,
        quantity: prod.quantity,
        percentage: 0,
        rank: 0,
        mode: prod.mode,
      }
    })

    // Ordenar do maior para o menor
    items.sort((a, b) => b.primaryMetric - a.primaryMetric)

    const totalSum = items.reduce((acc, it) => acc + it.primaryMetric, 0) || 1

    const ranked = items.map((it, idx) => ({
      ...it,
      rank: idx + 1,
      percentage: Math.min(100, Math.max(0, (it.primaryMetric / totalSum) * 100)),
    }))

    const topItem = ranked[0]
    const topPct = topItem ? topItem.percentage.toFixed(1) : '0'
    const topName = topItem ? topItem.name : 'N/A'
    const topVal = topItem ? formatBRL(topItem.primaryMetric) : 'R$ 0,00'

    const note = topItem
      ? `O item "${topName}" lidera a carteira respondendo por ${topPct}% do total (${topVal}), evidenciando forte concentração da Curva ABC e exigindo máxima atenção às margens desse produto chave.`
      : 'Cadastre produtos na Calculadora de Markup para apurar o ranking automático.'

    return {
      items: ranked,
      totalConsolidated: totalSum,
      metricLabel,
      perspectiveLabel,
      explanatoryNote: note,
    }
  }, [productDrillItems, perspective, regimeStats])

  // Dados para os Bullet Charts de Carga Tributária Efetiva
  const taxBulletItems = useMemo(() => {
    return regimeStats.list.map((r) => {
      const taxes =
        r.key === 'simples'
          ? r.values.dasTotal
          : r.values.taxesTotal + r.values.irpj + r.values.irpjAdditional + r.values.csll
      const effRate = r.values.grossRevenue > 0 ? (taxes / r.values.grossRevenue) * 100 : 0
      return {
        regimeKey: r.key,
        regimeName: r.name,
        taxAmount: taxes,
        grossRevenue: r.values.grossRevenue,
        effectiveRate: effRate,
        color: r.color,
      }
    })
  }, [regimeStats])

  // Dados para as Barras de Despesas por Categoria
  const expensesDistributionData = useMemo(() => {
    const totalExpWithPayroll = totalOperatingExpenses + directPayrollExpenses || 1
    const cats = [
      {
        key: 'vendas',
        label: 'Despesas com Vendas & Marketing',
        value: expensesByCategory.vendas,
        percentage: (expensesByCategory.vendas / totalExpWithPayroll) * 100,
        color: '#f97316', // laranja
      },
      {
        key: 'administrativas',
        label: 'Administrativas, Pessoal & Folha',
        value: expensesByCategory.administrativas + directPayrollExpenses,
        percentage:
          ((expensesByCategory.administrativas + directPayrollExpenses) / totalExpWithPayroll) *
          100,
        color: '#38bdf8', // azul
      },
      {
        key: 'financeiras',
        label: 'Despesas Financeiras & Bancárias',
        value: expensesByCategory.financeiras,
        percentage: (expensesByCategory.financeiras / totalExpWithPayroll) * 100,
        color: '#a855f7', // roxo
      },
      {
        key: 'outras',
        label: 'Outras Despesas Operacionais',
        value: expensesByCategory.outras,
        percentage: (expensesByCategory.outras / totalExpWithPayroll) * 100,
        color: '#10b981', // esmeralda
      },
    ]

    return {
      categories: cats,
      totalExpenses: totalOperatingExpenses + directPayrollExpenses,
    }
  }, [expensesByCategory, totalOperatingExpenses, directPayrollExpenses])

  // Handler de seleção de produto via drill-down do CMV ou do ranking
  const handleSelectProductForDonut = (productId: string) => {
    setSelectedProductId(productId)
    setIsProductDonutHighlighted(true)
    setTimeout(() => {
      setIsProductDonutHighlighted(false)
    }, 2000)
    const el = document.getElementById('quadro-donut-produto')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Seções da mini-sidebar exclusiva
  const sidebarSections: CockpitSectionItem[] = useMemo(
    () => [
      {
        id: 'quadro-visao-geral',
        title: 'Visão Geral & KPIs',
        shortTitle: 'Visão Geral',
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
      {
        id: 'quadro-donuts-executivos',
        title: 'Donuts de Carga & Custos',
        shortTitle: 'Donuts',
        icon: <PieChart className="w-4 h-4" />,
      },
      {
        id: 'quadro-hero-regimes',
        title: 'Confronto dos Três Regimes',
        shortTitle: 'Regimes',
        icon: <TrendingUp className="w-4 h-4" />,
      },
      {
        id: 'quadro-ranking-produtos',
        title: 'Ranking de Produtos',
        shortTitle: 'Ranking',
        icon: <Package className="w-4 h-4" />,
      },
      {
        id: 'quadro-precificacao',
        title: 'Metodologias de Preço',
        shortTitle: 'Precificação',
        icon: <Calculator className="w-4 h-4" />,
      },
      {
        id: 'quadro-custos',
        title: 'CMV & Despesas Operacionais',
        shortTitle: 'Custos',
        icon: <Receipt className="w-4 h-4" />,
      },
      {
        id: 'quadro-operacional-fator-r',
        title: 'Painel Operacional & Fator R',
        shortTitle: 'Fator R',
        icon: <ShieldCheck className="w-4 h-4" />,
      },
    ],
    [],
  )

  // Scroll suave ao clicar na sidebar
  const handleScrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Observer de interseção para destacar a seção ativa conforme a rolagem
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200
      for (const s of sidebarSections) {
        const el = document.getElementById(s.id)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(s.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sidebarSections])

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
      {/* B) MINI-SIDEBAR FINA EXCLUSIVA DO DASHBOARD (Apenas em telas amplas, sem alterar outras páginas) */}
      <CockpitMiniSidebar
        sections={sidebarSections}
        activeSection={activeSection}
        onSectionClick={handleScrollToSection}
      />

      {/* MODAL DE DRILL-DOWN POR PRODUTO */}
      <CockpitDrillDownModal
        isOpen={isDrillOpen}
        onClose={() => setIsDrillOpen(false)}
        drillTarget={drillTarget}
        products={productDrillItems}
        onSelectProduct={(productId) => {
          handleSelectProductForDonut(productId)
          setIsDrillOpen(false)
        }}
      />

      <div className="space-y-6 relative z-10">
        {/* HERO */}
        <PageHero
          title="Dashboard de Inteligência Tributária"
          subtitle="Cockpit executivo integrado com anéis de desempenho, confronto luminoso dos regimes, diagnóstico radial do Fator R e alternância de perspectivas analíticas."
          badge="COCKPIT ESTRATÉGICO EM TEMPO REAL"
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                className="border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 text-xs h-8 cursor-pointer shadow-sm shadow-orange-950/40"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-orange-400" />
                Exportar PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                className="border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 text-xs h-8 cursor-pointer shadow-sm shadow-orange-950/40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-orange-400" />
                Exportar Excel
              </Button>
            </div>
          }
        />

        {/* F) SELETOR DE PERSPECTIVA NO TOPO */}
        <CockpitPerspectiveSelector
          currentPerspective={perspective}
          onPerspectiveChange={setPerspective}
        />

        {/* QUADRO 1: VISÃO GERAL & KPIS DO TOPO COM ANÉIS/DONUTS E CARD VENCEDOR NEON */}
        <section id="quadro-visao-geral" className="scroll-mt-24 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Receita Consolidada */}
            <CockpitDonutKpiCard
              title="Receita Consolidada"
              value={
                regimeStats.hasAnyData ? formatBRL(regimeStats.best.values.grossRevenue) : 'R$ 0,00'
              }
              subtitle={`Base do regime vencedor (${regimeStats.best.name})`}
              badgeText="BASE CANÔNICA"
              percentage={kpiDonuts.grossPct}
              strokeColor="#f97316"
              glowColor="rgba(249, 115, 22, 0.45)"
              icon={<DollarSign className="w-4 h-4" />}
              sparklineData={productSparklines.revenues}
              sparklineColor="#f97316"
            />

            {/* KPI 2: CMV Total — com Total R$ Consolidado ao centro */}
            <CockpitDonutKpiCard
              title="CMV Total"
              value={regimeStats.hasAnyData ? formatBRL(regimeStats.best.values.cmv) : 'R$ 0,00'}
              subtitle={`${kpiDonuts.cmvPct.toFixed(1)}% do faturamento bruto`}
              badgeText="DEDUZ CRÉDITOS"
              percentage={kpiDonuts.cmvPct}
              centerLabel={formatBRL(regimeStats.best.values.cmv)}
              strokeColor="#eab308"
              glowColor="rgba(234, 179, 8, 0.4)"
              icon={<ShoppingBag className="w-4 h-4" />}
              sparklineData={productSparklines.costs}
              sparklineColor="#eab308"
            />

            {/* KPI 3: Lucro Líquido Final */}
            <CockpitDonutKpiCard
              title="Lucro Líquido"
              value={
                regimeStats.hasAnyData ? formatBRL(regimeStats.best.values.netProfit) : 'R$ 0,00'
              }
              subtitle={`Margem Líquida: ${formatPercentBR(regimeStats.best.values.netMargin)}`}
              badgeText="RESULTADO REAL"
              percentage={kpiDonuts.marginPct}
              strokeColor="#10b981"
              glowColor="rgba(16, 185, 129, 0.45)"
              icon={<TrendingUp className="w-4 h-4" />}
              sparklineData={productSparklines.revenues}
              sparklineColor="#10b981"
            />

            {/* I) CARD NEON DE DESTAQUE: REGIME MAIS VANTAJOSO */}
            <CockpitAdvantageHeroCard
              bestRegimeName={regimeStats.best.name}
              bestRegimeKey={regimeStats.best.key}
              bestNetProfit={formatBRL(regimeStats.best.values.netProfit)}
              bestNetMargin={formatPercentBR(regimeStats.best.values.netMargin)}
              economyAmount={formatBRL(regimeStats.economy)}
              hasEconomy={regimeStats.economy > 0}
              worstRegimeName={regimeStats.worst.name}
            />
          </div>
        </section>

        {/* QUADRO NOVO: DONUTS EXECUTIVOS COCKPIT (CARGA TRIBUTÁRIA POR REGIME + COMPOSIÇÃO DO CUSTO DE UM PRODUTO) */}
        <section id="quadro-donuts-executivos" className="scroll-mt-24 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut 1: Carga Tributária por Regime */}
            <CockpitTaxRegimeDonut
              items={taxRegimeDonutData.items}
              totalConsolidatedTax={taxRegimeDonutData.totalConsolidatedTax}
              explanatoryNote={explanatoryNotes.taxDonutNote}
            />

            {/* Donut 2: Composição do Custo de um Produto com Drill-Down Integrado */}
            <CockpitProductCostDonut
              productName={activeCostProduct.name}
              productId={activeCostProduct.id}
              unitCost={activeCostProduct.unitCost}
              slices={productCostSlices}
              explanatoryNote={productCostNote}
              onOpenDrillDown={() => {
                setDrillTarget('cmv')
                setIsDrillOpen(true)
              }}
              isHighlighted={isProductDonutHighlighted}
            />
          </div>
        </section>

        {/* QUADRO 2: GRÁFICO-HERO DE ÁREA COM GRADIENTE LUMINOSO (CONFRONTO DOS 3 REGIMES) */}
        <section id="quadro-hero-regimes" className="scroll-mt-24 space-y-4">
          <CockpitHeroAreaChart
            data={heroAreaData}
            explanatoryNote={explanatoryNotes.heroNote}
            bestRegimeName={regimeStats.best.name}
          />
        </section>

        {/* BULLET CHARTS DE CARGA TRIBUTÁRIA EFETIVA POR REGIME */}
        <section className="space-y-4">
          <CockpitTaxBulletCharts
            items={taxBulletItems}
            explanatoryNote={explanatoryNotes.bulletTaxNote}
          />
        </section>

        {/* NOVO PAINEL: RANKING DE PRODUTOS (CURVA ABC ESTILO CUSTOMERS ACTIV) */}
        <section id="quadro-ranking-produtos" className="scroll-mt-24 space-y-4">
          <CockpitProductRanking
            products={productRankingData.items}
            perspective={perspective}
            perspectiveLabel={productRankingData.perspectiveLabel}
            metricLabel={productRankingData.metricLabel}
            totalConsolidated={productRankingData.totalConsolidated}
            explanatoryNote={productRankingData.explanatoryNote}
            onSelectProduct={handleSelectProductForDonut}
            selectedProductId={selectedProductId || activeCostProduct.id}
          />
        </section>

        {/* QUADRO 3: RENDERIZAÇÃO CONDICIONAL BASEADA NA PERSPECTIVA GLOBAL SELECIONADA */}
        {perspective === 'product' && (
          <section className="p-5 sm:p-6 rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#0d0822]/95 via-[#080517]/95 to-[#04020a]/95 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Perspectiva Desagregada: Desempenho por Produto
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-orange-500/40 text-orange-300 bg-orange-500/10"
                  >
                    VISTA INDIVIDUAL
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualização detalhada do faturamento e custos para cada item cadastrado.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDrillTarget('cmv')
                  setIsDrillOpen(true)
                }}
                className="text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 h-7 font-mono cursor-pointer"
              >
                Abrir Drill-Down Completo &rarr;
              </Button>
            </div>

            {/* Gráfico de Barras por Produto */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productDrillItems}
                  margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#261b47" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatBRL(val), '']}
                    contentStyle={{
                      backgroundColor: '#070314',
                      borderColor: '#7c3aed',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar
                    dataKey="totalRevenue"
                    name="Receita do Item"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="totalCost"
                    name="Custo Total"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="pt-2 text-xs font-mono text-slate-400 border-t border-white/5 flex items-center justify-between">
              <span>{markupProducts.length} produto(s) apurado(s) canonicamente.</span>
              <span className="text-orange-400">Clique em qualquer item para detalhar.</span>
            </div>
          </section>
        )}

        {/* QUADRO 4: COMPARADOR CUSTO + MARGEM × RECEITA LÍQUIDA DESEJADA (TRANSFORMADO EM TABELA HÍBRIDA) */}
        <section id="quadro-precificacao" className="scroll-mt-24 space-y-4">
          <CockpitMethodologyHybridTable
            rows={methodologyRows}
            explanatoryNote={explanatoryNotes.priceModeNote}
          />
        </section>

        {/* QUADRO 5: COMPOSIÇÃO DE CUSTOS & DESPESAS COM INTERAÇÃO E DRILL-DOWN */}
        <section id="quadro-custos" className="scroll-mt-24 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna 1: Composição do CMV com Drill-Down interativo ao clicar */}
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c081e]/95 via-[#080516]/95 to-[#04020a]/95 p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Composição Canônica do CMV
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDrillTarget('cmv')
                        setIsDrillOpen(true)
                      }}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-[11px] h-7 font-mono cursor-pointer"
                    >
                      Drill por Produto
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/demo/compras')}
                      className="text-[11px] text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 h-7 font-mono cursor-pointer"
                    >
                      Compras &rarr;
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono mt-3">
                  {/* Total ao centro do CMV com destaque visual */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500/15 via-purple-500/10 to-transparent border border-orange-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-orange-300 font-bold uppercase tracking-wider block">
                        CMV Total Consolidado
                      </span>
                      <span className="text-xs text-slate-400">
                        Base do regime recomendado ({regimeStats.best.name})
                      </span>
                    </div>
                    <span className="text-sm font-black text-white font-mono drop-shadow">
                      {formatBRL(regimeStats.best.values.cmv)}
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      setDrillTarget('cmv')
                      setIsDrillOpen(true)
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 cursor-pointer transition-colors"
                    title="Clique para abrir o detalhamento por produto"
                  >
                    <span className="text-slate-400 flex items-center gap-1.5">
                      Mercadoria Bruta de Compra:
                      <ChevronRight className="w-3 h-3 text-orange-400" />
                    </span>
                    <span className="text-slate-200 font-bold">
                      {formatBRL(cmvBreakdowns.presumido.merchandiseTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-slate-400">Frete & Encargos de Entrada:</span>
                    <span className="text-slate-200 font-bold">
                      {formatBRL(
                        cmvBreakdowns.presumido.freightTotal +
                          cmvBreakdowns.presumido.otherCostsTotal,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/30">
                    <span className="text-sky-300">Créditos Tributários (Real):</span>
                    <span className="text-sky-400 font-bold">
                      -
                      {formatBRL(
                        cmvBreakdowns.real.totalIcms +
                          cmvBreakdowns.real.totalPis +
                          cmvBreakdowns.real.totalCofins,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-slate-400">CMV Final (Presumido):</span>
                    <span className="text-orange-400 font-bold">
                      {formatBRL(cmvBreakdowns.presumido.totalCmv)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-slate-400">CMV Final (Real - créditos plenos):</span>
                    <span className="text-sky-400 font-bold">
                      {formatBRL(cmvBreakdowns.real.totalCmv)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-slate-400">CMV Final (Simples - sem créditos):</span>
                    <span className="text-emerald-400 font-bold">
                      {formatBRL(cmvBreakdowns.simples.totalCmv)}
                    </span>
                  </div>
                </div>
              </div>

              {/* G) NOTA EXPLICATIVA SOB O CMV COM PERCENTUAL REAL CALCULADO */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl">
                <Receipt className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-orange-400">Por que isto importa:</strong>{' '}
                  {explanatoryNotes.cmvNote}
                </p>
              </div>
            </div>

            {/* Coluna 2: Despesas por Categoria com Barras Horizontais Coloridas */}
            <CockpitExpensesBarDistribution
              categories={expensesDistributionData.categories}
              totalExpenses={expensesDistributionData.totalExpenses}
              onManageExpenses={() => navigate('/demo/despesas-operacionais')}
              explanatoryNote={explanatoryNotes.expensesNote}
            />
          </div>
        </section>

        {/* QUADRO 6: E) MEDIDOR RADIAL DO FATOR R & EFICIÊNCIA OPERACIONAL */}
        <section id="quadro-operacional-fator-r" className="scroll-mt-24 space-y-4">
          <CockpitFatorRGauge
            fatorRPercent={fatorRResult.fatorRPercent}
            simplesPayroll12m={simplesPayroll12m}
            simplesRbt12={rbtBase}
            isElegibleAnexo3={fatorRResult.isElegibleAnexo3}
            explanatoryNote={explanatoryNotes.fatorNote}
          />
        </section>

        {/* J) ATALHOS RÁPIDOS PRESERVADOS INTEGRALMENTE PARA OS DEMAIS MÓDULOS */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_#f97316]" />
              <h4 className="text-xs font-mono uppercase tracking-widest text-orange-400 font-bold">
                Atalhos Rápidos de Aprofundamento Analítico
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Módulos integrados ao mesmo motor
            </span>
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
                  className="p-3.5 rounded-xl bg-gradient-to-br from-[#0c081e]/90 to-[#060310]/95 border border-purple-500/20 hover:border-orange-500/50 hover:shadow-[0_0_18px_rgba(249,115,22,0.2)] transition-all text-left group cursor-pointer flex flex-col justify-between h-24"
                >
                  <Icon className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
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
