import React from 'react'
import robotAvatarSrc from '@/assets/image-39e48.png'

interface AssistantAvatarProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'hero'
  glow?: boolean
}

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({
  className = '',
  size = 'md',
  glow = true,
}) => {
  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    hero: 'w-28 h-28',
  }[size]

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Halo de luz futurista adaptado à identidade visual verde-esmeralda e azul-cianítica da IT */}
      {glow && (
        <>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-500/40 via-teal-400/30 to-cyan-500/40 blur-md animate-pulse pointer-events-none" />
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-teal-400/20 blur-lg pointer-events-none" />
        </>
      )}

      {/* Container com moldura cibernética */}
      <div
        className={`${sizeClasses} relative rounded-2xl overflow-hidden border-2 border-emerald-400/60 bg-[#030907] shadow-xl shadow-emerald-950/60 flex items-center justify-center group`}
      >
        <img
          src={robotAvatarSrc}
          alt="Avatar do Assistente de IA IT com Cérebro Digital"
          className="w-full h-full object-cover object-center filter brightness-105 contrast-110 transition-transform duration-500 group-hover:scale-105"
          loading="eager"
        />

        {/* Scanline futurista sutil sobre o avatar */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-400/10 to-transparent pointer-events-none opacity-50" />

        {/* Indicador de status online no canto */}
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 shadow-sm shadow-emerald-400 animate-pulse" />
      </div>
    </div>
  )
}
