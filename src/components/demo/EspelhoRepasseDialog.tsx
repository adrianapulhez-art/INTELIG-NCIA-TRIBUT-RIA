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
 * · custo líquido/un · Δ vs HOJE. Card reflete EXATAMENTE o cenário que abre.
 * CAMADA 2 (clique no card): os 6 cards do cenário — 3 por item da Calculadora de Compras
 * (modelo canônico aprovado), com os regimes da PRÓPRIA combinação nos títulos.
 */

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

const REPASSE_TITULO: Record<RepasseMode, string> = {
  integral: 'REPASSE INTEGRAL',
  parcial: 'REPASSE PARCIAL',
  nenhum: 'REPASSE NENHUM',
}

/** CAMADA 1 — card principal compacto do cenário (reflete exatamente o que abre). */
function CardPrincipalCenario({
  cell,
  comprador,
  fornecedor,
  isMenor,
  repasseTxt,
  onAbrir,
}: {
  cell: CellResultArt
  comprador: RegimeId
  fornecedor: RegimeId
  isMenor: boolean
  repasseTxt: string
  onAbrir: () => void
}) {
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
      <div className="flex items-center justify-between rounded-md bg-orange-500/10 border border-orange-500/40 px-2 py-1">
        <span className="text-[9px] font-mono font-bold uppercase text-orange-400">
          Custo líquido
        </span>
        <div className="text-right">
          <span className="text-[11px] font-black text-orange-300 font-mono block leading-tight">
            {formatBRL(cell.exercicio.unitario)}/un
          </span>
          <span
            className={`text-[9px] font-mono ${
              cell.deltaPct > 0
                ? 'text-rose-300'
                : cell.deltaPct < 0
                  ? 'text-emerald-300'
                  : 'text-slate-400'
            }`}
          >
            {cell.deltaPct > 0 ? '+' : ''}
            {formatNumberBR(cell.deltaPct)}%
          </span>
        </div>
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
  const [cenarioAberto, setCenarioAberto] = useState<{
    comprador: RegimeId
    fornecedor: RegimeId
  } | null>(null)
  const regimes: RegimeId[] = ['presumido', 'real', 'simples', 'simples_hibrido']
  const cfg: CellConfigArt = { ...baseConfig, repasse: mode }
  const celulas = regimes.map((comprador) => ({
    comprador,
    cells: regimes.map((fornecedor) => ({
      fornecedor,
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
    ? celulas
        .find((l) => l.comprador === cenarioAberto.comprador)!
        .cells.find((c) => c.fornecedor === cenarioAberto.fornecedor)!
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
              : '16 cenários COMPRADOR × FORNECEDOR. Cada card reflete exatamente o repasse selecionado e os regimes da combinação — clique para abrir os 6 cards do cenário.'}
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
            {/* Identidade do cenário aberto — exatamente o que os cards de baixo mostram */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.05] p-3 space-y-1">
              <div className="text-[11px] font-mono font-black uppercase text-emerald-300">
                {repasseTxt} · ADQUIRENTE: {REGIME_NOME[aberto.comprador]} · FORNECEDOR:{' '}
                {REGIME_NOME[aberto.fornecedor]}
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
              onAbrirMemoriaItem={onAbrirMemoriaItem}
            />
          </div>
        ) : (
          /* CAMADA 1 — grid dos 16 cards principais do cenário */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {celulas.map((linha) =>
              linha.cells.map(({ fornecedor, cell }) => (
                <CardPrincipalCenario
                  key={`${linha.comprador}-${fornecedor}`}
                  cell={cell}
                  comprador={linha.comprador}
                  fornecedor={fornecedor}
                  isMenor={cell.exercicio.unitario === menor}
                  repasseTxt={repasseTxt}
                  onAbrir={() => setCenarioAberto({ comprador: linha.comprador, fornecedor })}
                />
              )),
            )}
          </div>
        )}
        <p className="text-[10px] font-mono text-slate-500">
          LP = Lucro Presumido · LR = Lucro Real · SN = Simples Nacional (padrão) · SNH = SN híbrido
          (regime regular IBS/CBS — LC 214/2025, art. 41). Fornecedor SN/SNH: nota congelada.
          Premissa IT: base do IBS/CBS do fornecedor SNH sem ICMS. Card em destaque = menor custo do
          cenário.
        </p>
      </DialogContent>
    </Dialog>
  )
}
