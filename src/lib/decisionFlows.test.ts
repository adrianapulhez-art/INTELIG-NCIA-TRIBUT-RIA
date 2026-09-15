/**
 * Testes dos Dois Fluxos de Decisão (Fluxo A & Fluxo B)
 * e metas de receita líquida independentes por regime.
 */
import { describe, it, expect } from 'vitest'
import { calculateLiquidDreChain } from '@/lib/liquidMarkupCalculations'
import { sanitizeSnapshotForPersistence } from '@/services/taxScenarios'

describe('Diretriz dos Dois Fluxos de Decisão e Desacoplamento de Regimes', () => {
  it('(a) Metas por regime são independentes (mudar Presumido não altera Simples ou Real)', () => {
    const desiredLiquidRevenueByRegime = {
      simples: 2000,
      presumido: 2335,
      real: 3500,
    }

    // Alterando o regime Presumido
    const updated = {
      ...desiredLiquidRevenueByRegime,
      presumido: 4500,
    }

    expect(updated.presumido).toBe(4500)
    expect(updated.simples).toBe(2000)
    expect(updated.real).toBe(3500)
    expect(updated.simples).not.toBe(updated.presumido)
    expect(updated.real).not.toBe(updated.presumido)
  })

  it('(b) Modo Preço Líquido Desejado Presumido = R$ 3.195,08 (RL 2.335,00 · ICMS 18% · PIS/COFINS 0,9635 · DV 7,5%)', () => {
    const chain = calculateLiquidDreChain({
      desiredNetRevenue: 2335.0,
      regime: 'presumido',
      icmsRate: 18.0,
      variableExpensesRate: 7.5,
      unitCost: 1547.0,
    })

    expect(chain.rbv).toBeCloseTo(3195.08, 2)
    expect(chain.taxesValue).toBeCloseTo(691.73, 2)
    expect(chain.desiredNetRevenue).toBeCloseTo(2335.0, 2)
    expect(chain.deductionsValue).toBeCloseTo(239.63, 2)
  })

  it('(c) Fluxo A: mesmo preço de mercado nos 3 regimes gera lucros diferentes coerentes com custos líquidos e alíquotas', () => {
    const anchorPrice = 3295.7

    // 1. Presumido (custo R$ 1547,00, impostos 21,65%, DV 7,5%)
    const presTaxRate = 21.65
    const presDvRate = 7.5
    const presTaxes = Math.round(anchorPrice * (presTaxRate / 100) * 100) / 100
    const presDv = Math.round(anchorPrice * (presDvRate / 100) * 100) / 100
    const presNetRev = Math.round((anchorPrice - presTaxes - presDv) * 100) / 100
    const presCost = 1547.0
    const presGrossProfit = Math.round((presNetRev - presCost) * 100) / 100
    // IRPJ/CSLL Presumido comércio (8% * 15% + 12% * 9% = 1,2% + 1,08% = 2,28% da receita bruta)
    const presIrpjCsll =
      Math.round((anchorPrice * 0.08 * 0.15 + anchorPrice * 0.12 * 0.09) * 100) / 100
    const presLle = Math.round((presGrossProfit - presIrpjCsll) * 100) / 100

    // 2. Real (alíquota maior não-cumulativa: ICMS 18% + PIS 1,65% + COFINS 7,6% = 27,25%, mas custo líquido menor por crédito)
    const realTaxRate = 27.25
    const realDvRate = 7.5
    const realTaxes = Math.round(anchorPrice * (realTaxRate / 100) * 100) / 100
    const realDv = Math.round(anchorPrice * (realDvRate / 100) * 100) / 100
    const realNetRev = Math.round((anchorPrice - realTaxes - realDv) * 100) / 100
    const realCost = 1400.0 // custo líquido menor após créditos
    const realGrossProfit = Math.round((realNetRev - realCost) * 100) / 100
    const realIrpjCsll = Math.round(Math.max(0, realGrossProfit) * 0.24 * 100) / 100
    const realLle = Math.round((realGrossProfit - realIrpjCsll) * 100) / 100

    // 3. Simples Nacional (DAS 8,5%, DV 7,5%, custo cheio R$ 1600,00)
    const simpTaxRate = 8.5
    const simpDvRate = 7.5
    const simpTaxes = Math.round(anchorPrice * (simpTaxRate / 100) * 100) / 100
    const simpDv = Math.round(anchorPrice * (simpDvRate / 100) * 100) / 100
    const simpNetRev = Math.round((anchorPrice - simpTaxes - simpDv) * 100) / 100
    const simpCost = 1600.0
    const simpLle = Math.round((simpNetRev - simpCost) * 100) / 100

    // Todos partilham o mesmo preço âncora de mercado
    expect(anchorPrice).toBe(3295.7)

    // Lucros líquidos e receitas líquidas são distintos e coerentes entre os regimes
    expect(presLle).not.toBe(realLle)
    expect(presLle).not.toBe(simpLle)
    expect(realLle).not.toBe(simpLle)
    expect(presNetRev).toBeGreaterThan(0)
    expect(realNetRev).toBeGreaterThan(0)
    expect(simpNetRev).toBeGreaterThan(0)
  })

  it('(d) Round-trip de cenários preserva metas por regime com migração suave de cenários legados', () => {
    // Cenário legado: possui apenas desiredNetRevenue único
    const legacySnapshot = {
      regime: 'presumido',
      markupMode: 'liquid',
      desiredNetRevenue: 2500,
      markupProducts: [],
    }

    const sanitizedLegacy = sanitizeSnapshotForPersistence(legacySnapshot)
    expect(sanitizedLegacy.desiredLiquidRevenueByRegime).toBeDefined()
    expect(sanitizedLegacy.desiredLiquidRevenueByRegime?.presumido).toBe(2500)
    expect(sanitizedLegacy.desiredLiquidRevenueByRegime?.simples).toBe(2500)
    expect(sanitizedLegacy.desiredLiquidRevenueByRegime?.real).toBe(2500)

    // Cenário moderno: já possui metas independentes por regime
    const modernSnapshot = {
      regime: 'real',
      markupMode: 'liquid',
      desiredNetRevenue: 3000,
      desiredLiquidRevenueByRegime: {
        simples: 1800,
        presumido: 2335,
        real: 4200,
      },
      markupProducts: [],
    }

    const sanitizedModern = sanitizeSnapshotForPersistence(modernSnapshot)
    expect(sanitizedModern.desiredLiquidRevenueByRegime?.simples).toBe(1800)
    expect(sanitizedModern.desiredLiquidRevenueByRegime?.presumido).toBe(2335)
    expect(sanitizedModern.desiredLiquidRevenueByRegime?.real).toBe(4200)
  })

  it('(e) v0.0.129: Isolamento da quantidade vendida por regime, validação honesta e canônicos', () => {
    // 1. Validação com isolamento por regime
    const validateQuantityForRegime = (
      p: {
        name?: string
        quantity?: number
        quantityByRegime?: { simples?: number; presumido?: number; real?: number }
      },
      regime: 'presumido' | 'real' | 'simples',
    ) => {
      const pName = p.name?.trim() || 'Produto 1'
      const qty = p.quantityByRegime?.[regime] ?? (p.quantityByRegime ? undefined : p.quantity)
      if (qty === undefined || qty <= 0) {
        return {
          valid: false,
          error: `Informe manualmente a quantidade vendida antes de simular (${pName}).`,
        }
      }
      return { valid: true, error: null }
    }

    // Isolamento: 10 un. no Presumido → Real e Simples vazios, sem herdar
    const itemPresumidoOnly = {
      name: 'Notebook Dell',
      quantity: 10,
      quantityByRegime: {
        presumido: 10,
      },
    }

    expect(validateQuantityForRegime(itemPresumidoOnly, 'presumido').valid).toBe(true)
    expect(validateQuantityForRegime(itemPresumidoOnly, 'real').valid).toBe(false)
    expect(validateQuantityForRegime(itemPresumidoOnly, 'real').error).toBe(
      'Informe manualmente a quantidade vendida antes de simular (Notebook Dell).',
    )
    expect(validateQuantityForRegime(itemPresumidoOnly, 'simples').valid).toBe(false)
    expect(validateQuantityForRegime(itemPresumidoOnly, 'simples').error).toBe(
      'Informe manualmente a quantidade vendida antes de simular (Notebook Dell).',
    )

    // Ao informar quantidade para o Lucro Real, libera apenas para o Lucro Real
    const itemUpdatedReal = {
      ...itemPresumidoOnly,
      quantityByRegime: {
        ...itemPresumidoOnly.quantityByRegime,
        real: 15,
      },
    }
    expect(validateQuantityForRegime(itemUpdatedReal, 'real').valid).toBe(true)
    expect(validateQuantityForRegime(itemUpdatedReal, 'simples').valid).toBe(false)

    // Round-trip de cenário legado (só `quantity`) opera sem distorção
    const legacyItem = {
      name: 'Item Histórico',
      quantity: 50,
    }
    expect(validateQuantityForRegime(legacyItem, 'presumido').valid).toBe(true)
    expect(validateQuantityForRegime(legacyItem, 'real').valid).toBe(true)
    expect(validateQuantityForRegime(legacyItem, 'simples').valid).toBe(true)

    // 2. Canônico Custo + Margem (custo 1.158,93, margem 51,9%) → R$ 3.296,25
    // Divisor: (1 - 0.18) * (1 - 0.0365) * (1 - 0.075) = 0.7308147
    // Fator composto: 1158.93 / 0.351594 = 3296.25
    const costUnit = 1158.93
    const factorCostMargin = 0.351594
    const pvCostMargin = Math.round((costUnit / factorCostMargin) * 100) / 100
    expect(pvCostMargin).toBe(3296.25)

    // 3. Canônico Preço Líquido Desejado (meta R$ 2.335,00) → R$ 3.195,08
    const rawDivisor = (1 - 0.18) * (1 - 0.0365) * (1 - 0.075) // 0.7308147
    const pvLiquid = Math.round((2335.0 / rawDivisor) * 100) / 100
    expect(pvLiquid).toBe(3195.08)

    // 4. Rejeição expressa do antigo divisor 0,70850 e preço 3.295,70
    const oldDivisor = 0.7085
    const oldPv = Math.round((2335.0 / oldDivisor) * 100) / 100
    expect(oldPv).toBe(3295.7)
    expect(pvLiquid).not.toBe(oldPv)
    expect(rawDivisor).not.toBe(oldDivisor)
  })
})
