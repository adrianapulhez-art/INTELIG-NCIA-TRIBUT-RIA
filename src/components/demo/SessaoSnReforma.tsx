import React, { useEffect, useMemo, useState } from 'react'
import {
  Percent,
  Calculator,
  AlertTriangle,
  ArrowLeft,
  ArrowDown,
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ANEXOS_BASE_LC123,
  calcularSessaoSN,
  creditoEfetivoArt23,
  fmtSN,
  fmt6,
  getTabelaOficialConfig,
  PERFIL_SN_NOTA_PADRAO,
  TABELA_OFICIAL_SN,
  type ModoPreenchimentoSN,
  type OrigemPercentual,
  type BaseDoDas,
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
import { ManualContadorSnDialog } from './ManualContadorSnDialog'
import { PainelTesesSn } from './PainelTesesSn'
import { TrilhaChancelaBadge } from './TrilhaChancelaBadge'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * ============================================================================
 * SESSÃO "SN NA REFORMA" — TRATAMENTO DIFERENCIADO PARA OPTANTES
 * Todas as operações com Simples Nacional saem do espelho LP/LR e vivem AQUI,
 * organizadas por FORNECEDOR (SN puro × SN híbrido) × 4 adquirentes.
 *
 * MUDANÇAS RECENTES (Chancela CEO - Fases 1 e 2):
 *   1. Fim do hardcode: alíquota efetiva e frações de repartição derivadas da tabela oficial.
 *   2. DAS devido em 4 blocos com selo de consistência half-up no Card 2º.
 *   3. Parcela creditável isolada formalmente do DAS devido total.
 *   4. Origem rotulada visível: "da nota" × "estimativa da tabela" em todos os campos.
 *   5. Parâmetro baseDoDas: 'bruta' | 'liquida' com comparativo simultâneo das teses.
 *   6. Memória intermediária auditável com precisão de 6 decimais.
 *   7. Painel de teses abertas (Res. CGSN 190/2026) e Trilha de Chancela CEO.
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
    value6?: number
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
          className={`text-[10px] font-mono font-semibold block leading-tight ${
            line.destaque ? 'text-emerald-300' : 'text-slate-200'
          }`}
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
      <div className="text-right shrink-0">
        <span
          className={`text-[10px] font-mono font-bold block ${
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
        {line.value6 !== undefined && Math.abs(line.value6 - line.value) > 0.000001 && (
          <span className="text-[8px] font-mono text-slate-500 block leading-none">
            {fmt6(line.value6)}
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* MODELO CANÔNICO DA CEO: 3 CARDS LADO A LADO NO DETALHE             */
/* Card 1º — memória da aquisição em 2026 (HOJE, pré-reforma)          */
/* Card 2º — formação do preço do fornecedor / DAS em 4 blocos        */
/* Card 3º — custo do adquirente com ajuste pós-reforma (parcela cred) */
/* ------------------------------------------------------------------ */
function CardMemoriaCanonical({
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
    value: number
    value6?: number
    destaque?: boolean
    kind?: string
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
      className={`w-full min-w-0 rounded-xl border p-3 space-y-1 flex flex-col justify-between ${corCls}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`text-[10px] font-mono font-black uppercase leading-tight block ${tituloCls}`}
        >
          {titulo}
        </span>
        {badgeExtra}
      </div>
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
          <div className="text-right shrink-0">
            <span
              className={`text-[10px] font-mono font-bold block ${
                l.value < 0 ? 'text-emerald-300' : l.destaque ? 'text-white' : 'text-slate-100'
              }`}
            >
              {l.kind === 'nota' && l.value === 0 ? '—' : formatBRL(l.value)}
            </span>
            {l.value6 !== undefined && Math.abs(l.value6 - l.value) > 0.000001 && (
              <span className="text-[8px] font-mono text-slate-500 block leading-none">
                {fmt6(l.value6)}
              </span>
            )}
          </div>
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
  const [manualAberto, setManualAberto] = useState(false)

  // Estado da origem e parâmetros (Fase 1 e Fase 2)
  const [origem, setOrigem] = useState<OrigemPercentual>('tabela') // default: estimativa da tabela oficial
  const [baseDoDas, setBaseDoDas] = useState<BaseDoDas>('bruta') // default: bruta

  // Parâmetros de modo nota (digitados pelo contador)
  const [icmsNotaPct, setIcmsNotaPct] = useState(PERFIL_SN_NOTA_PADRAO.icmsNotaPct)
  const [cbsNotaPct, setCbsNotaPct] = useState(PERFIL_SN_NOTA_PADRAO.cbsNotaPct)
  const [ibsNotaPct, setIbsNotaPct] = useState(PERFIL_SN_NOTA_PADRAO.ibsNotaPct)

  // Parâmetros de tabela oficial (Seleção de Anexo I a V e Faixa 1 a 6)
  const [anexoId, setAnexoId] = useState<string>('anexo1')
  const [faixaNum, setFaixaNum] = useState<number>(1)
  const [rbt12, setRbt12] = useState<number>(PERFIL_SN_NOTA_PADRAO.rbt12)
  const [anexoNome, setAnexoNome] = useState<string>(PERFIL_SN_NOTA_PADRAO.anexo)
  const [faixaNome, setFaixaNome] = useState<string>(PERFIL_SN_NOTA_PADRAO.faixa)
  const [efetivaPct, setEfetivaPct] = useState<number>(PERFIL_SN_NOTA_PADRAO.efetivaPct)
  const [icmsFracPct, setIcmsFracPct] = useState<number>(PERFIL_SN_NOTA_PADRAO.icmsFracPct)
  const [cbsFracPct, setCbsFracPct] = useState<number>(PERFIL_SN_NOTA_PADRAO.cbsFracPct)
  const [ibsFracPct, setIbsFracPct] = useState<number>(PERFIL_SN_NOTA_PADRAO.ibsFracPct)
  const [irpjCsllCppFracPct, setIrpjCsllCppFracPct] = useState<number>(
    PERFIL_SN_NOTA_PADRAO.irpjCsllCppFracPct,
  )
  const [statusLegalTabela, setStatusLegalTabela] = useState<'OFICIAL' | 'PENDENTE_CONFIRMACAO'>(
    'OFICIAL',
  )
  const [notaFonteTabela, setNotaFonteTabela] = useState<string>(
    'LC 123/2006 Anexo I + LC 214/2025: chancelado pela Adri.',
  )

  // Sincroniza parâmetros quando o exercício da página muda, ou quando usuário troca anexo/faixa/RBT12
  const atualizarTabela = (
    novoAnexoId: string,
    novaFaixaNum: number,
    novoRbt12: number,
    ano: number,
  ) => {
    const configTabela = getTabelaOficialConfig(ano, novoAnexoId, novaFaixaNum, novoRbt12)
    setAnexoNome(configTabela.anexo)
    setFaixaNome(configTabela.faixa)
    setEfetivaPct(configTabela.aliquotaEfetivaPct)
    setIcmsFracPct(configTabela.fracaoIcmsPct)
    setCbsFracPct(configTabela.fracaoCbsPct)
    setIbsFracPct(configTabela.fracaoIbsPct)
    setIrpjCsllCppFracPct(configTabela.fracaoIrpjCsllCppPct)
    setStatusLegalTabela(configTabela.statusLegal || 'OFICIAL')
    setNotaFonteTabela(configTabela.notaFonte || '')
  }

  // Efeito ao trocar exercício da tela (/demo/reforma)
  useEffect(() => {
    if (origem === 'tabela') {
      atualizarTabela(anexoId, faixaNum, rbt12, Number(exercicio) || 2027)
    }
  }, [exercicio])

  const perfil: PerfilSN = useMemo(
    () => ({
      origem,
      modo: origem === 'nota' ? 'nota' : 'anexo',
      icmsNotaPct,
      cbsNotaPct,
      ibsNotaPct,
      anexo: anexoNome,
      faixa: faixaNome,
      exercicio: Number(exercicio) || 2027,
      rbt12,
      efetivaPct,
      icmsFracPct,
      cbsFracPct,
      ibsFracPct,
      irpjCsllCppFracPct,
      baseDoDas,
    }),
    [
      origem,
      icmsNotaPct,
      cbsNotaPct,
      ibsNotaPct,
      anexoNome,
      faixaNome,
      exercicio,
      rbt12,
      efetivaPct,
      icmsFracPct,
      cbsFracPct,
      ibsFracPct,
      irpjCsllCppFracPct,
      baseDoDas,
    ],
  )

  const cfgBase: CellConfigArt = useMemo(
    () => ({ ...config, repasse, repassePct }),
    [config, repasse, repassePct],
  )

  // RESULTADO POR ITEM — OS DOIS FORNECEDORES SEMPRE (comparação lado a lado)
  const resultados = useMemo(() => {
    if (itens.length === 0) return []
    return itens.map((item) => {
      // --- SN PURO: nota congelada + parcela creditável do art. 23 (motor da sessão)
      const r = calcularSessaoSN(item, perfil, adquirente)
      const cellHojePuro = computeCellArt12Item(
        item,
        { ...cfgBase, compradorRegime: adquirente, fornecedorRegime: adquirente },
        row,
      )

      // Regra de crédito: consome a parcela creditável isolada (não a efetiva cheia)
      const creditoEfetivo = creditoEfetivoArt23(adquirente, r)
      const custoLiquidoPuro = r.receitaBruta - creditoEfetivo
      const unitarioPuro = custoLiquidoPuro / Math.max(1, item.quantity)

      // Δ honesto: compara 2027-SN × 2026-SN (mesma combinação)
      const deltaPctPuro =
        r.custoUnitarioHojeSN > 0
          ? ((unitarioPuro - r.custoUnitarioHojeSN) / r.custoUnitarioHojeSN) * 100
          : 0

      // --- SN HÍBRIDO: motor Art. 12 chancelado
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
          cellHojeUnitario: r.custoUnitarioHojeSN,
          cellHojeLinhas: cellHojePuro.hoje.lines,
        },
        hibrido: {
          unitario: cellHib.exercicio.unitario,
          deltaPct: cellHib.deltaPct,
          cell: cellHib,
          cellHojeUnitario: cellHib.hoje.unitario,
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-violet-400" />
            <span className="text-xs font-mono font-black uppercase tracking-wider text-violet-300">
              Sessão SN na Reforma — tratamento diferenciado para optantes
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setManualAberto(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-950/60 px-2 py-0.5 text-[10px] font-mono font-bold text-violet-200 hover:bg-violet-900/60 hover:text-white hover:border-violet-400 transition-colors cursor-pointer"
              title="Abrir Manual de Utilização Didático do Contador"
            >
              <span>📘</span>
              <span>Manual</span>
            </button>
            <TrilhaChancelaBadge
              label="CRITÉRIO IT v2 (chancela CEO 2026)"
              descricao="Repartição por fração da tabela oficial e parcela creditável isolada"
              compact
            />
          </div>
        </div>
        <p className="text-[10px] font-mono text-slate-400">
          Todas as operações com Simples Nacional — LC 123/2006, art. 23, §§1º–2º (redação LC
          214/2025) · por item da Calculadora de Compras (nunca média) · motor próprio com memória
          em 6 decimais; zonas do Art. 12 consolidado intactas.
        </p>
      </div>

      {semOrigem ? (
        <p className="text-[10px] font-mono text-slate-400">
          Nenhum item com valor na Calculadora de Compras — lance os itens para calcular a parcela
          creditável do adquirente (art. 23 da LC 123/2006).
        </p>
      ) : (
        <>
          {/* 1 — Contexto: alíquota efetiva INFORMADA com ORIGEM ROTULADA */}
          <div className="rounded-xl border border-sky-500/40 bg-sky-500/[0.05] p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-black uppercase text-sky-300 block">
                1 · Contexto da operação — alíquota efetiva do fornecedor
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-sky-400/40 bg-sky-950/60 text-sky-200">
                Origem ativa:{' '}
                <span className="text-emerald-300 uppercase">
                  {origem === 'nota' ? 'da nota' : 'estimativa da tabela'}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setOrigem('tabela')
                  atualizarTabela(anexoId, faixaNum, rbt12, Number(exercicio) || 2027)
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  origem === 'tabela'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Tabela Oficial Completa (Anexos I a V · 6 Faixas) [Default]
              </button>
              <button
                type="button"
                onClick={() => setOrigem('nota')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  origem === 'nota'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Preencher pelo percentual da NOTA (art. 23, §2º)
              </button>
            </div>

            {origem === 'nota' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-mono text-slate-400 uppercase">
                      % ICMS da nota
                    </label>
                    <span className="text-[8px] font-mono text-emerald-400">da nota</span>
                  </div>
                  <Input
                    type="number"
                    step="0.0001"
                    value={icmsNotaPct}
                    onChange={(e) => setIcmsNotaPct(Number(e.target.value) || 0)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-mono text-slate-400 uppercase">
                      % CBS da nota
                    </label>
                    <span className="text-[8px] font-mono text-emerald-400">da nota</span>
                  </div>
                  <Input
                    type="number"
                    step="0.0001"
                    value={cbsNotaPct}
                    onChange={(e) => setCbsNotaPct(Number(e.target.value) || 0)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-mono text-slate-400 uppercase">
                      % IBS da nota
                    </label>
                    <span className="text-[8px] font-mono text-emerald-400">da nota</span>
                  </div>
                  <Input
                    type="number"
                    step="0.0001"
                    value={ibsNotaPct}
                    onChange={(e) => setIbsNotaPct(Number(e.target.value) || 0)}
                    className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] px-2 py-1.5 flex flex-col justify-center">
                  <span className="text-[8px] font-mono text-slate-400 uppercase block">
                    Origem
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-300">
                    DOCUMENTO FISCAL (da nota)
                  </span>
                  <span className="text-[8px] font-mono text-emerald-400/80 block">
                    LC 123/2006, art. 23, §2º campo próprio
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Seletores rápidos de Anexo e Faixa (atendimento à Adri) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Seletor do Anexo (I a V) */}
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase block font-bold">
                      Anexo do Simples Nacional
                    </label>
                    <select
                      value={anexoId}
                      onChange={(e) => {
                        const novoAnexo = e.target.value
                        setAnexoId(novoAnexo)
                        atualizarTabela(novoAnexo, faixaNum, rbt12, Number(exercicio) || 2027)
                      }}
                      className="w-full h-8 px-2 rounded bg-slate-950/90 border border-slate-700/80 text-xs font-mono text-slate-200 cursor-pointer focus:border-sky-400 focus:outline-none"
                    >
                      <option value="anexo1">Anexo I — Comércio / Bens</option>
                      <option value="anexo2">Anexo II — Indústria (com IPI)</option>
                      <option value="anexo3">Anexo III — Serviços (Geral / Fator R ≥ 28%)</option>
                      <option value="anexo4">Anexo IV — Serviços (sem CPP no DAS)</option>
                      <option value="anexo5">
                        Anexo V — Serviços (Intelectuais / Fator R &lt; 28%)
                      </option>
                    </select>
                  </div>

                  {/* Seletor da Faixa (1ª a 6ª) */}
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase block font-bold">
                      Faixa da Receita Bruta (RBT12)
                    </label>
                    <select
                      value={faixaNum}
                      onChange={(e) => {
                        const novaFaixa = Number(e.target.value) || 1
                        setFaixaNum(novaFaixa)
                        // Sugere RBT12 padrão da faixa
                        const anexoCfg = ANEXOS_BASE_LC123[anexoId]
                        const faixaCfg = anexoCfg?.faixas[novaFaixa - 1]
                        const novoRbt = faixaCfg
                          ? faixaCfg.limiteSuperior <= 180000
                            ? 120000
                            : faixaCfg.limiteSuperior
                          : rbt12
                        setRbt12(novoRbt)
                        atualizarTabela(anexoId, novaFaixa, novoRbt, Number(exercicio) || 2027)
                      }}
                      className="w-full h-8 px-2 rounded bg-slate-950/90 border border-slate-700/80 text-xs font-mono text-slate-200 cursor-pointer focus:border-sky-400 focus:outline-none"
                    >
                      <option value={1}>1ª faixa (Até R$ 180.000,00)</option>
                      <option value={2}>2ª faixa (R$ 180.000,01 a R$ 360.000,00)</option>
                      <option value={3}>3ª faixa (R$ 360.000,01 a R$ 720.000,00)</option>
                      <option value={4}>4ª faixa (R$ 720.000,01 a R$ 1.800.000,00)</option>
                      <option value={5}>5ª faixa (R$ 1.800.000,01 a R$ 3.600.000,00)</option>
                      <option value={6}>
                        6ª faixa — Sublimite (R$ 3.600.000,01 a R$ 4.800.000,00)
                      </option>
                    </select>
                  </div>

                  {/* RBT12 em R$ */}
                  <div className="sm:col-span-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-mono text-slate-400 uppercase block font-bold">
                        RBT12 do Fornecedor (R$)
                      </label>
                      <span className="text-[8px] font-mono text-sky-400">fórmula PGDAS</span>
                    </div>
                    <Input
                      type="number"
                      step="1000"
                      value={rbt12}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0
                        setRbt12(val)
                        atualizarTabela(anexoId, faixaNum, val, Number(exercicio) || 2027)
                      }}
                      className="h-8 bg-slate-950/70 border-slate-700/60 text-xs font-mono text-slate-200"
                    />
                  </div>
                </div>

                {/* Exibição detalhada das alíquotas e frações calculadas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase block">
                      Alíquota Efetiva Total
                    </label>
                    <div className="h-8 px-2 flex items-center justify-between bg-slate-950/70 border border-sky-600/50 rounded text-xs font-mono font-bold text-sky-300">
                      <span>{formatNumberBR(efetivaPct, 2)}%</span>
                      <span className="text-[8px] text-slate-400">RBT12 deduzido</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase block">
                      ICMS / ISS ({formatNumberBR(icmsFracPct, 2)}%)
                    </label>
                    <div className="h-8 px-2 flex items-center justify-between bg-slate-950/70 border border-slate-700/60 rounded text-xs font-mono text-slate-200">
                      <span>{formatNumberBR((efetivaPct * icmsFracPct) / 100, 4)}%</span>
                      <span className="text-[8px] text-slate-400">parcela creditável</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase block">
                      CBS ({formatNumberBR(cbsFracPct, 2)}%)
                    </label>
                    <div className="h-8 px-2 flex items-center justify-between bg-slate-950/70 border border-slate-700/60 rounded text-xs font-mono text-slate-200">
                      <span>{formatNumberBR((efetivaPct * cbsFracPct) / 100, 4)}%</span>
                      <span className="text-[8px] text-slate-400">parcela creditável</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-400 uppercase block">
                      IBS ({formatNumberBR(ibsFracPct, 2)}%)
                    </label>
                    <div className="h-8 px-2 flex items-center justify-between bg-slate-950/70 border border-slate-700/60 rounded text-xs font-mono text-slate-200">
                      <span>{formatNumberBR((efetivaPct * ibsFracPct) / 100, 4)}%</span>
                      <span className="text-[8px] text-slate-400">parcela creditável</span>
                    </div>
                  </div>
                </div>

                {/* Badge explicativo com o status legal transparente */}
                <div
                  className={`rounded-lg border px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 ${
                    statusLegalTabela === 'OFICIAL'
                      ? 'border-sky-500/40 bg-sky-500/[0.06]'
                      : 'border-amber-500/40 bg-amber-500/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded border ${
                        statusLegalTabela === 'OFICIAL'
                          ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {statusLegalTabela === 'OFICIAL'
                        ? 'FONTE OFICIAL CHANCELADA'
                        : 'PENDENTE DE CONFIRMAÇÃO'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-300">
                      {anexoNome} · {faixaNome} · Exercício {exercicio}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-300 font-bold">
                    Parcela creditável derivada:{' '}
                    {formatNumberBR(
                      (efetivaPct * (icmsFracPct + cbsFracPct + ibsFracPct)) / 100,
                      4,
                    )}
                    %
                  </span>
                </div>

                {/* Nota de rodapé da Adri quando pendente de confirmação ou particularidade do anexo */}
                {notaFonteTabela && (
                  <p className="text-[9px] font-mono text-slate-400 italic">
                    ℹ️ Fundamento / Nota da Casa: {notaFonteTabela}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 2 — A combinação: fornecedor × adquirente (+ seletor da base do DAS) */}
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

            {/* Base do DAS (Res. CGSN 190/2026) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase w-20">
                Base do DAS
              </span>
              <button
                type="button"
                onClick={() => setBaseDoDas('bruta')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  baseDoDas === 'bruta'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Bruta (LC 123 art. 3º §12º) [Default]
              </button>
              <button
                type="button"
                onClick={() => setBaseDoDas('liquida')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                  baseDoDas === 'liquida'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Líquida do ICMS da nota (art. 25 §1º II)
              </button>
              <span className="text-[8px] font-mono text-slate-400">
                (Res. CGSN 190/2026 pendente)
              </span>
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

            {/* GATILHO DO COMPARADOR */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setComparadorAberto(true)}
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer h-7 text-[10px] self-start"
            >
              <ArrowLeftRight className="w-3 h-3 mr-1" /> Comparar fornecedores SN puro × híbrido
            </Button>
          </div>

          {/* PAINEL DE TESES EM ABERTO — RES. CGSN 190/2026 (Fase 2) */}
          <PainelTesesSn
            resultado={itemAtivo ? itemAtivo.puro.r : resultados[0].puro.r}
            baseAtual={baseDoDas}
            onAlternarBase={setBaseDoDas}
          />

          {/* 3 — Camada 1: resumo por item (ABC, nunca média) COM os dois fornecedores */}
          <div className="rounded-xl border border-orange-500/45 bg-orange-500/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-black uppercase text-orange-300">
                3 · Custo líquido do adquirente — {nomeAdquirente(adquirente)} · Exercício{' '}
                {exercicio} (Consome Parcela Creditável)
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {exibidos.map((res, i) => {
                const sel = fornecedorSN === 'puro' ? res.puro : res.hibrido
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
          </div>

          {/* 4 — Camada 2: detalhe por item — MODELO CANÔNICO DA CEO */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 items-stretch">
                {/* CARD 1º-A — BASELINE PLENO */}
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

                {/* CARD 1º-B — HOJE (2026) COMPRANDO DE FORNECEDOR SN */}
                {fornecedorSN === 'puro' && (
                  <CardMemoriaCanonical
                    titulo={`CARD 1º-B — HOJE (2026) COMPRANDO DE FORNECEDOR SN · ${itemAtivo.item.name || 'item'}`}
                    cor="sky"
                    linhas={[
                      {
                        label: '(+) Valor da operação — nota congelada (sem destaque)',
                        formula: `${itemAtivo.item.quantity} un. × R$ ${fmtSN(itemAtivo.item.merchandiseValue / Math.max(1, itemAtivo.item.quantity), 2)} — da Calculadora de Compras`,
                        value: itemAtivo.puro.r.receitaBruta,
                        value6: itemAtivo.puro.r.receitaBruta6,
                      },
                      {
                        label: `(−) Crédito de ICMS do adquirente (2026) [Fração ${fmtSN(itemAtivo.puro.r.icmsPct, 2)}%]`,
                        formula: `${fmtSN(itemAtivo.puro.r.icmsPct, 2)}% × ${fmtSN(itemAtivo.puro.r.receitaBruta)} = ${fmtSN(itemAtivo.puro.r.creditoHojeSN6, 6)}`,
                        value: -itemAtivo.puro.r.creditoHojeSN,
                        value6: -itemAtivo.puro.r.creditoHojeSN6,
                        destaque: true,
                      },
                      ...(adquirente === 'real' && itemAtivo.puro.r.creditoPisCofinsHoje > 0
                        ? [
                            {
                              label: '(−) Crédito PIS/COFINS LR (2026) — base sem ICMS',
                              formula: `9,25% × ${fmtSN(itemAtivo.puro.r.pisCofinsBaseHoje)} = ${fmtSN(itemAtivo.puro.r.creditoPisCofinsHoje6, 6)}`,
                              value: -itemAtivo.puro.r.creditoPisCofinsHoje,
                              value6: -itemAtivo.puro.r.creditoPisCofinsHoje6,
                            },
                          ]
                        : []),
                      {
                        label: '(=) Custo líquido da aquisição em 2026',
                        formula: `${fmtSN(itemAtivo.puro.r.receitaBruta)} − ${fmtSN(itemAtivo.puro.r.creditoHojeSN)} = ${fmtSN(itemAtivo.puro.r.custoHojeSN6, 6)}`,
                        value: itemAtivo.puro.r.custoHojeSN,
                        value6: itemAtivo.puro.r.custoHojeSN6,
                      },
                      {
                        label: '(÷) CUSTO UNITÁRIO — HOJE-SN',
                        formula: `${fmtSN(itemAtivo.puro.r.custoHojeSN6, 6)} ÷ ${itemAtivo.item.quantity} un. = ${fmt6(itemAtivo.puro.r.custoUnitarioHojeSN6)}`,
                        value: itemAtivo.puro.r.custoUnitarioHojeSN,
                        value6: itemAtivo.puro.r.custoUnitarioHojeSN6,
                        destaque: true,
                      },
                    ]}
                  />
                )}

                {/* CARD 2º — DAS DEVIDO EM 4 BLOCOS COM SELO DE CONSISTÊNCIA */}
                {fornecedorSN === 'puro' ? (
                  <CardMemoriaCanonical
                    titulo={`CARD 2º — FORMAÇÃO DE PREÇO E DAS EM 4 BLOCOS (POR DENTRO) · ${itemAtivo.item.name || 'item'}`}
                    cor="violet"
                    badgeExtra={
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          itemAtivo.puro.r.das4Blocos.consistente
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {itemAtivo.puro.r.das4Blocos.consistente
                          ? 'Soma DAS: 100% OK'
                          : 'Divergência'}
                      </span>
                    }
                    linhas={[
                      {
                        label: '(=) Base de cálculo do DAS',
                        formula: `Base ${itemAtivo.puro.r.baseDoDas}: ${fmtSN(itemAtivo.puro.r.baseDasUtilizada6, 6)}`,
                        value: itemAtivo.puro.r.baseDasUtilizada,
                        value6: itemAtivo.puro.r.baseDasUtilizada6,
                      },
                      {
                        label: `(i) Alíquota Efetiva do Fornecedor — ${fmtSN(itemAtivo.puro.r.efetivaPct, 2)}%`,
                        formula: `Origem: [${itemAtivo.puro.r.origemRotulo}]`,
                        value: itemAtivo.puro.r.efetivaPct,
                        value6: itemAtivo.puro.r.efetivaPct,
                      },
                      {
                        label: '(−) DAS Devido Total (4 blocos)',
                        formula: `${fmtSN(itemAtivo.puro.r.efetivaPct, 2)}% × ${fmtSN(itemAtivo.puro.r.baseDasUtilizada)} = ${fmtSN(itemAtivo.puro.r.dasEfetivo6, 6)}`,
                        value: -itemAtivo.puro.r.dasEfetivo,
                        value6: -itemAtivo.puro.r.dasEfetivo6,
                        destaque: true,
                      },
                      // BLOCO 1
                      {
                        label: `1. Parcela ICMS (${fmtSN(itemAtivo.puro.r.icmsPct, 4)}%)`,
                        formula: `Fração 34,00% × 4% = ${fmtSN(itemAtivo.puro.r.icmsNota6, 6)}`,
                        value: itemAtivo.puro.r.icmsNota,
                        value6: itemAtivo.puro.r.icmsNota6,
                      },
                      // BLOCO 2
                      {
                        label: `2. Parcela CBS (${fmtSN(itemAtivo.puro.r.cbsPct, 4)}%)`,
                        formula: `Fração 15,33% × 4% = ${fmtSN(itemAtivo.puro.r.cbsDAS6, 6)}`,
                        value: itemAtivo.puro.r.cbsDAS,
                        value6: itemAtivo.puro.r.cbsDAS6,
                      },
                      // BLOCO 3
                      {
                        label: `3. Parcela IBS (${fmtSN(itemAtivo.puro.r.ibsPct, 4)}%)`,
                        formula: `Fração 0,17% × 4% = ${fmtSN(itemAtivo.puro.r.ibsDAS6, 6)}`,
                        value: itemAtivo.puro.r.ibsDAS,
                        value6: itemAtivo.puro.r.ibsDAS6,
                      },
                      // BLOCO 4
                      {
                        label: `4. Parcela IRPJ / CSLL / CPP (${fmtSN(itemAtivo.puro.r.irpjCsllCppPct, 4)}%) — NÃO GERA CRÉDITO`,
                        formula: `Fração 50,50% × 4% = ${fmtSN(itemAtivo.puro.r.irpjCsllCppDAS6, 6)}`,
                        value: itemAtivo.puro.r.irpjCsllCppDAS,
                        value6: itemAtivo.puro.r.irpjCsllCppDAS6,
                      },
                      {
                        label: '(=) PREÇO DA NOTA DO FORNECEDOR SN (CONGELADA)',
                        formula: 'tributos por dentro do preço, sem destaque de CBS/IBS',
                        value: itemAtivo.puro.r.receitaBruta,
                        value6: itemAtivo.puro.r.receitaBruta6,
                        destaque: true,
                      },
                    ]}
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

                {/* CARD 3º — CUSTO DO ADQUIRENTE (CONSUMO DA PARCELA CREDITÁVEL) */}
                {fornecedorSN === 'puro' ? (
                  <CardMemoriaCanonical
                    titulo={`CARD 3º — CUSTO DO ADQUIRENTE COM PARCELA CREDITÁVEL (ART. 23) · ${itemAtivo.item.name || 'item'}`}
                    cor="orange"
                    linhas={[
                      {
                        label: 'Base da Parcela Creditável',
                        formula: `Base: ${fmtSN(itemAtivo.puro.r.baseDasUtilizada6, 6)}`,
                        value: itemAtivo.puro.r.baseDasUtilizada,
                        value6: itemAtivo.puro.r.baseDasUtilizada6,
                      },
                      {
                        label: `(+) Crédito ICMS da nota (${fmtSN(itemAtivo.puro.r.icmsPct, 4)}%)`,
                        formula: `${fmtSN(itemAtivo.puro.r.icmsNota6, 6)} [${itemAtivo.puro.r.origemRotulo}]`,
                        value: itemAtivo.puro.r.icmsNota,
                        value6: itemAtivo.puro.r.icmsNota6,
                      },
                      {
                        label: `(+) Crédito CBS do DAS (${fmtSN(itemAtivo.puro.r.cbsPct, 4)}%)`,
                        formula: `${fmtSN(itemAtivo.puro.r.cbsDAS6, 6)}`,
                        value: itemAtivo.puro.r.cbsDAS,
                        value6: itemAtivo.puro.r.cbsDAS6,
                      },
                      {
                        label: `(+) Crédito IBS do DAS (${fmtSN(itemAtivo.puro.r.ibsPct, 4)}%)`,
                        formula: `${fmtSN(itemAtivo.puro.r.ibsDAS6, 6)}`,
                        value: itemAtivo.puro.r.ibsDAS,
                        value6: itemAtivo.puro.r.ibsDAS6,
                      },
                      {
                        label: '(=) PARCELA CREDITÁVEL TOTAL (ICMS + CBS + IBS)',
                        formula: `${fmtSN(itemAtivo.puro.r.icmsNota6, 6)} + ${fmtSN(itemAtivo.puro.r.cbsDAS6, 6)} + ${fmtSN(itemAtivo.puro.r.ibsDAS6, 6)} = ${fmtSN(itemAtivo.puro.r.parcelaCreditavelTotal6, 6)}`,
                        value: itemAtivo.puro.r.parcelaCreditavelTotal,
                        value6: itemAtivo.puro.r.parcelaCreditavelTotal6,
                        destaque: true,
                      },
                      {
                        label: '(÷) Crédito por unidade',
                        formula: `${fmtSN(itemAtivo.puro.r.parcelaCreditavelTotal6, 6)} ÷ ${itemAtivo.item.quantity} un.`,
                        value: itemAtivo.puro.r.creditoUnidade,
                        value6: itemAtivo.puro.r.creditoUnidade6,
                      },
                      {
                        label: '(=) CUSTO LÍQUIDO (NOTA − PARCELA CREDITÁVEL)',
                        formula: `${fmtSN(itemAtivo.puro.r.receitaBruta)} − ${fmtSN(itemAtivo.puro.r.parcelaCreditavelTotal6, 6)} = ${fmtSN(itemAtivo.puro.r.custoLiquido6, 6)}`,
                        value: itemAtivo.puro.r.custoLiquido,
                        value6: itemAtivo.puro.r.custoLiquido6,
                        destaque: true,
                      },
                      {
                        label: '(÷) CUSTO UNITÁRIO LÍQUIDO',
                        formula: `${fmtSN(itemAtivo.puro.r.custoLiquido6, 6)} ÷ ${itemAtivo.item.quantity} un. = ${fmt6(itemAtivo.puro.r.custoUnitarioLiquido6)}`,
                        value: itemAtivo.puro.r.custoUnitarioLiquido,
                        value6: itemAtivo.puro.r.custoUnitarioLiquido6,
                        destaque: true,
                      },
                    ]}
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
            </div>
          )}

          {/* 5 — Card do Estoque Reajustado (consome parcela creditável) */}
          <CardEstoqueReajustado
            exercicio={exercicio}
            fornecedorTxt={
              fornecedorSN === 'puro'
                ? 'fornecedor SN puro (nota congelada + parcela creditável oficial do art. 23)'
                : 'fornecedor SN híbrido (regime regular — crédito integral, motor Art. 12 chancelado)'
            }
            linhas={resultados.map<LinhaEstoqueSN>((res) => {
              const sel = fornecedorSN === 'puro' ? res.puro : res.hibrido
              return {
                id: res.item.id,
                nome: res.item.name || 'Item',
                qtd: res.item.quantity,
                custoHoje: sel.cellHojeUnitario,
                custoNovo: sel.unitario,
                deltaPct: sel.deltaPct,
              }
            })}
          />

          {/* COMPARADOR DE FORNECEDORES SN */}
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

          {/* MANUAL DE UTILIZAÇÃO DIDÁTICO PARA O CONTADOR INICIANTE */}
          <ManualContadorSnDialog open={manualAberto} onOpenChange={setManualAberto} />
        </>
      )}
    </div>
  )
}
