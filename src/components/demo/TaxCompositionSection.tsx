import React, { useMemo } from 'react'
import { Receipt, Percent, Scale } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatPercentBR } from '@/lib/taxCalculations'

type TaxRegimeId = 'presumido' | 'real' | 'simples'

interface CustomTaxLite {
  id: string
  name: string
  rate: number
}

interface TaxCompositionSectionProps {
  productName: string
  salePrice: number
  regime: TaxRegimeId
  icmsRate: number
  customTaxes: CustomTaxLite[]
  effectiveSimplesRate: number
  simplesAnexoLabel: string
  salePriceByRegime?: { presumido: number; real: number; simples: number }
}

interface TaxLine {
  key: string
  label: string
  detail: string
  ratePct: number
  base: number
  value: number
  pctOfRevenue: number
  accent?: 'icms' | 'federal' | 'das' | 'custom'
}

interface RegimeTaxResult {
  regime: TaxRegimeId
  label: string
  rbv: number
  lines: TaxLine[]
  totalValue: number
  totalPct: number
}

const REGIME_LABELS: Record<TaxRegimeId, string> = {
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  simples: 'Simples Nacional',
}

const REGIME_ORDER: TaxRegimeId[] = ['presumido', 'real', 'simples']

/**
 * COMPOSIÇÃO DOS TRIBUTOS — percentual de cada tributo em relação à Receita Bruta de Venda (RBV).
 * Espelha exatamente o motor do Markup (simulateMarkup / calculateMarkupProductsCanonically):
 * - Presumido: ICMS s/ RBV + PIS 0,65% e COFINS 3% sobre a base SEM ICMS (tese do século, STJ RE 1.188.403)
 * - Real: ICMS s/ RBV + PIS 1,65% e COFINS 7,60% sobre a base SEM ICMS
 * - Simples: DAS única (alíquota efetiva por anexo/RBT12) sobre a RBV
 * - Tributos customizados: sobre a RBV, base cheia
 */
function computeRegimeTaxes(
  regime: TaxRegimeId,
  rbv: number,
  icmsRate: number,
  customTaxes: CustomTaxLite[],
  effectiveSimplesRate: number,
): RegimeTaxResult {
  const lines: TaxLine[] = []
  const safeRbv = Math.max(0, rbv || 0)

  if (regime === 'simples') {
    const dasValue = Math.round(safeRbv * (effectiveSimplesRate / 100) * 100) / 100
    lines.push({
      key: 'das',
      label: 'DAS (Simples Nacional)',
      detail: 'Alíquota efetiva única — PGDAS (IRPJ, CSLL, PIS, COFINS, CPP e ICMS embutidos)',
      ratePct: effectiveSimplesRate,
      base: safeRbv,
      value: dasValue,
      pctOfRevenue: safeRbv > 0 ? (dasValue / safeRbv) * 100 : 0,
      accent: 'das',
    })
  } else {
    const icmsValue = Math.round(safeRbv * (icmsRate / 100) * 100) / 100
    lines.push({
      key: 'icms',
      label: 'ICMS',
      detail: 'Alíquota configurada na página · base: Receita Bruta de Venda',
      ratePct: icmsRate,
      base: safeRbv,
      value: icmsValue,
      pctOfRevenue: safeRbv > 0 ? (icmsValue / safeRbv) * 100 : 0,
      accent: 'icms',
    })

    // Base sem ICMS — tese do século (STJ RE 1.188.403): ICMS fora da base de PIS/COFINS
    const pisCofinsBase = Math.max(0, safeRbv - icmsValue)
    const isPresumido = regime === 'presumido'
    const pisRate = isPresumido ? 0.65 : 1.65
    const cofinsRate = isPresumido ? 3.0 : 7.6

    const pisValue = Math.round(pisCofinsBase * (pisRate / 100) * 100) / 100
    lines.push({
      key: 'pis',
      label: 'PIS',
      detail: 'Base sem ICMS (tese do século — STJ RE 1.188.403)',
      ratePct: pisRate,
      base: pisCofinsBase,
      value: pisValue,
      pctOfRevenue: safeRbv > 0 ? (pisValue / safeRbv) * 100 : 0,
      accent: 'federal',
    })

    const cofinsValue = Math.round(pisCofinsBase * (cofinsRate / 100) * 100) / 100
    lines.push({
      key: 'cofins',
      label: 'COFINS',
      detail: 'Base sem ICMS (tese do século — STJ RE 1.188.403)',
      ratePct: cofinsRate,
      base: pisCofinsBase,
      value: cofinsValue,
      pctOfRevenue: safeRbv > 0 ? (cofinsValue / safeRbv) * 100 : 0,
      accent: 'federal',
    })
  }

  for (const tax of customTaxes) {
    const rate = Number.isFinite(tax.rate) ? tax.rate : 0
    const value = Math.round(safeRbv * (rate / 100) * 100) / 100
    lines.push({
      key: `custom-${tax.id}`,
      label: tax.name || 'Tributo adicional',
      detail: 'Tributo adicional configurado na página · base: Receita Bruta de Venda',
      ratePct: rate,
      base: safeRbv,
      value,
      pctOfRevenue: safeRbv > 0 ? (value / safeRbv) * 100 : 0,
      accent: 'custom',
    })
  }

  const totalValue = Math.round(lines.reduce((acc, l) => acc + l.value, 0) * 100) / 100
  const totalPct = safeRbv > 0 ? (totalValue / safeRbv) * 100 : 0

  return {
    regime,
    label: REGIME_LABELS[regime],
    rbv: safeRbv,
    lines,
    totalValue,
    totalPct,
  }
}

