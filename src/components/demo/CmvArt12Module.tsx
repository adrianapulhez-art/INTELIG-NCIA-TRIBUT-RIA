import React, { useMemo, useState } from 'react'
import {
  CalendarClock,
  RotateCcw,
  Calculator,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
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
  CONFIG_PADRAO_ART12,
  computeCellArt12,
  computeCellArt12Item,
  computeCellsPorItem,
  aplicarOverrideCbsArt12,
  CBS_EDITAVEL_EXERCICIOS,
  CBS_DEFAULT,
  type CellConfigArt,
  type CellResultArt,
  type CmvArt12Input,
  type ExercicioKey,
  type Fundamento,
  type MemoryLineArt,
  type RegimeId,
  type RepasseMode,
  type ScheduleRowArt,
  type SideResultArt,
  r2,
} from '@/lib/art12Calculations'
import { calcularCelulaFornecedorPlenoXAdquirenteSn } from '@/lib/art12SnCalculations'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'
import { useTaxContext } from '@/contexts/TaxContext'
import { EspelhoRepasseDialog } from './EspelhoRepasseDialog'
import { SessaoSnSection } from './SessaoSnReforma'
import { NotaCardTrigger } from './NotasExplicativas'
import { PainelIntegracaoOrigem } from './PainelIntegracaoOrigem'
import { derivarCasoUnitario, montarItensIntegracao } from '@/lib/integracaoComprasArt12'

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

const BLOCO_TITULOS: Record<number, string> = {
  1: 'BLOCO ① — FORMAÇÃO DO PREÇO DO FORNECEDOR',
  2: 'BLOCO ② — CUSTO DA AQUISIÇÃO PARA O COMPRADOR',
}

/** Badge de dispositivo legal. */
function ArtBadge({ dispositivo }: { dispositivo: string }) {
  return (
    <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-800">
      {dispositivo}
    </span>
  )
}

/** Badge de validade da exclusão/base. */
function ValidadeBadge({ fundamento }: { fundamento?: Fundamento }) {
  if (!fundamento) return null
  const map: Record<Fundamento['validade'], { label: string; cls: string }> = {
    integral: {
      label: 'vigência integral',
      cls: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
    condicionada: {
      label: 'validade condicionada',
      cls: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    pendente: {
      label: 'pendente de definição',
      cls: 'border-rose-200 bg-rose-50 text-rose-800',
    },
    nao_aplicavel: { label: 'não aplicável', cls: 'border-slate-200 bg-slate-100 text-slate-600' },
  }
  const v = map[fundamento.validade]
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold ${v.cls}`}
    >
      {v.label}
    </span>
  )
}

/** Coluna de um lado (HOJE / Exercício): linhas agrupadas em blocos com botões de memória. */
function SideColumnArt({
  title,
  side,
  inp,
  onOpenLine,
  onOpenBloco,
  cell,
  row,
  exercicio,
  repasse,
  repassePct,
  regimeFornecedor,
  regimeComprador,
}: {
  title: string
  side: SideResultArt
  /** Input real da célula (vínculo automático) — notas derivam dele, nunca do canônico. */
  inp?: CmvArt12Input
  /** Quando fornecido, cada linha (com passos de derivação) ganha botão "Abrir". */
  onOpenLine?: (line: MemoryLineArt) => void
  /** Abre a memória completa do bloco (todas as linhas com derivação + base legal). */
  onOpenBloco?: (side: SideResultArt, bloco: number) => void
  /** Contexto para a nota explicativa atrelada ao card. */
  cell?: CellResultArt
  row?: ScheduleRowArt
  exercicio?: ExercicioKey
  repasse?: RepasseMode
  repassePct?: number
  regimeFornecedor?: string
  regimeComprador?: string
}) {
  const blocos = [...new Set(side.lines.map((l) => l.bloco))].sort((a, b) => a - b)
  return (
    <div className="flex-1 min-w-[320px] space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-700">
          {title}
        </span>
        <span className="flex-1 h-px bg-slate-200" />
      </div>
      {blocos.map((bloco) => {
        const forn = bloco === 1
        return (
          <div
            key={bloco}
            className={`rounded-xl border p-3 space-y-1.5 ${forn ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-mono font-black uppercase tracking-wider ${forn ? 'text-emerald-800' : 'text-slate-800'}`}
              >
                {BLOCO_TITULOS[bloco] || `BLOCO ${bloco}`}
              </span>
              <span className={`flex-1 h-px ${forn ? 'bg-emerald-200' : 'bg-slate-200'}`} />
              <Badge className="text-[9px] bg-slate-100 text-slate-700 border-slate-200 font-mono">
                {side.lines.filter((l) => l.bloco === bloco).length} linhas
              </Badge>
            </div>
            {side.lines
              .filter((l) => l.bloco === bloco)
              .map((line) =>
                line.label === 'MEMORIA_BLOCO1' ? (
                  onOpenLine ? (
                    <div key={line.key} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => onOpenBloco(side, bloco)}
                        className={`w-full inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-mono font-bold cursor-pointer transition-colors ${forn ? 'border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200' : 'border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                      >
                        <Calculator className="w-3 h-3" /> Memória + base legal
                      </button>
                      {cell && row && exercicio && repasse && inp && (
                        <NotaCardTrigger
                          inp={inp}
                          side={side}
                          bloco={bloco}
                          cell={cell}
                          row={row}
                          exercicio={exercicio}
                          repasse={repasse}
                          repassePct={repassePct}
                          titulo={`${BLOCO_TITULOS[bloco] || `BLOCO ${bloco}`} — ${title} · ${regimeFornecedor || ''} × ${regimeComprador || ''}`}
                          forn={forn}
                        />
                      )}
                    </div>
                  ) : null
                ) : (
                  <div
                    key={line.key}
                    className={`rounded-lg px-2.5 py-1.5 space-y-1 ${line.subtotal ? (forn ? 'bg-emerald-100/70 border border-emerald-300' : 'bg-slate-100 border border-slate-300') : 'bg-slate-50 border border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`text-[11px] font-mono font-semibold block ${line.kind === 'bruto' ? 'text-slate-900' : line.kind === 'credito' ? 'text-emerald-700' : line.kind === 'debito' ? 'text-amber-800' : 'text-slate-800'}`}
                        >
                          {line.label}
                        </span>
                        {line.formula && (
                          <span className="text-[9px] font-mono text-slate-500 block break-words">
                            {line.formula}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold shrink-0 ${line.value < 0 ? 'text-emerald-700' : line.subtotal ? 'text-slate-900' : 'text-slate-800'}`}
                      >
                        {line.kind === 'nota' && line.value === 0 ? '—' : formatBRL(line.value)}
                      </span>
                    </div>
                    {onOpenLine && line.passos && line.passos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenLine(line)}
                        className="text-[9px] font-mono text-emerald-700 hover:text-emerald-800 font-bold underline underline-offset-2 cursor-pointer"
                      >
                        Abrir derivação
                      </button>
                    )}
                  </div>
                ),
              )}
          </div>
        )
      })}
      <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 shadow-xs">
        <span className="text-[10px] font-mono font-bold uppercase text-emerald-900">
          {title.includes('HOJE') ? 'Custo unitário HOJE' : 'Custo unitário no exercício'}
        </span>
        <span className="text-sm font-black font-mono text-emerald-800">
          {formatBRL(side.unitario)}/un
        </span>
      </div>
    </div>
  )
}

