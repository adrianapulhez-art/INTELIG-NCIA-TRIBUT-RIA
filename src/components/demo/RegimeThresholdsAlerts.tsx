import React from 'react'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react'

export interface RegimeThresholdsProps {
  // Simples Nacional
  simplesRbt12: number
  annualProjectedRevenue: number
  // Regimes comparados
  presumidoNetProfit: number
  realNetProfit: number
  simplesNetProfit: number
  presumidoTaxBurden: number
  realTaxBurden: number
  simplesTaxBurden: number
  bestRegimeKey: 'presumido' | 'real' | 'simples'
  bestRegimeName: string
  // Flag se há dados simulados/preenchidos
  hasSimulatedData: boolean
  // Modo compacto (para embutir em DRE Simples)
  compact?: boolean
}

const TETO_SIMPLES = 4800000.0 // R$ 4,8 milhões
const SUBLIMITE_SIMPLES = 3600000.0 // R$ 3,6 milhões
const TETO_PRESUMIDO = 78000000.0 // R$ 78 milhões

export const RegimeThresholdsAlerts: React.FC<RegimeThresholdsProps> = ({
  simplesRbt12,
  annualProjectedRevenue,
  presumidoNetProfit,
  realNetProfit,
  simplesNetProfit,
  presumidoTaxBurden,
  realTaxBurden,
  simplesTaxBurden,
  bestRegimeKey,
  bestRegimeName,
  hasSimulatedData,
  compact = false,
}) => {
  // Tudo zerado por padrão; alertas só aparecem quando houver dados preenchidos
  if (!hasSimulatedData) {
    return null
  }

  // 1. ANÁLISE DO SIMPLES NACIONAL (RBT12 e Receita Projetada)
  // O contribuinte considera a maior base entre RBT12 histórica e a receita projetada anual
  const effectiveSimplesRevenue = Math.max(simplesRbt12 || 0, annualProjectedRevenue || 0)

  // Status sublimite (R$ 3.600.000)
  const sublimitePercent = (effectiveSimplesRevenue / SUBLIMITE_SIMPLES) * 100
  let sublimiteStatus: 'green' | 'amber' | 'red' = 'green'
  let sublimiteMessage =
    'Dentro do sublimite estadual e municipal. ICMS e ISS 100% unificados na guia DAS.'

  if (effectiveSimplesRevenue > SUBLIMITE_SIMPLES) {
    sublimiteStatus = 'red'
    sublimiteMessage =
      'Sublimite de R$ 3.600.000,00 excedido! O ICMS e ISS passam a ser recolhidos POR FORA do DAS (regime normal).'
  } else if (sublimitePercent >= 80) {
    sublimiteStatus = 'amber'
    sublimiteMessage = `Atenção: faturamento a ${sublimitePercent.toFixed(1)}% do sublimite (R$ 3,6M). Risco iminente de recolhimento estadual/municipal por fora.`
  }

  // Status teto Simples (R$ 4.800.000)
  const simplesTetoPercent = (effectiveSimplesRevenue / TETO_SIMPLES) * 100
  let simplesTetoStatus: 'green' | 'amber' | 'red' = 'green'
  let simplesTetoMessage = 'Faturamento dentro do limite nacional do Simples (até R$ 4.800.000,00).'

  if (effectiveSimplesRevenue > TETO_SIMPLES) {
    simplesTetoStatus = 'red'
    simplesTetoMessage =
      'LIMITE NACIONAL EXCEDIDO (> R$ 4,8 milhões)! Exclusão obrigatória do Simples Nacional. Migração necessária para Lucro Presumido ou Lucro Real.'
  } else if (simplesTetoPercent >= 85) {
    simplesTetoStatus = 'amber'
    simplesTetoMessage = `Alerta de transição: faturamento atingiu ${simplesTetoPercent.toFixed(1)}% do teto nacional do Simples. Prepare planejamento tributário.`
  }

  // 2. ANÁLISE DO LUCRO PRESUMIDO (Teto R$ 78.000.000 anual)
  const presumidoRevenue = annualProjectedRevenue || simplesRbt12 || 0
  const presumidoTetoPercent = (presumidoRevenue / TETO_PRESUMIDO) * 100
  let presumidoStatus: 'green' | 'amber' | 'red' = 'green'
  let presumidoMessage =
    'Faturamento anual perfeitamente compatível com o teto de R$ 78.000.000,00 da Lei 9.718/98.'

  if (presumidoRevenue > TETO_PRESUMIDO) {
    presumidoStatus = 'red'
    presumidoMessage =
      'TETO DO LUCRO PRESUMIDO EXCEDIDO (> R$ 78 milhões/ano)! Obrigatoriedade legal de apuração pelo LUCRO REAL.'
  } else if (presumidoTetoPercent >= 80) {
    presumidoStatus = 'amber'
    presumidoMessage = `Aproximação de teto: receita anual a ${presumidoTetoPercent.toFixed(1)}% do limite de R$ 78M. Inicie o planejamento para Lucro Real.`
  }

  // 3. ANÁLISE DE TRANSIÇÃO DE REGIME
  // Comparação de lucro líquido entre os regimes para apontar proximidade de inversão
  const regimes = [
    {
      key: 'presumido',
      name: 'Lucro Presumido',
      netProfit: presumidoNetProfit,
      taxBurden: presumidoTaxBurden,
    },
    { key: 'real', name: 'Lucro Real', netProfit: realNetProfit, taxBurden: realTaxBurden },
    {
      key: 'simples',
      name: 'Simples Nacional',
      netProfit: simplesNetProfit,
      taxBurden: simplesTaxBurden,
    },
  ].sort((a, b) => b.netProfit - a.netProfit)

  const winner = regimes[0]
  const runnerUp = regimes[1]

  const profitDiff = winner.netProfit - runnerUp.netProfit
  const percentAdvantage =
    runnerUp.netProfit > 0 ? (profitDiff / runnerUp.netProfit) * 100 : profitDiff > 0 ? 100 : 0

  let transitionInsight: { title: string; desc: string; type: 'close' | 'stable' | 'exceeded' } = {
    title: `Regime ${winner.name} consolidado na liderança`,
    desc: `Vantagem de ${formatBRL(profitDiff)} (+${percentAdvantage.toFixed(1)}%) sobre o 2º colocado (${runnerUp.name}).`,
    type: 'stable',
  }

  if (effectiveSimplesRevenue > TETO_SIMPLES && bestRegimeKey === 'simples') {
    transitionInsight = {
      title: 'Transição forçada: Simples excede o teto legal',
      desc: `Apesar do cálculo numérico, a receita excede o teto de R$ 4,8M. O regime viável mais eficiente passa a ser ${
        presumidoNetProfit >= realNetProfit ? 'Lucro Presumido' : 'Lucro Real'
      }.`,
      type: 'exceeded',
    }
  } else if (profitDiff > 0 && percentAdvantage <= 8) {
    transitionInsight = {
      title: 'Zona de transição próxima — Disputa apertada',
      desc: `A vantagem de ${winner.name} sobre ${runnerUp.name} é de apenas ${formatBRL(
        profitDiff,
      )} (${percentAdvantage.toFixed(1)}%). Variações de volume, folha ou custos podem inverter o regime mais vantajoso.`,
      type: 'close',
    }
  } else if (profitDiff <= 0) {
    transitionInsight = {
      title: 'Regimes em empate técnico',
      desc: 'Os resultados líquidos dos regimes estão equivalentes para os parâmetros atuais.',
      type: 'close',
    }
  }

  // Estilos de badge e cores conforme semáforo
  const statusColors = {
    green: {
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      border: 'border-emerald-500/20',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      dot: 'bg-emerald-400',
    },
    amber: {
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      border: 'border-amber-500/30',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      dot: 'bg-amber-400',
    },
    red: {
      badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      border: 'border-rose-500/30',
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      dot: 'bg-rose-400',
    },
  }

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0b101b]/90 p-5 sm:p-6 shadow-xl space-y-4 font-mono">
      {/* Título do Bloco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-sans">
              Alertas de Limites Legais & Transição de Regime
            </h3>
            <p className="text-[11px] text-slate-400">
              Monitoramento automático dos limites da LC 123/2006, Lei 9.718/98 e gatilhos de
              inversão
            </p>
          </div>
        </div>
        <Badge className="bg-slate-900 border-slate-700 text-slate-300 text-[10px] self-start sm:self-center">
          Monitoramento Ativo
        </Badge>
      </div>

      {/* Grid de Cards de Limites */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Sublimite Simples (R$ 3,6M) */}
        <div
          className={`p-4 rounded-xl bg-slate-950/60 border ${statusColors[sublimiteStatus].border} flex flex-col justify-between space-y-3`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Simples · Sublimite R$ 3,6M
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full border ${statusColors[sublimiteStatus].badgeBg}`}
              >
                {sublimiteStatus === 'red'
                  ? 'Excedido'
                  : sublimiteStatus === 'amber'
                    ? 'Atenção'
                    : 'Regular'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-base sm:text-lg font-black text-white">
                {formatBRL(effectiveSimplesRevenue)}
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    sublimiteStatus === 'red'
                      ? 'bg-rose-500'
                      : sublimiteStatus === 'amber'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, sublimitePercent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span>R$ 0</span>
                <span>{sublimitePercent.toFixed(1)}% do sublimite</span>
                <span>R$ 3,6M</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80 text-[11px] leading-relaxed text-slate-300">
            {statusColors[sublimiteStatus].icon}
            <span className="flex-1">{sublimiteMessage}</span>
          </div>
        </div>

        {/* Card 2: Limite Máximo Simples (R$ 4,8M) */}
        <div
          className={`p-4 rounded-xl bg-slate-950/60 border ${statusColors[simplesTetoStatus].border} flex flex-col justify-between space-y-3`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Simples · Limite Máximo R$ 4,8M
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full border ${statusColors[simplesTetoStatus].badgeBg}`}
              >
                {simplesTetoStatus === 'red'
                  ? 'Exclusão'
                  : simplesTetoStatus === 'amber'
                    ? 'Alerta'
                    : 'Regular'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-base sm:text-lg font-black text-white">
                {formatBRL(effectiveSimplesRevenue)}
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    simplesTetoStatus === 'red'
                      ? 'bg-rose-500'
                      : simplesTetoStatus === 'amber'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, simplesTetoPercent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span>R$ 0</span>
                <span>{simplesTetoPercent.toFixed(1)}% do teto</span>
                <span>R$ 4,8M</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80 text-[11px] leading-relaxed text-slate-300">
            {statusColors[simplesTetoStatus].icon}
            <span className="flex-1">{simplesTetoMessage}</span>
          </div>
        </div>

        {/* Card 3: Lucro Presumido (Teto R$ 78M) */}
        <div
          className={`p-4 rounded-xl bg-slate-950/60 border ${statusColors[presumidoStatus].border} flex flex-col justify-between space-y-3`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Presumido · Teto R$ 78M/ano
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full border ${statusColors[presumidoStatus].badgeBg}`}
              >
                {presumidoStatus === 'red'
                  ? 'Obrigatório Real'
                  : presumidoStatus === 'amber'
                    ? 'Atenção'
                    : 'Elegível'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-base sm:text-lg font-black text-white">
                {formatBRL(presumidoRevenue)}
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    presumidoStatus === 'red'
                      ? 'bg-rose-500'
                      : presumidoStatus === 'amber'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, presumidoTetoPercent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span>R$ 0</span>
                <span>{presumidoTetoPercent.toFixed(1)}% do teto</span>
                <span>R$ 78M</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80 text-[11px] leading-relaxed text-slate-300">
            {statusColors[presumidoStatus].icon}
            <span className="flex-1">{presumidoMessage}</span>
          </div>
        </div>
      </div>

      {/* Faixa Inferior: Diagnóstico de Transição de Regime */}
      <div
        className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          transitionInsight.type === 'close'
            ? 'bg-amber-500/10 border-amber-500/30'
            : transitionInsight.type === 'exceeded'
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <TrendingUp
            className={`w-4 h-4 mt-0.5 shrink-0 ${
              transitionInsight.type === 'close'
                ? 'text-amber-400'
                : transitionInsight.type === 'exceeded'
                  ? 'text-rose-400'
                  : 'text-emerald-400'
            }`}
          />
          <div>
            <span
              className={`text-xs font-bold font-sans block ${
                transitionInsight.type === 'close'
                  ? 'text-amber-300'
                  : transitionInsight.type === 'exceeded'
                    ? 'text-rose-300'
                    : 'text-emerald-300'
              }`}
            >
              {transitionInsight.title}
            </span>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              {transitionInsight.desc}
            </p>
          </div>
        </div>

        {/* Ranking visual rápido */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0 self-end sm:self-center">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
            1º {regimes[0].name.split(' ')[0]} ({formatBRL(regimes[0].netProfit)})
          </span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            2º {regimes[1].name.split(' ')[0]} ({formatBRL(regimes[1].netProfit)})
          </span>
        </div>
      </div>
    </div>
  )
}
