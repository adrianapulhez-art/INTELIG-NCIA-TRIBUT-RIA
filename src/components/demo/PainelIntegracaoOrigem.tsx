import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBasket, BarChart3, Layers, Link2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

const CLASSE_STYLE: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  B: 'bg-amber-100 text-amber-800 border-amber-300',
  C: 'bg-slate-100 text-slate-700 border-slate-300',
  '—': 'bg-slate-100 text-slate-500 border-slate-200',
}

/**
 * INTEGRAÇÃO DE BASE COM SISTEMA PRÉ-REFORMA — VÍNCULO AUTOMÁTICO (25/09).
 * O módulo CMV Art. 12 lê a Calculadora de Compras DIRETO do TaxContext — a MESMA
 * fonte que o botão "Zerar campos" limpa. Regra da CEO: zero na origem = zero na
 * célula; alimentado na origem = alimentado na célula. Sem importação manual e sem
 * fallback canônico: o caso exemplo entra por botão explícito que ESCREVE na Compras.
 * Markup e Despesas Operacionais seguem como portas de fases futuras (decisão da CEO).
 */
export function PainelIntegracaoOrigem({
  itensOrigem,
  temOrigem,
  onCarregarExemplo,
}: {
  itensOrigem: ItemIntegracaoArt12[]
  temOrigem: boolean
  onCarregarExemplo: () => void
}) {
  const navigate = useNavigate()
  const itensComValor = itensOrigem.filter((i) => i.valorNota > 0)
  const totalNota = itensComValor.reduce((a, i) => a + i.valorNota, 0)
  const totalQtd = itensComValor.reduce((a, i) => a + (i.quantity || 0), 0)

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-950">
          Integração de base com sistema pré-reforma
        </span>
        {temOrigem ? (
          <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 font-mono">
            <Link2 className="w-3 h-3 mr-1" /> Vínculo automático ativo — {itensComValor.length}{' '}
            item{itensComValor.length === 1 ? '' : 's'} na célula
          </Badge>
        ) : (
          <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 font-mono">
            Origem zerada — célula zerada
          </Badge>
        )}
      </div>
      <p className="text-xs text-slate-600 leading-relaxed font-mono">
        A célula fornecedor × comprador × repasse calcula sobre os itens da Calculadora de Compras —
        automaticamente, pela mesma fonte que o botão "Zerar campos" limpa. Zero lá, zero aqui;
        alimentado lá, alimentado aqui. Selecione por relevância — classe A concentra o valor (curva
        ABC).
      </p>

      {/* Portas de origem */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate('/demo/compras')}
          title="Abrir a Calculadora de Compras para lançar os itens"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-600 text-white border border-emerald-600 cursor-pointer hover:bg-emerald-700 shadow-xs transition-colors"
        >
          <ShoppingBasket className="w-3.5 h-3.5" /> Calculadora de Compras
        </button>
        <span
          title="Importação na próxima fase"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
        >
          Despesas Operacionais{' '}
          <span className="text-[10px] text-slate-400 font-normal">— próxima fase</span>
        </span>
      </div>

      {/* Visualização dos itens da origem (vínculo automático — sem importação manual) */}
      {itensComValor.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-3.5 space-y-2">
          <p className="text-xs font-mono text-amber-900 leading-relaxed">
            Nenhum item com valor na Calculadora de Compras — a célula está ZERADA (regra: zero na
            origem, zero na célula). Lance itens lá, ou carregue o caso exemplo: ele ESCREVE os
            itens na Compras, e os dois lados ficam iguais de verdade.
          </p>
          <Button
            size="sm"
            onClick={onCarregarExemplo}
            className="h-8 text-xs font-mono font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Carregar caso exemplo (escreve na Compras)
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto shadow-2xs">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-white">
                <th className="text-left px-3 py-2 font-bold rounded-tl-xl">Item</th>
                <th className="text-right px-3 py-2 font-bold">Qtd</th>
                <th className="text-right px-3 py-2 font-bold">Mercadoria</th>
                <th className="text-right px-3 py-2 font-bold">Frete</th>
                <th className="text-right px-3 py-2 font-bold">ICMS</th>
                <th className="text-right px-3 py-2 font-bold">IPI</th>
                <th className="text-center px-3 py-2 font-bold">ABC</th>
                <th className="text-right px-3 py-2 font-bold rounded-tr-xl">Valor da nota</th>
              </tr>
            </thead>
            <tbody>
              {itensOrigem.map((i) => (
                <tr
                  key={i.id}
                  className={`border-t border-slate-200 hover:bg-slate-50 transition-colors ${i.valorNota <= 0 ? 'opacity-40' : ''}`}
                >
                  <td
                    className="px-3 py-2 text-slate-900 max-w-[180px] truncate font-medium"
                    title={i.name}
                  >
                    {i.name || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {formatNumberBR(i.quantity, 0)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {formatBRL(i.merchandiseValue)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {formatBRL(i.freightValue)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {formatNumberBR(i.icmsRate)}%
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {formatNumberBR(i.ipiRate)}%
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold ${CLASSE_STYLE[i.classe]}`}
                      title={`${formatNumberBR(i.abcPct)}% do valor total`}
                    >
                      {i.classe}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-900 font-bold">
                    {formatBRL(i.valorNota)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-white">
                <td className="px-3 py-2 font-bold" colSpan={1}>
                  Origem ativa ({itensComValor.length})
                </td>
                <td className="px-3 py-2 text-right font-bold">{formatNumberBR(totalQtd, 0)}</td>
                <td className="px-3 py-2 text-right font-bold" colSpan={4}>
                  <span className="inline-flex items-center gap-1 text-slate-300 text-[11px]">
                    <BarChart3 className="w-3.5 h-3.5" /> a célula recalcula sozinha sobre estes
                    itens
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-bold text-emerald-400">
                  {formatBRL(totalNota)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {itensComValor.length > 0 && (
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-900 bg-emerald-100/70 border border-emerald-300 rounded-xl p-3">
          <Link2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>
            Vínculo automático: todos os resultados (memórias, matriz, réguas, espelho, notas)
            derivam destes itens. Zerar a Compras zera a célula — salvar o cenário preserva o
            vínculo. Edições entram no cenário ativo automaticamente (auto-sync): F5 reidrata o
            estado atual, nunca um snapshot antigo.
          </span>
        </div>
      )}
    </div>
  )
}
