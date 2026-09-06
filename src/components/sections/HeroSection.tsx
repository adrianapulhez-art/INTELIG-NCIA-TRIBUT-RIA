import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, CheckCircle2 } from 'lucide-react'

interface HeroSectionProps {
  onRequestAccess: () => void
}

export function HeroSection({ onRequestAccess }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold shadow-inner shadow-emerald-500/10 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>EC 132 • LC 214/2025 • Vigente desde 2026</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
            O sistema tributário brasileiro foi reescrito.{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              A IT decodifica a complexidade.
            </span>
          </h1>

          {/* Paragraph */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Inteligência Tributária — calcule preços de venda, compare regimes (Lucro Real,
            Presumido, Simples Nacional, Autônomo) e simule cenários pré e pós Reforma Tributária
            (EC 132) em um único ambiente.
          </p>

          {/* Actions & Skip mention */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={onRequestAccess}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-base px-8 h-12 rounded-lg shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/35 transition-all cursor-pointer flex items-center justify-center gap-2 group"
            >
              <span>Solicitar Acesso</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Skip mention banner */}
          <p className="text-xs sm:text-sm text-slate-400 font-mono flex items-center justify-center gap-2 pt-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Plataforma construída no Skip — AI Builder para ferramentas internas
          </p>
        </div>

        {/* Dashboard Visual Representation */}
        <div className="mt-12 sm:mt-16 relative max-w-5xl mx-auto">
          {/* Subtle outer glow */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/30 via-teal-500/20 to-cyan-500/30 rounded-2xl blur-xl opacity-75" />

          <div className="relative rounded-xl border border-slate-700/80 bg-[#0c121d] shadow-2xl overflow-hidden">
            {/* Window header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#080d15] border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-3 font-mono text-[11px] text-slate-400 hidden sm:inline">
                  it-inteligencia-tributaria.app / simulador-ec132
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Motor de Simulação Ativo (2026)
              </div>
            </div>

            {/* Dashboard Image with fallback overlay */}
            <div className="relative group">
              <img
                src="https://id-preview--67098213-e297-44bb-a8b2-74eb37da16fd.lovable.app/assets/it-dashboard-DZGZk2BI.jpg"
                alt="Dashboard da IT comparando carga tributária entre Simples Nacional, Lucro Presumido, Lucro Real e Lucro Arbitrado"
                className="w-full h-auto object-cover max-h-[580px] bg-slate-900"
                onError={(e) => {
                  // If external preview asset expires, show styled rich visual fallback
                  ;(e.target as HTMLElement).style.display = 'none'
                  const fallback = document.getElementById('hero-dashboard-fallback')
                  if (fallback) fallback.style.display = 'block'
                }}
              />

              {/* In-app visual fallback in case image fails to load */}
              <div
                id="hero-dashboard-fallback"
                className="hidden p-6 sm:p-8 space-y-6 bg-[#0c121d]"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-xs text-slate-400 font-mono">Simples Nacional</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">3,72%</p>
                    <span className="text-xs text-slate-500">R$ 1.037,20</span>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-xs text-slate-400 font-mono">Lucro Presumido</span>
                    <p className="text-2xl font-bold text-teal-400 mt-1">5,04%</p>
                    <span className="text-xs text-slate-500">R$ 1.050,40 (+1,32pp)</span>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-xs text-slate-400 font-mono">Lucro Real</span>
                    <p className="text-2xl font-bold text-sky-400 mt-1">6,18%</p>
                    <span className="text-xs text-slate-500">R$ 1.061,80 (+2,46pp)</span>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-xs text-slate-400 font-mono">Autônomo (IRPF)</span>
                    <p className="text-2xl font-bold text-amber-400 mt-1">9,45%</p>
                    <span className="text-xs text-slate-500">R$ 1.094,50 (+5,73pp)</span>
                  </div>
                </div>

                {/* Bars comparison preview */}
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Simples Nacional (Menor Carga)</span>
                      <span className="text-emerald-400 font-bold">3,72%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '39%' }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Lucro Presumido</span>
                      <span className="text-teal-400 font-bold">5,04%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div className="bg-teal-500 h-3 rounded-full" style={{ width: '53%' }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Lucro Real</span>
                      <span className="text-sky-400 font-bold">6,18%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div className="bg-sky-500 h-3 rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Autônomo (Pessoa Física)</span>
                      <span className="text-amber-400 font-bold">9,45%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div className="bg-amber-500 h-3 rounded-full" style={{ width: '100%' }} />
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
