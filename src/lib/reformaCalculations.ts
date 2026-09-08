/**
 * Motor de Cálculo da Reforma Tributária — IBS/CBS e Transição 2026–2033
 * Base Legal: Emenda Constitucional 132/2023 e Lei Complementar 214/2025
 */

export type ReformaYear = 2026 | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033

export interface ReformaYearRates {
  year: ReformaYear
  // Alíquotas Federais
  cbsRate: number // % Contribuição sobre Bens e Serviços
  pisRate: number // % PIS vigente
  cofinsRate: number // % COFINS vigente
  ipiRate: number // % IPI vigente
  isRate: number // % Imposto Seletivo (se aplicável ao produto)
  // Alíquotas Subnacionais (Estados e Municípios)
  ibsRate: number // % Imposto sobre Bens e Serviços (estadual + municipal)
  icmsFactor: number // Proporção de ICMS remanescente (ex: 1.0 = 100%, 10/11, ..., 0)
  issFactor: number // Proporção de ISS remanescente (ex: 1.0 = 100%, 10/11, ..., 0)
  // Metadados legais da fase
  phaseTitle: string
  phaseSummary: string
  legalBasis: string
  isCbsFullCredit: boolean // não-cumulatividade ampla da CBS ativa
  isIbsFullCredit: boolean // não-cumulatividade ampla do IBS ativa
  isCrossCreditPisCofins: boolean // compensação CBS-teste com PIS/COFINS
}

/**
 * Cronograma legal padrão (LC 214/2025 e EC 132/2023)
 * Premissa de alíquota padrão plena (2033): CBS ~8,8%, IBS ~17,7% (Total ~26,5%)
 */
