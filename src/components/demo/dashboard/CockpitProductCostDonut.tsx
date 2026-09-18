import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatBRL } from '@/lib/taxCalculations'
import { Package, Info, ChevronRight } from 'lucide-react'

export interface CostSliceItem {
  key: string
  name: string
  value: number // R$ unitário
  percentage: number // % do custo unitário
  color: string
}

export interface CockpitProductCostDonutProps {
  productName: string
  productId: string
  unitCost: number
  slices: CostSliceItem[]
  explanatoryNote: string
  onOpenDrillDown?: () => void
  isHighlighted?: boolean
}

export const CockpitProductCostDonut: React.FC<CockpitProductCostDonutProps> = ({
  productName,
  productId,
  unitCost,
  slices,
  explanatoryNote,
  onOpenDrillDown,
  isHighlighted = false,
}) => {
  const chartData = slices.map((s) => ({
    name: s.name,
    value: Math.max(0, s.value),
    displayValue: s.value,
    percentage: s.percentage,
    color: s.color,
  }))

  const hasCost = unitCost > 0

  return (
    <div
      id="quadro-donut-produto"
      className={`relative group rounded-2xl border transition-all duration-300 p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden flex flex-col justify-between ${
        isHighlighted
          ? 'border-orange-500/60 bg-gradient-to-br from-[#180d2c]/95 via-[#0e0720]/95 to-[#06030e]/95 ring-2 ring-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.25)]'
          : 'border-purple-500/20 bg-gradient-to-br from-[#0c081e]/95 via-[#080516]/95 to-[#04020a]/95'
      }`}
    >
      {/* Glow de fundo neon */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-16 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-[240px] sm:max-w-none">
              Composição de Custo: {productName}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenDrillDown && (
              <button
                type="button"
                onClick={onOpenDrillDown}
                className="text-[11px] font-mono text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                Trocar Produto
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
              DRILL-DOWN
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Desdobramento unitário em mercadoria bruta, frete e encargos do item selecionado.
        </p>
      </div>

      {/* Miolo: Donut com Custo Unitário ao Centro + Legenda Colorida */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-4">
        {/* Lado Esquerdo: Donut Recharts com Custo Unitário ao Centro */}
        <div className="md:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
            {hasCost ? (
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
                                Valor Unitário:{' '}
                                <strong className="text-white">{formatBRL(d.displayValue)}</strong>
                              </div>
                              <div>
                                Fatia do Custo:{' '}
                                <strong className="text-orange-400">
                                  {d.percentage.toFixed(1)}%
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
                        key={`slice-${index}`}
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
                Sem custo unitário
              </div>
            )}

            {/* Custo Unitário ao centro — formato exato do print da Adriana */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-semibold">
                Custo Unitário
              </span>
              <span className="text-base sm:text-lg font-black text-white font-mono tracking-tight mt-0.5 drop-shadow">
                {formatBRL(unitCost)}
              </span>
              <span className="text-[9px] font-mono text-emerald-400/90 mt-0.5">Base Unitária</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Legenda colorida com nome + valor + % */}
        <div className="md:col-span-6 space-y-2.5 font-mono text-xs">
          {slices.map((s) => (
            <div
              key={s.key}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{
                    backgroundColor: s.color,
                    boxShadow: `0 0 8px ${s.color}`,
                  }}
                />
                <span className="font-bold text-slate-200 truncate">{s.name}</span>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="font-bold text-white block">{formatBRL(s.value)}</span>
                <span className="text-[11px] font-bold block" style={{ color: s.color }}>
                  {s.percentage.toFixed(1)}% do custo
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota explicativa dinâmica */}
      <div className="relative z-10 mt-2 pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl">
        <Info className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-orange-400">Por que isto importa:</strong> {explanatoryNote}
        </p>
      </div>
    </div>
  )
}
