import React, { useMemo, useState } from 'react'
import {
  CalendarClock,
  RotateCcw,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  CRONOGRAMA_ART12,
  CASO_CANONICO_ART12,
  CONFIG_PADRAO_ART12,
  computeCellArt12,
  reguasArt12,
  matrizArt12,
  escadaArt12,
  type CellConfigArt,
  type CellResultArt,
  type ExercicioKey,
  type Fundamento,
  type MemoryLineArt,
  type RegimeId,
  type ScheduleRowArt,
  type Semaforo,
  type SideResultArt,
  r2,
} from '@/lib/art12Calculations'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'
import { EspelhoRepasseDialog } from './EspelhoRepasseDialog'
import { NotasExplicativasDialog, BotaoNotasExplicativas } from './NotasExplicativas'

const EXERCICIOS: ExercicioKey[] = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

const REGIME_LABEL: Record<RegimeId, string> = {
  presumido: 'LP',
  real: 'LR',
  simples: 'SN',
  simples_hibrido: 'SN híb',
}

const REGIME_LABEL_FULL: Record<RegimeId, string> = {
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  simples: 'Simples Nacional',
  simples_hibrido: 'Simples Nacional — regime regular IBS/CBS (híbrido)',
}

const SEMAFORO_STYLE: Record<Semaforo, { bg: string; icon: React.ReactNode }> = {
  verde: {
    bg: 'bg-emerald-500/10 border border-emerald-500/40',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  },
  ambar: {
    bg: 'bg-amber-500/10 border border-amber-500/40',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  },
  vermelho: {
    bg: 'bg-rose-500/10 border border-rose-500/40',
    icon: <XCircle className="w-5 h-5 text-rose-400" />,
  },
}

