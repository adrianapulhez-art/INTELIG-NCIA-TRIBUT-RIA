import React, { useState } from 'react'
import {
  Boxes,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Layers,
  Info,
  PackageCheck,
  ChevronRight,
  Calendar,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTaxContext } from '@/contexts/TaxContext'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import { ProductStockItem } from '@/lib/productStockCalculations'

interface ProductStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ProductStockModal: React.FC<ProductStockModalProps> = ({ open, onOpenChange }) => {
  const {
    productStockState,
    addProductStockItem,
    updateProductStockItem,
    removeProductStockItem,
    addProductStockEntry,
    updateProductStockEntry,
    removeProductStockEntry,
    addProductStockExit,
    updateProductStockExit,
    removeProductStockExit,
    importPurchasesToProductStock,
    syncProductsFromMarkup,
    calculatedProductStock,
  } = useTaxContext()

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  // Novo item temporário
  const [newProductName, setNewProductName] = useState('')
  const [newProductInitialQty, setNewProductInitialQty] = useState('')
  const [newProductInitialCost, setNewProductInitialCost] = useState('')

  // Nova entrada temporária
  const [newEntryDate, setNewEntryDate] = useState('')
  const [newEntryQty, setNewEntryQty] = useState('')
  const [newEntryUnitCost, setNewEntryUnitCost] = useState('')
  const [newEntryNotes, setNewEntryNotes] = useState('')

  // Nova saída temporária
  const [newExitDate, setNewExitDate] = useState('')
  const [newExitQty, setNewExitQty] = useState('')
  const [newExitNotes, setNewExitNotes] = useState('')

  const products = productStockState.products || []
  const { positions, totals } = calculatedProductStock

  // Selecionar primeiro produto automaticamente se nenhum estiver selecionado
  const activeProductId =
    selectedProductId && products.some((p) => p.id === selectedProductId)
      ? selectedProductId
      : products[0]?.id || null

  const activeProduct = products.find((p) => p.id === activeProductId)
  const activePosition = positions.find((p) => p.id === activeProductId)

