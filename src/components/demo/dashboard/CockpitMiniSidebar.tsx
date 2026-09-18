import React from 'react'
import {
  LayoutDashboard,
  Layers,
  Calculator,
  Receipt,
  PieChart,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'

export interface CockpitSectionItem {
  id: string
  title: string
  shortTitle: string
  icon: React.ReactNode
}

export interface CockpitMiniSidebarProps {
  sections: CockpitSectionItem[]
  activeSection: string
  onSectionClick: (id: string) => void
}

export const CockpitMiniSidebar: React.FC<CockpitMiniSidebarProps> = ({
  sections,
  activeSection,
  onSectionClick,
}) => {
  return (
    <aside
      aria-label="Navegação dos Quadros do Dashboard"
      className="hidden xl:flex flex-col fixed left-4 top-28 z-30 w-12 hover:w-52 transition-all duration-300 ease-in-out group bg-[#090517]/90 border border-purple-500/25 rounded-2xl p-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden"
    >
      {/* Indicador de título visível no hover */}
      <div className="flex items-center gap-2 px-2 py-2 mb-2 border-b border-white/10 opacity-70 group-hover:opacity-100 transition-opacity">
        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold whitespace-nowrap overflow-hidden transition-all duration-200 w-0 group-hover:w-auto">
          Painéis Cockpit
        </span>
      </div>

      {/* Lista de seções para scroll suave */}
      <nav className="flex flex-col gap-1.5">
        {sections.map((section) => {
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionClick(section.id)}
              className={`flex items-center gap-3 w-full p-2 rounded-xl text-xs font-mono transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
              title={section.title}
            >
              <div
                className={`w-4 h-4 flex-shrink-0 flex items-center justify-center transition-colors ${
                  isActive ? 'text-orange-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {section.icon}
              </div>
              <span className="whitespace-nowrap overflow-hidden text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[11px] font-semibold truncate">
                {section.shortTitle}
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
