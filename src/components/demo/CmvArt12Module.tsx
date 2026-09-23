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
import { useTaxContext } from '@/contexts/TaxContext'
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

const EXERCICIOS: ExercicioKey[] = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

const REGIME_LABEL: Record<RegimeId, string> = {
  presumido: 'LP',
  real: 'LR',
  simples: 'SN',
}

const REGIME_LABEL_FULL: Record<RegimeId, string> = {
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  simples: 'Simples Nacional',
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
  accent,
  onOpenLine,
}: {
  title: string
  side: SideResultArt
  accent: string
  /** Quando fornecido, cada linha (com passos de derivação) ganha botão "Abrir". */
  onOpenLine?: (line: MemoryLineArt) => void
}) {
  const blocos = [...new Set(side.lines.map((l) => l.bloco))].sort((a, b) => a - b)
  return (
    <div className={`flex-1 min-w-[320px] rounded-xl border p-3 space-y-1.5 ${accent}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold uppercase tracking-wider">{title}</span>
        <Badge className="text-[9px] bg-slate-800 text-slate-300 border-slate-700 font-mono">
          {side.lines.length} linhas
        </Badge>
      </div>
      {blocos.map((bloco) => (
        <div key={bloco} className="space-y-1">
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-300">
              {BLOCO_TITULOS[bloco] || `BLOCO ${bloco}`}
            </span>
            <span className="flex-1 h-px bg-emerald-500/25" />
          </div>
          {side.lines
            .filter((l) => l.bloco === bloco)
            .map((line) => (
              <div
                key={line.key}
                className={`rounded-lg px-2.5 py-1.5 space-y-1 ${line.subtotal ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-950/50 border border-slate-800/60'}`}
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
                    <span className="text-[10px] font-mono text-slate-500 leading-tight block break-words">
                      {line.formula}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-bold shrink-0 ${
                      line.kind === 'nota'
                        ? ['baselimpa', 'preconota', 'comprasliquidas', 'custounitario'].includes(
                            line.key,
                          )
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
                {onOpenLine ? (
                  <button
                    type="button"
                    onClick={() => onOpenLine(line)}
                    className="w-full mt-0.5 inline-flex items-center justify-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono font-bold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3" /> Memória + base legal
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <ArtBadge dispositivo={line.fundamento?.dispositivo || '—'} />
                    <ValidadeBadge fundamento={line.fundamento} />
                  </div>
                )}
              </div>
            ))}
          {side.lines.some((l) => l.bloco === bloco && l.subtotal) && (
            <div className="flex items-center gap-1.5 pb-0.5">
              <span className="text-[9px] font-mono font-bold text-emerald-400/90">
                {bloco === 1
                  ? '▸ Subtotal: preço da nota do fornecedor'
                  : '▸ Subtotal: custo unitário'}
              </span>
              <span className="flex-1 h-px bg-emerald-500/20" />
            </div>
          )}
          {bloco === 1 && (
            <div className="text-[8px] font-mono text-slate-600 pt-0.5">
              Base legal: LC 214/2025, art. 12 — detalhe por linha dentro da memória.
            </div>
          )}
        </div>
      ))}
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
        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/35">
          <span className="text-[11px] font-mono font-bold uppercase text-emerald-400">
            Custo líquido
          </span>
          <div className="text-right">
            <span className="text-sm font-black text-emerald-400 font-mono block">
              {formatBRL(side.liquido)}
            </span>
            <span className="text-[10px] font-mono text-emerald-300/80">
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
            accent="border-slate-700/70 bg-slate-900/40"
            onOpenLine={(line) => setLineMemory({ line, label: `${line.label} — HOJE` })}
          />
          <SideColumnArt
            title={`EXERCÍCIO ${row.exercicio}`}
            side={cell.exercicio}
            accent="border-emerald-500/30 bg-emerald-500/[0.04]"
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
  const { purchasesItems } = useTaxContext()
  const [exercicio, setExercicio] = useState<ExercicioKey>(2027)
  const [config, setConfig] = useState<CellConfigArt>(CONFIG_PADRAO_ART12)
  const [usarCompras, setUsarCompras] = useState(false)
  const [memoryCell, setMemoryCell] = useState<{
    label: string
    cell: CellResultArt
    row: ScheduleRowArt
  } | null>(null)
  const [lineMemory, setLineMemory] = useState<{ line: MemoryLineArt; label: string } | null>(null)

  const row = useMemo(() => CRONOGRAMA_ART12.find((r) => r.exercicio === exercicio)!, [exercicio])

  const input = useMemo(() => {
    if (usarCompras && purchasesItems.length > 0) {
      const quantity = purchasesItems.reduce((acc, it) => acc + (it.quantity || 0), 0)
      const merchandise = purchasesItems.reduce((acc, it) => acc + (it.merchandiseValue || 0), 0)
      const freight = purchasesItems.reduce((acc, it) => acc + (it.freightValue || 0), 0)
      const unitPrice = quantity > 0 ? r2(merchandise / quantity) : 0
      const icmsTotal = purchasesItems.reduce((acc, it) => acc + (it.calculatedIcms || 0), 0)
      const icmsRate = merchandise > 0 ? r2((icmsTotal / merchandise) * 100) : 18
      const icmsFreightTotal = purchasesItems.reduce(
        (acc, it) => acc + (it.calculatedIcmsFreight || 0),
        0,
      )
      const icmsFreightRate = freight > 0 ? r2((icmsFreightTotal / freight) * 100) : 18
      const ipiRate = r2(purchasesItems[0]?.ipiRate || 0)
      return { quantity, unitPrice, freightValue: freight, icmsRate, icmsFreightRate, ipiRate }
    }
    return CASO_CANONICO_ART12
  }, [usarCompras, purchasesItems])

  const usandoExemplo = !usarCompras || purchasesItems.length === 0

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

      {/* ================= Parâmetros do caso canônico ================= */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Parâmetros da aquisição
          </span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={usarCompras}
                onChange={(e) => setUsarCompras(e.target.checked)}
                className="accent-emerald-500"
              />
              Usar itens da Calculadora de Compras (somente leitura)
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { key: 'quantity', label: 'Qtd (un.)', value: input.quantity },
            { key: 'unitPrice', label: 'Preço unit.', value: input.unitPrice },
            { key: 'freightValue', label: 'Frete', value: input.freightValue },
            { key: 'icmsRate', label: 'ICMS %', value: input.icmsRate },
            { key: 'icmsFreightRate', label: 'ICMS frete %', value: input.icmsFreightRate },
            { key: 'ipiRate', label: 'IPI % (indústria)', value: input.ipiRate },
          ].map((p) => (
            <div key={p.key} className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase">{p.label}</label>
              <Input
                type="number"
                value={p.value}
                onChange={(e) => setConfig((c) => c) /* inputs somente leitura no caso canônico */}
                readOnly
                className="bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200 h-8"
              />
            </div>
          ))}
        </div>
        {usandoExemplo && (
          <p className="text-[10px] font-mono text-slate-500">
            Caso canônico: 30 un. × R$ 1.400,00 + frete R$ 400,00 · ICMS 18% · IPI 10% (só
            indústria) · custo HOJE canônico R$ 1.158,93/un.
          </p>
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
              {(['presumido', 'real', 'simples'] as RegimeId[]).map((rg) => (
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
              {(['presumido', 'real', 'simples'] as RegimeId[]).map((rg) => (
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
              onClick={() => setConfig((c) => ({ ...c, repasse: mode }))}
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
        </div>
        <div className="flex flex-col lg:flex-row gap-3">
          <SideColumnArt
            title="HOJE"
            side={activeCell.hoje}
            accent="border-slate-700/70 bg-slate-900/40"
            onOpenLine={(line) => setLineMemory({ line, label: `${line.label} — HOJE` })}
          />
          <SideColumnArt
            title={`EXERCÍCIO ${exercicio}`}
            side={activeCell.exercicio}
            accent="border-emerald-500/30 bg-emerald-500/[0.04]"
            onOpenLine={(line) => setLineMemory({ line, label: `${line.label} — ${exercicio}` })}
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

      {/* ================= Matriz 3×3 ================= */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 space-y-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
          Matriz 3×3 — comprador (linhas) × fornecedor (colunas) · Exercício {exercicio}
        </span>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left py-1 pr-2">Comprador ↓ / Fornecedor →</th>
                {(['presumido', 'real', 'simples'] as RegimeId[]).map((f) => (
                  <th key={f} className="text-left py-1 px-2">
                    {REGIME_LABEL_FULL[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.map((linha) => (
                <tr key={linha.comprador}>
                  <td className="py-1 pr-2 font-bold text-slate-300">
                    {REGIME_LABEL_FULL[linha.comprador]}
                  </td>
                  {linha.cells.map(({ fornecedor, cell }) => {
                    const st = SEMAFORO_STYLE[cell.semaforo]
                    const isMenor = cell.exercicio.unitario === menorCusto
                    return (
                      <td key={fornecedor} className="p-1">
                        <button
                          type="button"
                          onClick={() =>
                            setMemoryCell({
                              label: `${REGIME_LABEL[linha.comprador]} × ${REGIME_LABEL[fornecedor]} — ${exercicio}`,
                              cell,
                              row,
                            })
                          }
                          className={`w-full text-left rounded-lg border p-2 cursor-pointer hover:brightness-125 ${st.bg} ${isMenor ? 'ring-2 ring-emerald-400/70' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-black text-white text-[11px]">
                              {formatBRL(cell.exercicio.unitario)}/un
                            </span>
                            {isMenor && (
                              <span className="text-[8px] font-mono font-bold text-emerald-300 border border-emerald-500/50 rounded px-1">
                                MENOR CUSTO
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
                          {linha.comprador === 'simples' && (
                            <div className="text-[8px] font-mono text-amber-300 mt-0.5">
                              SN não credita CBS/IBS — destaque vira custo
                            </div>
                          )}
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
          Célula em destaque = menor custo da matriz. Fornecedor SN: bruto congelado, sem destaque
          de ICMS/CBS/IBS (LC 123/2006) — nota visível em cada memória.
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
    </div>
  )
}

export default CmvArt12Module
