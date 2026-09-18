import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { TrendingUp, Layers, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/taxCalculations'

export interface HeroAreaConfrontationItem {
  regimeKey: 'presumido' | 'real' | 'simples'
  name: string
  shortName: string
  receitaLiquida: number
  cargaTributaria: number
  lucroLiquido: number
  cmv: number
  aliquotaEfetiva: number
  isBest?: boolean
}

export interface CockpitHeroAreaChartProps {
  data: HeroAreaConfrontationItem[]
  explanatoryNote: string
  bestRegimeName: string
}

export const CockpitHeroAreaChart: React.FC<CockpitHeroAreaChartProps> = ({
  data,
  explanatoryNote,
  bestRegimeName,
}) => {
  return (
    <div className="relative group rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c081e]/95 via-[#080516]/95 to-[#04020a]/95 p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden">
      {/* Glow de fundo neon no topo */}
      <div className="absolute -top-24 left-1/3 w-96 h-48 bg-orange-500/15 blur-[110px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 -right-20 w-80 h-80 bg-purple-600/15 blur-[120px] pointer-events-none rounded-full" />

      {/* Header do Gráfico-Hero */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              Confronto Direto: Receita Líquida × Carga Tributária
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-orange-500/40 text-orange-300 bg-orange-500/10 px-2 py-0.5"
            >
              GRÁFICO-HERO CANÔNICO
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visualização em área luminosa confrontando a eficiência tributária e geração líquida dos
            três regimes.
          </p>
        </div>

        {/* Indicador do Vencedor + Legenda rápida */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vencedor: </span>
            <strong className="text-orange-400 font-bold">{bestRegimeName}</strong>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-orange-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-[0_0_8px_#f97316]" />
              Presumido
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
              Real
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
              Simples
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico de Área Luminoso Recharts */}
      <div className="relative z-10 h-80 sm:h-96 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 25, left: 10, bottom: 10 }}>
            <defs>
              {/* Gradiente luminoso da Receita Líquida (Esmeralda/Verde neon) */}
              <linearGradient id="areaReceitaLiquida" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              {/* Gradiente luminoso da Carga Tributária (Laranja neon) */}
              <linearGradient id="areaCargaTributaria" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
              {/* Gradiente luminoso do Lucro Líquido (Azul neon) */}
              <linearGradient id="areaLucroLiquido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#261b47" opacity={0.6} vertical={false} />

            <XAxis
              dataKey="name"
              stroke="#64748b"
              tick={{ fill: '#cbd5e1', fontSize: 12, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#33245c' }}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={{ stroke: '#33245c' }}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const currentItem = data.find((d) => d.name === label)
                  return (
                    <div className="rounded-xl border border-purple-500/40 bg-[#070314]/95 p-3.5 shadow-2xl backdrop-blur-md font-mono text-xs text-white min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                        <span className="font-bold text-sm text-slate-100">{label}</span>
                        {currentItem?.isBest && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">
                            ★ Recomendado
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {payload.map((entry) => (
                          <div key={entry.name} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.name}:
                            </span>
                            <span className="font-bold text-white">
                              {formatBRL(Number(entry.value) || 0)}
                            </span>
                          </div>
                        ))}
                        {currentItem && (
                          <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                            <span>Alíquota Efetiva:</span>
                            <span className="text-orange-400 font-bold">
                              {currentItem.aliquotaEfetiva.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />

            <Legend
              wrapperStyle={{
                fontSize: '11px',
                fontFamily: 'monospace',
                paddingTop: '16px',
              }}
              iconType="circle"
            />

            <Area
              type="monotone"
              dataKey="receitaLiquida"
              name="Receita Líquida"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#areaReceitaLiquida)"
              dot={{ r: 5, fill: '#10b981', stroke: '#070314', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }}
            />

            <Area
              type="monotone"
              dataKey="cargaTributaria"
              name="Carga Tributária Total"
              stroke="#f97316"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#areaCargaTributaria)"
              dot={{ r: 5, fill: '#f97316', stroke: '#070314', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#f97316', stroke: '#fff', strokeWidth: 3 }}
            />

            <Area
              type="monotone"
              dataKey="lucroLiquido"
              name="Lucro Líquido Final"
              stroke="#38bdf8"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#areaLucroLiquido)"
              dot={{ r: 4.5, fill: '#38bdf8', stroke: '#070314', strokeWidth: 2 }}
              activeDot={{ r: 6.5, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* G) NOTA EXPLICATIVA SOB O GRÁFICO (REQUISITO FORTE DA USUÁRIA) */}
      <div className="relative z-10 mt-3 pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl">
        <Layers className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-orange-400">Por que isto importa:</strong> {explanatoryNote}
        </p>
      </div>
    </div>
  )
}
