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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center mb-6 shadow-sm">
      {/* Acabamento sutil no topo com acento esmeralda */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-1 bg-emerald-600" />

      {/* Conteúdo central */}
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
        {/* Badge superior neutra com acento verde */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold text-xs tracking-wider uppercase mb-3">
          {Icon ? (
            <Icon className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>{badge || 'MÓDULO DE INTELIGÊNCIA TRIBUTÁRIA'}</span>
        </div>

        {/* Título Principal claro, elegante e evidente */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {title}
        </h1>

        {/* Subtítulo funcional em cinza neutro */}
        {subtitle && (
          <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl font-sans leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Ação opcional (ex.: botão de ação rápida) */}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}
