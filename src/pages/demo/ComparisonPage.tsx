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
} from 'lucide-react'
import { formatBRL, formatNumberBR, formatPercentBR, parseBRNumber } from '@/lib/taxCalculations'
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

export default function ComparisonPage() {
  const navigate = useNavigate()
  const {
    simulatedSalePrice,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
    markupProducts,
    calculatedPurchases,
    icmsRateMarkup,
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
    simplesRbt12,
    setSimplesRbt12,
    simplesPayroll12m,
    setSimplesPayroll12m,
    simplesQuantitySold,
    setSimplesQuantitySold,
    simplesExpenses,
  } = useTaxContext()

  // Se houver quantidade consolidada multi-produtos, prioriza ela
  const initialQty =
    totalConsolidatedQuantity > 0
      ? totalConsolidatedQuantity
      : presumidoQuantitySold || realQuantitySold || simplesQuantitySold || 0

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

  // Despesas compartilhadas: usa as despesas de Lucro Presumido como mestre
  const totalExpenses = useMemo(() => {
    return presumidoExpenses.reduce((acc, exp) => acc + (exp.value || 0), 0)
  }, [presumidoExpenses])

  // Preço de venda ou receita consolidada (Markup)
  const hasConsolidated = totalConsolidatedRevenue > 0
  const activeGrossRevenue = hasConsolidated ? totalConsolidatedRevenue : simulatedSalePrice || 0
  const unitGrossRevenue = activeGrossRevenue

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

    const unitGross = unitGrossRevenue
    const unitMunicipalStateTax = isServices
      ? (unitGross * issRate) / 100
      : (unitGross * icmsRate) / 100

    const unitPisCofinsBase = isServices
      ? unitGross
      : Math.max(0, unitGross - unitMunicipalStateTax)

    const unitPis = (unitPisCofinsBase * pisRate) / 100
    const unitCofins = (unitPisCofinsBase * cofinsRate) / 100
    const unitNetRevenue = unitGross - unitMunicipalStateTax - unitPis - unitCofins
    const unitCmv = calculatedPurchases.cmvPresumido || 0
    const unitGrossProfit = unitNetRevenue - unitCmv

    // Totais com a quantidade
    const totalGross = unitGross * qty
    const totalMunicipalStateTax = unitMunicipalStateTax * qty
    const totalPis = unitPis * qty
    const totalCofins = unitCofins * qty
    const totalNetRevenue = unitNetRevenue * qty
    const totalCmv = unitCmv * qty
    const totalGrossProfit = unitGrossProfit * qty
    const totalResultBeforeTax = totalGrossProfit - totalExpenses

    // Bases presumidas
    const totalIrpjBase = (totalGross * irpjPresumptionRate) / 100
    const totalCsllBase = (totalGross * csllPresumptionRate) / 100
    const totalIrpj = (totalIrpjBase * irpjRate) / 100
    const totalIrpjExcess = Math.max(0, totalIrpjBase - irpjAdditionalLimit)
    const totalIrpjAdditional = (totalIrpjExcess * irpjAdditionalRate) / 100
    const totalCsll = (totalCsllBase * csllRate) / 100

    const totalNetProfit = totalResultBeforeTax - totalIrpj - totalIrpjAdditional - totalCsll
    const totalTaxBurden =
      totalMunicipalStateTax + totalPis + totalCofins + totalIrpj + totalIrpjAdditional + totalCsll
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
      totalIrpj,
      totalIrpjAdditional,
      totalCsll,
      totalNetProfit,
      totalTaxBurden,
      netMargin,
      effectiveTaxRate,
    }
  }, [
    presumidoActivity,
    presumidoIssRate,
    icmsRateMarkup,
    unitGrossRevenue,
    calculatedPurchases.cmvPresumido,
    qty,
    totalExpenses,
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

    const unitGross = unitGrossRevenue
    const unitMunicipalStateTax = isServices
      ? (unitGross * issRate) / 100
      : (unitGross * icmsRate) / 100

    const unitPisCofinsBase = isServices
      ? unitGross
      : Math.max(0, unitGross - unitMunicipalStateTax)

    const unitPis = (unitPisCofinsBase * pisRate) / 100
    const unitCofins = (unitPisCofinsBase * cofinsRate) / 100
    const unitNetRevenue = unitGross - unitMunicipalStateTax - unitPis - unitCofins
    const unitCmv = calculatedPurchases.cmvReal || 0
    const unitGrossProfit = unitNetRevenue - unitCmv

    // Totais com a quantidade
    const totalGross = unitGross * qty
    const totalMunicipalStateTax = unitMunicipalStateTax * qty
    const totalPis = unitPis * qty
    const totalCofins = unitCofins * qty
    const totalNetRevenue = unitNetRevenue * qty
    const totalCmv = unitCmv * qty
    const totalGrossProfit = unitGrossProfit * qty
    const totalResultBeforeTax = totalGrossProfit - totalExpenses

    // LALUR: Lucro Real tributável
    const totalAdditions = realAdditions || 0
    const totalExclusions = realExclusions || 0
    const taxableRealProfit = Math.max(0, totalResultBeforeTax + totalAdditions - totalExclusions)

    const totalIrpj = (taxableRealProfit * irpjRate) / 100
    const totalIrpjExcess = Math.max(0, taxableRealProfit - irpjAdditionalLimit)
    const totalIrpjAdditional = (totalIrpjExcess * irpjAdditionalRate) / 100
    const totalCsll = (taxableRealProfit * csllRate) / 100

    const totalNetProfit = totalResultBeforeTax - totalIrpj - totalIrpjAdditional - totalCsll
    const totalTaxBurden =
      totalMunicipalStateTax + totalPis + totalCofins + totalIrpj + totalIrpjAdditional + totalCsll
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
      taxableRealProfit,
      totalIrpj,
      totalIrpjAdditional,
      totalCsll,
      totalNetProfit,
      totalTaxBurden,
      netMargin,
      effectiveTaxRate,
    }
  }, [
    realActivity,
    realIssRate,
    icmsRateMarkup,
    unitGrossRevenue,
    calculatedPurchases.cmvReal,
    qty,
    totalExpenses,
    realAdditions,
    realExclusions,
  ])

  // -------------------------------------------------------------
  // 3. CÁLCULO SIMPLES NACIONAL (PGDAS)
  // -------------------------------------------------------------
  const currentAnexoId = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const currentAnexoConfig = SIMPLES_ANEXOS[currentAnexoId] || SIMPLES_ANEXOS.anexo_1

  const pgdas = useMemo(() => {
    return calculatePgdas(currentAnexoId, simplesRbt12)
  }, [currentAnexoId, simplesRbt12])

  const fatorRResult = useMemo(() => {
    return calculateFatorR(simplesPayroll12m, simplesRbt12)
  }, [simplesPayroll12m, simplesRbt12])

  const simplesData = useMemo(() => {
    const unitGross = unitGrossRevenue
    const effectiveRateDec = pgdas.aliquotaEfetiva / 100
    const unitDasTotal = unitGross * effectiveRateDec

    const unitIrpj = (unitGross * pgdas.reparticao.irpjRate) / 100
    const unitCsll = (unitGross * pgdas.reparticao.csllRate) / 100
    const unitCofins = (unitGross * pgdas.reparticao.cofinsRate) / 100
    const unitPis = (unitGross * pgdas.reparticao.pisRate) / 100
    const unitCpp = (unitGross * pgdas.reparticao.cppRate) / 100
    const unitIcms = (unitGross * pgdas.reparticao.icmsRate) / 100
    const unitIpi = (unitGross * pgdas.reparticao.ipiRate) / 100
    const unitIss = (unitGross * pgdas.reparticao.issRate) / 100

    const unitNetRevenue = unitGross - unitDasTotal
    const unitCmv = calculatedPurchases.cmvSimples || 0
    const unitGrossProfit = unitNetRevenue - unitCmv

    // Totais com a quantidade
    const totalGross = unitGross * qty
    const totalDasTotal = unitDasTotal * qty
    const totalIrpj = unitIrpj * qty
    const totalCsll = unitCsll * qty
    const totalCofins = unitCofins * qty
    const totalPis = unitPis * qty
    const totalCpp = unitCpp * qty
    const totalIcms = unitIcms * qty
    const totalIpi = unitIpi * qty
    const totalIss = unitIss * qty
    const totalNetRevenue = unitNetRevenue * qty
    const totalCmv = unitCmv * qty
    const totalGrossProfit = unitGrossProfit * qty
    const totalResultBeforeTax = totalGrossProfit - totalExpenses
    // No Simples Nacional, os tributos sobre a receita já estão no DAS (deduzidos antes do lucro bruto)
    // Logo o Lucro Líquido = Lucro Bruto - Despesas
    const totalNetProfit = totalGrossProfit - totalExpenses
    const totalTaxBurden = totalDasTotal
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
      totalNetProfit,
      totalTaxBurden,
      netMargin,
      effectiveTaxRate,
    }
  }, [unitGrossRevenue, pgdas, calculatedPurchases.cmvSimples, qty, totalExpenses])

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

  return (
    <DemoLayout currentTab="comparacao">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Comparação de Regimes Tributários
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                    3 Cenários em Paralelo
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Simulação simultânea da mesma operação comercial nos regimes Lucro Presumido,
                  Lucro Real e Simples Nacional.
                </p>
              </div>
            </div>

            {/* Card Destaque Rápido do Vencedor */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Regime mais vantajoso
                </span>
                <span className="text-sm font-black text-emerald-400 tracking-tight">
                  {bestRegime.name}
                </span>
              </div>
            </div>
          </div>

          {/* Faixa Verde: Conectado às calculadoras */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <LinkIcon className="w-4 h-4 shrink-0" />
              <span>Conectado às calculadoras — valores sincronizados em tempo real</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <div>
                Receita Markup {hasConsolidated ? '(consolidada)' : ''}:{' '}
                <strong className="text-emerald-400">{formatBRL(activeGrossRevenue)}</strong>
              </div>
              <div>
                CMV Presumido:{' '}
                <strong className="text-emerald-400">
                  {formatBRL(calculatedPurchases.cmvPresumido)}
                </strong>
              </div>
              <div>
                CMV Real:{' '}
                <strong className="text-emerald-400">
                  {formatBRL(calculatedPurchases.cmvReal)}
                </strong>
              </div>
              <div>
                CMV Simples:{' '}
                <strong className="text-emerald-400">
                  {formatBRL(calculatedPurchases.cmvSimples)}
                </strong>
              </div>
            </div>
          </div>

          {/* PARÂMETROS EDITÁVEIS NA PRÓPRIA PÁGINA (sem botão simular - auto ao digitar) */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-200">
                Parâmetros operacionais compartilhados (atualização automática ao digitar)
              </span>
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
                    className="bg-slate-900 border-emerald-500/40 text-slate-100 font-mono text-xs focus:border-emerald-400"
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
                  className="w-full h-9 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 px-2.5 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="comercio">Comércio (ICMS · IRPJ 8% / CSLL 12%)</option>
                  <option value="industria">Indústria (ICMS · IRPJ 8% / CSLL 12%)</option>
                  <option value="servicos">Serviços (ISSQN · IRPJ 32% / CSLL 32%)</option>
                </select>
                <span className="text-[10px] text-slate-500 font-mono">Presunção Lei 9.249/95</span>
              </div>

              {/* Anexo Simples Nacional */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Anexo Simples Nacional
                </label>
                <select
                  value={currentAnexoId}
                  onChange={(e) => setSimplesAnexo(e.target.value)}
                  className="w-full h-9 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 px-2.5 focus:border-emerald-500 focus:outline-none"
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
                <label className="text-xs font-semibold text-slate-300 block">
                  RBT12 Simples Nacional (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                    R$
                  </span>
                  <Input
                    type="text"
                    defaultValue={simplesRbt12 > 0 ? formatNumberBR(simplesRbt12) : ''}
                    key={`rbt-${simplesRbt12}`}
                    onBlur={(e) => setSimplesRbt12(parseBRNumber(e.target.value))}
                    placeholder="0,00"
                    className="pl-8 text-right bg-slate-900 border-slate-800 text-xs font-mono text-slate-100"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Receita acumulada 12 meses
                </span>
              </div>
            </div>

            {/* Despesas Operacionais Compartilhadas */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-semibold text-slate-300 block">
                    Despesas operacionais do período: {formatBRL(totalExpenses)}
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
                        className="flex-1 bg-slate-950/80 border-slate-800 text-xs font-mono text-slate-200 h-8"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          defaultValue={exp.value > 0 ? formatNumberBR(exp.value) : ''}
                          key={`exp-${exp.id}-${exp.value}`}
                          onBlur={(e) =>
                            updatePresumidoExpense(exp.id, 'value', parseBRNumber(e.target.value))
                          }
                          placeholder="0,00"
                          className="pl-6 text-right bg-slate-950/80 border-slate-800 text-xs font-mono text-slate-100 h-8"
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
                    (−) CMV (Custo das Mercadorias)
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

                {/* 9. Despesas Operacionais */}
                <tr>
                  <td className="py-2.5 px-3 text-left text-slate-400">
                    (−) Despesas Operacionais
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'presumido'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(totalExpenses)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'real'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(totalExpenses)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right text-slate-400 ${
                      bestRegimeKey === 'simples'
                        ? 'bg-emerald-500/5 border-l border-r border-emerald-500/30'
                        : ''
                    }`}
                  >
                    -{formatBRL(totalExpenses)}
                  </td>
                </tr>

                {/* 10. Resultado antes IRPJ/CSLL */}
                <tr className="bg-slate-950/40 font-bold text-slate-200">
                  <td className="py-2.5 px-3 text-left">= Resultado antes de IRPJ / CSLL</td>
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
        </div>

        {/* CONDIÇÕES, PARTICULARIDADES E AVISOS POR REGIME */}
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
                <strong className="text-slate-300">PIS/COFINS cumulativo:</strong> 0,65% e 3,00%.
                Sem direito a tomada de créditos sobre compras ou insumos.
              </li>
              <li>
                <strong className="text-slate-300">Tese do século (Tema 69/STF):</strong>{' '}
                {presumidoData.isServices
                  ? 'ISS não é excluído da base PIS/COFINS.'
                  : 'ICMS destacado integralmente excluído da base de cálculo.'}
              </li>
              <li>
                <strong className="text-slate-300">Adicional IRPJ:</strong> 10% sobre a parcela da
                base presumida que exceder R$ 60.000,00 trimestral.
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
                <strong className="text-slate-300">Créditos de compras:</strong> dedução integral de
                ICMS, PIS (1,65%) e COFINS (7,60%) recuperáveis na aquisição de insumos e
                mercadorias.
              </li>
              <li>
                <strong className="text-slate-300">LALUR (Ajustes):</strong> IRPJ (15%) e CSLL (9%)
                incidem sobre o lucro contábil ajustado por adições e exclusões.
              </li>
              <li>
                <strong className="text-slate-300">Vantagem em margens baixas:</strong> ideal quando
                a empresa possui margem operacional real menor do que a presunção legal ou prejuízo
                fiscal.
              </li>
              <li>
                <strong className="text-slate-300">Adicional IRPJ:</strong> 10% sobre o Lucro Real
                que exceder R$ 60.000,00 trimestrais.
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
                  <strong className="text-amber-300">Alerta de sublimite:</strong> faturamento &gt;
                  R$ 3,6 mi. ICMS/ISS recolhidos por fora do DAS.
                </li>
              ) : (
                <li>
                  <strong className="text-slate-300">Sublimite R$ 3,6 mi:</strong> faturamento
                  dentro do limite estadual/municipal unificado.
                </li>
              )}
              <li>
                <strong className="text-slate-300">Custo de compras:</strong> tributos de aquisição
                não geram crédito e integram integralmente o CMV.
              </li>
            </ul>
          </div>
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
