import React, { useMemo, useState } from 'react'
import {
  FileSpreadsheet,
  ChevronDown,
  Info,
  CheckCircle2,
  Building2,
  Factory,
  Briefcase,
  Layers,
} from 'lucide-react'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatPercentBR, formatNumberBR } from '@/lib/taxCalculations'
import {
  TaxRegime,
  MarkupProductItem,
  PurchaseItem,
  DesiredLiquidRevenueByRegime,
  CustomTaxItem,
} from '@/contexts/TaxContext'
import { calculatePgdas, SimplesAnexoId, SIMPLES_ANEXOS } from '@/lib/simplesCalculations'

export interface DreRegimeComparativeProps {
  markupProducts: MarkupProductItem[]
  purchasesItems: PurchaseItem[]
  getPurchaseItemUnitNetCost?: (
    item: PurchaseItem,
    regime: 'presumido' | 'real' | 'simples',
  ) => number
  // Tributos
  icmsRateMarkup: number
  customTaxesMarkup: CustomTaxItem[]
  totalVariableExpenseRate: number
  // Simples
  simplesAnexo: string
  simplesRbt12: number
  effectiveSimplesRbt12?: number
  // Metas do modo Preço Líquido Desejado
  desiredLiquidRevenueByRegime?: DesiredLiquidRevenueByRegime
  // CMV global
  calculatedPurchases: {
    cmvPresumido: number
    cmvReal: number
    cmvSimples: number
    unitCostPresumidoEffective: number
    unitCostRealEffective: number
    unitCostSimplesEffective: number
    autoInventoryDeductionActive: boolean
  }
  // Despesas operacionais consolidadas e Folha
  totalGlobalOperatingExpenses: number
  totalGlobalOperatingRevenues: number
  directPayrollExpenses: number
  patronalCharges: number
  // Atividades
  presumidoActivity: 'comercio' | 'industria'
  realActivity: 'comercio' | 'industria'
  presumidoIssRate?: number
  realIssRate?: number
  realAdditions: number
  realExclusions: number
  // Quantidades vendidas por regime
  presumidoQuantitySold?: number
  realQuantitySold?: number
  simplesQuantitySold?: number
  qty: number
}

export interface DreColumnValues {
  grossRevenue: number
  taxesTotal: number
  icmsOrIss: number
  pis: number
  cofins: number
  dasTotal: number
  patronalCharges: number
  netRevenue: number
  cmv: number
  grossProfit: number
  operatingExpenses: number
  lair: number
  irpj: number
  irpjAdditional: number
  csll: number
  netProfit: number
  netMargin: number
}

export interface RegimeDreComparativeData {
  regimeKey: 'presumido' | 'real' | 'simples'
  regimeName: string
  regimeDescription: string
  quantity: number
  liquid: {
    unit: DreColumnValues
    consolidated: DreColumnValues
    hasValidData: boolean
    invalidReason?: string
  }
  costMargin: {
    unit: DreColumnValues
    consolidated: DreColumnValues
    hasValidData: boolean
    invalidReason?: string
  }
}

/**
 * Motor puro de cálculo da DRE Comparativa por Regime
 * Exportado para reutilização e testes de regressão automatizados
 */
