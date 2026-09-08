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
import { PageHero } from '@/components/demo/PageHero'

export default function DreSimplesPage() {
  const navigate = useNavigate()
  const {
    simulatedSalePrice,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
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

  const { totalPurchasesQuantity } = useTaxContext()

  const defaultQty =
    simplesQuantitySold > 0
      ? simplesQuantitySold
      : (totalPurchasesQuantity || 0) > 0
        ? totalPurchasesQuantity || 0
        : totalConsolidatedQuantity > 0
          ? totalConsolidatedQuantity
          : 0

  // Estados locais para inputs
  const [qtyInput, setQtyInput] = useState<string>(defaultQty > 0 ? String(defaultQty) : '0')
  const [isQtyFocused, setIsQtyFocused] = useState(false)
  const [rbt12Input, setRbt12Input] = useState<string>(
    simplesRbt12 > 0 ? formatNumberBR(simplesRbt12) : '',
  )
  const [isRbt12Focused, setIsRbt12Focused] = useState(false)
  const [payrollInput, setPayrollInput] = useState<string>(
    simplesPayroll12m > 0 ? formatNumberBR(simplesPayroll12m) : '',
  )
  const [isPayrollFocused, setIsPayrollFocused] = useState(false)

  // Sincroniza o input quando o estado for resetado ou carregado via cenário
  React.useEffect(() => {
    if (!isQtyFocused) {
      if (
        simplesQuantitySold === 0 &&
        totalConsolidatedQuantity === 0 &&
        (totalPurchasesQuantity || 0) === 0
      ) {
        setQtyInput('0')
      } else {
        setQtyInput(String(defaultQty))
      }
    }
  }, [
    simplesQuantitySold,
    totalConsolidatedQuantity,
    totalPurchasesQuantity,
    defaultQty,
    isQtyFocused,
  ])

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

  // RECEITA BRUTA:
  // Se houver múltiplos produtos consolidados (> 0), usa totalConsolidatedRevenue.
  const hasConsolidated = totalConsolidatedRevenue > 0
  const activeGrossRevenue = hasConsolidated ? totalConsolidatedRevenue : simulatedSalePrice || 0
  // CMV unitário via Compras (Simples Nacional: sem recuperação de tributos)
  const unitCMV = calculatedPurchases.cmvSimples || 0

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

  // Quantidade vendida
  const effectiveQuantity =
    simplesQuantitySold > 0
      ? simplesQuantitySold
      : (totalPurchasesQuantity || 0) > 0
        ? totalPurchasesQuantity || 0
        : totalConsolidatedQuantity > 0
          ? totalConsolidatedQuantity
          : 0
  const qty = effectiveQuantity

  // CÁLCULOS UNITÁRIOS DA DRE
  // 1. Receita Bruta Unitária (vinda do Markup ou consolidada)
  const unitGross = activeGrossRevenue

  // Alíquota Efetiva do PGDAS (%)
  const effectiveRate = pgdas.aliquotaEfetiva
  const effectiveRateDec = effectiveRate / 100

  // Guia Única DAS unitária
  const unitDasTotal = unitGross * effectiveRateDec

  // Distribuição dos tributos unitários conforme partilha do PGDAS
  const unitIrpj = (unitGross * pgdas.reparticao.irpjRate) / 100
  const unitCsll = (unitGross * pgdas.reparticao.csllRate) / 100
  const unitCofins = (unitGross * pgdas.reparticao.cofinsRate) / 100
  const unitPis = (unitGross * pgdas.reparticao.pisRate) / 100
  const unitCpp = (unitGross * pgdas.reparticao.cppRate) / 100
  const unitIcms = (unitGross * pgdas.reparticao.icmsRate) / 100
  const unitIpi = (unitGross * pgdas.reparticao.ipiRate) / 100
  const unitIss = (unitGross * pgdas.reparticao.issRate) / 100

  // Receita Líquida unitária (Receita Bruta - Guia DAS)
  const unitNetRevenue = unitGross - unitDasTotal

  // CMV unitário
  const unitCmvVal = unitCMV

  // Lucro Bruto unitário
  const unitGrossProfit = unitNetRevenue - unitCmvVal

  // Despesas operacionais totais e unitárias
  const totalExpenses = simplesExpenses.reduce((acc, exp) => acc + (exp.value || 0), 0)
  const unitExpenses = qty > 0 ? totalExpenses / qty : 0

  // Lucro Líquido unitário
  const unitNetProfit = unitGrossProfit - unitExpenses

  // CÁLCULOS TOTAIS DA DRE
  const totalGross =
    hasConsolidated &&
    (qty === totalConsolidatedQuantity || (qty === 1 && totalConsolidatedQuantity <= 1))
      ? totalConsolidatedRevenue
      : unitGross * (qty > 0 ? qty : 0)

  const totalDasTotal = totalGross * effectiveRateDec
  const totalIrpj = (totalGross * pgdas.reparticao.irpjRate) / 100
  const totalCsll = (totalGross * pgdas.reparticao.csllRate) / 100
  const totalCofins = (totalGross * pgdas.reparticao.cofinsRate) / 100
  const totalPis = (totalGross * pgdas.reparticao.pisRate) / 100
  const totalCpp = (totalGross * pgdas.reparticao.cppRate) / 100
  const totalIcms = (totalGross * pgdas.reparticao.icmsRate) / 100
  const totalIpi = (totalGross * pgdas.reparticao.ipiRate) / 100
  const totalIss = (totalGross * pgdas.reparticao.issRate) / 100
  const totalNetRevenue = totalGross - totalDasTotal
  const totalCmv = unitCmvVal * qty
  const totalGrossProfit = totalNetRevenue - totalCmv
  const totalNetProfit = totalGrossProfit - totalExpenses

  // Cards de Resumo
  const totalTaxBurden = totalGross > 0 ? totalDasTotal : 0
  const netMargin = totalGross > 0 ? (totalNetProfit / totalGross) * 100 : 0

  // Handlers
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQtyInput(val)
    const parsed = parseInt(val, 10)
    setSimplesQuantitySold(isNaN(parsed) || parsed < 0 ? 0 : parsed)
  }

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
              <span>🔗 Conectado às calculadoras — valores importados automaticamente</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <div>
                Receita Markup {hasConsolidated ? '(consolidada)' : ''}:{' '}
                <strong className="text-emerald-400">{formatBRL(activeGrossRevenue)}</strong>
              </div>
              <div>
                CMV (Compras · Simples):{' '}
                <strong className="text-emerald-400">{formatBRL(unitCMV)}</strong>
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
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">(−) Estoque final (EF)</span>
                <span className="text-slate-400">-{formatBRL(finalInventory)}</span>
              </div>
              <div className="py-2 flex justify-between items-center text-sm font-bold bg-emerald-500/10 px-2 rounded-lg mt-1 border border-emerald-500/20">
                <span className="text-emerald-400">(=) CMV = EI + CL − EF</span>
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
                        ? 'bg-slate-950/80 border-emerald-500/50 text-emerald-400 font-bold cursor-not-allowed'
                        : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500'
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
                    className="pl-9 bg-slate-900 border-slate-800 text-slate-100 font-mono text-xs focus:border-emerald-500"
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
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40 cursor-pointer accent-emerald-500"
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

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSimplesMonthlyRevenue(0)}
                      className="h-7 text-xs bg-slate-950/60 border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-emerald-300 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 text-emerald-400" />+ Adicionar mês
                    </Button>
                  </div>

                  {/* Lista de meses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {simplesMonthlyRevenues.map((rev, index) => (
                      <div
                        key={`rev-month-${index}`}
                        className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-2"
                      >
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
                            }}
                            className="pl-8 text-right bg-slate-900 border-slate-800 text-slate-100 font-mono text-xs h-8 focus:border-emerald-500"
                          />
                        </div>
                        {simplesMonthlyRevenues.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSimplesMonthlyRevenue(index)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-rose-500/10 cursor-pointer"
                            title="Remover mês"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
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

          {/* Campos Automáticos Bloqueados (padrão com borda verde e · automático) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {hasConsolidated
                    ? 'Receita bruta — via Markup (total dos produtos)'
                    : 'Receita bruta unitária (R$)'}
                </label>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                  · automático{' '}
                  {hasConsolidated ? `(${markupProducts.length} produtos)` : '(via Markup)'}
                </span>
              </div>
              <div className="h-10 px-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/40 flex items-center justify-between font-mono text-sm text-slate-100">
                <span className="text-slate-500 text-xs">R$</span>
                <span className="font-bold text-emerald-400">
                  {formatNumberBR(activeGrossRevenue)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">CMV unitário (R$)</label>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                  · automático (via Compras Simples)
                </span>
              </div>
              <div className="h-10 px-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/40 flex items-center justify-between font-mono text-sm text-slate-100">
                <span className="text-slate-500 text-xs">R$</span>
                <span className="font-bold text-emerald-400">{formatNumberBR(unitCMV)}</span>
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
                    className="flex-1 bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-200"
                  />
                  <div className="relative w-36 sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                      R$
                    </span>
                    <Input
                      type="text"
                      defaultValue={exp.value > 0 ? formatNumberBR(exp.value) : ''}
                      key={`exp-${exp.id}-${exp.value}`}
                      onBlur={(e) => {
                        const parsed = parseBRNumber(e.target.value)
                        updateSimplesExpense(exp.id, 'value', parsed)
                        e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                      }}
                      placeholder="0,00"
                      className="pl-8 text-right bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-100"
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

          {/* Faixa Verde: Quantidade Vendida + Botão Simular */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-semibold text-emerald-400 block">
                Quantidade vendida — a coluna "Total" da DRE acompanha este valor
              </span>
              <div className="relative w-36">
                <Input
                  type="number"
                  min="0"
                  value={qtyInput}
                  onFocus={() => setIsQtyFocused(true)}
                  onChange={handleQtyChange}
                  onBlur={(e) => {
                    setIsQtyFocused(false)
                    const parsed = parseInt(e.target.value, 10)
                    const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed
                    setQtyInput(String(safe))
                    setSimplesQuantitySold(safe)
                  }}
                  className="bg-slate-950/80 border-slate-800 text-slate-100 font-mono text-sm focus:border-emerald-500"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={simulateSimples}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <Calculator className="w-4 h-4" />
              Simular DRE
            </Button>
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
                      (−) CMV (custo não creditável)
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(unitCmvVal)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(totalCmv)}</td>
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
