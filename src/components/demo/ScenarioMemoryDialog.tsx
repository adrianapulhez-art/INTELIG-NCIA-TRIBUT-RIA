import React from 'react'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PurchaseItem } from '@/contexts/TaxContext'
import {
  formatBRL,
  formatNumberBR,
  calculatePurchaseItemGrossTotal,
  calculatePurchaseItemNetPurchases,
} from '@/lib/taxCalculations'
import { EXPENSE_CATEGORY_LABELS, REVENUE_CATEGORY_LABELS } from '@/data/operatingPresets'

/** Item de despesa/receita operacional no snapshot (estrutura do TaxContext). */
interface OperatingItemSnapshot {
  id?: string
  description?: string
  value?: number
  category?: string
}

/**
 * MODAL DE MEMÓRIA DE CÁLCULO DO SALVAMENTO (CEO, 02/10).
 * Compartilhado entre o SaveScenarioModal (matriz/histórico) e o Depósito de
 * Cenários da página Clientes — mesma memória, mesma fonte (snapshot gravado).
 * Read-only: para editar, restaura o salvamento.
 */
export interface ScenarioMemorySource {
  /** Nome exibido no título (cenário + versão quando houver). */
  name: string
  /** Escopo do cenário (badge do cabeçalho). */
  scope?: string
  /** Snapshot gravado (da versão, quando inspeção de vN; do registro, quando atual). */
  snapshot?: Record<string, unknown> | null
  /** Data ISO do salvamento (versão ou registro). */
  savedAt?: string
}

interface ScenarioMemoryDialogProps {
  /** Linha em inspeção — null fecha o modal. */
  source: ScenarioMemorySource | null
  onClose: () => void
  /** Escopo de fallback quando o snapshot não traz regime. */
  fallbackScope?: string
}

