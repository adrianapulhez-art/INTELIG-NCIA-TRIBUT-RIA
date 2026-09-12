import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Calculator,
  Info,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  Percent,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { formatBRL, formatNumberBR, formatPercentBR, formatFactorBR } from '@/lib/taxCalculations'
import { calculatePgdas, SimplesAnexoId, SIMPLES_ANEXOS } from '@/lib/simplesCalculations'
import {
  MarkupProductItem,
  TaxRegime,
  CustomTaxItem,
  VariableExpenseItem,
  SimplesScenarioKey,
} from '@/contexts/TaxContext'

export interface MarkupCalculationMemoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: MarkupProductItem | null
  currentRegime: TaxRegime
  icmsRateMarkup: number
  customTaxesMarkup: CustomTaxItem[]
  simplesAnexo: string
  simplesRbt12: number
  simplesIsInicioAtividade?: boolean
  // Novos campos enriquecidos da Portas 1 e 2 e Despesas Variáveis
  simplesIsActiveMoreThan12m?: boolean
  simplesActivityMonths?: number
  simplesMonthlyProjectedRevenue?: number
  simplesSelectedScenario?: SimplesScenarioKey
  effectiveSimplesRbt12?: number
  variableExpenses?: VariableExpenseItem[]
  totalVariableExpenseRate?: number
}

