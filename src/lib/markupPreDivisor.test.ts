import { describe, it, expect } from 'vitest'
import {
  calcularMarkupDivisorPre,
  precoPeloDivisorPre,
  decomporPrecoVendaPre,
  PIS_PRESUMIDO_PCT,
  COFINS_PRESUMIDO_PCT,
  PIS_COFINS_PRESUMIDO_PCT,
} from '@/lib/markupPreDivisor'
import { calculateMarkupProductsCanonically, MarkupProductItem } from '@/contexts/TaxContext'

describe('Motor de Markup Pré-Reforma — Divisor Aditivo e Cenário Controlado', () => {
  /**
   * Cenário Controlado da Tarefa:
   * ICMS 17%, PIS 0,65%, COFINS 3,00%, DV 4% (todos % sobre PV).
   * Fórmula aditiva: Divisor = 1 − (0,17 + 0,0065 + 0,03 + 0,04 + Margem)
   *
   * Item 1: custo 434,60, margem 35%
   *   Soma parcelas = 0,17 + 0,0365 + 0,04 + 0,35 = 0,5965
   *   Divisor = 1 − 0,5965 = 0,4035
   *   PV = 434,60 ÷ 0,4035 = 1.077,075588... → 1.077,08 (não 870,91 da multiplicativa)
   *
   * Item 2: custo 467,40, margem 50%
   *   Soma parcelas = 0,17 + 0,0365 + 0,04 + 0,50 = 0,7465
   *   Divisor = 1 − 0,7465 = 0,2535
   *   PV = 467,40 ÷ 0,2535 = 1.843,786982... → 1.843,79
   *
   * Item 3: custo 328,00, margem 40%
   *   Soma parcelas = 0,17 + 0,0365 + 0,04 + 0,40 = 0,6465
   *   Divisor = 1 − 0,6465 = 0,3535
   *   PV = 328,00 ÷ 0,3535 = 927,864214... → 927,86
   */
  describe('Cenário Controlado dos 3 Itens', () => {
    it('Item 1: custo R$ 434,60, margem 35% → divisor 0,4035 e PV R$ 1.077,08', () => {
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 17,
        customTaxesPct: [],
        dvRatePct: 4,
        marginPct: 35,
        comMargem: true,
      })

      expect(res.somaTributosPct).toBeCloseTo(20.65, 4) // 17 + 0.65 + 3.0
      expect(res.somaDeducoesPct).toBeCloseTo(59.65, 4) // 20.65 + 4 + 35
      expect(res.divisor).toBeCloseTo(0.4035, 6)

      const pv = precoPeloDivisorPre(434.6, res.divisor)
      expect(pv).toBe(1077.08)
    })

    it('Item 2: custo R$ 467,40, margem 50% → divisor 0,2535 e PV R$ 1.843,79', () => {
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 17,
        customTaxesPct: [],
        dvRatePct: 4,
        marginPct: 50,
        comMargem: true,
      })

      expect(res.somaDeducoesPct).toBeCloseTo(74.65, 4)
      expect(res.divisor).toBeCloseTo(0.2535, 6)

      const pv = precoPeloDivisorPre(467.4, res.divisor)
      expect(pv).toBe(1843.79)
    })

    it('Item 3: custo R$ 328,00, margem 40% → divisor 0,3535 e PV R$ 927,86', () => {
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 17,
        customTaxesPct: [],
        dvRatePct: 4,
        marginPct: 40,
        comMargem: true,
      })

      expect(res.somaDeducoesPct).toBeCloseTo(64.65, 4)
      expect(res.divisor).toBeCloseTo(0.3535, 6)

      const pv = precoPeloDivisorPre(328.0, res.divisor)
      expect(pv).toBe(927.86)
    })
  })

  describe('Identidade Contábil e Decomposição no Preço de Venda Bruto', () => {
    it('fecha a identidade Custo + Tributos + DV + Lucro = Preço de Venda Bruto para o Item 1', () => {
      const custo = 434.6
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 17,
        customTaxesPct: [],
        dvRatePct: 4,
        marginPct: 35,
        comMargem: true,
      })
      const pv = precoPeloDivisorPre(custo, res.divisor)
      const decomp = decomporPrecoVendaPre(pv, custo, res)

      // Identidade fundamental
      expect(decomp.diferencaCentavos).toBe(0)
      expect(decomp.somaComponentes).toBe(pv)

      // Margem obtida = Lucro ÷ PV
      expect(decomp.margemEfetivaPct).toBeCloseTo(35.0, 1)
      expect(decomp.valorLucroMargem).toBeCloseTo(pv * 0.35, 1)

      // Soma das partes igual ao PV
      const somaPartes =
        Math.round(
          (decomp.custoUnitario + decomp.valorTributos + decomp.valorDv + decomp.valorLucroMargem) *
            100,
        ) / 100
      expect(somaPartes).toBe(pv)
    })

    it('no Lucro Real e no Simples Nacional também satisfaz a identidade', () => {
      // Lucro Real
      const resReal = calcularMarkupDivisorPre({
        regime: 'real',
        icmsRatePct: 18,
        customTaxesPct: [],
        dvRatePct: 5,
        marginPct: 30,
        comMargem: true,
      })
      const pvReal = precoPeloDivisorPre(500, resReal.divisor)
      const decompReal = decomporPrecoVendaPre(pvReal, 500, resReal)
      expect(decompReal.diferencaCentavos).toBe(0)
      expect(decompReal.somaComponentes).toBe(pvReal)

      // Simples Nacional
      const resSimples = calcularMarkupDivisorPre({
        regime: 'simples',
        dasEfetivoPct: 4.0,
        dvRatePct: 3,
        marginPct: 25,
        comMargem: true,
      })
      const pvSimples = precoPeloDivisorPre(200, resSimples.divisor)
      const decompSimples = decomporPrecoVendaPre(pvSimples, 200, resSimples)
      expect(decompSimples.diferencaCentavos).toBe(0)
      expect(decompSimples.somaComponentes).toBe(pvSimples)
    })
  })

  describe('Casos de Borda e Regras de Segurança', () => {
    it('duas DVs de 2% somam aditivamente 4% no divisor (não 3,96% da fórmula multiplicativa)', () => {
      // Multiplicativo antigo: (1 - 0.02) * (1 - 0.02) = 0.9604 → dedução 3,96%
      // Motor aditivo novo: 2% + 2% = 4% de dedução total sobre PV
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        customTaxesPct: [],
        dvRatePct: 2 + 2, // 4.0%
        marginPct: 0,
        comMargem: false,
      })

      // Soma = 18% (ICMS) + 3.65% (PIS/COFINS) + 4% (DV) = 25.65%
      expect(res.somaDeducoesPct).toBeCloseTo(25.65, 4)
      expect(res.divisor).toBeCloseTo(1 - 0.2565, 6)
      expect(res.divisor).toBeCloseTo(0.7435, 6)
    })

    it('margem 0%: divisor = 1 − (Tributos + DV)', () => {
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 17,
        customTaxesPct: [],
        dvRatePct: 4,
        marginPct: 0,
        comMargem: true,
      })

      // Soma = 17 + 3.65 + 4 = 24.65%
      expect(res.divisor).toBeCloseTo(1 - 0.2465, 6)
      expect(res.divisor).toBeCloseTo(0.7535, 6)
      const pv = precoPeloDivisorPre(100, res.divisor)
      expect(pv).toBeCloseTo(100 / 0.7535, 2)
    })

    it('divisor zero ou negativo: sem preço positivo possível (retorna 0 e valido false)', () => {
      // Soma parcelas >= 100%
      const resInviavel = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 20,
        customTaxesPct: [],
        dvRatePct: 15,
        marginPct: 70, // 20 + 3.65 + 15 + 70 = 108.65%
        comMargem: true,
      })

      expect(resInviavel.valido).toBe(false)
      expect(resInviavel.divisor).toBeLessThanOrEqual(0)
      expect(precoPeloDivisorPre(100, resInviavel.divisor)).toBe(0)
    })

    it('custo zero ou negativo: preço resultante é 0', () => {
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 17,
        dvRatePct: 4,
        marginPct: 35,
        comMargem: true,
      })
      expect(precoPeloDivisorPre(0, res.divisor)).toBe(0)
      expect(precoPeloDivisorPre(-50, res.divisor)).toBe(0)
    })
  })

  describe('Integração com calculateMarkupProductsCanonically (TaxContext)', () => {
    it('calcula o cenário controlado dos 3 produtos através do TaxContext com precisão ao centavo', () => {
      const produtosControlados: MarkupProductItem[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          mode: 'cost_margin',
          cost: 434.6,
          desiredNetRevenue: 0,
          margin: 35,
          quantity: 10,
          marginByRegime: { presumido: 35, real: 35, simples: 35 },
          quantityByRegime: { presumido: 10, real: 10, simples: 10 },
          salePrice: 0,
          taxFactor: 0,
          completeFactor: 0,
          totalRevenue: 0,
          totalCost: 0,
        },
        {
          id: 'item-2',
          name: 'Item 2',
          mode: 'cost_margin',
          cost: 467.4,
          desiredNetRevenue: 0,
          margin: 50,
          quantity: 5,
          marginByRegime: { presumido: 50, real: 50, simples: 50 },
          quantityByRegime: { presumido: 5, real: 5, simples: 5 },
          salePrice: 0,
          taxFactor: 0,
          completeFactor: 0,
          totalRevenue: 0,
          totalCost: 0,
        },
        {
          id: 'item-3',
          name: 'Item 3',
          mode: 'cost_margin',
          cost: 328.0,
          desiredNetRevenue: 0,
          margin: 40,
          quantity: 8,
          marginByRegime: { presumido: 40, real: 40, simples: 40 },
          quantityByRegime: { presumido: 8, real: 8, simples: 8 },
          salePrice: 0,
          taxFactor: 0,
          completeFactor: 0,
          totalRevenue: 0,
          totalCost: 0,
        },
      ]

      const resultado = calculateMarkupProductsCanonically(produtosControlados, {
        regime: 'presumido',
        icmsRate: 17,
        dvRate: 4,
        customTaxes: [],
        simplesAnexo: 'anexo_1',
        effectiveSimplesRbt12: 180000,
      })

      const [p1, p2, p3] = resultado

      // Preços unitários
      expect(p1.salePrice).toBe(1077.08)
      expect(p2.salePrice).toBe(1843.79)
      expect(p3.salePrice).toBe(927.86)

      // Divisores completos (com margem)
      expect(p1.completeFactor).toBeCloseTo(0.4035, 4)
      expect(p2.completeFactor).toBeCloseTo(0.2535, 4)
      expect(p3.completeFactor).toBeCloseTo(0.3535, 4)

      // Subtotais de receita por item
      expect(p1.totalRevenue).toBe(Math.round(1077.08 * 10 * 100) / 100) // 10.770,80
      expect(p2.totalRevenue).toBe(Math.round(1843.79 * 5 * 100) / 100) // 9.218,95
      expect(p3.totalRevenue).toBe(Math.round(927.86 * 8 * 100) / 100) // 7.422,88

      // Subtotais de custo
      expect(p1.totalCost).toBe(4346.0)
      expect(p2.totalCost).toBe(2337.0)
      expect(p3.totalCost).toBe(2624.0)

      // Consistência de salePriceCostMarginByRegime
      expect(p1.salePriceCostMarginByRegime?.presumido).toBe(1077.08)
      expect(p2.salePriceCostMarginByRegime?.presumido).toBe(1843.79)
      expect(p3.salePriceCostMarginByRegime?.presumido).toBe(927.86)
    })

    it('Cenário Canônico Adriana (Print Bug R$ 668,79 corrigido para R$ 844,27 com divisor 0,3885)', () => {
      // Custo: 328,00, ICMS: 18%, PIS: 0,65%, COFINS: 3,00%, DV: 4,50%, Margem: 35% sobre PV bruto
      // Tributos = 18 + 0,65 + 3,00 = 21,65%
      // Divisor = 1 - (0,2165 + 0,045 + 0,35) = 0,3885
      // Preço esperado = 328 / 0,3885 = 844,2728... -> 844,27
      const produtosAdriana: MarkupProductItem[] = [
        {
          id: 'item-adriana-print',
          name: 'Item do Print Adriana',
          mode: 'cost_margin',
          cost: 328.0,
          desiredNetRevenue: 0,
          margin: 35,
          quantity: 1,
          marginByRegime: { presumido: 35, real: 35, simples: 35 },
          quantityByRegime: { presumido: 1, real: 1, simples: 1 },
          salePrice: 0,
          taxFactor: 0,
          completeFactor: 0,
          totalRevenue: 0,
          totalCost: 0,
        },
      ]

      const resultado = calculateMarkupProductsCanonically(produtosAdriana, {
        regime: 'presumido',
        icmsRate: 18,
        dvRate: 4.5,
        customTaxes: [],
        simplesAnexo: 'anexo_1',
        effectiveSimplesRbt12: 180000,
      })

      const [p] = resultado

      // 1. Divisor exibido deve ser 0,3885
      expect(p.completeFactor).toBeCloseTo(0.3885, 4)

      // 2. Preço de venda unitário deve ser R$ 844,27 (NUNCA R$ 668,79)
      expect(p.salePrice).toBe(844.27)
      expect(p.salePriceCostMarginByRegime?.presumido).toBe(844.27)

      // 3. Decomposição com a função decomporPrecoVendaPre
      const divisorRes = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        dvRatePct: 4.5,
        marginPct: 35,
        comMargem: true,
      })
      const dec = decomporPrecoVendaPre(p.salePrice, p.cost, divisorRes)
      expect(dec.precoVenda).toBe(844.27)
      expect(dec.custoUnitario).toBe(328.0)
      // Tributos: 844,27 * (18% + 0,65% + 3%) = 151,97 + 5,49 + 25,33 = 182,79
      expect(dec.valorTributos).toBe(182.79)
      // DV: 844,27 * 4,5% = 37,99
      expect(dec.valorDv).toBe(37.99)
      // Lucro / Margem: 844,27 - 328 - 182,79 - 37,99 = 295,49
      // Margem efetiva: 295,49 / 844,27 = 35,00%
      expect(dec.valorLucroMargem).toBe(295.49)
      expect(dec.margemEfetivaPct).toBeCloseTo(35.0, 1)
      expect(dec.somaComponentes).toBe(844.27)
      expect(dec.diferencaCentavos).toBe(0)
    })

    it('Cenário de Patinete e Bicicleta (Prints do Usuário no Lucro Presumido)', () => {
      // Patinete: Custo R$ 410,00, Margem 52%, DV 4,50%, ICMS 18%, PIS 0,65%, COFINS 3,00%
      // Soma tributos: 21,65%
      // Divisor: 1 - (0,2165 + 0,045 + 0,52) = 0,2185
      // Preço: 410 / 0,2185 = 1.876,43
      // Tributos sobre PV: 1.876,43 * 21,65% = 406,25 (conciliado com card Composição dos Tributos)
      //
      // Bicicleta: Custo R$ 246,00, Margem 48%, DV 4,50%, ICMS 18%, PIS 0,65%, COFINS 3,00%
      // Soma tributos: 21,65%
      // Divisor: 1 - (0,2165 + 0,045 + 0,48) = 0,2585
      // Preço: 246 / 0,2585 = 951,64
      // Tributos sobre PV: 951,64 * 21,65% = 206,03 (conciliado com card Composição dos Tributos)
      const produtosPrints: MarkupProductItem[] = [
        {
          id: 'patinete',
          name: 'Patinete',
          mode: 'cost_margin',
          cost: 410.0,
          desiredNetRevenue: 0,
          margin: 52,
          quantity: 1,
          marginByRegime: { presumido: 52, real: 52, simples: 52 },
          quantityByRegime: { presumido: 1, real: 1, simples: 1 },
          salePrice: 0,
          taxFactor: 0,
          completeFactor: 0,
          totalRevenue: 0,
          totalCost: 0,
        },
        {
          id: 'bicicleta',
          name: 'Bicicleta',
          mode: 'cost_margin',
          cost: 246.0,
          desiredNetRevenue: 0,
          margin: 48,
          quantity: 1,
          marginByRegime: { presumido: 48, real: 48, simples: 48 },
          quantityByRegime: { presumido: 1, real: 1, simples: 1 },
          salePrice: 0,
          taxFactor: 0,
          completeFactor: 0,
          totalRevenue: 0,
          totalCost: 0,
        },
      ]

      const resultado = calculateMarkupProductsCanonically(produtosPrints, {
        regime: 'presumido',
        icmsRate: 18,
        dvRate: 4.5,
        customTaxes: [],
        simplesAnexo: 'anexo_1',
        effectiveSimplesRbt12: 180000,
      })

      const [patinete, bicicleta] = resultado

      // 1. Patinete
      expect(patinete.completeFactor).toBeCloseTo(0.2185, 4)
      expect(patinete.salePrice).toBe(1876.43)
      const divPatinete = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        dvRatePct: 4.5,
        marginPct: 52,
        comMargem: true,
      })
      const decPatinete = decomporPrecoVendaPre(patinete.salePrice, patinete.cost, divPatinete)
      expect(decPatinete.valorTributos).toBe(406.25)
      expect(decPatinete.valorDv).toBe(84.44)
      expect(decPatinete.valorLucroMargem).toBe(975.74)
      // Identidade fundamental
      expect(decPatinete.somaComponentes).toBe(1876.43)
      expect(decPatinete.diferencaCentavos).toBe(0)
      // Margem efetiva sobre PV bruto: 975,74 / 1876,43 = 52,00%
      expect(decPatinete.margemEfetivaPct).toBeCloseTo(52.0, 1)

      // 2. Bicicleta
      expect(bicicleta.completeFactor).toBeCloseTo(0.2585, 4)
      expect(bicicleta.salePrice).toBe(951.64)
      const divBicicleta = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        dvRatePct: 4.5,
        marginPct: 48,
        comMargem: true,
      })
      const decBicicleta = decomporPrecoVendaPre(bicicleta.salePrice, bicicleta.cost, divBicicleta)
      expect(decBicicleta.valorTributos).toBe(206.03)
      expect(decBicicleta.valorDv).toBe(42.82)
      expect(decBicicleta.valorLucroMargem).toBe(456.79)
      // Identidade fundamental
      expect(decBicicleta.somaComponentes).toBe(951.64)
      expect(decBicicleta.diferencaCentavos).toBe(0)
      // Margem efetiva sobre PV bruto: 456,79 / 951,64 = 48,00%
      expect(decBicicleta.margemEfetivaPct).toBeCloseTo(48.0, 1)
    })

    it('Verificação nos regimes Lucro Real e Simples Nacional para o mesmo item', () => {
      const produtos: MarkupProductItem[] = [
        {
          id: 'item-comparativo',
          name: 'Item Comparativo',
          mode: 'cost_margin',
          cost: 328.0,
          desiredNetRevenue: 0,
          margin: 35,
          quantity: 1,
          marginByRegime: { presumido: 35, real: 35, simples: 35 },
          quantityByRegime: { presumido: 1, real: 1, simples: 1 },
          salePrice: 0,
          taxFactor: 0,
          completeFactor: 0,
          totalRevenue: 0,
          totalCost: 0,
        },
      ]

      // 1. LUCRO REAL: ICMS 18%, PIS 1,65%, COFINS 7,60% -> Tributos 27,25%
      // Divisor = 1 - (0,2725 + 0,045 + 0,35) = 0,3325
      // Preço esperado = 328 / 0,3325 = 986,466... -> 986,47
      const resultadoReal = calculateMarkupProductsCanonically(produtos, {
        regime: 'real',
        icmsRate: 18,
        dvRate: 4.5,
        customTaxes: [],
      })
      const [pReal] = resultadoReal
      expect(pReal.completeFactor).toBeCloseTo(0.3325, 4)
      expect(pReal.salePrice).toBe(986.47)
      expect(pReal.salePriceCostMarginByRegime?.real).toBe(986.47)

      // 2. SIMPLES NACIONAL (Anexo I, 1ª faixa: RBT12 R$ 180.000 -> DAS 4,00%)
      // Divisor = 1 - (0,04 + 0,045 + 0,35) = 0,5650
      // Preço esperado = 328 / 0,565 = 580,5309... -> 580,53
      const resultadoSimples = calculateMarkupProductsCanonically(produtos, {
        regime: 'simples',
        dvRate: 4.5,
        simplesAnexo: 'anexo_1',
        effectiveSimplesRbt12: 180000,
      })
      const [pSimples] = resultadoSimples
      expect(pSimples.completeFactor).toBeCloseTo(0.565, 4)
      expect(pSimples.salePrice).toBe(580.53)
      expect(pSimples.salePriceCostMarginByRegime?.simples).toBe(580.53)
    })
  })
})
