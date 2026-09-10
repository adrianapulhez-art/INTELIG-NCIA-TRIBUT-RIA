import React, { useState } from 'react'
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import { LalurEntryItem, LalurEntryType } from '@/contexts/TaxContext'

export interface MiniLalurSectionProps {
  entries: LalurEntryItem[]
  onAddEntry: (description?: string, value?: number, type?: LalurEntryType) => void
  onUpdateEntry: (
    id: string,
    field: 'description' | 'value' | 'type',
    value: string | number | LalurEntryType,
  ) => void
  onRemoveEntry: (id: string) => void
  totalAdditions: number
  totalExclusions: number
}

// Exemplos prontos reais e fundamentados de LALUR para preenchimento com 1 clique
export const LALUR_EXAMPLES: {
  label: string
  description: string
  type: LalurEntryType
  suggestedValue: number
  hint: string
}[] = [
  // Adições
  {
    label: 'Multa por atraso de tributos',
    description: 'Multa por atraso no pagamento de tributos',
    type: 'addition',
    suggestedValue: 1200,
    hint: 'Multas punitivas são indedutíveis pelo RIR.',
  },
  {
    label: 'Gorjetas a empregados',
    description: 'Gorjetas pagas a empregados',
    type: 'addition',
    suggestedValue: 2500,
    hint: 'Adição fiscal caso tratadas fora da folha operacional.',
  },
  {
    label: 'Despesas pessoais dos sócios',
    description: 'Despesas pessoais dos sócios',
    type: 'addition',
    suggestedValue: 3400,
    hint: 'Despesas não operacionais e sem relação com a atividade.',
  },
  {
    label: 'Alimentação dos sócios',
    description: 'Alimentação/supermercado dos sócios',
    type: 'addition',
    suggestedValue: 1800,
    hint: 'Gastos pessoais sem dedutibilidade na apuração.',
  },
  // Exclusões
  {
    label: 'Dividendos recebidos (isentos)',
    description: 'Lucros e dividendos recebidos (isentos)',
    type: 'exclusion',
    suggestedValue: 8000,
    hint: 'Receita de participações societárias não tributável.',
  },
  {
    label: 'Lucros auferidos no exterior',
    description: 'Parcela isenta de lucros auferidos no exterior',
    type: 'exclusion',
    suggestedValue: 12000,
    hint: 'Parcela com isenção ou tratado de bitributação.',
  },
  {
    label: 'Incentivos (Lei do Bem / PAT)',
    description: 'Incentivos fiscais (Lei do Bem / PAT)',
    type: 'exclusion',
    suggestedValue: 4500,
    hint: 'Exclusões autorizadas por legislação de incentivo fiscal.',
  },
]

