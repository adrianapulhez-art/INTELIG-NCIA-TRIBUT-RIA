import { useMemo, useState } from 'react'
import { Wallet, SplitSquareHorizontal, Download, FileSpreadsheet, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  computeSplitPayment,
  computeCashFlow2027,
  type Ponte2027Result,
  type Ponte2027State,
  type RegimeCompare2027,
  type B2BCreditResult,
} from '@/lib/ponte2027Calculations'
import { exportCarteira2027ToPdf, exportCarteira2027ToExcel } from '@/lib/carteira2027Export'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'

/**
 * FASE 3 DA PONTE 2027 — split payment (art. 31), fluxo de caixa mensal e
 * relatório "Carteira 2027" exportável (PDF/Excel). Renderiza abaixo da Fase 2.
 */
export function Ponte2027Phase3Section({
  revenue2027,
  regimeName,
  ponteState,
  result,
  comparativo,
  b2b,
  margens,
}: {
  revenue2027: number
  regimeName: string
  ponteState: Ponte2027State
  result: Ponte2027Result
  comparativo: RegimeCompare2027[]
  b2b: B2BCreditResult
  margens: { marginPct: number; price2027: number; netIncomeNoReprice: number; netIncome: number }[]
}) {
  const [retentionRate, setRetentionRate] = useState(50)
  const split = useMemo(() => computeSplitPayment(result, retentionRate), [result, retentionRate])
  const cashFlow = useMemo(
    () => computeCashFlow2027(ponteState, result, split),
    [ponteState, result, split],
  )

  const temDados = revenue2027 > 0

  const exportOptions = {
    regimeName,
    revenue2027,
    result,
    comparativo,
    b2b,
    split,
    cashFlow,
    margens,
  }

  return (
    <div className="space-y-4">
      {/* ===================== SPLIT PAYMENT + FLUXO DE CAIXA ===================== */}
      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-b from-[#140f26]/80 to-[#0d0a18]/90 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <SplitSquareHorizontal className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white">
              Split payment (LC 214/25, art. 31) — a CBS que não passa pelo seu caixa
            </h3>
          </div>
          <Badge className="text-[9px] bg-slate-900 text-slate-400 border-slate-700 font-mono">
            TIMING, NÃO CARGA
          </Badge>
        </div>
        {!temDados ? (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Com receita no motor, o simulador mostra a CBS retida na fonte mês a mês.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-mono text-slate-400">% retido na fonte:</span>
              <Input
                type="text"
                value={formatPercentBR(retentionRate)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value.replace('%', '').replace(',', '.'))
                  if (Number.isFinite(v)) setRetentionRate(Math.min(100, Math.max(0, v)))
                }}
                className="h-7 w-20 text-[11px] bg-slate-900/70 border-slate-800 text-slate-100"
              />
              {[0, 25, 50, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRetentionRate(p)}
                  className={`px-2 py-1 rounded border text-[10px] font-mono cursor-pointer ${
                    retentionRate === p
                      ? 'bg-violet-500/20 border-violet-400 text-violet-200 font-bold'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-violet-500/40'
                  }`}
                >
                  {p}%
                </button>
              ))}
              <span className="text-[10px] font-mono text-slate-500">
                parâmetro de simulação — a regulamentação definirá hipóteses e limites
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#0a1a15]/80 p-4 border border-violet-800">
                <p className="text-[10px] text-slate-500 font-mono uppercase">
                  CBS retida na fonte
                </p>
                <p className="text-lg font-black text-violet-300 font-mono">
                  {formatBRL(split.retainedCbs)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  vai direto do adquirente ao fisco — não passa pelo caixa
                </p>
              </div>
              <div className="rounded-xl bg-[#0a1a15]/80 p-4 border border-slate-800">
                <p className="text-[10px] text-slate-500 font-mono uppercase">CBS via DARE</p>
                <p className="text-lg font-black text-slate-200 font-mono">
                  {formatBRL(split.cashCbs)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  o que ainda sobra para recolher no caixa
                </p>
              </div>
              <div className="rounded-xl bg-[#0a1a15]/80 p-4 border border-slate-800">
                <p className="text-[10px] text-slate-500 font-mono uppercase">
                  Float de capital de giro
                </p>
                <p className="text-lg font-black text-amber-300 font-mono">
                  {formatBRL(split.workingCapitalImpact)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  que você deixa de segurar entre venda e DARE
                </p>
              </div>
            </div>

            {/* Fluxo mensal */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-1.5 px-2 text-slate-500 font-normal">Mês</th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">
                      Split retido
                    </th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">CBS caixa</th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">ICMS+ISS</th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">IBS</th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">
                      Saída 2027
                    </th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">
                      Saída hoje
                    </th>
                    <th className="text-right py-1.5 px-2 text-slate-500 font-normal">
                      Δ acumulado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlow.months.map((m) => (
                    <tr key={m.month} className="border-b border-slate-800/50">
                      <td className="py-1 px-2 text-slate-300">{m.month}</td>
                      <td className="py-1 px-2 text-right text-violet-300">
                        {formatBRL(m.splitRetained)}
                      </td>
                      <td className="py-1 px-2 text-right text-slate-300">
                        {formatBRL(m.cbsOnCash)}
                      </td>
                      <td className="py-1 px-2 text-right text-slate-400">
                        {formatBRL(m.icmsIss)}
                      </td>
                      <td className="py-1 px-2 text-right text-slate-400">{formatBRL(m.ibs)}</td>
                      <td className="py-1 px-2 text-right text-slate-200 font-bold">
                        {formatBRL(m.out2027)}
                      </td>
                      <td className="py-1 px-2 text-right text-slate-400">
                        {formatBRL(m.outCurrent)}
                      </td>
                      <td
                        className={`py-1 px-2 text-right font-bold ${
                          m.deltaCumulative <= 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {m.deltaCumulative > 0 ? '+' : ''}
                        {formatBRL(m.deltaCumulative)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
              Receita uniforme (÷12) com crédito uniforme — a forma do fluxo muda com o perfil real
              de vendas e aquisições. O split não altera a carga anual (
              {formatBRL(cashFlow.annualDelta)} é o mesmo Δ da Fase 1): altera QUANDO o dinheiro
              sai.
            </p>
          </>
        )}
      </div>

      {/* ===================== CARTEIRA 2027 — EXPORTAÇÃO ===================== */}
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-[#0c2c22]/85 to-[#071712]/95 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Carteira 2027 — relatório executivo da ponte
            </h3>
          </div>
          <Badge className="text-[9px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-mono">
            FASE 3 · EXPORTÁVEL
          </Badge>
        </div>
        <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
          Consolidado em um documento: confronto anual, composição 2027, comparativo de regimes,
          split payment, fluxo mensal, crédito B2B e sensibilidade por margem — com base legal e
          carimbo de emissão. Pronto para levar à reunião com o cliente.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            disabled={!temDados}
            onClick={() => exportCarteira2027ToPdf(exportOptions)}
            className="h-8 text-[11px] font-mono bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Exportar Carteira 2027 (PDF)
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!temDados}
            onClick={() => exportCarteira2027ToExcel(exportOptions)}
            className="h-8 text-[11px] font-mono bg-slate-900 border border-slate-700 text-slate-200 hover:border-emerald-500/40 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            Exportar (Excel)
          </Button>
        </div>
        {!temDados && (
          <p className="text-[10px] font-mono text-slate-500">
            Preencha o Markup (ou Compras + Despesas) para habilitar a exportação.
          </p>
        )}
      </div>
    </div>
  )
}

export default Ponte2027Phase3Section
