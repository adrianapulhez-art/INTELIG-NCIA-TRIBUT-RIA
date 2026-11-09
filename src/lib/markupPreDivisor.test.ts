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
    it('Item 1: custo R$ 434,60, margem 35% → divisor 0,4035 e PV R$ 1.077,08 (cenário de controle sem exclusão ICMS)', () => {
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 17,
        customTaxesPct: [],
        dvRatePct: 4,
        marginPct: 35,
        comMargem: true,
        excluirIcmsBasePisCofins: false,
      })

      expect(res.somaTributosPct).toBeCloseTo(20.65, 4) // 17 + 0.65 + 3.0
      expect(res.somaDeducoesPct).toBeCloseTo(59.65, 4) // 20.65 + 4 + 35
      expect(res.divisor).toBeCloseTo(0.4035, 6)

      const pv = precoPeloDivisorPre(434.6, res.divisor)
      expect(pv).toBe(1077.08)
    })

    it('Item 2: custo R$ 467,40, margem 50% → divisor 0,2535 e PV R$ 1.843,79 (cenário de controle sem exclusão ICMS)', () => {
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 17,
        customTaxesPct: [],
        dvRatePct: 4,
        marginPct: 50,
        comMargem: true,
        excluirIcmsBasePisCofins: false,
      })

      expect(res.somaDeducoesPct).toBeCloseTo(74.65, 4)
      expect(res.divisor).toBeCloseTo(0.2535, 6)

      const pv = precoPeloDivisorPre(467.4, res.divisor)
      expect(pv).toBe(1843.79)
    })

    it('Item 3: custo R$ 328,00, margem 40% → divisor 0,3535 e PV R$ 927,86 (cenário de controle sem exclusão ICMS)', () => {
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 17,
        customTaxesPct: [],
        dvRatePct: 4,
        marginPct: 40,
        comMargem: true,
        excluirIcmsBasePisCofins: false,
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

    it('Cenário de Controle: Adriana sem exclusão de ICMS (divisor 0,3885 e PV 844,27)', () => {
      // Custo: 328,00, ICMS: 18%, PIS: 0,65%, COFINS: 3,00%, DV: 4,50%, Margem: 35% sobre PV bruto
      // Sem exclusão do ICMS: Tributos = 18 + 0,65 + 3,00 = 21,65%
      // Divisor = 1 - (0,2165 + 0,045 + 0,35) = 0,3885
      // Preço esperado = 328 / 0,3885 = 844,2728... -> 844,27
      const produtosAdriana: MarkupProductItem[] = [
        {
          id: 'item-adriana-controle',
          name: 'Item do Print Adriana Controle',
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
        excluirIcmsBasePisCofins: false,
      })

      const [p] = resultado

      // 1. Divisor exibido deve ser 0,3885
      expect(p.completeFactor).toBeCloseTo(0.3885, 4)

      // 2. Preço de venda unitário deve ser R$ 844,27
      expect(p.salePrice).toBe(844.27)
      expect(p.salePriceCostMarginByRegime?.presumido).toBe(844.27)

      // 3. Decomposição com a função decomporPrecoVendaPre
      const divisorRes = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        dvRatePct: 4.5,
        marginPct: 35,
        comMargem: true,
        excluirIcmsBasePisCofins: false,
      })
      const dec = decomporPrecoVendaPre(p.salePrice, p.cost, divisorRes)
      expect(dec.precoVenda).toBe(844.27)
      expect(dec.custoUnitario).toBe(328.0)
      expect(dec.valorTributos).toBe(182.79)
      expect(dec.valorDv).toBe(37.99)
      expect(dec.valorLucroMargem).toBe(295.49)
      expect(dec.margemEfetivaPct).toBeCloseTo(35.0, 1)
      expect(dec.somaComponentes).toBe(844.27)
      expect(dec.diferencaCentavos).toBe(0)
    })

    it('Cenário de Controle: Patinete e Bicicleta sem exclusão de ICMS', () => {
      // Patinete: Custo R$ 410,00, Margem 52%, DV 4,50%, ICMS 18%, PIS 0,65%, COFINS 3,00%
      // Soma tributos: 21,65%
      // Divisor: 1 - (0,2165 + 0,045 + 0,52) = 0,2185
      // Preço: 410 / 0,2185 = 1.876,43
      //
      // Bicicleta: Custo R$ 246,00, Margem 48%, DV 4,50%, ICMS 18%, PIS 0,65%, COFINS 3,00%
      // Soma tributos: 21,65%
      // Divisor: 1 - (0,2165 + 0,045 + 0,48) = 0,2585
      // Preço: 246 / 0,2585 = 951,64
      const produtosPrints: MarkupProductItem[] = [
        {
          id: 'patinete-ctrl',
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
          id: 'bicicleta-ctrl',
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
        excluirIcmsBasePisCofins: false,
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
        excluirIcmsBasePisCofins: false,
      })
      const decPatinete = decomporPrecoVendaPre(patinete.salePrice, patinete.cost, divPatinete)
      expect(decPatinete.valorTributos).toBe(406.25)
      expect(decPatinete.valorDv).toBe(84.44)
      expect(decPatinete.valorLucroMargem).toBe(975.74)
      expect(decPatinete.somaComponentes).toBe(1876.43)
      expect(decPatinete.diferencaCentavos).toBe(0)
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
        excluirIcmsBasePisCofins: false,
      })
      const decBicicleta = decomporPrecoVendaPre(bicicleta.salePrice, bicicleta.cost, divBicicleta)
      expect(decBicicleta.valorTributos).toBe(206.03)
      expect(decBicicleta.valorDv).toBe(42.82)
      expect(decBicicleta.valorLucroMargem).toBe(456.79)
      expect(decBicicleta.somaComponentes).toBe(951.64)
      expect(decBicicleta.diferencaCentavos).toBe(0)
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

  describe('Tabela de Regressão Oficial com Exclusão do ICMS da base do PIS/COFINS (Parecer SEI 14483/2021)', () => {
    /**
     * Parâmetros da regressão:
     * Lucro Presumido, ICMS 18%, PIS 0,65%, COFINS 3,00%, DV 4,50%, margem 35% sobre PV bruto.
     * Base PIS/COFINS = PV − ICMS destacado = PV × (1 − 18%) = 82% do PV
     * Taxas efetivas sobre PV:
     * - ICMS = 18,000%
     * - PIS = 0,65% × 82% = 0,533%
     * - COFINS = 3,00% × 82% = 2,460%
     * - Total Tributos = 18,000% + 0,533% + 2,460% = 20,993%
     * - DV = 4,500%
     * - Margem = 35,000%
     * Soma deduções = 20,993% + 4,500% + 35,000% = 60,493%
     * Divisor = 1 − 0,60493 = 0,39507
     *
     * Tabela esperada:
     * - Custo 328,00 → antes 844,27 → esperado APÓS o ajuste: 830,23 (328 / 0,39507 = 830,2326...)
     * - Custo 410,00 → antes 1.055,34 → esperado: 1.037,79 (410 / 0,39507 = 1.037,7907...)
     * - Custo 246,00 → antes 633,20 → esperado: 622,67 (246 / 0,39507 = 622,6744...)
     */

    it('calcula o divisor 0,39507 com alíquotas efetivas ICMS 18%, PIS 0,533%, COFINS 2,460% e total 20,993%', () => {
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        customTaxesPct: [],
        dvRatePct: 4.5,
        marginPct: 35,
        comMargem: true,
        excluirIcmsBasePisCofins: true,
      })

      expect(res.divisor).toBeCloseTo(0.39507, 5)
      expect(res.somaTributosPct).toBeCloseTo(20.993, 3)
      expect(res.somaDeducoesPct).toBeCloseTo(60.493, 3)

      const icms = res.parcelas.find((p) => p.chave === 'icms')
      const pis = res.parcelas.find((p) => p.chave === 'pis')
      const cofins = res.parcelas.find((p) => p.chave === 'cofins')

      expect(icms?.taxaEfetivaPct).toBeCloseTo(18.0, 3)
      expect(pis?.taxaEfetivaPct).toBeCloseTo(0.533, 3)
      expect(cofins?.taxaEfetivaPct).toBeCloseTo(2.46, 3)
    })

    it('Tabela Item 1: Custo 328,00 → Preço esperado 830,23 e fecha decomposição contábil', () => {
      const custo = 328.0
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        customTaxesPct: [],
        dvRatePct: 4.5,
        marginPct: 35,
        comMargem: true,
        excluirIcmsBasePisCofins: true,
      })

      const pv = precoPeloDivisorPre(custo, res.divisor)
      expect(pv).toBe(830.23)

      const dec = decomporPrecoVendaPre(pv, custo, res)
      expect(dec.precoVenda).toBe(830.23)
      expect(dec.custoUnitario).toBe(328.0)
      expect(dec.diferencaCentavos).toBe(0)
      expect(dec.somaComponentes).toBe(830.23)

      // Detalhe tributos
      const tIcms = dec.detalheTributos.find((d) => d.chave === 'icms')
      const tPis = dec.detalheTributos.find((d) => d.chave === 'pis')
      const tCofins = dec.detalheTributos.find((d) => d.chave === 'cofins')

      expect(tIcms?.baseCalculo).toBe(830.23)
      expect(tIcms?.valor).toBe(149.44) // 830,23 * 18% = 149,4414 -> 149,44
      expect(tPis?.icmsExcluido).toBe(149.44)
      expect(tPis?.baseCalculo).toBe(680.79) // 830,23 - 149,44 = 680,79
      expect(tPis?.valor).toBe(4.43) // 680,79 * 0,65% = 4,4251 -> 4,43
      expect(tCofins?.icmsExcluido).toBe(149.44)
      expect(tCofins?.baseCalculo).toBe(680.79)
      expect(tCofins?.valor).toBe(20.42) // 680,79 * 3% = 20,4237 -> 20,42

      // Identidade custo + tributos + DV + lucro = PV
      // Trib = 149,44 + 4,43 + 20,42 = 174,29
      // DV = 830,23 * 4,5% = 37,36
      // Lucro = 830,23 - 328 - 174,29 - 37,36 = 290,58
      // Margem = 290,58 / 830,23 = 35,00%
      expect(dec.valorTributos).toBe(174.29)
      expect(dec.valorDv).toBe(37.36)
      expect(dec.valorLucroMargem).toBe(290.58)
      expect(dec.margemEfetivaPct).toBeCloseTo(35.0, 1)
    })

    it('Tabela Item 2: Custo 410,00 → Preço esperado 1.037,79 e fecha decomposição contábil', () => {
      const custo = 410.0
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        customTaxesPct: [],
        dvRatePct: 4.5,
        marginPct: 35,
        comMargem: true,
        excluirIcmsBasePisCofins: true,
      })

      const pv = precoPeloDivisorPre(custo, res.divisor)
      expect(pv).toBe(1037.79)

      const dec = decomporPrecoVendaPre(pv, custo, res)
      expect(dec.precoVenda).toBe(1037.79)
      expect(dec.custoUnitario).toBe(410.0)
      expect(dec.diferencaCentavos).toBe(0)
      expect(dec.somaComponentes).toBe(1037.79)
      expect(dec.margemEfetivaPct).toBeCloseTo(35.0, 1)
    })

    it('Tabela Item 3: Custo 246,00 → Preço esperado 622,67 e fecha decomposição contábil', () => {
      const custo = 246.0
      const res = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        customTaxesPct: [],
        dvRatePct: 4.5,
        marginPct: 35,
        comMargem: true,
        excluirIcmsBasePisCofins: true,
      })

      const pv = precoPeloDivisorPre(custo, res.divisor)
      expect(pv).toBe(622.67)

      const dec = decomporPrecoVendaPre(pv, custo, res)
      expect(dec.precoVenda).toBe(622.67)
      expect(dec.custoUnitario).toBe(246.0)
      expect(dec.diferencaCentavos).toBe(0)
      expect(dec.somaComponentes).toBe(622.67)
      expect(dec.margemEfetivaPct).toBeCloseTo(35.0, 1)
    })

    it('Executa os 3 itens da tabela no fluxo de ponta a ponta do TaxContext', () => {
      const produtosTabela: MarkupProductItem[] = [
        {
          id: 'item-328',
          name: 'Produto Custo 328',
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
        {
          id: 'item-410',
          name: 'Produto Custo 410',
          mode: 'cost_margin',
          cost: 410.0,
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
        {
          id: 'item-246',
          name: 'Produto Custo 246',
          mode: 'cost_margin',
          cost: 246.0,
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

      const resultado = calculateMarkupProductsCanonically(produtosTabela, {
        regime: 'presumido',
        icmsRate: 18,
        dvRate: 4.5,
        customTaxes: [],
        simplesAnexo: 'anexo_1',
        effectiveSimplesRbt12: 180000,
        excluirIcmsBasePisCofins: true,
      })

      const [p328, p410, p246] = resultado

      // Preços esperados da tabela
      expect(p328.salePrice).toBe(830.23)
      expect(p410.salePrice).toBe(1037.79)
      expect(p246.salePrice).toBe(622.67)

      // Divisor comum 0,39507
      expect(p328.completeFactor).toBeCloseTo(0.39507, 4)
      expect(p410.completeFactor).toBeCloseTo(0.39507, 4)
      expect(p246.completeFactor).toBeCloseTo(0.39507, 4)
    })

    it('Garante que no Simples Nacional NÃO aplica a fórmula de exclusão (carga exclusiva do DAS)', () => {
      const resSimplesCom = calcularMarkupDivisorPre({
        regime: 'simples',
        dasEfetivoPct: 4.0,
        dvRatePct: 4.5,
        marginPct: 35,
        comMargem: true,
        excluirIcmsBasePisCofins: true,
      })
      const resSimplesSem = calcularMarkupDivisorPre({
        regime: 'simples',
        dasEfetivoPct: 4.0,
        dvRatePct: 4.5,
        marginPct: 35,
        comMargem: true,
        excluirIcmsBasePisCofins: false,
      })

      // No Simples Nacional a exclusão não se aplica: mesmo divisor
      expect(resSimplesCom.divisor).toBe(resSimplesSem.divisor)
      expect(resSimplesCom.somaTributosPct).toBe(4.0)
      expect(resSimplesCom.parcelas.length).toBe(1)
      expect(resSimplesCom.parcelas[0].chave).toBe('das')
    })

    it('Garante que no Lucro Real separa débitos de venda com exclusão de ICMS sem duplicar créditos de entrada', () => {
      // No Lucro Real, débito de saída:
      // ICMS 18%, PIS 1,65%, COFINS 7,60%
      // Com exclusão: Base PIS/COFINS = 82% do PV
      // PIS saída = 1,65% * 82% = 1,353%
      // COFINS saída = 7,60% * 82% = 6,232%
      // Total saída = 18% + 1,353% + 6,232% = 25,585% (sem exclusão seria 27,25%)
      const resRealComExclusao = calcularMarkupDivisorPre({
        regime: 'real',
        icmsRatePct: 18,
        dvRatePct: 4.5,
        marginPct: 35,
        comMargem: true,
        excluirIcmsBasePisCofins: true,
      })

      expect(resRealComExclusao.somaTributosPct).toBeCloseTo(25.585, 3)
      const pis = resRealComExclusao.parcelas.find((p) => p.chave === 'pis')
      const cofins = resRealComExclusao.parcelas.find((p) => p.chave === 'cofins')
      expect(pis?.taxaEfetivaPct).toBeCloseTo(1.353, 3)
      expect(cofins?.taxaEfetivaPct).toBeCloseTo(6.232, 3)

      // Identidade com custo unitário já líquido de créditos de entrada
      const custoLiquidoEntrada = 328.0
      const pv = precoPeloDivisorPre(custoLiquidoEntrada, resRealComExclusao.divisor)
      const dec = decomporPrecoVendaPre(pv, custoLiquidoEntrada, resRealComExclusao)
      expect(dec.diferencaCentavos).toBe(0)
      expect(dec.somaComponentes).toBe(pv)
    })

    it('Didática e Reconciliação do Aluno (item d da tarefa): venda 100,00 com ICMS 18,00 e ICMS 0,00', () => {
      // 1. Venda 100,00 com ICMS 18% (18,00 destacado) -> Base pós-exclusão = 82,00 nos dois regimes
      // Lucro Presumido: PIS nominal 0,65% e COFINS nominal 3,00%
      const resPresumido18 = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 18,
        dvRatePct: 0,
        marginPct: 0,
        comMargem: false,
        excluirIcmsBasePisCofins: true,
      })
      const pisPres = resPresumido18.parcelas.find((p) => p.chave === 'pis')
      const cofPres = resPresumido18.parcelas.find((p) => p.chave === 'cofins')

      // Presumido: 3,65% * 82 = 2,993% efetivo; carga total: 18% + 2,993% = 20,993% (exibida como 20,99%)
      expect(pisPres?.taxaEfetivaPct).toBeCloseTo(0.533, 3) // 0,65% * 0,82 = 0,533%
      expect(cofPres?.taxaEfetivaPct).toBeCloseTo(2.46, 3) // 3,00% * 0,82 = 2,460%
      expect(resPresumido18.somaTributosPct).toBeCloseTo(20.993, 3)
      // Arredondamento de apresentação para 2 casas decimais deve ser 20,99%
      expect(resPresumido18.somaTributosPct.toFixed(2)).toBe('20.99')

      // Decomposição para venda 100,00 no Presumido
      const decPres100 = decomporPrecoVendaPre(100, 0, resPresumido18)
      const icmsItemPres = decPres100.detalheTributos.find((t) => t.nome === 'ICMS')
      const pisItemPres = decPres100.detalheTributos.find((t) => t.nome === 'PIS')
      const cofItemPres = decPres100.detalheTributos.find((t) => t.nome === 'COFINS')
      expect(icmsItemPres?.baseCalculo).toBe(100)
      expect(icmsItemPres?.valor).toBe(18)
      expect(pisItemPres?.baseCalculo).toBe(82)
      expect(pisItemPres?.valor).toBe(0.53) // 82 * 0,0065 = 0,533 -> 0,53
      expect(cofItemPres?.baseCalculo).toBe(82)
      expect(cofItemPres?.valor).toBe(2.46) // 82 * 0,0300 = 2,46
      expect(decPres100.valorTributos).toBe(20.99)

      // Lucro Real: PIS nominal 1,65% e COFINS nominal 7,60%
      const resReal18 = calcularMarkupDivisorPre({
        regime: 'real',
        icmsRatePct: 18,
        dvRatePct: 0,
        marginPct: 0,
        comMargem: false,
        excluirIcmsBasePisCofins: true,
      })
      const pisReal = resReal18.parcelas.find((p) => p.chave === 'pis')
      const cofReal = resReal18.parcelas.find((p) => p.chave === 'cofins')

      // Real: 9,25% * 82 = 7,585% efetivo; carga total: 18% + 7,585% = 25,585% (exibida como 25,59%)
      expect(pisReal?.taxaEfetivaPct).toBeCloseTo(1.353, 3) // 1,65% * 0,82 = 1,353%
      expect(cofReal?.taxaEfetivaPct).toBeCloseTo(6.232, 3) // 7,60% * 0,82 = 6,232%
      expect(resReal18.somaTributosPct).toBeCloseTo(25.585, 3)
      // Arredondamento de apresentação para 2 casas decimais deve ser 25,59%
      expect(resReal18.somaTributosPct.toFixed(2)).toBe('25.59')

      // Decomposição para venda 100,00 no Real
      const decReal100 = decomporPrecoVendaPre(100, 0, resReal18)
      const icmsItemReal = decReal100.detalheTributos.find((t) => t.nome === 'ICMS')
      const pisItemReal = decReal100.detalheTributos.find((t) => t.nome === 'PIS')
      const cofItemReal = decReal100.detalheTributos.find((t) => t.nome === 'COFINS')
      expect(icmsItemReal?.baseCalculo).toBe(100)
      expect(icmsItemReal?.valor).toBe(18)
      expect(pisItemReal?.baseCalculo).toBe(82)
      expect(pisItemReal?.valor).toBe(1.35) // 82 * 0,0165 = 1,353 -> 1,35
      expect(cofItemReal?.baseCalculo).toBe(82)
      expect(cofItemReal?.valor).toBe(6.23) // 82 * 0,0760 = 6,232 -> 6,23
      expect(decReal100.valorTributos).toBe(25.58)

      // 2. Com ICMS zero -> base = valor bruto (100) e parcelas efetivas = nominais
      const resPresumido0 = calcularMarkupDivisorPre({
        regime: 'presumido',
        icmsRatePct: 0,
        dvRatePct: 0,
        marginPct: 0,
        comMargem: false,
        excluirIcmsBasePisCofins: true,
      })
      const pisPres0 = resPresumido0.parcelas.find((p) => p.chave === 'pis')
      const cofPres0 = resPresumido0.parcelas.find((p) => p.chave === 'cofins')
      expect(pisPres0?.taxaEfetivaPct).toBe(0.65)
      expect(cofPres0?.taxaEfetivaPct).toBe(3.0)
      expect(resPresumido0.somaTributosPct).toBe(3.65)

      const decPres0 = decomporPrecoVendaPre(100, 0, resPresumido0)
      const pisPres0Item = decPres0.detalheTributos.find((t) => t.nome === 'PIS')
      const cofPres0Item = decPres0.detalheTributos.find((t) => t.nome === 'COFINS')
      expect(pisPres0Item?.baseCalculo).toBe(100)
      expect(pisPres0Item?.valor).toBe(0.65)
      expect(cofPres0Item?.baseCalculo).toBe(100)
      expect(cofPres0Item?.valor).toBe(3.0)

      const resReal0 = calcularMarkupDivisorPre({
        regime: 'real',
        icmsRatePct: 0,
        dvRatePct: 0,
        marginPct: 0,
        comMargem: false,
        excluirIcmsBasePisCofins: true,
      })
      const pisReal0 = resReal0.parcelas.find((p) => p.chave === 'pis')
      const cofReal0 = resReal0.parcelas.find((p) => p.chave === 'cofins')
      expect(pisReal0?.taxaEfetivaPct).toBe(1.65)
      expect(cofReal0?.taxaEfetivaPct).toBe(7.6)
      expect(resReal0.somaTributosPct).toBe(9.25)

      const decReal0 = decomporPrecoVendaPre(100, 0, resReal0)
      const pisReal0Item = decReal0.detalheTributos.find((t) => t.nome === 'PIS')
      const cofReal0Item = decReal0.detalheTributos.find((t) => t.nome === 'COFINS')
      expect(pisReal0Item?.baseCalculo).toBe(100)
      expect(pisReal0Item?.valor).toBe(1.65)
      expect(cofReal0Item?.baseCalculo).toBe(100)
      expect(cofReal0Item?.valor).toBe(7.6)
    })
  })
})
