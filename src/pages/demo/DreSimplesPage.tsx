import React, { useState, useMemo } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { useTaxContext } from '@/contexts/TaxContext'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  Link as LinkIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Info,
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
import { RegimeThresholdsAlerts } from '@/components/demo/RegimeThresholdsAlerts'
import { exportDreToPdf, exportDreToExcel } from '@/lib/exportReports'
import { CmvDetailedBreakdown } from '@/components/demo/CmvDetailedBreakdown'
import { PageHero } from '@/components/demo/PageHero'
import { Badge } from '@/components/ui/badge'

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

  // RECEITA BRUTA:
  // 1. Receita bruta UNITÁRIA (preço de venda unitário por unidade, SEMPRE valor por unidade)
  const unitGrossRevenue =
    Math.round(
      (totalConsolidatedQuantity > 0 && totalConsolidatedRevenue > 0
        ? totalConsolidatedRevenue / totalConsolidatedQuantity
        : simulatedSalePrice || 0) * 100,
    ) / 100

  // 2. Receita bruta CONSOLIDADA (total consolidado dos produtos do Markup ou unitário × quantidade)
  const hasConsolidated = totalConsolidatedRevenue > 0
  const activeGrossRevenue =
    hasConsolidated && (qty === totalConsolidatedQuantity || qty === 0)
      ? totalConsolidatedRevenue
      : Math.round(unitGrossRevenue * (qty > 0 ? qty : 1) * 100) / 100

  // CMV via Compras (Simples Nacional: sem recuperação de tributos):
  // IDENTIDADE ESTRITA:
  // - CMV unitário = SEMPRE o custo unitário líquido do regime apurado via Compras com 2 casas decimais.
  const isAutoInventory = calculatedPurchases.autoInventoryDeductionActive
  const rawUnitSimples =
    calculatedPurchases.unitCostSimplesEffective > 0
      ? calculatedPurchases.unitCostSimplesEffective
      : (totalPurchasesQuantity || 0) > 0
        ? (calculatedPurchases.cmvSimples || 0) / totalPurchasesQuantity
        : calculatedPurchases.cmvSimples || 0
  const unitCMV = Math.round(rawUnitSimples * 100) / 100

  // 4. CMV CONSOLIDADO:
  // Regra de ouro: total = round(unitário arredondado × quantidade efetiva) centavo a centavo
  const effectiveSoldQtyForCmv = isAutoInventory
    ? Math.min(qty, calculatedPurchases.totalAvailableUnits)
    : qty
  const consolidatedCMV =
    unitCMV > 0
      ? Math.round(unitCMV * effectiveSoldQtyForCmv * 100) / 100
      : totalConsolidatedCost > 0
        ? totalConsolidatedCost
        : 0

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
  const unitGrossProfit = Math.round((unitNetRevenue - unitCmvVal) * 100) / 100

  // Despesas operacionais totais e unitárias
  const totalExpenses = simplesExpenses.reduce((acc, exp) => acc + (exp.value || 0), 0)
  const unitExpenses = qty > 0 ? Math.round((totalExpenses / qty) * 100) / 100 : 0

  // Lucro Líquido unitário
  const unitNetProfit = Math.round((unitGrossProfit - unitExpenses) * 100) / 100

  // CÁLCULOS TOTAIS DA DRE (Regra de ouro: total = round(unitário arredondado × quantidade), batendo centavo a centavo)
  const totalGross =
    hasConsolidated &&
    (qty === totalConsolidatedQuantity || (qty === 1 && totalConsolidatedQuantity <= 1))
      ? totalConsolidatedRevenue
      : Math.round(unitGross * (qty > 0 ? qty : 0) * 100) / 100

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
  const totalNetProfit = Math.round((totalGrossProfit - totalExpenses) * 100) / 100

  // Cards de Resumo
  const totalTaxBurden = totalGross > 0 ? totalDasTotal : 0
  const netMargin = totalGross > 0 ? (totalNetProfit / totalGross) * 100 : 0

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
        <div className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Demonstração do Resultado do Exercício
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 inline-flex items-center gap-1.5 font-normal shadow-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sincronizado globalmente
                  </Badge>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                    LC 123/2006
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Parâmetros de faturamento, RBT12, Fator R e repartição de tributos da guia DAS.
                </p>
              </div>
            </div>
          </div>

          {/* Faixa Verde: Conectado às calculadoras */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <LinkIcon className="w-4 h-4" />
              <span>
                Conectado às calculadoras — valores e quantidades importados automaticamente
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <div>
                Quantidade:{' '}
                <strong className="text-emerald-400">
                  {qty} un. ({quantitySourceLabel})
                </strong>
              </div>
              <div>
                Receita Consolidada:{' '}
                <strong className="text-emerald-400">{formatBRL(activeGrossRevenue)}</strong>
              </div>
              <div>
                CMV Consolidado:{' '}
                <strong className="text-emerald-400">{formatBRL(consolidatedCMV)}</strong>
              </div>
            </div>
          </div>

          {/* Quadro: CMV pelo Simples Nacional */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-200">
                CMV pelo Simples Nacional
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                No Simples, tributos sobre compras não são recuperáveis — integram integralmente o
                custo.
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Estoque inicial (EI)</span>
                <span className="text-slate-200">{formatBRL(initialInventory)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">
                  (+) Acréscimos ao custo (compras + frete + IPI)
                </span>
                <span className="text-slate-200">
                  {formatBRL(calculatedPurchases.totalAdditions)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">
                  (−) Deduções (devoluções, abatimentos, descontos incondicionais)
                </span>
                <span className="text-slate-400">
                  -{formatBRL(calculatedPurchases.totalDeductionsBase)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between font-bold">
                <span className="text-slate-300">(=) Compras líquidas (CL)</span>
                <span className="text-slate-100">
                  {formatBRL(calculatedPurchases.cmvSimplesNetPurchases)}
                </span>
              </div>
              {stSubsystem.enabled && stSubsystem.purchasesStPaid > 0 && (
                <div className="py-1.5 flex justify-between text-amber-500/90">
                  <span>(+) ICMS-ST pago na compra integrado ao custo</span>
                  <span className="font-semibold">{formatBRL(stSubsystem.purchasesStPaid)}</span>
                </div>
              )}
              <div className="py-1.5 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">(−) Estoque final (EF)</span>
                  {isAutoInventory && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.2 rounded">
                      · automático (baixa por quantidade)
                    </span>
                  )}
                </div>
                <span className="text-slate-400">
                  -
                  {formatBRL(
                    isAutoInventory
                      ? calculatedPurchases.autoFinalInventorySimples
                      : finalInventory,
                  )}
                </span>
              </div>
              <div className="py-2 flex justify-between items-center text-sm font-bold bg-emerald-500/10 px-2 rounded-lg mt-1 border border-emerald-500/20">
                <span className="text-emerald-400">
                  {isAutoInventory
                    ? '(=) CMV unitário (baixa por quantidade)'
                    : '(=) CMV = EI + CL − EF'}
                </span>
                <span className="text-emerald-400">{formatBRL(unitCMV)}</span>
              </div>
            </div>
          </div>

          {/* SELETOR DE ANEXO DO SIMPLES NACIONAL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Selecione o Anexo do Simples Nacional (LC 123/2006)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
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
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-white">{anexo.nome}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">
                      {anexo.descricao}
                    </p>
                    {anexo.sujeitoFatorR && (
                      <span className="inline-block mt-1.5 text-[10px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                        Fator R aplicável
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* SEÇÃO FATOR R AUTOMÁTICO (PARA SERVIÇOS) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold uppercase text-slate-200">
                  Fator R automático (Serviços: Anexo III × Anexo V)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Fator R = Folha 12m ÷ RBT12 (Corte legal: 28,00%)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campo RBT12 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">
                    RBT12 (Receita Bruta 12 meses)
                  </label>
                  {simplesIsInicioAtividade && (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      · automático
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
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
                        ? 'bg-slate-950/80 border-slate-800 text-slate-400 font-bold cursor-not-allowed'
                        : 'field-input-interactive'
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
                <label className="text-xs font-semibold text-slate-300 block">
                  Folha de Salários 12 meses (FS12)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
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
                    className="pl-9 font-mono text-xs field-input-interactive"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Salários + pró-labore + encargos
                </span>
              </div>

              {/* Fator R Calculado */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Fator R calculado
                </label>
                <div
                  className={`h-9 px-3 rounded-md border flex items-center justify-between font-mono text-xs font-bold ${
                    fatorRResult.isElegibleAnexo3
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <span>Fator R:</span>
                  <span className="text-sm">{fatorRResult.fatorRPercent.toFixed(2)}%</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {fatorRResult.isElegibleAnexo3 ? '≥ 28% → Anexo III' : '< 28% → Anexo V'}
                </span>
              </div>
            </div>

            {/* TOGGLE E FORMULÁRIO DE INÍCIO DE ATIVIDADE (LC 123/2006, art. 3º, § 9º) */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={simplesIsInicioAtividade}
                    onChange={(e) => setSimplesIsInicioAtividade(e.target.checked)}
                    className="w-4 h-4 rounded border-orange-500/50 bg-slate-900 text-orange-500 focus:ring-orange-500/40 cursor-pointer accent-orange-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-200">
                      Empresa em início de atividade
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      LC 123/2006, art. 3º, § 9º
                    </span>
                  </div>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {simplesIsInicioAtividade
                    ? 'RBT12 calculada pela proporcionalidade mensal'
                    : 'Ative se a empresa tiver menos de 13 meses de atividade'}
                </span>
              </div>

              {simplesIsInicioAtividade && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/40 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div>
                      <span className="text-xs font-mono font-bold uppercase text-emerald-400 block">
                        Receita Bruta dos Meses Decorridos
                      </span>
                      <p className="text-[11px] text-slate-400">
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
                          className="h-7 text-xs bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 cursor-pointer"
                        >
                          <LinkIcon className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                          Usar receita simulada do Markup ({formatBRL(activeGrossRevenue)})
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSimplesMonthlyRevenue(0)}
                        className="h-7 text-xs bg-slate-950/60 border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-emerald-300 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 text-emerald-400" />+ Adicionar mês
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
                          className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-slate-300 w-16 shrink-0">
                              Mês {index + 1}:
                            </span>
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
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
                                className="pl-8 text-right font-mono text-xs h-8 field-input-interactive"
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
                                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-rose-500/10 cursor-pointer"
                                title="Remover mês"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {isFilledFromMarkup && (
                            <div className="flex items-center gap-1.5 pl-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
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
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-emerald-300">
                          Cálculo Transparente da RBT12 Proporcional:
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        · automático em tempo real
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-emerald-500/20">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Receita Acumulada</span>
                        <span className="text-slate-200 font-bold">
                          {formatBRL(inicioAtividadeCalc.totalRevenue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Meses de Atividade</span>
                        <span className="text-slate-200 font-bold">
                          {inicioAtividadeCalc.monthsCount}{' '}
                          {inicioAtividadeCalc.monthsCount === 1 ? 'mês' : 'meses'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 block font-semibold">
                          RBT12 Proporcional Calculada
                        </span>
                        <span className="text-emerald-400 font-extrabold text-sm">
                          {formatBRL(inicioAtividadeCalc.calculatedRbt12)}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-emerald-300/90 flex items-center justify-between flex-wrap gap-2">
                      <span>
                        <strong className="text-slate-200">Fórmula aplicada:</strong>{' '}
                        {inicioAtividadeCalc.formulaExplanation}
                      </span>
                      <span className="text-[10px] text-slate-400">
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
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{fatorRResult.explanation}</span>
              </div>

              {/* Botão de Enquadrar automaticamente */}
              {currentAnexoId !== fatorRResult.recommendedAnexo && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={applyFatorRRecommendation}
                  className="h-7 text-xs bg-slate-950/60 border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-emerald-300 cursor-pointer shrink-0"
                >
                  Enquadrar no{' '}
                  {fatorRResult.recommendedAnexo === 'anexo_3' ? 'Anexo III' : 'Anexo V'}
                </Button>
              )}
            </div>
          </div>

          {/* ALERTA DE SUBLIMITE SE RBT12 > R$ 3.600.000 */}
          {pgdas.isSublimiteExceeded && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-2.5 text-xs font-mono text-amber-200 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-300 block uppercase">
                  Sublimite de faturamento estadual/municipal atingido!
                </span>
                <p className="leading-relaxed">{pgdas.sublimiteWarning}</p>
                <p className="text-[11px] text-amber-300/80">
                  Na 6ª faixa do Simples Nacional, o tributo municipal/estadual é recolhido em guia
                  própria fora do DAS, mantendo-se no Simples Nacional apenas a unificação dos
                  tributos federais.
                </p>
              </div>
            </div>
          )}

          {/* QUADRO DO PGDAS: Alíquota Nominal, Dedução e Alíquota Efetiva */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold uppercase text-emerald-400">
                Fórmula oficial do PGDAS — {currentAnexoConfig.nome} ({pgdas.faixaNome})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Alíq. Efetiva = (RBT12 × Alíq. Nominal − Parcela a Deduzir) ÷ RBT12
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">Faixa do RBT12</span>
                <span className="text-slate-200 font-bold">{pgdas.faixaNome}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">Alíquota nominal</span>
                <span className="text-slate-200 font-bold">
                  {formatNumberBR(pgdas.aliquotaNominal)}%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">
                  Parcela a deduzir (PD)
                </span>
                <span className="text-slate-200 font-bold">{formatBRL(pgdas.parcelaDeduzir)}</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40">
                <span className="text-[10px] text-emerald-400 block mb-0.5 font-semibold">
                  Alíquota efetiva PGDAS
                </span>
                <span className="text-base font-extrabold text-emerald-400">
                  {formatNumberBR(pgdas.aliquotaEfetiva, 4)}%
                </span>
              </div>
            </div>

            {/* Repartição da Alíquota Efetiva pelos tributos federais, estaduais e municipais */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-300 font-semibold uppercase">
                  Partilha da alíquota efetiva entre tributos (
                  {formatNumberBR(pgdas.aliquotaEfetiva, 2)}% total)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Tabela CGSN 140/2018</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
                <div className="p-2 rounded-md bg-slate-900/50 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">IRPJ</span>
                  <span className="text-slate-200 font-semibold">
                    {formatNumberBR(pgdas.reparticao.irpjRate, 2)}%
                  </span>
                </div>
                <div className="p-2 rounded-md bg-slate-900/50 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">CSLL</span>
                  <span className="text-slate-200 font-semibold">
                    {formatNumberBR(pgdas.reparticao.csllRate, 2)}%
                  </span>
                </div>
                <div className="p-2 rounded-md bg-slate-900/50 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">COFINS</span>
                  <span className="text-slate-200 font-semibold">
                    {formatNumberBR(pgdas.reparticao.cofinsRate, 2)}%
                  </span>
                </div>
                <div className="p-2 rounded-md bg-slate-900/50 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">PIS</span>
                  <span className="text-slate-200 font-semibold">
                    {formatNumberBR(pgdas.reparticao.pisRate, 2)}%
                  </span>
                </div>
                <div className="p-2 rounded-md bg-slate-900/50 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">CPP</span>
                  <span className="text-slate-200 font-semibold">
                    {formatNumberBR(pgdas.reparticao.cppRate, 2)}%
                  </span>
                </div>
                {pgdas.reparticao.ipiRate > 0 && (
                  <div className="p-2 rounded-md bg-slate-900/50 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">IPI</span>
                    <span className="text-slate-200 font-semibold">
                      {formatNumberBR(pgdas.reparticao.ipiRate, 2)}%
                    </span>
                  </div>
                )}
                <div className="p-2 rounded-md bg-slate-900/50 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">
                    {currentAnexoConfig.tributoEstadualMunicipal === 'iss' ? 'ISS' : 'ICMS'}
                  </span>
                  <span className="text-slate-200 font-semibold">
                    {formatNumberBR(
                      currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                        ? pgdas.reparticao.issRate
                        : pgdas.reparticao.icmsRate,
                      2,
                    )}
                    %
                  </span>
                </div>
                <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <span className="text-[10px] text-emerald-400 block font-semibold">
                    Total DAS
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {formatNumberBR(pgdas.aliquotaEfetiva, 2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quadro Informativo de 4 Grandezas: Receita (Unitária / Consolidada) e CMV (Unitário / Consolidado) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-slate-200">
                Resumo Operacional — Receita e CMV (Unitário vs. Consolidado)
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                · automático (via Markup e Compras · {qty} un.)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Receita Bruta Unitária */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Receita bruta unitária
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    · unitário (Markup)
                  </span>
                </div>
                <div className="h-11 px-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/40 flex items-center justify-between font-mono text-sm text-slate-100">
                  <span className="text-slate-500 text-xs">R$</span>
                  <span className="font-bold text-emerald-400">
                    {formatNumberBR(unitGrossRevenue)}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 px-1">
                  Preço unitário de venda apurado
                </p>
              </div>

              {/* 2. Receita Bruta Consolidada */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Receita bruta consolidada
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    · consolidado ({qty} un.)
                  </span>
                </div>
                <div className="h-11 px-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/40 flex items-center justify-between font-mono text-sm text-slate-100">
                  <span className="text-slate-500 text-xs">R$</span>
                  <span className="font-bold text-emerald-400">
                    {formatNumberBR(activeGrossRevenue)}
                  </span>
                </div>
                <p
                  className="text-[10px] font-mono text-slate-400 px-1 truncate"
                  title={`${formatBRL(unitGrossRevenue)} × ${qty} un.`}
                >
                  {formatBRL(unitGrossRevenue)} × {qty} un.
                </p>
              </div>

              {/* 3. CMV Unitário */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">CMV unitário</label>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    · unitário (Compras)
                  </span>
                </div>
                <div className="h-11 px-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/40 flex items-center justify-between font-mono text-sm text-slate-100">
                  <span className="text-slate-500 text-xs">R$</span>
                  <span className="font-bold text-emerald-400">{formatNumberBR(unitCMV)}</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 px-1">
                  Custo líquido unitário apurado
                </p>
              </div>

              {/* 4. CMV Consolidado */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">CMV consolidado</label>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    · consolidado ({effectiveSoldQtyForCmv} un.)
                  </span>
                </div>
                <div className="h-11 px-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/40 flex items-center justify-between font-mono text-sm text-slate-100">
                  <span className="text-slate-500 text-xs">R$</span>
                  <span className="font-bold text-emerald-400">
                    {formatNumberBR(consolidatedCMV)}
                  </span>
                </div>
                <p
                  className="text-[10px] font-mono text-slate-400 px-1 truncate"
                  title={`${formatBRL(unitCMV)} × ${effectiveSoldQtyForCmv} un.`}
                >
                  {formatBRL(unitCMV)} × {effectiveSoldQtyForCmv} un.
                </p>
              </div>
            </div>
          </div>

          {/* Despesas Operacionais (valores totais) */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-semibold uppercase text-slate-200">
                  Despesas operacionais (valores totais)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Custos fixos e operacionais deduzidos globalmente do resultado.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSimplesExpense('Nova despesa operacional', 0)}
                className="h-7 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar despesa
              </Button>
            </div>

            <div className="space-y-2">
              {simplesExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80"
                >
                  <Input
                    type="text"
                    value={exp.description}
                    onChange={(e) => updateSimplesExpense(exp.id, 'description', e.target.value)}
                    placeholder="Descrição da despesa"
                    className="flex-1 text-xs font-mono field-input-interactive"
                  />
                  <div className="relative w-36 sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                      R$
                    </span>
                    <Input
                      type="text"
                      defaultValue={exp.value > 0 ? formatNumberBR(exp.value) : ''}
                      key={`exp-${exp.id}-${exp.value}`}
                      placeholder="0,00"
                      onBlur={(e) => {
                        const parsed = parseBRNumber(e.target.value)
                        updateSimplesExpense(exp.id, 'value', parsed)
                        e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                      }}
                      className="pl-8 text-right text-xs font-mono field-input-interactive"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSimplesExpense(exp.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Faixa Informativa: Quantidade Vendida Automática (linkada diretamente ao Markup/Compras) */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Quantidade vendida integrada à DRE — definida automaticamente via Markup e Compras
              </span>
              <p className="text-[11px] font-mono text-slate-400">
                A coluna "Total ({qty} un.)" e as linhas de resultado acompanham diretamente os
                produtos calculados, sem necessidade de digitação manual.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 px-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 flex items-center gap-2 font-mono text-sm text-slate-100 shrink-0 shadow-inner">
                <span className="text-slate-400 text-xs">Qtd:</span>
                <span className="font-bold text-emerald-400 text-base">{qty}</span>
                <span className="text-xs text-slate-400">un.</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold ml-1">
                  · {quantitySourceLabel}
                </span>
              </div>

              {!isSimplesSimulated && (
                <Button
                  type="button"
                  onClick={simulateSimples}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95 text-xs sm:text-sm shrink-0"
                >
                  <Calculator className="w-4 h-4" />
                  Simular DRE
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quadro Demonstração do Resultado — Simples Nacional (condicionado à simulação) */}
        {isSimplesSimulated ? (
          <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Demonstração do Resultado (DRE)
                </h3>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Simples Nacional
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {currentAnexoConfig.nome} · {pgdas.faixaNome}
              </span>
            </div>

            {/* Tabela da DRE com colunas Unitário e Total */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-right">
                    <th className="py-2.5 text-left font-semibold text-slate-300">Descrição</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-300 w-36 sm:w-44">
                      Unitário
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-slate-300 w-36 sm:w-44">
                      Total ({qty} un.)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {/* 1. Receita bruta de vendas / serviços */}
                  <tr>
                    <td className="py-2 text-left font-medium text-slate-200">
                      {currentAnexoConfig.tipoAtividade === 'servicos'
                        ? 'Receita bruta de serviços'
                        : 'Receita bruta de vendas'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-200">{formatBRL(unitGross)}</td>
                    <td className="py-2 px-3 text-right text-slate-200">{formatBRL(totalGross)}</td>
                  </tr>

                  {/* 2. (-) Guia Única DAS (Alíquota efetiva PGDAS) */}
                  <tr className="bg-slate-950/30">
                    <td className="py-2 text-left font-semibold text-emerald-400">
                      {stSubsystem.enabled && stSubsystem.simplesStExclusive
                        ? `(−) Simples Nacional — Guia DAS (Segregação ST / LC 123 art. 18)`
                        : `(−) Simples Nacional — Guia Única DAS (${formatNumberBR(pgdas.aliquotaEfetiva, 2)}% efetivo)`}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-400">
                      -
                      {formatBRL(
                        stSubsystem.enabled && stSubsystem.simplesStExclusive
                          ? Math.max(0, unitDasTotal - unitIcms)
                          : unitDasTotal,
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-400">
                      -
                      {formatBRL(
                        stSubsystem.enabled && stSubsystem.simplesStExclusive
                          ? Math.max(0, totalDasTotal - totalIcms)
                          : totalDasTotal,
                      )}
                    </td>
                  </tr>

                  {/* Sublinhas de detalhamento da partilha da guia DAS (cinza/itálico) */}
                  <tr className="bg-slate-900/20 text-slate-500">
                    <td className="py-1 pl-6 text-left italic">
                      · IRPJ ({formatNumberBR(pgdas.reparticao.irpjRate, 2)}% da receita)
                    </td>
                    <td className="py-1 px-3 text-right">-{formatBRL(unitIrpj)}</td>
                    <td className="py-1 px-3 text-right">-{formatBRL(totalIrpj)}</td>
                  </tr>
                  <tr className="bg-slate-900/20 text-slate-500">
                    <td className="py-1 pl-6 text-left italic">
                      · CSLL ({formatNumberBR(pgdas.reparticao.csllRate, 2)}% da receita)
                    </td>
                    <td className="py-1 px-3 text-right">-{formatBRL(unitCsll)}</td>
                    <td className="py-1 px-3 text-right">-{formatBRL(totalCsll)}</td>
                  </tr>
                  <tr className="bg-slate-900/20 text-slate-500">
                    <td className="py-1 pl-6 text-left italic">
                      · COFINS ({formatNumberBR(pgdas.reparticao.cofinsRate, 2)}% da receita)
                    </td>
                    <td className="py-1 px-3 text-right">-{formatBRL(unitCofins)}</td>
                    <td className="py-1 px-3 text-right">-{formatBRL(totalCofins)}</td>
                  </tr>
                  <tr className="bg-slate-900/20 text-slate-500">
                    <td className="py-1 pl-6 text-left italic">
                      · PIS ({formatNumberBR(pgdas.reparticao.pisRate, 2)}% da receita)
                    </td>
                    <td className="py-1 px-3 text-right">-{formatBRL(unitPis)}</td>
                    <td className="py-1 px-3 text-right">-{formatBRL(totalPis)}</td>
                  </tr>
                  {currentAnexoConfig.cppNoDas && (
                    <tr className="bg-slate-900/20 text-slate-500">
                      <td className="py-1 pl-6 text-left italic">
                        · CPP Previdenciária ({formatNumberBR(pgdas.reparticao.cppRate, 2)}% da
                        receita)
                      </td>
                      <td className="py-1 px-3 text-right">-{formatBRL(unitCpp)}</td>
                      <td className="py-1 px-3 text-right">-{formatBRL(totalCpp)}</td>
                    </tr>
                  )}
                  {pgdas.reparticao.ipiRate > 0 && (
                    <tr className="bg-slate-900/20 text-slate-500">
                      <td className="py-1 pl-6 text-left italic">
                        · IPI ({formatNumberBR(pgdas.reparticao.ipiRate, 2)}% da receita)
                      </td>
                      <td className="py-1 px-3 text-right">-{formatBRL(unitIpi)}</td>
                      <td className="py-1 px-3 text-right">-{formatBRL(totalIpi)}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-900/20 text-slate-500">
                    <td className="py-1 pl-6 text-left italic">
                      ·{' '}
                      {currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                        ? `ISS Municipal (${formatNumberBR(pgdas.reparticao.issRate, 2)}% da receita)`
                        : `ICMS Estadual (${formatNumberBR(pgdas.reparticao.icmsRate, 2)}% da receita)`}
                    </td>
                    <td className="py-1 px-3 text-right">
                      -
                      {formatBRL(
                        currentAnexoConfig.tributoEstadualMunicipal === 'iss' ? unitIss : unitIcms,
                      )}
                    </td>
                    <td className="py-1 px-3 text-right">
                      -
                      {formatBRL(
                        currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                          ? totalIss
                          : totalIcms,
                      )}
                    </td>
                  </tr>

                  {/* 3. = Receita líquida */}
                  <tr className="bg-slate-950/40 font-bold text-slate-100">
                    <td className="py-2.5 text-left">= Receita líquida</td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(unitNetRevenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(totalNetRevenue)}
                    </td>
                  </tr>

                  {/* 4. (-) CMV */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>(−) CMV (custo não creditável)</span>
                        {isAutoInventory && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                            · automático (baixa por quantidade)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(unitCmvVal)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(totalCmv)}</td>
                  </tr>

                  {/* Linha expansível com a discriminação específica do CMV */}
                  <tr>
                    <td colSpan={3} className="py-1 px-1">
                      <CmvDetailedBreakdown
                        forcedRegime="simples"
                        quantitySold={qty}
                        title="Ver composição e tributos integrados do CMV (Simples Nacional)"
                        variant="embedded"
                      />
                    </td>
                  </tr>

                  {/* 5. = Lucro bruto */}
                  <tr className="bg-slate-950/40 font-bold text-slate-100">
                    <td className="py-2.5 text-left">= Lucro bruto</td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(unitGrossProfit)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(totalGrossProfit)}
                    </td>
                  </tr>

                  {/* 6. (-) Despesas operacionais */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) Despesas operacionais</td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(unitExpenses)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(totalExpenses)}
                    </td>
                  </tr>

                  {/* 7. = Lucro líquido [fundo verde escuro, valores verde brilhante] */}
                  <tr className="bg-emerald-950/40 text-emerald-400 font-extrabold border-t-2 border-emerald-500/40">
                    <td className="py-3 px-2 text-left text-sm">= Lucro líquido</td>
                    <td className="py-3 px-3 text-right text-sm text-emerald-400">
                      {formatBRL(unitNetProfit)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-emerald-400">
                      {formatBRL(totalNetProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bloco de Alertas de Limites do Simples */}
            <div className="pt-2">
              <RegimeThresholdsAlerts
                simplesRbt12={effectiveSimplesRbt12}
                annualProjectedRevenue={totalGross}
                presumidoNetProfit={0}
                realNetProfit={0}
                simplesNetProfit={totalNetProfit}
                presumidoTaxBurden={0}
                realTaxBurden={0}
                simplesTaxBurden={totalTaxBurden}
                bestRegimeKey="simples"
                bestRegimeName="Simples Nacional"
                hasSimulatedData={isSimplesSimulated}
                compact
              />
            </div>

            {/* Cards de Resumo (3 lado a lado, mesmo padrão) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono block mb-1">
                  Carga tributária total (DAS)
                </span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {formatBRL(totalTaxBurden)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                  {formatNumberBR(pgdas.aliquotaEfetiva, 2)}% da receita bruta
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-400 font-mono block mb-1 font-semibold">
                  Lucro líquido
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {formatBRL(totalNetProfit)}
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono block mt-1">
                  Resultado final do período
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono block mb-1">
                  Margem líquida
                </span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {formatPercentBR(netMargin)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                  Lucro líquido ÷ Receita bruta
                </span>
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
                  unitGrossRevenue: unitGross,
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
                      unitValue: unitGross,
                      totalValue: totalGross,
                    },
                    {
                      description: `(−) Guia única DAS (${formatNumberBR(pgdas.aliquotaEfetiva, 2)}% efetivo)`,
                      unitValue: -unitDasTotal,
                      totalValue: -totalDasTotal,
                    },
                    {
                      description: `  · IRPJ segregado (${formatNumberBR(pgdas.reparticao.irpjRate, 2)}% da receita)`,
                      unitValue: -unitIrpj,
                      totalValue: -totalIrpj,
                      isInformative: true,
                    },
                    {
                      description: `  · CSLL segregada (${formatNumberBR(pgdas.reparticao.csllRate, 2)}% da receita)`,
                      unitValue: -unitCsll,
                      totalValue: -totalCsll,
                      isInformative: true,
                    },
                    {
                      description: `  · COFINS segregada (${formatNumberBR(pgdas.reparticao.cofinsRate, 2)}% da receita)`,
                      unitValue: -unitCofins,
                      totalValue: -totalCofins,
                      isInformative: true,
                    },
                    {
                      description: `  · PIS segregado (${formatNumberBR(pgdas.reparticao.pisRate, 2)}% da receita)`,
                      unitValue: -unitPis,
                      totalValue: -totalPis,
                      isInformative: true,
                    },
                    ...(pgdas.reparticao.cppRate > 0
                      ? [
                          {
                            description: `  · CPP patronal no DAS (${formatNumberBR(pgdas.reparticao.cppRate, 2)}% da receita)`,
                            unitValue: -unitCpp,
                            totalValue: -totalCpp,
                            isInformative: true,
                          },
                        ]
                      : []),
                    ...(pgdas.reparticao.ipiRate > 0
                      ? [
                          {
                            description: `  · IPI no DAS (${formatNumberBR(pgdas.reparticao.ipiRate, 2)}% da receita)`,
                            unitValue: -unitIpi,
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
                      unitValue: -(currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                        ? unitIss
                        : unitIcms),
                      totalValue: -(currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                        ? totalIss
                        : totalIcms),
                      isInformative: true,
                    },
                    {
                      description: '(=) Receita líquida',
                      unitValue: unitNetRevenue,
                      totalValue: totalNetRevenue,
                      isSubtotal: true,
                    },
                    {
                      description: '(−) CMV (custo não creditável)',
                      unitValue: -unitCmvVal,
                      totalValue: -totalCmv,
                    },
                    {
                      description: '(=) Lucro bruto',
                      unitValue: unitGrossProfit,
                      totalValue: totalGrossProfit,
                      isSubtotal: true,
                    },
                    {
                      description: '(−) Despesas operacionais do período',
                      unitValue: -unitExpenses,
                      totalValue: -totalExpenses,
                    },
                    {
                      description: '(=) Lucro líquido',
                      unitValue: unitNetProfit,
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
                  ],
                })
              }}
              onExportExcel={() => {
                exportDreToExcel({
                  title: 'DRE — Simples Nacional (PGDAS)',
                  regimeName: `Simples Nacional (${currentAnexoConfig.nome})`,
                  quantity: qty,
                  unitGrossRevenue: unitGross,
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
                      unitValue: unitGross,
                      totalValue: totalGross,
                    },
                    {
                      description: `(−) Guia única DAS (${formatNumberBR(pgdas.aliquotaEfetiva, 2)}% efetivo)`,
                      unitValue: -unitDasTotal,
                      totalValue: -totalDasTotal,
                    },
                    {
                      description: `  · IRPJ segregado (${formatNumberBR(pgdas.reparticao.irpjRate, 2)}% da receita)`,
                      unitValue: -unitIrpj,
                      totalValue: -totalIrpj,
                    },
                    {
                      description: `  · CSLL segregada (${formatNumberBR(pgdas.reparticao.csllRate, 2)}% da receita)`,
                      unitValue: -unitCsll,
                      totalValue: -totalCsll,
                    },
                    {
                      description: `  · COFINS segregada (${formatNumberBR(pgdas.reparticao.cofinsRate, 2)}% da receita)`,
                      unitValue: -unitCofins,
                      totalValue: -totalCofins,
                    },
                    {
                      description: `  · PIS segregado (${formatNumberBR(pgdas.reparticao.pisRate, 2)}% da receita)`,
                      unitValue: -unitPis,
                      totalValue: -totalPis,
                    },
                    ...(pgdas.reparticao.cppRate > 0
                      ? [
                          {
                            description: `  · CPP patronal no DAS (${formatNumberBR(pgdas.reparticao.cppRate, 2)}% da receita)`,
                            unitValue: -unitCpp,
                            totalValue: -totalCpp,
                          },
                        ]
                      : []),
                    ...(pgdas.reparticao.ipiRate > 0
                      ? [
                          {
                            description: `  · IPI no DAS (${formatNumberBR(pgdas.reparticao.ipiRate, 2)}% da receita)`,
                            unitValue: -unitIpi,
                            totalValue: -totalIpi,
                          },
                        ]
                      : []),
                    {
                      description:
                        currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                          ? `  · ISS Municipal (${formatNumberBR(pgdas.reparticao.issRate, 2)}% da receita)`
                          : `  · ICMS Estadual (${formatNumberBR(pgdas.reparticao.icmsRate, 2)}% da receita)`,
                      unitValue: -(currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                        ? unitIss
                        : unitIcms),
                      totalValue: -(currentAnexoConfig.tributoEstadualMunicipal === 'iss'
                        ? totalIss
                        : totalIcms),
                    },
                    {
                      description: '(=) Receita líquida',
                      unitValue: unitNetRevenue,
                      totalValue: totalNetRevenue,
                    },
                    {
                      description: '(−) CMV (custo não creditável)',
                      unitValue: -unitCmvVal,
                      totalValue: -totalCmv,
                    },
                    {
                      description: '(=) Lucro bruto',
                      unitValue: unitGrossProfit,
                      totalValue: totalGrossProfit,
                    },
                    {
                      description: '(−) Despesas operacionais do período',
                      unitValue: -unitExpenses,
                      totalValue: -totalExpenses,
                    },
                    {
                      description: '(=) Lucro líquido',
                      unitValue: unitNetProfit,
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
                  ],
                })
              }}
            />
          </div>
        ) : (
          <div className="bg-[#0b101b]/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <Calculator className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                Demonstração do Resultado pronta para simulação
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Informe a quantidade vendida acima e clique em{' '}
                <strong className="text-emerald-400">"Simular DRE"</strong> para gerar os cálculos
                da DRE do Simples Nacional com a partilha oficial da guia DAS.
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
            onClick={() => navigate('/demo/compras')}
            className="bg-[#0f172a]/90 text-slate-300 border border-slate-700/80 hover:border-emerald-500/40 hover:text-white hover:bg-slate-800/80 font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Calculadora de Compras</span>
          </Button>

          <Button
            type="button"
            onClick={() => navigate('/demo/comparacao')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
          >
            <span>Ir para Comparação de Regimes</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </DemoLayout>
  )
}
