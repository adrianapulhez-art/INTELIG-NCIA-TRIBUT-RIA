import React from 'react'
import { CheckCircle2, Info, Building2, Briefcase, Factory } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatPercentBR, formatNumberBR } from '@/lib/taxCalculations'
import { CmvDetailedBreakdown } from '@/components/demo/CmvDetailedBreakdown'
import type {
  RegimeDreComparativeData,
  DreColumnValues,
} from '@/components/demo/DreRegimeComparativeSection'

export interface RegimeSideBySideDreTablesProps {
  regimeKey: 'presumido' | 'real' | 'simples'
  data: RegimeDreComparativeData
  activityName?: string
  pgdasDescription?: string
  irpjPresumptionRate?: number
  csllPresumptionRate?: number
  hasCustomCmvSubsystem?: boolean
}

interface SingleDreTableProps {
  title: string
  modeKey: 'costMargin' | 'liquid'
  colData: {
    unit: DreColumnValues
    consolidated: DreColumnValues
    hasValidData: boolean
    invalidReason?: string
  }
  quantity: number
  regimeKey: 'presumido' | 'real' | 'simples'
  irpjPresumptionRate?: number
  csllPresumptionRate?: number
  headerBadgeColor: 'blue' | 'emerald'
}

const SingleDreTable: React.FC<SingleDreTableProps> = ({
  title,
  colData,
  quantity,
  regimeKey,
  irpjPresumptionRate,
  csllPresumptionRate,
  headerBadgeColor,
}) => {
  const { unit, consolidated, hasValidData, invalidReason } = colData
  const safeQty = quantity > 0 ? quantity : 1

  const badgeBg =
    headerBadgeColor === 'emerald'
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
      : 'bg-blue-500/10 text-blue-300 border-blue-500/30'

  return (
    <div className="bg-[#0b101b]/95 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">{title}</h4>
            <Badge variant="outline" className={`text-[10px] font-mono px-2 py-0.5 ${badgeBg}`}>
              {title === 'DRE pelo Custo + Margem' ? 'Modo Custo + Margem' : 'Modo Meta Líquida'}
            </Badge>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {quantity > 0 ? `${quantity} un.` : 'sem qtd'}
          </span>
        </div>

        {!hasValidData ? (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Info className="w-4 h-4 shrink-0" />
              <span>Valores não apurados para este modo</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {invalidReason ||
                (title === 'DRE pelo Custo + Margem'
                  ? 'Custo unitário da mercadoria ou margem não informados para este regime no Markup.'
                  : 'Meta do Preço Líquido Desejado não preenchida para este regime no Markup.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-right">
                  <th className="py-2 text-left font-semibold text-slate-300">Descrição</th>
                  <th className="py-2 px-2.5 font-semibold text-slate-300 w-28 sm:w-32">
                    Unitário
                  </th>
                  <th className="py-2 px-2.5 font-semibold text-slate-300 w-32 sm:w-36">
                    Total ({safeQty} un.)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* 1. Receita Bruta */}
                <tr className="hover:bg-slate-900/30">
                  <td className="py-2 text-left font-semibold text-slate-200">Receita Bruta</td>
                  <td className="py-2 px-2.5 text-right text-slate-200">
                    {formatBRL(unit.grossRevenue)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-semibold text-slate-200">
                    {formatBRL(consolidated.grossRevenue)}
                  </td>
                </tr>

                {/* 2. (-) Tributos do Regime */}
                {regimeKey === 'simples' ? (
                  <tr className="hover:bg-slate-900/30 text-emerald-400/90 bg-emerald-500/[0.02]">
                    <td className="py-1.5 text-left font-medium">
                      (−) Guia Única DAS (alíquota efetiva PGDAS)
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-medium">
                      -{formatBRL(unit.dasTotal)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-medium">
                      -{formatBRL(consolidated.dasTotal)}
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="hover:bg-slate-900/30 text-slate-400">
                      <td className="py-1.5 text-left">(−) ICMS / ISS</td>
                      <td className="py-1.5 px-2.5 text-right">-{formatBRL(unit.icmsOrIss)}</td>
                      <td className="py-1.5 px-2.5 text-right">
                        -{formatBRL(consolidated.icmsOrIss)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-900/30 text-slate-400">
                      <td className="py-1.5 text-left">
                        (−) PIS {regimeKey === 'presumido' ? '(0,65%)' : '(1,65%)'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right">-{formatBRL(unit.pis)}</td>
                      <td className="py-1.5 px-2.5 text-right">-{formatBRL(consolidated.pis)}</td>
                    </tr>
                    <tr className="hover:bg-slate-900/30 text-slate-400">
                      <td className="py-1.5 text-left">
                        (−) COFINS {regimeKey === 'presumido' ? '(3,00%)' : '(7,60%)'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right">-{formatBRL(unit.cofins)}</td>
                      <td className="py-1.5 px-2.5 text-right">
                        -{formatBRL(consolidated.cofins)}
                      </td>
                    </tr>
                  </>
                )}

                {/* 3. (=) Receita Líquida */}
                <tr className="bg-slate-950/40 font-bold text-slate-100">
                  <td className="py-2 text-left">= Receita Líquida</td>
                  <td className="py-2 px-2.5 text-right text-slate-100">
                    {formatBRL(unit.netRevenue)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-slate-100">
                    {formatBRL(consolidated.netRevenue)}
                  </td>
                </tr>

                {/* 4. (−) CMV */}
                <tr className="hover:bg-slate-900/30 text-slate-400">
                  <td className="py-2 text-left">
                    <div className="flex items-center gap-1.5">
                      <span>(−) CMV</span>
                      <span className="text-[10px] text-slate-500">
                        {regimeKey === 'presumido'
                          ? '(crédito ICMS)'
                          : regimeKey === 'real'
                            ? '(crédito ICMS + PIS/COFINS)'
                            : '(sem créditos)'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2.5 text-right">-{formatBRL(unit.cmv)}</td>
                  <td className="py-2 px-2.5 text-right">-{formatBRL(consolidated.cmv)}</td>
                </tr>

                {/* Linha expansível com discriminação de CMV */}
                <tr>
                  <td colSpan={3} className="py-1 px-0">
                    <CmvDetailedBreakdown
                      forcedRegime={regimeKey}
                      quantitySold={safeQty}
                      title={`Composição e deduções do CMV (${
                        regimeKey === 'presumido'
                          ? 'Lucro Presumido'
                          : regimeKey === 'real'
                            ? 'Lucro Real'
                            : 'Simples Nacional'
                      })`}
                      variant="embedded"
                    />
                  </td>
                </tr>

                {/* 5. (=) Lucro Bruto */}
                <tr className="bg-slate-950/20 font-semibold text-slate-200">
                  <td className="py-2 text-left">= Lucro Bruto</td>
                  <td className="py-2 px-2.5 text-right">{formatBRL(unit.grossProfit)}</td>
                  <td className="py-2 px-2.5 text-right font-semibold">
                    {formatBRL(consolidated.grossProfit)}
                  </td>
                </tr>

                {/* 6. (−) Despesas Operacionais e Folha */}
                <tr className="hover:bg-slate-900/30 text-rose-300/80">
                  <td className="py-2 text-left">(−) Despesas Operacionais / Folha</td>
                  <td className="py-2 px-2.5 text-right">-{formatBRL(unit.operatingExpenses)}</td>
                  <td className="py-2 px-2.5 text-right">
                    -{formatBRL(consolidated.operatingExpenses)}
                  </td>
                </tr>

                {/* 7. (=) LAIR (Lucro antes de IRPJ/CSLL) */}
                <tr className="bg-slate-950/40 font-bold text-slate-100">
                  <td className="py-2 text-left">= Lucro antes do IR (LAIR)</td>
                  <td className="py-2 px-2.5 text-right">{formatBRL(unit.lair)}</td>
                  <td className="py-2 px-2.5 text-right">{formatBRL(consolidated.lair)}</td>
                </tr>

                {/* IRPJ e CSLL nos regimes aplicáveis */}
                {regimeKey !== 'simples' && (
                  <>
                    <tr className="hover:bg-slate-900/30 text-slate-400">
                      <td className="py-1.5 text-left">
                        (−) IRPJ{' '}
                        {regimeKey === 'presumido'
                          ? `(base ${irpjPresumptionRate || 8}%)`
                          : '(LALUR)'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right">
                        -{formatBRL(unit.irpj + unit.irpjAdditional)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right">
                        -{formatBRL(consolidated.irpj + consolidated.irpjAdditional)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-900/30 text-slate-400">
                      <td className="py-1.5 text-left">
                        (−) CSLL{' '}
                        {regimeKey === 'presumido'
                          ? `(base ${csllPresumptionRate || 12}%)`
                          : '(LALUR)'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right">-{formatBRL(unit.csll)}</td>
                      <td className="py-1.5 px-2.5 text-right">-{formatBRL(consolidated.csll)}</td>
                    </tr>
                  </>
                )}

                {/* 8. (=) Lucro Líquido */}
                <tr className="bg-emerald-950/40 text-emerald-400 font-extrabold border-t-2 border-emerald-500/40">
                  <td className="py-2.5 text-left text-sm">= Lucro Líquido</td>
                  <td className="py-2.5 px-2.5 text-right text-sm text-emerald-400">
                    {formatBRL(unit.netProfit)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-sm text-emerald-400">
                    {formatBRL(consolidated.netProfit)}
                  </td>
                </tr>

                {/* 9. Margem Líquida % */}
                <tr className="bg-slate-950/60 font-semibold text-slate-300">
                  <td className="py-2 text-left">Margem Líquida (%)</td>
                  <td className="py-2 px-2.5 text-right text-emerald-400 font-bold">
                    {formatPercentBR(unit.netMargin)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-emerald-400 font-bold">
                    {formatPercentBR(consolidated.netMargin)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cards de Resumo no rodapé de cada DRE */}
      {hasValidData && (
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-800">
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-mono block">Carga Tributária</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-200 block truncate">
              {formatBRL(consolidated.taxesTotal)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
            <span className="text-[10px] text-emerald-400 font-mono block font-semibold">
              Lucro Líquido
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400 block truncate">
              {formatBRL(consolidated.netProfit)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-mono block">Margem</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-200 block truncate">
              {formatPercentBR(consolidated.netMargin)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export const RegimeSideBySideDreTables: React.FC<RegimeSideBySideDreTablesProps> = ({
  regimeKey,
  data,
  activityName,
  pgdasDescription,
  irpjPresumptionRate,
  csllPresumptionRate,
}) => {
  const { quantity, costMargin, liquid, regimeName } = data

  const getRegimeIcon = () => {
    if (regimeKey === 'presumido') return <Briefcase className="w-5 h-5 text-emerald-400" />
    if (regimeKey === 'real') return <Factory className="w-5 h-5 text-emerald-400" />
    return <Building2 className="w-5 h-5 text-emerald-400" />
  }

  return (
    <div className="space-y-4">
      {/* Barra Informativa do Regime: Unitário = Consolidado ÷ Qtd. do regime */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/30 text-xs font-mono text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            {getRegimeIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">
                Demonstração do Resultado — {regimeName}
              </span>
              {activityName && (
                <span className="text-[11px] text-emerald-400 font-mono">({activityName})</span>
              )}
              {pgdasDescription && (
                <span className="text-[11px] text-emerald-400 font-mono">({pgdasDescription})</span>
              )}
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/5 px-2 py-0.2"
              >
                {quantity} un. ({regimeKey})
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Unitário = Consolidado ÷ {quantity > 0 ? quantity : 1} un. · Consolidado = Unitário ×{' '}
              {quantity > 0 ? quantity : 1} un.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Apurado item a item via motor comparativo unificado</span>
        </div>
      </div>

      {/* DUAS DREs LADO A LADO (empilhadas em mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* DRE 1: DRE pelo Custo + Margem */}
        <SingleDreTable
          title="DRE pelo Custo + Margem"
          modeKey="costMargin"
          colData={costMargin}
          quantity={quantity}
          regimeKey={regimeKey}
          irpjPresumptionRate={irpjPresumptionRate}
          csllPresumptionRate={csllPresumptionRate}
          headerBadgeColor="blue"
        />

        {/* DRE 2: DRE pela Receita Líquida de Vendas */}
        <SingleDreTable
          title="DRE pela Receita Líquida de Vendas"
          modeKey="liquid"
          colData={liquid}
          quantity={quantity}
          regimeKey={regimeKey}
          irpjPresumptionRate={irpjPresumptionRate}
          csllPresumptionRate={csllPresumptionRate}
          headerBadgeColor="emerald"
        />
      </div>
    </div>
  )
}
