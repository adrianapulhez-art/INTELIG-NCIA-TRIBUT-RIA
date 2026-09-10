import React, { useState } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { useTaxContext, ActivityType } from '@/contexts/TaxContext'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  Link as LinkIcon,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { formatBRL, formatNumberBR, formatPercentBR, parseBRNumber } from '@/lib/taxCalculations'
import { calculatePayroll } from '@/lib/payrollCalculations'
import { PayrollSection } from '@/components/demo/PayrollSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScenarioManagerBar } from '@/components/demo/ScenarioManagerBar'
import { ExportReportButtons } from '@/components/demo/ExportReportButtons'
import { exportDreToPdf, exportDreToExcel } from '@/lib/exportReports'
import { CmvDetailedBreakdown } from '@/components/demo/CmvDetailedBreakdown'
import { PageHero } from '@/components/demo/PageHero'
import { MiniLalurSection } from '@/components/demo/MiniLalurSection'

import { Badge } from '@/components/ui/badge'

export default function DreRealPage() {
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
    icmsRateMarkup,
    realActivity,
    setRealActivity,
    realIssRate,
    setRealIssRate,
    realAdditions,
    setRealAdditions,
    realExclusions,
    setRealExclusions,
    realLalurEntries,
    addRealLalurEntry,
    updateRealLalurEntry,
    removeRealLalurEntry,
    realQuantitySold,
    setRealQuantitySold,
    realExpenses,
    addRealExpense,
    updateRealExpense,
    removeRealExpense,
    isRealSimulated,
    simulateReal,
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
    stSubsystem,
    interstateSubsystem,
  } = useTaxContext()

  const { totalPurchasesQuantity } = useTaxContext()

  // Força o regime global da própria tela ao montar/trocar
  React.useEffect(() => {
    if (regime !== 'real') {
      setRegime('real')
    }
  }, [regime, setRegime])

  const [issInput, setIssInput] = useState<string>(
    realIssRate > 0 ? formatNumberBR(realIssRate) : '',
  )
  const [isIssFocused, setIsIssFocused] = useState(false)

  React.useEffect(() => {
    if (!isIssFocused) {
      setIssInput(realIssRate > 0 ? formatNumberBR(realIssRate) : '')
    }
  }, [realIssRate, isIssFocused])

  // Quantidade automática conectada diretamente ao Markup/Compras
  const automaticQuantity =
    totalConsolidatedQuantity > 0
      ? totalConsolidatedQuantity
      : (totalPurchasesQuantity || 0) > 0
        ? totalPurchasesQuantity || 0
        : realQuantitySold > 0
          ? realQuantitySold
          : 0

  // Garante que o estado compartilhado fique alinhado à quantidade automática
  React.useEffect(() => {
    if (automaticQuantity > 0 && realQuantitySold !== automaticQuantity) {
      setRealQuantitySold(automaticQuantity)
    }
  }, [automaticQuantity, realQuantitySold, setRealQuantitySold])

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

  const isServices = realActivity === 'servicos'

  // Quantidade de referência
  const initialQtyVal = automaticQuantity

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
    hasConsolidated && (initialQtyVal === totalConsolidatedQuantity || initialQtyVal === 0)
      ? totalConsolidatedRevenue
      : Math.round(unitGrossRevenue * (initialQtyVal > 0 ? initialQtyVal : 1) * 100) / 100

  // CMV via Compras (Lucro Real):
  // IDENTIDADE ESTRITA:
  // - CMV unitário = SEMPRE o custo unitário líquido do regime apurado via Compras com 2 casas decimais.
  const isAutoInventory = calculatedPurchases.autoInventoryDeductionActive
  const rawUnitReal =
    calculatedPurchases.unitCostRealEffective > 0
      ? calculatedPurchases.unitCostRealEffective
      : (totalPurchasesQuantity || 0) > 0
        ? (calculatedPurchases.cmvReal || 0) / totalPurchasesQuantity
        : calculatedPurchases.cmvReal || 0
  const unitCMV = Math.round(rawUnitReal * 100) / 100

  // 4. CMV CONSOLIDADO:
  // Regra de ouro: total = round(unitário arredondado × quantidade efetiva) centavo a centavo
  const effectiveSoldQtyForCmv = isAutoInventory
    ? Math.min(initialQtyVal, calculatedPurchases.totalAvailableUnits)
    : initialQtyVal
  const consolidatedCMV =
    unitCMV > 0
      ? Math.round(unitCMV * effectiveSoldQtyForCmv * 100) / 100
      : totalConsolidatedCost > 0
        ? totalConsolidatedCost
        : 0

  // Alíquotas fixas do Lucro Real
  const icmsRate = icmsRateMarkup || 0
  const issRate = isServices ? realIssRate : 0
  const pisRate = 1.65
  const cofinsRate = 7.6
  const irpjRate = 15.0
  const irpjAdditionalRate = 10.0
  const irpjAdditionalLimit = 60000.0 // R$ 60.000,00 trimestral
  const csllRate = 9.0

  // CÁLCULO DE FOLHA E ENCARGOS PATRONAIS
  const payrollResult = calculatePayroll({
    payrollSalaries,
    proLabore: payrollProLabore,
    inssPatronalRate: payrollInssRate,
    ratRate: payrollRatRate,
    terceirosRate: payrollTerceirosRate,
  })

  // Despesas com pessoal e encargos patronais (Folha + Pró-labore + Encargos Patronais)
  const totalLaborExpenses = payrollResult.totalLaborExpense
  // Outras despesas operacionais dinâmicas cadastradas
  const totalOtherExpenses = realExpenses.reduce((acc, exp) => acc + (exp.value || 0), 0)
  // Despesas operacionais totais (incluindo folha e encargos, todas dedutíveis no Lucro Real)
  const totalExpenses = totalOtherExpenses + totalLaborExpenses

  // CÁLCULOS UNITÁRIOS (PADRONIZADOS POR UNIDADE COM 2 CASAS DECIMAIS)
  // 1. Receita bruta unitária
  const unitGross = unitGrossRevenue
  // 2. Tributo municipal/estadual unitário (ICMS para comércio/indústria, ISSQN para serviços)
  const unitMunicipalStateTax =
    Math.round((isServices ? (unitGross * issRate) / 100 : (unitGross * icmsRate) / 100) * 100) /
    100

  // 3. Base PIS/COFINS unitária:
  // Se Comércio/Indústria: Tese do século (exclui o ICMS)
  // Se Serviços: Tese do século NÃO se aplica ao ISS — base é a receita bruta
  const unitPisCofinsBase = isServices
    ? unitGross
    : Math.round(Math.max(0, unitGross - unitMunicipalStateTax) * 100) / 100

  // 4. PIS não cumulativo unitário
  const unitPis = Math.round(((unitPisCofinsBase * pisRate) / 100) * 100) / 100
  // 5. COFINS não cumulativo unitário
  const unitCofins = Math.round(((unitPisCofinsBase * cofinsRate) / 100) * 100) / 100
  // 6. Receita líquida unitária
  const unitNetRevenue =
    Math.round((unitGross - unitMunicipalStateTax - unitPis - unitCofins) * 100) / 100
  // 7. CMV unitário (líquido de créditos)
  const unitCmvVal = unitCMV
  // 8. Lucro bruto unitário
  const unitGrossProfit = Math.round((unitNetRevenue - unitCmvVal) * 100) / 100

  // Quantidade efetiva: usa diretamente a quantidade automática ligada ao Markup/Compras
  const effectiveQuantity = automaticQuantity
  const qty = effectiveQuantity

  // 9. Despesas operacionais unitárias
  const unitExpenses = qty > 0 ? Math.round((totalExpenses / qty) * 100) / 100 : 0
  // 10. Resultado antes IRPJ/CSLL
  const unitResultBeforeTax = Math.round((unitGrossProfit - unitExpenses) * 100) / 100

  // CÁLCULOS TOTAIS (Regra de ouro: total = round(unitário arredondado × quantidade), batendo centavo a centavo)
  const totalGross =
    hasConsolidated &&
    (qty === totalConsolidatedQuantity || (qty === 1 && totalConsolidatedQuantity <= 1))
      ? totalConsolidatedRevenue
      : Math.round(unitGross * (qty > 0 ? qty : 0) * 100) / 100

  const totalMunicipalStateTax = Math.round(unitMunicipalStateTax * (qty > 0 ? qty : 0) * 100) / 100
  const totalPisCofinsBase = Math.round(unitPisCofinsBase * (qty > 0 ? qty : 0) * 100) / 100
  const totalPis = Math.round(unitPis * (qty > 0 ? qty : 0) * 100) / 100
  const totalCofins = Math.round(unitCofins * (qty > 0 ? qty : 0) * 100) / 100
  const totalNetRevenue = Math.round(unitNetRevenue * (qty > 0 ? qty : 0) * 100) / 100
  const isQuantityExceeded =
    isAutoInventory &&
    calculatedPurchases.totalAvailableUnits > 0 &&
    qty > calculatedPurchases.totalAvailableUnits
  const totalCmv = consolidatedCMV
  const totalGrossProfit = Math.round((totalNetRevenue - totalCmv) * 100) / 100
  const totalResultBeforeTax = Math.round((totalGrossProfit - totalExpenses) * 100) / 100

  // Lucro Real (Base IRPJ / CSLL): Resultado antes dos tributos + Adições - Exclusões
  const totalAdditions = realAdditions || 0
  const totalExclusions = realExclusions || 0
  const taxableRealProfit = Math.max(0, totalResultBeforeTax + totalAdditions - totalExclusions)

  // IRPJ Total: 15% sobre o Lucro Real
  const totalIrpj = (taxableRealProfit * irpjRate) / 100
  // Adicional IRPJ: 10% sobre o que exceder R$ 60.000 do lucro real
  const totalIrpjExcess = Math.max(0, taxableRealProfit - irpjAdditionalLimit)
  const totalIrpjAdditional = (totalIrpjExcess * irpjAdditionalRate) / 100

  // CSLL Total: 9% sobre o Lucro Real
  const totalCsll = (taxableRealProfit * csllRate) / 100

  // Lucro Líquido Total
  const totalNetProfit = totalResultBeforeTax - totalIrpj - totalIrpjAdditional - totalCsll

  // Lucro líquido unitário
  const unitNetProfit = qty > 0 ? totalNetProfit / qty : unitResultBeforeTax

  // Cards de resumo
  // Carga tributária total = Tributo Municipal/Estadual + PIS + COFINS + IRPJ + Adicional IRPJ + CSLL + Encargos Patronais
  const totalTaxBurden =
    totalGross > 0
      ? totalMunicipalStateTax +
        totalPis +
        totalCofins +
        totalIrpj +
        totalIrpjAdditional +
        totalCsll +
        payrollResult.patronalChargesTotal
      : 0
  const netMargin = totalGross > 0 ? (totalNetProfit / totalGross) * 100 : 0
  return (
    <DemoLayout currentTab="dre-real">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Destaque Central Topo: Hero Banner estilo ADAPTA ONE */}
        <PageHero
          title="DRE — LUCRO REAL"
          subtitle={
            isServices
              ? 'Receita de serviços com ISSQN. PIS e COFINS não cumulativos sobre receita bruta, IRPJ e CSLL sobre o lucro real ajustado.'
              : 'PIS e COFINS não cumulativos com a tese do século (ICMS fora da base). IRPJ e CSLL sobre o lucro real ajustado.'
          }
          badge="REGIME NÃO CUMULATIVO · AJUSTES LALUR"
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
          <div className="flex items-center gap-3.5 pb-2 border-b border-emerald-500/15">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
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
              </div>
              <p className="text-xs text-slate-400">
                PIS 1,65% / COFINS 7,6% não cumulativos, deduções de créditos e apuração do Lucro
                Real no LALUR.
              </p>
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

          {/* Seletor de Atividade */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Selecione o setor de atividade
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    key: 'comercio',
                    title: 'Comércio',
                    subtitle: 'ICMS sobre a receita',
                  },
                  {
                    key: 'industria',
                    title: 'Indústria',
                    subtitle: 'ICMS sobre a receita',
                  },
                  {
                    key: 'servicos',
                    title: 'Serviços',
                    subtitle: 'ISSQN sobre a receita',
                  },
                ] as const
              ).map((act) => {
                const isSelected = realActivity === act.key
                return (
                  <button
                    key={act.key}
                    type="button"
                    onClick={() => setRealActivity(act.key as ActivityType)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono uppercase text-white">
                        {act.title}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">{act.subtitle}</p>
                  </button>
                )
              })}
            </div>

            {/* Campo aberto para Alíquota do ISSQN se atividade for Serviços */}
            {isServices && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/30 space-y-2 mt-3 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-emerald-300 block">
                      Alíquota do ISSQN (%)
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Informe o percentual municipal do ISS (ex.: 2,00% a 5,00%) incidente sobre a
                      receita de serviços.
                    </span>
                  </div>
                  <div className="relative w-36 sm:w-40">
                    <Input
                      type="text"
                      placeholder="0,00"
                      value={issInput}
                      onFocus={() => setIsIssFocused(true)}
                      onChange={(e) => {
                        const val = e.target.value
                        setIssInput(val)
                        setRealIssRate(parseBRNumber(val))
                      }}
                      onBlur={(e) => {
                        setIsIssFocused(false)
                        const val = parseBRNumber(e.target.value)
                        setRealIssRate(val)
                        setIssInput(val > 0 ? formatNumberBR(val) : '')
                      }}
                      className="pr-7 text-right bg-slate-900 border-orange-500/50 text-orange-50 font-mono text-xs focus:border-orange-500 focus-visible:ring-orange-500/30"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-orange-300 pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quadro: CMV pelo Lucro Real */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-200">
                CMV pelo Lucro Real
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ICMS, PIS e COFINS são recuperáveis e deduzem o custo.
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Estoque inicial (EI)</span>
                <span className="text-slate-200">{formatBRL(initialInventory)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">(+) Acréscimos ao custo</span>
                <span className="text-slate-200">
                  {formatBRL(calculatedPurchases.totalAdditions)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">
                  (−) Deduções (devoluções, créditos de ICMS, PIS e COFINS)
                </span>
                <span className="text-slate-400">
                  -
                  {formatBRL(
                    calculatedPurchases.totalDeductionsBase +
                      calculatedPurchases.icmsResult +
                      calculatedPurchases.icmsFreightResult +
                      calculatedPurchases.pisResult +
                      calculatedPurchases.cofinsResult +
                      calculatedPurchases.pisFreightResult +
                      calculatedPurchases.cofinsFreightResult,
                  )}
                </span>
              </div>
              <div className="py-1.5 flex justify-between font-bold">
                <span className="text-slate-300">(=) Compras líquidas (CL)</span>
                <span className="text-slate-100">
                  {formatBRL(calculatedPurchases.cmvRealNetPurchases)}
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
                    isAutoInventory ? calculatedPurchases.autoFinalInventoryReal : finalInventory,
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

          {/* Grid de Alíquotas do Regime (Bloqueadas com borda verde) */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase text-slate-300">
                Parâmetros e Alíquotas do Lucro Real
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                · preenchido automaticamente
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
              {isServices ? (
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-emerald-500/40">
                  <span className="text-[10px] text-emerald-400 block">ISSQN</span>
                  <span className="text-emerald-300 font-semibold">{formatNumberBR(issRate)}%</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ICMS</span>
                  <span className="text-slate-200 font-semibold">{formatNumberBR(icmsRate)}%</span>
                </div>
              )}
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 block">PIS não cumulativo</span>
                <span className="text-emerald-300 font-semibold">{formatNumberBR(pisRate)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 block">COFINS não cumulativo</span>
                <span className="text-emerald-300 font-semibold">
                  {formatNumberBR(cofinsRate)}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">IRPJ</span>
                <span className="text-slate-200 font-semibold">{formatNumberBR(irpjRate)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Adicional IRPJ</span>
                <span className="text-slate-200 font-semibold">
                  {formatNumberBR(irpjAdditionalRate)}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">CSLL</span>
                <span className="text-slate-200 font-semibold">{formatNumberBR(csllRate)}%</span>
              </div>
            </div>
          </div>

          {/* Mini-LALUR Estruturado: Lançamentos Individuais de Adições e Exclusões */}
          <MiniLalurSection
            entries={realLalurEntries}
            onAddEntry={addRealLalurEntry}
            onUpdateEntry={updateRealLalurEntry}
            onRemoveEntry={removeRealLalurEntry}
            totalAdditions={totalAdditions}
            totalExclusions={totalExclusions}
          />

          {/* NOVO BLOCO: Folha e Pró-labore */}
          <PayrollSection
            payrollSalaries={payrollSalaries}
            setPayrollSalaries={setPayrollSalaries}
            payrollProLabore={payrollProLabore}
            setPayrollProLabore={setPayrollProLabore}
            payrollInssRate={payrollInssRate}
            setPayrollInssRate={setPayrollInssRate}
            payrollRatRate={payrollRatRate}
            setPayrollRatRate={setPayrollRatRate}
            payrollTerceirosRate={payrollTerceirosRate}
            setPayrollTerceirosRate={setPayrollTerceirosRate}
            calculation={payrollResult}
            regimeLabel="Lucro Real"
          />

          {/* Despesas Operacionais (valores totais) */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-semibold uppercase text-slate-200">
                  Despesas operacionais (valores totais)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Despesas deduzidas globalmente no resultado do período.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addRealExpense('Nova despesa operacional', 0)}
                className="h-7 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar despesa
              </Button>
            </div>

            <div className="space-y-2">
              {realExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80"
                >
                  <Input
                    type="text"
                    value={exp.description}
                    onChange={(e) => updateRealExpense(exp.id, 'description', e.target.value)}
                    placeholder="Descrição da despesa operacional..."
                    className="flex-1 text-xs font-mono field-input-interactive"
                  />
                  <div className="relative w-40">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                      R$
                    </span>
                    <Input
                      type="text"
                      defaultValue={exp.value > 0 ? formatNumberBR(exp.value) : ''}
                      key={`exp-${exp.id}-${exp.value}`}
                      onBlur={(e) => {
                        const parsed = parseBRNumber(e.target.value)
                        updateRealExpense(exp.id, 'value', parsed)
                        e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                      }}
                      placeholder="0,00"
                      className="pl-8 text-right text-xs font-mono field-input-interactive"
                    />
                  </div>{' '}
                  <button
                    type="button"
                    onClick={() => removeRealExpense(exp.id)}
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

              {!isRealSimulated && (
                <Button
                  type="button"
                  onClick={simulateReal}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95 text-xs sm:text-sm shrink-0"
                >
                  <Calculator className="w-4 h-4" />
                  Simular DRE
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quadro Demonstração do Resultado — condicionado à simulação */}
        {isRealSimulated ? (
          <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Demonstração do Resultado
              </h3>
              <span className="text-xs font-mono text-emerald-400">
                Lucro Real ({realActivity.toUpperCase()} · Não cumulativo)
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
                  {/* 1. Receita bruta */}
                  <tr>
                    <td className="py-2 text-left font-medium text-slate-200">
                      {isServices ? 'Receita bruta de serviços' : 'Receita bruta de vendas'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-200">{formatBRL(unitGross)}</td>
                    <td className="py-2 px-3 text-right text-slate-200">{formatBRL(totalGross)}</td>
                  </tr>

                  {/* 2. (-) ICMS ou (-) ISSQN */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">
                      {isServices
                        ? '(−) ISSQN'
                        : interstateSubsystem.enabled &&
                            interstateSubsystem.originUf !== interstateSubsystem.destinationUf
                          ? `(−) ICMS (${interstateSubsystem.originUf} → ${interstateSubsystem.destinationUf})`
                          : '(−) ICMS'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(unitMunicipalStateTax)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(totalMunicipalStateTax)}
                    </td>
                  </tr>

                  {/* Linhas de Subsistemas Especiais quando ativos */}
                  {interstateSubsystem.enabled &&
                    interstateSubsystem.originUf !== interstateSubsystem.destinationUf &&
                    interstateSubsystem.isEndConsumer &&
                    !interstateSubsystem.isTaxpayer && (
                      <tr className="text-blue-400/90 bg-blue-500/[0.04]">
                        <td className="py-2 text-left">
                          (−) DIFAL destino (EC 87/15 · {interstateSubsystem.destinationUf})
                        </td>
                        <td className="py-2 px-3 text-right">
                          -
                          {formatBRL(
                            qty > 0
                              ? (totalGross *
                                  Math.max(
                                    0,
                                    18 -
                                      (interstateSubsystem.originUf === 'SP' &&
                                      ['RJ', 'MG', 'RS', 'SC', 'PR'].includes(
                                        interstateSubsystem.destinationUf,
                                      )
                                        ? 12
                                        : 7),
                                  )) /
                                  100 /
                                  qty
                              : 0,
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          -
                          {formatBRL(
                            (totalGross *
                              Math.max(
                                0,
                                18 -
                                  (interstateSubsystem.originUf === 'SP' &&
                                  ['RJ', 'MG', 'RS', 'SC', 'PR'].includes(
                                    interstateSubsystem.destinationUf,
                                  )
                                    ? 12
                                    : 7),
                              )) /
                              100,
                          )}
                        </td>
                      </tr>
                    )}

                  {stSubsystem.enabled && stSubsystem.isSaleSubstituto && (
                    <tr className="text-amber-400/90 bg-amber-500/[0.04]">
                      <td className="py-2 text-left">
                        (+) ICMS-ST retido na venda (recolhido em favor do destino)
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatBRL(
                          qty > 0
                            ? (totalGross * (1 + (stSubsystem.mvaPercent || 0) / 100) * 0.18 -
                                totalGross * 0.12) /
                                qty
                            : 0,
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatBRL(
                          Math.max(
                            0,
                            totalGross * (1 + (stSubsystem.mvaPercent || 0) / 100) * 0.18 -
                              totalGross * 0.12,
                          ),
                        )}
                      </td>
                    </tr>
                  )}

                  {/* 3. Base PIS/COFINS [cinza informativa] */}
                  <tr className="bg-slate-900/30 text-slate-500">
                    <td className="py-2 text-left italic">
                      {isServices
                        ? 'Base PIS/COFINS (receita bruta s/ exclusão de ISS)'
                        : 'Base PIS/COFINS (tese do século · exclui ICMS)'}
                    </td>
                    <td className="py-2 px-3 text-right">{formatBRL(unitPisCofinsBase)}</td>
                    <td className="py-2 px-3 text-right">{formatBRL(totalPisCofinsBase)}</td>
                  </tr>

                  {/* 4. (-) PIS não cumulativo */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) PIS não cumulativo</td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(unitPis)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(totalPis)}</td>
                  </tr>

                  {/* 5. (-) COFINS não cumulativo */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) COFINS não cumulativo</td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(unitCofins)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(totalCofins)}
                    </td>
                  </tr>

                  {/* 6. = Receita líquida */}
                  <tr className="bg-slate-950/40 font-bold text-slate-100">
                    <td className="py-2.5 text-left">= Receita líquida</td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(unitNetRevenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(totalNetRevenue)}
                    </td>
                  </tr>

                  {/* 7. (-) CMV (líquido de créditos) */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span>(−) CMV (líquido de créditos)</span>
                          {isAutoInventory && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              · automático (baixa por quantidade)
                            </span>
                          )}
                        </div>
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
                        forcedRegime="real"
                        quantitySold={qty}
                        title="Ver composição e deduções do CMV (Lucro Real)"
                        variant="embedded"
                      />
                    </td>
                  </tr>

                  {/* 8. = Lucro bruto */}
                  <tr className="bg-slate-950/40 font-bold text-slate-100">
                    <td className="py-2.5 text-left">= Lucro bruto</td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(unitGrossProfit)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(totalGrossProfit)}
                    </td>
                  </tr>

                  {/* 9. Linhas de Folha e Encargos (Dedutíveis no Lucro Real) */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) Folha de salários</td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(qty > 0 ? payrollSalaries / qty : 0)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(payrollSalaries)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 text-left text-slate-400">
                      (−) Pró-labore dos sócios (dedutível)
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(qty > 0 ? payrollProLabore / qty : 0)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(payrollProLabore)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 text-left text-slate-400">
                      (−) Encargos patronais (INSS {formatNumberBR(payrollInssRate)}% + RAT +
                      Terceiros)
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(qty > 0 ? payrollResult.patronalChargesTotal / qty : 0)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(payrollResult.patronalChargesTotal)}
                    </td>
                  </tr>

                  {/* 10. (-) Outras Despesas operacionais */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">
                      (−) Outras despesas operacionais
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(qty > 0 ? totalOtherExpenses / qty : 0)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(totalOtherExpenses)}
                    </td>
                  </tr>

                  {/* 11. = Resultado antes do IRPJ/CSLL */}
                  <tr className="bg-slate-950/40 font-bold text-slate-100">
                    <td className="py-2.5 text-left">= Resultado antes do IRPJ/CSLL</td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(unitResultBeforeTax)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(totalResultBeforeTax)}
                    </td>
                  </tr>

                  {/* 11. (+) Adições [— no unitário] */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(+) Adições</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right text-slate-200">
                      {formatBRL(totalAdditions)}
                    </td>
                  </tr>

                  {/* 12. (-) Exclusões [— no unitário] */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) Exclusões</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(totalExclusions)}
                    </td>
                  </tr>

                  {/* 13. = Lucro real (base IRPJ/CSLL) [cinza/negrito, — no unitário] */}
                  <tr className="bg-slate-900/40 font-bold text-slate-300">
                    <td className="py-2.5 text-left">= Lucro real (base IRPJ/CSLL)</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-right text-slate-100">
                      {formatBRL(taxableRealProfit)}
                    </td>
                  </tr>

                  {/* 14. (-) IRPJ */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) IRPJ</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(totalIrpj)}</td>
                  </tr>

                  {/* 15. (-) Adicional de IRPJ */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) Adicional de IRPJ</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(totalIrpjAdditional)}
                    </td>
                  </tr>

                  {/* 16. (-) CSLL */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) CSLL</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(totalCsll)}</td>
                  </tr>

                  {/* 17. = Lucro líquido [fundo verde escuro, valores verde brilhante] */}
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

            {/* Cards de Resumo (3 lado a lado, conforme imagem anexada image-a391b) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono block mb-1">
                  Carga tributária total
                </span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {formatBRL(totalTaxBurden)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-400 font-mono block mb-1 font-semibold">
                  Lucro líquido
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {formatBRL(totalNetProfit)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono block mb-1">
                  Margem líquida
                </span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {formatPercentBR(netMargin)}
                </span>
              </div>
            </div>

            {/* Botões de Exportação (PDF e Excel) */}
            <ExportReportButtons
              disabled={!isRealSimulated}
              onExportPdf={() => {
                exportDreToPdf({
                  title: 'DRE — Lucro Real',
                  regimeName: `Lucro Real (${realActivity.toUpperCase()})`,
                  quantity: qty,
                  unitGrossRevenue: unitGross,
                  totalGrossRevenue: totalGross,
                  metadata: [
                    { label: 'Atividade', value: realActivity.toUpperCase() },
                    { label: 'Quantidade', value: `${qty} un.` },
                    { label: 'Lucro Real Tributável', value: formatBRL(taxableRealProfit) },
                    { label: 'Adições LALUR', value: formatBRL(totalAdditions) },
                    { label: 'Exclusões LALUR', value: formatBRL(totalExclusions) },
                    ...(stSubsystem.enabled
                      ? [{ label: 'Substituição Tributária', value: 'ATIVO' }]
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
                      description: isServices
                        ? 'Receita bruta de serviços'
                        : 'Receita bruta de vendas',
                      unitValue: unitGross,
                      totalValue: totalGross,
                    },
                    {
                      description: isServices ? '(−) ISSQN' : '(−) ICMS',
                      unitValue: -unitMunicipalStateTax,
                      totalValue: -totalMunicipalStateTax,
                    },
                    {
                      description: isServices
                        ? 'Base PIS/COFINS (receita bruta s/ exclusão de ISS)'
                        : 'Base PIS/COFINS (tese do século · exclui ICMS)',
                      unitValue: unitPisCofinsBase,
                      totalValue: totalPisCofinsBase,
                      isInformative: true,
                    },
                    {
                      description: '(−) PIS não cumulativo (1,65%)',
                      unitValue: -unitPis,
                      totalValue: -totalPis,
                    },
                    {
                      description: '(−) COFINS não cumulativa (7,60%)',
                      unitValue: -unitCofins,
                      totalValue: -totalCofins,
                    },
                    {
                      description: '(=) Receita líquida',
                      unitValue: unitNetRevenue,
                      totalValue: totalNetRevenue,
                      isSubtotal: true,
                    },
                    {
                      description: '(−) CMV (líquido de créditos)',
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
                      description: '(−) Folha de salários',
                      unitValue: qty > 0 ? -(payrollSalaries / qty) : 0,
                      totalValue: -payrollSalaries,
                    },
                    {
                      description: '(−) Pró-labore dos sócios',
                      unitValue: qty > 0 ? -(payrollProLabore / qty) : 0,
                      totalValue: -payrollProLabore,
                    },
                    {
                      description: `(−) Encargos patronais (INSS ${formatNumberBR(payrollInssRate)}% + RAT + Terceiros)`,
                      unitValue: qty > 0 ? -(payrollResult.patronalChargesTotal / qty) : 0,
                      totalValue: -payrollResult.patronalChargesTotal,
                    },
                    {
                      description: '(−) Outras despesas operacionais',
                      unitValue: qty > 0 ? -(totalOtherExpenses / qty) : 0,
                      totalValue: -totalOtherExpenses,
                    },
                    {
                      description: '(=) Resultado antes do IRPJ/CSLL',
                      unitValue: unitResultBeforeTax,
                      totalValue: totalResultBeforeTax,
                      isSubtotal: true,
                    },
                    {
                      description: `(+) Adições fiscais (LALUR) / (−) Exclusões`,
                      unitValue: '—',
                      totalValue: totalAdditions - totalExclusions,
                      isInformative: true,
                    },
                    {
                      description: `Base Lucro Real Tributável`,
                      unitValue: '—',
                      totalValue: taxableRealProfit,
                      isInformative: true,
                    },
                    {
                      description: '(−) IRPJ (15%)',
                      unitValue: '—',
                      totalValue: -totalIrpj,
                    },
                    {
                      description: '(−) Adicional de IRPJ (10%)',
                      unitValue: '—',
                      totalValue: -totalIrpjAdditional,
                    },
                    {
                      description: '(−) CSLL (9%)',
                      unitValue: '—',
                      totalValue: -totalCsll,
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
                      title: 'Carga tributária total',
                      value: formatBRL(totalTaxBurden),
                      numericValue: totalTaxBurden,
                      subtitle: `${formatPercentBR((totalTaxBurden / (totalGross || 1)) * 100)} da receita bruta`,
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
                    'PIS e COFINS não cumulativos apurados às alíquotas de 1,65% e 7,60% com direito a tomada de créditos sobre aquisições.',
                    'IRPJ (15% + adicional de 10% sobre o excedente a R$ 60.000,00 trimestral) e CSLL (9%) incidentes sobre o Lucro Real contábil ajustado no LALUR.',
                    'Despesas de salários, pró-labore e encargos patronais previdenciários dedutíveis integralmente da apuração do Lucro Real.',
                  ],
                })
              }}
              onExportExcel={() => {
                exportDreToExcel({
                  title: 'DRE — Lucro Real',
                  regimeName: `Lucro Real (${realActivity.toUpperCase()})`,
                  quantity: qty,
                  unitGrossRevenue: unitGross,
                  totalGrossRevenue: totalGross,
                  metadata: [
                    { label: 'Atividade', value: realActivity.toUpperCase() },
                    { label: 'Quantidade', value: `${qty} un.` },
                    { label: 'Lucro Real Tributável', value: formatBRL(taxableRealProfit) },
                    { label: 'Adições LALUR', value: formatBRL(totalAdditions) },
                    { label: 'Exclusões LALUR', value: formatBRL(totalExclusions) },
                    ...(stSubsystem.enabled
                      ? [{ label: 'Substituição Tributária', value: 'ATIVO' }]
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
                      description: isServices
                        ? 'Receita bruta de serviços'
                        : 'Receita bruta de vendas',
                      unitValue: unitGross,
                      totalValue: totalGross,
                    },
                    {
                      description: isServices ? '(−) ISSQN' : '(−) ICMS',
                      unitValue: -unitMunicipalStateTax,
                      totalValue: -totalMunicipalStateTax,
                    },
                    {
                      description: isServices
                        ? 'Base PIS/COFINS (receita bruta s/ exclusão de ISS)'
                        : 'Base PIS/COFINS (tese do século · exclui ICMS)',
                      unitValue: unitPisCofinsBase,
                      totalValue: totalPisCofinsBase,
                    },
                    {
                      description: '(−) PIS não cumulativo (1,65%)',
                      unitValue: -unitPis,
                      totalValue: -totalPis,
                    },
                    {
                      description: '(−) COFINS não cumulativa (7,60%)',
                      unitValue: -unitCofins,
                      totalValue: -totalCofins,
                    },
                    {
                      description: '(=) Receita líquida',
                      unitValue: unitNetRevenue,
                      totalValue: totalNetRevenue,
                    },
                    {
                      description: '(−) CMV (líquido de créditos)',
                      unitValue: -unitCmvVal,
                      totalValue: -totalCmv,
                    },
                    {
                      description: '(=) Lucro bruto',
                      unitValue: unitGrossProfit,
                      totalValue: totalGrossProfit,
                    },
                    {
                      description: '(−) Folha de salários',
                      unitValue: qty > 0 ? -(payrollSalaries / qty) : 0,
                      totalValue: -payrollSalaries,
                    },
                    {
                      description: '(−) Pró-labore dos sócios',
                      unitValue: qty > 0 ? -(payrollProLabore / qty) : 0,
                      totalValue: -payrollProLabore,
                    },
                    {
                      description: `(−) Encargos patronais (INSS ${formatNumberBR(payrollInssRate)}% + RAT + Terceiros)`,
                      unitValue: qty > 0 ? -(payrollResult.patronalChargesTotal / qty) : 0,
                      totalValue: -payrollResult.patronalChargesTotal,
                    },
                    {
                      description: '(−) Outras despesas operacionais',
                      unitValue: qty > 0 ? -(totalOtherExpenses / qty) : 0,
                      totalValue: -totalOtherExpenses,
                    },
                    {
                      description: '(=) Resultado antes do IRPJ/CSLL',
                      unitValue: unitResultBeforeTax,
                      totalValue: totalResultBeforeTax,
                    },
                    {
                      description: `(+) Adições fiscais (LALUR) / (−) Exclusões`,
                      unitValue: null,
                      totalValue: totalAdditions - totalExclusions,
                    },
                    {
                      description: `Base Lucro Real Tributável`,
                      unitValue: null,
                      totalValue: taxableRealProfit,
                    },
                    {
                      description: '(−) IRPJ (15%)',
                      unitValue: null,
                      totalValue: -totalIrpj,
                    },
                    {
                      description: '(−) Adicional de IRPJ (10%)',
                      unitValue: null,
                      totalValue: -totalIrpjAdditional,
                    },
                    {
                      description: '(−) CSLL (9%)',
                      unitValue: null,
                      totalValue: -totalCsll,
                    },
                    {
                      description: '(=) Lucro líquido',
                      unitValue: unitNetProfit,
                      totalValue: totalNetProfit,
                    },
                  ],
                  summaryCards: [
                    {
                      title: 'Carga tributária total',
                      value: formatBRL(totalTaxBurden),
                      numericValue: totalTaxBurden,
                      subtitle: `${formatPercentBR((totalTaxBurden / (totalGross || 1)) * 100)} da receita bruta`,
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
                    'PIS e COFINS não cumulativos apurados às alíquotas de 1,65% e 7,60% com direito a tomada de créditos sobre aquisições.',
                    'IRPJ (15% + adicional de 10% sobre o excedente a R$ 60.000,00 trimestral) e CSLL (9%) incidentes sobre o Lucro Real contábil ajustado no LALUR.',
                    'Despesas de salários, pró-labore e encargos patronais previdenciários dedutíveis integralmente da apuração do Lucro Real.',
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
                da DRE do Lucro Real com as deduções de créditos e LALUR.
              </p>
            </div>
          </div>
        )}

        {/* Barra de Gerenciamento de Cenários no fim da página (padrão Markup) */}
        <div className="pt-2">
          <ScenarioManagerBar />
        </div>

        {/* Rodapé: Botões de navegação sequencial */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            onClick={() => navigate('/demo/markup')}
            className="bg-[#0f172a]/90 text-slate-300 border border-slate-700/80 hover:border-emerald-500/40 hover:text-white hover:bg-slate-800/80 font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Calculadora Markup</span>
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
