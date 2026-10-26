import { Calculator, Layers, ShoppingCart, Building2, Wallet, Tag } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatarMascaraNcm } from '@/services/ncmClassificationService'
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
  integral: 'BASE LIMPA (art. 12) · cadeia neutra',
  parcial: 'PARCIAL 50% · ganho dividido',
  nenhum: 'PREÇO CHEIO · comprador absorve (escada)',
}

const REPASSE_SUBTITULO: Record<RepasseMode, string> = {
  integral: 'PIS/COFINS eliminados, economia no preço',
  parcial: 'Metade no preço, metade na margem',
  nenhum: 'Tributação extinta mantida no preço',
}

function LinhaCard({ line }: { line: MemoryLineArt }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs font-mono py-0.5">
      <div className="min-w-0">
        <span className="text-slate-800">{line.label}</span>
        {line.formula && (
          <span className="text-slate-500 block break-words text-[10px]">{line.formula}</span>
        )}
      </div>
      <span
        className={`shrink-0 font-bold ${line.value < 0 ? 'text-[#b87c14]' : 'text-slate-900'}`}
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
      ? `PARCIAL ${formatNumberBR(config.repassePct)}% · ganho dividido`
      : REPASSE_TITULO[mode]
  const repasseSub = REPASSE_SUBTITULO[mode]
  const rawCfg = configOverride ?? config
  const tipoFornecedorSN =
    rawCfg.perfilFornecedorSN?.tipo === 'hibrido' || rawCfg.fornecedorRegime === 'simples_hibrido'
      ? ('hibrido' as const)
      : ('puro' as const)
  const cfg: CellConfigArt = {
    ...rawCfg,
    fornecedorRegime:
      rawCfg.fornecedorRegime === 'simples_hibrido'
        ? 'simples_hibrido'
        : rawCfg.fornecedorRegime === 'simples'
          ? tipoFornecedorSN === 'hibrido'
            ? 'simples_hibrido'
            : 'simples'
          : rawCfg.fornecedorRegime,
    perfilFornecedorSN: rawCfg.perfilFornecedorSN
      ? { ...rawCfg.perfilFornecedorSN, tipo: tipoFornecedorSN }
      : undefined,
  }
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
      <div className="flex flex-wrap items-center gap-2 border-l-4 border-amber-500 pl-2.5">
        <Layers className="w-5 h-5 text-[#b87c14]" />
        <span className="text-sm font-mono font-bold uppercase tracking-wider text-[#261502]">
          Memória por item — {repasseTxt} · Exercício {exercicio}
        </span>
      </div>
      {/* IDENTIFICAÇÃO DA OPERAÇÃO (checagem da CEO, 28/09) — antes dos itens, a
          combinação exata que está sendo analisada: adquirente × fornecedor × repasse */}
      {mostrarIdentidade === true && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/50 px-3.5 py-2">
          <span className="text-xs font-mono font-bold uppercase text-[#261502]">
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
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5">
            <span className="text-xs font-mono font-bold uppercase text-amber-900 block">
              Pendência fiscal — crédito proporcional do adquirente (art. 23 da LC 123/2006)
            </span>
            <span className="text-[11px] font-mono text-amber-800 block mt-0.5 leading-relaxed">
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
          className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3.5 shadow-2xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-slate-900 uppercase tracking-wide">
                Item {String(idx + 1).padStart(2, '0')} · {item.name || '—'}
              </span>
              {item.ncm && (
                <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-mono text-[10px]">
                  NCM {formatarMascaraNcm(String(item.ncm ?? ''))}
                </Badge>
              )}
              {item.ncmPercentualReducao && item.ncmPercentualReducao > 0 ? (
                <Badge className="bg-amber-100 text-[#3b2405] border-amber-300 font-mono text-[10px] font-bold">
                  <Tag className="w-2.5 h-2.5 mr-1 text-[#b87c14]" />
                  redução {item.ncmAnexo || 'LC 214/25'} · {item.ncmArtigoOrigem || 'art. 125+'} ·{' '}
                  {item.ncmPercentualReducao}%
                </Badge>
              ) : (
                <Badge className="bg-slate-50 text-slate-500 border-slate-200 font-mono text-[10px]">
                  Sem redutor — alíquota cheia
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-600">
                {formatNumberBR(item.quantity, 0)} un. · {formatBRL(item.merchandiseValue)} + frete{' '}
                {formatBRL(item.freightValue)}
              </span>
              {onAbrirMemoriaItem && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAbrirMemoriaItem(item, cell)}
                  className="border-amber-400 text-[#261502] bg-amber-50 hover:bg-amber-100 cursor-pointer h-7 text-xs font-mono font-bold shadow-2xs"
                >
                  <Calculator className="w-3.5 h-3.5 mr-1 text-[#b87c14]" /> Memória do item
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1º — Custo de aquisição para o ADQUIRENTE (comprador) — HOJE */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 text-white p-3.5 space-y-0.5 border-b border-slate-600">
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wide text-white leading-tight">
                    1º Custo de Aquisição para o ADQUIRENTE (COMPRADOR) -{' '}
                    {nomeRegime(cfg.compradorRegime)}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-200 uppercase">
                  Sistema pré-reforma · HOJE · base integrada à Calculadora de Compras
                </div>
              </div>
              {/* HISTÓRIA COMPLETA como a Memória de CMV do Markup (pedido da CEO, 27/09):
                  Mercadorias → Frete → IPI → ICMS fragmentado → créditos → Compras Líquidas
                  → Custo Unitário Líquido. Bloco 1 (elementos) + bloco 2 (exclusões e fecho)
                  — TODAS as linhas do motor, sem esconder crédito nenhum. */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between bg-slate-50/50">
                <div className="space-y-1">
                  {cell.hoje.lines.map((l) => (
                    <LinhaCard key={l.key} line={l} />
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-300 px-3 py-1.5 mt-2">
                  <span className="text-xs font-mono font-bold uppercase text-[#261502]">
                    Custo unitário HOJE
                  </span>
                  <span className="text-xs font-black text-[#261502] font-mono">
                    {formatBRL(cell.hoje.unitario)}/un
                  </span>
                </div>
              </div>
            </div>
            {/* 2º — Formação do preço pelo FORNECEDOR — exercício */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 text-white p-3.5 space-y-0.5 border-b border-slate-600">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wide text-white leading-tight">
                    2º Formação do Preço pelo FORNECEDOR -{' '}
                    {cfg.fornecedorRegime === 'simples_hibrido'
                      ? 'SN híbrido (regime regular IBS/CBS)'
                      : nomeRegime(cfg.fornecedorRegime)}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-200 uppercase">
                  {cfg.fornecedorRegime === 'simples'
                    ? `Exercício ${exercicio} · lógica do SN: DAS por dentro, sem destaque · repasse não se aplica (nota congelada)`
                    : `Exercício ${exercicio} · ${repasseTxt} · ${repasseSub} · regime do cenário simulado`}
                </div>
              </div>
              {/* Fornecedor SN puro: a memória segue a ORDEM NATURAL do motor —
                  receita bruta → alíquota efetiva → partilha → DAS por dentro → preço da nota */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between bg-amber-50/20">
                <div className="space-y-1">
                  {cfg.fornecedorRegime === 'simples' ? (
                    <>
                      {cell.exercicio.lines
                        .filter(
                          (l) =>
                            l.bloco === 1 && l.label !== 'MEMORIA_BLOCO1' && l.key !== 'cbsibs',
                        )
                        .map((l) => (
                          <LinhaCard key={l.key} line={l} />
                        ))}
                      <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-1.5 mt-2">
                        <span className="text-xs font-mono font-bold uppercase text-slate-800">
                          Preço da nota (congelado)
                        </span>
                        <span className="text-xs font-black text-slate-900 font-mono">
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
                            l.subtotal !== 'preco_nota',
                        )
                        .map((l) => (
                          <LinhaCard key={l.key} line={l} />
                        ))}
                      <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-1.5 mt-2">
                        <span className="text-xs font-mono font-bold uppercase text-slate-800">
                          Base limpa {exercicio}
                        </span>
                        <span className="text-xs font-black text-slate-900 font-mono">
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
              </div>
            </div>
            {/* 3º — Formação do CUSTO pelo ADQUIRENTE (comprador) — exercício */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 text-white p-3.5 space-y-0.5 border-b border-slate-600">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wide text-white leading-tight">
                    3º Formação do CUSTO pelo ADQUIRENTE (COMPRADOR) -{' '}
                    {nomeRegime(cfg.compradorRegime)}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-200 uppercase">
                  Exercício {exercicio} · {repasseTxt} · {repasseSub} · regime do cenário simulado
                </div>
              </div>{' '}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between bg-slate-50/50">
                <div className="space-y-1">
                  {cell.exercicio.lines
                    .filter((l) => l.bloco === 2)
                    .map((l) => (
                      <LinhaCard key={l.key} line={l} />
                    ))}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-1.5 mt-2">
                  <span className="text-xs font-mono font-bold uppercase text-slate-800">
                    Custo unitário {exercicio}
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 font-mono block leading-tight">
                      {formatBRL(cell.exercicio.unitario)}/un
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold ${cell.deltaPct > 0 ? 'text-rose-700' : cell.deltaPct < 0 ? 'text-[#b87c14]' : 'text-slate-500'}`}
                    >
                      {cell.deltaPct > 0 ? '+' : ''}
                      {formatNumberBR(cell.deltaPct)}% VS HOJE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      {ocultarRodape === true ? null : (
        <p className="text-xs font-mono text-slate-500">
          Cada item tem sua própria memória Art. 12 completa — nunca média entre produtos (máxima da
          casa). Os 3 blocos usam o MESMO cenário de repasse selecionado — ao mudar o cenário, todos
          os itens recalculam juntos.
        </p>
      )}
    </div>
  )
}
