import React, { useState, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { MoneyInput } from '@/components/demo/MoneyInput'
import { Plus, Check, X, CheckCircle2 } from 'lucide-react'
import { formatBRL } from '@/lib/taxCalculations'

export interface OperatingPresetCardProps {
  label: string
  hint: string
  badgeShort: string
  badgeClass: string
  /** Valor atual do item vinculado na lista (null = ainda não lançado na lista) */
  linkedValue: number | null
  variant: 'expense' | 'revenue'
  /** Confirma o valor digitado na caixinha do card (cria ou atualiza o item na lista) */
  onCommitValue: (value: number) => void
  /** Comportamento original do botão "+ Inserir" (1 clique na tabela) — intocado */
  onInsert: () => void
}

/**
 * Card de exemplo pronto (preset) com caixinha de valor EDITÁVEL no próprio card.
 *
 * Fluxo "Preencher":
 * (1) Clique em "Preencher" (ou na própria caixinha) torna o valor editável ali mesmo;
 * (2) Enter, blur ou ✓ confirma: o valor alimenta automaticamente a lista da
 *     discriminação/categoria (cria o item ou atualiza o existente);
 * (3) Esc ou × cancela sem alterar nada.
 * O botão "+ Inserir" mantém exatamente o comportamento original.
 */
export function OperatingPresetCard({
  label,
  hint,
  badgeShort,
  badgeClass,
  linkedValue,
  variant,
  onCommitValue,
  onInsert,
}: OperatingPresetCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftState, setDraftState] = useState<number | undefined>(undefined)
  const draftRef = useRef<number | undefined>(undefined)

  const setDraft = (val: number | undefined) => {
    draftRef.current = val
    setDraftState(val)
  }

  const startEditing = () => {
    setDraft(undefined)
    setIsEditing(true)
  }

  // Confirma: só grava quando algo foi digitado (draft definido)
  const confirm = () => {
    const d = draftRef.current
    setIsEditing(false)
    setDraft(undefined)
    if (d !== undefined) onCommitValue(d)
  }

  const cancel = () => {
    setIsEditing(false)
    setDraft(undefined)
  }

  const valueColor = variant === 'expense' ? 'text-rose-700' : 'text-[#b87c14]'

  const insertButtonClass =
    variant === 'expense'
      ? 'bg-[#3b2405] hover:bg-[#261502] text-amber-200 border border-transparent'
      : 'bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] hover:brightness-105 text-[#261502] border border-amber-200/90'

  return (
    <div className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition-all flex flex-col justify-between gap-1.5 group shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800 group-hover:text-[#261502]">
          {label}
        </span>
        <Badge className={`text-[9px] font-mono px-1.5 py-0 border ${badgeClass} shrink-0`}>
          {badgeShort}
        </Badge>
      </div>

      <p className="text-[10px] text-slate-500 line-clamp-1">{hint}</p>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-mono text-xs gap-2">
        {/* Caixinha de valor do próprio card */}
        {isEditing ? (
          <div className="flex items-center gap-1 min-w-0">
            <MoneyInput
              autoFocus
              value={draftState !== undefined ? draftState : (linkedValue ?? undefined)}
              onChange={(val) => setDraft(val)}
              onBlur={() => confirm()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  confirm()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancel()
                }
              }}
              prefix="R$"
              placeholder="0,00"
              aria-label={`Valor de ${label}`}
              className="h-7 w-28 text-xs text-right bg-white border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-400 text-slate-900 font-bold"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={confirm}
              aria-label="Confirmar valor"
              title="Confirmar valor (Enter)"
              className="w-6 h-6 shrink-0 rounded bg-amber-100 border border-amber-300 text-[#3b2405] hover:bg-amber-200 inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancel}
              aria-label="Cancelar edição"
              title="Cancelar (Esc)"
              className="w-6 h-6 shrink-0 rounded bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="flex items-center gap-1 min-w-0 cursor-pointer bg-transparent border-0 p-0 text-left"
            aria-label={`Editar valor de ${label}`}
            title="Clique para editar o valor aqui no card"
          >
            <span className={`${valueColor} font-bold`}>{formatBRL(linkedValue ?? 0)}</span>
            {linkedValue !== null && (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden="true" />
            )}
          </button>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Enter ✓</span>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
              title="Preencher o valor aqui no card (alimenta a lista automaticamente)"
            >
              Preencher
            </button>
          )}
          <button
            type="button"
            onClick={onInsert}
            className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer flex items-center gap-0.5 ${insertButtonClass}`}
            title="Inserir na tabela com 1 clique"
          >
            <Plus className="w-2.5 h-2.5" />
            Inserir
          </button>
        </div>
      </div>
    </div>
  )
}
