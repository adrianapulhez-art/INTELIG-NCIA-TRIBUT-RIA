import React, { useState, useEffect } from 'react'
import { PurchaseItem, useTaxContext } from '@/contexts/TaxContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  formatBRL,
  formatNumberBR,
  formatPercentBR,
  parseBRNumber,
  calculatePurchaseItemGrossTotal,
  calculatePurchaseItemNetPurchases,
} from '@/lib/taxCalculations'
import {
  Package,
  Layers,
  Trash2,
  Receipt,
  Percent,
  Truck,
  ShieldAlert,
  Info,
  CheckCircle2,
  Calculator,
  Boxes,
  TrendingDown,
} from 'lucide-react'
import {
  calculateSingleProductStockPosition,
  ProductStockItem,
} from '@/lib/productStockCalculations'

export interface PurchaseItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PurchaseItem | null
  index: number
  regime: 'presumido' | 'real' | 'simples'
  stockQty?: number
  averageCost?: number
  totalValue?: number
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
  onRemove?: (id: string) => void
  canRemove?: boolean
}

export const PurchaseItemModal: React.FC<PurchaseItemModalProps> = ({
  open,
  onOpenChange,
  item,
  index,
  regime,
  stockQty,
  averageCost,
  totalValue,
  onUpdate,
  onRemove,
  canRemove = false,
}) => {
  const {
    realFreightPisCofinsMethod,
    setRealFreightPisCofinsMethod,
    productStockState,
    setProductStockState,
    updateProductStockItem,
  } = useTaxContext()
  const [showAltPositionModal, setShowAltPositionModal] = useState<boolean>(false)
  const [showConfirmApplyA, setShowConfirmApplyA] = useState<boolean>(false)

  // Localiza ou prepara o registro de estoque correspondente a este item
  const matchedStockProd = (productStockState?.products || []).find(
    (p) => p.name && item?.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
  )

  const currentInitialQty = matchedStockProd?.initial?.quantity ?? 0
  const currentInitialUnitCost = matchedStockProd?.initial?.unitCost ?? 0

  const [initQtyVal, setInitQtyVal] = useState<string>(
    currentInitialQty > 0 ? String(currentInitialQty) : '',
  )
  const [initCostVal, setInitCostVal] = useState<string>(
    currentInitialUnitCost > 0 ? formatNumberBR(currentInitialUnitCost) : '',
  )

  useEffect(() => {
    setInitQtyVal(currentInitialQty > 0 ? String(currentInitialQty) : '')
  }, [currentInitialQty])

  useEffect(() => {
    setInitCostVal(currentInitialUnitCost > 0 ? formatNumberBR(currentInitialUnitCost) : '')
  }, [currentInitialUnitCost])

  // Função para salvar Estoque Inicial em unidades e Custo de Partida bidirecionalmente
  const handleUpdateStockInitial = (newQty: number, newCost: number) => {
    if (!item?.name) return
    const prodNameTrimmed = item.name.trim()

    setProductStockState((prev) => {
      const currentList = prev?.products || []
      const existingIdx = currentList.findIndex(
        (p) => p.name && p.name.trim().toLowerCase() === prodNameTrimmed.toLowerCase(),
      )

      if (existingIdx >= 0) {
        const updatedList = [...currentList]
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          initial: {
            quantity: Math.max(0, newQty),
            unitCost: Math.max(0, newCost),
          },
        }
        return {
          ...prev,
          enabled: true,
          products: updatedList,
        }
      } else {
        const newItem: ProductStockItem = {
          id: `stk-prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: prodNameTrimmed,
          initial: {
            quantity: Math.max(0, newQty),
            unitCost: Math.max(0, newCost),
          },
          entries: [],
          exits: [],
        }
        return {
          ...prev,
          enabled: true,
          products: [...currentList, newItem],
        }
      }
    })
  }

  // Estados locais blindados para digitação fluida e conversão onBlur
  const [nameVal, setNameVal] = useState<string>(item?.name || '')
  const [qtyFocused, setQtyFocused] = useState(false)
  const [qtyVal, setQtyVal] = useState<string>(
    item && item.quantity > 0 ? String(item.quantity) : '',
  )

  const [unitFocused, setUnitFocused] = useState(false)
  const [unitVal, setUnitVal] = useState<string>(
    item && item.unitPrice > 0 ? formatNumberBR(item.unitPrice) : '',
  )

  const [merchFocused, setMerchFocused] = useState(false)
  const [merchVal, setMerchVal] = useState<string>(
    item && item.merchandiseValue > 0 ? formatNumberBR(item.merchandiseValue) : '',
  )

  const [ipiFocused, setIpiFocused] = useState(false)
  const [ipiVal, setIpiVal] = useState<string>(
    item && item.ipiRate > 0 ? formatNumberBR(item.ipiRate) : '',
  )

  const [icmsFocused, setIcmsFocused] = useState(false)
  const [icmsVal, setIcmsVal] = useState<string>(
    item && item.icmsRate > 0 ? formatNumberBR(item.icmsRate) : '',
  )

  const [freightValFocused, setFreightValFocused] = useState(false)
  const [freightValInput, setFreightValInput] = useState<string>(
    item && (item.freightValue ?? 0) > 0 ? formatNumberBR(item.freightValue ?? 0) : '',
  )

  const [icmsFreightRateFocused, setIcmsFreightRateFocused] = useState(false)
  const [icmsFreightRateInput, setIcmsFreightRateInput] = useState<string>(
    item && (item.icmsFreightRate ?? 0) > 0 ? formatNumberBR(item.icmsFreightRate ?? 0) : '',
  )

  const [stValFocused, setStValFocused] = useState(false)
  const [stValInput, setStValInput] = useState<string>(
    item && item.stValue > 0 ? formatNumberBR(item.stValue) : '',
  )

  // Sincroniza campos quando o item mudar externamente ou não estiver em foco
  useEffect(() => {
    if (item) setNameVal(item.name || '')
  }, [item?.name, item])

  useEffect(() => {
    if (item && !qtyFocused) setQtyVal(item.quantity > 0 ? String(item.quantity) : '')
  }, [item?.quantity, qtyFocused, item])

  useEffect(() => {
    if (item && !unitFocused) setUnitVal(item.unitPrice > 0 ? formatNumberBR(item.unitPrice) : '')
  }, [item?.unitPrice, unitFocused, item])

  useEffect(() => {
    if (item && !merchFocused)
      setMerchVal(item.merchandiseValue > 0 ? formatNumberBR(item.merchandiseValue) : '')
  }, [item?.merchandiseValue, merchFocused, item])

  useEffect(() => {
    if (item && !ipiFocused) setIpiVal(item.ipiRate > 0 ? formatNumberBR(item.ipiRate) : '')
  }, [item?.ipiRate, ipiFocused, item])

  useEffect(() => {
    if (item && !icmsFocused) setIcmsVal(item.icmsRate > 0 ? formatNumberBR(item.icmsRate) : '')
  }, [item?.icmsRate, icmsFocused, item])

  useEffect(() => {
    if (item && !freightValFocused) {
      const v = item.freightValue ?? 0
      setFreightValInput(v > 0 ? formatNumberBR(v) : '')
    }
  }, [item?.freightValue, freightValFocused, item])

  useEffect(() => {
    if (item && !icmsFreightRateFocused) {
      const r = item.icmsFreightRate ?? 0
      setIcmsFreightRateInput(r > 0 ? formatNumberBR(r) : '')
    }
  }, [item?.icmsFreightRate, icmsFreightRateFocused, item])

  useEffect(() => {
    if (item && !stValFocused) setStValInput(item.stValue > 0 ? formatNumberBR(item.stValue) : '')
  }, [item?.stValue, stValFocused, item])

  if (!item) return null

  const activeNetPurchases = calculatePurchaseItemNetPurchases(
    { ...item, freightPisCofinsMethod: realFreightPisCofinsMethod },
    regime,
  )
  const activeUnitCost =
    item.quantity > 0 ? Math.round((activeNetPurchases / item.quantity) * 100) / 100 : 0
  const activeCost = activeNetPurchases

  // Créditos calculados no Lucro Real
  const totalItemCredits =
    item.calculatedIcms + (item.icmsFreightValue || 0) + item.calculatedPis + item.calculatedCofins

  // Memória de Cálculo do CMV / Compras Líquidas do regime ativo
  const merchGross = calculatePurchaseItemGrossTotal(item)
  const freightVal = item.freightValue ?? 0
  const ipiValCalc =
    item.calculatedIpi !== undefined && Number.isFinite(item.calculatedIpi)
      ? item.calculatedIpi
      : (merchGross * Math.max(0, item.ipiRate ?? 0)) / 100
  const stValCalc = item.hasSt ? (item.stValue ?? 0) : 0
  const grossAcquisitionBase = merchGross + freightVal + ipiValCalc + stValCalc

  const icmsMerchVal =
    item.calculatedIcms !== undefined && Number.isFinite(item.calculatedIcms)
      ? item.calculatedIcms
      : (merchGross * Math.max(0, item.icmsRate ?? 0)) / 100

  const icmsFreightVal =
    item.icmsFreightValue !== undefined && Number.isFinite(item.icmsFreightValue)
      ? item.icmsFreightValue
      : (freightVal * Math.max(0, item.icmsFreightRate ?? 0)) / 100

  const mercNetIcmsVal = Math.max(0, merchGross - icmsMerchVal)
  const freightNetIcmsVal = Math.max(0, freightVal - icmsFreightVal)

  // Cálculo da Posição B (padrão): base conjunta mercadoria líquida + frete líquido
  const basePisCofinsB = mercNetIcmsVal + freightNetIcmsVal
  const pisValB = Math.round(basePisCofinsB * 0.0165 * 100) / 100
  const cofinsValB = Math.round(basePisCofinsB * 0.076 * 100) / 100
  const netPurchasesB = Math.max(
    0,
    Math.round(
      (grossAcquisitionBase - icmsMerchVal - icmsFreightVal - pisValB - cofinsValB) * 100,
    ) / 100,
  )

  // Cálculo da Posição A (alternativa: retenção 4,65% sobre frete)
  const pisValA_merc = Math.round(mercNetIcmsVal * 0.0165 * 100) / 100
  const cofinsValA_merc = Math.round(mercNetIcmsVal * 0.076 * 100) / 100
  const freightCreditA = Math.round(freightNetIcmsVal * 0.0465 * 100) / 100
  const netPurchasesA = Math.max(
    0,
    Math.round(
      (grossAcquisitionBase -
        icmsMerchVal -
        icmsFreightVal -
        pisValA_merc -
        cofinsValA_merc -
        freightCreditA) *
        100,
    ) / 100,
  )

  // Valores ativos conforme o método em vigor
  const isPosAActive = regime === 'real' && realFreightPisCofinsMethod === 'position_a'
  const activePisVal = isPosAActive ? pisValA_merc : pisValB
  const activeCofinsVal = isPosAActive ? cofinsValA_merc : cofinsValB

  const netPurchasesFromFormula = calculatePurchaseItemNetPurchases(
    { ...item, freightPisCofinsMethod: realFreightPisCofinsMethod },
    regime,
  )

  // Apuração do Kardex em tempo real para este produto via calculateSingleProductStockPosition
  const singleStockItemForCalc: ProductStockItem = matchedStockProd || {
    id: `temp-${item.id}`,
    name: item.name || `Produto ${index + 1}`,
    initial: { quantity: currentInitialQty, unitCost: currentInitialUnitCost },
    entries: [],
    exits: [],
  }

  const liveStockPosition = calculateSingleProductStockPosition(singleStockItemForCalc)
  const liveCMP =
    liveStockPosition.currentAverageCost > 0
      ? liveStockPosition.currentAverageCost
      : averageCost !== undefined && averageCost > 0
        ? averageCost
        : activeUnitCost
  const liveBalanceUnits = liveStockPosition.currentStockQty
  const liveExitUnits = liveStockPosition.totalExitsQty
  const liveAccumulatedCmv = liveStockPosition.accumulatedCmv

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-white border border-slate-200 p-5 sm:p-7 text-slate-900 shadow-xl">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-mono font-bold text-sm shrink-0">
                #{index + 1}
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Detalhes do Item de Compra</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                    {regime === 'presumido'
                      ? 'Lucro Presumido'
                      : regime === 'real'
                        ? 'Lucro Real'
                        : 'Simples Nacional'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Edite a discriminação completa, tributos individuais e encargos deste produto
                  adquirido.
                </DialogDescription>
              </div>
            </div>

            {canRemove && onRemove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onRemove(item.id)
                  onOpenChange(false)
                }}
                className="h-8 text-xs bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 cursor-pointer self-start sm:self-auto shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Excluir item
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Linha de Identificação: Nome do item */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-700 font-semibold block">
              Nome / Descrição do Produto
            </label>
            <Input
              type="text"
              value={nameVal}
              onChange={(e) => {
                setNameVal(e.target.value)
                onUpdate(item.id, 'name', e.target.value)
              }}
              placeholder={`Ex.: Produto ${index + 1}`}
              className="text-sm font-semibold field-input-interactive bg-white border-slate-200 text-slate-900"
            />
          </div>

          {/* Quadro de Resumo Rápido (4 indicadores da camada frontal) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                Qtd Comprada
              </span>
              <strong className="text-sm font-mono text-emerald-700 font-bold">
                {item.quantity} un.
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                Saldo em Estoque
              </span>
              <strong className="text-sm font-mono text-slate-900 font-bold">
                {stockQty !== undefined ? `${stockQty} un.` : `${item.quantity} un.`}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                Preço Médio / Custo Unit.
              </span>
              <strong className="text-sm font-mono text-emerald-700 font-bold">
                {formatBRL(
                  averageCost !== undefined && averageCost > 0 ? averageCost : activeUnitCost,
                )}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                Preço Total (Bruto)
              </span>
              <strong className="text-sm font-mono text-emerald-700 font-bold">
                {formatBRL(
                  totalValue !== undefined && totalValue > 0
                    ? totalValue
                    : calculatePurchaseItemGrossTotal(item),
                )}
              </strong>
            </div>
          </div>

          {/* Seção de Estoque do Produto: Estoque Inicial (un.) + Custo Unitário de Partida + Kardex CMP em tempo real */}
          <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold uppercase text-amber-900 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" />
                Estoque do Produto & Kardex (CMP Móvel)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-800 font-bold">
                · controle por produto ativo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Estoque Inicial em UNIDADES (un.) */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-700 font-semibold block">
                  Estoque Inicial do Produto (unidades)
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={initQtyVal}
                  onChange={(e) => setInitQtyVal(e.target.value)}
                  onBlur={() => {
                    const parsed = parseInt(initQtyVal, 10)
                    const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed
                    setInitQtyVal(safe > 0 ? String(safe) : '')
                    handleUpdateStockInitial(safe, currentInitialUnitCost)
                  }}
                  className="text-xs font-mono field-input-interactive bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                />
              </div>

              {/* Custo unitário de partida (R$) */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-700 font-semibold block">
                  Custo Unitário de Partida (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                    R$
                  </span>
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={initCostVal}
                    onChange={(e) => setInitCostVal(e.target.value)}
                    onBlur={() => {
                      const parsed = parseBRNumber(initCostVal)
                      setInitCostVal(parsed > 0 ? formatNumberBR(parsed) : '')
                      handleUpdateStockInitial(currentInitialQty, parsed)
                    }}
                    className="pl-8 text-right text-xs font-mono field-input-interactive bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Painel Kardex em tempo real do produto */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-amber-200 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  CMP Móvel
                </span>
                <strong className="text-emerald-700 font-bold text-xs sm:text-sm">
                  {formatBRL(liveCMP)}
                </strong>
                <span className="text-[9px] text-slate-500 block">/ un.</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Saldo em Unidades
                </span>
                <strong className="text-slate-900 font-bold text-xs sm:text-sm">
                  {liveBalanceUnits} un.
                </strong>
                <span className="text-[9px] text-slate-500 block">
                  {liveStockPosition.initialQty > 0
                    ? `(EI ${liveStockPosition.initialQty} + comp.)`
                    : 'disponível'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Baixas por Venda
                </span>
                <strong className="text-amber-700 font-bold text-xs sm:text-sm">
                  {liveExitUnits} un.
                </strong>
                <span className="text-[9px] text-slate-500 block">saídas registradas</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  CMV Apurado
                </span>
                <strong className="text-emerald-700 font-bold text-xs sm:text-sm">
                  {formatBRL(liveAccumulatedCmv)}
                </strong>
                <span className="text-[9px] text-slate-500 block">baixas valorizadas</span>
              </div>
            </div>
          </div>

          {/* Seção 1: Quantidade, Preço Unitário e Valor da Mercadoria */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-slate-900 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              Volume e Valores de Aquisição
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Quantidade comprada */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-700 font-semibold block">
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
                  onBlur={() => {
                    setQtyFocused(false)
                    const parsed = parseInt(qtyVal, 10)
                    const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed
                    onUpdate(item.id, 'quantity', safe)
                    setQtyVal(safe > 0 ? String(safe) : '')
                  }}
                  className="text-xs font-mono field-input-interactive bg-white border-slate-300 text-slate-900"
                />
              </div>

              {/* Valor unitário */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-700 font-semibold block">
                  Valor unitário da mercadoria (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
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
                    onBlur={() => {
                      setUnitFocused(false)
                      const parsed = parseBRNumber(unitVal)
                      onUpdate(item.id, 'unitPrice', parsed)
                      setUnitVal(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pl-8 text-right text-xs font-mono field-input-interactive bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {/* Valor total da mercadoria */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-700 font-semibold block">
                  Valor total da mercadoria (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
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
                    onBlur={() => {
                      setMerchFocused(false)
                      const parsed = parseBRNumber(merchVal)
                      onUpdate(item.id, 'merchandiseValue', parsed)
                      setMerchVal(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pl-8 text-right text-xs font-mono font-bold field-input-interactive bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Tributação Individual do Item */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-900 font-bold flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              Tributação Individual do Item
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* IPI % */}
              <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-700 font-mono font-semibold">
                    IPI / Não recup. %
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono font-semibold">
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
                    onBlur={() => {
                      setIpiFocused(false)
                      const parsed = parseBRNumber(ipiVal)
                      onUpdate(item.id, 'ipiRate', parsed)
                      setIpiVal(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pr-6 text-right text-xs font-mono field-input-interactive bg-white border-slate-300 text-slate-900"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* ICMS % */}
              <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-700 font-mono font-semibold">
                    ICMS destacado %
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">
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
                    onBlur={() => {
                      setIcmsFocused(false)
                      const parsed = parseBRNumber(icmsVal)
                      onUpdate(item.id, 'icmsRate', parsed)
                      setIcmsVal(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pr-6 text-right text-xs font-mono field-input-interactive bg-white border-slate-300 text-slate-900"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Frete do item */}
              <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-700 font-mono font-semibold block">
                  Frete do item (R$)
                </span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
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
                    onBlur={() => {
                      setFreightValFocused(false)
                      const parsed = parseBRNumber(freightValInput)
                      onUpdate(item.id, 'freightValue', parsed)
                      setFreightValInput(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pl-8 text-right text-xs font-mono field-input-interactive bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {/* ICMS s/ frete (%) */}
              <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-700 font-mono font-semibold">
                    ICMS s/ frete (%)
                  </span>
                  <span
                    className="text-[10px] text-emerald-700 font-mono font-bold"
                    title="Crédito de ICMS s/ frete calculado"
                  >
                    {formatBRL(item.icmsFreightValue || 0)}
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
                    onBlur={() => {
                      setIcmsFreightRateFocused(false)
                      const parsed = parseBRNumber(icmsFreightRateInput)
                      onUpdate(item.id, 'icmsFreightRate', parsed)
                      setIcmsFreightRateInput(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pr-6 text-right text-xs font-mono field-input-interactive bg-white border-slate-300 text-slate-900"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* ICMS-ST recolhido */}
              <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200 sm:col-span-2 lg:col-span-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-800 font-mono font-bold">
                    ICMS-ST na Entrada (R$)
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.hasSt}
                      onChange={(e) => onUpdate(item.id, 'hasSt', e.target.checked)}
                      className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                    />
                    <span className="text-[10px] font-mono text-slate-700 font-medium">
                      ST ativo no item
                    </span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
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
                    onBlur={() => {
                      setStValFocused(false)
                      const parsed = parseBRNumber(stValInput)
                      onUpdate(item.id, 'stValue', parsed)
                      setStValInput(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pl-8 text-right bg-white border-slate-300 text-xs font-mono text-slate-900 disabled:opacity-40 disabled:bg-slate-100 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Créditos no Lucro Real (informativo se regime == real) */}
            {regime === 'real' && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono space-y-1.5 text-emerald-950">
                <div className="flex items-center justify-between font-bold text-emerald-900">
                  <span>Créditos Recuperáveis (Lucro Real)</span>
                  <span>Total: {formatBRL(totalItemCredits)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700 pt-1">
                  <div>
                    ICMS mercadoria:{' '}
                    <strong className="text-emerald-800">{formatBRL(item.calculatedIcms)}</strong>
                  </div>
                  <div>
                    ICMS s/ frete:{' '}
                    <strong className="text-emerald-800">
                      {formatBRL(item.icmsFreightValue || 0)}
                    </strong>
                  </div>
                  <div>
                    PIS (1,65%):{' '}
                    <strong className="text-emerald-800">{formatBRL(item.calculatedPis)}</strong>
                  </div>
                  <div>
                    COFINS (7,60%):{' '}
                    <strong className="text-emerald-800">{formatBRL(item.calculatedCofins)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seção 3: Memória de Cálculo Expressa do CMV / Compras Líquidas (Regime Ativo) */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase text-slate-900 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  Memória de Cálculo do CMV (Compras Líquidas)
                </span>
                {regime === 'real' && isPosAActive && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
                    Posição A aplicada (retenção 4,65%)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {regime === 'real' &&
                  (isPosAActive ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRealFreightPisCofinsMethod('position_b')}
                      className="h-6 px-2 text-[10px] font-mono bg-white border-amber-300 text-amber-800 hover:bg-amber-50 hover:text-amber-900 cursor-pointer"
                    >
                      Voltar para posição padrão B
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAltPositionModal(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 cursor-pointer transition-all"
                    >
                      <span>Ver posição alternativa: retenção na fonte 4,65%</span>
                      <span className="text-amber-700 font-bold">›</span>
                    </button>
                  ))}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  {regime === 'presumido'
                    ? 'Lucro Presumido'
                    : regime === 'real'
                      ? 'Lucro Real'
                      : 'Simples Nacional'}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs font-mono">
              {/* Linha (+) Mercadorias */}
              <div className="flex items-center justify-between text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-700 font-bold">(+)</span>
                  <span>
                    Mercadorias
                    {item.quantity > 0 && item.unitPrice > 0 && (
                      <span className="text-slate-500 text-[11px] ml-1">
                        ({item.quantity} un. × {formatBRL(item.unitPrice)})
                      </span>
                    )}
                  </span>
                </span>
                <span className="font-bold text-slate-900">{formatBRL(merchGross)}</span>
              </div>

              {/* Linha (+) Frete sobre compras */}
              <div className="flex items-center justify-between text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-700 font-bold">(+)</span>
                  <span>Frete sobre compras</span>
                </span>
                <span className="font-bold text-slate-900">{formatBRL(freightVal)}</span>
              </div>

              {/* Linha (+) IPI se houver */}
              {ipiValCalc > 0 && (
                <div className="flex items-center justify-between text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-700 font-bold">(+)</span>
                    <span>
                      IPI / Tributos não recuperáveis
                      {item.ipiRate > 0 && (
                        <span className="text-slate-500 text-[11px] ml-1">
                          ({formatPercentBR(item.ipiRate)})
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="font-bold text-slate-900">{formatBRL(ipiValCalc)}</span>
                </div>
              )}

              {/* Linha (+) ST se houver */}
              {stValCalc > 0 && (
                <div className="flex items-center justify-between text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <span className="text-amber-700 font-bold">(+)</span>
                    <span>ICMS-ST na Entrada (custo)</span>
                  </span>
                  <span className="font-bold text-amber-800">{formatBRL(stValCalc)}</span>
                </div>
              )}

              {/* DEDUÇÕES CONFORME O REGIME */}
              {regime === 'simples' ? (
                <div className="py-2 px-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Deduções de tributos recuperáveis (art. 23 LC 123/2006):</span>
                  </span>
                  <span className="text-amber-800 font-bold">Sem deduções (bruto integral)</span>
                </div>
              ) : (
                <>
                  {/* Linha (−) ICMS sobre mercadorias */}
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-600 font-bold">(−)</span>
                      <span>
                        ICMS sobre mercadorias
                        {item.icmsRate > 0 && (
                          <span className="text-slate-500 text-[11px] ml-1">
                            ({formatPercentBR(item.icmsRate)} × {formatBRL(merchGross)})
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-bold text-rose-700">-{formatBRL(icmsMerchVal)}</span>
                  </div>

                  {/* Linha (−) ICMS sobre fretes */}
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-600 font-bold">(−)</span>
                      <span>
                        ICMS sobre fretes
                        {(item.icmsFreightRate ?? 0) > 0 && (
                          <span className="text-slate-500 text-[11px] ml-1">
                            ({formatPercentBR(item.icmsFreightRate ?? 0)} × {formatBRL(freightVal)})
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-bold text-rose-700">-{formatBRL(icmsFreightVal)}</span>
                  </div>

                  {/* Linhas exclusivas do Lucro Real: PIS e COFINS */}
                  {regime === 'real' && (
                    <>
                      {isPosAActive ? (
                        <>
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <span className="text-rose-600 font-bold">(−)</span>
                              <span>
                                PIS sobre mercadoria (1,65%)
                                <span className="text-slate-500 text-[11px] ml-1">
                                  (1,65% × {formatBRL(mercNetIcmsVal)})
                                </span>
                              </span>
                            </span>
                            <span className="font-bold text-rose-700">
                              -{formatBRL(pisValA_merc)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <span className="text-rose-600 font-bold">(−)</span>
                              <span>
                                COFINS sobre mercadoria (7,60%)
                                <span className="text-slate-500 text-[11px] ml-1">
                                  (7,60% × {formatBRL(mercNetIcmsVal)})
                                </span>
                              </span>
                            </span>
                            <span className="font-bold text-rose-700">
                              -{formatBRL(cofinsValA_merc)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <span className="text-rose-600 font-bold">(−)</span>
                              <span>
                                Crédito retido s/ frete (4,65%)
                                <span className="text-slate-500 text-[11px] ml-1">
                                  (4,65% × {formatBRL(freightNetIcmsVal)})
                                </span>
                              </span>
                            </span>
                            <span className="font-bold text-rose-700">
                              -{formatBRL(freightCreditA)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <span className="text-rose-600 font-bold">(−)</span>
                              <span>
                                PIS (1,65%)
                                <span className="text-slate-500 text-[11px] ml-1">
                                  (1,65% × {formatBRL(basePisCofinsB)}
                                  {freightNetIcmsVal > 0 && (
                                    <span className="text-slate-500 ml-1">
                                      ({formatBRL(mercNetIcmsVal)} mercadoria líq. +{' '}
                                      {formatBRL(freightNetIcmsVal)} frete líq.)
                                    </span>
                                  )}
                                  )
                                </span>
                              </span>
                            </span>
                            <span className="font-bold text-rose-700">-{formatBRL(pisValB)}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <span className="text-rose-600 font-bold">(−)</span>
                              <span>
                                COFINS (7,60%)
                                <span className="text-slate-500 text-[11px] ml-1">
                                  (7,60% × {formatBRL(basePisCofinsB)}
                                  {freightNetIcmsVal > 0 && (
                                    <span className="text-slate-500 ml-1">
                                      ({formatBRL(mercNetIcmsVal)} mercadoria líq. +{' '}
                                      {formatBRL(freightNetIcmsVal)} frete líq.)
                                    </span>
                                  )}
                                  )
                                </span>
                              </span>
                            </span>
                            <span className="font-bold text-rose-700">
                              -{formatBRL(cofinsValB)}
                            </span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Linha (=) Compras Líquidas (Resultado) */}
              <div className="pt-2.5 border-t-2 border-emerald-600/40 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="text-emerald-700">(=)</span>
                  <span>Compras Líquidas / Custo Total:</span>
                </span>
                <span className="font-black text-emerald-700 text-base">
                  {formatBRL(netPurchasesFromFormula)}
                </span>
              </div>

              {/* Custo Unitário Líquido correspondente */}
              {item.quantity > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5 font-medium">
                  <span>Custo Unitário Líquido ({item.quantity} un.):</span>
                  <span className="text-emerald-700 font-bold">
                    {formatBRL(netPurchasesFromFormula / item.quantity)} / un.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Subcamada da Posição Alternativa A (Retenção 4,65% sobre o frete) */}
          <Dialog open={showAltPositionModal} onOpenChange={setShowAltPositionModal}>
            <DialogContent className="max-w-2xl bg-white border border-slate-200 p-5 sm:p-6 text-slate-900 shadow-xl">
              <DialogHeader className="border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-bold text-sm">
                    A
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>Posição A — Retenção na Fonte 4,65% s/ Frete</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                        Camada Opcional
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      PIS 1,65% e COFINS 7,60% plenos sobre a mercadoria líquida + crédito de
                      retenção 4,65% sobre o frete líquido.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Memória completa da Posição A */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-700 font-bold">(+)</span>
                      <span>
                        Mercadorias
                        {item.quantity > 0 && item.unitPrice > 0 && (
                          <span className="text-slate-500 text-[11px] ml-1">
                            ({item.quantity} un. × {formatBRL(item.unitPrice)})
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-bold text-slate-900">{formatBRL(merchGross)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-700 font-bold">(+)</span>
                      <span>Frete sobre compras</span>
                    </span>
                    <span className="font-bold text-slate-900">{formatBRL(freightVal)}</span>
                  </div>

                  {ipiValCalc > 0 && (
                    <div className="flex items-center justify-between text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-700 font-bold">(+)</span>
                        <span>IPI / Tributos não recuperáveis</span>
                      </span>
                      <span className="font-bold text-slate-900">{formatBRL(ipiValCalc)}</span>
                    </div>
                  )}

                  {stValCalc > 0 && (
                    <div className="flex items-center justify-between text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span className="text-amber-700 font-bold">(+)</span>
                        <span>ICMS-ST na Entrada</span>
                      </span>
                      <span className="font-bold text-amber-800">{formatBRL(stValCalc)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-600 font-bold">(−)</span>
                      <span>
                        ICMS sobre mercadorias
                        {item.icmsRate > 0 && (
                          <span className="text-slate-500 text-[11px] ml-1">
                            ({formatPercentBR(item.icmsRate)} × {formatBRL(merchGross)})
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-bold text-rose-700">-{formatBRL(icmsMerchVal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-600 font-bold">(−)</span>
                      <span>
                        ICMS sobre fretes
                        {(item.icmsFreightRate ?? 0) > 0 && (
                          <span className="text-slate-500 text-[11px] ml-1">
                            ({formatPercentBR(item.icmsFreightRate ?? 0)} × {formatBRL(freightVal)})
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-bold text-rose-700">-{formatBRL(icmsFreightVal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-600 font-bold">(−)</span>
                      <span>
                        PIS s/ mercadoria (1,65%)
                        <span className="text-slate-500 text-[11px] ml-1">
                          (1,65% × {formatBRL(mercNetIcmsVal)})
                        </span>
                      </span>
                    </span>
                    <span className="font-bold text-rose-700">-{formatBRL(pisValA_merc)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-600 font-bold">(−)</span>
                      <span>
                        COFINS s/ mercadoria (7,60%)
                        <span className="text-slate-500 text-[11px] ml-1">
                          (7,60% × {formatBRL(mercNetIcmsVal)})
                        </span>
                      </span>
                    </span>
                    <span className="font-bold text-rose-700">-{formatBRL(cofinsValA_merc)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-600 font-bold">(−)</span>
                      <span>
                        Crédito retido s/ frete (4,65%)
                        <span className="text-slate-500 text-[11px] ml-1">
                          (4,65% × {formatBRL(freightNetIcmsVal)})
                        </span>
                      </span>
                    </span>
                    <span className="font-bold text-rose-700">-{formatBRL(freightCreditA)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="text-amber-700">(=)</span>
                      <span>Compras Líquidas (Posição A):</span>
                    </span>
                    <span className="font-bold text-amber-800 text-base">
                      {formatBRL(netPurchasesA)}
                    </span>
                  </div>

                  {item.quantity > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Custo Unitário Líquido ({item.quantity} un.):</span>
                      <span className="text-amber-800 font-bold">
                        {formatBRL(netPurchasesA / item.quantity)} / un.
                      </span>
                    </div>
                  )}
                </div>

                {/* Comparativo rápido entre A e B */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      Posição B (Padrão)
                    </span>
                    <strong className="text-emerald-700 font-bold">
                      {formatBRL(netPurchasesB)}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">
                      {item.quantity > 0 ? `${formatBRL(netPurchasesB / item.quantity)} / un.` : ''}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-amber-700 uppercase block font-semibold">
                      Posição A (Retenção 4,65%)
                    </span>
                    <strong className="text-amber-800 font-bold">{formatBRL(netPurchasesA)}</strong>
                    <span className="text-[10px] text-slate-500 block">
                      {item.quantity > 0 ? `${formatBRL(netPurchasesA / item.quantity)} / un.` : ''}
                    </span>
                  </div>
                </div>

                {/* Confirmação e Ação de Aplicação */}
                {showConfirmApplyA ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <p className="text-xs text-amber-900 font-medium">
                      Tem certeza de que deseja aplicar a{' '}
                      <strong>Posição A (retenção 4,65%)</strong> em todas as tabelas e relatórios
                      do Lucro Real?
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowConfirmApplyA(false)}
                        className="h-8 text-xs text-slate-600 hover:text-slate-900"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setRealFreightPisCofinsMethod('position_a')
                          setShowConfirmApplyA(false)
                          setShowAltPositionModal(false)
                        }}
                        className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                      >
                        Confirmar e Aplicar Posição A
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAltPositionModal(false)}
                      className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Fechar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowConfirmApplyA(true)}
                      className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer shadow-xs"
                    >
                      Aplicar posição A nas tabelas
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Rodapé do Modal com Botão Fechar / Salvar */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">
              Alterações salvas e recalculadas automaticamente em tempo real.
            </span>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 h-9 text-xs cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Concluir / Fechar camada
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
