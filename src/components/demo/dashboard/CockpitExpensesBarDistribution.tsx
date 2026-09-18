import React from 'react'
import { formatBRL } from '@/lib/taxCalculations'
import { PieChart as PieIcon, ArrowRight, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ExpenseCategoryBarItem {
  key: string
  label: string
  value: number
  percentage: number
  color: string
}

export interface CockpitExpensesBarDistributionProps {
  categories: ExpenseCategoryBarItem[]
  totalExpenses: number
  onManageExpenses: () => void
  explanatoryNote: string
}

export const CockpitExpensesBarDistribution: React.FC<CockpitExpensesBarDistributionProps> = ({
  categories,
  totalExpenses,
  onManageExpenses,
  explanatoryNote,
}) => {
  const maxVal = Math.max(1, ...categories.map((c) => c.value))

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c081e]/95 via-[#080516]/95 to-[#04020a]/95 p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Despesas por Categoria (Distribuição Visual)
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onManageExpenses}
            className="text-[11px] text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 h-7 font-mono cursor-pointer"
          >
            Gerenciar Despesas &rarr;
          </Button>
        </div>

        {/* Barras Horizontais Coloridas com % e Valor */}
        <div className="space-y-3 font-mono text-xs mt-3.5">
          {categories.map((cat) => {
            const barWidth = Math.min(100, Math.max(3, (cat.value / maxVal) * 100))

            return (
              <div
                key={cat.key}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: cat.color,
                        boxShadow: `0 0 8px ${cat.color}`,
                      }}
                    />
                    <span className="text-slate-300 font-semibold">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-white">{formatBRL(cat.value)}</span>
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: cat.color,
                        backgroundColor: `${cat.color}15`,
                      }}
                    >
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Barra horizontal preenchida */}
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: cat.color,
                      boxShadow: `0 0 6px ${cat.color}66`,
                    }}
                  />
                </div>
              </div>
            )
          })}

          {/* Card de Total Geral */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
            <span className="text-purple-300 font-bold">Total Geral de Despesas:</span>
            <span className="text-purple-400 font-bold text-sm">{formatBRL(totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Nota Explicativa */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl">
        <PieIcon className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-orange-400">Por que isto importa:</strong> {explanatoryNote}
        </p>
      </div>
    </div>
  )
}
