import React from 'react'
import { Sparkles, ArrowUpRight, Trophy } from 'lucide-react'

export interface CockpitAdvantageHeroCardProps {
  bestRegimeName: string
  bestRegimeKey: 'presumido' | 'real' | 'simples'
  bestNetProfit: string
  bestNetMargin: string
  economyAmount: string
  hasEconomy: boolean
  worstRegimeName?: string
}

export const CockpitAdvantageHeroCard: React.FC<CockpitAdvantageHeroCardProps> = ({
  bestRegimeName,
  bestRegimeKey,
  bestNetProfit,
  bestNetMargin,
  economyAmount,
  hasEconomy,
  worstRegimeName,
}) => {
  // Paleta de acento por regime: Presumido = Laranja, Real = Azul, Simples = Esmeralda
  const regimeConfig = {
    presumido: {
      color: '#f97316',
      border: 'border-orange-500/40',
      gradient: 'from-orange-500/20 via-purple-900/30 to-[#070412]',
      shadow: 'shadow-[0_0_35px_rgba(249,115,22,0.25)]',
      glow: 'bg-orange-500/30',
      badge: 'border-orange-500/50 text-orange-300 bg-orange-500/15',
    },
    real: {
      color: '#38bdf8',
      border: 'border-sky-500/40',
      gradient: 'from-sky-500/20 via-indigo-950/30 to-[#070412]',
      shadow: 'shadow-[0_0_35px_rgba(56,189,248,0.25)]',
      glow: 'bg-sky-500/30',
      badge: 'border-sky-500/50 text-sky-300 bg-sky-500/15',
    },
    simples: {
      color: '#10b981',
      border: 'border-emerald-500/40',
      gradient: 'from-emerald-500/20 via-teal-950/30 to-[#070412]',
      shadow: 'shadow-[0_0_35px_rgba(16,185,129,0.25)]',
      glow: 'bg-emerald-500/30',
      badge: 'border-emerald-500/50 text-emerald-300 bg-emerald-500/15',
    },
  }[bestRegimeKey]

  return (
    <div
      className={`relative group rounded-2xl border ${regimeConfig.border} bg-gradient-to-br ${regimeConfig.gradient} p-4 sm:p-5 ${regimeConfig.shadow} backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col justify-between`}
    >
      {/* Luz neon de fundo */}
      <div
        className={`absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-40 ${regimeConfig.glow}`}
      />

      {/* Topo do Card */}
      <div className="flex items-center justify-between text-xs mb-2 z-10">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400 drop-shadow" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">
            Regime Mais Vantajoso
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase border ${regimeConfig.badge}`}
        >
          Vencedor
        </span>
      </div>

      {/* Nome do Regime e Lucro */}
      <div className="z-10 my-1">
        <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <span>{bestRegimeName}</span>
          <ArrowUpRight className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-xs font-mono text-slate-300">
            Lucro: <strong className="text-white">{bestNetProfit}</strong>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs font-mono text-emerald-300">
            Margem: <strong>{bestNetMargin}</strong>
          </span>
        </div>
      </div>

      {/* Vantagem Comparativa */}
      <div className="mt-3 pt-2.5 border-t border-white/10 z-10 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">Economia no Cenário:</span>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-sm font-black text-emerald-300 font-mono tracking-tight">
            {hasEconomy ? `+${economyAmount}` : 'Empate técnico'}
          </span>
        </div>
      </div>
      {hasEconomy && worstRegimeName && (
        <p className="text-[10px] text-slate-400 font-mono mt-1 text-right z-10">
          frente ao pior cenário ({worstRegimeName})
        </p>
      )}
    </div>
  )
}
