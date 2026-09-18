import React from 'react'

export interface CockpitDonutKpiCardProps {
  title: string
  value: string
  subtitle?: string
  badgeText?: string
  icon: React.ReactNode
  percentage: number // 0 to 100
  centerLabel?: string
  strokeColor?: string
  glowColor?: string
  sparklineData?: number[]
  sparklineColor?: string
}

export const CockpitDonutKpiCard: React.FC<CockpitDonutKpiCardProps> = ({
  title,
  value,
  subtitle,
  badgeText,
  icon,
  percentage,
  centerLabel,
  strokeColor = '#f97316',
  glowColor = 'rgba(249, 115, 22, 0.4)',
  sparklineData,
  sparklineColor = '#f97316',
}) => {
  // Configuração do anel/donut circular em SVG puro
  const radius = 28
  const strokeWidth = 5.5
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const clampedPercent = Math.min(100, Math.max(0, percentage))
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference

  // Mini-sparkline gerado em SVG puro caso haja dados
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null
    const min = Math.min(...sparklineData)
    const max = Math.max(...sparklineData)
    const range = max - min || 1
    const width = 80
    const height = 24
    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width
        const y = height - ((val - min) / range) * (height - 6) - 3
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke={sparklineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          opacity="0.85"
        />
      </svg>
    )
  }

  return (
    <div className="relative group rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0e091e]/90 via-[#0a0718]/90 to-[#05030d]/95 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 hover:border-orange-500/40 hover:shadow-[0_10px_35px_rgba(249,115,22,0.15)] flex flex-col justify-between overflow-hidden">
      {/* Glow de fundo sutil */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20 transition-opacity group-hover:opacity-35"
        style={{ backgroundColor: strokeColor }}
      />

      {/* Topo do Card: Título + Ícone */}
      <div className="flex items-center justify-between text-slate-400 text-xs mb-3 z-10">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
            {title}
          </span>
          {badgeText && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
              {badgeText}
            </span>
          )}
        </div>
        <div
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white"
          style={{ color: strokeColor }}
        >
          {icon}
        </div>
      </div>

      {/* Miolo: Valor Mono Grande + Donut Ring */}
      <div className="flex items-center justify-between gap-3 z-10 my-1">
        <div className="flex-1 min-w-0">
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight truncate drop-shadow-sm">
            {value}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-1 font-mono leading-tight truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Anel de Progresso Circular */}
        <div className="relative flex-shrink-0 w-16 h-16 flex items-center justify-center">
          <svg width="64" height="64" className="rotate-[-90deg]">
            {/* Trilha de fundo */}
            <circle
              stroke="rgba(255, 255, 255, 0.08)"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx="32"
              cy="32"
            />
            {/* Trilha ativa com glow */}
            <circle
              stroke={strokeColor}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{
                strokeDashoffset,
                transition: 'stroke-dashoffset 0.8s ease-in-out',
                filter: `drop-shadow(0 0 4px ${glowColor})`,
              }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx="32"
              cy="32"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1 text-center">
            {centerLabel ? (
              <span className="text-[8.5px] font-mono font-extrabold text-white leading-tight truncate max-w-[50px]">
                {centerLabel}
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold text-white">
                {clampedPercent.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé opcional com mini-sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between z-10 text-[10px] font-mono text-slate-400">
          <span>Distribuição por item:</span>
          {renderSparkline()}
        </div>
      )}
    </div>
  )
}
