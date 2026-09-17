import { TaxRegime } from '@/contexts/TaxContext'

export interface LiquidDreChainInput {
  desiredNetRevenue: number // RL informada (âncora)
  regime: TaxRegime
  effectiveSimplesRate?: number // % DAS efetivo (ex: 4.83)
  icmsRate?: number // % ICMS (ex: 18.0)
  customTaxesRate?: number // Σ tributos adicionais %
  variableExpensesRate?: number // % DV total
  unitCost: number // CMV unitário no regime (Simples 1.413,33, Presumido 1.158,93, Real 1.051,73 no exemplo)
  operatingExpensesUnit?: number // despesas operacionais unitárias rateadas ou totais
  presumidoActivity?: 'comercio' | 'industria'
}

export interface LiquidDreChainResult {
  desiredNetRevenue: number // RL informada (âncora)
  taxRateTotal: number // % Tributos sobre RBV
  variableExpenseRate: number // % Deduções / DV sobre RBV
  grossUpDivisor: number // 1 - %Tributos - %Deduções
  rbv: number // RBV sugerido = RL / (1 - %Tributos - %Deduções)
  taxesValue: number // RBV * %Tributos
  deductionsValue: number // RBV * %Deduções
  derivedNetRevenue: number // RBV - taxes - deductions (~ RL âncora)
  tributosRate: number
  tributosValor: number
  deducoesRate: number
  deducoesValor: number
  netRevenue: number
  cmv: number // Custo do produto / mercadoria
  grossProfit: number // Lucro Bruto = RL - CMV
  operatingExpenses: number // Despesas operacionais
  lair: number // LAIR = Lucro Bruto - Despesas Operacionais
  // LADIR (IRPJ + CSLL)
  irpj: number
  irpjAdditional: number
  csll: number
  ladir: number // IRPJ + CSLL
  lle: number // LAIR - LADIR
  derivedMarginPct: number // (LLE / desiredNetRevenue) * 100
  isViable: boolean // LLE >= 0
  shortfall: number // Math.max(0, -LLE)
}

/**
 * Calcula o gross-up e a cadeia completa da DRE derivada a partir da Receita Líquida âncora
 */