const VALIDADE_STYLE: Record<string, { label: string; cls: string }> = {
  integral: {
    label: 'expresso na lei',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  condicionada: {
    label: 'condicionado',
    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  },
  nao_aplicavel: { label: '—', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
  pendente: {
    label: 'pendente de definição',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  },
}

function MatrizResumoDialog({
  matriz,
  menorCusto,
  exercicio,
  open,
  onOpenChange,
  onAbrirCelula,
}: {
  matriz: ReturnType<typeof matrizArt12>
  menorCusto: number
  exercicio: ExercicioKey
  open: boolean
  onOpenChange: (open: boolean) => void
  onAbrirCelula: (comprador: RegimeId, fornecedor: RegimeId, cell: CellResultArt) => void
}) {
  const regimes: RegimeId[] = ['presumido', 'real', 'simples', 'simples_hibrido']
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>Resultado: COMPRADOR × FORNECEDOR — Exercício {exercicio}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Custo unitário do CMV (e Δ vs o HOJE do próprio cruzamento) em cada célula. Clique na
            célula para abrir a memória de cálculo completa.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono border-collapse">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left py-2 pr-3 border-b border-slate-700">
                  COMPRADOR ↓ / FORNECEDOR →
                </th>
                {regimes.map((f) => (
                  <th key={f} className="text-left py-2 px-2 border-b border-slate-700">
                    {REGIME_LABEL[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.map((linha) => (
                <tr key={linha.comprador}>
                  <td className="py-2 pr-3 font-black text-slate-200 border-b border-slate-800/60">
                    {REGIME_LABEL[linha.comprador]}
                  </td>
                  {linha.cells.map(({ fornecedor, cell }) => {
                    const isMenor = cell.exercicio.unitario === menorCusto
                    return (
                      <td key={fornecedor} className="py-1 px-1 border-b border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => onAbrirCelula(linha.comprador, fornecedor, cell)}
                          className={`w-full text-left rounded-lg border p-2 cursor-pointer hover:brightness-125 ${
                            isMenor
                              ? 'border-emerald-400/70 bg-emerald-500/10 ring-1 ring-emerald-400/60'
                              : 'border-slate-700/60 bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-black text-white text-[11px]">
                              {formatBRL(cell.exercicio.unitario)}/un
                            </span>
                            {isMenor && (
                              <span className="text-[8px] font-mono font-bold text-emerald-300 border border-emerald-500/50 rounded px-1">
                                MENOR
                              </span>
                            )}
                          </div>
                          <div
                            className={
                              cell.deltaPct > 0
                                ? 'text-rose-300'
                                : cell.deltaPct < 0
                                  ? 'text-emerald-300'
                                  : 'text-slate-400'
                            }
                          >
                            {cell.deltaPct > 0 ? '+' : ''}
                            {formatNumberBR(cell.deltaPct)}%
                          </div>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] font-mono text-slate-500">
          LP = Lucro Presumido · LR = Lucro Real · SN = Simples Nacional (padrão) · SNH = SN híbrido
          (regime regular IBS/CBS — LC 214/2025, art. 41). Fornecedor SN/SNH: nota congelada.
          Premissa IT: base do IBS/CBS do fornecedor SNH sem ICMS. Célula em destaque = menor custo
          da matriz.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function BlocoMemoryDialog({
  side,
  bloco,
  blocoLabel,
  open,
  onOpenChange,
  contexto,
}: {
  side: SideResultArt
  bloco: number
  blocoLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  contexto?: string
}) {
  const linhas = side.lines.filter(
    (l) => l.bloco === bloco && l.label !== 'MEMORIA_BLOCO1' && l.passos && l.passos.length > 0,
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>Memória + base legal — {blocoLabel}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">{contexto}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {linhas.map((line) => (
            <div key={line.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-200">{line.label}</span>
                <span className="text-[11px] font-mono font-bold text-emerald-300 shrink-0">
                  {line.kind === 'nota' && line.value === 0 ? '—' : formatBRL(line.value)}
                </span>
              </div>
              {(line.passos || []).map((p) => (
                <div
                  key={p.ordem}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 space-y-1"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono font-black text-emerald-400 shrink-0">
                      {p.ordem}.
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] font-mono font-semibold text-slate-200">
                        {p.descricao}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 break-words">
                        {p.expressao}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-emerald-300 break-words">
                        = {p.resultado}
                      </div>
                      {p.fundamento && (
                        <div className="text-[9px] font-mono text-slate-500 break-words">
                          {p.fundamento}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-sky-500/40 bg-sky-500/[0.06] p-2.5 space-y-1">
                <div className="text-[10px] font-mono font-bold uppercase text-sky-300">
                  Base legal
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ArtBadge dispositivo={line.fundamento?.dispositivo || '—'} />
                  <ValidadeBadge fundamento={line.fundamento} />
                </div>
                {line.fundamento?.efeito && (
                  <div className="text-[10px] font-mono text-slate-300 break-words">
                    {line.fundamento.efeito}
                  </div>
                )}
                {line.fundamento?.nota && (
                  <div className="text-[9px] font-mono text-slate-500 break-words">
                    {line.fundamento.nota}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LineMemoryDialog({
  line,
  lineLabel,
  open,
  onOpenChange,
  contexto,
}: {
  line: MemoryLineArt
  lineLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  contexto?: string
}) {
  const passos = line.passos || []
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>Memória da linha — {lineLabel}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">{contexto}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 space-y-1">
            <div className="text-[10px] font-mono uppercase text-slate-500">Linha</div>
            <div className="text-xs font-mono font-bold text-slate-200">{line.label}</div>
            <div className="text-[10px] font-mono text-slate-400 break-words">{line.formula}</div>
            <div className="text-sm font-black font-mono text-emerald-300">
              {line.kind === 'nota' ? '—' : formatBRL(line.value)}
            </div>
          </div>
          {passos.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Derivação passo a passo (precisão de 6 casas — sem arredondamento intermediário)
              </div>
              {passos.map((p) => (
                <div
                  key={p.ordem}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 space-y-1"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono font-black text-emerald-400 shrink-0">
                      {p.ordem}.
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] font-mono font-semibold text-slate-200">
                        {p.descricao}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 break-words">
                        {p.expressao}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-emerald-300 break-words">
                        = {p.resultado}
                      </div>
                      {p.fundamento && (
                        <div className="text-[9px] font-mono text-slate-500 break-words">
                          {p.fundamento}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-lg border border-sky-500/40 bg-sky-500/[0.06] p-2.5 space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase text-sky-300">Base legal</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <ArtBadge dispositivo={line.fundamento?.dispositivo || '—'} />
              <ValidadeBadge fundamento={line.fundamento} />
            </div>
            {line.fundamento?.efeito && (
              <div className="text-[10px] font-mono text-slate-300 break-words">
                {line.fundamento.efeito}
              </div>
            )}
            {line.fundamento?.nota && (
              <div className="text-[9px] font-mono text-slate-500 break-words">
                {line.fundamento.nota}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ValidadeBadge({ fundamento }: { fundamento: Fundamento }) {
  const s = VALIDADE_STYLE[fundamento.validade]
  return (
    <span
      className={`text-[8px] font-mono font-bold uppercase rounded px-1 py-0.5 border ${s.cls}`}
    >
      {s.label}
    </span>
  )
}

function ArtBadge({ dispositivo }: { dispositivo: string }) {
  return (
    <span className="text-[8px] font-mono font-bold uppercase rounded px-1 py-0.5 border bg-sky-500/15 text-sky-300 border-sky-500/40">
      {dispositivo}
    </span>
  )
}

const BLOCO_TITULOS: Record<number, string> = {
  1: '① FORMAÇÃO DO PREÇO DO FORNECEDOR',
  2: '② CUSTO DA AQUISIÇÃO PARA O COMPRADOR',
}

function SideColumnArt({
  title,
  side,
  onOpenLine,
  onOpenBloco,
}: {
  title: string
  side: SideResultArt
  /** Quando fornecido, cada linha (com passos de derivação) ganha botão "Abrir". */
  onOpenLine?: (line: MemoryLineArt) => void
  /** Abre a memória completa do bloco (todas as linhas com derivação + base legal). */
  onOpenBloco?: (side: SideResultArt, bloco: number) => void
}) {
  const blocos = [...new Set(side.lines.map((l) => l.bloco))].sort((a, b) => a - b)
  return (
    <div className="flex-1 min-w-[320px] space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-300">
          {title}
        </span>
        <span className="flex-1 h-px bg-slate-700/60" />
      </div>
      {blocos.map((bloco) => {
        const forn = bloco === 1
        return (
          <div
            key={bloco}
            className={`rounded-xl border p-3 space-y-1.5 ${forn ? 'border-emerald-500/40 bg-emerald-500/[0.05]' : 'border-orange-500/45 bg-orange-500/[0.06]'}`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-mono font-black uppercase tracking-wider ${forn ? 'text-emerald-300' : 'text-orange-300'}`}
              >
                {BLOCO_TITULOS[bloco] || `BLOCO ${bloco}`}
              </span>
              <span className={`flex-1 h-px ${forn ? 'bg-emerald-500/25' : 'bg-orange-500/25'}`} />
              <Badge className="text-[9px] bg-slate-800 text-slate-300 border-slate-700 font-mono">
                {side.lines.filter((l) => l.bloco === bloco).length} linhas
              </Badge>
            </div>
            {side.lines
              .filter((l) => l.bloco === bloco)
              .map((line) =>
                line.label === 'MEMORIA_BLOCO1' ? (
                  onOpenLine ? (
                    <button
                      key={line.key}
                      type="button"
                      onClick={() => onOpenBloco(side, bloco)}
                      className={`w-full inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-mono font-bold cursor-pointer ${forn ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'}`}
                    >
                      <Calculator className="w-3 h-3" /> Memória + base legal
                    </button>
                  ) : null
                ) : (
                  <div
                    key={line.key}
                    className={`rounded-lg px-2.5 py-1.5 space-y-1 ${line.subtotal ? (forn ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-orange-500/10 border border-orange-500/40') : 'bg-slate-950/50 border border-slate-800/60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`text-[11px] font-mono font-semibold block ${
                            line.kind === 'bruto'
                              ? 'text-slate-200'
                              : line.kind === 'debito'
                                ? 'text-amber-300'
                                : line.kind === 'nota'
                                  ? 'text-sky-300'
                                  : 'text-emerald-300'
                          }`}
                        >
                          {line.label}
                        </span>
                        {line.formula && (
                          <span className="text-[10px] font-mono text-slate-400 leading-tight block break-words">
                            {line.formula}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold shrink-0 ${
                          line.kind === 'nota'
                            ? [
                                'baselimpa',
                                'preconota',
                                'comprasliquidas',
                                'custounitario',
                              ].includes(line.key)
                              ? 'text-emerald-300'
                              : 'text-sky-300'
                            : line.value > 0
                              ? line.kind === 'debito'
                                ? 'text-amber-300'
                                : 'text-slate-100'
                              : line.value < 0
                                ? 'text-emerald-300'
                                : 'text-slate-500'
                        }`}
                      >
                        {line.kind === 'nota'
                          ? ['baselimpa', 'preconota', 'comprasliquidas', 'custounitario'].includes(
                              line.key,
                            )
                            ? formatBRL(line.value)
                            : '—'
                          : formatBRL(line.value)}
                      </span>
                    </div>
                  </div>
                ),
              )}
            {side.lines.some((l) => l.bloco === bloco && l.subtotal) && (
              <div className="flex items-center gap-1.5 pb-0.5">
                <span
                  className={`text-[9px] font-mono font-bold ${forn ? 'text-emerald-400/90' : 'text-orange-400/90'}`}
                >
                  {bloco === 1
                    ? '▸ Subtotal: preço da nota do fornecedor'
                    : '▸ Subtotal: custo unitário'}
                </span>
                <span
                  className={`flex-1 h-px ${forn ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`}
                />
              </div>
            )}
            {bloco === 1 && (
              <div className="text-[8px] font-mono text-slate-600 pt-0.5">
                Base legal: LC 214/2025, art. 12 — detalhe por linha dentro da memória.
              </div>
            )}
          </div>
        )
      })}
      <div className="pt-1 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Bruto (valor da operação)</span>
          <span className="text-slate-200">{formatBRL(side.bruto)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>(−) Créditos</span>
          <span className="text-emerald-300">−{formatBRL(side.creditos)}</span>
        </div>
        {side.debitos > 0 && (
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>(+) CBS/IBS sem crédito</span>
            <span className="text-amber-300">+{formatBRL(side.debitos)}</span>
          </div>
        )}
        {side.baseLimpa !== null && (
          <div className="flex items-center justify-between text-[11px] font-mono text-sky-300/90">
            <span>Base limpa (§2º I, II, V)</span>
            <span>{formatBRL(side.baseLimpa)}</span>
          </div>
        )}
        <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10 border border-orange-500/40">
          <span className="text-[11px] font-mono font-bold uppercase text-orange-400">
            Custo líquido
          </span>
          <div className="text-right">
            <span className="text-sm font-black text-orange-300 font-mono block">
              {formatBRL(side.liquido)}
            </span>
            <span className="text-[10px] font-mono text-orange-200/80">
              {formatBRL(side.unitario)}/un
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CellMemoryDialogArt({
  cell,
  cellLabel,
  row,
  open,
  onOpenChange,
}: {
  cell: CellResultArt
  cellLabel: string
  row: ScheduleRowArt
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [lineMemory, setLineMemory] = useState<{ line: MemoryLineArt; label: string } | null>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>Memória Art. 12 — {cellLabel}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Exercício {row.exercicio} · CBS {formatNumberBR(row.cbsRate)}% · IBS{' '}
            {formatNumberBR(row.ibsRate)}% · ICMS {formatNumberBR(row.icmsPct)}% da alíquota · Base
            limpa = Bruto − ICMS − IPI − PIS/COFINS (art. 12, caput + §2º, I, II e V) · CBS/IBS por
            fora · Igualdade ao centavo entre matriz e memória.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col lg:flex-row gap-3">
          <SideColumnArt
            title="HOJE"
            side={cell.hoje}
            onOpenLine={(line) => setLineMemory({ line, label: `${line.label} — HOJE` })}
          />
          <SideColumnArt
            title={`EXERCÍCIO ${row.exercicio}`}
            side={cell.exercicio}
            onOpenLine={(line) =>
              setLineMemory({ line, label: `${line.label} — ${row.exercicio}` })
            }
          />
        </div>
        <div className="text-[10px] font-mono text-slate-500 border-t border-slate-800 pt-2">
          Nota legal (cabeçalho do módulo): LC 214/2025, art. 12, caput (valor da operação), §1º, IV
          (frete na base) e §2º, I, II e V (IBS/CBS, IPI, ICMS/ISS e PIS/COFINS fora da base —
          vigência expressa do §2º, V: 01/01/2026 a 31/12/2032).
        </div>
        {lineMemory && (
          <LineMemoryDialog
            line={lineMemory.line}
            lineLabel={lineMemory.label}
            open={!!lineMemory}
            onOpenChange={(o) => !o && setLineMemory(null)}
            contexto={`Exercício ${row.exercicio} · memória expandida da célula`}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export function CmvArt12Module() {
  const [exercicio, setExercicio] = useState<ExercicioKey>(2027)
  const [config, setConfig] = useState<CellConfigArt>(CONFIG_PADRAO_ART12)
  const [memoryCell, setMemoryCell] = useState<{
    label: string
    cell: CellResultArt
    row: ScheduleRowArt
  } | null>(null)
  const [lineMemory, setLineMemory] = useState<{ line: MemoryLineArt; label: string } | null>(null)
  const [blocoMemory, setBlocoMemory] = useState<{
    side: SideResultArt
    bloco: number
    label: string
  } | null>(null)
  const [matrizModal, setMatrizModal] = useState<{ open: boolean }>({ open: false })
  const [espelhoModal, setEspelhoModal] = useState<{ open: boolean; mode: RepasseMode } | null>(
    null,
  )
  const [notasModal, setNotasModal] = useState(false)

  const row = useMemo(() => CRONOGRAMA_ART12.find((r) => r.exercicio === exercicio)!, [exercicio])

  const input = useMemo(() => CASO_CANONICO_ART12, [])

  const activeCell = useMemo(() => computeCellArt12(input, config, row), [input, config, row])
  const reguas = useMemo(() => reguasArt12(input, config, row), [input, config, row])
  const matriz = useMemo(() => matrizArt12(input, config, row), [input, config, row])
  const escada = useMemo(() => escadaArt12(input, config), [input, config])

  const semaforoStyle = SEMAFORO_STYLE[activeCell.semaforo]

  const menorCusto = useMemo(() => {
    const all = matriz.flatMap((l) => l.cells.map((c) => c.cell.exercicio.unitario))
    return Math.min(...all)
  }, [matriz])

  return (
    <div className="space-y-4">
      {/* ================= Cabeçalho + seletor de exercício ================= */}
      <div className="rounded-xl border border-emerald-500/25 bg-slate-900/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                CMV por Exercício — conforme o Art. 12 (LC 214/2025)
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Base limpa: Bruto − ICMS − IPI − PIS/COFINS (caput + §2º, I, II e V) · Frete na base
                (§1º, IV) · CBS/IBS por fora · Crédito = débito destacado (art. 47, §2º)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfig(CONFIG_PADRAO_ART12)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restaurar
            </Button>
          </div>
        </div>
        {/* Nota legal do cabeçalho */}
        <div className="text-[10px] font-mono text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 leading-relaxed">
          <ShieldAlert className="w-3.5 h-3.5 text-sky-400 inline mr-1 -mt-0.5" />
          Fundamento: LC 214/2025, art. 12, caput — base = valor da operação; §1º, IV — frete
          integra a base; §2º, I — IBS/CBS fora; §2º, II — IPI fora (todos os exercícios); §2º, V —
          ICMS/ISS/PIS/COFINS fora, vigência expressa 01/01/2026 a 31/12/2032. Frações do ICMS:
          ADCT, art. 128, I–IV. IPI zerado 2027+: CF, art. 153, §3º + LC 214/2025, art. 454 (ZFM:
          ADCT, art. 92-B). Crédito do adquirente: art. 47, §2º. Desconto incondicional (consta do
          documento e não depende de evento posterior): fora da base — art. 12, §2º, III. Devolução
          e cancelamento: base da operação original — art. 12, §7º. PIS/COFINS embutidos sobre base
          sem ICMS: tese do século (STJ RE 1.188.403; STF Tema 1098). PENDENTE DE DEFINIÇÃO: se
          CBS/IBS integram a base do ICMS na transição — simule as duas teses no seletor acima.
        </div>
        {/* Seletor de exercícios */}
        <div className="flex flex-wrap gap-1.5">
          {EXERCICIOS.map((ex) => {
            const r = CRONOGRAMA_ART12.find((s) => s.exercicio === ex)!
            return (
              <button
                key={ex}
                type="button"
                onClick={() => setExercicio(ex)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                  exercicio === ex
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                } ${!r.habilitado ? 'opacity-60' : ''}`}
              >
                {ex}
                {!r.habilitado && <span className="ml-1 text-[9px]">pendente</span>}
              </button>
            )
          })}
        </div>
        {/* Seletor de tese — base do ICMS na transição (pendente de definição na lei) */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.06] p-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="text-[10px] font-mono font-bold uppercase text-amber-300">
            Base do ICMS na transição (2026–2032) — pendente de definição:
          </span>
          <div className="flex gap-1">
            {(
              [
                { id: 'fisco', label: 'Tese do Fisco', desc: 'CBS/IBS integram a base do ICMS' },
                {
                  id: 'contribuinte',
                  label: 'Tese do Contribuinte',
                  desc: 'CBS/IBS por fora (PLP 16/25)',
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.desc}
                onClick={() => setConfig((c) => ({ ...c, baseIcmsTransicao: t.id }))}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border transition-colors ${
                  config.baseIcmsTransicao === t.id
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-[9px] font-mono text-slate-400">
            {config.baseIcmsTransicao === 'fisco'
              ? 'ICMS por dentro sobre operação + CBS + IBS — nota maior, crédito maior. Cadeia plena fecha igual; muda o custo do comprador SN.'
              : 'ICMS sobre a operação sem CBS/IBS (PLP 16/25) — nota menor. Cadeia plena fecha igual; muda o custo do comprador SN.'}
          </span>
        </div>
        {row.pendente && (
          <div className="flex items-start gap-2 text-[11px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/40 rounded-lg p-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{row.pendente}</span>
          </div>
        )}
      </div>

      {/* ================= Configuração da célula ================= */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 space-y-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
          Célula: fornecedor × comprador × repasse
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-slate-500 uppercase">Fornecedor</label>
            <div className="flex gap-1">
              {(['presumido', 'real', 'simples', 'simples_hibrido'] as RegimeId[]).map((rg) => (
                <button
                  key={rg}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, fornecedorRegime: rg }))}
                  className={`flex-1 px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                    config.fornecedorRegime === rg
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {REGIME_LABEL[rg]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-slate-500 uppercase">
              Perfil fornecedor
            </label>
            <div className="flex gap-1">
              {(['comercio', 'industria'] as const).map((pf) => (
                <button
                  key={pf}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, fornecedorPerfil: pf }))}
                  className={`flex-1 px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                    config.fornecedorPerfil === pf
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {pf === 'comercio' ? 'Comércio' : 'Indústria'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-slate-500 uppercase">Comprador</label>
            <div className="flex gap-1">
              {(['presumido', 'real', 'simples', 'simples_hibrido'] as RegimeId[]).map((rg) => (
                <button
                  key={rg}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, compradorRegime: rg }))}
                  className={`flex-1 px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                    config.compradorRegime === rg
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {REGIME_LABEL[rg]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-slate-500 uppercase">
              Perfil comprador
            </label>
            <div className="flex gap-1">
              {(['comercio', 'industria'] as const).map((pf) => (
                <button
                  key={pf}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, compradorPerfil: pf }))}
                  className={`flex-1 px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                    config.compradorPerfil === pf
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {pf === 'comercio' ? 'Comércio' : 'Indústria'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Réguas de repasse */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {reguas.map(({ mode, cell }) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setConfig((c) => ({ ...c, repasse: mode }))
                setEspelhoModal({ open: true, mode })
              }}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                config.repasse === mode
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-950/50 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-300">
                  {mode === 'integral'
                    ? 'Repasse integral'
                    : mode === 'parcial'
                      ? `Parcial ${formatNumberBR(config.repassePct)}%`
                      : 'Sem repasse'}
                </span>
                <span
                  className={`text-xs font-mono font-black ${
                    cell.deltaPct <= -0.5
                      ? 'text-emerald-400'
                      : cell.deltaPct < 0.5
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {cell.deltaPct > 0 ? '+' : ''}
                  {formatNumberBR(cell.deltaPct)}%
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                {formatBRL(cell.exercicio.unitario)}/un ·{' '}
                {cell.deltaPct < -0.5
                  ? 'fornecedor absorve (margem)'
                  : cell.deltaPct > 0.5
                    ? 'comprador absorve (custo)'
                    : 'neutro p/ comprador'}
              </div>
            </button>
          ))}
        </div>
        {config.repasse === 'parcial' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">Fração repassada:</span>
            <Input
              type="number"
              value={config.repassePct}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  repassePct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                }))
              }
              className="w-24 h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
            />
            <span className="text-[10px] font-mono text-slate-500">%</span>
          </div>
        )}
        {/* ZFM */}
        <label className="flex items-center gap-2 text-[10px] font-mono text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={config.zfm}
            onChange={(e) => setConfig((c) => ({ ...c, zfm: e.target.checked }))}
            className="accent-emerald-500"
          />
          Fornecedor industrial na Zona Franca de Manaus (mantém IPI — ADCT, art. 92-B)
        </label>
      </div>

      {/* ================= Memória HOJE × Exercício ================= */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Memória de cálculo — HOJE × Exercício {exercicio}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setMemoryCell({ label: `Exercício ${exercicio}`, cell: activeCell, row })
              }
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 mr-1" /> Ampliar memória
            </Button>
            <BotaoNotasExplicativas onClick={() => setNotasModal(true)} />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-3">
          <SideColumnArt
            title="HOJE"
            side={activeCell.hoje}
            onOpenLine={(line) => setLineMemory({ line, label: `${line.label} — HOJE` })}
            onOpenBloco={(side, bloco) =>
              setBlocoMemory({
                side,
                bloco,
                label: `${BLOCO_TITULOS[bloco] || `BLOCO ${bloco}`} — HOJE`,
              })
            }
          />
          <SideColumnArt
            title={`EXERCÍCIO ${exercicio}`}
            side={activeCell.exercicio}
            onOpenLine={(line) => setLineMemory({ line, label: `${line.label} — ${exercicio}` })}
            onOpenBloco={(side, bloco) =>
              setBlocoMemory({
                side,
                bloco,
                label: `${BLOCO_TITULOS[bloco] || `BLOCO ${bloco}`} — Exercício ${exercicio}`,
              })
            }
          />
        </div>
        {/* Delta + semáforo + porquê */}
        <div className={`flex items-start gap-3 rounded-xl border p-3 ${semaforoStyle.bg}`}>
          {semaforoStyle.icon}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black font-mono text-white">
                Δ {activeCell.deltaPct > 0 ? '+' : ''}
                {formatNumberBR(activeCell.deltaPct)}%
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                ({formatBRL(activeCell.hoje.unitario)} → {formatBRL(activeCell.exercicio.unitario)}
                /un)
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{activeCell.porque}</p>
          </div>
        </div>
      </div>

      {/* ================= Escada (régua Nenhum) ================= */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 space-y-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
          Escada do custo — fornecedor NÃO repassa (quem absorve: o comprador)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {escada.map((s) => (
            <div
              key={s.exercicio}
              className="rounded-lg border border-slate-700/60 bg-slate-950/50 p-2"
            >
              <div className="text-[10px] font-mono font-bold text-slate-300">{s.exercicio}</div>
              <div className="text-xs font-mono font-black text-white">{formatBRL(s.unitario)}</div>
              <div
                className={`text-[10px] font-mono ${s.deltaPct > 0 ? 'text-rose-400' : s.deltaPct < 0 ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                {s.deltaPct > 0 ? '+' : ''}
                {formatNumberBR(s.deltaPct)}%
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-slate-500">
          Leitura fiscal: com repasse integral a cadeia plena é neutra (crédito lava o destaque);
          sem repasse, o adquirente absorve a CBS/IBS sobre a base limpa e o custo sobe a cada
          exercício — o impacto é do comprador, não do fornecedor.
        </p>
      </div>

      {/* ================= Matriz — RESUMO na tela + TABELA COMPLETA na camada interna ================= */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Cruzamento de regimes · Exercício {exercicio}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMatrizModal({ open: true })}
            className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 mr-1" /> Ver tabela completa (4×4)
          </Button>
        </div>
        <p className="text-[10px] font-mono text-slate-500">
          Os 16 cruzamentos comprador × fornecedor, com custo unitário e Δ — na camada interna.
          Fornecedor SN: nota congelada (LC 123/2006). Fornecedor SN híbrido: IBS/CBS por fora (art.
          41) — premissa IT: base sem ICMS.
        </p>
      </div>

      {/* ================= Modal de memória por célula ================= */}
      {memoryCell && (
        <CellMemoryDialogArt
          cell={memoryCell.cell}
          cellLabel={memoryCell.label}
          row={memoryCell.row}
          open={!!memoryCell}
          onOpenChange={(o) => !o && setMemoryCell(null)}
        />
      )}
      {lineMemory && (
        <LineMemoryDialog
          line={lineMemory.line}
          lineLabel={lineMemory.label}
          open={!!lineMemory}
          onOpenChange={(o) => !o && setLineMemory(null)}
          contexto={`Exercício ${exercicio} · ${REGIME_LABEL_FULL[config.fornecedorRegime]} (fornecedor) × ${REGIME_LABEL_FULL[config.compradorRegime]} (comprador) · repasse ${config.repasse === 'integral' ? 'integral' : config.repasse === 'parcial' ? `parcial ${formatNumberBR(config.repassePct)}%` : 'nenhum'} · tese: ${config.baseIcmsTransicao === 'fisco' ? 'do Fisco' : 'do Contribuinte'}`}
        />
      )}
      {blocoMemory && (
        <BlocoMemoryDialog
          side={blocoMemory.side}
          bloco={blocoMemory.bloco}
          blocoLabel={blocoMemory.label}
          open={!!blocoMemory}
          onOpenChange={(o) => !o && setBlocoMemory(null)}
          contexto={`Exercício ${exercicio} · ${REGIME_LABEL_FULL[config.fornecedorRegime]} (fornecedor) × ${REGIME_LABEL_FULL[config.compradorRegime]} (comprador) · derivação de 6 casas por linha · base legal por linha`}
        />
      )}
      <MatrizResumoDialog
        matriz={matriz}
        menorCusto={menorCusto}
        exercicio={exercicio}
        open={matrizModal.open}
        onOpenChange={(o) => setMatrizModal({ open: o })}
        onAbrirCelula={(comprador, fornecedor, cell) => {
          setMatrizModal({ open: false })
          setMemoryCell({
            label: `${REGIME_LABEL[comprador]} × ${REGIME_LABEL[fornecedor]} — ${exercicio}`,
            cell,
            row,
          })
        }}
      />
      {espelhoModal && (
        <EspelhoRepasseDialog
          input={input}
          baseConfig={config}
          row={row}
          exercicio={exercicio}
          mode={espelhoModal.mode}
          open={espelhoModal.open}
          onOpenChange={(o) => !o && setEspelhoModal(null)}
          onAbrirCelula={(comprador, fornecedor, cell) => {
            setEspelhoModal(null)
            setMemoryCell({
              label: `${REGIME_LABEL[comprador]} × ${REGIME_LABEL[fornecedor]} — ${exercicio}`,
              cell,
              row,
            })
          }}
        />
      )}
      <NotasExplicativasDialog
        matriz={matriz}
        row={row}
        exercicio={exercicio}
        repasse={config.repasse}
        repassePct={config.repassePct}
        open={notasModal}
        onOpenChange={setNotasModal}
      />
    </div>
  )
}

export default CmvArt12Module
