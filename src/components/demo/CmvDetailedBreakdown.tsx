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
    pisRatePurchases: taxContext.regime === 'real' ? 1.65 : 0.65,
    cofinsPurchasesBase: taxContext.cofinsPurchasesBase,
    cofinsRatePurchases: taxContext.regime === 'real' ? 7.6 : 3.0,
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
          ? 'bg-slate-950/70 border-slate-800'
          : 'bg-slate-950/50 border-slate-800/80'
      }`}
    >
      {/* Botão de alternância (Toggle Expansível) */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left text-xs font-mono transition-colors hover:bg-slate-900/60 rounded-xl cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 text-slate-200">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-xs text-white">
            {title || `Discriminação da Composição do CMV — ${breakdown.regimeLabel}`}
          </span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
            {formatBRL(breakdown.unitCmv)} / un.
          </span>
          {breakdown.isAutoInventory && (
            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono hidden sm:inline-block">
              baixa por quantidade ({breakdown.soldUnits} un.)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[11px] font-mono text-emerald-400 font-bold hidden xs:inline">
            Total: {formatBRL(breakdown.totalCmv)}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Conteúdo Expansível com Detalhamento Item a Item */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 pt-1 border-t border-slate-800/70 space-y-3 font-mono text-xs">
          {/* Tabs opcionais de regime */}
          {showRegimeTabs && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800">
              <span className="text-[11px] text-slate-400 mr-1">Regime:</span>
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
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Cards com resumo de tributos e deduções recuperáveis */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Mercadoria Bruta</span>
              <span className="text-slate-100 font-bold text-xs">
                {formatBRL(breakdown.merchandiseTotal)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Frete e Custos</span>
              <span className="text-slate-100 font-bold text-xs">
                {formatBRL(breakdown.freightTotal + breakdown.otherCostsTotal)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 block">ICMS Deduzido</span>
              <span className="text-emerald-300 font-bold text-xs">
                {activeRegime === 'simples'
                  ? 'R$ 0,00 (integrado)'
                  : `-${formatBRL(breakdown.totalIcms)}`}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 block">PIS/COFINS Deduzido</span>
              <span className="text-emerald-300 font-bold text-xs">
                {activeRegime === 'real'
                  ? `-${formatBRL(breakdown.totalPis + breakdown.totalCofins)}`
                  : 'R$ 0,00 (não deduz)'}
              </span>
            </div>
          </div>

          {/* Tabela discriminada linha por linha com valores unitário e total em R$ */}
          <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/80">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-mono text-[11px]">
                  <th className="py-2 px-3 font-semibold text-slate-300">
                    Componente da Composição do CMV
                  </th>
                  <th className="py-2 px-3 text-right font-semibold text-slate-300 w-32 sm:w-36">
                    Unitário (R$)
                  </th>
                  <th className="py-2 px-3 text-right font-semibold text-slate-300 w-32 sm:w-36">
                    Total Compras (R$)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
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
                          ? 'bg-emerald-500/10 font-bold text-emerald-300'
                          : isSubtotal
                            ? 'bg-slate-900/40 font-semibold text-slate-200'
                            : isInfo
                              ? 'bg-slate-950/40 text-slate-400 italic'
                              : 'hover:bg-slate-900/30 text-slate-300'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex flex-col">
                          <span
                            className={`${
                              isTotal
                                ? 'text-emerald-400 font-bold text-xs sm:text-sm'
                                : isSubtotal
                                  ? 'text-slate-100 font-bold'
                                  : isDeduction
                                    ? 'text-emerald-400/90'
                                    : 'text-slate-200'
                            }`}
                          >
                            {line.label}
                          </span>
                          {line.description && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              {line.description}
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className={`py-2 px-3 text-right font-mono ${
                          isTotal
                            ? 'text-emerald-400 font-bold text-xs sm:text-sm'
                            : isDeduction
                              ? 'text-emerald-400'
                              : isAddition
                                ? 'text-slate-200'
                                : 'text-slate-300'
                        }`}
                      >
                        {isInfo ? '—' : formatBRL(line.unitValue)}
                      </td>

                      <td
                        className={`py-2 px-3 text-right font-mono ${
                          isTotal
                            ? 'text-emerald-400 font-bold text-xs sm:text-sm'
                            : isDeduction
                              ? 'text-emerald-400'
                              : isAddition
                                ? 'text-slate-200'
                                : 'text-slate-300'
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

          {/* Rodapé explicativo com notas legais da dedução específica */}
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
              <p className="text-emerald-400/90 pt-1 border-t border-slate-800/60 font-semibold">
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
