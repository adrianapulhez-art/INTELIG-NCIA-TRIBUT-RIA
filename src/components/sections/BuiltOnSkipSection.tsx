import React from 'react'
import { Sparkles, Check, ArrowRight, Layers, Cpu, Database, RefreshCw, Zap } from 'lucide-react'

export function BuiltOnSkipSection() {
  const bullets = [
    'Crie ferramentas internas com prompts, sem código',
    'Deploy instantâneo, sem infraestrutura',
    'Atualizações automáticas conforme mudanças regulatórias',
    'Replicável para qualquer área de negócio',
  ]

  return (
    <section
      id="skip"
      className="py-20 md:py-28 relative bg-[#090d15] border-t border-slate-800/80 overflow-hidden"
    >
      <div className="absolute top-1/2 right-1/4 w-[450px] h-[350px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Construído no Skip
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              A IT é o primeiro produto. <span className="text-emerald-400">O Skip é o motor.</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              A IT é o caso de uso showcase do Skip — um AI Builder que permite criar ferramentas
              internas sofisticadas em horas, não meses. Se a IT resolve tributação, o Skip pode
              resolver compliance, financeiro, RH, logística, qualquer área regulada.
            </p>

            <ul className="space-y-3 pt-2">
              {bullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm sm:text-base text-slate-300">{b}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-200 font-medium">
              A IT valida o Skip. O Skip valida um modelo de negócio replicável e escalável.
            </div>
          </div>

          {/* Right Architecture Diagram */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-2xl relative">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-6 flex items-center justify-between">
                <span>Arquitetura de Geração & Escalabilidade</span>
                <span className="text-emerald-400 font-semibold">AI Builder Engine</span>
              </div>

              {/* Diagram Flow */}
              <div className="space-y-6">
                {/* 1. Ingestion Sources */}
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-2">
                    Domínios Regulados & Corporativos
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                      <span className="text-xs font-semibold text-slate-200 block">Compliance</span>
                      <span className="text-[10px] font-mono text-slate-500">Normas & Riscos</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                      <span className="text-xs font-semibold text-slate-200 block">Financeiro</span>
                      <span className="text-[10px] font-mono text-slate-500">Fluxos & DRE</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                      <span className="text-xs font-semibold text-slate-200 block">RH</span>
                      <span className="text-[10px] font-mono text-slate-500">Encargos & CLT</span>
                    </div>
                  </div>
                </div>

                {/* Connecting arrow */}
                <div className="flex justify-center text-slate-500">
                  <div className="h-6 w-0.5 bg-gradient-to-b from-slate-700 to-emerald-500" />
                </div>

                {/* 2. Skip AI Builder Engine (Center) */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/60 border-2 border-emerald-500/40 text-center relative shadow-lg shadow-emerald-500/10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold mb-2">
                    <Zap className="w-3.5 h-3.5" />
                    SKIP
                  </div>
                  <h4 className="text-xl font-black text-white tracking-tight">AI Builder</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Motor de geração de sistemas especialistas, regras de negócio e dashboards
                    reativos.
                  </p>
                </div>

                {/* Connecting arrow */}
                <div className="flex justify-center text-slate-500">
                  <div className="h-6 w-0.5 bg-gradient-to-b from-emerald-500 to-teal-400" />
                </div>

                {/* 3. Output Product: IT */}
                <div className="p-5 rounded-xl bg-slate-950 border border-teal-500/40 text-center">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-emerald-500 text-slate-950 flex items-center justify-center font-bold font-mono text-xs">
                      IT
                    </div>
                    <div className="text-left">
                      <h4 className="text-base font-bold text-white leading-tight">
                        IT — Inteligência Tributária
                      </h4>
                      <span className="text-[11px] font-mono text-emerald-400">
                        Primeiro produto validado em produção (EC 132)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