export function calculateLiquidDreChain(input: LiquidDreChainInput): LiquidDreChainResult {
  const rl = Math.max(0, input.desiredNetRevenue || 0)
  const regime = input.regime
  const dvRate = Math.max(0, input.variableExpensesRate || 0)
  const customTaxes = Math.max(0, input.customTaxesRate || 0)
  const icms = Math.max(0, input.icmsRate || 0)

  // 1. % Tributos sobre Vendas conforme regime
  let taxRate = 0
  if (regime === 'simples') {
    taxRate = Math.max(0, input.effectiveSimplesRate || 0) + customTaxes
  } else if (regime === 'presumido') {
    // ICMS% + PIS 0,65% + COFINS 3,00% + tributos extras
    taxRate = icms + 0.65 + 3.0 + customTaxes
  } else {
    // Real: ICMS% + PIS 1,65% + COFINS 7,60% + extras
    taxRate = icms + 1.65 + 7.6 + customTaxes
  }

  const taxPctDecimal = taxRate / 100
  const dvPctDecimal = dvRate / 100

  // 2. Gross-up: Preço Líquido Desejado segue lógica multiplicativa com fatores de dedução por regime
  // Presumido: (1 - ICMS) * (1 - 0,0365) * (1 - DV) * customTaxesFactor
  // Real: (1 - ICMS) * (1 - 0,0925) * (1 - DV) * customTaxesFactor
  // Simples: (1 - alíquota efetiva) * (1 - DV) * customTaxesFactor
  const icmsFactor = 1 - icms / 100
  const dvFactor = 1 - dvPctDecimal
  const customTaxesFactor = 1 - customTaxes / 100
  let calculatedDivisor = 1
  if (regime === 'simples') {
    const sRate = Math.max(0, input.effectiveSimplesRate || 0)
    calculatedDivisor =
      (1 - sRate / 100) *
      (dvFactor > 0 ? dvFactor : 1) *
      (customTaxesFactor > 0 ? customTaxesFactor : 1)
  } else if (regime === 'presumido') {
    calculatedDivisor =
      (icmsFactor > 0 ? icmsFactor : 1) *
      (1 - 0.0365) *
      (dvFactor > 0 ? dvFactor : 1) *
      (customTaxesFactor > 0 ? customTaxesFactor : 1)
  } else {
    calculatedDivisor =
      (icmsFactor > 0 ? icmsFactor : 1) *
      (1 - 0.0925) *
      (dvFactor > 0 ? dvFactor : 1) *
      (customTaxesFactor > 0 ? customTaxesFactor : 1)
  }
  const grossUpDivisor = Math.max(0.0001, calculatedDivisor)
  const rbv = rl > 0 && grossUpDivisor > 0 ? Math.round((rl / grossUpDivisor) * 100) / 100 : 0

  // Valores tributários e deduções
  const taxesValue = Math.round(rbv * taxPctDecimal * 100) / 100
  const deductionsValue = Math.round(rbv * dvPctDecimal * 100) / 100
  const derivedNetRevenue = Math.round((rbv - taxesValue - deductionsValue) * 100) / 100

  // 3. CMV e Lucro Bruto
  const cmv = Math.round((input.unitCost || 0) * 100) / 100
  // Lucro Bruto = RL âncora - CMV
  const grossProfit = Math.round((rl - cmv) * 100) / 100

  // 4. Despesas Operacionais e LAIR
  const operatingExpenses = Math.round((input.operatingExpensesUnit || 0) * 100) / 100
  const lair = Math.round((grossProfit - operatingExpenses) * 100) / 100

  // 5. LADIR (IRPJ + CSLL)
  let irpj = 0
  let irpjAdditional = 0
  let csll = 0

  if (regime === 'simples') {
    // Simples: LADIR = 0, pois IRPJ/CSLL já estão embutidos no DAS
    irpj = 0
    irpjAdditional = 0
    csll = 0
  } else if (regime === 'presumido') {
    // Presumido: presunção comércio/indústria = 8% IRPJ, 12% CSLL
    const irpjPresumption = 0.08
    const csllPresumption = 0.12

    const irpjBase = rbv * irpjPresumption
    irpj = Math.round(irpjBase * 0.15 * 100) / 100
    // Adicional IRPJ (10% sobre o que exceder R$ 20.000/mês ou proporcional da base se aplicável)
    // Para efeito unitário, segue o padrão da DRE Presumido
    const excess = Math.max(0, irpjBase - 20000)
    irpjAdditional = Math.round(excess * 0.1 * 100) / 100

    const csllBase = rbv * csllPresumption
    csll = Math.round(csllBase * 0.09 * 100) / 100
  } else {
    // Real: sobre a base real (LAIR positivo)
    const realBase = Math.max(0, lair)
    irpj = Math.round(realBase * 0.15 * 100) / 100
    const excess = Math.max(0, realBase - 20000)
    irpjAdditional = Math.round(excess * 0.1 * 100) / 100
    csll = Math.round(realBase * 0.09 * 100) / 100
  }

  const ladir = Math.round((irpj + irpjAdditional + csll) * 100) / 100

  // 6. LLE = LAIR - LADIR
  const lle = Math.round((lair - ladir) * 100) / 100

  // 7. Margem Líquida Derivada = (LLE / RL informada) * 100
  const derivedMarginPct = rl > 0 ? Math.round((lle / rl) * 100 * 100) / 100 : 0

  const isViable = lle >= 0
  const shortfall = isViable ? 0 : Math.round(Math.abs(lle) * 100) / 100

  return {
    desiredNetRevenue: rl,
    taxRateTotal: taxRate,
    variableExpenseRate: dvRate,
    grossUpDivisor,
    rbv,
    taxesValue,
    deductionsValue,
    derivedNetRevenue,
    tributosRate: taxRate,
    tributosValor: taxesValue,
    deducoesRate: dvRate,
    deducoesValor: deductionsValue,
    netRevenue: derivedNetRevenue,
    cmv,
    grossProfit,
    operatingExpenses,
    lair,
    irpj,
    irpjAdditional,
    csll,
    ladir,
    lle,
    derivedMarginPct,
    isViable,
    shortfall,
  }
}
