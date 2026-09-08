import React, { useState, useEffect, useMemo } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { ScenarioManagerBar } from '@/components/demo/ScenarioManagerBar'
import { useTaxContext } from '@/contexts/TaxContext'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Package,
  Scale,
  Sparkles,
  Info,
} from 'lucide-react'
import {
  formatBRL,
  formatFactorBR,
  formatNumberBR,
  formatPercentBR,
  parseBRNumber,
} from '@/lib/taxCalculations'
import { calculatePgdas, SimplesAnexoId } from '@/lib/simplesCalculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CostCompositionSection } from '@/components/demo/CostCompositionSection'
import { SubstituicaoTributariaSection } from '@/components/demo/SubstituicaoTributariaSection'
import { OperacoesInterestaduaisSection } from '@/components/demo/OperacoesInterestaduaisSection'
import { PageHero } from '@/components/demo/PageHero'

interface ProductBaseValueInputProps {
  productId: string
  isLiquid: boolean
  value: number
  hasCompositionValues?: boolean
  onUpdate: (id: string, field: 'desiredNetRevenue' | 'cost', val: number) => void
}

function ProductBaseValueInput({
  productId,
  isLiquid,
  value,
  hasCompositionValues = false,
  onUpdate,
}: ProductBaseValueInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [text, setText] = useState<string>(value > 0 ? formatNumberBR(value) : '')

  useEffect(() => {
    if (!isFocused) {
      setText(value > 0 ? formatNumberBR(value) : '')
    }
  }, [value, isFocused])

  const isReadOnlyCost = !isLiquid && hasCompositionValues

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-slate-300 font-semibold">
          {isLiquid ? 'Receita líquida desejada' : 'Custo do produto'}
        </label>
        {isReadOnlyCost && (
          <span className="text-[10px] font-mono text-emerald-400 font-medium">
            · via composição de custo
          </span>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
          R$
        </span>
        <Input
          type="text"
          placeholder="0,00"
          value={text}
          readOnly={isReadOnlyCost}
          onFocus={() => {
            if (!isReadOnlyCost) setIsFocused(true)
          }}
          onChange={(e) => {
            if (isReadOnlyCost) return
            const raw = e.target.value
            setText(raw)
            const num = parseBRNumber(raw)
            onUpdate(productId, isLiquid ? 'desiredNetRevenue' : 'cost', num)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            if (isReadOnlyCost) return
            const num = parseBRNumber(e.target.value)
            setText(num > 0 ? formatNumberBR(num) : '')
            onUpdate(productId, isLiquid ? 'desiredNetRevenue' : 'cost', num)
          }}
          className={`pl-8 text-right bg-slate-900 border-slate-800 text-slate-100 text-xs h-8 ${
            isReadOnlyCost
              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20 cursor-default focus:border-emerald-500/40'
              : ''
          }`}
        />
      </div>
    </div>
  )
}

interface ProductMarginInputProps {
  productId: string
  isLiquid: boolean
  margin: number
  onUpdate: (id: string, margin: number) => void
}

function ProductMarginInput({ productId, isLiquid, margin, onUpdate }: ProductMarginInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [text, setText] = useState<string>(margin > 0 ? formatNumberBR(margin) : '')

  useEffect(() => {
    if (!isFocused) {
      setText(margin > 0 ? formatNumberBR(margin) : '')
    }
  }, [margin, isFocused])

  return (
    <div className="space-y-1">
      <label className="text-[11px] text-slate-300 font-semibold">
        {isLiquid ? 'Margem adicional (%)' : 'Margem de lucro (%)'}
      </label>
      <div className="relative">
        <Input
          type="text"
          placeholder="0,00"
          value={text}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => {
            const raw = e.target.value
            setText(raw)
            const num = parseBRNumber(raw)
            onUpdate(productId, num)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            const num = parseBRNumber(e.target.value)
            setText(num > 0 ? formatNumberBR(num) : '')
            onUpdate(productId, num)
          }}
          className="pr-6 text-right bg-slate-900 border-slate-800 text-slate-100 text-xs h-8"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
          %
        </span>
      </div>
    </div>
  )
}

