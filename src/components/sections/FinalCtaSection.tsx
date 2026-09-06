import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

interface FinalCtaSectionProps {
  onRequestAccess: () => void
}

export function FinalCtaSection({ onRequestAccess }: FinalCtaSectionProps) {
  return (
    <section className="py-24 sm:py-32 relative bg-[#0b0f17] border-t border-slate-800/80 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          O futuro da tributação não é mais complexidade.{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            É clareza.
          </span>
        </h2>

        <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
          A IT não apenas calcula impostos. Ela decodifica o sistema tributário brasileiro para que
          cada empresário — do pequeno ao grande porte — possa decidir com precisão e confiança.
        </p>

        <p className="text-sm sm:text-base font-bold text-emerald-400 font-mono tracking-wide pt-2">
          Inteligência Tributária. O novo padrão.
        </p>

        <div className="pt-4">
          <Button
            onClick={onRequestAccess}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base px-8 h-12 rounded-lg shadow-xl shadow-emerald-500/25 transition-all cursor-pointer inline-flex items-center gap-2 group"
          >
            <span>Solicitar Acesso</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  )
}
