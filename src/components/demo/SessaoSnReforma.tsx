import React, { useMemo, useState } from 'react'
import { Percent, Calculator, AlertTriangle, ArrowLeft, ArrowDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  calcularSessaoSN,
  creditoEfetivoArt23,
  PERFIL_SN_NOTA_PADRAO,
  type ModoPreenchimentoSN,
  type PerfilSN,
} from '@/lib/art12SnCalculations'
import {
  computeCellArt12Item,
  type CellConfigArt,
  type CellResultArt,
  type ExercicioKey,
  type MemoryLineArt,
  type RegimeId,
  type RepasseMode,
  type ScheduleRowArt,
} from '@/lib/art12Calculations'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'
import { CardEstoqueReajustado, type LinhaEstoqueSN } from './CardEstoqueReajustado'
import { ComparadorFornecedoresDialog } from './ComparadorFornecedoresDialog'
import { ArrowLeftRight } from 'lucide-react'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * ============================================================================
 * SESSÃO "SN NA REFORMA" — REARRANJO (decisão da CEO, 29/09)
 * Todas as operações com Simples Nacional saem do espelho LP/LR e vivem AQUI,
 * organizadas por FORNECEDOR (SN puro × SN híbrido) × 4 adquirentes.
 * Réguas de repasse SÓ para fornecedor híbrido — fornecedor SN puro tem nota
 * congelada: "repasse não se aplica".
 * Regras de crédito cravadas (art. 23 LC 123/2006, redação LC 214/25):
 *   · LP/LR comprando de SN puro  → crédito PROPORCIONAL (ICMS+CBS+IBS da faixa)
 *   · SNH comprando de SN puro    → crédito PROPORCIONAL de CBS+IBS (ICMS segue no DAS)
 *   · SN comprando de SN puro     → SEM crédito (optante não apropria — art. 47)
 *   · Fornecedor híbrido          → motor Art. 12 chancelado (crédito integral)
 * Alíquota efetiva INFORMADA pelo contador (nota ou anexo+faixa+RBT12) alimenta
 * os dois fluxos — crédito proporcional e base limpa do híbrido.
 * COMPARAÇÃO SEMPRE VISÍVEL (siga 29/09): cada card mostra o custo do fornecedor
 * selecionado E o do outro — puro × híbrido lado a lado na camada 1.
 * Ouros do Art. 12 intactos — camada própria, motor art12SnCalculations.
 * ============================================================================
 */

const ADQUIRENTES: { id: RegimeId; label: string; nome: string }[] = [
  { id: 'presumido', label: 'LP', nome: 'Lucro Presumido' },
  { id: 'real', label: 'LR', nome: 'Lucro Real' },
  { id: 'simples', label: 'SN', nome: 'Simples Nacional' },
  { id: 'simples_hibrido', label: 'SN híb', nome: 'SN híbrido' },
]

const nomeAdquirente = (id: RegimeId) => ADQUIRENTES.find((a) => a.id === id)?.nome || '—'

