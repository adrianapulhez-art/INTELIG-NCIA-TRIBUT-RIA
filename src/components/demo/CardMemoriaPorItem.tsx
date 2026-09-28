import { Calculator, Layers, ShoppingCart, Building2, Wallet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  type CellConfigArt,
  type CellResultArt,
  type ExercicioKey,
  type MemoryLineArt,
  type RepasseMode,
  type ScheduleRowArt,
} from '@/lib/art12Calculations'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * MEMÓRIA POR ITEM DENTRO DO CARD DE REPASSE (pedido da CEO, 27/09 — "Vamos por parte").
 * Ao selecionar um cenário de repasse (integral/parcial/nenhum), o cliente recebe a
 * memória completa DAQUELE cenário, por item da Calculadora de Compras (máxima da casa:
 * nunca média entre produtos), na ordem:
 *   1º Custo de Aquisição para o ADQUIRENTE (comprador) — HOJE, base integrada à Compras;
 *   2º Formação do Preço pelo FORNECEDOR — exercício, regime do fornecedor do cenário;
 *   3º Formação do CUSTO pelo ADQUIRENTE (comprador) — exercício, regime do adquirente.
 */

const REPASSE_TITULO: Record<RepasseMode, string> = {
  integral: 'REPASSE INTEGRAL',
  parcial: 'REPASSE PARCIAL',
  nenhum: 'REPASSE NENHUM',
}

function LinhaCard({ line }: { line: MemoryLineArt }) {
  return (
    <div className="flex items-start justify-between gap-2 text-[10px] font-mono">
      <div className="min-w-0">
        <span className="text-slate-200">{line.label}</span>
        {line.formula && (
          <span className="text-slate-500 block break-words text-[9px]">{line.formula}</span>
        )}
      </div>
      <span
        className={`shrink-0 font-bold ${line.value < 0 ? 'text-emerald-300' : 'text-slate-100'}`}
      >
        {line.kind === 'nota' && line.value === 0 ? '—' : formatBRL(line.value)}
      </span>
    </div>
  )
}

