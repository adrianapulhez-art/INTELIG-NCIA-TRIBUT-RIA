import { describe, it, expect } from 'vitest'
import { computeDreComparativeForRegime } from '@/components/demo/DreRegimeComparativeSection'
import { MarkupProductItem, PurchaseItem } from '@/contexts/TaxContext'

describe('DRE Comparativa por Regime Tributário (Adriana 0.0.130)', () => {
  // Cenário Canônico de Referência:
  // Produto com Custo R$ 1.158,93, Margem 51,90%, Meta Líquida R$ 2.335,00
  // ICMS 18%, PIS/COFINS Presumido (3,65%), DV 7,5%
  // Divisor Líquido Presumido: (1 - 0.18) * (1 - 0.0365) * (1 - 0.075) = 0.82 * 0.9635 * 0.925 = 0.7308147
  // Preço Líquido: 2.335,00 / 0.7308147 = R$ 3.195,08
  // Divisor Custo + Margem Presumido: 0.7308147 * (1 - 0.519) = 0.7308147 * 0.481 = 0.351594
  // Preço Custo + Margem: 1.158,93 / 0.351594 = R$ 3.296,25
  const sampleProducts: MarkupProductItem[] = [
    {
      id: 'prod-canonico-1',
      name: 'Produto Canônico Teste',
      mode: 'cost_margin',
      cost: 1158.93,
      desiredNetRevenue: 2335.0,
      margin: 51.9,
      marginByRegime: {
        presumido: 51.9,
        real: 51.9,
        simples: 51.9,
      },
      desiredNetRevenueByRegime: {
        presumido: 2335.0,
        real: 2335.0,
        simples: 2335.0,
      },
      quantityByRegime: {
        presumido: 10,
        real: 15,
        simples: 20,
      },
      quantity: 10,
      salePrice: 3296.25,
      taxFactor: 0.7308147,
      completeFactor: 0.351594,
      totalRevenue: 32962.5,
      totalCost: 11589.3,
    },
  ]

  const defaultCalculatedPurchases = {
    unitCostPresumidoEffective: 1158.93,
    unitCostRealEffective: 1028.32,
    unitCostSimplesEffective: 1158.93,
    cmvPresumido: 1158.93 * 10,
    cmvReal: 1028.32 * 15,
    cmvSimples: 1158.93 * 20,
  }

  it('1. Valida valores canônicos blindados R$ 3.195,08 e R$ 3.296,25 no Lucro Presumido e rejeita antigo 3.295,70', () => {
    const data = computeDreComparativeForRegime({
      regimeKey: 'presumido',
      markupProducts: sampleProducts,
      purchasesItems: [],
      icmsRate: 18,
      customTaxesMarkup: [],
      dvRate: 7.5,
      simplesEffectiveRate: 10,
      calculatedPurchases: defaultCalculatedPurchases,
      totalGlobalOperatingExpenses: 500,
      totalGlobalOperatingRevenues: 0,
      directPayrollExpenses: 1000,
      patronalCharges: 250,
      presumidoActivity: 'comercio',
      realActivity: 'comercio',
      presumidoIssRate: 0,
      realIssRate: 0,
      realAdditions: 0,
      realExclusions: 0,
      regimeQuantity: 10,
    })

    // Par 1: DRE - Preço líquido desejado (Unitário e Consolidado)
    expect(data.liquid.hasValidData).toBe(true)
    expect(data.liquid.unit.grossRevenue).toBeCloseTo(3195.08, 1)
    expect(data.liquid.consolidated.grossRevenue).toBeCloseTo(31950.8, 1)

    // Rejeição expressa do antigo divisor 0,70850 e R$ 3.295,70
    expect(data.liquid.unit.grossRevenue).not.toBeCloseTo(3295.7, 1)

    // Par 2: DRE - Custo + Margem (Unitário e Consolidado)
    expect(data.costMargin.hasValidData).toBe(true)
    expect(data.costMargin.unit.grossRevenue).toBeCloseTo(3296.25, 1)
    expect(data.costMargin.consolidated.grossRevenue).toBeCloseTo(32962.5, 1)
  })

  it('2. Integridade matemática estrita: Consolidado = Unitário × Quantidade por regime para todas as linhas', () => {
    const qtyPresumido = 10
    const data = computeDreComparativeForRegime({
      regimeKey: 'presumido',
      markupProducts: sampleProducts,
      purchasesItems: [],
      icmsRate: 18,
      customTaxesMarkup: [],
      dvRate: 7.5,
      simplesEffectiveRate: 10,
      calculatedPurchases: defaultCalculatedPurchases,
      totalGlobalOperatingExpenses: 600,
      totalGlobalOperatingRevenues: 50,
      directPayrollExpenses: 1200,
      patronalCharges: 300,
      presumidoActivity: 'comercio',
      realActivity: 'comercio',
      presumidoIssRate: 0,
      realIssRate: 0,
      realAdditions: 0,
      realExclusions: 0,
      regimeQuantity: qtyPresumido,
    })

    // Verificação no Par 1: Preço Líquido Desejado
    const liqUnit = data.liquid.unit
    const liqCons = data.liquid.consolidated

    expect(liqCons.grossRevenue).toBeCloseTo(liqUnit.grossRevenue * qtyPresumido, 1)
    expect(liqCons.netRevenue).toBeCloseTo(liqUnit.netRevenue * qtyPresumido, 1)
    expect(liqCons.cmv).toBeCloseTo(liqUnit.cmv * qtyPresumido, 1)
    expect(liqCons.grossProfit).toBeCloseTo(liqUnit.grossProfit * qtyPresumido, 1)
    expect(liqCons.operatingExpenses).toBeCloseTo(liqUnit.operatingExpenses * qtyPresumido, 1)
    expect(liqCons.netProfit).toBeCloseTo(liqUnit.netProfit * qtyPresumido, 1)
    expect(liqCons.netMargin).toBeCloseTo(liqUnit.netMargin, 2)

    // Verificação no Par 2: Custo + Margem
    const cmUnit = data.costMargin.unit
    const cmCons = data.costMargin.consolidated

    expect(cmCons.grossRevenue).toBeCloseTo(cmUnit.grossRevenue * qtyPresumido, 1)
    expect(cmCons.netRevenue).toBeCloseTo(cmUnit.netRevenue * qtyPresumido, 1)
    expect(cmCons.cmv).toBeCloseTo(cmUnit.cmv * qtyPresumido, 1)
    expect(cmCons.grossProfit).toBeCloseTo(cmUnit.grossProfit * qtyPresumido, 1)
    expect(cmCons.operatingExpenses).toBeCloseTo(cmUnit.operatingExpenses * qtyPresumido, 1)
    expect(cmCons.netProfit).toBeCloseTo(cmUnit.netProfit * qtyPresumido, 1)
    expect(cmCons.netMargin).toBeCloseTo(cmUnit.netMargin, 2)
  })

  it('3. Replicado nos três regimes: Lucro Presumido, Lucro Real e Simples Nacional com quantidades independentes', () => {
    // Quantidades independentes conforme diretriz da Leitura B
    const qtyPresumido = 10
    const qtyReal = 15
    const qtySimples = 20

    const paramsBase = {
      markupProducts: sampleProducts,
      purchasesItems: [],
      icmsRate: 18,
      customTaxesMarkup: [],
      dvRate: 5.0,
      simplesEffectiveRate: 8.5,
      calculatedPurchases: defaultCalculatedPurchases,
      totalGlobalOperatingExpenses: 1000,
      totalGlobalOperatingRevenues: 0,
      directPayrollExpenses: 2000,
      patronalCharges: 500,
      presumidoActivity: 'comercio' as const,
      realActivity: 'comercio' as const,
      presumidoIssRate: 0,
      realIssRate: 0,
      realAdditions: 0,
      realExclusions: 0,
    }

    const presData = computeDreComparativeForRegime({
      ...paramsBase,
      regimeKey: 'presumido',
      regimeQuantity: qtyPresumido,
    })
    const realData = computeDreComparativeForRegime({
      ...paramsBase,
      regimeKey: 'real',
      regimeQuantity: qtyReal,
    })
    const simpData = computeDreComparativeForRegime({
      ...paramsBase,
      regimeKey: 'simples',
      regimeQuantity: qtySimples,
    })

    // Quantidades respeitadas isoladamente
    expect(presData.quantity).toBe(10)
    expect(realData.quantity).toBe(15)
    expect(simpData.quantity).toBe(20)

    // Presumido: tributos PIS (0,65%) e COFINS (3,00%) sobre base sem ICMS
    expect(presData.liquid.consolidated.pis).toBeGreaterThan(0)
    expect(presData.liquid.consolidated.cofins).toBeGreaterThan(0)
    expect(presData.liquid.consolidated.dasTotal).toBe(0)

    // Real: tributos PIS (1,65%) e COFINS (7,60%)
    expect(realData.liquid.consolidated.pis).toBeGreaterThan(presData.liquid.consolidated.pis)
    expect(realData.liquid.consolidated.cofins).toBeGreaterThan(presData.liquid.consolidated.cofins)
    expect(realData.liquid.consolidated.dasTotal).toBe(0)

    // Simples Nacional: Guia única DAS, sem PIS/COFINS destacados na DRE
    expect(simpData.liquid.consolidated.dasTotal).toBeGreaterThan(0)
    expect(simpData.liquid.consolidated.pis).toBe(0)
    expect(simpData.liquid.consolidated.cofins).toBe(0)
    expect(simpData.liquid.consolidated.patronalCharges).toBe(0) // CPP dentro do DAS
  })

  it('4. Multi-produto: consolidar item por item sem médias (diretriz fixa da usuária)', () => {
    const multiProducts: MarkupProductItem[] = [
      {
        id: 'p1',
        name: 'Produto A',
        mode: 'cost_margin',
        cost: 100,
        desiredNetRevenue: 150,
        margin: 20,
        quantity: 5,
        desiredNetRevenueByRegime: { presumido: 150 },
        marginByRegime: { presumido: 20 },
        quantityByRegime: { presumido: 5 },
        salePrice: 0,
        taxFactor: 0,
        completeFactor: 0,
        totalRevenue: 0,
        totalCost: 500,
      },
      {
        id: 'p2',
        name: 'Produto B',
        mode: 'cost_margin',
        cost: 500,
        desiredNetRevenue: 800,
        margin: 30,
        quantity: 2,
        desiredNetRevenueByRegime: { presumido: 800 },
        marginByRegime: { presumido: 30 },
        quantityByRegime: { presumido: 2 },
        salePrice: 0,
        taxFactor: 0,
        completeFactor: 0,
        totalRevenue: 0,
        totalCost: 1000,
      },
    ]

    const data = computeDreComparativeForRegime({
      regimeKey: 'presumido',
      markupProducts: multiProducts,
      purchasesItems: [],
      icmsRate: 18,
      customTaxesMarkup: [],
      dvRate: 5,
      simplesEffectiveRate: 10,
      calculatedPurchases: {
        unitCostPresumidoEffective: 0,
        unitCostRealEffective: 0,
        unitCostSimplesEffective: 0,
        cmvPresumido: 0,
        cmvReal: 0,
        cmvSimples: 0,
      },
      totalGlobalOperatingExpenses: 0,
      totalGlobalOperatingRevenues: 0,
      directPayrollExpenses: 0,
      patronalCharges: 0,
      presumidoActivity: 'comercio',
      realActivity: 'comercio',
      presumidoIssRate: 0,
      realIssRate: 0,
      realAdditions: 0,
      realExclusions: 0,
      regimeQuantity: 7, // 5 + 2 = 7 un.
    })

    // O CMV consolidado deve ser exatamente 5 * 100 + 2 * 500 = 500 + 1000 = R$ 1.500,00
    expect(data.costMargin.consolidated.cmv).toBe(1500)
    expect(data.liquid.consolidated.cmv).toBe(1500)
    // O CMV unitário médio apurado na DRE = 1.500 / 7 = 214,29
    expect(data.costMargin.unit.cmv).toBeCloseTo(214.29, 2)
  })
})
