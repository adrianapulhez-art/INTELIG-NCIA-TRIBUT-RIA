import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { formatBRL, formatNumberBR } from '../../lib/taxCalculations'
import {
  calculateCmvDetailedBreakdown,
  type RegimeCmvBreakdown,
} from '../../lib/cmvBreakdownCalculations'
import { useTaxContext } from '../../contexts/TaxContext'

interface CmvDetailedBreakdownProps {
  /**
   * Regime específico a detalhar, ou se não informado, usa o regime ativo do TaxContext
   */
  forcedRegime?: 'presumido' | 'real' | 'simples'
  /**
   * Quantidade vendida específica da tela (ex: da DRE atual)
   */
  quantitySold?: number
  /**
   * Título customizado do bloco
   */
  title?: string
  /**
   * Se inicia aberto por padrão
   */
  defaultExpanded?: boolean
  /**
   * Estilo variante: 'card' (destaque nos cards) ou 'embedded' (para tabelas DRE)
   */
  variant?: 'card' | 'embedded' | 'drawer'
  /**
   * Permite alternar entre os 3 regimes dentro do próprio componente
   */
  showRegimeTabs?: boolean
}

export const CmvDetailedBreakdown: React.FC<CmvDetailedBreakdownProps> = ({
  forcedRegime,
  quantitySold,
  title,
  defaultExpanded = false,
  variant = 'embedded',
  showRegimeTabs = false,
}) => {
  const taxContext = useTaxContext()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [selectedRegime, setSelectedRegime] = useState<'presumido' | 'real' | 'simples'>(
    forcedRegime || (taxContext.regime as 'presumido' | 'real' | 'simples') || 'presumido',
  )

  const activeRegime =
    forcedRegime ||
    (showRegimeTabs ? selectedRegime : (taxContext.regime as 'presumido' | 'real' | 'simples'))
  const effectiveQty =
    quantitySold !== undefined
      ? quantitySold
      : taxContext.calculatedPurchases.totalSoldUnitsEffective || 0

  const breakdown: RegimeCmvBreakdown = calculateCmvDetailedBreakdown({
    regime: activeRegime,
    purchasesItems: taxContext.purchasesItems,
    additionalCosts: taxContext.additionalCosts,
    deductionCosts: taxContext.deductionCosts,
    initialInventory: taxContext.initialInventory,
    finalInventory: taxContext.finalInventory,
    autoInventoryDeduction: taxContext.autoInventoryDeduction,
    initialInventoryUnits: taxContext.initialInventoryUnits,
    nonRecoverableTaxBase: taxContext.nonRecoverableTaxBase,
    nonRecoverableTaxRate: taxContext.nonRecoverableTaxRate,
    icmsPurchasesBase: taxContext.icmsPurchasesBase,
    icmsPurchasesRate: taxContext.icmsPurchasesRate,
    icmsFreightPurchasesBase: taxContext.icmsFreightPurchasesBase,
    icmsFreightPurchasesRate: taxContext.icmsFreightPurchasesRate,
    pisPurchasesBase: taxContext.pisPurchasesBase,
    pisRatePurchases: 1.65,
    cofinsPurchasesBase: taxContext.cofinsPurchasesBase,
    cofinsRatePurchases: 7.6,
    pisFreightPurchasesBase: taxContext.pisFreightPurchasesBase,
    cofinsFreightPurchasesBase: taxContext.cofinsFreightPurchasesBase,
    pisExcludedIcmsManual: taxContext.pisExcludedIcmsManual,
    cofinsExcludedIcmsManual: taxContext.cofinsExcludedIcmsManual,
    stSubsystemEnabled: taxContext.stSubsystem.enabled,
    stSubsystemPurchasesPaid: taxContext.stSubsystem.purchasesStPaid,
    quantitySold: effectiveQty,
    // Sincronização 100% precisa com o context
    cmvPresumidoNetPurchasesContext: taxContext.calculatedPurchases.cmvPresumidoNetPurchases,
    cmvPresumidoContext: taxContext.calculatedPurchases.cmvPresumido,
    cmvRealNetPurchasesContext: taxContext.calculatedPurchases.cmvRealNetPurchases,
    cmvRealContext: taxContext.calculatedPurchases.cmvReal,
    cmvSimplesNetPurchasesContext: taxContext.calculatedPurchases.cmvSimplesNetPurchases,
    cmvSimplesContext: taxContext.calculatedPurchases.cmvSimples,
    unitCostPresumidoContext: taxContext.calculatedPurchases.unitCostPresumidoEffective,
    unitCostRealContext: taxContext.calculatedPurchases.unitCostRealEffective,
    unitCostSimplesContext: taxContext.calculatedPurchases.unitCostSimplesEffective,
    autoFinalInventoryPresumidoContext: taxContext.calculatedPurchases.autoFinalInventoryPresumido,
    autoFinalInventoryRealContext: taxContext.calculatedPurchases.autoFinalInventoryReal,
    autoFinalInventorySimplesContext: taxContext.calculatedPurchases.autoFinalInventorySimples,
  })

  return (
    <div
      className={`rounded-xl border transition-all ${
        variant === 'card'
          ? 'bg-[#1a0f03]/90 border-amber-900/60'
          : 'bg-[#261502]/80 border-amber-900/50'
      }`}
    >
      {/* Botão de alternância (Toggle Expansível) */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left text-xs font-mono transition-colors hover:bg-[#3b2405]/50 rounded-xl cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 text-amber-100">
          <FileSpreadsheet className="w-4 h-4 text-[#e5b742] shrink-0" />
          <span className="font-semibold text-xs text-[#fff5cc]">
            {title || `Discriminação da Composição do CMV — ${breakdown.regimeLabel}`}
          </span>
          <span className="text-[10px] text-amber-200 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
            {breakdown.isMultiProduct || breakdown.unitCmv === null
              ? formatBRL(breakdown.totalCmv)
              : `${formatBRL(breakdown.unitCmv)} / un.`}
          </span>
          {breakdown.isAutoInventory && (
            <span className="text-[10px] text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono hidden sm:inline-block">
              baixa por quantidade ({breakdown.soldUnits} un.)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-amber-200/70">
          <span className="text-[11px] font-mono text-[#e5b742] font-bold hidden xs:inline">
            Total: {formatBRL(breakdown.totalCmv)}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#e5b742]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-200/70" />
          )}
        </div>
      </button>

      {/* Conteúdo Expansível com Detalhamento Item a Item */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 pt-1 border-t border-amber-900/50 space-y-3 font-mono text-xs">
          {/* Tabs opcionais de regime */}
          {showRegimeTabs && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-amber-900/50">
              <span className="text-[11px] text-amber-200/70 mr-1">Regime:</span>
              {(
                [
                  { key: 'presumido', label: 'Lucro Presumido' },
                  { key: 'real', label: 'Lucro Real' },
                  { key: 'simples', label: 'Simples Nacional' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedRegime(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    activeRegime === tab.key
                      ? 'bg-gradient-to-r from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-bold shadow-sm'
                      : 'bg-[#261502] border border-amber-900/60 text-amber-200/80 hover:text-[#fff5cc]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Cards com resumo de tributos e deduções recuperáveis */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-[#261502]/70 border border-amber-900/50">
              <span className="text-[10px] text-amber-200/70 block">Mercadoria Bruta</span>
              <span className="text-[#fff5cc] font-bold text-xs">
                {formatBRL(breakdown.merchandiseTotal)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#261502]/70 border border-amber-900/50">
              <span className="text-[10px] text-amber-200/70 block">Frete e Custos</span>
              <span className="text-[#fff5cc] font-bold text-xs">
                {formatBRL(breakdown.freightTotal + breakdown.otherCostsTotal)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#261502]/70 border border-amber-500/25">
              <span className="text-[10px] text-amber-300 block">ICMS Deduzido</span>
              <span className="text-[#e5b742] font-bold text-xs">
                {activeRegime === 'simples'
                  ? 'R$ 0,00 (integrado)'
                  : `-${formatBRL(breakdown.totalIcms)}`}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#261502]/70 border border-amber-500/25">
              <span className="text-[10px] text-amber-300 block">PIS/COFINS Deduzido</span>
              <span className="text-[#e5b742] font-bold text-xs">
                {activeRegime === 'real'
                  ? `-${formatBRL(breakdown.totalPis + breakdown.totalCofins)}`
                  : 'R$ 0,00 (não deduz)'}
              </span>
            </div>
          </div>

          {/* Tabela discriminada linha por linha com valores unitário e total em R$ */}
          <div className="overflow-x-auto rounded-lg border border-amber-900/60 bg-[#1a0f03]/90">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-amber-900/50 bg-[#261502] text-amber-200/80 font-mono text-[11px]">
                  <th className="py-2 px-3 font-semibold text-amber-200">
                    Componente da Composição do CMV
                  </th>
                  <th className="py-2 px-3 text-right font-semibold text-amber-200 w-32 sm:w-36">
                    Unitário (R$)
                  </th>
                  <th className="py-2 px-3 text-right font-semibold text-amber-200 w-32 sm:w-36">
                    Total Compras (R$)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-900/40 font-mono text-xs">
                {breakdown.lines.map((line) => {
                  const isDeduction = line.type === 'deduction'
                  const isAddition = line.type === 'addition'
                  const isSubtotal = line.type === 'subtotal'
                  const isTotal = line.type === 'total'
                  const isInfo = line.type === 'info'

                  return (
                    <tr
                      key={line.id}
                      className={`transition-colors ${
                        isTotal
                          ? 'bg-amber-500/15 font-bold text-[#e5b742]'
                          : isSubtotal
                            ? 'bg-[#261502]/60 font-semibold text-[#fff5cc]'
                            : isInfo
                              ? 'bg-[#1a0f03]/50 text-amber-200/60 italic'
                              : 'hover:bg-[#3b2405]/30 text-amber-100/90'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex flex-col">
                          <span
                            className={`${
                              isTotal
                                ? 'text-[#e5b742] font-bold text-xs sm:text-sm'
                                : isSubtotal
                                  ? 'text-[#fff5cc] font-bold'
                                  : isDeduction
                                    ? 'text-amber-300'
                                    : 'text-amber-100'
                            }`}
                          >
                            {line.label}
                          </span>
                          {line.description && (
                            <span className="text-[10px] text-amber-200/60 font-normal">
                              {line.description}
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className={`py-2 px-3 text-right font-mono ${
                          isTotal
                            ? 'text-[#e5b742] font-bold text-xs sm:text-sm'
                            : isDeduction
                              ? 'text-amber-300'
                              : isAddition
                                ? 'text-amber-100'
                                : 'text-amber-200/90'
                        }`}
                      >
                        {isInfo || line.unitValue === null ? '—' : formatBRL(line.unitValue)}
                      </td>

                      <td
                        className={`py-2 px-3 text-right font-mono ${
                          isTotal
                            ? 'text-[#e5b742] font-bold text-xs sm:text-sm'
                            : isDeduction
                              ? 'text-amber-300'
                              : isAddition
                                ? 'text-amber-100'
                                : 'text-amber-200/90'
                        }`}
                      >
                        {isInfo ? '—' : formatBRL(line.totalValue)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Quando houver múltiplos produtos, renderizar detalhamento de UMA LINHA POR PRODUTO */}
          {breakdown.isMultiProduct &&
            breakdown.productBreakdowns &&
            breakdown.productBreakdowns.length > 0 && (
              <div className="rounded-lg border border-amber-900/60 bg-[#1a0f03]/90 p-3 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-900/50">
                  <span className="text-[11px] font-bold text-[#e5b742] uppercase tracking-wide">
                    Detalhamento Item a Item por Produto (Unitário e Total por Item)
                  </span>
                  <span className="text-[10px] text-amber-200/70">
                    {breakdown.productBreakdowns.length} produtos · soma consolidada sem média
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left font-mono">
                    <thead>
                      <tr className="border-b border-amber-900/50 text-amber-200/80 text-[10px] uppercase bg-[#261502]">
                        <th className="py-1.5 px-2">Produto</th>
                        <th className="py-1.5 px-2 text-right">Qtd</th>
                        <th className="py-1.5 px-2 text-right">Mercadoria (Un.)</th>
                        <th className="py-1.5 px-2 text-right">Mercadoria (Total)</th>
                        <th className="py-1.5 px-2 text-right">Frete (Total)</th>
                        <th className="py-1.5 px-2 text-right">ICMS Ded.</th>
                        {activeRegime === 'real' && (
                          <th className="py-1.5 px-2 text-right">PIS/COF Ded.</th>
                        )}
                        <th className="py-1.5 px-2 text-right text-amber-200 font-semibold">
                          CL Unit.
                        </th>
                        <th className="py-1.5 px-2 text-right text-[#e5b742] font-bold">
                          CL Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-900/40">
                      {breakdown.productBreakdowns.map((prod) => (
                        <tr key={prod.id} className="hover:bg-[#3b2405]/30 transition-colors">
                          <td className="py-1.5 px-2 text-[#fff5cc] font-medium">{prod.name}</td>
                          <td className="py-1.5 px-2 text-right text-amber-200/70">
                            {prod.quantity} un.
                          </td>
                          <td className="py-1.5 px-2 text-right text-amber-100">
                            {formatBRL(prod.unitGross)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-amber-100">
                            {formatBRL(prod.totalGross)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-amber-200/70">
                            {prod.totalFreight > 0 ? formatBRL(prod.totalFreight) : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right text-amber-300">
                            {prod.totalIcmsMerch + prod.totalIcmsFreight > 0
                              ? `-${formatBRL(prod.totalIcmsMerch + prod.totalIcmsFreight)}`
                              : '—'}
                          </td>
                          {activeRegime === 'real' && (
                            <td className="py-1.5 px-2 text-right text-amber-300">
                              {(prod.totalPisMerch || 0) + (prod.totalCofinsMerch || 0) > 0
                                ? `-${formatBRL((prod.totalPisMerch || 0) + (prod.totalCofinsMerch || 0))}`
                                : '—'}
                            </td>
                          )}
                          <td className="py-1.5 px-2 text-right text-amber-200 font-semibold">
                            {formatBRL(prod.unitNetPurchases)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-[#e5b742] font-bold">
                            {formatBRL(prod.totalNetPurchases)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-amber-900/60 font-bold bg-[#261502] text-[11px]">
                      <tr>
                        <td className="py-2 px-2 text-[#fff5cc]" colSpan={2}>
                          SOMA CONSOLIDADA
                        </td>
                        <td className="py-2 px-2 text-right text-amber-200/70">—</td>
                        <td className="py-2 px-2 text-right text-[#fff5cc]">
                          {formatBRL(breakdown.merchandiseTotal)}
                        </td>
                        <td className="py-2 px-2 text-right text-amber-100">
                          {formatBRL(breakdown.freightTotal)}
                        </td>
                        <td className="py-2 px-2 text-right text-amber-300">
                          {breakdown.totalIcms > 0 ? `-${formatBRL(breakdown.totalIcms)}` : '—'}
                        </td>
                        {activeRegime === 'real' && (
                          <td className="py-2 px-2 text-right text-amber-300">
                            {breakdown.totalPis + breakdown.totalCofins > 0
                              ? `-${formatBRL(breakdown.totalPis + breakdown.totalCofins)}`
                              : '—'}
                          </td>
                        )}
                        <td className="py-2 px-2 text-right text-amber-200/70">—</td>
                        <td className="py-2 px-2 text-right text-[#e5b742]">
                          {formatBRL(breakdown.netPurchases)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

          {/* Rodapé explicativo com notas legais da dedução específica */}
          <div className="p-3 rounded-lg bg-[#261502]/60 border border-amber-900/50 text-[11px] text-amber-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-[#fff5cc] font-semibold">
              <Info className="w-3.5 h-3.5 text-[#e5b742] shrink-0" />
              <span>Regra de Dedução e Apropriação Fiscal:</span>
            </div>
            {activeRegime === 'presumido' && (
              <p>
                No <strong>Lucro Presumido</strong>, os créditos de PIS e COFINS não são
                apropriáveis pelo adquirente (regime cumulativo — Leis 9.718/98 e 10.637/02). Apenas
                o <strong>ICMS destacado sobre mercadoria e frete</strong> é deduzido do custo de
                aquisição. O ICMS-ST pago na entrada integra o custo por se tratar de encargo
                definitivo.
              </p>
            )}
            {activeRegime === 'real' && (
              <p>
                No <strong>Lucro Real</strong> (regime não cumulativo pleno), deduzem-se do custo de
                aquisição o <strong>ICMS sobre mercadoria</strong>, o{' '}
                <strong>ICMS sobre frete</strong>, o <strong>PIS (1,65%)</strong> e a{' '}
                <strong>COFINS (7,60%)</strong>, calculados com a exclusão do ICMS da base conforme
                jurisprudência do STF (Tema 69).
              </p>
            )}
            {activeRegime === 'simples' && (
              <p>
                No <strong>Simples Nacional</strong>, a legislação (art. 23 da LC 123/2006) veda a
                apropriação de créditos de ICMS, PIS e COFINS na compra. Portanto,{' '}
                <strong>todos os tributos da nota de aquisição integram o CMV</strong> como custo
                efetivo do produto.
              </p>
            )}
            {breakdown.isAutoInventory && (
              <p className="text-[#e5b742] pt-1 border-t border-amber-900/50 font-semibold">
                • Baixa automática ativa: CMV do período = {breakdown.soldUnits} un. vendidas ×{' '}
                {formatBRL(breakdown.unitCmv)} (custo unitário discriminado) ={' '}
                {formatBRL(breakdown.totalCmv)}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
