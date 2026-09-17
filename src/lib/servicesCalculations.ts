/**
 * Tipagens, helpers de cálculo e constantes para o módulo de Serviços
 * Lei Complementar 116/2003 (ISSQN)
 * Lei 9.249/1995 (Presunção de 32% para IRPJ e CSLL em serviços)
 * Lei Complementar 123/2006 (Fator R e Anexos III e V do Simples Nacional)
 */
import type { SimplesAnexoId } from './simplesCalculations'
import { calculateFatorR } from './simplesCalculations'

export interface ServiceInputItem {
  id: string
  description: string
  unitCost: number
  quantity: number
}

export interface ServiceItem {
  id: string
  description: string
  price: number // Honorário unitário
  monthlyQuantity: number
  mode: 'cost_margin' | 'liquid'
  desiredNetRevenue?: number
  desiredMargin?: number
  inputs: ServiceInputItem[]
}

export interface ServiceTaxParameters {
  issRate: number // Alíquota municipal de ISS (2% a 5%, LC 116/2003)
  presumidoPresumptionRate: number // Padrão 32% (Lei 9.249/95)
  pisCumulativeRate: number // 0,65%
  cofinsCumulativeRate: number // 3,00%
  realPisNonCumulativeRate: number // 1,65%
  realCofinsNonCumulativeRate: number // 7,60%
}

export const DEFAULT_SERVICE_TAX_PARAMETERS: ServiceTaxParameters = {
  issRate: 5.0, // Alíquota típica de ISS municipal (2% a 5%)
  presumidoPresumptionRate: 32.0, // Lei 9.249/95 art. 15 § 1º III "a" e art. 20
  pisCumulativeRate: 0.65,
  cofinsCumulativeRate: 3.0,
  realPisNonCumulativeRate: 1.65,
  realCofinsNonCumulativeRate: 7.6,
}

/**
 * Custo Unitário de um Serviço = Σ(unitCost × quantity do insumo)
 */
export function calculateServiceUnitCost(inputs: ServiceInputItem[] = []): number {
  if (!Array.isArray(inputs) || inputs.length === 0) return 0
  const sum = inputs.reduce((acc, item) => {
    const cost = Math.max(0, Number(item.unitCost) || 0)
    const qty = Math.max(0, Number(item.quantity) || 0)
    return acc + cost * qty
  }, 0)
  return Math.round(sum * 100) / 100
}

/**
 * Custo do Serviço Prestado (CSP) Total para um item = Custo Unitário × monthlyQuantity
 */
export function calculateServiceCsp(item: ServiceItem): number {
  const unitCost = calculateServiceUnitCost(item.inputs)
  const qty = Math.max(0, Number(item.monthlyQuantity) || 0)
  return Math.round(unitCost * qty * 100) / 100
}

/**
 * Preço Unitário derivado se estiver no modo Custo + Margem ou Preço Líquido
 * Reutiliza a mecânica de margem/meta dos produtos
 */
export function calculateServiceDerivedPrice(
  item: ServiceItem,
  issRate: number,
  regime: 'presumido' | 'real' | 'simples' = 'presumido',
  simplesEffectiveRate: number = 6.0,
): number {
  if (item.mode === 'liquid') {
    const meta = Number(item.desiredNetRevenue) || 0
    if (meta <= 0) return item.price || 0
    // Divisor: deduz ISS e PIS/COFINS (ou alíquota simples)
    let factor = 1
    const issDec = Math.max(0, Math.min(100, issRate)) / 100
    if (regime === 'presumido') {
      // ISS direto + PIS 0,65% + COFINS 3,00%
      factor = Math.max(0.01, (1 - issDec) * (1 - 0.0365))
    } else if (regime === 'real') {
      factor = Math.max(0.01, (1 - issDec) * (1 - 0.0925))
    } else {
      factor = Math.max(0.01, 1 - simplesEffectiveRate / 100)
    }
    return Math.round((meta / factor) * 100) / 100
  }

  // mode === 'cost_margin'
  const unitCost = calculateServiceUnitCost(item.inputs)
  const margin = Math.max(0, Math.min(99.9, Number(item.desiredMargin) || 0))
  if (unitCost <= 0) return item.price || 0

  let taxFactor = 1
  const issDec = Math.max(0, Math.min(100, issRate)) / 100
  if (regime === 'presumido') {
    taxFactor = (1 - issDec) * (1 - 0.0365)
  } else if (regime === 'real') {
    taxFactor = (1 - issDec) * (1 - 0.0925)
  } else {
    taxFactor = 1 - simplesEffectiveRate / 100
  }

  const marginFactor = 1 - margin / 100
  const divisor = Math.max(0.01, taxFactor * marginFactor)
  return Math.round((unitCost / divisor) * 100) / 100
}

/**
 * Totais consolidados de uma lista de serviços
 */