export function computeDreComparativeForRegime(params: {
  regimeKey: 'presumido' | 'real' | 'simples'
  markupProducts: MarkupProductItem[]
  purchasesItems: PurchaseItem[]
  getPurchaseItemUnitNetCost?: (
    item: PurchaseItem,
    regime: 'presumido' | 'real' | 'simples',
  ) => number
  icmsRate: number
  customTaxesMarkup: CustomTaxItem[]
  dvRate: number
  simplesEffectiveRate: number
  desiredLiquidRevenueByRegime?: DesiredLiquidRevenueByRegime
  calculatedPurchases: {
    unitCostPresumidoEffective: number
    unitCostRealEffective: number
    unitCostSimplesEffective: number
    cmvPresumido: number
    cmvReal: number
    cmvSimples: number
  }
  totalGlobalOperatingExpenses: number
  totalGlobalOperatingRevenues: number
  directPayrollExpenses: number
  patronalCharges: number
  presumidoActivity: 'comercio' | 'industria'
  realActivity: 'comercio' | 'industria'
  presumidoIssRate?: number
  realIssRate?: number
  realAdditions: number
  realExclusions: number
  regimeQuantity: number
}): RegimeDreComparativeData {
  const {
    regimeKey,
    markupProducts = [],
    purchasesItems = [],
    getPurchaseItemUnitNetCost,
    icmsRate,
    customTaxesMarkup = [],
    dvRate,
    simplesEffectiveRate = 0,
    desiredLiquidRevenueByRegime,
    calculatedPurchases,
    totalGlobalOperatingExpenses = 0,
    totalGlobalOperatingRevenues = 0,
    directPayrollExpenses = 0,
    patronalCharges = 0,
    realAdditions = 0,
    realExclusions = 0,
    regimeQuantity = 0,
  } = params
  const regimeNames: Record<'presumido' | 'real' | 'simples', string> = {
    presumido: 'Lucro Presumido',
    real: 'Lucro Real',
    simples: 'Simples Nacional',
  }
  const regimeDescriptions: Record<'presumido' | 'real' | 'simples', string> = {
    presumido:
      'Tributação cumulativa (PIS 0,65% / COFINS 3,00%) · Presunção IRPJ/CSLL · Tema 69/STF',
    real: 'Tributação não cumulativa (PIS 1,65% / COFINS 7,60%) · Créditos integrais de compras · LALUR',
    simples: 'Guia Única DAS com partilha de tributos · CPP incluída · Sem créditos nas aquisições',
  }

  const validProducts = Array.isArray(markupProducts) ? markupProducts : []

  // Helper de custo unitário do produto por regime
  const getProductUnitCost = (p: MarkupProductItem): number => {
    if (p.purchaseItemId && purchasesItems && getPurchaseItemUnitNetCost) {
      const pItem = purchasesItems.find((pi) => pi.id === p.purchaseItemId)
      if (pItem) {
        const uCost = getPurchaseItemUnitNetCost(pItem, regimeKey)
        if (uCost > 0) return uCost
      }
    }
    if (regimeKey === 'presumido' && calculatedPurchases.unitCostPresumidoEffective > 0) {
      return calculatedPurchases.unitCostPresumidoEffective
    }
    if (regimeKey === 'real' && calculatedPurchases.unitCostRealEffective > 0) {
      return calculatedPurchases.unitCostRealEffective
    }
    if (regimeKey === 'simples' && calculatedPurchases.unitCostSimplesEffective > 0) {
      return calculatedPurchases.unitCostSimplesEffective
    }
    return typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : 0
  }

  // Divisor do modo Preço Líquido Desejado: fatores multiplicativos de deduções (SEM margem)
  // Presumido: (1 - ICMS) * (1 - 0,0365) * (1 - DV) * customTaxesFactor
  // Real: (1 - ICMS) * (1 - 0,0925) * (1 - DV) * customTaxesFactor
  // Simples: (1 - alíquota efetiva PGDAS) * (1 - DV) * customTaxesFactor
  const computeLiquidDivisor = () => {
    const icmsFactor = 1 - icmsRate / 100
    const dvFactor = 1 - dvRate / 100
    let divisor = 1
    if (regimeKey === 'presumido') {
      divisor = icmsFactor * (1 - 0.0365) * (dvFactor > 0 ? dvFactor : 1)
    } else if (regimeKey === 'real') {
      divisor = icmsFactor * (1 - 0.0925) * (dvFactor > 0 ? dvFactor : 1)
    } else {
      divisor = (1 - simplesEffectiveRate / 100) * (dvFactor > 0 ? dvFactor : 1)
    }
    for (const tax of customTaxesMarkup) {
      divisor *= 1 - (tax.rate || 0) / 100
    }
    return Math.max(0.0001, divisor)
  }

  // Divisor do modo Custo + Margem: composição MULTIPLICATIVA de fatores (idêntica à da Calculadora de Markup)
  // Presumido: (1 - ICMS/100) * (1 - 0,0365) * (1 - DV/100) * customTaxesFactor * (1 - margem/100)
  // Real: (1 - ICMS/100) * (1 - 0,0925) * (1 - DV/100) * customTaxesFactor * (1 - margem/100)
  // Simples: (1 - alíquota efetiva PGDAS/100) * (1 - DV/100) * customTaxesFactor * (1 - margem/100)
  const computeCostMarginDivisor = (margin: number) => {
    let baseTaxFactor = 1
    const icmsFactor = 1 - icmsRate / 100
    const dvFactor = 1 - dvRate / 100

    if (regimeKey === 'presumido') {
      baseTaxFactor = icmsFactor * (1 - 0.0365) * (dvFactor > 0 ? dvFactor : 1)
    } else if (regimeKey === 'real') {
      baseTaxFactor = icmsFactor * (1 - 0.0925) * (dvFactor > 0 ? dvFactor : 1)
    } else {
      baseTaxFactor = (1 - simplesEffectiveRate / 100) * (dvFactor > 0 ? dvFactor : 1)
    }
    for (const tax of customTaxesMarkup) {
      baseTaxFactor *= 1 - (tax.rate || 0) / 100
    }

    const safeMargin = typeof margin === 'number' && Number.isFinite(margin) ? margin : 0
    const marginFactor = safeMargin > 0 ? 1 - safeMargin / 100 : 1
    return Math.max(0.0001, baseTaxFactor * marginFactor)
  }

  // Helper para resolver a quantidade vendida de um produto para este regime
  const resolveProductQty = (p: MarkupProductItem): number => {
    if (p.quantityByRegime && p.quantityByRegime[regimeKey] !== undefined) {
      return Math.max(0, Number(p.quantityByRegime[regimeKey]) || 0)
    }
    if (p.quantityByRegime && Object.keys(p.quantityByRegime).length > 0) {
      return 0 // doutrina Leitura B: quantidade preenchida em outro regime não vaza
    }
    // Fallback legado se quantityByRegime não existir no objeto
    if (typeof p.quantity === 'number' && Number.isFinite(p.quantity) && p.quantity > 0) {
      return p.quantity
    }
    return 0
  }

  // Soma estrita das quantidades dos produtos válidos para o regime
  const sumProductQuantities = validProducts.reduce((acc, p) => acc + resolveProductQty(p), 0)

  // Quantidade total efetiva para o regime:
  // Se houver produtos cadastrados, a quantidade DEVE ser estritamente a soma das quantidades dos produtos (Σ QuantidadeVendida_i)
  // para garantir sincronização entre numerador (consolidado) e denominador (divisor da coluna unitária).
  // Apenas em fallback sem produtos recorre a regimeQuantity escalar legado.
  const effectiveRegimeQty =
    validProducts.length > 0
      ? sumProductQuantities > 0
        ? sumProductQuantities
        : regimeQuantity > 0
          ? regimeQuantity
          : 0
      : regimeQuantity > 0
        ? regimeQuantity
        : 0

  // Sub-função para apurar toda a DRE a partir de (productGross, productCmv, qty)
  const buildDrePair = (
    productGross: number,
    productCmv: number,
    qtyVal: number,
    hasValid: boolean,
    invalidReason?: string,
  ): {
    unit: DreColumnValues
    consolidated: DreColumnValues
    hasValidData: boolean
    invalidReason?: string
  } => {
    const emptyValues: DreColumnValues = {
      grossRevenue: 0,
      taxesTotal: 0,
      icmsOrIss: 0,
      pis: 0,
      cofins: 0,
      dasTotal: 0,
      patronalCharges: 0,
      netRevenue: 0,
      cmv: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      lair: 0,
      irpj: 0,
      irpjAdditional: 0,
      csll: 0,
      netProfit: 0,
      netMargin: 0,
    }

    const totalGross = Math.round(productGross * 100) / 100
    const totalCmv = Math.round(productCmv * 100) / 100
    const totalQtyCombined = qtyVal

    if (!hasValid || (totalGross <= 0 && totalCmv <= 0)) {
      return {
        unit: emptyValues,
        consolidated: emptyValues,
        hasValidData: false,
        invalidReason: invalidReason || 'Dados não apurados para este modo neste regime.',
      }
    }

    const safeQty = totalQtyCombined > 0 ? totalQtyCombined : 1

    // 1. Tributos sobre a receita conforme regime (100% indústria e comércio)
    let icmsOrIssConsolidated = 0
    let pisConsolidated = 0
    let cofinsConsolidated = 0
    let dasConsolidated = 0
    let patronalChargesConsolidated = 0

    if (regimeKey === 'presumido') {
      // ICMS sobre produtos; Tema 69/STF: base PIS/COFINS = totalGross - ICMS
      icmsOrIssConsolidated = Math.round(((totalGross * icmsRate) / 100) * 100) / 100
      const pisCofinsBase = Math.round(Math.max(0, totalGross - icmsOrIssConsolidated) * 100) / 100
      pisConsolidated = Math.round(((pisCofinsBase * 0.65) / 100) * 100) / 100
      cofinsConsolidated = Math.round(((pisCofinsBase * 3.0) / 100) * 100) / 100
      patronalChargesConsolidated = patronalCharges
    } else if (regimeKey === 'real') {
      // ICMS sobre produtos; Tema 69/STF: base PIS/COFINS = totalGross - ICMS
      icmsOrIssConsolidated = Math.round(((totalGross * icmsRate) / 100) * 100) / 100
      const pisCofinsBase = Math.round(Math.max(0, totalGross - icmsOrIssConsolidated) * 100) / 100
      pisConsolidated = Math.round(((pisCofinsBase * 1.65) / 100) * 100) / 100
      cofinsConsolidated = Math.round(((pisCofinsBase * 7.6) / 100) * 100) / 100
      patronalChargesConsolidated = patronalCharges
    } else {
      // Simples Nacional: guia única DAS
      const effectiveRateDec = simplesEffectiveRate / 100
      dasConsolidated = Math.round(totalGross * effectiveRateDec * 100) / 100
      patronalChargesConsolidated = 0 // CPP inclusa no DAS
    }

    // Receita Líquida Consolidada
    const netRevenueConsolidated =
      regimeKey === 'simples'
        ? Math.round((totalGross - dasConsolidated) * 100) / 100
        : Math.round(
            (totalGross - icmsOrIssConsolidated - pisConsolidated - cofinsConsolidated) * 100,
          ) / 100

    // Lucro Bruto Consolidado
    const grossProfitConsolidated = Math.round((netRevenueConsolidated - totalCmv) * 100) / 100

    // Despesas Operacionais Totais
    const totalExpenses =
      regimeKey === 'simples'
        ? totalGlobalOperatingExpenses + directPayrollExpenses
        : totalGlobalOperatingExpenses + directPayrollExpenses + patronalChargesConsolidated

    // LAIR (Lucro antes IRPJ/CSLL) Consolidado
    const lairConsolidated =
      Math.round((grossProfitConsolidated - totalExpenses + totalGlobalOperatingRevenues) * 100) /
      100

    // IRPJ / CSLL Consolidado
    let irpjConsolidated = 0
    let irpjAdditionalConsolidated = 0
    let csllConsolidated = 0

    if (regimeKey === 'presumido') {
      const irpjPresumptionRate = 8.0
      const csllPresumptionRate = 12.0
      const irpjBase = (totalGross * irpjPresumptionRate) / 100
      const csllBase = (totalGross * csllPresumptionRate) / 100

      irpjConsolidated = Math.round(((irpjBase * 15.0) / 100) * 100) / 100
      const irpjExcess = Math.max(0, irpjBase - 60000.0)
      irpjAdditionalConsolidated = Math.round(((irpjExcess * 10.0) / 100) * 100) / 100
      csllConsolidated = Math.round(((csllBase * 9.0) / 100) * 100) / 100
    } else if (regimeKey === 'real') {
      const additions = realAdditions || 0
      const exclusions = realExclusions || 0
      const taxableRealProfit = Math.max(0, lairConsolidated + additions - exclusions)
      irpjConsolidated = Math.round(((taxableRealProfit * 15.0) / 100) * 100) / 100
      const irpjExcess = Math.max(0, taxableRealProfit - 60000.0)
      irpjAdditionalConsolidated = Math.round(((irpjExcess * 10.0) / 100) * 100) / 100
      csllConsolidated = Math.round(((taxableRealProfit * 9.0) / 100) * 100) / 100
    }

    const irpjCsllTotalConsolidated =
      irpjConsolidated + irpjAdditionalConsolidated + csllConsolidated

    // Lucro Líquido Final Consolidado
    const netProfitConsolidated =
      regimeKey === 'simples'
        ? lairConsolidated
        : Math.round((lairConsolidated - irpjCsllTotalConsolidated) * 100) / 100

    // Carga Tributária Total Consolidada
    const taxesTotalConsolidated =
      regimeKey === 'simples'
        ? dasConsolidated
        : Math.round(
            (icmsOrIssConsolidated +
              pisConsolidated +
              cofinsConsolidated +
              irpjCsllTotalConsolidated +
              patronalChargesConsolidated) *
              100,
          ) / 100

    const netMargin =
      totalGross > 0 ? Math.round((netProfitConsolidated / totalGross) * 100 * 100) / 100 : 0

    const consolidated: DreColumnValues = {
      grossRevenue: totalGross,
      taxesTotal: taxesTotalConsolidated,
      icmsOrIss: icmsOrIssConsolidated,
      pis: pisConsolidated,
      cofins: cofinsConsolidated,
      dasTotal: dasConsolidated,
      patronalCharges: patronalChargesConsolidated,
      netRevenue: netRevenueConsolidated,
      cmv: totalCmv,
      grossProfit: grossProfitConsolidated,
      operatingExpenses: totalExpenses,
      lair: lairConsolidated,
      irpj: irpjConsolidated,
      irpjAdditional: irpjAdditionalConsolidated,
      csll: csllConsolidated,
      netProfit: netProfitConsolidated,
      netMargin,
    }

    // Coluna Unitária = Consolidado ÷ quantidade do regime (preserva integridade matemática: unit × qty = total)
    const unit: DreColumnValues = {
      grossRevenue: Math.round((consolidated.grossRevenue / safeQty) * 100) / 100,
      taxesTotal: Math.round((consolidated.taxesTotal / safeQty) * 100) / 100,
      icmsOrIss: Math.round((consolidated.icmsOrIss / safeQty) * 100) / 100,
      pis: Math.round((consolidated.pis / safeQty) * 100) / 100,
      cofins: Math.round((consolidated.cofins / safeQty) * 100) / 100,
      dasTotal: Math.round((consolidated.dasTotal / safeQty) * 100) / 100,
      patronalCharges: Math.round((consolidated.patronalCharges / safeQty) * 100) / 100,
      netRevenue: Math.round((consolidated.netRevenue / safeQty) * 100) / 100,
      cmv: Math.round((consolidated.cmv / safeQty) * 100) / 100,
      grossProfit: Math.round((consolidated.grossProfit / safeQty) * 100) / 100,
      operatingExpenses: Math.round((consolidated.operatingExpenses / safeQty) * 100) / 100,
      lair: Math.round((consolidated.lair / safeQty) * 100) / 100,
      irpj: Math.round((consolidated.irpj / safeQty) * 100) / 100,
      irpjAdditional: Math.round((consolidated.irpjAdditional / safeQty) * 100) / 100,
      csll: Math.round((consolidated.csll / safeQty) * 100) / 100,
      netProfit: Math.round((consolidated.netProfit / safeQty) * 100) / 100,
      netMargin, // percentual é o mesmo para unitário e consolidado
    }

    return {
      unit,
      consolidated,
      hasValidData: true,
    }
  }

  // Helper para apurar uma linha da DRE para um produto individual (quantidade = 1)
  const computeProductUnitDre = (unitGross: number, unitCmv: number): DreColumnValues => {
    if (unitGross <= 0 && unitCmv <= 0) {
      return {
        grossRevenue: 0,
        taxesTotal: 0,
        icmsOrIss: 0,
        pis: 0,
        cofins: 0,
        dasTotal: 0,
        patronalCharges: 0,
        netRevenue: 0,
        cmv: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        lair: 0,
        irpj: 0,
        irpjAdditional: 0,
        csll: 0,
        netProfit: 0,
        netMargin: 0,
      }
    }

    let icmsOrIss = 0
    let pis = 0
    let cofins = 0
    let dasTotal = 0

    if (regimeKey === 'presumido') {
      icmsOrIss = Math.round(((unitGross * icmsRate) / 100) * 100) / 100
      const pisCofinsBase = Math.round(Math.max(0, unitGross - icmsOrIss) * 100) / 100
      pis = Math.round(((pisCofinsBase * 0.65) / 100) * 100) / 100
      cofins = Math.round(((pisCofinsBase * 3.0) / 100) * 100) / 100
    } else if (regimeKey === 'real') {
      icmsOrIss = Math.round(((unitGross * icmsRate) / 100) * 100) / 100
      const pisCofinsBase = Math.round(Math.max(0, unitGross - icmsOrIss) * 100) / 100
      pis = Math.round(((pisCofinsBase * 1.65) / 100) * 100) / 100
      cofins = Math.round(((pisCofinsBase * 7.6) / 100) * 100) / 100
    } else {
      const effectiveRateDec = simplesEffectiveRate / 100
      dasTotal = Math.round(unitGross * effectiveRateDec * 100) / 100
    }

    const netRevenue =
      regimeKey === 'simples'
        ? Math.round((unitGross - dasTotal) * 100) / 100
        : Math.round((unitGross - icmsOrIss - pis - cofins) * 100) / 100

    const grossProfit = Math.round((netRevenue - unitCmv) * 100) / 100
    const lair = grossProfit // Nível produto (despesas fixas não são por unidade)

    let irpj = 0
    let irpjAdditional = 0
    let csll = 0

    if (regimeKey === 'presumido') {
      const irpjBase = (unitGross * 8.0) / 100
      const csllBase = (unitGross * 12.0) / 100
      irpj = Math.round(((irpjBase * 15.0) / 100) * 100) / 100
      csll = Math.round(((csllBase * 9.0) / 100) * 100) / 100
    } else if (regimeKey === 'real') {
      const taxableRealProfit = Math.max(0, lair)
      irpj = Math.round(((taxableRealProfit * 15.0) / 100) * 100) / 100
      csll = Math.round(((taxableRealProfit * 9.0) / 100) * 100) / 100
    }

    const irpjCsllTotal = irpj + irpjAdditional + csll
    const netProfit =
      regimeKey === 'simples' ? lair : Math.round((lair - irpjCsllTotal) * 100) / 100

    const taxesTotal =
      regimeKey === 'simples'
        ? dasTotal
        : Math.round((icmsOrIss + pis + cofins + irpjCsllTotal) * 100) / 100

    const netMargin = unitGross > 0 ? Math.round((netProfit / unitGross) * 100 * 100) / 100 : 0

    return {
      grossRevenue: unitGross,
      taxesTotal,
      icmsOrIss,
      pis,
      cofins,
      dasTotal,
      patronalCharges: 0,
      netRevenue,
      cmv: unitCmv,
      grossProfit,
      operatingExpenses: 0,
      lair,
      irpj,
      irpjAdditional,
      csll,
      netProfit,
      netMargin,
    }
  }

  // ===========================================================================
  // PAR 1: DRE - Preço líquido desejado
  // Base: Gross-up multiplicativo SEM margem: RBV = Meta Líquida ÷ divisor de deduções
  // ===========================================================================
  let liquidTotalGross = 0
  let liquidTotalCmv = 0
  let liquidHasValid = true
  let liquidInvalidReason: string | undefined

  // Acumuladores de soma dos unitários apurados item a item
  let liquidSumUnits: DreColumnValues = {
    grossRevenue: 0,
    taxesTotal: 0,
    icmsOrIss: 0,
    pis: 0,
    cofins: 0,
    dasTotal: 0,
    patronalCharges: 0,
    netRevenue: 0,
    cmv: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    lair: 0,
    irpj: 0,
    irpjAdditional: 0,
    csll: 0,
    netProfit: 0,
    netMargin: 0,
  }

  if (validProducts.length > 0) {
    let revSum = 0
    let cmvSum = 0

    for (const p of validProducts) {
      const pQty = resolveProductQty(p)
      const effectiveItemQty = pQty > 0 ? pQty : 0

      // PARTE 2: DRE lê EXCLUSIVAMENTE os campos canônicos da Markup, sem fallback permissivo nem empréstimo
      const candidateLiquidPrice =
        (typeof p.salePriceLiquidByRegime?.[regimeKey] === 'number' &&
        p.salePriceLiquidByRegime[regimeKey]! > 0
          ? p.salePriceLiquidByRegime[regimeKey]!
          : undefined) ??
        (p.mode === 'liquid' &&
        typeof p.salePriceByRegime?.[regimeKey] === 'number' &&
        p.salePriceByRegime[regimeKey]! > 0
          ? p.salePriceByRegime[regimeKey]!
          : undefined) ??
        (typeof p.salePriceLiquid === 'number' && p.salePriceLiquid > 0
          ? p.salePriceLiquid
          : undefined)

      let unitSalePrice = 0
      if (
        typeof candidateLiquidPrice === 'number' &&
        Number.isFinite(candidateLiquidPrice) &&
        candidateLiquidPrice > 0
      ) {
        unitSalePrice = Math.round(candidateLiquidPrice * 100) / 100
      }
      const unitCost = getProductUnitCost(p)

      // Apuração unitária do item
      const itemUnitDre = computeProductUnitDre(unitSalePrice, unitCost)
      liquidSumUnits.grossRevenue =
        Math.round((liquidSumUnits.grossRevenue + itemUnitDre.grossRevenue) * 100) / 100
      liquidSumUnits.taxesTotal =
        Math.round((liquidSumUnits.taxesTotal + itemUnitDre.taxesTotal) * 100) / 100
      liquidSumUnits.icmsOrIss =
        Math.round((liquidSumUnits.icmsOrIss + itemUnitDre.icmsOrIss) * 100) / 100
      liquidSumUnits.pis = Math.round((liquidSumUnits.pis + itemUnitDre.pis) * 100) / 100
      liquidSumUnits.cofins = Math.round((liquidSumUnits.cofins + itemUnitDre.cofins) * 100) / 100
      liquidSumUnits.dasTotal =
        Math.round((liquidSumUnits.dasTotal + itemUnitDre.dasTotal) * 100) / 100
      liquidSumUnits.netRevenue =
        Math.round((liquidSumUnits.netRevenue + itemUnitDre.netRevenue) * 100) / 100
      liquidSumUnits.cmv = Math.round((liquidSumUnits.cmv + itemUnitDre.cmv) * 100) / 100
      liquidSumUnits.grossProfit =
        Math.round((liquidSumUnits.grossProfit + itemUnitDre.grossProfit) * 100) / 100
      liquidSumUnits.lair = Math.round((liquidSumUnits.lair + itemUnitDre.lair) * 100) / 100
      liquidSumUnits.irpj = Math.round((liquidSumUnits.irpj + itemUnitDre.irpj) * 100) / 100
      liquidSumUnits.irpjAdditional =
        Math.round((liquidSumUnits.irpjAdditional + itemUnitDre.irpjAdditional) * 100) / 100
      liquidSumUnits.csll = Math.round((liquidSumUnits.csll + itemUnitDre.csll) * 100) / 100
      liquidSumUnits.netProfit =
        Math.round((liquidSumUnits.netProfit + itemUnitDre.netProfit) * 100) / 100

      if (effectiveItemQty > 0) {
        revSum += Math.round(unitSalePrice * effectiveItemQty * 100) / 100
        cmvSum += Math.round(unitCost * effectiveItemQty * 100) / 100
      }
    }

    if (revSum <= 0 && liquidSumUnits.grossRevenue <= 0) {
      liquidHasValid = false
      liquidInvalidReason =
        'Preço Líquido Desejado não calculado no Markup para este regime. Calcule o produto na Calculadora de Markup.'
    }

    liquidTotalGross = Math.round(revSum * 100) / 100
    liquidTotalCmv = Math.round(cmvSum * 100) / 100
  } else {
    const globalMeta = desiredLiquidRevenueByRegime?.[regimeKey] ?? 0
    if (globalMeta <= 0) {
      liquidHasValid = false
      liquidInvalidReason = 'Preço Líquido Desejado global não informado para este regime.'
    } else {
      const divisor = computeLiquidDivisor()
      const unitSalePrice = Math.round((globalMeta / divisor) * 100) / 100
      const safeQty = effectiveRegimeQty > 0 ? effectiveRegimeQty : 1
      liquidTotalGross = Math.round(unitSalePrice * safeQty * 100) / 100

      let fallbackCost = 0
      if (regimeKey === 'presumido') fallbackCost = calculatedPurchases.unitCostPresumidoEffective
      else if (regimeKey === 'real') fallbackCost = calculatedPurchases.unitCostRealEffective
      else fallbackCost = calculatedPurchases.unitCostSimplesEffective

      liquidTotalCmv = Math.round(fallbackCost * safeQty * 100) / 100

      const singleUnitDre = computeProductUnitDre(unitSalePrice, fallbackCost)
      liquidSumUnits = singleUnitDre
    }
  }

  // Margem líquida percentual unitária do modo liquid
  liquidSumUnits.netMargin =
    liquidSumUnits.grossRevenue > 0
      ? Math.round((liquidSumUnits.netProfit / liquidSumUnits.grossRevenue) * 100 * 100) / 100
      : 0

  const liquidPair = buildDrePair(
    liquidTotalGross,
    liquidTotalCmv,
    effectiveRegimeQty,
    liquidHasValid,
    liquidInvalidReason,
  )

  // Sobrepõe a coluna unit com o somatório item a item por produto da regra canônica
  if (liquidPair.hasValidData && validProducts.length > 0) {
    liquidPair.unit = {
      ...liquidSumUnits,
      // Despesas operacionais e encargos globais não rateados no unitário de produto
      operatingExpenses: 0,
      patronalCharges: 0,
    }
  }

  // ===========================================================================
  // PAR 2: DRE - Custo + Margem
  // Base: Custo ÷ divisor composto com margem: PV = Custo ÷ ((1 - Trib_DV) * (1 - Margem))
  // ===========================================================================
  let costMarginTotalGross = 0
  let costMarginTotalCmv = 0
  let costMarginHasValid = true
  let costMarginInvalidReason: string | undefined

  let costMarginSumUnits: DreColumnValues = {
    grossRevenue: 0,
    taxesTotal: 0,
    icmsOrIss: 0,
    pis: 0,
    cofins: 0,
    dasTotal: 0,
    patronalCharges: 0,
    netRevenue: 0,
    cmv: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    lair: 0,
    irpj: 0,
    irpjAdditional: 0,
    csll: 0,
    netProfit: 0,
    netMargin: 0,
  }

  if (validProducts.length > 0) {
    let revSum = 0
    let cmvSum = 0

    for (const p of validProducts) {
      const pQty = resolveProductQty(p)
      const effectiveItemQty = pQty > 0 ? pQty : 0
      const unitCost = getProductUnitCost(p)

      // PARTE 2: DRE lê EXCLUSIVAMENTE os campos canônicos da Markup, sem fallback permissivo nem derivação defensiva
      const candidatePrice =
        (typeof p.salePriceCostMarginByRegime?.[regimeKey] === 'number' &&
        p.salePriceCostMarginByRegime[regimeKey]! > 0
          ? p.salePriceCostMarginByRegime[regimeKey]!
          : undefined) ??
        (p.mode === 'cost_margin' &&
        typeof p.salePriceByRegime?.[regimeKey] === 'number' &&
        p.salePriceByRegime[regimeKey]! > 0
          ? p.salePriceByRegime[regimeKey]!
          : undefined) ??
        (typeof p.salePriceCostMargin === 'number' && p.salePriceCostMargin > 0
          ? p.salePriceCostMargin
          : undefined)

      let unitSalePrice = 0
      if (
        typeof candidatePrice === 'number' &&
        Number.isFinite(candidatePrice) &&
        candidatePrice > 0
      ) {
        unitSalePrice = Math.round(candidatePrice * 100) / 100
      }

      // Apuração unitária do item
      const itemUnitDre = computeProductUnitDre(unitSalePrice, unitCost)
      costMarginSumUnits.grossRevenue =
        Math.round((costMarginSumUnits.grossRevenue + itemUnitDre.grossRevenue) * 100) / 100
      costMarginSumUnits.taxesTotal =
        Math.round((costMarginSumUnits.taxesTotal + itemUnitDre.taxesTotal) * 100) / 100
      costMarginSumUnits.icmsOrIss =
        Math.round((costMarginSumUnits.icmsOrIss + itemUnitDre.icmsOrIss) * 100) / 100
      costMarginSumUnits.pis = Math.round((costMarginSumUnits.pis + itemUnitDre.pis) * 100) / 100
      costMarginSumUnits.cofins =
        Math.round((costMarginSumUnits.cofins + itemUnitDre.cofins) * 100) / 100
      costMarginSumUnits.dasTotal =
        Math.round((costMarginSumUnits.dasTotal + itemUnitDre.dasTotal) * 100) / 100
      costMarginSumUnits.netRevenue =
        Math.round((costMarginSumUnits.netRevenue + itemUnitDre.netRevenue) * 100) / 100
      costMarginSumUnits.cmv = Math.round((costMarginSumUnits.cmv + itemUnitDre.cmv) * 100) / 100
      costMarginSumUnits.grossProfit =
        Math.round((costMarginSumUnits.grossProfit + itemUnitDre.grossProfit) * 100) / 100
      costMarginSumUnits.lair = Math.round((costMarginSumUnits.lair + itemUnitDre.lair) * 100) / 100
      costMarginSumUnits.irpj = Math.round((costMarginSumUnits.irpj + itemUnitDre.irpj) * 100) / 100
      costMarginSumUnits.irpjAdditional =
        Math.round((costMarginSumUnits.irpjAdditional + itemUnitDre.irpjAdditional) * 100) / 100
      costMarginSumUnits.csll = Math.round((costMarginSumUnits.csll + itemUnitDre.csll) * 100) / 100
      costMarginSumUnits.netProfit =
        Math.round((costMarginSumUnits.netProfit + itemUnitDre.netProfit) * 100) / 100

      if (effectiveItemQty > 0) {
        revSum += Math.round(unitSalePrice * effectiveItemQty * 100) / 100
        cmvSum += Math.round(unitCost * effectiveItemQty * 100) / 100
      }
    }

    if (revSum <= 0 && costMarginSumUnits.grossRevenue <= 0) {
      costMarginHasValid = false
      costMarginInvalidReason =
        'Preço de Custo + Margem não calculado no Markup para este regime. Calcule o produto na Calculadora de Markup.'
    }

    costMarginTotalGross = Math.round(revSum * 100) / 100
    costMarginTotalCmv = Math.round(cmvSum * 100) / 100
  } else {
    let fallbackCost = 0
    if (regimeKey === 'presumido') fallbackCost = calculatedPurchases.unitCostPresumidoEffective
    else if (regimeKey === 'real') fallbackCost = calculatedPurchases.unitCostRealEffective
    else fallbackCost = calculatedPurchases.unitCostSimplesEffective

    if (fallbackCost <= 0) {
      costMarginHasValid = false
      costMarginInvalidReason = 'Nenhum custo cadastrado para este regime no Markup ou nas Compras.'
    } else {
      const divisor = computeCostMarginDivisor(0)
      const unitSalePrice = Math.round((fallbackCost / divisor) * 100) / 100
      const safeQty = effectiveRegimeQty > 0 ? effectiveRegimeQty : 1
      costMarginTotalGross = Math.round(unitSalePrice * safeQty * 100) / 100
      costMarginTotalCmv = Math.round(fallbackCost * safeQty * 100) / 100

      const singleUnitDre = computeProductUnitDre(unitSalePrice, fallbackCost)
      costMarginSumUnits = singleUnitDre
    }
  }

  // Margem líquida percentual unitária do modo cost_margin
  costMarginSumUnits.netMargin =
    costMarginSumUnits.grossRevenue > 0
      ? Math.round((costMarginSumUnits.netProfit / costMarginSumUnits.grossRevenue) * 100 * 100) /
        100
      : 0

  const costMarginPair = buildDrePair(
    costMarginTotalGross,
    costMarginTotalCmv,
    effectiveRegimeQty,
    costMarginHasValid,
    costMarginInvalidReason,
  )

  // Sobrepõe a coluna unit com o somatório item a item por produto da regra canônica
  if (costMarginPair.hasValidData && validProducts.length > 0) {
    costMarginPair.unit = {
      ...costMarginSumUnits,
      operatingExpenses: 0,
      patronalCharges: 0,
    }
  }

  return {
    regimeKey,
    regimeName: regimeNames[regimeKey],
    regimeDescription: regimeDescriptions[regimeKey],
    quantity: effectiveRegimeQty,
    liquid: liquidPair,
    costMargin: costMarginPair,
  }
}

