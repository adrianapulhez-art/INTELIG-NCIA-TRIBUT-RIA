import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Boxes,
  CheckCircle2,
  ChevronRight,
  Download,
  Package,
  Search,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import { PurchaseItem, TaxRegime, useTaxContext } from '@/contexts/TaxContext'
import {
  formatBRL,
  calculatePurchaseItemGrossTotal,
  calculatePurchaseItemNetPurchases,
} from '@/lib/taxCalculations'

interface ImportPurchasesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportPurchasesModal({ open, onOpenChange }: ImportPurchasesModalProps) {
  const {
    purchasesItems,
    markupProducts,
    regime,
    importPurchaseItemToMarkup,
    importAllPurchasesToMarkup,
  } = useTaxContext()

  const [searchTerm, setSearchTerm] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string
    type: 'success' | 'info' | 'error'
  } | null>(null)

  // Filtragem de busca
  const filteredPurchases = purchasesItems.filter((item) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const nameMatch = (item.name || '').toLowerCase().includes(term)
    return nameMatch
  })

  // Helper para verificar se um item de compra já foi importado no Markup
  const getItemStatus = (item: PurchaseItem) => {
    const itemName = (item.name || '').trim().toLowerCase()
    const matched = markupProducts.find(
      (p) =>
        p.purchaseItemId === item.id ||
        (itemName.length > 0 && p.name.trim().toLowerCase() === itemName),
    )
    return {
      isImported: Boolean(matched),
      matchedProduct: matched,
    }
  }

  const alreadyImportedCount = purchasesItems.filter((it) => getItemStatus(it).isImported).length
  const totalAvailableCount = purchasesItems.length
  const pendingCount = totalAvailableCount - alreadyImportedCount

  const handleImportSingle = (item: PurchaseItem) => {
    const res = importPurchaseItemToMarkup(item)
    if (res.success) {
      setFeedbackMessage({ text: res.message, type: 'success' })
    } else if (res.alreadyImported) {
      setFeedbackMessage({ text: res.message, type: 'info' })
    } else {
      setFeedbackMessage({ text: res.message, type: 'error' })
    }
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  const handleImportAll = () => {
    const res = importAllPurchasesToMarkup()
    if (res.importedCount > 0) {
      setFeedbackMessage({ text: res.message, type: 'success' })
    } else {
      setFeedbackMessage({ text: res.message, type: 'info' })
    }
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 p-6 text-slate-900 shadow-xl">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Itens da Calculadora de Compras (CMV)</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono">
                    {totalAvailableCount} {totalAvailableCount === 1 ? 'item' : 'itens'}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Selecione os itens de compra para calcular o markup. O custo de aquisição é
                  preenchido automaticamente com o custo líquido do regime ativo (
                  <strong className="text-emerald-700 uppercase">{regime}</strong>).
                </DialogDescription>
              </div>
            </div>

            {/* Botão de Importar Todos */}
            {pendingCount > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleImportAll}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Importar todos ({pendingCount})
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Feedback visual de ações */}
        {feedbackMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : feedbackMessage.type === 'info'
                  ? 'bg-sky-50 border border-sky-200 text-sky-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Barra de Busca e Resumo de Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar item pelo nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-8 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 field-input-interactive"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Já importados:</span>
              <strong className="text-emerald-700">{alreadyImportedCount}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Disponíveis:</span>
              <strong className="text-amber-700">{pendingCount}</strong>
            </span>
          </div>
        </div>

        {/* Lista de Itens de Compra */}
        <div className="space-y-2 pt-2">
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
              <Package className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-mono text-slate-500">
                {searchTerm
                  ? 'Nenhum item de compra encontrado com o termo digitado.'
                  : 'Nenhum item cadastrado na Calculadora de Compras.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-xs font-semibold text-white">
                      <th className="py-3 px-3.5 w-12 text-center rounded-tl-xl">#</th>
                      <th className="py-3 px-3.5">Nome do Item</th>
                      <th className="py-3 px-3.5 text-right">Qtd Comprada</th>
                      <th className="py-3 px-3.5 text-right">Preço Unitário</th>
                      <th className="py-3 px-3.5 text-right">Preço Total</th>
                      <th className="py-3 px-3.5 text-right">
                        Custo Líquido ({regime.toUpperCase()})
                      </th>
                      <th className="py-3 px-3.5 text-center w-36 rounded-tr-xl">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPurchases.map((item, idx) => {
                      const { isImported, matchedProduct } = getItemStatus(item)
                      const itemGrossTotal = calculatePurchaseItemGrossTotal(item)
                      const itemNetPurchases = calculatePurchaseItemNetPurchases(
                        item,
                        regime as TaxRegime,
                      )
                      const qty = Math.max(0, item.quantity || 0)
                      const unitNetCost =
                        qty > 0 && itemNetPurchases > 0
                          ? itemNetPurchases / qty
                          : item.unitPrice || 0

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isImported
                              ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* # badge escuro chancelado */}
                          <td className="py-3 px-3.5 text-center text-white font-bold text-xs">
                            <span className="w-5 h-5 rounded bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] border border-slate-700 inline-flex items-center justify-center text-white font-semibold text-[10px] shadow-sm">
                              {idx + 1}
                            </span>
                          </td>

                          {/* Nome */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-sans font-semibold text-slate-900">
                                {item.name || `Item ${idx + 1}`}
                              </span>
                              {isImported && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1.5 py-0 font-normal">
                                  Já no Markup
                                </Badge>
                              )}
                              {item.hasSt && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1.5 py-0 font-normal">
                                  ST
                                </Badge>
                              )}
                            </div>
                            {isImported && matchedProduct && (
                              <span className="text-[10px] text-slate-500 block">
                                Vinculado como: {matchedProduct.name}
                              </span>
                            )}
                          </td>

                          {/* Quantidade */}
                          <td className="py-3 px-3.5 text-right font-medium text-slate-700">
                            {qty} <span className="text-slate-400 text-[11px]">un.</span>
                          </td>

                          {/* Preço Unitário */}
                          <td className="py-3 px-3.5 text-right text-slate-600">
                            {formatBRL(
                              item.unitPrice || (qty > 0 ? item.merchandiseValue / qty : 0),
                            )}
                          </td>

                          {/* Preço Total */}
                          <td className="py-3 px-3.5 text-right font-semibold text-slate-900">
                            {formatBRL(itemGrossTotal)}
                          </td>

                          {/* Custo Líquido Unitário (Regime Ativo) */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-emerald-700">
                                {formatBRL(unitNetCost)} / un.
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Total: {formatBRL(itemNetPurchases)}
                              </span>
                            </div>
                          </td>

                          {/* Botão de Importar / Status */}
                          <td className="py-3 px-3.5 text-center">
                            {isImported ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Importado</span>
                              </span>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleImportSingle(item)}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm cursor-pointer px-2.5"
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                <span>Calcular Markup</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé informativo */}
        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-slate-600">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Ao selecionar, o item entra no Markup no modo <strong>Custo + Margem</strong> com o
              custo unitário líquido preenchido.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
