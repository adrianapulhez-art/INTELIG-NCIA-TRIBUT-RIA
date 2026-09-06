import React from 'react'
import { AlertTriangle, Layers, TrendingDown, Scale } from 'lucide-react'

export function ProblemSection() {
  const problems = [
    {
      stat: '100K+',
      label: 'empresas impactadas',
      title: 'Complexidade Exponencial',
      description:
        'CBS (0,9%), IBS (0,1%), Simples Híbrido, novos regimes de apuração. Mais de 100 mil empresas devem migrar de regime em 2026.',
      icon: Layers,
      accent: 'emerald',
    },
    {
      stat: '4 × 2 = 8+',
      label: 'cenários simultâneos',
      title: 'Comparação Impossível',
      description:
        'Lucro Real, Presumido, Simples Nacional e Autônomo agora convivem com IBS e CBS. Nenhuma ferramenta atual compara todos os cenários.',
      icon: Scale,
      accent: 'cyan',
    },
    {
      stat: 'R$ 800 bi',
      label: 'em incentivos em jogo',
      title: 'Risco de Margem',
      description:
        'Errar o preço de venda significa perder margem ou perder cliente. Sem simulação precisa, a decisão é um tiro no escuro.',
      icon: TrendingDown,
      accent: 'amber',
    },
  ]

  return (
    <section
      id="problema"
      className="py-20 md:py-28 relative bg-[#090d15] border-t border-slate-800/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            O problema
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            A Reforma Tributária reescreveu as regras do jogo
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            Cada empresário brasileiro — do MEI ao grande porte — precisa recalibrar seus preços.
            Ninguém tem a ferramenta.
          </p>
        </div>

        {/* 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {problems.map((p, idx) => {
            const Icon = p.icon
            return (
              <div
                key={idx}
                className="relative rounded-xl bg-slate-900/70 border border-slate-800 p-8 flex flex-col justify-between hover:border-slate-700 hover:bg-slate-900 transition-all duration-300 group shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                      {p.stat}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="block text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold mb-4">
                    {p.label}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{p.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{p.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footnote of sources */}
        <div className="mt-12 pt-6 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-4 text-xs font-mono text-slate-500">
          <span>Dados: EC 132/2023, LC 214/2025, Receita Federal, Serasa Experian</span>
          <span className="text-slate-400">
            Parâmetros vigentes e auditados para o exercício 2026
          </span>
        </div>
      </div>
    </section>
  )
}
