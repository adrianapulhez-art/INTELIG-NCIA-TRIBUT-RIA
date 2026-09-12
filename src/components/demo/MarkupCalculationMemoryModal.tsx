import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Calculator,
  Info,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Receipt,
  Building2,
  Percent,
} from 'lucide-react'
import { formatBRL, formatNumberBR, formatPercentBR, formatFactorBR } from '@/lib/taxCalculations'
import { calculatePgdas, SimplesAnexoId, SIMPLES_ANEXOS } from '@/lib/simplesCalculations'
import { MarkupProductItem, TaxRegime, CustomTaxItem } from '@/contexts/TaxContext'

export interface MarkupCalculationMemoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: MarkupProductItem | null
  currentRegime: TaxRegime
  icmsRateMarkup: number
  customTaxesMarkup: CustomTaxItem[]
  simplesAnexo: string
  simplesRbt12: number
  simplesIsInicioAtividade?: boolean
}

export function MarkupCalculationMemoryModal({
  open,
  onOpenChange,
  product,
  currentRegime,
  icmsRateMarkup,
  customTaxesMarkup,
  simplesAnexo,
  simplesRbt12,
  simplesIsInicioAtividade,
}: MarkupCalculationMemoryModalProps) {
  // Aba ativa de regime (padrão inicia no regime atual da empresa)
  const [activeTab, setActiveTab] = useState<TaxRegime>(currentRegime)

  // Atualiza tab se o regime ativo mudar enquanto o modal estiver abrindo
  React.useEffect(() => {
    if (open) {
      setActiveTab(currentRegime)
    }
  }, [open, currentRegime])

  if (!product) return null

  // 1. Dados base do produto
  const isLiquid = product.mode === 'liquid'
  const baseValue = isLiquid
    ? typeof product.desiredNetRevenue === 'number' && Number.isFinite(product.desiredNetRevenue)
      ? product.desiredNetRevenue
      : 0
    : typeof product.cost === 'number' && Number.isFinite(product.cost)
      ? product.cost
      : 0
  const marginPct =
    typeof product.margin === 'number' && Number.isFinite(product.margin) ? product.margin : 0
  const marginFactor = 1 - marginPct / 100
  const quantity =
    typeof product.quantity === 'number' && Number.isFinite(product.quantity)
      ? Math.max(0, product.quantity)
      : 0

  // 2. Fator de tributos customizados (comum)
  let customTaxesFactor = 1
  for (const ct of customTaxesMarkup) {
    customTaxesFactor *= 1 - (ct.rate || 0) / 100
  }

  // 3. Lucro Presumido
  const pisPresumidoRate = 0.65
  const cofinsPresumidoRate = 3.0
  const icmsRateClean = Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0
  const icmsFactorPresumido = 1 - icmsRateClean / 100
  const pisFactorPresumido = 1 - pisPresumidoRate / 100
  const cofinsFactorPresumido = 1 - cofinsPresumidoRate / 100
  const taxFactorPresumido =
    icmsFactorPresumido * pisFactorPresumido * cofinsFactorPresumido * customTaxesFactor
  const completeFactorPresumido = taxFactorPresumido * marginFactor
  const safeFactorPresumido = completeFactorPresumido > 0.0001 ? completeFactorPresumido : 0
  const salePricePresumido =
    safeFactorPresumido > 0 && baseValue > 0
      ? Math.round((baseValue / safeFactorPresumido) * 100) / 100
      : 0
  const totalRevenuePresumido = Math.round(salePricePresumido * quantity * 100) / 100

  // 4. Lucro Real
  const pisRealRate = 1.65
  const cofinsRealRate = 7.6
  const icmsFactorReal = 1 - icmsRateClean / 100
  const pisFactorReal = 1 - pisRealRate / 100
  const cofinsFactorReal = 1 - cofinsRealRate / 100
  const taxFactorReal = icmsFactorReal * pisFactorReal * cofinsFactorReal * customTaxesFactor
  const completeFactorReal = taxFactorReal * marginFactor
  const safeFactorReal = completeFactorReal > 0.0001 ? completeFactorReal : 0
  const salePriceReal =
    safeFactorReal > 0 && baseValue > 0 ? Math.round((baseValue / safeFactorReal) * 100) / 100 : 0
  const totalRevenueReal = Math.round(salePriceReal * quantity * 100) / 100

  // 5. Simples Nacional
  const hasSimplesRbt = (simplesRbt12 || 0) > 0
  const anexoIdClean = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const anexoConfig = SIMPLES_ANEXOS[anexoIdClean] || SIMPLES_ANEXOS.anexo_1
  const rawRbt12 = simplesRbt12 || 0
  const isFallbackRbt12 = rawRbt12 <= 0

  // No Simples Nacional, a alíquota efetiva NUNCA é zero/ausente:
  // Se RBT12 > 0: fórmula legal LC 123/2006 (RBT12 × Alíquota Nominal − Parcela Deduzir) ÷ RBT12
  // Se RBT12 = 0 ou não informada: fallback explícito com alíquota nominal da 1ª faixa do anexo
  const pgdasResult = calculatePgdas(anexoIdClean, rawRbt12)
  const effectiveSimplesRate = pgdasResult.aliquotaEfetiva
  const baseTaxFactorSimples = 1 - effectiveSimplesRate / 100
  let rawCompleteFactorSimples = baseTaxFactorSimples * customTaxesFactor * marginFactor
  // Assert defensivo: se houver imposto aplicável e completeFactor >= 1, usa baseTaxFactor sem margem
  if (baseTaxFactorSimples < 1 && rawCompleteFactorSimples >= 1) {
    rawCompleteFactorSimples = baseTaxFactorSimples * customTaxesFactor
  }
  const completeFactorSimples = Math.max(0.0001, rawCompleteFactorSimples)
  const salePriceSimples =
    completeFactorSimples > 0 && baseValue > 0
      ? Math.round((baseValue / completeFactorSimples) * 100) / 100
      : 0
  const totalRevenueSimples = Math.round(salePriceSimples * quantity * 100) / 100

  // Preço e fator calculados diretamente no contexto no regime atual:
  const activeSalePrice = product.salePrice || 0
  const activeCompleteFactor = product.completeFactor || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-5 sm:p-7 shadow-2xl">
        {/* Cabeçalho */}
        <DialogHeader className="border-b border-slate-800 pb-3.5 space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <Calculator className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Memória de Cálculo do Preço Sugerido</span>
              </DialogTitle>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs">
              {product.name || 'Produto'}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-400 font-mono">
            Subcamada analítica: derivação linha a linha, com os valores reais cadastrados, da
            fórmula exata que gerou o preço de venda sugerido.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo Base do Produto */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 font-mono">
            <span className="text-[10px] text-slate-400 block uppercase">
              {isLiquid ? 'Receita Líquida' : 'Custo de Aquisição'}
            </span>
            <span className="text-sm font-bold text-emerald-400">{formatBRL(baseValue)}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isLiquid ? 'Base líquida desejada' : 'Líquido / composição'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 font-mono">
            <span className="text-[10px] text-slate-400 block uppercase">Margem de Lucro</span>
            <span className="text-sm font-bold text-amber-300">{formatPercentBR(marginPct)}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Fator: {formatFactorBR(marginFactor, 4)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 font-mono">
            <span className="text-[10px] text-slate-400 block uppercase">Regime da Empresa</span>
            <span className="text-sm font-bold text-orange-400 uppercase">{currentRegime}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Sincronizado global</span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-mono">
            <span className="text-[10px] text-emerald-400 block uppercase font-semibold">
              Preço Sugerido Ativo
            </span>
            <span className="text-sm font-black text-emerald-300">
              {formatBRL(activeSalePrice)}
            </span>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">
              Divisor: {formatFactorBR(activeCompleteFactor, 4)}
            </span>
          </div>
        </div>

        {/* Abas dos 3 Regimes */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Selecione o regime para ver a memória:
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Linha a linha com dados reais
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('simples')}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                activeTab === 'simples'
                  ? 'bg-orange-500/20 border-orange-400 text-white shadow-md shadow-orange-500/15'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-orange-300">
                  Simples Nacional
                </span>
                {currentRegime === 'simples' && (
                  <Badge className="bg-orange-500/30 text-orange-200 border-0 text-[9px] px-1 py-0">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {isFallbackRbt12
                  ? `DAS: ${formatPercentBR(effectiveSimplesRate)} (1ª faixa)`
                  : `DAS: ${formatPercentBR(effectiveSimplesRate)}`}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presumido')}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                activeTab === 'presumido'
                  ? 'bg-orange-500/20 border-orange-400 text-white shadow-md shadow-orange-500/15'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-orange-300">Presumido</span>
                {currentRegime === 'presumido' && (
                  <Badge className="bg-orange-500/30 text-orange-200 border-0 text-[9px] px-1 py-0">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">PIS 0,65% + COF 3%</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('real')}
              className={`p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                activeTab === 'real'
                  ? 'bg-orange-500/20 border-orange-400 text-white shadow-md shadow-orange-500/15'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-orange-300">Lucro Real</span>
                {currentRegime === 'real' && (
                  <Badge className="bg-orange-500/30 text-orange-200 border-0 text-[9px] px-1 py-0">
                    Ativo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">PIS 1,65% + COF 7,6%</p>
            </button>
          </div>

          {/* DETALHAMENTO DO SIMPLES NACIONAL */}
          {activeTab === 'simples' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              {/* Box de fórmula sintética */}
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-mono font-bold text-orange-300 uppercase">
                    Fórmula do Preço no Simples Nacional
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
                  <code className="text-emerald-400">
                    Preço Sugerido = Custo Base ÷ [ (1 − Alíquota Efetiva DAS) × (1 − Margem%) ]
                  </code>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  No Simples Nacional, os tributos sobre receita (ICMS, PIS, COFINS, IRPJ, CSLL e
                  CPP) são <strong>unificados na guia única DAS</strong> pela alíquota efetiva do
                  PGDAS calculada sobre a receita acumulada dos últimos 12 meses (RBT12). A parcela
                  do ICMS já está <strong>embutida/integrada</strong> dentro do DAS conforme a
                  partilha legal do Anexo.
                </p>
              </div>

              {/* Tabela de Passos da Derivação */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs font-mono">
                <div className="bg-slate-950/80 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                    Memória Passo a Passo (Simples Nacional)
                  </span>
                  <span className="text-[10px] text-slate-500">Regras LC 123/2006</span>
                </div>

                <div className="divide-y divide-slate-800/70">
                  {/* Linha 1: Custo / Base */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        1. {isLiquid ? 'Receita Líquida Desejada' : 'Custo Unitário de Aquisição'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isLiquid
                          ? 'Valor líquido que a empresa deseja reter'
                          : 'Custo líquido vindo de Compras / Composição'}
                      </span>
                    </div>
                    <span className="font-bold text-slate-100 text-sm">{formatBRL(baseValue)}</span>
                  </div>

                  {/* Linha 2: RBT12 e Anexo */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/30">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        2. RBT12 (Receita Bruta Acumulada 12 Meses)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {anexoConfig.nome}
                        {simplesIsInicioAtividade ? ' · Proporcional início de atividade' : ''}
                        {isFallbackRbt12
                          ? ' · RBT12 não informada — usando 1ª faixa (fallback: 4,00%)'
                          : ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-300 block">
                        {hasSimplesRbt
                          ? formatBRL(simplesRbt12)
                          : 'RBT12 não informada — usando 1ª faixa (fallback: 4,00%)'}
                      </span>
                      {isFallbackRbt12 && (
                        <span className="text-[10px] text-amber-300">Fallback legal aplicado</span>
                      )}
                    </div>
                  </div>

                  {/* Linha 3: Alíquota Efetiva do DAS */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-orange-300 block">
                        3. Alíquota Efetiva do DAS (PGDAS)
                      </span>
                      {hasSimplesRbt ? (
                        <span className="text-[10px] text-slate-400">
                          Faixa {pgdasResult.faixaNumero}: ({formatBRL(rawRbt12)} ×{' '}
                          {formatNumberBR(pgdasResult.aliquotaNominal)}% −{' '}
                          {formatBRL(pgdasResult.parcelaDeduzir)}) ÷ {formatBRL(rawRbt12)} ={' '}
                          {formatPercentBR(effectiveSimplesRate, 4)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-300">
                          RBT12 não informada — usando 1ª faixa (fallback:{' '}
                          {formatPercentBR(effectiveSimplesRate, 2)})
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-orange-300 text-sm">
                      {formatPercentBR(effectiveSimplesRate, 4)}
                    </span>
                  </div>

                  {/* Sub-abertura: Componentes do DAS (Destaque do ICMS integrado) */}
                  {pgdasResult && (
                    <div className="px-3.5 py-2 bg-slate-950/50 space-y-1.5 border-l-2 border-orange-500/60 ml-2 my-1 rounded-r-lg">
                      <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          ICMS Integrado = alíquota efetiva × partilha:
                        </span>
                        <span className="font-bold text-emerald-400">
                          {formatPercentBR(effectiveSimplesRate, 4)} ×{' '}
                          {formatPercentBR(
                            anexoConfig.faixas[pgdasResult.faixaNumero - 1]?.partilha.icms || 34,
                            2,
                          )}{' '}
                          = {formatPercentBR(pgdasResult.reparticao.icmsRate, 4)}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-300/90 font-mono">
                        (Aviso legal: O ICMS já está contido no DAS — não há destaque nem
                        recolhimento estadual apartado)
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>PIS Integrado ao DAS:</span>
                        <span>{formatPercentBR(pgdasResult.reparticao.pisRate, 4)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>COFINS Integrada ao DAS:</span>
                        <span>{formatPercentBR(pgdasResult.reparticao.cofinsRate, 4)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Demais tributos (IRPJ, CSLL, CPP):</span>
                        <span>
                          {formatPercentBR(
                            pgdasResult.reparticao.irpjRate +
                              pgdasResult.reparticao.csllRate +
                              pgdasResult.reparticao.cppRate,
                            4,
                          )}
                        </span>
                      </div>
                      {pgdasResult.isSublimiteExceeded && (
                        <div className="p-1.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300">
                          Atenção: Sublimite estadual excedido (&gt; R$ 3,6M). O ICMS deve ser
                          recolhido por fora da guia DAS.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Linha 4: Tributos Adicionais se houver */}
                  {customTaxesMarkup.length > 0 && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200 block">
                          4. Tributos Adicionais
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {customTaxesMarkup.map((t) => `${t.name}: ${t.rate}%`).join(', ')}
                        </span>
                      </div>
                      <span className="text-slate-300 font-bold">
                        Fator: {formatFactorBR(customTaxesFactor, 4)}
                      </span>
                    </div>
                  )}

                  {/* Linha 5: Margem de Lucro Desejada */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        5. Margem de Lucro Comercial (%)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator da margem = 1 − ({formatNumberBR(marginPct)} ÷ 100)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {formatPercentBR(marginPct)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(marginFactor, 4)}
                      </span>
                    </div>
                  </div>

                  {/* Linha 6: Fator Divisor Completo */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-emerald-500/[0.07]">
                    <div>
                      <span className="font-bold text-emerald-400 block">
                        6. Fator Divisor do Markup (Denominador)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (1 − {formatNumberBR(effectiveSimplesRate, 4)}%) × (1 −{' '}
                        {formatNumberBR(marginPct)}%) = (1 − DAS) × (1 − margem)
                      </span>
                    </div>
                    <span className="font-black text-emerald-300 text-sm">
                      {formatFactorBR(completeFactorSimples, 5)}
                    </span>
                  </div>

                  {/* Linha 7: Preço de Venda Sugerido */}
                  <div className="px-3.5 py-3 flex items-center justify-between bg-emerald-500/15 border-t border-emerald-500/30">
                    <div>
                      <span className="font-extrabold text-emerald-300 block text-xs sm:text-sm uppercase tracking-wide">
                        7. Preço de Venda Sugerido (Unitário)
                      </span>
                      <span className="text-[10px] text-emerald-400/80">
                        {formatBRL(baseValue)} ÷ {formatFactorBR(completeFactorSimples || 0, 5)} ={' '}
                        {formatBRL(salePriceSimples)}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]">
                      {formatBRL(salePriceSimples)}
                    </span>
                  </div>

                  {/* Linha 8: Receita Total se houver quantidade */}
                  {quantity > 0 && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/60 text-slate-300">
                      <div>
                        <span className="font-semibold block">Receita Bruta Total Projetada</span>
                        <span className="text-[10px] text-slate-400">
                          {quantity} unidades × {formatBRL(salePriceSimples)}
                        </span>
                      </div>
                      <span className="font-bold text-slate-100">
                        {formatBRL(totalRevenueSimples)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DETALHAMENTO DO LUCRO PRESUMIDO */}
          {activeTab === 'presumido' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-mono font-bold text-orange-300 uppercase">
                    Fórmula do Preço no Lucro Presumido
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
                  <code className="text-emerald-400">
                    Preço Sugerido = Custo Base ÷ [ (1 − ICMS%) × (1 − PIS 0,65%) × (1 − COFINS
                    3,00%) × (1 − Margem%) ]
                  </code>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  No Lucro Presumido cumulativo, o PIS (0,65%) e a COFINS (3,00%) incidem
                  diretamente sobre a receita bruta, somados à alíquota de ICMS informada. IRPJ
                  (1,20% com base 8%) e CSLL (1,08% com base 12%) incidem trimestralmente sobre a
                  base presumida na DRE.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs font-mono">
                <div className="bg-slate-950/80 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                    Memória Passo a Passo (Lucro Presumido)
                  </span>
                  <span className="text-[10px] text-slate-500">Regime Cumulativo</span>
                </div>

                <div className="divide-y divide-slate-800/70">
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        1. {isLiquid ? 'Receita Líquida Desejada' : 'Custo Unitário de Aquisição'}
                      </span>
                      <span className="text-[10px] text-slate-400">Base numérica inicial</span>
                    </div>
                    <span className="font-bold text-slate-100 text-sm">{formatBRL(baseValue)}</span>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        2. ICMS Estadual sobre Venda
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Alíquota cadastrada no sistema
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-200 block">
                        {formatPercentBR(icmsRateClean)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(icmsFactorPresumido, 4)}
                      </span>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        3. PIS Cumulativo (Lei 9.718/98)
                      </span>
                      <span className="text-[10px] text-slate-400">Alíquota legal oficial</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-200 block">
                        {formatPercentBR(pisPresumidoRate)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(pisFactorPresumido, 4)}
                      </span>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        4. COFINS Cumulativa (Lei 9.718/98)
                      </span>
                      <span className="text-[10px] text-slate-400">Alíquota legal oficial</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-200 block">
                        {formatPercentBR(cofinsPresumidoRate)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(cofinsFactorPresumido, 4)}
                      </span>
                    </div>
                  </div>

                  {customTaxesMarkup.length > 0 && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200 block">
                          5. Tributos Adicionais
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {customTaxesMarkup.map((t) => `${t.name}: ${t.rate}%`).join(', ')}
                        </span>
                      </div>
                      <span className="text-slate-300 font-bold">
                        Fator: {formatFactorBR(customTaxesFactor, 4)}
                      </span>
                    </div>
                  )}

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        6. Margem de Lucro Comercial (%)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator da margem = 1 − ({formatNumberBR(marginPct)} ÷ 100)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {formatPercentBR(marginPct)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(marginFactor, 4)}
                      </span>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-emerald-500/[0.07]">
                    <div>
                      <span className="font-bold text-emerald-400 block">
                        7. Fator Divisor Completo
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator Tributário Base ({formatFactorBR(taxFactorPresumido, 5)}) × Fator
                        Margem ({formatFactorBR(marginFactor, 4)})
                      </span>
                    </div>
                    <span className="font-black text-emerald-300 text-sm">
                      {formatFactorBR(completeFactorPresumido, 5)}
                    </span>
                  </div>

                  <div className="px-3.5 py-3 flex items-center justify-between bg-emerald-500/15 border-t border-emerald-500/30">
                    <div>
                      <span className="font-extrabold text-emerald-300 block text-xs sm:text-sm uppercase tracking-wide">
                        8. Preço de Venda Sugerido (Unitário)
                      </span>
                      <span className="text-[10px] text-emerald-400/80">
                        {formatBRL(baseValue)} ÷ {formatFactorBR(completeFactorPresumido, 5)}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]">
                      {formatBRL(salePricePresumido)}
                    </span>
                  </div>

                  {quantity > 0 && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/60 text-slate-300">
                      <div>
                        <span className="font-semibold block">Receita Bruta Total Projetada</span>
                        <span className="text-[10px] text-slate-400">
                          {quantity} unidades × {formatBRL(salePricePresumido)}
                        </span>
                      </div>
                      <span className="font-bold text-slate-100">
                        {formatBRL(totalRevenuePresumido)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DETALHAMENTO DO LUCRO REAL */}
          {activeTab === 'real' && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-mono font-bold text-orange-300 uppercase">
                    Fórmula do Preço no Lucro Real
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
                  <code className="text-emerald-400">
                    Preço Sugerido = Custo Base ÷ [ (1 − ICMS%) × (1 − PIS 1,65%) × (1 − COFINS
                    7,60%) × (1 − Margem%) ]
                  </code>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  No Lucro Real não cumulativo, as alíquotas de PIS (1,65%) e COFINS (7,60%) incidem
                  integralmente sobre a venda, gerando direito a créditos nas compras que reduzem o
                  CMV líquido. O IRPJ (15% + 10% adicional) e a CSLL (9%) são apurados na DRE sobre
                  o Lucro Líquido Real ajustado no LALUR.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs font-mono">
                <div className="bg-slate-950/80 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                    Memória Passo a Passo (Lucro Real)
                  </span>
                  <span className="text-[10px] text-slate-500">Regime Não Cumulativo</span>
                </div>

                <div className="divide-y divide-slate-800/70">
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        1. {isLiquid ? 'Receita Líquida Desejada' : 'Custo Unitário de Aquisição'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Custo líquido das compras (já descontados créditos de ICMS, PIS e COFINS)
                      </span>
                    </div>
                    <span className="font-bold text-slate-100 text-sm">{formatBRL(baseValue)}</span>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        2. ICMS Estadual sobre Venda
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Alíquota cadastrada no sistema
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-200 block">
                        {formatPercentBR(icmsRateClean)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(icmsFactorReal, 4)}
                      </span>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        3. PIS Não Cumulativo (Lei 10.637/02)
                      </span>
                      <span className="text-[10px] text-slate-400">Alíquota legal oficial</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-200 block">
                        {formatPercentBR(pisRealRate)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(pisFactorReal, 4)}
                      </span>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        4. COFINS Não Cumulativa (Lei 10.833/03)
                      </span>
                      <span className="text-[10px] text-slate-400">Alíquota legal oficial</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-200 block">
                        {formatPercentBR(cofinsRealRate)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(cofinsFactorReal, 4)}
                      </span>
                    </div>
                  </div>

                  {customTaxesMarkup.length > 0 && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200 block">
                          5. Tributos Adicionais
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {customTaxesMarkup.map((t) => `${t.name}: ${t.rate}%`).join(', ')}
                        </span>
                      </div>
                      <span className="text-slate-300 font-bold">
                        Fator: {formatFactorBR(customTaxesFactor, 4)}
                      </span>
                    </div>
                  )}

                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        6. Margem de Lucro Comercial (%)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator da margem = 1 − ({formatNumberBR(marginPct)} ÷ 100)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 text-sm block">
                        {formatPercentBR(marginPct)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator: {formatFactorBR(marginFactor, 4)}
                      </span>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-emerald-500/[0.07]">
                    <div>
                      <span className="font-bold text-emerald-400 block">
                        7. Fator Divisor Completo
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fator Tributário Base ({formatFactorBR(taxFactorReal, 5)}) × Fator Margem (
                        {formatFactorBR(marginFactor, 4)})
                      </span>
                    </div>
                    <span className="font-black text-emerald-300 text-sm">
                      {formatFactorBR(completeFactorReal, 5)}
                    </span>
                  </div>

                  <div className="px-3.5 py-3 flex items-center justify-between bg-emerald-500/15 border-t border-emerald-500/30">
                    <div>
                      <span className="font-extrabold text-emerald-300 block text-xs sm:text-sm uppercase tracking-wide">
                        8. Preço de Venda Sugerido (Unitário)
                      </span>
                      <span className="text-[10px] text-emerald-400/80">
                        {formatBRL(baseValue)} ÷ {formatFactorBR(completeFactorReal, 5)}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]">
                      {formatBRL(salePriceReal)}
                    </span>
                  </div>

                  {quantity > 0 && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-950/60 text-slate-300">
                      <div>
                        <span className="font-semibold block">Receita Bruta Total Projetada</span>
                        <span className="text-[10px] text-slate-400">
                          {quantity} unidades × {formatBRL(salePriceReal)}
                        </span>
                      </div>
                      <span className="font-bold text-slate-100">
                        {formatBRL(totalRevenueReal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé explicativo e botão de fechar */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Fórmulas idênticas às aplicadas na apuração das DREs e do comparativo.</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors cursor-pointer text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
