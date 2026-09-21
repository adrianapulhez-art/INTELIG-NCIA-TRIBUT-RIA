import { useMemo } from 'react'
import { BarChart3, Users, TrendingUp, Info, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  compareRegimes2027,
  computeB2BCredit,
  marginSensitivity,
  type Ponte2027Regime,
  type Ponte2027State,
} from '@/lib/ponte2027Calculations'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'

const REGIME_NAME: Record<Ponte2027Regime, string> = {
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  simples: 'Simples Nacional',
}

/**
 * FASE 2 DA PONTE 2027 — três lentes sobre o mesmo motor:
 * 1. Comparativo de regimes 2027 (mesma receita e aquisições, crédito compartilhado)
 * 2. Crédito B2B entregue ao cliente PJ (hoje × 2027)
 * 3. Sensibilidade por margem (o desembute em números)
 * Não altera a Fase 1 — renderiza abaixo dela na página.
 */
export function Ponte2027Phase2Section({
  revenue2027,
  regime,
  icmsRate,
  issRate,
  ponteState,
}: {
  revenue2027: number
  regime: Ponte2027Regime
  icmsRate: number
  issRate: number
  ponteState: Ponte2027State
}) {
  const comparativo = useMemo(() => compareRegimes2027(ponteState), [ponteState])
  const b2b = useMemo(
    () => computeB2BCredit(revenue2027, regime, icmsRate),
    [revenue2027, regime, icmsRate],
  )
  const sensibilidade = useMemo(
    () => marginSensitivity(revenue2027, regime, icmsRate, issRate),
    [revenue2027, regime, icmsRate, issRate],
  )

  const melhor2027 = useMemo(() => {
    if (comparativo.length === 0) return null
    return comparativo.reduce((best, r) => (r.total2027Burden < best.total2027Burden ? r : best))
  }, [comparativo])

  const temDados = revenue2027 > 0

  return (
    <div className="space-y-4">
      {/* ===================== 1. COMPARATIVO DE REGIMES 2027 ===================== */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#0b1512]/90 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Comparativo de regimes em 2027 — mesma receita, mesmo crédito
            </h3>
          </div>
          <Badge className="text-[9px] bg-slate-900 text-slate-400 border-slate-700 font-mono">
            FASE 2 · O MELHOR REGIME NA PONTE
          </Badge>
        </div>
        {!temDados ? (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Preencha o Markup (ou Compras + Despesas) para comparar os três regimes em 2027.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {comparativo.map((r) => {
                const isBest = melhor2027?.regime === r.regime
                return (
                  <div
                    key={r.regime}
                    className={`rounded-xl p-4 border ${
                      isBest
                        ? 'border-emerald-400/60 bg-emerald-500/10 ring-1 ring-emerald-400/40'
                        : 'border-slate-800 bg-[#0a1a15]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                        {r.regimeName}
                      </span>
                      {isBest && (
                        <Badge className="text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono">
                          menor carga
                        </Badge>
                      )}
                    </div>
                    <p className="text-xl font-black text-white font-mono">
                      {formatBRL(r.total2027Burden)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      carga 2027 · {formatPercentBR(r.effectiveRate)} efetiva
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-800/70 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-500">hoje ({r.regimeName})</span>
                        <span className="text-slate-300">
                          {formatBRL(r.currentSalesTaxes)} ·{' '}
                          {formatPercentBR(r.currentEffectiveRate)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-500">Δ 2027 vs hoje</span>
                        <span
                          className={`font-bold ${
                            r.burdenDifference < 0 ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {r.burdenDifference >= 0 ? '+' : ''}
                          {formatBRL(r.burdenDifference)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {melhor2027 && (
              <p className="text-[11px] font-mono text-slate-400 leading-relaxed flex items-start gap-1.5">
                <Info className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400" />
                Com a mesma receita e as mesmas aquisições, {REGIME_NAME[melhor2027.regime]} carrega
                a menor carga em 2027 ({formatBRL(melhor2027.total2027Burden)}). A escolha de regime
                vira decisão de precificação — não só de guia.
              </p>
            )}
          </>
        )}
      </div>

      {/* ===================== 2. CRÉDITO B2B ENTREGUE AO CLIENTE ===================== */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-b from-[#0a1a26]/80 to-[#071218]/90 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">
              Crédito B2B — o que seu cliente PJ credita na compra
            </h3>
          </div>
          <Badge className="text-[9px] bg-slate-900 text-slate-400 border-slate-700 font-mono">
            ARGUMENTO DE VENDA
          </Badge>
        </div>
        {!temDados ? (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Com receita no motor, aqui aparece o crédito que sua nota entrega ao cliente — hoje ×
            2027.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#0a1a15]/80 p-4 border border-slate-800">
                <p className="text-[10px] text-slate-500 font-mono uppercase">
                  Cliente credita hoje
                </p>
                <p className="text-lg font-black text-slate-200 font-mono">
                  {formatBRL(b2b.currentSystemCredit)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {regime === 'simples'
                    ? 'vendedor SN não destaca — cliente não credita nada'
                    : regime === 'real'
                      ? 'ICMS + PIS/COFINS destacados'
                      : 'ICMS destacado'}
                </p>
              </div>
              <div className="rounded-xl bg-[#0a1a15]/80 p-4 border border-sky-800">
                <p className="text-[10px] text-slate-500 font-mono uppercase">
                  Cliente credita em 2027
                </p>
                <p className="text-lg font-black text-sky-300 font-mono">
                  {formatBRL(b2b.cbsDelivered)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  CBS 8,8% destacada — todo PJ credita, de qualquer fornecedor
                </p>
              </div>
              <div
                className={`rounded-xl p-4 border ${
                  b2b.creditDifference >= 0
                    ? 'border-emerald-800 bg-emerald-500/[0.06]'
                    : 'border-amber-800 bg-amber-500/[0.06]'
                }`}
              >
                <p className="text-[10px] text-slate-500 font-mono uppercase">Diferença</p>
                <p
                  className={`text-lg font-black font-mono ${
                    b2b.creditDifference >= 0 ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {b2b.creditDifference >= 0 ? '+' : ''}
                  {formatBRL(b2b.creditDifference)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  crédito que a sua nota passa a entregar a mais (ou a menos)
                </p>
              </div>
            </div>
            <p className="text-[11px] font-mono text-slate-400 leading-relaxed flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0 text-sky-400" />
              {regime === 'simples'
                ? 'Hoje o vendedor SN não destaca crédito nenhum — em 2027 passa a entregar CBS creditável. É a virada competitiva do SN no B2B: a nota do SN deixa de ser "pior" para o cliente.'
                : 'Quem entrega mais crédito na nota vende mais no B2B. Em 2027 o critério muda de "regime do fornecedor" para "CBS destacada" — e a negociação passa a ser sobre preço líquido.'}
            </p>
          </>
        )}
      </div>

      {/* ===================== 3. SENSIBILIDADE POR MARGEM ===================== */}
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-b from-[#1a120a]/80 to-[#120d07]/90 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">
              Sensibilidade por margem — o desembute em números ({REGIME_NAME[regime]})
            </h3>
          </div>
          <Badge className="text-[9px] bg-slate-900 text-slate-400 border-slate-700 font-mono">
            PRECISÃO ANTES DE PRESSA
          </Badge>
        </div>
        {!temDados ? (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Com receita no motor, a tabela mostra o preço 2027 que preserva cada margem.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-1.5 px-2 text-slate-500 font-normal">Margem</th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">
                      Margem R$ hoje
                    </th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">
                      Preço hoje
                    </th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">
                      Preço 2027 (mesma margem)
                    </th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">Δ preço</th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">
                      Cliente PJ credita (CBS)
                    </th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">
                      Se NÃO reprecificar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sensibilidade.map((p) => (
                    <tr
                      key={p.marginPct}
                      className="border-b border-slate-800/50 hover:bg-slate-900/40"
                    >
                      <td className="py-1.5 px-2 font-bold text-orange-300">{p.marginPct}%</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">
                        {formatBRL(p.netIncome)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-400">
                        {formatBRL(p.priceToday)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-emerald-300 font-bold">
                        {formatBRL(p.price2027)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-300">
                        +{formatPercentBR(p.deltaPct)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-sky-300">
                        {formatBRL(p.creditB2B2027)}
                      </td>
                      <td
                        className={`py-1.5 px-2 text-right font-bold ${
                          p.netIncomeNoReprice >= p.netIncome ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {formatBRL(p.netIncomeNoReprice)}
                        {p.netIncomeNoReprice < p.netIncome && (
                          <span className="ml-1 text-[9px] text-rose-400">
                            (−{formatBRL(p.netIncome - p.netIncomeNoReprice)})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
              Lente isolada do preço: custos constantes (o efeito da CBS sobre custos está no
              confronto item a item da Fase 1). Preço 2027 = preço × (1−embutida) ÷ (1−por fora) — o
              % de reajuste é igual para toda margem; o que cresce com a margem é o R$ em jogo. "Se
              NÃO reprecificar" = margem com o preço antigo e a CBS por fora, antes de qualquer
              reação do mercado.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default Ponte2027Phase2Section