export const DEFAULT_REFORMA_SCHEDULE: Record<ReformaYear, ReformaYearRates> = {
  2026: {
    year: 2026,
    cbsRate: 0.9,
    pisRate: 1.65, // mantido para regime atual
    cofinsRate: 7.6,
    ipiRate: 0,
    isRate: 0,
    ibsRate: 0.1,
    icmsFactor: 1.0, // ICMS segue integral
    issFactor: 1.0, // ISS segue integral
    phaseTitle: 'Ano-Teste ("Vestibular")',
    phaseSummary:
      'CBS a 0,9% e IBS a 0,1% em caráter teste, compensáveis com os recolhimentos de PIS e COFINS devidos. Todos os tributos atuais seguem cobrados integralmente.',
    legalBasis: 'EC 132/23 art. 124 a 128 e LC 214/25',
    isCbsFullCredit: false,
    isIbsFullCredit: false,
    isCrossCreditPisCofins: true,
  },
  2027: {
    year: 2027,
    cbsRate: 8.8, // CBS plena estimada
    pisRate: 0, // EXTINTO
    cofinsRate: 0, // EXTINTO
    ipiRate: 0, // Alíquotas reduzidas a zero (salvo ZFM)
    isRate: 0, // Nasce o Imposto Seletivo (opcional por produto)
    ibsRate: 0.1, // IBS segue em teste
    icmsFactor: 1.0, // ICMS segue integral
    issFactor: 1.0, // ISS segue integral
    phaseTitle: 'CBS Plena & Extinção de PIS/COFINS',
    phaseSummary:
      'PIS e COFINS são extintos definitivamente. Entrada da CBS plena com não cumulatividade ampla e crédito sobre todas as compras. IPI zerado. Criação do Imposto Seletivo.',
    legalBasis: 'EC 132/23 art. 129 e LC 214/25',
    isCbsFullCredit: true,
    isIbsFullCredit: false,
    isCrossCreditPisCofins: false,
  },
  2028: {
    year: 2028,
    cbsRate: 8.8,
    pisRate: 0,
    cofinsRate: 0,
    ipiRate: 0, // IPI formalmente extinto
    isRate: 0,
    ibsRate: 0.1,
    icmsFactor: 1.0, // ICMS 100%
    issFactor: 1.0, // ISS 100%
    phaseTitle: 'Extinção do IPI & Convivência Plena',
    phaseSummary:
      'IPI formalmente extinto. Convivência plena do sistema antigo (ICMS e ISS 100% estaduais/municipais) e do sistema novo federal (CBS plena).',
    legalBasis: 'EC 132/23 art. 129, § 2º',
    isCbsFullCredit: true,
    isIbsFullCredit: false,
    isCrossCreditPisCofins: false,
  },
  2029: {
    year: 2029,
    cbsRate: 8.8,
    pisRate: 0,
    cofinsRate: 0,
    ipiRate: 0,
    isRate: 0,
    ibsRate: 1.77, // 1/10 do IBS de referência (17,7% * 0,1)
    icmsFactor: 10 / 11, // Redução de 1/11 (~90,91%)
    issFactor: 10 / 11,
    phaseTitle: 'Início da Transição Federativa (1/11)',
    phaseSummary:
      'ICMS e ISS têm redução de 1/11 (recolhem 10/11) enquanto o IBS passa a recolher 1/10 de sua alíquota de referência. Princípio do destino começa a absorver o DIFAL.',
    legalBasis: 'EC 132/23 art. 130 e LC 214/25',
    isCbsFullCredit: true,
    isIbsFullCredit: true,
    isCrossCreditPisCofins: false,
  },
  2030: {
    year: 2030,
    cbsRate: 8.8,
    pisRate: 0,
    cofinsRate: 0,
    ipiRate: 0,
    isRate: 0,
    ibsRate: 3.54, // 2/10 do IBS (17,7% * 0,2)
    icmsFactor: 9 / 11, // Redução de 2/11 (~81,82%)
    issFactor: 9 / 11,
    phaseTitle: 'Transição Gradual — Ano 2 (2/11)',
    phaseSummary:
      'ICMS e ISS caem para 9/11 (~81,82%). O IBS sobe para 2/10 da alíquota de referência (~3,54%). CBS segue plena.',
    legalBasis: 'EC 132/23 art. 130',
    isCbsFullCredit: true,
    isIbsFullCredit: true,
    isCrossCreditPisCofins: false,
  },
  2031: {
    year: 2031,
    cbsRate: 8.8,
    pisRate: 0,
    cofinsRate: 0,
    ipiRate: 0,
    isRate: 0,
    ibsRate: 5.31, // 3/10 do IBS (17,7% * 0,3)
    icmsFactor: 8 / 11, // Redução de 3/11 (~72,73%)
    issFactor: 8 / 11,
    phaseTitle: 'Transição Gradual — Ano 3 (3/11)',
    phaseSummary:
      'ICMS e ISS caem para 8/11 (~72,73%). O IBS sobe para 3/10 da alíquota de referência (~5,31%). Créditos de compras ganham maior relevância.',
    legalBasis: 'EC 132/23 art. 130',
    isCbsFullCredit: true,
    isIbsFullCredit: true,
    isCrossCreditPisCofins: false,
  },
  2032: {
    year: 2032,
    cbsRate: 8.8,
    pisRate: 0,
    cofinsRate: 0,
    ipiRate: 0,
    isRate: 0,
    ibsRate: 7.08, // 4/10 do IBS (17,7% * 0,4)
    icmsFactor: 7 / 11, // Redução de 4/11 (~63,64%)
    issFactor: 7 / 11,
    phaseTitle: 'Último Ano de Transição Federativa (4/11)',
    phaseSummary:
      'ICMS e ISS caem para 7/11 (~63,64%). O IBS atinge 4/10 (~7,08%). Último ano de apuração de obrigações acessórias do ICMS/ISS tradicional.',
    legalBasis: 'EC 132/23 art. 130',
    isCbsFullCredit: true,
    isIbsFullCredit: true,
    isCrossCreditPisCofins: false,
  },
  2033: {
    year: 2033,
    cbsRate: 8.8,
    pisRate: 0,
    cofinsRate: 0,
    ipiRate: 0,
    isRate: 0,
    ibsRate: 17.7, // IBS pleno integral
    icmsFactor: 0, // ICMS EXTINTO
    issFactor: 0, // ISS EXTINTO
    phaseTitle: 'Sistema Pleno — Novo Modelo IVA Dual',
    phaseSummary:
      'ICMS, ISS, PIS, COFINS e IPI totalmente extintos. Sistema pleno com IBS e CBS calculados por fora, não cumulatividade ampla e split payment instantâneo.',
    legalBasis: 'EC 132/23 art. 133 — Vigência plena da reforma',
    isCbsFullCredit: true,
    isIbsFullCredit: true,
    isCrossCreditPisCofins: false,
  },
}

