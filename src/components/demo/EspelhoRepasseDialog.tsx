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
import {
  calcularCelulaFornecedorPlenoXAdquirenteSn,
  type ResultadoCelulaFornecedorPlenoXAdquirenteSn,
  type FornecedorPlenoRegime,
  type AdquirenteSnRegime,
} from '@/lib/art12SnCalculations'
import { calcularCelulaLrXLr, type ResultadoCelulaLrXLr } from '@/lib/art12LrCalculations'
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

const REGIMES_FORNECEDOR_PLENO: RegimeId[] = ['presumido', 'real']

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

function CardMemoriaCanonicalEspelho({
  titulo,
  cor,
  linhas,
  badgeExtra,
}: {
  titulo: string
  cor: 'emerald' | 'violet' | 'orange' | 'sky'
  linhas: {
    label: string
    formula?: string
    valor: number
    destaque?: boolean
    fundamento?: string
  }[]
  badgeExtra?: React.ReactNode
}) {
  const corCls = {
    emerald: 'border-emerald-500/45 bg-emerald-500/[0.05]',
    violet: 'border-violet-500/45 bg-violet-500/[0.05]',
    orange: 'border-orange-500/45 bg-orange-500/[0.06]',
    sky: 'border-sky-400/70 bg-sky-500/[0.16]',
  }[cor]
  const tituloCls = {
    emerald: 'text-emerald-300',
    violet: 'text-violet-300',
    orange: 'text-orange-300',
    sky: 'text-sky-200',
  }[cor]

  return (
    <div
      className={`w-full min-w-0 rounded-xl border p-3 space-y-1.5 flex flex-col justify-between ${corCls}`}
    >
      <div className="flex items-start justify-between gap-1 pb-1 border-b border-slate-800/80">
        <span
          className={`text-[10px] font-mono font-black uppercase leading-tight block ${tituloCls}`}
        >
          {titulo}
        </span>
        {badgeExtra}
      </div>
      <div className="space-y-1 flex-1">
        {linhas.map((l, i) => (
          <div
            key={`${l.label}-${i}`}
            className={`flex items-start justify-between gap-2 px-2 py-1 rounded-lg border ${
              l.destaque
                ? cor === 'emerald'
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : cor === 'violet'
                    ? 'bg-violet-500/10 border-violet-500/40'
                    : cor === 'sky'
                      ? 'bg-sky-500/25 border-sky-400/60'
                      : 'bg-orange-500/10 border-orange-500/40'
                : 'bg-slate-950/50 border-slate-800/60'
            }`}
          >
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-slate-200 block leading-tight">
                {l.label}
              </span>
              {l.formula && (
                <span className="text-[9px] font-mono text-slate-500 block break-words leading-tight mt-0.5">
                  {l.formula}
                </span>
              )}
              {l.fundamento && (
                <span className="text-[8px] font-mono text-sky-400/80 block break-words leading-tight mt-0.5">
                  [{l.fundamento}]
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-[10px] font-mono font-bold block ${
                  l.valor < 0 ? 'text-emerald-300' : l.destaque ? 'text-white' : 'text-slate-100'
                }`}
              >
                {formatBRL(l.valor)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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
  // Determina se o comprador ativo é optante do Simples Nacional (puro ou híbrido)
  const isCompradorSn =
    baseConfig.compradorRegime === 'simples' || baseConfig.compradorRegime === 'simples_hibrido'
  const adquirenteSnRegime: AdquirenteSnRegime =
    baseConfig.compradorRegime === 'simples_hibrido' ? 'simples_hibrido' : 'simples'

  // Item de referência para a memória canônica das células SN e LR × LR
  const itemReferencia =
    celulasPorItem && celulasPorItem.length > 0 ? celulasPorItem[0].item : undefined

  // CÉLULAS SN: Fornecedores LP e LR × Comprador SN / SNH (chancela Adri)
  // Calculadas pelo motor oficial calcularCelulaFornecedorPlenoXAdquirenteSn
  const celulaLpSn = calcularCelulaFornecedorPlenoXAdquirenteSn(
    'lucro_presumido',
    adquirenteSnRegime,
    itemReferencia,
  )
  const celulaLrSn = calcularCelulaFornecedorPlenoXAdquirenteSn(
    'lucro_real',
    adquirenteSnRegime,
    itemReferencia,
  )

  // Célula LR × LR chancelada (Régua A, neutra Δ 0,00%)
  const celulaLrXLr = calcularCelulaLrXLr(itemReferencia)

  const celulasSnPorFornecedor: Record<
    'presumido' | 'real',
    ResultadoCelulaFornecedorPlenoXAdquirenteSn
  > = {
    presumido: celulaLpSn,
    real: celulaLrSn,
  }

  // Estado para cenário aberto:
  // Para comprador pleno: { ci, fi }
  // Para comprador SN/SNH: fornecedor pleno selecionado ('presumido' | 'real')
  const [cenarioAberto, setCenarioAberto] = useState<{ ci: number; fi: number } | null>(null)
  const [fornecedorSnAberto, setFornecedorSnAberto] = useState<RegimeId | null>(
    isCompradorSn ? (baseConfig.fornecedorRegime === 'real' ? 'real' : 'presumido') : null,
  )

  const cfg: CellConfigArt = { ...baseConfig, repasse: mode }

  // Regimes do espelho pleno padrão
  const regimesCompradorPleno: RegimeId[] = ['presumido', 'real']
  const celulasPlenas = regimesCompradorPleno.map((comprador, ci) => ({
    comprador,
    ci,
    cells: REGIMES_FORNECEDOR_PLENO.map((fornecedor, fi) => ({
      fornecedor,
      fi,
      cell: computeCellArt12(
        input,
        { ...cfg, compradorRegime: comprador, fornecedorRegime: fornecedor },
        row,
      ),
    })),
  }))

  const menorPleno = Math.min(
    ...celulasPlenas.flatMap((l) => l.cells.map((c) => c.cell.exercicio.unitario)),
  )
  const repassePct = mode === 'parcial' ? ` ${formatNumberBR(baseConfig.repassePct)}%` : ''
  const repasseTxt = isCompradorSn
    ? 'CENÁRIO ÚNICO CHANCELADO'
    : mode === 'parcial'
      ? `REPASSE PARCIAL ${formatNumberBR(baseConfig.repassePct)}%`
      : REPASSE_TITULO[mode]

  const abertoPleno = cenarioAberto
    ? {
        comprador: regimesCompradorPleno[cenarioAberto.ci],
        fornecedor: REGIMES_FORNECEDOR_PLENO[cenarioAberto.fi],
        cell: celulasPlenas[cenarioAberto.ci].cells[cenarioAberto.fi].cell,
      }
    : null

  const celulaSnAtiva = fornecedorSnAberto === 'real' ? celulaLrSn : celulaLpSn

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>
              {isCompradorSn ? (
                <>
                  Espelho dos cálculos — Cenário Único (chancelado) · Sem repasse · Exercício{' '}
                  {exercicio}
                </>
              ) : (
                <>
                  Espelho dos cálculos — {REPASSE_TITULO[mode]}
                  {repassePct} · Exercício {exercicio}
                </>
              )}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            {isCompradorSn ? (
              <>
                Memória de cálculo aberta linha a linha (Cards 01, 02 e 03) para o adquirente{' '}
                <strong className="text-slate-200">
                  {REGIME_NOME[baseConfig.compradorRegime]}
                </strong>{' '}
                comprando de fornecedores <strong className="text-slate-200">LP ou LR</strong>.
                Cenário único chancelado pela Adri, sem composição de repasse. Fundamentação legal
                explícita entre colchetes.
              </>
            ) : abertoPleno ? (
              'Camada interna: os 6 cards do cenário selecionado — 3 por item da Calculadora de Compras.'
            ) : (
              'Cenários PLENOS COMPRADOR × FORNECEDOR (LP/LR). Cada card reflete exatamente o repasse selecionado — clique para abrir os 6 cards do cenário. As operações com Simples Nacional (SN puro e SN híbrido) vivem na SESSÃO SN da página, com as regras próprias delas.'
            )}
          </DialogDescription>
        </DialogHeader>

        {isCompradorSn ? (
          /* ======================================================================= */
          /* COMPRADOR SN / SN HÍBRIDO — CENÁRIO ÚNICO CHANCELADO (Cards 01, 02 e 03)  */
          /* Sem seletor de repasse; valores Parcial/Sem repasse NÃO aparecem        */
          /* ======================================================================= */
          <div className="space-y-4">
            {/* Seletor do fornecedor pleno (LP ou LR) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Fornecedor da operação:
                </span>
                <div className="flex gap-1.5">
                  {(['presumido', 'real'] as const).map((forn) => {
                    const isAtivo = (fornecedorSnAberto || 'presumido') === forn
                    const cel = celulasSnPorFornecedor[forn]
                    return (
                      <button
                        key={forn}
                        type="button"
                        onClick={() => setFornecedorSnAberto(forn)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer transition-all ${
                          isAtivo
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {REGIME_LABEL[forn]} ({REGIME_NOME[forn]}) ·{' '}
                        {formatBRL(cel.exercicio2027.custoUnitario)}/un (
                        {cel.deltaPct >= 0 ? '+' : ''}
                        {formatNumberBR(cel.deltaPct)}%)
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                  Cenário Único (chancelado)
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  Sem repasse (LC 123/2006)
                </span>
              </div>
            </div>

            {/* Identificação da Operação */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.05] p-3 space-y-1">
              <div className="text-[12px] font-mono font-black uppercase text-white">
                OPERAÇÃO ANALISADA: ADQUIRENTE: {REGIME_NOME[baseConfig.compradorRegime]} /
                FORNECEDOR: {REGIME_NOME[fornecedorSnAberto || 'presumido']}
              </div>
              <div className="text-[10px] font-mono text-emerald-300 uppercase">
                CENÁRIO ÚNICO (CHANCELADO) · EXERCÍCIO {exercicio}
              </div>
              <div className="text-[10px] font-mono text-slate-300">
                HOJE: {formatBRL(celulaSnAtiva.hoje.custoUnitario)}/un → 2027:{' '}
                {formatBRL(celulaSnAtiva.exercicio2027.custoUnitario)}/un ·{' '}
                {celulaSnAtiva.deltaPct >= 0 ? '+' : ''}
                {formatNumberBR(celulaSnAtiva.deltaPct)}% vs HOJE
                {adquirenteSnRegime === 'simples' &&
                  ' · NOTA CHEIA SEM CRÉDITO (ART. 13 §1º LC 123/2006)'}
                {adquirenteSnRegime === 'simples_hibrido' &&
                  ' · CRÉDITO CBS + IBS (ART. 41 LC 214/2025; SEM ICMS 18%)'}
              </div>
            </div>

            {/* OS 3 CARDS ABERTOS LINHA A LINHA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
              {/* CARD 01 */}
              <CardMemoriaCanonicalEspelho
                titulo={`${celulaSnAtiva.card01.numero} — ${celulaSnAtiva.card01.titulo}`}
                cor={celulaSnAtiva.card01.cor}
                badgeExtra={
                  <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    HOJE 2026
                  </span>
                }
                linhas={celulaSnAtiva.card01.linhas.map((l) => ({
                  label: `${l.sinal} ${l.label}`,
                  formula: l.formula,
                  valor: l.valor,
                  destaque: l.destaque,
                  fundamento: l.fundamento,
                }))}
              />

              {/* CARD 02 */}
              <CardMemoriaCanonicalEspelho
                titulo={`${celulaSnAtiva.card02.numero} — ${celulaSnAtiva.card02.titulo}`}
                cor={celulaSnAtiva.card02.cor}
                badgeExtra={
                  <span className="text-[9px] font-mono font-bold text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/30">
                    FORNECEDOR 2027
                  </span>
                }
                linhas={celulaSnAtiva.card02.linhas.map((l) => ({
                  label: `${l.sinal} ${l.label}`,
                  formula: l.formula,
                  valor: l.valor,
                  destaque: l.destaque,
                  fundamento: l.fundamento,
                }))}
              />

              {/* CARD 03 */}
              <CardMemoriaCanonicalEspelho
                titulo={`${celulaSnAtiva.card03.numero} — ${celulaSnAtiva.card03.titulo}`}
                cor={celulaSnAtiva.card03.cor}
                badgeExtra={
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      celulaSnAtiva.deltaPct > 0
                        ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                        : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                    }`}
                  >
                    {celulaSnAtiva.deltaPct > 0 ? '+' : ''}
                    {formatNumberBR(celulaSnAtiva.deltaPct, 2)}%
                  </span>
                }
                linhas={celulaSnAtiva.card03.linhas.map((l) => ({
                  label: `${l.sinal} ${l.label}`,
                  formula: l.formula,
                  valor: l.valor,
                  destaque: l.destaque,
                  fundamento: l.fundamento,
                }))}
              />
            </div>
          </div>
        ) : abertoPleno ? (
          /* ======================================================================= */
          /* COMPRADOR PLENO — CAMADA 2: CENÁRIO ABERTO                              */
          /* ======================================================================= */
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
                  onClick={() =>
                    onAbrirCelula(abertoPleno.comprador, abertoPleno.fornecedor, abertoPleno.cell)
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-1 text-[9px] font-mono font-bold text-orange-300 hover:bg-orange-500/20 cursor-pointer"
                >
                  <Calculator className="w-3 h-3" /> Memória + base legal
                </button>
                {row && (
                  <NotaCelulaTrigger
                    inp={input}
                    cell={abertoPleno.cell}
                    row={row}
                    exercicio={exercicio}
                    comprador={abertoPleno.comprador}
                    fornecedor={abertoPleno.fornecedor}
                    repasse={mode}
                    repassePct={baseConfig.repassePct}
                  />
                )}
              </div>
            </div>
            {/* IDENTIFICAÇÃO DA OPERAÇÃO (checagem da CEO, 28/09) — antes dos itens,
                exatamente a combinação do card externo clicado */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.05] p-3 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[12px] font-mono font-black uppercase text-white">
                  OPERAÇÃO ANALISADA: ADQUIRENTE: {nomeRegime(abertoPleno.comprador)} / FORNECEDOR:{' '}
                  {nomeRegime(abertoPleno.fornecedor)}
                </div>
                {abertoPleno.comprador === 'real' && abertoPleno.fornecedor === 'real' && (
                  <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40">
                    Célula Neutra (chancelada)
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-emerald-300 uppercase">
                {repasseTxt} · Exercício {exercicio}
              </div>
              <div className="text-[10px] font-mono text-slate-300">
                Custo líquido {formatBRL(abertoPleno.cell.exercicio.unitario)}/un ·{' '}
                {abertoPleno.cell.deltaPct > 0 ? '+' : ''}
                {formatNumberBR(abertoPleno.cell.deltaPct)}% vs HOJE
                {abertoPleno.cell.exercicio.unitario === menorPleno && ' · MENOR CUSTO DO CENÁRIO'}
                {abertoPleno.comprador === 'real' &&
                  abertoPleno.fornecedor === 'real' &&
                  ' · REPASSE PRESERVA RECEITA LÍQUIDA (31.551,96) E CRÉDITO LAVA O DESTAQUE'}
              </div>
            </div>

            {/* SE FOR A CÉLULA LR × LR: RENDERIZA OS 3 CARDS ABERTOS CANÔNICOS VIA CardMemoriaCanonicalEspelho COM CONTRASTE DIDÁTICO VS LR × LP */}
            {abertoPleno.comprador === 'real' && abertoPleno.fornecedor === 'real' ? (
              <div className="space-y-3">
                {/* Contraste didático vs LR × LP visível na mesma tela */}
                <div className="rounded-lg border border-sky-500/40 bg-sky-950/40 p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-300 font-bold uppercase text-[10px]">
                      Contraste Didático na Mesma Tela:
                    </span>
                    <span className="text-slate-200 text-[11px]">
                      <strong>LR × LR</strong>: custo{' '}
                      {formatBRL(celulaLrXLr.exercicio2027.custoUnitario)}/un (Δ 0,00% · Célula
                      Neutra)
                    </span>
                    <span className="text-slate-500">vs</span>
                    <span className="text-rose-300 text-[11px]">
                      <strong>LR × LP</strong>: custo{' '}
                      {formatBRL(celulaLrXLr.contrasteLp.custoUnitario)}/un (+
                      {formatNumberBR(celulaLrXLr.contrasteLp.deltaPct)}%)
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Na compra de LP, o LR sofre repasse com alíquota maior sem crédito pleno
                    (+6,17%). Na compra de LR, a célula é 100% neutra (0,00%).
                  </div>
                </div>

                {/* Os 3 Cards Abertos (mesmo padrão visual das células SN) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                  {/* CARD 01 */}
                  <CardMemoriaCanonicalEspelho
                    titulo={`${celulaLrXLr.card01.numero} — ${celulaLrXLr.card01.titulo}`}
                    cor={celulaLrXLr.card01.cor}
                    badgeExtra={
                      <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        HOJE 2026
                      </span>
                    }
                    linhas={celulaLrXLr.card01.linhas.map((l) => ({
                      label: `${l.sinal} ${l.label}`,
                      formula: l.formula,
                      valor: l.valor,
                      destaque: l.destaque,
                      fundamento: l.fundamento,
                    }))}
                  />

                  {/* CARD 02 */}
                  <CardMemoriaCanonicalEspelho
                    titulo={`${celulaLrXLr.card02.numero} — ${celulaLrXLr.card02.titulo}`}
                    cor={celulaLrXLr.card02.cor}
                    badgeExtra={
                      <span className="text-[9px] font-mono font-bold text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/30">
                        FORNECEDOR 2027
                      </span>
                    }
                    linhas={celulaLrXLr.card02.linhas.map((l) => ({
                      label: `${l.sinal} ${l.label}`,
                      formula: l.formula,
                      valor: l.valor,
                      destaque: l.destaque,
                      fundamento: l.fundamento,
                    }))}
                  />

                  {/* CARD 03 */}
                  <CardMemoriaCanonicalEspelho
                    titulo={`${celulaLrXLr.card03.numero} — ${celulaLrXLr.card03.titulo}`}
                    cor={celulaLrXLr.card03.cor}
                    badgeExtra={
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border text-emerald-300 bg-emerald-500/10 border-emerald-500/30">
                        0,00% (Neutra)
                      </span>
                    }
                    linhas={celulaLrXLr.card03.linhas.map((l) => ({
                      label: `${l.sinal} ${l.label}`,
                      formula: l.formula,
                      valor: l.valor,
                      destaque: l.destaque,
                      fundamento: l.fundamento,
                    }))}
                  />
                </div>
              </div>
            ) : (
              /* DEMAIS CENÁRIOS PLENOS (LP × LP, LP × LR, LR × LP): OS 6 CARDS POR ITEM */
              <CardMemoriaPorItem
                celulasPorItem={
                  celulasPorItem && celulasPorItem.length > 0
                    ? celulasPorItem.map(({ item }) => ({
                        item,
                        cell: computeCellArt12Item(
                          item,
                          {
                            ...cfg,
                            compradorRegime: abertoPleno.comprador,
                            fornecedorRegime: abertoPleno.fornecedor,
                          },
                          row,
                        ),
                      }))
                    : []
                }
                config={cfg}
                configOverride={{
                  ...cfg,
                  compradorRegime: abertoPleno.comprador,
                  fornecedorRegime: abertoPleno.fornecedor,
                }}
                exercicio={exercicio}
                mode={mode}
                mostrarIdentidade={true}
                onAbrirMemoriaItem={onAbrirMemoriaItem}
              />
            )}
          </div>
        ) : (
          /* ======================================================================= */
          /* COMPRADOR PLENO — CAMADA 1: GRID DOS 4 CARDS PRINCIPAIS                 */
          /* ======================================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {celulasPlenas.map((linha) =>
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
                  <div key={`${linha.comprador}-${fornecedor}`} className="relative flex flex-col">
                    <CardPrincipalCenario
                      celulasItens={celulasItens}
                      comprador={linha.comprador}
                      fornecedor={fornecedor}
                      isMenor={cellComando?.exercicio.unitario === menorPleno}
                      repasseTxt={
                        linha.comprador === 'real' && fornecedor === 'real'
                          ? 'CÉLULA NEUTRA (CHANCELADA)'
                          : repasseTxt
                      }
                      onAbrir={() => setCenarioAberto({ ci: linha.ci, fi })}
                    />
                    {linha.comprador === 'real' && fornecedor === 'real' && (
                      <div className="mt-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[8px] font-mono text-emerald-300 text-center">
                        LR × LR · Δ 0,00% · Célula Neutra (chancelada)
                      </div>
                    )}
                  </div>
                )
              }),
            )}
          </div>
        )}

        <p className="text-[10px] font-mono text-slate-500">
          LP = Lucro Presumido · LR = Lucro Real. Para adquirentes do Simples Nacional (SN puro e SN
          híbrido), o espelho exibe o cenário único chancelado pela Adri, sem composição de repasse,
          com fundamentação legal expressa (art. 13 §1º LC 123/2006; art. 23 LC 123/2006; art. 41 LC
          214/2025). As operações com fornecedor SN vivem na Sessão SN com regras próprias de
          repartição do DAS.
        </p>
      </DialogContent>
    </Dialog>
  )
}
