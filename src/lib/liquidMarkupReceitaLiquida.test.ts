import { describe, it, expect } from 'vitest'
import { calculateLiquidDreChain } from '@/lib/liquidMarkupCalculations'

/**
 * Teste de regressão do modo "Receita Líquida" (âncora C+M com base RL) —
 * item 01, âncora R$ 650,00, 25 unidades, DV 4,50% sobre o preço bruto.
 *
 * Regra: divisor ADITIVO = 1 − (carga tributária efetiva + DV).
 * A fórmula multiplicativa legada ((1−ICMS)×(1−PIS/COF)×(1−DV)×...) que gerava
 * R$ 861,48 / 914,64 / 708,99 está ELIMINADA — a DV não pode ser aplicada duas vezes.
 *
 * LP: ICMS 18% + PIS 0,65%×0,82 + COFINS 3%×0,82 = 20,993% (Parecer SEI 14483/2021)
 * LR: ICMS 18% + PIS 1,65%×0,82 + COFINS 7,6%×0,82 = 25,585%
 * SN: DAS 4,00% apenas (premissa do teste)
 */
describe('Modo Receita Líquida — divisor aditivo e cadeia DRE (regressão Adri)', () => {
  const DV = 4.5

  it('Lucro Presumido: carga 20,993% → divisor 0,74507, preço R$ 872,40 (não 861,48)', () => {
    const r = calculateLiquidDreChain({
      desiredNetRevenue: 650,
      regime: 'presumido',
      icmsRate: 18,
      customTaxesRate: 0,
      variableExpensesRate: DV,
      unitCost: 328,
      operatingExpensesUnit: 0,
    })
    expect(r.taxRateTotal).toBeCloseTo(20.993, 3)
    expect(r.grossUpDivisor).toBeCloseTo(0.74507, 5)
    expect(r.rbv).toBe(872.4)
    expect(r.taxesValue).toBe(183.14)
    expect(r.deducoesValor).toBe(39.26)
    expect(r.derivedNetRevenue).toBe(650.0)
    expect(r.roundingGap).toBe(0)
    // Identidade: RBV = CMV + tributos + DV + resultado após CMV e DV
    expect(r.grossProfit).toBe(322.0) // 650 − 328
    // IRPJ 8% × 15% sobre RBV; CSLL 12% × 9% sobre RBV
    expect(r.irpj).toBe(10.47)
    expect(r.csll).toBe(9.42)
    expect(r.lle).toBe(302.11)
  })

  it('Lucro Real: carga 25,585% → divisor 0,69915, preço R$ 929,70 (não 914,64)', () => {
    const r = calculateLiquidDreChain({
      desiredNetRevenue: 650,
      regime: 'real',
      icmsRate: 18,
      customTaxesRate: 0,
      variableExpensesRate: DV,
      unitCost: 297.66,
      operatingExpensesUnit: 0,
    })
    expect(r.taxRateTotal).toBeCloseTo(25.585, 3)
    expect(r.grossUpDivisor).toBeCloseTo(0.69915, 5)
    expect(r.rbv).toBe(929.7)
    expect(r.taxesValue).toBe(237.86)
    expect(r.derivedNetRevenue).toBe(650.0)
    expect(r.grossProfit).toBe(352.34) // 650 − 297,66
    expect(r.lle).toBe(267.78)
  })

  it('Simples Nacional: DAS 4% → divisor 0,91500, preço R$ 710,38 (não 708,99); centavo conciliado', () => {
    const r = calculateLiquidDreChain({
      desiredNetRevenue: 650,
      regime: 'simples',
      effectiveSimplesRate: 4,
      customTaxesRate: 0,
      variableExpensesRate: DV,
      unitCost: 400,
      operatingExpensesUnit: 0,
    })
    expect(r.taxRateTotal).toBeCloseTo(4.0, 3)
    expect(r.grossUpDivisor).toBeCloseTo(0.915, 5)
    expect(r.rbv).toBe(710.38)
    expect(r.taxesValue).toBe(28.42)
    expect(r.deducoesValor).toBe(31.97)
    // Arredondamento separado de DAS e DV gera R$ 0,01 — conciliado explicitamente
    expect(r.derivedNetRevenue).toBe(649.99)
    expect(r.roundingGap).toBe(-0.01)
    expect(r.grossProfit).toBe(249.99) // 649,99 − 400 (DRE parte do mesmo preço bruto)
    expect(r.lle).toBe(249.99) // IRPJ/CSLL embutidos no DAS
    expect(r.ladir).toBe(0)
  })

  it('Subtotal de 25 unidades bate com a tabela de regressão nos três regimes', () => {
    const lp = calculateLiquidDreChain({
      desiredNetRevenue: 650,
      regime: 'presumido',
      icmsRate: 18,
      variableExpensesRate: DV,
      unitCost: 328,
    })
    const lr = calculateLiquidDreChain({
      desiredNetRevenue: 650,
      regime: 'real',
      icmsRate: 18,
      variableExpensesRate: DV,
      unitCost: 297.66,
    })
    const sn = calculateLiquidDreChain({
      desiredNetRevenue: 650,
      regime: 'simples',
      effectiveSimplesRate: 4,
      variableExpensesRate: DV,
      unitCost: 400,
    })
    expect(Math.round(lp.rbv * 25 * 100) / 100).toBe(21810.0)
    expect(Math.round(lr.rbv * 25 * 100) / 100).toBe(23242.5)
    expect(Math.round(sn.rbv * 25 * 100) / 100).toBe(17759.5)
  })

  it('Margem líquida é derivada sobre a receita bruta (LLE ÷ RBV), fora do divisor', () => {
    const r = calculateLiquidDreChain({
      desiredNetRevenue: 650,
      regime: 'presumido',
      icmsRate: 18,
      variableExpensesRate: DV,
      unitCost: 328,
    })
    expect(r.derivedMarginPct).toBeCloseTo((r.lle / r.rbv) * 100, 2)
    // Sem margem embutida: a soma tributos + DV = 1 − divisor, sem parcela de margem
    expect(r.taxRateTotal + r.variableExpenseRate).toBeCloseTo((1 - r.grossUpDivisor) * 100, 6)
  })
})
