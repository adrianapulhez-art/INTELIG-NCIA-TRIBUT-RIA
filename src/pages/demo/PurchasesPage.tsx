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
  FileSpreadsheet,
} from 'lucide-react'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScenarioManagerBar } from '@/components/demo/ScenarioManagerBar'
import { PageHero } from '@/components/demo/PageHero'
import { SubstituicaoTributariaSection } from '@/components/demo/SubstituicaoTributariaSection'
import { OperacoesInterestaduaisSection } from '@/components/demo/OperacoesInterestaduaisSection'
import { CmvDetailedBreakdown } from '@/components/demo/CmvDetailedBreakdown'
import { ProductStockModal } from '@/components/demo/ProductStockModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ShieldAlert, Compass, ChevronRight, SlidersHorizontal, Truck, Receipt } from 'lucide-react'
import { calculateInterstateOperation } from '@/lib/specialOperationsCalculations'

// Subcomponente de Cartão de Item de Compra com digitação blindada
interface PurchaseItemCardProps {
  item: PurchaseItem
  index: number
  regime: 'presumido' | 'real' | 'simples'
  onUpdate: (
    id: string,
    field: keyof Omit<
      PurchaseItem,
      | 'id'
      | 'calculatedIpi'
      | 'calculatedIcms'
      | 'calculatedPis'
      | 'calculatedCofins'
      | 'costPresumido'
      | 'costReal'
      | 'costSimples'
      | 'unitCostPresumido'
      | 'unitCostReal'
      | 'unitCostSimples'
    >,
    val: string | number | boolean,
  ) => void
  onRemove: (id: string) => void
  canRemove: boolean
}