export default function MarkupPage() {
  const navigate = useNavigate()
  const {
    regime,
    setRegime,
    markupMode,
    setMarkupMode,
    icmsRateMarkup,
    setIcmsRateMarkup,
    customTaxesMarkup,
    addCustomTaxMarkup,
    removeCustomTaxMarkup,
    markupProducts,
    addMarkupProduct,
    updateMarkupProduct,
    removeMarkupProduct,
    simulatedSalePrice,
    simulatedTaxFactorTotal,
    simulatedCompleteFactor,
    isMarkupSimulated,
    simulateMarkup,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
    totalConsolidatedCost,
    simplesAnexo,
    effectiveSimplesRbt12: simplesRbt12,
    simplesIsInicioAtividade,
  } = useTaxContext()

  // Sincronização do ICMS (com foco protegido)
  const [isIcmsFocused, setIsIcmsFocused] = useState(false)
  const [icmsInput, setIcmsInput] = useState<string>(
    icmsRateMarkup > 0 ? formatNumberBR(icmsRateMarkup) : '',
  )

  useEffect(() => {
    if (!isIcmsFocused) {
      setIcmsInput(icmsRateMarkup > 0 ? formatNumberBR(icmsRateMarkup) : '')
    }
  }, [icmsRateMarkup, isIcmsFocused])

  // Estado para novo tributo customizado
  const [showAddCustomTax, setShowAddCustomTax] = useState(false)
  const [newTaxName, setNewTaxName] = useState('')
  const [newTaxRate, setNewTaxRate] = useState('')

  // Sincronizar ICMS
  const handleIcmsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setIcmsInput(val)
    setIcmsRateMarkup(parseBRNumber(val))
  }

  const handleIcmsBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsIcmsFocused(false)
    const num = parseBRNumber(e.target.value)
    setIcmsInput(num > 0 ? formatNumberBR(num) : '')
    setIcmsRateMarkup(num)
  }

  const handleAddCustomTax = () => {
    if (newTaxName.trim() && newTaxRate) {
      addCustomTaxMarkup(newTaxName.trim().toUpperCase(), parseBRNumber(newTaxRate))
      setNewTaxName('')
      setNewTaxRate('')
      setShowAddCustomTax(false)
    }
  }

  // Alíquotas e fatores de PIS/COFINS conforme regime
  // No Simples Nacional, PIS/COFINS não incidem em guias separadas (são unificados no DAS)
  const isSimples = regime === 'simples'
  const pisRate = isSimples ? 0 : regime === 'presumido' ? 0.65 : 1.65
  const cofinsRate = isSimples ? 0 : regime === 'presumido' ? 3.0 : 7.6
  const icmsFactor = 1 - (icmsRateMarkup || 0) / 100
  const pisFactor = isSimples ? 1 : 1 - pisRate / 100
  const cofinsFactor = isSimples ? 1 : 1 - cofinsRate / 100

  // Fator tributário base
  let baseTaxFactor = icmsFactor * pisFactor * cofinsFactor
  for (const tax of customTaxesMarkup) {
    baseTaxFactor *= 1 - (tax.rate || 0) / 100
  }

  // --------------------------------------------------------------------------
  // Comparação de Preço de Venda Simulado por Regime (Presumido, Real, Simples)
  // Reutiliza o fator fracionado recalculado com alíquotas oficiais de cada regime
  // --------------------------------------------------------------------------
  const regimeComparison = useMemo(() => {
    if (!isMarkupSimulated || markupProducts.length === 0) {
      return null
    }

    // Fator de tributos customizados (comum a todos os regimes)
    let customTaxesFactor = 1
    for (const tax of customTaxesMarkup) {
      customTaxesFactor *= 1 - (tax.rate || 0) / 100
    }

    const icmsF = 1 - (icmsRateMarkup || 0) / 100

    // 1. Lucro Presumido: PIS 0,65% (0.0065) e COFINS 3,00% (0.0300) cumulativo, ICMS informado
    const pisFactorPresumido = 1 - 0.0065
    const cofinsFactorPresumido = 1 - 0.03
    const baseTaxFactorPresumido =
      icmsF * pisFactorPresumido * cofinsFactorPresumido * customTaxesFactor

    // 2. Lucro Real: PIS 1,65% (0.0165) e COFINS 7,60% (0.0760) não cumulativo, ICMS informado
    const pisFactorReal = 1 - 0.0165
    const cofinsFactorReal = 1 - 0.076
    const baseTaxFactorReal = icmsF * pisFactorReal * cofinsFactorReal * customTaxesFactor

    // 3. Simples Nacional: Alíquota efetiva do PGDAS calculada sobre RBT12 e Anexo do TaxContext
    // Se RBT12 zerado ou não informado, não calcula preço fixo ("—") e emite aviso
    const hasSimplesData = (simplesRbt12 || 0) > 0
    let effectiveSimplesRate = 0
    let baseTaxFactorSimples: number | null = null

    if (hasSimplesData) {
      const pgdasRes = calculatePgdas((simplesAnexo as SimplesAnexoId) || 'anexo_1', simplesRbt12)
      effectiveSimplesRate = pgdasRes.aliquotaEfetiva // ex: 8.5 para 8.5%
      // fator Simples = (1 - alíquota efetiva) * customTaxesFactor
      baseTaxFactorSimples = (1 - effectiveSimplesRate / 100) * customTaxesFactor
    }

    // Helper para calcular produtos com um determinado fator tributário base
    const calcForTaxFactor = (taxFactor: number) => {
      let totalRev = 0
      let totalQty = 0
      const prods = markupProducts.map((p) => {
        const rawMargin = typeof p.margin === 'number' && Number.isFinite(p.margin) ? p.margin : 0
        const marginFactor = 1 - rawMargin / 100
        const completeFactor = (Number.isFinite(taxFactor) ? taxFactor : 0) * marginFactor
        const safeFactor = completeFactor > 0.0001 ? completeFactor : 0
        const baseValue =
          p.mode === 'liquid'
            ? typeof p.desiredNetRevenue === 'number' && Number.isFinite(p.desiredNetRevenue)
              ? p.desiredNetRevenue
              : 0
            : typeof p.cost === 'number' && Number.isFinite(p.cost)
              ? p.cost
              : 0
        const rawSalePrice = safeFactor > 0 && baseValue > 0 ? baseValue / safeFactor : 0
        const roundedPrice = Number.isFinite(rawSalePrice)
          ? Math.round(rawSalePrice * 100) / 100
          : 0
        const qty =
          typeof p.quantity === 'number' && Number.isFinite(p.quantity)
            ? Math.max(0, p.quantity)
            : 0
        const rawRev = roundedPrice * qty
        const rev = Number.isFinite(rawRev) ? Math.round(rawRev * 100) / 100 : 0
        totalRev += rev
        totalQty += qty
        return {
          id: p.id,
          name: p.name,
          salePrice: roundedPrice,
          totalRevenue: rev,
        }
      })
      const avgPrice =
        totalQty > 0
          ? Math.round((totalRev / totalQty) * 100) / 100
          : prods.length > 0
            ? prods[0].salePrice
            : 0
      return { prods, totalRev: Math.round(totalRev * 100) / 100, avgPrice, totalQty }
    }

    const calcPresumido = calcForTaxFactor(baseTaxFactorPresumido)
    const calcReal = calcForTaxFactor(baseTaxFactorReal)
    const calcSimples =
      baseTaxFactorSimples !== null ? calcForTaxFactor(baseTaxFactorSimples) : null

    const isMultiProduct = markupProducts.length > 1
    const hasQuantity = totalConsolidatedQuantity > 0

    // Preços de exibição principal na linha (unitário médio se multi-produto/quantidade, ou do item único)
    const pricePresumido = isMultiProduct
      ? hasQuantity
        ? calcPresumido.avgPrice
        : calcPresumido.prods[0]?.salePrice || 0
      : calcPresumido.prods[0]?.salePrice || 0

    const priceReal = isMultiProduct
      ? hasQuantity
        ? calcReal.avgPrice
        : calcReal.prods[0]?.salePrice || 0
      : calcReal.prods[0]?.salePrice || 0

    const priceSimples = calcSimples
      ? isMultiProduct
        ? hasQuantity
          ? calcSimples.avgPrice
          : calcSimples.prods[0]?.salePrice || 0
        : calcSimples.prods[0]?.salePrice || 0
      : null

    // Encontrar o menor preço entre os regimes válidos (> 0)
    const validPrices: { key: 'presumido' | 'real' | 'simples'; price: number }[] = [
      { key: 'presumido', price: pricePresumido },
      { key: 'real', price: priceReal },
    ]
    if (priceSimples !== null && priceSimples > 0) {
      validPrices.push({ key: 'simples', price: priceSimples })
    }

    let lowestKey: 'presumido' | 'real' | 'simples' | null = null
    if (validPrices.length > 0 && validPrices.some((p) => p.price > 0)) {
      const minP = validPrices.filter((p) => p.price > 0).sort((a, b) => a.price - b.price)[0]
      if (minP) {
        lowestKey = minP.key
      }
    }

    return {
      hasSimplesData,
      effectiveSimplesRate,
      isMultiProduct,
      hasQuantity,
      pricePresumido,
      priceReal,
      priceSimples,
      totalRevPresumido: calcPresumido.totalRev,
      totalRevReal: calcReal.totalRev,
      totalRevSimples: calcSimples ? calcSimples.totalRev : null,
      prodsPresumido: calcPresumido.prods,
      prodsReal: calcReal.prods,
      prodsSimples: calcSimples ? calcSimples.prods : null,
      lowestKey,
    }
  }, [
    isMarkupSimulated,
    markupProducts,
    customTaxesMarkup,
    icmsRateMarkup,
    simplesRbt12,
    simplesAnexo,
    totalConsolidatedQuantity,
  ])

  // Aplica modo padrão para novos produtos ou quando o usuário clica nos botões do topo
  const handleSelectDefaultMode = (mode: 'liquid' | 'cost_margin') => {
    setMarkupMode(mode)
    // Se houver apenas 1 produto e estiver zerado, também atualiza seu modo para facilitar a experiência
    if (
      markupProducts.length === 1 &&
      markupProducts[0].desiredNetRevenue === 0 &&
      markupProducts[0].cost === 0
    ) {
      updateMarkupProduct(markupProducts[0].id, 'mode', mode)
    }
  }

  return (
    <DemoLayout currentTab="markup">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Destaque Central Topo: Hero Banner estilo ADAPTA ONE */}
        <PageHero
          title="CALCULADORA DE MARKUP"
          subtitle="Cadastre produtos e serviços, defina a receita líquida ou custo + margem por item e obtenha os preços fracionados com consolidação automática para as DREs."
          badge="PRECIFICAÇÃO INTELIGENTE & MULTI-PRODUTOS"
          icon={Calculator}
        />

        {/* Card Principal */}
        <div className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
          {/* Header com Ícone de Calculadora */}
          <div className="flex items-start justify-between flex-wrap gap-3 pb-2 border-b border-emerald-500/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Parâmetros e Produtos do MARKUP
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                    {markupProducts.length} {markupProducts.length === 1 ? 'produto' : 'produtos'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Configuração de alíquotas automáticas por regime tributário e lista de produtos.
                </p>
              </div>
            </div>
          </div>

          {/* Regime tributário da empresa (alíquotas automáticas) no topo */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Regime tributário da empresa (alíquotas automáticas)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRegime('presumido')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  regime === 'presumido'
                    ? 'bg-orange-500 text-slate-950 border-orange-400 font-bold shadow-md shadow-orange-500/20'
                    : 'bg-slate-950/40 border-orange-500/30 text-orange-200/80 hover:border-orange-500/60 hover:text-orange-100 hover:bg-orange-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold font-mono uppercase ${regime === 'presumido' ? 'text-slate-950' : 'text-orange-300'}`}
                  >
                    Lucro Presumido
                  </span>
                  {regime === 'presumido' && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                </div>
                <p
                  className={`text-[11px] mt-1 font-mono ${regime === 'presumido' ? 'text-slate-900/90 font-medium' : 'text-slate-400'}`}
                >
                  PIS 0,65% · COFINS 3,00% (cumulativo)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRegime('real')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  regime === 'real'
                    ? 'bg-orange-500 text-slate-950 border-orange-400 font-bold shadow-md shadow-orange-500/20'
                    : 'bg-slate-950/40 border-orange-500/30 text-orange-200/80 hover:border-orange-500/60 hover:text-orange-100 hover:bg-orange-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold font-mono uppercase ${regime === 'real' ? 'text-slate-950' : 'text-orange-300'}`}
                  >
                    Lucro Real
                  </span>
                  {regime === 'real' && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                </div>
                <p
                  className={`text-[11px] mt-1 font-mono ${regime === 'real' ? 'text-slate-900/90 font-medium' : 'text-slate-400'}`}
                >
                  PIS 1,65% · COFINS 7,60% (não cumulativo)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRegime('simples')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  regime === 'simples'
                    ? 'bg-orange-500 text-slate-950 border-orange-400 font-bold shadow-md shadow-orange-500/20'
                    : 'bg-slate-950/40 border-orange-500/30 text-orange-200/80 hover:border-orange-500/60 hover:text-orange-100 hover:bg-orange-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold font-mono uppercase ${regime === 'simples' ? 'text-slate-950' : 'text-orange-300'}`}
                  >
                    Simples Nacional
                  </span>
                  {regime === 'simples' && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                </div>
                <p
                  className={`text-[11px] mt-1 font-mono ${regime === 'simples' ? 'text-slate-900/90 font-medium' : 'text-slate-400'}`}
                >
                  Guia única DAS (PIS/COFINS sem destaque avulso)
                </p>
              </button>
            </div>
          </div>

          {/* Modo padrão de partida para a calculadora */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Modo de cálculo predominante (ou personalize por produto abaixo):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectDefaultMode('liquid')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  markupMode === 'liquid'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    A partir da receita líquida
                  </span>
                  {markupMode === 'liquid' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Partir do valor líquido desejado e aplicar os fatores fracionados.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDefaultMode('cost_margin')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  markupMode === 'cost_margin'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    A partir do custo + margem
                  </span>
                  {markupMode === 'cost_margin' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Partir do custo base e embutir a margem de lucro e tributos.
                </p>
              </button>
            </div>
          </div>

          {/* ÁREA DE LISTA / TABELA DE PRODUTOS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Produtos / Serviços Cadastrados
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                Atualização em tempo real · clique em <strong>Simular</strong> ou navegue livremente
              </span>
            </div>

            <div className="space-y-3">
              {markupProducts.map((prod, index) => {
                const isProdLiquid = prod.mode === 'liquid'
                return (
                  <div
                    key={prod.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 transition-colors hover:border-slate-700/80"
                  >
                    {/* Linha superior: Nome do produto, seletor de modo e lixeira */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-mono text-slate-500 font-bold shrink-0">
                          #{index + 1}
                        </span>
                        <Input
                          type="text"
                          value={prod.name}
                          onChange={(e) => updateMarkupProduct(prod.id, 'name', e.target.value)}
                          placeholder="Nome ou descrição do produto/serviço (ex.: Produto A)"
                          className="bg-slate-900 border-slate-800 text-slate-100 font-semibold text-xs h-8 flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Seletor do modo específico para este produto */}
                        <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={() => updateMarkupProduct(prod.id, 'mode', 'liquid')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              isProdLiquid
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Receita Líquida
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMarkupProduct(prod.id, 'mode', 'cost_margin')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              !isProdLiquid
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Custo + Margem
                          </button>
                        </div>

                        {/* Botão de Remover (lixeira) */}
                        <button
                          type="button"
                          onClick={() => removeMarkupProduct(prod.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10 cursor-pointer"
                          title="Remover produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Linha de Campos: Base de cálculo, Margem (se aplicável), Quantidade e Preço Resultante */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                      {/* Campo 1: Valor Base (Receita Líquida ou Custo) */}
                      {(() => {
                        const comp = prod.costComposition
                        const directSum = (comp?.directCosts || []).reduce(
                          (a, b) => a + (b.value || 0),
                          0,
                        )
                        const indirectSum = (comp?.indirectCosts || []).reduce(
                          (a, b) => a + (b.value || 0),
                          0,
                        )
                        const fixedSum = (comp?.fixedCosts || []).reduce(
                          (a, b) => a + (b.value || 0),
                          0,
                        )
                        const totalComp = directSum + indirectSum + fixedSum
                        const hasCompValues = totalComp > 0

                        return (
                          <ProductBaseValueInput
                            key={`base-${prod.id}-${prod.mode}`}
                            productId={prod.id}
                            isLiquid={isProdLiquid}
                            value={isProdLiquid ? prod.desiredNetRevenue : prod.cost}
                            hasCompositionValues={hasCompValues}
                            onUpdate={(id, field, val) => updateMarkupProduct(id, field, val)}
                          />
                        )
                      })()}
                      {/* Campo 2: Margem de Lucro (%) */}
                      <ProductMarginInput
                        key={`margin-${prod.id}`}
                        productId={prod.id}
                        isLiquid={isProdLiquid}
                        margin={prod.margin}
                        onUpdate={(id, val) => updateMarkupProduct(id, 'margin', val)}
                      />

                      {/* Campo 3: Quantidade Vendida */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 font-semibold">
                          Quantidade vendida
                        </label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={prod.quantity > 0 ? String(prod.quantity) : ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            updateMarkupProduct(
                              prod.id,
                              'quantity',
                              isNaN(val) || val < 0 ? 0 : val,
                            )
                          }}
                          className="text-right bg-slate-900 border-slate-800 text-slate-100 text-xs h-8"
                        />
                      </div>

                      {/* Campo 4: Preço Resultante e Total (atualizado após Simular) */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-emerald-400 font-semibold">
                          Preço de venda simulado
                        </label>
                        <div className="h-8 px-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-400">
                          <span className="text-[10px] text-emerald-400/70 font-mono">Un.:</span>
                          <span>{isMarkupSimulated ? formatBRL(prod.salePrice) : '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-resultado do produto quando simulado */}
                    {isMarkupSimulated && prod.quantity > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[11px] font-mono text-slate-400">
                        <span>
                          Subtotal do produto ({prod.quantity} un. × {formatBRL(prod.salePrice)}):
                        </span>
                        <span className="font-bold text-emerald-300">
                          {formatBRL(prod.totalRevenue)}
                        </span>
                      </div>
                    )}

                    {/* Subsistema de Composição do Custo: Condicional ao modo Custo + Margem */}
                    {!isProdLiquid && (
                      <CostCompositionSection
                        productId={prod.id}
                        productName={prod.name}
                        composition={prod.costComposition}
                        onApplyTotal={(tot) => updateMarkupProduct(prod.id, 'cost', tot)}
                      />
                    )}
                  </div>
                )
              })}{' '}
            </div>

            {/* Botão para adicionar mais produtos */}
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addMarkupProduct('', markupMode)}
                className="h-8 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar outro produto
              </Button>
            </div>
          </div>

          {/* Subsistemas Integrados: Situações Especiais da Operação (Opt-in) */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Situações Especiais da Operação (Subsistemas Integrados)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Acione apenas se a operação envolver Substituição Tributária (ICMS-ST) ou venda
                  interestadual (DIFAL).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <SubstituicaoTributariaSection
                viewMode="markup"
                saleOperationValue={totalConsolidatedRevenue || simulatedSalePrice}
              />
              <OperacoesInterestaduaisSection
                viewMode="markup"
                saleOperationValue={totalConsolidatedRevenue || simulatedSalePrice}
              />
            </div>
          </div>

          {/* Seção % Tributos */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            {' '}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                % Tributos
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddCustomTax(!showAddCustomTax)}
                className="h-7 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar tributo
              </Button>
            </div>
            {/* Modal/Form inline para tributo adicional */}
            {showAddCustomTax && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-200">Novo tributo adicional</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    type="text"
                    placeholder="Nome (ex.: ISS, IPI)"
                    value={newTaxName}
                    onChange={(e) => setNewTaxName(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                  <Input
                    type="text"
                    placeholder="Alíquota %"
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddCustomTax(false)}
                    className="text-xs h-7"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomTax}
                    className="text-xs h-7 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}
            {/* ICMS Primeiro: Alíquota livre */}
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-emerald-400 uppercase">ICMS</span>
                <span className="text-xs text-slate-400">
                  (alíquota estadual sobre receita bruta)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-28">
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={icmsInput}
                    onFocus={() => setIsIcmsFocused(true)}
                    onChange={handleIcmsChange}
                    onBlur={handleIcmsBlur}
                    className="pr-7 text-right bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs focus:border-emerald-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                    %
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 min-w-[110px] text-right">
                  Fator: <span className="text-slate-200">{formatFactorBR(icmsFactor)}</span>
                </div>
              </div>
            </div>
            {/* Linhas por tributo detalhadas */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl divide-y divide-slate-800/80 text-xs font-mono">
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-300 font-bold">PIS</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">{formatNumberBR(pisRate)}%</span>
                  <span className="text-slate-300">
                    Fator: <strong className="text-emerald-400">{formatFactorBR(pisFactor)}</strong>
                  </span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-300 font-bold">COFINS</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">{formatNumberBR(cofinsRate)}%</span>
                  <span className="text-slate-300">
                    Fator:{' '}
                    <strong className="text-emerald-400">{formatFactorBR(cofinsFactor)}</strong>
                  </span>
                </div>
              </div>

              {/* Tributos adicionais se houver */}
              {customTaxesMarkup.map((ct) => (
                <div key={ct.id} className="px-3.5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-bold">{ct.name}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomTaxMarkup(ct.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">{formatNumberBR(ct.rate)}%</span>
                    <span className="text-slate-300">
                      Fator:{' '}
                      <strong className="text-emerald-400">
                        {formatFactorBR(1 - ct.rate / 100)}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão Simular à Direita na Base */}
          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              onClick={simulateMarkup}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <Calculator className="w-4 h-4" />
              Simular
            </Button>
          </div>
        </div>

        {/* Quadro de Resultados (atualiza SOMENTE ao simular) */}
        {isMarkupSimulated && (
          <div className="bg-[#0b101b]/90 border border-emerald-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Resultado Consolidado do Markup
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] font-mono">
                  {markupProducts.length} {markupProducts.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Regime aplicado: <strong className="text-emerald-400 uppercase">{regime}</strong>
              </span>
            </div>

            {/* Totais Consolidados */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Fator tributário base</span>
                <span className="text-lg font-bold text-slate-200">
                  {formatFactorBR(simulatedTaxFactorTotal, 5)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">ICMS + PIS/COFINS</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">
                  Quantidade total de itens
                </span>
                <span className="text-lg font-bold text-slate-200">
                  {totalConsolidatedQuantity} un.
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Soma de todos os produtos
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Preço unitário médio</span>
                <span className="text-lg font-bold text-slate-200">
                  {totalConsolidatedQuantity > 0
                    ? formatBRL(totalConsolidatedRevenue / totalConsolidatedQuantity)
                    : formatBRL(simulatedSalePrice)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Receita ÷ Quantidade</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-400 block mb-1 font-semibold">
                  Receita bruta consolidada
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  {formatBRL(totalConsolidatedRevenue)}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-1">Alimenta as DREs</span>
              </div>
            </div>

            {/* Tabela de Produtos Simulados */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-right">
                    <th className="py-2 text-left font-semibold text-slate-300">Produto</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Modo</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Fator Comp.</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Preço Venda</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Qtd.</th>
                    <th className="py-2 px-2 font-semibold text-slate-300">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {markupProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-left font-medium text-slate-200">{p.name}</td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {p.mode === 'liquid' ? 'Líquida' : 'Custo+Margem'}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {formatFactorBR(p.completeFactor, 4)}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-400">
                        {formatBRL(p.salePrice)}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-200">{p.quantity} un.</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-100">
                        {formatBRL(p.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-950/60 font-bold border-t border-slate-700">
                    <td colSpan={4} className="py-2.5 text-left text-slate-300 uppercase">
                      Total Consolidado
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-200">
                      {totalConsolidatedQuantity} un.
                    </td>
                    <td className="py-2.5 px-2 text-right text-emerald-400">
                      {formatBRL(totalConsolidatedRevenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bloco Comparativo Discreto: Preço de Venda Simulado por Regime */}
            {regimeComparison && (
              <div className="pt-4 mt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                      Preço de venda simulado por regime
                    </h3>
                    <Badge className="bg-slate-900 text-slate-400 border-slate-700 text-[10px] font-mono">
                      Comparativo em linha
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {regimeComparison.isMultiProduct
                      ? regimeComparison.hasQuantity
                        ? 'Valores exibidos em preço médio ponderado consolidado'
                        : `Preço do produto em foco (${markupProducts[0]?.name || 'Item 1'})`
                      : 'Preço unitário simulado para a mesma operação'}
                  </span>
                </div>

                {/* Linha Comparativa: 3 Colunas lado a lado */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  {/* Coluna 1: Lucro Presumido */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      regimeComparison.lowestKey === 'presumido'
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">
                        Lucro Presumido
                      </span>
                      {regimeComparison.lowestKey === 'presumido' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <Sparkles className="w-3 h-3" />
                          Menor preço
                        </span>
                      )}
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white tracking-tight my-1">
                      {formatBRL(regimeComparison.pricePresumido)}
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-1.5 mt-1.5">
                      <div className="flex justify-between">
                        <span>PIS/COFINS (cumulativo):</span>
                        <span className="text-slate-300 font-semibold">0,65% + 3,00%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ICMS configurado:</span>
                        <span className="text-slate-300 font-semibold">
                          {formatPercentBR(icmsRateMarkup || 0)}
                        </span>
                      </div>
                      {regimeComparison.isMultiProduct && regimeComparison.hasQuantity && (
                        <div className="flex justify-between pt-0.5 text-slate-400">
                          <span>Receita total:</span>
                          <span className="text-emerald-300 font-semibold">
                            {formatBRL(regimeComparison.totalRevPresumido)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coluna 2: Lucro Real */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      regimeComparison.lowestKey === 'real'
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">
                        Lucro Real
                      </span>
                      {regimeComparison.lowestKey === 'real' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <Sparkles className="w-3 h-3" />
                          Menor preço
                        </span>
                      )}
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white tracking-tight my-1">
                      {formatBRL(regimeComparison.priceReal)}
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-1.5 mt-1.5">
                      <div className="flex justify-between">
                        <span>PIS/COFINS (não cumul.):</span>
                        <span className="text-slate-300 font-semibold">1,65% + 7,60%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ICMS configurado:</span>
                        <span className="text-slate-300 font-semibold">
                          {formatPercentBR(icmsRateMarkup || 0)}
                        </span>
                      </div>
                      {regimeComparison.isMultiProduct && regimeComparison.hasQuantity && (
                        <div className="flex justify-between pt-0.5 text-slate-400">
                          <span>Receita total:</span>
                          <span className="text-emerald-300 font-semibold">
                            {formatBRL(regimeComparison.totalRevReal)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coluna 3: Simples Nacional */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      regimeComparison.lowestKey === 'simples'
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">
                        Simples Nacional
                      </span>
                      {regimeComparison.lowestKey === 'simples' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <Sparkles className="w-3 h-3" />
                          Menor preço
                        </span>
                      )}
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white tracking-tight my-1">
                      {regimeComparison.priceSimples !== null
                        ? formatBRL(regimeComparison.priceSimples)
                        : '—'}
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-1.5 mt-1.5">
                      {regimeComparison.hasSimplesData ? (
                        <>
                          <div className="flex justify-between">
                            <span>Alíquota efetiva PGDAS:</span>
                            <span className="text-slate-300 font-semibold">
                              {formatPercentBR(regimeComparison.effectiveSimplesRate)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tributo único no DAS:</span>
                            <span className="text-slate-300 font-semibold">Sem bi-tributação</span>
                          </div>
                          {regimeComparison.isMultiProduct &&
                            regimeComparison.hasQuantity &&
                            regimeComparison.totalRevSimples !== null && (
                              <div className="flex justify-between pt-0.5 text-slate-400">
                                <span>Receita total:</span>
                                <span className="text-emerald-300 font-semibold">
                                  {formatBRL(regimeComparison.totalRevSimples)}
                                </span>
                              </div>
                            )}
                        </>
                      ) : (
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex items-start gap-1.5 text-amber-300/90">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                            <span className="leading-tight">
                              {simplesIsInicioAtividade
                                ? 'Empresa em início de atividade: informe as receitas mensais na DRE Simples Nacional para o sistema calcular a RBT12 proporcional'
                                : 'Informe o RBT12 na DRE Simples Nacional para obter a alíquota efetiva do PGDAS.'}
                            </span>
                          </div>
                          {simplesIsInicioAtividade && (
                            <button
                              type="button"
                              onClick={() => navigate('/demo/simples')}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer pl-5"
                            >
                              <span>Ir para DRE Simples Nacional</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detalhe por produto se houver multi-produtos cadastrados */}
                {regimeComparison.isMultiProduct && (
                  <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/70 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-300">
                      Discriminado por produto:{' '}
                      <strong className="text-emerald-400">
                        {markupProducts.length} itens simulados
                      </strong>
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {markupProducts.map((p, idx) => {
                        const pPres = regimeComparison.prodsPresumido?.find((x) => x.id === p.id)
                        const pReal = regimeComparison.prodsReal?.find((x) => x.id === p.id)
                        const pSimp = regimeComparison.prodsSimples?.find((x) => x.id === p.id)
                        return (
                          <span key={p.id} className="text-[10px] text-slate-400">
                            <strong className="text-slate-200">
                              #{idx + 1} {p.name || `Item ${idx + 1}`}:
                            </strong>{' '}
                            LP {pPres ? formatBRL(pPres.salePrice) : '—'} · LR{' '}
                            {pReal ? formatBRL(pReal.salePrice) : '—'} · SN{' '}
                            {pSimp ? formatBRL(pSimp.salePrice) : '—'}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-slate-400 font-mono">
              💡 A receita consolidada ({formatBRL(totalConsolidatedRevenue)}) alimenta
              automaticamente as páginas de <strong>DRE Simples Nacional</strong>,{' '}
              <strong>Lucro Presumido</strong>, <strong>Lucro Real</strong> e{' '}
              <strong>Comparação de Regimes</strong>.
            </p>
          </div>
        )}

        {/* Barra de Gerenciamento de Cenários movida para o final da página do Markup */}
        <div className="pt-2">
          <ScenarioManagerBar />
        </div>

        {/* Rodapé da Calculadora Markup: Botão para próxima página (Calculadora de Compras) por último */}
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            onClick={() => navigate('/demo/compras')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
          >
            <span>Ir para a calculadora de compras</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </DemoLayout>
  )
}
