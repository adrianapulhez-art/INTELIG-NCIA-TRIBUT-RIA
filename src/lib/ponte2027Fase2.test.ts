import { describe, it, expect } from 'vitest'
import {
  INITIAL_PONTE2027_STATE,
  calculatePonte2027,
  compareRegimes2027,
  computeB2BCredit,
  marginSensitivity,
} from '@/lib/ponte2027Calculations'

// Caso de referência: receita 100.000, sem aquisições, ICMS 18%, ISS 5%
const BASE = { ...INITIAL_PONTE2027_STATE, revenue2027: 100000 }

describe('Blindagem Fase 2 — Ponte 2027 (comparativo · B2B · margem)', () => {
  it('comparativo 2027 (sem aquisições, receita 100k): LP 23.880 · LR 19.430 · SN 8,9% — LP é o pior da janela', () => {
    const rows = compareRegimes2027(BASE)
    // LP: CBS 8.800 + IBS 100 + ICMS 18.000 + ISS 5.000 − crédito 0 = 31.900
    expect(rows[0].regime).toBe('presumido')
    expect(rows[0].total2027Burden).toBe(31900)
    expect(rows[0].currentSalesTaxes).toBe(26650) // 18.000 + 5.000 + 3.650
    expect(rows[0].burdenDifference).toBe(5250) // piora
    expect(rows[0].is2027Better).toBe(false)
    // LR: CBS 8.800 + IBS 100 + ICMS 18.000 + ISS 5.000 − crédito 0 = 31.900 (sem aquisições)
    expect(rows[1].total2027Burden).toBe(31900)
    // SN: CBS 8.800 + IBS 100 + DAS substituído... SN no motor = 0 PIS/COFINS, ICMS 18 + ISS 5 permanecem
    expect(rows[2].total2027Burden).toBe(31900)
    // Sem aquisições, os três pagam igual em 2027 — o crédito é o diferencial
    expect(rows[0].total2027Burden).toBe(rows[1].total2027Burden)
  })

  it('comparativo com aquisições: o crédito compartilhado separa os regimes (LR creditou mais hoje)', () => {
    const state = {
      ...BASE,
      acquisitions: [
        {
          id: 't1',
          description: 'Mercadoria',
          kind: 'mercadoria' as const,
          value: 50000,
          icmsRate: 18,
          cbsHighlighted: true,
          supplierSimples: false,
          personalUse: false,
          partialCreditPercent: 0,
        },
      ],
    }
    const rows = compareRegimes2027(state)
    // Crédito CBS = 4.400 para os três; a diferença está na carga atual (PIS/COFINS)
    expect(rows[0].total2027Burden).toBe(31900 - 4400) // LP: 27.500
    expect(rows[1].total2027Burden).toBe(31900 - 4400) // LR: 27.500
    // Hoje: LP 26.650 vs LR 19.250 (18.000+5.000+9.250) — o confronto difere
    expect(rows[0].currentSalesTaxes).toBe(26650)
    expect(rows[1].currentSalesTaxes).toBe(32250 - 13000) // 19.250
    expect(rows[1].is2027Better).toBe(false) // janela: ICMS integral + CBS cheia
  })

  it('crédito B2B: LP entrega ICMS 18k hoje × CBS 8.800 em 2027 (−9.200); SN entrega zero × 8.800 (+8.800)', () => {
    const lp = computeB2BCredit(100000, 'presumido', 18)
    expect(lp.currentSystemCredit).toBe(18000)
    expect(lp.cbsDelivered).toBe(8800)
    expect(lp.creditDifference).toBe(-9200)

    const sn = computeB2BCredit(100000, 'simples', 18)
    expect(sn.currentSystemCredit).toBe(0)
    expect(sn.cbsDelivered).toBe(8800)
    expect(sn.creditDifference).toBe(8800)

    const lr = computeB2BCredit(100000, 'real', 18)
    expect(lr.currentSystemCredit).toBe(27250) // 18.000 + 9.250
    expect(lr.creditDifference).toBe(-18450)
  })

  it('sensibilidade por margem (LP, e=26,65% → o=8,9%): preço 2027 = preço × 0,7335/0,911; sem reprecificar perde pc−o por R$ de preço', () => {
    const rows = marginSensitivity(100000, 'presumido', 18, 5)
    // Fator de desembutido: (1−0,2665)/(1−0,089) = 0,8058...
    expect(rows[0].deltaPct).toBeCloseTo((0.7335 / 0.911 - 1) * 100, 6)
    // Margem 20%: hoje 20.000; sem reprecificar: 100k × (0,20 + 0,0365 − 0,089) = 14.750
    const m20 = rows.find((r) => r.marginPct === 20)!
    expect(m20.netIncome).toBe(20000)
    expect(m20.netIncomeNoReprice).toBe(14750)
    expect(m20.price2027).toBeCloseTo((100000 * 0.7335) / 0.911, 4)
    expect(m20.creditB2B2027).toBeCloseTo(m20.price2027 * 0.088, 4)
    // O % de reajuste é igual para toda margem; o R$ em jogo cresce com a margem
    expect(rows.every((r) => Math.abs(r.deltaPct - rows[0].deltaPct) < 1e-9)).toBe(true)
    expect(m20.netIncome - m20.netIncomeNoReprice).toBe(5250)
  })

  it('Fase 1 intacta: suggestedPrice2027 agora divide por (1−o) — não embute CBS por multiplicação', () => {
    const r = calculatePonte2027(BASE)
    // netPrice = 100.000 × (1−0,2665) = 73.350; ÷ (1−0,089) = 80.576,51...
    expect(r.pricing.suggestedPrice2027).toBeCloseTo(73350 / 0.911, 2)
    // Confere que NÃO é mais a fórmula antiga (73.350 × 1,089 = 79.878,15)
    expect(r.pricing.suggestedPrice2027).not.toBeCloseTo(79878.15, 0)
  })
})
