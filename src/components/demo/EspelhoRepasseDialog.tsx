import React from 'react'
import { Calculator } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  computeCellArt12,
  type CellConfigArt,
  type CellResultArt,
  type CmvArt12Input,
  type ExercicioKey,
  type MemoryLineArt,
  type RegimeId,
  type RepasseMode,
  type ScheduleRowArt,
} from '@/lib/art12Calculations'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * ESPELHO DOS CÁLCULOS POR CENÁRIO DE REPASSE (pedido da CEO, 24/09).
 * Para cada régua (integral / parcial / nenhum), as 16 combinações
 * COMPRADOR × FORNECEDOR lado a lado, cada uma no formato do print:
 * quadro laranja do bloco 2 (custo da aquisição) com as linhas do custo.
 * Clique numa combinação → memória completa daquela célula.
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

/** Linha de custo no formato do print: rótulo + cálculo + valor (quadro laranja). */
function LinhaCusto({ line }: { line: MemoryLineArt }) {
  const isSub = line.subtotal === 'custo_unitario' || line.key === 'comprasliquidas'
  return (
    <div
      className={`rounded-lg px-2 py-1 ${isSub ? 'bg-orange-500/10 border border-orange-500/40' : 'bg-slate-950/50 border border-slate-800/60'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-mono font-semibold text-slate-200 block leading-tight">
            {line.label}
          </span>
          {line.formula && (
            <span className="text-[9px] font-mono text-slate-500 leading-tight block break-words">
              {line.formula}
            </span>
          )}
        </div>
        <span
          className={`text-[10px] font-mono font-bold shrink-0 ${
            isSub
              ? 'text-orange-300'
              : line.value < 0
                ? 'text-emerald-300'
                : line.value > 0
                  ? 'text-slate-100'
                  : 'text-slate-500'
          }`}
        >
          {line.kind === 'nota' && line.value === 0 ? '—' : formatBRL(line.value)}
        </span>
      </div>
    </div>
  )
}

/** Quadro do comprador para UMA combinação (formato do print — bloco 2 laranja). */
function CelulaComprador({
  cell,
  comprador,
  fornecedor,
  isMenor,
  onAbrir,
}: {
  cell: CellResultArt
  comprador: RegimeId
  fornecedor: RegimeId
  isMenor: boolean
  onAbrir: () => void
}) {
  const linhas = cell.exercicio.lines.filter((l) => l.bloco === 2 && l.label !== 'MEMORIA_BLOCO1')
  const deltaPositivo = cell.deltaPct > 0
  const deltaNegativo = cell.deltaPct < 0
  return (
    <div
      className={`rounded-xl border p-2.5 space-y-1 ${
        isMenor
          ? 'border-emerald-400/70 bg-emerald-500/[0.06] ring-1 ring-emerald-400/50'
          : 'border-orange-500/40 bg-orange-500/[0.05]'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-mono font-black uppercase text-orange-300">
          {REGIME_LABEL[comprador]} × {REGIME_LABEL[fornecedor]}
        </span>
        {isMenor && (
          <span className="text-[8px] font-mono font-bold text-emerald-300 border border-emerald-500/50 rounded px-1">
            MENOR
          </span>
        )}
      </div>
      <div className="space-y-1">
        {linhas.map((l) => (
          <LinhaCusto key={l.key} line={l} />
        ))}
      </div>
      <div className="flex items-center justify-between p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/40">
        <span className="text-[9px] font-mono font-bold uppercase text-orange-400">
          Custo líquido
        </span>
        <div className="text-right">
          <span className="text-[11px] font-black text-orange-300 font-mono block leading-tight">
            {formatBRL(cell.exercicio.unitario)}/un
          </span>
          <span
            className={`text-[9px] font-mono ${
              deltaPositivo
                ? 'text-rose-300'
                : deltaNegativo
                  ? 'text-emerald-300'
                  : 'text-slate-400'
            }`}
          >
            {cell.deltaPct > 0 ? '+' : ''}
            {formatNumberBR(cell.deltaPct)}%
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onAbrir}
        className="w-full inline-flex items-center justify-center gap-1 rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-1 text-[9px] font-mono font-bold text-orange-300 hover:bg-orange-500/20 cursor-pointer"
      >
        <Calculator className="w-3 h-3" /> Memória + base legal
      </button>
    </div>
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
}: {
  input: CmvArt12Input
  baseConfig: CellConfigArt
  row: ScheduleRowArt
  exercicio: ExercicioKey
  mode: RepasseMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onAbrirCelula: (comprador: RegimeId, fornecedor: RegimeId, cell: CellResultArt) => void
}) {
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
            As 16 combinações COMPRADOR × FORNECEDOR, cada uma no quadro de custo da aquisição
            (laranja). Compare os cenários entre os três botões de repasse. Clique numa combinação
            para abrir a memória completa.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {celulas.map((linha) =>
            linha.cells.map(({ fornecedor, cell }) => (
              <CelulaComprador
                key={`${linha.comprador}-${fornecedor}`}
                cell={cell}
                comprador={linha.comprador}
                fornecedor={fornecedor}
                isMenor={cell.exercicio.unitario === menor}
                onAbrir={() => onAbrirCelula(linha.comprador, fornecedor, cell)}
              />
            )),
          )}
        </div>
        <p className="text-[10px] font-mono text-slate-500">
          LP = Lucro Presumido · LR = Lucro Real · SN = Simples Nacional (padrão) · SNH = SN híbrido
          (regime regular IBS/CBS — LC 214/2025, art. 41). Fornecedor SN/SNH: nota congelada.
          Premissa IT: base do IBS/CBS do fornecedor SNH sem ICMS. Célula em destaque = menor custo
          do cenário.
        </p>
      </DialogContent>
    </Dialog>
  )
}