/**
 * Alíquotas customizáveis pelo usuário por ano
 */
export interface UserReformaYearOverrides {
  cbsRate?: number
  ibsRate?: number
  isRate?: number
  enableImpostoSeletivo?: boolean
}

/**
 * Estado salvo da Reforma Tributária (integrado ao TaxStateSnapshot)
 */
export interface ReformaState {
  selectedYear: ReformaYear
  enableImpostoSeletivo: boolean
  impostoSeletivoRate: number // % padrão se ativado (ex: 2.0%)
  // Alíquotas de referência globais plena (2033)
  referenceCbsRate: number // padrão 8.8%
  referenceIbsRate: number // padrão 17.7%
  // Overrides por ano
  customRatesByYear: Partial<Record<ReformaYear, UserReformaYearOverrides>>
  // Toggle para comparar Simples no regime regular (B2B com crédito integral de IBS/CBS)
  simplesRegimeRegularOption: boolean
}

export const INITIAL_REFORMA_STATE: ReformaState = {
  selectedYear: 2026,
  enableImpostoSeletivo: false,
  impostoSeletivoRate: 0,
  referenceCbsRate: 8.8,
  referenceIbsRate: 17.7,
  customRatesByYear: {},
  simplesRegimeRegularOption: false,
}

/**
 * Resolve as alíquotas efetivas de um ano aplicando eventuais overrides do usuário
 */
export function getEffectiveYearRates(year: ReformaYear, state: ReformaState): ReformaYearRates {
  const base = DEFAULT_REFORMA_SCHEDULE[year]
  const overrides = state.customRatesByYear[year] || {}

  // Proporção de IBS no ano (conforme o cronograma de 2029 a 2033)
  let ibsProportion = 0
  if (year <= 2028) {
    ibsProportion = 0.00565 // 0.1% em relação a 17.7%
  } else if (year === 2029) {
    ibsProportion = 0.1
  } else if (year === 2030) {
    ibsProportion = 0.2
  } else if (year === 2031) {
    ibsProportion = 0.3
  } else if (year === 2032) {
    ibsProportion = 0.4
  } else if (year === 2033) {
    ibsProportion = 1.0
  }

  // CBS efetiva
  let effectiveCbs = base.cbsRate
  if (overrides.cbsRate !== undefined) {
    effectiveCbs = overrides.cbsRate
  } else if (year >= 2027) {
    effectiveCbs = state.referenceCbsRate
  }

  // IBS efetivo
  let effectiveIbs = base.ibsRate
  if (overrides.ibsRate !== undefined) {
    effectiveIbs = overrides.ibsRate
  } else if (year >= 2029) {
    effectiveIbs = Number((state.referenceIbsRate * ibsProportion).toFixed(2))
  }

  // Imposto Seletivo
  let effectiveIs = 0
  const isEnabled = overrides.enableImpostoSeletivo ?? state.enableImpostoSeletivo
  if (isEnabled && year >= 2027) {
    effectiveIs = overrides.isRate ?? (state.impostoSeletivoRate || 2.0)
  }

  return {
    ...base,
    cbsRate: effectiveCbs,
    ibsRate: effectiveIbs,
    isRate: effectiveIs,
  }
}

/**
 * Entrada para o cálculo comparativo anual
 */