export interface ServicesTotals {
  totalGrossRevenue: number // Σ (preço × monthlyQuantity)
  totalCsp: number // Custo dos Serviços Prestados Total
  totalQuantity: number // Σ monthlyQuantity
  servicesCount: number
}

export function calculateServicesTotals(services: ServiceItem[] = []): ServicesTotals {
  if (!Array.isArray(services) || services.length === 0) {
    return {
      totalGrossRevenue: 0,
      totalCsp: 0,
      totalQuantity: 0,
      servicesCount: 0,
    }
  }

  let totalGrossRevenue = 0
  let totalCsp = 0
  let totalQuantity = 0

  for (const s of services) {
    const qty = Math.max(0, Number(s.monthlyQuantity) || 0)
    const price = Math.max(0, Number(s.price) || 0)
    const unitCost = calculateServiceUnitCost(s.inputs)

    totalGrossRevenue += Math.round(price * qty * 100) / 100
    totalCsp += Math.round(unitCost * qty * 100) / 100
    totalQuantity += qty
  }

  return {
    totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
    totalCsp: Math.round(totalCsp * 100) / 100,
    totalQuantity,
    servicesCount: services.length,
  }
}

/**
 * Apuração tributária de serviços no Lucro Presumido
 * - Presunção IRPJ: 32% (Lei 9.249/95, art. 15, § 1º, III, "a")
 * - Presunção CSLL: 32% (Lei 9.249/95, art. 20)
 * - PIS: 0,65% cumulativo sobre receita bruta
 * - COFINS: 3,00% cumulativo sobre receita bruta
 * - ISS: alíquota municipal (2% a 5%, LC 116/2003)
 * - ICMS: 0 (não incide sobre serviços da LC 116)
 */
export interface PresumidoServicesTaxResult {
  grossRevenue: number
  issRate: number
  issValue: number
  pisValue: number
  cofinsValue: number
  taxesOnRevenue: number
  netRevenue: number
  csp: number
  grossProfit: number
  irpjBase: number
  irpjValue: number
  irpjAdditional: number
  csllBase: number
  csllValue: number
  totalIrpjCsll: number
  netProfit: number
}

export function calculatePresumidoServices(
  grossRevenue: number,
  csp: number,
  issRate: number = 5.0,
): PresumidoServicesTaxResult {
  const gross = Math.max(0, grossRevenue || 0)
  const cost = Math.max(0, csp || 0)
  const safeIssRate = Math.max(0, Math.min(5, Math.max(2, issRate || 5)))

  const issValue = Math.round(((gross * safeIssRate) / 100) * 100) / 100
  // PIS 0,65% e COFINS 3% cumulativos sobre a receita bruta (sem exclusão de ICMS, pois ICMS = 0)
  const pisValue = Math.round(gross * 0.0065 * 100) / 100
  const cofinsValue = Math.round(gross * 0.03 * 100) / 100
  const taxesOnRevenue = Math.round((issValue + pisValue + cofinsValue) * 100) / 100
  const netRevenue = Math.round((gross - taxesOnRevenue) * 100) / 100
  const grossProfit = Math.round((netRevenue - cost) * 100) / 100

  // Presunção 32% para IRPJ e CSLL (Lei 9.249/95)
  const irpjBase = Math.round(((gross * 32.0) / 100) * 100) / 100
  const csllBase = Math.round(((gross * 32.0) / 100) * 100) / 100

  const irpjValue = Math.round(irpjBase * 0.15 * 100) / 100
  const irpjExcess = Math.max(0, irpjBase - 60000.0) // R$ 20k/mês no trimestre
  const irpjAdditional = Math.round(irpjExcess * 0.1 * 100) / 100
  const csllValue = Math.round(csllBase * 0.09 * 100) / 100
  const totalIrpjCsll = Math.round((irpjValue + irpjAdditional + csllValue) * 100) / 100

  const netProfit = Math.round((grossProfit - totalIrpjCsll) * 100) / 100

  return {
    grossRevenue: gross,
    issRate: safeIssRate,
    issValue,
    pisValue,
    cofinsValue,
    taxesOnRevenue,
    netRevenue,
    csp: cost,
    grossProfit,
    irpjBase,
    irpjValue,
    irpjAdditional,
    csllBase,
    csllValue,
    totalIrpjCsll,
    netProfit,
  }
}

/**
 * Enquadramento de Serviços no Simples Nacional via Fator R
 * Anexo III se Fator R ≥ 28%, Anexo V se < 28%
 */
export function determineSimplesServiceAnexo(
  payroll12m: number,
  rbt12: number,
): {
  recommendedAnexo: SimplesAnexoId
  fatorRPercent: number
  isElegibleAnexo3: boolean
  explanation: string
} {
  const result = calculateFatorR(payroll12m, rbt12)
  return {
    recommendedAnexo: result.recommendedAnexo,
    fatorRPercent: result.fatorRPercent,
    isElegibleAnexo3: result.isElegibleAnexo3,
    explanation: result.explanation,
  }
}
