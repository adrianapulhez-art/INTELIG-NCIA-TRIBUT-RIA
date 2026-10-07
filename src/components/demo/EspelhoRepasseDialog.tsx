import React, { useState } from 'react'
import { Calculator, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { NotaCelulaTrigger } from './NotasExplicativas'
import { CardMemoriaPorItem } from './CardMemoriaPorItem'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'
import {
  computeCellArt12,
  computeCellArt12Item,
  type CellConfigArt,
  type CellResultArt,
  type CmvArt12Input,
  type ExercicioKey,
  type RegimeId,
  type RepasseMode,
  type ScheduleRowArt,
} from '@/lib/art12Calculations'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * ESPELHO DOS CÁLCULOS POR CENÁRIO DE REPASSE — EM CAMADAS (pedido da CEO, 27/09).
 * CAMADA 1: 16 cards principais compactos, um por combinação COMPRADOR × FORNECEDOR,
 * cada um com: REPASSE (o selecionado na régua) · ADQUIRENTE: regime · FORNECEDOR: regime
 * · custo líquido POR ITEM (até 3, ABC) · Δ vs HOJE. Card reflete EXATAMENTE o cenário.
 * CAMADA 2 (clique no card): linha de IDENTIFICAÇÃO DA OPERAÇÃO (adquirente × fornecedor ×
 * repasse) + os 6 cards do cenário — 3 por item (modelo canônico), regimes da combinação.
 * CHECAGEM CIRÚRGICA DA CEO (28/09): nomenclatura da camada interna DEVE corresponder ao
 * card externo — identificação por ÍNDICE numérico (imune a valor de regime perdido) e
 * fallback '—'. NENHUM cálculo alterado — só identificação.
 */

const REGIMES: RegimeId[] = ['presumido', 'real']

const REGIME_LABEL: Record<RegimeId, string> = {
  presumido: 'LP',
  real: 'LR',
  simples: 'SN',
  simples_hibrido: 'SNH',
}

const REGIME_NOME: Record<RegimeId, string> = {
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  simples: 'Simples Nacional',
  simples_hibrido: 'SN híbrido',
}

const nomeRegime = (r: RegimeId | undefined) => (r && REGIME_NOME[r] ? REGIME_NOME[r] : '—')

const REPASSE_TITULO: Record<RepasseMode, string> = {
  integral: 'REPASSE INTEGRAL',
  parcial: 'REPASSE PARCIAL',
  nenhum: 'REPASSE NENHUM',
}

/** CAMADA 1 — card principal compacto do cenário (reflete exatamente o que abre).
 *  Unitários POR ITEM (máxima da casa — nunca média): até 3 maiores por valor (ABC),
 *  cada um com o próprio Δ; demais indicados com aviso honesto. */
const MAX_ITENS_CARD = 3

function CardPrincipalCenario({
  celulasItens,
  comprador,
  fornecedor,
  isMenor,
  repasseTxt,
  onAbrir,
}: {
  celulasItens: { item: ItemIntegracaoArt12; cell: CellResultArt }[]
  comprador: RegimeId
  fornecedor: RegimeId
  isMenor: boolean
  repasseTxt: string
  onAbrir: () => void
}) {
  const exibidos = celulasItens.slice(0, MAX_ITENS_CARD)
  const restantes = celulasItens.length - exibidos.length
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`rounded-xl border p-3 text-left cursor-pointer transition-colors space-y-2 ${
        isMenor
          ? 'border-emerald-400/70 bg-emerald-500/[0.06] ring-1 ring-emerald-400/50 hover:bg-emerald-500/10'
          : 'border-slate-700/70 bg-slate-900/40 hover:bg-slate-900/70'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[12px] font-mono font-black uppercase text-white">
          {REGIME_LABEL[comprador]} × {REGIME_LABEL[fornecedor]}
        </span>
        {isMenor && (
          <span className="text-[8px] font-mono font-bold text-emerald-300 border border-emerald-500/50 rounded px-1">
            MENOR
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-[9px] font-mono font-bold uppercase text-emerald-300">
          {repasseTxt}
        </div>
        <div className="text-[9px] font-mono uppercase text-slate-300">
          ADQUIRENTE: {REGIME_NOME[comprador]}
        </div>
        <div className="text-[9px] font-mono uppercase text-slate-300">
          FORNECEDOR: {REGIME_NOME[fornecedor]}
        </div>
      </div>
      {/* CUSTO LÍQUIDO POR ITEM — cada produto com o unitário dele na combinação */}
      <div className="space-y-1">
        {exibidos.map(({ item, cell: ci }) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-md bg-orange-500/10 border border-orange-500/40 px-2 py-1"
          >
            <span className="text-[9px] font-mono font-bold uppercase text-orange-400 truncate max-w-[45%]">
              {item.name || 'Item'}
            </span>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-black text-orange-300 font-mono block leading-tight">
                {formatBRL(ci.exercicio.unitario)}/un
              </span>
              <span
                className={`text-[9px] font-mono ${
                  ci.deltaPct > 0
                    ? 'text-rose-300'
                    : ci.deltaPct < 0
                      ? 'text-emerald-300'
                      : 'text-slate-400'
                }`}
              >
                {ci.deltaPct > 0 ? '+' : ''}
                {formatNumberBR(ci.deltaPct)}%
              </span>
            </div>
          </div>
        ))}
        {restantes > 0 && (
          <div className="text-[9px] font-mono text-slate-500">
            +{restantes} item{restantes === 1 ? '' : 's'} dentro — cálculo por item na camada
            interna
          </div>
        )}
        {celulasItens.length === 0 && (
          <div className="text-[9px] font-mono text-slate-500">
            Nenhum item com valor na Calculadora de Compras
          </div>
        )}
      </div>
      <div className="text-[9px] font-mono text-slate-500 text-center">
        Clique para abrir os 6 cards do cenário
      </div>
    </button>
  )
}

export function EspelhoRepasseDialog({
  input,
  baseConfig,
  row,
  exercicio,
  mode,
  open,
  onOpenChange,
  onAbrirCelula,
  celulasPorItem,
  onAbrirMemoriaItem,
}: {
  input: CmvArt12Input
  baseConfig: CellConfigArt
  row: ScheduleRowArt
  exercicio: ExercicioKey
  mode: RepasseMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onAbrirCelula: (comprador: RegimeId, fornecedor: RegimeId, cell: CellResultArt) => void
  /** MEMÓRIA POR ITEM dentro do card de repasse (pedido da CEO, 27/09). */
  celulasPorItem?: { item: ItemIntegracaoArt12; cell: CellResultArt }[]
  onAbrirMemoriaItem?: (item: ItemIntegracaoArt12, cell: CellResultArt) => void
}) {
  // CAMADA 1 = grid de 16 cards principais; CAMADA 2 = cenário aberto (6 cards por item).
  // IDENTIFICAÇÃO POR ÍNDICE (checagem da CEO, 28/09): o cenário aberto é guardado como
  // par de índices (0–3) — a nomenclatura da camada interna sai SEMPRE dos mesmos índices
  // que o card externo exibiu, sem depender de matching por string.
  const [cenarioAberto, setCenarioAberto] = useState<{ ci: number; fi: number } | null>(null)
  const cfg: CellConfigArt = { ...baseConfig, repasse: mode }
  const celulas = REGIMES.map((comprador, ci) => ({
    comprador,
    ci,
    cells: REGIMES.map((fornecedor, fi) => ({
      fornecedor,
      fi,
      cell: computeCellArt12(
        input,
        { ...cfg, compradorRegime: comprador, fornecedorRegime: fornecedor },
        row,
      ),
    })),
  }))
  const menor = Math.min(...celulas.flatMap((l) => l.cells.map((c) => c.cell.exercicio.unitario)))
  const repassePct = mode === 'parcial' ? ` ${formatNumberBR(baseConfig.repassePct)}%` : ''
  const repasseTxt =
    mode === 'parcial'
      ? `REPASSE PARCIAL ${formatNumberBR(baseConfig.repassePct)}%`
      : REPASSE_TITULO[mode]

  const aberto = cenarioAberto
    ? {
        comprador: REGIMES[cenarioAberto.ci],
        fornecedor: REGIMES[cenarioAberto.fi],
        cell: celulas[cenarioAberto.ci].cells[cenarioAberto.fi].cell,
      }
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>
              Espelho dos cálculos — {REPASSE_TITULO[mode]}
              {repassePct} · Exercício {exercicio}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            {aberto
              ? 'Camada interna: os 6 cards do cenário selecionado — 3 por item da Calculadora de Compras.'
              : 'Cenários PLENOS COMPRADOR × FORNECEDOR (LP/LR). Cada card reflete exatamente o repasse selecionado — clique para abrir os 6 cards do cenário. As operações com Simples Nacional (SN puro e SN híbrido) vivem na SESSÃO SN da página, com as regras próprias delas.'}
          </DialogDescription>
        </DialogHeader>
        {aberto ? (
          <div className="space-y-3">
            {/* CAMADA 2 — cabeçalho: voltar + memória/notas da combinação */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCenarioAberto(null)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer h-7"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar aos cenários
              </Button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAbrirCelula(aberto.comprador, aberto.fornecedor, aberto.cell)}
                  className="inline-flex items-center gap-1 rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-1 text-[9px] font-mono font-bold text-orange-300 hover:bg-orange-500/20 cursor-pointer"
                >
                  <Calculator className="w-3 h-3" /> Memória + base legal
                </button>
                {row && (
                  <NotaCelulaTrigger
                    inp={input}
                    cell={aberto.cell}
                    row={row}
                    exercicio={exercicio}
                    comprador={aberto.comprador}
                    fornecedor={aberto.fornecedor}
                    repasse={mode}
                    repassePct={baseConfig.repassePct}
                  />
                )}
              </div>
            </div>
            {/* IDENTIFICAÇÃO DA OPERAÇÃO (checagem da CEO, 28/09) — antes dos itens,
                exatamente a combinação do card externo clicado */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.05] p-3 space-y-1">
              <div className="text-[12px] font-mono font-black uppercase text-white">
                OPERAÇÃO ANALISADA: ADQUIRENTE: {nomeRegime(aberto.comprador)} / FORNECEDOR:{' '}
                {nomeRegime(aberto.fornecedor)}
              </div>
              <div className="text-[10px] font-mono text-emerald-300 uppercase">
                {repasseTxt} · Exercício {exercicio}
              </div>
              <div className="text-[10px] font-mono text-slate-300">
                Custo líquido {formatBRL(aberto.cell.exercicio.unitario)}/un ·{' '}
                {aberto.cell.deltaPct > 0 ? '+' : ''}
                {formatNumberBR(aberto.cell.deltaPct)}% vs HOJE
                {aberto.cell.exercicio.unitario === menor && ' · MENOR CUSTO DO CENÁRIO'}
              </div>
            </div>
            {/* OS 6 CARDS — 3 por item, modelo canônico, regimes da combinação */}
            <CardMemoriaPorItem
              celulasPorItem={
                celulasPorItem && celulasPorItem.length > 0
                  ? celulasPorItem.map(({ item }) => ({
                      item,
                      // CÁLCULO POR ITEM (máxima da casa): cada item com a SUA célula
                      // na combinação aberta — nunca o input consolidado de outro item.
                      cell: computeCellArt12Item(
                        item,
                        {
                          ...cfg,
                          compradorRegime: aberto.comprador,
                          fornecedorRegime: aberto.fornecedor,
                        },
                        row,
                      ),
                    }))
                  : []
              }
              config={cfg}
              configOverride={{
                ...cfg,
                compradorRegime: aberto.comprador,
                fornecedorRegime: aberto.fornecedor,
              }}
              exercicio={exercicio}
              mode={mode}
              mostrarIdentidade={true}
              onAbrirMemoriaItem={onAbrirMemoriaItem}
            />
          </div>
        ) : (
          /* CAMADA 1 — grid dos 16 cards principais do cenário, com unitários POR ITEM */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {celulas.map((linha) =>
              linha.cells.map(({ fornecedor, fi }) => {
                const cfgComb = {
                  ...cfg,
                  compradorRegime: linha.comprador,
                  fornecedorRegime: fornecedor,
                }
                const celulasItens = (celulasPorItem || []).map(({ item }) => ({
                  item,
                  cell: computeCellArt12Item(item, cfgComb, row),
                }))
                const cellComando = celulasItens[0]?.cell
                return (
                  <CardPrincipalCenario
                    key={`${linha.comprador}-${fornecedor}`}
                    celulasItens={celulasItens}
                    comprador={linha.comprador}
                    fornecedor={fornecedor}
                    isMenor={cellComando?.exercicio.unitario === menor}
                    repasseTxt={repasseTxt}
                    onAbrir={() => setCenarioAberto({ ci: linha.ci, fi })}
                  />
                )
              }),
            )}
          </div>
        )}
        <p className="text-[10px] font-mono text-slate-500">
          LP = Lucro Presumido · LR = Lucro Real. Espelho pleno: só os regimes que destacam tributo
          na nota — as operações com Simples Nacional (SN puro e SN híbrido, 12 combinações) vivem
          na SESSÃO SN da página, com réguas e crédito próprios (art. 23 da LC 123/2006). Custo
          líquido POR ITEM (nunca média — máxima da casa); até 3 maiores por valor no card, demais
          na camada interna. Card em destaque = menor custo no item de maior valor.
        </p>
      </DialogContent>
    </Dialog>
  )
}
