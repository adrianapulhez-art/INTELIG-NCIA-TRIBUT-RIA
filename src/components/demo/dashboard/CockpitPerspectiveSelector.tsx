import React from 'react'
import { Filter, Layers, Package, SlidersHorizontal } from 'lucide-react'

export type PerspectiveMode = 'regime' | 'product' | 'price_mode'

export interface CockpitPerspectiveSelectorProps {
  currentPerspective: PerspectiveMode
  onPerspectiveChange: (mode: PerspectiveMode) => void
}

export const CockpitPerspectiveSelector: React.FC<CockpitPerspectiveSelectorProps> = ({
  currentPerspective,
  onPerspectiveChange,
}) => {
  const options: { id: PerspectiveMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'regime',
      label: 'Por Regime',
      icon: <Layers className="w-3.5 h-3.5" />,
      desc: 'Presumido × Real × Simples',
    },
    {
      id: 'product',
      label: 'Por Produto',
      icon: <Package className="w-3.5 h-3.5" />,
      desc: 'Desempenho por item individual',
    },
    {
      id: 'price_mode',
      label: 'Por Modo de Preço',
      icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
      desc: 'Preço Líquido × Custo + Margem',
    },
  ]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-purple-500/25 bg-gradient-to-r from-[#0d0822]/90 via-[#0a061b]/90 to-[#070414]/90 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
      {/* Título do Seletor */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <div className="p-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400">
          <Filter className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider block">
            Perspectiva Analítica Global
          </span>
          <span className="text-[10px] text-slate-400">
            Re-renderiza os quadros sob a dimensão selecionada
          </span>
        </div>
      </div>

      {/* Botões de Seleção em Pills Neon */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
        {options.map((opt) => {
          const isSelected = currentPerspective === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPerspectiveChange(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-orange-500 text-slate-950 font-bold shadow-[0_0_14px_rgba(249,115,22,0.4)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
