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
  // safeQty usa a quantidade real sincronizada do regime
  const safeQty = quantity > 0 ? quantity : 1

  const badgeBg =
    headerBadgeColor === 'emerald'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-slate-100 text-slate-800 border-slate-300'

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {title}
            </h4>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 ${badgeBg}`}
            >
              {title === 'DRE pelo Custo + Margem' ? 'Modo Custo + Margem' : 'Modo Meta Líquida'}
            </Badge>
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-semibold">
            {quantity > 0 ? `${quantity} un.` : 'sem qtd'}
          </span>
        </div>

        {!hasValidData ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-semibold">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Valores não apurados para este modo</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {invalidReason ||
                (title === 'DRE pelo Custo + Margem'
                  ? 'Custo unitário da mercadoria ou margem não informados para este regime no Markup.'
                  : 'Meta do Preço Líquido Desejado não preenchida para este regime no Markup.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-xs font-semibold text-white">
                  <th className="py-2.5 px-3 text-left font-semibold text-white rounded-tl-xl">
                    Descrição
                  </th>
                  <th className="py-2.5 px-2.5 font-semibold text-white text-right w-28 sm:w-32">
                    Unitário
                  </th>
                  <th className="py-2.5 px-2.5 font-semibold text-white text-right w-32 sm:w-36 rounded-tr-xl">
                    Total ({safeQty} un.)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Receita Bruta */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 text-left font-semibold text-slate-900">
                    Receita Bruta
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">
                    {formatBRL(unit.grossRevenue)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">
                    {formatBRL(consolidated.grossRevenue)}
                  </td>
                </tr>

                {/* 2. (-) Tributos do Regime */}
                {regimeKey === 'simples' ? (
                  <tr className="hover:bg-slate-50/70 transition-colors text-slate-700 bg-slate-50/40">
                    <td className="py-2 px-3 text-left font-medium text-slate-700">
                      (−) Guia Única DAS (alíquota efetiva PGDAS)
                    </td>
                    <td className="py-2 px-2.5 text-right font-medium text-rose-700">
                      -{formatBRL(unit.dasTotal)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-medium text-rose-700">
                      -{formatBRL(consolidated.dasTotal)}
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="hover:bg-slate-50/70 transition-colors text-slate-700">
                      <td className="py-1.5 px-3 text-left">(−) ICMS / ISS</td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(unit.icmsOrIss)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(consolidated.icmsOrIss)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors text-slate-700">
                      <td className="py-1.5 px-3 text-left">
                        (−) PIS {regimeKey === 'presumido' ? '(0,65%)' : '(1,65%)'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(unit.pis)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(consolidated.pis)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors text-slate-700">
                      <td className="py-1.5 px-3 text-left">
                        (−) COFINS {regimeKey === 'presumido' ? '(3,00%)' : '(7,60%)'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(unit.cofins)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(consolidated.cofins)}
                      </td>
                    </tr>
                  </>
                )}

                {/* 3. (=) Receita Líquida */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="py-2 px-3 text-left">= Receita Líquida</td>
                  <td className="py-2 px-2.5 text-right text-slate-900">
                    {formatBRL(unit.netRevenue)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-slate-900">
                    {formatBRL(consolidated.netRevenue)}
                  </td>
                </tr>

                {/* 4. (−) CMV */}
                <tr className="hover:bg-slate-50/70 transition-colors text-slate-700">
                  <td className="py-2 px-3 text-left">
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
                  <td className="py-2 px-2.5 text-right text-rose-700">-{formatBRL(unit.cmv)}</td>
                  <td className="py-2 px-2.5 text-right text-rose-700">
                    -{formatBRL(consolidated.cmv)}
                  </td>
                </tr>

                {/* Linha expansível com discriminação de CMV */}
                <tr>
                  <td colSpan={3} className="py-1 px-3">
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
                <tr className="bg-slate-50/60 font-semibold text-slate-900">
                  <td className="py-2 px-3 text-left">= Lucro Bruto</td>
                  <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                    {formatBRL(unit.grossProfit)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                    {formatBRL(consolidated.grossProfit)}
                  </td>
                </tr>

                {/* 6. (−) Despesas Operacionais e Folha */}
                <tr className="hover:bg-slate-50/70 transition-colors text-rose-700">
                  <td className="py-2 px-3 text-left">(−) Despesas Operacionais / Folha</td>
                  <td className="py-2 px-2.5 text-right">-{formatBRL(unit.operatingExpenses)}</td>
                  <td className="py-2 px-2.5 text-right">
                    -{formatBRL(consolidated.operatingExpenses)}
                  </td>
                </tr>

                {/* 7. (=) LAIR (Lucro antes de IRPJ/CSLL) */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="py-2 px-3 text-left">= Lucro antes do IR (LAIR)</td>
                  <td className="py-2 px-2.5 text-right text-slate-900">{formatBRL(unit.lair)}</td>
                  <td className="py-2 px-2.5 text-right text-slate-900">
                    {formatBRL(consolidated.lair)}
                  </td>
                </tr>

                {/* IRPJ e CSLL nos regimes aplicáveis */}
                {regimeKey !== 'simples' && (
                  <>
                    <tr className="hover:bg-slate-50/70 transition-colors text-slate-700">
                      <td className="py-1.5 px-3 text-left">
                        (−) IRPJ{' '}
                        {regimeKey === 'presumido'
                          ? `(base ${irpjPresumptionRate || 8}%)`
                          : '(LALUR)'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(unit.irpj + unit.irpjAdditional)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(consolidated.irpj + consolidated.irpjAdditional)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors text-slate-700">
                      <td className="py-1.5 px-3 text-left">
                        (−) CSLL{' '}
                        {regimeKey === 'presumido'
                          ? `(base ${csllPresumptionRate || 12}%)`
                          : '(LALUR)'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(unit.csll)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-700">
                        -{formatBRL(consolidated.csll)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
              {/* 8 e 9: Faixa de fecho com gradiente navy conforme padrão chancelado */}
              <tfoot className="border-t-2 border-slate-800 bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] text-xs font-mono font-bold text-white">
                <tr>
                  <td className="py-2.5 px-3 text-left text-white font-bold">= Lucro Líquido</td>
                  <td className="py-2.5 px-2.5 text-right text-emerald-400 font-black">
                    {formatBRL(unit.netProfit)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-emerald-400 font-black">
                    {formatBRL(consolidated.netProfit)}
                  </td>
                </tr>
                <tr className="border-t border-slate-800/80 text-[11px] text-slate-300">
                  <td className="py-2 px-3 text-left text-slate-300">Margem Líquida (%)</td>
                  <td className="py-2 px-2.5 text-right text-emerald-400 font-bold">
                    {formatPercentBR(unit.netMargin)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-emerald-400 font-bold">
                    {formatPercentBR(consolidated.netMargin)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Cards de Resumo no rodapé de cada DRE */}
      {hasValidData && (
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-200">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-mono block">Carga Tributária</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 block truncate">
              {formatBRL(consolidated.taxesTotal)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-700 font-mono block font-semibold">
              Lucro Líquido
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-emerald-700 block truncate">
              {formatBRL(consolidated.netProfit)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-mono block">Margem</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 block truncate">
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
    if (regimeKey === 'presumido') return <Briefcase className="w-5 h-5 text-emerald-700" />
    if (regimeKey === 'real') return <Factory className="w-5 h-5 text-emerald-700" />
    return <Building2 className="w-5 h-5 text-emerald-700" />
  }

  return (
    <div className="space-y-4">
      {/* Barra Informativa do Regime: Unitário = Consolidado ÷ Qtd. do regime */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            {getRegimeIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm">
                Demonstração do Resultado — {regimeName}
              </span>
              {activityName && (
                <span className="text-[11px] text-emerald-700 font-mono font-semibold">
                  ({activityName})
                </span>
              )}
              {pgdasDescription && (
                <span className="text-[11px] text-emerald-700 font-mono font-semibold">
                  ({pgdasDescription})
                </span>
              )}
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-emerald-300 text-emerald-800 bg-emerald-50 px-2 py-0.2"
              >
                {quantity} un. ({regimeKey})
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Unitário = soma dos unitários apurados item a item por produto · Consolidado =
              Σ(unitário × quantidade) ({quantity > 0 ? quantity : 0} un.)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-600 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
