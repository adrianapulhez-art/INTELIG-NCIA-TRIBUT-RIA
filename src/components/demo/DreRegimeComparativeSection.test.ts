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

  it('5. v0.0.134: Produto com quantidade 0 para o regime contribui R$ 0,00 sem fallback para regimeQuantity ou 1; Unitário = Consolidado ÷ Quantidade Total e Unitário × Q = Consolidado centavo a centavo', () => {
    // 2 produtos com preços e custos diferentes
    // Prod 1: custo 100, margem 20%, meta 150, qtd = 10 no presumido
    // Prod 2: custo 200, margem 30%, meta 300, qtd = 0 no presumido (NÃO deve contribuir nem herdar fallback)
    // Prod 3: custo 50, margem 10%, meta 80, qtd = 5 no presumido
    const products: MarkupProductItem[] = [
      {
        id: 'p1',
        name: 'Produto Ativo 1',
        mode: 'cost_margin',
        cost: 100,
        desiredNetRevenue: 150,
        margin: 20,
        desiredNetRevenueByRegime: { presumido: 150 },
        marginByRegime: { presumido: 20 },
        quantityByRegime: { presumido: 10 },
        quantity: 10,
        salePrice: 0,
        taxFactor: 0,
        completeFactor: 0,
        totalRevenue: 0,
        totalCost: 1000,
      },
      {
        id: 'p2',
        name: 'Produto Inativo no Presumido',
        mode: 'cost_margin',
        cost: 200,
        desiredNetRevenue: 300,
        margin: 30,
        desiredNetRevenueByRegime: { presumido: 300 },
        marginByRegime: { presumido: 30 },
        quantityByRegime: { presumido: 0 }, // QUANTIDADE ZERO
        quantity: 0,
        salePrice: 0,
        taxFactor: 0,
        completeFactor: 0,
        totalRevenue: 0,
        totalCost: 0,
      },
      {
        id: 'p3',
        name: 'Produto Ativo 2',
        mode: 'cost_margin',
        cost: 50,
        desiredNetRevenue: 80,
        margin: 10,
        desiredNetRevenueByRegime: { presumido: 80 },
        marginByRegime: { presumido: 10 },
        quantityByRegime: { presumido: 5 },
        quantity: 5,
        salePrice: 0,
        taxFactor: 0,
        completeFactor: 0,
        totalRevenue: 0,
        totalCost: 250,
      },
    ]

    const data = computeDreComparativeForRegime({
      regimeKey: 'presumido',
      markupProducts: products,
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
      regimeQuantity: 47, // Quantidade legada que NÃO pode contaminar a soma real dos produtos (10 + 0 + 5 = 15)
    })

    // Quantidade total efetiva sincronizada com a soma dos produtos válidos (10 + 0 + 5 = 15)
    expect(data.quantity).toBe(15)

    // CMV Consolidado deve ser estritamente: 10 * 100 + 0 * 200 + 5 * 50 = 1000 + 0 + 250 = 1250
    // Se o p2 tivesse fallback para 47 ou 1, o CMV seria 1250 + 200*47 ou 1250 + 200.
    expect(data.costMargin.consolidated.cmv).toBe(1250)
    expect(data.liquid.consolidated.cmv).toBe(1250)

    // CMV Unitário deve ser estritamente 1250 ÷ 15 = 83,33
    expect(data.costMargin.unit.cmv).toBeCloseTo(1250 / 15, 2)
    expect(data.liquid.unit.cmv).toBeCloseTo(1250 / 15, 2)

    // Integridade matemática: Unitário × Quantidade Total = Consolidado centavo a centavo
    // (dentro do arredondamento canônico a 2 casas)
    const cmCons = data.costMargin.consolidated
    const cmUnit = data.costMargin.unit
    expect(cmUnit.grossRevenue).toBeCloseTo(cmCons.grossRevenue / 15, 2)
    expect(cmUnit.netRevenue).toBeCloseTo(cmCons.netRevenue / 15, 2)
    expect(cmUnit.cmv).toBeCloseTo(cmCons.cmv / 15, 2)
    expect(cmUnit.grossProfit).toBeCloseTo(cmCons.grossProfit / 15, 2)

    const liqCons = data.liquid.consolidated
    const liqUnit = data.liquid.unit
    expect(liqUnit.grossRevenue).toBeCloseTo(liqCons.grossRevenue / 15, 2)
    expect(liqUnit.netRevenue).toBeCloseTo(liqCons.netRevenue / 15, 2)
    expect(liqUnit.cmv).toBeCloseTo(liqCons.cmv / 15, 2)
    expect(liqUnit.grossProfit).toBeCloseTo(liqCons.grossProfit / 15, 2)
  })

  it('6. v0.0.135: Caso Adriana — Celular (22 un.) e Capa (25 un.) chaveados estritamente por ID nos 3 regimes e 2 modos', () => {
    // Cenário real da usuária Adriana:
    // Produto 1: Celular (id: 'celular', 22 un. nos 3 regimes)
    // Produto 2: Capa (id: 'capa', 25 un. nos 3 regimes)
    // Custo e margem / metas por regime:
    // Celular: custo R$ 1.158,93, margem 51,9%, meta líquida 2.335,00
    // Capa: custo R$ 30,00, margem 51,9%, meta líquida 60,00
    const prodCelular: MarkupProductItem = {
      id: 'prod-celular',
      name: 'Celular',
      mode: 'cost_margin',
      cost: 1158.93,
      desiredNetRevenue: 2335,
      margin: 51.9,
      quantity: 22,
      desiredNetRevenueByRegime: { presumido: 2335, real: 2335, simples: 2335 },
      marginByRegime: { presumido: 51.9, real: 51.9, simples: 51.9 },
      quantityByRegime: { presumido: 22, real: 22, simples: 22 },
      salePrice: 3296.25,
      taxFactor: 0,
      completeFactor: 0,
      totalRevenue: 3296.25 * 22,
      totalCost: 1158.93 * 22,
    }

    const prodCapa: MarkupProductItem = {
      id: 'prod-capa',
      name: 'Capa',
      mode: 'cost_margin',
      cost: 30,
      desiredNetRevenue: 60,
      margin: 51.9,
      quantity: 25,
      desiredNetRevenueByRegime: { presumido: 60, real: 60, simples: 60 },
      marginByRegime: { presumido: 51.9, real: 51.9, simples: 51.9 },
      quantityByRegime: { presumido: 25, real: 25, simples: 25 },
      salePrice: 85.33,
      taxFactor: 0,
      completeFactor: 0,
      totalRevenue: 85.33 * 25,
      totalCost: 30 * 25,
    }

    const productsNormal = [prodCelular, prodCapa]
    const productsInverted = [prodCapa, prodCelular] // Ordem invertida para provar lookup por ID

    const baseParams = {
      purchasesItems: [],
      icmsRate: 18,
      customTaxesMarkup: [],
      dvRate: 5.0,
      simplesEffectiveRate: 10.0,
      calculatedPurchases: defaultCalculatedPurchases,
      totalGlobalOperatingExpenses: 1000,
      totalGlobalOperatingRevenues: 0,
      directPayrollExpenses: 1500,
      patronalCharges: 350,
      presumidoActivity: 'comercio' as const,
      realActivity: 'comercio' as const,
      presumidoIssRate: 0,
      realIssRate: 0,
      realAdditions: 0,
      realExclusions: 0,
      regimeQuantity: 47,
    }

    // Executa para a ordem normal [Celular, Capa]
    const presDataNormal = computeDreComparativeForRegime({
      ...baseParams,
      regimeKey: 'presumido',
      markupProducts: productsNormal,
    })

    // Executa para a ordem invertida [Capa, Celular]
    const presDataInverted = computeDreComparativeForRegime({
      ...baseParams,
      regimeKey: 'presumido',
      markupProducts: productsInverted,
    })

    // Prova de chaveamento por ID: a inversão da ordem NÃO altera nenhum total consolidado ou unitário
    expect(presDataNormal.quantity).toBe(47)
    expect(presDataInverted.quantity).toBe(47)
    expect(presDataNormal.costMargin.consolidated.grossRevenue).toBeCloseTo(
      presDataInverted.costMargin.consolidated.grossRevenue,
      2,
    )
    expect(presDataNormal.liquid.consolidated.grossRevenue).toBeCloseTo(
      presDataInverted.liquid.consolidated.grossRevenue,
      2,
    )
    expect(presDataNormal.costMargin.consolidated.cmv).toBeCloseTo(
      presDataInverted.costMargin.consolidated.cmv,
      2,
    )

    // CMV Consolidado deve ser rigorosamente: 22 * 1158.93 + 25 * 30 = 25496.46 + 750 = 26246.46
    // Se estivesse invertido (25 * 1158.93 + 22 * 30), daria 28973.25 + 660 = 29633.25 (erro crasso)
    const expectedCmv = 22 * 1158.93 + 25 * 30
    expect(presDataNormal.costMargin.consolidated.cmv).toBeCloseTo(expectedCmv, 2)
    expect(presDataInverted.costMargin.consolidated.cmv).toBeCloseTo(expectedCmv, 2)

    // Regressão zero nos regimes Lucro Real e Simples Nacional
    const realData = computeDreComparativeForRegime({
      ...baseParams,
      regimeKey: 'real',
      markupProducts: productsNormal,
    })
    const simplesData = computeDreComparativeForRegime({
      ...baseParams,
      regimeKey: 'simples',
      markupProducts: productsNormal,
    })

    expect(realData.quantity).toBe(47)
    expect(simplesData.quantity).toBe(47)
    expect(realData.costMargin.consolidated.cmv).toBeCloseTo(expectedCmv, 2)
    expect(simplesData.costMargin.consolidated.cmv).toBeCloseTo(expectedCmv, 2)
  })
})
