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
  ArrowLeft,
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
import { ImportPurchasesModal } from '@/components/demo/ImportPurchasesModal'
import { MarkupCalculationMemoryModal } from '@/components/demo/MarkupCalculationMemoryModal'
import { PageHero } from '@/components/demo/PageHero'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ShieldAlert,
  Compass,
  ChevronRight,
  SlidersHorizontal,
  Boxes,
  Download,
  Layers,
} from 'lucide-react'
import {
  calculateSaleIcmsSt,
  calculateInterstateOperation,
} from '@/lib/specialOperationsCalculations'

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
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono pointer-events-none">
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
          className={`pl-8 text-right text-xs h-8 ${
            isReadOnlyCost
              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20 cursor-default focus:border-emerald-500/40'
              : 'field-input-interactive'
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
          className="pr-6 text-right text-xs h-8 field-input-interactive"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono pointer-events-none">
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
    simplesRbt12,
    effectiveSimplesRbt12,
    simplesIsInicioAtividade,
    stSubsystem,
    interstateSubsystem,
    purchasesItems,
  } = useTaxContext()

  // Estados dos modais em camadas para ST, DIFAL, Importação de Compras, Composição de Custo e Subcamadas de Detalhamento
  const [isStDialogOpen, setIsStDialogOpen] = useState(false)
  const [isInterstateDialogOpen, setIsInterstateDialogOpen] = useState(false)
  const [isImportPurchasesDialogOpen, setIsImportPurchasesDialogOpen] = useState(false)
  const [compositionModalProductId, setCompositionModalProductId] = useState<string | null>(null)
  const [isProductRevenueDetailsOpen, setIsProductRevenueDetailsOpen] = useState(false)
  const [isRegimeComparisonDetailsOpen, setIsRegimeComparisonDetailsOpen] = useState(false)
  const [calculationMemoryProductId, setCalculationMemoryProductId] = useState<string | null>(null)

  // Quantidade de itens de compras e quantos já foram importados
  const totalPurchasesAvailableCount = purchasesItems.length
  const importedPurchasesCount = useMemo(() => {
    return purchasesItems.filter((item) => {
      const itemName = (item.name || '').trim().toLowerCase()
      return markupProducts.some(
        (p) =>
          p.purchaseItemId === item.id ||
          (itemName.length > 0 && p.name.trim().toLowerCase() === itemName),
      )
    }).length
  }, [purchasesItems, markupProducts])

  // Resumos em tempo real para os chips de status
  const markupEffectiveSaleValue = totalConsolidatedRevenue || simulatedSalePrice || 0
  const stSaleResult = useMemo(() => {
    if (!stSubsystem.enabled) return null
    return calculateSaleIcmsSt({
      operationValue: markupEffectiveSaleValue,
      originInterstateRate: 12.0,
      mvaPercent: stSubsystem.mvaPercent || 0,
      destInternalRate: stSubsystem.destInternalIcmsRate || 18.0,
      includeIpi: stSubsystem.includeIpiInBase,
      ipiPercentOrVal: stSubsystem.ipiRateOrValue || 0,
      includeFreight: stSubsystem.includeFreightInBase,
      freightVal: stSubsystem.freightValue || 0,
    })
  }, [stSubsystem, markupEffectiveSaleValue])

  const interstateSaleResult = useMemo(() => {
    if (!interstateSubsystem.enabled) return null
    return calculateInterstateOperation({
      subsystem: interstateSubsystem,
      saleGrossValue: markupEffectiveSaleValue,
      purchasesGrossValue: 0,
    })
  }, [interstateSubsystem, markupEffectiveSaleValue])

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
    // Se RBT12 zerado ou não informado, aplica a alíquota nominal da 1ª faixa como fallback legal (nunca 0%)
    const anexoClean = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
    const rbt12Clean = effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0
    const hasSimplesData = rbt12Clean > 0
    const pgdasRes = calculatePgdas(anexoClean, rbt12Clean)
    const effectiveSimplesRate = pgdasRes.aliquotaEfetiva
    // fator Simples = (1 - alíquota efetiva) * customTaxesFactor
    const baseTaxFactorSimples = (1 - effectiveSimplesRate / 100) * customTaxesFactor

    // Helper para calcular produtos com um determinado fator tributário base
    const calcForTaxFactor = (taxFactor: number) => {
      let totalRev = 0
      let totalQty = 0
      const prods = markupProducts.map((p) => {
        const rawMargin = typeof p.margin === 'number' && Number.isFinite(p.margin) ? p.margin : 0
        const marginFactor = 1 - rawMargin / 100
        let completeFactor = (Number.isFinite(taxFactor) ? taxFactor : 0) * marginFactor
        if (taxFactor < 1 && completeFactor >= 1) {
          completeFactor = taxFactor
        }
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
      return { prods, totalRev: Math.round(totalRev * 100) / 100, totalQty }
    }

    const calcPresumido = calcForTaxFactor(baseTaxFactorPresumido)
    const calcReal = calcForTaxFactor(baseTaxFactorReal)
    const calcSimples = calcForTaxFactor(baseTaxFactorSimples)

    return {
      hasSimplesData,
      effectiveSimplesRate,
      isFallbackRbt12: !hasSimplesData,
      totalRevPresumido: calcPresumido.totalRev,
      totalRevReal: calcReal.totalRev,
      totalRevSimples: calcSimples.totalRev,
      prodsPresumido: calcPresumido.prods,
      prodsReal: calcReal.prods,
      prodsSimples: calcSimples.prods,
    }
  }, [
    isMarkupSimulated,
    markupProducts,
    customTaxesMarkup,
    icmsRateMarkup,
    simplesRbt12,
    effectiveSimplesRbt12,
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
        <div
          key={`markup-container-${regime}`}
          className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-6"
        >
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
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300">
                Regime tributário da empresa (alíquotas automáticas)
              </label>
              <Badge
                variant="outline"
                className="text-[11px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 inline-flex items-center gap-1.5 font-normal shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sincronizado globalmente
              </Badge>
            </div>

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

          {/* Seção % Tributos: ICMS, PIS, COFINS e adicionais */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
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
                    className="text-xs font-mono field-input-interactive"
                  />
                  <Input
                    type="text"
                    placeholder="Alíquota %"
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                    className="text-xs font-mono field-input-interactive"
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
                    className="pr-7 text-right font-mono text-xs field-input-interactive"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
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

          {/* Modo de cálculo predominante (escolha do modo de cálculo) */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
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
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Produtos / Serviços Cadastrados
                </h3>
                {/* Chip Compacto em Camada: Puxar itens da Compra (CMV) */}
                <button
                  type="button"
                  onClick={() => setIsImportPurchasesDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer bg-emerald-500/[0.16] border-emerald-400/80 text-emerald-100 hover:bg-emerald-500/25 hover:border-emerald-300 shadow-sm shadow-emerald-500/15 ring-1 ring-emerald-500/30 ml-1"
                  title="Abrir camada para puxar itens da Calculadora de Compras (CMV)"
                >
                  <Boxes className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="font-semibold text-emerald-100">Puxar itens da Compra</span>
                  <Badge className="text-[9px] px-1.5 py-0 border-0 font-normal bg-emerald-500/35 text-emerald-100">
                    {importedPurchasesCount > 0
                      ? `${importedPurchasesCount}/${totalPurchasesAvailableCount}`
                      : `${totalPurchasesAvailableCount} disp.`}
                  </Badge>
                  <ChevronRight className="w-3 h-3 text-emerald-300/70 ml-0.5" />
                </button>
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
                          className="font-semibold text-xs h-8 flex-1 field-input-interactive"
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
                          className="text-right text-xs h-8 field-input-interactive"
                        />
                      </div>

                      {/* Campo 4: Preço Resultante e Total (atualizado após Simular) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-emerald-400 font-semibold">
                            Preço de venda simulado
                          </label>
                          {/* Chip discreto de Memória de Cálculo junto ao resultado */}
                          <button
                            type="button"
                            onClick={() => setCalculationMemoryProductId(prod.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400/90 hover:text-emerald-200 transition-colors cursor-pointer group"
                            title="Abrir memória de cálculo analítica deste produto"
                          >
                            <Calculator className="w-2.5 h-2.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span>Memória ›</span>
                          </button>
                        </div>
                        <div className="h-8 px-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-400">
                          <span className="text-[10px] text-emerald-400/70 font-mono">Un.:</span>
                          <div className="flex items-center gap-1.5">
                            <span>{isMarkupSimulated ? formatBRL(prod.salePrice) : '—'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub-resultado do produto quando simulado */}
                    {isMarkupSimulated && prod.quantity > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[11px] font-mono text-slate-400">
                        <span>
                          Subtotal do produto ({prod.quantity} un. × {formatBRL(prod.salePrice)}):
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-300">
                            {formatBRL(prod.totalRevenue)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Chip Discreto em Subcamada: Memória de Cálculo do Preço */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCalculationMemoryProductId(prod.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer bg-emerald-500/[0.12] border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-300 shadow-sm"
                        title="Ver memória de cálculo detalhada do preço sugerido (Simples, Presumido e Real)"
                      >
                        <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold">Memória de Cálculo</span>
                        <Badge className="bg-emerald-500/25 text-emerald-200 border-0 text-[9px] px-1.5 py-0 font-normal">
                          {isMarkupSimulated ? formatBRL(prod.salePrice) : 'Ver fórmula'}
                        </Badge>
                        <ChevronRight className="w-3 h-3 text-emerald-400/80 ml-0.5" />
                      </button>

                      <span className="text-[10px] font-mono text-slate-400">
                        Regime ativo:{' '}
                        <strong className="text-orange-400 uppercase">{regime}</strong> · ICMS{' '}
                        {formatPercentBR(icmsRateMarkup)}
                        {regime === 'simples' && simplesRbt12 > 0 ? ' (integrado ao DAS)' : ''}
                      </span>
                    </div>

                    {/* Chip Compacto em Subcamada: Composição do Custo (modo Custo + Margem) */}
                    {!isProdLiquid &&
                      (() => {
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
                        const itemsCount =
                          (comp?.directCosts || []).length +
                          (comp?.indirectCosts || []).length +
                          (comp?.fixedCosts || []).length

                        return (
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setCompositionModalProductId(prod.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
                                totalComp > 0
                                  ? 'bg-emerald-500/[0.18] border-emerald-400/80 text-emerald-100 hover:bg-emerald-500/25 hover:border-emerald-300 shadow-sm shadow-emerald-500/15 ring-1 ring-emerald-500/30'
                                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-emerald-500/50'
                              }`}
                              title="Abrir camada de Composição do Custo deste produto"
                            >
                              <Layers className="w-3.5 h-3.5 text-emerald-300" />
                              <span className="font-semibold">Composição do Custo</span>
                              <Badge
                                className={`text-[9px] px-1.5 py-0 border-0 font-normal ${
                                  totalComp > 0
                                    ? 'bg-emerald-500/35 text-emerald-100 font-semibold'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {totalComp > 0 ? formatBRL(totalComp) : `${itemsCount} itens`}
                              </Badge>
                              <ChevronRight className="w-3 h-3 text-emerald-300/70 ml-0.5" />
                            </button>

                            {totalComp > 0 && (
                              <span className="text-[10px] font-mono text-slate-400">
                                Diretos {formatBRL(directSum)} · Indiretos {formatBRL(indirectSum)}{' '}
                                · Fixos {formatBRL(fixedSum)}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                  </div>
                )
              })}{' '}
            </div>

            {/* Botão para adicionar mais produtos e chip secundário para importar compras */}
            <div className="flex flex-wrap items-center gap-2 justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addMarkupProduct('', markupMode)}
                className="h-8 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar outro produto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsImportPurchasesDialogOpen(true)}
                className="h-8 text-xs bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 cursor-pointer font-medium"
              >
                <Boxes className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Puxar itens da Compra ({totalPurchasesAvailableCount})
              </Button>
            </div>
          </div>

          {/* Subsistemas Integrados em Camadas (Situações Especiais da Operação) */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
            <div className="relative overflow-hidden rounded-xl border-2 border-orange-500/70 bg-gradient-to-r from-orange-500/[0.14] via-amber-500/[0.08] to-orange-500/[0.04] p-3 sm:p-4 shadow-lg shadow-orange-500/10 transition-all hover:border-orange-500 hover:shadow-orange-500/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 shadow-sm shrink-0">
                    <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono uppercase tracking-wider text-orange-300 font-bold">
                        Situações Especiais da Operação
                      </span>
                      {(stSubsystem.enabled || interstateSubsystem.enabled) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                          <Sparkles className="w-2.5 h-2.5" />
                          Subsistemas Ativos
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Acesse os subsistemas integrados por camadas (ICMS-ST e DIFAL interestadual).
                    </p>
                  </div>
                </div>

                {/* Chips compactos com destaque refinado */}
                <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
                  {/* Chip ICMS-ST */}
                  <button
                    type="button"
                    onClick={() => setIsStDialogOpen(true)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                      stSubsystem.enabled
                        ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 hover:bg-amber-500/30 hover:border-amber-400 shadow-sm shadow-amber-500/20'
                        : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:border-orange-500/50 hover:bg-slate-850'
                    }`}
                    title="Abrir camada de Substituição Tributária (ICMS-ST)"
                  >
                    <ShieldAlert
                      className={`w-3.5 h-3.5 ${
                        stSubsystem.enabled ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-semibold">ICMS-ST</span>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 border-0 font-normal ${
                        stSubsystem.enabled
                          ? 'bg-amber-500/30 text-amber-200'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {stSubsystem.enabled
                        ? stSaleResult && stSaleResult.icmsStAReter > 0
                          ? `ST: ${formatBRL(stSaleResult.icmsStAReter)}`
                          : 'Ativo'
                        : 'Inativo'}
                    </Badge>
                    <ChevronRight className="w-3 h-3 opacity-70 ml-0.5" />
                  </button>

                  {/* Chip DIFAL / Interestadual */}
                  <button
                    type="button"
                    onClick={() => setIsInterstateDialogOpen(true)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                      interstateSubsystem.enabled
                        ? 'bg-blue-500/20 border-blue-400/70 text-blue-200 hover:bg-blue-500/30 hover:border-blue-400 shadow-sm shadow-blue-500/20'
                        : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:border-orange-500/50 hover:bg-slate-850'
                    }`}
                    title="Abrir camada de Operações Interestaduais e DIFAL"
                  >
                    <Compass
                      className={`w-3.5 h-3.5 ${
                        interstateSubsystem.enabled ? 'text-blue-300' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-semibold">DIFAL / Interestadual</span>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 border-0 font-normal ${
                        interstateSubsystem.enabled
                          ? 'bg-blue-500/30 text-blue-200'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {interstateSubsystem.enabled
                        ? interstateSaleResult && interstateSaleResult.hasDifalSale
                          ? `${interstateSubsystem.originUf}→${interstateSubsystem.destinationUf} · ${formatBRL(interstateSaleResult.difalDestino)}`
                          : `${interstateSubsystem.originUf}→${interstateSubsystem.destinationUf}`
                        : 'Inativo'}
                    </Badge>
                    <ChevronRight className="w-3 h-3 opacity-70 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Diálogo / Camada Completa: ICMS-ST */}
            <Dialog open={isStDialogOpen} onOpenChange={setIsStDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-800 pb-3">
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                    Substituição Tributária (ICMS-ST) — Calculadora de Markup
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Configure os parâmetros fiscais de ICMS-ST para retenção na saída (empresa
                    substituta) ou segregação no Simples Nacional.
                  </DialogDescription>
                </DialogHeader>

                <div className="pt-2">
                  <SubstituicaoTributariaSection
                    viewMode="markup"
                    saleOperationValue={totalConsolidatedRevenue || simulatedSalePrice}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Diálogo / Camada Completa: Operações Interestaduais e DIFAL */}
            <Dialog open={isInterstateDialogOpen} onOpenChange={setIsInterstateDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-800 pb-3">
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-blue-400" />
                    Operações Interestaduais e DIFAL — Calculadora de Markup
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Defina rota interestadual (UF origem e destino), alíquotas interestaduais
                    automáticas (4%, 7%, 12%) e partilha de DIFAL na venda.
                  </DialogDescription>
                </DialogHeader>

                <div className="pt-2">
                  <OperacoesInterestaduaisSection
                    viewMode="markup"
                    saleOperationValue={totalConsolidatedRevenue || simulatedSalePrice}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Diálogo / Camada Completa: Importar Itens da Calculadora de Compras */}
            <ImportPurchasesModal
              open={isImportPurchasesDialogOpen}
              onOpenChange={setIsImportPurchasesDialogOpen}
            />

            {/* Diálogo / Subcamada: Memória de Cálculo Analítica do Preço Sugerido */}
            <MarkupCalculationMemoryModal
              open={!!calculationMemoryProductId}
              onOpenChange={(open) => {
                if (!open) setCalculationMemoryProductId(null)
              }}
              product={markupProducts.find((p) => p.id === calculationMemoryProductId) || null}
              currentRegime={regime}
              icmsRateMarkup={icmsRateMarkup}
              customTaxesMarkup={customTaxesMarkup}
              simplesAnexo={simplesAnexo}
              simplesRbt12={simplesRbt12}
              simplesIsInicioAtividade={simplesIsInicioAtividade}
            />

            {/* Diálogo / Subcamada: Composição do Custo do Produto */}
            <Dialog
              open={!!compositionModalProductId}
              onOpenChange={(open) => {
                if (!open) setCompositionModalProductId(null)
              }}
            >
              <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
                {compositionModalProductId &&
                  (() => {
                    const targetProd = markupProducts.find(
                      (p) => p.id === compositionModalProductId,
                    )
                    if (!targetProd) return null
                    return (
                      <div className="space-y-4">
                        <DialogHeader>
                          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-emerald-400" />
                            <span>
                              Composição Detalhada do Custo: {targetProd.name || 'Produto'}
                            </span>
                          </DialogTitle>
                          <DialogDescription className="text-xs text-slate-400">
                            Discrimine os custos diretos, custos indiretos (rateio) e despesas fixas
                            deste item. O total apurado pode ser aplicado diretamente como base de
                            custo unitário.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="pt-2">
                          <CostCompositionSection
                            productId={targetProd.id}
                            productName={targetProd.name}
                            composition={targetProd.costComposition}
                            onApplyTotal={(tot) => {
                              updateMarkupProduct(targetProd.id, 'cost', tot)
                              setCompositionModalProductId(null)
                            }}
                          />
                        </div>
                      </div>
                    )
                  })()}
              </DialogContent>
            </Dialog>
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
                <span className="text-[11px] text-slate-400 block mb-1">Produtos simulados</span>
                <span className="text-lg font-bold text-slate-200">
                  {markupProducts.length} {markupProducts.length === 1 ? 'item' : 'itens'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Cálculo individual por item
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-400 block mb-1 font-semibold">
                  Receita bruta consolidada
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  {formatBRL(totalConsolidatedRevenue)}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-1">
                  Alimenta as DREs (Σ produtos)
                </span>
              </div>
            </div>

            {/* Discriminação por Produto (sem média entre mercadorias distintas) */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-amber-500 rounded-full" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-200 font-semibold">
                    Preço de venda e receita por produto ({regime.toUpperCase()})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                    Sem média entre produtos distintos
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsProductRevenueDetailsOpen(true)}
                    className="h-7 text-xs bg-amber-500/10 border-amber-500/40 text-amber-200 hover:bg-amber-500/20 hover:border-amber-500 hover:text-white font-mono flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Detalhar por produto</span>
                    <Badge className="bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[10px] px-1.5 py-0 font-mono">
                      {markupProducts.length}
                    </Badge>
                  </Button>
                </div>
              </div>

              {/* Tabela Frontal: MANTÉM a linha consolidada destacada em âmbar intacta */}
              <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/70">
                <table className="w-full text-xs font-mono">
                  <tbody>
                    {/* Linha consolidada Grupo 1 (Regime Ativo): Destaque Laranja/Âmbar com marcação reforçada */}
                    <tr className="bg-amber-500/15 font-bold border-t-2 border-b-2 border-amber-500/60 shadow-[inset_0_0_12px_rgba(245,158,11,0.08)]">
                      <td
                        colSpan={4}
                        className="py-3 px-3 text-left text-amber-200 font-extrabold uppercase tracking-wide border-l-2 border-amber-500"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span>Total Consolidado (Soma das receitas)</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-amber-100 font-bold text-sm">
                        {totalConsolidatedQuantity} un.
                      </td>
                      <td className="py-3 px-3 text-right text-amber-300 font-black text-base drop-shadow-[0_0_6px_rgba(251,191,36,0.35)] border-r-2 border-amber-500/60">
                        {formatBRL(totalConsolidatedRevenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subcamada Modal: Detalhamento por Produto (Preço de Venda e Receita Bruta) */}
            <Dialog
              open={isProductRevenueDetailsOpen}
              onOpenChange={setIsProductRevenueDetailsOpen}
            >
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-800 pb-3">
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>
                      Detalhamento por Produto — Preço de Venda e Receita ({regime.toUpperCase()})
                    </span>
                    <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/40 text-[10px] font-mono">
                      {markupProducts.length} itens
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 font-mono">
                    Discriminação linha a linha sem média ponderada artificial entre produtos
                    distintos.
                  </DialogDescription>
                </DialogHeader>

                <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/60 my-2">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-right">
                        <th className="py-2.5 px-3 text-left font-semibold text-slate-300">
                          Produto
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-slate-300">Modo</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-300">Fator Comp.</th>
                        <th className="py-2.5 px-3 font-semibold text-emerald-400">
                          Preço de Venda
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-slate-300">Qtd.</th>
                        <th className="py-2.5 px-3 font-semibold text-emerald-300">
                          Receita Bruta
                        </th>
                        <th className="py-2.5 px-3 text-center font-semibold text-slate-300">
                          Memória
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {markupProducts.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-left font-medium text-slate-200">
                            <span className="text-slate-500 font-bold mr-1.5">#{idx + 1}</span>
                            {p.name || `Produto ${idx + 1}`}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {p.mode === 'liquid' ? 'Líquida' : 'Custo+Margem'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {formatFactorBR(p.completeFactor, 4)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {formatBRL(p.salePrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-200">
                            {p.quantity} un.
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                            {formatBRL(p.totalRevenue)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setCalculationMemoryProductId(p.id)
                                setIsProductRevenueDetailsOpen(false)
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                              title="Ver memória de cálculo detalhada"
                            >
                              <Calculator className="w-2.5 h-2.5" />
                              <span>Ver ›</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-amber-500/60 bg-amber-500/15 font-bold">
                      <tr>
                        <td
                          colSpan={4}
                          className="py-3 px-3 text-left text-amber-200 font-extrabold uppercase tracking-wide border-l-2 border-amber-500"
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span>Total Consolidado (Soma das receitas)</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-amber-100 font-bold text-sm">
                          {totalConsolidatedQuantity} un.
                        </td>
                        <td className="py-3 px-3 text-right text-amber-300 font-black text-base drop-shadow-[0_0_6px_rgba(251,191,36,0.35)] border-r-2 border-amber-500/60">
                          {formatBRL(totalConsolidatedRevenue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsProductRevenueDetailsOpen(false)}
                    className="text-xs font-mono bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                  >
                    Fechar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bloco Comparativo Discreto: Preço de Venda Simulado por Regime */}
            {regimeComparison && (
              <div className="pt-4 mt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-emerald-400 rounded-full" />
                    <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                      Preço de venda simulado por regime
                    </h3>
                    <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/50 text-[10px] font-mono">
                      Comparativo simulado
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                      Totais consolidados por regime
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRegimeComparisonDetailsOpen(true)}
                      className="h-7 text-xs bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-white font-mono flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ver comparativo por produto</span>
                      <Badge className="bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[10px] px-1.5 py-0 font-mono">
                        {regimeComparison.prodsPresumido.length}
                      </Badge>
                    </Button>
                  </div>
                </div>

                {/* Tabela Frontal: MANTÉM a linha RECEITA CONSOLIDADA (Σ) verde-esmeralda com estilo atual intacto */}
                <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/70">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-right">
                        <th className="py-2.5 px-3 text-left font-semibold text-slate-300">
                          Operação
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-slate-300">Qtd.</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-200">
                          Lucro Presumido
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-slate-200">Lucro Real</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-200">
                          Simples Nacional
                        </th>
                        <th className="py-2.5 px-3 text-center font-semibold text-emerald-400">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Linha consolidada total Grupo 2 (Comparativo): Destaque Verde-Esmeralda com marcação reforçada */}
                      <tr className="bg-emerald-500/15 font-bold border-t-2 border-b-2 border-emerald-500/60 shadow-[inset_0_0_12px_rgba(16,185,129,0.08)]">
                        <td className="py-3 px-3 text-left text-emerald-200 font-extrabold uppercase tracking-wide border-l-2 border-emerald-400">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Receita Consolidada (Σ)</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-100 font-bold text-sm">
                          {totalConsolidatedQuantity} un.
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-300 font-black text-sm drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]">
                          {formatBRL(regimeComparison.totalRevPresumido)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-300 font-black text-sm drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]">
                          {formatBRL(regimeComparison.totalRevReal)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-300 font-black text-sm drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]">
                          {regimeComparison.totalRevSimples !== null
                            ? formatBRL(regimeComparison.totalRevSimples)
                            : '—'}
                        </td>
                        <td className="py-3 px-3 text-center text-emerald-300 font-semibold text-[11px] border-r-2 border-emerald-500/60">
                          Soma por regime
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {!regimeComparison.hasSimplesData && (
                  <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[11px] font-mono">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      {simplesIsInicioAtividade
                        ? 'Empresa em início de atividade: receitas mensais não preenchidas. O Simples Nacional está usando a alíquota da 1ª faixa como fallback (4,00%).'
                        : 'RBT12 não informada na DRE Simples Nacional: o cálculo do Simples Nacional está utilizando a alíquota da 1ª faixa como fallback (4,00%).'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Subcamada Modal: Comparativo de Preço por Produto nos 3 Regimes */}
            {regimeComparison && (
              <Dialog
                open={isRegimeComparisonDetailsOpen}
                onOpenChange={setIsRegimeComparisonDetailsOpen}
              >
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl">
                  <DialogHeader className="border-b border-slate-800 pb-3">
                    <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <span>Comparativo de Preço de Venda Simulado por Regime — Linha a Linha</span>
                      <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/50 text-[10px] font-mono">
                        {regimeComparison.prodsPresumido.length} itens
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-400 font-mono">
                      Comparação detalhada do preço unitário e faturamento total por produto em cada
                      regime tributário.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/60 my-2">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-right">
                          <th className="py-2.5 px-3 text-left font-semibold text-slate-300">
                            Produto
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-slate-300">Qtd.</th>
                          <th className="py-2.5 px-3 font-semibold text-slate-200">
                            Lucro Presumido
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-slate-200">Lucro Real</th>
                          <th className="py-2.5 px-3 font-semibold text-slate-200">
                            Simples Nacional
                          </th>
                          <th className="py-2.5 px-3 text-center font-semibold text-emerald-400">
                            Menor Preço
                          </th>
                          <th className="py-2.5 px-3 text-center font-semibold text-slate-300">
                            Memória
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {regimeComparison.prodsPresumido.map((pPres, idx) => {
                          const pReal = regimeComparison.prodsReal.find((x) => x.id === pPres.id)
                          const pSimp = regimeComparison.prodsSimples?.find(
                            (x) => x.id === pPres.id,
                          )
                          const origProd = markupProducts.find((x) => x.id === pPres.id)
                          const qty = origProd?.quantity || 0

                          // Menor preço unitário individual deste produto
                          const cand: { regime: string; price: number }[] = [
                            { regime: 'Presumido', price: pPres.salePrice },
                            { regime: 'Real', price: pReal?.salePrice || 0 },
                          ]
                          if (pSimp && pSimp.salePrice > 0) {
                            cand.push({ regime: 'Simples', price: pSimp.salePrice })
                          }
                          const validCand = cand
                            .filter((c) => c.price > 0)
                            .sort((a, b) => a.price - b.price)
                          const best = validCand[0]

                          return (
                            <tr key={pPres.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 text-left font-medium text-slate-200">
                                <span className="text-slate-500 font-bold mr-1.5">#{idx + 1}</span>
                                {pPres.name || `Produto ${idx + 1}`}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-400">{qty} un.</td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-bold text-slate-100">
                                  {formatBRL(pPres.salePrice)}
                                </span>
                                {qty > 0 && (
                                  <span className="text-[10px] text-slate-500 block">
                                    Tot: {formatBRL(pPres.totalRevenue)}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-bold text-slate-100">
                                  {pReal ? formatBRL(pReal.salePrice) : '—'}
                                </span>
                                {qty > 0 && pReal && (
                                  <span className="text-[10px] text-slate-500 block">
                                    Tot: {formatBRL(pReal.totalRevenue)}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {pSimp ? (
                                  <>
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="font-bold text-slate-100">
                                        {formatBRL(pSimp.salePrice)}
                                      </span>
                                      {regimeComparison.isFallbackRbt12 && (
                                        <Badge className="bg-amber-500/20 text-amber-300 border-0 text-[8px] px-1 py-0 font-normal">
                                          1ª faixa
                                        </Badge>
                                      )}
                                    </div>
                                    {qty > 0 && (
                                      <span className="text-[10px] text-slate-500 block">
                                        Tot: {formatBRL(pSimp.totalRevenue)}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {best ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {best.regime} ({formatBRL(best.price)})
                                  </span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCalculationMemoryProductId(pPres.id)
                                    setIsRegimeComparisonDetailsOpen(false)
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                                  title="Ver memória de cálculo deste produto nos 3 regimes"
                                >
                                  <Calculator className="w-2.5 h-2.5" />
                                  <span>Memória ›</span>
                                </button>
                              </td>
                            </tr>
                          )
                        })}{' '}
                      </tbody>
                      <tfoot className="border-t-2 border-emerald-500/60 bg-emerald-500/15 font-bold">
                        <tr>
                          <td className="py-3 px-3 text-left text-emerald-200 font-extrabold uppercase tracking-wide border-l-2 border-emerald-400">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Receita Consolidada (Σ)</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-100 font-bold text-sm">
                            {totalConsolidatedQuantity} un.
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-300 font-black text-sm drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]">
                            {formatBRL(regimeComparison.totalRevPresumido)}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-300 font-black text-sm drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]">
                            {formatBRL(regimeComparison.totalRevReal)}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-300 font-black text-sm drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]">
                            {regimeComparison.totalRevSimples !== null
                              ? formatBRL(regimeComparison.totalRevSimples)
                              : '—'}
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-300 font-semibold text-[11px] border-r-2 border-emerald-500/60">
                            Soma por regime
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRegimeComparisonDetailsOpen(false)}
                      className="text-xs font-mono bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                    >
                      Fechar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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

        {/* Rodapé da Calculadora Markup: Botões de navegação sequencial (Voltar para Compras / Avançar para DREs) */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            onClick={() => navigate('/demo/compras')}
            className="bg-[#0f172a]/90 text-slate-300 border border-slate-700/80 hover:border-emerald-500/40 hover:text-white hover:bg-slate-800/80 font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Calculadora de Compras</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              if (regime === 'simples') {
                navigate('/demo/simples')
              } else if (regime === 'real') {
                navigate('/demo/dre-real')
              } else {
                navigate('/demo/dre-presumido')
              }
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
          >
            <span>Ir para a DRE</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </DemoLayout>
  )
}