  const handleCreateProduct = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const name = newProductName.trim() || `Produto ${products.length + 1}`
    const qty = parseBRNumber(newProductInitialQty)
    const cost = parseBRNumber(newProductInitialCost)
    addProductStockItem(name, qty, cost)
    setNewProductName('')
    setNewProductInitialQty('')
    setNewProductInitialCost('')
    setFeedbackMessage(`Produto "${name}" cadastrado com sucesso.`)
    setTimeout(() => setFeedbackMessage(null), 3500)
  }

  const handleAddEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!activeProductId) return
    const q = parseBRNumber(newEntryQty)
    const u = parseBRNumber(newEntryUnitCost)
    if (q <= 0) return

    addProductStockEntry(activeProductId, {
      date: newEntryDate.trim() || undefined,
      quantity: q,
      unitCost: u,
      totalValue: Math.round(q * u * 100) / 100,
      notes: newEntryNotes.trim() || 'Entrada / Compra',
    })
    setNewEntryQty('')
    setNewEntryUnitCost('')
    setNewEntryNotes('')
    setFeedbackMessage('Entrada registrada com sucesso no CMP.')
    setTimeout(() => setFeedbackMessage(null), 3000)
  }

  const handleAddExit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!activeProductId) return
    const q = parseBRNumber(newExitQty)
    if (q <= 0) return

    addProductStockExit(activeProductId, {
      date: newExitDate.trim() || undefined,
      quantity: q,
      notes: newExitNotes.trim() || 'Saída / Venda',
    })
    setNewExitQty('')
    setNewExitNotes('')
    setFeedbackMessage('Saída registrada ao custo médio vigente.')
    setTimeout(() => setFeedbackMessage(null), 3000)
  }

  const handleImportPurchases = () => {
    const res = importPurchasesToProductStock()
    setFeedbackMessage(res.message)
    setTimeout(() => setFeedbackMessage(null), 4500)
  }

  const handleSyncMarkup = () => {
    const res = syncProductsFromMarkup()
    setFeedbackMessage(
      res.addedCount > 0
        ? `${res.addedCount} produto(s) sincronizado(s) a partir do cadastro do Markup.`
        : 'Todos os produtos do Markup já estão presentes no subsistema de estoque.',
    )
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-slate-800 p-5 sm:p-6 text-slate-100 shadow-2xl">
        <DialogHeader className="border-b border-slate-800/80 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Controle de Estoque por Produto (Kardex / Custo Médio)
                  <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 text-[10px] font-mono">
                    CMP Móvel
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Gerencie o estoque inicial, entradas e saídas de cada produto com recálculo
                  automático do Custo Médio Ponderado e CMV acumulado.
                </DialogDescription>
              </div>
            </div>

            {/* Ações Globais */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImportPurchases}
                className="h-8 text-xs bg-slate-900/90 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-400 cursor-pointer"
                title="Lança as compras cadastradas na Calculadora como entradas de estoque nos produtos correspondentes"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Importar compras da calculadora
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSyncMarkup}
                className="h-8 text-xs bg-slate-900/90 border-slate-700 text-slate-300 hover:border-orange-500/50 hover:text-orange-300 hover:bg-slate-800 cursor-pointer"
                title="Traz para cá os produtos já cadastrados na Calculadora de Markup"
              >
                <Layers className="w-3.5 h-3.5 mr-1 text-orange-400" />
                Sincronizar c/ Markup
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Notificação / Feedback */}
        {feedbackMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* TOTAIS CONSOLIDADOS DO SUBSISTEMA */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">
              Produtos Cadastrados
            </span>
            <span className="text-lg font-bold font-mono text-white">
              {totals.productsCount} {totals.productsCount === 1 ? 'produto' : 'produtos'}
            </span>
            <span className="text-[11px] text-slate-500 font-mono block">
              {totals.totalStockQty} un. em estoque
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">
              Valor do Estoque Final (CMP)
            </span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {formatBRL(totals.totalStockValue)}
            </span>
            <span className="text-[11px] text-slate-500 font-mono block">
              Soma do saldo de todos produtos
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">
              CMV Acumulado das Baixas
            </span>
            <span className="text-lg font-bold font-mono text-amber-300">
              {formatBRL(totals.totalAccumulatedCmv)}
            </span>
            <span className="text-[11px] text-slate-500 font-mono block">
              {totals.totalExitsQty} un. baixadas
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">
              Entradas Totais (Compras)
            </span>
            <span className="text-lg font-bold font-mono text-cyan-300">
              {formatBRL(totals.totalEntriesValue)}
            </span>
            <span className="text-[11px] text-slate-500 font-mono block">
              {totals.totalEntriesQty} un. compradas
            </span>
          </div>
        </div>

        {/* ALERTA GLOBAL SE HOUVER ESTOQUE NEGATIVO OU CUSTO ZERADO */}
        {totals.hasAnyNegativeStock && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Atenção: Há produto(s) com lançamentos de saída superiores ao saldo de estoque
              disponível na data da baixa. Verifique as quantidades lançadas.
            </span>
          </div>
        )}

        {totals.hasAnyZeroCostEntry && (
          <div className="mt-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs font-mono flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Nota: Há entrada(s) com custo unitário R$ 0,00 lançadas. Se for uma bonificação, o
              Custo Médio será diluído.
            </span>
          </div>
        )}

        {/* CORPO PRINCIPAL: SELETOR DE PRODUTOS + PAINEL DO PRODUTO ATIVO */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* COLUNA ESQUERDA: LISTA DE PRODUTOS */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-mono font-semibold uppercase text-slate-300">
                Produtos ({products.length})
              </span>
            </div>

            {/* Form Adicionar Novo Produto */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono font-semibold text-slate-400 block">
                + Novo Produto no Estoque
              </span>
              <div className="space-y-1.5">
                <Input
                  type="text"
                  placeholder="Nome do produto"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="h-8 text-xs field-input-interactive"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Qtd inicial"
                    value={newProductInitialQty}
                    onChange={(e) => setNewProductInitialQty(e.target.value)}
                    className="h-8 text-xs text-right font-mono field-input-interactive"
                  />
                  <Input
                    type="text"
                    placeholder="Custo inicial (R$)"
                    value={newProductInitialCost}
                    onChange={(e) => setNewProductInitialCost(e.target.value)}
                    className="h-8 text-xs text-right font-mono field-input-interactive"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateProduct}
                  className="w-full h-7 text-xs bg-orange-600 hover:bg-orange-500 text-white font-mono cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Cadastrar produto
                </Button>
              </div>
            </div>

            {/* Lista dos Produtos Existentes */}
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {products.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl p-4">
                  Nenhum produto cadastrado ainda. Importe da Calculadora, sincronize com o Markup
                  ou cadastre acima.
                </div>
              ) : (
                products.map((prod) => {
                  const pos = positions.find((p) => p.id === prod.id)
                  const isSelected = prod.id === activeProductId
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedProductId(prod.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500/60 ring-1 ring-orange-500/40 shadow-sm'
                          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-100 block truncate">
                            {prod.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                            <span>
                              Saldo:{' '}
                              <strong className="text-slate-200">
                                {pos?.currentStockQty ?? 0} un.
                              </strong>
                            </span>
                            <span>·</span>
                            <span>
                              CMP:{' '}
                              <strong className="text-emerald-400">
                                {formatBRL(pos?.currentAverageCost ?? 0)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {pos?.isStockNegativeOrExceeded && (
                            <span title="Saída excede o saldo" className="text-xs text-amber-400">
                              ⚠️
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Remover o produto "${prod.name}" do estoque?`)) {
                                removeProductStockItem(prod.id)
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Remover produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: DETALHE DO PRODUTO ATIVO (KARDEX / EXTRATO / LANÇAMENTOS) */}
          <div className="lg:col-span-8 space-y-4">
            {!activeProduct ? (
              <div className="text-center py-16 text-sm font-mono text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                Selecione ou cadastre um produto para visualizar o extrato e lançar movimentações.
              </div>
            ) : (
              <>
                {/* Header do Produto Ativo com Estatísticas */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={activeProduct.name}
                          onChange={(e) =>
                            updateProductStockItem(activeProduct.id, { name: e.target.value })
                          }
                          className="h-8 text-sm font-bold text-white max-w-sm field-input-interactive"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Extrato cronológico com recálculo móvel do Custo Médio Ponderado
                      </span>
                    </div>

                    {/* Resumo Rápido da Posição */}
                    <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">
                          Estoque Atual
                        </span>
                        <strong className="text-white text-sm">
                          {activePosition?.currentStockQty ?? 0} un.
                        </strong>
                      </div>
                      <div className="w-px h-6 bg-slate-800" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">
                          Custo Médio Vigente
                        </span>
                        <strong className="text-emerald-400 text-sm">
                          {formatBRL(activePosition?.currentAverageCost ?? 0)}
                        </strong>
                      </div>
                      <div className="w-px h-6 bg-slate-800" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">
                          Valor Total Estoque
                        </span>
                        <strong className="text-amber-300 text-sm">
                          {formatBRL(activePosition?.currentStockValue ?? 0)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Edição Rápida do Estoque Inicial do Produto */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <span className="text-slate-300 font-semibold">
                      Estoque Inicial do Produto:
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Quantidade:</span>
                        <Input
                          type="number"
                          min="0"
                          defaultValue={
                            activeProduct.initial?.quantity > 0
                              ? String(activeProduct.initial.quantity)
                              : ''
                          }
                          key={`init-qty-${activeProduct.id}-${activeProduct.initial?.quantity}`}
                          onBlur={(e) => {
                            const val = parseBRNumber(e.target.value)
                            updateProductStockItem(activeProduct.id, {
                              initial: {
                                quantity: val,
                                unitCost: activeProduct.initial?.unitCost || 0,
                              },
                            })
                            e.target.value = val > 0 ? String(val) : ''
                          }}
                          placeholder="0"
                          className="w-20 h-7 text-right text-xs field-input-interactive"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Custo unitário:</span>
                        <Input
                          type="text"
                          defaultValue={
                            activeProduct.initial?.unitCost > 0
                              ? formatNumberBR(activeProduct.initial.unitCost)
                              : ''
                          }
                          key={`init-cost-${activeProduct.id}-${activeProduct.initial?.unitCost}`}
                          onBlur={(e) => {
                            const val = parseBRNumber(e.target.value)
                            updateProductStockItem(activeProduct.id, {
                              initial: {
                                quantity: activeProduct.initial?.quantity || 0,
                                unitCost: val,
                              },
                            })
                            e.target.value = val > 0 ? formatNumberBR(val) : ''
                          }}
                          placeholder="0,00"
                          className="w-24 h-7 text-right text-xs field-input-interactive"
                        />
                      </div>
                      <span className="text-slate-500 text-[11px]">
                        = {formatBRL(activePosition?.initialTotalValue ?? 0)}
                      </span>
                    </div>
                  </div>

                  {activePosition?.isStockNegativeOrExceeded && (
                    <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        Alerta de Saldo: Este produto teve saída maior que o saldo disponível na
                        data ({activePosition.exceededQty} un. além do saldo).
                      </span>
                    </div>
                  )}
                </div>

                {/* Formulários de Lançamento: Nova Entrada vs Nova Saída */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ENTRADA (COMPRA) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/30 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono">
                      <ArrowDownRight className="w-4 h-4" />
                      <span>+ Lançar Entrada (Compra)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-1">
                            Data (opcional)
                          </label>
                          <Input
                            type="date"
                            value={newEntryDate}
                            onChange={(e) => setNewEntryDate(e.target.value)}
                            className="h-8 text-xs font-mono field-input-interactive"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-1">
                            Qtd Comprada *
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Ex: 30"
                            value={newEntryQty}
                            onChange={(e) => setNewEntryQty(e.target.value)}
                            className="h-8 text-xs text-right font-mono field-input-interactive"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-1">
                            Custo Unitário (R$)
                          </label>
                          <Input
                            type="text"
                            placeholder="0,00"
                            value={newEntryUnitCost}
                            onChange={(e) => setNewEntryUnitCost(e.target.value)}
                            className="h-8 text-xs text-right font-mono field-input-interactive"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-1">
                            NF / Obs. (opcional)
                          </label>
                          <Input
                            type="text"
                            placeholder="NF 1234"
                            value={newEntryNotes}
                            onChange={(e) => setNewEntryNotes(e.target.value)}
                            className="h-8 text-xs field-input-interactive"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddEntry}
                        className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-mono cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Registrar Entrada no CMP
                      </Button>
                    </div>
                  </div>

                  {/* SAÍDA (VENDA) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-amber-500/30 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>- Lançar Saída (Venda / Baixa)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-1">
                            Data (opcional)
                          </label>
                          <Input
                            type="date"
                            value={newExitDate}
                            onChange={(e) => setNewExitDate(e.target.value)}
                            className="h-8 text-xs font-mono field-input-interactive"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-1">
                            Qtd Vendida *
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Ex: 22"
                            value={newExitQty}
                            onChange={(e) => setNewExitQty(e.target.value)}
                            className="h-8 text-xs text-right font-mono field-input-interactive"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-mono block mb-1">
                          Pedido / Cliente / Obs. (opcional)
                        </label>
                        <Input
                          type="text"
                          placeholder="Pedido #01 ou Venda Balcão"
                          value={newExitNotes}
                          onChange={(e) => setNewExitNotes(e.target.value)}
                          className="h-8 text-xs field-input-interactive"
                        />
                      </div>

                      <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                        <span>Custo da baixa:</span>
                        <span className="text-amber-300 font-semibold">
                          CMP vigente ({formatBRL(activePosition?.currentAverageCost ?? 0)})
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddExit}
                        className="w-full h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-mono cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Registrar Saída (Baixar Estoque)
                      </Button>
                    </div>
                  </div>
                </div>

                {/* EXTRATO CRONOLÓGICO (KARDEX / CMP MÓVEL) */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase text-slate-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-400" />
                      Ficha Kardex / Extrato de Movimentações (
                      {activePosition?.historyLedger.length ?? 0})
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Cálculo rigoroso: (Estoque Atual + Entrada) ÷ (Qtd Atual + Qtd Entrada)
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">Tipo / Data</th>
                          <th className="py-2 px-2.5">Descrição</th>
                          <th className="py-2 px-2.5 text-right">Qtd</th>
                          <th className="py-2 px-2.5 text-right">Custo Un.</th>
                          <th className="py-2 px-2.5 text-right">Total</th>
                          <th className="py-2 px-2.5 text-right bg-slate-900/50">Saldo Qtd</th>
                          <th className="py-2 px-2.5 text-right bg-slate-900/50">Novo CMP</th>
                          <th className="py-2 px-2.5 text-right bg-slate-900/50">Saldo R$</th>
                          <th className="py-2 px-2 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {!activePosition || activePosition.historyLedger.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-6 text-center text-slate-500">
                              Nenhuma movimentação registrada para este produto.
                            </td>
                          </tr>
                        ) : (
                          activePosition.historyLedger.map((row, idx) => {
                            const isEntry = row.type === 'entry'
                            const isExit = row.type === 'exit'
                            const isInitial = row.type === 'initial'

                            return (
                              <tr
                                key={row.id || `row-${idx}`}
                                className={`hover:bg-slate-900/50 transition-colors ${
                                  row.isExceeded ? 'bg-amber-500/10' : ''
                                }`}
                              >
                                <td className="py-2 px-2.5 whitespace-nowrap">
                                  {isInitial && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                                      INICIAL
                                    </span>
                                  )}
                                  {isEntry && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                                      ENTRADA
                                    </span>
                                  )}
                                  {isExit && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                                      SAÍDA
                                    </span>
                                  )}
                                  {row.date && (
                                    <span className="ml-1.5 text-slate-400 text-[10px]">
                                      {row.date}
                                    </span>
                                  )}
                                </td>
                                <td
                                  className="py-2 px-2.5 text-slate-300 max-w-[140px] truncate"
                                  title={row.description}
                                >
                                  {row.description}
                                  {row.isExceeded && (
                                    <span className="text-[10px] text-amber-400 block">
                                      ⚠️ Excedeu saldo
                                    </span>
                                  )}
                                </td>
                                <td
                                  className={`py-2 px-2.5 text-right font-semibold ${
                                    isExit ? 'text-amber-300' : 'text-emerald-300'
                                  }`}
                                >
                                  {isExit ? `-${row.quantity}` : `+${row.quantity}`}
                                </td>
                                <td className="py-2 px-2.5 text-right text-slate-300">
                                  {formatBRL(row.unitCost)}
                                </td>
                                <td className="py-2 px-2.5 text-right text-slate-300">
                                  {formatBRL(row.totalValue)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-bold text-white bg-slate-900/40">
                                  {row.stockBalanceQty} un.
                                </td>
                                <td className="py-2 px-2.5 text-right font-semibold text-emerald-400 bg-slate-900/40">
                                  {formatBRL(row.averageCostAfter)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-bold text-amber-300 bg-slate-900/40">
                                  {formatBRL(row.stockBalanceValue)}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {isEntry && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeProductStockEntry(activeProduct.id, row.id)
                                      }
                                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                      title="Remover entrada"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {isExit && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeProductStockExit(activeProduct.id, row.id)
                                      }
                                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                      title="Remover saída"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
