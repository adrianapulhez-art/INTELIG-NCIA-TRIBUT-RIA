import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'
import { ShieldCheck, Info } from 'lucide-react'

export interface TaxRegimeDonutItem {
  key: 'presumido' | 'real' | 'simples'
  name: string
  shortName: string
  value: number // R$ tributos
  percentage: number // % do total
  effectiveRate: number // % sobre receita
  color: string
}

export interface CockpitTaxRegimeDonutProps {
  items: TaxRegimeDonutItem[]
  totalConsolidatedTax: number
  explanatoryNote: string
}

export const CockpitTaxRegimeDonut: React.FC<CockpitTaxRegimeDonutProps> = ({
  items,
  totalConsolidatedTax,
  explanatoryNote,
}) => {
  // Dados para o Recharts Pie
  const chartData = items.map((it) => ({
    name: it.name,
    shortName: it.shortName,
    value: Math.max(0, it.value),
    displayValue: it.value,
    percentage: it.percentage,
    effectiveRate: it.effectiveRate,
    color: it.color,
  }))

  const hasAnyValue = totalConsolidatedTax > 0

  return (
    <div className="relative group rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c081e]/95 via-[#080516]/95 to-[#04020a]/95 p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden flex flex-col justify-between">
      {/* Glow de fundo neon */}
      <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-16 w-48 h-48 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-[0_0_8px_#f97316]" />
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Carga Tributária por Regime
            </h3>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-orange-500/30 text-orange-300 bg-orange-500/10">
            DONUT COCKPIT
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Fração de cada regime sobre o total consolidado de tributos calculados.
        </p>
      </div>

      {/* Miolo: Donut com Total ao Centro + Legenda Colorida ao lado (como na referência) */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-4">
        {/* Lado Esquerdo: Donut Recharts com centro escuro luminoso */}
        <div className="md:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
            {hasAnyValue ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload
                        return (
                          <div className="rounded-xl border border-purple-500/40 bg-[#070314]/95 p-3 shadow-2xl backdrop-blur-md font-mono text-xs text-white">
                            <div className="flex items-center gap-2 mb-1.5 font-bold">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: d.color }}
                              />
                              <span>{d.name}</span>
                            </div>
                            <div className="space-y-1 text-slate-300 text-[11px]">
                              <div>
                                Tributos:{' '}
                                <strong className="text-white">{formatBRL(d.displayValue)}</strong>
                              </div>
                              <div>
                                Fração do grupo:{' '}
                                <strong className="text-orange-400">
                                  {d.percentage.toFixed(1)}%
                                </strong>
                              </div>
                              <div>
                                Alíq. Efetiva:{' '}
                                <strong className="text-emerald-400">
                                  {d.effectiveRate.toFixed(2)}%
                                </strong>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="88%"
                    paddingAngle={3}
                    dataKey="value"
                    stroke="#070314"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        style={{
                          filter: `drop-shadow(0 0 6px ${entry.color}66)`,
                        }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-44 h-44 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center text-xs font-mono text-slate-500">
                Sem tributos apurados
              </div>
            )}

            {/* Total ao centro — formato exato do cockpit da Adriana */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-semibold">
                Tributos Grupo
              </span>
              <span className="text-base sm:text-lg font-black text-white font-mono tracking-tight mt-0.5 drop-shadow">
                {formatBRL(totalConsolidatedTax)}
              </span>
              <span className="text-[9px] font-mono text-orange-400/90 mt-0.5">
                Consolidado 3 Regimes
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Legenda colorida com Nome + Valor + % de cada regime */}
        <div className="md:col-span-6 space-y-2.5 font-mono text-xs">
          {items.map((it) => (
            <div
              key={it.key}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{
                    backgroundColor: it.color,
                    boxShadow: `0 0 8px ${it.color}`,
                  }}
                />
                <div className="min-w-0">
                  <span className="font-bold text-slate-200 block truncate">{it.name}</span>
                  <span className="text-[10px] text-slate-400 block">
                    Alíq. Efetiva: {it.effectiveRate.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="font-bold text-white block">{formatBRL(it.value)}</span>
                <span className="text-[11px] font-bold block" style={{ color: it.color }}>
                  {it.percentage.toFixed(1)}% do grupo
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota explicativa dinâmica interpolando números reais */}
      <div className="relative z-10 mt-2 pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl">
        <Info className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-orange-400">Por que isto importa:</strong> {explanatoryNote}
        </p>
      </div>
    </div>
  )
}
