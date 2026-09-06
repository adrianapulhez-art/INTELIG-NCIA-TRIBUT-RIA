import React from 'react'
import { Sliders, GitCompare, CheckCircle2, ArrowRight } from 'lucide-react'

export function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Configure o cenário',
      description:
        'Insira receita, setor, regime atual e parâmetros da operação. A IT carrega automaticamente as alíquotas vigentes.',
      icon: Sliders,
    },
    {
      number: '02',
      title: 'Compare os regimes',
      description:
        'Veja lado a lado Lucro Real, Presumido, Simples Nacional e Autônomo — pré e pós EC 132, com simulação visual.',
      icon: GitCompare,
    },
    {
      number: '03',
      title: 'Decida com precisão',
      description:
        'Receba o preço de venda ideal por regime, com margem projetada e impacto fiscal total. Exporte e compartilhe.',
      icon: CheckCircle2,
    },
  ]

  return (
    <section
      id="como-funciona"
      className="py-20 md:py-28 relative bg-[#090d15] border-t border-slate-800/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 text-center mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Como funciona
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Da complexidade à decisão em 3 passos
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            O empresário não precisa entender tributação. A IT entende por ele.
          </p>
        </div>

        {/* 3 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div
                key={idx}
                className="relative rounded-2xl bg-slate-900/60 border border-slate-800 p-8 flex flex-col justify-between hover:border-emerald-500/40 hover:bg-slate-900/90 transition-all duration-300 group shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-400/70 group-hover:text-emerald-400 transition-colors">
                      {step.number}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{step.title}</h3>

                  <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/60 flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <span>Passo {step.number} de 03</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
