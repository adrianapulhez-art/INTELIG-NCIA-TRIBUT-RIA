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
  type RegimeId,
  type RepasseMode,
  type ScheduleRowArt,
} from '@/lib/art12Calculations'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'
import { CardEstoqueReajustado, type LinhaEstoqueSN } from './CardEstoqueReajustado'
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
      const deltaPctPuro =
        cellHojePuro.hoje.unitario > 0
          ? ((unitarioPuro - cellHojePuro.hoje.unitario) / cellHojePuro.hoje.unitario) * 100
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
          cellHojeUnitario: cellHojePuro.hoje.unitario,
        },
        hibrido: {
          unitario: cellHib.exercicio.unitario,
          deltaPct: cellHib.deltaPct,
          cell: cellHib,
          cellHojeUnitario: cellHib.hoje.unitario,
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
            {/* CARDS COMPACTOS LADO A LADO (preferência da CEO) — custo selecionado + o OUTRO fornecedor */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {exibidos.map((res, i) => {
                const sel = fornecedorSN === 'puro' ? res.puro : res.hibrido
                const outro = fornecedorSN === 'puro' ? res.hibrido : res.puro
                const outroLabel = fornecedorSN === 'puro' ? 'SN híbrido' : 'SN puro'
                const diff = sel.unitario - outro.unitario
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
                    {/* COMPARAÇÃO — o outro fornecedor, sempre visível */}
                    <span className="text-[9px] font-mono text-slate-400 block mt-1 border-t border-slate-800/60 pt-1">
                      {outroLabel}: {formatBRL(outro.unitario)}/un
                      <span
                        className={`ml-1 font-bold ${
                          diff > 0.005
                            ? 'text-rose-300'
                            : diff < -0.005
                              ? 'text-emerald-300'
                              : 'text-slate-500'
                        }`}
                      >
                        ({diff > 0 ? '+' : ''}
                        {formatBRL(diff)})
                      </span>
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

          {/* 4 — Camada 2: detalhe por item */}
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
              {fornecedorSN === 'puro' ? (
                <DetalheItemSNPuro
                  item={itemAtivo.item}
                  perfil={perfil}
                  resultado={itemAtivo.puro.r}
                  custoPlenoUnitario={custoPlenoUnitario}
                />
              ) : (
                <div className="space-y-2">
                  {/* Híbrido: memória do motor chancelado, por item */}
                  {(['hoje', 'exercicio'] as const).map((lado) => (
                    <div
                      key={lado}
                      className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3 space-y-1"
                    >
                      <span className="text-[10px] font-mono font-black uppercase text-slate-300 block">
                        {lado === 'hoje' ? 'HOJE (pré-reforma)' : `EXERCÍCIO ${exercicio}`}
                      </span>
                      {(lado === 'hoje'
                        ? itemAtivo.hibrido.cell.hoje.lines
                        : itemAtivo.hibrido.cell.exercicio.lines
                      ).map((l) => (
                        <div
                          key={l.key}
                          className={`flex items-start justify-between gap-2 px-2 py-1 rounded-lg border ${
                            l.subtotal
                              ? 'bg-orange-500/10 border-orange-500/40'
                              : 'bg-slate-950/50 border-slate-800/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-slate-200 block">
                              {l.label}
                            </span>
                            {l.formula && (
                              <span className="text-[9px] font-mono text-slate-500 block break-words">
                                {l.formula}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold shrink-0 ${l.value < 0 ? 'text-emerald-300' : 'text-slate-100'}`}
                          >
                            {l.kind === 'nota' && l.value === 0 ? '—' : formatBRL(l.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {onAbrirMemoriaItem && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAbrirMemoriaItem(itemAtivo.item, itemAtivo.hibrido.cell)}
                      className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10 cursor-pointer h-7 text-[10px]"
                    >
                      <Calculator className="w-3 h-3 mr-1" /> Memória + base legal deste item
                    </Button>
                  )}
                </div>
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
        </>
      )}
    </div>
  )
}
