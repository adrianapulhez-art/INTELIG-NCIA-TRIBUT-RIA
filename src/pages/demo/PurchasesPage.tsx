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

  // Estados dos modais em camadas para ST, DIFAL e Deduções
  const [isStDialogOpen, setIsStDialogOpen] = useState(false)
  const [isInterstateDialogOpen, setIsInterstateDialogOpen] = useState(false)
  const [isDeductionsDialogOpen, setIsDeductionsDialogOpen] = useState(false)
  const [isProductStockDialogOpen, setIsProductStockDialogOpen] = useState(false)

  // Gavetas recolhidas por padrão (Bloco C: Encargos Globais; Bloco D: Situações Especiais)
  const [isEncargosOpen, setIsEncargosOpen] = useState(false)
  const [isSituacoesEspeciaisOpen, setIsSituacoesEspeciaisOpen] = useState(false)

  // Estado da camada/modal de detalhe do item de compra
  const [selectedItemForModal, setSelectedItemForModal] = useState<PurchaseItem | null>(null)
  const [isPurchaseItemModalOpen, setIsPurchaseItemModalOpen] = useState(false)
  const [isSaveScenarioModalOpen, setIsSaveScenarioModalOpen] = useState<boolean>(false)

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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
          {/* Cabeçalho do Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#f9e596]/40 to-[#e5b742]/30 border border-amber-300 flex items-center justify-center text-[#3b2405] shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#261502] tracking-tight">
                  Compras de Mercadorias para Revenda
                </h2>
                <p className="text-xs text-[#5c3e06]">
                  Cadastre os itens da compra com alíquotas e valores específicos. O total
                  consolidado flui diretamente para as DREs.
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
                className="h-8 text-xs bg-white border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Zerar campos
              </Button>
            </div>
          </div>

          {/* (A) Seletor de Regime Tributário das Compras — Hierarquia evidente */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                  Regime Ativo
                </span>
                <span className="text-lg font-bold text-slate-900 capitalize">
                  {regime === 'presumido'
                    ? 'Lucro Presumido'
                    : regime === 'real'
                      ? 'Lucro Real'
                      : 'Simples Nacional'}
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Alternar recalcula créditos recuperáveis e CMV instantaneamente
                </p>
              </div>

              {/* Botões Presumido / Real / Simples Nacional com hierarquia nítida */}
              <div className="inline-flex flex-wrap rounded-xl bg-white p-1 border border-slate-200 gap-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setRegime('presumido')}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer ${
                    regime === 'presumido'
                      ? 'bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-black shadow-xs border border-amber-300'
                      : 'text-slate-600 font-medium hover:text-[#261502] hover:bg-amber-50/50'
                  }`}
                >
                  Lucro Presumido
                </button>
                <button
                  type="button"
                  onClick={() => setRegime('real')}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer ${
                    regime === 'real'
                      ? 'bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-black shadow-xs border border-amber-300'
                      : 'text-slate-600 font-medium hover:text-[#261502] hover:bg-amber-50/50'
                  }`}
                >
                  Lucro Real
                </button>
                <button
                  type="button"
                  onClick={() => setRegime('simples')}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer ${
                    regime === 'simples'
                      ? 'bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-black shadow-xs border border-amber-300'
                      : 'text-slate-600 font-medium hover:text-[#261502] hover:bg-amber-50/50'
                  }`}
                >
                  Simples Nacional
                </button>
              </div>
            </div>
          </div>

          {/* (B) Bloco de ITENS DE COMPRA (Tabela Clara + Modal Completo) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-300 flex items-center justify-center text-[#3b2405]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#261502]">
                    Itens da Compra ({purchasesItems.length})
                  </h3>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Clique em qualquer linha para editar impostos, frete e créditos
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Controles de Recolher todos / Expandir todos */}
                <div className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={expandAll}
                    disabled={allExpanded}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      allExpanded
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white cursor-pointer'
                    }`}
                    title="Expandir todas as camadas de itens"
                  >
                    <ChevronDown className="w-3 h-3" />
                    <span>Expandir todos</span>
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    disabled={allCollapsed}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      allCollapsed
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white cursor-pointer'
                    }`}
                    title="Recolher todas as camadas para linhas-resumo compactas"
                  >
                    <ChevronUp className="w-3 h-3" />
                    <span>Recolher todos</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Total unidades:</span>
                  <strong className="text-slate-900 font-mono">{totalPurchasesQuantity} un.</strong>
                  <span className="text-slate-300">|</span>
                  <span>Total mercadorias:</span>
                  <strong className="text-slate-900 font-mono">
                    {formatBRL(totalPurchasesMerchandise)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Interface Frontal Compacta: UMA linha por produto adquirido */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-amber-900/50 bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] text-xs font-semibold text-[#fff5cc]">
                      <th className="py-3 px-4 w-12 text-center rounded-tl-xl">#</th>
                      <th className="py-3 px-4">Nome do Item</th>
                      <th className="py-3 px-4 text-right">Qtd Comprada</th>
                      <th className="py-3 px-4 text-right">Preço Compra / un.</th>
                      <th className="py-3 px-4 text-right">Preço Total</th>
                      <th className="py-3 px-4 text-right">Compras Líquidas</th>
                      <th className="py-3 px-4 text-center w-36 rounded-tr-xl">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {purchasesItems.map((item, idx) => {
                      const itemNetForUnit = calculatePurchaseItemNetPurchases(
                        { ...item, freightPisCofinsMethod: realFreightPisCofinsMethod },
                        regime,
                      )
                      const derivedUnitCost =
                        item.quantity > 0
                          ? Math.round((itemNetForUnit / item.quantity) * 100) / 100
                          : 0

                      const precoCompra =
                        derivedUnitCost > 0
                          ? derivedUnitCost
                          : item.unitPrice > 0
                            ? item.unitPrice
                            : item.quantity > 0
                              ? item.merchandiseValue / item.quantity
                              : 0

                      const itemGrossTotal = calculatePurchaseItemGrossTotal(item)
                      const itemNetPurchases = calculatePurchaseItemNetPurchases(item, regime)
                      const collapsed = isCollapsed(item.id)

                      if (collapsed) {
                        return (
                          <tr
                            key={item.id}
                            className="bg-slate-50/50 hover:bg-slate-100/60 transition-colors"
                          >
                            <td className="py-2.5 px-4 text-center text-white font-bold text-xs">
                              <span className="w-5 h-5 rounded bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] border border-amber-500/40 inline-flex items-center justify-center text-amber-200 font-semibold text-[10px] shadow-sm">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 px-4" colSpan={2}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">
                                  {item.name || `Item ${idx + 1}`}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  ({item.quantity} un.)
                                </span>
                                <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] px-1.5 py-0 font-normal">
                                  recolhido
                                </Badge>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-600 font-mono">
                              {formatBRL(item.unitPrice > 0 ? item.unitPrice : precoCompra)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                              {formatBRL(itemGrossTotal)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-[#3b2405] font-semibold">
                              {formatBRL(itemNetPurchases)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleItem(item.id)
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-white hover:bg-amber-50/40 border border-slate-200 px-2 py-0.5 rounded cursor-pointer transition-all shadow-sm"
                                  title="Expandir linha deste item"
                                >
                                  <ChevronDown className="w-3 h-3 text-slate-500" />
                                  <span>Expandir</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedItemForModal(item)
                                    setIsPurchaseItemModalOpen(true)
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#261502] bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded cursor-pointer transition-all"
                                  title="Abrir detalhes e edição fiscal"
                                >
                                  <span>Abrir</span>
                                  <ChevronRight className="w-3 h-3 text-[#b87c14]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setSelectedItemForModal(item)
                            setIsPurchaseItemModalOpen(true)
                          }}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 text-center text-white font-bold text-xs">
                            <span className="w-6 h-6 rounded-md bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] border border-amber-500/40 flex items-center justify-center mx-auto text-amber-200 font-bold text-xs shadow-sm group-hover:border-amber-300 transition-colors">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 group-hover:text-[#261502] transition-colors">
                                {item.name || `Item ${idx + 1}`}
                              </span>
                              {item.hasSt && (
                                <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0 font-medium">
                                  ST
                                </Badge>
                              )}
                              {(item.freightValue ?? 0) > 0 && (
                                <Badge className="bg-amber-50 text-[#3b2405] border-amber-300 text-[10px] px-1.5 py-0 font-medium">
                                  Frete
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            <span className="font-semibold text-slate-900">
                              {item.quantity}{' '}
                              <span className="text-slate-500 font-normal">un.</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700">
                            {formatBRL(precoCompra)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatBRL(itemGrossTotal)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#3b2405]">
                            {formatBRL(itemNetPurchases)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleItem(item.id)
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1 rounded-md transition-all cursor-pointer shadow-sm"
                                title="Recolher linha deste item"
                              >
                                <ChevronUp className="w-3 h-3 text-slate-500" />
                                <span className="hidden sm:inline">Recolher</span>
                              </button>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#261502] bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-md transition-all shadow-sm">
                                <span>Abrir</span>
                                <ChevronRight className="w-3 h-3 text-[#b87c14]" />
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Linha de Total / Fecho de Tabela em Faixa Navy com Letra Branca (Padrão Chancelado) */}
                  <tfoot className="border-t-2 border-amber-900/60 bg-gradient-to-r from-[#261502] via-[#3b2405] to-[#261502] text-xs font-mono font-bold text-[#fff5cc]">
                    <tr>
                      <td
                        colSpan={2}
                        className="py-3 px-4 text-left font-bold text-[#fff5cc] uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#e5b742]" />
                          <span>Total das Compras (Σ)</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#fff5cc]">
                        {totalPurchasesQuantity} un.
                      </td>
                      <td className="py-3 px-4 text-right text-amber-200/70 font-normal">—</td>
                      <td className="py-3 px-4 text-right font-bold text-[#fff5cc] text-sm">
                        {formatBRL(
                          purchasesItems.reduce(
                            (acc, it) => acc + calculatePurchaseItemGrossTotal(it),
                            0,
                          ),
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#e5b742] text-sm">
                        {formatBRL(
                          purchasesItems.reduce(
                            (acc, it) => acc + calculatePurchaseItemNetPurchases(it, regime),
                            0,
                          ),
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-200/70 text-[11px] font-normal">
                        {purchasesItems.length} {purchasesItems.length === 1 ? 'item' : 'itens'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Barra de Rodapé da Lista */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
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
                  className="h-7 text-xs border border-amber-300 bg-amber-50 text-[#3b2405] hover:bg-amber-100 cursor-pointer font-semibold shrink-0"
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

          {/* (C) Gaveta: Encargos Globais da Compra (Recolhido por padrão) */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setIsEncargosOpen((prev) => !prev)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Encargos Globais da Compra</h3>
                    {hasDeductions && (
                      <Badge className="bg-amber-50 text-[#3b2405] border border-amber-300 text-[10px] px-2 py-0.5 font-medium">
                        Dedução: {formatBRL(totalDeductionsValue)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Frete rateado, devoluções/descontos e estoque no Kardex
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{isEncargosOpen ? 'Recolher' : 'Expandir'}</span>
                {isEncargosOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {isEncargosOpen && (
              <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                      Acréscimos / Deduções da Nota & Análise do Estoque
                    </span>
                    <p className="text-xs text-slate-500">
                      Deduções do custo de aquisição (devoluções/descontos) e Kardex por produto.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Botão 1: Deduções do Custo */}
                    <button
                      type="button"
                      onClick={() => setIsDeductionsDialogOpen(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                      title="Abrir camada de Deduções do Custo (Devoluções / Abatimentos / Descontos)"
                    >
                      <Receipt className="w-3.5 h-3.5 text-[#b87c14]" />
                      <span>Deduções do Custo</span>
                      {hasDeductions && (
                        <Badge className="text-[10px] px-1.5 py-0 border-0 font-medium bg-amber-50 text-[#3b2405]">
                          {formatBRL(totalDeductionsValue)}
                        </Badge>
                      )}
                      <ChevronRight className="w-3 h-3 text-slate-400 ml-0.5" />
                    </button>

                    {/* Botão 2: Subsistema de Estoque por Produto (Kardex / CMP) */}
                    <button
                      type="button"
                      onClick={() => setIsProductStockDialogOpen(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                      title="Abrir Subsistema de Controle de Estoque por Produto (Kardex, CMP Móvel e CMV por Produto)"
                    >
                      <Boxes className="w-3.5 h-3.5 text-[#b87c14]" />
                      <span>Estoque por Produto</span>
                      {hasProductStockData && (
                        <Badge className="text-[10px] px-1.5 py-0 border-0 font-medium bg-slate-100 text-slate-700">
                          {productStockTotals.productsCount} prods.
                        </Badge>
                      )}
                      <ChevronRight className="w-3 h-3 text-slate-400 ml-0.5" />
                    </button>
                  </div>
                </div>

                {/* Diálogo / Camada Completa: Subsistema de Estoque por Produto (Kardex / CMP Móvel) */}
                <ProductStockModal
                  open={isProductStockDialogOpen}
                  onOpenChange={setIsProductStockDialogOpen}
                />

                {/* Diálogo / Camada Completa: Deduções do Custo */}
                <Dialog open={isDeductionsDialogOpen} onOpenChange={setIsDeductionsDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 p-6 text-slate-900 shadow-xl">
                    <DialogHeader className="border-b border-slate-200 pb-3">
                      <div className="flex items-center justify-between gap-2 pr-6">
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Receipt className="w-5 h-5 text-[#b87c14]" />
                          Deduções do Custo (Devoluções / Abatimentos / Descontos)
                        </DialogTitle>
                        {hasDeductions && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-[#3b2405] shrink-0">
                            Total: {formatBRL(totalDeductionsValue)}
                          </span>
                        )}
                      </div>
                      <DialogDescription className="text-xs text-slate-500">
                        Cadastre os valores de devoluções de compras, abatimentos ou descontos
                        comerciais que abatem o custo de aquisição.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="pt-3 space-y-3">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-medium text-slate-700">
                          Itens de dedução ({deductionCosts.length})
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addDeductionCost('Nova dedução', 0)}
                          className="h-7 text-xs bg-white border-slate-200 text-slate-700 hover:text-[#261502] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Adicionar dedução
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                        {deductionCosts.length === 0 ? (
                          <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                            Nenhuma dedução lançada. Clique em "Adicionar dedução" para registrar
                            devoluções ou abatimentos.
                          </div>
                        ) : (
                          deductionCosts.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                            >
                              <Input
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  updateDeductionCost(item.id, 'description', e.target.value)
                                }
                                placeholder="Descrição da dedução"
                                className="text-xs font-medium h-8 flex-1 field-input-interactive"
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
                                className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Remover dedução"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Total deduzido do custo da compra:</span>
                        <strong className="text-[#261502] font-bold text-sm font-mono">
                          {formatBRL(totalDeductionsValue)}
                        </strong>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* SE REGIME REAL: Ajustes de PIS/COFINS sobre frete */}
                {regime === 'real' && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                    <span className="text-xs font-semibold uppercase text-slate-700 block">
                      Ajustes de Crédito PIS/COFINS s/ Frete Global (Lucro Real)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500">
                          Base PIS s/ frete global (R$)
                        </span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                            R$
                          </span>
                          <Input
                            type="text"
                            placeholder="0,00"
                            defaultValue={
                              pisFreightPurchasesBase > 0
                                ? formatNumberBR(pisFreightPurchasesBase)
                                : ''
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
                        <span className="text-xs text-slate-500">
                          Base COFINS s/ frete global (R$)
                        </span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
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
            )}
          </div>

          {/* (D) Gaveta: Situações Especiais da Operação (Recolhido por padrão) */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setIsSituacoesEspeciaisOpen((prev) => !prev)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Situações Especiais da Operação
                    </h3>
                    {(stSubsystem.enabled || interstateSubsystem.enabled) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <Sparkles className="w-2.5 h-2.5" />
                        Subsistemas Ativos
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Substituição Tributária (ICMS-ST na entrada) e DIFAL Interestadual
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{isSituacoesEspeciaisOpen ? 'Recolher' : 'Expandir'}</span>
                {isSituacoesEspeciaisOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {isSituacoesEspeciaisOpen && (
              <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-600">
                    Abra os módulos específicos para parametrização fiscal aprofundada:
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Chip ICMS-ST */}
                    <button
                      type="button"
                      onClick={() => setIsStDialogOpen(true)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer shadow-sm ${
                        stSubsystem.enabled
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title="Abrir camada de Substituição Tributária (ICMS-ST na compra)"
                    >
                      <ShieldAlert
                        className={`w-3.5 h-3.5 ${
                          stSubsystem.enabled ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="font-medium">ICMS-ST</span>
                      {stSubsystem.enabled && (
                        <Badge className="text-[10px] px-1.5 py-0 border-0 font-medium bg-amber-100 text-amber-800">
                          {stSubsystem.purchasesStPaid > 0
                            ? `ST: ${formatBRL(stSubsystem.purchasesStPaid)}`
                            : 'Ativo'}
                        </Badge>
                      )}
                      <ChevronRight className="w-3 h-3 text-slate-400 ml-0.5" />
                    </button>

                    {/* Chip DIFAL / Interestadual */}
                    <button
                      type="button"
                      onClick={() => setIsInterstateDialogOpen(true)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer shadow-sm ${
                        interstateSubsystem.enabled
                          ? 'bg-sky-50 border-sky-300 text-sky-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title="Abrir camada de Compra Interestadual e DIFAL"
                    >
                      <Compass
                        className={`w-3.5 h-3.5 ${
                          interstateSubsystem.enabled ? 'text-[#b87c14]' : 'text-slate-400'
                        }`}
                      />
                      <span className="font-medium">DIFAL / Interestadual</span>
                      {interstateSubsystem.enabled && (
                        <Badge className="text-[10px] px-1.5 py-0 border-0 font-medium bg-amber-100 text-[#3b2405]">
                          {interstatePurchasesResult && interstatePurchasesResult.hasDifalPurchase
                            ? `DIFAL: ${formatBRL(interstatePurchasesResult.difalPurchaseValue)}`
                            : 'Ativo'}
                        </Badge>
                      )}
                      <ChevronRight className="w-3 h-3 text-slate-400 ml-0.5" />
                    </button>
                  </div>
                </div>

                {/* Diálogo / Camada Completa: ICMS-ST na Compra */}
                <Dialog open={isStDialogOpen} onOpenChange={setIsStDialogOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 p-6 text-slate-900 shadow-xl">
                    <DialogHeader className="border-b border-slate-200 pb-3">
                      <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-600" />
                        Substituição Tributária (ICMS-ST) — Calculadora de Compras
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
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
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 p-6 text-slate-900 shadow-xl">
                    <DialogHeader className="border-b border-slate-200 pb-3">
                      <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Compass className="w-5 h-5 text-[#b87c14]" />
                        Operações Interestaduais e DIFAL — Calculadora de Compras
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
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
            )}
          </div>

          {/* (E) RESULTADO & CMV CONSOLIDADO — DUAS PORTAS (Cards + Kardex via 'Estoque por Produto') */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#261502] tracking-tight flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#b87c14]" />
                  CMV Consolidado da Compra
                </h3>
                <p className="text-xs text-[#5c3e06] mt-0.5">
                  Alimenta automaticamente os campos "CMV · automático" das DREs (Presumido, Real e
                  Simples) e o Dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductStockDialogOpen(true)}
                className="text-xs font-semibold text-[#3b2405] hover:text-[#0f0700] transition-colors inline-flex items-center gap-1 cursor-pointer self-start sm:self-center"
              >
                <span>Abrir Kardex detalhado em 'Estoque por Produto'</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#b87c14]" />
              </button>
            </div>

            {/* Grade com os 3 cards comparativos de CMV por regime */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className={`p-5 rounded-xl border transition-all ${
                  regime === 'presumido'
                    ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-600">
                    Lucro Presumido
                  </span>
                  {regime === 'presumido' && (
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-black text-[10px] border border-amber-300">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-[#261502] mt-2">
                  {formatBRL(calculatedPurchases.cmvPresumido)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {isMultiProduct ? (
                    <span>Ver detalhamento por produto</span>
                  ) : (
                    <>
                      Unitário médio:{' '}
                      <strong className="text-slate-800 font-mono">
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
                className={`p-5 rounded-xl border transition-all ${
                  regime === 'real'
                    ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-600">Lucro Real</span>
                  {regime === 'real' && (
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-black text-[10px] border border-amber-300">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-[#261502] mt-2">
                  {formatBRL(calculatedPurchases.cmvReal)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {isMultiProduct ? (
                    <span>Ver detalhamento por produto</span>
                  ) : (
                    <>
                      Unitário médio:{' '}
                      <strong className="text-slate-800 font-mono">
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
                className={`p-5 rounded-xl border transition-all ${
                  regime === 'simples'
                    ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-600">
                    Simples Nacional
                  </span>
                  {regime === 'simples' && (
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-black text-[10px] border border-amber-300">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-[#261502] mt-2">
                  {formatBRL(calculatedPurchases.cmvSimples)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {isMultiProduct ? (
                    <span>Ver detalhamento por produto</span>
                  ) : (
                    <>
                      Unitário médio:{' '}
                      <strong className="text-slate-800 font-mono">
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
          </div>
        </div>

        {/* Barra de Gerenciamento de Cenários no fim da página (padrão Markup) */}
        <div className="pt-2">
          <ScenarioManagerBar onGravarCenario={() => setIsSaveScenarioModalOpen(true)} />
        </div>

        {/* Botões de Navegação no Final da Página */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            onClick={() => navigate('/demo')}
            className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-medium px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para o Início</span>
          </Button>

          <button
            type="button"
            onClick={() => navigate('/demo/markup')}
            className="group/btn relative overflow-hidden inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] font-black text-xs sm:text-sm uppercase tracking-wide shadow-md shadow-amber-950/25 hover:shadow-xl hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all duration-300"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-45 group-hover/btn:opacity-70 mix-blend-overlay transition-opacity duration-300"
              style={{
                background:
                  'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90" />
            <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/btn:translate-x-[130%] transition-transform duration-700 ease-out" />
            <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
              Ir para Calculadora de Markup
            </span>
            <ArrowRight className="relative z-10 w-4 h-4 text-[#3b2405]" />
          </button>
        </div>
      </div>

      {/* Modal de Cenários por Cliente do Escritório (Compartilhado) */}
      <SaveScenarioModal
        isOpen={isSaveScenarioModalOpen}
        onClose={() => setIsSaveScenarioModalOpen(false)}
        scope="compras"
      />
    </DemoLayout>
  )
}
