import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react'

export function ShowcaseSection() {
  const cards = [
    {
      title: 'CBS',
      sub: 'Contribuição sobre Bens e Serviços',
      rate: '0,9% (teste)',
      highlight: true,
    },
    {
      title: 'IBS',
      sub: 'Imposto sobre Bens e Serviços',
      rate: '0,1% (teste)',
      highlight: true,
    },
    {
      title: 'ICMS',
      sub: 'Circulação de Mercadorias',
      rate: 'estadual',
      highlight: false,
    },
    {
      title: 'ISS',
      sub: 'Imposto sobre Serviços',
      rate: '2% – 5%',
      highlight: false,
    },
    {
      title: 'PIS/COFINS',
      sub: 'Em extinção até 2027',
      rate: '3,65% / 9,25%',
      highlight: false,
    },
    {
      title: 'IRPJ + CSLL',
      sub: 'Lucro Real e Presumido',
      rate: '15% + 9%',
      highlight: false,
    },
    {
      title: 'SIMPLES',
      sub: 'Anexos I a V + Simples Híbrido',
      rate: '4% – 33%',
      highlight: true,
    },
    {
      title: 'IRPF',
      sub: 'Pessoa Física Autônoma, mensal e anual',
      rate: '0% – 27,5%',
      highlight: false,
    },
    {
      title: 'CRÉDITOS',
      sub: 'Créditos IBS/CBS — não cumulatividade',
      rate: 'integral',
      highlight: true,
    },
  ]

  return (
    <section
      id="showcase"
      className="py-20 md:py-28 relative bg-[#0b0f17] border-t border-slate-800/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Zap className="w-3.5 h-3.5" />
            Showcase técnico
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Tudo o que a IT calcula
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            Uma plataforma. Todo o sistema tributário nacional — antes e depois da Reforma.
          </p>
        </div>

        {/* 9 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-6 flex flex-col justify-between transition-all duration-200 group ${
                card.highlight
                  ? 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono font-semibold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Atualizado
                  </span>
                  {card.highlight && (
                    <span className="text-[10px] font-mono text-cyan-400 tracking-wider">
                      Reforma EC 132
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-extrabold text-white tracking-tight font-mono">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-baseline justify-between">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                  Alíquota / Regime
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-emerald-400 group-hover:scale-105 transition-transform">
                  {card.rate}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Legal note */}
        <div className="mt-12 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Atualizado conforme LC 214/2025, Resoluções CGSN 190/191 de 2026 e normas complementares
          </span>
        </div>
      </div>
    </section>
  )
}
