import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBasket, BarChart3, Layers, Link2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

const CLASSE_STYLE: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  B: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  C: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
  '—': 'bg-slate-800 text-slate-500 border-slate-700',
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
    <div className="rounded-xl border border-sky-500/40 bg-sky-500/[0.05] p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Layers className="w-5 h-5 text-sky-400" />
        <span className="text-xs font-mono font-black uppercase tracking-wider text-sky-300">
          Integração de base com sistema pré-reforma
        </span>
        {temOrigem ? (
          <Badge className="text-[9px] bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-mono">
            <Link2 className="w-3 h-3 mr-1" /> Vínculo automático ativo — {itensComValor.length}{' '}
            item{itensComValor.length === 1 ? '' : 's'} na célula
          </Badge>
        ) : (
          <Badge className="text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/40 font-mono">
            Origem zerada — célula zerada
          </Badge>
        )}
      </div>
      <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
        A célula fornecedor × comprador × repasse calcula sobre os itens da Calculadora de Compras —
        automaticamente, pela mesma fonte que o botão "Zerar campos" limpa. Zero lá, zero aqui;
        alimentado lá, alimentado aqui. Selecione por relevância — classe A concentra o valor (curva
        ABC).
      </p>

      {/* Três portas de origem */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => navigate('/demo/compras')}
          title="Abrir a Calculadora de Compras para lançar os itens"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-sky-500 text-slate-950 border border-sky-400 cursor-pointer hover:bg-sky-400 transition-colors"
        >
          <ShoppingBasket className="w-3 h-3" /> Calculadora de Compras
        </button>
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

      {/* Visualização dos itens da origem (vínculo automático — sem importação manual) */}
      {itensComValor.length === 0 ? (
        <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/[0.04] p-3 space-y-2">
          <p className="text-[10px] font-mono text-amber-300 leading-relaxed">
            Nenhum item com valor na Calculadora de Compras — a célula está ZERADA (regra: zero na
            origem, zero na célula). Lance itens lá, ou carregue o caso exemplo: ele ESCREVE os
            itens na Compras, e os dois lados ficam iguais de verdade.
          </p>
          <Button
            size="sm"
            onClick={onCarregarExemplo}
            className="h-7 text-[10px] font-mono font-bold bg-sky-500 text-slate-950 hover:bg-sky-400 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 mr-1" /> Carregar caso exemplo (escreve na Compras)
          </Button>
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
              </tr>
            </thead>
            <tbody>
              {itensOrigem.map((i) => (
                <tr
                  key={i.id}
                  className={`border-t border-slate-800/70 ${i.valorNota <= 0 ? 'opacity-40' : ''}`}
                >
                  <td className="px-2 py-1.5 text-slate-200 max-w-[180px] truncate" title={i.name}>
                    {i.name || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-300">
                    {formatNumberBR(i.quantity, 0)}
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
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700 bg-slate-950/50 text-slate-300">
                <td className="px-2 py-1.5 font-bold" colSpan={1}>
                  Origem ativa ({itensComValor.length})
                </td>
                <td className="px-2 py-1.5 text-right font-bold">{formatNumberBR(totalQtd, 0)}</td>
                <td className="px-2 py-1.5 text-right font-bold" colSpan={4}>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <BarChart3 className="w-3 h-3" /> a célula recalcula sozinha sobre estes itens
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
      {itensComValor.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-lg p-2.5">
          <Link2 className="w-4 h-4 shrink-0 text-emerald-400" />
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
