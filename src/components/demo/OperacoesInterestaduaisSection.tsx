import React, { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTaxContext } from '@/contexts/TaxContext'
import { formatBRL, formatPercentBR, parseBRNumber } from '@/lib/taxCalculations'
import {
  BRAZILIAN_UFS,
  BrazilianUF,
  UFS_MAP,
  getInterstateTaxRate,
  calculateInterstateOperation,
  InterstateCalculationResult,
} from '@/lib/specialOperationsCalculations'
import {
  Compass,
  MapPin,
  TrendingUp,
  Info,
  HelpCircle,
  Calculator,
  ShieldCheck,
  Building2,
  UserCheck,
} from 'lucide-react'

interface OperacoesInterestaduaisSectionProps {
  /** Se 'markup', foco na venda interestadual (DIFAL destino/origem).
   * Se 'compras', foco na entrada interestadual (alíquota fornecedor e DIFAL ativo/consumo).
   * Se 'both', permite visualizar ambos os lados da operação interestadual. */
  viewMode?: 'markup' | 'compras' | 'both'
  saleOperationValue?: number
  purchasesOperationValue?: number
}

export const OperacoesInterestaduaisSection: React.FC<OperacoesInterestaduaisSectionProps> = ({
  viewMode = 'markup',
  saleOperationValue = 0,
  purchasesOperationValue = 0,
}) => {
  const { interstateSubsystem, updateInterstateSubsystem } = useTaxContext()

  // Buffer local para FCP
  const [fcpPercentInput, setFcpPercentInput] = useState<string>('')

  useEffect(() => {
    setFcpPercentInput(
      interstateSubsystem.fcpPercent
        ? String(interstateSubsystem.fcpPercent).replace('.', ',')
        : '',
    )
  }, [interstateSubsystem.fcpPercent])

  // Apuração das operações interestaduais
  const effectiveSale = Math.max(0, saleOperationValue || 0)
  const effectivePurchases = Math.max(0, purchasesOperationValue || 0)

  const calcResult: InterstateCalculationResult = React.useMemo(() => {
    return calculateInterstateOperation({
      subsystem: interstateSubsystem,
      saleGrossValue: effectiveSale,
      purchasesGrossValue: effectivePurchases,
    })
  }, [interstateSubsystem, effectiveSale, effectivePurchases])

  const originInfo = UFS_MAP.get(interstateSubsystem.originUf)
  const destInfo = UFS_MAP.get(interstateSubsystem.destinationUf)
  const isInterstate = interstateSubsystem.originUf !== interstateSubsystem.destinationUf

  return (
    <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/[0.04] via-card to-background p-5 shadow-sm transition-all duration-300">
      {/* CABEÇALHO DO SUBSISTEMA COM TOGGLE OPT-IN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Operações Interestaduais e DIFAL
              </h3>
              <Badge
                variant="outline"
                className="text-[11px] font-mono uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
              >
                Subsistema Integrado
              </Badge>
              {interstateSubsystem.enabled && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px]">
                  Ativo na Simulação
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alíquotas automáticas (4%, 7%, 12%), partilha do DIFAL (EC 87/15 e LC 190/22) e
              diferencial de entrada em compras.
            </p>
          </div>
        </div>

        {/* Toggle Opt-in */}
        <div className="flex items-center gap-3 bg-muted/40 px-3.5 py-2 rounded-lg border border-border/50 self-start sm:self-auto">
          <Label
            htmlFor="interstate-subsystem-toggle"
            className="text-xs font-medium text-foreground cursor-pointer select-none"
          >
            {interstateSubsystem.enabled
              ? 'Subsistema Habilitado'
              : 'Habilitar Operação Interestadual'}
          </Label>
          <Switch
            id="interstate-subsystem-toggle"
            checked={interstateSubsystem.enabled}
            onCheckedChange={(checked) => updateInterstateSubsystem('enabled', checked)}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </div>

      {/* CONTEÚDO EXPANSÍVEL: SÓ ABRE SE O CLIENTE SELECIONAR */}
      {interstateSubsystem.enabled ? (
        <div className="pt-5 space-y-6 animate-in fade-in-50 duration-300">
          {/* AVISO EDUCATIVO DE REGRAS CONSTITUCIONAIS */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/[0.08] border border-blue-500/25 text-xs text-foreground/90">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-blue-600 dark:text-blue-400">
                Regras Fiscais Constitucionais (CF/88 art. 155, §2º, IV e VII, EC 87/15, LC 190/22):
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                <li>
                  <strong>Alíquotas automáticas:</strong> 7% para saídas do Sul/Sudeste (exceto ES)
                  destinadas ao Norte, Nordeste, Centro-Oeste ou ES; 12% para as demais rotas; 4%
                  para itens importados (Res. SF 13/2012).
                </li>
                <li>
                  <strong>DIFAL na Venda:</strong> devido quando destinado a{' '}
                  <em>Consumidor Final Não Contribuinte</em>. O diferencial (alíquota interna do
                  destino − alíquota interestadual) pertence 100% à UF destinatária (EC 87/15).
                </li>
                <li>
                  <strong>DIFAL na Compra:</strong> devido nas entradas interestaduais de bens
                  destinados a uso/consumo ou ativo imobilizado pela empresa adquirente.
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BLOCO 1: VENDA INTERESTADUAL (MARKUP / RECEITAS) */}
            {(viewMode === 'markup' || viewMode === 'both') && (
              <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Venda Interestadual (Saída)
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Alíquota: {calcResult.interstateRate}%
                  </Badge>
                </div>

                {/* SELECTS DE ORIGEM E DESTINO */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      Estado de Origem (Remetente)
                    </Label>
                    <Select
                      value={interstateSubsystem.originUf}
                      onValueChange={(val) =>
                        updateInterstateSubsystem('originUf', val as BrazilianUF)
                      }
                    >
                      <SelectTrigger className="font-medium text-xs">
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {BRAZILIAN_UFS.map((uf) => (
                          <SelectItem key={uf.sigla} value={uf.sigla} className="text-xs">
                            {uf.sigla} — {uf.nome} ({uf.regiao})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      Estado de Destino (Cliente)
                    </Label>
                    <Select
                      value={interstateSubsystem.destinationUf}
                      onValueChange={(val) =>
                        updateInterstateSubsystem('destinationUf', val as BrazilianUF)
                      }
                    >
                      <SelectTrigger className="font-medium text-xs">
                        <SelectValue placeholder="Destino" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {BRAZILIAN_UFS.map((uf) => (
                          <SelectItem key={uf.sigla} value={uf.sigla} className="text-xs">
                            {uf.sigla} — {uf.nome} (Alíq. {uf.aliquotaInternaPadrao}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CARACTERÍSTICAS DA OPERAÇÃO: CONSUMIDOR FINAL & CONTRIBUINTE */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 rounded-lg border border-border/50 bg-card/60 flex items-center justify-between">
                    <div>
                      <Label
                        htmlFor="end-consumer-switch"
                        className="text-xs font-medium cursor-pointer flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                        Consumidor Final
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Uso ou consumo final</p>
                    </div>
                    <Switch
                      id="end-consumer-switch"
                      checked={interstateSubsystem.isEndConsumer}
                      onCheckedChange={(checked) =>
                        updateInterstateSubsystem('isEndConsumer', checked)
                      }
                      className="scale-75 data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  <div className="p-2.5 rounded-lg border border-border/50 bg-card/60 flex items-center justify-between">
                    <div>
                      <Label
                        htmlFor="taxpayer-switch"
                        className="text-xs font-medium cursor-pointer flex items-center gap-1"
                      >
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        Contribuinte ICMS
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Possui Inscrição Estadual</p>
                    </div>
                    <Switch
                      id="taxpayer-switch"
                      checked={interstateSubsystem.isTaxpayer}
                      onCheckedChange={(checked) =>
                        updateInterstateSubsystem('isTaxpayer', checked)
                      }
                      className="scale-75 data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </div>

                {/* PRODUTO IMPORTADO E FCP */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      id="imported-switch"
                      checked={interstateSubsystem.isImportedContent}
                      onCheckedChange={(checked) =>
                        updateInterstateSubsystem('isImportedContent', checked)
                      }
                      className="scale-75 data-[state=checked]:bg-blue-600"
                    />
                    <div>
                      <Label htmlFor="imported-switch" className="text-xs cursor-pointer">
                        Conteúdo de Importação {'>'} 40%
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Aplica alíquota de 4% (FCI)
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fcp-rate" className="text-[11px] text-muted-foreground">
                      FCP Destino (% Fundo Combate à Pobreza)
                    </Label>
                    <Input
                      id="fcp-rate"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={fcpPercentInput}
                      onChange={(e) => setFcpPercentInput(e.target.value)}
                      onBlur={() => {
                        const parsed = Math.max(0, parseBRNumber(fcpPercentInput))
                        updateInterstateSubsystem('fcpPercent', parsed)
                      }}
                      className="font-mono text-xs mt-1"
                    />
                  </div>
                </div>

                {/* MEMÓRIA DE CÁLCULO TRANSPARENTE: COMO CHEGAMOS NESSE NÚMERO */}
                <div className="mt-3 p-3 rounded-lg bg-card border border-border/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-foreground pb-1 border-b border-border/40">
                    <span className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-blue-500" />
                      Como chegamos nesse número (Venda)
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {interstateSubsystem.originUf} → {interstateSubsystem.destinationUf}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                    <span>Base de Cálculo da Venda:</span>
                    <span className="text-right font-mono text-foreground">
                      {formatBRL(calcResult.baseCalculo)}
                    </span>

                    <span>Alíquota Interestadual Aplicada:</span>
                    <span className="text-right font-mono text-foreground font-medium">
                      {calcResult.interstateRate}%
                    </span>

                    <span>ICMS Origem ({calcResult.interstateRate}%):</span>
                    <span className="text-right font-mono text-foreground">
                      {formatBRL(calcResult.icmsOrigemInterestadual)}
                    </span>

                    {calcResult.hasDifalSale ? (
                      <>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          Alíquota Interna no Destino ({interstateSubsystem.destinationUf}):
                        </span>
                        <span className="text-right font-mono text-blue-600 dark:text-blue-400 font-medium">
                          {calcResult.internalRateDest}%
                        </span>

                        <span className="text-blue-600 dark:text-blue-400">
                          Diferencial de Alíquota ({calcResult.internalRateDest}% −{' '}
                          {calcResult.interstateRate}%):
                        </span>
                        <span className="text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                          {formatPercentBR(calcResult.internalRateDest - calcResult.interstateRate)}
                        </span>

                        {calcResult.fcpValue > 0 && (
                          <>
                            <span>FCP Destino ({calcResult.fcpRate}%):</span>
                            <span className="text-right font-mono text-foreground">
                              {formatBRL(calcResult.fcpValue)}
                            </span>
                          </>
                        )}

                        <span className="font-semibold text-blue-600 dark:text-blue-400 pt-1 border-t border-border/40">
                          DIFAL Total Devido ao Destino:
                        </span>
                        <span className="text-right font-mono font-bold text-blue-600 dark:text-blue-400 pt-1 border-t border-border/40">
                          {formatBRL(calcResult.difalDestino)}
                        </span>
                      </>
                    ) : (
                      <div className="col-span-2 p-2 rounded bg-muted/40 text-[11px] text-muted-foreground mt-1">
                        {!isInterstate
                          ? 'Operação interna (mesma UF): não há incidência de DIFAL interestadual.'
                          : interstateSubsystem.isTaxpayer
                            ? 'Operação destinada a Contribuinte de ICMS: DIFAL é apurado pelo adquirente no destino se for para uso/consumo ou ativo.'
                            : 'Operação para revenda sem DIFAL no remetente.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* BLOCO 2: COMPRA INTERESTADUAL (COMPRAS / ENTRADAS) */}
            {(viewMode === 'compras' || viewMode === 'both') && (
              <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Compra Interestadual (Entrada)
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Alíq. Entrada: {calcResult.purchasesInterstateRate}%
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      UF Fornecedor (Origem)
                    </Label>
                    <Select
                      value={interstateSubsystem.purchasesOriginUf}
                      onValueChange={(val) =>
                        updateInterstateSubsystem('purchasesOriginUf', val as BrazilianUF)
                      }
                    >
                      <SelectTrigger className="font-medium text-xs">
                        <SelectValue placeholder="Fornecedor" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {BRAZILIAN_UFS.map((uf) => (
                          <SelectItem key={uf.sigla} value={uf.sigla} className="text-xs">
                            {uf.sigla} — {uf.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Nossa Empresa (Destino)
                    </Label>
                    <Select
                      value={interstateSubsystem.purchasesDestUf}
                      onValueChange={(val) =>
                        updateInterstateSubsystem('purchasesDestUf', val as BrazilianUF)
                      }
                    >
                      <SelectTrigger className="font-medium text-xs">
                        <SelectValue placeholder="Nossa UF" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {BRAZILIAN_UFS.map((uf) => (
                          <SelectItem key={uf.sigla} value={uf.sigla} className="text-xs">
                            {uf.sigla} — {uf.nome} ({uf.aliquotaInternaPadrao}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* DESTINAÇÃO DA COMPRA: REVENDA VS USO/CONSUMO/ATIVO */}
                <div className="p-3 rounded-lg border border-border/50 bg-card/60 flex items-center justify-between">
                  <div>
                    <Label
                      htmlFor="purchase-usage-switch"
                      className="text-xs font-medium cursor-pointer"
                    >
                      Entrada para Uso/Consumo ou Ativo Imobilizado
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Aciona apuração do DIFAL na entrada pago pelo adquirente
                    </p>
                  </div>
                  <Switch
                    id="purchase-usage-switch"
                    checked={interstateSubsystem.isPurchaseForUsageOrAsset}
                    onCheckedChange={(checked) =>
                      updateInterstateSubsystem('isPurchaseForUsageOrAsset', checked)
                    }
                    className="scale-75 data-[state=checked]:bg-emerald-600"
                  />
                </div>

                {/* MEMÓRIA DE CÁLCULO DA COMPRA INTERESTADUAL */}
                <div className="mt-3 p-3 rounded-lg bg-card border border-border/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-foreground pb-1 border-b border-border/40">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Apuração Tributária na Aquisição
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {interstateSubsystem.purchasesOriginUf} →{' '}
                      {interstateSubsystem.purchasesDestUf}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                    <span>Base Compras:</span>
                    <span className="text-right font-mono text-foreground">
                      {formatBRL(effectivePurchases)}
                    </span>

                    <span>Alíquota Interestadual da Entrada:</span>
                    <span className="text-right font-mono text-foreground font-medium">
                      {calcResult.purchasesInterstateRate}%
                    </span>

                    <span>Alíquota Interna de Nossa UF:</span>
                    <span className="text-right font-mono text-foreground">
                      {calcResult.purchasesInternalRateDest}%
                    </span>

                    {calcResult.hasDifalPurchase ? (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          DIFAL a Recolher na Entrada ({calcResult.purchasesInternalRateDest}% −{' '}
                          {calcResult.purchasesInterstateRate}%):
                        </span>
                        <span className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatBRL(calcResult.difalPurchaseValue)}
                        </span>
                        <p className="col-span-2 text-[10px] text-muted-foreground italic">
                          Aviso fiscal: Bens destinados a uso/consumo ou ativo não geram créditos de
                          ICMS para revenda.
                        </p>
                      </>
                    ) : (
                      <div className="col-span-2 p-2 rounded bg-muted/40 text-[11px] text-muted-foreground mt-1">
                        Mercadoria destinada à revenda comercial: ICMS de entrada creditável no
                        Lucro Presumido/Real pela alíquota interestadual destacada (
                        {calcResult.purchasesInterstateRate}%).
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-3 text-xs text-muted-foreground flex items-center justify-between">
          <span>O subsistema de Operações Interestaduais está atualmente desativado.</span>
          <span className="text-[11px] text-muted-foreground/75 italic">
            Ative o toggle acima para simular rotas entre UFs e partilha do DIFAL.
          </span>
        </div>
      )}
    </div>
  )
}
