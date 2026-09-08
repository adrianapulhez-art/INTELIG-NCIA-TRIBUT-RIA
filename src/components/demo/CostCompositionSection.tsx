import React, { useMemo } from 'react'
import { Plus, Trash2, Layers, DollarSign, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CostComposition, CostCompositionItem, useTaxContext } from '@/contexts/TaxContext'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'

interface CostCompositionSectionProps {
  productId: string
  productName: string
  composition?: CostComposition
  onApplyTotal?: (total: number) => void
}

interface CostGroupConfig {
  key: 'directCosts' | 'indirectCosts' | 'fixedCosts'
  title: string
  subtitle: string
  buttonLabel: string
  defaultDesc: string
  placeholderDesc: string
}

const GROUPS_CONFIG: CostGroupConfig[] = [
  {
    key: 'directCosts',
    title: 'Custos diretos',
    subtitle: 'Matéria-prima, mercadoria, embalagem, frete de aquisição, insumos produtivos',
    buttonLabel: '+ Adicionar custo direto',
    defaultDesc: 'Matéria-prima',
    placeholderDesc: 'Ex.: Matéria-prima, embalagem, frete de compra',
  },
  {
    key: 'indirectCosts',
    title: 'Custos indiretos',
    subtitle: 'Aluguel rateado, energia elétrica, telecomunicações, software operacional',
    buttonLabel: '+ Adicionar custo indireto',
    defaultDesc: 'Aluguel rateado',
    placeholderDesc: 'Ex.: Aluguel rateado, energia, software',
  },
  {
    key: 'fixedCosts',
    title: 'Custos fixos',
    subtitle: 'Folha de salários, pró-labore, honorários contábeis, encargos e estrutura',
    buttonLabel: '+ Adicionar custo fixo',
    defaultDesc: 'Folha de salários',
    placeholderDesc: 'Ex.: Folha de pagamento, honorários contábeis, pró-labore',
  },
]

interface CostItemRowProps {
  item: CostCompositionItem
  placeholder: string
  onUpdateDesc: (val: string) => void
  onUpdateVal: (val: number) => void
  onRemove: () => void
}

