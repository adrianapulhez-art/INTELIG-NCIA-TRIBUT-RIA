import React from 'react'
import { formatBRL } from '@/lib/taxCalculations'
import { Calculator, ArrowRight, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface MethodologyComparisonRow {
  regimeKey: 'presumido' | 'real' | 'simples'
  regimeName: string
  color: string
  // Preço Líquido Desejado
  liquidGrossRevenue: number
  liquidNetProfit: number
  // Custo + Margem
  costMarginGrossRevenue: number
  costMarginNetProfit: number
  // Indicador de dados válidos
  hasData: boolean
}

export interface CockpitMethodologyHybridTableProps {
  rows: MethodologyComparisonRow[]
  explanatoryNote: string
}

export const CockpitMethodologyHybridTable: React.FC<CockpitMethodologyHybridTableProps> = ({
  rows,
  explanatoryNote,
}) => {
  // Encontrar valor máximo para dimensionar as barras horizontais
  const maxGross = Math.max(
    1,
    ...rows.map((r) => Math.max(r.liquidGrossRevenue, r.costMarginGrossRevenue)),
  )

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c081e]/95 via-[#080516]/95 to-[#04020a]/95 p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Comparador de Metodologias: Preço Líquido Desejado vs Custo + Margem
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-orange-500/30 text-orange-300 bg-orange-500/10"
            >
              TABELA HÍBRIDA COM BARRAS
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Confronto numérico e barras comparativas lado a lado para cada regime, com delta da
            metodologia vencedora.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-purple-500/30 bg-purple-950/20 text-slate-200">
              <th className="py-2.5 px-3 text-left">Regime</th>
              <th className="py-2.5 px-3 text-left w-52">Comparação Visual de Preço</th>
              <th className="py-2.5 px-3 text-right">Preço Bruto (Líquido)</th>
              <th className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                Lucro Líq. (Líq.)
              </th>
              <th className="py-2.5 px-3 text-right">Preço Bruto (Custo+M)</th>
              <th className="py-2.5 px-3 text-right text-sky-400 font-bold">
                Lucro Líq. (Custo+M)
              </th>
              <th className="py-2.5 px-3 text-center">Metodologia Vencedora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => {
              const liquidWidth = Math.min(100, (r.liquidGrossRevenue / maxGross) * 100)
              const costMarginWidth = Math.min(100, (r.costMarginGrossRevenue / maxGross) * 100)
              const deltaProfit = r.liquidNetProfit - r.costMarginNetProfit
              const liquidWins = deltaProfit >= 0

              return (
                <tr key={r.regimeKey} className="hover:bg-white/[0.03] transition-colors">
                  {/* Nome do Regime */}
                  <td className="py-3 px-3 text-white font-semibold">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: r.color,
                          boxShadow: `0 0 8px ${r.color}`,
                        }}
                      />
                      <span>{r.regimeName}</span>
                    </div>
                  </td>

                  {/* Barras Horizontais Comparativas lado a lado */}
                  <td className="py-3 px-3">
                    <div className="space-y-1 w-full">
                      {/* Barra Preço Líquido */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-7 text-[9px] text-emerald-400 font-bold flex-shrink-0">
                          LÍQ
                        </span>
                        <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500 shadow-[0_0_6px_#10b981]"
                            style={{ width: `${liquidWidth}%` }}
                          />
                        </div>
                      </div>
                      {/* Barra Custo + Margem */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-7 text-[9px] text-sky-400 font-bold flex-shrink-0">
                          C+M
                        </span>
                        <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-500 shadow-[0_0_6px_#38bdf8]"
                            style={{ width: `${costMarginWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Preço Líquido Desejado */}
                  <td className="py-3 px-3 text-right text-slate-300">
                    {r.hasData ? formatBRL(r.liquidGrossRevenue) : '—'}
                  </td>

                  {/* Lucro Líquido (Líquido) */}
                  <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                    {r.hasData ? formatBRL(r.liquidNetProfit) : '—'}
                  </td>

                  {/* Preço Custo + Margem */}
                  <td className="py-3 px-3 text-right text-slate-300">
                    {r.hasData ? formatBRL(r.costMarginGrossRevenue) : '—'}
                  </td>

                  {/* Lucro Líquido (Custo + Margem) */}
                  <td className="py-3 px-3 text-right text-sky-400 font-bold">
                    {r.hasData ? formatBRL(r.costMarginNetProfit) : '—'}
                  </td>

                  {/* Metodologia Vencedora com Barra Divergente / Badge */}
                  <td className="py-3 px-3 text-center">
                    {r.hasData ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border border-white/10 bg-white/[0.04]">
                        {liquidWins ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Líquido (+{formatBRL(Math.abs(deltaProfit))})
                          </span>
                        ) : (
                          <span className="text-sky-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Custo+M (+{formatBRL(Math.abs(deltaProfit))})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Nota Explicativa */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl">
        <Calculator className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-orange-400">Por que isto importa:</strong> {explanatoryNote}
        </p>
      </div>
    </div>
  )
}
