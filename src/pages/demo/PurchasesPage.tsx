import React from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { useTaxContext } from '@/contexts/TaxContext'
import { Package, ArrowUpRight, ArrowDownRight, Plus, Trash2 } from 'lucide-react'
import { formatBRL, formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function PurchasesPage() {
  const {
    regime,
    setRegime,
    initialInventory,
    setInitialInventory,
    finalInventory,
    setFinalInventory,
    additionalCosts,
    addAdditionalCost,
    updateAdditionalCost,
    removeAdditionalCost,
    nonRecoverableTaxBase,
    setNonRecoverableTaxBase,
    nonRecoverableTaxRate,
    setNonRecoverableTaxRate,
    deductionCosts,
    addDeductionCost,
    updateDeductionCost,
    removeDeductionCost,
    icmsPurchasesBase,
    setIcmsPurchasesBase,
    icmsPurchasesRate,
    setIcmsPurchasesRate,
    icmsFreightPurchasesBase,
    setIcmsFreightPurchasesBase,
    icmsFreightPurchasesRate,
    setIcmsFreightPurchasesRate,
    pisPurchasesBase,
    setPisPurchasesBase,
    pisExcludedIcmsManual,
    setPisExcludedIcmsManual,
    cofinsPurchasesBase,
    setCofinsPurchasesBase,
    cofinsExcludedIcmsManual,
    setCofinsExcludedIcmsManual,
    pisFreightPurchasesBase,
    setPisFreightPurchasesBase,
    cofinsFreightPurchasesBase,
    setCofinsFreightPurchasesBase,
    calculatedPurchases,
  } = useTaxContext()

  // Alíquotas automáticas de PIS/COFINS por regime
  const pisRate = regime === 'real' ? 1.65 : 0.65
  const cofinsRate = regime === 'real' ? 7.6 : 3.0

  return (
    <DemoLayout currentTab="compras">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Calculadora de Compras
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Informe estoques, acréscimos e deduções. O CMV é calculado nas páginas de regime
                tributário, conforme os tributos recuperáveis de cada um.
              </p>
            </div>
          </div>

          {/* Bloco Verde: Regime Tributário das Compras */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold uppercase text-emerald-400">
                Regime tributário das compras
              </span>

              {/* Botões Presumido / Real sincronizados */}
              <div className="inline-flex rounded-lg bg-slate-950/80 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRegime('presumido')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                    regime === 'presumido'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Lucro Presumido
                </button>
                <button
                  type="button"
                  onClick={() => setRegime('real')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                    regime === 'real'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Lucro Real
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              {regime === 'presumido' ? (
                <span>
                  💡 <strong>Lucro Presumido:</strong> apenas o ICMS é recuperável; PIS e COFINS
                  integram o custo das compras.
                </span>
              ) : (
                <span>
                  💡 <strong>Lucro Real:</strong> ICMS, PIS e COFINS (inclusive sobre frete) são
                  recuperáveis e deduzem as compras.
                </span>
              )}
            </p>
          </div>

          {/* Campos EI e EF lado a lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Estoque inicial (EI)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  R$
                </span>
                <Input
                  type="text"
                  placeholder="0,00"
                  defaultValue={initialInventory > 0 ? formatNumberBR(initialInventory) : ''}
                  key={`ei-${initialInventory}`}
                  onBlur={(e) => setInitialInventory(parseBRNumber(e.target.value))}
                  className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 font-mono text-sm focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Estoque final (EF)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  R$
                </span>
                <Input
                  type="text"
                  placeholder="0,00"
                  defaultValue={finalInventory > 0 ? formatNumberBR(finalInventory) : ''}
                  key={`ef-${finalInventory}`}
                  onBlur={(e) => setFinalInventory(parseBRNumber(e.target.value))}
                  className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 font-mono text-sm focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 1: Acréscimos ao Custo */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Acréscimos ao custo</h3>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addAdditionalCost('Novo acréscimo', 0)}
                className="h-7 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar acréscimo
              </Button>
            </div>

            <p className="text-xs text-slate-400">
              Compras brutas, frete/seguro e tributos não recuperáveis (calculados "por fora", como
              o IPI no comércio).
            </p>

            {/* Linhas expansíveis Descrição + Valor + Lixeira */}
            <div className="space-y-2">
              {additionalCosts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80"
                >
                  <Input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateAdditionalCost(item.id, 'description', e.target.value)}
                    placeholder="Descrição do acréscimo"
                    className="flex-1 bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-200"
                  />
                  <div className="relative w-36 sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                      R$
                    </span>
                    <Input
                      type="text"
                      defaultValue={item.value > 0 ? formatNumberBR(item.value) : ''}
                      key={`add-${item.id}-${item.value}`}
                      onBlur={(e) =>
                        updateAdditionalCost(item.id, 'value', parseBRNumber(e.target.value))
                      }
                      placeholder="0,00"
                      className="pl-8 text-right bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAdditionalCost(item.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Bloco Verde Destacado: Tributos não recuperáveis (ex.: IPI) */}
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2">
              <span className="text-xs font-mono font-semibold uppercase text-emerald-400">
                % Tributos não recuperáveis (ex.: IPI)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">Base de cálculo</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                      R$
                    </span>
                    <Input
                      type="text"
                      placeholder="0,00"
                      defaultValue={
                        nonRecoverableTaxBase > 0 ? formatNumberBR(nonRecoverableTaxBase) : ''
                      }
                      key={`ipi-base-${nonRecoverableTaxBase}`}
                      onBlur={(e) => setNonRecoverableTaxBase(parseBRNumber(e.target.value))}
                      className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">Alíquota %</span>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="0,00"
                      defaultValue={
                        nonRecoverableTaxRate > 0 ? formatNumberBR(nonRecoverableTaxRate) : ''
                      }
                      key={`ipi-rate-${nonRecoverableTaxRate}`}
                      onBlur={(e) => setNonRecoverableTaxRate(parseBRNumber(e.target.value))}
                      className="pr-6 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">Resultado</span>
                  <div className="h-9 px-3 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                    {formatBRL(calculatedPurchases.nonRecoverableTaxResult)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Deduções do Custo */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Deduções do custo</h3>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addDeductionCost('Nova dedução', 0)}
                className="h-7 text-xs bg-slate-950/40 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar dedução
              </Button>
            </div>

            <p className="text-xs text-slate-400">
              Devoluções, abatimentos, descontos incondicionais e tributos ("por dentro", como o
              ICMS). Quais deles serão de fato deduzidos depende do regime tributário.
            </p>

            {/* Faixa verde mono indicando o regime */}
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300">
              Regime aplicado:{' '}
              <strong>{regime === 'real' ? 'Lucro Real' : 'Lucro Presumido'}</strong> — alíquotas
              preenchidas automaticamente e tributos recuperáveis adequados.
            </div>

            {/* Linhas de Deduções (Devoluções/abatimentos/descontos) */}
            <div className="space-y-2">
              {deductionCosts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80"
                >
                  <Input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateDeductionCost(item.id, 'description', e.target.value)}
                    placeholder="Descrição da dedução"
                    className="flex-1 bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-200"
                  />
                  <div className="relative w-36 sm:w-44">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                      R$
                    </span>
                    <Input
                      type="text"
                      defaultValue={item.value > 0 ? formatNumberBR(item.value) : ''}
                      key={`ded-${item.id}-${item.value}`}
                      onBlur={(e) =>
                        updateDeductionCost(item.id, 'value', parseBRNumber(e.target.value))
                      }
                      placeholder="0,00"
                      className="pl-8 text-right bg-slate-900/80 border-slate-800 text-xs font-mono text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDeductionCost(item.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* BLOCO ICMS */}
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2">
              <span className="text-xs font-mono font-semibold uppercase text-emerald-400">
                ICMS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">Base de cálculo</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                      R$
                    </span>
                    <Input
                      type="text"
                      placeholder="0,00"
                      defaultValue={icmsPurchasesBase > 0 ? formatNumberBR(icmsPurchasesBase) : ''}
                      key={`icms-b-${icmsPurchasesBase}`}
                      onBlur={(e) => setIcmsPurchasesBase(parseBRNumber(e.target.value))}
                      className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">Alíquota %</span>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="0,00"
                      defaultValue={icmsPurchasesRate > 0 ? formatNumberBR(icmsPurchasesRate) : ''}
                      key={`icms-r-${icmsPurchasesRate}`}
                      onBlur={(e) => setIcmsPurchasesRate(parseBRNumber(e.target.value))}
                      className="pr-6 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">Resultado</span>
                  <div className="h-9 px-3 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                    {formatBRL(calculatedPurchases.icmsResult)}
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCO ICMS SOBRE FRETE */}
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2">
              <span className="text-xs font-mono font-semibold uppercase text-emerald-400">
                ICMS sobre frete
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">Base de cálculo</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                      R$
                    </span>
                    <Input
                      type="text"
                      placeholder="0,00"
                      defaultValue={
                        icmsFreightPurchasesBase > 0 ? formatNumberBR(icmsFreightPurchasesBase) : ''
                      }
                      key={`icms-fb-${icmsFreightPurchasesBase}`}
                      onBlur={(e) => setIcmsFreightPurchasesBase(parseBRNumber(e.target.value))}
                      className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">Alíquota %</span>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="0,00"
                      defaultValue={
                        icmsFreightPurchasesRate > 0 ? formatNumberBR(icmsFreightPurchasesRate) : ''
                      }
                      key={`icms-fr-${icmsFreightPurchasesRate}`}
                      onBlur={(e) => setIcmsFreightPurchasesRate(parseBRNumber(e.target.value))}
                      className="pr-6 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">Resultado</span>
                  <div className="h-9 px-3 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                    {formatBRL(calculatedPurchases.icmsFreightResult)}
                  </div>
                </div>
              </div>
            </div>

            {/* SE REGIME REAL: Exibe também PIS, COFINS, PIS s/ Frete, COFINS s/ Frete com Tese do Século */}
            {regime === 'real' && (
              <div className="space-y-4 pt-2">
                {/* BLOCO PIS (Tese do Século - 5 colunas) */}
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase text-emerald-400">
                      PIS (não cumulativo · tese do século)
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Alíquota: <strong>{formatNumberBR(pisRate)}%</strong> (automática)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono">
                    Tese do século: o ICMS ({formatBRL(calculatedPurchases.icmsResult)}) é excluído
                    da base de cálculo. Deixe o campo vazio para usar automaticamente o ICMS
                    calculado acima.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Base de cálculo</span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          placeholder="0,00"
                          defaultValue={
                            pisPurchasesBase > 0 ? formatNumberBR(pisPurchasesBase) : ''
                          }
                          key={`pis-b-${pisPurchasesBase}`}
                          onBlur={(e) => setPisPurchasesBase(parseBRNumber(e.target.value))}
                          className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono truncate block">
                        (−) ICMS a excluir
                      </span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          placeholder={formatNumberBR(calculatedPurchases.icmsResult)}
                          defaultValue={
                            pisExcludedIcmsManual !== null
                              ? formatNumberBR(pisExcludedIcmsManual)
                              : ''
                          }
                          key={`pis-ex-${pisExcludedIcmsManual}`}
                          onBlur={(e) => {
                            const val = e.target.value.trim()
                            setPisExcludedIcmsManual(val ? parseBRNumber(val) : null)
                          }}
                          className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Base ajustada</span>
                      <div className="h-9 px-2 rounded-md bg-slate-950/90 border border-emerald-500/30 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                        {formatBRL(calculatedPurchases.pisAdjustedBase)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Alíquota</span>
                      <div className="h-9 px-2 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs text-slate-300">
                        {formatNumberBR(pisRate)}%
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Resultado</span>
                      <div className="h-9 px-2 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                        {formatBRL(calculatedPurchases.pisResult)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO COFINS (Tese do Século - 5 colunas) */}
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase text-emerald-400">
                      COFINS (não cumulativo · tese do século)
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Alíquota: <strong>{formatNumberBR(cofinsRate)}%</strong> (automática)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono">
                    Tese do século: o ICMS ({formatBRL(calculatedPurchases.icmsResult)}) é excluído
                    da base de cálculo. Deixe o campo vazio para usar automaticamente o ICMS
                    calculado acima.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Base de cálculo</span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          placeholder="0,00"
                          defaultValue={
                            cofinsPurchasesBase > 0 ? formatNumberBR(cofinsPurchasesBase) : ''
                          }
                          key={`cof-b-${cofinsPurchasesBase}`}
                          onBlur={(e) => setCofinsPurchasesBase(parseBRNumber(e.target.value))}
                          className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono truncate block">
                        (−) ICMS a excluir
                      </span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          placeholder={formatNumberBR(calculatedPurchases.icmsResult)}
                          defaultValue={
                            cofinsExcludedIcmsManual !== null
                              ? formatNumberBR(cofinsExcludedIcmsManual)
                              : ''
                          }
                          key={`cof-ex-${cofinsExcludedIcmsManual}`}
                          onBlur={(e) => {
                            const val = e.target.value.trim()
                            setCofinsExcludedIcmsManual(val ? parseBRNumber(val) : null)
                          }}
                          className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Base ajustada</span>
                      <div className="h-9 px-2 rounded-md bg-slate-950/90 border border-emerald-500/30 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                        {formatBRL(calculatedPurchases.cofinsAdjustedBase)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Alíquota</span>
                      <div className="h-9 px-2 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs text-slate-300">
                        {formatNumberBR(cofinsRate)}%
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Resultado</span>
                      <div className="h-9 px-2 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                        {formatBRL(calculatedPurchases.cofinsResult)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO PIS SOBRE FRETE */}
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2">
                  <span className="text-xs font-mono font-semibold uppercase text-emerald-400">
                    PIS sobre frete
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Base de cálculo</span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          placeholder="0,00"
                          defaultValue={
                            pisFreightPurchasesBase > 0
                              ? formatNumberBR(pisFreightPurchasesBase)
                              : ''
                          }
                          key={`pisf-b-${pisFreightPurchasesBase}`}
                          onBlur={(e) => setPisFreightPurchasesBase(parseBRNumber(e.target.value))}
                          className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Alíquota %</span>
                      <div className="h-9 px-3 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs text-slate-300">
                        {formatNumberBR(pisRate)}%
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Resultado</span>
                      <div className="h-9 px-3 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                        {formatBRL(calculatedPurchases.pisFreightResult)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO COFINS SOBRE FRETE */}
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2">
                  <span className="text-xs font-mono font-semibold uppercase text-emerald-400">
                    COFINS sobre frete
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Base de cálculo</span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          placeholder="0,00"
                          defaultValue={
                            cofinsFreightPurchasesBase > 0
                              ? formatNumberBR(cofinsFreightPurchasesBase)
                              : ''
                          }
                          key={`coff-b-${cofinsFreightPurchasesBase}`}
                          onBlur={(e) =>
                            setCofinsFreightPurchasesBase(parseBRNumber(e.target.value))
                          }
                          className="pl-8 text-right bg-slate-950/70 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Alíquota %</span>
                      <div className="h-9 px-3 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs text-slate-300">
                        {formatNumberBR(cofinsRate)}%
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-mono">Resultado</span>
                      <div className="h-9 px-3 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                        {formatBRL(calculatedPurchases.cofinsFreightResult)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DemoLayout>
  )
}