const PurchaseItemCard: React.FC<PurchaseItemCardProps> = ({
  item,
  index,
  regime,
  onUpdate,
  onRemove,
  canRemove,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  // Estados locais blindados para edição livre e formatação onBlur
  const [qtyFocused, setQtyFocused] = useState(false)
  const [qtyVal, setQtyVal] = useState<string>(item.quantity > 0 ? String(item.quantity) : '')

  const [unitFocused, setUnitFocused] = useState(false)
  const [unitVal, setUnitVal] = useState<string>(
    item.unitPrice > 0 ? formatNumberBR(item.unitPrice) : '',
  )

  const [merchFocused, setMerchFocused] = useState(false)
  const [merchVal, setMerchVal] = useState<string>(
    item.merchandiseValue > 0 ? formatNumberBR(item.merchandiseValue) : '',
  )

  const [ipiFocused, setIpiFocused] = useState(false)
  const [ipiVal, setIpiVal] = useState<string>(item.ipiRate > 0 ? formatNumberBR(item.ipiRate) : '')

  const [icmsFocused, setIcmsFocused] = useState(false)
  const [icmsVal, setIcmsVal] = useState<string>(
    item.icmsRate > 0 ? formatNumberBR(item.icmsRate) : '',
  )

  const [freightValFocused, setFreightValFocused] = useState(false)
  const [freightValInput, setFreightValInput] = useState<string>(
    (item.freightValue ?? 0) > 0 ? formatNumberBR(item.freightValue ?? 0) : '',
  )

  const [icmsFreightRateFocused, setIcmsFreightRateFocused] = useState(false)
  const [icmsFreightRateInput, setIcmsFreightRateInput] = useState<string>(
    (item.icmsFreightRate ?? 0) > 0 ? formatNumberBR(item.icmsFreightRate ?? 0) : '',
  )

  const [stValFocused, setStValFocused] = useState(false)
  const [stValInput, setStValInput] = useState<string>(
    item.stValue > 0 ? formatNumberBR(item.stValue) : '',
  )

  // Sincroniza inputs quando não focados (ex.: resetAll, loadSnapshot ou cálculo derivado)
  React.useEffect(() => {
    if (!qtyFocused) setQtyVal(item.quantity > 0 ? String(item.quantity) : '')
  }, [item.quantity, qtyFocused])

  React.useEffect(() => {
    if (!unitFocused) setUnitVal(item.unitPrice > 0 ? formatNumberBR(item.unitPrice) : '')
  }, [item.unitPrice, unitFocused])

  React.useEffect(() => {
    if (!merchFocused)
      setMerchVal(item.merchandiseValue > 0 ? formatNumberBR(item.merchandiseValue) : '')
  }, [item.merchandiseValue, merchFocused])

  React.useEffect(() => {
    if (!ipiFocused) setIpiVal(item.ipiRate > 0 ? formatNumberBR(item.ipiRate) : '')
  }, [item.ipiRate, ipiFocused])

  React.useEffect(() => {
    if (!icmsFocused) setIcmsVal(item.icmsRate > 0 ? formatNumberBR(item.icmsRate) : '')
  }, [item.icmsRate, icmsFocused])

  React.useEffect(() => {
    if (!freightValFocused) {
      const v = item.freightValue ?? 0
      setFreightValInput(v > 0 ? formatNumberBR(v) : '')
    }
  }, [item.freightValue, freightValFocused])

  React.useEffect(() => {
    if (!icmsFreightRateFocused) {
      const r = item.icmsFreightRate ?? 0
      setIcmsFreightRateInput(r > 0 ? formatNumberBR(r) : '')
    }
  }, [item.icmsFreightRate, icmsFreightRateFocused])

  React.useEffect(() => {
    if (!stValFocused) setStValInput(item.stValue > 0 ? formatNumberBR(item.stValue) : '')
  }, [item.stValue, stValFocused])

  // Custo unitário e total conforme regime ativo
  const activeCost =
    regime === 'simples' ? item.costSimples : regime === 'real' ? item.costReal : item.costPresumido

  const activeUnitCost =
    regime === 'simples'
      ? item.unitCostSimples
      : regime === 'real'
        ? item.unitCostReal
        : item.unitCostPresumido

  return (
    <div className="bg-slate-950/70 border border-emerald-500/25 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-all hover:border-emerald-500/40">
      {/* Topo do item: Número/Nome + Badges de Custo + Expandir/Excluir */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs shrink-0">
            #{index + 1}
          </div>
          <Input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
            placeholder={`Nome do item ${index + 1}`}
            className="h-8 max-w-xs text-xs font-semibold field-input-interactive"
          />
        </div>

        {/* Resumo rápido do item */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
            <span className="text-slate-500 text-[10px] mr-1">QTD:</span>
            <strong className="text-emerald-400">{item.quantity}</strong> un.
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <span className="text-slate-400 text-[10px] mr-1">CUSTO UNIT:</span>
            <strong>{formatBRL(activeUnitCost)}</strong>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
            <span className="text-slate-400 text-[10px] mr-1">TOTAL:</span>
            <strong className="text-emerald-400">{formatBRL(activeCost)}</strong>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Remover este item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Expansível: Valores & Tributos */}
      {isExpanded && (
        <div className="space-y-4 pt-1">
          {/* Linha 1: Quantidade, Preço Unitário, Valor Total da Mercadoria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-300 font-semibold block">
                Quantidade comprada (un.)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={qtyVal}
                onFocus={() => setQtyFocused(true)}
                onChange={(e) => {
                  setQtyVal(e.target.value)
                  const parsed = parseInt(e.target.value, 10)
                  onUpdate(item.id, 'quantity', isNaN(parsed) || parsed < 0 ? 0 : parsed)
                }}
                onBlur={(e) => {
                  setQtyFocused(false)
                  const parsed = parseInt(e.target.value, 10)
                  const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed
                  onUpdate(item.id, 'quantity', safe)
                  setQtyVal(safe > 0 ? String(safe) : '')
                }}
                className="text-xs font-mono field-input-interactive"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 block">
                Valor unitário da mercadoria (R$)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                  R$
                </span>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={unitVal}
                  onFocus={() => setUnitFocused(true)}
                  onChange={(e) => {
                    setUnitVal(e.target.value)
                    const parsed = parseBRNumber(e.target.value)
                    onUpdate(item.id, 'unitPrice', parsed)
                  }}
                  onBlur={(e) => {
                    setUnitFocused(false)
                    const parsed = parseBRNumber(e.target.value)
                    onUpdate(item.id, 'unitPrice', parsed)
                    setUnitVal(parsed > 0 ? formatNumberBR(parsed) : '')
                  }}
                  className="pl-8 text-right text-xs font-mono field-input-interactive"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-300 font-semibold block">
                Valor total da mercadoria (R$)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                  R$
                </span>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={merchVal}
                  onFocus={() => setMerchFocused(true)}
                  onChange={(e) => {
                    setMerchVal(e.target.value)
                    const parsed = parseBRNumber(e.target.value)
                    onUpdate(item.id, 'merchandiseValue', parsed)
                  }}
                  onBlur={(e) => {
                    setMerchFocused(false)
                    const parsed = parseBRNumber(e.target.value)
                    onUpdate(item.id, 'merchandiseValue', parsed)
                    setMerchVal(parsed > 0 ? formatNumberBR(parsed) : '')
                  }}
                  className="pl-8 text-right text-xs font-mono font-bold field-input-interactive"
                />
              </div>
            </div>
          </div>

          {/* Linha 2: Tributos do Item (IPI, ICMS, Frete do item, ICMS s/ frete, ST) */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Tributação individual do item
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* IPI % */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">IPI / Não recup. %</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatBRL(item.calculatedIpi)}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={ipiVal}
                    onFocus={() => setIpiFocused(true)}
                    onChange={(e) => {
                      setIpiVal(e.target.value)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'ipiRate', parsed)
                    }}
                    onBlur={(e) => {
                      setIpiFocused(false)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'ipiRate', parsed)
                      setIpiVal(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pr-6 text-right text-xs font-mono field-input-interactive"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* ICMS % */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">ICMS destacado %</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {formatBRL(item.calculatedIcms)}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={icmsVal}
                    onFocus={() => setIcmsFocused(true)}
                    onChange={(e) => {
                      setIcmsVal(e.target.value)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'icmsRate', parsed)
                    }}
                    onBlur={(e) => {
                      setIcmsFocused(false)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'icmsRate', parsed)
                      setIcmsVal(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pr-6 text-right text-xs font-mono field-input-interactive"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Frete do item (R$) */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono block">
                  Frete do item (R$)
                </span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                    R$
                  </span>
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={freightValInput}
                    onFocus={() => setFreightValFocused(true)}
                    onChange={(e) => {
                      setFreightValInput(e.target.value)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'freightValue', parsed)
                    }}
                    onBlur={(e) => {
                      setFreightValFocused(false)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'freightValue', parsed)
                      setFreightValInput(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pl-8 text-right text-xs font-mono field-input-interactive"
                  />
                </div>
              </div>

              {/* ICMS s/ frete (%) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">ICMS s/ frete (%)</span>
                  <span
                    className="text-[10px] text-emerald-400 font-mono"
                    title="Crédito de ICMS s/ frete calculado"
                  >
                    {formatBRL(item.icmsFreightValue)}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={icmsFreightRateInput}
                    onFocus={() => setIcmsFreightRateFocused(true)}
                    onChange={(e) => {
                      setIcmsFreightRateInput(e.target.value)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'icmsFreightRate', parsed)
                    }}
                    onBlur={(e) => {
                      setIcmsFreightRateFocused(false)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'icmsFreightRate', parsed)
                      setIcmsFreightRateInput(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pr-6 text-right text-xs font-mono field-input-interactive"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* ICMS-ST recolhido */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-400 font-mono">ICMS-ST entrada</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.hasSt}
                      onChange={(e) => onUpdate(item.id, 'hasSt', e.target.checked)}
                      className="rounded bg-slate-900 border-slate-800 text-amber-500 focus:ring-amber-500/20"
                    />
                    <span className="text-[9px] font-mono text-slate-400">ST ativo</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                    R$
                  </span>
                  <Input
                    type="text"
                    disabled={!item.hasSt}
                    placeholder="0,00"
                    value={stValInput}
                    onFocus={() => setStValFocused(true)}
                    onChange={(e) => {
                      setStValInput(e.target.value)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'stValue', parsed)
                    }}
                    onBlur={(e) => {
                      setStValFocused(false)
                      const parsed = parseBRNumber(e.target.value)
                      onUpdate(item.id, 'stValue', parsed)
                      setStValInput(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pl-8 text-right bg-slate-950 border-slate-800 text-xs font-mono text-amber-300 disabled:opacity-40 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Créditos no Lucro Real (informativo se regime == real) */}
            {regime === 'real' && (
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 text-slate-400">
                <span>
                  Créditos Lucro Real: ICMS mercadoria:{' '}
                  <strong className="text-emerald-400">{formatBRL(item.calculatedIcms)}</strong> |
                  ICMS s/ frete:{' '}
                  <strong className="text-emerald-400">{formatBRL(item.icmsFreightValue)}</strong> |
                  PIS (1,65% s/ base s/ ICMS):{' '}
                  <strong className="text-emerald-400">{formatBRL(item.calculatedPis)}</strong> |
                  COFINS (7,60% s/ base s/ ICMS):{' '}
                  <strong className="text-emerald-400">{formatBRL(item.calculatedCofins)}</strong>
                </span>
                <span className="text-emerald-300">
                  Total de créditos do item:{' '}
                  <strong>
                    {formatBRL(
                      item.calculatedIcms +
                        item.icmsFreightValue +
                        item.calculatedPis +
                        item.calculatedCofins,
                    )}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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
    setInitialInventory,
    finalInventory,
    setFinalInventory,
    autoInventoryDeduction,
    setAutoInventoryDeduction,
    initialInventoryUnits,
    setInitialInventoryUnits,
    additionalCosts,
    addAdditionalCost,
    updateAdditionalCost,
    removeAdditionalCost,
    nonRecoverableTaxBase,
    setNonRecoverableTaxBase,
    nonRecoverableTaxRate,
    setNonRecoverableTaxRate,
    deductionCosts,
    addDeductionCost,
    updateDeductionCost,
    removeDeductionCost,
    icmsPurchasesBase,
    setIcmsPurchasesBase,
    icmsPurchasesRate,
    setIcmsPurchasesRate,
    icmsFreightPurchasesBase,
    setIcmsFreightPurchasesBase,
    icmsFreightPurchasesRate,
    setIcmsFreightPurchasesRate,
    pisPurchasesBase,
    setPisPurchasesBase,
    pisExcludedIcmsManual,
    setPisExcludedIcmsManual,
    cofinsPurchasesBase,
    setCofinsPurchasesBase,
    cofinsExcludedIcmsManual,
    setCofinsExcludedIcmsManual,
    pisFreightPurchasesBase,
    setPisFreightPurchasesBase,
    cofinsFreightPurchasesBase,
    setCofinsFreightPurchasesBase,
    calculatedPurchases,
    resetAll,
    stSubsystem,
    interstateSubsystem,
  } = useTaxContext()

  // Estados dos modais em camadas para ST, DIFAL, Frete e Deduções
  const [isStDialogOpen, setIsStDialogOpen] = useState(false)
  const [isInterstateDialogOpen, setIsInterstateDialogOpen] = useState(false)
  const [isFreightDialogOpen, setIsFreightDialogOpen] = useState(false)
  const [isDeductionsDialogOpen, setIsDeductionsDialogOpen] = useState(false)
  const [isProductStockDialogOpen, setIsProductStockDialogOpen] = useState(false)

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

  const activeUnitCMV = autoInventoryDeduction
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

  // Controle de exibição de ajuda / memória de cálculo
  const [showCalculationMemory, setShowCalculationMemory] = useState(true)

  return (
    <DemoLayout currentTab="compras">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Destaque Central Topo: Hero Banner estilo ADAPTA ONE */}
        <PageHero
          title="CALCULADORA DE COMPRAS & ESTOQUE"
          subtitle="Estrutura multi-itens para compras com tributos distintos, rateio de custos globais e consolidação de CMV para as DREs e Comparação."
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

            {/* Ações Rápidas: Zerar campos e adicionar item */}
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
                onClick={() => addPurchaseItem()}
                className="h-8 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar item
              </Button>
            </div>
          </div>

          {/* (A) Seletor de Regime Tributário das Compras (Laranja Aprovado) */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold uppercase text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Regime tributário da empresa compradora
              </span>

              {/* Botões Presumido / Real / Simples Nacional (padrão laranja estrito) */}
              <div className="inline-flex flex-wrap rounded-lg bg-slate-950/80 p-1 border border-orange-500/30 gap-1">
                <button
                  type="button"
                  onClick={() => setRegime('presumido')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                    regime === 'presumido'
                      ? 'bg-orange-500 text-slate-950 font-bold shadow-sm shadow-orange-500/20'
                      : 'text-orange-200/80 hover:text-orange-100 hover:bg-orange-500/10'
                  }`}
                >
                  Lucro Presumido
                </button>
                <button
                  type="button"
                  onClick={() => setRegime('real')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                    regime === 'real'
                      ? 'bg-orange-500 text-slate-950 font-bold shadow-sm shadow-orange-500/20'
                      : 'text-orange-200/80 hover:text-orange-100 hover:bg-orange-500/10'
                  }`}
                >
                  Lucro Real
                </button>
                <button
                  type="button"
                  onClick={() => setRegime('simples')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                    regime === 'simples'
                      ? 'bg-orange-500 text-slate-950 font-bold shadow-sm shadow-orange-500/20'
                      : 'text-orange-200/80 hover:text-orange-100 hover:bg-orange-500/10'
                  }`}
                >
                  Simples Nacional
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              {regime === 'simples' ? (
                <span>
                  💡 <strong>Simples Nacional:</strong> em regra geral, os tributos da compra{' '}
                  <strong className="text-emerald-400">não são recuperáveis</strong> e integram
                  integralmente o custo das mercadorias vendidas (CMV), recolhendo-se os tributos
                  pela guia única do DAS sobre o faturamento.
                </span>
              ) : regime === 'presumido' ? (
                <span>
                  💡 <strong>Lucro Presumido:</strong> apenas o ICMS e ICMS sobre frete são
                  recuperáveis; PIS e COFINS integram o custo das compras.
                </span>
              ) : (
                <span>
                  💡 <strong>Lucro Real:</strong> ICMS, PIS e COFINS (inclusive sobre frete) são
                  recuperáveis e deduzem as compras na apuração do CMV.
                </span>
              )}
            </p>
          </div>

          {/* (B) Bloco de ITENS DE COMPRA (Multi-Itens) */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">
                  Itens da Compra ({purchasesItems.length})
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Total de unidades:</span>
                <strong className="text-emerald-400">{totalPurchasesQuantity} un.</strong>
                <span className="text-slate-600">|</span>
                <span>Total mercadorias:</span>
                <strong className="text-emerald-400">{formatBRL(totalPurchasesMerchandise)}</strong>
              </div>
            </div>

            {/* Lista dos cartões de itens */}
            <div className="space-y-3">
              {purchasesItems.map((item, idx) => (
                <PurchaseItemCard
                  key={item.id}
                  item={item}
                  index={idx}
                  regime={regime}
                  onUpdate={updatePurchaseItem}
                  onRemove={removePurchaseItem}
                  canRemove={purchasesItems.length > 1}
                />
              ))}
            </div>

            {/* Botão para adicionar mais um item no rodapé da lista */}
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => addPurchaseItem()}
                className="w-full sm:w-auto px-6 border-dashed border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer text-xs font-mono"
              >
                <Plus className="w-4 h-4 mr-1.5" />+ Adicionar outro item à compra
              </Button>
            </div>
          </div>

          {/* (C) Campos da Compra como um todo (Estoque Inicial, Final e Rateio Global) */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  Estoques & Encargos Globais da Compra
                </h3>
                <p className="text-xs text-slate-400">
                  Estoque inicial, final, frete rateado e acréscimos/deduções aplicáveis à compra
                  como um todo.
                </p>
              </div>
            </div>

            {/* Toggle Baixa Automática e Estoque Inicial em unidades */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="auto-inventory-toggle"
                    checked={autoInventoryDeduction}
                    onChange={(e) => setAutoInventoryDeduction(e.target.checked)}
                    className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                  />
                  <div>
                    <label
                      htmlFor="auto-inventory-toggle"
                      className="text-xs font-bold text-slate-200 cursor-pointer flex items-center gap-2"
                    >
                      Baixa automática de estoque por quantidade
                      {autoInventoryDeduction && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                          · baixa por quantidade ativa
                        </span>
                      )}
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Conecta o CMV às vendas apuradas: calcula o custo unitário da compra, dá baixa
                      pelo número de unidades vendidas e calcula o estoque final automaticamente.
                    </p>
                  </div>
                </div>

                {/* Campo Estoque Inicial em Unidades (visível quando toggle ligado) */}
                {autoInventoryDeduction && (
                  <div className="flex items-center gap-2 shrink-0">
                    <label
                      htmlFor="initial-inventory-units-input"
                      className="text-xs font-mono text-slate-300 whitespace-nowrap"
                    >
                      Estoque inicial (unidades):
                    </label>
                    <Input
                      id="initial-inventory-units-input"
                      type="number"
                      min="0"
                      placeholder="0"
                      defaultValue={initialInventoryUnits > 0 ? String(initialInventoryUnits) : ''}
                      key={`ei-units-${initialInventoryUnits}`}
                      onBlur={(e) => {
                        const parsed = parseInt(e.target.value, 10)
                        const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed
                        setInitialInventoryUnits(safe)
                        e.target.value = safe > 0 ? String(safe) : ''
                      }}
                      className="w-24 bg-slate-900 border-orange-500/50 text-orange-50 font-mono text-xs focus:border-orange-500 focus-visible:ring-orange-500/30 text-right"
                    />
                  </div>
                )}
              </div>

              {/* Alerta se quantidade vendida excede o estoque disponível */}
              {autoInventoryDeduction && calculatedPurchases.isQuantityExceeded && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>
                    Quantidade vendida excede o estoque disponível (
                    {calculatedPurchases.totalAvailableUnits} unidades) — CMV limitado ao estoque
                    existente.
                  </span>
                </div>
              )}
            </div>

            {/* EI e EF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Estoque inicial (EI) — período anterior (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                    R$
                  </span>
                  <Input
                    type="text"
                    placeholder="0,00"
                    defaultValue={initialInventory > 0 ? formatNumberBR(initialInventory) : ''}
                    key={`ei-${initialInventory}`}
                    onBlur={(e) => {
                      const parsed = parseBRNumber(e.target.value)
                      setInitialInventory(parsed)
                      e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                    }}
                    className="pl-9 bg-slate-950/60 border-orange-500/50 text-orange-50 font-mono text-sm focus:border-orange-500 focus:ring-orange-500/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Estoque final (EF) — inventário apurado (R$)
                  </label>
                  {autoInventoryDeduction && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      · automático (baixa por quantidade)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                    R$
                  </span>
                  {autoInventoryDeduction ? (
                    <Input
                      type="text"
                      disabled
                      value={formatNumberBR(
                        regime === 'simples'
                          ? calculatedPurchases.autoFinalInventorySimples
                          : regime === 'real'
                            ? calculatedPurchases.autoFinalInventoryReal
                            : calculatedPurchases.autoFinalInventoryPresumido,
                      )}
                      className="pl-9 bg-slate-950/40 border-emerald-500/40 text-emerald-400 font-mono text-sm cursor-not-allowed opacity-90 font-bold"
                    />
                  ) : (
                    <Input
                      type="text"
                      placeholder="0,00"
                      defaultValue={finalInventory > 0 ? formatNumberBR(finalInventory) : ''}
                      key={`ef-${finalInventory}`}
                      onBlur={(e) => {
                        const parsed = parseBRNumber(e.target.value)
                        setFinalInventory(parsed)
                        e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                      }}
                      className="pl-9 bg-slate-950/60 border-orange-500/50 text-orange-50 font-mono text-sm focus:border-orange-500 focus:ring-orange-500/30"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Encargos e Deduções em Camadas (Chips Compactos com Modais) */}
            <div className="pt-2 border-t border-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-semibold uppercase text-slate-300 block">
                    Encargos e Deduções da Compra (Camadas)
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Configure fretes rateados e deduções do custo (devoluções/abatimentos) em
                    camadas compactas.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Chip 1: Frete e Encargos */}
                  <button
                    type="button"
                    onClick={() => setIsFreightDialogOpen(true)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                      hasAdditionalCosts
                        ? 'bg-emerald-500/[0.22] border-emerald-400/90 text-emerald-100 hover:bg-emerald-500/35 hover:border-emerald-300 shadow-emerald-500/25 ring-1 ring-emerald-500/40'
                        : 'bg-emerald-500/[0.12] border-emerald-500/70 text-emerald-200 hover:text-white hover:border-emerald-400 hover:bg-emerald-500/20 shadow-emerald-500/10'
                    }`}
                    title="Abrir camada de Frete e Encargos Adicionais Rateados na Compra"
                  >
                    <Truck
                      className={`w-3.5 h-3.5 ${
                        hasAdditionalCosts ? 'text-emerald-200' : 'text-emerald-300/80'
                      }`}
                    />
                    <span className="font-semibold text-emerald-100">Frete e Encargos</span>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 border-0 font-normal ${
                        hasAdditionalCosts
                          ? 'bg-emerald-500/35 text-emerald-100 font-semibold'
                          : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {hasAdditionalCosts
                        ? `${formatBRL(totalAdditionalCostsValue)} · ${activeAdditionalCostsCount} ${
                            activeAdditionalCostsCount === 1 ? 'item' : 'itens'
                          }`
                        : 'Inativo'}
                    </Badge>
                    <ChevronRight className="w-3 h-3 text-emerald-300/70 ml-0.5" />
                  </button>

                  {/* Chip 2: Deduções do Custo */}
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

                  {/* Chip 3: Subsistema de Estoque por Produto (Kardex / CMP) */}
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
                </div>
              </div>
            </div>

            {/* Diálogo / Camada Completa: Frete e Encargos Adicionais Rateados na Compra */}
            <Dialog open={isFreightDialogOpen} onOpenChange={setIsFreightDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between gap-2 pr-6">
                    <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-amber-400" />
                      Frete e Encargos Adicionais Rateados na Compra
                    </DialogTitle>
                    {hasAdditionalCosts && (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0">
                        Total: {formatBRL(totalAdditionalCostsValue)}
                      </span>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-slate-400">
                    Cadastre os custos globais de frete, seguro e outros encargos que são somados e
                    rateados proporcionalmente no custo de aquisição da compra.
                  </DialogDescription>
                </DialogHeader>

                <div className="pt-3 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-mono text-slate-300">
                      Itens de encargo ({additionalCosts.length})
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addAdditionalCost('Novo encargo', 0)}
                      className="h-7 text-xs bg-slate-900 border-slate-700 text-slate-200 hover:border-amber-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar encargo
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {additionalCosts.length === 0 ? (
                      <div className="text-center py-8 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        Nenhum encargo adicional lançado. Clique em "Adicionar encargo" para incluir
                        frete ou seguro rateado.
                      </div>
                    ) : (
                      additionalCosts.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors"
                        >
                          <Input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateAdditionalCost(item.id, 'description', e.target.value)
                            }
                            placeholder="Descrição do encargo"
                            className="text-xs font-semibold h-8 flex-1 field-input-interactive"
                          />
                          <div className="relative w-36 sm:w-44">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                              R$
                            </span>
                            <Input
                              type="text"
                              defaultValue={item.value > 0 ? formatNumberBR(item.value) : ''}
                              key={`cost-modal-${item.id}-${item.value}`}
                              onBlur={(e) => {
                                const parsed = parseBRNumber(e.target.value)
                                updateAdditionalCost(item.id, 'value', parsed)
                                e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                              }}
                              placeholder="0,00"
                              className="pl-7 text-right text-xs font-mono h-8 w-full field-input-interactive"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdditionalCost(item.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remover encargo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Total somado na base da compra:</span>
                    <strong className="text-amber-300 font-bold text-sm">
                      {formatBRL(totalAdditionalCostsValue)}
                    </strong>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
                  Simples) e a Comparação.
                </p>
              </div>

              {/* Botão de Memória de Cálculo */}
              <button
                type="button"
                onClick={() => setShowCalculationMemory(!showCalculationMemory)}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer underline"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {showCalculationMemory ? 'Ocultar memória de cálculo' : 'Ver memória de cálculo'}
              </button>
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
                  Unitário:{' '}
                  <strong className="text-slate-200">
                    {formatBRL(
                      autoInventoryDeduction
                        ? calculatedPurchases.unitCostPresumidoEffective
                        : (totalPurchasesQuantity || 0) > 0
                          ? calculatedPurchases.cmvPresumido / totalPurchasesQuantity
                          : calculatedPurchases.cmvPresumido,
                    )}
                  </strong>
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
                  Unitário:{' '}
                  <strong className="text-slate-200">
                    {formatBRL(
                      autoInventoryDeduction
                        ? calculatedPurchases.unitCostRealEffective
                        : (totalPurchasesQuantity || 0) > 0
                          ? calculatedPurchases.cmvReal / totalPurchasesQuantity
                          : calculatedPurchases.cmvReal,
                    )}
                  </strong>
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
                  Unitário:{' '}
                  <strong className="text-slate-200">
                    {formatBRL(
                      autoInventoryDeduction
                        ? calculatedPurchases.unitCostSimplesEffective
                        : (totalPurchasesQuantity || 0) > 0
                          ? calculatedPurchases.cmvSimples / totalPurchasesQuantity
                          : calculatedPurchases.cmvSimples,
                    )}
                  </strong>
                </div>
              </div>
            </div>

            {/* Detalhamento Passo-a-Passo da Memória de Cálculo (Fórmula Legal) */}
            {showCalculationMemory && (
              <div className="space-y-3">
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
            )}
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
            onClick={() => navigate('/demo/markup')}
            className="bg-[#0f172a]/90 text-slate-300 border border-slate-700/80 hover:border-emerald-500/40 hover:text-white hover:bg-slate-800/80 font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a calculadora Markup</span>
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
