import React, { useState, useMemo } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { useTaxContext } from '@/contexts/TaxContext'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Info,
  Plus,
  Trash2,
} from 'lucide-react'
import { formatBRL, formatNumberBR, formatPercentBR, parseBRNumber } from '@/lib/taxCalculations'
import {
  SIMPLES_ANEXOS,
  SimplesAnexoId,
  calculateFatorR,
  calculatePgdas,
  calculateRbt12InicioAtividade,
  SUBLIMITE_SIMPLES,
} from '@/lib/simplesCalculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScenarioManagerBar } from '@/components/demo/ScenarioManagerBar'
import { ExportReportButtons } from '@/components/demo/ExportReportButtons'
import { exportDreToPdf, exportDreToExcel } from '@/lib/exportReports'
import { CmvDetailedBreakdown } from '@/components/demo/CmvDetailedBreakdown'
import { PageHero } from '@/components/demo/PageHero'
import { Badge } from '@/components/ui/badge'
import { RegimeSideBySideDreTables } from '@/components/demo/RegimeSideBySideDreTables'
import { computeDreComparativeForRegime } from '@/components/demo/DreRegimeComparativeSection'

export default function DreSimplesPage() {
  const navigate = useNavigate()
  const {
    regime,
    setRegime,
    simulatedSalePrice,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
    totalConsolidatedCost,
    markupProducts,
    calculatedPurchases,
    initialInventory,
    finalInventory,
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
    simplesIsInicioAtividade,
    setSimplesIsInicioAtividade,
    simplesMonthlyRevenues,
    addSimplesMonthlyRevenue,
    updateSimplesMonthlyRevenue,
    removeSimplesMonthlyRevenue,
    effectiveSimplesRbt12,
    isSimplesSimulated,
    simulateSimples,
    stSubsystem,
    interstateSubsystem,
    purchasesItems,
    getPurchaseItemUnitNetCost,
    customTaxesMarkup,
    totalVariableExpenseRate,
    desiredLiquidRevenueByRegime,
  } = useTaxContext()

  // Rastreamento local de quais meses foram preenchidos via Markup
  const [markupFilledMonths, setMarkupFilledMonths] = useState<Record<number, boolean>>({})

  const { totalPurchasesQuantity } = useTaxContext()

  // Força o regime global da própria tela ao montar/trocar
  React.useEffect(() => {
    if (regime !== 'simples') {
      setRegime('simples')
    }
  }, [regime, setRegime])

  // Quantidade automática conectada diretamente ao Markup/Compras
  const automaticQuantity =
    totalConsolidatedQuantity > 0
      ? totalConsolidatedQuantity
      : (totalPurchasesQuantity || 0) > 0
        ? totalPurchasesQuantity || 0
        : simplesQuantitySold > 0
          ? simplesQuantitySold
          : 0

  // Garante que o estado compartilhado fique alinhado à quantidade automática
  React.useEffect(() => {
    if (automaticQuantity > 0 && simplesQuantitySold !== automaticQuantity) {
      setSimplesQuantitySold(automaticQuantity)
    }
  }, [automaticQuantity, simplesQuantitySold, setSimplesQuantitySold])

  // Estados locais para inputs
  const [rbt12Input, setRbt12Input] = useState<string>(
    simplesRbt12 > 0 ? formatNumberBR(simplesRbt12) : '',
  )
  const [isRbt12Focused, setIsRbt12Focused] = useState(false)
  const [payrollInput, setPayrollInput] = useState<string>(
    simplesPayroll12m > 0 ? formatNumberBR(simplesPayroll12m) : '',
  )
  const [isPayrollFocused, setIsPayrollFocused] = useState(false)

  React.useEffect(() => {
    if (!isRbt12Focused) {
      if (simplesIsInicioAtividade) {
        setRbt12Input(effectiveSimplesRbt12 > 0 ? formatNumberBR(effectiveSimplesRbt12) : '')
      } else {
        setRbt12Input(simplesRbt12 > 0 ? formatNumberBR(simplesRbt12) : '')
      }
    }
  }, [simplesRbt12, effectiveSimplesRbt12, simplesIsInicioAtividade, isRbt12Focused])

  React.useEffect(() => {
    if (!isPayrollFocused) {
      setPayrollInput(simplesPayroll12m > 0 ? formatNumberBR(simplesPayroll12m) : '')
    }
  }, [simplesPayroll12m, isPayrollFocused])

  // Identificação da origem da quantidade para exibição transparente
  const countMarkupProductsWithQty = markupProducts.filter((p) => (p.quantity || 0) > 0).length
  const quantitySourceLabel =
    totalConsolidatedQuantity > 0
      ? countMarkupProductsWithQty > 1
        ? `via Markup · ${countMarkupProductsWithQty} produtos`
        : 'via Markup'
      : (totalPurchasesQuantity || 0) > 0
        ? 'via Compras'
        : 'sem quantidade cadastrada'

  // Quantidade vendida: usa diretamente a quantidade automática ligada ao Markup/Compras
  const effectiveQuantity = automaticQuantity
  const qty = effectiveQuantity

  // RECEITA BRUTA E CMV:
  const hasConsolidated = totalConsolidatedRevenue > 0
  const isAutoInventory = calculatedPurchases.autoInventoryDeductionActive
  const effectiveSoldQtyForCmv = isAutoInventory
    ? Math.min(qty, calculatedPurchases.totalAvailableUnits)
    : qty

  const baseProductGross = hasConsolidated
    ? totalConsolidatedRevenue
    : Math.round((simulatedSalePrice || 0) * (qty > 0 ? qty : 0) * 100) / 100

  const totalGross = Math.round(baseProductGross * 100) / 100
  const activeGrossRevenue = totalGross
  const totalEffectiveQty = qty > 0 ? qty : 0
  const unitGrossRevenue =
    totalEffectiveQty > 0
      ? Math.round((totalGross / totalEffectiveQty) * 100) / 100
      : simulatedSalePrice || 0

  const isMultiProduct =
    (purchasesItems && purchasesItems.length > 1) || (markupProducts && markupProducts.length > 1)

  const baseProductCmv =
    calculatedPurchases.cmvSimples > 0
      ? calculatedPurchases.cmvSimples
      : totalConsolidatedCost > 0
        ? totalConsolidatedCost
        : 0

  const consolidatedCMV = Math.round(baseProductCmv * 100) / 100
  const unitCMV = isMultiProduct
    ? null
    : effectiveSoldQtyForCmv > 0
      ? Math.round((consolidatedCMV / effectiveSoldQtyForCmv) * 100) / 100
      : calculatedPurchases.unitCostSimplesEffective || 0

  // Cálculo de início de atividade detalhado
  const inicioAtividadeCalc = useMemo(
    () => calculateRbt12InicioAtividade(simplesMonthlyRevenues),
    [simplesMonthlyRevenues],
  )

  // Cálculo automático do Fator R (usando a RBT12 efetiva)
  const fatorRResult = useMemo(
    () => calculateFatorR(simplesPayroll12m, effectiveSimplesRbt12),
    [simplesPayroll12m, effectiveSimplesRbt12],
  )

  // Anexo atual selecionado
  const currentAnexoId = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const currentAnexoConfig = SIMPLES_ANEXOS[currentAnexoId] || SIMPLES_ANEXOS.anexo_1

  // Cálculo PGDAS da alíquota efetiva e repartição de tributos (usando a RBT12 efetiva)
  const pgdas = useMemo(
    () => calculatePgdas(currentAnexoId, effectiveSimplesRbt12),
    [currentAnexoId, effectiveSimplesRbt12],
  )

  // CÁLCULOS UNITÁRIOS DA DRE (PADRONIZADOS POR UNIDADE COM 2 CASAS DECIMAIS)
  // 1. Receita Bruta Unitária (preço de venda por unidade)
  const unitGross = unitGrossRevenue

  // Alíquota Efetiva do PGDAS (%)
  const effectiveRate = pgdas.aliquotaEfetiva
  const effectiveRateDec = effectiveRate / 100

  // Guia Única DAS unitária
  const unitDasTotal = Math.round(unitGross * effectiveRateDec * 100) / 100

  // Distribuição dos tributos unitários conforme partilha do PGDAS
  const unitIrpj = Math.round(((unitGross * pgdas.reparticao.irpjRate) / 100) * 100) / 100
  const unitCsll = Math.round(((unitGross * pgdas.reparticao.csllRate) / 100) * 100) / 100
  const unitCofins = Math.round(((unitGross * pgdas.reparticao.cofinsRate) / 100) * 100) / 100
  const unitPis = Math.round(((unitGross * pgdas.reparticao.pisRate) / 100) * 100) / 100
  const unitCpp = Math.round(((unitGross * pgdas.reparticao.cppRate) / 100) * 100) / 100
  const unitIcms = Math.round(((unitGross * pgdas.reparticao.icmsRate) / 100) * 100) / 100
  const unitIpi = Math.round(((unitGross * pgdas.reparticao.ipiRate) / 100) * 100) / 100
  const unitIss = Math.round(((unitGross * pgdas.reparticao.issRate) / 100) * 100) / 100

  // Receita Líquida unitária (Receita Bruta - Guia DAS)
  const unitNetRevenue = Math.round((unitGross - unitDasTotal) * 100) / 100

  // CMV unitário
  const unitCmvVal = unitCMV

  // Lucro Bruto unitário
  const unitGrossProfit =
    unitCmvVal !== null ? Math.round((unitNetRevenue - unitCmvVal) * 100) / 100 : null

  // DESPESAS E RECEITAS OPERACIONAIS GLOBAIS (vindas do TaxContext)
  const { totalOperatingExpenses, totalOperatingRevenues } = useTaxContext()

  // Despesas operacionais locais cadastradas na aba do Simples
  const totalLocalExpenses = simplesExpenses.reduce((acc, exp) => acc + (exp.value || 0), 0)
  // Total consolidado de Despesas Operacionais: Tabela específica + Despesas locais
  const totalAllOperatingExpenses = totalOperatingExpenses + totalLocalExpenses
  const totalAllOperatingRevenues = totalOperatingRevenues

  const totalExpenses = totalAllOperatingExpenses
  const unitOperatingExpenses =
    qty > 0 ? Math.round((totalAllOperatingExpenses / qty) * 100) / 100 : 0
  const unitOperatingRevenues =
    qty > 0 ? Math.round((totalAllOperatingRevenues / qty) * 100) / 100 : 0
  const unitExpenses = unitOperatingExpenses

  // Lucro antes do IR (LAIR) / Lucro Líquido unitário
  // No Simples Nacional, os tributos já estão deduzidos na guia DAS (Receita Líquida);
  // LAIR = Lucro Bruto - Despesas Operacionais + Receitas Operacionais
  const unitLair =
    unitGrossProfit !== null
      ? Math.round((unitGrossProfit - unitOperatingExpenses + unitOperatingRevenues) * 100) / 100
      : null
  const unitNetProfit = unitLair

  // SALVAGUARDAS MULTI-PRODUTO: Em cenários multi-produto, grandezas unitárias NÃO devem expressar
  // médias matemáticas enganosas entre mercadorias com custos/preços distintos.
  const displayUnitGross = isMultiProduct ? null : unitGross
  const displayUnitDasTotal = isMultiProduct ? null : unitDasTotal
  const displayUnitIrpj = isMultiProduct ? null : unitIrpj
  const displayUnitCsll = isMultiProduct ? null : unitCsll
  const displayUnitCofins = isMultiProduct ? null : unitCofins
  const displayUnitPis = isMultiProduct ? null : unitPis
  const displayUnitCpp = isMultiProduct ? null : unitCpp
  const displayUnitIcms = isMultiProduct ? null : unitIcms
  const displayUnitIpi = isMultiProduct ? null : unitIpi
  const displayUnitIss = isMultiProduct ? null : unitIss
  const displayUnitNetRevenue = isMultiProduct ? null : unitNetRevenue
  const displayUnitCmv = isMultiProduct ? null : unitCmvVal
  const displayUnitGrossProfit = isMultiProduct ? null : unitGrossProfit
  const displayUnitOperatingExpenses = isMultiProduct
    ? null
    : qty > 0
      ? totalOperatingExpenses / qty
      : 0
  const displayUnitLocalExpenses = isMultiProduct ? null : qty > 0 ? totalLocalExpenses / qty : 0
  const displayUnitOperatingRevenues = isMultiProduct ? null : unitOperatingRevenues
  const displayUnitLair = isMultiProduct ? null : unitLair
  const displayUnitNetProfit = isMultiProduct ? null : unitNetProfit

  // CÁLCULOS TOTAIS DA DRE (totalGross já definido estritamente pela soma consolidada sem multiplicação por média unitária)
  const totalDasTotal = Math.round(unitDasTotal * (qty > 0 ? qty : 0) * 100) / 100
  const totalIrpj = Math.round(unitIrpj * (qty > 0 ? qty : 0) * 100) / 100
  const totalCsll = Math.round(unitCsll * (qty > 0 ? qty : 0) * 100) / 100
  const totalCofins = Math.round(unitCofins * (qty > 0 ? qty : 0) * 100) / 100
  const totalPis = Math.round(unitPis * (qty > 0 ? qty : 0) * 100) / 100
  const totalCpp = Math.round(unitCpp * (qty > 0 ? qty : 0) * 100) / 100
  const totalIcms = Math.round(unitIcms * (qty > 0 ? qty : 0) * 100) / 100
  const totalIpi = Math.round(unitIpi * (qty > 0 ? qty : 0) * 100) / 100
  const totalIss = Math.round(unitIss * (qty > 0 ? qty : 0) * 100) / 100
  const totalNetRevenue = Math.round(unitNetRevenue * (qty > 0 ? qty : 0) * 100) / 100
  const isQuantityExceeded =
    isAutoInventory &&
    calculatedPurchases.totalAvailableUnits > 0 &&
    qty > calculatedPurchases.totalAvailableUnits
  const totalCmv = consolidatedCMV
  const totalGrossProfit = Math.round((totalNetRevenue - totalCmv) * 100) / 100
  // LAIR = Lucro Bruto - Despesas Operacionais + Receitas Operacionais
  const totalLair =
    Math.round((totalGrossProfit - totalAllOperatingExpenses + totalAllOperatingRevenues) * 100) /
    100
  const totalNetProfit = totalLair

  // Cards de Resumo
  const totalTaxBurden = totalGross > 0 ? totalDasTotal : 0
  const netMargin = totalGross > 0 ? (totalNetProfit / totalGross) * 100 : 0

  // Motor Canônico Comparativo Unificado para Regime Simples Nacional (2 DREs lado a lado)
  const simplesDreData = React.useMemo(() => {
    return computeDreComparativeForRegime({
      regimeKey: 'simples',
      markupProducts,
      purchasesItems,
      getPurchaseItemUnitNetCost,
      icmsRate: 0,
      customTaxesMarkup: customTaxesMarkup || [],
      dvRate: totalVariableExpenseRate || 0,
      simplesEffectiveRate: pgdas.aliquotaEfetiva || 0,
      desiredLiquidRevenueByRegime,
      calculatedPurchases,
      totalGlobalOperatingExpenses: totalOperatingExpenses,
      totalGlobalOperatingRevenues: totalOperatingRevenues,
      directPayrollExpenses: 0,
      patronalCharges: 0, // inclusa no DAS
      presumidoActivity: 'comercio',
      realActivity: 'comercio',
      presumidoIssRate: 0,
      realIssRate: 0,
      realAdditions: 0,
      realExclusions: 0,
      regimeQuantity: qty,
    })
  }, [
    markupProducts,
    purchasesItems,
    getPurchaseItemUnitNetCost,
    customTaxesMarkup,
    totalVariableExpenseRate,
    pgdas.aliquotaEfetiva,
    desiredLiquidRevenueByRegime,
    calculatedPurchases,
    totalOperatingExpenses,
    totalOperatingRevenues,
    qty,
  ])

  const handleRbt12Blur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseBRNumber(e.target.value)
    setSimplesRbt12(parsed)
    setRbt12Input(parsed > 0 ? formatNumberBR(parsed) : '')
  }

  const handlePayrollBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseBRNumber(e.target.value)
    setSimplesPayroll12m(parsed)
    setPayrollInput(parsed > 0 ? formatNumberBR(parsed) : '')
  }

  // Aplicar sugestão do Fator R
  const applyFatorRRecommendation = () => {
    setSimplesAnexo(fatorRResult.recommendedAnexo)
  }

  // Ação explícita: Preencher o mês corrente (último da lista) com a receita bruta mensal consolidada do Markup
  const handleApplyMarkupRevenueToCurrentMonth = () => {
    if (activeGrossRevenue <= 0) return
    const targetIndex = Math.max(0, simplesMonthlyRevenues.length - 1)
    updateSimplesMonthlyRevenue(targetIndex, activeGrossRevenue)
    setMarkupFilledMonths((prev) => ({ ...prev, [targetIndex]: true }))
  }

  return (
    <DemoLayout currentTab="simples">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Destaque Central Topo: Hero Banner estilo ADAPTA ONE */}
        <PageHero
          title="DRE — SIMPLES NACIONAL"
          subtitle="Cálculo com fórmula oficial do PGDAS (Resolução CGSN 140/2018), Fator R automático para serviços, enquadramento por Anexo e segregação da guia única DAS."
          badge="LEI COMPLEMENTAR 123/2006 · PGDAS COMPLETO"
          icon={Calculator}
        />

        {/* Alerta de Quantidade Excedida (Baixa por quantidade) */}
        {isQuantityExceeded && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-2.5 shadow-lg">
            <span className="text-base">⚠️</span>
            <span>
              Quantidade vendida ({qty} un.) excede o estoque disponível (
              {calculatedPurchases.totalAvailableUnits} unidades) — CMV limitado ao estoque
              existente.
            </span>
          </div>
        )}

        {/* Cabeçalho */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#f9e596]/40 to-[#e5b742]/30 border border-amber-300 flex items-center justify-center text-[#3b2405] shrink-0 shadow-xs">
                <Calculator className="w-5 h-5" />
              </div>
              <div className="border-l-4 border-amber-500 pl-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-[#261502] tracking-tight">
                    Demonstração do Resultado do Exercício
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-mono border-amber-300 text-[#3b2405] bg-amber-50 px-2 py-0.5 inline-flex items-center gap-1.5 font-semibold shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b87c14] animate-pulse" />
                    Sincronizado globalmente
                  </Badge>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-[#3b2405] border border-amber-300 uppercase">
                    LC 123/2006
                  </span>
                </div>
                <p className="text-xs text-[#5c3e06] font-mono mt-0.5">
                  Parâmetros de faturamento, RBT12, Fator R e repartição de tributos da guia DAS.
                </p>
              </div>
            </div>
          </div>

          {/* Faixa de Destaque Ouro: Conectado às calculadoras */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/90 via-amber-100/40 to-amber-50/90 border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-[#261502] font-semibold">
              <LinkIcon className="w-4 h-4 text-[#b87c14]" />
              <span>
                Conectado às calculadoras — valores e quantidades importados automaticamente
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[#3b2405]">
              <div>
                Quantidade:{' '}
                <strong className="text-[#261502]">
                  {qty} un. ({quantitySourceLabel})
                </strong>
              </div>
              <div>
                Receita Consolidada:{' '}
                <strong className="text-[#261502]">{formatBRL(activeGrossRevenue)}</strong>
              </div>
              <div>
                CMV Consolidado:{' '}
                <strong className="text-[#261502]">{formatBRL(consolidatedCMV)}</strong>
              </div>
            </div>
          </div>

          {/* SELETOR DE ANEXO DO SIMPLES NACIONAL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-l-4 border-amber-500 pl-2.5">
              <label className="text-xs font-bold text-[#261502] uppercase font-mono">
                Selecione o Anexo do Simples Nacional (LC 123/2006)
              </label>
              <span className="text-[11px] text-[#5c3e06] font-mono font-semibold">
                5 anexos oficiais disponíveis
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(Object.keys(SIMPLES_ANEXOS) as SimplesAnexoId[]).map((key) => {
                const anexo = SIMPLES_ANEXOS[key]
                const isSelected = currentAnexoId === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSimplesAnexo(key)}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-600 text-[#261502] shadow-xs'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-amber-300 hover:bg-amber-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono uppercase text-[#261502]">
                        {anexo.nome}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#b87c14] shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug font-mono">
                      {anexo.descricao}
                    </p>
                    {anexo.sujeitoFatorR && (
                      <span className="inline-block mt-1.5 text-[10px] font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-300 px-1.5 py-0.5 rounded">
                        Fator R aplicável
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* SEÇÃO FATOR R AUTOMÁTICO (PARA SERVIÇOS) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#b87c14]" />
                <span className="text-xs font-mono font-bold uppercase text-[#261502]">
                  Fator R automático (Serviços: Anexo III × Anexo V)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                Fator R = Folha 12m ÷ RBT12 (Corte legal: 28,00%)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campo RBT12 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    RBT12 (Receita Bruta 12 meses)
                  </label>
                  {simplesIsInicioAtividade && (
                    <span className="text-[10px] text-[#5c3e06] font-mono font-semibold">
                      · automático
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                    R$
                  </span>
                  <Input
                    type="text"
                    placeholder="0,00"
                    disabled={simplesIsInicioAtividade}
                    onFocus={() => setIsRbt12Focused(true)}
                    value={
                      simplesIsInicioAtividade
                        ? effectiveSimplesRbt12 > 0
                          ? formatNumberBR(effectiveSimplesRbt12)
                          : '0,00'
                        : rbt12Input
                    }
                    onChange={(e) => {
                      if (!simplesIsInicioAtividade) {
                        const val = e.target.value
                        setRbt12Input(val)
                        setSimplesRbt12(parseBRNumber(val))
                      }
                    }}
                    onBlur={(e) => {
                      setIsRbt12Focused(false)
                      if (!simplesIsInicioAtividade) {
                        handleRbt12Blur(e)
                      }
                    }}
                    className={`pl-9 font-mono text-xs ${
                      simplesIsInicioAtividade
                        ? 'bg-slate-100 border-slate-300 text-slate-700 font-bold cursor-not-allowed'
                        : 'bg-white border-slate-300 text-slate-900 font-bold focus:border-amber-500'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {simplesIsInicioAtividade
                    ? 'Calculada proporcionalmente (art. 3º, § 9º)'
                    : 'Base acumulada dos últimos 12 meses'}
                </span>
              </div>

              {/* Campo Folha de Pagamento 12m */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Folha de Salários 12 meses (FS12)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                    R$
                  </span>
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={payrollInput}
                    onFocus={() => setIsPayrollFocused(true)}
                    onChange={(e) => {
                      const val = e.target.value
                      setPayrollInput(val)
                      setSimplesPayroll12m(parseBRNumber(val))
                    }}
                    onBlur={(e) => {
                      setIsPayrollFocused(false)
                      handlePayrollBlur(e)
                    }}
                    className="pl-9 font-mono text-xs bg-white border-slate-300 text-slate-900 font-bold focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Salários + pró-labore + encargos
                </span>
              </div>

              {/* Fator R Calculado */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Fator R calculado</label>
                <div
                  className={`h-9 px-3 rounded-lg border flex items-center justify-between font-mono text-xs font-bold shadow-xs ${
                    fatorRResult.isElegibleAnexo3
                      ? 'bg-amber-50 border-amber-300 text-[#3b2405]'
                      : 'bg-amber-100/70 border-amber-400 text-amber-950'
                  }`}
                >
                  <span>Fator R:</span>
                  <span className="text-sm font-black">
                    {fatorRResult.fatorRPercent.toFixed(2)}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono font-semibold">
                  {fatorRResult.isElegibleAnexo3 ? '≥ 28% → Anexo III' : '< 28% → Anexo V'}
                </span>
              </div>
            </div>

            {/* TOGGLE E FORMULÁRIO DE INÍCIO DE ATIVIDADE (LC 123/2006, art. 3º, § 9º) */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={simplesIsInicioAtividade}
                    onChange={(e) => setSimplesIsInicioAtividade(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 bg-white text-[#b87c14] focus:ring-amber-500/40 cursor-pointer accent-amber-600"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-[#261502]">
                      Empresa em início de atividade
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-[#3b2405] border border-amber-300 font-semibold">
                      LC 123/2006, art. 3º, § 9º
                    </span>
                  </div>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {simplesIsInicioAtividade
                    ? 'RBT12 calculada pela proporcionalidade mensal'
                    : 'Ative se a empresa tiver menos de 13 meses de atividade'}
                </span>
              </div>

              {simplesIsInicioAtividade && (
                <div className="p-4 rounded-2xl bg-white border border-amber-300 space-y-3.5 shadow-xs animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div className="border-l-4 border-amber-500 pl-2">
                      <span className="text-xs font-mono font-bold uppercase text-[#261502] block">
                        Receita Bruta dos Meses Decorridos
                      </span>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Informe o faturamento de cada mês de operação para gerar a RBT12
                        proporcional oficial.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      {activeGrossRevenue > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleApplyMarkupRevenueToCurrentMonth}
                          title={`Preencher Mês ${simplesMonthlyRevenues.length} com ${formatBRL(activeGrossRevenue)} apurado no Markup`}
                          className="h-8 text-xs bg-amber-50 border-amber-300 hover:bg-amber-100 text-[#3b2405] font-bold cursor-pointer shadow-xs"
                        >
                          <LinkIcon className="w-3.5 h-3.5 mr-1 text-[#b87c14]" />
                          Usar receita simulada do Markup ({formatBRL(activeGrossRevenue)})
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSimplesMonthlyRevenue(0)}
                        className="h-8 text-xs bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-white border-slate-700 hover:bg-slate-800 font-semibold cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 text-white" />+ Adicionar mês
                      </Button>
                    </div>
                  </div>

                  {/* Lista de meses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {simplesMonthlyRevenues.map((rev, index) => {
                      const isFilledFromMarkup =
                        Boolean(markupFilledMonths[index]) &&
                        Math.abs(rev - activeGrossRevenue) < 0.01 &&
                        activeGrossRevenue > 0

                      return (
                        <div
                          key={`rev-month-${index}`}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-700 w-16 shrink-0">
                              Mês {index + 1}:
                            </span>
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                                R$
                              </span>
                              <Input
                                type="text"
                                defaultValue={rev > 0 ? formatNumberBR(rev) : ''}
                                key={`month-val-${index}-${rev}`}
                                placeholder="0,00"
                                onBlur={(e) => {
                                  const parsed = parseBRNumber(e.target.value)
                                  updateSimplesMonthlyRevenue(index, parsed)
                                  if (Math.abs(parsed - activeGrossRevenue) > 0.01) {
                                    setMarkupFilledMonths((prev) => {
                                      const next = { ...prev }
                                      delete next[index]
                                      return next
                                    })
                                  }
                                }}
                                className="pl-8 text-right font-mono text-xs h-8 bg-white border-slate-300 text-slate-900 font-bold focus:border-amber-500"
                              />
                            </div>
                            {simplesMonthlyRevenues.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  removeSimplesMonthlyRevenue(index)
                                  setMarkupFilledMonths((prev) => {
                                    const next = { ...prev }
                                    delete next[index]
                                    return next
                                  })
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remover mês"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {isFilledFromMarkup && (
                            <div className="flex items-center gap-1.5 pl-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-[#3b2405] border border-amber-300">
                                <LinkIcon className="w-2.5 h-2.5" />
                                via Markup (simulação)
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Detalhamento transparente do cálculo proporcional */}
                  <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-300 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#b87c14]" />
                        <span className="font-bold text-[#261502]">
                          Cálculo Transparente da RBT12 Proporcional:
                        </span>
                      </div>
                      <span className="text-[11px] text-[#5c3e06] font-bold">
                        · automático em tempo real
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-amber-300/60">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Receita Acumulada</span>
                        <span className="text-slate-900 font-bold">
                          {formatBRL(inicioAtividadeCalc.totalRevenue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Meses de Atividade</span>
                        <span className="text-slate-900 font-bold">
                          {inicioAtividadeCalc.monthsCount}{' '}
                          {inicioAtividadeCalc.monthsCount === 1 ? 'mês' : 'meses'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5c3e06] block font-semibold">
                          RBT12 Proporcional Calculada
                        </span>
                        <span className="text-[#261502] font-black text-sm">
                          {formatBRL(inicioAtividadeCalc.calculatedRbt12)}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between flex-wrap gap-2 shadow-xs">
                      <span>
                        <strong className="text-slate-900">Fórmula aplicada:</strong>{' '}
                        {inicioAtividadeCalc.formulaExplanation}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {inicioAtividadeCalc.monthsCount === 1
                          ? '1º mês: Receita × 12'
                          : 'Meses seguintes: (Média mensal) × 12'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso visual de enquadramento do Fator R */}
            <div
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono ${
                fatorRResult.isElegibleAnexo3
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-medium">{fatorRResult.explanation}</span>
              </div>

              {/* Botão de Enquadrar automaticamente */}
              {currentAnexoId !== fatorRResult.recommendedAnexo && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={applyFatorRRecommendation}
                  className="h-8 text-xs bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-white border-slate-700 hover:bg-slate-800 font-semibold cursor-pointer shrink-0 shadow-xs"
                >
                  Enquadrar no{' '}
                  {fatorRResult.recommendedAnexo === 'anexo_3' ? 'Anexo III' : 'Anexo V'}
                </Button>
              )}
            </div>
          </div>

          {/* ALERTA DE SUBLIMITE SE RBT12 > R$ 3.600.000 */}
          {pgdas.isSublimiteExceeded && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-xs font-mono text-amber-900 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-900 block uppercase">
                  Sublimite de faturamento estadual/municipal atingido!
                </span>
                <p className="leading-relaxed text-slate-700">{pgdas.sublimiteWarning}</p>
                <p className="text-[11px] text-amber-800">
                  Na 6ª faixa do Simples Nacional, o tributo municipal/estadual é recolhido em guia
                  própria fora do DAS, mantendo-se no Simples Nacional apenas a unificação dos
                  tributos federais.
                </p>
              </div>
            </div>
          )}

          {/* QUADRO DO PGDAS: Alíquota Nominal, Dedução e Alíquota Efetiva */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-900">
                Fórmula oficial do PGDAS — {currentAnexoConfig.nome} ({pgdas.faixaNome})
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Alíq. Efetiva = (RBT12 × Alíq. Nominal − Parcela a Deduzir) ÷ RBT12
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block mb-0.5">Faixa do RBT12</span>
                <span className="text-slate-900 font-bold">{pgdas.faixaNome}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block mb-0.5">Alíquota nominal</span>
                <span className="text-slate-900 font-bold">
                  {formatNumberBR(pgdas.aliquotaNominal)}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block mb-0.5">
                  Parcela a deduzir (PD)
                </span>
                <span className="text-slate-900 font-bold">{formatBRL(pgdas.parcelaDeduzir)}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 shadow-xs">
                <span className="text-[10px] text-[#5c3e06] block mb-0.5 font-semibold">
                  Alíquota efetiva PGDAS
                </span>
                <span className="text-base font-black text-[#261502]">
                  {formatNumberBR(pgdas.aliquotaEfetiva, 4)}%
                </span>
              </div>
            </div>

            {/* Repartição da Alíquota Efetiva pelos tributos federais, estaduais e municipais */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-700 font-bold uppercase">
                  Partilha da alíquota efetiva entre tributos (
                  {formatNumberBR(pgdas.aliquotaEfetiva, 2)}% total)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Tabela CGSN 140/2018</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block">IRPJ</span>
                  <span className="text-slate-900 font-bold">
                    {formatNumberBR(pgdas.reparticao.irpjRate, 2)}%
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block">CSLL</span>
                  <span className="text-slate-900 font-bold">
                    {formatNumberBR(pgdas.reparticao.csllRate, 2)}%
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block">COFINS</span>
                  <span className="text-slate-900 font-bold">
                    {formatNumberBR(pgdas.reparticao.cofinsRate, 2)}%
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block">PIS</span>
                  <span className="text-slate-900 font-bold">
                    {formatNumberBR(pgdas.reparticao.pisRate, 2)}%
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block">CPP</span>
                  <span className="text-slate-900 font-bold">
                    {formatNumberBR(pgdas.reparticao.cppRate, 2)}%
                  </span>
                </div>
                {pgdas.reparticao.ipiRate > 0 && (
                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
                    <span className="text-[10px] text-slate-500 block">IPI</span>
                    <span className="text-slate-900 font-bold">
                      {formatNumberBR(pgdas.reparticao.ipiRate, 2)}%
                    </span>
                  </div>
                )}
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block">
                    {currentAnexoConfig.tributoEstadualMunicipal === 'iss' ? 'ISS' : 'ICMS'}
                  </span>
                  <span className="text-slate-900 font-bold">
                    {formatNumberBR(
                      currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                        ? pgdas.reparticao.issRate
                        : pgdas.reparticao.icmsRate,
                      2,
                    )}
                    %
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-center shadow-xs">
                  <span className="text-[10px] text-[#5c3e06] block font-semibold">Total DAS</span>
                  <span className="text-[#261502] font-black">
                    {formatNumberBR(pgdas.aliquotaEfetiva, 2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quadro Informativo de 4 Grandezas: Receita (Unitária / Consolidada) e CMV (Unitário / Consolidado) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-l-4 border-amber-500 pl-2.5">
              <span className="text-xs font-mono font-bold uppercase text-[#261502]">
                Resumo Operacional — Receita e CMV (Unitário vs. Consolidado)
              </span>
              <span className="text-[11px] text-[#5c3e06] font-mono font-semibold">
                · automático (via Markup e Compras · {qty} un.)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Receita Bruta Unitária */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Receita bruta unitária</label>
                  <span className="text-[10px] text-[#5c3e06] font-mono font-semibold">
                    · unitário (Markup)
                  </span>
                </div>
                <div className="h-11 px-3.5 rounded-xl bg-white border border-slate-300 flex items-center justify-between font-mono text-sm text-slate-900 shadow-xs">
                  <span className="text-slate-400 text-xs font-semibold">R$</span>
                  <span className="font-bold text-slate-900 text-base">
                    {isMultiProduct ? '—' : formatNumberBR(unitGrossRevenue)}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-500 px-1">
                  {isMultiProduct
                    ? 'Multi-itens (sem preço médio global)'
                    : 'Preço unitário de venda apurado'}
                </p>
              </div>

              {/* 2. Receita Bruta Consolidada */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Receita bruta consolidada
                  </label>
                  <span className="text-[10px] text-[#5c3e06] font-mono font-semibold">
                    · consolidado ({qty} un.)
                  </span>
                </div>
                <div className="h-11 px-3.5 rounded-xl bg-white border border-slate-300 flex items-center justify-between font-mono text-sm text-slate-900 shadow-xs">
                  <span className="text-slate-400 text-xs font-semibold">R$</span>
                  <span className="font-black text-slate-900 text-base">
                    {formatNumberBR(activeGrossRevenue)}
                  </span>
                </div>
                <p
                  className="text-[10px] font-mono text-slate-500 px-1 truncate"
                  title={
                    isMultiProduct
                      ? 'Soma consolidada do faturamento dos itens'
                      : `${formatBRL(unitGrossRevenue)} × ${qty} un.`
                  }
                >
                  {isMultiProduct
                    ? 'Soma consolidada dos itens'
                    : `${formatBRL(unitGrossRevenue)} × ${qty} un.`}
                </p>
              </div>

              {/* 3. CMV Unitário */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">CMV unitário</label>
                  <span className="text-[10px] text-[#5c3e06] font-mono font-semibold">
                    · unitário (Compras)
                  </span>
                </div>
                <div className="h-11 px-3.5 rounded-xl bg-white border border-slate-300 flex items-center justify-between font-mono text-sm text-slate-900 shadow-xs">
                  <span className="text-slate-400 text-xs font-semibold">R$</span>
                  <span className="font-bold text-slate-900 text-base">
                    {unitCMV !== null ? formatNumberBR(unitCMV) : '—'}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-500 px-1">
                  {isMultiProduct
                    ? 'Multi-itens (sem média global)'
                    : 'Custo líquido unitário apurado'}
                </p>
              </div>

              {/* 4. CMV Consolidado */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">CMV consolidado</label>
                  <span className="text-[10px] text-[#5c3e06] font-mono font-semibold">
                    · consolidado ({effectiveSoldQtyForCmv} un.)
                  </span>
                </div>
                <div className="h-11 px-3.5 rounded-xl bg-white border border-slate-300 flex items-center justify-between font-mono text-sm text-slate-900 shadow-xs">
                  <span className="text-slate-400 text-xs font-semibold">R$</span>
                  <span className="font-black text-slate-900 text-base">
                    {formatNumberBR(consolidatedCMV)}
                  </span>
                </div>
                <p
                  className="text-[10px] font-mono text-slate-500 px-1 truncate"
                  title={
                    unitCMV !== null
                      ? `${formatBRL(unitCMV)} × ${effectiveSoldQtyForCmv} un.`
                      : 'Soma do resultado individual por item'
                  }
                >
                  {unitCMV !== null
                    ? `${formatBRL(unitCMV)} × ${effectiveSoldQtyForCmv} un.`
                    : 'Soma do resultado individual por item'}
                </p>
              </div>
            </div>
          </div>

          {/* Faixa Informativa: Quantidade Vendida Automática (linkada diretamente ao Markup/Compras) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-[#261502] flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#b87c14]" />
                Quantidade vendida integrada à DRE — definida automaticamente via Markup e Compras
              </span>
              <p className="text-[11px] font-mono text-[#5c3e06]">
                A coluna "Total ({qty} un.)" e as linhas de resultado acompanham diretamente os
                produtos calculados, sem necessidade de digitação manual.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 px-4 rounded-xl bg-white border border-amber-300 flex items-center gap-2 font-mono text-sm text-slate-900 shrink-0 shadow-xs">
                <span className="text-slate-500 text-xs">Qtd:</span>
                <span className="font-bold text-slate-900 text-base">{qty}</span>
                <span className="text-xs text-slate-500">un.</span>
                <span className="text-[10px] text-[#3b2405] bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-semibold ml-1">
                  · {quantitySourceLabel}
                </span>
              </div>

              {!isSimplesSimulated && (
                <button
                  type="button"
                  onClick={simulateSimples}
                  className="group/btn relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] font-black text-xs sm:text-sm uppercase tracking-wide cursor-pointer shadow-md shadow-amber-950/25 hover:shadow-xl hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 shrink-0"
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-45 group-hover/btn:opacity-70 mix-blend-overlay transition-opacity duration-300"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
                    }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90" />
                  <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/btn:translate-x-[130%] transition-transform duration-700 ease-out" />
                  <Calculator className="relative z-10 w-4 h-4 text-[#3b2405]" />
                  <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                    Simular DRE
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quadro Demonstração do Resultado — Simples Nacional (condicionado à simulação) */}
        {isSimplesSimulated ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-300">
            {/* DUAS DREs LADO A LADO: Custo + Margem e Preço Líquido Desejado */}
            <RegimeSideBySideDreTables
              regimeKey="simples"
              data={simplesDreData}
              pgdasDescription={`${currentAnexoConfig.nome} · Alíquota Efetiva ${formatPercentBR(effectiveRate)}`}
            />

            {/* Repartição da Guia Única DAS (Detalhamento dos tributos conforme PGDAS) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#261502] flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#b87c14]" />
                  Repartição da Guia Única (DAS) · {currentAnexoConfig.nome} (Alíquota Efetiva:{' '}
                  {formatPercentBR(effectiveRate)})
                </span>
                <span className="text-[11px] font-mono font-bold text-[#3b2405]">
                  Total DAS: {formatBRL(totalDasTotal)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                {pgdas.reparticao.irpjRate > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px]">
                      IRPJ ({formatPercentBR(pgdas.reparticao.irpjRate)})
                    </span>
                    <span className="text-slate-900 font-bold">{formatBRL(totalIrpj)}</span>
                  </div>
                )}
                {pgdas.reparticao.csllRate > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px]">
                      CSLL ({formatPercentBR(pgdas.reparticao.csllRate)})
                    </span>
                    <span className="text-slate-900 font-bold">{formatBRL(totalCsll)}</span>
                  </div>
                )}
                {pgdas.reparticao.cofinsRate > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px]">
                      COFINS ({formatPercentBR(pgdas.reparticao.cofinsRate)})
                    </span>
                    <span className="text-slate-900 font-bold">{formatBRL(totalCofins)}</span>
                  </div>
                )}
                {pgdas.reparticao.pisRate > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px]">
                      PIS ({formatPercentBR(pgdas.reparticao.pisRate)})
                    </span>
                    <span className="text-slate-900 font-bold">{formatBRL(totalPis)}</span>
                  </div>
                )}
                {pgdas.reparticao.cppRate > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px]">
                      CPP ({formatPercentBR(pgdas.reparticao.cppRate)})
                    </span>
                    <span className="text-slate-900 font-bold">{formatBRL(totalCpp)}</span>
                  </div>
                )}
                {pgdas.reparticao.icmsRate > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px]">
                      ICMS ({formatPercentBR(pgdas.reparticao.icmsRate)})
                    </span>
                    <span className="text-slate-900 font-bold">{formatBRL(totalIcms)}</span>
                  </div>
                )}
                {pgdas.reparticao.ipiRate > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px]">
                      IPI ({formatPercentBR(pgdas.reparticao.ipiRate)})
                    </span>
                    <span className="text-slate-900 font-bold">{formatBRL(totalIpi)}</span>
                  </div>
                )}
                {pgdas.reparticao.issRate > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px]">
                      ISS ({formatPercentBR(pgdas.reparticao.issRate)})
                    </span>
                    <span className="text-slate-900 font-bold">{formatBRL(totalIss)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de Exportação (PDF e Excel) */}
            <ExportReportButtons
              disabled={!isSimplesSimulated}
              onExportPdf={() => {
                exportDreToPdf({
                  title: 'DRE — Simples Nacional (PGDAS)',
                  regimeName: `Simples Nacional (${currentAnexoConfig.nome})`,
                  quantity: qty,
                  unitGrossRevenue: isMultiProduct ? 0 : unitGross,
                  totalGrossRevenue: totalGross,
                  metadata: [
                    { label: 'Anexo', value: currentAnexoConfig.nome },
                    { label: 'Faixa PGDAS', value: pgdas.faixaNome },
                    {
                      label: simplesIsInicioAtividade ? 'RBT12 (Início de Atividade)' : 'RBT12',
                      value: formatBRL(effectiveSimplesRbt12),
                    },
                    {
                      label: 'Alíquota Efetiva',
                      value: `${formatNumberBR(pgdas.aliquotaEfetiva, 2)}%`,
                    },
                    ...(currentAnexoConfig.sujeitoFatorR
                      ? [{ label: 'Fator R', value: `${fatorRResult.fatorRPercent.toFixed(2)}%` }]
                      : []),
                    ...(stSubsystem.enabled
                      ? [{ label: 'Substituição Tributária', value: 'ATIVO (Segregação ST)' }]
                      : []),
                    ...(interstateSubsystem.enabled
                      ? [
                          {
                            label: 'Operação Interestadual',
                            value: `${interstateSubsystem.originUf} -> ${interstateSubsystem.destinationUf}`,
                          },
                        ]
                      : []),
                  ],
                  rows: [
                    {
                      description: 'Receita bruta total',
                      unitValue: isMultiProduct ? '—' : unitGross,
                      totalValue: totalGross,
                    },
                    {
                      description: `(−) Guia única DAS (${formatNumberBR(pgdas.aliquotaEfetiva, 2)}% efetivo)`,
                      unitValue: isMultiProduct ? '—' : -unitDasTotal,
                      totalValue: -totalDasTotal,
                    },
                    {
                      description: `  · IRPJ segregado (${formatNumberBR(pgdas.reparticao.irpjRate, 2)}% da receita)`,
                      unitValue: isMultiProduct ? '—' : -unitIrpj,
                      totalValue: -totalIrpj,
                      isInformative: true,
                    },
                    {
                      description: `  · CSLL segregada (${formatNumberBR(pgdas.reparticao.csllRate, 2)}% da receita)`,
                      unitValue: isMultiProduct ? '—' : -unitCsll,
                      totalValue: -totalCsll,
                      isInformative: true,
                    },
                    {
                      description: `  · COFINS segregada (${formatNumberBR(pgdas.reparticao.cofinsRate, 2)}% da receita)`,
                      unitValue: isMultiProduct ? '—' : -unitCofins,
                      totalValue: -totalCofins,
                      isInformative: true,
                    },
                    {
                      description: `  · PIS segregado (${formatNumberBR(pgdas.reparticao.pisRate, 2)}% da receita)`,
                      unitValue: isMultiProduct ? '—' : -unitPis,
                      totalValue: -totalPis,
                      isInformative: true,
                    },
                    ...(pgdas.reparticao.cppRate > 0
                      ? [
                          {
                            description: `  · CPP patronal no DAS (${formatNumberBR(pgdas.reparticao.cppRate, 2)}% da receita)`,
                            unitValue: isMultiProduct ? '—' : -unitCpp,
                            totalValue: -totalCpp,
                            isInformative: true,
                          },
                        ]
                      : []),
                    ...(pgdas.reparticao.ipiRate > 0
                      ? [
                          {
                            description: `  · IPI no DAS (${formatNumberBR(pgdas.reparticao.ipiRate, 2)}% da receita)`,
                            unitValue: isMultiProduct ? '—' : -unitIpi,
                            totalValue: -totalIpi,
                            isInformative: true,
                          },
                        ]
                      : []),
                    {
                      description:
                        currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                          ? `  · ISS Municipal (${formatNumberBR(pgdas.reparticao.issRate, 2)}% da receita)`
                          : `  · ICMS Estadual (${formatNumberBR(pgdas.reparticao.icmsRate, 2)}% da receita)`,
                      unitValue: isMultiProduct
                        ? '—'
                        : -(currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                            ? unitIss
                            : unitIcms),
                      totalValue: -(currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                        ? totalIss
                        : totalIcms),
                      isInformative: true,
                    },
                    {
                      description: '(=) Receita líquida',
                      unitValue: isMultiProduct ? '—' : unitNetRevenue,
                      totalValue: totalNetRevenue,
                      isSubtotal: true,
                    },
                    {
                      description: '(−) CMV (custo não creditável)',
                      unitValue: isMultiProduct ? '—' : unitCmvVal !== null ? -unitCmvVal : '—',
                      totalValue: -totalCmv,
                    },
                    {
                      description: '(=) Lucro bruto',
                      unitValue: isMultiProduct
                        ? '—'
                        : unitGrossProfit !== null
                          ? unitGrossProfit
                          : '—',
                      totalValue: totalGrossProfit,
                      isSubtotal: true,
                    },
                    ...(totalOperatingExpenses > 0
                      ? [
                          {
                            description: '(−) Despesas operacionais (vendas, adm, financeiras)',
                            unitValue: isMultiProduct
                              ? '—'
                              : qty > 0
                                ? -(totalOperatingExpenses / qty)
                                : 0,
                            totalValue: -totalOperatingExpenses,
                          },
                        ]
                      : []),
                    ...(totalLocalExpenses > 0
                      ? [
                          {
                            description: '(−) Despesas operacionais locais',
                            unitValue: isMultiProduct
                              ? '—'
                              : qty > 0
                                ? -(totalLocalExpenses / qty)
                                : 0,
                            totalValue: -totalLocalExpenses,
                          },
                        ]
                      : []),
                    ...(totalAllOperatingRevenues > 0
                      ? [
                          {
                            description: '(+) Receitas operacionais (financeiras e outras)',
                            unitValue: isMultiProduct
                              ? '—'
                              : qty > 0
                                ? totalAllOperatingRevenues / qty
                                : 0,
                            totalValue: totalAllOperatingRevenues,
                          },
                        ]
                      : []),
                    {
                      description: '(=) Lucro antes do imposto de renda (LAIR)',
                      unitValue: isMultiProduct ? '—' : unitLair !== null ? unitLair : '—',
                      totalValue: totalLair,
                      isSubtotal: true,
                    },
                    {
                      description: '(=) Lucro líquido',
                      unitValue: isMultiProduct
                        ? '—'
                        : unitNetProfit !== null
                          ? unitNetProfit
                          : '—',
                      totalValue: totalNetProfit,
                      isTotal: true,
                    },
                  ],
                  summaryCards: [
                    {
                      title: 'Carga tributária total (DAS)',
                      value: formatBRL(totalTaxBurden),
                      numericValue: totalTaxBurden,
                      subtitle: `${formatNumberBR(pgdas.aliquotaEfetiva, 2)}% da receita bruta`,
                    },
                    {
                      title: 'Lucro líquido',
                      value: formatBRL(totalNetProfit),
                      numericValue: totalNetProfit,
                      subtitle: 'Resultado final do período',
                    },
                    {
                      title: 'Margem líquida',
                      value: formatPercentBR(netMargin),
                      numericValue: netMargin,
                      subtitle: 'Lucro líquido ÷ Receita bruta',
                    },
                  ],
                  notes: [
                    'Guia única DAS calculada com base na fórmula legal PGDAS: [(RBT12 × Alíquota Nominal) − Parcela a Deduzir] ÷ RBT12.',
                    'Partilha percentual dos tributos federais, estaduais e municipais em conformidade com as tabelas anexas da LC 123/2006.',
                    currentAnexoConfig.sujeitoFatorR
                      ? `Atividade sujeita ao Fator R (${fatorRResult.fatorRPercent.toFixed(2)}%). Enquadramento: ${
                          fatorRResult.isElegibleAnexo3 ? 'Anexo III (≥ 28%)' : 'Anexo V (< 28%)'
                        }.`
                      : 'CPP (Contribuição Previdenciária Patronal) unificada na guia DAS para os Anexos I, II, III e V.',
                    pgdas.isSublimiteExceeded
                      ? 'Atenção: Sublimite de R$ 3.600.000,00 excedido. O recolhimento de ICMS/ISS deve ocorrer fora da guia DAS.'
                      : 'Faturamento acumulado compatível com o sublimite estadual/municipal do Simples Nacional.',
                  ].filter(Boolean),
                })
              }}
              onExportExcel={() => {
                exportDreToExcel({
                  title: 'DRE — Simples Nacional (PGDAS)',
                  regimeName: `Simples Nacional (${currentAnexoConfig.nome})`,
                  quantity: qty,
                  unitGrossRevenue: isMultiProduct ? 0 : unitGross,
                  totalGrossRevenue: totalGross,
                  metadata: [
                    { label: 'Anexo', value: currentAnexoConfig.nome },
                    { label: 'Faixa PGDAS', value: pgdas.faixaNome },
                    {
                      label: simplesIsInicioAtividade ? 'RBT12 (Início de Atividade)' : 'RBT12',
                      value: formatBRL(effectiveSimplesRbt12),
                    },
                    {
                      label: 'Alíquota Efetiva',
                      value: `${formatNumberBR(pgdas.aliquotaEfetiva, 2)}%`,
                    },
                    ...(currentAnexoConfig.sujeitoFatorR
                      ? [{ label: 'Fator R', value: `${fatorRResult.fatorRPercent.toFixed(2)}%` }]
                      : []),
                    ...(stSubsystem.enabled
                      ? [{ label: 'Substituição Tributária', value: 'ATIVO (Segregação ST)' }]
                      : []),
                    ...(interstateSubsystem.enabled
                      ? [
                          {
                            label: 'Operação Interestadual',
                            value: `${interstateSubsystem.originUf} -> ${interstateSubsystem.destinationUf}`,
                          },
                        ]
                      : []),
                  ],
                  rows: [
                    {
                      description: 'Receita bruta total',
                      unitValue: isMultiProduct ? '—' : unitGross,
                      totalValue: totalGross,
                    },
                    {
                      description: `(−) Guia única DAS (${formatNumberBR(pgdas.aliquotaEfetiva, 2)}% efetivo)`,
                      unitValue: isMultiProduct ? '—' : -unitDasTotal,
                      totalValue: -totalDasTotal,
                    },
                    {
                      description: `  · IRPJ segregado (${formatNumberBR(pgdas.reparticao.irpjRate, 2)}% da receita)`,
                      unitValue: isMultiProduct ? '—' : -unitIrpj,
                      totalValue: -totalIrpj,
                    },
                    {
                      description: `  · CSLL segregada (${formatNumberBR(pgdas.reparticao.csllRate, 2)}% da receita)`,
                      unitValue: isMultiProduct ? '—' : -unitCsll,
                      totalValue: -totalCsll,
                    },
                    {
                      description: `  · COFINS segregada (${formatNumberBR(pgdas.reparticao.cofinsRate, 2)}% da receita)`,
                      unitValue: isMultiProduct ? '—' : -unitCofins,
                      totalValue: -totalCofins,
                    },
                    {
                      description: `  · PIS segregado (${formatNumberBR(pgdas.reparticao.pisRate, 2)}% da receita)`,
                      unitValue: isMultiProduct ? '—' : -unitPis,
                      totalValue: -totalPis,
                    },
                    ...(pgdas.reparticao.cppRate > 0
                      ? [
                          {
                            description: `  · CPP patronal no DAS (${formatNumberBR(pgdas.reparticao.cppRate, 2)}% da receita)`,
                            unitValue: isMultiProduct ? '—' : -unitCpp,
                            totalValue: -totalCpp,
                          },
                        ]
                      : []),
                    ...(pgdas.reparticao.ipiRate > 0
                      ? [
                          {
                            description: `  · IPI no DAS (${formatNumberBR(pgdas.reparticao.ipiRate, 2)}% da receita)`,
                            unitValue: isMultiProduct ? '—' : -unitIpi,
                            totalValue: -totalIpi,
                          },
                        ]
                      : []),
                    {
                      description:
                        currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                          ? `  · ISS Municipal (${formatNumberBR(pgdas.reparticao.issRate, 2)}% da receita)`
                          : `  · ICMS Estadual (${formatNumberBR(pgdas.reparticao.icmsRate, 2)}% da receita)`,
                      unitValue: isMultiProduct
                        ? '—'
                        : -(currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                            ? unitIss
                            : unitIcms),
                      totalValue: -(currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                        ? totalIss
                        : totalIcms),
                    },
                    {
                      description: '(=) Receita líquida',
                      unitValue: isMultiProduct ? '—' : unitNetRevenue,
                      totalValue: totalNetRevenue,
                    },
                    {
                      description: '(−) CMV (custo não creditável)',
                      unitValue: isMultiProduct ? '—' : unitCmvVal !== null ? -unitCmvVal : '—',
                      totalValue: -totalCmv,
                    },
                    {
                      description: '(=) Lucro bruto',
                      unitValue: isMultiProduct
                        ? '—'
                        : unitGrossProfit !== null
                          ? unitGrossProfit
                          : '—',
                      totalValue: totalGrossProfit,
                    },
                    ...(totalOperatingExpenses > 0
                      ? [
                          {
                            description: '(−) Despesas operacionais (vendas, adm, financeiras)',
                            unitValue: isMultiProduct
                              ? '—'
                              : qty > 0
                                ? -(totalOperatingExpenses / qty)
                                : 0,
                            totalValue: -totalOperatingExpenses,
                          },
                        ]
                      : []),
                    ...(totalLocalExpenses > 0
                      ? [
                          {
                            description: '(−) Despesas operacionais locais',
                            unitValue: isMultiProduct
                              ? '—'
                              : qty > 0
                                ? -(totalLocalExpenses / qty)
                                : 0,
                            totalValue: -totalLocalExpenses,
                          },
                        ]
                      : []),
                    ...(totalAllOperatingRevenues > 0
                      ? [
                          {
                            description: '(+) Receitas operacionais (financeiras e outras)',
                            unitValue: isMultiProduct
                              ? '—'
                              : qty > 0
                                ? totalAllOperatingRevenues / qty
                                : 0,
                            totalValue: totalAllOperatingRevenues,
                          },
                        ]
                      : []),
                    {
                      description: '(=) Lucro antes do imposto de renda (LAIR)',
                      unitValue: isMultiProduct ? '—' : unitLair !== null ? unitLair : '—',
                      totalValue: totalLair,
                    },
                    {
                      description: '(=) Lucro líquido',
                      unitValue: isMultiProduct
                        ? '—'
                        : unitNetProfit !== null
                          ? unitNetProfit
                          : '—',
                      totalValue: totalNetProfit,
                    },
                  ],
                  summaryCards: [
                    {
                      title: 'Carga tributária total (DAS)',
                      value: formatBRL(totalTaxBurden),
                      numericValue: totalTaxBurden,
                      subtitle: `${formatNumberBR(pgdas.aliquotaEfetiva, 2)}% da receita bruta`,
                    },
                    {
                      title: 'Lucro líquido',
                      value: formatBRL(totalNetProfit),
                      numericValue: totalNetProfit,
                      subtitle: 'Resultado final do período',
                    },
                    {
                      title: 'Margem líquida (%)',
                      value: formatPercentBR(netMargin),
                      numericValue: netMargin,
                      subtitle: 'Lucro líquido ÷ Receita bruta',
                    },
                  ],
                  notes: [
                    'Guia única DAS calculada com base na fórmula legal PGDAS: [(RBT12 × Alíquota Nominal) − Parcela a Deduzir] ÷ RBT12.',
                    'Partilha percentual dos tributos federais, estaduais e municipais em conformidade com as tabelas anexas da LC 123/2006.',
                    currentAnexoConfig.sujeitoFatorR
                      ? `Atividade sujeita ao Fator R (${fatorRResult.fatorRPercent.toFixed(2)}%). Enquadramento: ${
                          fatorRResult.isElegibleAnexo3 ? 'Anexo III (≥ 28%)' : 'Anexo V (< 28%)'
                        }.`
                      : 'CPP (Contribuição Previdenciária Patronal) unificada na guia DAS para os Anexos I, II, III e V.',
                  ].filter(Boolean),
                })
              }}
            />
          </div>
        ) : (
          <div className="bg-white border border-dashed border-amber-300 rounded-3xl p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#f9e596]/40 to-[#e5b742]/30 border border-amber-300 flex items-center justify-center text-[#3b2405] mx-auto shadow-xs">
              <Calculator className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#261502] tracking-tight">
                Demonstração do Resultado pronta para simulação
              </h3>
              <p className="text-xs text-[#5c3e06] max-w-md mx-auto">
                Informe a quantidade vendida acima e clique em{' '}
                <strong className="text-[#3b2405] font-bold">"Simular DRE"</strong> para gerar os
                cálculos da DRE do Simples Nacional com a partilha oficial da guia DAS.
              </p>
            </div>
          </div>
        )}

        {/* Barra de Gerenciamento de Cenários no fim da página (padrão Markup) */}
        <div className="pt-2">
          <ScenarioManagerBar />
        </div>

        {/* Rodapé com par de botões de navegação sequencial */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            onClick={() => navigate('/demo/markup')}
            className="bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-white border border-slate-700 hover:bg-slate-800 font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Calculadora Markup</span>
          </Button>

          <button
            type="button"
            onClick={() => navigate('/demo/dashboard')}
            className="group/btn relative overflow-hidden inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] font-black text-xs sm:text-sm uppercase tracking-wide cursor-pointer shadow-md shadow-amber-950/25 hover:shadow-xl hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-45 group-hover/btn:opacity-70 mix-blend-overlay transition-opacity duration-300"
              style={{
                background:
                  'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90" />
            <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/btn:translate-x-[130%] transition-transform duration-700 ease-out" />
            <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
              Ver Dashboard
            </span>
            <ArrowRight className="relative z-10 w-4 h-4 text-[#3b2405]" />
          </button>
        </div>
      </div>
    </DemoLayout>
  )
}
