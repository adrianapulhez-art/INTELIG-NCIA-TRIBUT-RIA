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
  configOverride,
  ocultarRodape,
  mostrarIdentidade,
}: {
  celulasPorItem: { item: ItemIntegracaoArt12; cell: CellResultArt }[]
  config: CellConfigArt
  exercicio: ExercicioKey
  mode: RepasseMode
  onAbrirMemoriaItem?: (item: ItemIntegracaoArt12, cell: CellResultArt) => void
  /** Config da combinação (regimes fornecedor × comprador) — modelo canônico replicado. */
  configOverride?: CellConfigArt
  /** Oculta a nota de rodapé (redundante quando replicado em várias combinações). */
  ocultarRodape?: boolean
  /** Mostra a linha de identificação da operação antes dos itens (pedido da CEO, 28/09). */
  mostrarIdentidade?: boolean
}) {
  if (celulasPorItem.length === 0) return null
  const repasseTxt =
    mode === 'parcial'
      ? `${REPASSE_TITULO[mode]} ${formatNumberBR(config.repassePct)}%`
      : REPASSE_TITULO[mode]
  const cfg = configOverride ?? config
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
      {/* IDENTIFICAÇÃO DA OPERAÇÃO (checagem da CEO, 28/09) — antes dos itens, a
          combinação exata que está sendo analisada: adquirente × fornecedor × repasse */}
      {mostrarIdentidade === true && (
        <div className="rounded-lg border border-sky-500/40 bg-sky-500/[0.06] px-3 py-2">
          <span className="text-[11px] font-mono font-black uppercase text-sky-300">
            OPERAÇÃO ANALISADA: ADQUIRENTE: {nomeRegime(cfg.compradorRegime)} / FORNECEDOR:{' '}
            {nomeRegime(cfg.fornecedorRegime)} · {repasseTxt}
          </span>
        </div>
      )}
      {/* PENDÊNCIA FISCAL DECLARADA (pacto da honestidade) — crédito proporcional do
          adquirente na compra de optante do SN puro: motor hoje zera; correção é rodada
          separada com re-chancela (decisão da CEO). */}
      {cfg.fornecedorRegime === 'simples' &&
        cfg.compradorRegime !== 'simples' &&
        cfg.compradorRegime !== 'simples_hibrido' && (
          <div className="rounded-lg border border-amber-500/45 bg-amber-500/[0.07] px-3 py-2">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-300 block">
              Pendência fiscal — crédito proporcional do adquirente (art. 23 da LC 123/2006)
            </span>
            <span className="text-[9px] font-mono text-slate-300 block mt-0.5 leading-relaxed">
              LC 123/2006, art. 23, §1º (redação LC 214/2025): adquirente no regime regular tem
              crédito "em montante equivalente ao cobrado por meio desse regime único" — §2º: a
              alíquota (percentuais de ICMS/IBS/CBS dos Anexos I a V da faixa do fornecedor) será
              informada no documento fiscal. O motor hoje NÃO computa esse crédito (custo chancelado
              1.413,33 com crédito zero). Correção do motor = rodada separada com re-chancela dos
              ouros afetados — decisão da CEO.
            </span>
          </div>
        )}
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
                    {nomeRegime(cfg.compradorRegime)}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">
                  Sistema pré-reforma · HOJE · base integrada à Calculadora de Compras
                </div>
              </div>
              {/* HISTÓRIA COMPLETA como a Memória de CMV do Markup (pedido da CEO, 27/09):
                  Mercadorias → Frete → IPI → ICMS fragmentado → créditos → Compras Líquidas
                  → Custo Unitário Líquido. Bloco 1 (elementos) + bloco 2 (exclusões e fecho)
                  — TODAS as linhas do motor, sem esconder crédito nenhum. */}
              {cell.hoje.lines.map((l) => (
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
                    2º Formação do Preço pelo FORNECEDOR - {nomeRegime(cfg.fornecedorRegime)}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">
                  {cfg.fornecedorRegime === 'simples'
                    ? `Exercício ${exercicio} · lógica do SN: DAS por dentro, sem destaque · repasse não se aplica (nota congelada)`
                    : `Exercício ${exercicio} · ${repasseTxt} · regime do cenário simulado`}
                </div>
              </div>
              {/* Fornecedor SN puro: a memória segue a ORDEM NATURAL do motor —
                  receita bruta → alíquota efetiva → partilha → DAS por dentro → preço da nota */}
              {cfg.fornecedorRegime === 'simples' ? (
                <>
                  {cell.exercicio.lines
                    .filter(
                      (l) => l.bloco === 1 && l.label !== 'MEMORIA_BLOCO1' && l.key !== 'cbsibs',
                    )
                    .map((l) => (
                      <LinhaCard key={l.key} line={l} />
                    ))}
                  <div className="flex items-center justify-between rounded-md bg-emerald-500/10 border border-emerald-500/40 px-2 py-1">
                    <span className="text-[9px] font-mono font-bold uppercase text-emerald-400">
                      Preço da nota (congelado)
                    </span>
                    <span className="text-[11px] font-black text-emerald-300 font-mono">
                      {formatBRL(cell.exercicio.bruto)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {cell.exercicio.lines
                    .filter(
                      (l) =>
                        l.bloco === 1 &&
                        l.label !== 'MEMORIA_BLOCO1' &&
                        l.subtotal !== 'preco_nota' &&
                        l.key !== 'snhib_icms_das' &&
                        l.key !== 'snhib_base_it',
                    )
                    .map((l) => (
                      <LinhaCard key={l.key} line={l} />
                    ))}
                  <div className="flex items-center justify-between rounded-md bg-emerald-500/10 border border-emerald-500/40 px-2 py-1">
                    <span className="text-[9px] font-mono font-bold uppercase text-emerald-400">
                      Base limpa {exercicio}
                    </span>
                    <span className="text-[11px] font-black text-emerald-300 font-mono">
                      {cell.exercicio.baseLimpa !== null
                        ? formatBRL(cell.exercicio.baseLimpa)
                        : '—'}
                    </span>
                  </div>
                  {cell.exercicio.lines
                    .filter((l) => l.subtotal === 'preco_nota')
                    .map((l) => (
                      <LinhaCard key={l.key} line={l} />
                    ))}
                </>
              )}
            </div>
            {/* 3º — Formação do CUSTO pelo ADQUIRENTE (comprador) — exercício */}
            <div className="rounded-xl border border-orange-500/45 bg-orange-500/[0.05] p-3 space-y-1.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="text-[11px] font-black font-mono uppercase tracking-wide text-orange-300 leading-tight">
                    3º Formação do CUSTO pelo ADQUIRENTE (COMPRADOR) -{' '}
                    {nomeRegime(cfg.compradorRegime)}
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
      {ocultarRodape === true ? null : (
        <p className="text-[10px] font-mono text-slate-500">
          Cada item tem sua própria memória Art. 12 completa — nunca média entre produtos (máxima da
          casa). Os 3 blocos usam o MESMO cenário de repasse selecionado — ao mudar o cenário, todos
          os itens recalculam juntos.
        </p>
      )}
    </div>
  )
}