export function MarkupCalculationMemoryModal({
  open,
  onOpenChange,
  product,
  currentRegime,
  icmsRateMarkup,
  customTaxesMarkup = [],
  simplesAnexo,
  simplesRbt12,
  simplesIsInicioAtividade,
  simplesIsActiveMoreThan12m = false,
  simplesActivityMonths = 1,
  simplesMonthlyProjectedRevenue = 20000,
  simplesSelectedScenario = 'moderado',
  effectiveSimplesRbt12: effectiveRbt12Prop,
  variableExpenses = [],
  totalVariableExpenseRate = 0,
}: MarkupCalculationMemoryModalProps) {
  // Aba ativa de regime (padrão inicia no regime atual da empresa)
  const [activeTab, setActiveTab] = useState<TaxRegime>(currentRegime)

  // Atualiza tab se o regime ativo mudar enquanto o modal estiver abrindo
  React.useEffect(() => {
    if (open) {
      setActiveTab(currentRegime)
    }
  }, [open, currentRegime])

  if (!product) return null

  // 1. Dados base do produto
  const isLiquid = product.mode === 'liquid'
  const baseCost =
    typeof product.cost === 'number' && Number.isFinite(product.cost) ? product.cost : 0
  const desiredNetRevenue =
    typeof product.desiredNetRevenue === 'number' && Number.isFinite(product.desiredNetRevenue)
      ? product.desiredNetRevenue
      : 0
  const baseValue = isLiquid ? desiredNetRevenue : baseCost

  const marginPct =
    typeof product.margin === 'number' && Number.isFinite(product.margin) ? product.margin : 0
  const marginDecimal = marginPct / 100
  const marginFactor = 1 - marginDecimal

  const quantity =
    typeof product.quantity === 'number' && Number.isFinite(product.quantity)
      ? Math.max(0, product.quantity)
      : 0

  // Origem do custo
  const costOrigin = product.costOrigin || (product.purchaseItemId ? 'purchases' : 'manual')
  const costOriginLabel =
    costOrigin === 'manual' || product.manualCostOverride !== undefined
      ? 'Manual (editado pelo usuário)'
      : 'Compras líquidas do regime'

  // Despesas Variáveis
  const dvRate =
    typeof totalVariableExpenseRate === 'number' && Number.isFinite(totalVariableExpenseRate)
      ? totalVariableExpenseRate
      : variableExpenses.reduce((sum, item) => sum + (item.rate || 0), 0)
  const dvDecimal = dvRate / 100
  const dvFactor = 1 - dvDecimal

  // Tributos customizados
  let customTaxesFactor = 1
  for (const ct of customTaxesMarkup) {
    customTaxesFactor *= 1 - (ct.rate || 0) / 100
  }

  // -------------------------------------------------------------
  // SIMPLES NACIONAL — Cálculos
  // -------------------------------------------------------------
  const anexoIdClean = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const anexoConfig = SIMPLES_ANEXOS[anexoIdClean] || SIMPLES_ANEXOS.anexo_1

  // Determinar RBT12 real a ser exibida:
  // Se Porta 1 (!simplesIsActiveMoreThan12m):
  //   - Se activityMonths <= 1: mensal * 12
  //   - Se activityMonths 2 a 12: proporcional art. 2º da LC 123/2006: (receitas acumuladas * 12) / meses
  // Se Porta 2 (simplesIsActiveMoreThan12m): simplesRbt12
  let calculatedRbt12 = 0
  if (!simplesIsActiveMoreThan12m) {
    if (effectiveRbt12Prop !== undefined && effectiveRbt12Prop > 0) {
      calculatedRbt12 = effectiveRbt12Prop
    } else {
      const monthly = Math.max(0, simplesMonthlyProjectedRevenue || 0)
      const months = Math.max(1, Math.min(12, simplesActivityMonths || 1))
      calculatedRbt12 =
        months <= 1 ? monthly * 12 : Math.round(((monthly * months * 12) / months) * 100) / 100
    }
  } else {
    calculatedRbt12 = (simplesRbt12 || 0) > 0 ? simplesRbt12 : 0
  }

  const isFallbackRbt12 = calculatedRbt12 <= 0
  const effectiveRbt12ForCalculation = calculatedRbt12

  // Apuração legal LC 123/2006
  const pgdasResult = calculatePgdas(anexoIdClean, effectiveRbt12ForCalculation)
  const effectiveSimplesRate = pgdasResult.aliquotaEfetiva
  const effectiveSimplesDecimal = effectiveSimplesRate / 100
  const dasTaxFactor = 1 - effectiveSimplesDecimal

  // Partilha ICMS da faixa detectada
  const faixaIndex = Math.max(
    0,
    Math.min(pgdasResult.faixaNumero - 1, anexoConfig.faixas.length - 1),
  )
  const faixaDetectada = anexoConfig.faixas[faixaIndex]
  const icmsPartilhaPct = faixaDetectada?.partilha.icms ?? 34
  const icmsIntegradoRate = pgdasResult.reparticao.icmsRate

  // Divisor Simples Multiplicativo: (1 - DAS) * (1 - DV) * (1 - Margem) * customTaxesFactor
  const rawDivisorSimples = dasTaxFactor * dvFactor * marginFactor * customTaxesFactor
  // Blindagem: se tributo aplicável (dasTaxFactor < 1), completeFactor nunca pode ser 1.0
  const divisorSimples = Math.max(0.0001, rawDivisorSimples)
  const salePriceSimples =
    divisorSimples > 0 && baseValue > 0 ? Math.round((baseValue / divisorSimples) * 100) / 100 : 0
  const totalRevenueSimples = Math.round(salePriceSimples * quantity * 100) / 100

  // Distribuição do PV Simples em R$
  const pvSimples = salePriceSimples
  const valorDasSimples = Math.round(pvSimples * effectiveSimplesDecimal * 100) / 100
  const valorDvSimples = Math.round(pvSimples * dvDecimal * 100) / 100
  const valorMargemSimples =
    Math.round((pvSimples - baseValue - valorDasSimples - valorDvSimples) * 100) / 100

  // Comparação Aditiva vs Multiplicativa (Simples)
  // Fórmula aditiva: Custo / (1 - (DAS% + DV% + Margem%))
  const somaAliquotaSimplesAditiva = effectiveSimplesDecimal + dvDecimal + marginDecimal
  const divisorAditivoSimples = Math.max(0.0001, 1 - somaAliquotaSimplesAditiva)
  const salePriceAditivoSimples =
    divisorAditivoSimples > 0 && baseValue > 0
      ? Math.round((baseValue / divisorAditivoSimples) * 100) / 100
      : 0

  // -------------------------------------------------------------
  // LUCRO PRESUMIDO — Cálculos
  // -------------------------------------------------------------
  const pisPresumidoRate = 0.65
  const cofinsPresumidoRate = 3.0
  const icmsRateClean = Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0

  const icmsFactorPresumido = 1 - icmsRateClean / 100
  const pisFactorPresumido = 1 - pisPresumidoRate / 100
  const cofinsFactorPresumido = 1 - cofinsPresumidoRate / 100
  const taxFactorPresumidoDecomposto =
    icmsFactorPresumido * pisFactorPresumido * cofinsFactorPresumido * customTaxesFactor

  const rawDivisorPresumido = taxFactorPresumidoDecomposto * dvFactor * marginFactor
  const divisorPresumido = Math.max(0.0001, rawDivisorPresumido)
  const salePricePresumido =
    divisorPresumido > 0 && baseValue > 0
      ? Math.round((baseValue / divisorPresumido) * 100) / 100
      : 0
  const totalRevenuePresumido = Math.round(salePricePresumido * quantity * 100) / 100

  // Distribuição do PV Presumido
  const pvPresumido = salePricePresumido
  const valorIcmsPresumido = Math.round(pvPresumido * (icmsRateClean / 100) * 100) / 100
  const valorPisPresumido = Math.round(pvPresumido * (pisPresumidoRate / 100) * 100) / 100
  const valorCofinsPresumido = Math.round(pvPresumido * (cofinsPresumidoRate / 100) * 100) / 100
  const valorTributosPresumido = valorIcmsPresumido + valorPisPresumido + valorCofinsPresumido
  const valorDvPresumido = Math.round(pvPresumido * dvDecimal * 100) / 100
  const valorMargemPresumido =
    Math.round((pvPresumido - baseValue - valorTributosPresumido - valorDvPresumido) * 100) / 100

  // Comparação Aditiva vs Multiplicativa (Presumido)
  const somaAliquotaPresumidoAditiva =
    icmsRateClean / 100 +
    pisPresumidoRate / 100 +
    cofinsPresumidoRate / 100 +
    dvDecimal +
    marginDecimal
  const divisorAditivoPresumido = Math.max(0.0001, 1 - somaAliquotaPresumidoAditiva)
  const salePriceAditivoPresumido =
    divisorAditivoPresumido > 0 && baseValue > 0
      ? Math.round((baseValue / divisorAditivoPresumido) * 100) / 100
      : 0

  // -------------------------------------------------------------
  // LUCRO REAL — Cálculos
  // -------------------------------------------------------------
  const pisRealRate = 1.65
  const cofinsRealRate = 7.6
  const icmsFactorReal = 1 - icmsRateClean / 100
  const pisFactorReal = 1 - pisRealRate / 100
  const cofinsFactorReal = 1 - cofinsRealRate / 100
  const taxFactorRealDecomposto =
    icmsFactorReal * pisFactorReal * cofinsFactorReal * customTaxesFactor

  const rawDivisorReal = taxFactorRealDecomposto * dvFactor * marginFactor
  const divisorReal = Math.max(0.0001, rawDivisorReal)
  const salePriceReal =
    divisorReal > 0 && baseValue > 0 ? Math.round((baseValue / divisorReal) * 100) / 100 : 0
  const totalRevenueReal = Math.round(salePriceReal * quantity * 100) / 100

  // Distribuição do PV Real
  const pvReal = salePriceReal
  const valorIcmsReal = Math.round(pvReal * (icmsRateClean / 100) * 100) / 100
  const valorPisReal = Math.round(pvReal * (pisRealRate / 100) * 100) / 100
  const valorCofinsReal = Math.round(pvReal * (cofinsRealRate / 100) * 100) / 100
  const valorTributosReal = valorIcmsReal + valorPisReal + valorCofinsReal
  const valorDvReal = Math.round(pvReal * dvDecimal * 100) / 100
  const valorMargemReal =
    Math.round((pvReal - baseValue - valorTributosReal - valorDvReal) * 100) / 100

  // Comparação Aditiva vs Multiplicativa (Real)
  const somaAliquotaRealAditiva =
    icmsRateClean / 100 + pisRealRate / 100 + cofinsRealRate / 100 + dvDecimal + marginDecimal
  const divisorAditivoReal = Math.max(0.0001, 1 - somaAliquotaRealAditiva)
  const salePriceAditivoReal =
    divisorAditivoReal > 0 && baseValue > 0
      ? Math.round((baseValue / divisorAditivoReal) * 100) / 100
      : 0

  // Valores ativos do produto no regime corrente
  const activeSalePrice = product.salePrice || 0
  const activeCompleteFactor = product.completeFactor || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-5 sm:p-7 shadow-2xl">
        {/* Cabeçalho */}
        <DialogHeader className="border-b border-slate-800 pb-3.5 space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <Calculator className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Memória de Cálculo do Preço Sugerido</span>
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs">
                {product.name || 'Produto'}
              </Badge>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 font-mono text-[11px]">
                12 Blocos
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-400 font-mono">
            Subcamada analítica: história completa do cálculo em 12 blocos numerados com valores
            reais do estado, derivação da fórmula multiplicativa e seção técnica de Blindagem de
            Margem.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo Base do Produto */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 font-mono">
            <span className="text-[10px] text-slate-400 block uppercase">
              {isLiquid ? 'Receita Líquida' : 'Custo Unitário'}
            </span>
            <span className="text-sm font-bold text-emerald-400">{formatBRL(baseValue)}</span>
            <span
              className="text-[10px] text-slate-500 block mt-0.5 truncate"
              title={costOriginLabel}
            >
              {costOrigin === 'manual' ? 'Manual' : 'Via Compras'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 font-mono">
            <span className="text-[10px] text-slate-400 block uppercase">Margem Desejada</span>
            <span className="text-sm font-bold text-amber-300">{formatPercentBR(marginPct)}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Fator: {formatFactorBR(marginFactor, 4)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 font-mono">
            <span className="text-[10px] text-slate-400 block uppercase">Regime Ativo</span>
            <span className="text-sm font-bold text-orange-400 uppercase">{currentRegime}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              DV total: {formatPercentBR(dvRate)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-mono">
            <span className="text-[10px] text-emerald-400 block uppercase font-semibold">
              Preço Sugerido Ativo
            </span>
            <span className="text-sm font-black text-emerald-300">
              {formatBRL(activeSalePrice)}
            </span>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">
              Divisor: {formatFactorBR(activeCompleteFactor, 5)}
            </span>
          </div>
        </div>

        {/* Abas dos 3 Regimes */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Selecione o regime para visualizar os 12 blocos:
            </span>
            <span className="text-[11px] font-mono text-slate-500">Cálculo com valores reais</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('simples')}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                activeTab === 'simples'
                  ? 'bg-orange-500/20 border-orange-400 text-white shadow-md shadow-orange-500/15'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-orange-300">
                  Simples Nacional
                </span>
                {currentRegime === 'simples' && (
                  <Badge className="bg-orange-500/30 text-orange-200 border-0 text-[9px] px-1 py-0">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {isFallbackRbt12
                  ? `DAS: ${formatPercentBR(effectiveSimplesRate)} (1ª faixa)`
                  : `DAS: ${formatPercentBR(effectiveSimplesRate)}`}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presumido')}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                activeTab === 'presumido'
                  ? 'bg-orange-500/20 border-orange-400 text-white shadow-md shadow-orange-500/15'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-orange-300">Presumido</span>
                {currentRegime === 'presumido' && (
                  <Badge className="bg-orange-500/30 text-orange-200 border-0 text-[9px] px-1 py-0">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                ICMS {formatPercentBR(icmsRateClean)} + PIS 0,65% + COF 3%
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('real')}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                activeTab === 'real'
                  ? 'bg-orange-500/20 border-orange-400 text-white shadow-md shadow-orange-500/15'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-orange-300">Lucro Real</span>
                {currentRegime === 'real' && (
                  <Badge className="bg-orange-500/30 text-orange-200 border-0 text-[9px] px-1 py-0">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                ICMS {formatPercentBR(icmsRateClean)} + PIS 1,65% + COF 7,6%
              </p>
            </button>
          </div>

          {/* =========================================================
              ABA SIMPLES NACIONAL (12 BLOCOS NUMERADOS)
              ========================================================= */}
          {activeTab === 'simples' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              {/* Box de fórmula sintética */}
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-mono font-bold text-orange-300 uppercase">
                    Fórmula Multiplicativa no Simples Nacional
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
                  <code className="text-emerald-400">
                    Divisor = (1 − Alíquota Efetiva DAS) × (1 − DV Total) × (1 − Margem%)
                    <br />
                    Preço Sugerido = Custo Unitário ÷ Divisor
                  </code>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  No Simples Nacional, os tributos sobre receita (ICMS, PIS, COFINS, IRPJ, CSLL e
                  CPP) são unificados no DAS pela alíquota efetiva do PGDAS calculada sobre a RBT12.
                  O motor multiplicativo deduz os tributos e despesas variáveis antes de aplicar a
                  margem líquida.
                </p>
              </div>

              {/* Tabela dos 12 Blocos Numerados */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs font-mono">
                <div className="bg-slate-950/80 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                    Memória de Cálculo em 12 Blocos (Simples Nacional)
                  </span>
                  <span className="text-[10px] text-slate-500">LC 123/2006</span>
                </div>

                <div className="divide-y divide-slate-800/70">
                  {/* ① Perfil */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">① Perfil da Empresa</span>
                      <span className="text-[10px] text-slate-400">
                        {!simplesIsActiveMoreThan12m
                          ? 'Início de atividade (Porta 1 — até 12 meses de operação)'
                          : 'RBT12 consolidada (Porta 2 — mais de 12 meses de operação)'}
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 text-[10px] font-mono">
                        {!simplesIsActiveMoreThan12m
                          ? 'Porta 1 (Início)'
                          : 'Porta 2 (RBT12 Formada)'}
                      </Badge>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {!simplesIsActiveMoreThan12m
                          ? `${simplesActivityMonths}º mês · Cenário ${simplesSelectedScenario}`
                          : 'Histórico > 12 meses'}
                      </span>
                    </div>
                  </div>

                  {/* ② RBT12 */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/30">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ② RBT12 (Receita Bruta Acumulada 12 Meses)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {!simplesIsActiveMoreThan12m ? (
                          simplesActivityMonths <= 1 ? (
                            <>
                              1º mês: faturamento mensal projetado × 12 (
                              {formatBRL(simplesMonthlyProjectedRevenue)} × 12)
                            </>
                          ) : (
                            <>
                              Proporcional art. 2º LC 123/2006: (receitas acumuladas × 12) ÷ meses =
                              ({formatBRL(simplesMonthlyProjectedRevenue * simplesActivityMonths)} ×
                              12) ÷ {simplesActivityMonths}
                            </>
                          )
                        ) : (
                          <>Porta 2: RBT12 informada ({formatBRL(simplesRbt12)})</>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-200 block text-sm">
                        {formatBRL(effectiveRbt12ForCalculation)}
                      </span>
                      {isFallbackRbt12 && (
                        <span className="text-[10px] text-amber-300 block">
                          1ª faixa aplicada (fallback 4,00%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ③ Anexo e faixa detectada */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ③ Anexo e Faixa Detectada
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {anexoConfig.nome} · Faixa {pgdasResult.faixaNumero} de{' '}
                        {anexoConfig.faixas.length} (até{' '}
                        {formatBRL(faixaDetectada?.limiteSuperior || 180000)})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-200 block">
                        Nominal: {formatPercentBR(pgdasResult.aliquotaNominal)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Deduzir: {formatBRL(pgdasResult.parcelaDeduzir)}
                      </span>
                    </div>
                  </div>

                  {/* ④ Alíquota efetiva */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-orange-500/[0.05]">
                    <div>
                      <span className="font-bold text-orange-300 block">
                        ④ Alíquota Efetiva do DAS (PGDAS)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {effectiveRbt12ForCalculation > 0 ? (
                          <>
                            ({formatBRL(effectiveRbt12ForCalculation)} ×{' '}
                            {formatNumberBR(pgdasResult.aliquotaNominal)}% −{' '}
                            {formatBRL(pgdasResult.parcelaDeduzir)}) ÷{' '}
                            {formatBRL(effectiveRbt12ForCalculation)}
                          </>
                        ) : (
                          <>1ª faixa (RBT12 zerada ou início 1º mês)</>
                        )}
                      </span>
                    </div>
                    <span className="font-bold text-orange-300 text-sm">
                      {formatPercentBR(effectiveSimplesRate, 4)}
                    </span>
                  </div>

                  {/* ⑤ ICMS integrado */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/40">
                    <div>
                      <span className="font-bold text-emerald-400 block">
                        ⑤ ICMS Integrado no DAS
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Alíquota efetiva ({formatPercentBR(effectiveSimplesRate, 4)}) × partilha da
                        faixa ({formatPercentBR(icmsPartilhaPct)})
                      </span>
                      <span className="text-[10px] text-emerald-300/80 block mt-0.5">
                        Nota: ICMS, PIS e COFINS vivem dentro do DAS no Simples Nacional
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-300 text-sm block">
                        {formatPercentBR(icmsIntegradoRate, 4)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Partilha: {formatPercentBR(icmsPartilhaPct)}
                      </span>
                    </div>
                  </div>

                  {/* ⑥ Custo unitário */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑥ Custo Unitário do Produto
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Origem: <strong className="text-slate-300">{costOriginLabel}</strong>
                      </span>
                    </div>
                    <span className="font-bold text-slate-100 text-sm">{formatBRL(baseValue)}</span>
                  </div>

                  {/* ⑦ Despesas Variáveis */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/30">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑦ Despesas Variáveis de Venda (Σ DV)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {variableExpenses.length > 0
                          ? variableExpenses
                              .map((dv) => `${dv.name}: ${formatPercentBR(dv.rate)}`)
                              .join(' · ')
                          : 'Nenhuma despesa cadastrada'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {formatPercentBR(dvRate)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator DV: {formatFactorBR(dvFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑧ Margem desejada */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑧ Margem de Lucro Desejada (%)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Margem aplicada sobre a receita líquida
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {formatPercentBR(marginPct)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator Margem: {formatFactorBR(marginFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑨ Fator Divisor */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-emerald-500/[0.08]">
                    <div>
                      <span className="font-bold text-emerald-400 block">
                        ⑨ Fator Divisor Multiplicativo
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (1 − {formatPercentBR(effectiveSimplesRate, 4)}) × (1 −{' '}
                        {formatPercentBR(dvRate)}) × (1 − {formatPercentBR(marginPct)}) = (1 − DAS)
                        × (1 − DV) × (1 − Margem)
                      </span>
                    </div>
                    <span className="font-black text-emerald-300 text-base">
                      {formatFactorBR(divisorSimples, 5)}
                    </span>
                  </div>

                  {/* ⑩ Preço sugerido */}
                  <div className="px-3.5 py-3 flex items-center justify-between bg-emerald-500/15 border-t border-emerald-500/30">
                    <div>
                      <span className="font-extrabold text-emerald-300 block text-xs sm:text-sm uppercase tracking-wide">
                        ⑩ Preço de Venda Sugerido (Unitário)
                      </span>
                      <span className="text-[10px] text-emerald-400/80">
                        {formatBRL(baseValue)} ÷ {formatFactorBR(divisorSimples, 5)} ={' '}
                        {formatBRL(salePriceSimples)}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]">
                      {formatBRL(salePriceSimples)}
                    </span>
                  </div>

                  {/* ⑪ Distribuição do preço em R$ */}
                  <div className="p-3.5 bg-slate-950/70 space-y-2 border-l-2 border-emerald-500">
                    <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider">
                      ⑪ Distribuição Didática do Preço de Venda ({formatBRL(pvSimples)})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Custo Produto
                        </span>
                        <span className="font-bold text-slate-200">{formatBRL(baseValue)}</span>
                        <span className="text-[9px] text-slate-500 block">
                          {pvSimples > 0 ? formatPercentBR((baseValue / pvSimples) * 100, 1) : '0%'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-orange-400 block uppercase">
                          DAS ({formatPercentBR(effectiveSimplesRate, 2)})
                        </span>
                        <span className="font-bold text-orange-300">
                          {formatBRL(valorDasSimples)}
                        </span>
                        <span className="text-[9px] text-slate-500 block">PV × efetiva</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-amber-400 block uppercase">
                          DV ({formatPercentBR(dvRate, 2)})
                        </span>
                        <span className="font-bold text-amber-300">
                          {formatBRL(valorDvSimples)}
                        </span>
                        <span className="text-[9px] text-slate-500 block">PV × Σ DV</span>
                      </div>
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-400 block uppercase font-semibold">
                          Margem em R$
                        </span>
                        <span className="font-bold text-emerald-300">
                          {formatBRL(valorMargemSimples)}
                        </span>
                        <span className="text-[9px] text-emerald-400/70 block">Sobra líquida</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span>Conferência da soma dos componentes:</span>
                      <span className="font-bold text-emerald-300">
                        {formatBRL(baseValue)} + {formatBRL(valorDasSimples)} +{' '}
                        {formatBRL(valorDvSimples)} + {formatBRL(valorMargemSimples)} ={' '}
                        {formatBRL(
                          baseValue + valorDasSimples + valorDvSimples + valorMargemSimples,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* ⑫ Blindagem de Margem */}
                  <div className="p-3.5 bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-b-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-extrabold text-emerald-300 uppercase tracking-wider text-xs">
                        ⑫ BLINDAGEM DE MARGEM
                      </span>
                      <Badge className="bg-emerald-500/25 text-emerald-200 border-0 text-[9px] font-mono">
                        Técnica Tributária
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                      Precificar com a alíquota de um cenário de faturamento superior (como Moderado
                      ou Otimista)
                      <strong> blinda a sua margem</strong> contra flutuações de vendas. Se a
                      empresa faturar menos do que o projetado e a faixa real de RBT12 cair, a
                      alíquota efetiva do DAS no fechamento do mês será <strong>menor</strong> que a
                      aplicada na formação de preço — fazendo com que a{' '}
                      <strong>margem real no fechamento seja MAIOR que a planejada</strong>. Se o
                      faturamento se confirmar como projetado, a margem se mantém perfeitamente
                      íntegra.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seção Didática Aditiva x Multiplicativa */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-semibold border-b border-slate-800 pb-2">
                  <span className="w-1.5 h-3.5 bg-cyan-400 rounded-full" />
                  <span className="uppercase text-[11px] text-cyan-300">
                    Comparação Didática: Aditiva × Multiplicativa
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 text-xs uppercase">
                        Multiplicativa (Padrão IT)
                      </span>
                      <Badge className="bg-emerald-500/30 text-emerald-200 border-0 text-[9px]">
                        Oficial
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-300">
                      PV = Custo ÷ [(1 − DAS) × (1 − DV) × (1 − Margem)]
                    </p>
                    <div className="pt-1 flex items-baseline justify-between">
                      <span className="text-slate-400 text-[10px]">Preço Resultante:</span>
                      <span className="text-sm font-black text-emerald-300">
                        {formatBRL(salePriceSimples)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 pt-1 border-t border-emerald-500/20">
                      Aplica a margem sobre a receita líquida de tributos e DV — coerente com as
                      DREs e o LAIR.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300 text-xs uppercase">
                        Aditiva (Referência Comercial)
                      </span>
                      <Badge className="bg-slate-800 text-slate-400 border-0 text-[9px]">
                        Apenas Exibição
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      PV = Custo ÷ [1 − (DAS + DV + Margem)]
                    </p>
                    <div className="pt-1 flex items-baseline justify-between">
                      <span className="text-slate-400 text-[10px]">Preço Resultante:</span>
                      <span className="text-sm font-bold text-slate-200">
                        {formatBRL(salePriceAditivoSimples)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      Aplica a margem sobre o preço bruto total e resulta em um preço ~7% maior que
                      o multiplicativo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              ABA LUCRO PRESUMIDO (12 BLOCOS NUMERADOS)
              ========================================================= */}
          {activeTab === 'presumido' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-mono font-bold text-orange-300 uppercase">
                    Fórmula Multiplicativa no Lucro Presumido
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
                  <code className="text-emerald-400">
                    Divisor = (1 − ICMS%) × (1 − PIS 0,65%) × (1 − COFINS 3,00%) × (1 − DV Total) ×
                    (1 − Margem%)
                    <br />
                    Preço Sugerido = Custo Unitário ÷ Divisor
                  </code>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  No Lucro Presumido cumulativo, o PIS (0,65%) e a COFINS (3,00%) incidem
                  diretamente sobre a receita bruta, somados à alíquota de ICMS informada e às
                  despesas variáveis de venda.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs font-mono">
                <div className="bg-slate-950/80 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                    Memória de Cálculo em 12 Blocos (Lucro Presumido)
                  </span>
                  <span className="text-[10px] text-slate-500">Regime Cumulativo</span>
                </div>

                <div className="divide-y divide-slate-800/70">
                  {/* ① Perfil */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">① Perfil da Empresa</span>
                      <span className="text-[10px] text-slate-400">
                        Regime Lucro Presumido (Decreto-Lei 1.598/77 e Lei 9.718/98)
                      </span>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-mono">
                      Cumulativo
                    </Badge>
                  </div>

                  {/* ② Faturamento e base */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/30">
                    <div>
                      <span className="font-bold text-slate-200 block">② Base de Incidência</span>
                      <span className="text-[10px] text-slate-400">
                        Receita bruta da operação de saída
                      </span>
                    </div>
                    <span className="font-bold text-slate-300">Incidência Direta</span>
                  </div>

                  {/* ③ Tributos Federais */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ③ Tributos Federais Cumulativos
                      </span>
                      <span className="text-[10px] text-slate-400">
                        PIS 0,65% + COFINS 3,00% (Lei 9.718/98)
                      </span>
                    </div>
                    <span className="font-bold text-slate-200">
                      3,65% (Fator: {formatFactorBR(pisFactorPresumido * cofinsFactorPresumido, 4)})
                    </span>
                  </div>

                  {/* ④ ICMS Estadual */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-orange-500/[0.05]">
                    <div>
                      <span className="font-bold text-orange-300 block">
                        ④ ICMS Estadual sobre Venda
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Alíquota configurada para operações internas
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-orange-300 text-sm block">
                        {formatPercentBR(icmsRateClean)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(icmsFactorPresumido, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑤ Carga tributária decomposta */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/40">
                    <div>
                      <span className="font-bold text-emerald-400 block">
                        ⑤ Carga Tributária Total Decomposta
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ICMS {formatPercentBR(icmsRateClean)} + PIS 0,65% + COFINS 3,00%
                      </span>
                    </div>
                    <span className="font-bold text-emerald-300">
                      Fator: {formatFactorBR(taxFactorPresumidoDecomposto, 5)}
                    </span>
                  </div>

                  {/* ⑥ Custo Unitário */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑥ Custo Unitário do Produto
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Origem: <strong className="text-slate-300">{costOriginLabel}</strong>
                      </span>
                    </div>
                    <span className="font-bold text-slate-100 text-sm">{formatBRL(baseValue)}</span>
                  </div>

                  {/* ⑦ Despesas Variáveis */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/30">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑦ Despesas Variáveis de Venda (Σ DV)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {variableExpenses.length > 0
                          ? variableExpenses
                              .map((dv) => `${dv.name}: ${formatPercentBR(dv.rate)}`)
                              .join(' · ')
                          : 'Nenhuma despesa cadastrada'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {formatPercentBR(dvRate)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator DV: {formatFactorBR(dvFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑧ Margem desejada */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑧ Margem de Lucro Desejada (%)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Margem comercial sobre a receita líquida
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {formatPercentBR(marginPct)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator Margem: {formatFactorBR(marginFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑨ Fator Divisor */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-emerald-500/[0.08]">
                    <div>
                      <span className="font-bold text-emerald-400 block">
                        ⑨ Fator Divisor Multiplicativo
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (1 − ICMS%) × (1 − PIS%) × (1 − COFINS%) × (1 − DV) × (1 − Margem)
                      </span>
                    </div>
                    <span className="font-black text-emerald-300 text-base">
                      {formatFactorBR(divisorPresumido, 5)}
                    </span>
                  </div>

                  {/* ⑩ Preço sugerido */}
                  <div className="px-3.5 py-3 flex items-center justify-between bg-emerald-500/15 border-t border-emerald-500/30">
                    <div>
                      <span className="font-extrabold text-emerald-300 block text-xs sm:text-sm uppercase tracking-wide">
                        ⑩ Preço de Venda Sugerido (Unitário)
                      </span>
                      <span className="text-[10px] text-emerald-400/80">
                        {formatBRL(baseValue)} ÷ {formatFactorBR(divisorPresumido, 5)} ={' '}
                        {formatBRL(salePricePresumido)}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]">
                      {formatBRL(salePricePresumido)}
                    </span>
                  </div>

                  {/* ⑪ Distribuição do preço em R$ */}
                  <div className="p-3.5 bg-slate-950/70 space-y-2 border-l-2 border-emerald-500">
                    <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider">
                      ⑪ Distribuição Didática do Preço de Venda ({formatBRL(pvPresumido)})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Custo Produto
                        </span>
                        <span className="font-bold text-slate-200">{formatBRL(baseValue)}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-orange-400 block uppercase">
                          Tributos (ICMS/PIS/COF)
                        </span>
                        <span className="font-bold text-orange-300">
                          {formatBRL(valorTributosPresumido)}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-amber-400 block uppercase">
                          DV ({formatPercentBR(dvRate, 2)})
                        </span>
                        <span className="font-bold text-amber-300">
                          {formatBRL(valorDvPresumido)}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-400 block uppercase font-semibold">
                          Margem em R$
                        </span>
                        <span className="font-bold text-emerald-300">
                          {formatBRL(valorMargemPresumido)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ⑫ Blindagem de Margem */}
                  <div className="p-3.5 bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-b-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-extrabold text-emerald-300 uppercase tracking-wider text-xs">
                        ⑫ BLINDAGEM DE MARGEM
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                      A blindagem protege a lucratividade contra volatilidades de mercado e
                      comissões extras. Ao travar as despesas variáveis e a carga integral no
                      divisor multiplicativo, garante-se que a margem planejada não seja corroída
                      mesmo com aumentos transitórios de custos operacionais.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seção Didática Aditiva x Multiplicativa */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-semibold border-b border-slate-800 pb-2">
                  <span className="w-1.5 h-3.5 bg-cyan-400 rounded-full" />
                  <span className="uppercase text-[11px] text-cyan-300">
                    Comparação Didática: Aditiva × Multiplicativa
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                    <span className="font-bold text-emerald-300 text-xs uppercase block">
                      Multiplicativa (Padrão IT)
                    </span>
                    <p className="text-[10px] text-slate-300">
                      PV = Custo ÷ Divisor Multiplicativo
                    </p>
                    <div className="pt-1 flex items-baseline justify-between">
                      <span className="text-slate-400 text-[10px]">Preço Resultante:</span>
                      <span className="text-sm font-black text-emerald-300">
                        {formatBRL(salePricePresumido)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-slate-300 text-xs uppercase block">
                      Aditiva (Referência)
                    </span>
                    <p className="text-[10px] text-slate-400">PV = Custo ÷ [1 − Soma dos %]</p>
                    <div className="pt-1 flex items-baseline justify-between">
                      <span className="text-slate-400 text-[10px]">Preço Resultante:</span>
                      <span className="text-sm font-bold text-slate-200">
                        {formatBRL(salePriceAditivoPresumido)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              ABA LUCRO REAL (12 BLOCOS NUMERADOS)
              ========================================================= */}
          {activeTab === 'real' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-mono font-bold text-orange-300 uppercase">
                    Fórmula Multiplicativa no Lucro Real
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
                  <code className="text-emerald-400">
                    Divisor = (1 − ICMS%) × (1 − PIS 1,65%) × (1 − COFINS 7,60%) × (1 − DV Total) ×
                    (1 − Margem%)
                    <br />
                    Preço Sugerido = Custo Unitário ÷ Divisor
                  </code>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  No Lucro Real não cumulativo, as alíquotas de PIS (1,65%) e COFINS (7,60%) incidem
                  integralmente sobre a venda, gerando créditos nas compras que reduzem o CMV
                  líquido.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs font-mono">
                <div className="bg-slate-950/80 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                    Memória de Cálculo em 12 Blocos (Lucro Real)
                  </span>
                  <span className="text-[10px] text-slate-500">Regime Não Cumulativo</span>
                </div>

                <div className="divide-y divide-slate-800/70">
                  {/* ① Perfil */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">① Perfil da Empresa</span>
                      <span className="text-[10px] text-slate-400">
                        Regime Lucro Real (Leis 10.637/02 e 10.833/03)
                      </span>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] font-mono">
                      Não Cumulativo
                    </Badge>
                  </div>

                  {/* ② Base */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/30">
                    <div>
                      <span className="font-bold text-slate-200 block">② Base de Incidência</span>
                      <span className="text-[10px] text-slate-400">Receita bruta da operação</span>
                    </div>
                    <span className="font-bold text-slate-300">Não Cumulativa</span>
                  </div>

                  {/* ③ PIS e COFINS */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ③ PIS e COFINS Não Cumulativos
                      </span>
                      <span className="text-[10px] text-slate-400">PIS 1,65% + COFINS 7,60%</span>
                    </div>
                    <span className="font-bold text-slate-200">
                      9,25% (Fator: {formatFactorBR(pisFactorReal * cofinsFactorReal, 4)})
                    </span>
                  </div>

                  {/* ④ ICMS */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-orange-500/[0.05]">
                    <div>
                      <span className="font-bold text-orange-300 block">
                        ④ ICMS Estadual sobre Venda
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Alíquota configurada para operações internas
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-orange-300 text-sm block">
                        {formatPercentBR(icmsRateClean)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(icmsFactorReal, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑤ Carga tributária decomposta */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/40">
                    <div>
                      <span className="font-bold text-emerald-400 block">
                        ⑤ Carga Tributária Total Decomposta
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ICMS {formatPercentBR(icmsRateClean)} + PIS 1,65% + COFINS 7,60%
                      </span>
                    </div>
                    <span className="font-bold text-emerald-300">
                      Fator: {formatFactorBR(taxFactorRealDecomposto, 5)}
                    </span>
                  </div>

                  {/* ⑥ Custo Unitário */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑥ Custo Unitário do Produto
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Origem: <strong className="text-slate-300">{costOriginLabel}</strong>
                      </span>
                    </div>
                    <span className="font-bold text-slate-100 text-sm">{formatBRL(baseValue)}</span>
                  </div>

                  {/* ⑦ Despesas Variáveis */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/30">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑦ Despesas Variáveis de Venda (Σ DV)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {variableExpenses.length > 0
                          ? variableExpenses
                              .map((dv) => `${dv.name}: ${formatPercentBR(dv.rate)}`)
                              .join(' · ')
                          : 'Nenhuma despesa cadastrada'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {formatPercentBR(dvRate)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator DV: {formatFactorBR(dvFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑧ Margem desejada */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        ⑧ Margem de Lucro Desejada (%)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Margem comercial sobre a receita líquida
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {formatPercentBR(marginPct)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator Margem: {formatFactorBR(marginFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* ⑨ Fator Divisor */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-emerald-500/[0.08]">
                    <div>
                      <span className="font-bold text-emerald-400 block">
                        ⑨ Fator Divisor Multiplicativo
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (1 − ICMS%) × (1 − PIS%) × (1 − COFINS%) × (1 − DV) × (1 − Margem)
                      </span>
                    </div>
                    <span className="font-black text-emerald-300 text-base">
                      {formatFactorBR(divisorReal, 5)}
                    </span>
                  </div>

                  {/* ⑩ Preço sugerido */}
                  <div className="px-3.5 py-3 flex items-center justify-between bg-emerald-500/15 border-t border-emerald-500/30">
                    <div>
                      <span className="font-extrabold text-emerald-300 block text-xs sm:text-sm uppercase tracking-wide">
                        ⑩ Preço de Venda Sugerido (Unitário)
                      </span>
                      <span className="text-[10px] text-emerald-400/80">
                        {formatBRL(baseValue)} ÷ {formatFactorBR(divisorReal, 5)} ={' '}
                        {formatBRL(salePriceReal)}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]">
                      {formatBRL(salePriceReal)}
                    </span>
                  </div>

                  {/* ⑪ Distribuição do preço em R$ */}
                  <div className="p-3.5 bg-slate-950/70 space-y-2 border-l-2 border-emerald-500">
                    <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider">
                      ⑪ Distribuição Didática do Preço de Venda ({formatBRL(pvReal)})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Custo Líquido
                        </span>
                        <span className="font-bold text-slate-200">{formatBRL(baseValue)}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-orange-400 block uppercase">
                          Tributos (ICMS/PIS/COF)
                        </span>
                        <span className="font-bold text-orange-300">
                          {formatBRL(valorTributosReal)}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-amber-400 block uppercase">
                          DV ({formatPercentBR(dvRate, 2)})
                        </span>
                        <span className="font-bold text-amber-300">{formatBRL(valorDvReal)}</span>
                      </div>
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-400 block uppercase font-semibold">
                          Margem em R$
                        </span>
                        <span className="font-bold text-emerald-300">
                          {formatBRL(valorMargemReal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ⑫ Blindagem de Margem */}
                  <div className="p-3.5 bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-b-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-extrabold text-emerald-300 uppercase tracking-wider text-xs">
                        ⑫ BLINDAGEM DE MARGEM
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                      No Lucro Real, a blindagem garante que mesmo que o volume de créditos nas
                      compras oscile, o preço praticado mantém a taxa de lucratividade pretendida na
                      venda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seção Didática Aditiva x Multiplicativa */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-semibold border-b border-slate-800 pb-2">
                  <span className="w-1.5 h-3.5 bg-cyan-400 rounded-full" />
                  <span className="uppercase text-[11px] text-cyan-300">
                    Comparação Didática: Aditiva × Multiplicativa
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                    <span className="font-bold text-emerald-300 text-xs uppercase block">
                      Multiplicativa (Padrão IT)
                    </span>
                    <p className="text-[10px] text-slate-300">
                      PV = Custo ÷ Divisor Multiplicativo
                    </p>
                    <div className="pt-1 flex items-baseline justify-between">
                      <span className="text-slate-400 text-[10px]">Preço Resultante:</span>
                      <span className="text-sm font-black text-emerald-300">
                        {formatBRL(salePriceReal)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="font-bold text-slate-300 text-xs uppercase block">
                      Aditiva (Referência)
                    </span>
                    <p className="text-[10px] text-slate-400">PV = Custo ÷ [1 − Soma dos %]</p>
                    <div className="pt-1 flex items-baseline justify-between">
                      <span className="text-slate-400 text-[10px]">Preço Resultante:</span>
                      <span className="text-sm font-bold text-slate-200">
                        {formatBRL(salePriceAditivoReal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé explicativo e botão de fechar */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Fórmulas idênticas às aplicadas na apuração das DREs e do comparativo.</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors cursor-pointer text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
