import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileText,
  Info,
  Layers,
  Sparkles,
  ShoppingBag,
  PackageCheck,
  Scale,
} from 'lucide-react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'
import { MoneyInput } from '@/components/demo/MoneyInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTaxContext } from '@/contexts/TaxContext'
import { formatBRL, formatNumberBR, formatPercentBR } from '@/lib/taxCalculations'
import {
  computeCellArt12,
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  CASO_CANONICO_ART12,
  type CmvArt12Input,
} from '@/lib/art12Calculations'
import {
  roundHalfUp,
  calcularCelulaFornecedorPlenoXAdquirenteSn,
  type ResultadoCelulaFornecedorPlenoXAdquirenteSn,
} from '@/lib/art12SnCalculations'
import {
  montarItensIntegracao,
  derivarCasoUnitario,
  type ItemIntegracaoArt12,
} from '@/lib/integracaoComprasArt12'
import {
  calcularMarkupPosColuna,
  carregarEstadoMarkupPos,
  salvarEstadoMarkupPos,
  type DespesaVariavelVenda,
  type FornecedorPosKey,
  FORNECEDORES_META,
} from '@/lib/markupPosCalculations'

/** Constantes de referência chanceladas pela Adri (proteção de ouro) */
export const REFERENCIAS_MARKUP_POS = {
  ICMS_PADRAO_PCT: 18.0, // Fator 0,8200
  CBS_PADRAO_PCT: 26.5, // 26,50% por fora
  IBS_PADRAO_PCT: 0.1, // 0,10% por fora (alíquota-teste LC 214 art. 346)
  MARGEM_PADRAO_PCT: 51.9, // 51,90% chancelada pré-reforma
  QUANTIDADE_PADRAO: 24, // 24 un. caso canônico
} as const

