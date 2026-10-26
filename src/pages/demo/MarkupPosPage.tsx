import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  FileText,
  Plus,
  Trash2,
  PackageCheck,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from 'lucide-react'
import { PageHero } from '@/components/demo/PageHero'
import { MoneyInput } from '@/components/demo/MoneyInput'
import { DemoLayout } from '@/components/demo/DemoLayout'
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
import { CASO_CANONICO_ART12, type CmvArt12Input } from '@/lib/art12Calculations'
import { roundHalfUp } from '@/lib/art12SnCalculations'
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
  type ClienteRegimeKey,
  CLIENTES_REGIME_META,
  type MarkupPosColunaResultado,
} from '@/lib/markupPosCalculations'
import { lerEspelhoComprasCard03 } from '@/lib/leituraCard03Compras'

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
    const comDados = markupProducts.find((p) => p.name && p.name.trim().length > 0)
    return comDados || markupProducts[0]
  }, [markupProducts])

  const temProdutoAtivo = Boolean(
    produtoAtivo && produtoAtivo.name && produtoAtivo.name.trim().length > 0,
  )

  // --------------------------------------------------------------------------
  // 2. EIXO — CUSTO DO ADQUIRENTE (leitura ao vivo do Card 03 da página Compras)
  // --------------------------------------------------------------------------
  const { casoUnitario } = useMemo(() => {
    const itens = montarItensIntegracao(purchasesItems || [])
    const caso = derivarCasoUnitario(itens)
    return { itensOrigem: itens, casoUnitario: caso }
  }, [purchasesItems])

  const temComprasAtivas = Boolean(
    casoUnitario.input && casoUnitario.item && casoUnitario.item.valorNota > 0,
  )

  const inputEfetivo: CmvArt12Input = temComprasAtivas ? casoUnitario.input! : CASO_CANONICO_ART12
  const itemEfetivo: ItemIntegracaoArt12 | undefined = temComprasAtivas
    ? casoUnitario.item!
    : undefined

  // --------------------------------------------------------------------------
  // 3. PERSISTÊNCIA DOS VALORES DIGITADOS (POLÍTICA: "UM SALVAMENTO, UMA PÁGINA")
  // --------------------------------------------------------------------------
  const estadoSalvoInicial = useMemo(() => carregarEstadoMarkupPos(), [])

  // Seletor LP/LR/SNP/SNH = REGIME DO CLIENTE DO CONTADOR (chancela Adri)
  const [clienteRegime, setClienteRegime] = useState<ClienteRegimeKey>(
    estadoSalvoInicial?.clienteRegimeSelecionado ?? 'lp',
  )

  // Fornecedor em foco (para detalhamento/destaque)
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
  // 4. TRIBUTOS & PARÂMETROS EDITÁVEIS (Nascem vazios; motor usa valores de referência)
  // --------------------------------------------------------------------------
  const [icmsRateInput, setIcmsRateInput] = useState<number | undefined>(
    estadoSalvoInicial?.icmsRateInput,
  )
  const icmsRateEfetivo = icmsRateInput ?? REFERENCIAS_MARKUP_POS.ICMS_PADRAO_PCT
  const fatorIcms = useMemo(() => Math.max(0, 1 - icmsRateEfetivo / 100), [icmsRateEfetivo])

  const [cbsRateInput, setCbsRateInput] = useState<number | undefined>(() => {
    if (estadoSalvoInicial?.cbsRateInput !== undefined) return estadoSalvoInicial.cbsRateInput
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('it_reforma_cbs_aliquota_v1')
        if (raw) {
          const num = Number(raw)
          if (Number.isFinite(num) && num > 0) return num
        }
      }
    } catch {
      // tolerar falhas de localStorage
    }
    return undefined
  })
  const cbsRateEfetivo = cbsRateInput ?? REFERENCIAS_MARKUP_POS.CBS_PADRAO_PCT

  const [ibsRateInput, setIbsRateInput] = useState<number | undefined>(
    estadoSalvoInicial?.ibsRateInput,
  )
  const ibsRateEfetivo = ibsRateInput ?? REFERENCIAS_MARKUP_POS.IBS_PADRAO_PCT

  const margemReferencia = useMemo(() => {
    if (produtoAtivo && produtoAtivo.margin && produtoAtivo.margin > 0) {
      return produtoAtivo.margin
    }
    return REFERENCIAS_MARKUP_POS.MARGEM_PADRAO_PCT
  }, [produtoAtivo])

  const quantidadeReferencia = useMemo(() => {
    if (produtoAtivo && produtoAtivo.quantity && produtoAtivo.quantity > 0) {
      return produtoAtivo.quantity
    }
    return REFERENCIAS_MARKUP_POS.QUANTIDADE_PADRAO
  }, [produtoAtivo])

  // Margem e Quantidade individuais por card (LP, LR, SNP, SNH)
  // Migração suave: se houver estado legado com valores globais, adota como base inicial
  const [margemPorCard, setMargemPorCard] = useState<Record<FornecedorPosKey, number | undefined>>(
    () => {
      const salvo = estadoSalvoInicial?.margemPorCard
      const legada = estadoSalvoInicial?.margemLucroInput
      return {
        lp: salvo?.lp ?? legada,
        lr: salvo?.lr ?? legada,
        snp: salvo?.snp ?? legada,
        snh: salvo?.snh ?? legada,
      }
    },
  )

  const [quantidadePorCard, setQuantidadePorCard] = useState<
    Record<FornecedorPosKey, number | undefined>
  >(() => {
    const salvo = estadoSalvoInicial?.quantidadePorCard
    const legada = estadoSalvoInicial?.quantidadeVendidaInput
    return {
      lp: salvo?.lp ?? legada,
      lr: salvo?.lr ?? legada,
      snp: salvo?.snp ?? legada,
      snh: salvo?.snh ?? legada,
    }
  })

  const handleUpdateMargemCard = (key: FornecedorPosKey, val: number | undefined) => {
    setMargemPorCard((prev) => ({ ...prev, [key]: val }))
  }

  const handleUpdateQuantidadeCard = (key: FornecedorPosKey, val: number | undefined) => {
    setQuantidadePorCard((prev) => ({ ...prev, [key]: val }))
  }

  // Efeito de persistência: preserva seleções e valores digitados (Política Adri: um salvamento, uma página)
  useEffect(() => {
    salvarEstadoMarkupPos({
      despesasVariaveis,
      icmsRateInput,
      cbsRateInput,
      ibsRateInput,
      margemPorCard,
      quantidadePorCard,
      fornecedorSelecionado,
      clienteRegimeSelecionado: clienteRegime,
    })
  }, [
    despesasVariaveis,
    icmsRateInput,
    cbsRateInput,
    ibsRateInput,
    margemPorCard,
    quantidadePorCard,
    fornecedorSelecionado,
    clienteRegime,
  ])

  // Parâmetros do Simples Nacional vindos do TaxContext
  const simplesAnexoAtivo = simplesAnexo || 'anexo_1'
  const simplesRbt12Ativo = effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0

  // --------------------------------------------------------------------------
  // 5. LEITURA AO VIVO DO CARD 03 DA COMPRAS PARA O REGIME DO CLIENTE ESCOLHIDO
  // FONTE ÚNICA DO CUSTO: não recalcula custo; consome os 4 motores da Compras
  // --------------------------------------------------------------------------
  const espelhoCard03Compras = useMemo(() => {
    return lerEspelhoComprasCard03(clienteRegime, {
      item: itemEfetivo,
      inputPleno: inputEfetivo,
      cbsAliquotaPct: cbsRateEfetivo,
      cbsRateOverride: cbsRateEfetivo,
      ibsRateOverride: ibsRateEfetivo,
    })
  }, [clienteRegime, itemEfetivo, inputEfetivo, cbsRateEfetivo, ibsRateEfetivo])

  // --------------------------------------------------------------------------
  // 6. DERIVAÇÃO DA FORMAÇÃO DO PREÇO DE VENDA NAS REGRAS MARKUP DO CLIENTE
  // Cada coluna tem sua própria margem de lucro e quantidade vendida independentes
  // --------------------------------------------------------------------------
  const simulacaoQuatroColunas = useMemo(() => {
    const keys: FornecedorPosKey[] = ['lp', 'lr', 'snp', 'snh']
    return keys.map((key) => {
      const custoInfo = espelhoCard03Compras[key]
      const margemDigitada = margemPorCard[key]
      const margemEfetivaCard = margemDigitada ?? margemReferencia

      const qtdDigitada = quantidadePorCard[key]
      const quantidadeEfetivaCard =
        qtdDigitada !== undefined && qtdDigitada > 0
          ? Math.round(qtdDigitada)
          : quantidadeReferencia

      return calcularMarkupPosColuna({
        key,
        clienteRegime,
        custoUnitario: custoInfo.custo2027,
        custoHoje: custoInfo.custoHoje,
        deltaCustoPct: custoInfo.deltaPct,
        comprasLiquidasTotal: custoInfo.comprasLiquidas2027,
        notaCompraTotal: custoInfo.notaCheia2027,
        fatorDvConsolidado,
        somaDvPct,
        margemLucroEfetiva: margemEfetivaCard,
        icmsRateEfetivo,
        cbsRateEfetivo,
        ibsRateEfetivo,
        quantidadeVendidaEfetiva: quantidadeEfetivaCard,
        simplesAnexo: simplesAnexoAtivo,
        simplesRbt12: simplesRbt12Ativo,
        effectiveSimplesRbt12,
        custoInfo,
      })
    })
  }, [
    espelhoCard03Compras,
    clienteRegime,
    margemPorCard,
    quantidadePorCard,
    margemReferencia,
    quantidadeReferencia,
    fatorDvConsolidado,
    somaDvPct,
    icmsRateEfetivo,
    cbsRateEfetivo,
    ibsRateEfetivo,
    simplesAnexoAtivo,
    simplesRbt12Ativo,
    effectiveSimplesRbt12,
  ])

  // Estado do diálogo de memória de cálculo detalhada
  const [modalMemoriaFornecedor, setModalMemoriaFornecedor] = useState<FornecedorPosKey | null>(
    null,
  )
  const itemMemoriaAtivo: MarkupPosColunaResultado | null = useMemo(() => {
    if (!modalMemoriaFornecedor) return null
    return simulacaoQuatroColunas.find((s) => s.key === modalMemoriaFornecedor) || null
  }, [modalMemoriaFornecedor, simulacaoQuatroColunas])

  const clienteMetaAtiva = CLIENTES_REGIME_META[clienteRegime]

  return (
    <DemoLayout currentTab="markup-pos">
      <div className="space-y-6">
        {/* PageHero no padrão visual nobre IT */}
        <PageHero
          title="CALCULADORA DE MARKUP — PÓS EC 132"
          subtitle="Formação do Preço de Venda Pós-Reforma Tributária (2027+): Eixo no Novo Custo do Adquirente (Card 03 Compras), despesas variáveis editáveis e regras tributárias derivadas por regime do cliente."
          badge="ETAPA 6 · PRECIFICAÇÃO E MARKUP PÓS-REFORMA"
          icon={Calculator}
        />

        {/* ========================================================================= */}
        {/* SELETOR PRINCIPAL: REGIME DO CLIENTE DO CONTADOR (LP / LR / SNP / SNH)   */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border-2 border-[#b87c14]/40 bg-gradient-to-r from-[#fbf8f2] via-white to-[#fdf9f1] p-5 shadow-sm space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#261502] to-[#472704] text-amber-200 flex items-center justify-center font-black text-sm shadow-xs">
                <UserCheck className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#b87c14] block">
                  Regime do Cliente do Contador (Adquirente / Vendedor)
                </span>
                <h3 className="text-base font-black text-[#261502] tracking-tight">
                  Selecione o Regime Tributário do Seu Cliente:
                </h3>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 text-[#3b2405] text-xs font-mono font-bold border border-amber-300 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#b87c14]" />
              {clienteMetaAtiva.rotulo}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            O seletor abaixo define a <strong>perspectiva tributária do cliente</strong>. Para cada
            regime selecionado, a calculadora lê automaticamente do <strong>Card 03</strong> da
            Calculadora de Compras os 4 custos de aquisição por fornecedor (LP, LR, SNP e SNH) e
            deriva as regras de formação do preço de venda (ICMS da transição com CBS/IBS por fora
            para LP/LR ou sistemática do Simples Nacional DAS para SNP/SNH).
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {(['lp', 'lr', 'snp', 'snh'] as const).map((key) => {
              const ativo = clienteRegime === key
              const meta = CLIENTES_REGIME_META[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setClienteRegime(key)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    ativo
                      ? 'border-[#b87c14] bg-gradient-to-b from-[#fff9eb] via-white to-[#faeccb] shadow-md ring-2 ring-[#b87c14]/40 -translate-y-0.5'
                      : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-mono font-black uppercase ${
                        ativo
                          ? 'bg-[#261502] text-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {meta.sigla}
                    </span>
                    {ativo && (
                      <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded border border-amber-400">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[#261502] leading-tight block">
                    {meta.rotulo.replace('Cliente ', '')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono line-clamp-2 mt-1 leading-tight">
                    {meta.descricao}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* AVISOS DE INTEGRAÇÃO / SINALIZAÇÃO DE SESSÃO                              */}
        {/* ========================================================================= */}
        {!temProdutoAtivo && (
          <div className="rounded-xl border border-amber-400/60 bg-amber-50/90 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-[#5c3e06]">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3b2405]">
                  Nenhum Produto Ativo na Calculadora Markup Pré-Reforma
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
                  Sem dados na sessão ativa da Calculadora de Compras
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Exibindo o <strong>Caso Canônico Chancelado de Validação</strong> (Smartphone
                  Galaxy S24 Ultra · Lote 30 un. · R$ 1.400/un. + Frete R$ 400). Para simular com a
                  sua nota fiscal de compras, registre a operação na página Compras.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-amber-300 text-[#3b2405] hover:bg-amber-100 font-bold text-xs cursor-pointer whitespace-nowrap"
            >
              <Link to="/demo/reforma">
                Ir para Compras <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PARÂMETROS EDITÁVEIS: DESPESAS VARIÁVEIS E TRIBUTOS NA SAÍDA             */}
        {/* (Margem e Quantidade agora são individuais por card de fornecedor)        */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
                      Fator redutor consolidado (1 − %)
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

              {/* Lista de DVs editáveis (nascem vazias) */}
              {despesasVariaveis.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 p-4 text-center space-y-2">
                  <p className="text-xs text-slate-600 font-mono leading-relaxed">
                    Nenhuma despesa variável configurada. A lista nasce vazia para digitação manual
                    (ex.: Frete 3,00%, Comissão 2,00%, Maquininha 2,50%).
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

          {/* CARD 02: TRIBUTOS NA SAÍDA (DEPENDENTES DO REGIME DO CLIENTE) */}
          <div className="rounded-2xl border border-amber-300/70 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="border-b border-amber-900/10 pb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#261502] text-amber-200 text-xs font-bold font-mono flex items-center justify-center">
                    TR
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#261502] tracking-wider">
                      Tributos na Venda ({clienteMetaAtiva.sigla})
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {clienteRegime === 'snp' || clienteRegime === 'snh'
                        ? 'Sistemática Simples Nacional'
                        : 'ICMS transição · CBS/IBS por fora'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ramo 1: Simples Puro (SNP) */}
              {clienteRegime === 'snp' && (
                <div className="space-y-2 rounded-xl bg-orange-50/60 border border-orange-200 p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-orange-900">
                    <span>DAS Simples Nacional Puro:</span>
                    <span className="font-mono">4,00% (Anexo I)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                    Conforme LC 123/2006 art. 18: recolhimento 100% unificado no DAS por dentro.
                    <strong> NUNCA ICMS com alíquota cheia (18%)</strong> nem CBS/IBS por fora.
                  </p>
                  <div className="pt-2 border-t border-orange-200 text-[10px] text-slate-500 font-mono space-y-0.5">
                    <div>Fatia ICMS no DAS: 34,00% (R$ 44,03)</div>
                    <div>Fatia CBS no DAS: 15,33% (R$ 19,85)</div>
                    <div>Fatia IBS no DAS: 0,17% (R$ 0,22)</div>
                    <div>Fatia Federais: 50,50% (R$ 65,40)</div>
                  </div>
                </div>
              )}

              {/* Ramo 2: Simples Híbrido (SNH) */}
              {clienteRegime === 'snh' && (
                <div className="space-y-2 rounded-xl bg-emerald-50/60 border border-emerald-200 p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                    <span>DAS Híbrido por Dentro:</span>
                    <span className="font-mono">3,38% (ICMS + Federais)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                    LC 214/2025 art. 41: CBS (26,50%) e IBS (0,10%) recolhidos pelo regime regular
                    por fora sobre a base limpa de ICMS.
                  </p>
                  <div className="pt-2 border-t border-emerald-200 text-[10px] text-slate-500 font-mono space-y-0.5">
                    <div>DAS Híbrido: 3,38% (Fator 0,430739 chancelado)</div>
                    <div>CBS por fora: 26,50% s/ base sem ICMS</div>
                    <div>IBS por fora: 0,10% s/ base sem ICMS</div>
                  </div>
                </div>
              )}

              {/* Ramo 3: LP ou LR (Regime Regular com Transição) */}
              {(clienteRegime === 'lp' || clienteRegime === 'lr') && (
                <>
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
                      Subsiste na transição (incide por último com base incluindo CBS/IBS). Vazio
                      usa 18,00%.
                    </span>
                  </div>

                  {/* CBS 2027 com Sinalização Permanente */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        CBS 2027 (Por Fora):
                      </label>
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
                      Incidência por fora (LC 214 art. 12 §2º I). Vazio usa a referência 26,50%.
                    </span>
                  </div>

                  {/* IBS na Venda */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        IBS na Venda (Por Fora):
                      </label>
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5">
                        Alíquota-teste (art. 346)
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
                  </div>
                </>
              )}
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
        </div>

        {/* ========================================================================= */}
        {/* PREÇO DE VENDA SIMULADO — 4 COLUNAS LADO A LADO PARA O CLIENTE SELECIONADO */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#b87c14]" />
              <h3 className="text-sm font-black uppercase text-[#261502] tracking-wider">
                Preço de Venda Derivado para o Cliente {clienteMetaAtiva.rotulo} (4 Fornecedores):
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Formação de Preço Conforme Regime do Cliente · Exercício 2027
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {simulacaoQuatroColunas.map((col) => {
              const isSelected = fornecedorSelecionado === col.key
              const qtdCardEfetiva =
                quantidadePorCard[col.key] !== undefined &&
                (quantidadePorCard[col.key] as number) > 0
                  ? Math.round(quantidadePorCard[col.key] as number)
                  : quantidadeReferencia
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
                    <h3 className="text-sm font-black text-[#261502] uppercase tracking-wide leading-tight">
                      {col.meta.tituloCard || 'CUSTOS DE ENTRADA'}
                    </h3>
                    <h4 className="text-xs font-black text-[#5c3e06] uppercase leading-tight">
                      {col.meta.subtituloAquisicao || col.meta.rotulo}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono leading-tight">
                      {col.custoInfo?.rotuloMotor ?? col.meta.descricao}
                    </p>
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                    {/* 1. Custo Unitário de Aquisição Lido do Card 03 Compras */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 space-y-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>Custo Card 03 (2027):</span>
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

                      {/* Campos individuais por card: Margem de Lucro Desejada e Quantidade Vendida */}
                      <div className="pt-2 border-t border-slate-200/80 space-y-2.5 font-sans">
                        {/* Margem individual */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-800">
                              Margem de Lucro Desejada (%):
                            </label>
                            <span className="text-[10px] font-mono font-semibold text-[#5c3e06]">
                              Fator:{' '}
                              {(1 - (margemPorCard[col.key] ?? margemReferencia) / 100).toFixed(4)}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1.5 items-center">
                            <div className="col-span-7">
                              <MoneyInput
                                value={margemPorCard[col.key]}
                                onChange={(val) => handleUpdateMargemCard(col.key, val)}
                                decimals={2}
                                placeholder={formatNumberBR(margemReferencia, 2)}
                                className="h-8 text-xs font-mono font-bold field-input-brown text-[#261502]"
                                suffix="%"
                              />
                            </div>
                            <div className="col-span-5 text-right">
                              <span className="text-[10px] font-mono text-slate-500 font-semibold block whitespace-nowrap">
                                Ref. {formatPercentBR(margemReferencia)}
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono block leading-tight">
                            Régua de referência {formatPercentBR(margemReferencia)}. Vazio mantém a
                            referência sem zerar.
                          </span>
                        </div>

                        {/* Quantidade individual */}
                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-800">
                              Quantidade Vendida (un.):
                            </label>
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">
                              Ref. {quantidadeReferencia} un.
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1.5 items-center">
                            <div className="col-span-7">
                              <MoneyInput
                                value={quantidadePorCard[col.key]}
                                onChange={(val) => handleUpdateQuantidadeCard(col.key, val)}
                                decimals={0}
                                className="h-8 text-xs font-mono font-bold field-input-brown text-[#261502]"
                                placeholder={String(quantidadeReferencia)}
                                suffix="un."
                              />
                            </div>
                            <div className="col-span-5 text-right">
                              <span className="text-[10px] text-slate-400 font-mono block whitespace-nowrap">
                                Lote operação
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Divisor do card */}
                        <div className="rounded-lg bg-amber-50/80 border border-amber-200/70 p-1.5 flex items-center justify-between text-[10px] font-mono">
                          <span className="font-semibold text-slate-700">Divisor Efetivo:</span>
                          <span className="font-bold text-[#261502]">
                            {col.divisorPrincipal.toFixed(6)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Total da Nota Fiscal e Lote */}
                    <div className="rounded-xl border border-amber-300/80 bg-slate-50/90 p-3 space-y-2 text-xs font-mono shadow-xs">
                      <div className="flex items-baseline justify-between text-[#261502] font-black text-sm">
                        <span className="text-xs uppercase tracking-tight text-slate-700">
                          Nota Fiscal = Total:
                        </span>
                        <span className="text-base text-[#261502] font-black">
                          {formatBRL(col.totalNotaUnitario)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600 pt-1.5 border-t border-slate-200">
                        <span>Total Lote ({qtdCardEfetiva} un.):</span>
                        <span className="font-bold text-slate-800">
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
        {/* COMPOSIÇÃO DOS TRIBUTOS COM FUNDAMENTAÇÃO LEGAL                           */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-amber-300/70 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-amber-900/10 pb-2.5">
            <Layers className="w-4 h-4 text-[#b87c14]" />
            <h4 className="text-xs font-black uppercase text-[#261502] tracking-wider">
              Composição dos Tributos & Fundamentação Legal por Regime do Cliente
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#b87c14] block">
                1. Cliente Lucro Presumido (LP)
              </span>
              <p className="text-[11px] leading-relaxed">
                LC 214/2025, art. 12 §2º V: ICMS fora da base IBS/CBS. CBS e IBS por fora. ICMS
                desembaraçado por último com base incluindo CBS/IBS (Sefaz-SP RC 32303/2025).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#b87c14] block">
                2. Cliente Lucro Real (LR)
              </span>
              <p className="text-[11px] leading-relaxed">
                EC 132/2023 art. 22 I c/c LC 214/2025 art. 12: extinção de PIS/COFINS em 2027 iguala
                a composição de preço na saída ao Lucro Presumido.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-orange-800 block">
                3. Cliente Simples Nacional Puro (SNP)
              </span>
              <p className="text-[11px] leading-relaxed">
                LC 123/2006 art. 18: recolhimento 100% unificado no DAS por dentro. NUNCA alíquota
                cheia de ICMS (18%). Preço = Custo ÷ Divisor Simples Puro.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                4. Cliente Simples Híbrido (SNH)
              </span>
              <p className="text-[11px] leading-relaxed">
                LC 214/2025 art. 41: opt-in CBS/IBS no regime regular. DAS híbrido por dentro (3,38%
                = ICMS + federais), CBS e IBS por fora sobre base limpa de ICMS.
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
                    Memória de Cálculo Completa — Fornecedor {itemMemoriaAtivo?.meta.sigla} ×
                    Cliente {clienteMetaAtiva.sigla} (2027)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-mono">
                    Abertura passo a passo conforme sistemática legal aplicável
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
                      Fornecedor {itemMemoriaAtivo.meta.rotulo} × Cliente {clienteMetaAtiva.rotulo}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      Motor de Custo: {itemMemoriaAtivo.custoInfo?.rotuloMotor}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Lote Simulado
                    </span>
                    <span className="font-bold text-[#261502]">
                      {itemMemoriaAtivo &&
                      quantidadePorCard[itemMemoriaAtivo.key] !== undefined &&
                      (quantidadePorCard[itemMemoriaAtivo.key] as number) > 0
                        ? Math.round(quantidadePorCard[itemMemoriaAtivo.key] as number)
                        : quantidadeReferencia}{' '}
                      unidades
                    </span>
                  </div>
                </div>

                {/* Tabela de Passos Linha a Linha */}
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
                      {/* Passo 0: Custo do Card 03 da Compras */}
                      <tr className="bg-amber-50/40 font-bold text-[#261502]">
                        <td className="py-2 px-3">0º</td>
                        <td className="py-2 px-3">Custo de Aquisição (Card 03 Compras)</td>
                        <td className="py-2 px-3 text-slate-600 font-normal">
                          {itemMemoriaAtivo.custoInfo?.fundamentoLegal ??
                            'Lido diretamente do Card 03 da Calculadora de Compras Pós Reforma'}
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
                            ? `Divisor do Simples Nacional (${itemMemoriaAtivo.clienteRegime === 'snp' ? 'SN Puro' : 'SN Híbrido'})`
                            : 'Divisor Efetivo da Operação'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {(() => {
                            const margemCardAtivo =
                              margemPorCard[itemMemoriaAtivo.key] ?? margemReferencia
                            const fatorMargemCardAtivo = Math.max(0, 1 - margemCardAtivo / 100)
                            return itemMemoriaAtivo.isSimples ? (
                              <>
                                <strong>LC 123/2006 c/c LC 214/2025:</strong> Empresa do Simples
                                Nacional não usa ICMS 18% cheia.
                                <br />
                                Divisor = Π(1 − % DV) [{fatorDvConsolidado.toFixed(4)}] × (1 −
                                Margem) [{fatorMargemCardAtivo.toFixed(4)}] × Fator Tributário [
                                {itemMemoriaAtivo.fatorTributarioEfetivo.toFixed(4)}].
                              </>
                            ) : (
                              <>
                                <strong>LC 214/2025, art. 12, caput e §2º:</strong> Divisor aplicado
                                na formação do preço de venda (fatores de despesas variáveis × fator
                                margem).
                                <br />
                                Divisor = Π(1 − % DV) [{fatorDvConsolidado.toFixed(4)}] × (1 −
                                Margem) [{fatorMargemCardAtivo.toFixed(4)}].
                              </>
                            )
                          })()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#b87c14]">
                          {itemMemoriaAtivo.divisorPrincipal.toFixed(6)}
                        </td>
                      </tr>

                      {/* Linhas de DV */}
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

                      {/* CLIENTE SIMPLES NACIONAL PURO (SNP) */}
                      {itemMemoriaAtivo.clienteRegime === 'snp' && (
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

                      {/* CLIENTE SIMPLES NACIONAL HÍBRIDO (SNH) */}
                      {itemMemoriaAtivo.clienteRegime === 'snh' && (
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
                              ). CBS e IBS por fora (art. 41 LC 214).
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-[#261502]">
                              {formatBRL(itemMemoriaAtivo.fatiasDas?.dasTotal ?? 0)}
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

                      {/* CLIENTE LUCRO PRESUMIDO OU LUCRO REAL */}
                      {(itemMemoriaAtivo.clienteRegime === 'lp' ||
                        itemMemoriaAtivo.clienteRegime === 'lr') && (
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
                              {itemMemoriaAtivo.divisorSemIcms.toFixed(6)}
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
                          {itemMemoriaAtivo.clienteRegime === 'snp'
                            ? '4º'
                            : itemMemoriaAtivo.clienteRegime === 'snh'
                              ? '7º'
                              : '7º'}
                        </td>
                        <td className="py-2.5 px-3">Nota Fiscal = Total Cobrado (Unitário)</td>
                        <td className="py-2.5 px-3 text-xs font-normal">
                          {itemMemoriaAtivo.clienteRegime === 'snh'
                            ? 'Preço P + CBS por fora + IBS por fora destacados na nota fiscal.'
                            : 'Valor total faturado na nota fiscal ao adquirente.'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-base">
                          {formatBRL(itemMemoriaAtivo.totalNotaUnitario)}
                        </td>
                      </tr>

                      {/* TOTAL DO LOTE */}
                      {(() => {
                        const qtdAtivaModal =
                          quantidadePorCard[itemMemoriaAtivo.key] !== undefined &&
                          (quantidadePorCard[itemMemoriaAtivo.key] as number) > 0
                            ? Math.round(quantidadePorCard[itemMemoriaAtivo.key] as number)
                            : quantidadeReferencia
                        return (
                          <tr className="bg-[#fff9eb] font-bold text-[#261502] text-xs">
                            <td className="py-2 px-3">
                              {itemMemoriaAtivo.clienteRegime === 'snp'
                                ? '5º'
                                : itemMemoriaAtivo.clienteRegime === 'snh'
                                  ? '8º'
                                  : '8º'}
                            </td>
                            <td className="py-2 px-3">
                              Total do Lote Simulado ({qtdAtivaModal} un.)
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px] font-normal">
                              Nota Fiscal Total ({formatBRL(itemMemoriaAtivo.totalNotaUnitario)}) ×
                              Quantidade ({qtdAtivaModal} un.)
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-[#261502]">
                              {formatBRL(itemMemoriaAtivo.totalNotaLote)}
                            </td>
                          </tr>
                        )
                      })()}

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
                    <span>Dispositivos Legais Aplicáveis ao Cliente {clienteMetaAtiva.sigla}:</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    {clienteMetaAtiva.fundamento}
                  </p>
                  <p className="text-[10px] text-slate-700 font-semibold leading-relaxed pt-1 border-t border-slate-200">
                    Fundamentação Legal: LC 214/2025 art. 12 §2º V (ICMS fora da base do IBS/CBS em
                    2026–2032); art. 12 §2º I (CBS e IBS por fora da própria base); Sefaz-SP
                    Respostas a Consultas 32303/2025 e 32931/2026 (IBS e CBS compõem a base de
                    cálculo do ICMS); LC 123/2006 art. 18 (Simples Nacional unificado).
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
