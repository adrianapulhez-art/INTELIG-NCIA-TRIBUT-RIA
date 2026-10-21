import React, { useState, useMemo } from 'react'
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

/** Tipo para cada linha de Despesa Variável de Venda editável */
interface DespesaVariavelVenda {
  id: string
  descricao: string
  aliquota: number // em %, ex.: 2.50 para 2,50%
}

/** Chaves dos 4 fornecedores canônicos para adquirente Lucro Presumido */
type FornecedorPosKey = 'lp' | 'lr' | 'snp' | 'snh'

interface FornecedorPosMeta {
  key: FornecedorPosKey
  sigla: string
  rotulo: string
  descricao: string
  fundamento: string
}

const FORNECEDORES_META: Record<FornecedorPosKey, FornecedorPosMeta> = {
  lp: {
    key: 'lp',
    sigla: 'LP',
    rotulo: 'Fornecedor Lucro Presumido',
    descricao: 'Fornecedor LP · Carga plena na origem com repasse de base limpa (Art. 12 LC 214)',
    fundamento:
      'LC 214/2025, art. 12 + art. 47: crédito financeiro pleno anula CBS e IBS destacados.',
  },
  lr: {
    key: 'lr',
    sigla: 'LR',
    rotulo: 'Fornecedor Lucro Real',
    descricao: 'Fornecedor LR · Régua A neutra chancelada (reprecificação com crédito integral)',
    fundamento: 'LC 214/2025, art. 12 + art. 47: creditamento amplo e desembute com divisor LR.',
  },
  snp: {
    key: 'snp',
    sigla: 'SNP',
    rotulo: 'Fornecedor Simples Nacional Puro',
    descricao: 'Fornecedor SN Puro · Sem apropriação de crédito de ICMS nem CBS/IBS (LC 123/2006)',
    fundamento:
      'LC 123/2006, art. 13 §1º c/c LC 214/2025 art. 47: destaque não creditável vira custo integral.',
  },
  snh: {
    key: 'snh',
    sigla: 'SNH',
    rotulo: 'Fornecedor Simples Nacional Híbrido',
    descricao: 'Fornecedor SN Híbrido · Crédito de CBS e IBS por opt-in regular (art. 41 LC 214)',
    fundamento:
      'LC 214/2025, art. 41 c/c art. 47 §2º: opção pelo regime regular confere crédito de CBS e IBS.',
  },
}

