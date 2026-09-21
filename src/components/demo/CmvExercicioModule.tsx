import React, { useMemo, useState } from 'react'
import {
  CalendarClock,
  RotateCcw,
  Calculator,
  ShoppingCart,
  Scale,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Building2,
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
import { formatBRL, formatNumberBR, formatPercentBR } from '@/lib/taxCalculations'
import {
  CASO_CANONICO,
  CONFIG_PADRAO,
  CRONOGRAMA_OFICIAL,
  computeCell,
  loadSchedule,
  resetSchedule,
  saveSchedule,
  r2,
} from '@/lib/cmvExercicioCalculations'
import type {
  CellConfig,
  CellResult,
  CmvExercicioInput,
  ExercicioKey,
  MemoryLine,
  PerfilId,
  RegimeId,
  RepasseMode,
  ScheduleRow,
  SideResult,
  Semaforo,
} from '@/lib/cmvExercicioCalculations'
import type { PurchaseItem } from '@/contexts/TaxContext'

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

const PERFIL_LABEL: Record<PerfilId, string> = {
  comercio: 'Comércio',
  industria: 'Indústria',
}

const SEMAFORO_STYLE: Record<Semaforo, { bg: string; icon: React.ReactNode }> = {
  verde: {
    bg: 'bg-emerald-500/10 border-emerald-500/40',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  },
  ambar: {
    bg: 'bg-amber-500/10 border-amber-500/40',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  },
  vermelho: {
    bg: 'bg-rose-500/10 border-rose-500/40',
    icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
  },
}

function fmtFactorLine(line: MemoryLine): string {
  if (line.kind === 'nota' || (line.value === 0 && line.formula.length > 60)) {
    return '—'
  }
  return formatBRL(line.value)
}

function SideColumn({ title, side, accent }: { title: string; side: SideResult; accent: string }) {
  return (
    <div className={`flex-1 min-w-[280px] rounded-xl border p-3 space-y-1.5 ${accent}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold uppercase tracking-wider">{title}</span>
        <Badge className="text-[9px] bg-slate-800 text-slate-300 border-slate-700 font-mono">
          {side.lines.length} linhas
        </Badge>
      </div>
      {side.lines.map((line) => (
        <div
          key={line.key}
          className="flex items-start justify-between gap-2 bg-slate-950/50 rounded-lg px-2.5 py-1.5 border border-slate-800/60"
        >
          <div className="min-w-0">
            <span
              className={`text-[11px] font-mono font-semibold block ${
                line.kind === 'bruto' ? 'text-slate-200' : 'text-sky-300'
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
              line.value > 0
                ? 'text-slate-100'
                : line.value < 0
                  ? 'text-emerald-300'
                  : 'text-slate-500'
            }`}
          >
            {fmtFactorLine(line)}
          </span>
        </div>
      ))}
      <div className="pt-1 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Bruto</span>
          <span className="text-slate-200">{formatBRL(side.bruto)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>(−) Créditos</span>
          <span className="text-emerald-300">−{formatBRL(side.creditos)}</span>
        </div>
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

function CellMemoryDialog({
  cell,
  cellLabel,
  row,
  open,
  onOpenChange,
}: {
  cell: CellResult
  cellLabel: string
  row: ScheduleRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>Memória de Cálculo — {cellLabel}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Exercício {row.exercicio} · CBS {formatNumberBR(row.cbsRate)}% · IBS{' '}
            {formatNumberBR(row.ibsRate)}% · ICMS {formatNumberBR(row.icmsPct)}% da alíquota ·
            Igualdade ao centavo entre matriz e memória (fonte única de cálculo).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col lg:flex-row gap-3">
          <SideColumn title="HOJE" side={cell.hoje} accent="border-slate-700/70 bg-slate-900/40" />
          <SideColumn
            title={`EXERCÍCIO ${row.exercicio}`}
            side={cell.exercicio}
            accent="border-emerald-500/30 bg-emerald-500/[0.04]"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CmvExercicioModule({ purchasesItems }: { purchasesItems: PurchaseItem[] }) {
  const [schedule, setSchedule] = useState<ScheduleRow[]>(() => loadSchedule())
  const [exercicio, setExercicio] = useState<ExercicioKey>(2027)
  const [config, setConfig] = useState<CellConfig>(CONFIG_PADRAO)
  const [usarCompras, setUsarCompras] = useState(false)
  const [memoryCell, setMemoryCell] = useState<{ label: string; cell: CellResult } | null>(null)

  const row = useMemo(
    () => schedule.find((s) => s.exercicio === exercicio) || schedule[1],
    [schedule, exercicio],
  )

  const input = useMemo<CmvExercicioInput>(() => {
    if (usarCompras && purchasesItems.length > 0) {
      // Agrega todos os itens reais da Calculadora de Compras (somente leitura)
      const quantity = purchasesItems.reduce((acc, it) => acc + (it.quantity || 0), 0)
      const merchandise = purchasesItems.reduce((acc, it) => acc + (it.merchandiseValue || 0), 0)
      const freight = purchasesItems.reduce((acc, it) => acc + (it.freightValue || 0), 0)
      const unitPrice = quantity > 0 ? r2(merchandise / quantity) : 0
      const icmsTotal = purchasesItems.reduce((acc, it) => acc + (it.calculatedIcms || 0), 0)
      const icmsRate = merchandise > 0 ? r2((icmsTotal / merchandise) * 100) : 18
      const icmsFreightTotal = purchasesItems.reduce(
        (acc, it) => acc + (it.icmsFreightValue || 0),
        0,
      )
      const icmsFreightRate = freight > 0 ? r2((icmsFreightTotal / freight) * 100) : 18
      const ipiRate = r2(purchasesItems[0]?.ipiRate || 0)
      return { quantity, unitPrice, freightValue: r2(freight), icmsRate, icmsFreightRate, ipiRate }
    }
    return { ...CASO_CANONICO }
  }, [usarCompras, purchasesItems])

  const usandoExemplo = !usarCompras || purchasesItems.length === 0

  const updateRow = (ex: ExercicioKey, field: keyof ScheduleRow, value: number) => {
    const next = schedule.map((s) => (s.exercicio === ex ? { ...s, [field]: value } : s))
    setSchedule(next)
    saveSchedule(next)
  }

  // Célula ativa (configuração única A2) + réguas de repasse (A3)
  const activeCell = useMemo(() => computeCell(input, config, row), [input, config, row])

  const repasseRuler = useMemo(() => {
    const modes: RepasseMode[] = ['integral', 'parcial', 'nenhum']
    return modes.map((mode) => {
      const cfg: CellConfig = { ...config, repasse: mode }
      return { mode, cell: computeCell(input, cfg, row) }
    })
  }, [input, config, row])

  // Matriz 3×3 (A5): linhas = comprador, colunas = fornecedor (perfil comércio × comércio)
  const matriz = useMemo(() => {
    const regimes: RegimeId[] = ['presumido', 'real', 'simples']
    const fornecedores: RegimeId[] = ['presumido', 'real', 'simples']
    return regimes.map((comprador) => ({
      comprador,
      cells: fornecedores.map((fornecedor) => {
        const cfg: CellConfig = {
          ...config,
          compradorRegime: comprador,
          fornecedorRegime: fornecedor,
        }
        return { fornecedor, cell: computeCell(input, cfg, row) }
      }),
    }))
  }, [input, config, row])

  const semaforoStyle = SEMAFORO_STYLE[activeCell.semaforo]

  return (
    <div className="space-y-4">
      {/* ================= Seletor de exercício + ações ================= */}
      <div className="rounded-xl border border-emerald-500/25 bg-slate-900/40 p-3 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-300 block">
                CMV por Exercício (2026–2033)
              </span>
              <span className="text-[11px] text-slate-400">
                Uma fonte de cálculo · o exercício é seletor, nunca página própria
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUsarCompras((v) => !v)}
              className={`h-8 text-[11px] font-mono cursor-pointer ${
                !usandoExemplo
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500/40'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
              {usandoExemplo
                ? `Usar itens da Calculadora de Compras (${purchasesItems.length} disp.)`
                : 'Usando itens reais das Compras'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSchedule(resetSchedule())}
              className="h-8 text-[11px] font-mono bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-500/40 hover:text-rose-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Restaurar cronograma oficial
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {EXERCICIOS.map((ex) => {
            const r = schedule.find((s) => s.exercicio === ex)
            const enabled = r?.habilitado
            const active = exercicio === ex
            return (
              <button
                key={ex}
                type="button"
                onClick={() => enabled && setExercicio(ex)}
                disabled={!enabled}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
                  active
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                    : enabled
                      ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-emerald-500/40 cursor-pointer'
                      : 'bg-slate-950/60 border-slate-800/60 text-slate-600 cursor-not-allowed'
                }`}
                title={enabled ? `Exercício ${ex}` : `Exercício ${ex} — em implantação`}
              >
                {ex}
                {!enabled && <span className="block text-[8px] uppercase">em implantação</span>}
              </button>
            )
          })}
        </div>

        {usandoExemplo && (
          <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            Exemplo didático: 30 un. × R$ 1.400,00 + frete R$ 400,00 · ICMS 18% · sem IPI (perfil
            Comércio). Clique em "Usar itens da Calculadora de Compras" para simular com dados
            reais.
          </p>
        )}
      </div>

      {/* ================= A1 · Cronograma completo editável ================= */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Cronograma da transição (EC 132/2023 + LC 214/2025) — alíquotas editáveis
          </span>
          <Badge className="text-[9px] bg-slate-900 text-slate-400 border-slate-700 font-mono">
            edições persistidas no mecanismo de cenários
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-1.5 px-2 text-slate-500 font-normal">Exercício</th>
                <th className="text-left py-1.5 px-2 text-slate-500 font-normal">CBS</th>
                <th className="text-left py-1.5 px-2 text-slate-500 font-normal">IBS</th>
                <th className="text-left py-1.5 px-2 text-slate-500 font-normal">ICMS</th>
                <th className="text-left py-1.5 px-2 text-slate-500 font-normal">
                  IPI (comércio←indústria)
                </th>
                <th className="text-left py-1.5 px-2 text-slate-500 font-normal">ZFM</th>
                <th className="text-left py-1.5 px-2 text-slate-500 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((s) => (
                <tr
                  key={s.exercicio}
                  className={`border-b border-slate-800/50 ${
                    s.exercicio === exercicio ? 'bg-emerald-500/[0.06]' : ''
                  }`}
                >
                  <td className="py-1.5 px-2 font-bold text-slate-200">{s.exercicio}</td>
                  <td className="py-1.5 px-2">
                    <Input
                      type="text"
                      value={formatNumberBR(s.cbsRate, 2)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(',', '.'))
                        if (Number.isFinite(v)) updateRow(s.exercicio, 'cbsRate', v)
                      }}
                      className="h-6 w-20 text-[11px] bg-slate-900/70 border-slate-800"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <Input
                      type="text"
                      value={formatNumberBR(s.ibsRate, 2)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(',', '.'))
                        if (Number.isFinite(v)) updateRow(s.exercicio, 'ibsRate', v)
                      }}
                      className="h-6 w-20 text-[11px] bg-slate-900/70 border-slate-800"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <Input
                      type="text"
                      value={`${formatNumberBR(s.icmsPct, 0)}%`}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace('%', '').replace(',', '.'))
                        if (Number.isFinite(v)) updateRow(s.exercicio, 'icmsPct', v)
                      }}
                      className="h-6 w-20 text-[11px] bg-slate-900/70 border-slate-800"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <Input
                      type="text"
                      value={formatNumberBR(s.ipiRate, 1)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(',', '.'))
                        if (Number.isFinite(v)) updateRow(s.exercicio, 'ipiRate', v)
                      }}
                      className="h-6 w-20 text-[11px] bg-slate-900/70 border-slate-800"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-slate-400">
                    {s.exercicio >= 2027 ? 'exceto ZFM mantém' : '—'}
                  </td>
                  <td className="py-1.5 px-2">
                    {s.habilitado ? (
                      <Badge className="text-[9px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-mono">
                        ativo
                      </Badge>
                    ) : (
                      <Badge className="text-[9px] bg-slate-900 text-slate-500 border-slate-800 font-mono">
                        em implantação
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
          ¹ Referência ≈8,9% com a redução de 0,1 p.p. obrigatória em 2027–2028 (composição: CBS
          plena de referência 8,8% + ajuste de 0,1 p.p. da LC 214/2025 — exibido na memória do
          exercício). ² IPI extinto a partir de 2027, exceto Zona Franca de Manús — seletor ZFM por
          célula mantém o IPI. ³ IBS da transição = % × 17,7% (editável na tabela).
        </p>
      </div>

      {/* ================= A2 · Configuração única + Memória HOJE × Exercício ================= */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Memória de Cálculo do Custo de Aquisição — HOJE × {exercicio}
          </span>
          <Badge className="text-[9px] bg-slate-900 text-slate-400 border-slate-700 font-mono">
            {usandoExemplo ? 'exemplo didático' : 'itens reais das Compras'}
          </Badge>
        </div>

        {/* Configuração: fornecedor × comprador + ZFM + repasse */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Fornecedor</span>
            <div className="flex gap-1">
              {(['presumido', 'real', 'simples'] as RegimeId[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, fornecedorRegime: r }))}
                  className={`flex-1 px-1.5 py-1 rounded border text-[10px] font-mono transition-all cursor-pointer ${
                    config.fornecedorRegime === r
                      ? 'bg-orange-500/20 border-orange-400 text-orange-200 font-bold'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-orange-500/40'
                  }`}
                >
                  {REGIME_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Perfil Forn.</span>
            <div className="flex gap-1">
              {(['comercio', 'industria'] as PerfilId[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, fornecedorPerfil: p }))}
                  className={`flex-1 px-1.5 py-1 rounded border text-[10px] font-mono transition-all cursor-pointer ${
                    config.fornecedorPerfil === p
                      ? 'bg-orange-500/20 border-orange-400 text-orange-200 font-bold'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-orange-500/40'
                  }`}
                >
                  {PERFIL_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Comprador</span>
            <div className="flex gap-1">
              {(['presumido', 'real', 'simples'] as RegimeId[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, compradorRegime: r }))}
                  className={`flex-1 px-1.5 py-1 rounded border text-[10px] font-mono transition-all cursor-pointer ${
                    config.compradorRegime === r
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-sky-500/40'
                  }`}
                >
                  {REGIME_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Perfil Compr.</span>
            <div className="flex gap-1">
              {(['comercio', 'industria'] as PerfilId[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, compradorPerfil: p }))}
                  className={`flex-1 px-1.5 py-1 rounded border text-[10px] font-mono transition-all cursor-pointer ${
                    config.compradorPerfil === p
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-sky-500/40'
                  }`}
                >
                  {PERFIL_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.zfm}
              onChange={(e) => setConfig((c) => ({ ...c, zfm: e.target.checked }))}
              className="accent-emerald-500"
            />
            ZFM: manter IPI
          </label>
          {config.fornecedorRegime !== 'simples' && (
            <>
              <div className="flex items-center gap-1">
                {(['integral', 'parcial', 'nenhum'] as RepasseMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, repasse: m }))}
                    className={`px-2 py-1 rounded border text-[10px] font-mono transition-all cursor-pointer ${
                      config.repasse === m
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                        : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-emerald-500/40'
                    }`}
                  >
                    {m === 'integral'
                      ? 'Repasse Integral'
                      : m === 'parcial'
                        ? `Parcial ${formatNumberBR(config.repassePct)}%`
                        : 'Nenhum'}
                  </button>
                ))}
              </div>
              {config.repasse === 'parcial' && (
                <Input
                  type="text"
                  value={formatNumberBR(config.repassePct)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value.replace(',', '.'))
                    if (Number.isFinite(v)) setConfig((c) => ({ ...c, repassePct: v }))
                  }}
                  className="h-6 w-16 text-[11px] bg-slate-900/70 border-slate-800"
                />
              )}
            </>
          )}
          {config.fornecedorRegime === 'simples' && (
            <span className="text-[10px] font-mono text-amber-300/80 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Fornecedor SN: regime próprio — nota não se altera
            </span>
          )}
        </div>

        {/* Lado a lado HOJE × EXERCÍCIO */}
        <div className="flex flex-col lg:flex-row gap-3">
          <SideColumn
            title="HOJE"
            side={activeCell.hoje}
            accent="border-slate-700/70 bg-slate-900/40"
          />
          <SideColumn
            title={`EXERCÍCIO ${exercicio}`}
            side={activeCell.exercicio}
            accent="border-emerald-500/30 bg-emerald-500/[0.04]"
          />
        </div>

        {/* Delta central + semáforo */}
        <div
          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${semaforoStyle.bg}`}
        >
          <div className="flex items-center gap-2">
            {semaforoStyle.icon}
            <div>
              <span className="text-xs font-mono font-bold text-slate-100 block">
                Custo unitário: {formatBRL(activeCell.hoje.unitario)} →{' '}
                {formatBRL(activeCell.exercicio.unitario)}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Variação do custo de aquisição em {exercicio} vs. hoje ·{' '}
                {REGIME_LABEL_FULL[config.compradorRegime]} comprando de{' '}
                {REGIME_LABEL_FULL[config.fornecedorRegime]}
              </span>
            </div>
          </div>
          <span
            className={`text-lg font-black font-mono ${
              activeCell.deltaPct < 0
                ? 'text-emerald-400'
                : activeCell.deltaPct > 0
                  ? 'text-rose-400'
                  : 'text-amber-400'
            }`}
          >
            {activeCell.deltaPct > 0 ? '+' : ''}
            {formatNumberBR(activeCell.deltaPct)}%
          </span>
        </div>
      </div>

      {/* ================= A3 · Réguas de repasse (mesa de negociação) ================= */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-300">
            Réguas de repasse — mesa de negociação ({exercicio})
          </span>
        </div>
        {config.fornecedorRegime === 'simples' ? (
          <p className="text-[10px] font-mono text-amber-300/80 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            Fornecedor SN: sem seletor — regime próprio, nota não se altera.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {repasseRuler.map(({ mode, cell }) => {
              const st = SEMAFORO_STYLE[cell.semaforo]
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, repasse: mode }))}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${st.bg} ${
                    config.repasse === mode
                      ? 'ring-2 ring-emerald-500/50'
                      : 'hover:ring-1 hover:ring-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-100">
                      {mode === 'integral'
                        ? 'Integral'
                        : mode === 'parcial'
                          ? `Parcial ${formatNumberBR(config.repassePct)}%`
                          : 'Nenhum (congelado)'}
                    </span>
                    {st.icon}
                  </div>
                  <span className="text-lg font-black font-mono text-slate-100 block mt-1">
                    {formatBRL(cell.exercicio.unitario)}/un
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      cell.deltaPct < 0 ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {cell.deltaPct > 0 ? '+' : ''}
                    {formatNumberBR(cell.deltaPct)}% vs. hoje
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ================= A5 · Matriz 3×3 ================= */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300">
            Matriz 3×3 — quem compra de quem ({exercicio})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-1.5 px-2 text-slate-500 font-normal">
                  Comprador ↓ · Fornecedor →
                </th>
                {(['presumido', 'real', 'simples'] as RegimeId[]).map((f) => (
                  <th key={f} className="text-right py-1.5 px-2 text-slate-300 font-bold">
                    {REGIME_LABEL_FULL[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.map(({ comprador, cells }) => {
                const best = Math.min(
                  ...cells.map((c) => c.cell.exercicio.unitario || Number.MAX_SAFE_INTEGER),
                )
                return (
                  <tr key={comprador} className="border-b border-slate-800/50">
                    <td className="py-2 px-2">
                      <span className="text-sky-300 font-bold">{REGIME_LABEL_FULL[comprador]}</span>
                      <span className="block text-[9px] text-slate-500">
                        menor custo: {formatBRL(best)}/un
                      </span>
                    </td>
                    {cells.map(({ fornecedor, cell: cellRes }) => {
                      const isBest =
                        cellRes.exercicio.unitario > 0 && cellRes.exercicio.unitario === best
                      return (
                        <td key={fornecedor} className="py-1.5 px-1.5 align-top">
                          <button
                            type="button"
                            onClick={() =>
                              setMemoryCell({
                                label: `${REGIME_LABEL_FULL[comprador]} ← ${REGIME_LABEL_FULL[fornecedor]}`,
                                cell: cellRes,
                              })
                            }
                            className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer hover:ring-1 hover:ring-emerald-500/40 ${
                              cellRes.semaforo === 'vermelho'
                                ? 'bg-rose-500/10 border-rose-500/40'
                                : cellRes.semaforo === 'verde'
                                  ? 'bg-emerald-500/10 border-emerald-500/40'
                                  : 'bg-amber-500/10 border-amber-500/40'
                            } ${isBest ? 'ring-1 ring-emerald-400/60' : ''}`}
                          >
                            <span className="text-[10px] font-mono text-slate-300 block">
                              Líq. {formatBRL(cellRes.exercicio.liquido)}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-100 block">
                              {formatBRL(cellRes.exercicio.unitario)}/un
                            </span>
                            <span
                              className={`text-[9px] font-mono ${
                                cellRes.deltaPct < 0 ? 'text-emerald-300' : 'text-rose-300'
                              }`}
                            >
                              {cellRes.deltaPct > 0 ? '+' : ''}
                              {formatNumberBR(cellRes.deltaPct)}% vs. hoje
                            </span>
                            {cellRes.alerta && (
                              <span className="flex items-center gap-1 text-[8px] font-mono text-rose-300 mt-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {cellRes.alerta}
                              </span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
          Regras de crédito: LP/LR tomam ICMS, CBS e IBS (IPI somente industrial); SN não aproveita
          crédito nenhum — células SN×LP e SN×LR em alerta vermelho. Clique na célula para abrir a
          memória completa. Painel por linha: o fornecedor com menor custo líquido fica destacado.
        </p>
      </div>

      {/* Modal de memória da matriz */}
      <CellMemoryDialog
        cell={memoryCell?.cell || activeCell}
        cellLabel={memoryCell?.label || ''}
        row={row}
        open={!!memoryCell}
        onOpenChange={(open) => {
          if (!open) setMemoryCell(null)
        }}
      />
    </div>
  )
}

export default CmvExercicioModule
