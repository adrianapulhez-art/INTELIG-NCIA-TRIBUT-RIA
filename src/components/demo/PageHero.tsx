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
    <div className="group relative overflow-hidden rounded-2xl border border-amber-300/60 bg-white p-6 sm:p-8 text-center mb-6 shadow-sm">
      {/* Acabamento no topo com degradê dourado nobre */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#b87c14] via-[#e5b742] to-[#b87c14]" />

      {/* Brilho chanfrado superior muito suave */}
      <div className="pointer-events-none absolute inset-x-0 top-1 h-[1px] bg-gradient-to-r from-transparent via-amber-100 to-transparent" />

      {/* Conteúdo central */}
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
        {/* Badge superior com tratamento dourado metálico dramático */}
        <div className="group/herobadge relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-amber-300/90 bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-black text-xs tracking-wider uppercase mb-3 shadow-sm shadow-amber-950/20 transition-all duration-300 hover:shadow-md hover:shadow-amber-500/30">
          {/* Camada especular */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40 group-hover/herobadge:opacity-70 mix-blend-overlay transition-opacity duration-300"
            style={{
              background:
                'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
            }}
          />
          {/* Linha chanfrada */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90" />
          {/* Sheen diagonal */}
          <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/herobadge:translate-x-[130%] transition-transform duration-700 ease-out" />

          {Icon ? (
            <Icon className="relative z-10 w-3.5 h-3.5 text-[#3b2405] drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]" />
          ) : (
            <Sparkles className="relative z-10 w-3.5 h-3.5 text-[#3b2405] drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]" />
          )}
          <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] uppercase">
            {badge || 'MÓDULO DE INTELIGÊNCIA TRIBUTÁRIA'}
          </span>
        </div>

        {/* Título Principal em marrom profundo marcante com acento visual nobre */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#261502] leading-tight">
          {title}
        </h1>

        {/* Subtítulo funcional */}
        {subtitle && (
          <p className="mt-2 text-xs sm:text-sm text-[#4a3307] max-w-2xl font-sans leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Ação opcional (ex.: botão de ação rápida) */}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}
