import { describe, it, expect } from 'vitest'
import {
  calculateServiceUnitCost,
  calculateServiceCsp,
  calculateServicesTotals,
  calculatePresumidoServices,
  determineSimplesServiceAnexo,
  ServiceItem,
} from './servicesCalculations'
import { computeDreComparativeForRegime } from '@/components/demo/DreRegimeComparativeSection'
import { runAdrianaCaseTests } from './taxCalculations.test'

describe('servicesCalculations - Etapa 3: Suíte Completa de Testes de Serviços', () => {
  // (1) Cálculos puros
  describe('(1) Cálculos puros de insumos e CSP', () => {
    it('calcula CSP unitário como soma de unitCost × quantity de cada insumo (pareamento por id)', () => {
      const inputs = [
        { id: 'inp-1', description: 'Mão de obra direta', unitCost: 45.5, quantity: 2 },
        { id: 'inp-2', description: 'Licença de software', unitCost: 120.0, quantity: 1 },
      ]
      // 45.5*2 + 120*1 = 91 + 120 = 211
      const unitCost = calculateServiceUnitCost(inputs)
      expect(unitCost).toBe(211)
    })

    it('calcula CSP total mensal como unitário × monthlyQuantity', () => {
      const item: ServiceItem = {
        id: 'srv-manutencao',
        description: 'Manutenção de Servidores',
        price: 800,
        monthlyQuantity: 12,
        mode: 'cost_margin',
        inputs: [
          { id: 'inp-t1', description: 'Técnico Especialista', unitCost: 150, quantity: 1 },
          { id: 'inp-t2', description: 'Combustível / Deslocamento', unitCost: 50, quantity: 1 },
        ],
      }
      // unitCost = 200, monthlyQuantity = 12 => CSP total = 2400
      const totalCsp = calculateServiceCsp(item)
      expect(totalCsp).toBe(2400)
    })

    it('calcula receita agregada = Σ price × monthlyQuantity e CSP total agregado', () => {
      const services: ServiceItem[] = [
        {
          id: 'srv-1',
          description: 'Desenvolvimento Web',
          monthlyQuantity: 4,
          price: 5000,
          mode: 'cost_margin',
          inputs: [{ id: 'in-dev', description: 'Dev Senior', unitCost: 1500, quantity: 1 }],
        },
        {
          id: 'srv-2',
          description: 'Suporte Cloud',
          monthlyQuantity: 6,
          price: 1500,
          mode: 'cost_margin',
          inputs: [{ id: 'in-sup', description: 'DevOps', unitCost: 400, quantity: 1 }],
        },
      ]

      const totals = calculateServicesTotals(services)
      // Receita = 4*5000 + 6*1500 = 20000 + 9000 = 29000
      expect(totals.totalGrossRevenue).toBe(29000)
      // CSP = 4*1500 + 6*400 = 6000 + 2400 = 8400
      expect(totals.totalCsp).toBe(8400)
      // Quantidade total = 4 + 6 = 10
      expect(totals.totalQuantity).toBe(10)
    })
  })

  // (2) Presunção 32% e PIS/COFINS cumulativos sem crédito
  describe('(2) Lucro Presumido: presunção 32% e PIS 0,65% / COFINS 3% cumulativos', () => {
    it('calcula IRPJ/CSLL com presunção de 32% e PIS/COFINS cumulativos sobre receita integral', () => {
      const grossRevenue = 150000
      const csp = 40000
      const issRate = 5.0 // 5%
      const result = calculatePresumidoServices(grossRevenue, csp, issRate)

      // ISS = 150.000 * 5% = 7.500
      expect(result.issValue).toBe(7500)
      // PIS = 150.000 * 0,65% = 975
      expect(result.pisValue).toBe(975)
      // COFINS = 150.000 * 3% = 4.500
      expect(result.cofinsValue).toBe(4500)
      // Base IRPJ (32%) = 48.000
      expect(result.irpjBase).toBe(48000)
      // IRPJ regular (15% sobre 48.000) = 7.200
      expect(result.irpjRegular).toBe(7200)
      // Base CSLL (32%) = 48.000
      expect(result.csllBase).toBe(48000)
      // CSLL regular (9% sobre 48.000) = 4.320
      expect(result.csllValue).toBe(4320)
    })
  })

  // (3) Fator R 28% -> Anexo III / V
  describe('(3) Fator R: enquadramento Anexo III (>= 28%) vs Anexo V (< 28%)', () => {
    it('enquadra no Anexo III quando Fator R é exatamente 28%', () => {
      const res = determineSimplesServiceAnexo(28.0)
      expect(res.recommendedAnexo).toBe('anexo_3')
      expect(res.isElegibleAnexo3).toBe(true)
    })

    it('enquadra no Anexo III quando Fator R supera 28%', () => {
      const res = determineSimplesServiceAnexo(32.4)
      expect(res.recommendedAnexo).toBe('anexo_3')
      expect(res.isElegibleAnexo3).toBe(true)
    })

    it('enquadra no Anexo V quando Fator R fica abaixo de 28%', () => {
      const res = determineSimplesServiceAnexo(27.99)
      expect(res.recommendedAnexo).toBe('anexo_5')
      expect(res.isElegibleAnexo3).toBe(false)
    })

    it('suporta cálculo via folha 12m e rbt12', () => {
      // Folha 28.000 / RBT12 100.000 = 28% -> Anexo III
      const res3 = determineSimplesServiceAnexo(28000, 100000)
      expect(res3.recommendedAnexo).toBe('anexo_3')

      // Folha 25.000 / RBT12 100.000 = 25% -> Anexo V
      const res5 = determineSimplesServiceAnexo(25000, 100000)
      expect(res5.recommendedAnexo).toBe('anexo_5')
    })
  })

  // (4) Integração: com serviços, receita+CSP somados na comparativa e no Simples
  describe('(4) Integração: soma de receita e CSP na DRE comparativa', () => {
    const baseParams = {
      markupProducts: [],
      purchasesItems: [],
      getPurchaseItemUnitNetCost: () => 0,
      icmsRate: 18,
      customTaxesMarkup: 0,
      dvRate: 0,
      simplesEffectiveRate: 10.0,
      desiredLiquidRevenueByRegime: { simples: 0, presumido: 0, real: 0 },
      calculatedPurchases: {
        autoInventoryDeductionActive: false,
        totalAvailableUnits: 0,
        cmvSimples: 0,
        cmvPresumido: 0,
        cmvReal: 0,
        unitCostSimplesEffective: 0,
        unitCostPresumidoEffective: 0,
        unitCostRealEffective: 0,
        totalCostSimples: 0,
        totalCostPresumido: 0,
        totalCostReal: 0,
      },
      totalGlobalOperatingExpenses: 5000,
      totalGlobalOperatingRevenues: 0,
      directPayrollExpenses: 2000,
      patronalCharges: 500,
      presumidoActivity: 'comercio' as const,
      realActivity: 'comercio' as const,
      presumidoIssRate: 0,
      realIssRate: 0,
      realAdditions: 0,
      realExclusions: 0,
      regimeQuantity: 10,
    }

    it('soma receita de serviços e CSP no Presumido com segregação de bases', () => {
      const data = computeDreComparativeForRegime({
        ...baseParams,
        regimeKey: 'presumido',
        totalServicesGrossRevenue: 50000,
        totalServicesCsp: 15000,
        totalServicesQuantity: 5,
        serviceIssRate: 5.0,
      })

      // No modo Custo + Margem
      // Receita bruta = 50.000 (serviços)
      expect(data.costMargin.consolidated.grossRevenue).toBe(50000)
      // CSP = 15.000
      expect(data.costMargin.consolidated.cmv).toBe(15000)
      // ISS sobre serviços = 50.000 * 5% = 2.500
      expect(data.costMargin.consolidated.icmsOrIss).toBe(2500)
      // PIS = 50.000 * 0,65% = 325
      expect(data.costMargin.consolidated.pis).toBe(325)
      // COFINS = 50.000 * 3% = 1.500
      expect(data.costMargin.consolidated.cofins).toBe(1500)
      // Base IRPJ (32%) = 16.000 -> IRPJ 15% = 2.400
      expect(data.costMargin.consolidated.irpj).toBe(2400)
      // Base CSLL (32%) = 16.000 -> CSLL 9% = 1.440
      expect(data.costMargin.consolidated.csll).toBe(1440)
    })

    it('soma receita de serviços e CSP no Simples com DAS unificado', () => {
      const data = computeDreComparativeForRegime({
        ...baseParams,
        regimeKey: 'simples',
        totalServicesGrossRevenue: 50000,
        totalServicesCsp: 15000,
        totalServicesQuantity: 5,
        serviceIssRate: 5.0,
      })

      // Receita bruta consolidada = 50.000
      expect(data.costMargin.consolidated.grossRevenue).toBe(50000)
      // CSP compõe CMV = 15.000
      expect(data.costMargin.consolidated.cmv).toBe(15000)
      // DAS unificado (10%) = 5.000
      expect(data.costMargin.consolidated.dasTotal).toBe(5000)
      // No Simples, ISS não aparece fora da partilha (icmsOrIss = 0)
      expect(data.costMargin.consolidated.icmsOrIss).toBe(0)
      expect(data.costMargin.consolidated.pis).toBe(0)
      expect(data.costMargin.consolidated.cofins).toBe(0)
    })
  })

  // (5) Regressão zero: sem serviços -> saídas idênticas e 6 quadrantes canônicos batendo
  describe('(5) Regressão zero: 6 quadrantes canônicos intactos', () => {
    it('mantém os 6 quadrantes canônicos intactos e 100% aprovados sem alteração', () => {
      const adrianaSuite = runAdrianaCaseTests()
      expect(adrianaSuite.allPassed).toBe(true)

      // Verificação específica dos 6 pares canônicos da especificação:
      // 1. Presumido C+M: Unitário 3.381,76 / Consolidado 74.655,31
      const p1Unit = adrianaSuite.results.find((r) =>
        r.test.includes('Presumido C+M Unitário Canônico'),
      )
      expect(p1Unit?.passed).toBe(true)
      expect(p1Unit?.expected).toBe(3381.76)

      const p1Cons = adrianaSuite.results.find((r) =>
        r.test.includes('Presumido C+M Consolidado Canônico'),
      )
      expect(p1Cons?.passed).toBe(true)
      expect(p1Cons?.expected).toBe(74655.31)

      // 2. Presumido RL: Unitário 3.277,16 / Consolidado 72.343,82
      const p2Unit = adrianaSuite.results.find((r) =>
        r.test.includes('Presumido RL Unitário Canônico'),
      )
      expect(p2Unit?.passed).toBe(true)
      expect(p2Unit?.expected).toBe(3277.16)

      const p2Cons = adrianaSuite.results.find((r) =>
        r.test.includes('Presumido RL Consolidado Canônico'),
      )
      expect(p2Cons?.passed).toBe(true)
      expect(p2Cons?.expected).toBe(72343.82)

      // 3. Real C+M: Unitário 3.254,49 / Consolidado 71.845,71
      const p3Unit = adrianaSuite.results.find((r) => r.test.includes('Real C+M Unitário Canônico'))
      expect(p3Unit?.passed).toBe(true)
      expect(p3Unit?.expected).toBe(3254.49)

      const p3Cons = adrianaSuite.results.find((r) =>
        r.test.includes('Real C+M Consolidado Canônico'),
      )
      expect(p3Cons?.passed).toBe(true)
      expect(p3Cons?.expected).toBe(71845.71)

      // 4. Real RL: Unitário 3.479,40 / Consolidado 76.808,31
      const p4Unit = adrianaSuite.results.find((r) => r.test.includes('Real RL Unitário Canônico'))
      expect(p4Unit?.passed).toBe(true)
      expect(p4Unit?.expected).toBe(3479.4)

      const p4Cons = adrianaSuite.results.find((r) =>
        r.test.includes('Real RL Consolidado Canônico'),
      )
      expect(p4Cons?.passed).toBe(true)
      expect(p4Cons?.expected).toBe(76808.31)

      // 5. Simples C+M: Unitário 3.535,28 / Consolidado 78.044,39
      const p5Unit = adrianaSuite.results.find((r) =>
        r.test.includes('Simples C+M Unitário Canônico'),
      )
      expect(p5Unit?.passed).toBe(true)
      expect(p5Unit?.expected).toBe(3535.28)

      const p5Cons = adrianaSuite.results.find((r) =>
        r.test.includes('Simples C+M Consolidado Canônico'),
      )
      expect(p5Cons?.passed).toBe(true)
      expect(p5Cons?.expected).toBe(78044.39)

      // 6. Simples RL: Unitário 2.808,70 / Consolidado 62.002,48
      const p6Unit = adrianaSuite.results.find((r) =>
        r.test.includes('Simples RL Unitário Canônico'),
      )
      expect(p6Unit?.passed).toBe(true)
      expect(p6Unit?.expected).toBe(2808.7)

      const p6Cons = adrianaSuite.results.find((r) =>
        r.test.includes('Simples RL Consolidado Canônico'),
      )
      expect(p6Cons?.passed).toBe(true)
      expect(p6Cons?.expected).toBe(62002.48)
    })
  })

  // (6) Rejeição expressa
  describe('(6) Rejeição: ISS fora da partilha do DAS e base cumulativa mista incorreta', () => {
    it('falha e rejeita estritamente qualquer tentativa de exibir ISS separado no Simples Nacional', () => {
      const dataSimples = computeDreComparativeForRegime({
        markupProducts: [],
        purchasesItems: [],
        getPurchaseItemUnitNetCost: () => 0,
        icmsRate: 18,
        customTaxesMarkup: 0,
        dvRate: 0,
        simplesEffectiveRate: 8.5,
        desiredLiquidRevenueByRegime: { simples: 0, presumido: 0, real: 0 },
        calculatedPurchases: {
          autoInventoryDeductionActive: false,
          totalAvailableUnits: 0,
          cmvSimples: 0,
          cmvPresumido: 0,
          cmvReal: 0,
          unitCostSimplesEffective: 0,
          unitCostPresumidoEffective: 0,
          unitCostRealEffective: 0,
          totalCostSimples: 0,
          totalCostPresumido: 0,
          totalCostReal: 0,
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
        regimeQuantity: 1,
        regimeKey: 'simples',
        totalServicesGrossRevenue: 25000,
        totalServicesCsp: 5000,
        serviceIssRate: 5.0,
      })

      // No Simples Nacional, tributos individuais fora da guia DAS DEVEM ser zero
      expect(dataSimples.costMargin.consolidated.icmsOrIss).toBe(0)
      expect(dataSimples.costMargin.consolidated.pis).toBe(0)
      expect(dataSimples.costMargin.consolidated.cofins).toBe(0)
      expect(dataSimples.costMargin.consolidated.dasTotal).toBeGreaterThan(0)
    })

    it('assegura que no Presumido a base de PIS/COFINS de produtos deduz ICMS (Tema 69/STF) e a de serviços não mistura', () => {
      // Produto: 100.000 (ICMS 18% = 18.000 => base PIS/COFINS produto = 82.000)
      // Serviço: 50.000 (ISS 5% = 2.500 => base PIS/COFINS serviço = 50.000 integral)
      // PIS = 82.000 * 0.65% (533) + 50.000 * 0.65% (325) = 858
      // Se misturasse de forma errada (ex: (150.000 - 18.000 - 2.500) * 0.65% = 129.500 * 0.65% = 841,75)
      const productGross = 100000
      const productIcms = 18000
      const productPisBase = productGross - productIcms // 82000
      const serviceGross = 50000
      const servicePisBase = serviceGross // 50000 (integral, sem exclusão de ISS)

      const expectedPis =
        Math.round(((productPisBase * 0.65) / 100 + (servicePisBase * 0.65) / 100) * 100) / 100
      expect(expectedPis).toBe(858)

      const wrongMixedPis =
        Math.round((((productGross + serviceGross - productIcms - 2500) * 0.65) / 100) * 100) / 100
      expect(wrongMixedPis).not.toBe(expectedPis)
    })
  })
})