export interface ReformaCalculationInput {
  year: ReformaYear
  rates: ReformaYearRates
  // Dados operacionais vindos do TaxContext
  totalRevenueCurrent: number // Preço ou faturamento no regime atual (ex: R$ 100.000)
  quantitySold: number // Quantidade vendida
  unitSalePriceCurrent: number // Preço unitário atual
  totalPurchasesCost: number // Custo total de aquisições/compras brutas
  // Custo operacional adicional (energia, frete, aluguel, telecom, serviços PJ que geram crédito no novo sistema)
  creditableOperatingExpenses: number
  payrollCost: number // Folha + encargos + pró-labore
  // Carga tributária atual da operação (conforme regime ativo: Simples, Presumido ou Real)
  currentTaxBurden: number
  currentNetMargin: number
  currentNetProfit: number
  currentRegimeName: string // 'Lucro Presumido' | 'Lucro Real' | 'Simples Nacional'
}

/**
 * Resultado do cálculo comparativo anual
 */
export interface ReformaCalculationResult {
  year: ReformaYear
  phaseTitle: string
  // Débitos sobre a venda (sistema novo)
  grossSaleRevenue: number // Preço bruto (faturamento)
  netSaleRevenue: number // Preço líquido de tributos (base "por fora")
  debitoCbs: number
  debitoIbs: number
  debitoImpostoSeletivo: number
  totalDebitoNovo: number
  // Créditos sobre compras e insumos (não-cumulatividade ampla)
  creditoComprasCbs: number
  creditoComprasIbs: number
  creditoInsumosServicosCbs: number
  creditoInsumosServicosIbs: number
  totalCreditoNovo: number
  // Imposto líquido a recolher no sistema novo
  netCbsToPay: number
  netIbsToPay: number
  netImpostoSeletivoToPay: number
  totalNovoTributosLiquidos: number
  // Tributos do sistema antigo que ainda incidem no ano de transição
  transitionalIcmsToPay: number
  transitionalIssToPay: number
  transitionalPisCofinsToPay: number
  transitionalIpiToPay: number
  totalAntigoTributosNoAno: number
  // Compensação de crédito cruzado 2026
  crossCreditCompensated2026: number
  // Carga tributária TOTAL incidente no ano
  totalYearTaxBurden: number
  effectiveYearTaxRate: number // % sobre a receita bruta
  // Confronto com o regime atual
  currentTaxBurden: number
  taxBurdenDifference: number // (totalYearTaxBurden - currentTaxBurden) — negativo = economia!
  isReformaBetter: boolean // true se a nova sistemática paga menos imposto
  // Precificação "Por dentro vs Por fora"
  pricingComparison: {
    currentUnitPrice: number
    suggestedUnitPriceNovo: number // Preço unitário no novo sistema para manter exatamente a mesma receita líquida
    netPriceExTaxes: number // Preço 100% desonerado de tributos sobre a venda
    priceDifference: number
    priceDifferencePercent: number
    taxInPricePercentCurrent: number // Carga embutida por dentro no preço atual
    taxOnPricePercentNovo: number // Carga somada por fora no novo preço
  }
  // Lucro líquido projetado no novo sistema
  projectedNetProfit: number
  projectedNetMargin: number
  // Comparação Simples Nacional na Reforma
  simplesComparison?: {
    simplesDasTax: number
    simplesRegimeRegularTax: number
    creditTransferredToCustomerDas: number // Crédito limitado que cliente PJ aproveita
    creditTransferredToCustomerRegular: number // Crédito integral aproveitado pelo cliente PJ
    recommendedOption: 'simples_das' | 'regime_regular'
    explanation: string
  }
}

/**
 * Motor principal de cálculo para um ano específico da reforma
 */
