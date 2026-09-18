import React from 'react'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'
import { Package, Award, ArrowUpRight, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface ProductRankingItem {
  id: string
  name: string
  primaryMetric: number // Receita ou Lucro conforme a perspectiva
  secondaryMetric: number // Custo ou Margem
  quantity: number
  percentage: number // % do total
  rank: number
  mode: 'liquid' | 'cost_margin'
}

export interface CockpitProductRankingProps {
  products: ProductRankingItem[]
  perspective: 'regime' | 'product' | 'price_mode'
  perspectiveLabel: string
  metricLabel: string
  totalConsolidated: number
  explanatoryNote: string
  onSelectProduct?: (productId: string) => void
  selectedProductId?: string
}

export const CockpitProductRanking: React.FC<CockpitProductRankingProps> = ({
  products,
  perspective,
  perspectiveLabel,
  metricLabel,
  totalConsolidated,
  explanatoryNote,
  onSelectProduct,
  selectedProductId,
}) => {
  const maxVal = products.length > 0 ? Math.max(...products.map((p) => p.primaryMetric), 1) : 1

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c081e]/95 via-[#080516]/95 to-[#04020a]/95 p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Ranking de Produtos (Curva ABC & Participação)
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-orange-500/40 text-orange-300 bg-orange-500/10"
            >
              ESTILO CUSTOMERS ACTIV
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Ordenação decrescente por {metricLabel} respeitando a perspectiva global (
            {perspectiveLabel}).
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
          <span>Total Base:</span>
          <strong className="text-white font-bold">{formatBRL(totalConsolidated)}</strong>
        </div>
      </div>

      {/* Lista de Produtos com Barras Proporcionais */}
      <div className="space-y-3 font-mono">
        {products.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            Nenhum produto cadastrado para ranqueamento.
          </div>
        ) : (
          products.map((p, idx) => {
            const barWidth = Math.min(100, Math.max(4, (p.primaryMetric / maxVal) * 100))
            const isSelected = selectedProductId === p.id
            // Cores alternadas elegantes do cockpit
            const barGradients = [
              'from-orange-500 to-amber-400',
              'from-sky-500 to-indigo-400',
              'from-emerald-500 to-teal-400',
              'from-purple-500 to-pink-400',
              'from-rose-500 to-amber-500',
            ]
            const gradient = barGradients[idx % barGradients.length]

            return (
              <div
                key={p.id || idx}
                onClick={() => onSelectProduct && onSelectProduct(p.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-orange-500/60 bg-white/[0.08] shadow-[0_0_16px_rgba(249,115,22,0.2)]'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : idx === 1
                            ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                            : idx === 2
                              ? 'bg-orange-600/20 text-orange-300 border border-orange-600/40'
                              : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-white block truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {p.quantity} un. •{' '}
                        {p.mode === 'liquid' ? 'Preço Líquido' : 'Custo + Margem'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-sm font-bold text-white block">
                        {formatBRL(p.primaryMetric)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{metricLabel}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-orange-500/40 text-orange-300 bg-orange-500/10 text-xs font-mono font-bold px-2 py-1 min-w-[54px] justify-center"
                    >
                      {p.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                {/* Barra Horizontal Proporcional (Estilo Customers Activ) */}
                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 shadow-sm`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Nota Explicativa */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl">
        <TrendingUp className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-orange-400">Por que isto importa:</strong> {explanatoryNote}
        </p>
      </div>
    </div>
  )
}
