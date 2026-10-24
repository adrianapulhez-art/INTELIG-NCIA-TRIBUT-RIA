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
  ChevronDown,
  ChevronUp,
  Receipt,
  FileText,
  Info,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ANEXOS_BASE_LC123,
  calcularSessaoSN,
  carregarConfigSessaoSN,
  creditoEfetivoArt23,
  fmtSN,
  fmt6,
  getTabelaOficialConfig,
  PERFIL_SN_NOTA_PADRAO,
  salvarConfigSessaoSN,
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
import { ComparadorFornecedoresDialog } from './ComparadorFornecedoresDialog'
import { ManualContadorSnDialog } from './ManualContadorSnDialog'
import { TrilhaChancelaBadge } from './TrilhaChancelaBadge'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'

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
      className={`flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
        line.destaque ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'
      }`}
    >
      <div className="min-w-0">
        <span
          className={`text-xs font-mono font-semibold block leading-tight ${
            line.destaque ? 'text-[#261502] font-bold' : 'text-slate-800'
          }`}
        >
          {line.label}
        </span>
        {line.formula && (
          <span className="text-[10px] font-mono text-slate-500 leading-tight block break-words">
            {line.formula}
          </span>
        )}
        {line.fundamento && (
          <span className="text-[9px] font-mono text-[#b87c14] block mt-0.5">
            {line.fundamento}
          </span>
        )}
      </div>
      <div className="text-right shrink-0">
        <span
          className={`text-xs font-mono font-bold block ${
            line.value < 0
              ? 'text-[#b87c14]'
              : line.destaque
                ? 'text-[#261502]'
                : line.value > 0
                  ? 'text-slate-900'
                  : 'text-slate-500'
          }`}
        >
          {isPct ? `${formatNumberBR(line.value)}%` : formatBRL(line.value)}
        </span>
        {line.value6 !== undefined && Math.abs(line.value6 - line.value) > 0.000001 && (
          <span className="text-[9px] font-mono text-slate-500 block leading-none">
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
    emerald: 'border-amber-300 bg-amber-50/60',
    violet: 'border-slate-200 bg-white shadow-2xs',
    orange: 'border-slate-200 bg-white shadow-2xs',
    sky: 'border-amber-200 bg-amber-50/40 shadow-2xs',
  }[cor]
  const tituloCls = {
    emerald: 'text-[#261502]',
    violet: 'text-slate-900',
    orange: 'text-slate-900',
    sky: 'text-[#261502]',
  }[cor]

  return (
    <div
      className={`w-full min-w-0 rounded-2xl border p-3.5 space-y-1.5 flex flex-col justify-between ${corCls}`}
    >
      <div className="flex items-start justify-between gap-1 pb-1.5 border-b border-slate-200">
        <span className={`text-xs font-mono font-bold uppercase leading-tight block ${tituloCls}`}>
          {titulo}
        </span>
        {badgeExtra}
      </div>
      <div className="space-y-1">
        {linhas.map((l, i) => (
          <div
            key={`${l.label}-${i}`}
            className={`flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
              l.destaque ? 'bg-amber-100 border-amber-300 shadow-2xs' : 'bg-white border-slate-200'
            }`}
          >
            <div className="min-w-0">
              <span
                className={`text-xs font-mono block leading-tight ${l.destaque ? 'font-bold text-[#261502]' : 'text-slate-800'}`}
              >
                {l.label}
              </span>
              {l.formula && (
                <span className="text-[10px] font-mono text-slate-500 block break-words leading-tight mt-0.5">
                  {l.formula}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-xs font-mono font-bold block ${
                  l.value < 0
                    ? 'text-[#b87c14]'
                    : l.destaque
                      ? 'text-[#261502] font-black'
                      : 'text-slate-900'
                }`}
              >
                {l.kind === 'nota' && l.value === 0 ? '—' : formatBRL(l.value)}
              </span>
              {l.value6 !== undefined && Math.abs(l.value6 - l.value) > 0.000001 && (
                <span className="text-[9px] font-mono text-slate-500 block leading-none">
                  {fmt6(l.value6)}
                </span>
              )}
            </div>
          </div>
        ))}
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
  cbsAliquotaPct = 8.8,
  onAbrirMemoriaItem,
}: {
  itensOrigem: ItemIntegracaoArt12[]
  config: CellConfigArt
  row: ScheduleRowArt
  exercicio: ExercicioKey
  /** Custo unitário da célula plena de referência (LP×LP chancelada) — régua da negociação. */
  custoPlenoUnitario: number
  /** Alíquota editável de CBS para os motores 2027+ (default 8.8). */
  cbsAliquotaPct?: number
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
  const [detalheAberto, setDetalheAberto] = useState(true)
  const [comparadorAberto, setComparadorAberto] = useState(false)
  const [manualAberto, setManualAberto] = useState(false)

  // Leitura inicial tolerante do localStorage (com fallback ao perfil padrão da casa: 1ª faixa, 4%)
  const configSalvaInicial = useMemo(() => carregarConfigSessaoSN(), [])

  // Estado da origem e parâmetros (Fase 1 e Fase 2)
  const [origem, setOrigem] = useState<OrigemPercentual>(configSalvaInicial?.origem ?? 'tabela')
  const [camadaAnexoAberta, setCamadaAnexoAberta] = useState<boolean>(false) // Camada interna recuada para Tabela Oficial
  const [camadaCenariosAberta, setCamadaCenariosAberta] = useState<boolean>(false) // Camada interna recuada para Cenários de Cálculos SN
  const [baseDoDas, setBaseDoDas] = useState<BaseDoDas>(configSalvaInicial?.baseDoDas ?? 'bruta')

  // Entradas em valores monetários (R$) destacados na NF-e (Pedido da Adri: campos em R$, nunca percentuais — reduzido para ICMS, CBS e IBS)
  const [valorIcmsInput, setValorIcmsInput] = useState<string>(
    configSalvaInicial?.valorIcmsInput ?? '',
  )
  const [valorCbsInput, setValorCbsInput] = useState<string>(
    configSalvaInicial?.valorCbsInput ?? '',
  )
  const [valorIbsInput, setValorIbsInput] = useState<string>(
    configSalvaInicial?.valorIbsInput ?? '',
  )

  // Valores numéricos parseados com suporte a vírgula pt-BR (estado inicial vazio/zero)
  const valorIcmsNota = useMemo(() => Math.max(0, parseBRNumber(valorIcmsInput)), [valorIcmsInput])
  const valorCbsNota = useMemo(() => Math.max(0, parseBRNumber(valorCbsInput)), [valorCbsInput])
  const valorIbsNota = useMemo(() => Math.max(0, parseBRNumber(valorIbsInput)), [valorIbsInput])

  // Total da nota fiscal da compra em uso (nota canônica / item ativo da Calculadora de Compras)
  const itemSelecionado = itens[Math.min(idxItem, Math.max(0, itens.length - 1))]
  const totalNotaEmUso = useMemo(() => {
    if (!itemSelecionado) return 42400
    const mercFrete = (itemSelecionado.merchandiseValue || 0) + (itemSelecionado.freightValue || 0)
    return mercFrete > 0 ? mercFrete : itemSelecionado.valorNota || 42400
  }, [itemSelecionado])

  // Conversão matemática no componente (sem tocar em src/lib/*):
  // percentual = valor destacado ÷ total da nota fiscal da compra em uso
  const icmsNotaPct = useMemo(() => {
    if (totalNotaEmUso <= 0 || valorIcmsNota <= 0) return 0
    return (valorIcmsNota / totalNotaEmUso) * 100
  }, [valorIcmsNota, totalNotaEmUso])

  const cbsNotaPct = useMemo(() => {
    if (totalNotaEmUso <= 0 || valorCbsNota <= 0) return 0
    return (valorCbsNota / totalNotaEmUso) * 100
  }, [valorCbsNota, totalNotaEmUso])

  const ibsNotaPct = useMemo(() => {
    if (totalNotaEmUso <= 0 || valorIbsNota <= 0) return 0
    return (valorIbsNota / totalNotaEmUso) * 100
  }, [valorIbsNota, totalNotaEmUso])

  // Parâmetros de tabela oficial (Seleção de Anexo I a V e Faixa 1 a 6)
  const [anexoId, setAnexoId] = useState<string>(configSalvaInicial?.anexoId ?? 'anexo1')
  const [faixaNum, setFaixaNum] = useState<number>(configSalvaInicial?.faixaNum ?? 1)
  const [rbt12, setRbt12] = useState<number>(
    configSalvaInicial?.rbt12 ?? PERFIL_SN_NOTA_PADRAO.rbt12,
  )

  // Configuração oficial calculada a partir dos parâmetros iniciais
  const configTabelaInicial = useMemo(() => {
    const ano = Number(exercicio) || 2027
    const anexoIni = configSalvaInicial?.anexoId ?? 'anexo1'
    const faixaIni = configSalvaInicial?.faixaNum ?? 1
    const rbtIni = configSalvaInicial?.rbt12 ?? PERFIL_SN_NOTA_PADRAO.rbt12
    return getTabelaOficialConfig(ano, anexoIni, faixaIni, rbtIni)
  }, [configSalvaInicial, exercicio])

  const [anexoNome, setAnexoNome] = useState<string>(
    configTabelaInicial.anexo || PERFIL_SN_NOTA_PADRAO.anexo,
  )
  const [faixaNome, setFaixaNome] = useState<string>(
    configTabelaInicial.faixa || PERFIL_SN_NOTA_PADRAO.faixa,
  )
  const [efetivaPct, setEfetivaPct] = useState<number>(
    configTabelaInicial.aliquotaEfetivaPct ?? PERFIL_SN_NOTA_PADRAO.efetivaPct,
  )
  const [icmsFracPct, setIcmsFracPct] = useState<number>(
    configTabelaInicial.fracaoIcmsPct ?? PERFIL_SN_NOTA_PADRAO.icmsFracPct,
  )
  const [cbsFracPct, setCbsFracPct] = useState<number>(
    configTabelaInicial.fracaoCbsPct ?? PERFIL_SN_NOTA_PADRAO.cbsFracPct,
  )
  const [ibsFracPct, setIbsFracPct] = useState<number>(
    configTabelaInicial.fracaoIbsPct ?? PERFIL_SN_NOTA_PADRAO.ibsFracPct,
  )
  const [irpjCsllCppFracPct, setIrpjCsllCppFracPct] = useState<number>(
    configTabelaInicial.fracaoIrpjCsllCppPct ?? PERFIL_SN_NOTA_PADRAO.irpjCsllCppFracPct,
  )
  const [statusLegalTabela, setStatusLegalTabela] = useState<'OFICIAL' | 'PENDENTE_CONFIRMACAO'>(
    configTabelaInicial.statusLegal || 'OFICIAL',
  )
  const [notaFonteTabela, setNotaFonteTabela] = useState<string>(
    configTabelaInicial.notaFonte || 'LC 123/2006 Anexo I + LC 214/2025: chancelado pela Adri.',
  )

  // Persiste anexoId, faixaNum, rbt12, origem, baseDoDas e inputs no localStorage sempre que alterados
  useEffect(() => {
    salvarConfigSessaoSN({
      anexoId,
      faixaNum,
      rbt12,
      origem,
      baseDoDas,
      valorIcmsInput,
      valorCbsInput,
      valorIbsInput,
    })
  }, [anexoId, faixaNum, rbt12, origem, baseDoDas, valorIcmsInput, valorCbsInput, valorIbsInput])

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
      const perfilFornecedorSN = {
        anexo: perfil.anexo,
        faixa: perfil.faixa,
        efetivaPct: perfil.efetivaPct,
        icmsFracPct: perfil.icmsFracPct,
      }
      const cellHib = computeCellArt12Item(
        item,
        {
          ...cfgBase,
          compradorRegime: adquirente,
          fornecedorRegime: 'simples_hibrido',
          perfilFornecedorSN,
        },
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
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
    >
      {/* Cabeçalho */}
      <div className="space-y-1 pb-3 border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 border-l-4 border-[#e5b742] pl-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-[#b87c14] shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight block">
                Sessão SN na Reforma — tratamento diferenciado para optantes
              </span>
              <p className="text-xs text-slate-500">
                Todas as operações com Simples Nacional — LC 123/2006, art. 23, §§1º–2º (redação LC
                214/2025) · por item da Calculadora de Compras (nunca média) · motor próprio com
                memória em 6 decimais; zonas do Art. 12 consolidado intactas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setManualAberto(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
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
      </div>

      {semOrigem ? (
        <p className="text-xs font-mono text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
          Nenhum item com valor na Calculadora de Compras — lance os itens para calcular a parcela
          creditável do adquirente (art. 23 da LC 123/2006).
        </p>
      ) : (
        <>
          {/* 1 — Contexto: alíquota efetiva INFORMADA com ORIGEM ROTULADA */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-l-4 border-[#e5b742] pl-3">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#261502] block">
                  1 · Contexto da operação — alíquota efetiva do fornecedor
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Selecione a fonte de apuração das alíquotas do Simples Nacional (tabela oficial
                  chancelada ou documento fiscal)
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-md border border-amber-300 bg-white text-[#261502] shadow-2xs">
                Origem ativa:{' '}
                <span className="text-[#261502] uppercase font-black">
                  {origem === 'nota' ? 'valores destacados na nota' : 'estimativa da tabela'}
                </span>
              </span>
            </div>

            {/* 1. BOTÕES DE ORIGEM EM EVIDÊNCIA (Caixas maiores, maior padding, tipografia destacada, padrão tema claro chancelado) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Botão A: Tabela Oficial Completa (Anexos I a V · 6 Faixas) */}
              <button
                type="button"
                onClick={() => {
                  if (origem !== 'tabela') {
                    setOrigem('tabela')
                    atualizarTabela(anexoId, faixaNum, rbt12, Number(exercicio) || 2027)
                    setCamadaAnexoAberta(true)
                  } else {
                    setCamadaAnexoAberta((prev) => !prev)
                  }
                }}
                className={`p-4 sm:p-5 rounded-2xl text-left cursor-pointer transition-all border-2 flex flex-col justify-between gap-3 shadow-xs ${
                  origem === 'tabela'
                    ? 'bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] text-[#fff5cc] border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50/90 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        origem === 'tabela'
                          ? 'bg-[#1a0f03] text-amber-200 border border-amber-500/40'
                          : 'bg-amber-50 text-[#b87c14] border border-amber-300'
                      }`}
                    >
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <span
                        className={`text-sm sm:text-base font-mono font-black uppercase tracking-wide block ${
                          origem === 'tabela' ? 'text-[#fff5cc]' : 'text-slate-900'
                        }`}
                      >
                        TABELA OFICIAL COMPLETA (ANEXOS I A V)
                      </span>
                      <span
                        className={`text-xs font-mono block mt-0.5 ${
                          origem === 'tabela' ? 'text-amber-200/80' : 'text-slate-500'
                        }`}
                      >
                        Anexos I a V · 6 Faixas · LC 123/2006 & LC 214/2025 [padrão]
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md shrink-0 border ${
                      origem === 'tabela'
                        ? 'bg-[#1a0f03] text-[#e5b742] border-amber-500/50'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {origem === 'tabela'
                      ? camadaAnexoAberta
                        ? 'Camada Aberta'
                        : 'Camada Fechada'
                      : 'Estimativa'}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between pt-2.5 border-t text-xs font-mono ${
                    origem === 'tabela'
                      ? 'border-amber-900/60 text-amber-100'
                      : 'border-slate-100 text-slate-600'
                  }`}
                >
                  <span className="font-semibold truncate max-w-[65%]">
                    {anexoNome} · {faixaNome} ({formatNumberBR(efetivaPct, 2)}%)
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold shrink-0">
                    {origem === 'tabela' && camadaAnexoAberta ? (
                      <>
                        <span>FECHAR CAMADA</span>
                        <ChevronUp className="w-4 h-4 ml-0.5" />
                      </>
                    ) : (
                      <>
                        <span>ABRIR CAMADA INTERNA</span>
                        <ChevronDown className="w-4 h-4 ml-0.5" />
                      </>
                    )}
                  </span>
                </div>
              </button>

              {/* Botão B: Preencher com VALORES DESTACADOS NA NOTA FISCAL (art. 23, §2º) */}
              <button
                type="button"
                onClick={() => {
                  setOrigem('nota')
                  setCamadaAnexoAberta(false)
                }}
                className={`p-4 sm:p-5 rounded-2xl text-left cursor-pointer transition-all border-2 flex flex-col justify-between gap-3 shadow-xs ${
                  origem === 'nota'
                    ? 'bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] text-[#fff5cc] border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50/90 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        origem === 'nota'
                          ? 'bg-[#1a0f03] text-amber-200 border border-amber-500/40'
                          : 'bg-amber-50 text-[#b87c14] border border-amber-300'
                      }`}
                    >
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <span
                        className={`text-sm sm:text-base font-mono font-black uppercase tracking-wide block ${
                          origem === 'nota' ? 'text-[#fff5cc]' : 'text-slate-900'
                        }`}
                      >
                        PREENCHER COM VALORES DESTACADOS NA NOTA FISCAL
                      </span>
                      <span
                        className={`text-xs font-mono block mt-0.5 ${
                          origem === 'nota' ? 'text-amber-200/80' : 'text-slate-500'
                        }`}
                      >
                        Documento Fiscal · Valores monetários destacados na NF-e (R$)
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md shrink-0 border ${
                      origem === 'nota'
                        ? 'bg-[#1a0f03] text-[#e5b742] border-amber-500/50'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {origem === 'nota' ? 'Ativo' : 'Manual (R$)'}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between pt-2.5 border-t text-xs font-mono ${
                    origem === 'nota'
                      ? 'border-amber-900/60 text-amber-100'
                      : 'border-slate-100 text-slate-600'
                  }`}
                >
                  <span className="font-semibold truncate max-w-[65%]">
                    {valorIcmsNota > 0 || valorCbsNota > 0 || valorIbsNota > 0 ? (
                      <>
                        ICMS {formatBRL(valorIcmsNota)} ({formatNumberBR(icmsNotaPct, 2)}%) · CBS{' '}
                        {formatBRL(valorCbsNota)} · IBS {formatBRL(valorIbsNota)}
                      </>
                    ) : (
                      'Nenhum valor destacado digitado (valores em R$ zerados/vazios)'
                    )}
                  </span>
                  <span className="font-bold shrink-0">
                    {origem === 'nota' ? 'CAMPOS EM R$ ATIVOS' : 'DIGITAR VALORES (R$)'}
                  </span>
                </div>
              </button>
            </div>

            {/* 3. CARTÃO DEDICADO DE VALORES DESTACADOS NA NOTA FISCAL (Visível quando origem 'nota' está selecionada) */}
            {origem === 'nota' && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/50 p-4 sm:p-5 space-y-4 shadow-xs">
                {/* Cabeçalho do Cartão */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-3">
                  <div className="border-l-4 border-[#e5b742] pl-3">
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-[#261502]">
                      VALORES DESTACADOS NA NOTA FISCAL (NF-e) · DIGITAÇÃO MANUAL EM REAIS (R$)
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-mono">
                      Preencha os valores monetários em R$ exatamente como constam destacados no
                      documento fiscal. O sistema converte automaticamente em percentuais sobre o
                      total da nota.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-amber-300 bg-white text-[#261502] uppercase shadow-2xs">
                      Total da Nota: {formatBRL(totalNotaEmUso)}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-amber-300 bg-amber-100 text-[#261502] uppercase shadow-2xs">
                      Origem: Destaque da NF-e
                    </span>
                  </div>
                </div>

                {/* Botões rápidos de exemplo para conferência e validação */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-mono font-bold text-slate-600">
                    Atalhos de conferência:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setValorIcmsInput('7632,00')
                      setValorCbsInput('0,00')
                      setValorIbsInput('0,00')
                    }}
                    className="text-[10px] font-mono font-bold text-[#261502] bg-white hover:bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                    title="Preenche ICMS com R$ 7.632,00 (18% sobre a nota canônica de R$ 42.400,00)"
                  >
                    Caso Canônico: ICMS 18% (R$ 7.632,00)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValorIcmsInput('576,64')
                      setValorCbsInput('260,00')
                      setValorIbsInput('2,88')
                    }}
                    className="text-[10px] font-mono font-bold text-slate-700 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                    title="Preenche ICMS com R$ 576,64 (1,36% sobre R$ 42.400,00) e frações 2027+"
                  >
                    Exemplo Fração Art. 23 (R$ 576,64 · 1,36%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValorIcmsInput('')
                      setValorCbsInput('')
                      setValorIbsInput('')
                    }}
                    className="text-[10px] font-mono font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer shadow-2xs ml-auto"
                  >
                    Limpar campos (zerar)
                  </button>
                </div>

                {/* Grade de 3 inputs monetários formatados (R$) + 1 Resumo Total */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
                  {/* 1. ICMS destacado na nota (R$) */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white border border-amber-300 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[11px] font-mono font-bold text-slate-900 uppercase leading-tight">
                          ICMS destacado na nota (R$)
                        </label>
                        <span className="text-[9px] font-mono font-bold text-[#b87c14] bg-amber-50 px-1 py-0.5 rounded border border-amber-300 shrink-0">
                          NF-e
                        </span>
                      </div>
                      <div className="relative mt-2">
                        <span className="absolute left-2.5 top-2.5 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                          R$
                        </span>
                        <Input
                          type="text"
                          value={valorIcmsInput}
                          onChange={(e) => setValorIcmsInput(e.target.value)}
                          className="h-10 bg-white border-slate-300 text-xs font-mono font-bold text-slate-900 focus-visible:ring-amber-500 pl-8 pr-2"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#261502]">
                        <span>% Derivado:</span>
                        <span>{formatNumberBR(icmsNotaPct, 4)}%</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 block leading-tight">
                        {valorIcmsNota > 0
                          ? `${formatBRL(valorIcmsNota)} ÷ ${formatBRL(totalNotaEmUso)}`
                          : 'campo vazio/zero (0%)'}
                      </span>
                    </div>
                  </div>

                  {/* 2. CBS destacada na nota (R$) */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[11px] font-mono font-bold text-slate-700 uppercase leading-tight">
                          CBS destacada na nota (R$)
                        </label>
                        <span className="text-[9px] font-mono text-[#b87c14] bg-amber-50 px-1 py-0.5 rounded border border-amber-300 shrink-0">
                          2027+
                        </span>
                      </div>
                      <div className="relative mt-2">
                        <span className="absolute left-2.5 top-2.5 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                          R$
                        </span>
                        <Input
                          type="text"
                          value={valorCbsInput}
                          onChange={(e) => setValorCbsInput(e.target.value)}
                          className="h-10 bg-white border-slate-300 text-xs font-mono font-bold text-slate-900 focus-visible:ring-amber-500 pl-8 pr-2"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-900">
                        <span>% Derivado:</span>
                        <span>{formatNumberBR(cbsNotaPct, 4)}%</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 block leading-tight">
                        {valorCbsNota > 0
                          ? `${formatBRL(valorCbsNota)} ÷ ${formatBRL(totalNotaEmUso)}`
                          : 'campo vazio/zero (0%)'}
                      </span>
                    </div>
                  </div>

                  {/* 3. IBS destacado na nota (R$) */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[11px] font-mono font-bold text-slate-700 uppercase leading-tight">
                          IBS destacado na nota (R$)
                        </label>
                        <span className="text-[9px] font-mono text-[#b87c14] bg-amber-50 px-1 py-0.5 rounded border border-amber-300 shrink-0">
                          2027+
                        </span>
                      </div>
                      <div className="relative mt-2">
                        <span className="absolute left-2.5 top-2.5 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                          R$
                        </span>
                        <Input
                          type="text"
                          value={valorIbsInput}
                          onChange={(e) => setValorIbsInput(e.target.value)}
                          className="h-10 bg-white border-slate-300 text-xs font-mono font-bold text-slate-900 focus-visible:ring-amber-500 pl-8 pr-2"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-900">
                        <span>% Derivado:</span>
                        <span>{formatNumberBR(ibsNotaPct, 4)}%</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 block leading-tight">
                        {valorIbsNota > 0
                          ? `${formatBRL(valorIbsNota)} ÷ ${formatBRL(totalNotaEmUso)}`
                          : 'campo vazio/zero (0%)'}
                      </span>
                    </div>
                  </div>

                  {/* 4. Resumo Total da Parcela Creditável */}
                  <div className="rounded-xl border border-amber-300 bg-white p-3 flex flex-col justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                        Crédito Total Derivado
                      </span>
                      <span className="text-sm font-mono font-black text-[#261502] block mt-0.5">
                        {formatNumberBR(icmsNotaPct + cbsNotaPct + ibsNotaPct, 4)}%
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800 block mt-0.5">
                        {formatBRL(valorIcmsNota + valorCbsNota + valorIbsNota)}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-[#b87c14] leading-tight pt-2 border-t border-amber-100">
                      Soma das parcelas creditáveis (ICMS + CBS + IBS)
                    </span>
                  </div>
                </div>

                {/* MEMÓRIA DE CÁLCULO VISÍVEL E DIDÁTICA DA CONVERSÃO (R$ → %) */}
                <div className="rounded-xl border border-amber-300 bg-white p-3.5 sm:p-4 space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#b87c14]" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wide text-[#261502]">
                        Memória de Cálculo Didática da Conversão (Valores em R$ ÷ Total da Nota =
                        Alíquota %)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-600">
                      Total da nota de referência:{' '}
                      <strong className="text-slate-900">{formatBRL(totalNotaEmUso)}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                    {/* Linha 1: ICMS */}
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>ICMS DESTACADO</span>
                        <span className="text-[#b87c14]">{formatNumberBR(icmsNotaPct, 4)}%</span>
                      </div>
                      <div className="text-[11px] text-slate-700 font-semibold">
                        {formatBRL(valorIcmsNota)} ÷ {formatBRL(totalNotaEmUso)} ={' '}
                        {formatNumberBR(icmsNotaPct, 4)}%
                      </div>
                      <div className="text-[10px] text-slate-500 italic">
                        Origem:{' '}
                        <span className="text-slate-700 not-italic font-medium">
                          {valorIcmsNota > 0
                            ? 'valor informado pelo usuário, conforme destaque da NF-e'
                            : 'campo não informado / zero (percentual derivado: 0,0000% · nada inventado)'}
                        </span>
                      </div>
                    </div>

                    {/* Linha 2: CBS (2027+) */}
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>CBS DESTACADA (2027+)</span>
                        <span className="text-[#b87c14]">{formatNumberBR(cbsNotaPct, 4)}%</span>
                      </div>
                      <div className="text-[11px] text-slate-700 font-semibold">
                        {formatBRL(valorCbsNota)} ÷ {formatBRL(totalNotaEmUso)} ={' '}
                        {formatNumberBR(cbsNotaPct, 4)}%
                      </div>
                      <div className="text-[10px] text-slate-500 italic">
                        Origem:{' '}
                        <span className="text-slate-700 not-italic font-medium">
                          {valorCbsNota > 0
                            ? 'valor informado pelo usuário, conforme destaque da NF-e'
                            : 'campo não informado / zero (percentual derivado: 0,0000% · nada inventado)'}
                        </span>
                      </div>
                    </div>

                    {/* Linha 3: IBS (2027+) */}
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>IBS DESTACADO (2027+)</span>
                        <span className="text-[#b87c14]">{formatNumberBR(ibsNotaPct, 4)}%</span>
                      </div>
                      <div className="text-[11px] text-slate-700 font-semibold">
                        {formatBRL(valorIbsNota)} ÷ {formatBRL(totalNotaEmUso)} ={' '}
                        {formatNumberBR(ibsNotaPct, 4)}%
                      </div>
                      <div className="text-[10px] text-slate-500 italic">
                        Origem:{' '}
                        <span className="text-slate-700 not-italic font-medium">
                          {valorIbsNota > 0
                            ? 'valor informado pelo usuário, conforme destaque da NF-e'
                            : 'campo não informado / zero (percentual derivado: 0,0000% · nada inventado)'}
                        </span>
                      </div>
                    </div>

                    {/* Linha 4: Total da Parcela Creditável Derivada */}
                    <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50/80 space-y-1">
                      <div className="flex items-center justify-between font-bold text-[#261502]">
                        <span>PARCELA CREDITÁVEL TOTAL</span>
                        <span className="text-[#261502] font-black">
                          {formatNumberBR(icmsNotaPct + cbsNotaPct + ibsNotaPct, 4)}%
                        </span>
                      </div>
                      <div className="text-[11px] text-[#b87c14] font-semibold">
                        {formatNumberBR(icmsNotaPct, 4)}% + {formatNumberBR(cbsNotaPct, 4)}% +{' '}
                        {formatNumberBR(ibsNotaPct, 4)}%
                      </div>
                      <div className="text-[10px] text-[#b87c14] italic">
                        {formatBRL(valorIcmsNota + valorCbsNota + valorIbsNota)} em créditos
                        aplicados ao custo do adquirente
                      </div>
                    </div>
                  </div>

                  {/* Notas de fundamento / didática fiscal recolhidas por padrão */}
                  <details className="group rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-mono transition-colors">
                    <summary className="flex cursor-pointer items-center justify-between p-2.5 font-bold text-slate-800 hover:text-[#261502] select-none">
                      <span className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#b87c14] shrink-0" />
                        <span>Notas de fundamento · Didática Fiscal para o Contador</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-normal group-open:hidden">
                        Expandir
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[#b87c14] font-semibold hidden group-open:inline">
                        Recolher
                      </span>
                    </summary>
                    <div className="px-3 pb-3 pt-1 text-slate-600 leading-relaxed border-t border-slate-200/60">
                      O ICMS eventualmente destacado a 18% em NF-e de venda de fornecedor Simples
                      Nacional decorre da apuração de saída deste (art. 25, §1º, II da LC 123/2006 =
                      dedução na saída e não crédito do adquirente). O crédito legítimo do
                      adquirente LP/LR comprando de SN puro corresponde à fração do anexo indicada
                      em campo próprio da nota (art. 23, §§1º–2º da LC 123/2006). Os tributos
                      federais PIS e COFINS no Simples permanecem recolhidos em cota única no DAS e
                      não conferem créditos à adquirente no regime cumulativo ou puro. Em 2027+, as
                      frações de CBS e IBS informadas compõem a parcela creditável conforme a
                      legislação da Reforma Tributária (LC 214/2025).
                    </div>
                  </details>

                  {/* BOTÃO FECHAR INFERIOR (Tarja cinza degradê from-slate-700 via-slate-650 to-slate-700, mono, negrito, caixa alta, chevron up) */}
                  <div className="w-full pt-1">
                    <button
                      type="button"
                      onClick={() => setOrigem('tabela')}
                      className="w-full rounded-xl bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase cursor-pointer border border-slate-600 shadow-sm tracking-wider px-4 py-3 flex items-center justify-center gap-2 transition-all"
                    >
                      <ChevronUp className="w-4 h-4 text-white opacity-90" />
                      <span className="text-white">
                        FECHAR TABELA DE PREENCHIMENTO POR DESTAQUE
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. APRESENTAÇÃO DO ANEXO EM CAMADA INTERNA RECUADA (Formato chancelado v0.0.389) */}
            {/* Fechada por padrão: NADA do anexo aparece no fluxo da página, página enxuta */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                camadaAnexoAberta && origem === 'tabela'
                  ? 'grid-rows-[1fr] opacity-100 mt-4'
                  : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
              }`}
            >
              <div className="overflow-hidden">
                <div className="mx-1 sm:mx-3 p-3.5 sm:p-5 rounded-2xl bg-slate-100/90 border border-slate-200/90 shadow-inner space-y-4">
                  {/* Cabeçalho formal da Camada Interna Recuada */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300/70 pb-3.5">
                    <div className="border-l-4 border-[#e5b742] pl-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#e5b742] ring-2 ring-amber-300/50" />
                        <h4 className="text-sm font-bold font-mono uppercase tracking-wider text-[#261502]">
                          TABELA OFICIAL COMPLETA · ANEXOS I A V · LC 123/2006 & LC 214/2025
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Camada interna recuada · Seleção de Anexo, Faixa de RBT12 e partilha
                        tributária oficial do fornecedor SN
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-amber-300 bg-white text-[#261502] uppercase shadow-2xs">
                        {anexoNome} · {faixaNome}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCamadaAnexoAberta(false)}
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                        title="Recolher tabela do anexo"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        <span>FECHAR TABELA DO ANEXO</span>
                      </button>
                    </div>
                  </div>

                  {/* Seletores rápidos de Anexo, Faixa e RBT12 */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    {/* Seletor do Anexo (I a V) */}
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-xs font-mono text-slate-700 uppercase block font-bold">
                        Anexo do Simples Nacional
                      </label>
                      <select
                        value={anexoId}
                        onChange={(e) => {
                          const novoAnexo = e.target.value
                          setAnexoId(novoAnexo)
                          atualizarTabela(novoAnexo, faixaNum, rbt12, Number(exercicio) || 2027)
                        }}
                        className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 cursor-pointer focus:border-amber-500 focus:outline-none"
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
                      <label className="text-xs font-mono text-slate-700 uppercase block font-bold">
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
                        className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 cursor-pointer focus:border-amber-500 focus:outline-none"
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
                        <label className="text-xs font-mono text-slate-700 uppercase block font-bold">
                          RBT12 do Fornecedor (R$)
                        </label>
                        <span className="text-[10px] font-mono text-[#b87c14] font-bold">
                          fórmula PGDAS
                        </span>
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
                        className="h-8 bg-white border-slate-300 text-xs font-mono text-slate-900 focus-visible:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Exibição detalhada das alíquotas e frações calculadas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="space-y-1 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <label className="text-[10px] font-mono font-bold text-slate-600 uppercase block">
                        Alíquota Efetiva Total
                      </label>
                      <div className="h-7 px-1 flex items-center justify-between text-xs font-mono font-bold text-[#261502]">
                        <span>{formatNumberBR(efetivaPct, 2)}%</span>
                        <span className="text-[9px] text-slate-500 font-normal">
                          RBT12 deduzido
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <label className="text-[10px] font-mono font-bold text-slate-600 uppercase block">
                        ICMS / ISS ({formatNumberBR(icmsFracPct, 2)}%)
                      </label>
                      <div className="h-7 px-1 flex items-center justify-between text-xs font-mono font-bold text-slate-900">
                        <span>{formatNumberBR((efetivaPct * icmsFracPct) / 100, 4)}%</span>
                        <span className="text-[9px] text-[#b87c14] font-normal">
                          parcela creditável
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <label className="text-[10px] font-mono font-bold text-slate-600 uppercase block">
                        CBS ({formatNumberBR(cbsFracPct, 2)}%)
                      </label>
                      <div className="h-7 px-1 flex items-center justify-between text-xs font-mono font-bold text-slate-900">
                        <span>{formatNumberBR((efetivaPct * cbsFracPct) / 100, 4)}%</span>
                        <span className="text-[9px] text-[#b87c14] font-normal">
                          parcela creditável
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <label className="text-[10px] font-mono font-bold text-slate-600 uppercase block">
                        IBS ({formatNumberBR(ibsFracPct, 2)}%)
                      </label>
                      <div className="h-7 px-1 flex items-center justify-between text-xs font-mono font-bold text-slate-900">
                        <span>{formatNumberBR((efetivaPct * ibsFracPct) / 100, 4)}%</span>
                        <span className="text-[9px] text-[#b87c14] font-normal">
                          parcela creditável
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge explicativo com o status legal transparente */}
                  <div
                    className={`rounded-xl border px-3 py-2 flex flex-wrap items-center justify-between gap-2 ${
                      statusLegalTabela === 'OFICIAL'
                        ? 'border-amber-300 bg-amber-50/70'
                        : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                          statusLegalTabela === 'OFICIAL'
                            ? 'border-amber-300 bg-amber-100 text-[#261502]'
                            : 'border-amber-300 bg-amber-100 text-amber-800'
                        }`}
                      >
                        {statusLegalTabela === 'OFICIAL'
                          ? 'PERCENTUAL COM RESPALDO EM LEI (LC 123/2006 · Anexo I)'
                          : 'PENDENTE DE CONFIRMAÇÃO'}
                      </span>
                      <span className="text-xs font-mono text-slate-700">
                        {anexoNome} · {faixaNome} · Exercício {exercicio}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#261502] font-bold">
                      Parcela creditável derivada:{' '}
                      {formatNumberBR(
                        (efetivaPct * (icmsFracPct + cbsFracPct + ibsFracPct)) / 100,
                        4,
                      )}
                      %
                    </span>
                  </div>

                  {/* Nota de fundamento / rodapé da Adri (recolhida por padrão) */}
                  {notaFonteTabela && (
                    <details className="group rounded-lg border border-slate-200 bg-white text-[11px] font-mono transition-colors">
                      <summary className="flex cursor-pointer items-center justify-between p-2.5 font-semibold text-slate-700 hover:text-slate-900 select-none">
                        <span className="flex items-center gap-1.5">
                          <span>ℹ️</span>
                          <span className="font-bold">Notas de fundamento · Nota da Casa</span>
                        </span>
                        <span className="text-[10px] uppercase text-slate-400 group-open:hidden">
                          Expandir
                        </span>
                        <span className="text-[10px] uppercase text-[#b87c14] font-semibold hidden group-open:inline">
                          Recolher
                        </span>
                      </summary>
                      <div className="px-3 pb-2.5 pt-1 text-slate-600 italic border-t border-slate-100">
                        {notaFonteTabela}
                      </div>
                    </details>
                  )}

                  {/* BOTÃO FECHAR INFERIOR (Tarja marrom profundo degradê, mono, negrito, caixa alta, chevron up) */}
                  <div className="w-full pt-1">
                    <button
                      type="button"
                      onClick={() => setCamadaAnexoAberta(false)}
                      className="w-full rounded-xl bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] hover:bg-[#3b2405] text-[#fff5cc] font-mono font-bold text-xs uppercase cursor-pointer border border-amber-500/40 shadow-sm tracking-wider px-4 py-3 flex items-center justify-center gap-2 transition-all"
                    >
                      <ChevronUp className="w-4 h-4 text-[#e5b742] opacity-90" />
                      <span className="text-[#fff5cc]">FECHAR TABELA OFICIAL (ANEXOS I A V)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2 — A combinação: fornecedor × adquirente (+ seletor da base do DAS) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="border-l-4 border-[#e5b742] pl-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#261502] block">
                2 · A combinação — fornecedor SN × adquirente
              </span>
            </div>

            {/* Fornecedor */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase w-24">
                Fornecedor
              </span>
              <button
                type="button"
                onClick={() => setFornecedorSN('puro')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all border ${
                  fornecedorSN === 'puro'
                    ? 'bg-[#261502] text-[#fff5cc] border-amber-500/60 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                SN puro (DAS por dentro)
              </button>
              <button
                type="button"
                onClick={() => setFornecedorSN('hibrido')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all border ${
                  fornecedorSN === 'hibrido'
                    ? 'bg-[#261502] text-[#fff5cc] border-amber-500/60 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                SN híbrido (CBS/IBS por fora)
              </button>
            </div>
            {/* LINHA DE BAIXO: BOTÃO ABRIR / FECHAR CENÁRIOS DE CÁLCULOS (LARGURA TODA, TARJA CINZA COM LETRA BRANCA) */}
            <div className="w-full pt-1">
              <button
                type="button"
                onClick={() => setCamadaCenariosAberta((prev) => !prev)}
                className="w-full rounded-xl bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase cursor-pointer border border-slate-600 shadow-sm tracking-wider px-4 py-3 flex items-center justify-center gap-2 transition-all"
              >
                <Calculator className="w-4 h-4 text-white" />
                <span className="text-white">
                  {camadaCenariosAberta
                    ? 'FECHAR CENÁRIOS DE CÁLCULOS'
                    : 'ABRIR CENÁRIOS DE CÁLCULOS'}
                </span>
                {camadaCenariosAberta ? (
                  <ChevronUp className="w-4 h-4 ml-1 text-white opacity-90" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1 text-white opacity-90" />
                )}
              </button>
            </div>
          </div>

          {/* ================= 2. CAMADA INTERNA RECUADA (GAVETA ANINHADA NO CARTÃO PAI) ================= */}
          {/* Recuo evidente: mx-1 sm:mx-3, fundo recuado (bg-slate-100/90), borda interna fina (border border-slate-200/90), sombra interna profunda (shadow-inner) */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              camadaCenariosAberta
                ? 'grid-rows-[1fr] opacity-100 mt-4'
                : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
            }`}
          >
            <div className="overflow-hidden">
              <div className="mx-1 sm:mx-3 p-3.5 sm:p-5 rounded-2xl bg-slate-100/90 border border-slate-200/90 shadow-inner space-y-4">
                {/* Cabeçalho formal da Camada Interna Recuada — Padrão DETALHES DA COMPRA / CENÁRIOS */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300/70 pb-3.5">
                  <div className="border-l-4 border-[#e5b742] pl-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#e5b742] ring-2 ring-amber-300/50" />
                      <h4 className="text-sm font-bold font-mono uppercase tracking-wider text-[#261502]">
                        DETALHES DA COMPRA · CENÁRIOS DE CÁLCULOS · FORNECEDOR{' '}
                        {fornecedorSN === 'puro'
                          ? 'SIMPLES NACIONAL (PURO)'
                          : 'SIMPLES NACIONAL HÍBRIDO'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Camada interna recuada · Perfil do fornecedor:{' '}
                      <strong className="text-slate-800">
                        {fornecedorSN === 'puro'
                          ? 'SN puro (DAS por dentro)'
                          : 'SN híbrido (regime regular IBS/CBS)'}
                      </strong>{' '}
                      · Cenários por item com cálculo auditável e parcela creditável isolada
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 text-[#261502] uppercase shadow-xs">
                      Ambiente Ativo: {fornecedorSN === 'puro' ? 'SN Puro' : 'SN Híbrido'} ·{' '}
                      {nomeAdquirente(adquirente)}
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

                {/* Bloco de Controles e Seletores da Camada: Adquirente, Base do DAS, Repasse e Comparador */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-2xs">
                  {/* Adquirente */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase w-24">
                      Adquirente
                    </span>
                    {ADQUIRENTES.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAdquirente(a.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all border ${
                          adquirente === a.id
                            ? 'bg-[#261502] text-[#fff5cc] border-amber-500/60 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>

                  {/* Base do DAS (Res. CGSN 190/2026) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase w-24">
                      Base do DAS
                    </span>
                    <button
                      type="button"
                      onClick={() => setBaseDoDas('bruta')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all border ${
                        baseDoDas === 'bruta'
                          ? 'bg-[#261502] text-[#fff5cc] border-amber-500/60 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Bruta (LC 123 art. 3º §12º) [padrão]
                    </button>
                    <button
                      type="button"
                      onClick={() => setBaseDoDas('liquida')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all border ${
                        baseDoDas === 'liquida'
                          ? 'bg-[#261502] text-[#fff5cc] border-amber-500/60 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Líquida do ICMS da nota (art. 25 §1º II)
                    </button>
                    <span className="text-[10px] font-mono text-slate-500">
                      (Res. CGSN 190/2026 pendente)
                    </span>
                  </div>

                  {/* Repasse — SÓ quando o fornecedor reprecifica (híbrido) */}
                  {fornecedorSN === 'hibrido' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-700 uppercase w-24">
                        Repasse
                      </span>
                      {[
                        { m: 'integral' as RepasseMode, l: 'Integral' },
                        {
                          m: 'parcial' as RepasseMode,
                          l: `Parcial ${formatNumberBR(repassePct)}%`,
                        },
                        { m: 'nenhum' as RepasseMode, l: 'Nenhum' },
                      ].map(({ m, l }) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setRepasse(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all border ${
                            repasse === m
                              ? 'bg-[#261502] text-[#fff5cc] border-amber-500/60 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
                          className="w-20 h-8 bg-white border-slate-300 text-xs font-mono text-slate-900 focus-visible:ring-amber-500"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                      <span>
                        Repasse não se aplica — fornecedor SN puro não reprecifica por destaque:
                        tributos por dentro do DAS, nota congelada (LC 123/2006).
                      </span>
                    </div>
                  )}

                  {/* GATILHO DO COMPARADOR */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setComparadorAberto(true)}
                    className="border-amber-400 text-[#261502] bg-amber-50 hover:bg-amber-100 cursor-pointer h-8 text-xs font-mono font-bold self-start shadow-xs"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" /> Comparar fornecedores SN puro
                    × híbrido
                  </Button>
                </div>

                {/* 3 — Camada 1: resumo por item (ABC, nunca média) COM os dois fornecedores */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 border-l-4 border-[#e5b742] pl-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#261502]">
                      3 · Custo líquido do adquirente — {nomeAdquirente(adquirente)} · Exercício{' '}
                      {exercicio} (Consome Parcela Creditável)
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetalheAberto((o) => !o)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer h-8 text-xs font-mono font-bold"
                    >
                      {detalheAberto ? (
                        <>
                          <ArrowDown className="w-3.5 h-3.5 mr-1" /> Fechar detalhe
                        </>
                      ) : (
                        <>
                          <Calculator className="w-3.5 h-3.5 mr-1" /> Abrir detalhe por item
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {exibidos.map((res, i) => {
                      const sel = fornecedorSN === 'puro' ? res.puro : res.hibrido
                      const selLabel = fornecedorSN === 'puro' ? 'SN puro' : 'SN híbrido'
                      const ativo = i === idxItem && detalheAberto
                      return (
                        <button
                          key={res.item.id}
                          type="button"
                          onClick={() => {
                            setIdxItem(i)
                            setDetalheAberto(true)
                          }}
                          className={`rounded-xl border p-3 text-left cursor-pointer transition-all ${
                            ativo
                              ? 'bg-amber-50/90 border-amber-500 ring-1 ring-amber-400 shadow-xs'
                              : 'bg-slate-50/60 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold uppercase text-slate-900 truncate block max-w-full">
                            {res.item.name || 'Item'}
                          </span>
                          <span className="text-[10px] font-mono font-bold uppercase text-[#261502] block leading-tight mt-0.5">
                            {selLabel}
                          </span>
                          <span className="text-sm font-black text-slate-900 font-mono block leading-tight mt-1">
                            {formatBRL(sel.unitario)}/un
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold mt-0.5 block ${
                              sel.deltaPct > 0
                                ? 'text-rose-700'
                                : sel.deltaPct < 0
                                  ? 'text-[#b87c14]'
                                  : 'text-slate-500'
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
                        {fornecedorSN === 'puro'
                          ? 'SN puro (por dentro)'
                          : 'SN híbrido (regime regular)'}{' '}
                        × {nomeAdquirente(adquirente)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-stretch">
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
                          linhas={
                            adquirente === 'simples'
                              ? [
                                  {
                                    label:
                                      '(+) Valor da operação — nota cheia (mercadorias + frete)',
                                    formula: `${fmtSN(itemAtivo.item.merchandiseValue)} + ${fmtSN(itemAtivo.item.freightValue)} = ${fmtSN(itemAtivo.puro.r.receitaBruta)} (${itemAtivo.item.quantity} un.)`,
                                    value: itemAtivo.puro.r.receitaBruta,
                                    value6: itemAtivo.puro.r.receitaBruta6,
                                  },
                                  {
                                    label: '(−) Crédito ICMS (art. 13, §1º, LC 123/2006)',
                                    formula:
                                      '0,00 (dedução na apuração do DAS, não crédito na aquisição; sem destaque na nota)',
                                    value: 0,
                                    value6: 0,
                                  },
                                  {
                                    label:
                                      '(−) Crédito PIS/COFINS (SN isento da não cumulatividade)',
                                    formula:
                                      '0,00 (adquirente optante pelo Simples Nacional é isento do regime não cumulativo)',
                                    value: 0,
                                    value6: 0,
                                  },
                                  {
                                    label: '(=) Compras líquidas (custo de aquisição = NOTA CHEIA)',
                                    formula: `${fmtSN(itemAtivo.puro.r.receitaBruta)} − 0,00 = ${fmtSN(itemAtivo.puro.r.custoHojeSN6, 6)}`,
                                    value: itemAtivo.puro.r.custoHojeSN,
                                    value6: itemAtivo.puro.r.custoHojeSN6,
                                  },
                                  {
                                    label: '(÷) Custo unitário HOJE-SN',
                                    formula: `${fmtSN(itemAtivo.puro.r.custoHojeSN)} ÷ ${itemAtivo.item.quantity} un. = ${fmtSN(itemAtivo.puro.r.custoUnitarioHojeSN)}`,
                                    value: itemAtivo.puro.r.custoUnitarioHojeSN,
                                    value6: itemAtivo.puro.r.custoUnitarioHojeSN6,
                                    destaque: true,
                                  },
                                ]
                              : [
                                  {
                                    label: '(+) Valor da operação — nota congelada (sem destaque)',
                                    formula: `${itemAtivo.item.quantity} un. × R$ ${fmtSN(itemAtivo.item.merchandiseValue / Math.max(1, itemAtivo.item.quantity), 2)} — da Calculadora de Compras`,
                                    value: itemAtivo.puro.r.receitaBruta,
                                    value6: itemAtivo.puro.r.receitaBruta6,
                                  },
                                  {
                                    label: `(−) Crédito de ICMS do adquirente (2026) [Fração ${fmtSN(itemAtivo.puro.r.icmsPct, 2)}%]`,
                                    formula: `${fmtSN(itemAtivo.puro.r.icmsPct, 2)}% × ${fmtSN(itemAtivo.puro.r.receitaBruta)} = ${fmtSN(itemAtivo.puro.r.icmsCreditoHojeSN6, 6)}`,
                                    value: -itemAtivo.puro.r.icmsCreditoHojeSN,
                                    value6: -itemAtivo.puro.r.icmsCreditoHojeSN6,
                                    destaque: true,
                                  },
                                  ...(adquirente === 'real' &&
                                  itemAtivo.puro.r.creditoPisCofinsHoje > 0
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
                                ]
                          }
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
                                  ? 'bg-amber-500/20 text-[#b87c14] border border-amber-500/40'
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
                              formula:
                                itemAtivo.puro.r.origemPercentuais === 'nota'
                                  ? `Alíquota da nota: ${fmtSN(itemAtivo.puro.r.icmsPct, 4)}% [destaque da nota, art. 23 §2º] × ${fmtSN(itemAtivo.puro.r.baseDasUtilizada6, 2)} = ${fmtSN(itemAtivo.puro.r.icmsNota6, 6)}`
                                  : `Fração ${fmtSN(itemAtivo.puro.r.perfil.icmsFracPct ?? icmsFracPct, 2)}% [${itemAtivo.puro.r.perfil.anexo || anexoNome} · ${itemAtivo.puro.r.perfil.faixa || faixaNome}] × Alíquota Efetiva ${fmtSN(itemAtivo.puro.r.efetivaPct, 2)}% = ${fmtSN(itemAtivo.puro.r.icmsNota6, 6)}`,
                              value: itemAtivo.puro.r.icmsNota,
                              value6: itemAtivo.puro.r.icmsNota6,
                            },
                            // BLOCO 2
                            {
                              label: `2. Parcela CBS (${fmtSN(itemAtivo.puro.r.cbsPct, 4)}%)`,
                              formula:
                                itemAtivo.puro.r.origemPercentuais === 'nota'
                                  ? `Alíquota da nota: ${fmtSN(itemAtivo.puro.r.cbsPct, 4)}% [destaque da nota, art. 23 §2º] × ${fmtSN(itemAtivo.puro.r.baseDasUtilizada6, 2)} = ${fmtSN(itemAtivo.puro.r.cbsDAS6, 6)}`
                                  : `Fração ${fmtSN(itemAtivo.puro.r.perfil.cbsFracPct ?? cbsFracPct, 2)}% [${itemAtivo.puro.r.perfil.anexo || anexoNome} · ${itemAtivo.puro.r.perfil.faixa || faixaNome}] × Alíquota Efetiva ${fmtSN(itemAtivo.puro.r.efetivaPct, 2)}% = ${fmtSN(itemAtivo.puro.r.cbsDAS6, 6)}`,
                              value: itemAtivo.puro.r.cbsDAS,
                              value6: itemAtivo.puro.r.cbsDAS6,
                            },
                            // BLOCO 3
                            {
                              label: `3. Parcela IBS (${fmtSN(itemAtivo.puro.r.ibsPct, 4)}%)`,
                              formula:
                                itemAtivo.puro.r.origemPercentuais === 'nota'
                                  ? `Alíquota da nota: ${fmtSN(itemAtivo.puro.r.ibsPct, 4)}% [destaque da nota, art. 23 §2º] × ${fmtSN(itemAtivo.puro.r.baseDasUtilizada6, 2)} = ${fmtSN(itemAtivo.puro.r.ibsDAS6, 6)}`
                                  : `Fração ${fmtSN(itemAtivo.puro.r.perfil.ibsFracPct ?? ibsFracPct, 2)}% [${itemAtivo.puro.r.perfil.anexo || anexoNome} · ${itemAtivo.puro.r.perfil.faixa || faixaNome}] × Alíquota Efetiva ${fmtSN(itemAtivo.puro.r.efetivaPct, 2)}% = ${fmtSN(itemAtivo.puro.r.ibsDAS6, 6)}`,
                              value: itemAtivo.puro.r.ibsDAS,
                              value6: itemAtivo.puro.r.ibsDAS6,
                            },
                            // BLOCO 4
                            {
                              label: `4. Parcela IRPJ / CSLL / CPP (${fmtSN(itemAtivo.puro.r.irpjCsllCppPct, 4)}%) — NÃO GERA CRÉDITO`,
                              formula:
                                itemAtivo.puro.r.origemPercentuais === 'nota'
                                  ? `Alíquota residual: ${fmtSN(itemAtivo.puro.r.irpjCsllCppPct, 4)}% × ${fmtSN(itemAtivo.puro.r.baseDasUtilizada6, 2)} = ${fmtSN(itemAtivo.puro.r.irpjCsllCppDAS6, 6)}`
                                  : `Fração ${fmtSN(itemAtivo.puro.r.perfil.irpjCsllCppFracPct ?? irpjCsllCppFracPct, 2)}% [${itemAtivo.puro.r.perfil.anexo || anexoNome} · ${itemAtivo.puro.r.perfil.faixa || faixaNome}] × Alíquota Efetiva ${fmtSN(itemAtivo.puro.r.efetivaPct, 2)}% = ${fmtSN(itemAtivo.puro.r.irpjCsllCppDAS6, 6)}`,
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

                {/* BOTÃO INFERIOR DE FECHAMENTO: FECHAR CENÁRIOS DE CÁLCULOS (SEGUNDO PONTO DE FECHAMENTO DENTRO DA CAMADA) */}
                <div className="w-full pt-1">
                  <button
                    type="button"
                    onClick={() => setCamadaCenariosAberta(false)}
                    className="w-full rounded-xl bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase cursor-pointer border border-slate-600 shadow-sm tracking-wider px-4 py-3 flex items-center justify-center gap-2 transition-all"
                  >
                    <Calculator className="w-4 h-4 text-white" />
                    <span className="text-white">FECHAR CENÁRIOS DE CÁLCULOS</span>
                    <ChevronUp className="w-4 h-4 ml-1 text-white opacity-90" />
                  </button>
                </div>
              </div>
            </div>
          </div>

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
