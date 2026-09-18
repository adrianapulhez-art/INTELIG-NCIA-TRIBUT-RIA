import React from 'react'
import { ShieldCheck, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'

export interface CockpitFatorRGaugeProps {
  fatorRPercent: number // ex: 28.5 ou 15.2
  simplesPayroll12m: number
  simplesRbt12: number
  isElegibleAnexo3: boolean
  explanatoryNote: string
}

export const CockpitFatorRGauge: React.FC<CockpitFatorRGaugeProps> = ({
  fatorRPercent,
  simplesPayroll12m,
  simplesRbt12,
  isElegibleAnexo3,
  explanatoryNote,
}) => {
  // Arco do gauge semi-circular em SVG puro (180 graus de -180 a 0)
  // Raio 80, centro (100, 95)
  // Faixa de valores: 0% a 50%
  const maxDisplayVal = 50
  const clampedPercent = Math.min(maxDisplayVal, Math.max(0, fatorRPercent))
  const normalizedRatio = clampedPercent / maxDisplayVal // 0 a 1

  // Cálculo do ângulo em radianos para a agulha ou arco (-Math.PI a 0)
  const angleDeg = -180 + normalizedRatio * 180
  const marker28Deg = -180 + (28 / maxDisplayVal) * 180 // ângulo exato da marca de 28%

  // Coordenadas do marcador de 28%
  const rad28 = (marker28Deg * Math.PI) / 180
  const markerX1 = 100 + 64 * Math.cos(rad28)
  const markerY1 = 95 + 64 * Math.sin(rad28)
  const markerX2 = 100 + 82 * Math.cos(rad28)
  const markerY2 = 95 + 82 * Math.sin(rad28)

  // Cor principal: verde se >= 28% (Anexo III), âmbar se < 28% (Anexo V)
  const activeColor = isElegibleAnexo3 ? '#10b981' : '#f59e0b'

  // Curvatura do arco preenchido
  const radius = 72
  const strokeWidth = 10
  const arcCircumference = Math.PI * radius // meia circunferência = ~226.19
  const arcOffset = arcCircumference * (1 - normalizedRatio)

  return (
    <div className="relative group rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c081e]/95 via-[#080516]/95 to-[#04020a]/95 p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden flex flex-col justify-between">
      {/* Glow de fundo */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-25"
        style={{ backgroundColor: activeColor }}
      />

      {/* Cabeçalho */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Medidor Radial do Fator R (LC 123/2006)
            </h3>
            <Badge
              variant="outline"
              className={
                isElegibleAnexo3
                  ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[10px] font-mono'
                  : 'border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px] font-mono'
              }
            >
              {isElegibleAnexo3 ? 'ANEXO III (Tributação Reduzida)' : 'ANEXO V (Alíquota Cheia)'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Diagnóstico dinâmico da relação entre folha salarial 12m e faturamento bruto RBT12.
          </p>
        </div>

        {/* Status rápido */}
        <div className="flex items-center gap-2">
          {isElegibleAnexo3 ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Folha &ge; 28%
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Folha &lt; 28%
            </span>
          )}
        </div>
      </div>

      {/* Miolo: Medidor Radial Semi-Circular e Métricas */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-4">
        {/* Lado Esquerdo: Gauge SVG (5 colunas) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-56 h-32 flex items-center justify-center">
            <svg width="220" height="130" viewBox="0 0 200 120" className="overflow-visible">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="56%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {/* Trilho de fundo (arco semi-circular) */}
              <path
                d="M 28 95 A 72 72 0 0 1 172 95"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Trilho preenchido gradiente */}
              <path
                d="M 28 95 A 72 72 0 0 1 172 95"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={arcCircumference}
                strokeDashoffset={arcOffset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 1s ease-out',
                  filter: `drop-shadow(0 0 6px ${activeColor})`,
                }}
              />

              {/* Marcador dos 28% crítico */}
              <line
                x1={markerX1}
                y1={markerY1}
                x2={markerX2}
                y2={markerY2}
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <text
                x={markerX2 + (marker28Deg > -90 ? 4 : -18)}
                y={markerY2 - 3}
                fill="#ffffff"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
              >
                28%
              </text>

              {/* Rótulo de mín e máx */}
              <text x="24" y="112" fill="#64748b" fontSize="9" fontFamily="monospace">
                0%
              </text>
              <text x="166" y="112" fill="#64748b" fontSize="9" fontFamily="monospace">
                50%+
              </text>
            </svg>

            {/* Valor central grande */}
            <div className="absolute bottom-2 inset-x-0 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight drop-shadow">
                {formatPercentBR(fatorRPercent)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Fator R Efetivo
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Cards analíticos de apoio (7 colunas) */}
        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-slate-400 text-[11px] block">Folha Salarial 12 Meses:</span>
            <span className="text-base font-bold text-white mt-1 block">
              {formatBRL(simplesPayroll12m)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Salários, pró-labore e INSS patronal
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-slate-400 text-[11px] block">
              Receita Bruta 12 Meses (RBT12):
            </span>
            <span className="text-base font-bold text-white mt-1 block">
              {formatBRL(simplesRbt12)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Faturamento acumulado últimos 12 meses
            </span>
          </div>

          <div
            className={`sm:col-span-2 p-3 rounded-xl border ${
              isElegibleAnexo3
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>
                {isElegibleAnexo3
                  ? 'Enquadramento Vantajoso no Anexo III Garantido'
                  : 'Atenção: Folha abaixo da marca legal de 28%'}
              </span>
            </div>
            <p className="text-[11px] mt-1 text-slate-300 leading-relaxed font-sans">
              {isElegibleAnexo3
                ? 'Sua folha de salários representa percentual superior a 28% do faturamento. As atividades de serviços sujeitas ao Fator R tributam pela alíquota reduzida do Anexo III (a partir de 6%), gerando expressiva economia fiscal.'
                : 'Com o Fator R inferior a 28%, atividades de serviços prestados ficam retidas no Anexo V (alíquota inicial de 15,5%). Uma adequação no pró-labore ou contratação de equipe pode reposicionar a empresa no Anexo III.'}
            </p>
          </div>
        </div>
      </div>

      {/* G) NOTA EXPLICATIVA SOB O MEDIDOR RADIAL COM NÚMERO REAL DO MOMENTO */}
      <div className="relative z-10 mt-2 pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-orange-400">Por que isto importa:</strong> {explanatoryNote}
        </p>
      </div>
    </div>
  )
}
