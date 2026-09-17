import React from 'react'
import { formatBRL } from '@/lib/taxCalculations'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sparkles, TrendingDown } from 'lucide-react'

export interface RegimeRevenueItem {
  key: 'presumido' | 'real' | 'simples'
  label: string
  revenue: number | null
  products: { id: string; name?: string; salePrice: number }[]
}

export interface RegimeComparisonBarChartProps {
  items: RegimeRevenueItem[]
}

export const RegimeComparisonBarChart: React.FC<RegimeComparisonBarChartProps> = ({ items }) => {
  // Filtrar apenas regimes com dados válidos (> 0)
  const validItems = items.filter(
    (it): it is RegimeRevenueItem & { revenue: number } =>
      typeof it.revenue === 'number' && Number.isFinite(it.revenue) && it.revenue > 0,
  )

  if (validItems.length === 0) {
    return null
  }

  // Identificar menor receita (vencedor / mais barato) e maior receita (mais caro)
  const sorted = [...validItems].sort((a, b) => a.revenue - b.revenue)
  const cheapest = sorted[0]
  const mostExpensive = sorted[sorted.length - 1]
  const maxRevenue = mostExpensive.revenue

  // Derivativos da diferença do regime mais barato frente ao mais caro
  const diffCheapestVsMostExpensive =
    validItems.length > 1 && cheapest.key !== mostExpensive.key
      ? mostExpensive.revenue - cheapest.revenue
      : 0

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 sm:p-3.5 my-2 shadow-inner">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold tracking-wide text-slate-300 uppercase">
            Receita Consolidada × Menor Preço
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
          Passe o mouse nas barras para ver médias e destaques
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const hasVal =
            typeof item.revenue === 'number' && Number.isFinite(item.revenue) && item.revenue > 0
          const val = hasVal ? (item.revenue as number) : 0
          const isCheapest =
            hasVal && cheapest && cheapest.key === item.key && validItems.length > 1
          const pct =
            maxRevenue > 0 && hasVal ? Math.max(12, Math.min(100, (val / maxRevenue) * 100)) : 0

          // Derivadas do tooltip: preço unitário médio e produto mais competitivo (menor preço unitário)
          const validProds = item.products.filter(
            (p) => typeof p.salePrice === 'number' && p.salePrice > 0,
          )
          const avgPrice =
            validProds.length > 0
              ? validProds.reduce((acc, cur) => acc + cur.salePrice, 0) / validProds.length
              : 0
          const mostCompetitiveProd =
            validProds.length > 0
              ? [...validProds].sort((a, b) => a.salePrice - b.salePrice)[0]
              : null

          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <div
                  className={`group relative flex items-center gap-2 sm:gap-3 p-1.5 rounded-lg transition-all cursor-pointer ${
                    isCheapest
                      ? 'bg-emerald-950/30 border border-emerald-500/30 hover:border-emerald-500/50'
                      : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  {/* Rótulo do Regime */}
                  <div className="w-24 sm:w-28 shrink-0 text-left font-mono">
                    <span
                      className={`text-[11px] sm:text-xs font-semibold block truncate ${
                        isCheapest ? 'text-emerald-300 font-bold' : 'text-slate-300'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Barra de Progresso com Glow no vencedor */}
                  <div className="relative flex-1 h-5 sm:h-6 bg-slate-950/70 rounded-md overflow-hidden p-0.5 border border-slate-800/80">
                    {hasVal ? (
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded transition-all duration-500 flex items-center justify-end pr-1.5 ${
                          isCheapest
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                            : 'bg-slate-700/80 group-hover:bg-slate-600/80'
                        }`}
                      >
                        {isCheapest && <Sparkles className="w-3 h-3 text-slate-950 shrink-0" />}
                      </div>
                    ) : (
                      <div className="h-full flex items-center px-2 text-[10px] font-mono text-slate-600 italic">
                        Sem dados
                      </div>
                    )}
                  </div>

                  {/* Valor da Receita e Badge de Economia */}
                  <div className="w-32 sm:w-48 shrink-0 text-right font-mono flex items-center justify-end gap-1.5">
                    {hasVal ? (
                      <>
                        <span
                          className={`text-xs font-black ${
                            isCheapest
                              ? 'text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]'
                              : 'text-slate-200'
                          }`}
                        >
                          {formatBRL(val)}
                        </span>

                        {isCheapest && diffCheapestVsMostExpensive > 0 && (
                          <span
                            className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap"
                            title={`Economia de ${formatBRL(diffCheapestVsMostExpensive)} em relação ao regime ${mostExpensive.label}`}
                          >
                            <TrendingDown className="w-2.5 h-2.5 shrink-0" />
                            <span>
                              −{formatBRL(diffCheapestVsMostExpensive)} vs.{' '}
                              {mostExpensive.label.replace('Lucro ', '')}
                            </span>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-slate-950 border border-slate-700 text-slate-100 p-2.5 font-mono text-xs shadow-xl max-w-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                  <span className="font-bold text-emerald-400">{item.label}</span>
                  <span className="text-[10px] text-slate-400">
                    {validProds.length} {validProds.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-[11px] text-slate-300">
                  <span className="text-slate-400">Receita Consolidada:</span>
                  <span className="font-bold text-white">{hasVal ? formatBRL(val) : '—'}</span>
                </div>
                <div className="flex justify-between gap-3 text-[11px] text-slate-300">
                  <span className="text-slate-400">Preço unitário médio:</span>
                  <span className="font-bold text-slate-200">
                    {avgPrice > 0 ? formatBRL(avgPrice) : '—'}
                  </span>
                </div>
                {mostCompetitiveProd && (
                  <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-300">
                    <span className="text-slate-400 block">Mais competitivo:</span>
                    <span className="font-semibold text-emerald-300 truncate block">
                      {mostCompetitiveProd.name || 'Produto'} (
                      {formatBRL(mostCompetitiveProd.salePrice)})
                    </span>
                  </div>
                )}
                {isCheapest && diffCheapestVsMostExpensive > 0 && (
                  <div className="pt-1 border-t border-emerald-500/30 text-[10px] text-emerald-300 font-semibold">
                    Economia total de {formatBRL(diffCheapestVsMostExpensive)} frente a{' '}
                    {mostExpensive.label}.
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
