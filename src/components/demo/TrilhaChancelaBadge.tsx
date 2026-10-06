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
        className="text-[9px] font-mono font-bold bg-violet-500/10 text-violet-300 border-violet-500/40 px-1.5 py-0 flex items-center gap-1 inline-flex"
      >
        <ShieldCheck className="w-2.5 h-2.5 text-violet-400" />
        <span>{label}</span>
      </Badge>
    )
  }

  return (
    <div className="inline-flex flex-col gap-0.5 rounded-md border border-violet-500/35 bg-violet-950/40 px-2 py-1">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-violet-200">
          {label}
        </span>
        {dataChancela && (
          <span className="text-[9px] font-mono text-violet-400/90 ml-auto">{dataChancela}</span>
        )}
      </div>
      {descricao && (
        <span className="text-[9px] font-mono text-slate-400 leading-tight block">{descricao}</span>
      )}
    </div>
  )
}
