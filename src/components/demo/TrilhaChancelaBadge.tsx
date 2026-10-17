import React from 'react'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck } from 'lucide-react'

interface TrilhaChancelaBadgeProps {
  /** Texto do critério ou padrão: "CRITÉRIO IT v2 (chancela CEO 2026)" */
  label?: string
  /** Data ou complemento da chancela */
  dataChancela?: string
  /** Descrição explicativa do porquê de ser um critério */
  descricao?: string
  /** Variante compacta */
  compact?: boolean
}

/**
 * Componente reutilizável de Trilha de Chancela (determinação CEO).
 * Identifica visualmente critérios não cravados em lei expressa com a chancela oficial IT v2.
 */
export function TrilhaChancelaBadge({
  label = 'CRITÉRIO IT v2 (chancela CEO 2026)',
  dataChancela,
  descricao,
  compact = false,
}: TrilhaChancelaBadgeProps) {
  if (compact) {
    return (
      <Badge
        variant="outline"
        className="text-[9px] font-mono font-bold bg-slate-100 text-slate-800 border-slate-300 px-2 py-0.5 flex items-center gap-1 inline-flex shadow-2xs"
      >
        <ShieldCheck className="w-3 h-3 text-emerald-700" />
        <span>{label}</span>
      </Badge>
    )
  }

  return (
    <div className="inline-flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900">
          {label}
        </span>
        {dataChancela && (
          <span className="text-[9px] font-mono text-slate-500 ml-auto">{dataChancela}</span>
        )}
      </div>
      {descricao && (
        <span className="text-[9px] font-mono text-slate-600 leading-tight block">{descricao}</span>
      )}
    </div>
  )
}
