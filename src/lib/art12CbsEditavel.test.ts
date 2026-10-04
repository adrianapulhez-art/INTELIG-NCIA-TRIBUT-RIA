/**
 * ============================================================================
 * BLINDAGEM — CBS EDITÁVEL 2027/2028 (decisão da CEO, 04/10)
 * ============================================================================
 * Regra da rodada: o campo editável NÃO pode alterar os ouros chancelados no
 * default (8,8% — premissa IT: referência estimada já reduzida em 0,1 p.p.,
 * art. 347). O override só recalcula quando o contador digita outro valor.
 * 2026 é CRAVADO EM LEI (art. 342: 0,9%) — override NUNCA se aplica.
 * IBS 2027-28 = 0,1% cravado (art. 344) — intocado em qualquer override.
 */
import { describe, it, expect } from 'vitest'
import {
  CASO_CANONICO_ART12,
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  computeCellArt12,
  aplicarOverrideCbsArt12,
  CBS_EDITAVEL_EXERCICIOS,
  CBS_DEFAULT,
} from './art12Calculations'

const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
const row2028 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2028)!
const row2026 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2026)!

describe('CBS editável — default preserva os ouros chancelados', () => {
  it('aplicarOverrideCbsArt12 sem override devolve a linha ORIGINAL (mesmo objeto)', () => {
    expect(aplicarOverrideCbsArt12(row2027, undefined)).toBe(row2027)
  })

  it('default 8,8% = ouro LP×LP integral 2027 1.116,63 (intacto)', () => {
    const cell = computeCellArt12(CASO_CANONICO_ART12, CONFIG_PADRAO_ART12, row2027)
    expect(cell.exercicio.unitario).toBeCloseTo(1116.63, 2)
  })

  it('override em 2027 muda a CBS da linha e recalcula o custo', () => {
    const rowOv = aplicarOverrideCbsArt12(row2027, 9.5)
    expect(rowOv.cbsRate).toBe(9.5)
    expect(rowOv).not.toBe(row2027)
    // original intocado (imutabilidade)
    expect(row2027.cbsRate).toBe(8.8)
    const cellOv = computeCellArt12(CASO_CANONICO_ART12, CONFIG_PADRAO_ART12, rowOv)
    const cellBase = computeCellArt12(CASO_CANONICO_ART12, CONFIG_PADRAO_ART12, row2027)
    // CBS maior → custo do comprador maior (repasse integral: crédito lava, mas a
    // nota sobe mais do que o crédito devolve quando a alíquota sobe)
    expect(cellOv.exercicio.unitario).toBeGreaterThan(cellBase.exercicio.unitario)
  })

  it('override em 2028 funciona igual (mesma regra do art. 347)', () => {
    const rowOv = aplicarOverrideCbsArt12(row2028, 9.5)
    expect(rowOv.cbsRate).toBe(9.5)
  })

  it('2026 é CRAVADO EM LEI — override NUNCA se aplica (art. 342)', () => {
    expect(aplicarOverrideCbsArt12(row2026, 9.5)).toBe(row2026)
    expect(aplicarOverrideCbsArt12(row2026, 9.5).cbsRate).toBe(0.9)
  })

  it('override <= 0 ou inválido é ignorado (devolve a linha original)', () => {
    expect(aplicarOverrideCbsArt12(row2027, 0)).toBe(row2027)
    expect(aplicarOverrideCbsArt12(row2027, -3)).toBe(row2027)
  })

  it('escopo da rodada: só 2027 e 2028 são editáveis (decisão da CEO)', () => {
    expect(CBS_EDITAVEL_EXERCICIOS).toEqual([2027, 2028])
    expect(CBS_DEFAULT).toBe(8.8)
  })

  it('IBS 2027-28 permanece 0,1% cravado em qualquer override (art. 344)', () => {
    const rowOv = aplicarOverrideCbsArt12(row2027, 9.5)
    expect(rowOv.ibsRate).toBe(0.1)
  })
})
