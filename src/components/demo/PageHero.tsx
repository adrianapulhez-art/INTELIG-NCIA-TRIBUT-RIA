import React from 'react'
import { Sparkles, ArrowRight, LucideIcon } from 'lucide-react'

interface PageHeroProps {
  title: React.ReactNode
  subtitle?: string
  badge?: string
  icon?: LucideIcon
  action?: React.ReactNode
}

/**
 * Hero Banner inspirado no ADAPTA ONE:
 * - Fundo escuro com degradê verde-esmeralda esfumado / fumê tom sobre tom
 * - Efeito de iluminação radial suave central
 * - Borda sutil com brilho esmeralda
 * - Título em caixa alta com forte destaque visual e tipografia elegante
 * - Subtítulo clean e funcional
 * - Cantos bem arredondados (~24px)
 */
export const PageHero: React.FC<PageHeroProps> = ({
  title,
  subtitle,
  badge,
  icon: Icon,
  action,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-[#0e241c]/90 via-[#0a1814]/90 to-[#07110e]/95 p-6 sm:p-8 md:p-10 shadow-2xl shadow-emerald-950/40 text-center mb-6 backdrop-blur-md">
      {/* Luz radial verde fumê central */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-400/15 blur-3xl rounded-full" />

      {/* Grid sutil futurista */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-25" />

      {/* Conteúdo central */}
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
        {/* Badge ou Tag superior */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 font-mono text-[11px] font-semibold tracking-widest uppercase shadow-sm shadow-emerald-950/40 mb-3.5">
          {Icon ? (
            <Icon className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{badge || 'MÓDULO DE INTELIGÊNCIA TRIBUTÁRIA'}</span>
        </div>

        {/* Título Principal estilo ADAPTA ONE (Caixa alta, destaque forte, tom sobre tom) */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-black tracking-tight text-white uppercase leading-tight drop-shadow-sm">
          {typeof title === 'string' ? (
            <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">
              {title}
            </span>
          ) : (
            title
          )}
        </h1>

        {/* Subtítulo funcional */}
        {subtitle && (
          <p className="mt-2.5 text-xs sm:text-sm text-emerald-100/70 max-w-2xl font-sans leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Ação opcional (ex.: botão de ação rápida) */}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}