/**
 * Componente Visual da DRE Comparativa por Regime Tributário
 * Replicado nos 3 regimes com exatamente a estrutura solicitada pela usuária Adriana:
 * - Par 1, subtítulo "DRE - Preço líquido desejado": (unitário) | (consolidado)
 * - Par 2, subtítulo "DRE - Custo + Margem": (unitário) | (consolidado)
 */
export const DreRegimeComparativeSection: React.FC<DreRegimeComparativeProps> = ({
  markupProducts,
  purchasesItems,
  getPurchaseItemUnitNetCost,
  icmsRateMarkup,
  customTaxesMarkup,
  totalVariableExpenseRate,
  simplesAnexo,
  simplesRbt12,
  effectiveSimplesRbt12,
  desiredLiquidRevenueByRegime,
  calculatedPurchases,
  totalGlobalOperatingExpenses,
  totalGlobalOperatingRevenues,
  directPayrollExpenses,
  patronalCharges,
  presumidoActivity,
  realActivity,
  presumidoIssRate,
  realIssRate,
  realAdditions,
  realExclusions,
  presumidoQuantitySold,
  realQuantitySold,
  simplesQuantitySold,
  qty,
}) => {
  // Camada colapsável: recolhida por padrão
  const [isOpen, setIsOpen] = useState<boolean>(false)

  // Alíquotas e divisores compartilhados
  const currentAnexoId = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const currentAnexoConfig = SIMPLES_ANEXOS[currentAnexoId] || SIMPLES_ANEXOS.anexo_1
  const rbt12Clean =
    effectiveSimplesRbt12 && effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0
  const pgdas = useMemo(() => {
    return calculatePgdas(currentAnexoId, rbt12Clean)
  }, [currentAnexoId, rbt12Clean])

  const icms =
    typeof icmsRateMarkup === 'number' && Number.isFinite(icmsRateMarkup) ? icmsRateMarkup : 0
  const dvRate =
    typeof totalVariableExpenseRate === 'number' && Number.isFinite(totalVariableExpenseRate)
      ? totalVariableExpenseRate
      : 0
  const simplesEffectiveRate = pgdas.aliquotaEfetiva || 0

  // Resolver quantidades por regime com prioridade: soma das quantidades dos produtos no regime > quantidade local > qty geral
  const resolveRegimeQty = (regimeKey: 'presumido' | 'real' | 'simples') => {
    if (Array.isArray(markupProducts) && markupProducts.length > 0) {
      let sum = 0
      let hasExplicitByRegime = false
      for (const p of markupProducts) {
        if (p.quantityByRegime && p.quantityByRegime[regimeKey] !== undefined) {
          sum += Math.max(0, Number(p.quantityByRegime[regimeKey]) || 0)
          hasExplicitByRegime = true
        }
      }
      if (hasExplicitByRegime) return sum

      // Se não há quantityByRegime explícito, soma p.quantity dos produtos
      const productSum = markupProducts.reduce(
        (acc, p) =>
          acc +
          (typeof p.quantity === 'number' && Number.isFinite(p.quantity)
            ? Math.max(0, p.quantity)
            : 0),
        0,
      )
      if (productSum > 0) return productSum
    }
    if (regimeKey === 'presumido' && presumidoQuantitySold && presumidoQuantitySold > 0) {
      return presumidoQuantitySold
    }
    if (regimeKey === 'real' && realQuantitySold && realQuantitySold > 0) {
      return realQuantitySold
    }
    if (regimeKey === 'simples' && simplesQuantitySold && simplesQuantitySold > 0) {
      return simplesQuantitySold
    }
    return qty > 0 ? qty : 1
  }

  // Apurar os dados dos 3 regimes
  const comparativeData = useMemo(() => {
    const commonParams = {
      markupProducts,
      purchasesItems,
      getPurchaseItemUnitNetCost,
      icmsRate: icms,
      customTaxesMarkup,
      dvRate,
      simplesEffectiveRate,
      desiredLiquidRevenueByRegime,
      calculatedPurchases,
      totalGlobalOperatingExpenses,
      totalGlobalOperatingRevenues,
      directPayrollExpenses,
      patronalCharges,
      presumidoActivity,
      realActivity,
      presumidoIssRate,
      realIssRate,
      realAdditions,
      realExclusions,
    }

    return {
      presumido: computeDreComparativeForRegime({
        ...commonParams,
        regimeKey: 'presumido',
        regimeQuantity: resolveRegimeQty('presumido'),
      }),
      real: computeDreComparativeForRegime({
        ...commonParams,
        regimeKey: 'real',
        regimeQuantity: resolveRegimeQty('real'),
      }),
      simples: computeDreComparativeForRegime({
        ...commonParams,
        regimeKey: 'simples',
        regimeQuantity: resolveRegimeQty('simples'),
      }),
    }
  }, [
    markupProducts,
    purchasesItems,
    getPurchaseItemUnitNetCost,
    icms,
    customTaxesMarkup,
    dvRate,
    simplesEffectiveRate,
    desiredLiquidRevenueByRegime,
    calculatedPurchases,
    totalGlobalOperatingExpenses,
    totalGlobalOperatingRevenues,
    directPayrollExpenses,
    patronalCharges,
    presumidoActivity,
    realActivity,
    presumidoIssRate,
    realIssRate,
    realAdditions,
    realExclusions,
    presumidoQuantitySold,
    realQuantitySold,
    simplesQuantitySold,
    qty,
  ])

  // Helper para renderizar a tabela de 4 colunas em 2 pares para um regime
  const renderRegimeDreBlock = (data: RegimeDreComparativeData) => {
    const { regimeKey, regimeName, regimeDescription, quantity, liquid, costMargin } = data

    const getRegimeIcon = () => {
      if (regimeKey === 'presumido') return <Briefcase className="w-4 h-4 text-emerald-400" />
      if (regimeKey === 'real') return <Factory className="w-4 h-4 text-emerald-400" />
      return <Building2 className="w-4 h-4 text-emerald-400" />
    }

    return (
      <div
        key={`dre-block-${regimeKey}`}
        className="bg-[#0b101b]/95 border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4"
      >
        {/* Cabeçalho do Bloco do Regime */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              {getRegimeIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  DRE Comparativa — {regimeName}
                </h4>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/5 px-2 py-0.2"
                >
                  {quantity} un. ({regimeKey})
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{regimeDescription}</p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
            Unitário = soma dos unitários apurados item a item por produto · {quantity} un.
          </div>
        </div>

        {/* TABELA COM 4 COLUNAS EM 2 PARES (Subtítulos Lado a Lado) */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse min-w-[760px]">
            <thead>
              {/* Linha de Subtítulos Lado a Lado (Par 1 e Par 2) */}
              <tr className="border-b border-slate-700/80 bg-slate-900/70">
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 text-left font-semibold text-slate-300 w-[28%] border-r border-slate-800 align-middle"
                >
                  Linha da DRE
                </th>
                <th
                  colSpan={2}
                  className="py-2 px-3 text-center font-bold text-emerald-300 bg-emerald-500/[0.08] border-r border-slate-800 uppercase tracking-wider text-[11px]"
                >
                  DRE - Preço líquido desejado
                </th>
                <th
                  colSpan={2}
                  className="py-2 px-3 text-center font-bold text-blue-300 bg-blue-500/[0.08] uppercase tracking-wider text-[11px]"
                >
                  DRE - Custo + Margem
                </th>
              </tr>
              {/* Linha das Colunas (unitário e consolidado) */}
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="py-2 px-2.5 text-right font-semibold text-slate-300 bg-emerald-500/[0.04]">
                  (unitário)
                </th>
                <th className="py-2 px-2.5 text-right font-semibold text-slate-300 bg-emerald-500/[0.04] border-r border-slate-800">
                  (consolidado)
                </th>
                <th className="py-2 px-2.5 text-right font-semibold text-slate-300 bg-blue-500/[0.04]">
                  (unitário)
                </th>
                <th className="py-2 px-2.5 text-right font-semibold text-slate-300 bg-blue-500/[0.04]">
                  (consolidado)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* 1. Receita Bruta */}
              <tr className="hover:bg-slate-900/30">
                <td className="py-2 px-3 text-left font-semibold text-slate-200 border-r border-slate-800">
                  Receita Bruta
                </td>
                <td className="py-2 px-2.5 text-right text-slate-200 bg-emerald-500/[0.02]">
                  {liquid.hasValidData ? formatBRL(liquid.unit.grossRevenue) : '—'}
                </td>
                <td className="py-2 px-2.5 text-right text-slate-200 font-semibold bg-emerald-500/[0.02] border-r border-slate-800">
                  {liquid.hasValidData ? formatBRL(liquid.consolidated.grossRevenue) : '—'}
                </td>
                <td className="py-2 px-2.5 text-right text-slate-200 bg-blue-500/[0.02]">
                  {costMargin.hasValidData ? formatBRL(costMargin.unit.grossRevenue) : '—'}
                </td>
                <td className="py-2 px-2.5 text-right text-slate-200 font-semibold bg-blue-500/[0.02]">
                  {costMargin.hasValidData ? formatBRL(costMargin.consolidated.grossRevenue) : '—'}
                </td>
              </tr>

              {/* 2. (-) Tributos do Regime */}
              {regimeKey === 'simples' ? (
                /* No Simples: Guia Única DAS */
                <tr className="hover:bg-slate-900/30 text-emerald-400/90">
                  <td className="py-2 px-3 text-left border-r border-slate-800">
                    (−) Guia Única DAS (Simples · {formatNumberBR(pgdas.aliquotaEfetiva, 2)}% ef.)
                  </td>
                  <td className="py-2 px-2.5 text-right bg-emerald-500/[0.02]">
                    {liquid.hasValidData ? `-${formatBRL(liquid.unit.dasTotal)}` : '—'}
                  </td>
                  <td className="py-2 px-2.5 text-right bg-emerald-500/[0.02] border-r border-slate-800">
                    {liquid.hasValidData ? `-${formatBRL(liquid.consolidated.dasTotal)}` : '—'}
                  </td>
                  <td className="py-2 px-2.5 text-right bg-blue-500/[0.02]">
                    {costMargin.hasValidData ? `-${formatBRL(costMargin.unit.dasTotal)}` : '—'}
                  </td>
                  <td className="py-2 px-2.5 text-right bg-blue-500/[0.02]">
                    {costMargin.hasValidData
                      ? `-${formatBRL(costMargin.consolidated.dasTotal)}`
                      : '—'}
                  </td>
                </tr>
              ) : (
                /* No Presumido e Real: ICMS/ISS, PIS, COFINS discriminados */
                <>
                  {/* ICMS */}
                  <tr className="hover:bg-slate-900/30 text-slate-400">
                    <td className="py-1.5 px-3 text-left border-r border-slate-800">
                      (−) ICMS Próprio
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02]">
                      {liquid.hasValidData ? `-${formatBRL(liquid.unit.icmsOrIss)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02] border-r border-slate-800">
                      {liquid.hasValidData ? `-${formatBRL(liquid.consolidated.icmsOrIss)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData ? `-${formatBRL(costMargin.unit.icmsOrIss)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData
                        ? `-${formatBRL(costMargin.consolidated.icmsOrIss)}`
                        : '—'}
                    </td>
                  </tr>

                  {/* PIS */}
                  <tr className="hover:bg-slate-900/30 text-slate-400">
                    <td className="py-1.5 px-3 text-left border-r border-slate-800">
                      (−) PIS {regimeKey === 'presumido' ? '(0,65%)' : '(1,65%)'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02]">
                      {liquid.hasValidData ? `-${formatBRL(liquid.unit.pis)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02] border-r border-slate-800">
                      {liquid.hasValidData ? `-${formatBRL(liquid.consolidated.pis)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData ? `-${formatBRL(costMargin.unit.pis)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData ? `-${formatBRL(costMargin.consolidated.pis)}` : '—'}
                    </td>
                  </tr>

                  {/* COFINS */}
                  <tr className="hover:bg-slate-900/30 text-slate-400">
                    <td className="py-1.5 px-3 text-left border-r border-slate-800">
                      (−) COFINS {regimeKey === 'presumido' ? '(3,00%)' : '(7,60%)'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02]">
                      {liquid.hasValidData ? `-${formatBRL(liquid.unit.cofins)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02] border-r border-slate-800">
                      {liquid.hasValidData ? `-${formatBRL(liquid.consolidated.cofins)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData ? `-${formatBRL(costMargin.unit.cofins)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData
                        ? `-${formatBRL(costMargin.consolidated.cofins)}`
                        : '—'}
                    </td>
                  </tr>
                </>
              )}

              {/* 3. (=) Receita Líquida */}
              <tr className="bg-slate-950/40 font-bold text-slate-100">
                <td className="py-2 px-3 text-left border-r border-slate-800">= Receita Líquida</td>
                <td className="py-2 px-2.5 text-right text-emerald-300 bg-emerald-500/[0.04]">
                  {liquid.hasValidData ? formatBRL(liquid.unit.netRevenue) : '—'}
                </td>
                <td className="py-2 px-2.5 text-right text-emerald-300 bg-emerald-500/[0.04] border-r border-slate-800">
                  {liquid.hasValidData ? formatBRL(liquid.consolidated.netRevenue) : '—'}
                </td>
                <td className="py-2 px-2.5 text-right text-blue-300 bg-blue-500/[0.04]">
                  {costMargin.hasValidData ? formatBRL(costMargin.unit.netRevenue) : '—'}
                </td>
                <td className="py-2 px-2.5 text-right text-blue-300 bg-blue-500/[0.04]">
                  {costMargin.hasValidData ? formatBRL(costMargin.consolidated.netRevenue) : '—'}
                </td>
              </tr>

              {/* 4. (−) CMV */}
              <tr className="hover:bg-slate-900/30 text-slate-400">
                <td className="py-2 px-3 text-left border-r border-slate-800">
                  (−) CMV (Custo das Mercadorias)
                </td>
                <td className="py-2 px-2.5 text-right bg-emerald-500/[0.02]">
                  {liquid.hasValidData ? `-${formatBRL(liquid.unit.cmv)}` : '—'}
                </td>
                <td className="py-2 px-2.5 text-right bg-emerald-500/[0.02] border-r border-slate-800">
                  {liquid.hasValidData ? `-${formatBRL(liquid.consolidated.cmv)}` : '—'}
                </td>
                <td className="py-2 px-2.5 text-right bg-blue-500/[0.02]">
                  {costMargin.hasValidData ? `-${formatBRL(costMargin.unit.cmv)}` : '—'}
                </td>
                <td className="py-2 px-2.5 text-right bg-blue-500/[0.02]">
                  {costMargin.hasValidData ? `-${formatBRL(costMargin.consolidated.cmv)}` : '—'}
                </td>
              </tr>

              {/* 5. (=) Lucro Bruto */}
              <tr className="bg-slate-950/20 font-semibold text-slate-200">
                <td className="py-1.5 px-3 text-left border-r border-slate-800">= Lucro Bruto</td>
                <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02]">
                  {liquid.hasValidData ? formatBRL(liquid.unit.grossProfit) : '—'}
                </td>
                <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02] border-r border-slate-800">
                  {liquid.hasValidData ? formatBRL(liquid.consolidated.grossProfit) : '—'}
                </td>
                <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                  {costMargin.hasValidData ? formatBRL(costMargin.unit.grossProfit) : '—'}
                </td>
                <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                  {costMargin.hasValidData ? formatBRL(costMargin.consolidated.grossProfit) : '—'}
                </td>
              </tr>

              {/* 6. (−) Despesas Operacionais / Variáveis */}
              <tr className="hover:bg-slate-900/30 text-rose-300/80">
                <td className="py-2 px-3 text-left border-r border-slate-800">
                  (−) Despesas Operacionais (adm, vendas, folha)
                </td>
                <td className="py-2 px-2.5 text-right bg-emerald-500/[0.02]">
                  {liquid.hasValidData ? `-${formatBRL(liquid.unit.operatingExpenses)}` : '—'}
                </td>
                <td className="py-2 px-2.5 text-right bg-emerald-500/[0.02] border-r border-slate-800">
                  {liquid.hasValidData
                    ? `-${formatBRL(liquid.consolidated.operatingExpenses)}`
                    : '—'}
                </td>
                <td className="py-2 px-2.5 text-right bg-blue-500/[0.02]">
                  {costMargin.hasValidData
                    ? `-${formatBRL(costMargin.unit.operatingExpenses)}`
                    : '—'}
                </td>
                <td className="py-2 px-2.5 text-right bg-blue-500/[0.02]">
                  {costMargin.hasValidData
                    ? `-${formatBRL(costMargin.consolidated.operatingExpenses)}`
                    : '—'}
                </td>
              </tr>

              {/* IRPJ e CSLL (Presumido e Real) */}
              {regimeKey !== 'simples' && (
                <>
                  <tr className="hover:bg-slate-900/30 text-slate-400">
                    <td className="py-1.5 px-3 text-left border-r border-slate-800">
                      (−) IRPJ (+ Adicional 10%)
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02]">
                      {liquid.hasValidData
                        ? `-${formatBRL(liquid.unit.irpj + liquid.unit.irpjAdditional)}`
                        : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02] border-r border-slate-800">
                      {liquid.hasValidData
                        ? `-${formatBRL(liquid.consolidated.irpj + liquid.consolidated.irpjAdditional)}`
                        : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData
                        ? `-${formatBRL(costMargin.unit.irpj + costMargin.unit.irpjAdditional)}`
                        : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData
                        ? `-${formatBRL(costMargin.consolidated.irpj + costMargin.consolidated.irpjAdditional)}`
                        : '—'}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-900/30 text-slate-400">
                    <td className="py-1.5 px-3 text-left border-r border-slate-800">(−) CSLL</td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02]">
                      {liquid.hasValidData ? `-${formatBRL(liquid.unit.csll)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-emerald-500/[0.02] border-r border-slate-800">
                      {liquid.hasValidData ? `-${formatBRL(liquid.consolidated.csll)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData ? `-${formatBRL(costMargin.unit.csll)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right bg-blue-500/[0.02]">
                      {costMargin.hasValidData
                        ? `-${formatBRL(costMargin.consolidated.csll)}`
                        : '—'}
                    </td>
                  </tr>
                </>
              )}

              {/* 7. (=) Lucro Líquido */}
              <tr className="bg-emerald-950/40 font-bold border-t border-emerald-500/40">
                <td className="py-2.5 px-3 text-left text-emerald-400 border-r border-slate-800 font-extrabold">
                  = Lucro Líquido
                </td>
                <td className="py-2.5 px-2.5 text-right text-emerald-300 font-black bg-emerald-500/[0.06]">
                  {liquid.hasValidData ? formatBRL(liquid.unit.netProfit) : '—'}
                </td>
                <td className="py-2.5 px-2.5 text-right text-emerald-300 font-black bg-emerald-500/[0.06] border-r border-slate-800">
                  {liquid.hasValidData ? formatBRL(liquid.consolidated.netProfit) : '—'}
                </td>
                <td className="py-2.5 px-2.5 text-right text-blue-300 font-black bg-blue-500/[0.06]">
                  {costMargin.hasValidData ? formatBRL(costMargin.unit.netProfit) : '—'}
                </td>
                <td className="py-2.5 px-2.5 text-right text-blue-300 font-black bg-blue-500/[0.06]">
                  {costMargin.hasValidData ? formatBRL(costMargin.consolidated.netProfit) : '—'}
                </td>
              </tr>

              {/* 8. Margem Líquida % */}
              <tr className="bg-slate-950/60 font-semibold text-slate-300">
                <td className="py-2 px-3 text-left border-r border-slate-800">
                  Margem Líquida (%)
                </td>
                <td className="py-2 px-2.5 text-right text-emerald-400 font-bold bg-emerald-500/[0.02]">
                  {liquid.hasValidData ? formatPercentBR(liquid.unit.netMargin) : '—'}
                </td>
                <td className="py-2 px-2.5 text-right text-emerald-400 font-bold bg-emerald-500/[0.02] border-r border-slate-800">
                  {liquid.hasValidData ? formatPercentBR(liquid.consolidated.netMargin) : '—'}
                </td>
                <td className="py-2 px-2.5 text-right text-blue-400 font-bold bg-blue-500/[0.02]">
                  {costMargin.hasValidData ? formatPercentBR(costMargin.unit.netMargin) : '—'}
                </td>
                <td className="py-2 px-2.5 text-right text-blue-400 font-bold bg-blue-500/[0.02]">
                  {costMargin.hasValidData
                    ? formatPercentBR(costMargin.consolidated.netMargin)
                    : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Alertas informativos caso algum modo não tenha dados preenchidos */}
        {(!liquid.hasValidData || !costMargin.hasValidData) && (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {!liquid.hasValidData && costMargin.hasValidData && (
                <>
                  <strong>Preço Líquido Desejado</strong> — (não calculado): preencha a meta líquida
                  deste regime na Calculadora de Markup para integrar a esta DRE.
                </>
              )}
              {liquid.hasValidData && !costMargin.hasValidData && (
                <>
                  <strong>Custo + Margem</strong> — (não calculado): preencha o custo e a margem
                  deste regime na Calculadora de Markup para integrar a esta DRE.
                </>
              )}
              {!liquid.hasValidData && !costMargin.hasValidData && (
                <>
                  Valores de <strong>Preço Líquido Desejado</strong> e{' '}
                  <strong>Custo + Margem</strong> — (não calculados). Simule os produtos na
                  Calculadora de Markup para alimentar esta DRE comparativa.
                </>
              )}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Botão de Camada (Collapsible no mesmo padrão das demais seções) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
          title="Acessar DRE Comparativa por Regime Tributário (Unitário vs Consolidado em 4 colunas)"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>DRE Comparativa por Regime Tributário ›</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-emerald-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
          Preço Líquido Desejado vs. Custo + Margem · (unitário) / (consolidado)
        </span>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="animate-in fade-in-0 duration-200 space-y-5">
          {/* Faixa Informativa Explicativa com as Regras da Seção */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/30 text-xs font-mono text-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Apresentação Comparativa por Regime:</strong> cada regime conta com 4
                colunas em 2 pares lado a lado (Unitário = soma dos unitários apurados item a item
                por produto · Consolidado = Σ(unitário × quantidade)).
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
              <span className="text-emerald-400 font-bold">Par 1:</span> Preço líquido desejado
              <span className="text-slate-600">|</span>
              <span className="text-blue-400 font-bold">Par 2:</span> Custo + Margem
            </div>
          </div>

          {/* 3 Blocos de Regimes Replicados com a Mesma Estrutura */}
          <div className="space-y-5">
            {renderRegimeDreBlock(comparativeData.presumido)}
            {renderRegimeDreBlock(comparativeData.real)}
            {renderRegimeDreBlock(comparativeData.simples)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