function LinhaSN({
  line,
}: {
  line: {
    label: string
    formula: string
    value: number
    destaque?: boolean
    fundamento?: string
  }
}) {
  const isPct = line.label.startsWith('(i)') && line.value < 100 && line.label.includes('efetiva')
  return (
    <div
      className={`flex items-start justify-between gap-2 px-2 py-1 rounded-lg border ${
        line.destaque
          ? 'bg-emerald-500/10 border-emerald-500/40'
          : 'bg-slate-950/50 border-slate-800/60'
      }`}
    >
      <div className="min-w-0">
        <span
          className={`text-[10px] font-mono font-semibold block leading-tight ${line.destaque ? 'text-emerald-300' : 'text-slate-200'}`}
        >
          {line.label}
        </span>
        {line.formula && (
          <span className="text-[9px] font-mono text-slate-500 leading-tight block break-words">
            {line.formula}
          </span>
        )}
        {line.fundamento && (
          <span className="text-[8px] font-mono text-sky-400/80 block mt-0.5">
            {line.fundamento}
          </span>
        )}
      </div>
      <span
        className={`text-[10px] font-mono font-bold shrink-0 ${
          line.value < 0
            ? 'text-emerald-300'
            : line.destaque
              ? 'text-emerald-300'
              : line.value > 0
                ? 'text-slate-100'
                : 'text-slate-500'
        }`}
      >
        {isPct ? `${formatNumberBR(line.value)}%` : formatBRL(line.value)}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* DETALHE POR ITEM — SN PURO (memória completa do fluxo por dentro)   */
/* ------------------------------------------------------------------ */
function DetalheItemSNPuro({
  item,
  perfil,
  resultado,
  custoPlenoUnitario,
}: {
  item: ItemIntegracaoArt12
  perfil: PerfilSN
  resultado: ReturnType<typeof calcularSessaoSN>
  custoPlenoUnitario: number
}) {
  const gap = resultado.custoUnitarioLiquido - custoPlenoUnitario
  return (
    <div className="space-y-2">
      {/* 2 — Cálculo guiado */}
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.05] p-3 space-y-1">
        <span className="text-[11px] font-mono font-black uppercase text-emerald-300 block">
          2 · Cálculo guiado — memória detalhada ({item.name || 'item'})
        </span>
        {resultado.memoria
          .filter((l) =>
            [
              'mercadorias',
              'frete',
              'receitabruta',
              'efetiva',
              'das',
              'icmsnota',
              'cbsdas',
              'ibsdas',
              'preconota',
            ].includes(l.key),
          )
          .map((l) => (
            <LinhaSN key={l.key} line={l} />
          ))}
      </div>
      {/* 3 — Crédito proporcional */}
      <div className="rounded-xl border border-amber-500/45 bg-amber-500/[0.06] p-3 space-y-1">
        <span className="text-[11px] font-mono font-black uppercase text-amber-300 block">
          3 · Crédito proporcional do ADQUIRENTE (art. 23) — o coração da sessão
        </span>
        {resultado.memoria
          .filter((l) =>
            [
              'credito_base',
              'credito_icms',
              'credito_cbs',
              'credito_ibs',
              'credito_total',
              'credito_unidade',
            ].includes(l.key),
          )
          .map((l) => (
            <LinhaSN key={l.key} line={l} />
          ))}
      </div>
      {/* 4 — Leitura de negociação */}
      <div className="rounded-xl border border-orange-500/45 bg-orange-500/[0.06] p-3 space-y-1">
        <span className="text-[11px] font-mono font-black uppercase text-orange-300 block">
          4 · Leitura de negociação — custo líquido do adquirente
        </span>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/50 border border-slate-800/60">
          <span className="text-[10px] font-mono text-slate-200">
            Preço da nota do fornecedor SN (sem crédito — mundo antigo)
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-100">
            {formatBRL(resultado.receitaBruta)}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/50 border border-slate-800/60">
          <span className="text-[10px] font-mono text-slate-200">
            (−) Crédito proporcional do art. 23
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-300">
            -{formatBRL(resultado.creditoTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/40">
          <span className="text-[10px] font-mono font-bold text-emerald-300">
            (=) CUSTO LÍQUIDO COM O ART. 23
          </span>
          <span className="text-[11px] font-black font-mono text-emerald-300">
            {formatBRL(resultado.custoUnitarioLiquido)}/un
          </span>
        </div>
        {/* HOJE DA PRÓPRIA COMBINAÇÃO (CEO, 02/10): crédito de 2026 = SÓ ICMS (redação
            original do art. 23; CBS+IBS entram com a LC 214/25 em 2027) */}
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/40">
          <span className="text-[10px] font-mono font-bold text-violet-300">
            📌 HOJE (2026) comprando de fornecedor SN — crédito proporcional só de ICMS (redação
            original do art. 23)
          </span>
          <span className="text-[11px] font-black font-mono text-violet-300">
            {formatBRL(resultado.custoUnitarioHojeSN)}/un
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/50 border border-slate-800/60">
          <span className="text-[10px] font-mono text-slate-200">
            Δ vs HOJE-SN (mesma combinação — mede só a REFORMA)
          </span>
          <span
            className={`text-[10px] font-mono font-bold ${
              resultado.custoUnitarioLiquido > resultado.custoUnitarioHojeSN
                ? 'text-rose-300'
                : resultado.custoUnitarioLiquido < resultado.custoUnitarioHojeSN
                  ? 'text-emerald-300'
                  : 'text-slate-400'
            }`}
          >
            {resultado.custoUnitarioHojeSN > 0
              ? `${((resultado.custoUnitarioLiquido / resultado.custoUnitarioHojeSN - 1) * 100).toFixed(2).replace('.', ',')}%`
              : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/50 border border-slate-800/60">
          <span className="text-[10px] font-mono text-slate-200">
            Comparativo: comprar de fornecedor LP (célula LP×LP chancelada)
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-100">
            {formatBRL(custoPlenoUnitario)}/un
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/40">
          <span className="text-[10px] font-mono font-bold text-orange-300">
            Gap de negociação — o que o fornecedor SN precisa compensar em preço
          </span>
          <span className="text-[11px] font-black font-mono text-orange-300">
            {formatBRL(gap)}/un
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* MODELO CANÔNICO DA CEO (29/09): 3 CARDS LADO A LADO NO DETALHE      */
/* Card 1º — memória da aquisição em 2026 (HOJE, pré-reforma)          */
/* Card 2º — formação do preço do fornecedor (SN puro: POR DENTRO,    */
/*           nota congelada; híbrido: base limpa + CBS/IBS por fora)  */
/* Card 3º — custo do adquirente com ajuste pós-reforma               */
/* ------------------------------------------------------------------ */
function CardMemoriaCanonical({
  titulo,
  cor,
  linhas,
}: {
  titulo: string
  cor: 'emerald' | 'violet' | 'orange' | 'sky'
  linhas: { label: string; formula?: string; value: number; destaque?: boolean; kind?: string }[]
}) {
  // 'sky' = card de DESTAQUE (CEO, 02/10): fundo mais preenchido para o 1º-B —
  // ao bater o olho o contador enxerga os dois pontos de comparação.
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
    <div className={`flex-1 min-w-[240px] rounded-xl border p-3 space-y-1 ${corCls}`}>
      <span
        className={`text-[10px] font-mono font-black uppercase leading-tight block ${tituloCls}`}
      >
        {titulo}
      </span>
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
              <span className="text-[9px] font-mono text-slate-500 block break-words leading-tight">
                {l.formula}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] font-mono font-bold shrink-0 ${l.value < 0 ? 'text-emerald-300' : l.destaque ? 'text-white' : 'text-slate-100'}`}
          >
            {l.kind === 'nota' && l.value === 0 ? '—' : formatBRL(l.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* SEÇÃO ORQUESTRADORA — 12 combinações SN × adquirentes               */
/* ------------------------------------------------------------------ */
export function SessaoSnSection({
  itensOrigem,
  config,
  row,
  exercicio,
  custoPlenoUnitario,
  onAbrirMemoriaItem,
}: {
  itensOrigem: ItemIntegracaoArt12[]
  config: CellConfigArt
  row: ScheduleRowArt
  exercicio: ExercicioKey
  /** Custo unitário da célula plena de referência (LP×LP chancelada) — régua da negociação. */
  custoPlenoUnitario: number
  /** Abre a memória Art. 12 completa (dialog do módulo) para o híbrido. */
  onAbrirMemoriaItem?: (item: ItemIntegracaoArt12, cell: CellResultArt) => void
}) {
  const itens = useMemo(() => itensOrigem.filter((i) => i.valorNota > 0), [itensOrigem])

  // Estado da combinação
  const [fornecedorSN, setFornecedorSN] = useState<'puro' | 'hibrido'>('puro')
  const [adquirente, setAdquirente] = useState<RegimeId>('presumido')
  const [repasse, setRepasse] = useState<RepasseMode>('integral')
  const [repassePct, setRepassePct] = useState(50)
  const [idxItem, setIdxItem] = useState(0)
  const [detalheAberto, setDetalheAberto] = useState(false)
  const [comparadorAberto, setComparadorAberto] = useState(false)

  // Estado da alíquota efetiva INFORMADA (um campo, dois fluxos)
  const [modo, setModo] = useState<ModoPreenchimentoSN>('nota')
  const [icmsNotaPct, setIcmsNotaPct] = useState(PERFIL_SN_NOTA_PADRAO.icmsNotaPct)
  const [cbsNotaPct, setCbsNotaPct] = useState(PERFIL_SN_NOTA_PADRAO.cbsNotaPct)
  const [ibsNotaPct, setIbsNotaPct] = useState(PERFIL_SN_NOTA_PADRAO.ibsNotaPct)
  const [anexo, setAnexo] = useState(PERFIL_SN_NOTA_PADRAO.anexo)
  const [faixa, setFaixa] = useState(PERFIL_SN_NOTA_PADRAO.faixa)
  const [rbt12, setRbt12] = useState(PERFIL_SN_NOTA_PADRAO.rbt12)
  const [efetivaPct, setEfetivaPct] = useState(PERFIL_SN_NOTA_PADRAO.efetivaPct)
  const [icmsFracPct, setIcmsFracPct] = useState(PERFIL_SN_NOTA_PADRAO.icmsFracPct)

  const perfil: PerfilSN = useMemo(
    () => ({
      modo,
      icmsNotaPct,
      cbsNotaPct,
      ibsNotaPct,
      anexo,
      faixa,
      rbt12,
      efetivaPct,
      icmsFracPct,
    }),
    [modo, icmsNotaPct, cbsNotaPct, ibsNotaPct, anexo, faixa, rbt12, efetivaPct, icmsFracPct],
  )

  const cfgBase: CellConfigArt = useMemo(
    () => ({ ...config, repasse, repassePct }),
    [config, repasse, repassePct],
  )

  // RESULTADO POR ITEM — OS DOIS FORNECEDORES SEMPRE (comparação lado a lado, siga 29/09)
  const resultados = useMemo(() => {
    if (itens.length === 0) return []
    return itens.map((item) => {
      // --- SN PURO: nota congelada + crédito proporcional do art. 23 (motor da sessão)
      const r = calcularSessaoSN(item, perfil)
      const cellHojePuro = computeCellArt12Item(
        item,
        { ...cfgBase, compradorRegime: adquirente, fornecedorRegime: adquirente },
        row,
      )
      // REGRA DE CRÉDITO (art. 23 + art. 47): quem apropria o quê — função pura blindada.
      const creditoEfetivo = creditoEfetivoArt23(adquirente, r)
      const custoLiquidoPuro = r.receitaBruta - creditoEfetivo
      const unitarioPuro = custoLiquidoPuro / Math.max(1, item.quantity)
      // Δ HONESTO (CEO, 02/10): compara 2027-SN × 2026-SN (MESMA combinação) — mede só a
      // REFORMA. HOJE-SN = nota congelada − crédito de 2026 (só ICMS: redação original do
      // art. 23; CBS+IBS entram com a LC 214/25 em 2027). O Δ vs baseline plena segue
      // disponível como GAP DE NEGOCIAÇÃO (troca de fornecedor).
      const deltaPctPuro =
        r.custoUnitarioHojeSN > 0
          ? ((unitarioPuro - r.custoUnitarioHojeSN) / r.custoUnitarioHojeSN) * 100
          : 0
      // --- SN HÍBRIDO: motor Art. 12 CHANCELADO (crédito integral, premissa IT)
      const cellHib = computeCellArt12Item(
        item,
        { ...cfgBase, compradorRegime: adquirente, fornecedorRegime: 'simples_hibrido' },
        row,
      )
      return {
        item,
        puro: {
          unitario: unitarioPuro,
          deltaPct: deltaPctPuro,
          r,
          creditoEfetivo,
          // HOJE-SN (2026, crédito só de ICMS) — baseline da combinação (Δ honesto)
          cellHojeUnitario: r.custoUnitarioHojeSN,
          // Linhas HOJE para o CARD 1º do detalhe (modelo canônico da CEO)
          cellHojeLinhas: cellHojePuro.hoje.lines,
        },
        hibrido: {
          unitario: cellHib.exercicio.unitario,
          deltaPct: cellHib.deltaPct,
          cell: cellHib,
          cellHojeUnitario: cellHib.hoje.unitario,
          // Linhas HOJE para o CARD 1º do detalhe (modelo canônico da CEO)
          cellHojeLinhas: cellHib.hoje.lines,
        },
      }
    })
  }, [itens, adquirente, cfgBase, row, perfil])

  const itemAtivo = resultados[Math.min(idxItem, Math.max(0, resultados.length - 1))]
  const ativo = itemAtivo ? (fornecedorSN === 'puro' ? itemAtivo.puro : itemAtivo.hibrido) : null
  const exibidos = resultados.slice(0, 3)
  const restantes = resultados.length - exibidos.length

  const semOrigem = itens.length === 0

  return (
    <div
      id="sessao-sn"
      className="rounded-xl border border-violet-500/40 bg-violet-500/[0.04] p-4 space-y-3"
    >
      {/* Cabeçalho */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-violet-400" />
          <span className="text-xs font-mono font-black uppercase tracking-wider text-violet-300">
            Sessão SN na Reforma — tratamento diferenciado para optantes
          </span>
        </div>
        <p className="text-[10px] font-mono text-slate-400">
          Todas as operações com Simples Nacional — LC 123/2006, art. 23, §§1º–2º (redação LC
          214/2025) · por item da Calculadora de Compras (nunca média) · motor próprio; o Art. 12
          consolidado não é alterado
        </p>
      </div>

      {semOrigem ? (
        <p className="text-[10px] font-mono text-slate-400">
          Nenhum item com valor na Calculadora de Compras — lance os itens para calcular o crédito
          proporcional do adquirente (art. 23 da LC 123/2006).
        </p>
      ) : (
        <>
          {/* 1 — Contexto: alíquota efetiva INFORMADA (um campo, dois fluxos) */}
          <div className="rounded-xl border border-sky-500/40 bg-sky-500/[0.05] p-3 space-y-2">
            <span className="text-[11px] font-mono font-black uppercase text-sky-300 block">
              1 · Contexto da operação — alíquota efetiva do fornecedor (informada por vc)
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setModo('nota')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  modo === 'nota'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Preencher pelo percentual da NOTA
              </button>
              <button
                type="button"
                onClick={() => setModo('anexo')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  modo === 'anexo'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Preencher por Anexo + Faixa + RBT12
              </button>
            </div>
            {modo === 'nota' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block">
                    % ICMS da nota
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={icmsNotaPct}
                    onChange={(e) => setIcmsNotaPct(Number(e.target.value) || 0)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block">
                    % CBS da nota
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cbsNotaPct}
                    onChange={(e) => setCbsNotaPct(Number(e.target.value) || 0)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block">
                    % IBS da nota
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={ibsNotaPct}
                    onChange={(e) => setIbsNotaPct(Number(e.target.value) || 0)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] px-2 py-1.5">
                  <span className="text-[8px] font-mono text-slate-500 uppercase block">
                    Origem
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-300">
                    DOCUMENTO FISCAL
                  </span>
                  <span className="text-[8px] font-mono text-emerald-400/80 block">
                    padrão ouro — art. 23, §2º
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block">
                    Anexo
                  </label>
                  <Input
                    value={anexo}
                    onChange={(e) => setAnexo(e.target.value)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block">
                    Faixa
                  </label>
                  <Input
                    value={faixa}
                    onChange={(e) => setFaixa(e.target.value)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block">
                    RBT12 (R$)
                  </label>
                  <Input
                    type="number"
                    value={rbt12}
                    onChange={(e) => setRbt12(Number(e.target.value) || 0)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block">
                    Alíquota efetiva (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={efetivaPct}
                    onChange={(e) => setEfetivaPct(Number(e.target.value) || 0)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block">
                    Fração ICMS no anexo (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={icmsFracPct}
                    onChange={(e) => setIcmsFracPct(Number(e.target.value) || 0)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="col-span-2 sm:col-span-5 rounded-lg border border-amber-500/40 bg-amber-500/[0.06] px-2 py-1">
                  <span className="text-[9px] font-mono font-bold text-amber-300 uppercase">
                    ESTIMADO pela faixa — premissa declarada (não é dado do documento fiscal)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2 — A combinação: fornecedor × adquirente (+ repasse quando couber) */}
          <div className="rounded-xl border border-violet-500/40 bg-violet-500/[0.05] p-3 space-y-2">
            <span className="text-[11px] font-mono font-black uppercase text-violet-300 block">
              2 · A combinação — fornecedor SN × adquirente
            </span>
            {/* Fornecedor */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase w-20">Fornecedor</span>
              <button
                type="button"
                onClick={() => setFornecedorSN('puro')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  fornecedorSN === 'puro'
                    ? 'bg-violet-500 text-slate-950 border-violet-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                SN puro (DAS por dentro)
              </button>
              <button
                type="button"
                onClick={() => setFornecedorSN('hibrido')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  fornecedorSN === 'hibrido'
                    ? 'bg-violet-500 text-slate-950 border-violet-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                SN híbrido (regime regular IBS/CBS)
              </button>
            </div>
            {/* Adquirente */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase w-20">Adquirente</span>
              {ADQUIRENTES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAdquirente(a.id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                    adquirente === a.id
                      ? 'bg-orange-500 text-slate-950 border-orange-400'
                      : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {/* Repasse — SÓ quando o fornecedor reprecifica (híbrido) */}
            {fornecedorSN === 'hibrido' ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-mono text-slate-500 uppercase w-20">Repasse</span>
                {[
                  { m: 'integral' as RepasseMode, l: 'Integral' },
                  { m: 'parcial' as RepasseMode, l: `Parcial ${formatNumberBR(repassePct)}%` },
                  { m: 'nenhum' as RepasseMode, l: 'Nenhum' },
                ].map(({ m, l }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRepasse(m)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                      repasse === m
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {l}
                  </button>
                ))}
                {repasse === 'parcial' && (
                  <Input
                    type="number"
                    value={repassePct}
                    onChange={(e) =>
                      setRepassePct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                    }
                    className="w-20 h-7 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/50 border border-slate-800/60 rounded-lg p-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
                <span>
                  Repasse não se aplica — fornecedor SN puro não reprecifica por destaque: tributos
                  por dentro do DAS, nota congelada (LC 123/2006).
                </span>
              </div>
            )}
            {/* Regra de crédito da combinação */}
            <div className="text-[9px] font-mono text-slate-400">
              {fornecedorSN === 'hibrido' ? (
                <span>
                  Crédito INTEGRAL ao adquirente (art. 47) — motor Art. 12 chancelado · premissa IT:
                  base do IBS/CBS do fornecedor sem ICMS.
                </span>
              ) : adquirente === 'simples' ? (
                <span className="text-amber-300">
                  SEM crédito — adquirente optante do SN não apropria crédito de nota SN (art. 47).
                </span>
              ) : adquirente === 'simples_hibrido' ? (
                <span>
                  Crédito PROPORCIONAL de CBS+IBS (art. 23) — o ICMS do fornecedor segue no DAS e o
                  SN híbrido não o apropria.
                </span>
              ) : (
                <span>
                  Crédito PROPORCIONAL de ICMS+CBS+IBS (art. 23) — montante equivalente ao cobrado
                  no regime único, alíquota informada no documento fiscal.
                </span>
              )}
            </div>
            {/* GATILHO DO COMPARADOR (aprovado pela CEO na prévia, 30/09) */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setComparadorAberto(true)}
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer h-7 text-[10px] self-start"
            >
              <ArrowLeftRight className="w-3 h-3 mr-1" /> Comparar fornecedores SN puro × híbrido
            </Button>
          </div>

          {/* 3 — Camada 1: resumo por item (ABC, nunca média) COM os dois fornecedores */}
          <div className="rounded-xl border border-orange-500/45 bg-orange-500/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-black uppercase text-orange-300">
                3 · Custo líquido do adquirente — {nomeAdquirente(adquirente)} · Exercício{' '}
                {exercicio}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDetalheAberto((o) => !o)}
                className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 cursor-pointer h-7 text-[10px]"
              >
                {detalheAberto ? (
                  <>
                    <ArrowDown className="w-3 h-3 mr-1" /> Fechar detalhe
                  </>
                ) : (
                  <>
                    <Calculator className="w-3 h-3 mr-1" /> Abrir detalhe por item
                  </>
                )}
              </Button>
            </div>
            {/* CARDS COMPACTOS LADO A LADO (preferência da CEO) — custo selecionado + o OUTRO fornecedor.
                4 colunas já a partir de telas médias — caixas pequenas, nunca largura total. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {exibidos.map((res, i) => {
                const sel = fornecedorSN === 'puro' ? res.puro : res.hibrido
                // RÓTULO DO REGIME SELECIONADO no card (fix CEO 30/09): o card se identifica
                // pelo regime ESCOLHIDO. Comparação puro × híbrido REMOVIDA dos cards (CEO,
                // 30/09): para o contador, a linha "vs" podia parecer resultado de outro
                // regime — a comparação segue disponível no detalhe e no estoque.
                const selLabel = fornecedorSN === 'puro' ? 'SN puro' : 'SN híbrido'
                return (
                  <button
                    key={res.item.id}
                    type="button"
                    onClick={() => {
                      setIdxItem(i)
                      setDetalheAberto(true)
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-left cursor-pointer ${
                      i === idxItem && detalheAberto
                        ? 'bg-orange-500/10 border-orange-500/40'
                        : 'bg-slate-950/50 border-slate-800/60 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold uppercase text-orange-300 truncate block max-w-full">
                      {res.item.name || 'Item'}
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase text-violet-300 block leading-tight">
                      {selLabel}
                    </span>
                    <span className="text-[11px] font-black text-orange-200 font-mono block leading-tight mt-0.5">
                      {formatBRL(sel.unitario)}/un
                    </span>
                    <span
                      className={`text-[9px] font-mono ${
                        sel.deltaPct > 0
                          ? 'text-rose-300'
                          : sel.deltaPct < 0
                            ? 'text-emerald-300'
                            : 'text-slate-400'
                      }`}
                    >
                      {sel.deltaPct > 0 ? '+' : ''}
                      {formatNumberBR(sel.deltaPct)}% vs HOJE
                    </span>
                  </button>
                )
              })}
            </div>
            {restantes > 0 && (
              <div className="text-[9px] font-mono text-slate-500">
                +{restantes} item{restantes === 1 ? '' : 's'} — cálculo por item, cada um com a
                própria célula (nunca média)
              </div>
            )}
            {/* Gap de negociação — item de maior valor */}
            {itemAtivo && ativo && (
              <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/40">
                <span className="text-[10px] font-mono font-bold text-violet-300">
                  Gap de negociação vs célula plena de referência ({formatBRL(custoPlenoUnitario)}
                  /un) — {itemAtivo.item.name || 'item'}
                </span>
                <span className="text-[11px] font-black font-mono text-violet-300">
                  {formatBRL(ativo.unitario - custoPlenoUnitario)}/un
                </span>
              </div>
            )}
          </div>

          {/* 4 — Camada 2: detalhe por item — MODELO CANÔNICO DA CEO (29/09):
              3 CARDS DE MEMÓRIA LADO A LADO — 1º aquisição 2026 · 2º formação do preço
              do fornecedor · 3º custo do adquirente ajustado. Botões por produto e demais
              estruturas da sessão ficam INTACTOS. */}
          {detalheAberto && itemAtivo && ativo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-mono font-bold uppercase text-slate-300">
                  Detalhe — {itemAtivo.item.name || 'item'} ·{' '}
                  {fornecedorSN === 'puro' ? 'SN puro (por dentro)' : 'SN híbrido (regime regular)'}{' '}
                  × {nomeAdquirente(adquirente)}
                </span>
              </div>
              {/* CARDS DO DETALHE — modelo CEO (02/10): 1º-A fornecedor pleno (baseline) +
                  1º-B fornecedor SN em 2026 (DESTAQUE sky) + 2º fornecedor + 3º adquirente.
                  O 1º-B existe só no fluxo SN puro: em 2026 não há fornecedor híbrido
                  (a opção da janela set/2026 produz efeitos em 01/01/2027). */}
              <div className="flex flex-col lg:flex-row gap-2 items-stretch">
                {/* CARD 1º-A — MEMÓRIA DE CÁLCULO DA AQUISIÇÃO EM 2026 · FORNECEDOR PLENO
                    (baseline de referência — fica como está) */}
                <CardMemoriaCanonical
                  titulo={`CARD 1º-A — MEMÓRIA DE CÁLCULO DA AQUISIÇÃO EM 2026 · COMPRA DE FORNECEDOR PLENO (baseline de referência) · ${itemAtivo.item.name || 'item'}`}
                  cor="emerald"
                  linhas={itemAtivo[
                    fornecedorSN === 'puro' ? 'puro' : 'hibrido'
                  ].cellHojeLinhas.map((l: MemoryLineArt) => ({
                    label: l.label,
                    formula: l.formula,
                    value: l.value,
                    destaque: !!l.subtotal,
                    kind: l.kind,
                  }))}
                />
                {/* CARD 1º-B — HOJE (2026) COMPRANDO DE FORNECEDOR SN — DESTAQUE (CEO, 02/10):
                    memória detalhada no padrão canônico. Crédito de 2026 = SÓ ICMS (redação
                    original do art. 23; a redação LC 214/25 com CBS+IBS produz efeitos em
                    01/01/2027 — LegJur). Nota congelada nos dois lados. */}
                {fornecedorSN === 'puro' && (
                  <CardMemoriaCanonical
                    titulo={`CARD 1º-B — HOJE (2026) COMPRANDO DE FORNECEDOR SN · ${itemAtivo.item.name || 'item'}`}
                    cor="sky"
                    linhas={[
                      {
                        label: '(+) Valor da operação — nota congelada (sem destaque)',
                        formula: `${itemAtivo.item.quantity} un. × ${fmtSN(itemAtivo.item.merchandiseValue / Math.max(1, itemAtivo.item.quantity))} — da Calculadora de Compras`,
                        value: itemAtivo.puro.r.receitaBruta,
                      },
                      {
                        label: '(−) Crédito proporcional do adquirente — SÓ ICMS em 2026',
                        formula: `${fmtSN(itemAtivo.puro.r.icmsPct, 2)}% × ${fmtSN(itemAtivo.puro.r.receitaBruta)} = ${fmtSN(itemAtivo.puro.r.icmsNota)}`,
                        value: -itemAtivo.puro.r.creditoHojeSN,
                        destaque: true,
                      },
                      {
                        label: '(=) Custo líquido da aquisição em 2026',
                        formula: `${fmtSN(itemAtivo.puro.r.receitaBruta)} − ${fmtSN(itemAtivo.puro.r.creditoHojeSN)} = ${fmtSN(itemAtivo.puro.r.custoHojeSN)}`,
                        value: itemAtivo.puro.r.custoHojeSN,
                      },
                      {
                        label: '(÷) CUSTO UNITÁRIO — HOJE-SN',
                        formula: `${fmtSN(itemAtivo.puro.r.custoHojeSN)} ÷ ${itemAtivo.item.quantity} un.`,
                        value: itemAtivo.puro.r.custoUnitarioHojeSN,
                        destaque: true,
                      },
                    ]}
                  />
                )}
                {/* CARD 2º — MEMÓRIA DE CÁLCULO DA FORMAÇÃO DE PREÇO DO FORNECEDOR */}
                {fornecedorSN === 'puro' ? (
                  <CardMemoriaCanonical
                    titulo={`CARD 2º — FORMAÇÃO DE PREÇO DO FORNECEDOR SN PURO (POR DENTRO) · ${itemAtivo.item.name || 'item'}`}
                    cor="violet"
                    linhas={itemAtivo.puro.r.memoria
                      .filter((l) =>
                        [
                          'receitabruta',
                          'efetiva',
                          'das',
                          'icmsnota',
                          'cbsdas',
                          'ibsdas',
                          'preconota',
                        ].includes(l.key),
                      )
                      .map((l) => ({
                        label: l.label,
                        formula: l.formula,
                        value: l.value,
                        destaque: l.destaque || l.key === 'preconota',
                      }))}
                  />
                ) : (
                  <CardMemoriaCanonical
                    titulo={`CARD 2º — FORMAÇÃO DE PREÇO DO FORNECEDOR SN HÍBRIDO (BASE LIMPA + CBS/IBS POR FORA) · ${itemAtivo.item.name || 'item'}`}
                    cor="violet"
                    linhas={itemAtivo.hibrido.cell.exercicio.lines
                      .filter((l) => l.bloco === 1)
                      .map((l: MemoryLineArt) => ({
                        label: l.label,
                        formula: l.formula,
                        value: l.value,
                        destaque: !!l.subtotal,
                        kind: l.kind,
                      }))}
                  />
                )}
                {/* CARD 3º — MEMÓRIA DE CÁLCULO DO ADQUIRENTE COM AJUSTE PÓS-REFORMA */}
                {fornecedorSN === 'puro' ? (
                  <CardMemoriaCanonical
                    titulo={`CARD 3º — CUSTO DO ADQUIRENTE COM AJUSTE PÓS-REFORMA (ART. 23) · ${itemAtivo.item.name || 'item'}`}
                    cor="orange"
                    linhas={itemAtivo.puro.r.memoria
                      .filter((l) =>
                        [
                          'credito_base',
                          'credito_icms',
                          'credito_cbs',
                          'credito_ibs',
                          'credito_total',
                          'credito_unidade',
                          'custoliquido',
                          'custounitario',
                        ].includes(l.key),
                      )
                      .map((l) => ({
                        label: l.label,
                        formula: l.formula,
                        value: l.value,
                        destaque: l.destaque,
                      }))}
                  />
                ) : (
                  <CardMemoriaCanonical
                    titulo={`CARD 3º — CUSTO DO ADQUIRENTE COM AJUSTE PÓS-REFORMA · ${itemAtivo.item.name || 'item'}`}
                    cor="orange"
                    linhas={itemAtivo.hibrido.cell.exercicio.lines
                      .filter((l) => l.bloco === 2)
                      .map((l: MemoryLineArt) => ({
                        label: l.label,
                        formula: l.formula,
                        value: l.value,
                        destaque: !!l.subtotal,
                        kind: l.kind,
                      }))}
                  />
                )}
              </div>
              {fornecedorSN === 'hibrido' && onAbrirMemoriaItem && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAbrirMemoriaItem(itemAtivo.item, itemAtivo.hibrido.cell)}
                  className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10 cursor-pointer h-7 text-[10px] self-start"
                >
                  <Calculator className="w-3 h-3 mr-1" /> Memória + base legal deste item
                </Button>
              )}
            </div>
          )}

          {/* 5 — CARD 3 do desenho da CEO: nova composição do custo do estoque (IBS/CBS) */}
          <CardEstoqueReajustado
            exercicio={exercicio}
            fornecedorTxt={
              fornecedorSN === 'puro'
                ? 'fornecedor SN puro (nota congelada + crédito proporcional do art. 23)'
                : 'fornecedor SN híbrido (regime regular — crédito integral, motor Art. 12 chancelado)'
            }
            linhas={resultados.map<LinhaEstoqueSN>((res) => {
              const sel = fornecedorSN === 'puro' ? res.puro : res.hibrido
              return {
                id: res.item.id,
                nome: res.item.name || 'Item',
                qtd: res.item.quantity,
                // HOJE = custo de aquisição pré-reforma do PRÓPRIO adquirente (baseline da sessão)
                custoHoje: sel.cellHojeUnitario,
                custoNovo: sel.unitario,
                deltaPct: sel.deltaPct,
              }
            })}
          />

          {/* Nota de honestidade */}
          <div className="flex items-start gap-2 text-[9px] font-mono text-slate-500">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>
              Percentuais de partilha e crédito dependem da faixa do fornecedor no mês da operação e
              da regulamentação em curso (art. 23, §2º: alíquota informada no documento fiscal). A
              sessão calcula com o dado que o contador informa — estimativas ficam marcadas como
              estimadas.
            </span>
          </div>

          {/* COMPARADOR DE FORNECEDORES SN (aprovado pela CEO na prévia, 30/09) */}
          <ComparadorFornecedoresDialog
            open={comparadorAberto}
            onOpenChange={setComparadorAberto}
            itens={itens}
            perfil={perfil}
            adquirente={adquirente}
            cfgBase={cfgBase}
            row={row}
            exercicio={exercicio}
            custoPlenoUnitario={custoPlenoUnitario}
          />
        </>
      )}
    </div>
  )
}
