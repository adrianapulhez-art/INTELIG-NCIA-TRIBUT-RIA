import React from 'react'
import { Clock, Cpu, Award, CheckCircle } from 'lucide-react'

export function InvestmentThesisSection() {
  const blocks = [
    {
      title: 'Timing Regulatório',
      description:
        'A Reforma Tributária entrou em fase operacional em 2026. Cobrança teste de CBS e IBS já ativa. Novas obrigações fiscais desde agosto/2026. A janela de demanda é agora.',
      badge: 'EC 132/2023 • LC 214/2025 • Vigente',
      icon: Clock,
    },
    {
      title: 'Tecnologia Pronta',
      description:
        'Construída no Skip — AI Builder que cria ferramentas internas em horas, não meses. A IT é o caso de uso showcase de uma plataforma replicável para qualquer área regulatória.',
      badge: 'Skip AI Builder • Deploy instantâneo',
      icon: Cpu,
    },
    {
      title: 'Sem Concorrentes Diretos',
      description:
        'Nenhuma ferramenta no mercado brasileiro compara todos os regimes tributários com simulação pré e pós-Reforma em um único ambiente.',
      badge: 'Benchmark competitivo • Gap de mercado',
      icon: Award,
    },
  ]

  return (
    <section
      id="tese"
      className="py-20 md:py-28 relative bg-[#0b0f17] border-t border-slate-800/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Tese de investimento
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            A convergência perfeita: regulação + tecnologia + gap de mercado
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blocks.map((b, idx) => {
            const Icon = b.icon
            return (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 flex flex-col justify-between hover:border-slate-700 hover:bg-slate-900/90 transition-all duration-300 group shadow-lg"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{b.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6">{b.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/70">
                  <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 inline-block">
                    {b.badge}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