export function calculateReformaYear(input: ReformaCalculationInput): ReformaCalculationResult {
  const {
    year,
    rates,
    totalRevenueCurrent,
    quantitySold,
    unitSalePriceCurrent,
    totalPurchasesCost,
    creditableOperatingExpenses,
    payrollCost,
    currentTaxBurden,
    currentNetProfit,
    currentRegimeName,
  } = input

  const qty = quantitySold > 0 ? quantitySold : 1
  const revenue = totalRevenueCurrent > 0 ? totalRevenueCurrent : 0

  // 1. Tributos Antigos residuais no ano
  // Se estamos em 2026, PIS/COFINS e ICMS são integrais.
  // Em 2027 e 2028, PIS/COFINS = 0, ICMS integral.
  // De 2029 a 2032, ICMS reduz de acordo com icmsFactor.
  // Em 2033, ICMS = 0.
  // Estimamos a parcela de ICMS atual como ~18% da receita bruta e PIS/COFINS ~3,65% a 9,25%
  const estimatedCurrentIcms = revenue * 0.18 * rates.icmsFactor
  const estimatedCurrentIss = revenue * 0.05 * rates.issFactor
  const transitionalIcmsToPay = rates.icmsFactor > 0 ? estimatedCurrentIcms : 0
  const transitionalIssToPay = rates.issFactor > 0 ? estimatedCurrentIss : 0

  let transitionalPisCofinsToPay = 0
  if (year === 2026) {
    // Em 2026 PIS e COFINS seguem integrais (aprox. 3,65% no Presumido ou 9,25% no Real)
    transitionalPisCofinsToPay = revenue * 0.0365
  }

  const transitionalIpiToPay = rates.ipiRate > 0 ? revenue * (rates.ipiRate / 100) : 0
  const totalAntigoTributosNoAno =
    transitionalIcmsToPay + transitionalIssToPay + transitionalPisCofinsToPay + transitionalIpiToPay

  // 2. Imposto Seletivo (se ativado e ano >= 2027)
  // O IS integra a base de cálculo de IBS e CBS
  const debitoImpostoSeletivo = rates.isRate > 0 ? revenue * (rates.isRate / 100) : 0

  // 3. Débitos do Novo Sistema (IBS e CBS calculados "por fora")
  // Base do IBS/CBS = Preço líquido de IBS/CBS (mas inclui IS se houver)
  const baseIbsCbs = revenue + debitoImpostoSeletivo
  const debitoCbs = baseIbsCbs * (rates.cbsRate / 100)
  const debitoIbs = baseIbsCbs * (rates.ibsRate / 100)
  const totalDebitoNovo = debitoCbs + debitoIbs + debitoImpostoSeletivo

  // 4. Créditos Amplos da Nova Sistemática (Não Cumulatividade Ampla)
  // Tomada de crédito sobre compras de mercadorias + despesas credenciadas (energia, telecom, serviços, fretes, ativo)
  const totalCreditableBase = totalPurchasesCost + creditableOperatingExpenses

  let creditoComprasCbs = 0
  let creditoComprasIbs = 0
  let creditoInsumosServicosCbs = 0
  let creditoInsumosServicosIbs = 0

  if (rates.isCbsFullCredit) {
    creditoComprasCbs = totalPurchasesCost * (rates.cbsRate / 100)
    creditoInsumosServicosCbs = creditableOperatingExpenses * (rates.cbsRate / 100)
  } else if (year === 2026) {
    // 2026 em teste: crédito teste sobre as compras
    creditoComprasCbs = totalPurchasesCost * (rates.cbsRate / 100)
  }

  if (rates.isIbsFullCredit) {
    creditoComprasIbs = totalPurchasesCost * (rates.ibsRate / 100)
    creditoInsumosServicosIbs = creditableOperatingExpenses * (rates.ibsRate / 100)
  } else if (year === 2026) {
    creditoComprasIbs = totalPurchasesCost * (rates.ibsRate / 100)
  }

  const totalCreditoNovo =
    creditoComprasCbs + creditoComprasIbs + creditoInsumosServicosCbs + creditoInsumosServicosIbs

  // 5. Imposto Líquido Novo a Recolher
  const netCbsToPay = Math.max(0, debitoCbs - (creditoComprasCbs + creditoInsumosServicosCbs))
  const netIbsToPay = Math.max(0, debitoIbs - (creditoComprasIbs + creditoInsumosServicosIbs))
  const netImpostoSeletivoToPay = debitoImpostoSeletivo // IS é monofásico sem créditos

  let totalNovoTributosLiquidos = netCbsToPay + netIbsToPay + netImpostoSeletivoToPay

  // 6. Compensação de Crédito Cruzado em 2026
  // No ano-teste (2026), a CBS de 0,9% e IBS de 0,1% pagos são compensados integralmente com PIS/COFINS devidos
  let crossCreditCompensated2026 = 0
  if (year === 2026 && rates.isCrossCreditPisCofins) {
    const testIbsCbsPaid = debitoCbs + debitoIbs
    // Compensado contra o PIS/COFINS devido
    crossCreditCompensated2026 = Math.min(testIbsCbsPaid, transitionalPisCofinsToPay)
    // Reduz o PIS/COFINS líquido a pagar
    transitionalPisCofinsToPay = Math.max(
      0,
      transitionalPisCofinsToPay - crossCreditCompensated2026,
    )
  }

  // Carga Tributária Total no Ano
  // Em anos de transição, paga-se o residual do sistema antigo + o líquido do sistema novo
  const totalYearTaxBurden = totalNovoTributosLiquidos + totalAntigoTributosNoAno
  const effectiveYearTaxRate = revenue > 0 ? (totalYearTaxBurden / revenue) * 100 : 0

  // 7. Confronto com o Sistema Atual
  const taxBurdenDifference = totalYearTaxBurden - currentTaxBurden
  const isReformaBetter = taxBurdenDifference < 0

  // 8. Precificação "Por Dentro vs Por Fora"
  // No sistema atual, impostos sobre venda estão por dentro: Preço = Custo / (1 - AliqImpostos)
  // No novo sistema (IBS/CBS), o preço de venda é calculado "por fora":
  // Preço Bruto Novo = Preço Líquido * (1 + AliqCbs + AliqIbs + AliqIS)
  const currentUnit = unitSalePriceCurrent > 0 ? unitSalePriceCurrent : revenue / qty
  // Preço líquido retirando os tributos atuais embutidos
  const currentEmbeddedTaxRate = revenue > 0 ? currentTaxBurden / revenue : 0.2
  const netPriceExTaxes = currentUnit * (1 - currentEmbeddedTaxRate)

  // Alíquotas por fora somadas
  const novaAliquotaPorFora = (rates.cbsRate + rates.ibsRate + rates.isRate) / 100
  const suggestedUnitPriceNovo = netPriceExTaxes * (1 + novaAliquotaPorFora)
  const priceDifference = suggestedUnitPriceNovo - currentUnit
  const priceDifferencePercent = currentUnit > 0 ? (priceDifference / currentUnit) * 100 : 0

  // Lucro líquido projetado mantendo o mesmo faturamento ou aplicando a nova carga
  const projectedNetProfit = revenue - totalPurchasesCost - payrollCost - totalYearTaxBurden
  const projectedNetMargin = revenue > 0 ? (projectedNetProfit / revenue) * 100 : 0

  // 9. Simples Nacional dentro da Reforma
  let simplesComparison: ReformaCalculationResult['simplesComparison']
  if (currentRegimeName.toLowerCase().includes('simples')) {
    // Estimativa de DAS do Simples
    const simplesDasTax = currentTaxBurden > 0 ? currentTaxBurden : revenue * 0.08
    // No regime regular, apura IBS/CBS por fora (com crédito integral) e IRPJ/CSLL/CPP no Simples
    const tributosRegularesIbsCbs = totalNovoTributosLiquidos
    const parcelaIrpjCsllCpp = simplesDasTax * 0.45 // ~45% do DAS é federal/previdenciário
    const simplesRegimeRegularTax = tributosRegularesIbsCbs + parcelaIrpjCsllCpp

    // Crédito transferido ao cliente B2B
    // No Simples tradicional: transfere apenas a fração de ICMS/ISS/PIS/COFINS recolhida no DAS (~3% a 4%)
    const creditTransferredToCustomerDas = revenue * 0.035
    // No Regime Regular: transfere crédito integral de IBS e CBS (~26,5% pleno)
    const creditTransferredToCustomerRegular =
      revenue * (novaAliquotaPorFora > 0 ? novaAliquotaPorFora : 0.265)

    const isRegularBetterB2b =
      creditTransferredToCustomerRegular > creditTransferredToCustomerDas * 2

    simplesComparison = {
      simplesDasTax,
      simplesRegimeRegularTax,
      creditTransferredToCustomerDas,
      creditTransferredToCustomerRegular,
      recommendedOption: isRegularBetterB2b ? 'regime_regular' : 'simples_das',
      explanation: isRegularBetterB2b
        ? 'Para vendas B2B (PJ), a opção pelo IBS/CBS regular permite transferir crédito integral ao seu cliente, evitando perda de competitividade frente a empresas do Lucro Real.'
        : 'Para vendas B2C (consumidor final), a guia única DAS tradicional segue sendo a mais econômica por não exigir apuração não-cumulativa.',
    }
  }

  return {
    year,
    phaseTitle: rates.phaseTitle,
    grossSaleRevenue: revenue,
    netSaleRevenue: revenue * (1 - (rates.cbsRate + rates.ibsRate) / 100),
    debitoCbs,
    debitoIbs,
    debitoImpostoSeletivo,
    totalDebitoNovo,
    creditoComprasCbs,
    creditoComprasIbs,
    creditoInsumosServicosCbs,
    creditoInsumosServicosIbs,
    totalCreditoNovo,
    netCbsToPay,
    netIbsToPay,
    netImpostoSeletivoToPay,
    totalNovoTributosLiquidos,
    transitionalIcmsToPay,
    transitionalIssToPay,
    transitionalPisCofinsToPay,
    transitionalIpiToPay,
    totalAntigoTributosNoAno,
    crossCreditCompensated2026,
    totalYearTaxBurden,
    effectiveYearTaxRate,
    currentTaxBurden,
    taxBurdenDifference,
    isReformaBetter,
    pricingComparison: {
      currentUnitPrice: currentUnit,
      suggestedUnitPriceNovo,
      netPriceExTaxes,
      priceDifference,
      priceDifferencePercent,
      taxInPricePercentCurrent: currentEmbeddedTaxRate * 100,
      taxOnPricePercentNovo: novaAliquotaPorFora * 100,
    },
    projectedNetProfit,
    projectedNetMargin,
    simplesComparison,
  }
}

