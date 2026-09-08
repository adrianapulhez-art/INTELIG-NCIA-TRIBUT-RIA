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

export default function DrePresumidoPage() {
  const navigate = useNavigate()
  const {
    simulatedSalePrice,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
    markupProducts,
    calculatedPurchases,
    initialInventory,
    finalInventory,
    icmsRateMarkup,
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
    isPresumidoSimulated,
    simulatePresumido,
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
  } = useTaxContext()

  // Se houver múltiplos produtos com quantidade preenchida no Markup, inicializa com o consolidado
  const defaultQty =
    totalConsolidatedQuantity > 0 ? totalConsolidatedQuantity : presumidoQuantitySold || 0

  const [qtyInput, setQtyInput] = useState<string>(defaultQty > 0 ? String(defaultQty) : '0')
  const [issInput, setIssInput] = useState<string>(
    presumidoIssRate > 0 ? formatNumberBR(presumidoIssRate) : '',
  )

  // Sincroniza o input quando o estado for resetado ou carregado via cenário
  React.useEffect(() => {
    if (presumidoQuantitySold === 0 && totalConsolidatedQuantity === 0) {
      setQtyInput('0')
    } else {
      setQtyInput(String(defaultQty))
    }
  }, [presumidoQuantitySold, totalConsolidatedQuantity, defaultQty])

  React.useEffect(() => {
    setIssInput(presumidoIssRate > 0 ? formatNumberBR(presumidoIssRate) : '')
  }, [presumidoIssRate])

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQtyInput(val)
    const parsed = parseInt(val, 10)
    setPresumidoQuantitySold(isNaN(parsed) || parsed < 0 ? 0 : parsed)
  }

  const isServices = presumidoActivity === 'servicos'

  // RECEITA BRUTA:
  // Se houver múltiplos produtos com receita consolidada simulada (> 0), usa a receita consolidada.
  // Caso contrário, usa o simulatedSalePrice unitário.
  const hasConsolidated = totalConsolidatedRevenue > 0
  const activeGrossRevenue = hasConsolidated ? totalConsolidatedRevenue : simulatedSalePrice || 0
  // CMV unitário via Compras (Presumido)
  const unitCMV = calculatedPurchases.cmvPresumido || 0

  // Atividade e alíquotas de presunção (Lei 9.249/95 art. 15 e 20)
  // Comércio: IRPJ 8%, CSLL 12%
  // Indústria: IRPJ 8%, CSLL 12%
  // Serviços: IRPJ 32%, CSLL 32%
  const irpjPresumptionRate = isServices ? 32.0 : 8.0
  const csllPresumptionRate = isServices ? 32.0 : 12.0

  // Alíquotas fixas da legislação
  const icmsRate = icmsRateMarkup || 0 // Vem da alíquota livre da calculadora
  const issRate = isServices ? presumidoIssRate : 0
  const pisRate = 0.65
  const cofinsRate = 3.0
  const irpjRate = 15.0
  const irpjAdditionalRate = 10.0
  const irpjAdditionalLimit = 60000.0 // Trimestral (R$ 60.000,00)
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
  const totalOtherExpenses = presumidoExpenses.reduce((acc, exp) => acc + (exp.value || 0), 0)
  // Despesas operacionais totais (incluindo folha e encargos)
  const totalExpenses = totalOtherExpenses + totalLaborExpenses

  // CÁLCULOS UNITÁRIOS
  // 1. Receita bruta
  const unitGross = activeGrossRevenue
  // 2. Tributo municipal/estadual unitário (ICMS para comércio/indústria, ISSQN para serviços)
  const unitMunicipalStateTax = isServices
    ? (unitGross * issRate) / 100
    : (unitGross * icmsRate) / 100

  // 3. Base PIS/COFINS:
  // Se Comércio/Indústria: Tese do século (exclui o ICMS)
  // Se Serviços: Tese do século NÃO se aplica ao ISS — base é a receita bruta
  const unitPisCofinsBase = isServices ? unitGross : Math.max(0, unitGross - unitMunicipalStateTax)

  // 4. PIS unitário
  const unitPis = (unitPisCofinsBase * pisRate) / 100
  // 5. COFINS unitário
  const unitCofins = (unitPisCofinsBase * cofinsRate) / 100
  // 6. Receita líquida
  const unitNetRevenue = unitGross - unitMunicipalStateTax - unitPis - unitCofins
  // 7. CMV unitário
  const unitCmvVal = unitCMV
  // 8. Lucro bruto unitário
  const unitGrossProfit = unitNetRevenue - unitCmvVal

  // Quantidade efetiva
  const effectiveQuantity =
    presumidoQuantitySold > 0
      ? presumidoQuantitySold
      : totalConsolidatedQuantity > 0
        ? totalConsolidatedQuantity
        : 0

  // 9. Despesas operacionais unitárias (despesas totais divididas pela quantidade, se qtd > 0)
  const unitExpenses = effectiveQuantity > 0 ? totalExpenses / effectiveQuantity : 0
  // 10. Resultado antes IRPJ/CSLL unitário
  const unitResultBeforeTax = unitGrossProfit - unitExpenses

  // CÁLCULOS TOTAIS:
  // Se a receita veio de consolidado multi-produtos e o usuário não digitou multiplicador diferente (qty <= 1 ou igual à soma dos produtos):
  // O valor total é a receita consolidada integral.
  // Quando qty > 1, multiplica conforme o padrão do sistema (ou se o usuário ajustou a quantidade na DRE).
  const qty = effectiveQuantity
  // Multiplicador da coluna Total: se qty === 0, Total = 0. Se qty > 0:
  // Quando há consolidado e a quantidade informada coincide com a quantidade consolidada, o totalGross já é o totalConsolidatedRevenue.
  const totalGross =
    hasConsolidated && (qty === totalConsolidatedQuantity || qty === 1)
      ? totalConsolidatedRevenue
      : unitGross * (qty > 0 ? qty : 0)

  const totalMunicipalStateTax = isServices
    ? (totalGross * issRate) / 100
    : (totalGross * icmsRate) / 100

  const totalPisCofinsBase = isServices
    ? totalGross
    : Math.max(0, totalGross - totalMunicipalStateTax)
  const totalPis = (totalPisCofinsBase * pisRate) / 100
  const totalCofins = (totalPisCofinsBase * cofinsRate) / 100
  const totalNetRevenue = totalGross - totalMunicipalStateTax - totalPis - totalCofins
  const totalCmv = unitCmvVal * qty
  const totalGrossProfit = totalNetRevenue - totalCmv
  const totalResultBeforeTax = totalGrossProfit - totalExpenses

  // Base presumida IRPJ e CSLL (calculada sobre a Receita Bruta Total)
  const totalIrpjBase = (totalGross * irpjPresumptionRate) / 100
  const totalCsllBase = (totalGross * csllPresumptionRate) / 100

  // IRPJ Total: 15% sobre a base presumida
  const totalIrpj = (totalIrpjBase * irpjRate) / 100
  // Adicional IRPJ: 10% sobre o que exceder R$ 60.000 da base presumida
  const totalIrpjExcess = Math.max(0, totalIrpjBase - irpjAdditionalLimit)
  const totalIrpjAdditional = (totalIrpjExcess * irpjAdditionalRate) / 100

  // CSLL Total: 9% sobre a base presumida
  const totalCsll = (totalCsllBase * csllRate) / 100

  // Lucro Líquido Total
  const totalNetProfit = totalResultBeforeTax - totalIrpj - totalIrpjAdditional - totalCsll

  // Lucro líquido unitário (quando há quantidade)
  const unitNetProfit = qty > 0 ? totalNetProfit / qty : unitResultBeforeTax

  // Cards de resumo
  // Carga tributária total = Tributo Municipal/Estadual + PIS + COFINS + IRPJ + Adicional IRPJ + CSLL + Encargos Patronais (INSS/RAT/Terceiros)
  const totalTaxBurden =
    totalMunicipalStateTax +
    totalPis +
    totalCofins +
    totalIrpj +
    totalIrpjAdditional +
    totalCsll +
    payrollResult.patronalChargesTotal
  const netMargin = totalGross > 0 ? (totalNetProfit / totalGross) * 100 : 0

  return (
    <DemoLayout currentTab="dre-presumido">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                DRE — Lucro Presumido
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {isServices
                  ? 'Receita de serviços com ISSQN e presunções específicas (32%). Valores por unidade e conforme a quantidade informada.'
                  : 'PIS e COFINS calculados com a tese do século (ICMS excluído da base). Valores por unidade e conforme a quantidade informada.'}
              </p>
            </div>
          </div>

          {/* Faixa Verde: Conectado às calculadoras */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <LinkIcon className="w-4 h-4" />
              <span>Conectado às calculadoras — valores importados automaticamente</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <div>
                Receita Markup {hasConsolidated ? '(consolidada)' : ''}:{' '}
                <strong className="text-emerald-400">{formatBRL(activeGrossRevenue)}</strong>
              </div>
              <div>
                CMV (Compras): <strong className="text-emerald-400">{formatBRL(unitCMV)}</strong>
              </div>
            </div>
          </div>

          {/* Quadro: CMV pelo Lucro Presumido */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-200">
                CMV pelo Lucro Presumido
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                PIS/COFINS não são recuperáveis e integram o custo; apenas o ICMS deduz.
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
                  (−) Deduções (devoluções, abatimentos, descontos)
                </span>
                <span className="text-slate-400">
                  -{formatBRL(calculatedPurchases.totalDeductionsBase)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">(−) ICMS recuperável</span>
                <span className="text-slate-400">-{formatBRL(calculatedPurchases.icmsResult)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">(−) ICMS sobre frete recuperável</span>
                <span className="text-slate-400">
                  -{formatBRL(calculatedPurchases.icmsFreightResult)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between font-bold">
                <span className="text-slate-300">(=) Compras líquidas (CL)</span>
                <span className="text-slate-100">
                  {formatBRL(calculatedPurchases.cmvPresumidoNetPurchases)}
                </span>
              </div>
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
                const isSelected = presumidoActivity === act.key
                return (
                  <button
                    key={act.key}
                    type="button"
                    onClick={() => setPresumidoActivity(act.key as ActivityType)}
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
                      onChange={(e) => {
                        const val = e.target.value
                        setIssInput(val)
                        setPresumidoIssRate(parseBRNumber(val))
                      }}
                      className="pr-7 text-right bg-slate-900 border-emerald-500/50 text-slate-100 font-mono text-xs focus:border-emerald-400 focus:ring-emerald-500/20"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Campos Automáticos Bloqueados */}
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
                  · automático (via Compras)
                </span>
              </div>
              <div className="h-10 px-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/40 flex items-center justify-between font-mono text-sm text-slate-100">
                <span className="text-slate-500 text-xs">R$</span>
                <span className="font-bold text-emerald-400">{formatNumberBR(unitCMV)}</span>
              </div>
            </div>
          </div>

          {/* Grid de Alíquotas do Regime (Bloqueadas com borda verde) */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase text-slate-300">
                Parâmetros e Alíquotas Legais
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                · preenchido automaticamente
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono text-xs">
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
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">PIS</span>
                <span className="text-slate-200 font-semibold">{formatNumberBR(pisRate)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">COFINS</span>
                <span className="text-slate-200 font-semibold">{formatNumberBR(cofinsRate)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 block">Presunção IRPJ</span>
                <span className="text-emerald-300 font-semibold">
                  {formatNumberBR(irpjPresumptionRate)}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 block">Presunção CSLL</span>
                <span className="text-emerald-300 font-semibold">
                  {formatNumberBR(csllPresumptionRate)}%
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
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 sm:col-span-2">
                <span className="text-[10px] text-slate-400 block">Limite do adicional</span>
                <span className="text-slate-200 font-semibold">
                  {formatBRL(irpjAdditionalLimit)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">CSLL</span>
                <span className="text-slate-200 font-semibold">{formatNumberBR(csllRate)}%</span>
              </div>
            </div>
          </div>

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
            regimeLabel="Lucro Presumido"
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
                onClick={() => addPresumidoExpense('Nova despesa operacional', 0)}
                className="h-7 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar despesa
              </Button>
            </div>

            <div className="space-y-2">
              {presumidoExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80"
                >
                  <Input
                    type="text"
                    value={exp.description}
                    onChange={(e) => updatePresumidoExpense(exp.id, 'description', e.target.value)}
                    placeholder="Descrição da despesa"
                    className="flex-1 bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-200"
                  />
                  <div className="relative w-36 sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
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
                      className="pl-8 text-right bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePresumidoExpense(exp.id)}
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
                  onChange={handleQtyChange}
                  className="bg-slate-950/80 border-slate-800 text-slate-100 font-mono text-sm focus:border-emerald-500"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={simulatePresumido}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <Calculator className="w-4 h-4" />
              Simular DRE
            </Button>
          </div>
        </div>

        {/* Quadro Demonstração do Resultado — condicionado à simulação */}
        {isPresumidoSimulated ? (
          <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Demonstração do Resultado
              </h3>
              <span className="text-xs font-mono text-emerald-400">
                Lucro Presumido ({presumidoActivity.toUpperCase()})
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
                      {isServices ? '(−) ISSQN' : '(−) ICMS'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(unitMunicipalStateTax)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(totalMunicipalStateTax)}
                    </td>
                  </tr>

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

                  {/* 4. (-) PIS */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) PIS</td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(unitPis)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(totalPis)}</td>
                  </tr>

                  {/* 5. (-) COFINS */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) COFINS</td>
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

                  {/* 7. (-) CMV */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) CMV</td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(unitCmvVal)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(totalCmv)}</td>
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

                  {/* 9. Linhas de Folha e Encargos */}
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
                    <td className="py-2 text-left text-slate-400">(−) Pró-labore dos sócios</td>
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

                  {/* 11. Base presumida IRPJ [cinza, só coluna Total] */}
                  <tr className="bg-slate-900/30 text-slate-500">
                    <td className="py-2 text-left italic">
                      Base presumida IRPJ ({formatNumberBR(irpjPresumptionRate)}%)
                    </td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right">{formatBRL(totalIrpjBase)}</td>
                  </tr>

                  {/* 12. (-) IRPJ */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) IRPJ</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(totalIrpj)}</td>
                  </tr>

                  {/* 13. (-) Adicional de IRPJ */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) Adicional de IRPJ</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      -{formatBRL(totalIrpjAdditional)}
                    </td>
                  </tr>

                  {/* 14. Base presumida CSLL [cinza] */}
                  <tr className="bg-slate-900/30 text-slate-500">
                    <td className="py-2 text-left italic">
                      Base presumida CSLL ({formatNumberBR(csllPresumptionRate)}%)
                    </td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right">{formatBRL(totalCsllBase)}</td>
                  </tr>

                  {/* 15. (-) CSLL */}
                  <tr>
                    <td className="py-2 text-left text-slate-400">(−) CSLL</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right text-slate-400">-{formatBRL(totalCsll)}</td>
                  </tr>

                  {/* 16. = Lucro líquido [fundo verde escuro, valores verde brilhante] */}
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

            {/* Cards de Resumo (3 lado a lado) */}
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
              disabled={!isPresumidoSimulated}
              onExportPdf={() => {
                exportDreToPdf({
                  title: 'DRE — Lucro Presumido',
                  regimeName: `Lucro Presumido (${presumidoActivity.toUpperCase()})`,
                  quantity: qty,
                  unitGrossRevenue: unitGross,
                  totalGrossRevenue: totalGross,
                  metadata: [
                    { label: 'Atividade', value: presumidoActivity.toUpperCase() },
                    { label: 'Quantidade', value: `${qty} un.` },
                    { label: 'Presunção IRPJ', value: `${formatNumberBR(irpjPresumptionRate)}%` },
                    { label: 'Presunção CSLL', value: `${formatNumberBR(csllPresumptionRate)}%` },
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
                      description: '(−) PIS (0,65%)',
                      unitValue: -unitPis,
                      totalValue: -totalPis,
                    },
                    {
                      description: '(−) COFINS (3,00%)',
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
                      description: '(−) CMV',
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
                      description: `Base presumida IRPJ (${formatNumberBR(irpjPresumptionRate)}%)`,
                      unitValue: '—',
                      totalValue: totalIrpjBase,
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
                      description: `Base presumida CSLL (${formatNumberBR(csllPresumptionRate)}%)`,
                      unitValue: '—',
                      totalValue: totalCsllBase,
                      isInformative: true,
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
                    'PIS e COFINS cumulativos calculados às alíquotas de 0,65% e 3,00%.',
                    isServices
                      ? 'Em serviços, a exclusão do ICMS da base do PIS/COFINS (Tema 69/STF) não se aplica ao ISSQN.'
                      : 'Exclusão do ICMS destacado da base de cálculo do PIS e da COFINS conforme jurisprudência pacificada pelo STF (Tema 69).',
                    'Adicional de IRPJ de 10% aplicado sobre a parcela da base de cálculo presumida trimestral que exceder R$ 60.000,00.',
                    'Encargos patronais previdenciários e de terceiros apurados de acordo com as alíquotas configuradas no módulo de Folha e Pró-labore.',
                  ],
                })
              }}
              onExportExcel={() => {
                exportDreToExcel({
                  title: 'DRE — Lucro Presumido',
                  regimeName: `Lucro Presumido (${presumidoActivity.toUpperCase()})`,
                  quantity: qty,
                  unitGrossRevenue: unitGross,
                  totalGrossRevenue: totalGross,
                  metadata: [
                    { label: 'Atividade', value: presumidoActivity.toUpperCase() },
                    { label: 'Quantidade', value: `${qty} un.` },
                    { label: 'Presunção IRPJ', value: `${formatNumberBR(irpjPresumptionRate)}%` },
                    { label: 'Presunção CSLL', value: `${formatNumberBR(csllPresumptionRate)}%` },
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
                      description: '(−) PIS (0,65%)',
                      unitValue: -unitPis,
                      totalValue: -totalPis,
                    },
                    {
                      description: '(−) COFINS (3,00%)',
                      unitValue: -unitCofins,
                      totalValue: -totalCofins,
                    },
                    {
                      description: '(=) Receita líquida',
                      unitValue: unitNetRevenue,
                      totalValue: totalNetRevenue,
                    },
                    {
                      description: '(−) CMV',
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
                      description: `Base presumida IRPJ (${formatNumberBR(irpjPresumptionRate)}%)`,
                      unitValue: null,
                      totalValue: totalIrpjBase,
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
                      description: `Base presumida CSLL (${formatNumberBR(csllPresumptionRate)}%)`,
                      unitValue: null,
                      totalValue: totalCsllBase,
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
                    'PIS e COFINS cumulativos calculados às alíquotas de 0,65% e 3,00%.',
                    isServices
                      ? 'Em serviços, a exclusão do ICMS da base do PIS/COFINS (Tema 69/STF) não se aplica ao ISSQN.'
                      : 'Exclusão do ICMS destacado da base de cálculo do PIS e da COFINS conforme jurisprudência pacificada pelo STF (Tema 69).',
                    'Adicional de IRPJ de 10% aplicado sobre a parcela da base de cálculo presumida trimestral que exceder R$ 60.000,00.',
                    'Encargos patronais previdenciários e de terceiros apurados de acordo com as alíquotas configuradas no módulo de Folha e Pró-labore.',
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
                da DRE do Lucro Presumido.
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