export function MarkupPosPage() {
  const { purchasesItems, markupProducts } = useTaxContext()

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
  // 3. BOTÕES SELECIONÁVEIS: LP · LR · SNP · SNH
  // --------------------------------------------------------------------------
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorPosKey>('lp')

  // --------------------------------------------------------------------------
  // 4. DESPESAS VARIÁVEIS DE VENDA (DV) — editáveis
  // --------------------------------------------------------------------------
  // Default inicial ilustrativo chancelado: Maquininha 2,50% · Comissão 2,00% · Frete 3,00%
  const [despesasVariaveis, setDespesasVariaveis] = useState<DespesaVariavelVenda[]>([
    { id: 'dv-1', descricao: 'Maquininha / Cartão', aliquota: 2.5 },
    { id: 'dv-2', descricao: 'Comissão Vendedores', aliquota: 2.0 },
    { id: 'dv-3', descricao: 'Frete Entrega', aliquota: 3.0 },
  ])

  const handleAddDv = () => {
    const novoId = `dv-${Date.now()}`
    setDespesasVariaveis((prev) => [
      ...prev,
      { id: novoId, descricao: 'Nova despesa variável', aliquota: 0 },
    ])
  }

  const handleUpdateDv = (id: string, campo: 'descricao' | 'aliquota', valor: string | number) => {
    setDespesasVariaveis((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (campo === 'aliquota') {
          return { ...item, aliquota: Math.max(0, typeof valor === 'number' ? valor : 0) }
        }
        return { ...item, descricao: String(valor) }
      }),
    )
  }

  const handleRemoveDv = (id: string) => {
    setDespesasVariaveis((prev) => prev.filter((item) => item.id !== id))
  }

  // Soma de DV e fator multiplicativo consolidado
  const somaDvPct = useMemo(() => {
    return despesasVariaveis.reduce((acc, curr) => acc + (curr.aliquota || 0), 0)
  }, [despesasVariaveis])

  const fatorDvConsolidado = useMemo(() => {
    // Multiplica (1 - aliquota/100) para cada DV
    let f = 1
    for (const dv of despesasVariaveis) {
      f *= Math.max(0, 1 - (dv.aliquota || 0) / 100)
    }
    return f
  }, [despesasVariaveis])

  // --------------------------------------------------------------------------
  // 5. TRIBUTOS — COMPOSIÇÃO PÓS-REFORMA
  // --------------------------------------------------------------------------
  // ICMS editável na transição (default 18,00% -> fator 0,8200)
  const [icmsRate, setIcmsRate] = useState<number>(18.0)
  const fatorIcms = useMemo(() => Math.max(0, 1 - (icmsRate || 0) / 100), [icmsRate])

  // CBS 2027: Parâmetro editável com default 26,50% e sinalização permanente
  const [cbsRate, setCbsRate] = useState<number>(26.5)

  // --------------------------------------------------------------------------
  // 6. FLUXO DE CÁLCULO — MARGEM, QUANTIDADE E PREÇO DE VENDA SIMULADO
  // --------------------------------------------------------------------------
  // Margem de lucro desejada % (default 51,90% chancelada da pré-reforma)
  const [margemLucroPct, setMargemLucroPct] = useState<number>(() => {
    if (produtoAtivo && produtoAtivo.margin && produtoAtivo.margin > 0) {
      return produtoAtivo.margin
    }
    return 51.9
  })
  const fatorMargem = useMemo(() => Math.max(0, 1 - (margemLucroPct || 0) / 100), [margemLucroPct])

  // Quantidade vendida (padrão 24 ou 30 un.)
  const [quantidadeVendida, setQuantidadeVendida] = useState<number>(() => {
    if (produtoAtivo && produtoAtivo.quantity && produtoAtivo.quantity > 0) {
      return produtoAtivo.quantity
    }
    return 24
  })

  // Fator Divisor Multiplicativo: Fator_DV * Fator_ICMS * Fator_Margem
  // Fatores do adquirente idênticos aos do LP (0,9750 × 0,9800 × 0,9700 × 0,8200 × 0,4810 = 0,365562)
  const fatorDivisor = useMemo(() => {
    const f = fatorDvConsolidado * fatorIcms * fatorMargem
    return f > 0 ? f : 0.0001
  }, [fatorDvConsolidado, fatorIcms, fatorMargem])

  // Simulação completa dos 4 fornecedores lado a lado
  const simulacaoQuatroColunas = useMemo(() => {
    const keys: FornecedorPosKey[] = ['lp', 'lr', 'snp', 'snh']
    return keys.map((key) => {
      const custoInfo = custosAdquirente[key]
      const custoUnitario = custoInfo.custo2027
      const precoVendaUnitario = fatorDivisor > 0 ? roundHalfUp(custoUnitario / fatorDivisor, 2) : 0
      const faturamentoTotal = roundHalfUp(precoVendaUnitario * Math.max(1, quantidadeVendida), 2)
      const custoTotal = roundHalfUp(custoUnitario * Math.max(1, quantidadeVendida), 2)

      // Tributos e deduções unitárias
      const icmsUnitario = roundHalfUp(precoVendaUnitario * (icmsRate / 100), 2)
      const dvUnitarioTotal = roundHalfUp(precoVendaUnitario * (somaDvPct / 100), 2)
      const lucroUnitarioRealizado = roundHalfUp(
        precoVendaUnitario - custoUnitario - icmsUnitario - dvUnitarioTotal,
        2,
      )
      const margemEfetivaPct =
        precoVendaUnitario > 0
          ? roundHalfUp((lucroUnitarioRealizado / precoVendaUnitario) * 100, 2)
          : 0

      // CBS 2027 por fora (arredondamento meio a meio para cima)
      const cbsUnitario = roundHalfUp(precoVendaUnitario * (cbsRate / 100), 2)
      const totalNotaUnitario = roundHalfUp(precoVendaUnitario + cbsUnitario, 2)
      const cbsTotal = roundHalfUp(cbsUnitario * Math.max(1, quantidadeVendida), 2)
      const totalNotaLote = roundHalfUp(totalNotaUnitario * Math.max(1, quantidadeVendida), 2)

      return {
        key,
        meta: FORNECEDORES_META[key],
        custoUnitario,
        custoHoje: custoInfo.custoHoje,
        deltaCustoPct: custoInfo.deltaPct,
        comprasLiquidasTotal: custoInfo.comprasLiquidas2027,
        notaCompraTotal: custoInfo.notaCheia2027,
        precoVendaUnitario,
        faturamentoTotal,
        custoTotal,
        icmsUnitario,
        dvUnitarioTotal,
        lucroUnitarioRealizado,
        margemEfetivaPct,
        cbsUnitario,
        totalNotaUnitario,
        cbsTotal,
        totalNotaLote,
        custoInfo,
      }
    })
  }, [custosAdquirente, fatorDivisor, quantidadeVendida, icmsRate, somaDvPct, cbsRate])

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
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {despesasVariaveis.map((dv) => {
                  const fatorDerivado = Math.max(0, 1 - (dv.aliquota || 0) / 100)
                  return (
                    <div
                      key={dv.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 p-2 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={dv.descricao}
                        onChange={(e) => handleUpdateDv(dv.id, 'descricao', e.target.value)}
                        placeholder="Nome da despesa"
                        className="flex-1 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-[#b87c14]"
                      />

                      <div className="w-20">
                        <MoneyInput
                          value={dv.aliquota}
                          onChange={(val) => handleUpdateDv(dv.id, 'aliquota', val ?? 0)}
                          decimals={2}
                          placeholder="0,00"
                          className="h-7 text-xs font-mono font-bold text-right field-input-brown text-[#261502]"
                          prefix="%"
                        />
                      </div>

                      <div className="w-16 text-right">
                        <span className="text-[9px] font-mono text-slate-400 block">Fator</span>
                        <span className="text-[11px] font-mono font-bold text-[#3b2405]">
                          {fatorDerivado.toFixed(4)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDv(dv.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Remover linha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Totalizadores de DV */}
            <div className="pt-3 border-t border-amber-900/10 flex items-center justify-between bg-amber-50/60 p-2.5 rounded-xl">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Total Σ DV
                </span>
                <span className="text-sm font-black font-mono text-[#261502]">
                  {formatPercentBR(somaDvPct, 2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Fator Consolidado DV
                </span>
                <span className="text-xs font-mono font-bold text-[#5c3e06]">
                  {fatorDvConsolidado.toFixed(6)}
                </span>
              </div>
            </div>
          </div>

          {/* CARD 02: TRIBUTOS PÓS-REFORMA (ICMS TRANSIÇÃO + CBS 2027) */}
          <div className="rounded-2xl border border-amber-300/70 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
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
                      PIS/COFINS extintos · ICMS transição · CBS por fora
                    </span>
                  </div>
                </div>
              </div>

              {/* ICMS na Transição */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    ICMS na Venda (Transição):
                  </label>
                  <span className="text-[11px] font-mono text-[#5c3e06]">
                    Fator: {fatorIcms.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MoneyInput
                    value={icmsRate}
                    onChange={(val) => setIcmsRate(val ?? 0)}
                    decimals={2}
                    className="h-8 text-xs font-mono font-bold field-input-brown text-[#261502]"
                    prefix="%"
                  />
                  <span className="text-[11px] text-slate-500 font-mono">Padrão 18,00%</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Representa o ICMS estadual que subsiste na venda em 2027 (fator redutor por
                  dentro).
                </span>
              </div>

              {/* CBS 2027 com Sinalização Permanente */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">CBS 2027 (Por Fora):</label>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.2">
                    Estimativa
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MoneyInput
                    value={cbsRate}
                    onChange={(val) => setCbsRate(val ?? 0)}
                    decimals={2}
                    className="h-8 text-xs font-mono font-bold field-input-brown text-[#261502]"
                    prefix="%"
                  />
                  <span className="text-[11px] text-slate-500 font-mono">Default ≈ 26,50%</span>
                </div>
              </div>
            </div>

            {/* Sinalização Permanente chancelada pela Adri */}
            <div className="rounded-xl border border-amber-400/80 bg-amber-50/80 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[#3b2405] text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Sinalização Legal Permanente (LC 214/2025):</span>
              </div>
              <p className="text-[10px] text-slate-700 leading-relaxed font-mono">
                Estimativa — alíquota de referência pendente de fixação (resolução do Senado Federal
                até 15/12/2026). PIS e COFINS 100% extintos a partir de 2027 (LC 214, art. 334, II).
              </p>
            </div>
          </div>

          {/* CARD 03: MARGEM DE LUCRO DESEJADA, QUANTIDADE & FATOR DIVISOR */}
          <div className="rounded-2xl border border-amber-300/70 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
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
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Margem de Lucro Desejada (%):
                  </label>
                  <span className="text-[11px] font-mono text-[#5c3e06]">
                    Fator: {fatorMargem.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MoneyInput
                    value={margemLucroPct}
                    onChange={(val) => setMargemLucroPct(val ?? 0)}
                    decimals={2}
                    className="h-8 text-xs font-mono font-bold field-input-brown text-[#261502]"
                    prefix="%"
                  />
                  <span className="text-[11px] text-slate-500 font-mono">Régua: 51,9%</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Mesma régua da pré-reforma (51,9% itens 01-02; 30% item 03 — editável).
                </span>
              </div>

              {/* Quantidade Vendida */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-slate-800">
                  Quantidade Vendida (un.):
                </label>
                <MoneyInput
                  value={quantidadeVendida}
                  onChange={(val) => setQuantidadeVendida(Math.max(1, Math.round(val ?? 1)))}
                  decimals={0}
                  className="h-8 text-xs font-mono font-bold field-input-brown text-[#261502]"
                  placeholder="24"
                />
              </div>
            </div>

            {/* Fator Divisor Multiplicativo do Preço */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Fator Divisor Motor:
                </span>
                <span className="text-xs font-mono font-black text-[#261502]">
                  {fatorDivisor.toFixed(6)}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 leading-tight">
                Fórmula: (1 − Σ DV) × (1 − ICMS) × (1 − Margem) = Preço = Custo ÷ Divisor.
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
                        Preço de Venda Simulado (Unitário)
                      </span>
                      <div className="text-xl font-black font-mono text-[#261502] tracking-tight">
                        {formatBRL(col.precoVendaUnitario)}
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 block">
                        {formatBRL(col.custoUnitario)} ÷ {fatorDivisor.toFixed(4)}
                      </span>
                    </div>

                    {/* 3. Linhas da Composição do Preço */}
                    <div className="space-y-1.5 text-xs font-mono pt-1">
                      <div className="flex justify-between text-slate-600">
                        <span>(−) ICMS {formatPercentBR(icmsRate)}:</span>
                        <span className="font-semibold">{formatBRL(col.icmsUnitario)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>(−) Σ DV {formatPercentBR(somaDvPct)}:</span>
                        <span className="font-semibold">{formatBRL(col.dvUnitarioTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>(−) Custo de Aquisição:</span>
                        <span className="font-semibold">{formatBRL(col.custoUnitario)}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-200 flex justify-between text-[#261502] font-bold">
                        <span>(=) Margem Líquida R$:</span>
                        <span className="text-emerald-700">
                          {formatBRL(col.lucroUnitarioRealizado)} (
                          {formatPercentBR(col.margemEfetivaPct)})
                        </span>
                      </div>
                    </div>

                    {/* 4. CBS 2027 por fora & Total da Nota Fiscal */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 space-y-1 text-xs font-mono">
                      <div className="flex justify-between text-slate-600">
                        <span>(+) CBS {formatPercentBR(cbsRate)} (por fora):</span>
                        <span className="font-bold text-[#b87c14]">
                          {formatBRL(col.cbsUnitario)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#261502] font-black border-t border-amber-200/60 pt-1">
                        <span>Nota Fiscal (Unitário):</span>
                        <span>{formatBRL(col.totalNotaUnitario)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>Total Lote ({quantidadeVendida} un.):</span>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#b87c14] block">
                1. ICMS na Transição (2027)
              </span>
              <p className="text-[11px] leading-relaxed">
                ADCT, art. 128 c/c LC 214/2025: o ICMS permanece incidente por dentro com alíquotas
                vigentes em 2027 (fator 1 − 0,18 = 0,8200), sendo desembulhado no divisor
                multiplicativo do preço de venda.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#b87c14] block">
                2. CBS 2027 (Incidência por Fora)
              </span>
              <p className="text-[11px] leading-relaxed">
                LC 214/2025, art. 12, §2º, I: a CBS não integra a própria base de cálculo
                (incidência por fora). Alíquota de referência padrão de 26,50% fixada como parâmetro
                estimado, pendente de resolução do Senado até 15/12/2026.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#b87c14] block">
                3. PIS e COFINS Extintos
              </span>
              <p className="text-[11px] leading-relaxed">
                EC 132/2023, art. 22, I c/c LC 214/2025, art. 334, II: as contribuições ao PIS/PASEP
                e COFINS deixam de incidir a partir de 1º de janeiro de 2027, sendo completamente
                eliminadas da calculadora.
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
                    <span className="font-bold text-[#261502]">{quantidadeVendida} unidades</span>
                  </div>
                </div>

                {/* Tabela de Passos Linha a Linha */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-[#261502] text-amber-200 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Passo</th>
                        <th className="py-2.5 px-3">Etapa / Linha</th>
                        <th className="py-2.5 px-3">Fórmula / Base</th>
                        <th className="py-2.5 px-3 text-right">Valor Unitário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {/* 1. Custo de Aquisição */}
                      <tr className="bg-amber-50/40 font-bold text-[#261502]">
                        <td className="py-2 px-3">1º</td>
                        <td className="py-2 px-3">Custo de Aquisição (Card 03 Compras)</td>
                        <td className="py-2 px-3 text-slate-600 font-normal">
                          Compras líquidas deduzidas de créditos em 2027
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatBRL(itemMemoriaAtivo.custoUnitario)}
                        </td>
                      </tr>

                      {/* 2. DVs */}
                      {despesasVariaveis.map((dv, idx) => (
                        <tr key={dv.id}>
                          <td className="py-2 px-3 text-slate-400">2.{idx + 1}</td>
                          <td className="py-2 px-3 text-slate-700">DV: {dv.descricao}</td>
                          <td className="py-2 px-3 text-slate-500">
                            {formatPercentBR(dv.aliquota)} s/ Preço de Venda (fator{' '}
                            {(1 - dv.aliquota / 100).toFixed(4)})
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-700">
                            {formatBRL(
                              roundHalfUp(
                                itemMemoriaAtivo.precoVendaUnitario * (dv.aliquota / 100),
                                2,
                              ),
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* 3. ICMS */}
                      <tr>
                        <td className="py-2 px-3 text-slate-400">3º</td>
                        <td className="py-2 px-3 text-slate-700">ICMS na Venda (Transição)</td>
                        <td className="py-2 px-3 text-slate-500">
                          {formatPercentBR(icmsRate)} por dentro (fator {fatorIcms.toFixed(4)})
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-700">
                          {formatBRL(itemMemoriaAtivo.icmsUnitario)}
                        </td>
                      </tr>

                      {/* 4. PIS/COFINS Extintos */}
                      <tr className="text-slate-400 italic">
                        <td className="py-2 px-3">4º</td>
                        <td className="py-2 px-3">PIS e COFINS</td>
                        <td className="py-2 px-3">Extintos em 2027 (LC 214/2025 art. 334, II)</td>
                        <td className="py-2 px-3 text-right">R$ 0,00</td>
                      </tr>

                      {/* 5. Margem */}
                      <tr>
                        <td className="py-2 px-3 text-slate-400">5º</td>
                        <td className="py-2 px-3 text-slate-700">Margem de Lucro Desejada</td>
                        <td className="py-2 px-3 text-slate-500">
                          {formatPercentBR(margemLucroPct)} s/ Preço de Venda (fator{' '}
                          {fatorMargem.toFixed(4)})
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                          {formatBRL(itemMemoriaAtivo.lucroUnitarioRealizado)}
                        </td>
                      </tr>

                      {/* 6. Divisor Consolidado */}
                      <tr className="bg-slate-50 font-semibold text-slate-900">
                        <td className="py-2 px-3">6º</td>
                        <td className="py-2 px-3">Fator Divisor Motor</td>
                        <td className="py-2 px-3 text-slate-500 font-normal">
                          Fator DV ({fatorDvConsolidado.toFixed(4)}) × ICMS ({fatorIcms.toFixed(4)})
                          × Margem ({fatorMargem.toFixed(4)})
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#b87c14]">
                          {fatorDivisor.toFixed(6)}
                        </td>
                      </tr>

                      {/* 7. PREÇO DE VENDA FORMADO */}
                      <tr className="bg-[#fdedc3]/60 font-black text-[#261502] text-sm">
                        <td className="py-2.5 px-3">(=)</td>
                        <td className="py-2.5 px-3">Preço de Venda Simulado</td>
                        <td className="py-2.5 px-3 text-xs font-normal">
                          {formatBRL(itemMemoriaAtivo.custoUnitario)} ÷ {fatorDivisor.toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatBRL(itemMemoriaAtivo.precoVendaUnitario)}
                        </td>
                      </tr>

                      {/* 8. CBS 2027 por fora */}
                      <tr>
                        <td className="py-2 px-3 text-slate-400">(+)</td>
                        <td className="py-2 px-3 text-slate-700">
                          CBS 2027 (Estimada {formatPercentBR(cbsRate)})
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          Incidência por fora: {formatBRL(itemMemoriaAtivo.precoVendaUnitario)} ×{' '}
                          {formatPercentBR(cbsRate)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#b87c14]">
                          {formatBRL(itemMemoriaAtivo.cbsUnitario)}
                        </td>
                      </tr>

                      {/* 9. Valor Total da Nota Fiscal de Venda */}
                      <tr className="bg-slate-100 font-black text-slate-900">
                        <td className="py-2.5 px-3">(=)</td>
                        <td className="py-2.5 px-3">Valor Total da Nota Fiscal (Unitário)</td>
                        <td className="py-2.5 px-3 text-xs font-normal text-slate-500">
                          Preço de Venda + CBS por fora destacada
                        </td>
                        <td className="py-2.5 px-3 text-right text-base text-[#261502]">
                          {formatBRL(itemMemoriaAtivo.totalNotaUnitario)}
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