/**
 * Calcula todo o "Plano de Voo" de 2026 a 2033
 */
export function calculateFlightPlan(
  input: Omit<ReformaCalculationInput, 'year' | 'rates'>,
  state: ReformaState,
): {
  yearlyResults: ReformaCalculationResult[]
  turningPointYear: ReformaYear | null // Ano em que o sistema novo passa a ser melhor que o atual
  totalTransitionSavings: number // Soma da economia acumulada no período 2026-2033
  bestYear: ReformaYear
} {
  const years: ReformaYear[] = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]
  const yearlyResults: ReformaCalculationResult[] = []

  let turningPointYear: ReformaYear | null = null
  let totalTransitionSavings = 0
  let bestYear: ReformaYear = 2026
  let lowestTaxBurden = Infinity

  for (const year of years) {
    const rates = getEffectiveYearRates(year, state)
    const result = calculateReformaYear({
      ...input,
      year,
      rates,
    })

    yearlyResults.push(result)

    if (result.isReformaBetter && turningPointYear === null) {
      turningPointYear = year
    }

    if (result.taxBurdenDifference < 0) {
      totalTransitionSavings += Math.abs(result.taxBurdenDifference)
    }

    if (result.totalYearTaxBurden < lowestTaxBurden) {
      lowestTaxBurden = result.totalYearTaxBurden
      bestYear = year
    }
  }

  return {
    yearlyResults,
    turningPointYear,
    totalTransitionSavings,
    bestYear,
  }
}
