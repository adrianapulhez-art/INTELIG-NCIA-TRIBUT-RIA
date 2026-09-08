import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatBRL, formatNumberBR, formatPercentBR } from '@/lib/taxCalculations'
import { calculatePgdas, SIMPLES_ANEXOS, SimplesAnexoId } from '@/lib/simplesCalculations'
import { ActivityType } from '@/contexts/TaxContext'
import {
  SlidersHorizontal,
  Trophy,
  RotateCcw,
  Sparkles,
  TrendingUp,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'

export interface SensitivityAnalysisProps {
  baseQuantity: number
  unitGrossRevenue: number
  totalConsolidatedRevenue: number
  hasConsolidated: boolean
  // Custos unitários de compra
  cmvPresumidoUnit: number
  cmvRealUnit: number
  cmvSimplesUnit: number
  // Despesas compartilhadas
  totalOtherExpenses: number
  directPayrollExpenses: number
  patronalCharges: number
  // Parâmetros Presumido
  presumidoActivity: ActivityType
  presumidoIssRate: number
  icmsRateMarkup: number
  // Parâmetros Real
  realActivity: ActivityType
  realIssRate: number
  realAdditions: number
  realExclusions: number
  // Parâmetros Simples
  simplesAnexoId: SimplesAnexoId
  simplesRbt12: number
  // Flag geral se a simulação base possui números preenchidos
  hasSimulatedData: boolean
}

type RegimeKey = 'presumido' | 'real' | 'simples'

interface VolumePointResult {
  percentVariation: number // ex: -30, -20, -10, 0, 10, 20, 30
  label: string // "-30%", "Base", "+30%"
  quantity: number
  grossRevenue: number
  presumido: {
    taxBurden: number
    netProfit: number
    effectiveTaxRate: number
  }
  real: {
    taxBurden: number
    netProfit: number
    effectiveTaxRate: number
  }
  simples: {
    taxBurden: number
    netProfit: number
    effectiveTaxRate: number
  }
  winnerKey: RegimeKey
  winnerName: string
  winnerNetProfit: number
}

export const SensitivityAnalysisSection: React.FC<SensitivityAnalysisProps> = ({
  baseQuantity,
  unitGrossRevenue,
  totalConsolidatedRevenue,
  hasConsolidated,
  cmvPresumidoUnit,
  cmvRealUnit,
  cmvSimplesUnit,
  totalOtherExpenses,
  directPayrollExpenses,
  patronalCharges,
  presumidoActivity,
  presumidoIssRate,
  icmsRateMarkup,
  realActivity,
  realIssRate,
  realAdditions,
  realExclusions,
  simplesAnexoId,
  simplesRbt12,
  hasSimulatedData,
}) => {
  // Controle de variação em percentual (-30% a +30%)
  const [variationPercent, setVariationPercent] = useState<number>(0)

  // Função pura para calcular 1 ponto de volume
  const calculateForQuantity = (qtyVal: number, variationP: number): VolumePointResult => {
    const q = Math.max(0, qtyVal)

    // Receita Bruta Total
    const grossRevenue =
      hasConsolidated && q === baseQuantity && totalConsolidatedRevenue > 0
        ? totalConsolidatedRevenue
        : unitGrossRevenue * q

    // 1. PRESUMIDO
    const isServicesPresumido = presumidoActivity === 'servicos'
    const irpjPresumptionRate = isServicesPresumido ? 32.0 : 8.0
    const csllPresumptionRate = isServicesPresumido ? 32.0 : 12.0
    const icmsRate = icmsRateMarkup || 0
    const issRatePresumido = isServicesPresumido ? presumidoIssRate : 0
    const pisRatePresumido = 0.65
    const cofinsRatePresumido = 3.0
    const irpjRate = 15.0
    const irpjAdditionalRate = 10.0
    const irpjAdditionalLimit = 60000.0 // trimestral
    const csllRate = 9.0

    const unitMunicipalStateTaxPresumido = isServicesPresumido
      ? (unitGrossRevenue * issRatePresumido) / 100
      : (unitGrossRevenue * icmsRate) / 100

    const unitPisCofinsBasePresumido = isServicesPresumido
      ? unitGrossRevenue
      : Math.max(0, unitGrossRevenue - unitMunicipalStateTaxPresumido)

    const totalMunicipalStateTaxP = unitMunicipalStateTaxPresumido * q
    const totalPisP = (unitPisCofinsBasePresumido * pisRatePresumido * q) / 100
    const totalCofinsP = (unitPisCofinsBasePresumido * cofinsRatePresumido * q) / 100
    const totalCmvP = cmvPresumidoUnit * q
    const totalNetRevenueP = grossRevenue - totalMunicipalStateTaxP - totalPisP - totalCofinsP
    const totalGrossProfitP = totalNetRevenueP - totalCmvP

    const totalExpensesP = totalOtherExpenses + directPayrollExpenses + patronalCharges
    const totalResultBeforeTaxP = totalGrossProfitP - totalExpensesP

    const totalIrpjBaseP = (grossRevenue * irpjPresumptionRate) / 100
    const totalCsllBaseP = (grossRevenue * csllPresumptionRate) / 100
    const totalIrpjP = (totalIrpjBaseP * irpjRate) / 100
    const totalIrpjExcessP = Math.max(0, totalIrpjBaseP - irpjAdditionalLimit)
    const totalIrpjAdditionalP = (totalIrpjExcessP * irpjAdditionalRate) / 100
    const totalCsllP = (totalCsllBaseP * csllRate) / 100

    const totalNetProfitP = totalResultBeforeTaxP - totalIrpjP - totalIrpjAdditionalP - totalCsllP
    const totalTaxBurdenP =
      totalMunicipalStateTaxP +
      totalPisP +
      totalCofinsP +
      totalIrpjP +
      totalIrpjAdditionalP +
      totalCsllP +
      patronalCharges
    const effectiveTaxRateP = grossRevenue > 0 ? (totalTaxBurdenP / grossRevenue) * 100 : 0

    // 2. REAL
    const isServicesReal = realActivity === 'servicos'
    const issRateReal = isServicesReal ? realIssRate : 0
    const pisRateReal = 1.65
    const cofinsRateReal = 7.6

    const unitMunicipalStateTaxReal = isServicesReal
      ? (unitGrossRevenue * issRateReal) / 100
      : (unitGrossRevenue * icmsRate) / 100

    const unitPisCofinsBaseReal = isServicesReal
      ? unitGrossRevenue
      : Math.max(0, unitGrossRevenue - unitMunicipalStateTaxReal)

    const totalMunicipalStateTaxR = unitMunicipalStateTaxReal * q
    const totalPisR = (unitPisCofinsBaseReal * pisRateReal * q) / 100
    const totalCofinsR = (unitPisCofinsBaseReal * cofinsRateReal * q) / 100
    const totalCmvR = cmvRealUnit * q
    const totalNetRevenueR = grossRevenue - totalMunicipalStateTaxR - totalPisR - totalCofinsR
    const totalGrossProfitR = totalNetRevenueR - totalCmvR

    const totalExpensesR = totalOtherExpenses + directPayrollExpenses + patronalCharges
    const totalResultBeforeTaxR = totalGrossProfitR - totalExpensesR

    const taxableRealProfit = Math.max(
      0,
      totalResultBeforeTaxR + (realAdditions || 0) - (realExclusions || 0),
    )
    const totalIrpjR = (taxableRealProfit * irpjRate) / 100
    const totalIrpjExcessR = Math.max(0, taxableRealProfit - irpjAdditionalLimit)
    const totalIrpjAdditionalR = (totalIrpjExcessR * irpjAdditionalRate) / 100
    const totalCsllR = (taxableRealProfit * csllRate) / 100

    const totalNetProfitR = totalResultBeforeTaxR - totalIrpjR - totalIrpjAdditionalR - totalCsllR
    const totalTaxBurdenR =
      totalMunicipalStateTaxR +
      totalPisR +
      totalCofinsR +
      totalIrpjR +
      totalIrpjAdditionalR +
      totalCsllR +
      patronalCharges
    const effectiveTaxRateR = grossRevenue > 0 ? (totalTaxBurdenR / grossRevenue) * 100 : 0

    // 3. SIMPLES NACIONAL
    const pgdas = calculatePgdas(simplesAnexoId, simplesRbt12)
    const effectiveRateSimples = pgdas.aliquotaEfetiva / 100
    const totalDasS = grossRevenue * effectiveRateSimples
    const totalCmvS = cmvSimplesUnit * q
    const totalNetRevenueS = grossRevenue - totalDasS
    const totalGrossProfitS = totalNetRevenueS - totalCmvS
    const totalExpensesS = totalOtherExpenses + directPayrollExpenses // CPP inclusa no DAS
    const totalNetProfitS = totalGrossProfitS - totalExpensesS
    const totalTaxBurdenS = totalDasS
    const effectiveTaxRateS = pgdas.aliquotaEfetiva

    // Identificar vencedor no ponto
    const options = [
      {
        key: 'presumido' as RegimeKey,
        name: 'Lucro Presumido',
        net: totalNetProfitP,
        tax: totalTaxBurdenP,
      },
      { key: 'real' as RegimeKey, name: 'Lucro Real', net: totalNetProfitR, tax: totalTaxBurdenR },
      {
        key: 'simples' as RegimeKey,
        name: 'Simples Nacional',
        net: totalNetProfitS,
        tax: totalTaxBurdenS,
      },
    ].sort((a, b) => {
      if (b.net !== a.net) return b.net - a.net
      return a.tax - b.tax
    })

    const winner = options[0]

    return {
      percentVariation: variationP,
      label: variationP === 0 ? 'Cenário Base (0%)' : `${variationP > 0 ? '+' : ''}${variationP}%`,
      quantity: q,
      grossRevenue,
      presumido: {
        taxBurden: totalTaxBurdenP,
        netProfit: totalNetProfitP,
        effectiveTaxRate: effectiveTaxRateP,
      },
      real: {
        taxBurden: totalTaxBurdenR,
        netProfit: totalNetProfitR,
        effectiveTaxRate: effectiveTaxRateR,
      },
      simples: {
        taxBurden: totalTaxBurdenS,
        netProfit: totalNetProfitS,
        effectiveTaxRate: effectiveTaxRateS,
      },
      winnerKey: winner.key,
      winnerName: winner.name,
      winnerNetProfit: winner.net,
    }
  }

  // Grade fixa de 7 pontos (-30%, -20%, -10%, 0%, +10%, +20%, +30%)
  const discreteSteps = [-30, -20, -10, 0, 10, 20, 30]

  const pointsGrid: VolumePointResult[] = useMemo(() => {
    return discreteSteps.map((step) => {
      const adjustedQty = Math.round(baseQuantity * (1 + step / 100))
      return calculateForQuantity(adjustedQty, step)
    })
  }, [
    baseQuantity,
    unitGrossRevenue,
    totalConsolidatedRevenue,
    hasConsolidated,
    cmvPresumidoUnit,
    cmvRealUnit,
    cmvSimplesUnit,
    totalOtherExpenses,
    directPayrollExpenses,
    patronalCharges,
    presumidoActivity,
    presumidoIssRate,
    icmsRateMarkup,
    realActivity,
    realIssRate,
    realAdditions,
    realExclusions,
    simplesAnexoId,
    simplesRbt12,
  ])

  // Ponto dinâmico selecionado pelo Slider/passo
  const activePointResult: VolumePointResult = useMemo(() => {
    const adjustedQty = Math.round(baseQuantity * (1 + variationPercent / 100))
    return calculateForQuantity(adjustedQty, variationPercent)
  }, [
    variationPercent,
    baseQuantity,
    unitGrossRevenue,
    totalConsolidatedRevenue,
    hasConsolidated,
    cmvPresumidoUnit,
    cmvRealUnit,
    cmvSimplesUnit,
    totalOtherExpenses,
    directPayrollExpenses,
    patronalCharges,
    presumidoActivity,
    presumidoIssRate,
    icmsRateMarkup,
    realActivity,
    realIssRate,
    realAdditions,
    realExclusions,
    simplesAnexoId,
    simplesRbt12,
  ])

  // Verifica se há inversão de vencedor entre os 7 pontos testados
  const distinctWinners = Array.from(new Set(pointsGrid.map((p) => p.winnerKey)))
  const hasWinnerInversion = distinctWinners.length > 1

  // Se não houver dados simulados / quantidade ou preço zerados, não renderiza JSX
  if (!hasSimulatedData || baseQuantity <= 0 || unitGrossRevenue <= 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0b101b]/90 p-5 sm:p-6 shadow-xl space-y-5 font-mono">
      {/* Cabeçalho do Bloco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-sans">
              Sensibilidade de Volume & Ponto de Equilíbrio
            </h3>
            <p className="text-[11px] text-slate-400">
              Simulação exploratória da variação de demanda (−30% a +30%) sem alterar os dados
              oficiais do cenário
            </p>
          </div>
        </div>

        {/* Botão de Restaurar a 0% */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVariationPercent(0)}
          disabled={variationPercent === 0}
          className="h-7 text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 cursor-pointer gap-1.5 self-start sm:self-center"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restaurar (0%)</span>
        </Button>
      </div>

      {/* Destaque se houver inversão de regime vencedor */}
      {hasWinnerInversion ? (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 block">
              Atenção: O regime tributário vencedor muda conforme o volume de vendas!
            </span>
            <p className="text-[11px] leading-relaxed">
              Dependendo da escala de produção/vendas, a proporção de custos fixos e a incidência
              cumulativa vs. não cumulativa invertem a vantagem competitiva. Observe os pontos na
              tabela abaixo.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              O regime <strong>{pointsGrid[3].winnerName}</strong> mantém a liderança em toda a
              faixa de variação testada (−30% a +30%).
            </span>
          </div>
          <span className="text-[10px] text-slate-400 hidden sm:inline">Comportamento estável</span>
        </div>
      )}

      {/* Controle Interativo: Slider e Botões de Passo */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
              Variação de Volume Selecionada:{' '}
              <span
                className={`font-mono text-sm font-black ${
                  variationPercent > 0
                    ? 'text-emerald-400'
                    : variationPercent < 0
                      ? 'text-rose-400'
                      : 'text-slate-100'
                }`}
              >
                {variationPercent > 0 ? `+${variationPercent}%` : `${variationPercent}%`}
              </span>
            </span>
            <span className="text-[11px] text-slate-400">
              Quantidade base: <strong>{baseQuantity} un.</strong> → Simulação exploratória:{' '}
              <strong className="text-emerald-400">{activePointResult.quantity} un.</strong>
            </span>
          </div>

          {/* Botões de atalho rápido */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[-30, -15, 0, 15, 30].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setVariationPercent(step)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  variationPercent === step
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-white'
                }`}
              >
                {step === 0 ? 'Base' : `${step > 0 ? '+' : ''}${step}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Slider -30 a +30 */}
        <div className="pt-2 px-1">
          <Slider
            min={-30}
            max={30}
            step={5}
            value={[variationPercent]}
            onValueChange={(val) => setVariationPercent(val[0] ?? 0)}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 pt-1.5 font-mono">
            <span>−30% ({Math.round(baseQuantity * 0.7)} un.)</span>
            <span>−15%</span>
            <span className="text-slate-300 font-bold">Base 0% ({baseQuantity} un.)</span>
            <span>+15%</span>
            <span>+30% ({Math.round(baseQuantity * 1.3)} un.)</span>
          </div>
        </div>

        {/* Card Destaque do Ponto Selecionado */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">
              Receita Bruta Ajustada
            </span>
            <span className="text-sm font-bold text-white">
              {formatBRL(activePointResult.grossRevenue)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Lucro Presumido</span>
            <span
              className={`text-sm font-bold block ${
                activePointResult.winnerKey === 'presumido' ? 'text-emerald-400' : 'text-slate-200'
              }`}
            >
              {formatBRL(activePointResult.presumido.netProfit)}
            </span>
            <span className="text-[10px] text-slate-500">
              Carga: {formatBRL(activePointResult.presumido.taxBurden)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Lucro Real</span>
            <span
              className={`text-sm font-bold block ${
                activePointResult.winnerKey === 'real' ? 'text-emerald-400' : 'text-slate-200'
              }`}
            >
              {formatBRL(activePointResult.real.netProfit)}
            </span>
            <span className="text-[10px] text-slate-500">
              Carga: {formatBRL(activePointResult.real.taxBurden)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Simples Nacional</span>
            <span
              className={`text-sm font-bold block ${
                activePointResult.winnerKey === 'simples' ? 'text-emerald-400' : 'text-slate-200'
              }`}
            >
              {formatBRL(activePointResult.simples.netProfit)}
            </span>
            <span className="text-[10px] text-slate-500">
              Carga: {formatBRL(activePointResult.simples.taxBurden)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Sensibilidade Completa (−30% a +30%) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-sans">
            Curva de Resultados por Faixa de Volume
          </span>
          <span className="text-[10px] text-slate-500">Valores recalculados ponto a ponto</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left">
                <th className="py-2.5 px-2.5 font-semibold text-slate-300">Variação</th>
                <th className="py-2.5 px-2.5 font-semibold text-slate-300">Quantidade</th>
                <th className="py-2.5 px-2.5 font-semibold text-slate-300">Receita Bruta</th>
                <th className="py-2.5 px-2.5 font-semibold text-slate-300 text-right">
                  Lucro Presumido
                </th>
                <th className="py-2.5 px-2.5 font-semibold text-slate-300 text-right">
                  Lucro Real
                </th>
                <th className="py-2.5 px-2.5 font-semibold text-slate-300 text-right">
                  Simples Nacional
                </th>
                <th className="py-2.5 px-2.5 font-semibold text-slate-300 text-center">
                  Vencedor no Volume
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pointsGrid.map((pt) => {
                const isBase = pt.percentVariation === 0
                const isSelected = pt.percentVariation === variationPercent

                return (
                  <tr
                    key={pt.percentVariation}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/15 border-l-2 border-emerald-400 font-semibold'
                        : isBase
                          ? 'bg-slate-900/50'
                          : 'hover:bg-slate-900/30'
                    }`}
                  >
                    {/* Variação */}
                    <td className="py-2.5 px-2.5 text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold ${
                            pt.percentVariation > 0
                              ? 'text-emerald-400'
                              : pt.percentVariation < 0
                                ? 'text-rose-400'
                                : 'text-white'
                          }`}
                        >
                          {pt.label}
                        </span>
                        {isBase && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">
                            Base
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quantidade */}
                    <td className="py-2.5 px-2.5 text-slate-300">{pt.quantity} un.</td>

                    {/* Receita Bruta */}
                    <td className="py-2.5 px-2.5 text-slate-200">{formatBRL(pt.grossRevenue)}</td>

                    {/* Presumido */}
                    <td
                      className={`py-2.5 px-2.5 text-right ${
                        pt.winnerKey === 'presumido'
                          ? 'text-emerald-400 font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      <div>{formatBRL(pt.presumido.netProfit)}</div>
                      <div className="text-[10px] text-slate-500">
                        {formatNumberBR(pt.presumido.effectiveTaxRate, 1)}% carga
                      </div>
                    </td>

                    {/* Real */}
                    <td
                      className={`py-2.5 px-2.5 text-right ${
                        pt.winnerKey === 'real' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <div>{formatBRL(pt.real.netProfit)}</div>
                      <div className="text-[10px] text-slate-500">
                        {formatNumberBR(pt.real.effectiveTaxRate, 1)}% carga
                      </div>
                    </td>

                    {/* Simples */}
                    <td
                      className={`py-2.5 px-2.5 text-right ${
                        pt.winnerKey === 'simples' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <div>{formatBRL(pt.simples.netProfit)}</div>
                      <div className="text-[10px] text-slate-500">
                        {formatNumberBR(pt.simples.effectiveTaxRate, 1)}% carga
                      </div>
                    </td>

                    {/* Vencedor */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Trophy className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{pt.winnerName}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
