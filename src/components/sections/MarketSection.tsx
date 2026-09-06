import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp, Building2, BarChart2 } from 'lucide-react'

interface MarketSectionProps {
  onRequestAccess: () => void
}

export function MarketSection({ onRequestAccess }: MarketSectionProps) {
  const stats = [
    {
      value: '21M+',
      title: 'Empresas no Brasil',
      source: 'Receita Federal, 2026',
    },
    {
      value: '100K+',
      title: 'Migrando de regime',
      source: 'Serasa Experian, 2026',
    },
    {
      value: 'R$ 800 bi',
      title: 'Incentivos fiscais/ano',
      source: 'Receita Federal',
    },
    {
      value: '2026—2033',
      title: 'Cronograma de transição',
      source: 'EC 132/2023',
    },
    {
      value: '100%',
      title: 'Dos portes precisam recalibrar',
      source: 'Do MEI ao grande porte',
    },
  ]

  return (
    <section
      id="mercado"
      className="py-20 md:py-28 relative bg-[#090d15] border-t border-slate-800/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Building2 className="w-3.5 h-3.5" />
            Mercado
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Não é um nicho. É todo o mercado empresarial brasileiro.
          </h2>
        </div>

        {/* 5 Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {stats.map((s, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 tracking-tight block mb-2">
                  {s.value}
                </span>
                <p className="text-sm font-bold text-white leading-snug">{s.title}</p>
              </div>
              <span className="mt-4 text-[11px] font-mono text-slate-500 block">{s.source}</span>
            </div>
          ))}
        </div>

        {/* Callout box */}
        <div className="mt-12 p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/90 border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-medium">
              Todo empresário brasileiro — sem exceção — precisa entender como a Reforma Tributária
              afeta seu preço de venda. A IT é a única plataforma que faz isso de forma integrada,
              comparativa e precisa.
            </p>
          </div>
          <Button
            onClick={onRequestAccess}
            className="w-full sm:w-auto shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-7 h-12 rounded-lg shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Solicitar Acesso</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