const ACCENT_STYLES: Record<string, string> = {
  icms: 'text-amber-800',
  federal: 'text-sky-800',
  das: 'text-emerald-800',
  custom: 'text-slate-700',
}

export function TaxCompositionSection({
  productName,
  salePrice,
  regime,
  icmsRate,
  customTaxes,
  effectiveSimplesRate,
  simplesAnexoLabel,
  salePriceByRegime,
}: TaxCompositionSectionProps) {
  const resultsByRegime = useMemo<Record<TaxRegimeId, RegimeTaxResult>>(() => {
    const map = {} as Record<TaxRegimeId, RegimeTaxResult>
    for (const r of REGIME_ORDER) {
      const rPrice =
        salePriceByRegime && salePriceByRegime[r] > 0 ? salePriceByRegime[r] : salePrice
      map[r] = computeRegimeTaxes(r, rPrice, icmsRate, customTaxes, effectiveSimplesRate)
    }
    return map
  }, [salePrice, salePriceByRegime, icmsRate, customTaxes, effectiveSimplesRate])

  const activeResult = resultsByRegime[regime]
  const hasPrice = activeResult.rbv > 0

  return (
    <div className="space-y-4">
      {/* ===== Bloco do regime ativo: decomposição linha a linha ===== */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">
                  Composição dos Tributos
                </span>
                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono h-5 px-1.5">
                  {productName || 'Produto'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Percentual de cada tributo em relação à Receita Bruta de Venda (RBV) · Regime:{' '}
                <strong className="text-slate-800 uppercase">{REGIME_LABELS[regime]}</strong>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500 block">
              Receita bruta de venda (unit.)
            </span>
            <span className="text-lg font-black text-emerald-700 font-mono">
              {formatBRL(activeResult.rbv)}
            </span>
          </div>
        </div>

        {hasPrice ? (
          <div className="space-y-1.5 pt-1">
            {activeResult.lines.map((line) => (
              <div
                key={line.key}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200 transition-colors hover:border-slate-300"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold font-mono ${
                        ACCENT_STYLES[line.accent || 'custom']
                      }`}
                    >
                      {line.label}
                    </span>
                    <Badge className="bg-white text-slate-700 border-slate-200 text-[10px] font-mono h-4 px-1.5">
                      {formatPercentBR(line.ratePct)}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight truncate">
                    {line.detail} · Base: {formatBRL(line.base)}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <div className="text-right w-24">
                    <span className="text-[10px] font-mono text-slate-500 block">% da RBV</span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {formatPercentBR(line.pctOfRevenue)}
                    </span>
                  </div>
                  <div className="text-right w-28">
                    <span className="text-[10px] font-mono text-slate-500 block">Valor (R$)</span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {formatBRL(line.value)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Total dos tributos */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wide text-emerald-800 block">
                    Total de tributos sobre a RBV
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">
                    {activeResult.lines.length}{' '}
                    {activeResult.lines.length === 1 ? 'tributo' : 'tributos'} · Regime{' '}
                    {REGIME_LABELS[regime]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-700 block">% da RBV</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {formatPercentBR(activeResult.totalPct)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-700 block">Valor (R$)</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {formatBRL(activeResult.totalValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-3 px-3 rounded-lg border border-dashed border-slate-200 text-[11px] font-mono text-slate-500 text-center bg-slate-50">
            Nenhum preço simulado ainda. Preencha o custo/margem e clique em "Simular" para ver a
            composição dos tributos.
          </div>
        )}
      </div>

      {/* ===== Comparativo: o mesmo produto nos 3 regimes ===== */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">
              Comparativo por regime
            </span>
            <p className="text-[11px] text-slate-500">
              O mesmo produto nos 3 regimes — total de tributos em R$ e % da Receita Bruta de Venda
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-[11px] font-mono border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-white">
                <th className="text-left py-2 px-2.5 text-slate-300 font-semibold">Tributo</th>
                {REGIME_ORDER.map((r) => (
                  <th
                    key={r}
                    className={`text-right py-2 px-2.5 font-bold ${
                      r === regime ? 'text-emerald-300' : 'text-slate-200'
                    }`}
                  >
                    {REGIME_LABELS[r]}
                    {r === regime && (
                      <span className="block text-[9px] font-normal text-emerald-400">
                        regime ativo
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr>
                <td className="py-1.5 px-2.5 text-slate-700">Receita bruta de venda (unit.)</td>
                {REGIME_ORDER.map((r) => (
                  <td
                    key={r}
                    className={`text-right py-1.5 px-2.5 ${
                      r === regime ? 'text-emerald-700 font-bold' : 'text-slate-800'
                    }`}
                  >
                    {formatBRL(resultsByRegime[r].rbv)}
                  </td>
                ))}
              </tr>
              {resultsByRegime.presumido.lines
                .filter((l) => l.key === 'icms')
                .map((l) => (
                  <tr key={l.key}>
                    <td className="py-1.5 px-2.5 text-amber-800 font-medium">
                      ICMS <span className="text-slate-500">({formatPercentBR(l.ratePct)})</span>
                    </td>
                    {REGIME_ORDER.map((r) => {
                      const line = resultsByRegime[r].lines.find((x) => x.key === 'icms')
                      return (
                        <td
                          key={r}
                          className={`text-right py-1.5 px-2.5 ${
                            r === regime ? 'text-emerald-700 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {line ? formatBRL(line.value) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              {(['pis', 'cofins'] as const).map((key) => {
                const refLine = resultsByRegime.presumido.lines.find((l) => l.key === key)
                if (!refLine) return null
                return (
                  <tr key={key}>
                    <td className="py-1.5 px-2.5 text-sky-800 font-medium">
                      {refLine.label}{' '}
                      <span className="text-slate-500">
                        (
                        {formatPercentBR(
                          regime === 'presumido'
                            ? key === 'pis'
                              ? 0.65
                              : 3.0
                            : key === 'pis'
                              ? 1.65
                              : 7.6,
                        )}{' '}
                        s/ base sem ICMS)
                      </span>
                    </td>
                    {REGIME_ORDER.map((r) => {
                      const line = resultsByRegime[r].lines.find((x) => x.key === key)
                      return (
                        <td
                          key={r}
                          className={`text-right py-1.5 px-2.5 ${
                            r === regime ? 'text-emerald-700 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {line ? formatBRL(line.value) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              <tr>
                <td className="py-1.5 px-2.5 text-emerald-800 font-medium">
                  DAS <span className="text-slate-500">({simplesAnexoLabel})</span>
                </td>
                {REGIME_ORDER.map((r) => {
                  const line = resultsByRegime[r].lines.find((x) => x.key === 'das')
                  return (
                    <td
                      key={r}
                      className={`text-right py-1.5 px-2.5 ${
                        r === regime ? 'text-emerald-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      {line ? formatBRL(line.value) : '—'}
                    </td>
                  )
                })}
              </tr>
              {customTaxes.map((tax) => {
                const key = `custom-${tax.id}`
                return (
                  <tr key={key}>
                    <td className="py-1.5 px-2.5 text-slate-700">
                      {tax.name || 'Tributo adicional'}{' '}
                      <span className="text-slate-500">({formatPercentBR(tax.rate)})</span>
                    </td>
                    {REGIME_ORDER.map((r) => {
                      const line = resultsByRegime[r].lines.find((x) => x.key === key)
                      return (
                        <td
                          key={r}
                          className={`text-right py-1.5 px-2.5 ${
                            r === regime ? 'text-emerald-700 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {line ? formatBRL(line.value) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              <tr className="bg-emerald-50/70 border-t border-slate-200">
                <td className="py-2 px-2.5 font-bold text-emerald-800">Total de tributos (R$)</td>
                {REGIME_ORDER.map((r) => (
                  <td
                    key={r}
                    className={`text-right py-2 px-2.5 font-black ${
                      r === regime ? 'text-emerald-800' : 'text-slate-900'
                    }`}
                  >
                    {formatBRL(resultsByRegime[r].totalValue)}
                  </td>
                ))}
              </tr>
              <tr className="bg-emerald-50/70">
                <td className="py-2 px-2.5 font-bold text-emerald-800">
                  Total de tributos (% RBV)
                </td>
                {REGIME_ORDER.map((r) => (
                  <td
                    key={r}
                    className={`text-right py-2 px-2.5 font-black ${
                      r === regime ? 'text-emerald-800' : 'text-slate-900'
                    }`}
                  >
                    {formatPercentBR(resultsByRegime[r].totalPct)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
          Presumido: PIS 0,65% e COFINS 3% · Real: PIS 1,65% e COFINS 7,60% — ambos sobre a base sem
          ICMS (tese do século, STJ RE 1.188.403). Simples: DAS única conforme anexo e RBT12 (
          {simplesAnexoLabel}, alíquota efetiva {formatPercentBR(effectiveSimplesRate)}). Espelha
          exatamente o cálculo do motor de Markup.
        </p>
      </div>
    </div>
  )
}
