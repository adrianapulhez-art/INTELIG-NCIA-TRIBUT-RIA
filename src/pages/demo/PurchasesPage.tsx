import React, { useState } from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { useTaxContext, PurchaseItem } from '@/contexts/TaxContext'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  RotateCcw,
  Boxes,
  HelpCircle,
  Eye,
  EyeOff,
  Save,
  FolderOpen,
} from 'lucide-react'
import {
  formatBRL,
  formatNumberBR,
  parseBRNumber,
  calculatePurchaseItemGrossTotal,
  calculatePurchaseItemNetPurchases,
} from '@/lib/taxCalculations'
import { roundTo2 } from '@/lib/productStockCalculations'
import { usePurchaseCollapseState } from '@/hooks/usePurchaseCollapseState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScenarioManagerBar } from '@/components/demo/ScenarioManagerBar'
import { PageHero } from '@/components/demo/PageHero'
import { SubstituicaoTributariaSection } from '@/components/demo/SubstituicaoTributariaSection'
import { OperacoesInterestaduaisSection } from '@/components/demo/OperacoesInterestaduaisSection'
import { CmvDetailedBreakdown } from '@/components/demo/CmvDetailedBreakdown'
import { ProductStockModal } from '@/components/demo/ProductStockModal'
import { PurchaseItemModal } from '@/components/demo/PurchaseItemModal'
import { SaveScenarioModal } from '@/components/demo/SaveScenarioModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ShieldAlert, Compass, ChevronRight, SlidersHorizontal, Receipt } from 'lucide-react'
import { calculateInterstateOperation } from '@/lib/specialOperationsCalculations'

