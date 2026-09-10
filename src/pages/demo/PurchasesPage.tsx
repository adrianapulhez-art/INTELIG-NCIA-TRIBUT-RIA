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
            className="h-8 max-w-xs bg-slate-900 border-slate-800 text-xs font-semibold text-slate-100 focus:border-emerald-500"
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
                className="bg-slate-900 border-slate-800 text-xs font-mono text-slate-100 focus:border-emerald-500"
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
                  className="pl-8 text-right bg-slate-900 border-slate-800 text-xs font-mono text-slate-100 focus:border-emerald-500"
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
                  className="pl-8 text-right bg-slate-900 border-slate-800 text-xs font-mono text-emerald-400 font-bold focus:border-emerald-500"
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
                    className="pr-6 text-right bg-slate-950 border-slate-800 text-xs font-mono text-slate-200 focus:border-emerald-500"
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
                    className="pr-6 text-right bg-slate-950 border-slate-800 text-xs font-mono text-slate-200 focus:border-emerald-500"
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
                    className="pl-8 text-right bg-slate-950 border-slate-800 text-xs font-mono text-slate-200 focus:border-emerald-500"
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
                    className="pr-6 text-right bg-slate-950 border-slate-800 text-xs font-mono text-slate-200 focus:border-emerald-500"
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
  } = useTaxContext()

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
                      className="w-24 bg-slate-900 border-emerald-500/40 text-slate-100 font-mono text-xs focus:border-emerald-400 text-right"
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
                    className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 font-mono text-sm focus:border-emerald-500 focus:ring-emerald-500/20"
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
                      className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 font-mono text-sm focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Custos Adicionais Globais (Frete e Seguro rateados, outros) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase text-slate-300">
                  Frete e encargos adicionais rateados na compra
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addAdditionalCost('Novo encargo', 0)}
                  className="h-7 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar encargo
                </Button>
              </div>

              <div className="space-y-2">
                {additionalCosts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80"
                  >
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateAdditionalCost(item.id, 'description', e.target.value)}
                      placeholder="Descrição do encargo (ex.: Frete e seguro)"
                      className="flex-1 bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-200"
                    />
                    <div className="relative w-36 sm:w-44">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="text"
                        defaultValue={item.value > 0 ? formatNumberBR(item.value) : ''}
                        key={`add-${item.id}-${item.value}`}
                        onBlur={(e) => {
                          const parsed = parseBRNumber(e.target.value)
                          updateAdditionalCost(item.id, 'value', parsed)
                          e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                        }}
                        placeholder="0,00"
                        className="pl-8 text-right bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAdditionalCost(item.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Deduções Globais do Custo (Devoluções / Abatimentos) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase text-slate-300">
                  Deduções do custo (Devoluções / Abatimentos / Descontos incondicionais)
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDeductionCost('Nova dedução', 0)}
                  className="h-7 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar dedução
                </Button>
              </div>

              <div className="space-y-2">
                {deductionCosts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80"
                  >
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateDeductionCost(item.id, 'description', e.target.value)}
                      placeholder="Descrição da dedução"
                      className="flex-1 bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-200"
                    />
                    <div className="relative w-36 sm:w-44">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="text"
                        defaultValue={item.value > 0 ? formatNumberBR(item.value) : ''}
                        key={`ded-${item.id}-${item.value}`}
                        onBlur={(e) => {
                          const parsed = parseBRNumber(e.target.value)
                          updateDeductionCost(item.id, 'value', parsed)
                          e.target.value = parsed > 0 ? formatNumberBR(parsed) : ''
                        }}
                        placeholder="0,00"
                        className="pl-8 text-right bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDeductionCost(item.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

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
                        className="pl-8 text-right bg-slate-900 border-slate-800 text-xs font-mono"
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
                        className="pl-8 text-right bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* (D) Situações Especiais: Substituição Tributária & DIFAL (Preservadas) */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Situações Especiais de Compras (Subsistemas Integrados)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Acione apenas se a compra envolver Substituição Tributária (ICMS-ST na entrada) ou
                  fornecedor de outro estado (DIFAL uso/consumo).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <SubstituicaoTributariaSection
                viewMode="compras"
                saleOperationValue={totalPurchasesMerchandise}
              />
              <OperacoesInterestaduaisSection
                viewMode="compras"
                purchasesOperationValue={
                  totalPurchasesMerchandise +
                  additionalCosts.reduce((a, b) => a + (b.value || 0), 0)
                }
              />
            </div>
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
