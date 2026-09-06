import React from 'react'
import { Calendar, CheckCircle2, AlertCircle } from 'lucide-react'

export function TimelineSection() {
  const timelineEvents = [
    {
      year: '2023',
      text: 'EC 132 promulgada — Reforma Tributária constitucionalizada',
      status: 'done',
    },
    {
      year: '2025',
      text: 'LC 214/2025 — regulamentação de IBS, CBS e IS',
      status: 'done',
    },
    {
      year: '2026',
      text: 'Cobrança teste: CBS 0,9% + IBS 0,1%. Novas obrigações fiscais desde agosto. Simples Híbrido regulamentado.',
      status: 'current',
    },
    {
      year: '2027',
      text: 'Extinção do PIS/Cofins. CBS entra plenamente.',
      status: 'upcoming',
    },
    {
      year: '2033',
      text: 'Implementação plena do novo sistema tributário',
      status: 'upcoming',
    },
  ]

  return (
    <section
      id="cronograma"
      className="py-20 md:py-28 relative bg-[#090d15] border-t border-slate-800/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Calendar className="w-3.5 h-3.5" />
            Cronograma
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            O relógio está correndo
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Cada ano até 2033 é uma nova onda de demanda. A IT está pronta para todas.
          </p>
        </div>

        {/* Timeline Line & Items */}
        <div className="relative border-l-2 border-slate-800 ml-4 md:ml-8 space-y-10 pl-6 md:pl-10">
          {timelineEvents.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Dot indicator */}
              <div
                className={`absolute -left-[31px] md:-left-[47px] top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  item.status === 'current'
                    ? 'bg-emerald-500 border-white shadow-lg shadow-emerald-500/50'
                    : item.status === 'done'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-400'
                      : 'bg-slate-900 border-slate-700'
                }`}
              >
                {item.status === 'current' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <span
                  className={`text-2xl font-black font-mono tracking-tight shrink-0 ${
                    item.status === 'current'
                      ? 'text-emerald-400'
                      : item.status === 'done'
                        ? 'text-slate-300'
                        : 'text-slate-500'
                  }`}
                >
                  {item.year}
                  {item.status === 'current' && (
                    <span className="ml-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 align-middle">
                      Fase Atual
                    </span>
                  )}
                </span>
                <p className="text-base text-slate-300 leading-relaxed font-medium">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Closing timeline note */}
        <div className="mt-14 p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-300 font-medium">
          A cada novo marco regulatório, a demanda pela IT cresce. O produto se torna mais valioso
          com o tempo — não menos.
        </div>
      </div>
    </section>
  )
}