function CostItemRow({ item, placeholder, onUpdateDesc, onUpdateVal, onRemove }: CostItemRowProps) {
  const [valText, setValText] = React.useState<string>(
    item.value > 0 ? formatNumberBR(item.value) : '',
  )

  React.useEffect(() => {
    setValText(item.value > 0 ? formatNumberBR(item.value) : '')
  }, [item.value])

  return (
    <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 transition-colors hover:border-slate-700/80">
      <Input
        type="text"
        value={item.description}
        onChange={(e) => onUpdateDesc(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-slate-950/70 border-slate-800 text-xs font-mono text-slate-200 h-8 focus:border-emerald-500"
      />
      <div className="relative w-32 sm:w-40 shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
          R$
        </span>
        <Input
          type="text"
          value={valText}
          placeholder="0,00"
          onChange={(e) => {
            const raw = e.target.value
            setValText(raw)
            onUpdateVal(parseBRNumber(raw))
          }}
          onBlur={(e) => {
            const num = parseBRNumber(e.target.value)
            setValText(num > 0 ? formatNumberBR(num) : '')
            onUpdateVal(num)
          }}
          className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono text-slate-100 h-8 focus:border-emerald-500"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-md hover:bg-rose-500/10 cursor-pointer shrink-0"
        title="Remover linha"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export function CostCompositionSection({
  productId,
  productName,
  composition,
  onApplyTotal,
}: CostCompositionSectionProps) {
  const {
    addCostCompositionItem,
    updateCostCompositionItem,
    removeCostCompositionItem,
    clearCostComposition,
  } = useTaxContext()

  const safeComp = useMemo<CostComposition>(() => {
    return {
      directCosts: composition?.directCosts || [],
      indirectCosts: composition?.indirectCosts || [],
      fixedCosts: composition?.fixedCosts || [],
    }
  }, [composition])

  const subtotalDirect = useMemo(() => {
    return safeComp.directCosts.reduce((acc, it) => acc + (it.value || 0), 0)
  }, [safeComp.directCosts])

  const subtotalIndirect = useMemo(() => {
    return safeComp.indirectCosts.reduce((acc, it) => acc + (it.value || 0), 0)
  }, [safeComp.indirectCosts])

  const subtotalFixed = useMemo(() => {
    return safeComp.fixedCosts.reduce((acc, it) => acc + (it.value || 0), 0)
  }, [safeComp.fixedCosts])

  const grandTotal = useMemo(() => {
    return Math.round((subtotalDirect + subtotalIndirect + subtotalFixed) * 100) / 100
  }, [subtotalDirect, subtotalIndirect, subtotalFixed])

  const totalItemsCount =
    safeComp.directCosts.length + safeComp.indirectCosts.length + safeComp.fixedCosts.length

  const subtotalsMap: Record<'directCosts' | 'indirectCosts' | 'fixedCosts', number> = {
    directCosts: subtotalDirect,
    indirectCosts: subtotalIndirect,
    fixedCosts: subtotalFixed,
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header do Subsistema */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                Subsistema de Composição do Custo
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono h-5 px-1.5">
                {productName || 'Produto'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Alimente custos diretos, indiretos e fixos. O custo total do produto é somado e
              sincronizado automaticamente com o cálculo de markup.
            </p>
          </div>
        </div>

        {totalItemsCount > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => clearCostComposition(productId)}
              className="h-7 text-[11px] font-mono text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
            >
              Limpar composição
            </Button>
          </div>
        )}
      </div>

      {/* 3 Grupos de Custos */}
      <div className="grid grid-cols-1 gap-3">
        {GROUPS_CONFIG.map((group) => {
          const items = safeComp[group.key]
          const subtotal = subtotalsMap[group.key]

          return (
            <div
              key={group.key}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2.5 transition-colors hover:border-slate-700/60"
            >
              {/* Topo do Grupo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">{group.title}</span>
                    <Badge className="bg-slate-900 text-slate-400 border-slate-700 text-[10px] font-mono h-4 px-1.5">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">{group.subtitle}</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className="text-[11px] font-mono text-slate-400">
                    Subtotal:{' '}
                    <span className="font-bold text-slate-200">{formatBRL(subtotal)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addCostCompositionItem(productId, group.key, group.defaultDesc, 0)
                    }
                    className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {group.buttonLabel}
                  </Button>
                </div>
              </div>

              {/* Lista de Itens do Grupo */}
              {items.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {items.map((item) => (
                    <CostItemRow
                      key={item.id}
                      item={item}
                      placeholder={group.placeholderDesc}
                      onUpdateDesc={(desc) =>
                        updateCostCompositionItem(
                          productId,
                          group.key,
                          item.id,
                          'description',
                          desc,
                        )
                      }
                      onUpdateVal={(val) =>
                        updateCostCompositionItem(productId, group.key, item.id, 'value', val)
                      }
                      onRemove={() => removeCostCompositionItem(productId, group.key, item.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-2 px-3 rounded-lg border border-dashed border-slate-800/80 text-[11px] font-mono text-slate-500 text-center bg-slate-950/30">
                  Nenhum item adicionado neste grupo. Clique em "{group.buttonLabel}" para inserir.
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Custo Total do Produto (Soma dos 3 grupos em Destaque Verde) */}
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wide text-emerald-400">
              Custo total do produto (Composição)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Soma: Diretos + Indiretos + Fixos
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>Diretos: {formatBRL(subtotalDirect)}</span>
            <span>·</span>
            <span>Indiretos: {formatBRL(subtotalIndirect)}</span>
            <span>·</span>
            <span>Fixos: {formatBRL(subtotalFixed)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right">
            <span className="text-[10px] text-emerald-400/80 font-mono block">
              Total consolidado do item
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {formatBRL(grandTotal)}
            </span>
          </div>
          {onApplyTotal && (
            <Button
              type="button"
              size="sm"
              onClick={() => onApplyTotal(grandTotal)}
              className="h-8 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 cursor-pointer"
            >
              Aplicar ao custo
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