export default function PurchasesPage() {
  const navigate = useNavigate()
  const {
    regime,
    setRegime,
    purchasesItems,
    addPurchaseItem,
    updatePurchaseItem,
    removePurchaseItem,
    totalPurchasesQuantity,
    totalPurchasesMerchandise,
    initialInventory,
    finalInventory,
    autoInventoryDeduction,
    additionalCosts,
    addAdditionalCost,
    updateAdditionalCost,
    removeAdditionalCost,
    deductionCosts,
    addDeductionCost,
    updateDeductionCost,
    removeDeductionCost,
    pisFreightPurchasesBase,
    setPisFreightPurchasesBase,
    cofinsFreightPurchasesBase,
    setCofinsFreightPurchasesBase,
    calculatedPurchases,
    resetAll,
    stSubsystem,
    interstateSubsystem,
    realFreightPisCofinsMethod,
  } = useTaxContext()

  // Estados dos modais em camadas para ST, DIFAL, Deduções e Composição do CMV
  const [isStDialogOpen, setIsStDialogOpen] = useState(false)
  const [isInterstateDialogOpen, setIsInterstateDialogOpen] = useState(false)
  const [isDeductionsDialogOpen, setIsDeductionsDialogOpen] = useState(false)
  const [isProductStockDialogOpen, setIsProductStockDialogOpen] = useState(false)
  const [isCmvCompositionDialogOpen, setIsCmvCompositionDialogOpen] = useState(false)

  // Estado da camada/modal de detalhe do item de compra
  const [selectedItemForModal, setSelectedItemForModal] = useState<PurchaseItem | null>(null)
  const [isPurchaseItemModalOpen, setIsPurchaseItemModalOpen] = useState(false)
  const [isSaveScenarioModalOpen, setIsSaveScenarioModalOpen] = useState<boolean>(false)
  const [saveScenarioModalTab, setSaveScenarioModalTab] = useState<'gravar' | 'historico'>(
    'historico',
  )

  // Subsistema de estoque por produto: totais para o badge dinâmico
  const { productStockState, calculatedProductStock } = useTaxContext()
  const productStockTotals = calculatedProductStock.totals
  const hasProductStockData =
    productStockTotals.productsCount > 0 ||
    productStockTotals.totalStockQty > 0 ||
    productStockTotals.totalStockValue > 0 ||
    (productStockState.products && productStockState.products.length > 0)

  // Totais e contagens de encargos e deduções para badges dinâmicos em tempo real
  const totalAdditionalCostsValue = additionalCosts.reduce((acc, c) => acc + (c.value || 0), 0)
  const activeAdditionalCostsCount = additionalCosts.filter(
    (c) => (c.value || 0) > 0 || (c.description && c.description.trim() !== ''),
  ).length
  const hasAdditionalCosts =
    totalAdditionalCostsValue > 0 || additionalCosts.some((c) => (c.value || 0) > 0)

  const totalDeductionsValue = deductionCosts.reduce((acc, d) => acc + (d.value || 0), 0)
  const activeDeductionsCount = deductionCosts.filter(
    (d) => (d.value || 0) > 0 || (d.description && d.description.trim() !== ''),
  ).length
  const hasDeductions = totalDeductionsValue > 0 || deductionCosts.some((d) => (d.value || 0) > 0)

  // Resumo em tempo real do DIFAL na compra
  const purchasesTotalBase =
    totalPurchasesMerchandise + additionalCosts.reduce((a, b) => a + (b.value || 0), 0)

  const interstatePurchasesResult = React.useMemo(() => {
    if (!interstateSubsystem.enabled) return null
    return calculateInterstateOperation({
      subsystem: interstateSubsystem,
      saleGrossValue: 0,
      purchasesGrossValue: purchasesTotalBase,
    })
  }, [interstateSubsystem, purchasesTotalBase])

  // Alíquotas automáticas de PIS/COFINS por regime
  const pisRate = regime === 'real' ? 1.65 : 0.65
  const cofinsRate = regime === 'real' ? 7.6 : 3.0

  // Gerenciamento de estado recolhido/expandido por item com persistência no localStorage
  const itemIds = React.useMemo(() => purchasesItems.map((it) => it.id), [purchasesItems])
  const { isCollapsed, toggleItem, collapseAll, expandAll, allCollapsed, allExpanded } =
    usePurchaseCollapseState('current', itemIds)

  // Seletor de visualização de CMV consolidado conforme regime
  const activeCmv =
    regime === 'simples'
      ? calculatedPurchases.cmvSimples
      : regime === 'real'
        ? calculatedPurchases.cmvReal
        : calculatedPurchases.cmvPresumido

  const activeNetPurchases =
    regime === 'simples'
      ? calculatedPurchases.cmvSimplesNetPurchases
      : regime === 'real'
        ? calculatedPurchases.cmvRealNetPurchases
        : calculatedPurchases.cmvPresumidoNetPurchases

  const isMultiProduct = purchasesItems && purchasesItems.length > 1

  const activeUnitCMV = isMultiProduct
    ? null
    : autoInventoryDeduction
      ? regime === 'simples'
        ? calculatedPurchases.unitCostSimplesEffective
        : regime === 'real'
          ? calculatedPurchases.unitCostRealEffective
          : calculatedPurchases.unitCostPresumidoEffective
      : (totalPurchasesQuantity || 0) > 0
        ? activeCmv / totalPurchasesQuantity
        : activeCmv

  const activeAutoEF =
    regime === 'simples'
      ? calculatedPurchases.autoFinalInventorySimples
      : regime === 'real'
        ? calculatedPurchases.autoFinalInventoryReal
        : calculatedPurchases.autoFinalInventoryPresumido

  return (
    <DemoLayout currentTab="compras">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Destaque Central Topo: Hero Banner estilo ADAPTA ONE */}
        <PageHero
          title="CALCULADORA DE COMPRAS & ESTOQUE"
          subtitle="Estrutura multi-itens para compras com tributos distintos, rateio de custos globais e consolidação de CMV para as DREs e Dashboard."
          badge="MULTI-ITENS · ENTRADAS & CRÉDITOS FISCAIS"
          icon={Package}
        />

        {/* Card Principal */}
        <div className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
          {/* Cabeçalho do Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-emerald-500/15">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Compras de Mercadorias para Revenda
                </h2>
                <p className="text-xs text-slate-400">
                  Cadastre N itens com alíquotas e valores específicos. O total consolidado flui
                  diretamente para as DREs.
                </p>
              </div>
            </div>

            {/* Ações Rápidas: Zerar campos e cenários por cliente */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetAll}
                className="h-8 text-xs bg-slate-950/40 border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-500/30 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Zerar campos
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSaveScenarioModalTab('historico')
                  setIsSaveScenarioModalOpen(true)
                }}
                className="h-8 text-xs bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm hover:border-emerald-400 cursor-pointer gap-1.5 transition-all"
                title="Visualizar e carregar cenários salvos por cliente do escritório"
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cenários Salvos por Cliente</span>
              </Button>
            </div>
          </div>

          {/* (A) Seletor de Regime Tributário das Compras (Laranja Aprovado) */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-mono font-semibold uppercase text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Regime tributário da empresa compradora
              </span>

              {/* Botões Presumido / Real / Simples Nacional (padrão laranja estrito ampliado) */}
              <div className="inline-flex flex-wrap rounded-xl bg-slate-950/80 p-1.5 border border-orange-500/30 gap-1.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setRegime('presumido')}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-sm sm:text-base font-semibold font-mono transition-all cursor-pointer ${
                    regime === 'presumido'
                      ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/25'
                      : 'text-orange-200/80 hover:text-orange-100 hover:bg-orange-500/10'
                  }`}
                >
                  Lucro Presumido
                </button>
                <button
                  type="button"
                  onClick={() => setRegime('real')}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-sm sm:text-base font-semibold font-mono transition-all cursor-pointer ${
                    regime === 'real'
                      ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/25'
                      : 'text-orange-200/80 hover:text-orange-100 hover:bg-orange-500/10'
                  }`}
                >
                  Lucro Real
                </button>
                <button
                  type="button"
                  onClick={() => setRegime('simples')}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-sm sm:text-base font-semibold font-mono transition-all cursor-pointer ${
                    regime === 'simples'
                      ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/25'
                      : 'text-orange-200/80 hover:text-orange-100 hover:bg-orange-500/10'
                  }`}
                >
                  Simples Nacional
                </button>
              </div>
            </div>
          </div>

          {/* (B) Bloco de ITENS DE COMPRA (Subsistema em Camadas: Tabela Compacta Frontal + Modal Completo) */}
          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Itens da Compra ({purchasesItems.length})
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    Camada de itens com visualização expandida ou recolhida compacta
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Controles de Recolher todos / Expandir todos */}
                <div className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={expandAll}
                    disabled={allExpanded}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      allExpanded
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-slate-300 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer'
                    }`}
                    title="Expandir todas as camadas de itens"
                  >
                    <ChevronDown className="w-3 h-3" />
                    <span>Expandir todos</span>
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    disabled={allCollapsed}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      allCollapsed
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-slate-300 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer'
                    }`}
                    title="Recolher todas as camadas para linhas-resumo compactas"
                  >
                    <ChevronUp className="w-3 h-3" />
                    <span>Recolher todos</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>Total unidades:</span>
                  <strong className="text-emerald-400">{totalPurchasesQuantity} un.</strong>
                  <span className="text-slate-600">|</span>
                  <span>Total mercadorias:</span>
                  <strong className="text-emerald-400">
                    {formatBRL(totalPurchasesMerchandise)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Interface Frontal Compacta: UMA linha por produto adquirido */}
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/70 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4 font-semibold w-12 text-center">#</th>
                      <th className="py-3 px-4 font-semibold">Nome do Item</th>
                      <th className="py-3 px-4 font-semibold text-right">Qtd em Estoque</th>
                      <th className="py-3 px-4 font-semibold text-right">Preço Médio / un.</th>
                      <th className="py-3 px-4 font-semibold text-right">Preço Total</th>
                      <th className="py-3 px-4 font-semibold text-right">Compras Líquidas</th>
                      <th className="py-3 px-4 font-semibold text-center w-36">Camada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {purchasesItems.map((item, idx) => {
                      // Procura produto correspondente no subsistema de estoque
                      const matchedStockProd = (productStockState.products || []).find(
                        (p) =>
                          p.name &&
                          item.name &&
                          p.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
                      )
                      const stockPos = matchedStockProd
                        ? calculatedProductStock.positions.find(
                            (pos) => pos.id === matchedStockProd.id,
                          )
                        : null

                      // Quantidade em estoque: se houver movimentações no subsistema de estoque, usa currentStockQty; senão a quantidade comprada do item
                      const stockQty =
                        stockPos !== null && stockPos !== undefined
                          ? stockPos.currentStockQty
                          : item.quantity

                      // Preço médio por produto: se o produto tiver movimentações no subsistema de estoque e currentAverageCost > 0, usa CMP;
                      // caso contrário, o custo unitário apropriado do item para o regime ativo (ou unitPrice/merchandiseValue)
                      const itemNetForUnit = calculatePurchaseItemNetPurchases(
                        { ...item, freightPisCofinsMethod: realFreightPisCofinsMethod },
                        regime,
                      )
                      const derivedUnitCost =
                        item.quantity > 0
                          ? Math.round((itemNetForUnit / item.quantity) * 100) / 100
                          : 0

                      const fallbackUnitCost =
                        derivedUnitCost > 0
                          ? derivedUnitCost
                          : item.unitPrice > 0
                            ? item.unitPrice
                            : item.quantity > 0
                              ? item.merchandiseValue / item.quantity
                              : 0

                      const avgPrice =
                        stockPos && stockPos.currentAverageCost > 0
                          ? stockPos.currentAverageCost
                          : fallbackUnitCost

                      // Preço total: valor bruto da compra daquele item
                      const itemGrossTotal = calculatePurchaseItemGrossTotal(item)

                      // Compras Líquidas conforme regime ativo
                      const itemNetPurchases = calculatePurchaseItemNetPurchases(item, regime)

                      const collapsed = isCollapsed(item.id)

                      if (collapsed) {
                        // Linha-resumo compacta quando recolhido
                        return (
                          <tr
                            key={item.id}
                            className="bg-slate-900/30 hover:bg-emerald-500/[0.04] transition-colors"
                          >
                            {/* # */}
                            <td className="py-2.5 px-4 text-center text-slate-500 font-bold text-[11px]">
                              <span className="w-5 h-5 rounded bg-slate-900/80 border border-slate-800 inline-flex items-center justify-center text-slate-400 text-[10px]">
                                {idx + 1}
                              </span>
                            </td>

                            {/* Resumo: Nome do Item + Tag Compacta */}
                            <td className="py-2.5 px-4" colSpan={2}>
                              <div className="flex items-center gap-2">
                                <span className="font-sans font-medium text-slate-300 text-xs">
                                  {item.name || `Item ${idx + 1}`}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({item.quantity} un. compradas)
                                </span>
                                <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[9px] px-1 py-0 font-normal">
                                  recolhido
                                </Badge>
                              </div>
                            </td>

                            {/* Preço Unitário */}
                            <td className="py-2.5 px-4 text-right text-slate-400 text-[11px]">
                              {formatBRL(item.unitPrice > 0 ? item.unitPrice : avgPrice)}
                            </td>

                            {/* Valor Total */}
                            <td className="py-2.5 px-4 text-right">
                              <span className="text-emerald-300 font-bold">
                                {formatBRL(itemGrossTotal)}
                              </span>
                            </td>

                            {/* Compras Líquidas */}
                            <td className="py-2.5 px-4 text-right text-slate-400 text-[11px]">
                              {formatBRL(itemNetPurchases)}
                            </td>

                            {/* Ações: Desrecolher + Detalhes */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleItem(item.id)
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded cursor-pointer transition-all"
                                  title="Expandir linha deste item"
                                >
                                  <ChevronDown className="w-3 h-3 text-slate-400" />
                                  <span>Expandir</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedItemForModal(item)
                                    setIsPurchaseItemModalOpen(true)
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-sans font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded cursor-pointer transition-all"
                                  title="Abrir camada completa de detalhes e edição fiscal"
                                >
                                  <span>Abrir</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      // Linha expandida normal
                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setSelectedItemForModal(item)
                            setIsPurchaseItemModalOpen(true)
                          }}
                          className="hover:bg-emerald-500/[0.08] transition-colors cursor-pointer group"
                        >
                          {/* # */}
                          <td className="py-3 px-4 text-center text-slate-500 font-bold text-[11px]">
                            <span className="w-6 h-6 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 group-hover:border-emerald-500/40">
                              {idx + 1}
                            </span>
                          </td>
                          {/* 1. Nome do Item */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-sans font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors text-xs sm:text-sm">
                                {item.name || `Item ${idx + 1}`}
                              </span>
                              {item.hasSt && (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] px-1.5 py-0 font-normal">
                                  ST
                                </Badge>
                              )}
                              {(item.freightValue ?? 0) > 0 && (
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[9px] px-1.5 py-0 font-normal">
                                  Frete
                                </Badge>
                              )}
                            </div>
                          </td>
                          {/* 2. Quantidade em Estoque */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-slate-200">
                              {stockQty}{' '}
                              <span className="text-slate-500 font-normal text-[11px]">un.</span>
                            </span>
                          </td>
                          {/* 3. Preço Médio por Produto */}
                          <td className="py-3 px-4 text-right">
                            <span className="text-emerald-400 font-semibold">
                              {formatBRL(avgPrice)}
                            </span>
                          </td>
                          {/* 4. Preço Total */}
                          <td className="py-3 px-4 text-right">
                            <span className="text-emerald-300 font-bold">
                              {formatBRL(itemGrossTotal)}
                            </span>
                          </td>
                          {/* 5. Compras Líquidas (Valor da Compra Líquido de Tributos Recuperáveis) */}
                          <td className="py-3 px-4 text-right">
                            <span className="text-emerald-400 font-bold">
                              {formatBRL(itemNetPurchases)}
                            </span>
                          </td>
                          {/* Botões da Camada: Recolher + Abrir */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleItem(item.id)
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-855 border border-slate-800 px-2 py-1 rounded-lg transition-all cursor-pointer"
                                title="Recolher camada deste item"
                              >
                                <ChevronUp className="w-3 h-3 text-slate-400" />
                                <span className="hidden sm:inline">Recolher</span>
                              </button>
                              <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-all group-hover:border-emerald-400 shadow-sm">
                                <span>Abrir</span>
                                <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </div>
                          </td>{' '}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Barra de Rodapé da Lista Compacta */}
              <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">
                  💡 Clique na linha do item para abrir a camada e editar tributos (IPI, ICMS,
                  Frete, ST e memória fiscal).
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newId = addPurchaseItem()
                    const stubItem: PurchaseItem = {
                      id: newId,
                      name: `Item ${purchasesItems.length + 1}`,
                      quantity: 0,
                      unitPrice: 0,
                      merchandiseValue: 0,
                      freightValue: 0,
                      icmsFreightRate: 0,
                      ipiRate: 0,
                      icmsRate: 0,
                      icmsFreightValue: 0,
                      hasSt: false,
                      stValue: 0,
                      calculatedIpi: 0,
                      calculatedIcms: 0,
                      calculatedPis: 0,
                      calculatedCofins: 0,
                      costPresumido: 0,
                      costReal: 0,
                      costSimples: 0,
                      unitCostPresumido: 0,
                      unitCostReal: 0,
                      unitCostSimples: 0,
                    }
                    setSelectedItemForModal(stubItem)
                    setIsPurchaseItemModalOpen(true)
                  }}
                  className="h-7 text-xs border-dashed border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/15 cursor-pointer font-bold shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />+ Novo item de compra
                </Button>
              </div>
            </div>

            {/* Modal / Camada Completa do Item de Compra Selecionado */}
            {selectedItemForModal && (
              <PurchaseItemModal
                open={isPurchaseItemModalOpen}
                onOpenChange={setIsPurchaseItemModalOpen}
                item={
                  purchasesItems.find((p) => p.id === selectedItemForModal.id) ||
                  selectedItemForModal
                }
                index={purchasesItems.findIndex((p) => p.id === selectedItemForModal.id)}
                regime={regime}
                onUpdate={updatePurchaseItem}
                onRemove={removePurchaseItem}
                canRemove={purchasesItems.length > 1}
              />
            )}
          </div>

          {/* (C) Encargos Globais da Compra (Frete Rateado, Acréscimos e Deduções) */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Encargos Globais da Compra</h3>
                <p className="text-xs text-slate-400">
                  Frete rateado e acréscimos/deduções aplicáveis à compra da nota fiscal.
                </p>
              </div>
            </div>

            {/* Encargos e Deduções em Camadas (Deduções da Nota, Estoque por Produto e Composição do CMV) */}
            <div className="pt-1">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-semibold uppercase text-slate-300 block">
                    Acréscimos / Deduções da Nota & Análise do CMV
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Deduções do custo de aquisição (devoluções/descontos), estoque por produto e
                    composição do CMV.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2.5 shrink-0">
                  {/* Botão 1: Deduções do Custo */}
                  <button
                    type="button"
                    onClick={() => setIsDeductionsDialogOpen(true)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                      hasDeductions
                        ? 'bg-emerald-500/[0.22] border-emerald-400/90 text-emerald-100 hover:bg-emerald-500/35 hover:border-emerald-300 shadow-emerald-500/25 ring-1 ring-emerald-500/40'
                        : 'bg-emerald-500/[0.12] border-emerald-500/70 text-emerald-200 hover:text-white hover:border-emerald-400 hover:bg-emerald-500/20 shadow-emerald-500/10'
                    }`}
                    title="Abrir camada de Deduções do Custo (Devoluções / Abatimentos / Descontos)"
                  >
                    <Receipt
                      className={`w-3.5 h-3.5 ${
                        hasDeductions ? 'text-emerald-200' : 'text-emerald-300/80'
                      }`}
                    />
                    <span className="font-semibold text-emerald-100">Deduções do Custo</span>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 border-0 font-normal ${
                        hasDeductions
                          ? 'bg-emerald-500/35 text-emerald-100 font-semibold'
                          : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {hasDeductions
                        ? `${formatBRL(totalDeductionsValue)} · ${activeDeductionsCount} ${
                            activeDeductionsCount === 1 ? 'item' : 'itens'
                          }`
                        : 'Inativo'}
                    </Badge>
                    <ChevronRight className="w-3 h-3 text-emerald-300/70 ml-0.5" />
                  </button>

                  {/* Botão 2: Subsistema de Estoque por Produto (Kardex / CMP) */}
                  <button
                    type="button"
                    onClick={() => setIsProductStockDialogOpen(true)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                      hasProductStockData
                        ? 'bg-orange-500/[0.22] border-orange-400/90 text-orange-100 hover:bg-orange-500/35 hover:border-orange-300 shadow-orange-500/25 ring-1 ring-orange-500/40'
                        : 'bg-orange-500/[0.12] border-orange-500/70 text-orange-200 hover:text-white hover:border-orange-400 hover:bg-orange-500/20 shadow-orange-500/10'
                    }`}
                    title="Abrir Subsistema de Controle de Estoque por Produto (Kardex, CMP Móvel e CMV por Produto)"
                  >
                    <Boxes
                      className={`w-3.5 h-3.5 ${
                        hasProductStockData ? 'text-orange-200' : 'text-orange-300/80'
                      }`}
                    />
                    <span className="font-semibold text-orange-100">Estoque por Produto</span>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 border-0 font-normal ${
                        hasProductStockData
                          ? 'bg-orange-500/35 text-orange-100 font-semibold'
                          : 'bg-orange-950/70 text-orange-300 border border-orange-500/30'
                      }`}
                    >
                      {hasProductStockData
                        ? `${productStockTotals.productsCount} ${
                            productStockTotals.productsCount === 1 ? 'prod.' : 'prods.'
                          } · ${productStockTotals.totalStockQty} un.`
                        : 'Disponível'}
                    </Badge>
                    <ChevronRight className="w-3 h-3 text-orange-300/70 ml-0.5" />
                  </button>

                  {/* Botão 3: Composição Detalhada do CMV */}
                  <button
                    type="button"
                    onClick={() => setIsCmvCompositionDialogOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm bg-emerald-500/[0.22] border-emerald-400/90 text-emerald-100 hover:bg-emerald-500/35 hover:border-emerald-300 shadow-emerald-500/25 ring-1 ring-emerald-500/40"
                    title="Abrir modal com a composição e memória analítica do CMV consolidado e por produto"
                  >
                    <Calculator className="w-3.5 h-3.5 text-emerald-200" />
                    <span className="font-semibold text-emerald-100">Composição do CMV</span>
                    <Badge className="text-[10px] px-1.5 py-0 border-0 font-semibold bg-emerald-500/35 text-emerald-100">
                      {formatBRL(activeCmv)}
                    </Badge>
                    <ChevronRight className="w-3 h-3 text-emerald-300/70 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Diálogo / Camada Completa: Subsistema de Estoque por Produto (Kardex / CMP Móvel) */}
            <ProductStockModal
              open={isProductStockDialogOpen}
              onOpenChange={setIsProductStockDialogOpen}
            />

            {/* Diálogo / Camada Completa: Deduções do Custo (Devoluções / Abatimentos / Descontos) */}
            <Dialog open={isDeductionsDialogOpen} onOpenChange={setIsDeductionsDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between gap-2 pr-6">
                    <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-emerald-400" />
                      Deduções do Custo (Devoluções / Abatimentos / Descontos Incondicionais)
                    </DialogTitle>
                    {hasDeductions && (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shrink-0">
                        Total: {formatBRL(totalDeductionsValue)}
                      </span>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-slate-400">
                    Cadastre os valores de devoluções de compras, abatimentos obtidos ou descontos
                    comerciais incondicionais que abatem o custo de aquisição da compra.
                  </DialogDescription>
                </DialogHeader>

                <div className="pt-3 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-mono text-slate-300">
                      Itens de dedução ({deductionCosts.length})
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addDeductionCost('Nova dedução', 0)}
                      className="h-7 text-xs bg-slate-900 border-slate-700 text-slate-200 hover:border-emerald-400 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar dedução
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {deductionCosts.length === 0 ? (
                      <div className="text-center py-8 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        Nenhuma dedução lançada. Clique em "Adicionar dedução" para registrar
                        devoluções ou abatimentos.
                      </div>
                    ) : (
                      deductionCosts.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors"
                        >
                          <Input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateDeductionCost(item.id, 'description', e.target.value)
                            }
                            placeholder="Descrição da dedução"
                            className="text-xs font-semibold h-8 flex-1 field-input-interactive"
                          />
                          <div className="relative w-36 sm:w-44">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                              R$
                            </span>
                            <Input
                              type="text"
                              defaultValue={item.value > 0 ? formatNumberBR(item.value) : ''}
                              key={`ded-modal-${item.id}-${item.value}`}
                              onBlur={(e) => {
                                const parsed = parseBRNumber(e.target.value)
                                updateDeductionCost(item.id, 'value', parsed)
                                e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                              }}
                              placeholder="0,00"
                              className="pl-7 text-right text-xs font-mono h-8 w-full field-input-interactive"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDeductionCost(item.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remover dedução"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Total deduzido do custo da compra:</span>
                    <strong className="text-emerald-300 font-bold text-sm">
                      {formatBRL(totalDeductionsValue)}
                    </strong>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* SE REGIME REAL: Ajustes de PIS/COFINS sobre frete e tese do século se desejado */}
            {regime === 'real' && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="text-xs font-mono font-semibold uppercase text-emerald-400 block">
                  Ajustes de Crédito PIS/COFINS s/ Frete Global (Lucro Real)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Base PIS s/ frete global (R$)
                    </span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="text"
                        placeholder="0,00"
                        defaultValue={
                          pisFreightPurchasesBase > 0 ? formatNumberBR(pisFreightPurchasesBase) : ''
                        }
                        key={`pisf-${pisFreightPurchasesBase}`}
                        onBlur={(e) => {
                          const parsed = parseBRNumber(e.target.value)
                          setPisFreightPurchasesBase(parsed)
                          e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                        }}
                        className="pl-8 text-right text-xs font-mono field-input-interactive"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Base COFINS s/ frete global (R$)
                    </span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="text"
                        placeholder="0,00"
                        defaultValue={
                          cofinsFreightPurchasesBase > 0
                            ? formatNumberBR(cofinsFreightPurchasesBase)
                            : ''
                        }
                        key={`coff-${cofinsFreightPurchasesBase}`}
                        onBlur={(e) => {
                          const parsed = parseBRNumber(e.target.value)
                          setCofinsFreightPurchasesBase(parsed)
                          e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                        }}
                        className="pl-8 text-right text-xs font-mono field-input-interactive"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* (D) Subsistemas Integrados em Camadas (Situações Especiais da Operação) */}
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
                      Acesse os subsistemas integrados por camadas (ICMS-ST na entrada e DIFAL
                      interestadual).
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
                        : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:border-orange-500/50 hover:bg-slate-855'
                    }`}
                    title="Abrir camada de Substituição Tributária (ICMS-ST na compra)"
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
                        ? stSubsystem.purchasesStPaid > 0
                          ? `ST: ${formatBRL(stSubsystem.purchasesStPaid)}`
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
                        : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:border-orange-500/50 hover:bg-slate-855'
                    }`}
                    title="Abrir camada de Compra Interestadual e DIFAL"
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
                        ? interstatePurchasesResult && interstatePurchasesResult.hasDifalPurchase
                          ? `${interstateSubsystem.purchasesOriginUf}→${interstateSubsystem.purchasesDestUf} · DIFAL: ${formatBRL(interstatePurchasesResult.difalPurchaseValue)}`
                          : `${interstateSubsystem.purchasesOriginUf}→${interstateSubsystem.purchasesDestUf}`
                        : 'Inativo'}
                    </Badge>
                    <ChevronRight className="w-3 h-3 opacity-70 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Diálogo / Camada Completa: ICMS-ST na Compra */}
            <Dialog open={isStDialogOpen} onOpenChange={setIsStDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-800 pb-3">
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                    Substituição Tributária (ICMS-ST) — Calculadora de Compras
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Informe o ICMS-ST recolhido na nota fiscal de entrada (empresa substituída),
                    integrando-se diretamente ao CMV e ao custo de aquisição.
                  </DialogDescription>
                </DialogHeader>

                <div className="pt-2">
                  <SubstituicaoTributariaSection
                    viewMode="compras"
                    saleOperationValue={totalPurchasesMerchandise}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Diálogo / Camada Completa: Operações Interestaduais e DIFAL na Compra */}
            <Dialog open={isInterstateDialogOpen} onOpenChange={setIsInterstateDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-800 pb-3">
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-blue-400" />
                    Operações Interestaduais e DIFAL — Calculadora de Compras
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Configure a origem do fornecedor, UF da compradora e diferencial de alíquota
                    (DIFAL) nas compras para uso/consumo ou ativo permanente.
                  </DialogDescription>
                </DialogHeader>

                <div className="pt-2">
                  <OperacoesInterestaduaisSection
                    viewMode="compras"
                    purchasesOperationValue={purchasesTotalBase}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Atalho discreto para o Subsistema de Estoque e CMV no Kardex */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsProductStockDialogOpen(true)}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1 cursor-pointer hover:underline"
            >
              Ver posição de estoque e CMV no Kardex ›
            </button>
          </div>

          {/* (E) RESULTADO & CMV CONSOLIDADO COM MEMÓRIA DE CÁLCULO */}
          <div className="pt-4 border-t border-emerald-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-400" />
                    CMV Consolidado da Compra
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 inline-flex items-center gap-1.5 font-normal shadow-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sincronizado globalmente
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Alimenta automaticamente os campos "CMV · automático" das DREs (Presumido, Real e
                  Simples) e o Dashboard.
                </p>
              </div>
            </div>

            {/* Quadro com os 3 cards comparativos de CMV por regime */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className={`p-4 rounded-xl border transition-all ${
                  regime === 'presumido'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    Lucro Presumido
                  </span>
                  {regime === 'presumido' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[9px]">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
                  {formatBRL(calculatedPurchases.cmvPresumido)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  {isMultiProduct ? (
                    <span className="text-slate-400 italic">Ver detalhamento por produto</span>
                  ) : (
                    <>
                      Unitário médio ponderado:{' '}
                      <strong className="text-slate-200">
                        {formatBRL(
                          autoInventoryDeduction
                            ? calculatedPurchases.unitCostPresumidoEffective
                            : (totalPurchasesQuantity || 0) > 0
                              ? calculatedPurchases.cmvPresumido / totalPurchasesQuantity
                              : calculatedPurchases.cmvPresumido,
                        )}
                      </strong>
                    </>
                  )}
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  regime === 'real'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400">Lucro Real</span>
                  {regime === 'real' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[9px]">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
                  {formatBRL(calculatedPurchases.cmvReal)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  {isMultiProduct ? (
                    <span className="text-slate-400 italic">Ver detalhamento por produto</span>
                  ) : (
                    <>
                      Unitário médio ponderado:{' '}
                      <strong className="text-slate-200">
                        {formatBRL(
                          autoInventoryDeduction
                            ? calculatedPurchases.unitCostRealEffective
                            : (totalPurchasesQuantity || 0) > 0
                              ? calculatedPurchases.cmvReal / totalPurchasesQuantity
                              : calculatedPurchases.cmvReal,
                        )}
                      </strong>
                    </>
                  )}
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  regime === 'simples'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    Simples Nacional
                  </span>
                  {regime === 'simples' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[9px]">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
                  {formatBRL(calculatedPurchases.cmvSimples)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  {isMultiProduct ? (
                    <span className="text-slate-400 italic">Ver detalhamento por produto</span>
                  ) : (
                    <>
                      Unitário médio ponderado:{' '}
                      <strong className="text-slate-200">
                        {formatBRL(
                          autoInventoryDeduction
                            ? calculatedPurchases.unitCostSimplesEffective
                            : (totalPurchasesQuantity || 0) > 0
                              ? calculatedPurchases.cmvSimples / totalPurchasesQuantity
                              : calculatedPurchases.cmvSimples,
                        )}
                      </strong>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal / Dialog da Composição Detalhada do CMV */}
            <Dialog open={isCmvCompositionDialogOpen} onOpenChange={setIsCmvCompositionDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between gap-2 pr-6">
                    <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-emerald-400" />
                      Composição Detalhada do CMV & Média Ponderada Móvel
                    </DialogTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-mono">
                      Consolidado: {formatBRL(activeCmv)}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-slate-400">
                    Memória analítica do Custo das Mercadorias Vendidas calculada por produto (CMP
                    individual × quantidade vendida) com rateio de fretes, deduções e créditos
                    tributários do regime.
                  </DialogDescription>
                </DialogHeader>

                <div className="pt-3 space-y-4">
                  {/* Modelo Analítico Clássico de Estoques Completo por Produto:
                      Estoque Inicial (EI) + Compras Brutas − Deduções − Créditos Fiscais por regime = Compras Líquidas (CL);
                      CL − Estoque Final (EF) = CMV Consolidado
                  */}
                  {calculatedPurchases.productCmvBreakdown &&
                    calculatedPurchases.productCmvBreakdown.length > 0 && (
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-2">
                          <span className="text-xs font-mono font-semibold uppercase text-emerald-400 flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                            Modelo Analítico Clássico de Estoques por Produto (EI + CL − EF = CMV)
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Regime ativo:{' '}
                            <strong className="text-emerald-300 uppercase">{regime}</strong> ·
                            Deduções e créditos por regime
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-mono text-xs">
                            <thead>
                              <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                                <th className="py-2 px-2.5">Produto</th>
                                <th className="py-2 px-2 text-right">EI (R$)</th>
                                <th className="py-2 px-2 text-right">Compras Brutas</th>
                                <th className="py-2 px-2 text-right text-slate-400">
                                  (−) Deduções
                                </th>
                                <th className="py-2 px-2 text-right text-slate-400">
                                  {regime === 'real'
                                    ? '(−) Créd. ICMS/PIS/COF'
                                    : regime === 'presumido'
                                      ? '(−) Créd. ICMS'
                                      : '(−) Créditos'}
                                </th>
                                <th className="py-2 px-2 text-right text-emerald-300 font-semibold">
                                  (=) Compras Líq. (CL)
                                </th>
                                <th className="py-2 px-2 text-right text-slate-400">(−) EF (R$)</th>
                                <th className="py-2 px-2 text-right">Qtd Vend.</th>
                                <th className="py-2 px-2.5 text-right font-bold text-emerald-400">
                                  (=) CMV do Produto
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {calculatedPurchases.productCmvBreakdown.map((prod) => {
                                const prodNameNorm = prod.name.trim().toLowerCase()

                                // 1. Item fiscal correspondente em purchasesItems
                                const matchedPurchaseItem = purchasesItems.find(
                                  (it) => it.name && it.name.trim().toLowerCase() === prodNameNorm,
                                )

                                // 2. Produto no subsistema de estoque
                                const matchedStockProduct = (productStockState.products || []).find(
                                  (p) =>
                                    (p.productId && p.productId === prod.productId) ||
                                    (p.name && p.name.trim().toLowerCase() === prodNameNorm),
                                )
                                const stockPosition = matchedStockProduct
                                  ? calculatedProductStock.positions.find(
                                      (pos) => pos.id === matchedStockProduct.id,
                                    )
                                  : null

                                // Estoque Inicial do produto (R$)
                                const prodEI = stockPosition
                                  ? stockPosition.initialTotalValue
                                  : matchedPurchaseItem
                                    ? 0
                                    : 0

                                // Compras Brutas do produto: mercadoria + frete + IPI rateado/do item + ST
                                const prodGrossPurchases = matchedPurchaseItem
                                  ? calculatePurchaseItemGrossTotal(matchedPurchaseItem)
                                  : 0

                                // Deduções específicas do produto (devoluções/abatimentos proporcionais se houver)
                                const totalPurchasesMerchSafe =
                                  totalPurchasesMerchandise > 0 ? totalPurchasesMerchandise : 1
                                const prodMerchShare = matchedPurchaseItem
                                  ? matchedPurchaseItem.merchandiseValue / totalPurchasesMerchSafe
                                  : 0
                                const prodDeductions = roundTo2(
                                  totalDeductionsValue * prodMerchShare,
                                )

                                // Créditos fiscais recuperáveis do produto conforme regime
                                let prodTaxCredits = 0
                                if (matchedPurchaseItem) {
                                  if (regime === 'real') {
                                    prodTaxCredits = roundTo2(
                                      (matchedPurchaseItem.calculatedIcms || 0) +
                                        (matchedPurchaseItem.icmsFreightValue || 0) +
                                        (matchedPurchaseItem.calculatedPis || 0) +
                                        (matchedPurchaseItem.calculatedCofins || 0),
                                    )
                                  } else if (regime === 'presumido') {
                                    prodTaxCredits = roundTo2(
                                      (matchedPurchaseItem.calculatedIcms || 0) +
                                        (matchedPurchaseItem.icmsFreightValue || 0),
                                    )
                                  } else {
                                    prodTaxCredits = 0 // Simples Nacional não recupera créditos
                                  }
                                }

                                // Compras Líquidas (CL) do produto
                                const prodNetPurchases = matchedPurchaseItem
                                  ? calculatePurchaseItemNetPurchases(matchedPurchaseItem, regime)
                                  : Math.max(
                                      0,
                                      roundTo2(
                                        prodGrossPurchases - prodDeductions - prodTaxCredits,
                                      ),
                                    )

                                // CMV apurado no TaxContext para o regime ativo
                                const activeProductCmv =
                                  regime === 'simples'
                                    ? prod.cmvSimples
                                    : regime === 'real'
                                      ? prod.cmvReal
                                      : prod.cmvPresumido

                                // Estoque Final (EF) = EI + CL − CMV (nunca negativo)
                                const prodEF = roundTo2(
                                  Math.max(0, prodEI + prodNetPurchases - activeProductCmv),
                                )

                                return (
                                  <tr
                                    key={prod.productId}
                                    className="hover:bg-slate-800/40 transition-colors"
                                  >
                                    <td className="py-2 px-2.5 font-sans font-medium text-slate-200">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-slate-100">
                                          {prod.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          CMP:{' '}
                                          {formatBRL(
                                            regime === 'simples'
                                              ? prod.cmpSimples
                                              : regime === 'real'
                                                ? prod.cmpReal
                                                : prod.cmpPresumido,
                                          )}
                                          /un.
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-300">
                                      {formatBRL(prodEI)}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-200">
                                      {formatBRL(prodGrossPurchases)}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-400">
                                      {prodDeductions > 0
                                        ? `-${formatBRL(prodDeductions)}`
                                        : 'R$ 0,00'}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-400">
                                      {prodTaxCredits > 0
                                        ? `-${formatBRL(prodTaxCredits)}`
                                        : 'R$ 0,00'}
                                    </td>
                                    <td className="py-2 px-2 text-right font-semibold text-emerald-300">
                                      {formatBRL(prodNetPurchases)}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-300">
                                      {formatBRL(prodEF)}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-200">
                                      {prod.soldQty}{' '}
                                      <span className="text-slate-500 text-[10px]">un.</span>
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-bold text-emerald-400">
                                      {formatBRL(activeProductCmv)}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-700 bg-slate-950/80 font-bold text-xs">
                              <tr>
                                <td className="py-2.5 px-2.5 text-slate-200">TOTAL CONSOLIDADO</td>
                                <td className="py-2.5 px-2 text-right text-slate-300">
                                  {formatBRL(initialInventory)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-slate-200">
                                  {formatBRL(calculatedPurchases.totalAdditions)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-slate-400">
                                  -{formatBRL(calculatedPurchases.totalDeductionsBase)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-slate-400">
                                  -
                                  {formatBRL(
                                    regime === 'real'
                                      ? calculatedPurchases.icmsResult +
                                          calculatedPurchases.icmsFreightResult +
                                          calculatedPurchases.pisResult +
                                          calculatedPurchases.cofinsResult +
                                          calculatedPurchases.pisFreightResult +
                                          calculatedPurchases.cofinsFreightResult
                                      : regime === 'presumido'
                                        ? calculatedPurchases.icmsResult +
                                          calculatedPurchases.icmsFreightResult
                                        : 0,
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-right text-emerald-300">
                                  {formatBRL(activeNetPurchases)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-slate-300">
                                  {formatBRL(
                                    autoInventoryDeduction ? activeAutoEF : finalInventory,
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-right text-slate-200">
                                  {calculatedPurchases.totalSoldUnitsEffective}{' '}
                                  <span className="text-slate-500 text-[10px]">un.</span>
                                </td>
                                <td className="py-2.5 px-2.5 text-right text-emerald-400 text-sm">
                                  {formatBRL(activeCmv)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                  {/* Componente CmvDetailedBreakdown */}
                  <CmvDetailedBreakdown
                    forcedRegime={regime}
                    quantitySold={calculatedPurchases.totalSoldUnitsEffective}
                    defaultExpanded={true}
                    variant="card"
                    title={`Discriminação Específica de Deduções do CMV — ${
                      regime === 'presumido'
                        ? 'Lucro Presumido'
                        : regime === 'real'
                          ? 'Lucro Real'
                          : 'Simples Nacional'
                    }`}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Barra de Gerenciamento de Cenários no fim da página (padrão Markup) */}
        <div className="pt-2">
          <ScenarioManagerBar />
        </div>

        {/* Botões de Navegação no Final da Página */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            onClick={() => navigate('/demo')}
            className="bg-[#0f172a]/90 text-slate-300 border border-slate-700/80 hover:border-emerald-500/40 hover:text-white hover:bg-slate-800/80 font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para o Início</span>
          </Button>

          <Button
            type="button"
            onClick={() => navigate('/demo/markup')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
          >
            <span>Ir para a Calculadora Markup</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Modal de Cenários por Cliente do Escritório (Compartilhado) */}
      <SaveScenarioModal
        isOpen={isSaveScenarioModalOpen}
        onClose={() => setIsSaveScenarioModalOpen(false)}
        scope="compras"
        initialTab={saveScenarioModalTab}
      />
    </DemoLayout>
  )
}
