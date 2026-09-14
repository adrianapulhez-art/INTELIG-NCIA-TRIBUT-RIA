import { describe, it, expect } from 'vitest'
import { computeMarkupModeComparison } from '@/components/demo/MarkupModeComparisonModal'
import { calculateLiquidDreChain } from '@/lib/liquidMarkupCalculations'
import { MarkupProductItem } from '@/contexts/TaxContext'

describe('Janela de Comparação de Modos de Precificação (Markup)', () => {
  it('Blindagem do valor canônico: Presumido RL R$ 2.335,00 gera exatamente R$ 3.295,70', () => {
    // Parâmetros canônicos: RL 2.335,00, ICMS 18%, PIS 0,65%, COFINS 3,00%, DV 7,5%
    // Divisor: 1 - (0.18 + 0.0065 + 0.03 + 0.075) = 1 - 0.2915 = 0.7085
    // PV = 2.335 / 0.7085 = 3.295,70
    const chain = calculateLiquidDreChain({
      desiredNetRevenue: 2335,
      regime: 'presumido',
      icmsRate: 18,
      customTaxesRate: 0,
      variableExpensesRate: 7.5,
      unitCost: 1500,
      operatingExpensesUnit: 0,
      presumidoActivity: 'comercio',
    })
    expect(chain.rbv).toBe(3295.7)
  })

  it('Modo ativo = Receita Líquida no Lucro Presumido: tríade ativa reflete canônico R$ 3.295,70', () => {
    const product: MarkupProductItem = {
      id: 'prod-canonico',
      name: 'Produto Canônico',
      cost: 1500,
      margin: 0,
      quantity: 1,
      salePrice: 3295.7,
      totalRevenue: 3295.7,
      totalCost: 1500,
      taxFactor: 0.7085,
      completeFactor: 0.7085,
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
      resolveUnitCost: () => 1500,
    })

    expect(res.regime).toBe('presumido')
    expect(res.regimeLabel).toBe('Lucro Presumido')
    expect(res.activeMode).toBe('liquid')
    expect(res.hasValidData).toBe(true)

    // Tríade Ativa
    expect(res.activeTriad.anchorValue).toBe(2335)
    expect(res.activeTriad.salePrice).toBe(3295.7)
    expect(res.activeTriad.netMarginPct).toBeGreaterThan(0)

    // Tríade Alternativa (Custo + Margem) com premissa honesta de convergência
    expect(res.alternativeTriad).not.toBeNull()
    if (res.alternativeTriad) {
      expect(res.alternativeTriad.mode).toBe('cost_margin')
      expect(res.alternativeTriad.anchorValue).toBe(1500) // CMV
      expect(res.alternativeTriad.netMarginPct).toBe(res.activeTriad.netMarginPct) // Margem implícita honesta
      expect(res.alternativeTriad.salePrice).toBeGreaterThan(0)
    }
  })

  it('Modo ativo = Custo + Margem no Lucro Presumido: tríade alternativa deriva a meta líquida implícita', () => {
    const product: MarkupProductItem = {
      id: 'prod-cost',
      name: 'Produto Custo',
      cost: 1000,
      margin: 20,
      quantity: 10,
      salePrice: 1500,
      totalRevenue: 15000,
      totalCost: 10000,
      taxFactor: 0.7085,
      completeFactor: 0.5668,
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
    expect(res.activeTriad.netMarginPct).toBe(20)

    // Tríade Alternativa (Receita Líquida)
    expect(res.alternativeTriad).not.toBeNull()
    if (res.alternativeTriad) {
      expect(res.alternativeTriad.mode).toBe('liquid')
      // A meta líquida derivada deve ser proporcional ao preço ativo menos tributos
      expect(res.alternativeTriad.anchorValue).toBeGreaterThan(0)
      // Convergência: o preço simulado alternativo deve convergir com o preço ativo
      expect(Math.abs(res.alternativeTriad.salePrice - res.activeTriad.salePrice)).toBeLessThan(1.0)
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
      taxFactor: 0.94,
      completeFactor: 0.94,
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
    // Divisor ativo Simples: 1 - (4% + 2%) = 0.94
    // RBV = 80 / 0.94 = 85.11
    expect(res.activeTriad.salePrice).toBe(85.11)
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
