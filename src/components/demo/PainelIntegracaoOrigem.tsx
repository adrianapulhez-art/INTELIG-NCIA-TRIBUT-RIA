import React, { useMemo } from 'react'
import { ShoppingBasket, Download, X, BarChart3, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTaxContext } from '@/contexts/TaxContext'
import {
  montarItensIntegracao,
  derivarCasoDeItens,
  type ItemIntegracaoArt12,
} from '@/lib/integracaoComprasArt12'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'
import { type CmvArt12Input } from '@/lib/art12Calculations'

const CLASSE_STYLE: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  B: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  C: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
  '—': 'bg-slate-800 text-slate-500 border-slate-700',
}

/**
 * INTEGRAÇÃO DE BASE COM SISTEMA PRÉ-REFORMA — painel da Fase 1 (fonte: Calculadora de Compras).
 * Plena visualização dos itens + curva ABC + botão "Importar" por item.
 * Markup e Despesas Operacionais: botões visíveis, importação na fase seguinte.
 */
export function PainelIntegracaoOrigem({
  importados,
  onImportar,
  onRemover,
}: {
  importados: ItemIntegracaoArt12[]
  onImportar: (item: ItemIntegracaoArt12) => void
  onRemover: (id: string) => void
}) {
  const { purchasesItems } = useTaxContext()

  const itens = useMemo(() => montarItensIntegracao(purchasesItems || []), [purchasesItems])
  const itensComValor = itens.filter((i) => i.valorNota > 0)
  const casoDerivado = useMemo(() => derivarCasoDeItens(importados), [importados])
  const totalNota = importados.reduce((a, i) => a + i.valorNota, 0)
  const idsImportados = new Set(importados.map((i) => i.id))

  return (
    <div className="rounded-xl border border-sky-500/40 bg-sky-500/[0.05] p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Layers className="w-5 h-5 text-sky-400" />
        <span className="text-xs font-mono font-black uppercase tracking-wider text-sky-300">
          Integração de base com sistema pré-reforma
        </span>
        <Badge className="text-[9px] bg-sky-500/15 text-sky-300 border-sky-500/40 font-mono">
          {importados.length} item{importados.length === 1 ? '' : 's'} na célula
        </Badge>
        {importados.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => importados.forEach((i) => onRemover(i.id))}
            className="ml-auto border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] h-6 cursor-pointer"
          >
            <X className="w-3 h-3 mr-1" /> Remover todos
          </Button>
        )}
      </div>
      <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
        Traga itens da origem (sistema pré-reforma) para alimentar a célula fornecedor × comprador ×
        repasse. Sem importação, o módulo calcula sobre o caso canônico. Selecione por relevância —
        classe A concentra o valor (curva ABC).
      </p>

      {/* Três portas de origem */}
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-sky-500 text-slate-950 border border-sky-400 cursor-pointer">
          <ShoppingBasket className="w-3 h-3" /> Calculadora de Compras
        </span>
        <span
          title="Importação na próxima fase"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-slate-950 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
        >
          Calculadora Markup <span className="text-[8px] font-normal">— próxima fase</span>
        </span>
        <span
          title="Importação na próxima fase"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-slate-950 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
        >
          Despesas Operacionais <span className="text-[8px] font-normal">— próxima fase</span>
        </span>
      </div>

      {/* Plena visualização dos itens da Compras */}
      {itensComValor.length === 0 ? (
        <div className="text-[10px] font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg p-3">
          Nenhum item com valor na Calculadora de Compras. Lance itens lá e volte para importar.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-x-auto">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="bg-slate-950/70 text-slate-400">
                <th className="text-left px-2 py-1.5 font-bold">Item</th>
                <th className="text-right px-2 py-1.5 font-bold">Qtd</th>
                <th className="text-right px-2 py-1.5 font-bold">Mercadoria</th>
                <th className="text-right px-2 py-1.5 font-bold">Frete</th>
                <th className="text-right px-2 py-1.5 font-bold">ICMS</th>
                <th className="text-right px-2 py-1.5 font-bold">IPI</th>
                <th className="text-center px-2 py-1.5 font-bold">ABC</th>
                <th className="text-right px-2 py-1.5 font-bold">Valor da nota</th>
                <th className="text-center px-2 py-1.5 font-bold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr
                  key={i.id}
                  className={`border-t border-slate-800/70 ${i.valorNota <= 0 ? 'opacity-40' : ''} ${idsImportados.has(i.id) ? 'bg-sky-500/[0.07]' : ''}`}
                >
                  <td className="px-2 py-1.5 text-slate-200 max-w-[180px] truncate" title={i.name}>
                    {i.name || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-300">
                    {formatNumberBR(i.quantity)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-300">
                    {formatBRL(i.merchandiseValue)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-300">
                    {formatBRL(i.freightValue)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-400">
                    {formatNumberBR(i.icmsRate)}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-400">
                    {formatNumberBR(i.ipiRate)}%
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-bold ${CLASSE_STYLE[i.classe]}`}
                      title={`${formatNumberBR(i.abcPct)}% do valor total`}
                    >
                      {i.classe}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-100 font-bold">
                    {formatBRL(i.valorNota)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {idsImportados.has(i.id) ? (
                      <button
                        type="button"
                        onClick={() => onRemover(i.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 text-[9px] font-mono font-bold hover:bg-rose-500/20 cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Remover
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={i.valorNota <= 0}
                        onClick={() => onImportar(i)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-sky-500/40 bg-sky-500/10 text-sky-300 text-[9px] font-mono font-bold hover:bg-sky-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3 h-3" /> Importar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700 bg-slate-950/50 text-slate-300">
                <td className="px-2 py-1.5 font-bold" colSpan={1}>
                  Selecionados ({importados.length})
                </td>
                <td className="px-2 py-1.5 text-right font-bold">
                  {formatNumberBR(casoDerivado.quantity)}
                </td>
                <td className="px-2 py-1.5 text-right font-bold" colSpan={4}>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <BarChart3 className="w-3 h-3" /> ICMS {formatNumberBR(casoDerivado.icmsRate)}%
                    · IPI {formatNumberBR(casoDerivado.ipiRate)}% (médias ponderadas)
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right font-bold text-sky-300">
                  {formatBRL(totalNota)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

/** Hook: caso ativo do módulo = derivado dos importados ou canônico. */
export function useCasoArt12(importados: ItemIntegracaoArt12[]): {
  input: CmvArt12Input
  origemIntegrada: boolean
} {
  return useMemo(() => {
    if (importados.length === 0) return { input: null, origemIntegrada: false } as never
    return { input: derivarCasoDeItens(importados), origemIntegrada: true }
  }, [importados])
}
