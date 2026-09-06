import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Check,
  Sparkles,
  ArrowRight,
  Table as TableIcon,
  BarChart3,
  Calculator,
} from 'lucide-react'

interface SolutionSectionProps {
  onRequestAccess: () => void
}

export function SolutionSection({ onRequestAccess }: SolutionSectionProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table')

  const features = [
    'Cálculo de preço de venda com todos os tributos — CBS, IBS, ICMS, ISS, PIS, Cofins, IRPJ, CSLL',
    'Comparação lado a lado entre Lucro Real, Presumido, Simples Nacional e Pessoa Física Autônomo',
    'Simulação de cenários pré e pós Reforma Tributária (EC 132)',
    'Análise de impacto regulatório com atualizações automáticas conforme novas normas',
  ]

  const regimesData = [
    {
      regime: 'Simples Nacional',
      carga: '3,72%',
      precoFinal: 'R$ 1.037,20',
      delta: '—',
      percentage: 39.3,
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      barColor: 'bg-emerald-500',
    },
    {
      regime: 'Lucro Presumido',
      carga: '5,04%',
      precoFinal: 'R$ 1.050,40',
      delta: '+1,32pp',
      percentage: 53.3,
      badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      barColor: 'bg-teal-500',
    },
    {
      regime: 'Lucro Real',
      carga: '6,18%',
      precoFinal: 'R$ 1.061,80',
      delta: '+2,46pp',
      percentage: 65.4,
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      barColor: 'bg-sky-500',
    },
    {
      regime: 'Autônomo (IRPF)',
      carga: '9,45%',
      precoFinal: 'R$ 1.094,50',
      delta: '+5,73pp',
      percentage: 100,
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      barColor: 'bg-amber-500',
    },
  ]

  return (
    <section id="solucao" className="py-20 md:py-28 relative bg-[#0b0f17]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Solution copy & bullets */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Calculator className="w-3.5 h-3.5" />
              A solução
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Não é mais uma calculadora.{' '}
              <span className="text-emerald-400">É inteligência tributária completa.</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-300 font-medium">
              Um único ambiente. Cálculo instantâneo. Precisão enterprise. Comparação visual.
            </p>

            <ul className="space-y-4 pt-2">
              {features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    {feat}
                  </span>
                </li>
              ))}
            </ul>

            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button
                onClick={onRequestAccess}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 h-11 rounded-lg shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Solicitar Acesso</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-slate-400 font-mono flex items-center gap-2 pt-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Construído no Skip — o AI Builder que cria ferramentas internas em horas, não meses
            </p>
          </div>

          {/* Right Column: Comparative Interactive Card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Comparativo de regimes
                    <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      pós EC 132
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Base simulada: Serviço prestado com alíquota teste 2026
                  </p>
                </div>

                {/* View switcher */}
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setActiveTab('table')}
                    className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'table'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    Tabela
                  </button>
                  <button
                    onClick={() => setActiveTab('chart')}
                    className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'chart'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Gráfico
                  </button>
                </div>
              </div>

              {/* Table Mode */}
              {activeTab === 'table' ? (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Regime</th>
                        <th className="pb-3 font-semibold">Carga</th>
                        <th className="pb-3 font-semibold">Preço final</th>
                        <th className="pb-3 font-semibold text-right">Δ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {regimesData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="py-3.5 font-sans font-medium text-slate-200">
                            {row.regime}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold border ${row.badgeColor}`}
                            >
                              {row.carga}
                            </span>
                          </td>
                          <td className="py-3.5 text-white font-bold">{row.precoFinal}</td>
                          <td className="py-3.5 text-right text-xs">
                            <span
                              className={
                                row.delta === '—'
                                  ? 'text-slate-500'
                                  : 'text-amber-400 font-semibold'
                              }
                            >
                              {row.delta}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Chart Mode: Bars preview */
                <div className="mt-6 space-y-5">
                  {regimesData.map((row, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-200 font-sans font-medium">{row.regime}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">{row.precoFinal}</span>
                          <span className="text-white font-bold">{row.carga}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800">
                        <div
                          className={`h-2.5 rounded-full ${row.barColor} transition-all duration-700`}
                          style={{ width: `${row.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Quick Regimes labels */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                  Simples Nacional
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-teal-400">
                  Lucro Presumido
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-sky-400">
                  Lucro Real
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-amber-400">
                  Autônomo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
