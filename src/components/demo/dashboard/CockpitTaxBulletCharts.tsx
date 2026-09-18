import React from 'react'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'
import { Layers, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface TaxBulletItem {
  regimeKey: 'presumido' | 'real' | 'simples'
  regimeName: string
  taxAmount: number
  grossRevenue: number
  effectiveRate: number // ex: 14.85%
  benchmarkRate?: number // taxa de referência (ex: alíquota nominal média ou 28%)
  color: string
}

export interface CockpitTaxBulletChartsProps {
  items: TaxBulletItem[]
  explanatoryNote: string
}

export const CockpitTaxBulletCharts: React.FC<CockpitTaxBulletChartsProps> = ({
  items,
  explanatoryNote,
}) => {
  // Limite máximo para a escala do bullet chart (ex: 35% de carga tributária)
  const maxScaleRate = 35

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c081e]/95 via-[#080516]/95 to-[#04020a]/95 p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Bullet Charts de Carga Tributária Efetiva
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-orange-500/30 text-orange-300 bg-orange-500/10"
            >
              ALÍQUOTAS EFETIVAS
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Barras de alíquota efetiva com marcador de peso tributário real por regime, replicando a
            marca de referência analítica.
          </p>
        </div>
      </div>

      {/* Lista de Bullet Charts por Regime */}
      <div className="space-y-4 font-mono">
        {items.map((it) => {
          const clampedRate = Math.min(maxScaleRate, Math.max(0, it.effectiveRate))
          const barWidth = (clampedRate / maxScaleRate) * 100

          return (
            <div
              key={it.regimeKey}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: it.color,
                      boxShadow: `0 0 8px ${it.color}`,
                    }}
                  />
                  <span className="font-bold text-white">{it.regimeName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-[11px]">
                    Tributos: <strong className="text-white">{formatBRL(it.taxAmount)}</strong>
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded border"
                    style={{
                      color: it.color,
                      borderColor: `${it.color}40`,
                      backgroundColor: `${it.color}15`,
                    }}
                  >
                    {it.effectiveRate.toFixed(2)}% efetivo
                  </span>
                </div>
              </div>

              {/* Bullet Bar com Marcador */}
              <div className="relative w-full h-5 bg-white/5 rounded-lg overflow-hidden flex items-center p-0.5">
                {/* Trilhas de faixa de intensidade (0-10% leve, 10-20% moderado, 20-35% pesado) */}
                <div className="absolute inset-0 flex opacity-20 pointer-events-none">
                  <div className="w-[28.5%] h-full bg-emerald-500 border-r border-black/40" />
                  <div className="w-[28.5%] h-full bg-amber-500 border-r border-black/40" />
                  <div className="w-[43%] h-full bg-rose-500" />
                </div>

                {/* Barra preenchida da alíquota efetiva */}
                <div
                  className="h-3.5 rounded-md transition-all duration-700 relative z-10"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: it.color,
                    boxShadow: `0 0 10px ${it.color}66`,
                  }}
                />

                {/* Marcador de linha vertical do ponto da alíquota */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white z-20 rounded-full shadow-[0_0_6px_#fff]"
                  style={{ left: `calc(${barWidth}% - 2px)` }}
                />
              </div>

              {/* Escala de rodapé */}
              <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                <span>0% (Isento)</span>
                <span>10% (Leve)</span>
                <span>20% (Moderado)</span>
                <span>35%+ (Pesado)</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Nota Explicativa */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl">
        <Info className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-orange-400">Por que isto importa:</strong> {explanatoryNote}
        </p>
      </div>
    </div>
  )
}
