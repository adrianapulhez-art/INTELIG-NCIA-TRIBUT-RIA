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

    // Tríade Alternativa (Custo + Margem) com premissa honesta de convergência REAL
    expect(res.alternativeTriad).not.toBeNull()
    if (res.alternativeTriad) {
      expect(res.alternativeTriad.mode).toBe('cost_margin')
      expect(res.alternativeTriad.anchorValue).toBe(1500) // CMV
      // Convergência real no preço de venda (diferença < R$ 0,05)
      expect(Math.abs(res.alternativeTriad.salePrice - res.activeTriad.salePrice)).toBeLessThan(
        0.05,
      )
      // Ambas exibem margem líquida apurada unificada (canônica)
      expect(res.alternativeTriad.netMarginPct).toBeCloseTo(res.activeTriad.netMarginPct, 1)
      // Margem de entrada calculada e rotulada
      expect(res.alternativeTriad.entryMarginPct).toBeDefined()
      expect(res.alternativeTriad.entryMarginFormatted).toContain('(convergente)')
    }
  })

  it('Caso de referência da auditoria: CMV R$ 1.158,93 e meta RL R$ 2.235,00 no Presumido', () => {
    // Parâmetros: Presumido, ICMS 18%, PIS 0,65%, COFINS 3,00%, DV 7,5%
    // Divisor aditivo = 1 - (0.18 + 0.0065 + 0.03 + 0.075) = 0.70850
    // Fator multiplicativo = (1 - 0.18) * (1 - 0.0065) * (1 - 0.03) * (1 - 0.075) = 0.730957
    // PV ativo = 2.235,00 / 0.7085 = 3.154,55
    // Margem líquida apurada = 44,93% (LLE R$ 1.004,15 / RL R$ 2.235,00)
    // Margem de entrada equivalente = 49,74%
    // Prova: 1 - 1.158,93 / (0.730957 * 3.154,55) = 0.4974 (49,74%)
    // PV alternativo Custo + Margem com margem 49,74% deve convergir em R$ 3.154,55
    const product: MarkupProductItem = {
      id: 'prod-auditoria',
      name: 'Produto Auditoria',
      cost: 1158.93,
      margin: 0,
      quantity: 1,
      salePrice: 3154.55,
      totalRevenue: 3154.55,
      totalCost: 1158.93,
      taxFactor: 0.7085,
      completeFactor: 0.7085,
      mode: 'liquid',
      desiredNetRevenue: 2235,
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
    // Modo ativo
    expect(res.activeTriad.salePrice).toBe(3154.55)
    expect(res.activeTriad.netMarginPct).toBe(44.93)
    expect(res.activeTriad.lle).toBe(1004.15)
    expect(res.activeTriad.entryMarginPct).toBe(49.74)

    // Modo alternativo: convergência REAL
    expect(res.alternativeTriad).not.toBeNull()
    if (res.alternativeTriad) {
      expect(res.alternativeTriad.entryMarginPct).toBe(49.74)
      expect(res.alternativeTriad.salePrice).toBe(3154.55)
      expect(Math.abs(res.alternativeTriad.salePrice - res.activeTriad.salePrice)).toBeLessThan(
        0.05,
      )
      expect(res.alternativeTriad.netMarginPct).toBe(44.93)
      expect(res.alternativeTriad.entryMarginFormatted).toContain('(convergente)')
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
    // Margem de entrada rotulada separadamente
    expect(res.activeTriad.entryMarginPct).toBe(20)
    // Margem líquida apurada canônica pós-IRPJ/CSLL
    expect(res.activeTriad.netMarginPct).toBeDefined()
    expect(res.activeTriad.netMarginDerived).toBe(true)

    // Tríade Alternativa (Receita Líquida)
    expect(res.alternativeTriad).not.toBeNull()
    if (res.alternativeTriad) {
      expect(res.alternativeTriad.mode).toBe('liquid')
      // A meta líquida derivada deve usar o divisor aditivo canônico (0.7085)
      expect(res.alternativeTriad.anchorValue).toBeGreaterThan(0)
      // Ambas as margens líquidas apuradas devem ser idênticas
      expect(res.alternativeTriad.netMarginPct).toBe(res.activeTriad.netMarginPct)
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
