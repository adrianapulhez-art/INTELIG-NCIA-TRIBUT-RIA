import React, { useState, useEffect } from 'react'
import { PurchaseItem } from '@/contexts/TaxContext'
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
  parseBRNumber,
  calculatePurchaseItemGrossTotal,
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
} from 'lucide-react'

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

  // Custo unitário e total conforme regime ativo
  const activeCost =
    regime === 'simples' ? item.costSimples : regime === 'real' ? item.costReal : item.costPresumido

  const activeUnitCost =
    regime === 'simples'
      ? item.unitCostSimples
      : regime === 'real'
        ? item.unitCostReal
        : item.unitCostPresumido

  // Créditos calculados no Lucro Real
  const totalItemCredits =
    item.calculatedIcms + (item.icmsFreightValue || 0) + item.calculatedPis + item.calculatedCofins

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 p-5 sm:p-7 text-slate-100 shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm shrink-0">
                #{index + 1}
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Detalhes do Item de Compra</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    {regime === 'presumido'
                      ? 'Lucro Presumido'
                      : regime === 'real'
                        ? 'Lucro Real'
                        : 'Simples Nacional'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
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
                className="h-8 text-xs bg-rose-950/30 border-rose-800/60 text-rose-300 hover:bg-rose-900/40 hover:text-rose-100 hover:border-rose-500 cursor-pointer self-start sm:self-auto"
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
            <label className="text-xs font-mono text-slate-300 font-semibold block">
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
              className="text-sm font-semibold field-input-interactive"
            />
          </div>

          {/* Quadro de Resumo Rápido (4 indicadores da camada frontal) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Qtd Comprada
              </span>
              <strong className="text-sm font-mono text-emerald-400">{item.quantity} un.</strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Saldo em Estoque
              </span>
              <strong className="text-sm font-mono text-white">
                {stockQty !== undefined ? `${stockQty} un.` : `${item.quantity} un.`}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Preço Médio / Custo Unit.
              </span>
              <strong className="text-sm font-mono text-emerald-300">
                {formatBRL(
                  averageCost !== undefined && averageCost > 0 ? averageCost : activeUnitCost,
                )}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Preço Total (Bruto)
              </span>
              <strong className="text-sm font-mono text-emerald-400">
                {formatBRL(
                  totalValue !== undefined && totalValue > 0
                    ? totalValue
                    : calculatePurchaseItemGrossTotal(item),
                )}
              </strong>
            </div>
          </div>

          {/* Seção 1: Quantidade, Preço Unitário e Valor da Mercadoria */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
            <span className="text-xs font-mono font-semibold uppercase text-emerald-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Volume e Valores de Aquisição
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Quantidade comprada */}
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
                  onBlur={() => {
                    setQtyFocused(false)
                    const parsed = parseInt(qtyVal, 10)
                    const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed
                    onUpdate(item.id, 'quantity', safe)
                    setQtyVal(safe > 0 ? String(safe) : '')
                  }}
                  className="text-xs font-mono field-input-interactive"
                />
              </div>

              {/* Valor unitário */}
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
                    onBlur={() => {
                      setUnitFocused(false)
                      const parsed = parseBRNumber(unitVal)
                      onUpdate(item.id, 'unitPrice', parsed)
                      setUnitVal(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pl-8 text-right text-xs font-mono field-input-interactive"
                  />
                </div>
              </div>

              {/* Valor total da mercadoria */}
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
                    onBlur={() => {
                      setMerchFocused(false)
                      const parsed = parseBRNumber(merchVal)
                      onUpdate(item.id, 'merchandiseValue', parsed)
                      setMerchVal(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pl-8 text-right text-xs font-mono font-bold field-input-interactive"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Tributação Individual do Item */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
              Tributação Individual do Item
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* IPI % */}
              <div className="space-y-1 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-mono">IPI / Não recup. %</span>
                  <span className="text-[10px] text-slate-400 font-mono">
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
                    className="pr-6 text-right text-xs font-mono field-input-interactive"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* ICMS % */}
              <div className="space-y-1 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-mono">ICMS destacado %</span>
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
                    onBlur={() => {
                      setIcmsFocused(false)
                      const parsed = parseBRNumber(icmsVal)
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

              {/* Frete do item */}
              <div className="space-y-1 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-300 font-mono block">
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
                    onBlur={() => {
                      setFreightValFocused(false)
                      const parsed = parseBRNumber(freightValInput)
                      onUpdate(item.id, 'freightValue', parsed)
                      setFreightValInput(parsed > 0 ? formatNumberBR(parsed) : '')
                    }}
                    className="pl-8 text-right text-xs font-mono field-input-interactive"
                  />
                </div>
              </div>

              {/* ICMS s/ frete (%) */}
              <div className="space-y-1 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-mono">ICMS s/ frete (%)</span>
                  <span
                    className="text-[10px] text-emerald-400 font-mono"
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
                    className="pr-6 text-right text-xs font-mono field-input-interactive"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* ICMS-ST recolhido */}
              <div className="space-y-1 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 sm:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-300 font-mono font-semibold">
                    ICMS-ST na Entrada (R$)
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.hasSt}
                      onChange={(e) => onUpdate(item.id, 'hasSt', e.target.checked)}
                      className="rounded bg-slate-900 border-slate-800 text-amber-500 focus:ring-amber-500/20"
                    />
                    <span className="text-[10px] font-mono text-slate-300">ST ativo no item</span>
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
                    onBlur={() => {
                      setStValFocused(false)
                      const parsed = parseBRNumber(stValInput)
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
              <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30 text-xs font-mono space-y-1.5 text-slate-300">
                <div className="flex items-center justify-between font-semibold text-emerald-400">
                  <span>Créditos Recuperáveis (Lucro Real)</span>
                  <span>Total: {formatBRL(totalItemCredits)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 pt-1">
                  <div>
                    ICMS mercadoria:{' '}
                    <strong className="text-emerald-400">{formatBRL(item.calculatedIcms)}</strong>
                  </div>
                  <div>
                    ICMS s/ frete:{' '}
                    <strong className="text-emerald-400">
                      {formatBRL(item.icmsFreightValue || 0)}
                    </strong>
                  </div>
                  <div>
                    PIS (1,65%):{' '}
                    <strong className="text-emerald-400">{formatBRL(item.calculatedPis)}</strong>
                  </div>
                  <div>
                    COFINS (7,60%):{' '}
                    <strong className="text-emerald-400">{formatBRL(item.calculatedCofins)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé do Modal com Botão Fechar / Salvar */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">
              Alterações salvas e recalculadas automaticamente em tempo real.
            </span>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 h-9 text-xs cursor-pointer shadow-md shadow-emerald-500/20"
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
