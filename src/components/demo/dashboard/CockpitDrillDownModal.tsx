import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'
import { Layers, ShoppingBag, Tag, Calculator } from 'lucide-react'

export interface ProductDrillItem {
  id: string
  name: string
  mode: 'liquid' | 'cost_margin'
  quantity: number
  unitCost: number
  totalCost: number
  unitSalePrice: number
  totalRevenue: number
  cmvPresumido: number
  cmvReal: number
  cmvSimples: number
}

export interface CockpitDrillDownModalProps {
  isOpen: boolean
  onClose: () => void
  drillTarget: 'cmv' | 'despesas' | 'receitas' | null
  products: ProductDrillItem[]
  onSelectProduct?: (productId: string) => void
}

export const CockpitDrillDownModal: React.FC<CockpitDrillDownModalProps> = ({
  isOpen,
  onClose,
  drillTarget,
  products,
  onSelectProduct,
}) => {
  const getTitle = () => {
    switch (drillTarget) {
      case 'cmv':
        return 'Detalhamento Analítico: Custo das Mercadorias por Produto'
      case 'despesas':
        return 'Detalhamento Analítico: Despesas e Custos por Produto'
      default:
        return 'Detalhamento Analítico por Produto'
    }
  }

  const getDescription = () => {
    switch (drillTarget) {
      case 'cmv':
        return 'Confronto direto do CMV unitário e consolidado de cada item nos três regimes tributários, apurado pelo contexto canônico.'
      case 'despesas':
        return 'Distribuição dos custos de aquisição e bases de despesa por produto cadastrado.'
      default:
        return 'Visualização desagregada item por item dos dados canônicos apurados.'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-[#090518] border border-purple-500/30 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white font-sans">
                {getTitle()}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-mono mt-0.5">
                {getDescription()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 pt-2">
          {products.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-mono text-xs">
              Nenhum produto individual identificado no contexto ativo.
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {products.map((prod, idx) => (
                <div
                  key={prod.id || idx}
                  onClick={() => onSelectProduct && onSelectProduct(prod.id)}
                  className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-orange-500/40 transition-all cursor-pointer group"
                  title="Clique para selecionar este produto no Donut de Custo"
                >
                  {' '}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-orange-400" />
                      <span className="font-bold text-sm text-slate-100">{prod.name}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-orange-500/30 text-orange-300 bg-orange-500/10"
                      >
                        {prod.mode === 'liquid' ? 'Preço Líquido' : 'Custo + Margem'}
                      </Badge>
                    </div>
                    <div className="text-slate-400 text-xs">
                      Quantidade:{' '}
                      <strong className="text-white font-bold">{prod.quantity} un.</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div className="p-2 rounded-lg bg-black/30">
                      <span className="text-slate-400 block text-[10px]">Custo Unitário Base:</span>
                      <span className="font-bold text-slate-200 mt-0.5 block">
                        {formatBRL(prod.unitCost)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/30">
                      <span className="text-slate-400 block text-[10px]">
                        CMV Unit. (Presumido):
                      </span>
                      <span className="font-bold text-orange-400 mt-0.5 block">
                        {formatBRL(prod.cmvPresumido)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/30">
                      <span className="text-slate-400 block text-[10px]">
                        CMV Unit. (Real c/ créd.):
                      </span>
                      <span className="font-bold text-sky-400 mt-0.5 block">
                        {formatBRL(prod.cmvReal)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/30">
                      <span className="text-slate-400 block text-[10px]">
                        CMV Unit. (Simples s/ créd.):
                      </span>
                      <span className="font-bold text-emerald-400 mt-0.5 block">
                        {formatBRL(prod.cmvSimples)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>
                      Faturamento Projetado:{' '}
                      <strong className="text-white">{formatBRL(prod.totalRevenue)}</strong>
                    </span>
                    <span>
                      Custo Total Consolidado:{' '}
                      <strong className="text-slate-200">{formatBRL(prod.totalCost)}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Fonte: Motor canônico das DREs (useTaxContext)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors font-semibold cursor-pointer"
          >
            Fechar Detalhamento
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
