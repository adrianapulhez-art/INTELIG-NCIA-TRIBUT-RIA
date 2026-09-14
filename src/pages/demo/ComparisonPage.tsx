import React, { useState, useMemo } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { useTaxContext, ActivityType } from '@/contexts/TaxContext'
import { useNavigate } from 'react-router-dom'
import {
  Scale,
  Link as LinkIcon,
  Plus,
  Trash2,
  Trophy,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatBRL, formatNumberBR, formatPercentBR, parseBRNumber } from '@/lib/taxCalculations'
import { calculatePayroll } from '@/lib/payrollCalculations'
import {
  SIMPLES_ANEXOS,
  SimplesAnexoId,
  calculateFatorR,
  calculatePgdas,
  SUBLIMITE_SIMPLES,
} from '@/lib/simplesCalculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScenarioManagerBar } from '@/components/demo/ScenarioManagerBar'
import { ExportReportButtons } from '@/components/demo/ExportReportButtons'
import { exportComparisonToPdf, exportComparisonToExcel } from '@/lib/exportReports'
import { CmvDetailedBreakdown } from '@/components/demo/CmvDetailedBreakdown'
import { PageHero } from '@/components/demo/PageHero'

export default function ComparisonPage() {
  const navigate = useNavigate()
  const {
    simulatedSalePrice,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
    markupProducts,
    calculatedPurchases,
    icmsRateMarkup,
    customTaxesMarkup,
    totalVariableExpenseRate,
    desiredLiquidRevenueByRegime,
    isMarkupSimulated,
    // Presumido
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
    // Real
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
    // Simples
    simplesAnexo,
    setSimplesAnexo,
    simplesRbt12: rawSimplesRbt12,
    setSimplesRbt12,
    simplesPayroll12m,
    setSimplesPayroll12m,
    simplesQuantitySold,
    setSimplesQuantitySold,
    simplesExpenses,
    effectiveSimplesRbt12,
    simplesIsInicioAtividade,
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
    operatingExpenses,
    operatingRevenues,
    totalOperatingExpenses,
    totalOperatingRevenues,
    stSubsystem,
    interstateSubsystem,
  } = useTaxContext()

  const { totalPurchasesQuantity } = useTaxContext()

  // Regra de resolução estrita da quantidade vendida
  const automaticQuantity =
    calculatedPurchases.autoInventoryDeductionActive &&
    calculatedPurchases.totalSoldUnitsEffective > 0
      ? Math.min(
          calculatedPurchases.totalSoldUnitsEffective,
          calculatedPurchases.totalAvailableUnits > 0
            ? calculatedPurchases.totalAvailableUnits
            : calculatedPurchases.totalSoldUnitsEffective,
        )
      : totalConsolidatedQuantity > 0
        ? totalConsolidatedQuantity
        : totalPurchasesQuantity ||
          presumidoQuantitySold ||
          realQuantitySold ||
          simplesQuantitySold ||
          0

  const initialQty = automaticQuantity

  // Estado local para a quantidade na página de comparação
  const [qty, setQty] = useState<number>(initialQty)
  const [qtyInput, setQtyInput] = useState<string>(String(initialQty))

  React.useEffect(() => {
    if (initialQty === 0) {
      setQty(0)
      setQtyInput('0')
    } else {
      setQty(initialQty)
      setQtyInput(String(initialQty))
    }
  }, [initialQty])

  // Atualizar a quantidade em todos os contextos simultaneamente
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQtyInput(val)
    const parsed = parseInt(val, 10)
    const validQty = isNaN(parsed) || parsed < 0 ? 0 : parsed
    setQty(validQty)
    setPresumidoQuantitySold(validQty)
    setRealQuantitySold(validQty)
    setSimplesQuantitySold(validQty)
  }

  // CÁLCULO DE FOLHA E ENCARGOS PATRONAIS
  const payrollResult = useMemo(() => {
    return calculatePayroll({
      payrollSalaries,
      proLabore: payrollProLabore,
      inssPatronalRate: payrollInssRate,
      ratRate: payrollRatRate,
      terceirosRate: payrollTerceirosRate,
    })
  }, [payrollSalaries, payrollProLabore, payrollInssRate, payrollRatRate, payrollTerceirosRate])

  // Valor da folha em si (salários + pró-labore), dedutível igualmente nos 3 regimes como despesa
  const directPayrollExpenses = payrollSalaries + payrollProLabore
  // Encargos patronais (INSS 20% + RAT + terceiros), incidem apenas fora do Simples (Presumido e Real)
  const patronalCharges = payrollResult.patronalChargesTotal

  // Despesas operacionais centrais (da nova tabela de Despesas Operacionais)
  // + Outras despesas locais compartilhadas
  const totalOtherExpenses = useMemo(() => {
    return presumidoExpenses.reduce((acc, exp) => acc + (exp.value || 0), 0)
  }, [presumidoExpenses])

  // Despesas operacionais consolidadas: tabela específica + despesas locais
  const totalGlobalOperatingExpenses = totalOperatingExpenses + totalOtherExpenses
  const totalGlobalOperatingRevenues = totalOperatingRevenues

  // Preço de venda unitário e receita consolidada base (Markup compartilhado)
  const hasConsolidated = totalConsolidatedRevenue > 0
  const activeGrossRevenue =
    totalConsolidatedRevenue > 0
      ? totalConsolidatedRevenue
      : Math.round((simulatedSalePrice || 0) * (qty > 0 ? qty : 0) * 100) / 100
  const unitGrossRevenue =
    qty > 0 ? Math.round((activeGrossRevenue / qty) * 100) / 100 : simulatedSalePrice || 0

  // -------------------------------------------------------------
  // CÁLCULO DE RECEITA BRUTA POR REGIME (RBV independente nos 3 blocos)
  // Fórmula consagrada do sistema: tributos + despesas variáveis SOMAM no divisor aditivo.
  // Fator multiplicativo apenas na margem, quando > 0.
  // Multi-produto: se markupProducts tiver itens, calcula o gross-up POR ITEM usando a
  // meta líquida do item para o regime (p.desiredNetRevenueByRegime?.[regime] ?? desiredLiquidRevenueByRegime?.[regime])
  // e soma — SEM média entre produtos diferentes.
  // -------------------------------------------------------------
  const currentAnexoId = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const currentAnexoConfig = SIMPLES_ANEXOS[currentAnexoId] || SIMPLES_ANEXOS.anexo_1
  const simplesRbt12 = effectiveSimplesRbt12

  const pgdas = useMemo(() => {
    return calculatePgdas(currentAnexoId, simplesRbt12)
  }, [currentAnexoId, simplesRbt12])

  const regimeGrossRevenues = useMemo(() => {
    // 1. Soma de tributos customizados
    let sumCustomTaxesPct = 0
    if (Array.isArray(customTaxesMarkup)) {
      for (const tax of customTaxesMarkup) {
        const rate = typeof tax.rate === 'number' && Number.isFinite(tax.rate) ? tax.rate : 0
        sumCustomTaxesPct += rate
      }
    }

    // 2. Despesas variáveis (%)
    const dvRate =
      typeof totalVariableExpenseRate === 'number' && Number.isFinite(totalVariableExpenseRate)
        ? totalVariableExpenseRate
        : 0

    const icms =
      typeof icmsRateMarkup === 'number' && Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0
    const simplesEffectiveRate = pgdas.aliquotaEfetiva || 0

    // Helper para calcular o divisor aditivo de um produto / regime
    const computeDivisor = (regimeKey: 'presumido' | 'real' | 'simples', margin: number) => {
      let taxesRate = 0
      if (regimeKey === 'presumido') {
        taxesRate = icms + 0.65 + 3.0 + sumCustomTaxesPct
      } else if (regimeKey === 'real') {
        taxesRate = icms + 1.65 + 7.6 + sumCustomTaxesPct
      } else {
        taxesRate = simplesEffectiveRate + sumCustomTaxesPct
      }

      // Divisor aditivo: 1 - (Σtributos + %DV)/100
      let divisor = 1 - (taxesRate + dvRate) / 100

      // Margem multiplicativa apenas se > 0
      const safeMargin = typeof margin === 'number' && Number.isFinite(margin) ? margin : 0
      if (safeMargin > 0) {
        divisor *= 1 - safeMargin / 100
      }

      return Math.max(0.0001, divisor)
    }

    // Verifica se há produtos válidos com meta líquida informada no Markup
    const validProducts = Array.isArray(markupProducts) ? markupProducts : []
    const hasLiquidProductConfig = validProducts.some((p) => {
      const pByRegime = p.desiredNetRevenueByRegime
      const hasSpecificMeta =
        pByRegime &&
        ((pByRegime.presumido || 0) > 0 ||
          (pByRegime.real || 0) > 0 ||
          (pByRegime.simples || 0) > 0)
      const hasDirectMeta = (p.desiredNetRevenue || 0) > 0
      return hasSpecificMeta || hasDirectMeta
    })

    const hasGlobalByRegime =
      desiredLiquidRevenueByRegime &&
      ((desiredLiquidRevenueByRegime.presumido || 0) > 0 ||
        (desiredLiquidRevenueByRegime.real || 0) > 0 ||
        (desiredLiquidRevenueByRegime.simples || 0) > 0)

    // Se não há metas líquidas configuradas por produto nem global por regime,
    // mantém o fallback no faturamento já simulado/consolidado do contexto
    if (!hasLiquidProductConfig && !hasGlobalByRegime) {
      return {
        presumidoGrossRevenue: activeGrossRevenue,
        presumidoUnitGross: unitGrossRevenue,
        realGrossRevenue: activeGrossRevenue,
        realUnitGross: unitGrossRevenue,
        simplesGrossRevenue: activeGrossRevenue,
        simplesUnitGross: unitGrossRevenue,
      }
    }

    // Calcula faturamento bruto e unitário para cada regime
    const computeForRegime = (regimeKey: 'presumido' | 'real' | 'simples') => {
      if (validProducts.length > 0) {
        let totalRev = 0
        let totalUnits = 0

        for (const p of validProducts) {
          const productQty =
            typeof p.quantity === 'number' && Number.isFinite(p.quantity)
              ? Math.max(0, p.quantity)
              : 0
          const itemMeta =
            p.desiredNetRevenueByRegime?.[regimeKey] ??
            desiredLiquidRevenueByRegime?.[regimeKey] ??
            p.desiredNetRevenue ??
            0
          const pMargin = typeof p.margin === 'number' && Number.isFinite(p.margin) ? p.margin : 0
          const divisor = computeDivisor(regimeKey, pMargin)

          const unitSalePrice =
            divisor > 0.0001 && itemMeta > 0 ? Math.round((itemMeta / divisor) * 100) / 100 : 0

          const effectiveItemQty = productQty > 0 ? productQty : 1
          const itemRev = Math.round(unitSalePrice * effectiveItemQty * 100) / 100

          totalRev += itemRev
          totalUnits += effectiveItemQty
        }

        const roundedTotal = Math.round(totalRev * 100) / 100
        const effectiveDivQty = qty > 0 ? qty : totalUnits > 0 ? totalUnits : 1
        const roundedUnit =
          effectiveDivQty > 0
            ? Math.round((roundedTotal / effectiveDivQty) * 100) / 100
            : roundedTotal

        return { total: roundedTotal, unit: roundedUnit }
      }

      // Produto único / global
      const globalMeta = desiredLiquidRevenueByRegime?.[regimeKey] ?? 0
      const divisor = computeDivisor(regimeKey, 0)
      const unitSalePrice =
        divisor > 0.0001 && globalMeta > 0 ? Math.round((globalMeta / divisor) * 100) / 100 : 0
      const effectiveQty = qty > 0 ? qty : 1
      const totalRev = Math.round(unitSalePrice * effectiveQty * 100) / 100
      const unitRev = qty > 0 ? Math.round((totalRev / qty) * 100) / 100 : unitSalePrice

      return { total: totalRev, unit: unitRev }
    }

    const pres = computeForRegime('presumido')
    const rl = computeForRegime('real')
    const simp = computeForRegime('simples')

    // Se os três derem 0 (nenhuma meta líquida positiva encontrada), fallback na receita ativa
    if (pres.total === 0 && rl.total === 0 && simp.total === 0) {
      return {
        presumidoGrossRevenue: activeGrossRevenue,
        presumidoUnitGross: unitGrossRevenue,
        realGrossRevenue: activeGrossRevenue,
        realUnitGross: unitGrossRevenue,
        simplesGrossRevenue: activeGrossRevenue,
        simplesUnitGross: unitGrossRevenue,
      }
    }

    return {
      presumidoGrossRevenue: pres.total,
      presumidoUnitGross: pres.unit,
      realGrossRevenue: rl.total,
      realUnitGross: rl.unit,
      simplesGrossRevenue: simp.total,
      simplesUnitGross: simp.unit,
    }
  }, [
    customTaxesMarkup,
    totalVariableExpenseRate,
    icmsRateMarkup,
    pgdas.aliquotaEfetiva,
    markupProducts,
    desiredLiquidRevenueByRegime,
    activeGrossRevenue,
    unitGrossRevenue,
    qty,
  ])

  const {
    presumidoGrossRevenue,
    presumidoUnitGross,
    realGrossRevenue,
    realUnitGross,
    simplesGrossRevenue,
    simplesUnitGross,
  } = regimeGrossRevenues

  // -------------------------------------------------------------
  // 1. CÁLCULO LUCRO PRESUMIDO
  // -------------------------------------------------------------
  const presumidoData = useMemo(() => {
    const isServices = presumidoActivity === 'servicos'
    const irpjPresumptionRate = isServices ? 32.0 : 8.0
    const csllPresumptionRate = isServices ? 32.0 : 12.0
    const icmsRate = icmsRateMarkup || 0
    const issRate = isServices ? presumidoIssRate : 0
    const pisRate = 0.65
    const cofinsRate = 3.0
    const irpjRate = 15.0
    const irpjAdditionalRate = 10.0
    const irpjAdditionalLimit = 60000.0 // trimestral
    const csllRate = 9.0

    const unitGross = presumidoUnitGross
    const unitMunicipalStateTax =
      Math.round((isServices ? (unitGross * issRate) / 100 : (unitGross * icmsRate) / 100) * 100) /
      100

    const unitPisCofinsBase = isServices
      ? unitGross
      : Math.round(Math.max(0, unitGross - unitMunicipalStateTax) * 100) / 100

    const unitPis = Math.round(((unitPisCofinsBase * pisRate) / 100) * 100) / 100
    const unitCofins = Math.round(((unitPisCofinsBase * cofinsRate) / 100) * 100) / 100
    const unitNetRevenue =
      Math.round((unitGross - unitMunicipalStateTax - unitPis - unitCofins) * 100) / 100
    const isAutoInventory = calculatedPurchases.autoInventoryDeductionActive
    const rawFallbackUnitPresumido =
      (totalPurchasesQuantity || 0) > 0
        ? (calculatedPurchases.cmvPresumido || 0) / totalPurchasesQuantity
        : calculatedPurchases.cmvPresumido || 0
    const rawUnitPresumido =
      calculatedPurchases.unitCostPresumidoEffective > 0
        ? calculatedPurchases.unitCostPresumidoEffective
        : rawFallbackUnitPresumido
    const unitCmv = Math.round(rawUnitPresumido * 100) / 100
    const unitGrossProfit = Math.round((unitNetRevenue - unitCmv) * 100) / 100

    // Totais específicos do Lucro Presumido
    const totalGross = presumidoGrossRevenue
    const totalMunicipalStateTax = Math.round(unitMunicipalStateTax * qty * 100) / 100
    const totalPis = Math.round(unitPis * qty * 100) / 100
    const totalCofins = Math.round(unitCofins * qty * 100) / 100
    const totalNetRevenue = Math.round(unitNetRevenue * qty * 100) / 100
    const totalCmv = calculatedPurchases.cmvPresumido
    const totalGrossProfit = Math.round((totalNetRevenue - totalCmv) * 100) / 100

    // No Lucro Presumido: despesas = despesas operacionais da tabela central + outras despesas + folha/pró-labore + encargos patronais
    const totalExpenses = totalGlobalOperatingExpenses + directPayrollExpenses + patronalCharges
    const totalResultBeforeTax = totalGrossProfit - totalExpenses + totalGlobalOperatingRevenues

    // Bases presumidas
    const totalIrpjBase = (totalGross * irpjPresumptionRate) / 100
    const totalCsllBase = (totalGross * csllPresumptionRate) / 100
    const totalIrpj = (totalIrpjBase * irpjRate) / 100
    const totalIrpjExcess = Math.max(0, totalIrpjBase - irpjAdditionalLimit)
    const totalIrpjAdditional = (totalIrpjExcess * irpjAdditionalRate) / 100
    const totalCsll = (totalCsllBase * csllRate) / 100

    const totalNetProfit = totalResultBeforeTax - totalIrpj - totalIrpjAdditional - totalCsll
    const totalTaxBurden =
      totalGross > 0
        ? totalMunicipalStateTax +
          totalPis +
          totalCofins +
          totalIrpj +
          totalIrpjAdditional +
          totalCsll +
          patronalCharges
        : 0
    const netMargin = totalGross > 0 ? (totalNetProfit / totalGross) * 100 : 0
    const effectiveTaxRate = totalGross > 0 ? (totalTaxBurden / totalGross) * 100 : 0

    return {
      isServices,
      irpjPresumptionRate,
      csllPresumptionRate,
      totalGross,
      totalMunicipalStateTax,
      totalPis,
      totalCofins,
      totalNetRevenue,
      totalCmv,
      totalGrossProfit,
      totalResultBeforeTax,
      totalExpenses,
      totalIrpj,
      totalIrpjAdditional,
      totalCsll,
      totalNetProfit,
      totalTaxBurden,
      netMargin,
      effectiveTaxRate,
      patronalCharges,
    }
  }, [
    presumidoActivity,
    presumidoIssRate,
    icmsRateMarkup,
    presumidoUnitGross,
    presumidoGrossRevenue,
    calculatedPurchases.cmvPresumido,
    calculatedPurchases.autoInventoryDeductionActive,
    calculatedPurchases.unitCostPresumidoEffective,
    calculatedPurchases.totalAvailableUnits,
    qty,
    totalGlobalOperatingExpenses,
    totalGlobalOperatingRevenues,
    directPayrollExpenses,
    patronalCharges,
  ])

  // -------------------------------------------------------------
  // 2. CÁLCULO LUCRO REAL
  // -------------------------------------------------------------
  const realData = useMemo(() => {
    const isServices = realActivity === 'servicos'
    const icmsRate = icmsRateMarkup || 0
    const issRate = isServices ? realIssRate : 0
    const pisRate = 1.65
    const cofinsRate = 7.6
    const irpjRate = 15.0
    const irpjAdditionalRate = 10.0
    const irpjAdditionalLimit = 60000.0 // trimestral
    const csllRate = 9.0

    const unitGross = realUnitGross
    const unitMunicipalStateTax =
      Math.round((isServices ? (unitGross * issRate) / 100 : (unitGross * icmsRate) / 100) * 100) /
      100

    const unitPisCofinsBase = isServices
      ? unitGross
      : Math.round(Math.max(0, unitGross - unitMunicipalStateTax) * 100) / 100

    const unitPis = Math.round(((unitPisCofinsBase * pisRate) / 100) * 100) / 100
    const unitCofins = Math.round(((unitPisCofinsBase * cofinsRate) / 100) * 100) / 100
    const unitNetRevenue =
      Math.round((unitGross - unitMunicipalStateTax - unitPis - unitCofins) * 100) / 100
    const isAutoInventory = calculatedPurchases.autoInventoryDeductionActive
    const rawFallbackUnitReal =
      (totalPurchasesQuantity || 0) > 0
        ? (calculatedPurchases.cmvReal || 0) / totalPurchasesQuantity
        : calculatedPurchases.cmvReal || 0
    const rawUnitReal =
      calculatedPurchases.unitCostRealEffective > 0
        ? calculatedPurchases.unitCostRealEffective
        : rawFallbackUnitReal
    const unitCmv = Math.round(rawUnitReal * 100) / 100
    const unitGrossProfit = Math.round((unitNetRevenue - unitCmv) * 100) / 100

    // Totais específicos do Lucro Real
    const totalGross = realGrossRevenue
    const totalMunicipalStateTax = Math.round(unitMunicipalStateTax * qty * 100) / 100
    const totalPis = Math.round(unitPis * qty * 100) / 100
    const totalCofins = Math.round(unitCofins * qty * 100) / 100
    const totalNetRevenue = Math.round(unitNetRevenue * qty * 100) / 100
    const totalCmv = calculatedPurchases.cmvReal
    const totalGrossProfit = Math.round((totalNetRevenue - totalCmv) * 100) / 100

    // No Lucro Real: folha, pró-labore, encargos e despesas operacionais dedutíveis
    const totalExpenses = totalGlobalOperatingExpenses + directPayrollExpenses + patronalCharges
    const totalResultBeforeTax = totalGrossProfit - totalExpenses + totalGlobalOperatingRevenues

    // LALUR: Lucro Real tributável (parte do LAIR que agora inclui despesas e receitas operacionais)
    const totalAdditions = realAdditions || 0
    const totalExclusions = realExclusions || 0
    const taxableRealProfit = Math.max(0, totalResultBeforeTax + totalAdditions - totalExclusions)

    const totalIrpj = (taxableRealProfit * irpjRate) / 100
    const totalIrpjExcess = Math.max(0, taxableRealProfit - irpjAdditionalLimit)
    const totalIrpjAdditional = (totalIrpjExcess * irpjAdditionalRate) / 100
    const totalCsll = (taxableRealProfit * csllRate) / 100

    const totalNetProfit = totalResultBeforeTax - totalIrpj - totalIrpjAdditional - totalCsll
    const totalTaxBurden =
      totalGross > 0
        ? totalMunicipalStateTax +
          totalPis +
          totalCofins +
          totalIrpj +
          totalIrpjAdditional +
          totalCsll +
          patronalCharges
        : 0
    const netMargin = totalGross > 0 ? (totalNetProfit / totalGross) * 100 : 0
    const effectiveTaxRate = totalGross > 0 ? (totalTaxBurden / totalGross) * 100 : 0

    return {
      isServices,
      totalGross,
      totalMunicipalStateTax,
      totalPis,
      totalCofins,
      totalNetRevenue,
      totalCmv,
      totalGrossProfit,
      totalResultBeforeTax,
      totalExpenses,
      taxableRealProfit,
      totalIrpj,
      totalIrpjAdditional,
      totalCsll,
      totalNetProfit,
      totalTaxBurden,
      netMargin,
      effectiveTaxRate,
      patronalCharges,
    }
  }, [
    realActivity,
    realIssRate,
    icmsRateMarkup,
    realUnitGross,
    realGrossRevenue,
    calculatedPurchases.cmvReal,
    calculatedPurchases.autoInventoryDeductionActive,
    calculatedPurchases.unitCostRealEffective,
    calculatedPurchases.totalAvailableUnits,
    qty,
    totalGlobalOperatingExpenses,
    totalGlobalOperatingRevenues,
    directPayrollExpenses,
    patronalCharges,
    realAdditions,
    realExclusions,
  ])

  // -------------------------------------------------------------
  // 3. CÁLCULO SIMPLES NACIONAL (PGDAS)
  // -------------------------------------------------------------
  const fatorRResult = useMemo(() => {
    return calculateFatorR(simplesPayroll12m, simplesRbt12)
  }, [simplesPayroll12m, simplesRbt12])

  const simplesData = useMemo(() => {
    const unitGross = simplesUnitGross
    const effectiveRateDec = pgdas.aliquotaEfetiva / 100
    const unitDasTotal = Math.round(unitGross * effectiveRateDec * 100) / 100

    const unitIrpj = Math.round(((unitGross * pgdas.reparticao.irpjRate) / 100) * 100) / 100
    const unitCsll = Math.round(((unitGross * pgdas.reparticao.csllRate) / 100) * 100) / 100
    const unitCofins = Math.round(((unitGross * pgdas.reparticao.cofinsRate) / 100) * 100) / 100
    const unitPis = Math.round(((unitGross * pgdas.reparticao.pisRate) / 100) * 100) / 100
    const unitCpp = Math.round(((unitGross * pgdas.reparticao.cppRate) / 100) * 100) / 100
    const unitIcms = Math.round(((unitGross * pgdas.reparticao.icmsRate) / 100) * 100) / 100
    const unitIpi = Math.round(((unitGross * pgdas.reparticao.ipiRate) / 100) * 100) / 100
    const unitIss = Math.round(((unitGross * pgdas.reparticao.issRate) / 100) * 100) / 100

    const unitNetRevenue = Math.round((unitGross - unitDasTotal) * 100) / 100
    const isAutoInventory = calculatedPurchases.autoInventoryDeductionActive
    const rawFallbackUnitSimples =
      (totalPurchasesQuantity || 0) > 0
        ? (calculatedPurchases.cmvSimples || 0) / totalPurchasesQuantity
        : calculatedPurchases.cmvSimples || 0
    const rawUnitSimples =
      calculatedPurchases.unitCostSimplesEffective > 0
        ? calculatedPurchases.unitCostSimplesEffective
        : rawFallbackUnitSimples
    const unitCmv = Math.round(rawUnitSimples * 100) / 100
    const unitGrossProfit = Math.round((unitNetRevenue - unitCmv) * 100) / 100

    // Totais específicos do Simples Nacional
    const totalGross = simplesGrossRevenue
    const totalDasTotal = Math.round(unitDasTotal * qty * 100) / 100
    const totalIrpj = Math.round(unitIrpj * qty * 100) / 100
    const totalCsll = Math.round(unitCsll * qty * 100) / 100
    const totalCofins = Math.round(unitCofins * qty * 100) / 100
    const totalPis = Math.round(unitPis * qty * 100) / 100
    const totalCpp = Math.round(unitCpp * qty * 100) / 100
    const totalIcms = Math.round(unitIcms * qty * 100) / 100
    const totalIpi = Math.round(unitIpi * qty * 100) / 100
    const totalIss = Math.round(unitIss * qty * 100) / 100
    const totalNetRevenue = Math.round(unitNetRevenue * qty * 100) / 100
    const totalCmv = calculatedPurchases.cmvSimples
    const totalGrossProfit = Math.round((totalNetRevenue - totalCmv) * 100) / 100

    // No Simples Nacional:
    // A folha em si (salários + pró-labore) é despesa dedutível igual aos outros regimes.
    // A CPP patronal já está incluída no DAS (não se soma encargo patronal adicional).
    // As despesas e receitas operacionais entram na apuração do resultado / LAIR.
    const totalExpenses = totalGlobalOperatingExpenses + directPayrollExpenses
    const totalResultBeforeTax = totalGrossProfit - totalExpenses + totalGlobalOperatingRevenues
    const totalNetProfit = totalResultBeforeTax
    const totalTaxBurden = totalGross > 0 ? totalDasTotal : 0
    const netMargin = totalGross > 0 ? (totalNetProfit / totalGross) * 100 : 0
    const effectiveTaxRate = pgdas.aliquotaEfetiva

    return {
      totalGross,
      totalDasTotal,
      totalIrpj,
      totalCsll,
      totalCofins,
      totalPis,
      totalCpp,
      totalIcms,
      totalIpi,
      totalIss,
      totalNetRevenue,
      totalCmv,
      totalGrossProfit,
      totalResultBeforeTax,
      totalExpenses,
      totalNetProfit,
      totalTaxBurden,
      netMargin,
      effectiveTaxRate,
    }
  }, [
    simplesUnitGross,
    simplesGrossRevenue,
    pgdas,
    calculatedPurchases.cmvSimples,
    calculatedPurchases.autoInventoryDeductionActive,
    calculatedPurchases.unitCostSimplesEffective,
    calculatedPurchases.totalAvailableUnits,
    qty,
    totalGlobalOperatingExpenses,
    totalGlobalOperatingRevenues,
    directPayrollExpenses,
  ])

  // -------------------------------------------------------------
  // 4. IDENTIFICAÇÃO DO MELHOR REGIME (Menor Carga Tributária e Maior Lucro Líquido)
  // -------------------------------------------------------------
  type RegimeKey = 'presumido' | 'real' | 'simples'

  const regimesList: {
    key: RegimeKey
    name: string
    taxBurden: number
    netProfit: number
    netMargin: number
  }[] = [
    {
      key: 'presumido',
      name: 'Lucro Presumido',
      taxBurden: presumidoData.totalTaxBurden,
      netProfit: presumidoData.totalNetProfit,
      netMargin: presumidoData.netMargin,
    },
    {
      key: 'real',
      name: 'Lucro Real',
      taxBurden: realData.totalTaxBurden,
      netProfit: realData.totalNetProfit,
      netMargin: realData.netMargin,
    },
    {
      key: 'simples',
      name: 'Simples Nacional',
      taxBurden: simplesData.totalTaxBurden,
      netProfit: simplesData.totalNetProfit,
      netMargin: simplesData.netMargin,
    },
  ]

  // Regime vencedor pelo maior Lucro Líquido (se houver empate na carga tributária)
  // Quando há receita > 0, calcula com precisão; se tudo 0, padrão é Simples ou Presumido
  const bestRegimeKey: RegimeKey = useMemo(() => {
    // Ordena pelo maior Lucro Líquido (ou menor carga tributária como critério de desempate)
    const sorted = [...regimesList].sort((a, b) => {
      if (b.netProfit !== a.netProfit) {
        return b.netProfit - a.netProfit
      }
      return a.taxBurden - b.taxBurden
    })
    return sorted[0].key
  }, [presumidoData, realData, simplesData])

  const bestRegime = regimesList.find((r) => r.key === bestRegimeKey)!

  // Diferença de economia em relação ao pior regime
  const worstRegime = [...regimesList].sort((a, b) => a.netProfit - b.netProfit)[0]
  const economyDifference = Math.max(0, bestRegime.netProfit - worstRegime.netProfit)

  // Estado da camada colapsável de parâmetros operacionais compartilhados
  const [isParamsOpen, setIsParamsOpen] = useState<boolean>(false)
  // Estado da camada colapsável da base legal (recolhida por padrão)
  const [isBaseLegalOpen, setIsBaseLegalOpen] = useState<boolean>(false)

  // Contagem de parâmetros compartilhados ativos para o badge "Parâmetros compartilhados (N) ›"
  const sharedParamsCount = useMemo(() => {
    let count = 4 // Base: Quantidade, Atividade, Anexo Simples, RBT12
    if (payrollSalaries > 0) count++
    if (payrollProLabore > 0) count++
    if (presumidoExpenses.length > 0) count += presumidoExpenses.length
    return count
  }, [payrollSalaries, payrollProLabore, presumidoExpenses.length])

  return (
    <DemoLayout currentTab="comparacao">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Destaque Central Topo: Hero Banner estilo ADAPTA ONE */}
        <PageHero
          title="COMPARAÇÃO DE REGIMES"
          subtitle="Simulação simultânea da mesma operação comercial nos regimes Lucro Presumido, Lucro Real e Simples Nacional com análise de sensibilidade e diagnóstico comparativo."
          badge="DIAGNÓSTICO TRIBUTÁRIO COMPARATIVO · 3 REGIMES"
          icon={Scale}
        />

        {/* Alerta de Quantidade Excedida (Baixa por quantidade) */}
        {calculatedPurchases.autoInventoryDeductionActive &&
          calculatedPurchases.totalAvailableUnits > 0 &&
          qty > calculatedPurchases.totalAvailableUnits && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-2.5 shadow-lg">
              <span className="text-base">⚠️</span>
              <span>
                Quantidade vendida ({qty} un.) excede o estoque disponível (
                {calculatedPurchases.totalAvailableUnits} unidades) — CMV limitado ao estoque
                existente.
              </span>
            </div>
          )}

        {/* CABEÇALHO COMPACTO E DIAGNÓSTICO (Regime Mais Vantajoso em Evidência Direta) */}
        <div className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-emerald-500/15">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Parâmetros Compartilhados e Diagnóstico
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                    3 Cenários em Paralelo
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Operação comercial sincronizada nos 3 regimes tributários.
                </p>
              </div>
            </div>

            {/* Card Destaque Rápido do Vencedor (Resultado em destaque prioritário) */}
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-3 shadow-md shadow-emerald-950/40">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400/80 block">
                  Regime mais vantajoso
                </span>
                <span className="text-sm font-black text-white tracking-tight">
                  {bestRegime.name}
                </span>
              </div>
            </div>
          </div>

          {/* Faixa Compacta: Conectado às calculadoras + Botão de Camada "Parâmetros compartilhados (N) ›" */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold shrink-0">
              <LinkIcon className="w-4 h-4 shrink-0" />
              <span>Sincronizado em tempo real</span>
            </div>

            {/* Valores sincronizados consolidados em linha discreta */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300 text-[11px]">
              <div>
                Receita{hasConsolidated ? ' (consolidada)' : ''}:{' '}
                <strong className="text-emerald-400">{formatBRL(activeGrossRevenue)}</strong>
              </div>
              <span className="text-emerald-500/40 hidden sm:inline">•</span>
              <div>
                CMV Pres.:{' '}
                <strong className="text-emerald-400">{formatBRL(presumidoData.totalCmv)}</strong>
              </div>
              <span className="text-emerald-500/40 hidden sm:inline">•</span>
              <div>
                CMV Real:{' '}
                <strong className="text-emerald-400">{formatBRL(realData.totalCmv)}</strong>
              </div>
              <span className="text-emerald-500/40 hidden sm:inline">•</span>
              <div>
                CMV Simples:{' '}
                <strong className="text-emerald-400">{formatBRL(simplesData.totalCmv)}</strong>
              </div>
            </div>

            {/* Botão em camada padrão "›" do sistema para abrir/recolher parâmetros */}
            <button
              type="button"
              onClick={() => setIsParamsOpen((prev) => !prev)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
              title="Acessar parâmetros compartilhados operacionais, folha e outras despesas"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Parâmetros compartilhados ({sharedParamsCount}) ›</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-emerald-400 transition-transform duration-200 ${
                  isParamsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {/* CAMADA COLAPSÁVEL DE PARÂMETROS OPERACIONAIS (Recolhida por padrão) */}
          <Collapsible open={isParamsOpen} onOpenChange={setIsParamsOpen}>
            <CollapsibleContent className="space-y-4 pt-1 animate-in fade-in-0 duration-200">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-mono font-bold uppercase text-slate-200">
                      Parâmetros operacionais compartilhados (atualização automática ao digitar)
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    · reflete nos 3 cenários
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Campo Quantidade Vendida */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Quantidade vendida (un.)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        value={qtyInput}
                        onChange={handleQtyChange}
                        className="bg-slate-900 border-orange-500/50 text-orange-50 font-mono text-xs focus:border-orange-500 focus-visible:ring-orange-500/30"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Multiplica receita, CMV e tributos
                    </span>
                  </div>

                  {/* Atividade Presumido / Real */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Atividade (Presumido & Real)
                    </label>
                    <select
                      value={presumidoActivity}
                      onChange={(e) => {
                        const act = e.target.value as ActivityType
                        setPresumidoActivity(act)
                        setRealActivity(act)
                      }}
                      className="w-full h-9 rounded-md text-xs font-mono px-2.5 outline-none field-input-interactive"
                    >
                      <option value="comercio">Comércio (ICMS · IRPJ 8% / CSLL 12%)</option>
                      <option value="industria">Indústria (ICMS · IRPJ 8% / CSLL 12%)</option>
                      <option value="servicos">Serviços (ISSQN · IRPJ 32% / CSLL 32%)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Presunção Lei 9.249/95
                    </span>
                  </div>

                  {/* Anexo Simples Nacional */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Anexo Simples Nacional
                    </label>
                    <select
                      value={currentAnexoId}
                      onChange={(e) => setSimplesAnexo(e.target.value)}
                      className="w-full h-9 rounded-md text-xs font-mono px-2.5 outline-none field-input-interactive"
                    >
                      <option value="anexo_1">Anexo I — Comércio</option>
                      <option value="anexo_2">Anexo II — Indústria</option>
                      <option value="anexo_3">Anexo III — Serviços / Fator R ≥ 28%</option>
                      <option value="anexo_4">Anexo IV — Serviços sem CPP no DAS</option>
                      <option value="anexo_5">Anexo V — Serviços / Fator R &lt; 28%</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Faixa: {pgdas.faixaNome} ({formatNumberBR(pgdas.aliquotaEfetiva, 2)}%)
                    </span>
                  </div>

                  {/* RBT12 (para alíquota efetiva do Simples) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 block">
                        RBT12 Simples Nacional (R$)
                      </label>
                      {simplesIsInicioAtividade && (
                        <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                          · proporcional
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                        R$
                      </span>
                      <Input
                        type="text"
                        disabled={simplesIsInicioAtividade}
                        defaultValue={simplesRbt12 > 0 ? formatNumberBR(simplesRbt12) : ''}
                        key={`rbt-${simplesRbt12}-${simplesIsInicioAtividade}`}
                        onBlur={(e) => {
                          if (!simplesIsInicioAtividade) {
                            const parsed = parseBRNumber(e.target.value)
                            setSimplesRbt12(parsed)
                            e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                          }
                        }}
                        placeholder="0,00"
                        className={`pl-8 text-right font-mono text-xs ${
                          simplesIsInicioAtividade
                            ? 'bg-slate-950/80 border-slate-800 text-slate-400 font-bold cursor-not-allowed'
                            : 'bg-slate-900 border-orange-500/50 text-orange-50 focus:border-orange-500 focus-visible:ring-orange-500/30'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {simplesIsInicioAtividade
                        ? 'Início de atividade (LC 123/2006, art. 3º, § 9º)'
                        : 'Receita acumulada 12 meses'}
                    </span>
                  </div>
                </div>

                {/* BLOCO COMPARTILHADO: Folha e Pró-labore */}
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold uppercase text-slate-200 block">
                        Folha e Pró-labore (impacto nos 3 regimes)
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Folha e pró-labore são despesas nos 3 regimes. Encargos patronais (INSS{' '}
                        {formatNumberBR(payrollInssRate)}% + RAT + terceiros ={' '}
                        {formatNumberBR(payrollResult.totalPatronalRate)}%) incidem no Presumido e
                        Real. No Simples, a CPP já integra o DAS.
                      </span>
                    </div>
                    <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                      Encargos Presumido/Real: <strong>{formatBRL(patronalCharges)}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Folha de salários (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          defaultValue={payrollSalaries > 0 ? formatNumberBR(payrollSalaries) : ''}
                          key={`sal-${payrollSalaries}`}
                          onBlur={(e) => {
                            const parsed = parseBRNumber(e.target.value)
                            setPayrollSalaries(parsed)
                            e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                          }}
                          placeholder="0,00"
                          className="pl-8 text-right text-xs font-mono field-input-interactive"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Pró-labore sócios (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          defaultValue={
                            payrollProLabore > 0 ? formatNumberBR(payrollProLabore) : ''
                          }
                          key={`pro-${payrollProLabore}`}
                          onBlur={(e) => {
                            const parsed = parseBRNumber(e.target.value)
                            setPayrollProLabore(parsed)
                            e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                          }}
                          placeholder="0,00"
                          className="pl-8 text-right text-xs font-mono field-input-interactive"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-300 block">
                        INSS Patronal (%)
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          defaultValue={formatNumberBR(payrollInssRate)}
                          key={`inss-${payrollInssRate}`}
                          onBlur={(e) => {
                            const parsed = parseBRNumber(e.target.value)
                            setPayrollInssRate(parsed)
                            e.target.value = parsed > 0 ? formatNumberBR(parsed) : '0,00'
                          }}
                          className="pr-6 text-right text-xs font-mono field-input-interactive"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Alíquota RAT (%)
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          defaultValue={formatNumberBR(payrollRatRate)}
                          key={`rat-${payrollRatRate}`}
                          onBlur={(e) => {
                            const parsed = parseBRNumber(e.target.value)
                            setPayrollRatRate(parsed)
                            e.target.value = parsed > 0 ? formatNumberBR(parsed) : '0,00'
                          }}
                          className="pr-6 text-right text-xs font-mono field-input-interactive"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Terceiros (%)
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          defaultValue={formatNumberBR(payrollTerceirosRate)}
                          key={`terc-${payrollTerceirosRate}`}
                          onBlur={(e) => {
                            const parsed = parseBRNumber(e.target.value)
                            setPayrollTerceirosRate(parsed)
                            e.target.value = parsed > 0 ? formatNumberBR(parsed) : '0,00'
                          }}
                          className="pr-6 text-right text-xs font-mono field-input-interactive"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Despesas Operacionais Compartilhadas */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-semibold text-slate-300 block">
                        Outras despesas operacionais do período: {formatBRL(totalOtherExpenses)}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Deduzidas igualmente do resultado nos 3 regimes.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPresumidoExpense('Nova despesa operacional', 0)}
                      className="h-7 text-xs bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar despesa
                    </Button>
                  </div>

                  {presumidoExpenses.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {presumidoExpenses.map((exp) => (
                        <div
                          key={exp.id}
                          className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80"
                        >
                          <Input
                            type="text"
                            value={exp.description}
                            onChange={(e) =>
                              updatePresumidoExpense(exp.id, 'description', e.target.value)
                            }
                            placeholder="Descrição"
                            className="flex-1 text-xs font-mono h-8 field-input-interactive"
                          />
                          <div className="relative w-32">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 pointer-events-none">
                              R$
                            </span>
                            <Input
                              type="text"
                              defaultValue={exp.value > 0 ? formatNumberBR(exp.value) : ''}
                              key={`exp-${exp.id}-${exp.value}`}
                              onBlur={(e) => {
                                const parsed = parseBRNumber(e.target.value)
                                updatePresumidoExpense(exp.id, 'value', parsed)
                                e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                              }}
                              placeholder="0,00"
                              className="pl-6 text-right text-xs font-mono h-8 field-input-interactive"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removePresumidoExpense(exp.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* CARDS DE RESUMO COMPARATIVO (3 cards lado a lado com destaque visual para o melhor) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card Lucro Presumido */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              bestRegimeKey === 'presumido'
                ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'bg-[#0b101b]/90 border-slate-800/90'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase text-slate-300">
                Lucro Presumido
              </span>
              {bestRegimeKey === 'presumido' ? (
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Melhor Resultado
                </Badge>
              ) : (
                <span className="text-[11px] font-mono text-slate-500">Regime Geral</span>
              )}
            </div>

            <div className="space-y-3 font-mono">
              <div>
                <span className="text-[11px] text-slate-400 block">Carga Tributária Total</span>
                <span className="text-xl font-bold text-slate-100">
                  {formatBRL(presumidoData.totalTaxBurden)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {formatNumberBR(presumidoData.effectiveTaxRate, 2)}% da receita bruta
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Lucro Líquido Final</span>
                <span
                  className={`text-2xl font-black ${
                    bestRegimeKey === 'presumido' ? 'text-emerald-400' : 'text-slate-100'
                  }`}
                >
                  {formatBRL(presumidoData.totalNetProfit)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Margem Líquida</span>
                <span className="font-bold text-slate-200">
                  {formatPercentBR(presumidoData.netMargin)}
                </span>
              </div>
            </div>
          </div>

          {/* Card Lucro Real */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              bestRegimeKey === 'real'
                ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'bg-[#0b101b]/90 border-slate-800/90'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase text-slate-300">
                Lucro Real
              </span>
              {bestRegimeKey === 'real' ? (
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Melhor Resultado
                </Badge>
              ) : (
                <span className="text-[11px] font-mono text-slate-500">Não Cumulativo</span>
              )}
            </div>

            <div className="space-y-3 font-mono">
              <div>
                <span className="text-[11px] text-slate-400 block">Carga Tributária Total</span>
                <span className="text-xl font-bold text-slate-100">
                  {formatBRL(realData.totalTaxBurden)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {formatNumberBR(realData.effectiveTaxRate, 2)}% da receita bruta
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Lucro Líquido Final</span>
                <span
                  className={`text-2xl font-black ${
                    bestRegimeKey === 'real' ? 'text-emerald-400' : 'text-slate-100'
                  }`}
                >
                  {formatBRL(realData.totalNetProfit)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Margem Líquida</span>
                <span className="font-bold text-slate-200">
                  {formatPercentBR(realData.netMargin)}
                </span>
              </div>
            </div>
          </div>

          {/* Card Simples Nacional */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              bestRegimeKey === 'simples'
                ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'bg-[#0b101b]/90 border-slate-800/90'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase text-slate-300">
                Simples Nacional
              </span>
              {bestRegimeKey === 'simples' ? (
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Melhor Resultado
                </Badge>
              ) : (
                <span className="text-[11px] font-mono text-slate-500">LC 123/2006</span>
              )}
            </div>

            <div className="space-y-3 font-mono">
              <div>
                <span className="text-[11px] text-slate-400 block">
                  Carga Tributária Total (DAS)
                </span>
                <span className="text-xl font-bold text-slate-100">
                  {formatBRL(simplesData.totalTaxBurden)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {formatNumberBR(simplesData.effectiveTaxRate, 2)}% efetivo (PGDAS)
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Lucro Líquido Final</span>
                <span
                  className={`text-2xl font-black ${
                    bestRegimeKey === 'simples' ? 'text-emerald-400' : 'text-slate-100'
                  }`}
                >
                  {formatBRL(simplesData.totalNetProfit)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Margem Líquida</span>
                <span className="font-bold text-slate-200">
                  {formatPercentBR(simplesData.netMargin)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TABELA COMPARATIVA LADO A LADO COM AS LINHAS DA DRE */}
        <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Demonstração Comparativa Completa
              </h3>
              <p className="text-xs text-slate-400">
                {hasConsolidated
                  ? `Base calculada para ${qty} unidades consolidadas (${markupProducts.length} produtos — receita total: ${formatBRL(totalConsolidatedRevenue)})`
                  : `Base calculada para ${qty} unidades vendidas a ${formatBRL(unitGrossRevenue)}/un.`}
              </p>
            </div>
            {economyDifference > 0 && (
              <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>
                  Economia máxima estimada: <strong>{formatBRL(economyDifference)}</strong> vs{' '}
                  {worstRegime.name}
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-3 text-left font-semibold text-slate-300 w-1/3">
                    Linha de Resultado
                  </th>
                  <th
                    className={`py-3 px-3 text-right font-semibold ${
                      bestRegimeKey === 'presumido'
                        ? 'text-emerald-400 bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : 'text-slate-300'
                    }`}
                  >
                    Lucro Presumido
                  </th>
                  <th
                    className={`py-3 px-3 text-right font-semibold ${
                      bestRegimeKey === 'real'
                        ? 'text-emerald-400 bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : 'text-slate-300'
                    }`}
                  >
                    Lucro Real
                  </th>
                  <th
                    className={`py-3 px-3 text-right font-semibold ${
                      bestRegimeKey === 'simples'
                        ? 'text-emerald-400 bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : 'text-slate-300'
                    }`}
                  >
                    Simples Nacional
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* 1. Receita Bruta */}
                <tr>
                  <td className="py-2.5 px-3 text-left font-medium text-slate-200">
                    Receita Bruta Total
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-200 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 font-semibold'
                        : ''
                    }`}
                  >
                    {formatBRL(presumidoData.totalGross)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-200 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 font-semibold'
                        : ''
                    }`}
                  >
                    {formatBRL(realData.totalGross)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-200 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 font-semibold'
                        : ''
                    }`}
                  >
                    {formatBRL(simplesData.totalGross)}
                  </td>
                </tr>

                {/* 2. ICMS / ISS */}
                <tr>
                  <td className="py-2.5 px-3 text-left text-slate-400">
                    (−) ICMS ou ISS Municipal
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(presumidoData.totalMunicipalStateTax)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(realData.totalMunicipalStateTax)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    <span className="text-slate-500 italic">No DAS (segregado)</span>
                  </td>
                </tr>

                {/* 3. PIS */}
                <tr>
                  <td className="py-2.5 px-3 text-left text-slate-400">(−) PIS</td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(presumidoData.totalPis)}{' '}
                    <span className="text-[10px] text-slate-500">(0,65%)</span>
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(realData.totalPis)}{' '}
                    <span className="text-[10px] text-slate-500">(1,65%)</span>
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    <span className="text-slate-500 italic">No DAS (segregado)</span>
                  </td>
                </tr>

                {/* 4. COFINS */}
                <tr>
                  <td className="py-2.5 px-3 text-left text-slate-400">(−) COFINS</td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(presumidoData.totalCofins)}{' '}
                    <span className="text-[10px] text-slate-500">(3,00%)</span>
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(realData.totalCofins)}{' '}
                    <span className="text-[10px] text-slate-500">(7,60%)</span>
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    <span className="text-slate-500 italic">No DAS (segregado)</span>
                  </td>
                </tr>

                {/* 4.1 Encargos Patronais (INSS 20% + RAT + Terceiros) */}
                <tr>
                  <td className="py-2.5 px-3 text-left text-slate-400">
                    (−) Encargos Patronais (INSS {formatNumberBR(payrollInssRate)}% + RAT +
                    Terceiros)
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(patronalCharges)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(patronalCharges)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    <span className="text-emerald-400/90 italic font-semibold">
                      Incluso no DAS (CPP)
                    </span>
                  </td>
                </tr>

                {/* 5. Guia Única DAS (Destaque do Simples Nacional) */}
                <tr className="bg-slate-900/30">
                  <td className="py-2.5 px-3 text-left font-semibold text-emerald-400">
                    (−) Guia Única DAS (Simples Nacional)
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-500 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    —
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-500 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    —
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold text-emerald-400 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(simplesData.totalDasTotal)}{' '}
                    <span className="text-[10px] text-emerald-400/80">
                      ({formatNumberBR(pgdas.aliquotaEfetiva, 2)}% ef.)
                    </span>
                  </td>
                </tr>

                {/* 6. Receita Líquida */}
                <tr className="bg-slate-950/40 font-bold text-slate-100">
                  <td className="py-2.5 px-3 text-left">= Receita Líquida</td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 text-emerald-300'
                        : ''
                    }`}
                  >
                    {formatBRL(presumidoData.totalNetRevenue)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 text-emerald-300'
                        : ''
                    }`}
                  >
                    {formatBRL(realData.totalNetRevenue)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 text-emerald-300'
                        : ''
                    }`}
                  >
                    {formatBRL(simplesData.totalNetRevenue)}
                  </td>
                </tr>

                {/* 7. CMV */}
                <tr>
                  <td className="py-2.5 px-3 text-left text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>(−) CMV (Custo das Mercadorias)</span>
                      {calculatedPurchases.autoInventoryDeductionActive && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.2 rounded font-mono">
                          · automático (baixa por quantidade)
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(presumidoData.totalCmv)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(realData.totalCmv)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(simplesData.totalCmv)}
                  </td>
                </tr>

                {/* Linha expansível com a discriminação específica do CMV para Comparação */}
                <tr>
                  <td colSpan={4} className="py-1 px-1">
                    <CmvDetailedBreakdown
                      quantitySold={qty}
                      title="Ver composição discriminada do CMV por dedução específica"
                      showRegimeTabs={true}
                      variant="embedded"
                    />
                  </td>
                </tr>

                {/* 8. Lucro Bruto */}
                <tr className="bg-slate-950/40 font-bold text-slate-100">
                  <td className="py-2.5 px-3 text-left">= Lucro Bruto</td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 text-emerald-300'
                        : ''
                    }`}
                  >
                    {formatBRL(presumidoData.totalGrossProfit)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 text-emerald-300'
                        : ''
                    }`}
                  >
                    {formatBRL(realData.totalGrossProfit)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 text-emerald-300'
                        : ''
                    }`}
                  >
                    {formatBRL(simplesData.totalGrossProfit)}
                  </td>
                </tr>

                {/* 9. Despesas Operacionais Centrais */}
                {totalOperatingExpenses > 0 && (
                  <tr className="text-rose-300/90 bg-rose-500/[0.03]">
                    <td className="py-2.5 px-3 text-left">
                      (−) Despesas Operacionais (vendas, adm, financeiras)
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right ${
                        bestRegimeKey === 'presumido'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      -{formatBRL(totalOperatingExpenses)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right ${
                        bestRegimeKey === 'real'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      -{formatBRL(totalOperatingExpenses)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right ${
                        bestRegimeKey === 'simples'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      -{formatBRL(totalOperatingExpenses)}
                    </td>
                  </tr>
                )}

                {/* 9b. Folha de Salários e Pró-labore */}
                {directPayrollExpenses > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 text-left text-slate-400">
                      (−) Folha de Salários e Pró-labore
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right text-slate-400 ${
                        bestRegimeKey === 'presumido'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      -{formatBRL(directPayrollExpenses)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right text-slate-400 ${
                        bestRegimeKey === 'real'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      -{formatBRL(directPayrollExpenses)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right text-slate-400 ${
                        bestRegimeKey === 'simples'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      -{formatBRL(directPayrollExpenses)}
                    </td>
                  </tr>
                )}

                {/* 9c. Outras Despesas Operacionais Locais */}
                {totalOtherExpenses > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 text-left text-slate-400">
                      (−) Outras Despesas Operacionais (locais)
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right text-slate-400 ${
                        bestRegimeKey === 'presumido'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      -{formatBRL(totalOtherExpenses)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right text-slate-400 ${
                        bestRegimeKey === 'real'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      -{formatBRL(totalOtherExpenses)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right text-slate-400 ${
                        bestRegimeKey === 'simples'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      -{formatBRL(totalOtherExpenses)}
                    </td>
                  </tr>
                )}

                {/* 9d. Receitas Operacionais */}
                {totalGlobalOperatingRevenues > 0 && (
                  <tr className="text-emerald-300/90 bg-emerald-500/[0.03]">
                    <td className="py-2.5 px-3 text-left">
                      (+) Receitas Operacionais (financeiras e outras)
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right ${
                        bestRegimeKey === 'presumido'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      +{formatBRL(totalGlobalOperatingRevenues)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right ${
                        bestRegimeKey === 'real'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      +{formatBRL(totalGlobalOperatingRevenues)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right ${
                        bestRegimeKey === 'simples'
                          ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                          : ''
                      }`}
                    >
                      +{formatBRL(totalGlobalOperatingRevenues)}
                    </td>
                  </tr>
                )}

                {/* 10. Resultado antes IRPJ/CSLL (LAIR) */}
                <tr className="bg-slate-950/40 font-bold text-slate-200">
                  <td className="py-2.5 px-3 text-left">= Lucro antes do IR (LAIR)</td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 text-emerald-300'
                        : ''
                    }`}
                  >
                    {formatBRL(presumidoData.totalResultBeforeTax)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 text-emerald-300'
                        : ''
                    }`}
                  >
                    {formatBRL(realData.totalResultBeforeTax)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30 text-emerald-300'
                        : ''
                    }`}
                  >
                    {formatBRL(simplesData.totalResultBeforeTax)}
                  </td>
                </tr>

                {/* 11. IRPJ */}
                <tr>
                  <td className="py-2.5 px-3 text-left text-slate-400">
                    (−) IRPJ (+ Adicional de 10%)
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(presumidoData.totalIrpj + presumidoData.totalIrpjAdditional)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(realData.totalIrpj + realData.totalIrpjAdditional)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    <span className="text-slate-500 italic">No DAS</span>
                  </td>
                </tr>

                {/* 12. CSLL */}
                <tr>
                  <td className="py-2.5 px-3 text-left text-slate-400">(−) CSLL</td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(presumidoData.totalCsll)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(realData.totalCsll)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    <span className="text-slate-500 italic">No DAS</span>
                  </td>
                </tr>

                {/* Linhas de Subsistemas Especiais se ativos */}
                {stSubsystem.enabled && (
                  <tr className="bg-amber-500/[0.06] text-amber-500">
                    <td className="py-2.5 px-3 text-left font-medium">
                      (Subsistema ST) ICMS-ST Compra integrado ao custo
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {stSubsystem.purchasesStPaid > 0
                        ? `+${formatBRL(stSubsystem.purchasesStPaid)}`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {stSubsystem.purchasesStPaid > 0
                        ? `+${formatBRL(stSubsystem.purchasesStPaid)}`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {stSubsystem.purchasesStPaid > 0
                        ? `+${formatBRL(stSubsystem.purchasesStPaid)}`
                        : '—'}
                    </td>
                  </tr>
                )}

                {interstateSubsystem.enabled &&
                  interstateSubsystem.originUf !== interstateSubsystem.destinationUf && (
                    <tr className="bg-blue-500/[0.06] text-blue-400">
                      <td className="py-2.5 px-3 text-left font-medium">
                        (Subsistema Interestadual) Rota: {interstateSubsystem.originUf} →{' '}
                        {interstateSubsystem.destinationUf}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {interstateSubsystem.isEndConsumer && !interstateSubsystem.isTaxpayer
                          ? 'DIFAL Destino'
                          : 'Alíquota interestadual'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {interstateSubsystem.isEndConsumer && !interstateSubsystem.isTaxpayer
                          ? 'DIFAL Destino'
                          : 'Alíquota interestadual'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {interstateSubsystem.isEndConsumer && !interstateSubsystem.isTaxpayer
                          ? 'DIFAL Destino'
                          : 'Alíquota interestadual'}
                      </td>
                    </tr>
                  )}

                {/* 13. Carga Tributária Total */}
                <tr className="bg-slate-900/50 font-bold border-t border-slate-700/80">
                  <td className="py-3 px-3 text-left text-slate-200">Carga Tributária Total</td>
                  <td
                    className={`py-3 px-3 text-right text-slate-100 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/10 border-l border-r border-emerald-500/40 text-emerald-400'
                        : ''
                    }`}
                  >
                    {formatBRL(presumidoData.totalTaxBurden)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right text-slate-100 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/10 border-l border-r border-emerald-500/40 text-emerald-400'
                        : ''
                    }`}
                  >
                    {formatBRL(realData.totalTaxBurden)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right text-slate-100 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/10 border-l border-r border-emerald-500/40 text-emerald-400'
                        : ''
                    }`}
                  >
                    {formatBRL(simplesData.totalTaxBurden)}
                  </td>
                </tr>

                {/* 14. Lucro Líquido Final */}
                <tr className="bg-emerald-950/40 font-extrabold text-sm border-t-2 border-emerald-500/40">
                  <td className="py-3.5 px-3 text-left text-emerald-400">= Lucro Líquido Final</td>
                  <td
                    className={`py-3.5 px-3 text-right ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/20 border-l border-r border-emerald-500 text-emerald-300 font-black'
                        : 'text-slate-100'
                    }`}
                  >
                    {formatBRL(presumidoData.totalNetProfit)}
                  </td>
                  <td
                    className={`py-3.5 px-3 text-right ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/20 border-l border-r border-emerald-500 text-emerald-300 font-black'
                        : 'text-slate-100'
                    }`}
                  >
                    {formatBRL(realData.totalNetProfit)}
                  </td>
                  <td
                    className={`py-3.5 px-3 text-right ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/20 border-l border-r border-emerald-500 text-emerald-300 font-black'
                        : 'text-slate-100'
                    }`}
                  >
                    {formatBRL(simplesData.totalNetProfit)}
                  </td>
                </tr>

                {/* 15. Margem Líquida */}
                <tr className="bg-slate-950/60 font-semibold text-slate-300">
                  <td className="py-2.5 px-3 text-left">Margem Líquida (%)</td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/10 border-l border-r border-emerald-500/40 text-emerald-400 font-bold'
                        : ''
                    }`}
                  >
                    {formatPercentBR(presumidoData.netMargin)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/10 border-l border-r border-emerald-500/40 text-emerald-400 font-bold'
                        : ''
                    }`}
                  >
                    {formatPercentBR(realData.netMargin)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/10 border-l border-r border-emerald-500/40 text-emerald-400 font-bold'
                        : ''
                    }`}
                  >
                    {formatPercentBR(simplesData.netMargin)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Botões de Exportação (PDF e Excel) */}
          <ExportReportButtons
            disabled={activeGrossRevenue <= 0 && qty <= 0}
            onExportPdf={() => {
              exportComparisonToPdf({
                quantity: qty,
                unitGrossRevenue: unitGrossRevenue,
                totalGrossRevenue: activeGrossRevenue,
                bestRegime: {
                  key: bestRegimeKey,
                  name: bestRegime.name,
                },
                economyDifference,
                worstRegimeName: worstRegime.name,
                summaryRegimes: [
                  {
                    name: 'Lucro Presumido',
                    taxBurden: presumidoData.totalTaxBurden,
                    effectiveTaxRate: presumidoData.effectiveTaxRate,
                    netProfit: presumidoData.totalNetProfit,
                    netMargin: presumidoData.netMargin,
                    isBest: bestRegimeKey === 'presumido',
                  },
                  {
                    name: 'Lucro Real',
                    taxBurden: realData.totalTaxBurden,
                    effectiveTaxRate: realData.effectiveTaxRate,
                    netProfit: realData.totalNetProfit,
                    netMargin: realData.netMargin,
                    isBest: bestRegimeKey === 'real',
                  },
                  {
                    name: 'Simples Nacional',
                    taxBurden: simplesData.totalTaxBurden,
                    effectiveTaxRate: simplesData.effectiveTaxRate,
                    netProfit: simplesData.totalNetProfit,
                    netMargin: simplesData.netMargin,
                    isBest: bestRegimeKey === 'simples',
                  },
                ],
                comparisonRows: [
                  {
                    line: 'Receita Bruta Total',
                    presumido: presumidoData.totalGross,
                    real: realData.totalGross,
                    simples: simplesData.totalGross,
                  },
                  {
                    line: '(−) ICMS ou ISS Municipal',
                    presumido: -presumidoData.totalMunicipalStateTax,
                    real: -realData.totalMunicipalStateTax,
                    simples: 'No DAS (segregado)',
                  },
                  {
                    line: '(−) PIS',
                    presumido: -presumidoData.totalPis,
                    real: -realData.totalPis,
                    simples: 'No DAS (segregado)',
                  },
                  {
                    line: '(−) COFINS',
                    presumido: -presumidoData.totalCofins,
                    real: -realData.totalCofins,
                    simples: 'No DAS (segregado)',
                  },
                  {
                    line: `(−) Encargos Patronais (INSS ${formatNumberBR(payrollInssRate)}% + RAT + Terceiros)`,
                    presumido: -patronalCharges,
                    real: -patronalCharges,
                    simples: 'Incluso no DAS (CPP)',
                  },
                  {
                    line: '(−) Guia Única DAS (Simples)',
                    presumido: '—',
                    real: '—',
                    simples: -simplesData.totalDasTotal,
                    isHighlight: true,
                  },
                  {
                    line: '(=) Receita Líquida',
                    presumido: presumidoData.totalNetRevenue,
                    real: realData.totalNetRevenue,
                    simples: simplesData.totalNetRevenue,
                    isHighlight: true,
                  },
                  {
                    line: '(−) CMV (Custo das Mercadorias)',
                    presumido: -presumidoData.totalCmv,
                    real: -realData.totalCmv,
                    simples: -simplesData.totalCmv,
                  },
                  {
                    line: '(=) Lucro Bruto',
                    presumido: presumidoData.totalGrossProfit,
                    real: realData.totalGrossProfit,
                    simples: simplesData.totalGrossProfit,
                    isHighlight: true,
                  },
                  ...(totalOperatingExpenses > 0
                    ? [
                        {
                          line: '(−) Despesas Operacionais (vendas, adm, financeiras)',
                          presumido: -totalOperatingExpenses,
                          real: -totalOperatingExpenses,
                          simples: -totalOperatingExpenses,
                        },
                      ]
                    : []),
                  ...(directPayrollExpenses > 0
                    ? [
                        {
                          line: '(−) Folha de Salários e Pró-labore',
                          presumido: -directPayrollExpenses,
                          real: -directPayrollExpenses,
                          simples: -directPayrollExpenses,
                        },
                      ]
                    : []),
                  ...(totalOtherExpenses > 0
                    ? [
                        {
                          line: '(−) Outras Despesas Operacionais locais',
                          presumido: -totalOtherExpenses,
                          real: -totalOtherExpenses,
                          simples: -totalOtherExpenses,
                        },
                      ]
                    : []),
                  ...(totalGlobalOperatingRevenues > 0
                    ? [
                        {
                          line: '(+) Receitas Operacionais (financeiras e outras)',
                          presumido: totalGlobalOperatingRevenues,
                          real: totalGlobalOperatingRevenues,
                          simples: totalGlobalOperatingRevenues,
                        },
                      ]
                    : []),
                  {
                    line: '(=) Lucro antes de IRPJ / CSLL (LAIR)',
                    presumido: presumidoData.totalResultBeforeTax,
                    real: realData.totalResultBeforeTax,
                    simples: simplesData.totalResultBeforeTax,
                    isHighlight: true,
                  },
                  {
                    line: '(−) IRPJ (+ Adicional de 10%)',
                    presumido: -(presumidoData.totalIrpj + presumidoData.totalIrpjAdditional),
                    real: -(realData.totalIrpj + realData.totalIrpjAdditional),
                    simples: 'No DAS',
                  },
                  {
                    line: '(−) CSLL',
                    presumido: -presumidoData.totalCsll,
                    real: -realData.totalCsll,
                    simples: 'No DAS',
                  },
                  {
                    line: 'Carga Tributária Total',
                    presumido: presumidoData.totalTaxBurden,
                    real: realData.totalTaxBurden,
                    simples: simplesData.totalTaxBurden,
                    isHighlight: true,
                  },
                  {
                    line: '(=) Lucro Líquido Final',
                    presumido: presumidoData.totalNetProfit,
                    real: realData.totalNetProfit,
                    simples: simplesData.totalNetProfit,
                    isTotal: true,
                  },
                  {
                    line: 'Margem Líquida (%)',
                    presumido: formatPercentBR(presumidoData.netMargin),
                    real: formatPercentBR(realData.netMargin),
                    simples: formatPercentBR(simplesData.netMargin),
                    isHighlight: true,
                  },
                ],
                notes: [
                  `Regime recomendado: ${bestRegime.name} com lucro líquido estimado em ${formatBRL(
                    bestRegime.netProfit,
                  )} e margem líquida de ${formatPercentBR(bestRegime.netMargin)}.`,
                  economyDifference > 0
                    ? `Economia tributária e operacional máxima de ${formatBRL(
                        economyDifference,
                      )} em comparação ao regime ${worstRegime.name}.`
                    : 'Não há diferença significativa apurada entre os regimes para os parâmetros preenchidos.',
                  `Simples Nacional enquadrado no ${currentAnexoConfig.nome} (${pgdas.faixaNome}) com alíquota efetiva PGDAS de ${formatNumberBR(
                    pgdas.aliquotaEfetiva,
                    2,
                  )}%.`,
                  'Encargos patronais sobre folha e pró-labore incidem de forma direta no Lucro Presumido e Lucro Real, enquanto no Simples Nacional a CPP integra a alíquota única da guia DAS.',
                ],
              })
            }}
            onExportExcel={() => {
              exportComparisonToExcel({
                quantity: qty,
                unitGrossRevenue: unitGrossRevenue,
                totalGrossRevenue: activeGrossRevenue,
                bestRegime: {
                  key: bestRegimeKey,
                  name: bestRegime.name,
                },
                economyDifference,
                worstRegimeName: worstRegime.name,
                summaryRegimes: [
                  {
                    name: 'Lucro Presumido',
                    taxBurden: presumidoData.totalTaxBurden,
                    effectiveTaxRate: presumidoData.effectiveTaxRate,
                    netProfit: presumidoData.totalNetProfit,
                    netMargin: presumidoData.netMargin,
                    isBest: bestRegimeKey === 'presumido',
                  },
                  {
                    name: 'Lucro Real',
                    taxBurden: realData.totalTaxBurden,
                    effectiveTaxRate: realData.effectiveTaxRate,
                    netProfit: realData.totalNetProfit,
                    netMargin: realData.netMargin,
                    isBest: bestRegimeKey === 'real',
                  },
                  {
                    name: 'Simples Nacional',
                    taxBurden: simplesData.totalTaxBurden,
                    effectiveTaxRate: simplesData.effectiveTaxRate,
                    netProfit: simplesData.totalNetProfit,
                    netMargin: simplesData.netMargin,
                    isBest: bestRegimeKey === 'simples',
                  },
                ],
                comparisonRows: [
                  {
                    line: 'Receita Bruta Total',
                    presumido: presumidoData.totalGross,
                    real: realData.totalGross,
                    simples: simplesData.totalGross,
                  },
                  {
                    line: '(−) ICMS ou ISS Municipal',
                    presumido: -presumidoData.totalMunicipalStateTax,
                    real: -realData.totalMunicipalStateTax,
                    simples: 'No DAS (segregado)',
                  },
                  {
                    line: '(−) PIS',
                    presumido: -presumidoData.totalPis,
                    real: -realData.totalPis,
                    simples: 'No DAS (segregado)',
                  },
                  {
                    line: '(−) COFINS',
                    presumido: -presumidoData.totalCofins,
                    real: -realData.totalCofins,
                    simples: 'No DAS (segregado)',
                  },
                  {
                    line: `(−) Encargos Patronais (INSS ${formatNumberBR(payrollInssRate)}% + RAT + Terceiros)`,
                    presumido: -patronalCharges,
                    real: -patronalCharges,
                    simples: 'Incluso no DAS (CPP)',
                  },
                  {
                    line: '(−) Guia Única DAS (Simples)',
                    presumido: '—',
                    real: '—',
                    simples: -simplesData.totalDasTotal,
                  },
                  {
                    line: '(=) Receita Líquida',
                    presumido: presumidoData.totalNetRevenue,
                    real: realData.totalNetRevenue,
                    simples: simplesData.totalNetRevenue,
                  },
                  {
                    line: '(−) CMV (Custo das Mercadorias)',
                    presumido: -presumidoData.totalCmv,
                    real: -realData.totalCmv,
                    simples: -simplesData.totalCmv,
                  },
                  {
                    line: '(=) Lucro Bruto',
                    presumido: presumidoData.totalGrossProfit,
                    real: realData.totalGrossProfit,
                    simples: simplesData.totalGrossProfit,
                  },
                  ...(totalOperatingExpenses > 0
                    ? [
                        {
                          line: '(−) Despesas Operacionais (vendas, adm, financeiras)',
                          presumido: -totalOperatingExpenses,
                          real: -totalOperatingExpenses,
                          simples: -totalOperatingExpenses,
                        },
                      ]
                    : []),
                  ...(directPayrollExpenses > 0
                    ? [
                        {
                          line: '(−) Folha de Salários e Pró-labore',
                          presumido: -directPayrollExpenses,
                          real: -directPayrollExpenses,
                          simples: -directPayrollExpenses,
                        },
                      ]
                    : []),
                  ...(totalOtherExpenses > 0
                    ? [
                        {
                          line: '(−) Outras Despesas Operacionais locais',
                          presumido: -totalOtherExpenses,
                          real: -totalOtherExpenses,
                          simples: -totalOtherExpenses,
                        },
                      ]
                    : []),
                  ...(totalGlobalOperatingRevenues > 0
                    ? [
                        {
                          line: '(+) Receitas Operacionais (financeiras e outras)',
                          presumido: totalGlobalOperatingRevenues,
                          real: totalGlobalOperatingRevenues,
                          simples: totalGlobalOperatingRevenues,
                        },
                      ]
                    : []),
                  {
                    line: '(=) Lucro antes de IRPJ / CSLL (LAIR)',
                    presumido: presumidoData.totalResultBeforeTax,
                    real: realData.totalResultBeforeTax,
                    simples: simplesData.totalResultBeforeTax,
                  },
                  {
                    line: '(−) IRPJ (+ Adicional de 10%)',
                    presumido: -(presumidoData.totalIrpj + presumidoData.totalIrpjAdditional),
                    real: -(realData.totalIrpj + realData.totalIrpjAdditional),
                    simples: 'No DAS',
                  },
                  {
                    line: '(−) CSLL',
                    presumido: -presumidoData.totalCsll,
                    real: -realData.totalCsll,
                    simples: 'No DAS',
                  },
                  {
                    line: 'Carga Tributária Total',
                    presumido: presumidoData.totalTaxBurden,
                    real: realData.totalTaxBurden,
                    simples: simplesData.totalTaxBurden,
                  },
                  {
                    line: '(=) Lucro Líquido Final',
                    presumido: presumidoData.totalNetProfit,
                    real: realData.totalNetProfit,
                    simples: simplesData.totalNetProfit,
                  },
                  {
                    line: 'Margem Líquida (%)',
                    presumido: presumidoData.netMargin,
                    real: realData.netMargin,
                    simples: simplesData.netMargin,
                  },
                ],
                notes: [
                  `Regime recomendado: ${bestRegime.name}.`,
                  economyDifference > 0
                    ? `Economia estimada em relação ao regime ${worstRegime.name}: R$ ${economyDifference.toFixed(2)}.`
                    : '',
                ],
              })
            }}
          />
        </div>

        {/* BASE LEGAL, CONDIÇÕES E PARTICULARIDADES POR REGIME (Camada colapsável / recolhida por padrão) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsBaseLegalOpen((prev) => !prev)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
              title="Acessar base legal, particularidades e normas tributárias por regime"
            >
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Base legal e condições por regime ›</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-emerald-400 transition-transform duration-200 ${
                  isBaseLegalOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              Lei 9.249/95 · Lei 10.637/02 · Lei 10.833/03 · LC 123/2006 · Tema 69/STF
            </span>
          </div>

          <Collapsible open={isBaseLegalOpen} onOpenChange={setIsBaseLegalOpen}>
            <CollapsibleContent className="animate-in fade-in-0 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Condições Lucro Presumido */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-200 font-bold uppercase pb-1 border-b border-slate-800">
                    <Info className="w-4 h-4 text-emerald-400" />
                    <span>Condições · Presumido</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-400 list-disc list-inside leading-relaxed">
                    <li>
                      <strong className="text-slate-300">Presunção por atividade:</strong>{' '}
                      {presumidoData.isServices
                        ? 'IRPJ 32% e CSLL 32% sobre a receita bruta (serviços).'
                        : 'IRPJ 8% e CSLL 12% sobre a receita bruta (comércio/indústria).'}
                    </li>
                    <li>
                      <strong className="text-slate-300">PIS/COFINS cumulativo:</strong> 0,65% e
                      3,00%. Sem direito a tomada de créditos sobre compras ou insumos.
                    </li>
                    <li>
                      <strong className="text-slate-300">Tese do século (Tema 69/STF):</strong>{' '}
                      {presumidoData.isServices
                        ? 'ISS não é excluído da base PIS/COFINS.'
                        : 'ICMS destacado integralmente excluído da base de cálculo.'}
                    </li>
                    <li>
                      <strong className="text-slate-300">Adicional IRPJ:</strong> 10% sobre a
                      parcela da base presumida que exceder R$ 60.000,00 trimestral.
                    </li>
                  </ul>
                </div>

                {/* Card Condições Lucro Real */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-200 font-bold uppercase pb-1 border-b border-slate-800">
                    <Info className="w-4 h-4 text-emerald-400" />
                    <span>Condições · Lucro Real</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-400 list-disc list-inside leading-relaxed">
                    <li>
                      <strong className="text-slate-300">Créditos de compras:</strong> dedução
                      integral de ICMS, PIS (1,65%) e COFINS (7,60%) recuperáveis na aquisição de
                      insumos e mercadorias.
                    </li>
                    <li>
                      <strong className="text-slate-300">LALUR (Ajustes):</strong> IRPJ (15%) e CSLL
                      (9%) incidem sobre o lucro contábil ajustado por adições e exclusões.
                    </li>
                    <li>
                      <strong className="text-slate-300">Vantagem em margens baixas:</strong> ideal
                      quando a empresa possui margem operacional real menor do que a presunção legal
                      ou prejuízo fiscal.
                    </li>
                    <li>
                      <strong className="text-slate-300">Adicional IRPJ:</strong> 10% sobre o Lucro
                      Real que exceder R$ 60.000,00 trimestrais.
                    </li>
                  </ul>
                </div>

                {/* Card Condições Simples Nacional */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-200 font-bold uppercase pb-1 border-b border-slate-800">
                    <Info className="w-4 h-4 text-emerald-400" />
                    <span>Condições · Simples</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-400 list-disc list-inside leading-relaxed">
                    <li>
                      <strong className="text-slate-300">Anexo aplicado:</strong>{' '}
                      {currentAnexoConfig.nome} ({pgdas.faixaNome}). Alíquota efetiva PGDAS de{' '}
                      {formatNumberBR(pgdas.aliquotaEfetiva, 2)}%.
                    </li>
                    <li className="text-emerald-300">
                      <strong className="text-emerald-300">CPP já incluída no DAS:</strong> sem
                      encargo patronal adicional (20% + RAT + terceiros não incidem no Simples
                      Nacional fora do Anexo IV).
                    </li>
                    {currentAnexoConfig.sujeitoFatorR && (
                      <li>
                        <strong className="text-slate-300">Fator R:</strong>{' '}
                        {fatorRResult.fatorRPercent.toFixed(2)}% —{' '}
                        {fatorRResult.isElegibleAnexo3
                          ? '≥ 28% (elegível ao Anexo III).'
                          : '< 28% (enquadrado no Anexo V).'}
                      </li>
                    )}
                    {pgdas.isSublimiteExceeded ? (
                      <li className="text-amber-300">
                        <strong className="text-amber-300">Alerta de sublimite:</strong> faturamento
                        &gt; R$ 3,6 mi. ICMS/ISS recolhidos por fora do DAS.
                      </li>
                    ) : (
                      <li>
                        <strong className="text-slate-300">Sublimite R$ 3,6 mi:</strong> faturamento
                        dentro do limite estadual/municipal unificado.
                      </li>
                    )}
                    <li>
                      <strong className="text-slate-300">Custo de compras:</strong> tributos de
                      aquisição não geram crédito e integram integralmente o CMV.
                    </li>
                  </ul>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Barra de Gerenciamento de Cenários no fim da página (padrão Markup) */}
        <div className="pt-2">
          <ScenarioManagerBar />
        </div>

        {/* Rodapé com Navegação para voltar às outras telas */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            onClick={() => navigate('/demo/simples')}
            className="bg-[#0f172a]/90 text-slate-300 border border-slate-700/80 hover:border-emerald-500/40 hover:text-white hover:bg-slate-800/80 font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shadow-sm"
          >
            <span>Ver DRE Simples Nacional</span>
          </Button>

          <Button
            type="button"
            onClick={() => navigate('/demo/dre-presumido')}
            className="bg-[#0f172a]/90 text-slate-300 border border-slate-700/80 hover:border-emerald-500/40 hover:text-white hover:bg-slate-800/80 font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shadow-sm"
          >
            <span>Ver DRE Lucro Presumido</span>
          </Button>

          <Button
            type="button"
            onClick={() => navigate('/demo/dre-real')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
          >
            <span>Ver DRE Lucro Real</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </DemoLayout>
  )
}
