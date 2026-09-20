import { describe, it, expect } from 'vitest'
import {
  calculateMarkupProductsCanonically,
  MarkupProductItem,
  TaxRegime,
} from '@/contexts/TaxContext'
import { computeDreComparativeForRegime } from '@/components/demo/DreRegimeComparativeSection'

describe('Blindagem Formal: Card ↔ Memória ↔ DRE (Igualdade ao Centavo nos 3 Regimes)', () => {
  // Fixture canônico "Caso Adriana":
  // Celular Samsung: custo R$ 1.158,93, margem 51,9%, receita líquida alvo R$ 2.335,00, qtd 22
  // Capa Protetora: custo R$ 30,00, margem 51,9%, receita líquida alvo R$ 60,00, qtd 25
  // ICMS 18%, DV 5%, Simples Anexo I com RBT12 R$ 180.000 → DAS 4%
  const makeAdrianaFixture = (mode: 'cost_margin' | 'liquid'): MarkupProductItem[] => [
    {
      id: 'prod-celular-samsung',
      name: 'Celular Samsung',
      mode,
      cost: 1158.93,
      desiredNetRevenue: 2335.0,
      margin: 51.9,
      quantity: 22,
      desiredNetRevenueByRegime: { presumido: 2335.0, real: 2335.0, simples: 2335.0 },
      marginByRegime: { presumido: 51.9, real: 51.9, simples: 51.9 },
      quantityByRegime: { presumido: 22, real: 22, simples: 22 },
      salePrice: 0,
      taxFactor: 0,
      completeFactor: 0,
      totalRevenue: 0,
      totalCost: 0,
    },
    {
      id: 'prod-capa-protetora',
      name: 'Capa Protetora',
      mode,
      cost: 30.0,
      desiredNetRevenue: 60.0,
      margin: 51.9,
      quantity: 25,
      desiredNetRevenueByRegime: { presumido: 60.0, real: 60.0, simples: 60.0 },
      marginByRegime: { presumido: 51.9, real: 51.9, simples: 51.9 },
      quantityByRegime: { presumido: 25, real: 25, simples: 25 },
      salePrice: 0,
      taxFactor: 0,
      completeFactor: 0,
      totalRevenue: 0,
      totalCost: 0,
    },
  ]

  const engineParams = {
    icmsRate: 18,
    dvRate: 5.0,
    customTaxes: [],
    simplesAnexo: 'anexo_1' as const,
    effectiveSimplesRbt12: 180000, // 1ª faixa Anexo I: 4,00%
  }

  const baseDreParams = {
    purchasesItems: [],
    icmsRate: 18,
    customTaxesMarkup: [],
    dvRate: 5.0,
    simplesEffectiveRate: 4.0,
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
    presumidoActivity: 'comercio' as const,
    realActivity: 'comercio' as const,
    presumidoIssRate: 0,
    realIssRate: 0,
    realAdditions: 0,
    realExclusions: 0,
    regimeQuantity: 47,
  }

  const regimes: TaxRegime[] = ['presumido', 'real', 'simples']
  const modes: ('cost_margin' | 'liquid')[] = ['cost_margin', 'liquid']

  /**
   * Helper para extrair o preço de venda renderizado no Bloco ⑩ da Memória
   * conforme a lógica de src/components/demo/MarkupCalculationMemoryModal.tsx:
   * canonicalSalePrice[Regime] = product.salePriceByRegime?.[regime] ??
   *   (isLiquid ? product.salePriceLiquidByRegime?.[regime] : product.salePriceCostMarginByRegime?.[regime])
   */
  const getMemoryBlock10Price = (
    product: MarkupProductItem,
    regime: TaxRegime,
    mode: 'cost_margin' | 'liquid',
  ): number => {
    const isLiquid = mode === 'liquid'
    const canonicalPrice =
      product.salePriceByRegime?.[regime] ??
      (isLiquid
        ? product.salePriceLiquidByRegime?.[regime]
        : product.salePriceCostMarginByRegime?.[regime]) ??
      0
    return canonicalPrice
  }

  /**
   * Helper para extrair o preço exibido no Card do Topo do Markup:
   * prod.salePriceByRegime?.[regime] || prod.salePrice
   * quando calculado com activeRegime = regime
   */
  const getCardPrice = (product: MarkupProductItem, regime: TaxRegime): number => {
    return (
      (product.salePriceByRegime && product.salePriceByRegime[regime] > 0
        ? product.salePriceByRegime[regime]
        : product.salePrice) || 0
    )
  }

  describe.each(modes)('Modo de Precificação: %s', (mode) => {
    describe.each(regimes)('Regime: %s', (regime) => {
      it(`garante igualdade ao centavo (zero tolerância) entre Card ↔ Memória ↔ DRE para cada produto`, () => {
        // 1. Roda o motor canônico da Calculadora de Markup configurando o regime ativo
        const rawProducts = makeAdrianaFixture(mode)
        const calculatedProducts = calculateMarkupProductsCanonically(rawProducts, {
          ...engineParams,
          regime,
        })

        // 2. Apura a DRE comparativa para o regime usando os produtos calculados
        const dreData = computeDreComparativeForRegime({
          ...baseDreParams,
          regimeKey: regime,
          markupProducts: calculatedProducts,
        })

        // A DRE do modo ativo armazena a soma dos unitários em dreData[mode].unit.grossRevenue
        let dreSumUnitGrossCentavos = 0

        for (const product of calculatedProducts) {
          // (a) Preço exibido no Card
          const cardPrice = getCardPrice(product, regime)
          const cardCentavos = Math.round(cardPrice * 100)

          // (b) Preço exibido no Bloco ⑩ da Memória
          const memoryPrice = getMemoryBlock10Price(product, regime, mode)
          const memoryCentavos = Math.round(memoryPrice * 100)

          // (c) Preço unitário da DRE deste produto específico
          const dreUnitProductPrice =
            mode === 'cost_margin'
              ? (product.salePriceCostMarginByRegime?.[regime] ?? 0)
              : (product.salePriceLiquidByRegime?.[regime] ?? 0)
          const dreUnitCentavos = Math.round(dreUnitProductPrice * 100)

          // Blindagem de integridade: Card ↔ Memória ↔ DRE para cada produto individual
          expect(cardCentavos).toBeGreaterThan(0)
          expect(memoryCentavos).toBeGreaterThan(0)
          expect(dreUnitCentavos).toBeGreaterThan(0)

          // Igualdade exata ao centavo: expect(card).toBe(memoria), expect(memoria).toBe(dre)
          expect(cardCentavos).toBe(memoryCentavos)
          expect(memoryCentavos).toBe(dreUnitCentavos)

          dreSumUnitGrossCentavos += dreUnitCentavos
        }

        // Validação adicional: A linha unitária de Receita Bruta da DRE deve coincidir exatamente
        // com a soma dos unitários dos produtos da cesta
        const dreUnitTotalCentavos = Math.round(dreData[mode].unit.grossRevenue * 100)
        expect(dreUnitTotalCentavos).toBe(dreSumUnitGrossCentavos)
      })
    })
  })

  it('Verificação dos valores canônicos exatos de Adriana nos 3 regimes (centavo a centavo)', () => {
    // Modo Custo + Margem
    const costProducts = calculateMarkupProductsCanonically(makeAdrianaFixture('cost_margin'), {
      ...engineParams,
      regime: 'presumido',
    })
    const [celCost, capaCost] = costProducts

    // Presumido C+M
    expect(celCost.salePriceCostMarginByRegime?.presumido).toBe(3296.23)
    expect(capaCost.salePriceCostMarginByRegime?.presumido).toBe(85.53)

    // Real C+M
    expect(celCost.salePriceCostMarginByRegime?.real).toBe(3172.18)
    expect(capaCost.salePriceCostMarginByRegime?.real).toBe(82.31)

    // Simples C+M
    expect(celCost.salePriceCostMarginByRegime?.simples).toBe(3445.87)
    expect(capaCost.salePriceCostMarginByRegime?.simples).toBe(89.41)

    // Modo Receita Líquida
    const liquidProducts = calculateMarkupProductsCanonically(makeAdrianaFixture('liquid'), {
      ...engineParams,
      regime: 'presumido',
    })
    const [celLiq, capaLiq] = liquidProducts

    // Presumido RL
    expect(celLiq.salePriceLiquidByRegime?.presumido).toBe(3195.06)
    expect(capaLiq.salePriceLiquidByRegime?.presumido).toBe(82.1)

    // Real RL
    expect(celLiq.salePriceLiquidByRegime?.real).toBe(3392.23)
    expect(capaLiq.salePriceLiquidByRegime?.real).toBe(87.17)

    // Simples RL
    expect(celLiq.salePriceLiquidByRegime?.simples).toBe(2738.34)
    expect(capaLiq.salePriceLiquidByRegime?.simples).toBe(70.36)
  })
})
