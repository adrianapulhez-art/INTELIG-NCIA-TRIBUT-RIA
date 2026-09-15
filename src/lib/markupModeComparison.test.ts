import { describe, it, expect } from 'vitest'
import { computeMarkupModeComparison } from '@/components/demo/MarkupModeComparisonModal'
import { calculateLiquidDreChain } from '@/lib/liquidMarkupCalculations'
import { MarkupProductItem } from '@/contexts/TaxContext'

describe('Janela de Comparação de Modos de Precificação (Markup)', () => {
  it('Novo alvo de validação da usuária: Presumido RL R$ 2.335,00 gera exatamente R$ 3.195,08', () => {
    // Parâmetros: RL 2.335,00, ICMS 18%, PIS/COFINS fator 0,9635, DV 7,5% (0,925)
    // Divisor: 0,8200 × 0,9635 × 0,925 = 0,7308147
    // PV = 2.335 / 0,7308147 = 3.195,08
    const chain = calculateLiquidDreChain({
      desiredNetRevenue: 2335,
      regime: 'presumido',
      icmsRate: 18,
      customTaxesRate: 0,
      variableExpensesRate: 7.5,
      unitCost: 1158.93,
      operatingExpensesUnit: 0,
      presumidoActivity: 'comercio',
    })
    expect(chain.rbv).toBe(3195.08)
  })

  it('Modo ativo = Preço Líquido Desejado no Lucro Presumido: tríade ativa reflete novo divisor 0,7308147', () => {
    const product: MarkupProductItem = {
      id: 'prod-canonico',
      name: 'Produto Canônico',
      cost: 1158.93,
      margin: 51.9,
      quantity: 1,
      salePrice: 3195.08,
      totalRevenue: 3195.08,
      totalCost: 1158.93,
      taxFactor: 0.7308147,
      completeFactor: 0.7308147,
      mode: 'liquid',
      desiredNetRevenue: 2335,
    }

    const res = computeMarkupModeComparison({
      product,
      currentRegime: 'presumido',
      icmsRateMarkup: 18,
      customTaxesMarkup: [],
      simplesAnexo: 'anexo_1',
      simplesRbt12: 180000,
      totalVariableExpenseRate: 7.5,
      resolveUnitCost: () => 1158.93,
    })

    expect(res.regime).toBe('presumido')
    expect(res.regimeLabel).toBe('Lucro Presumido')
    expect(res.activeMode).toBe('liquid')
    expect(res.hasValidData).toBe(true)

    // Tríade Ativa
    expect(res.activeTriad.anchorValue).toBe(2335)
    expect(res.activeTriad.salePrice).toBe(3195.08)
    expect(res.activeTriad.netMarginPct).toBeGreaterThan(0)

    // Tríade Alternativa (Custo + Margem) calculada com independência lógica
    expect(res.alternativeTriad).not.toBeNull()
    if (res.alternativeTriad) {
      expect(res.alternativeTriad.mode).toBe('cost_margin')
      expect(res.alternativeTriad.anchorValue).toBe(1158.93)
      // Custo + Margem independente: 1158.93 / (0.7308147 * (1 - 0.519)) = 3296.25
      expect(res.alternativeTriad.salePrice).toBe(3296.25)
      expect(res.alternativeTriad.entryMarginPct).toBe(51.9)
    }
  })

  it('Caso de referência da auditoria: Custo R$ 1.158,93 vs meta RL R$ 2.335,00 no Presumido', () => {
    // Modo Custo + Margem: 0,8200 × 0,9635 × 0,925 × 0,4810 = 0,351594 → PV = 1.158,93 / 0,351594 = R$ 3.296,25
    // Modo Preço Líquido Desejado: 0,8200 × 0,9635 × 0,925 = 0,7308147 → PV = 2.335,00 / 0,7308147 = R$ 3.195,08
    const product: MarkupProductItem = {
      id: 'prod-auditoria',
      name: 'Produto Auditoria',
      cost: 1158.93,
      margin: 51.9,
      quantity: 1,
      salePrice: 3195.08,
      totalRevenue: 3195.08,
      totalCost: 1158.93,
      taxFactor: 0.7308147,
      completeFactor: 0.7308147,
      mode: 'liquid',
      desiredNetRevenue: 2335,
    }

    const res = computeMarkupModeComparison({
      product,
      currentRegime: 'presumido',
      icmsRateMarkup: 18,
      customTaxesMarkup: [],
      simplesAnexo: 'anexo_1',
      simplesRbt12: 180000,
      totalVariableExpenseRate: 7.5,
      resolveUnitCost: () => 1158.93,
    })

    expect(res.hasValidData).toBe(true)
    // Modo ativo (Preço Líquido Desejado)
    expect(res.activeTriad.salePrice).toBe(3195.08)
    expect(res.activeTriad.anchorValue).toBe(2335)

    // Modo alternativo (Custo + Margem independente)
    expect(res.alternativeTriad).not.toBeNull()
    if (res.alternativeTriad) {
      expect(res.alternativeTriad.salePrice).toBe(3296.25)
      expect(res.alternativeTriad.entryMarginPct).toBe(51.9)
    }
  })

  it('Modo ativo = Custo + Margem no Lucro Presumido: tríade alternativa apura o modo Preço Líquido com independência', () => {
    const product: MarkupProductItem = {
      id: 'prod-cost',
      name: 'Produto Custo',
      cost: 1000,
      margin: 20,
      quantity: 10,
      salePrice: 1500,
      totalRevenue: 15000,
      totalCost: 10000,
      taxFactor: 0.7505,
      completeFactor: 0.6004,
      mode: 'cost_margin',
      desiredNetRevenue: 0,
    }

    const res = computeMarkupModeComparison({
      product,
      currentRegime: 'presumido',
      icmsRateMarkup: 18,
      customTaxesMarkup: [],
      simplesAnexo: 'anexo_1',
      simplesRbt12: 180000,
      totalVariableExpenseRate: 5,
      resolveUnitCost: () => 1000,
    })

    expect(res.activeMode).toBe('cost_margin')
    expect(res.hasValidData).toBe(true)
    expect(res.activeTriad.anchorValue).toBe(1000)
    expect(res.activeTriad.entryMarginPct).toBe(20)
    expect(res.activeTriad.netMarginPct).toBeDefined()
    expect(res.activeTriad.netMarginDerived).toBe(true)

    // Tríade Alternativa (Receita Líquida)
    expect(res.alternativeTriad).not.toBeNull()
    if (res.alternativeTriad) {
      expect(res.alternativeTriad.mode).toBe('liquid')
      expect(res.alternativeTriad.anchorValue).toBeGreaterThan(0)
    }
  })

  it('Isolamento por regime: Simples Nacional calcula alíquota própria do PGDAS sem vazar Presumido', () => {
    const product: MarkupProductItem = {
      id: 'prod-simples',
      name: 'Produto Simples',
      cost: 50,
      margin: 30,
      quantity: 1,
      salePrice: 100,
      totalRevenue: 100,
      totalCost: 50,
      taxFactor: 0.9408,
      completeFactor: 0.9408,
      mode: 'liquid',
      desiredNetRevenue: 80,
    }

    const res = computeMarkupModeComparison({
      product,
      currentRegime: 'simples',
      icmsRateMarkup: 18,
      customTaxesMarkup: [],
      simplesAnexo: 'anexo_1',
      simplesRbt12: 180000, // 4.00%
      totalVariableExpenseRate: 2,
      resolveUnitCost: () => 50,
    })

    expect(res.regime).toBe('simples')
    expect(res.regimeLabel).toBe('Simples Nacional')
    expect(res.hasValidData).toBe(true)
    // Divisor ativo Simples multiplicativo: (1 - 0.04) * (1 - 0.02) = 0.96 * 0.98 = 0.9408
    // RBV = 80 / 0.9408 = 85.03
    expect(res.activeTriad.salePrice).toBe(85.03)
  })

  it('Honestidade matemática: se faltar custo unitário no regime, modal avisa sem inventar números', () => {
    const product: MarkupProductItem = {
      id: 'prod-no-cost',
      name: 'Produto Sem Custo',
      cost: 0,
      margin: 20,
      quantity: 1,
      salePrice: 0,
      totalRevenue: 0,
      totalCost: 0,
      taxFactor: 1,
      completeFactor: 1,
      mode: 'cost_margin',
      desiredNetRevenue: 0,
    }

    const res = computeMarkupModeComparison({
      product,
      currentRegime: 'real',
      icmsRateMarkup: 18,
      customTaxesMarkup: [],
      simplesAnexo: 'anexo_1',
      simplesRbt12: 180000,
      totalVariableExpenseRate: 0,
      resolveUnitCost: () => 0,
    })

    expect(res.hasValidData).toBe(false)
    expect(res.invalidReason).toBeDefined()
    expect(res.alternativeTriad).toBeNull()
  })
})
