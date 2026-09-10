import React, { useState, useMemo } from 'react'
import {
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  DollarSign,
  Package,
  Sliders,
  Scale,
  ShieldCheck,
  Building2,
  FileCheck2,
  Flame,
  Zap,
} from 'lucide-react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'
import { ScenarioManagerBar } from '@/components/demo/ScenarioManagerBar'
import { ExportReportButtons } from '@/components/demo/ExportReportButtons'
import { useTaxContext, TaxRegime } from '@/contexts/TaxContext'
import {
  ReformaYear,
  DEFAULT_REFORMA_SCHEDULE,
  getEffectiveYearRates,
  calculateReformaYear,
  calculateFlightPlan,
} from '@/lib/reformaCalculations'
import { formatBRL, formatNumberBR, formatPercentBR, parseBRNumber } from '@/lib/taxCalculations'
import { exportReformaToPdf, exportReformaToExcel } from '@/lib/exportReports'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

const REFORMA_YEARS: ReformaYear[] = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

export function ReformaPage() {
  const taxContext = useTaxContext()
  const {
    regime,
    setRegime,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
    markupProducts,
    calculatedPurchases,
    payrollSalaries,
    payrollProLabore,
    payrollInssRate,
    payrollRatRate,
    payrollTerceirosRate,
    presumidoExpenses,
    realExpenses,
    simplesExpenses,
    reformaState,
    updateReformaState,
    setSelectedReformaYear,
  } = taxContext

  const selectedYear = reformaState.selectedYear || 2026

  // Dados operacionais consolidados a partir do TaxContext (reutilizando exatamente os cálculos existentes)
  const activeGrossRevenue = useMemo(() => {
    if (totalConsolidatedRevenue > 0) return totalConsolidatedRevenue
    // Fallback: se houver produtos no markup
    const sum = markupProducts.reduce((acc, p) => acc + (p.totalRevenue || 0), 0)
    return sum > 0 ? sum : 0
  }, [totalConsolidatedRevenue, markupProducts])

  const activeQuantity = useMemo(() => {
    if (totalConsolidatedQuantity > 0) return totalConsolidatedQuantity
    const sum = markupProducts.reduce((acc, p) => acc + (p.quantity || 0), 0)
    return sum > 0 ? sum : 1
  }, [totalConsolidatedQuantity, markupProducts])

  const unitGrossPrice = useMemo(() => {
    if (activeQuantity > 0 && activeGrossRevenue > 0) {
      return activeGrossRevenue / activeQuantity
    }
    return 0
  }, [activeGrossRevenue, activeQuantity])

  // Custo de compras bruto
  const totalPurchasesCost = useMemo(() => {
    return calculatedPurchases.totalAdditions > 0
      ? calculatedPurchases.totalAdditions
      : calculatedPurchases.cmvPresumidoNetPurchases || 0
  }, [calculatedPurchases])

  // Folha total com encargos
  const totalPayrollCost = useMemo(() => {
    const directSalaries = (payrollSalaries || 0) + (payrollProLabore || 0)
    const patronal =
      regime === 'simples'
        ? 0
        : (payrollSalaries || 0) *
            ((payrollInssRate + payrollRatRate + payrollTerceirosRate) / 100) +
          (payrollProLabore || 0) * 0.2
    return directSalaries + patronal
  }, [
    payrollSalaries,
    payrollProLabore,
    payrollInssRate,
    payrollRatRate,
    payrollTerceirosRate,
    regime,
  ])

  // Despesas operacionais credenciáveis (energia, telecom, serviços PJ, fretes)
  const creditableOperatingExpenses = useMemo(() => {
    const list =
      regime === 'presumido'
        ? presumidoExpenses
        : regime === 'real'
          ? realExpenses
          : simplesExpenses
    return (list || []).reduce((acc, item) => acc + (item.value || 0), 0)
  }, [regime, presumidoExpenses, realExpenses, simplesExpenses])

  // Estimativa de carga tributária atual do regime ativo para confronto direto
  const currentTaxBurden = useMemo(() => {
    if (activeGrossRevenue <= 0) return 0
    if (regime === 'simples') {
      // Simples com base na alíquota padrão ~8% a 12%
      return activeGrossRevenue * 0.095
    }
    if (regime === 'presumido') {
      // PIS (0.65%) + COFINS (3%) + ICMS (~18%) + IRPJ (~1.2%) + CSLL (~1.08%) = ~23.93%
      return activeGrossRevenue * 0.2393
    }
    // Lucro Real não cumulativo: PIS (1.65%) + COFINS (7.6%) + ICMS (~18%) + IRPJ/CSLL (~5%) - créditos compras
    const creditosComprasEstimados = totalPurchasesCost * (0.0165 + 0.076 + 0.18)
    const impostosBrutos = activeGrossRevenue * 0.3225
    return Math.max(0, impostosBrutos - creditosComprasEstimados)
  }, [activeGrossRevenue, regime, totalPurchasesCost])

  const currentRegimeName = useMemo(() => {
    if (regime === 'simples') return 'Simples Nacional'
    if (regime === 'real') return 'Lucro Real'
    return 'Lucro Presumido'
  }, [regime])

  const currentNetProfit = useMemo(() => {
    return Math.max(
      0,
      activeGrossRevenue -
        totalPurchasesCost -
        totalPayrollCost -
        currentTaxBurden -
        creditableOperatingExpenses,
    )
  }, [
    activeGrossRevenue,
    totalPurchasesCost,
    totalPayrollCost,
    currentTaxBurden,
    creditableOperatingExpenses,
  ])

  const currentNetMargin =
    activeGrossRevenue > 0 ? (currentNetProfit / activeGrossRevenue) * 100 : 0

  // Alíquotas efetivas do ano selecionado
  const currentYearRates = useMemo(() => {
    return getEffectiveYearRates(selectedYear, reformaState)
  }, [selectedYear, reformaState])

  // Cálculo do ano selecionado
  const currentYearCalc = useMemo(() => {
    return calculateReformaYear({
      year: selectedYear,
      rates: currentYearRates,
      totalRevenueCurrent: activeGrossRevenue,
      quantitySold: activeQuantity,
      unitSalePriceCurrent: unitGrossPrice,
      totalPurchasesCost,
      creditableOperatingExpenses,
      payrollCost: totalPayrollCost,
      currentTaxBurden,
      currentNetMargin,
      currentNetProfit,
      currentRegimeName,
    })
  }, [
    selectedYear,
    currentYearRates,
    activeGrossRevenue,
    activeQuantity,
    unitGrossPrice,
    totalPurchasesCost,
    creditableOperatingExpenses,
    totalPayrollCost,
    currentTaxBurden,
    currentNetMargin,
    currentNetProfit,
    currentRegimeName,
  ])

  // Plano de voo completo (2026–2033)
  const flightPlan = useMemo(() => {
    return calculateFlightPlan(
      {
        totalRevenueCurrent: activeGrossRevenue,
        quantitySold: activeQuantity,
        unitSalePriceCurrent: unitGrossPrice,
        totalPurchasesCost,
        creditableOperatingExpenses,
        payrollCost: totalPayrollCost,
        currentTaxBurden,
        currentNetMargin,
        currentNetProfit,
        currentRegimeName,
      },
      reformaState,
    )
  }, [
    activeGrossRevenue,
    activeQuantity,
    unitGrossPrice,
    totalPurchasesCost,
    creditableOperatingExpenses,
    totalPayrollCost,
    currentTaxBurden,
    currentNetMargin,
    currentNetProfit,
    currentRegimeName,
    reformaState,
  ])

  // Handler para atualizar alíquotas editáveis de um ano
  const handleUpdateYearRate = (
    year: ReformaYear,
    field: 'cbsRate' | 'ibsRate' | 'isRate',
    valStr: string,
  ) => {
    const num = parseBRNumber(valStr)
    const existing = reformaState.customRatesByYear[year] || {}
    updateReformaState('customRatesByYear', {
      ...reformaState.customRatesByYear,
      [year]: {
        ...existing,
        [field]: num,
      },
    })
  }

  // Handler para restaurar alíquotas padrões daquele ano
  const handleResetYearRates = (year: ReformaYear) => {
    const updated = { ...reformaState.customRatesByYear }
    delete updated[year]
    updateReformaState('customRatesByYear', updated)
  }

  return (
    <DemoLayout currentTab="reforma">
      <div className="space-y-6">
        {/* Barra de Gerenciamento de Cenários */}
        <ScenarioManagerBar />

        {/* PageHero no padrão visual IT / Adapta */}
        <PageHero
          title="REFORMA TRIBUTÁRIA — IBS/CBS"
          subtitle="Emenda Constitucional 132/2023 & Lei Complementar 214/2025: Cronograma de Transição 2026–2033, alíquotas editáveis, precificação por fora e plano de voo comparativo."
          badge="ETAPA 5 · TRANSIÇÃO TRIBUTÁRIA COMPLETA"
          icon={Layers}
        />

        {/* Barra de Seleção de Regime Atual para Confronto */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono block">
                Regime Base de Confronto:
              </span>
              <span className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                {currentRegimeName}
                <span className="text-[11px] font-mono text-emerald-400 font-normal">
                  (Carga Atual: {formatBRL(currentTaxBurden)} •{' '}
                  {activeGrossRevenue > 0
                    ? `${((currentTaxBurden / activeGrossRevenue) * 100).toFixed(2)}%`
                    : '0%'}
                  )
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
            {(['simples', 'presumido', 'real'] as TaxRegime[]).map((r) => {
              const isSelected = regime === r
              const labels = {
                simples: 'Simples Nacional',
                presumido: 'Lucro Presumido',
                real: 'Lucro Real',
              }
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegime(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {labels[r]}
                </button>
              )
            })}
          </div>
        </div>

        {/* 1. TIMELINE INTERATIVA 2026–2033 NO TOPO */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#091b15]/90 via-[#071410]/95 to-[#050e0b]/95 border border-emerald-500/25 backdrop-blur-md shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Cronograma de Transição 2026–2033 (EC 132/23)
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Clique no ano para visualizar a legislação e recalcular toda a operação:
            </div>
          </div>

          {/* Stepper / Timeline horizontal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {REFORMA_YEARS.map((yr) => {
              const isSelected = selectedYear === yr
              const info = DEFAULT_REFORMA_SCHEDULE[yr]
              const isPontoVirada = flightPlan.turningPointYear === yr
              const diffYear =
                flightPlan.yearlyResults.find((r) => r.year === yr)?.taxBurdenDifference || 0
              const isEconomy = diffYear < 0

              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedReformaYear(yr)}
                  className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/50 scale-[1.02]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:bg-slate-900/90'
                  }`}
                >
                  {isPontoVirada && (
                    <div className="absolute -top-2.5 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono text-[9px] font-extrabold shadow-sm flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 fill-slate-950" />
                      <span>VIRADA</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black font-mono tracking-tight">{yr}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1 block mt-0.5">
                      {info.phaseTitle}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">CBS: {info.cbsRate}%</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        isEconomy ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {yr === 2033 ? 'Pleno' : yr === 2026 ? 'Teste' : `IBS ${info.ibsRate}%`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Destaque explicativo do ano selecionado */}
          <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-emerald-500/20 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                  Fase do Ano {selectedYear}:
                </span>
                <span className="text-sm font-bold text-white">{currentYearRates.phaseTitle}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                >
                  {currentYearRates.legalBasis}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {currentYearRates.phaseSummary}
              </p>
            </div>

            {/* Toggle Imposto Seletivo (EC 132/23) */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Imposto Seletivo (IS)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedYear < 2027
                    ? 'Inicia em 2027'
                    : reformaState.enableImpostoSeletivo
                      ? `Ativo (${reformaState.impostoSeletivoRate || 2}%)`
                      : 'Desligado por padrão'}
                </span>
              </div>
              <Switch
                checked={reformaState.enableImpostoSeletivo}
                disabled={selectedYear < 2027}
                onCheckedChange={(checked) => updateReformaState('enableImpostoSeletivo', checked)}
              />
            </div>
          </div>
        </div>

        {/* 2. TABELA DE ALÍQUOTAS EDITÁVEL POR ANO */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Alíquotas Vigentes & Simulador Setorial ({selectedYear})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Valores pré-preenchidos conforme o cronograma oficial da LC 214/2025. Altere para
                simular cenários setoriais (ex: saúde 60% red., cesta básica 0%).
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResetYearRates(selectedYear)}
              className="text-xs font-mono border-slate-700 bg-slate-900 text-slate-300 hover:text-emerald-400 cursor-pointer h-7"
            >
              Restaurar Padrão Legal ({selectedYear})
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* CBS */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                CBS Federal (%)
              </label>
              <input
                type="text"
                defaultValue={formatNumberBR(currentYearRates.cbsRate, 2)}
                key={`cbs-${selectedYear}-${currentYearRates.cbsRate}`}
                onBlur={(e) => {
                  handleUpdateYearRate(selectedYear, 'cbsRate', e.target.value)
                  const parsed = parseBRNumber(e.target.value)
                  e.target.value = formatNumberBR(parsed, 2)
                }}
                className="w-full rounded-lg px-2.5 py-1.5 text-sm font-mono text-right outline-none field-input-interactive"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {selectedYear === 2026 ? 'Ano teste' : 'Ref. Plena'}
              </span>
            </div>

            {/* IBS */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                IBS Subnacional (%)
              </label>
              <input
                type="text"
                defaultValue={formatNumberBR(currentYearRates.ibsRate, 2)}
                key={`ibs-${selectedYear}-${currentYearRates.ibsRate}`}
                onBlur={(e) => {
                  handleUpdateYearRate(selectedYear, 'ibsRate', e.target.value)
                  const parsed = parseBRNumber(e.target.value)
                  e.target.value = formatNumberBR(parsed, 2)
                }}
                className="w-full rounded-lg px-2.5 py-1.5 text-sm font-mono text-right outline-none field-input-interactive"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Estados & Municípios</span>
            </div>

            {/* ICMS Redução */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Proporção ICMS
              </label>
              <div className="px-2.5 py-1.5 text-sm font-mono text-white text-right bg-slate-950 rounded-lg border border-slate-800">
                {currentYearRates.icmsFactor > 0
                  ? `${(currentYearRates.icmsFactor * 100).toFixed(1)}%`
                  : 'EXTINTO'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {selectedYear >= 2029 && selectedYear <= 2032
                  ? `Queda de ${2033 - selectedYear}/11`
                  : selectedYear >= 2033
                    ? '100% extinto'
                    : '100% integral'}
              </span>
            </div>

            {/* PIS / COFINS */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                PIS / COFINS
              </label>
              <div className="px-2.5 py-1.5 text-sm font-mono text-white text-right bg-slate-950 rounded-lg border border-slate-800">
                {selectedYear === 2026 ? 'Integral' : 'EXTINTOS'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {selectedYear === 2026 ? 'Compensável c/ CBS' : 'Extintos em 2027'}
              </span>
            </div>

            {/* IPI */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <label className="text-[11px] font-mono text-slate-400 block mb-1">IPI</label>
              <div className="px-2.5 py-1.5 text-sm font-mono text-white text-right bg-slate-950 rounded-lg border border-slate-800">
                {selectedYear === 2026
                  ? 'Integral'
                  : selectedYear === 2027
                    ? 'Alíq. Zero'
                    : 'EXTINTO'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {selectedYear === 2026
                  ? 'Vigente'
                  : selectedYear === 2027
                    ? 'Zerado (salvo ZFM)'
                    : 'Extinto em 2028'}
              </span>
            </div>

            {/* Imposto Seletivo */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Imposto Seletivo (%)
              </label>
              <input
                type="text"
                disabled={!reformaState.enableImpostoSeletivo || selectedYear < 2027}
                defaultValue={formatNumberBR(currentYearRates.isRate, 2)}
                key={`is-${selectedYear}-${currentYearRates.isRate}`}
                onBlur={(e) => {
                  handleUpdateYearRate(selectedYear, 'isRate', e.target.value)
                  const parsed = parseBRNumber(e.target.value)
                  e.target.value = formatNumberBR(parsed, 2)
                }}
                className="w-full disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-400 disabled:opacity-40 rounded-lg px-2.5 py-1.5 text-sm font-mono text-right outline-none field-input-interactive"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {reformaState.enableImpostoSeletivo ? 'Incide s/ base' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. CARDS DE RESUMO EXECUTIVO DO ANO SELECIONADO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Carga Tributária no Ano */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase">
              Carga Tributária ({selectedYear})
            </span>
            <div className="my-2">
              <span className="text-2xl font-bold font-mono text-white">
                {formatBRL(currentYearCalc.totalYearTaxBurden)}
              </span>
              <span className="text-xs text-emerald-400 font-mono block mt-0.5">
                Alíquota efetiva: {formatPercentBR(currentYearCalc.effectiveYearTaxRate)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Novo sistema (IBS/CBS) + Residual antigo
            </span>
          </div>

          {/* Confronto vs Regime Atual */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              currentYearCalc.isReformaBetter
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-slate-400">
                vs {currentRegimeName}
              </span>
              {currentYearCalc.isReformaBetter ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                  ECONOMIA
                </Badge>
              ) : (
                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]">
                  MAIOR CARGA
                </Badge>
              )}
            </div>
            <div className="my-2">
              <span
                className={`text-2xl font-bold font-mono ${
                  currentYearCalc.isReformaBetter ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {currentYearCalc.isReformaBetter
                  ? `-${formatBRL(Math.abs(currentYearCalc.taxBurdenDifference))}`
                  : `+${formatBRL(currentYearCalc.taxBurdenDifference)}`}
              </span>
              <span className="text-xs text-slate-300 font-mono block mt-0.5">
                Carga Atual: {formatBRL(currentYearCalc.currentTaxBurden)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {currentYearCalc.isReformaBetter
                ? 'Novo modelo supera o regime atual'
                : 'Regime atual ainda mais favorável'}
            </span>
          </div>

          {/* Créditos Amplos Apurados (Não Cumulatividade Ampla) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase">
              Créditos Amplos de Entrada
            </span>
            <div className="my-2">
              <span className="text-2xl font-bold font-mono text-teal-400">
                {formatBRL(currentYearCalc.totalCreditoNovo)}
              </span>
              <span className="text-xs text-slate-400 font-mono block mt-0.5">
                Compras:{' '}
                {formatBRL(currentYearCalc.creditoComprasCbs + currentYearCalc.creditoComprasIbs)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Insumos/Serviços:{' '}
              {formatBRL(
                currentYearCalc.creditoInsumosServicosCbs +
                  currentYearCalc.creditoInsumosServicosIbs,
              )}
            </span>
          </div>

          {/* Lucro Líquido Projetado */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase">
              Lucro Líquido Projetado ({selectedYear})
            </span>
            <div className="my-2">
              <span className="text-2xl font-bold font-mono text-white">
                {formatBRL(currentYearCalc.projectedNetProfit)}
              </span>
              <span className="text-xs text-emerald-400 font-mono block mt-0.5">
                Margem: {formatPercentBR(currentYearCalc.projectedNetMargin)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Margem Atual: {formatPercentBR(currentNetMargin)}
            </span>
          </div>
        </div>

        {/* 4. COMPARATIVO HÍBRIDO E PLANO DE VOO ANO A ANO (O CORAÇÃO) */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                Plano de Voo Tributário 2026–2033 (Confronto Direto)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Trajetória completa da mesma operação ao longo de toda a transição, indicando o
                melhor caminho por ano e o ponto de virada.
              </p>
            </div>

            {flightPlan.turningPointYear && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Ponto de Virada: <strong>Ano {flightPlan.turningPointYear}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Tabela do Plano de Voo */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                  <th className="py-2.5 px-3 text-left">Ano</th>
                  <th className="py-2.5 px-3 text-left">Fase Legal</th>
                  <th className="py-2.5 px-3 text-right">CBS (%)</th>
                  <th className="py-2.5 px-3 text-right">IBS (%)</th>
                  <th className="py-2.5 px-3 text-right">Carga Anual (R$)</th>
                  <th className="py-2.5 px-3 text-right">Alíq. Efetiva</th>
                  <th className="py-2.5 px-3 text-right">Carga Atual ({currentRegimeName})</th>
                  <th className="py-2.5 px-3 text-right">Diferença vs Atual</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {flightPlan.yearlyResults.map((r) => {
                  const isCurrentSelected = r.year === selectedYear
                  const isBetter = r.isReformaBetter
                  return (
                    <tr
                      key={r.year}
                      onClick={() => setSelectedReformaYear(r.year)}
                      className={`cursor-pointer transition-colors ${
                        isCurrentSelected
                          ? 'bg-emerald-950/40 text-white font-semibold'
                          : 'hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                        {r.year}
                        {isCurrentSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-[200px]">
                        {r.phaseTitle}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {formatPercentBR(DEFAULT_REFORMA_SCHEDULE[r.year].cbsRate)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {formatPercentBR(DEFAULT_REFORMA_SCHEDULE[r.year].ibsRate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        {formatBRL(r.totalYearTaxBurden)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {formatPercentBR(r.effectiveYearTaxRate)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        {formatBRL(r.currentTaxBurden)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          isBetter ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isBetter
                          ? `-${formatBRL(Math.abs(r.taxBurdenDifference))}`
                          : `+${formatBRL(r.taxBurdenDifference)}`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isBetter ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                            Reforma Vence
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                            Atual Vence
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. PRECIFICAÇÃO "POR DENTRO VS POR FORA" */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Preço Por Fora */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Precificação: Por Dentro (Atual) vs Por Fora (IBS/CBS)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              No modelo atual, os impostos integram sua própria base de cálculo (cálculo por
              dentro). Na Reforma Tributária, IBS e CBS são adicionados <strong>por fora</strong>{' '}
              sobre o valor líquido, garantindo transparência fiscal e eliminando o imposto sobre
              imposto.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] font-mono text-slate-400 block">
                  Preço Unitário Atual (Por Dentro)
                </span>
                <span className="text-lg font-bold font-mono text-white mt-1 block">
                  {formatBRL(currentYearCalc.pricingComparison.currentUnitPrice)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                  Carga embutida: ~
                  {currentYearCalc.pricingComparison.taxInPricePercentCurrent.toFixed(1)}%
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <span className="text-[11px] font-mono text-emerald-300 block">
                  Preço Sugerido Novo (Por Fora)
                </span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                  {formatBRL(currentYearCalc.pricingComparison.suggestedUnitPriceNovo)}
                </span>
                <span className="text-[10px] text-emerald-300/80 font-mono mt-0.5 block">
                  Alíquota por fora: +
                  {currentYearCalc.pricingComparison.taxOnPricePercentNovo.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Preço Líquido (desonerado de tributos):</span>
              <strong className="text-white">
                {formatBRL(currentYearCalc.pricingComparison.netPriceExTaxes)}
              </strong>
            </div>
          </div>

          {/* 6. CRÉDITOS CRUZADOS 2026 E IMPOSTO SELETIVO */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Créditos Cruzados 2026 & Detalhes Operacionais
              </h3>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-300 font-semibold block">
                    Compensação CBS × PIS/COFINS (2026):
                  </span>
                  <span className="text-[10px] text-slate-500">
                    CBS 0,9% e IBS 0,1% pagos abatem a guia de PIS/COFINS
                  </span>
                </div>
                <strong className="text-emerald-400 text-sm">
                  {selectedYear === 2026
                    ? formatBRL(currentYearCalc.crossCreditCompensated2026)
                    : 'Não aplicável'}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-300 font-semibold block">
                    Imposto Seletivo Devido:
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Incidência monofásica extrafiscal (se produto selecionado)
                  </span>
                </div>
                <strong className="text-amber-400 text-sm">
                  {formatBRL(currentYearCalc.debitoImpostoSeletivo)}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-300 font-semibold block">
                    Crédito Amplo de Serviços & Energia:
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Aproveitamento integral na nova sistemática (LC 214/25)
                  </span>
                </div>
                <strong className="text-teal-400 text-sm">
                  {formatBRL(
                    currentYearCalc.creditoInsumosServicosCbs +
                      currentYearCalc.creditoInsumosServicosIbs,
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* 7. SIMPLES NACIONAL DENTRO DA REFORMA TRIBUTÁRIA */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#091b15]/90 via-[#071410]/95 to-[#050e0b]/95 border border-emerald-500/20 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                O Simples Nacional na Reforma Tributária (Pós-2033)
              </h3>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-xs">
              O Simples Continua Existindo
            </Badge>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans mb-4">
            A EC 132/23 preservou o tratamento diferenciado do Simples Nacional. As empresas
            optantes poderão escolher entre duas vias estratégicas:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                  Opção A · Guia Única DAS Tradicional
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ideal B2C</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Continua recolhendo tributos federais e subnacionais dentro da guia única
                simplificada. Transfere ao cliente PJ apenas o crédito proporcional ao que recolheu
                (~3% a 4%).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase font-mono">
                  Opção B · Apuração Regular IBS/CBS (Híbrido)
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Ideal B2B</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                A empresa recolhe IBS e CBS pelo regime regular por fora, gerando e transferindo
                crédito financeiro 100% integral a seus clientes PJ, mantendo IRPJ, CSLL e CPP
                dentro do Simples.
              </p>
            </div>
          </div>
        </div>

        {/* 8. EXPORTAÇÃO DE RELATÓRIO (PDF E EXCEL) */}
        <ExportReportButtons
          disabled={activeGrossRevenue <= 0}
          pdfTitle="Exportar Plano de Voo da Reforma em PDF"
          excelTitle="Exportar Simulação 2026-2033 em Excel"
          onExportPdf={() => {
            exportReformaToPdf({
              selectedYear,
              quantity: activeQuantity,
              totalGrossRevenue: activeGrossRevenue,
              currentRegimeName,
              currentTaxBurden,
              reformaTaxBurden: currentYearCalc.totalYearTaxBurden,
              taxDifference: currentYearCalc.taxBurdenDifference,
              isReformaBetter: currentYearCalc.isReformaBetter,
              turningPointYear: flightPlan.turningPointYear,
              totalTransitionSavings: flightPlan.totalTransitionSavings,
              yearlyFlightPlan: flightPlan.yearlyResults.map((r) => ({
                year: r.year,
                phaseTitle: r.phaseTitle,
                cbsRate: DEFAULT_REFORMA_SCHEDULE[r.year].cbsRate,
                ibsRate: DEFAULT_REFORMA_SCHEDULE[r.year].ibsRate,
                isRate: currentYearRates.isRate,
                taxBurden: r.totalYearTaxBurden,
                effectiveTaxRate: r.effectiveYearTaxRate,
                netProfit: r.projectedNetProfit,
                differenceVsCurrent: r.taxBurdenDifference,
              })),
              notes: [
                `Base Legal: Emenda Constitucional nº 132/2023 e Lei Complementar nº 214/2025.`,
                `Regime de confronto ativo: ${currentRegimeName} com carga de ${formatBRL(currentTaxBurden)}.`,
                flightPlan.turningPointYear
                  ? `Ponto de virada estimado no ano ${flightPlan.turningPointYear}, a partir do qual a nova sistemática gera economia real.`
                  : 'O regime atual mantém menor carga tributária ao longo do período para os dados informados.',
                'Não cumulatividade ampla: apropriação de créditos sobre insumos, mercadorias, serviços, energia e ativo imobilizado.',
                'O Simples Nacional segue plenamente vigente após 2033, com faculdade de opção por IBS/CBS regular para operações B2B.',
              ],
            })
          }}
          onExportExcel={() => {
            exportReformaToExcel({
              selectedYear,
              quantity: activeQuantity,
              totalGrossRevenue: activeGrossRevenue,
              currentRegimeName,
              currentTaxBurden,
              reformaTaxBurden: currentYearCalc.totalYearTaxBurden,
              taxDifference: currentYearCalc.taxBurdenDifference,
              isReformaBetter: currentYearCalc.isReformaBetter,
              turningPointYear: flightPlan.turningPointYear,
              totalTransitionSavings: flightPlan.totalTransitionSavings,
              yearlyFlightPlan: flightPlan.yearlyResults.map((r) => ({
                year: r.year,
                phaseTitle: r.phaseTitle,
                cbsRate: DEFAULT_REFORMA_SCHEDULE[r.year].cbsRate,
                ibsRate: DEFAULT_REFORMA_SCHEDULE[r.year].ibsRate,
                isRate: currentYearRates.isRate,
                taxBurden: r.totalYearTaxBurden,
                effectiveTaxRate: r.effectiveYearTaxRate,
                netProfit: r.projectedNetProfit,
                differenceVsCurrent: r.taxBurdenDifference,
              })),
              notes: [
                'Emenda Constitucional 132/2023 & Lei Complementar 214/2025.',
                'Valores e projeções calculados com base nos produtos do Markup, compras e despesas registradas.',
              ],
            })
          }}
        />
      </div>
    </DemoLayout>
  )
}
export default ReformaPage
