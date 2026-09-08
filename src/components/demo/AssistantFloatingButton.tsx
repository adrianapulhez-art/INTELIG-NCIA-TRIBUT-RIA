import React from 'react'
import { Sparkles } from 'lucide-react'
import { AssistantAvatar } from './AssistantAvatar'
import { getAssistantForTab } from '@/services/tableAssistantsConfig'

interface AssistantFloatingButtonProps {
  isOpen: boolean
  onClick: () => void
  currentTab: string
}

export const AssistantFloatingButton: React.FC<AssistantFloatingButtonProps> = ({
  isOpen,
  onClick,
  currentTab,
}) => {
  const assistant = getAssistantForTab(currentTab)

  if (isOpen) {
    return null
  }

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 group animate-in fade-in duration-300">
      {/* Tooltip elegante que exibe o nome do assistente conectado à tabela */}
      <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#05140f]/95 border border-emerald-500/30 text-emerald-300 text-xs font-mono shadow-xl backdrop-blur-md opacity-90 group-hover:opacity-100 transition-opacity">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span>Dúvidas na tabela? Fale com a IA</span>
      </div>

      {/* Botão flutuante estilizado com a imagem/avatar cibernético com cérebro brilhante */}
      <button
        type="button"
        onClick={onClick}
        aria-label={`Abrir chat com o assistente da tabela: ${assistant.pageName}`}
        className="relative flex items-center gap-2.5 p-1.5 sm:p-2 rounded-2xl bg-[#030d09] border-2 border-emerald-400/60 hover:border-emerald-300 text-white shadow-2xl shadow-emerald-950/80 hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden group/btn"
      >
        {/* Brilho pulsante */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-teal-400/20 to-cyan-500/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />

        <AssistantAvatar size="sm" glow={false} />

        <div className="flex flex-col text-left pr-2 hidden sm:flex">
          <span className="text-xs font-bold text-white group-hover/btn:text-emerald-300 transition-colors">
            Assistente IT
          </span>
          <span className="text-[10px] text-emerald-400 font-mono tracking-tight truncate max-w-[130px]">
            {assistant.name}
          </span>
        </div>
      </button>
    </div>
  )
}