/** Modal da memória completa da célula (HOJE × Exercício lado a lado). */
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
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 p-6 shadow-xl">
        <DialogHeader>
          <div className="border-l-4 border-emerald-500 pl-2.5 mb-1">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <span>Memória Art. 12 — {cellLabel}</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
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
        <div className="text-[10px] font-mono text-slate-500 border-t border-slate-200 pt-2">
          Nota legal (cabeçalho do módulo): LC 214/2025, art. 12, caput (valor da operação), §1º, IV
          (frete na base) e §2º, I, II e V (IBS/CBS, IPI, ICMS/ISS e PIS/COFINS fora da base —
          vigência 2026–2032). Crédito do adquirente: art. 47, §2º.
        </div>
        {lineMemory && (
          <LineMemoryDialog
            line={lineMemory.line}
            lineLabel={lineMemory.label}
            open={!!lineMemory}
            onOpenChange={(o) => !o && setLineMemory(null)}
          />
        )}
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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 p-6 shadow-xl">
        <DialogHeader>
          <div className="border-l-4 border-emerald-500 pl-2.5 mb-1">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <span>{lineLabel}</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">{contexto}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-900">{line.label}</span>
              <span className="text-[11px] font-mono font-bold text-emerald-700">
                {formatBRL(line.value)}
              </span>
            </div>
            {line.formula && (
              <div className="text-[10px] font-mono text-slate-500 mt-1">{line.formula}</div>
            )}
          </div>
          {passos.map((p) => (
            <div
              key={p.ordem}
              className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1 shadow-2xs"
            >
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-mono font-black text-emerald-700 shrink-0">
                  {p.ordem}.
                </span>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-[11px] font-mono font-semibold text-slate-900">
                    {p.descricao}
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 break-words">
                    {p.expressao}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-emerald-700 break-words">
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
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase text-emerald-900">
              Base legal
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <ArtBadge dispositivo={line.fundamento?.dispositivo || '—'} />
              <ValidadeBadge fundamento={line.fundamento} />
            </div>
            {line.fundamento?.efeito && (
              <div className="text-[10px] font-mono text-slate-700 break-words">
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

/** Modal do bloco completo (memória + base legal). */
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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 p-6 shadow-xl">
        <DialogHeader>
          <div className="border-l-4 border-emerald-500 pl-2.5 mb-1">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <span>Memória + base legal — {blocoLabel}</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">{contexto}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {linhas.map((line) => (
            <div key={line.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-900">{line.label}</span>
                <span className="text-[11px] font-mono font-bold text-emerald-700 shrink-0">
                  {line.kind === 'nota' && line.value === 0 ? '—' : formatBRL(line.value)}
                </span>
              </div>
              {(line.passos || []).map((p) => (
                <div
                  key={p.ordem}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-1"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono font-black text-emerald-700 shrink-0">
                      {p.ordem}.
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] font-mono font-semibold text-slate-900">
                        {p.descricao}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 break-words">
                        {p.expressao}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-emerald-700 break-words">
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
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 space-y-1">
                <div className="text-[10px] font-mono font-bold uppercase text-emerald-900">
                  Base legal
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ArtBadge dispositivo={line.fundamento?.dispositivo || '—'} />
                  <ValidadeBadge fundamento={line.fundamento} />
                </div>
                {line.fundamento?.efeito && (
                  <div className="text-[10px] font-mono text-slate-700 break-words">
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

export function CmvArt12Module() {
  const [exercicio, setExercicio] = useState<ExercicioKey>(2027)
  const [config, setConfig] = useState<CellConfigArt>(CONFIG_PADRAO_ART12)
  // CBS EDITÁVEL (decisão da CEO, 04/10): só 2027/2028 — default 8,8% preserva os
  // ouros chancelados; o contador digita outra projeção ou a alíquota real do Senado.
  const [cbsOverride, setCbsOverride] = useState<number | undefined>(undefined)
  const cbsEfetiva = cbsOverride ?? CBS_DEFAULT
  const cbsEditavelAqui = CBS_EDITAVEL_EXERCICIOS.includes(exercicio)
  // VÍNCULO AUTOMÁTICO (regra da CEO, 25/09): a célula lê a Calculadora de Compras
  // DIRETO do TaxContext — a MESMA fonte que o "Zerar campos" limpa. Zero lá = zero aqui.
  const { purchasesItems, addPurchaseItem, updatePurchaseItem } = useTaxContext()
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
  const [espelhoModal, setEspelhoModal] = useState<{ open: boolean; mode: RepasseMode } | null>(
    null,
  )
  // Controle de visibilidade do ambiente do fornecedor selecionado ("CENÁRIOS DE CÁLCULOS")
  const [camadaCenariosAberta, setCamadaCenariosAberta] = useState<boolean>(false)

  // INTEGRAÇÃO DE BASE COM SISTEMA PRÉ-REFORMA — VÍNCULO AUTOMÁTICO: itens da Compras
  // (mesma fonte do "Zerar campos") alimentam a célula sem importação manual.
  const itensOrigem = useMemo(() => montarItensIntegracao(purchasesItems || []), [purchasesItems])
  const itensComValor = useMemo(() => itensOrigem.filter((i) => i.valorNota > 0), [itensOrigem])
  const temOrigem = itensComValor.length > 0
  // MÁXIMA DA CASA (CEO, 27/09): NUNCA média entre produtos diferentes — a célula
  // calcula sobre UM item (aquisição unitária real); itens extras ficam pendentes
  // para o cálculo por item (próxima etapa).
  const casoUnitario = useMemo(() => derivarCasoUnitario(itensOrigem), [itensOrigem])
  const pendentesPorItem = casoUnitario.pendentesPorItem
  /** Caso exemplo: ESCREVE os itens canônicos NA Compras — os dois lados ficam iguais. */
  const carregarCasoExemplo = () => {
    const idA = addPurchaseItem('Celular Samsung (exemplo)')
    updatePurchaseItem(idA, 'quantity', 30)
    updatePurchaseItem(idA, 'unitPrice', 1400)
    updatePurchaseItem(idA, 'merchandiseValue', 42000)
    updatePurchaseItem(idA, 'freightValue', 400)
    updatePurchaseItem(idA, 'icmsRate', 18)
    updatePurchaseItem(idA, 'icmsFreightRate', 18)
    updatePurchaseItem(idA, 'icmsFreightValue', 72)
    updatePurchaseItem(idA, 'ipiRate', 10)
    const idB = addPurchaseItem('Capa protetora (exemplo)')
    updatePurchaseItem(idB, 'quantity', 30)
    updatePurchaseItem(idB, 'unitPrice', 35)
    updatePurchaseItem(idB, 'merchandiseValue', 1050)
    updatePurchaseItem(idB, 'freightValue', 50)
    updatePurchaseItem(idB, 'icmsRate', 18)
    updatePurchaseItem(idB, 'icmsFreightRate', 18)
    updatePurchaseItem(idB, 'icmsFreightValue', 9)
  }

  const rowBase = useMemo(
    () => CRONOGRAMA_ART12.find((r) => r.exercicio === exercicio)!,
    [exercicio],
  )
  // Override de CBS (2027/2028) aplicado UMA vez — flui para célula ativa, réguas,
  // matriz, memórias e Sessão SN (referência plena) sem tocar o cronograma original.
  const row = useMemo(() => aplicarOverrideCbsArt12(rowBase, cbsOverride), [rowBase, cbsOverride])

  // CÁLCULO POR ITEM (CEO, 27/09): memória Art. 12 completa para CADA item com valor.
  // A memória vive DENTRO dos cards de repasse (espelho) — não mais na página geral.
  const celulasPorItem = useMemo(
    () =>
      computeCellsPorItem(
        itensOrigem,
        config.perfilFornecedorSN
          ? config
          : { ...config, perfilFornecedorSN: config.perfilFornecedorSN },
        row,
      ),
    [itensOrigem, config, row],
  )

  // VÍNCULO AUTOMÁTICO + MÁXIMA DA CASA: a célula calcula sobre UM item da Compras
  // (aquisição unitária real, sem média). Origem zerada → célula zerada (zero=zero).
  const input = casoUnitario.input ?? {
    quantity: 0,
    unitPrice: 0,
    freightValue: 0,
    icmsRate: 0,
    icmsFreightRate: 0,
    ipiRate: 0,
  }
  const origemIntegrada = temOrigem

  return (
    <div className="space-y-4">
      {/* ================= Cabeçalho + seletor de exercício ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                CMV por Exercício — conforme o Art. 12 (LC 214/2025)
              </h3>
              <p className="text-xs text-slate-500">
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
              className="h-8 text-xs bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restaurar
            </Button>
          </div>
        </div>

        {/* Nota legal do cabeçalho */}
        <div className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed space-y-2">
          <div>
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-700 inline mr-1.5 -mt-0.5" />
            Fundamento: LC 214/2025, art. 12, caput — base = valor da operação; §1º, IV — frete
            integra a base; §2º, I — IBS/CBS fora; §2º, II — IPI fora (todos os exercícios); §2º, V
            — ICMS/ISS/PIS/COFINS fora, vigência expressa 01/01/2026 a 31/12/2032. Frações do ICMS:
            ADCT, art. 128, I–IV. IPI zerado 2027+: CF, art. 153, §3º + LC 214/2025, art. 454 (ZFM:
            ADCT, art. 92-B). Crédito do adquirente: art. 47, §2º. Desconto incondicional (consta do
            documento e não depende de evento posterior): fora da base — art. 12, §2º, III.
            Devolução e cancelamento: base da operação original — art. 12, §7º. PIS/COFINS embutidos
            sobre base sem ICMS: tese do século (STJ RE 1.188.403; STF Tema 1098). PENDENTE DE
            DEFINIÇÃO: se CBS/IBS integram a base do ICMS na transição — simule as duas teses no
            seletor abaixo.
          </div>
          <div className="pt-2 border-t border-slate-200 text-slate-700">
            <strong>Nota de equivalência de nomenclatura:</strong> &quot;BASE LIMPA (art. 12) ·
            cadeia neutra&quot; corresponde ao antigo &quot;Repasse integral&quot;; &quot;PARCIAL
            50% · ganho dividido&quot; corresponde ao antigo &quot;Parcial 50%&quot;; &quot;PREÇO
            CHEIO · comprador absorve (escada)&quot; corresponde ao antigo &quot;Sem repasse&quot;.
            Os valores calculados são os mesmos — apenas a nomenclatura mudou.
          </div>
        </div>

        {/* Seletor de exercícios */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Exercício de Transição (Cronograma Oficial)
          </span>
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-200">
            {EXERCICIOS.map((ex) => {
              const r = CRONOGRAMA_ART12.find((rr) => rr.exercicio === ex)!
              const ativo = exercicio === ex
              return (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setExercicio(ex)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    ativo
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : r.pendente
                        ? 'text-rose-700 hover:bg-rose-50 border border-rose-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {ex}
                  {r.pendente ? ' *' : ''}
                </button>
              )
            })}
          </div>
        </div>

        {/* Seletor de tese (base do ICMS na transição) */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Base do ICMS na transição:
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 gap-1">
              {(
                [
                  { v: 'fisco', label: 'Tese do Fisco' },
                  { v: 'contribuinte', label: 'Tese do Contribuinte (PLP 16/25)' },
                ] as const
              ).map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, baseIcmsTransicao: t.v }))}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    config.baseIcmsTransicao === t.v
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              {config.baseIcmsTransicao === 'fisco'
                ? 'ICMS por dentro sobre operação + CBS + IBS (lacuna normativa) — nota maior. Cadeia plena fecha igual; muda o custo do comprador SN.'
                : 'ICMS sobre a operação sem CBS/IBS (PLP 16/25) — nota menor. Cadeia plena fecha igual; muda o custo do comprador SN.'}
            </span>
          </div>
        </div>

        {/* CBS EDITÁVEL (decisão da CEO, 04/10) — só 2027/2028; 2026 é cravado em lei (art. 342) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Alíquota da CBS:
          </span>
          {cbsEditavelAqui ? (
            <>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={cbsEfetiva}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setCbsOverride(Number.isFinite(v) && v > 0 ? v : undefined)
                }}
                className="w-24 h-8 text-xs font-mono bg-white border-slate-300 text-slate-900 focus-visible:ring-emerald-500"
              />
              <span className="text-xs font-mono font-bold text-slate-700">%</span>
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold border-amber-300 bg-amber-50 text-amber-800">
                ESTIMADA — pendente de fixação (Senado, art. 349)
              </span>
              {cbsOverride !== undefined && cbsOverride !== CBS_DEFAULT && (
                <button
                  type="button"
                  onClick={() => setCbsOverride(undefined)}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 cursor-pointer ml-1"
                >
                  voltar ao padrão 8,8%
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-sm font-mono font-bold text-slate-900">{row.cbsRate}%</span>
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold border-emerald-200 bg-emerald-50 text-emerald-800">
                CRAVADA EM LEI (art. 342)
              </span>
            </>
          )}
        </div>

        {/* INTEGRAÇÃO DE BASE COM SISTEMA PRÉ-REFORMA — vínculo automático com a Compras */}
        <PainelIntegracaoOrigem
          itensOrigem={itensOrigem}
          temOrigem={temOrigem}
          onCarregarExemplo={carregarCasoExemplo}
        />
        {!origemIntegrada && (
          <div className="flex items-start gap-2 text-xs font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Célula ZERADA — nenhum item com valor na Calculadora de Compras (regra: zero na
              origem, zero na célula). Lance itens na Compras ou use "Carregar caso exemplo" no
              painel acima — ele escreve os itens lá e os dois lados ficam iguais de verdade.
            </span>
          </div>
        )}
        {row.pendente && (
          <div className="flex items-start gap-2 text-xs font-mono text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{row.pendente}</span>
          </div>
        )}
      </div>
      {/* ================= 1. CÉLULA ENXUTA NO TOPO (CHANCELADA PELA ADRI) ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="border-l-4 border-emerald-500 pl-2.5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Ambiente do Fornecedor · Organização dos Cenários de Cálculo
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione o regime e perfil único do fornecedor para abrir os cenários de cálculo da
            camada
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* FORNECEDOR: LP e LR */}
          <div className="sm:col-span-1 lg:col-span-4 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-slate-700 uppercase block">
                FORNECEDOR
              </label>
              <span className="text-[10px] font-mono text-slate-500">Regime da nota de origem</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['presumido', 'real'] as const).map((rg) => {
                const ativo = config.fornecedorRegime === rg
                return (
                  <button
                    key={rg}
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, fornecedorRegime: rg }))}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all border ${
                      ativo
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {REGIME_LABEL[rg]} · {REGIME_LABEL_FULL[rg]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* PERFIL FORNECEDOR: Comércio e Indústria */}
          <div className="sm:col-span-1 lg:col-span-4 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-slate-700 uppercase block">
                PERFIL FORNECEDOR
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                Perfil único por ambiente
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['comercio', 'industria'] as const).map((pf) => {
                const ativo = config.fornecedorPerfil === pf
                return (
                  <button
                    key={pf}
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, fornecedorPerfil: pf }))}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all border ${
                      ativo
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {pf === 'comercio' ? 'Comércio' : 'Indústria'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* BOTÃO PRIMÁRIO VERDE: ABRIR / FECHAR CENÁRIOS DE CÁLCULOS */}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button
              type="button"
              onClick={() => setCamadaCenariosAberta((prev) => !prev)}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs uppercase cursor-pointer shadow-sm tracking-wider flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              <span>
                {camadaCenariosAberta
                  ? 'FECHAR CENÁRIOS DE CÁLCULOS'
                  : 'ABRIR CENÁRIOS DE CÁLCULOS'}
              </span>
              {camadaCenariosAberta ? (
                <ChevronUp className="w-4 h-4 ml-1 opacity-80" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-1 opacity-80" />
              )}
            </Button>
          </div>
        </div>

        {/* ================= 2. CAMADA INTERNA RECUADA (PADRÃO PRÉ-REFORMA COMPRAS/MARKUP) ================= */}
        {camadaCenariosAberta && (
          <div className="mt-4 pt-4 border-t-2 border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="rounded-2xl border-2 border-slate-300 bg-slate-50/80 p-5 sm:p-6 shadow-inner space-y-6">
              {/* Cabeçalho da Camada Interna Recuada — Padrão DETALHES DA COMPRA / CENÁRIOS */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 pb-4">
                <div className="border-l-4 border-emerald-600 pl-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300/50" />
                    <h4 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900">
                      DETALHES DA COMPRA · CENÁRIOS DE CÁLCULOS · FORNECEDOR{' '}
                      {config.fornecedorRegime === 'real' ? 'LUCRO REAL' : 'LUCRO PRESUMIDO'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Camada interna recuada · Perfil do fornecedor:{' '}
                    <strong className="text-slate-800">
                      {config.fornecedorPerfil === 'comercio' ? 'Comércio' : 'Indústria'}
                    </strong>{' '}
                    · 4 cenários alimentados pelo perfil único selecionado
                  </p>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase shadow-xs">
                    Ambiente Ativo: {REGIME_LABEL[config.fornecedorRegime]} ·{' '}
                    {config.fornecedorPerfil === 'comercio' ? 'Comércio' : 'Indústria'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCamadaCenariosAberta(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                    title="Recolher camada de cenários"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    <span>FECHAR CENÁRIOS DE CÁLCULOS</span>
                  </button>
                </div>
              </div>

              {/* ZFM auxiliar recolhido dentro da camada interna */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-xs">
                <label className="flex items-center gap-2.5 text-xs font-mono text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.zfm}
                    onChange={(e) => setConfig((c) => ({ ...c, zfm: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>
                    Fornecedor industrial na Zona Franca de Manaus (mantém IPI — ADCT, art. 92-B)
                  </span>
                </label>
                {config.zfm && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800">
                    IPI Ativo
                  </span>
                )}
              </div>

              {/* SEÇÃO A — ADQUIRENTE PLENO · com régua de repasse */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-900 text-white px-4 py-3 rounded-xl shadow-xs border border-emerald-700/60">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-300/40 shrink-0" />
                    <span className="text-sm font-mono font-black uppercase tracking-wider text-white">
                      SEÇÃO A — ADQUIRENTE PLENO · COM RÉGUA DE REPASSE
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-100 bg-emerald-950/80 border border-emerald-600/70 px-2.5 py-1 rounded">
                    Base Limpa · Parcial 50% · Preço Cheio dentro do espelho
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(['presumido', 'real'] as const).map((comprador) => {
                    const cfgComb = {
                      ...config,
                      compradorRegime: comprador,
                      fornecedorRegime: config.fornecedorRegime,
                    }
                    const celulasItens = (celulasPorItem || []).map(({ item }) => ({
                      item,
                      cell: computeCellArt12Item(item, cfgComb, row),
                    }))
                    const exibidos = celulasItens.slice(0, 3)
                    const restantes = celulasItens.length - exibidos.length
                    const repasseTxt =
                      config.repasse === 'parcial'
                        ? `PARCIAL ${formatNumberBR(config.repassePct)}% · GANHO DIVIDIDO`
                        : config.repasse === 'nenhum'
                          ? 'PREÇO CHEIO · COMPRADOR ABSORVE (ESCADA)'
                          : 'BASE LIMPA (ART. 12) · CADEIA NEUTRA'
                    const repasseSub =
                      config.repasse === 'parcial'
                        ? 'Metade no preço, metade na margem'
                        : config.repasse === 'nenhum'
                          ? 'Tributação extinta mantida no preço'
                          : 'PIS/COFINS eliminados, economia no preço'
                    const isMenor = comprador === 'real' && config.fornecedorRegime === 'real'

                    return (
                      <button
                        key={comprador}
                        type="button"
                        onClick={() => {
                          setConfig((c) => ({ ...c, compradorRegime: comprador }))
                          setEspelhoModal({ open: true, mode: config.repasse })
                        }}
                        className={`rounded-2xl border text-left cursor-pointer transition-all overflow-hidden flex flex-col justify-between ${
                          isMenor
                            ? 'border-emerald-600 ring-1 ring-emerald-500 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-full bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 text-white p-3.5 space-y-1.5 border-b border-slate-600">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-mono font-bold uppercase text-white tracking-wide">
                              {REGIME_LABEL_FULL[config.fornecedorRegime].toUpperCase()} ×{' '}
                              {REGIME_LABEL_FULL[comprador].toUpperCase()}
                            </span>
                            {isMenor && (
                              <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-600 rounded px-1.5 py-0.5">
                                MENOR
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-mono font-bold uppercase text-emerald-300">
                              {repasseTxt}
                            </div>
                            <div className="text-[9px] font-mono text-slate-200">{repasseSub}</div>
                            <div className="text-[10px] font-mono uppercase text-slate-200">
                              ADQUIRENTE: {REGIME_LABEL_FULL[comprador]}
                            </div>
                            <div className="text-[10px] font-mono uppercase text-slate-200">
                              FORNECEDOR: {REGIME_LABEL_FULL[config.fornecedorRegime]}
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-3 flex-1 w-full bg-white hover:bg-slate-50/70">
                          {/* Resumo por produto (valor/un e %) */}
                          <div className="space-y-1.5">
                            {exibidos.map(({ item, cell: ci }) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5"
                              >
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-800 truncate max-w-[45%]">
                                  {item.name || 'Item'}
                                </span>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-black text-slate-900 font-mono block leading-tight">
                                    {formatBRL(ci.exercicio.unitario)}/un
                                  </span>
                                  <span
                                    className={`text-[10px] font-mono font-semibold ${
                                      ci.deltaPct > 0
                                        ? 'text-rose-700'
                                        : ci.deltaPct < 0
                                          ? 'text-emerald-700'
                                          : 'text-slate-500'
                                    }`}
                                  >
                                    {ci.deltaPct > 0 ? '+' : ''}
                                    {formatNumberBR(ci.deltaPct)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                            {restantes > 0 && (
                              <div className="text-[10px] font-mono text-slate-500">
                                +{restantes} item{restantes === 1 ? '' : 's'} dentro do espelho
                              </div>
                            )}
                            {celulasItens.length === 0 && (
                              <div className="text-[10px] font-mono text-slate-500">
                                Nenhum item com valor na Calculadora de Compras
                              </div>
                            )}
                          </div>

                          <div className="text-[10px] font-mono text-emerald-700 font-bold text-center pt-1 border-t border-slate-100">
                            Clique para abrir os 6 cards do cenário
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* SEÇÃO B — ADQUIRENTE SIMPLES NACIONAL · CENÁRIO ÚNICO */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-900 text-white px-4 py-3 rounded-xl shadow-xs border border-emerald-700/60">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-300/40 shrink-0" />
                    <span className="text-sm font-mono font-black uppercase tracking-wider text-white">
                      SEÇÃO B — ADQUIRENTE SIMPLES NACIONAL · CENÁRIO ÚNICO
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-100 bg-emerald-950/80 border border-emerald-600/70 px-2.5 py-1 rounded">
                    Sem régua de repasse · LC 123/2006 art. 23
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(
                    [
                      {
                        comprador: 'simples' as const,
                        extenso:
                          config.fornecedorRegime === 'real'
                            ? 'LUCRO REAL × SIMPLES NACIONAL (PURO)'
                            : 'LUCRO PRESUMIDO × SIMPLES NACIONAL (PURO)',
                        nomeComprador: 'Simples Nacional Puro',
                      },
                      {
                        comprador: 'simples_hibrido' as const,
                        extenso:
                          config.fornecedorRegime === 'real'
                            ? 'LUCRO REAL × SIMPLES NACIONAL HÍBRIDO'
                            : 'LUCRO PRESUMIDO × SIMPLES NACIONAL HÍBRIDO',
                        nomeComprador: 'Simples Nacional Híbrido (regime regular IBS/CBS)',
                      },
                    ] as const
                  ).map(({ comprador, extenso, nomeComprador }) => {
                    const fornSNRegime =
                      config.fornecedorRegime === 'real' ? 'lucro_real' : 'lucro_presumido'
                    const adqSNRegime =
                      comprador === 'simples_hibrido' ? 'simples_hibrido' : 'simples'
                    const itemRef =
                      celulasPorItem && celulasPorItem.length > 0
                        ? celulasPorItem[0].item
                        : undefined
                    const celulaSn = calcularCelulaFornecedorPlenoXAdquirenteSn(
                      fornSNRegime,
                      adqSNRegime,
                      itemRef,
                    )

                    return (
                      <button
                        key={comprador}
                        type="button"
                        onClick={() => {
                          setConfig((c) => ({ ...c, compradorRegime: comprador }))
                          setEspelhoModal({ open: true, mode: 'integral' })
                        }}
                        className="rounded-2xl border border-slate-200 hover:border-slate-300 text-left cursor-pointer transition-all overflow-hidden flex flex-col justify-between"
                      >
                        <div className="w-full bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 text-white p-3.5 space-y-1.5 border-b border-slate-600">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-mono font-bold uppercase text-white tracking-wide">
                              {extenso}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-slate-200 bg-slate-800/80 border border-slate-600 rounded px-1.5 py-0.5">
                              CENÁRIO ÚNICO
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-mono font-bold uppercase text-emerald-300">
                              Cenário Único (chancelado) · Sem repasse · LC 123/2006 art. 23
                            </div>
                            <div className="text-[10px] font-mono uppercase text-slate-200">
                              ADQUIRENTE: {nomeComprador}
                            </div>
                            <div className="text-[10px] font-mono uppercase text-slate-200">
                              FORNECEDOR: {REGIME_LABEL_FULL[config.fornecedorRegime]}
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-3 flex-1 w-full bg-white hover:bg-slate-50/70">
                          {/* Exibição direta do valor de ouro chancelado */}
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono font-bold text-slate-900">
                                {itemRef?.name || 'Item Canônico'}
                              </span>
                              <span className="text-sm font-black font-mono text-emerald-950">
                                {formatBRL(celulaSn.exercicio2027.custoUnitario)}/un
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-600">
                              <span>HOJE: {formatBRL(celulaSn.hoje.custoUnitario)}/un</span>
                              <span
                                className={`font-bold ${
                                  celulaSn.deltaPct > 0
                                    ? 'text-rose-700'
                                    : celulaSn.deltaPct < 0
                                      ? 'text-emerald-700'
                                      : 'text-slate-500'
                                }`}
                              >
                                {celulaSn.deltaPct > 0 ? '+' : ''}
                                {formatNumberBR(celulaSn.deltaPct)}%
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] font-mono text-slate-500 leading-tight">
                            {comprador === 'simples'
                              ? 'LC 123/2006 art. 13 §1º: custo = nota cheia sem créditos.'
                              : 'LC 214/2025 art. 41: credita CBS e IBS integrais destacados; sem ICMS 18%.'}
                          </p>

                          <div className="text-[10px] font-mono text-emerald-700 font-bold text-center pt-1 border-t border-slate-100">
                            Clique para abrir o espelho direto (Cards 01, 02 e 03)
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* ================= SESSÃO SN NA REFORMA (rearranjo da CEO, 29/09): TODAS as operações
          com Simples Nacional vivem AQUI — 12 combinações (SN puro × SN híbrido) × adquirentes.
          O espelho do Art. 12 abaixo encolhe para LP/LR × LP/LR. ================= */}
      <SessaoSnSection
        itensOrigem={itensOrigem}
        config={config}
        row={row}
        exercicio={exercicio}
        custoPlenoUnitario={
          computeCellArt12(input, { ...config, repasse: 'integral' }, row).exercicio.unitario
        }
        onAbrirMemoriaItem={(item, cell) =>
          setMemoryCell({ label: `Item · ${item.name || '—'}`, cell, row })
        }
      />
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
          contexto={`Exercício ${exercicio} · ${REGIME_LABEL_FULL[config.fornecedorRegime]} (fornecedor) × ${REGIME_LABEL_FULL[config.compradorRegime]} (comprador) · repasse ${config.repasse === 'integral' ? 'integral' : config.repasse === 'parcial' ? `parcial ${formatNumberBR(config.repassePct)}%` : 'nenhum'} · tese: ${config.baseIcmsTransicao === 'fisco' ? 'Fisco' : 'Contribuinte'}`}
        />
      )}
      {blocoMemory && (
        <BlocoMemoryDialog
          side={blocoMemory.side}
          bloco={blocoMemory.bloco}
          blocoLabel={blocoMemory.label}
          open={!!blocoMemory}
          onOpenChange={(o) => !o && setBlocoMemory(null)}
          contexto={`Exercício ${exercicio} · ${REGIME_LABEL_FULL[config.fornecedorRegime]} (fornecedor) × ${REGIME_LABEL_FULL[config.compradorRegime]} (comprador)`}
        />
      )}
      {espelhoModal && (
        <EspelhoRepasseDialog
          input={input}
          baseConfig={config}
          row={row}
          exercicio={exercicio}
          mode={espelhoModal.mode}
          open={espelhoModal.open}
          onOpenChange={(o) => !o && setEspelhoModal(null)}
          onChangeRepasse={(mode) => {
            setConfig((c) => ({ ...c, repasse: mode }))
            setEspelhoModal((prev) => (prev ? { ...prev, mode } : null))
          }}
          onChangeRepassePct={(pct) => {
            setConfig((c) => ({ ...c, repassePct: pct }))
          }}
          celulasPorItem={celulasPorItem}
          onAbrirMemoriaItem={(item, cell) => {
            setEspelhoModal(null)
            setMemoryCell({ label: `Item · ${item.name || '—'}`, cell, row })
          }}
          onAbrirCelula={(comprador, fornecedor, cell) => {
            setEspelhoModal(null)
            setMemoryCell({
              label: `${REGIME_LABEL[comprador]} × ${REGIME_LABEL[fornecedor]} — ${exercicio}`,
              cell,
              row,
            })
          }}
        />
      )}{' '}
    </div>
  )
}

export default CmvArt12Module