export function CardMemoriaPorItem({
  celulasPorItem,
  config,
  exercicio,
  mode,
  onAbrirMemoriaItem,
}: {
  celulasPorItem: { item: ItemIntegracaoArt12; cell: CellResultArt }[]
  config: CellConfigArt
  exercicio: ExercicioKey
  mode: RepasseMode
  onAbrirMemoriaItem?: (item: ItemIntegracaoArt12, cell: CellResultArt) => void
}) {
  if (celulasPorItem.length === 0) return null
  const repasseTxt =
    mode === 'parcial'
      ? `${REPASSE_TITULO[mode]} ${formatNumberBR(config.repassePct)}%`
      : REPASSE_TITULO[mode]
  const nomeRegime = (r: string) =>
    r === 'presumido'
      ? 'Lucro Presumido'
      : r === 'real'
        ? 'Lucro Real'
        : r === 'simples'
          ? 'Simples Nacional'
          : 'SN híbrido'
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Layers className="w-5 h-5 text-emerald-400" />
        <span className="text-xs font-mono font-black uppercase tracking-wider text-emerald-300">
          Memória por item — {repasseTxt} · Exercício {exercicio}
        </span>
      </div>
      {celulasPorItem.map(({ item, cell }, idx) => (
        <div
          key={item.id}
          className="rounded-xl border border-emerald-500/30 bg-slate-900/40 p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="text-sm font-black font-mono text-white uppercase tracking-wide">
              Item {String(idx + 1).padStart(2, '0')} · {item.name || '—'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">
                {formatNumberBR(item.quantity, 0)} un. · {formatBRL(item.merchandiseValue)} + frete{' '}
                {formatBRL(item.freightValue)}
              </span>
              {onAbrirMemoriaItem && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAbrirMemoriaItem(item, cell)}
                  className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer h-6 text-[10px]"
                >
                  <Calculator className="w-3 h-3 mr-1" /> Memória do item
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* 1º — Custo de aquisição para o ADQUIRENTE (comprador) — HOJE */}
            <div className="rounded-xl border border-sky-500/45 bg-sky-500/[0.05] p-3 space-y-1.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-[11px] font-black font-mono uppercase tracking-wide text-sky-300 leading-tight">
                    1º Custo de Aquisição para o ADQUIRENTE (COMPRADOR) -{' '}
                    {nomeRegime(config.compradorRegime)}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">
                  Sistema pré-reforma · HOJE · base integrada à Calculadora de Compras
                </div>
              </div>
              {cell.hoje.lines
                .filter((l) => l.bloco === 2)
                .map((l) => (
                  <LinhaCard key={l.key} line={l} />
                ))}
              <div className="flex items-center justify-between rounded-md bg-sky-500/10 border border-sky-500/40 px-2 py-1">
                <span className="text-[9px] font-mono font-bold uppercase text-sky-400">
                  Custo unitário HOJE
                </span>
                <span className="text-[11px] font-black text-sky-300 font-mono">
                  {formatBRL(cell.hoje.unitario)}/un
                </span>
              </div>
            </div>
            {/* 2º — Formação do preço pelo FORNECEDOR — exercício */}
            <div className="rounded-xl border border-emerald-500/45 bg-emerald-500/[0.05] p-3 space-y-1.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-black font-mono uppercase tracking-wide text-emerald-300 leading-tight">
                    2º Formação do Preço pelo FORNECEDOR - {nomeRegime(config.fornecedorRegime)}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">
                  Exercício {exercicio} · {repasseTxt} · regime do cenário simulado
                </div>
              </div>
              {cell.exercicio.lines
                .filter(
                  (l) =>
                    l.bloco === 1 && l.label !== 'MEMORIA_BLOCO1' && l.subtotal !== 'preco_nota',
                )
                .map((l) => (
                  <LinhaCard key={l.key} line={l} />
                ))}
              <div className="flex items-center justify-between rounded-md bg-emerald-500/10 border border-emerald-500/40 px-2 py-1">
                <span className="text-[9px] font-mono font-bold uppercase text-emerald-400">
                  Base limpa {exercicio}
                </span>
                <span className="text-[11px] font-black text-emerald-300 font-mono">
                  {cell.exercicio.baseLimpa !== null ? formatBRL(cell.exercicio.baseLimpa) : '—'}
                </span>
              </div>
              {cell.exercicio.lines
                .filter((l) => l.subtotal === 'preco_nota')
                .map((l) => (
                  <LinhaCard key={l.key} line={l} />
                ))}
            </div>
            {/* 3º — Formação do CUSTO pelo ADQUIRENTE (comprador) — exercício */}
            <div className="rounded-xl border border-orange-500/45 bg-orange-500/[0.05] p-3 space-y-1.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="text-[11px] font-black font-mono uppercase tracking-wide text-orange-300 leading-tight">
                    3º Formação do CUSTO pelo ADQUIRENTE (COMPRADOR) -{' '}
                    {nomeRegime(config.compradorRegime)}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">
                  Exercício {exercicio} · {repasseTxt} · regime do cenário simulado
                </div>
              </div>
              {cell.exercicio.lines
                .filter((l) => l.bloco === 2)
                .map((l) => (
                  <LinhaCard key={l.key} line={l} />
                ))}
              <div className="flex items-center justify-between rounded-md bg-orange-500/10 border border-orange-500/40 px-2 py-1">
                <span className="text-[9px] font-mono font-bold uppercase text-orange-400">
                  Custo unitário {exercicio}
                </span>
                <div className="text-right">
                  <span className="text-[11px] font-black text-orange-300 font-mono block leading-tight">
                    {formatBRL(cell.exercicio.unitario)}/un
                  </span>
                  <span
                    className={`text-[9px] font-mono ${cell.deltaPct > 0 ? 'text-rose-300' : cell.deltaPct < 0 ? 'text-emerald-300' : 'text-slate-400'}`}
                  >
                    {cell.deltaPct > 0 ? '+' : ''}
                    {formatNumberBR(cell.deltaPct)}% VS HOJE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <p className="text-[10px] font-mono text-slate-500">
        Cada item tem sua própria memória Art. 12 completa — nunca média entre produtos (máxima da
        casa). Os 3 blocos usam o MESMO cenário de repasse selecionado — ao mudar o cenário, todos
        os itens recalculam juntos.
      </p>
    </div>
  )
}