const formatDate = (isoString?: string) => {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

export const ScenarioMemoryDialog: React.FC<ScenarioMemoryDialogProps> = ({
  source,
  onClose,
  fallbackScope,
}) => {
  const snap = (source?.snapshot || null) as
    | (Record<string, unknown> & {
        purchasesItems?: PurchaseItem[]
        operatingExpenses?: OperatingItemSnapshot[]
        operatingRevenues?: OperatingItemSnapshot[]
        regime?: string
      })
    | null
  const items: PurchaseItem[] = snap?.purchasesItems || []
  const regimeMem = (snap?.regime || fallbackScope || 'presumido') as
    | 'presumido'
    | 'real'
    | 'simples'
  const regimeLabel =
    regimeMem === 'presumido'
      ? 'Lucro Presumido'
      : regimeMem === 'real'
        ? 'Lucro Real'
        : 'Simples Nacional'
  const scopeLabel = (
    source?.scope === 'compras' ? 'Compras' : source?.scope === 'markup' ? 'Markup' : 'Despesas'
  ).toUpperCase()

  // CEO 02/10: ramo DESPESAS/RECEITAS — o snapshot grava o contexto inteiro, então o
  // modal escolhe a memória pelo ESCOPO do cenário (nunca mostrar compras num cenário
  // de despesas).
  const isExpensesScope = source?.scope === 'despesas-operacionais'
  const expenseItems: OperatingItemSnapshot[] = snap?.operatingExpenses || []
  const revenueItems: OperatingItemSnapshot[] = snap?.operatingRevenues || []
  const totalExpenses = expenseItems.reduce((acc, it) => acc + (it.value || 0), 0)
  const totalRevenues = revenueItems.reduce((acc, it) => acc + (it.value || 0), 0)
  const expCatLabel = (cat?: string) =>
    EXPENSE_CATEGORY_LABELS[(cat as keyof typeof EXPENSE_CATEGORY_LABELS) || 'administrativas']
      ?.label || 'Despesas Administrativas'
  const revCatLabel = (cat?: string) =>
    REVENUE_CATEGORY_LABELS[(cat as keyof typeof REVENUE_CATEGORY_LABELS) || 'outras']?.label ||
    'Outras Receitas Operacionais'

  return (
    <Dialog open={Boolean(source)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#07130f] border border-sky-500/40 text-slate-100 shadow-2xl p-5 sm:p-6">
        <DialogHeader className="border-b border-sky-500/20 pb-3">
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span>Memória de Cálculo — {source?.name}</span>
            </DialogTitle>
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono shrink-0">
              {scopeLabel}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Foto fiscal do salvamento de {source ? formatDate(source.savedAt) : ''} — calculada a
            partir do snapshot gravado, sem tocar no estado atual das telas.
          </DialogDescription>
        </DialogHeader>

        {isExpensesScope ? (
          /* ============================================================ */
          /* MEMÓRIA DE DESPESAS/RECEITAS OPERACIONAIS (CEO, 02/10)        */
          /* ============================================================ */
          expenseItems.length === 0 && revenueItems.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-mono">
                Este salvamento não contém despesas nem receitas no snapshot.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {/* Despesas Operacionais */}
              {expenseItems.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      Despesas Operacionais
                    </span>
                    <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-mono">
                      {expenseItems.length} lançamento(s)
                    </Badge>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {expenseItems.map((it, idx) => (
                      <div key={it.id || idx} className="flex items-center justify-between">
                        <span className="text-rose-400">
                          (−) {it.description || `Despesa ${idx + 1}`}{' '}
                          <span className="text-slate-500 text-[10px]">
                            ({expCatLabel(it.category)})
                          </span>
                        </span>
                        <span className="text-rose-400 font-semibold">
                          -{formatBRL(it.value || 0)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-400">(=) Total de Despesas:</span>
                      <span className="font-bold text-rose-400 text-sm">
                        {formatBRL(totalExpenses)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Receitas Operacionais */}
              {revenueItems.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Receitas Operacionais
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                      {revenueItems.length} lançamento(s)
                    </Badge>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {revenueItems.map((it, idx) => (
                      <div key={it.id || idx} className="flex items-center justify-between">
                        <span className="text-emerald-400">
                          (+) {it.description || `Receita ${idx + 1}`}{' '}
                          <span className="text-slate-500 text-[10px]">
                            ({revCatLabel(it.category)})
                          </span>
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          +{formatBRL(it.value || 0)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400">(=) Total de Receitas:</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {formatBRL(totalRevenues)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Resultado do período no snapshot */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 font-mono">
                  Resultado (Receitas − Despesas):
                </span>
                <span
                  className={`text-sm font-bold font-mono ${
                    totalRevenues - totalExpenses >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatBRL(totalRevenues - totalExpenses)}
                </span>
              </div>
            </div>
          )
        ) : items.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-mono">
              Este salvamento não contém itens de compra no snapshot.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {items.map((it, idx) => {
              const gross = calculatePurchaseItemGrossTotal(it)
              const net = calculatePurchaseItemNetPurchases(it, regimeMem)
              const qty = Math.max(0, it.quantity || 0)
              const unit = qty > 0 ? gross / qty : 0
              const freight = Math.max(0, it.freightValue || 0)
              const icmsMerc = Math.max(0, it.calculatedIcms || 0)
              const icmsFreight = Math.max(0, it.icmsFreightValue || 0)
              const pis = Math.max(0, it.calculatedPis || 0)
              const cofins = Math.max(0, it.calculatedCofins || 0)
              const ipi = Math.max(0, it.calculatedIpi || 0)
              const st = it.hasSt ? Math.max(0, it.stValue || 0) : 0

              return (
                <div
                  key={it.id || idx}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      {it.name || `Item ${idx + 1}`}
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                      {regimeLabel}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400">
                        (+) Mercadorias ({formatNumberBR(qty, 0)} un. × {formatBRL(unit)})
                      </span>
                      <span className="text-slate-100 font-semibold">{formatBRL(gross)}</span>
                    </div>
                    {freight > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400">(+) Frete sobre compras</span>
                        <span className="text-slate-100 font-semibold">{formatBRL(freight)}</span>
                      </div>
                    )}
                    {ipi > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400">(+) IPI não recuperável</span>
                        <span className="text-slate-100 font-semibold">{formatBRL(ipi)}</span>
                      </div>
                    )}
                    {st > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400">(+) ICMS-ST na entrada</span>
                        <span className="text-slate-100 font-semibold">{formatBRL(st)}</span>
                      </div>
                    )}
                    {regimeMem !== 'simples' && icmsMerc > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-rose-400">
                          (−) ICMS sobre mercadorias ({formatNumberBR(it.icmsRate || 0, 2)}% ×{' '}
                          {formatBRL(gross)})
                        </span>
                        <span className="text-rose-400 font-semibold">-{formatBRL(icmsMerc)}</span>
                      </div>
                    )}
                    {regimeMem !== 'simples' && icmsFreight > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-rose-400">(−) ICMS sobre fretes</span>
                        <span className="text-rose-400 font-semibold">
                          -{formatBRL(icmsFreight)}
                        </span>
                      </div>
                    )}
                    {regimeMem === 'real' && pis > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-rose-400">(−) PIS (1,65%)</span>
                        <span className="text-rose-400 font-semibold">-{formatBRL(pis)}</span>
                      </div>
                    )}
                    {regimeMem === 'real' && cofins > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-rose-400">(−) COFINS (7,60%)</span>
                        <span className="text-rose-400 font-semibold">-{formatBRL(cofins)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400">
                        (=) Compras Líquidas / Custo Total:
                      </span>
                      <span className="font-bold text-emerald-400 text-sm">{formatBRL(net)}</span>
                    </div>
                    {qty > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Custo Unitário Líquido ({formatNumberBR(qty, 0)} un.):</span>
                        <span className="text-emerald-300 font-semibold">
                          {formatBRL(net / qty)} / un.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-[10px] text-slate-500 font-mono">
            Memória read-only do snapshot gravado — para editar, restaura o salvamento.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