export const MiniLalurSection: React.FC<MiniLalurSectionProps> = ({
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  totalAdditions,
  totalExclusions,
}) => {
  const [showExamples, setShowExamples] = useState(false)
  const netLalurAdjustment = totalAdditions - totalExclusions

  return (
    <div className="space-y-4 pt-3 border-t border-slate-800/80">
      {/* Topo: Título, subtítulo e Botões de Adicionar Lançamento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              Mini-LALUR — Adições e Exclusões do Lucro Real
            </h3>
            <Badge className="bg-slate-900 text-slate-400 border-slate-700 text-[10px] font-mono h-4 px-1.5">
              {entries.length} {entries.length === 1 ? 'lançamento' : 'lançamentos'}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Ajustes fiscais individuais à base contábil para apuração do IRPJ (15% + 10%) e CSLL
            (9%).
          </p>
        </div>

        {/* Botões de Ação: Ver exemplos de lançamentos + Adição e Exclusão */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowExamples((prev) => !prev)}
            aria-expanded={showExamples}
            className={`h-7 text-xs font-mono transition-all cursor-pointer ${
              showExamples
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-slate-100 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
            {showExamples ? 'Ocultar exemplos' : 'Ver simulações prontas'}
            {showExamples ? (
              <ChevronUp className="w-3 h-3 ml-1 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddEntry('Nova adição fiscal', 0, 'addition')}
            className="h-7 text-xs bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-emerald-400" />+ Adição
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddEntry('Nova exclusão fiscal', 0, 'exclusion')}
            className="h-7 text-xs bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-cyan-400" />+ Exclusão
          </Button>
        </div>
      </div>

      {/* Chips de Exemplos Prontos do LALUR para 1-clique (visíveis apenas sob demanda do usuário) */}
      {showExamples && (
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-amber-500/20 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300/90 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Exemplos prontos para simulação (clique para lançar):</span>
            </div>
            <button
              type="button"
              onClick={() => setShowExamples(false)}
              className="text-[10px] font-mono text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Fechar exemplos
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {LALUR_EXAMPLES.map((ex, idx) => {
              const isAdd = ex.type === 'addition'
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAddEntry(ex.description, ex.suggestedValue, ex.type)}
                  title={`${ex.hint} · Sugestão: ${formatBRL(ex.suggestedValue)}`}
                  className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border cursor-pointer active:scale-95 ${
                    isAdd
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400'
                      : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400'
                  }`}
                >
                  {isAdd ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-cyan-400 shrink-0 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
                  )}
                  <span className="font-semibold">{isAdd ? '+ Adição:' : '− Exclusão:'}</span>
                  <span>{ex.label}</span>
                  <span className="text-[10px] opacity-70 ml-0.5">
                    ({formatBRL(ex.suggestedValue)})
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de Lançamentos Individuais */}
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isAdd = entry.type === 'addition'
            return (
              <div
                key={entry.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl border transition-colors ${
                  isAdd
                    ? 'bg-emerald-950/15 border-emerald-500/25'
                    : 'bg-cyan-950/15 border-cyan-500/25'
                }`}
              >
                {/* Seletor de Tipo (Adição ou Exclusão) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateEntry(entry.id, 'type', 'addition')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isAdd
                        ? 'bg-emerald-500/25 border border-emerald-500/60 text-emerald-300 shadow-sm'
                        : 'bg-slate-900/60 border border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    title="Adição: soma à base tributável"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    Adição (+)
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateEntry(entry.id, 'type', 'exclusion')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      !isAdd
                        ? 'bg-cyan-500/25 border border-cyan-500/60 text-cyan-300 shadow-sm'
                        : 'bg-slate-900/60 border border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    title="Exclusão: deduz da base tributável"
                  >
                    <ArrowDownRight className="w-3 h-3" />
                    Exclusão (−)
                  </button>
                </div>

                {/* Descrição do Lançamento */}
                <Input
                  type="text"
                  value={entry.description}
                  onChange={(e) => onUpdateEntry(entry.id, 'description', e.target.value)}
                  placeholder="Descrição do lançamento LALUR"
                  className="flex-1 bg-slate-900/90 border-slate-800 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                />

                {/* Campo de Valor com Digitação Blindada (parseBRNumber determinístico) */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative w-36 sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                      R$
                    </span>
                    <Input
                      type="text"
                      defaultValue={entry.value > 0 ? formatNumberBR(entry.value) : ''}
                      key={`lalur-val-${entry.id}-${entry.value}`}
                      onBlur={(e) => {
                        const parsed = parseBRNumber(e.target.value)
                        onUpdateEntry(entry.id, 'value', parsed)
                        e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                      }}
                      placeholder="0,00"
                      className={`pl-8 text-right bg-slate-900/90 border-slate-800 text-xs font-mono font-bold ${
                        isAdd ? 'text-emerald-300' : 'text-cyan-300'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveEntry(entry.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remover lançamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-4 px-3 rounded-xl border border-dashed border-slate-800/90 text-center space-y-1 bg-slate-950/40">
          <p className="text-xs font-mono text-slate-400">
            Nenhum lançamento de LALUR cadastrado no momento.
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            Clique em <strong className="text-emerald-400">+ Adição</strong>,{' '}
            <strong className="text-cyan-400">+ Exclusão</strong> ou em{' '}
            <strong className="text-amber-400">Ver simulações prontas</strong> para abrir exemplos
            de lançamento.
          </p>
        </div>
      )}

      {/* Painel de Totais Consolidados Visíveis */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs shadow-inner">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Total de Adições (+):</span>
            <strong className="text-emerald-400 font-bold">{formatBRL(totalAdditions)}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-400">Total de Exclusões (−):</span>
            <strong className="text-cyan-400 font-bold">{formatBRL(totalExclusions)}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
          <span className="text-slate-400 text-[11px]">Ajuste Líquido LALUR:</span>
          <span
            className={`font-bold text-xs px-2 py-0.5 rounded border ${
              netLalurAdjustment > 0
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : netLalurAdjustment < 0
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            {netLalurAdjustment > 0 ? '+' : ''}
            {formatBRL(netLalurAdjustment)}
          </span>
        </div>
      </div>
    </div>
  )
}