export function MarkupPosPage() {
  const { purchasesItems, markupProducts, simplesAnexo, simplesRbt12, effectiveSimplesRbt12 } =
    useTaxContext()

  // --------------------------------------------------------------------------
  // 1. PRODUTO ATIVO (extraído automaticamente da Calculadora Markup pré-reforma)
  // --------------------------------------------------------------------------
  const produtoAtivo = useMemo(() => {
    if (!markupProducts || markupProducts.length === 0) return null
    // Seleciona o primeiro produto que possui nome ou custo configurado
    const comDados = markupProducts.find((p) => p.name && p.name.trim().length > 0)
    return comDados || markupProducts[0]
  }, [markupProducts])

  const temProdutoAtivo = Boolean(
    produtoAtivo && produtoAtivo.name && produtoAtivo.name.trim().length > 0,
  )

  // --------------------------------------------------------------------------
  // 2. EIXO — CUSTO DO ADQUIRENTE (leitura ao vivo do Card 03 da página Compras)
  // --------------------------------------------------------------------------
  const { itensOrigem, casoUnitario } = useMemo(() => {
    const itens = montarItensIntegracao(purchasesItems || [])
    const caso = derivarCasoUnitario(itens)
    return { itensOrigem: itens, casoUnitario: caso }
  }, [purchasesItems])

  const temComprasAtivas = Boolean(
    casoUnitario.input && casoUnitario.item && casoUnitario.item.valorNota > 0,
  )

  // Fallback para caso canônico na validação (quando não houver preenchimento na sessão)
  const inputEfetivo: CmvArt12Input = temComprasAtivas ? casoUnitario.input! : CASO_CANONICO_ART12
  const itemEfetivo: ItemIntegracaoArt12 | undefined = temComprasAtivas
    ? casoUnitario.item!
    : undefined

  // Linha do cronograma oficial para 2027
  const row2027 = useMemo(() => {
    return CRONOGRAMA_ART12.find((r) => r.exercicio === 2027) || CRONOGRAMA_ART12[1]
  }, [])

  // Cálculo das 4 células de fornecedor para o adquirente Lucro Presumido em 2027
  const custosAdquirente = useMemo(() => {
    // 1. Célula LP (LP × LP)
    const cellLp = computeCellArt12(
      inputEfetivo,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'presumido',
        fornecedorRegime: 'presumido',
      },
      row2027,
    )

    // 2. Célula LR (LP × LR)
    const cellLr = computeCellArt12(
      inputEfetivo,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'presumido',
        fornecedorRegime: 'real',
      },
      row2027,
    )

    // 3. Célula SNP (LP × SN Puro — motor canônico calcularCelulaFornecedorPlenoXAdquirenteSn)
    const celulaSnp: ResultadoCelulaFornecedorPlenoXAdquirenteSn =
      calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_presumido', 'simples', itemEfetivo)

    // 4. Célula SNH (LP × SN Híbrido — motor canônico calcularCelulaFornecedorPlenoXAdquirenteSn)
    const celulaSnh: ResultadoCelulaFornecedorPlenoXAdquirenteSn =
      calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_presumido', 'simples_hibrido', itemEfetivo)

    return {
      lp: {
        custo2027: cellLp.exercicio.unitario,
        custoHoje: cellLp.hoje.unitario,
        deltaPct: cellLp.deltaPct,
        comprasLiquidas2027: cellLp.exercicio.liquido,
        notaCheia2027: cellLp.exercicio.bruto,
        cellRaw: cellLp,
      },
      lr: {
        custo2027: cellLr.exercicio.unitario,
        custoHoje: cellLr.hoje.unitario,
        deltaPct: cellLr.deltaPct,
        comprasLiquidas2027: cellLr.exercicio.liquido,
        notaCheia2027: cellLr.exercicio.bruto,
        cellRaw: cellLr,
      },
      snp: {
        custo2027: celulaSnp.exercicio2027.custoUnitario,
        custoHoje: celulaSnp.hoje.custoUnitario,
        deltaPct: celulaSnp.deltaPct,
        comprasLiquidas2027: celulaSnp.exercicio2027.comprasLiquidas,
        notaCheia2027: celulaSnp.exercicio2027.notaCheia,
        celulaSnRaw: celulaSnp,
      },
      snh: {
        custo2027: celulaSnh.exercicio2027.custoUnitario,
        custoHoje: celulaSnh.hoje.custoUnitario,
        deltaPct: celulaSnh.deltaPct,
        comprasLiquidas2027: celulaSnh.exercicio2027.comprasLiquidas,
        notaCheia2027: celulaSnh.exercicio2027.notaCheia,
        celulaSnRaw: celulaSnh,
      },
    }
  }, [inputEfetivo, itemEfetivo, row2027])

  // --------------------------------------------------------------------------
  // 3. PERSISTÊNCIA DOS VALORES DIGITADOS (POLÍTICA: "UM SALVAMENTO, UMA PÁGINA")
  // --------------------------------------------------------------------------
  // Ao primeiro acesso (sem salvamento prévio), os campos nascem vazios (undefined)
  // com placeholders de referência chancelados. O estado salvo restaura os valores
  // digitados sem apagar na navegação ou reload.
  const estadoSalvoInicial = useMemo(() => carregarEstadoMarkupPos(), [])

  // Botão selecionável do fornecedor principal
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorPosKey>(
    estadoSalvoInicial?.fornecedorSelecionado ?? 'lp',
  )

  // Despesas variáveis de venda (DV) — lista persistida, vazia ao primeiro acesso
  const [despesasVariaveis, setDespesasVariaveis] = useState<DespesaVariavelVenda[]>(
    estadoSalvoInicial?.despesasVariaveis ?? [],
  )

  const handleAddDv = () => {
    const novoId = `dv-${Date.now()}`
    setDespesasVariaveis((prev) => [...prev, { id: novoId, descricao: '', aliquota: undefined }])
  }

  const handleUpdateDv = (
    id: string,
    campo: 'descricao' | 'aliquota',
    valor: string | number | undefined,
  ) => {
    setDespesasVariaveis((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (campo === 'aliquota') {
          return {
            ...item,
            aliquota: typeof valor === 'number' ? Math.max(0, valor) : undefined,
          }
        }
        return { ...item, descricao: String(valor ?? '') }
      }),
    )
  }

  const handleRemoveDv = (id: string) => {
    setDespesasVariaveis((prev) => prev.filter((item) => item.id !== id))
  }

  // Soma de DV e fator multiplicativo consolidado (vazio trata como 0%)
  const somaDvPct = useMemo(() => {
    return despesasVariaveis.reduce((acc, curr) => acc + (curr.aliquota ?? 0), 0)
  }, [despesasVariaveis])

  const fatorDvConsolidado = useMemo(() => {
    let f = 1
    for (const dv of despesasVariaveis) {
      const aliq = dv.aliquota ?? 0
      f *= Math.max(0, 1 - aliq / 100)
    }
    return f
  }, [despesasVariaveis])

  // --------------------------------------------------------------------------
  // 4. TRIBUTOS — COMPOSIÇÃO PÓS-REFORMA (campos nascem vazios; motor usa referência)
  // --------------------------------------------------------------------------
  // ICMS editável na transição (LP/LR): nasce vazio (undefined), ref. 18,00%
  const [icmsRateInput, setIcmsRateInput] = useState<number | undefined>(
    estadoSalvoInicial?.icmsRateInput,
  )
  const icmsRateEfetivo = icmsRateInput ?? REFERENCIAS_MARKUP_POS.ICMS_PADRAO_PCT
  const fatorIcms = useMemo(() => Math.max(0, 1 - icmsRateEfetivo / 100), [icmsRateEfetivo])

  // CBS 2027: nasce vazio (undefined), ref. 26,50%
  const [cbsRateInput, setCbsRateInput] = useState<number | undefined>(
    estadoSalvoInicial?.cbsRateInput,
  )
  const cbsRateEfetivo = cbsRateInput ?? REFERENCIAS_MARKUP_POS.CBS_PADRAO_PCT

  // IBS 2027: nasce vazio (undefined), ref. 0,10%
  const [ibsRateInput, setIbsRateInput] = useState<number | undefined>(
    estadoSalvoInicial?.ibsRateInput,
  )
  const ibsRateEfetivo = ibsRateInput ?? REFERENCIAS_MARKUP_POS.IBS_PADRAO_PCT

  // Margem de lucro desejada %: nasce vazia (undefined), ref. 51,90%
  const margemReferencia = useMemo(() => {
    if (produtoAtivo && produtoAtivo.margin && produtoAtivo.margin > 0) {
      return produtoAtivo.margin
    }
    return REFERENCIAS_MARKUP_POS.MARGEM_PADRAO_PCT
  }, [produtoAtivo])

  const [margemLucroInput, setMargemLucroInput] = useState<number | undefined>(
    estadoSalvoInicial?.margemLucroInput,
  )
  const margemLucroEfetiva = margemLucroInput ?? margemReferencia
  const fatorMargem = useMemo(() => Math.max(0, 1 - margemLucroEfetiva / 100), [margemLucroEfetiva])

  // Quantidade vendida: nasce vazia (undefined), ref. 24 un.
  const quantidadeReferencia = useMemo(() => {
    if (produtoAtivo && produtoAtivo.quantity && produtoAtivo.quantity > 0) {
      return produtoAtivo.quantity
    }
    return REFERENCIAS_MARKUP_POS.QUANTIDADE_PADRAO
  }, [produtoAtivo])

  const [quantidadeVendidaInput, setQuantidadeVendidaInput] = useState<number | undefined>(
    estadoSalvoInicial?.quantidadeVendidaInput,
  )
  const quantidadeVendidaEfetiva =
    quantidadeVendidaInput !== undefined && quantidadeVendidaInput > 0
      ? Math.round(quantidadeVendidaInput)
      : quantidadeReferencia

  // EFEITO DE PERSISTÊNCIA AUTOMÁTICA (apenas o que o usuário digita é salvo)
  useEffect(() => {
    salvarEstadoMarkupPos({
      despesasVariaveis,
      icmsRateInput,
      cbsRateInput,
      ibsRateInput,
      margemLucroInput,
      quantidadeVendidaInput,
      fornecedorSelecionado,
    })
  }, [
    despesasVariaveis,
    icmsRateInput,
    cbsRateInput,
    ibsRateInput,
    margemLucroInput,
    quantidadeVendidaInput,
    fornecedorSelecionado,
  ])

  // Parâmetros do Simples Nacional vindos do TaxContext
  const simplesAnexoAtivo = simplesAnexo || 'anexo_1'
  const simplesRbt12Ativo = effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0

  // Divisor sem ICMS (comum para LP/LR e base de cálculo)
  const divisorSemIcms = useMemo(() => {
    const d = fatorDvConsolidado * fatorMargem
    return d > 0 ? d : 0.0001
  }, [fatorDvConsolidado, fatorMargem])

  // --------------------------------------------------------------------------
  // SIMULAÇÃO COMPLETA DOS 4 FORNECEDORES LADO A LADO VIA MOTOR DEDICADO
  // - LP e LR: Composição com ICMS da transição (art. 12 §2º V + RC 32303/2025).
  // - SNP: Simples Nacional Puro — DAS por dentro (alíquota efetiva do anexo), fatias detalhadas, sem ICMS 18%.
  // - SNH: Simples Nacional Híbrido — DAS híbrido (ICMS e federais), CBS/IBS por fora sobre base sem ICMS.
  // --------------------------------------------------------------------------
  const simulacaoQuatroColunas = useMemo(() => {
    const keys: FornecedorPosKey[] = ['lp', 'lr', 'snp', 'snh']
    return keys.map((key) => {
      const custoInfo = custosAdquirente[key]
      const resultado = calcularMarkupPosColuna({
        key,
        custoUnitario: custoInfo.custo2027,
        custoHoje: custoInfo.custoHoje,
        deltaCustoPct: custoInfo.deltaPct,
        comprasLiquidasTotal: custoInfo.comprasLiquidas2027,
        notaCompraTotal: custoInfo.notaCheia2027,
        fatorDvConsolidado,
        somaDvPct,
        margemLucroEfetiva,
        icmsRateEfetivo,
        cbsRateEfetivo,
        ibsRateEfetivo,
        quantidadeVendidaEfetiva,
        simplesAnexo: simplesAnexoAtivo,
        simplesRbt12: simplesRbt12Ativo,
        effectiveSimplesRbt12,
      })

      return {
        ...resultado,
        custoInfo,
      }
    })
  }, [
    custosAdquirente,
    fatorDvConsolidado,
    somaDvPct,
    margemLucroEfetiva,
    icmsRateEfetivo,
    cbsRateEfetivo,
    ibsRateEfetivo,
    quantidadeVendidaEfetiva,
    simplesAnexoAtivo,
    simplesRbt12Ativo,
  ])

  // Estado do diálogo de memória de cálculo detalhada
  const [modalMemoriaFornecedor, setModalMemoriaFornecedor] = useState<FornecedorPosKey | null>(
    null,
  )
  const itemMemoriaAtivo = useMemo(() => {
    if (!modalMemoriaFornecedor) return null
    return simulacaoQuatroColunas.find((s) => s.key === modalMemoriaFornecedor) || null
  }, [modalMemoriaFornecedor, simulacaoQuatroColunas])

  return (
    <DemoLayout currentTab="markup-pos">
      <div className="space-y-6">
        {/* PageHero no padrão visual IT */}
        <PageHero
          title="CALCULADORA DE MARKUP — PÓS EC 132"
          subtitle="Formação do Preço de Venda Pós-Reforma Tributária (2027+): Eixo no Novo Custo do Adquirente (Card 03 Compras), despesas variáveis, ICMS na transição e CBS por fora."
          badge="ETAPA 6 · PRECIFICAÇÃO E MARKUP PÓS-REFORMA"
          icon={Calculator}
        />

        {/* ========================================================================= */}
        {/* AVISOS DE INTEGRAÇÃO / ESTADO VAZIO (quando aplicável)                    */}
        {/* ========================================================================= */}
        {!temProdutoAtivo && (
          <div className="rounded-xl border border-amber-400/60 bg-amber-50/90 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-[#5c3e06]">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3b2405]">
                  Item 01 — Nenhum Produto Ativo na Calculadora Markup Pré-Reforma
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Esta calculadora extrai automaticamente o produto ativo da Calculadora de Markup.
                  Crie ou selecione um produto para vincular as descrições e margens planejadas.
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-b from-[#ffd966] via-[#f5b014] to-[#8f5204] text-[#1a0c01] font-bold text-xs shadow-xs hover:brightness-110 cursor-pointer whitespace-nowrap"
            >
              <Link to="/demo/markup">
                Ir para Markup <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        {!temComprasAtivas && (
          <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-[#5c3e06]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3b2405]">
                  Card 03 Compras — Operando com Caso Canônico de Validação
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  A Calculadora de Compras ainda não possui compras ativas na sessão. Os custos de
                  2027 estão sendo calculados ao vivo sobre o{' '}
                  <strong className="text-slate-900 font-semibold">Caso Canônico da Adri</strong>{' '}
                  (LP 1.116,63 · LR 1.051,73 · SNP 1.482,94 · SNH 1.383,56).
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-amber-300 text-[#3b2405] hover:bg-amber-100 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <Link to="/demo/compras">Preencher Compras</Link>
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BANNER 01 — PRODUTO DE REFERÊNCIA & EIXO DE CUSTO ADQUIRENTE 2027          */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-amber-300/70 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/10 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] flex items-center justify-center text-[#261502] font-black text-xs shadow-xs">
                01
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#b87c14] block">
                  Produto Ativo da Integração Pré-Reforma
                </span>
                <h3 className="text-sm font-black text-[#261502] tracking-tight">
                  {temProdutoAtivo
                    ? produtoAtivo?.name
                    : 'Smartphone Galaxy S24 Ultra (ou Produto de Referência)'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-[#3b2405] text-[11px] font-mono font-bold border border-amber-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#b87c14]" />
                Integração Automática Ativa
              </span>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs text-[#5c3e06] hover:text-[#261502] hover:bg-amber-50 h-7"
              >
                <Link to="/demo/markup">Editar na Markup</Link>
              </Button>
            </div>
          </div>

          {/* Cards dos 4 custos de adquirente Lucro Presumido 2027 (Card 03 Compras) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#b87c14]" />
                <span className="text-xs font-mono font-bold uppercase text-[#3b2405]">
                  Eixo do Adquirente 2027 — Leitura do Card 03 da Calculadora de Compras:
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Adquirente Lucro Presumido · Exercício 2027 (PIS/COFINS extintos)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(
                [
                  {
                    key: 'lp' as FornecedorPosKey,
                    sigla: 'LP',
                    titulo: 'CUSTO COM FORNECEDOR LP',
                    desc: 'Lucro Presumido (integral)',
                    info: custosAdquirente.lp,
                    cor: 'border-amber-300 bg-amber-50/50',
                  },
                  {
                    key: 'lr' as FornecedorPosKey,
                    sigla: 'LR',
                    titulo: 'CUSTO COM FORNECEDOR LR',
                    desc: 'Lucro Real (Régua A neutra)',
                    info: custosAdquirente.lr,
                    cor: 'border-sky-300 bg-sky-50/50',
                  },
                  {
                    key: 'snp' as FornecedorPosKey,
                    sigla: 'SNP',
                    titulo: 'CUSTO COM FORNECEDOR SNP',
                    desc: 'Simples Nacional Puro',
                    info: custosAdquirente.snp,
                    cor: 'border-orange-300 bg-orange-50/50',
                  },
                  {
                    key: 'snh' as FornecedorPosKey,
                    sigla: 'SNH',
                    titulo: 'CUSTO COM FORNECEDOR SNH',
                    desc: 'Simples Nacional Híbrido',
                    info: custosAdquirente.snh,
                    cor: 'border-emerald-300 bg-emerald-50/50',
                  },
                ] as const
              ).map((card) => {
                const isSelected = fornecedorSelecionado === card.key
                const deltaPositivo = card.info.deltaPct >= 0
                return (
                  <div
                    key={card.key}
                    onClick={() => setFornecedorSelecionado(card.key)}
                    className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#b87c14] bg-amber-50/90 shadow-md ring-2 ring-[#b87c14]/40 -translate-y-0.5'
                        : `${card.cor} hover:border-[#b87c14]/50 hover:bg-white`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-black uppercase text-[#261502] bg-white/80 border border-amber-300/80 px-2 py-0.5 rounded">
                        {card.sigla}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                          deltaPositivo ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {deltaPositivo ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        Δ {deltaPositivo ? '+' : ''}
                        {formatNumberBR(card.info.deltaPct)}%
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-slate-800 uppercase block leading-tight">
                      {card.titulo}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block mb-2">
                      {card.desc}
                    </span>

                    <div className="pt-2 border-t border-amber-900/10 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          Custo 2027:
                        </span>
                        <span className="text-base font-black font-mono text-[#261502]">
                          {formatBRL(card.info.custo2027)}
                          <span className="text-[10px] text-slate-500 font-normal">/un</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-slate-400 block">HOJE 2026</span>
                        <span className="text-[11px] font-mono text-slate-600 line-through">
                          {formatBRL(card.info.custoHoje)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SELEÇÃO DO FORNECEDOR PRINCIPAL (BOTÕES SELECIONÁVEIS)                    */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-50/60 via-white to-amber-50/60 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black uppercase text-[#261502]">
              Fornecedor Selecionado para Foco da Operação:
            </span>
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              (Os 4 custos continuam simulados lado a lado abaixo)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {(['lp', 'lr', 'snp', 'snh'] as const).map((key) => {
              const ativo = fornecedorSelecionado === key
              const meta = FORNECEDORES_META[key]
              const custo = custosAdquirente[key].custo2027
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFornecedorSelecionado(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                    ativo
                      ? 'bg-gradient-to-b from-[#ffd966] via-[#f5b014] to-[#8f5204] text-[#1a0c01] border border-amber-300 shadow-sm ring-1 ring-[#b87c14]/40 font-black'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50/80 hover:text-[#261502]'
                  }`}
                >
                  {meta.sigla} · {formatBRL(custo)}
                </button>
              )
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PARÂMETROS EDITÁVEIS: DESPESAS VARIÁVEIS, TRIBUTOS E MARGEM DE LUCRO       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* CARD 01: DESPESAS VARIÁVEIS DE VENDA (DV) */}
          <div className="rounded-2xl border border-amber-300/70 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-amber-900/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#261502] text-amber-200 text-xs font-bold font-mono flex items-center justify-center">
                    DV
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#261502] tracking-wider">
                      Despesas Variáveis (DV)
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Fator multiplicativo redutor (1 − %)
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDv}
                  className="h-7 text-xs border-amber-300 text-[#3b2405] hover:bg-amber-50 font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                </Button>
              </div>

              {/* Lista de DVs editáveis */}
              {despesasVariaveis.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 p-4 text-center space-y-2">
                  <p className="text-xs text-slate-600 font-mono leading-relaxed">
                    Nenhuma despesa variável configurada. A lista nasce vazia para digitação manual
                    do usuário (ex.: Frete de entrega 3,00%, Comissão 2,00%, Maquininha 2,50%).
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddDv}
                    className="h-8 text-xs bg-gradient-to-b from-[#ffd966] via-[#f5b014] to-[#8f5204] text-[#1a0c01] font-bold shadow-xs hover:brightness-110 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar despesa variável
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {despesasVariaveis.map((dv) => {
                    const fatorDerivado = Math.max(0, 1 - (dv.aliquota ?? 0) / 100)
                    return (
                      <div
                        key={dv.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 flex items-center gap-2.5"
                      >
                        <input
                          type="text"
                          value={dv.descricao}
                          onChange={(e) => handleUpdateDv(dv.id, 'descricao', e.target.value)}
                          placeholder="Ex.: Frete, Cartão, Comissão..."
                          className="flex-1 min-w-[120px] h-9 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-[#b87c14]"
                        />

                        <div className="w-28 shrink-0">
                          <MoneyInput
                            value={dv.aliquota}
                            onChange={(val) => handleUpdateDv(dv.id, 'aliquota', val)}
                            decimals={2}
                            placeholder="0,00"
                            className="h-9 text-xs font-mono font-bold text-right field-input-brown text-[#261502]"
                            suffix="%"
                          />
                        </div>

                        <div className="w-20 text-right shrink-0">
                          <span className="text-[9px] font-mono text-slate-400 block uppercase">
                            Fator
                          </span>
                          <span className="text-xs font-mono font-bold text-[#3b2405]">
                            {fatorDerivado.toFixed(4)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDv(dv.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer transition-colors rounded hover:bg-rose-50 shrink-0"
                          title="Remover despesa variável"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Totalizadores de DV */}
            <div className="pt-3 border-t border-amber-900/10 flex items-center justify-between bg-amber-50/70 p-3 rounded-xl">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">
                  Total Σ DV
                </span>
                <span className="text-base font-black font-mono text-[#261502]">
                  {formatPercentBR(somaDvPct, 2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">
                  Fator Consolidado DV
                </span>
                <span className="text-xs font-mono font-black text-[#5c3e06]">
                  {fatorDvConsolidado.toFixed(6)}
                </span>
              </div>
            </div>
          </div>

          {/* CARD 02: TRIBUTOS PÓS-REFORMA (ICMS TRANSIÇÃO + CBS 2027 + IBS) */}
          <div className="rounded-2xl border border-amber-300/70 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="border-b border-amber-900/10 pb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#261502] text-amber-200 text-xs font-bold font-mono flex items-center justify-center">
                    TR
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#261502] tracking-wider">
                      Tributos na Venda (2027+)
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      PIS/COFINS extintos · ICMS transição · CBS e IBS por fora
                    </span>
                  </div>
                </div>
              </div>

              {/* ICMS na Transição */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    ICMS na Venda (Transição):
                  </label>
                  <span className="text-xs font-mono font-semibold text-[#5c3e06]">
                    Fator: {fatorIcms.toFixed(4)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-7">
                    <MoneyInput
                      value={icmsRateInput}
                      onChange={(val) => setIcmsRateInput(val)}
                      decimals={2}
                      placeholder="18,00"
                      className="h-9 text-xs font-mono font-bold field-input-brown text-[#261502]"
                      suffix="%"
                    />
                  </div>
                  <div className="sm:col-span-5 text-right sm:text-left">
                    <span className="text-xs font-mono text-slate-500 font-semibold block">
                      Ref. {formatPercentBR(REFERENCIAS_MARKUP_POS.ICMS_PADRAO_PCT)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                  Subsiste na transição (fator redutor por dentro). Vazio usa a referência 18,00%
                  sem zerar.
                </span>
              </div>

              {/* CBS 2027 com Sinalização Permanente */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">CBS 2027 (Por Fora):</label>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">
                    Estimativa Senado
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-7">
                    <MoneyInput
                      value={cbsRateInput}
                      onChange={(val) => setCbsRateInput(val)}
                      decimals={2}
                      placeholder="26,50"
                      className="h-9 text-xs font-mono font-bold field-input-brown text-[#261502]"
                      suffix="%"
                    />
                  </div>
                  <div className="sm:col-span-5 text-right sm:text-left">
                    <span className="text-xs font-mono text-slate-500 font-semibold block">
                      Ref. {formatPercentBR(REFERENCIAS_MARKUP_POS.CBS_PADRAO_PCT)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                  Incidência por fora (LC 214 art. 12 §2º I). Vazio usa a referência 26,50% sem
                  zerar.
                </span>
              </div>

              {/* IBS na Venda (LC 214/2025 art. 346 - alíquota teste 0,10% por fora) */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    IBS na Venda (Por Fora):
                  </label>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5">
                    Alíquota-teste (LC 214 art. 346)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-7">
                    <MoneyInput
                      value={ibsRateInput}
                      onChange={(val) => setIbsRateInput(val)}
                      decimals={2}
                      placeholder="0,10"
                      className="h-9 text-xs font-mono font-bold field-input-brown text-[#261502]"
                      suffix="%"
                    />
                  </div>
                  <div className="sm:col-span-5 text-right sm:text-left">
                    <span className="text-xs font-mono text-slate-500 font-semibold block">
                      Ref. {formatPercentBR(REFERENCIAS_MARKUP_POS.IBS_PADRAO_PCT)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                  Alíquota-teste fixada em lei (LC 214 art. 346). Somado por fora na nota final.
                  Vazio usa 0,10% sem zerar.
                </span>
              </div>
            </div>

            {/* Sinalização Permanente chancelada pela Adri */}
            <div className="rounded-xl border border-amber-400/80 bg-amber-50/80 p-2.5 space-y-1 mt-2">
              <div className="flex items-center gap-1.5 text-[#3b2405] text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Sinalização Legal Permanente (LC 214/2025):</span>
              </div>
              <p className="text-[10px] text-slate-700 leading-relaxed font-mono">
                Estimativa — alíquota da CBS pendente de fixação pelo Senado Federal. PIS e COFINS
                100% extintos em 2027 (art. 334, II). IBS com alíquota-teste de 0,10% por fora (art.
                346).
              </p>
            </div>
          </div>

          {/* CARD 03: MARGEM DE LUCRO DESEJADA, QUANTIDADE & FATOR DIVISOR */}
          <div className="rounded-2xl border border-amber-300/70 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="border-b border-amber-900/10 pb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#261502] text-amber-200 text-xs font-bold font-mono flex items-center justify-center">
                    M
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#261502] tracking-wider">
                      Margem & Quantidade
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Formação do Preço Simulado
                    </span>
                  </div>
                </div>
              </div>

              {/* Margem de Lucro Desejada */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Margem de Lucro Desejada (%):
                  </label>
                  <span className="text-xs font-mono font-semibold text-[#5c3e06]">
                    Fator: {fatorMargem.toFixed(4)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-7">
                    <MoneyInput
                      value={margemLucroInput}
                      onChange={(val) => setMargemLucroInput(val)}
                      decimals={2}
                      placeholder={formatNumberBR(margemReferencia, 2)}
                      className="h-9 text-xs font-mono font-bold field-input-brown text-[#261502]"
                      suffix="%"
                    />
                  </div>
                  <div className="sm:col-span-5 text-right sm:text-left">
                    <span className="text-xs font-mono text-slate-500 font-semibold block">
                      Ref. {formatPercentBR(margemReferencia)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                  Régua de referência {formatPercentBR(margemReferencia)}. Vazio mantém a referência
                  sem zerar.
                </span>
              </div>

              {/* Quantidade Vendida */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Quantidade Vendida (un.):
                  </label>
                  <span className="text-xs font-mono text-slate-500 font-semibold">
                    Ref. {quantidadeReferencia} un.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-7">
                    <MoneyInput
                      value={quantidadeVendidaInput}
                      onChange={(val) => setQuantidadeVendidaInput(val)}
                      decimals={0}
                      className="h-9 text-xs font-mono font-bold field-input-brown text-[#261502]"
                      placeholder={String(quantidadeReferencia)}
                      suffix="un."
                    />
                  </div>
                  <div className="sm:col-span-5 text-right sm:text-left">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Lote da operação
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fator Divisor Multiplicativo do Preço (Legalmente Estruturado) */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-1.5 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Divisor sem ICMS (BC IBS/CBS):
                </span>
                <span className="text-sm font-mono font-black text-[#261502]">
                  {divisorSemIcms.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-600 pt-1 border-t border-amber-900/10">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Fator ICMS (1 − {formatPercentBR(icmsRateEfetivo)}):
                </span>
                <span className="font-bold text-[#5c3e06]">{fatorIcms.toFixed(4)}</span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 leading-tight pt-0.5">
                Passo 1: Divisor sem ICMS = Π(1 − % DV) × (1 − Margem). BC IBS/CBS = Custo ÷ Divisor
                sem ICMS (art. 12, §2º, V). Preço/Nota = (BC + CBS + IBS) ÷ (1 − ICMS) (Sefaz-SP RC
                32303/2025).
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PREÇO DE VENDA SIMULADO — 4 COLUNAS LADO A LADO (LP · LR · SNP · SNH)     */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#b87c14]" />
              <h3 className="text-sm font-black uppercase text-[#261502] tracking-wider">
                Preço de Venda Simulado — Comparação Lado a Lado (4 Fornecedores):
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Padrão de Comparação da Casa · Adquirente Lucro Presumido · 2027
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {simulacaoQuatroColunas.map((col) => {
              const isSelected = fornecedorSelecionado === col.key
              return (
                <div
                  key={col.key}
                  className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? 'border-[#b87c14] bg-white shadow-xl ring-2 ring-[#b87c14]/50'
                      : 'border-slate-200 bg-white shadow-xs hover:border-amber-300 hover:shadow-md'
                  }`}
                >
                  {/* Topo do Card */}
                  <div className="p-4 border-b border-amber-900/10 bg-gradient-to-b from-amber-50/50 to-transparent space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black uppercase bg-[#261502] text-amber-200">
                        {col.meta.sigla}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">
                          Ativo no Foco
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-[#261502] uppercase leading-tight">
                      {col.meta.rotulo}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono leading-tight">
                      {col.meta.descricao}
                    </p>
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                    {/* 1. Custo Unitário de Aquisição (Card 03 Compras) */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>Custo Adquirente (2027):</span>
                        <span className="line-through text-slate-400">
                          {formatBRL(col.custoHoje)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-black font-mono text-[#261502]">
                          {formatBRL(col.custoUnitario)}
                          <span className="text-[10px] text-slate-500 font-normal">/un</span>
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            col.deltaCustoPct >= 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {col.deltaCustoPct >= 0 ? '+' : ''}
                          {formatNumberBR(col.deltaCustoPct)}%
                        </span>
                      </div>
                    </div>

                    {/* 2. PREÇO DE VENDA SIMULADO (GRANDE DESTAQUE EM OURO) */}
                    <div className="rounded-xl border border-amber-300/80 bg-gradient-to-b from-[#fff9eb] to-[#fdedc3]/50 p-3 text-center space-y-1 shadow-xs">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c3e06] block">
                        {col.isSimplesHibrido
                          ? 'Preço de Venda Unitário (Base)'
                          : 'Preço de Venda Simulado / Nota Fiscal'}
                      </span>
                      <div className="text-xl font-black font-mono text-[#261502] tracking-tight">
                        {formatBRL(col.precoVendaUnitario)}
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 block">
                        {col.key === 'snp' && (
                          <>
                            DAS {formatPercentBR(col.fatiasDas?.aliquotaTotalPct ?? 4)}% por dentro
                            · Divisor SN {col.divisorPrincipal.toFixed(4)}
                          </>
                        )}
                        {col.key === 'snh' && (
                          <>
                            DAS híbrido {formatPercentBR(col.fatiasDas?.aliquotaTotalPct ?? 3.38)}%
                            · CBS/IBS por fora na nota
                          </>
                        )}
                        {!col.isSimples && (
                          <>
                            BC {formatBRL(col.baseCalculoIbsCbs)} + CBS {formatBRL(col.cbsUnitario)}{' '}
                            + IBS {formatBRL(col.ibsUnitario)} ÷ {fatorIcms.toFixed(2)}
                          </>
                        )}
                      </span>
                    </div>

                    {/* 3. Tributos por Sistemática (Simples aberto em fatias vs LP/LR transição) */}
                    {col.isSimples ? (
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-2.5 space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between items-center text-slate-700 font-bold border-b border-amber-200/60 pb-1">
                          <span className="text-[10px] uppercase text-[#5c3e06]">
                            {col.key === 'snp'
                              ? 'DAS SN Puro (Por Dentro):'
                              : 'DAS Híbrido (ICMS + Federais):'}
                          </span>
                          <span className="text-xs font-black text-[#261502]">
                            {formatBRL(col.fatiasDas?.dasTotal ?? 0)} (
                            {formatPercentBR(col.fatiasDas?.aliquotaTotalPct ?? 0)})
                          </span>
                        </div>
                        {/* Fatias detalhadas do DAS */}
                        <div className="space-y-0.5 text-[11px] text-slate-600 pl-1">
                          <div className="flex justify-between">
                            <span>
                              · ICMS ({formatPercentBR(col.fatiasDas?.icmsPct ?? 34, 1)} da fatia):
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatBRL(col.fatiasDas?.icmsValor ?? 0)}
                            </span>
                          </div>
                          {col.key === 'snp' && (
                            <>
                              <div className="flex justify-between">
                                <span>
                                  · CBS ({formatPercentBR(col.fatiasDas?.cbsPct ?? 15.33, 2)} da
                                  fatia):
                                </span>
                                <span className="font-semibold text-[#b87c14]">
                                  {formatBRL(col.fatiasDas?.cbsValor ?? 0)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>
                                  · IBS ({formatPercentBR(col.fatiasDas?.ibsPct ?? 0.17, 2)} da
                                  fatia):
                                </span>
                                <span className="font-semibold text-emerald-800">
                                  {formatBRL(col.fatiasDas?.ibsValor ?? 0)}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between">
                            <span>· Federais IRPJ/CSLL/CPP:</span>
                            <span className="font-semibold text-slate-800">
                              {formatBRL(col.fatiasDas?.federaisValor ?? 0)}
                            </span>
                          </div>
                        </div>

                        {/* No híbrido: CBS e IBS por fora */}
                        {col.isSimplesHibrido && (
                          <div className="pt-1 border-t border-amber-200/60 space-y-0.5 text-[11px]">
                            <div className="flex justify-between text-slate-600">
                              <span>BC CBS/IBS (P − ICMS):</span>
                              <span className="font-semibold text-slate-800">
                                {formatBRL(col.baseCalculoIbsCbs)}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>(+) CBS {formatPercentBR(cbsRateEfetivo)} (por fora):</span>
                              <span className="font-bold text-[#b87c14]">
                                {formatBRL(col.cbsUnitario)}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>(+) IBS {formatPercentBR(ibsRateEfetivo)} (por fora):</span>
                              <span className="font-bold text-emerald-800">
                                {formatBRL(col.ibsUnitario)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-2.5 space-y-1 text-xs font-mono">
                        <div className="flex justify-between text-slate-600">
                          <span>BC IBS/CBS (sem ICMS):</span>
                          <span className="font-semibold text-slate-800">
                            {formatBRL(col.baseCalculoIbsCbs)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>(+) CBS {formatPercentBR(cbsRateEfetivo)} (por fora):</span>
                          <span className="font-bold text-[#b87c14]">
                            {formatBRL(col.cbsUnitario)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>(+) IBS {formatPercentBR(ibsRateEfetivo)} (por fora):</span>
                          <span className="font-bold text-emerald-800">
                            {formatBRL(col.ibsUnitario)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-700 pt-1 border-t border-amber-200/60 font-semibold">
                          <span>(=) Valor sem ICMS:</span>
                          <span>{formatBRL(col.valorSemIcms)}</span>
                        </div>
                      </div>
                    )}

                    {/* 4. Fechamento Econômico */}
                    <div className="space-y-1.5 text-xs font-mono pt-0.5">
                      {!col.isSimples && (
                        <div className="flex justify-between text-slate-600">
                          <span>ICMS {formatPercentBR(icmsRateEfetivo)} (s/ base c/ IBS/CBS):</span>
                          <span className="font-semibold text-slate-800">
                            {formatBRL(col.icmsUnitario)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Σ DV {formatPercentBR(somaDvPct)}:</span>
                        <span className="font-semibold text-slate-800">
                          {formatBRL(col.dvUnitarioTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Custo de Aquisição:</span>
                        <span className="font-semibold text-slate-800">
                          {formatBRL(col.custoUnitario)}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-200 flex justify-between text-[#261502] font-bold">
                        <span>Margem Líquida R$:</span>
                        <span className="text-emerald-700">
                          {formatBRL(col.lucroUnitarioRealizado)} (
                          {formatPercentBR(col.margemEfetivaPct)})
                        </span>
                      </div>
                    </div>

                    {/* 5. Total da Nota Fiscal e Lote */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 space-y-1 text-xs font-mono">
                      <div className="flex justify-between text-[#261502] font-black">
                        <span>Nota Fiscal = Total:</span>
                        <span>{formatBRL(col.totalNotaUnitario)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-0.5 border-t border-slate-200">
                        <span>Total Lote ({quantidadeVendidaEfetiva} un.):</span>
                        <span className="font-bold text-slate-700">
                          {formatBRL(col.totalNotaLote)}
                        </span>
                      </div>
                    </div>

                    {/* Botão para Ver Memória de Cálculo Completa */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModalMemoriaFornecedor(col.key)}
                      className="w-full text-xs font-bold border-amber-300/80 text-[#3b2405] hover:bg-amber-100 hover:text-[#261502] h-8 cursor-pointer mt-1"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1 text-[#b87c14]" />
                      Ver Memória Linha a Linha
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COMPOSIÇÃO DOS TRIBUTOS COM FUNDAMENTAÇÃO LEGAL (LC 214/2025)             */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-amber-300/70 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-amber-900/10 pb-2.5">
            <Layers className="w-4 h-4 text-[#b87c14]" />
            <h4 className="text-xs font-black uppercase text-[#261502] tracking-wider">
              Composição dos Tributos & Fundamentação Legal (LC 214/2025)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#b87c14] block">
                1. ICMS Fora da Base IBS/CBS
              </span>
              <p className="text-[11px] leading-relaxed">
                LC 214/2025, art. 12, §2º, V: ICMS, ISS e PIS/COFINS NÃO integram a base de cálculo
                do IBS e da CBS durante 2026–2032. O divisor para apurar a BC do IBS/CBS é limpo de
                ICMS: produto dos fatores de DV × fator da margem.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#b87c14] block">
                2. CBS & IBS "Por Fora"
              </span>
              <p className="text-[11px] leading-relaxed">
                LC 214/2025, art. 12, §2º, I: o próprio IBS e CBS não integram a própria base de
                cálculo (incidência por fora). Calculados aplicando-se as alíquotas (CBS 26,50%
                estimada e IBS 0,10% teste art. 346) diretamente sobre a BC líquida.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                3. IBS/CBS na Base do ICMS (Recíproca)
              </span>
              <p className="text-[11px] leading-relaxed">
                Sefaz-SP RC 32303/2025 e RC 32931/2026: a exclusão do art. 12 §2º define a base dos
                novos tributos, não a dos remanescentes. O IBS e a CBS integram a base do ICMS, que
                incide por dentro sobre (BC + CBS + IBS) ÷ (1 − alíquota ICMS).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#b87c14] block">
                4. PIS e COFINS Extintos (EC 132/2023)
              </span>
              <p className="text-[11px] leading-relaxed">
                EC 132/2023, art. 22, I c/c LC 214/2025, art. 334, II: as contribuições ao PIS e
                COFINS deixam de incidir a partir de 1º de janeiro de 2027, sendo totalmente
                eliminadas da composição de formação de preço.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL / DIALOG — MEMÓRIA DE CÁLCULO LINHA A LINHA                         */}
        {/* ========================================================================= */}
        <Dialog
          open={modalMemoriaFornecedor !== null}
          onOpenChange={(open) => {
            if (!open) setModalMemoriaFornecedor(null)
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-amber-300 text-slate-900 p-6 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 border-b border-amber-900/10 pb-3">
                <div className="p-2 rounded-lg bg-gradient-to-b from-[#ffd966] to-[#f5b014] text-[#1a0c01]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-[#261502] uppercase tracking-wide">
                    Memória de Cálculo Completa — Fornecedor {itemMemoriaAtivo?.meta.sigla} (2027)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-mono">
                    Abertura detalhada passo a passo conforme sistemática chancelada pela Adri
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {itemMemoriaAtivo && (
              <div className="space-y-4 pt-2 font-mono text-xs">
                {/* Resumo do Cenário */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Operação</span>
                    <span className="font-bold text-[#261502]">
                      Fornecedor {itemMemoriaAtivo.meta.rotulo} × Adquirente Lucro Presumido
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Lote Simulado
                    </span>
                    <span className="font-bold text-[#261502]">
                      {quantidadeVendidaEfetiva} unidades
                    </span>
                  </div>
                </div>

                {/* Tabela de Passos Linha a Linha por Sistemática */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-[#261502] text-amber-200 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Passo</th>
                        <th className="py-2.5 px-3">Etapa / Linha</th>
                        <th className="py-2.5 px-3">Fundamentação Legal & Fórmula</th>
                        <th className="py-2.5 px-3 text-right">Valor / Fator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {/* Passo 0: Custo do Adquirente */}
                      <tr className="bg-amber-50/40 font-bold text-[#261502]">
                        <td className="py-2 px-3">0º</td>
                        <td className="py-2 px-3">Custo de Aquisição (Card 03 Compras)</td>
                        <td className="py-2 px-3 text-slate-600 font-normal">
                          Custo unitário apurado no Card 03 para o fornecedor{' '}
                          {itemMemoriaAtivo.meta.sigla} (2027)
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatBRL(itemMemoriaAtivo.custoUnitario)}
                        </td>
                      </tr>

                      {/* Passo 1: Divisor e Despesas Variáveis */}
                      <tr className="bg-slate-50">
                        <td className="py-2 px-3 font-bold text-[#261502]">1º</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {itemMemoriaAtivo.isSimples
                            ? `Divisor do Simples Nacional (${itemMemoriaAtivo.key === 'snp' ? 'SN Puro' : 'SN Híbrido'})`
                            : 'Divisor SEM ICMS'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {itemMemoriaAtivo.isSimples ? (
                            <>
                              <strong>LC 123/2006 c/c LC 214/2025:</strong> Empresa do Simples
                              Nacional não usa ICMS 18% cheia.
                              <br />
                              Divisor = Π(1 − % DV) [{fatorDvConsolidado.toFixed(4)}] × (1 − Margem)
                              [{fatorMargem.toFixed(4)}] × Fator DAS [
                              {itemMemoriaAtivo.fatorTributarioEfetivo.toFixed(4)}].
                            </>
                          ) : (
                            <>
                              <strong>LC 214/2025, art. 12, §2º, V:</strong> ICMS não integra a base
                              do IBS/CBS.
                              <br />
                              Produto dos fatores de DV ({fatorDvConsolidado.toFixed(4)}) × Fator
                              Margem ({fatorMargem.toFixed(4)}). Não entra o fator do ICMS.
                            </>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#b87c14]">
                          {itemMemoriaAtivo.divisorPrincipal.toFixed(6)}
                        </td>
                      </tr>

                      {/* Linhas detalhadas de DV se houver */}
                      {despesasVariaveis.map((dv, idx) => {
                        const aliq = dv.aliquota ?? 0
                        return (
                          <tr key={dv.id} className="text-slate-600 text-[11px]">
                            <td className="py-1.5 px-3 text-slate-400 pl-6">1.{idx + 1}</td>
                            <td className="py-1.5 px-3">DV: {dv.descricao || 'Despesa'}</td>
                            <td className="py-1.5 px-3 text-slate-500">
                              Alíquota {formatPercentBR(aliq)} → Fator (1 − {formatPercentBR(aliq)})
                              = {(1 - aliq / 100).toFixed(4)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono">
                              {formatBRL(
                                roundHalfUp(itemMemoriaAtivo.precoVendaUnitario * (aliq / 100), 2),
                              )}
                            </td>
                          </tr>
                        )
                      })}

                      {/* RAMIFICAÇÃO: SNP (Simples Puro) */}
                      {itemMemoriaAtivo.key === 'snp' && (
                        <>
                          <tr className="bg-amber-50/70 font-semibold text-slate-900">
                            <td className="py-2 px-3 font-bold text-[#261502]">2º</td>
                            <td className="py-2 px-3">Preço de Venda Unitário P</td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              Custo de Aquisição ÷ Divisor do Simples Puro (tudo por dentro).
                              <br />
                              Fórmula: {formatBRL(itemMemoriaAtivo.custoUnitario)} ÷{' '}
                              {itemMemoriaAtivo.divisorPrincipal.toFixed(6)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-[#261502]">
                              {formatBRL(itemMemoriaAtivo.precoVendaUnitario)}
                            </td>
                          </tr>

                          <tr className="bg-slate-50">
                            <td className="py-2 px-3 font-bold text-[#261502]">3º</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              DAS do Simples Puro (
                              {formatPercentBR(itemMemoriaAtivo.fatiasDas?.aliquotaTotalPct ?? 4)}%)
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              <strong>LC 123/2006, art. 18:</strong> Recolhimento unificado no DAS
                              sem alíquota cheia (sem ICMS 18%).
                              <br />
                              Preço {formatBRL(itemMemoriaAtivo.precoVendaUnitario)} ×{' '}
                              {formatPercentBR(itemMemoriaAtivo.fatiasDas?.aliquotaTotalPct ?? 4)}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-[#261502]">
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.dasTotal ?? 0)}
                            </td>
                          </tr>

                          {/* Fatias detalhadas do DAS */}
                          <tr className="text-slate-600 text-[11px]">
                            <td className="py-1.5 px-3 text-slate-400 pl-6">3.1</td>
                            <td className="py-1.5 px-3">
                              Fatia ICMS no DAS (
                              {formatPercentBR(itemMemoriaAtivo.fatiasDas?.icmsPct ?? 34, 1)})
                            </td>
                            <td className="py-1.5 px-3 text-slate-500">
                              Parcela de ICMS unificada no DAS (art. 23 LC 123)
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold">
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.icmsValor ?? 0)}
                            </td>
                          </tr>
                          <tr className="text-slate-600 text-[11px]">
                            <td className="py-1.5 px-3 text-slate-400 pl-6">3.2</td>
                            <td className="py-1.5 px-3">
                              Fatia CBS no DAS (
                              {formatPercentBR(itemMemoriaAtivo.fatiasDas?.cbsPct ?? 15.33, 2)})
                            </td>
                            <td className="py-1.5 px-3 text-slate-500">
                              Parcela federal unificada da CBS no DAS (transição 2027)
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-[#b87c14]">
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.cbsValor ?? 0)}
                            </td>
                          </tr>
                          <tr className="text-slate-600 text-[11px]">
                            <td className="py-1.5 px-3 text-slate-400 pl-6">3.3</td>
                            <td className="py-1.5 px-3">
                              Fatia IBS no DAS (
                              {formatPercentBR(itemMemoriaAtivo.fatiasDas?.ibsPct ?? 0.17, 2)})
                            </td>
                            <td className="py-1.5 px-3 text-slate-500">
                              Parcela estadual/municipal unificada do IBS no DAS (transição 2027)
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-emerald-800">
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.ibsValor ?? 0)}
                            </td>
                          </tr>
                          <tr className="text-slate-600 text-[11px]">
                            <td className="py-1.5 px-3 text-slate-400 pl-6">3.4</td>
                            <td className="py-1.5 px-3">
                              Fatia Federais IRPJ/CSLL/CPP (
                              {formatPercentBR(itemMemoriaAtivo.fatiasDas?.federaisPct ?? 50.5, 2)})
                            </td>
                            <td className="py-1.5 px-3 text-slate-500">
                              Tributos federais unificados no DAS
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold">
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.federaisValor ?? 0)}
                            </td>
                          </tr>
                        </>
                      )}

                      {/* RAMIFICAÇÃO: SNH (Simples Híbrido) */}
                      {itemMemoriaAtivo.key === 'snh' && (
                        <>
                          <tr className="bg-amber-50/70 font-semibold text-slate-900">
                            <td className="py-2 px-3 font-bold text-[#261502]">2º</td>
                            <td className="py-2 px-3">Preço Unitário Base P</td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              Custo de Aquisição ÷ Divisor SNH (com DAS híbrido por dentro).
                              <br />
                              Fórmula: {formatBRL(itemMemoriaAtivo.custoUnitario)} ÷{' '}
                              {itemMemoriaAtivo.divisorPrincipal.toFixed(6)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-[#261502]">
                              {formatBRL(itemMemoriaAtivo.precoVendaUnitario)}
                            </td>
                          </tr>

                          <tr className="bg-slate-50">
                            <td className="py-2 px-3 font-bold text-[#261502]">3º</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              DAS Híbrido por Dentro (
                              {formatPercentBR(
                                itemMemoriaAtivo.fatiasDas?.aliquotaTotalPct ?? 3.38,
                              )}
                              %)
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              Apenas ICMS (
                              {formatPercentBR(itemMemoriaAtivo.fatiasDas?.icmsPct ?? 34, 1)}) +
                              Federais (
                              {formatPercentBR(itemMemoriaAtivo.fatiasDas?.federaisPct ?? 50.5, 2)}
                              ).
                              <br />
                              CBS e IBS recolhidos pelo regime regular por fora (art. 41 LC 214).
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-[#261502]">
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.dasTotal ?? 0)}
                            </td>
                          </tr>

                          <tr className="text-slate-600 text-[11px]">
                            <td className="py-1.5 px-3 text-slate-400 pl-6">3.1</td>
                            <td className="py-1.5 px-3">ICMS no DAS Híbrido</td>
                            <td className="py-1.5 px-3 text-slate-500">
                              Fração de ICMS recolhida no DAS híbrido
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold">
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.icmsValor ?? 0)}
                            </td>
                          </tr>
                          <tr className="text-slate-600 text-[11px]">
                            <td className="py-1.5 px-3 text-slate-400 pl-6">3.2</td>
                            <td className="py-1.5 px-3">Federais IRPJ/CSLL/CPP no DAS Híbrido</td>
                            <td className="py-1.5 px-3 text-slate-500">
                              Parcela dos tributos federais no DAS híbrido
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold">
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.federaisValor ?? 0)}
                            </td>
                          </tr>

                          <tr className="bg-amber-50/50">
                            <td className="py-2 px-3 font-bold text-[#261502]">4º</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              Base de Cálculo CBS / IBS (Sem ICMS)
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              <strong>LC 214/2025, art. 12, §2º, V:</strong> Preço P − ICMS do DAS ={' '}
                              {formatBRL(itemMemoriaAtivo.precoVendaUnitario)} −{' '}
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.icmsValor ?? 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-[#261502]">
                              {formatBRL(itemMemoriaAtivo.baseCalculoIbsCbs)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2 px-3 font-bold text-[#261502]">5º</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              CBS por Fora ({formatPercentBR(cbsRateEfetivo)})
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              BC ({formatBRL(itemMemoriaAtivo.baseCalculoIbsCbs)}) ×{' '}
                              {formatPercentBR(cbsRateEfetivo)}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#b87c14]">
                              {formatBRL(itemMemoriaAtivo.cbsUnitario)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2 px-3 font-bold text-[#261502]">6º</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              IBS por Fora ({formatPercentBR(ibsRateEfetivo)})
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              BC ({formatBRL(itemMemoriaAtivo.baseCalculoIbsCbs)}) ×{' '}
                              {formatPercentBR(ibsRateEfetivo)}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                              {formatBRL(itemMemoriaAtivo.ibsUnitario)}
                            </td>
                          </tr>
                        </>
                      )}

                      {/* RAMIFICAÇÃO: LP e LR (Composição Transição) */}
                      {!itemMemoriaAtivo.isSimples && (
                        <>
                          <tr className="bg-amber-50/70 font-semibold text-slate-900">
                            <td className="py-2 px-3 font-bold text-[#261502]">2º</td>
                            <td className="py-2 px-3">Base de Cálculo do IBS e CBS</td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              <strong>LC 214/2025, art. 12, caput e §2º, V:</strong> Valor da
                              operação líquido de ICMS, IBS, CBS, DV e margem.
                              <br />
                              Fórmula: Custo do adquirente ÷ Divisor sem ICMS ={' '}
                              {formatBRL(itemMemoriaAtivo.custoUnitario)} ÷{' '}
                              {divisorSemIcms.toFixed(6)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-[#261502]">
                              {formatBRL(itemMemoriaAtivo.baseCalculoIbsCbs)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2 px-3 font-bold text-[#261502]">3º</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              CBS 2027 (Por Fora)
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              <strong>LC 214/2025, art. 12, §2º, I:</strong> CBS não integra a
                              própria base.
                              <br />
                              Fórmula: BC ({formatBRL(itemMemoriaAtivo.baseCalculoIbsCbs)}) ×
                              Alíquota CBS ({formatPercentBR(cbsRateEfetivo)})
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#b87c14]">
                              {formatBRL(itemMemoriaAtivo.cbsUnitario)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2 px-3 font-bold text-[#261502]">4º</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              IBS na Venda (Por Fora)
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              <strong>LC 214/2025, art. 12, §2º, I c/c art. 346:</strong> IBS não
                              integra a própria base (alíquota-teste).
                              <br />
                              Fórmula: BC ({formatBRL(itemMemoriaAtivo.baseCalculoIbsCbs)}) ×
                              Alíquota IBS ({formatPercentBR(ibsRateEfetivo)})
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                              {formatBRL(itemMemoriaAtivo.ibsUnitario)}
                            </td>
                          </tr>

                          <tr className="bg-slate-50 font-semibold text-slate-900">
                            <td className="py-2 px-3 font-bold text-[#261502]">5º</td>
                            <td className="py-2 px-3">Valor da Operação sem ICMS</td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              Soma da Base de Cálculo com os novos tributos por fora.
                              <br />
                              Fórmula: BC ({formatBRL(itemMemoriaAtivo.baseCalculoIbsCbs)}) + CBS (
                              {formatBRL(itemMemoriaAtivo.cbsUnitario)}) + IBS (
                              {formatBRL(itemMemoriaAtivo.ibsUnitario)})
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                              {formatBRL(itemMemoriaAtivo.valorSemIcms)}
                            </td>
                          </tr>

                          <tr className="bg-amber-50/40">
                            <td className="py-2 px-3 font-bold text-[#261502]">6º</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              ICMS na Transição (Base inclui IBS/CBS)
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              <strong>Sefaz-SP RC 32303/2025 e RC 32931/2026:</strong> A assimetria
                              é expressa: IBS e CBS integram a base do ICMS.
                              <br />
                              Preço / Nota = Valor sem ICMS ÷ (1 − alíquota ICMS) ={' '}
                              {formatBRL(itemMemoriaAtivo.valorSemIcms)} ÷ {fatorIcms.toFixed(4)}.
                              <br />
                              ICMS destacado = Preço × {formatPercentBR(icmsRateEfetivo)} ={' '}
                              {formatBRL(itemMemoriaAtivo.icmsUnitario)}.
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {formatBRL(itemMemoriaAtivo.icmsUnitario)}
                            </td>
                          </tr>
                        </>
                      )}

                      {/* NOTA FISCAL = TOTAL */}
                      <tr className="bg-[#fdedc3]/80 font-black text-[#261502] text-sm">
                        <td className="py-2.5 px-3">
                          {itemMemoriaAtivo.key === 'snp'
                            ? '4º'
                            : itemMemoriaAtivo.key === 'snh'
                              ? '7º'
                              : '7º'}
                        </td>
                        <td className="py-2.5 px-3">Nota Fiscal = Total Cobrado</td>
                        <td className="py-2.5 px-3 text-xs font-normal">
                          {itemMemoriaAtivo.key === 'snh'
                            ? 'Preço P + CBS por fora + IBS por fora destacados na nota fiscal.'
                            : 'Valor total faturado na nota fiscal ao adquirente.'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-base">
                          {formatBRL(itemMemoriaAtivo.totalNotaUnitario)}
                        </td>
                      </tr>

                      {/* Lucro e Margem Efetiva Realizada */}
                      <tr className="bg-emerald-50/60 font-semibold text-emerald-950">
                        <td className="py-2 px-3 font-bold text-emerald-800">(=)</td>
                        <td className="py-2 px-3">Margem Líquida Realizada</td>
                        <td className="py-2 px-3 text-emerald-800 text-[11px] font-normal">
                          Preço ({formatBRL(itemMemoriaAtivo.precoVendaUnitario)}) − Custo (
                          {formatBRL(itemMemoriaAtivo.custoUnitario)}) − Tributos (
                          {formatBRL(
                            itemMemoriaAtivo.isSimples
                              ? (itemMemoriaAtivo.fatiasDas?.dasTotal ?? 0)
                              : itemMemoriaAtivo.icmsUnitario +
                                  itemMemoriaAtivo.cbsUnitario +
                                  itemMemoriaAtivo.ibsUnitario,
                          )}
                          ) − Σ DV ({formatBRL(itemMemoriaAtivo.dvUnitarioTotal)})
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                          {formatBRL(itemMemoriaAtivo.lucroUnitarioRealizado)} (
                          {formatPercentBR(itemMemoriaAtivo.margemEfetivaPct)})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Rodapé com Fundamentação Legal */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                    <Info className="w-3.5 h-3.5 text-[#b87c14]" />
                    <span>Dispositivos Legais Aplicáveis:</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    {itemMemoriaAtivo.meta.fundamento}
                  </p>
                  <p className="text-[10px] text-slate-700 font-semibold leading-relaxed pt-1 border-t border-slate-200">
                    Fundamentação da Composição Legal (Adri): LC 214/2025, art. 12, §2º, V (ICMS
                    fora da base do IBS/CBS em 2026–2032); art. 12, §2º, I (CBS e IBS por fora da
                    própria base); Sefaz-SP Respostas a Consultas 32303/2025 e 32931/2026 (IBS e CBS
                    compõem a base de cálculo do ICMS).
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DemoLayout>
  )
}

export default MarkupPosPage
