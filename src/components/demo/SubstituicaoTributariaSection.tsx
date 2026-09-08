import React, { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTaxContext } from '@/contexts/TaxContext'
import { formatBRL, formatPercentBR, parseBRNumber } from '@/lib/taxCalculations'
import { calculateSaleIcmsSt, StCalculationResult } from '@/lib/specialOperationsCalculations'
import {
  ShieldAlert,
  ArrowRightLeft,
  Info,
  HelpCircle,
  FileCheck2,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react'

interface SubstituicaoTributariaSectionProps {
  /** Se 'markup', exibe foco na venda (substituto/venda com ST e segregação do Simples).
   * Se 'compras', exibe foco na aquisição de mercadoria com ST recolhido na nota de entrada.
   * Se 'both', permite visualizar ambos com alternância suave. */
  viewMode?: 'markup' | 'compras' | 'both'
  saleOperationValue?: number // Preço de venda base ou faturamento a ser usado na simulação de retenção
  defaultExpanded?: boolean
}

export const SubstituicaoTributariaSection: React.FC<SubstituicaoTributariaSectionProps> = ({
  viewMode = 'markup',
  saleOperationValue = 0,
}) => {
  const { regime, stSubsystem, updateStSubsystem } = useTaxContext()

  // Buffers locais para digitação suave no onBlur
  const [purchasesStPaidInput, setPurchasesStPaidInput] = useState<string>('')
  const [purchasesBaseStInput, setPurchasesBaseStInput] = useState<string>('')
  const [mvaPercentInput, setMvaPercentInput] = useState<string>('')
  const [destInternalIcmsRateInput, setDestInternalIcmsRateInput] = useState<string>('')
  const [ipiRateOrValueInput, setIpiRateOrValueInput] = useState<string>('')
  const [freightValueInput, setFreightValueInput] = useState<string>('')
  const [simplesRevenueShareInput, setSimplesRevenueShareInput] = useState<string>('')

  // Sincroniza inputs locais apenas quando o estado externo muda
  useEffect(() => {
    setPurchasesStPaidInput(
      stSubsystem.purchasesStPaid ? String(stSubsystem.purchasesStPaid).replace('.', ',') : '',
    )
  }, [stSubsystem.purchasesStPaid])

  useEffect(() => {
    setPurchasesBaseStInput(
      stSubsystem.purchasesBaseSt ? String(stSubsystem.purchasesBaseSt).replace('.', ',') : '',
    )
  }, [stSubsystem.purchasesBaseSt])

  useEffect(() => {
    setMvaPercentInput(
      stSubsystem.mvaPercent ? String(stSubsystem.mvaPercent).replace('.', ',') : '40',
    )
  }, [stSubsystem.mvaPercent])

  useEffect(() => {
    setDestInternalIcmsRateInput(
      stSubsystem.destInternalIcmsRate
        ? String(stSubsystem.destInternalIcmsRate).replace('.', ',')
        : '18',
    )
  }, [stSubsystem.destInternalIcmsRate])

  useEffect(() => {
    setIpiRateOrValueInput(
      stSubsystem.ipiRateOrValue ? String(stSubsystem.ipiRateOrValue).replace('.', ',') : '',
    )
  }, [stSubsystem.ipiRateOrValue])

  useEffect(() => {
    setFreightValueInput(
      stSubsystem.freightValue ? String(stSubsystem.freightValue).replace('.', ',') : '',
    )
  }, [stSubsystem.freightValue])

  useEffect(() => {
    setSimplesRevenueShareInput(
      stSubsystem.simplesStRevenueShare !== undefined
        ? String(stSubsystem.simplesStRevenueShare).replace('.', ',')
        : '100',
    )
  }, [stSubsystem.simplesStRevenueShare])

  // Cálculo da retenção de ST na venda (empresa substituta)
  const effectiveSaleValue = Math.max(0, saleOperationValue || 0)
  const saleStResult: StCalculationResult = React.useMemo(() => {
    return calculateSaleIcmsSt({
      operationValue: effectiveSaleValue,
      originInterstateRate: 12.0, // Alíquota de saída típica interestadual ou interna
      mvaPercent: stSubsystem.mvaPercent || 0,
      destInternalRate: stSubsystem.destInternalIcmsRate || 18.0,
      includeIpi: stSubsystem.includeIpiInBase,
      ipiPercentOrVal: stSubsystem.ipiRateOrValue || 0,
      includeFreight: stSubsystem.includeFreightInBase,
      freightVal: stSubsystem.freightValue || 0,
    })
  }, [
    effectiveSaleValue,
    stSubsystem.mvaPercent,
    stSubsystem.destInternalIcmsRate,
    stSubsystem.includeIpiInBase,
    stSubsystem.ipiRateOrValue,
    stSubsystem.includeFreightInBase,
    stSubsystem.freightValue,
  ])

  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] via-card to-background p-5 shadow-sm transition-all duration-300">
      {/* CABEÇALHO DO SUBSISTEMA COM TOGGLE OPT-IN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Substituição Tributária (ICMS-ST)
              </h3>
              <Badge
                variant="outline"
                className="text-[11px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              >
                Subsistema Integrado
              </Badge>
              {stSubsystem.enabled && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px]">
                  Ativo na Simulação
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cenários de compras (empresa substituída) e vendas (substituto tributário / MVA e
              segregação no Simples Nacional).
            </p>
          </div>
        </div>

        {/* Toggle Opt-in */}
        <div className="flex items-center gap-3 bg-muted/40 px-3.5 py-2 rounded-lg border border-border/50 self-start sm:self-auto">
          <Label
            htmlFor="st-subsystem-toggle"
            className="text-xs font-medium text-foreground cursor-pointer select-none"
          >
            {stSubsystem.enabled ? 'Subsistema Habilitado' : 'Habilitar Substituição Tributária'}
          </Label>
          <Switch
            id="st-subsystem-toggle"
            checked={stSubsystem.enabled}
            onCheckedChange={(checked) => updateStSubsystem('enabled', checked)}
            className="data-[state=checked]:bg-amber-600"
          />
        </div>
      </div>

      {/* CONTEÚDO EXPANSÍVEL: SÓ ABRE SE O CLIENTE SELECIONAR */}
      {stSubsystem.enabled ? (
        <div className="pt-5 space-y-6 animate-in fade-in-50 duration-300">
          {/* AVISO EDUCATIVO DE OPERAÇÃO */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/25 text-xs text-foreground/90">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Regras Fiscais Aplicadas (Lei Complementar nº 87/1996 e LC 123/2006):
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                <li>
                  <strong>Compras com ST retido:</strong> no Lucro Presumido e Real, o ST recolhido
                  pelo remetente <em>NÃO gera crédito</em> e integra integralmente o custo de
                  aquisição (CMV).
                </li>
                <li>
                  <strong>Vendas com ST:</strong> a empresa substituta apura a retenção via MVA
                  ajustada, recolhendo o débito por GNRE/DARE em favor da UF de destino.
                </li>
                {regime === 'simples' && (
                  <li className="text-emerald-600 dark:text-emerald-400 font-medium">
                    <strong>Simples Nacional (LC 123/06 art. 18, §1º, I):</strong> a receita de
                    venda com ST é segregada no PGDAS-D com tributação monofásica/exclusiva,{' '}
                    <em>descontando a parcela de ICMS da faixa do DAS</em>, mas mantendo a RBT12.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BLOCO 1: COMPRAS COM ST (Empresa Substituída) */}
            {(viewMode === 'compras' || viewMode === 'both') && (
              <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Compra com ST (Empresa Substituída)
                    </h4>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Integração CMV
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Informe o ICMS-ST recolhido ou destacado na nota fiscal de entrada pelo fornecedor
                  substituto. Este valor se soma diretamente ao custo da mercadoria.
                </p>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="st-purchases-paid" className="text-xs font-medium">
                        ICMS-ST Retido na Entrada (R$)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground hover:text-foreground cursor-pointer">
                              <HelpCircle className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Valor total do ICMS Substituição Tributária cobrado na NF-e de compra.
                            No Lucro Real e Presumido, não dá direito a crédito e soma ao CMV.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="st-purchases-paid"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={purchasesStPaidInput}
                      onChange={(e) => setPurchasesStPaidInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseBRNumber(purchasesStPaidInput)
                        updateStSubsystem('purchasesStPaid', parsed)
                      }}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="st-purchases-base"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Base de Cálculo do ICMS-ST na Entrada (R$) — Opcional/Informativo
                    </Label>
                    <Input
                      id="st-purchases-base"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={purchasesBaseStInput}
                      onChange={(e) => setPurchasesBaseStInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseBRNumber(purchasesBaseStInput)
                        updateStSubsystem('purchasesBaseSt', parsed)
                      }}
                      className="font-mono text-xs text-muted-foreground mt-1"
                    />
                  </div>

                  {stSubsystem.purchasesStPaid > 0 && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>Acréscimo ao Custo de Aquisição:</span>
                        <span className="font-mono">{formatBRL(stSubsystem.purchasesStPaid)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Refletido automaticamente na Calculadora de Compras e no CMV das DREs.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BLOCO 2: VENDA COM ST (Empresa Substituta / MVA) */}
            {(viewMode === 'markup' || viewMode === 'both') && (
              <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Venda com ST (Empresa Substituta)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="st-sale-substituto"
                      className="text-[11px] text-muted-foreground cursor-pointer"
                    >
                      Substituto na Saída
                    </Label>
                    <Switch
                      id="st-sale-substituto"
                      checked={stSubsystem.isSaleSubstituto}
                      onCheckedChange={(checked) => updateStSubsystem('isSaleSubstituto', checked)}
                      className="scale-90 data-[state=checked]:bg-amber-600"
                    />
                  </div>
                </div>

                {stSubsystem.isSaleSubstituto ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="st-mva" className="text-xs font-medium">
                          MVA Original/Ajustada (%)
                        </Label>
                        <Input
                          id="st-mva"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ex: 40,00"
                          value={mvaPercentInput}
                          onChange={(e) => setMvaPercentInput(e.target.value)}
                          onBlur={() => {
                            const parsed = parseBRNumber(mvaPercentInput)
                            updateStSubsystem('mvaPercent', parsed)
                          }}
                          className="font-mono text-sm mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="st-dest-rate" className="text-xs font-medium">
                          Alíq. Interna Destino (%)
                        </Label>
                        <Input
                          id="st-dest-rate"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ex: 18,00"
                          value={destInternalIcmsRateInput}
                          onChange={(e) => setDestInternalIcmsRateInput(e.target.value)}
                          onBlur={() => {
                            const parsed = parseBRNumber(destInternalIcmsRateInput)
                            updateStSubsystem('destInternalIcmsRate', parsed)
                          }}
                          className="font-mono text-sm mt-1"
                        />
                      </div>
                    </div>

                    {/* Checkboxes de IPI e Frete na base da ST */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="st-include-ipi"
                          checked={stSubsystem.includeIpiInBase}
                          onCheckedChange={(checked) =>
                            updateStSubsystem('includeIpiInBase', checked)
                          }
                          className="scale-75 data-[state=checked]:bg-amber-600"
                        />
                        <Label htmlFor="st-include-ipi" className="text-xs cursor-pointer">
                          Incluir IPI na Base ST
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id="st-include-freight"
                          checked={stSubsystem.includeFreightInBase}
                          onCheckedChange={(checked) =>
                            updateStSubsystem('includeFreightInBase', checked)
                          }
                          className="scale-75 data-[state=checked]:bg-amber-600"
                        />
                        <Label htmlFor="st-include-freight" className="text-xs cursor-pointer">
                          Incluir Frete na Base ST
                        </Label>
                      </div>
                    </div>

                    {/* Inputs condicionais de IPI e Frete */}
                    {(stSubsystem.includeIpiInBase || stSubsystem.includeFreightInBase) && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {stSubsystem.includeIpiInBase && (
                          <div>
                            <Label
                              htmlFor="st-ipi-val"
                              className="text-[11px] text-muted-foreground"
                            >
                              Alíquota IPI (%)
                            </Label>
                            <Input
                              id="st-ipi-val"
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={ipiRateOrValueInput}
                              onChange={(e) => setIpiRateOrValueInput(e.target.value)}
                              onBlur={() => {
                                const parsed = parseBRNumber(ipiRateOrValueInput)
                                updateStSubsystem('ipiRateOrValue', parsed)
                              }}
                              className="font-mono text-xs mt-1"
                            />
                          </div>
                        )}
                        {stSubsystem.includeFreightInBase && (
                          <div>
                            <Label
                              htmlFor="st-freight-val"
                              className="text-[11px] text-muted-foreground"
                            >
                              Valor do Frete (R$)
                            </Label>
                            <Input
                              id="st-freight-val"
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={freightValueInput}
                              onChange={(e) => setFreightValueInput(e.target.value)}
                              onBlur={() => {
                                const parsed = parseBRNumber(freightValueInput)
                                updateStSubsystem('freightValue', parsed)
                              }}
                              className="font-mono text-xs mt-1"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* QUADRO PASSO A PASSO TRANSPARENTE DA APURAÇÃO DA RETENÇÃO */}
                    <div className="mt-3 p-3 rounded-lg bg-card border border-border/70 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-semibold text-foreground pb-1 border-b border-border/40">
                        <span className="flex items-center gap-1.5">
                          <FileCheck2 className="w-3.5 h-3.5 text-amber-500" />
                          Memória de Cálculo da Retenção ST
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          MVA {formatPercentBR(stSubsystem.mvaPercent)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                        <span>Valor Operação Base:</span>
                        <span className="text-right font-mono text-foreground">
                          {formatBRL(saleStResult.operationValue)}
                        </span>

                        {stSubsystem.includeFreightInBase && (
                          <>
                            <span>(+) Frete na Base:</span>
                            <span className="text-right font-mono text-foreground">
                              {formatBRL(saleStResult.freightInBase)}
                            </span>
                          </>
                        )}

                        {stSubsystem.includeIpiInBase && (
                          <>
                            <span>(+) IPI na Base:</span>
                            <span className="text-right font-mono text-foreground">
                              {formatBRL(saleStResult.ipiInBase)}
                            </span>
                          </>
                        )}

                        <span className="font-medium text-foreground">(=) Base de Cálculo ST:</span>
                        <span className="text-right font-mono font-medium text-foreground">
                          {formatBRL(saleStResult.baseCalculoSt)}
                        </span>

                        <span>
                          Débito Total ({formatPercentBR(stSubsystem.destInternalIcmsRate)}):
                        </span>
                        <span className="text-right font-mono text-foreground">
                          {formatBRL(
                            (saleStResult.baseCalculoSt * stSubsystem.destInternalIcmsRate) / 100,
                          )}
                        </span>

                        <span>(−) Débito Próprio da Saída:</span>
                        <span className="text-right font-mono text-muted-foreground">
                          {formatBRL(saleStResult.debitoProprioIcms)}
                        </span>

                        <span className="font-semibold text-amber-600 dark:text-amber-400 pt-1 border-t border-border/40">
                          ICMS-ST a Reter / Recolher:
                        </span>
                        <span className="text-right font-mono font-bold text-amber-600 dark:text-amber-400 pt-1 border-t border-border/40">
                          {formatBRL(saleStResult.icmsStAReter)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">
                      Empresa atua como revendedora substituída na saída.
                    </p>
                    <p>
                      Nas vendas de mercadorias cujo ICMS já foi recolhido anteriormente por ST, a
                      operação subsequente sai sem destaque de ICMS próprio (CST 60 / CSOSN 500).
                    </p>
                  </div>
                )}

                {/* BLOCO ESPECÍFICO DO SIMPLES NACIONAL (SEGREGAÇÃO) */}
                {regime === 'simples' && (
                  <div className="p-3 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/25 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Segregação Simples Nacional (LC 123/06)
                      </span>
                      <Switch
                        id="st-simples-exclusive"
                        checked={stSubsystem.simplesStExclusive}
                        onCheckedChange={(checked) =>
                          updateStSubsystem('simplesStExclusive', checked)
                        }
                        className="scale-75 data-[state=checked]:bg-emerald-600"
                      />
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      A parcela da receita com ST tem o ICMS do Anexo deduzido no PGDAS (tributação
                      monofásica na fonte).
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <Label
                        htmlFor="st-simples-share"
                        className="text-[11px] text-muted-foreground whitespace-nowrap"
                      >
                        % da Receita com ST:
                      </Label>
                      <Input
                        id="st-simples-share"
                        type="text"
                        inputMode="decimal"
                        placeholder="100"
                        value={simplesRevenueShareInput}
                        onChange={(e) => setSimplesRevenueShareInput(e.target.value)}
                        onBlur={() => {
                          const parsed = Math.min(
                            100,
                            Math.max(0, parseBRNumber(simplesRevenueShareInput)),
                          )
                          updateStSubsystem('simplesStRevenueShare', parsed)
                        }}
                        className="font-mono text-xs h-7 w-20"
                      />
                      <span className="text-[11px] text-muted-foreground">%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-3 text-xs text-muted-foreground flex items-center justify-between">
          <span>O subsistema de Substituição Tributária está atualmente desativado.</span>
          <span className="text-[11px] text-muted-foreground/75 italic">
            Ative o toggle acima para simular MVA, ICMS-ST e impactos no CMV.
          </span>
        </div>
      )}
    </div>
  )
}
