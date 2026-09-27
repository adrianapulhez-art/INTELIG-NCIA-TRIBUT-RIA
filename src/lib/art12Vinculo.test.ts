/**
 * BLINDAGEM — VÍNCULO AUTOMÁTICO Compras → CMV Art. 12 (regra da CEO, 25/09):
 * zero na origem = zero na célula; item canônico na origem = ouros chancelados.
 */
import { describe, expect, it } from 'vitest'
import {
  CASO_CANONICO_ART12,
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  computeCellArt12,
} from './art12Calculations'
import { derivarCasoDeItens, type ItemIntegracaoArt12 } from './integracaoComprasArt12'

const fmt = (v: number): string => v.toFixed(2)
const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!

const itemCanonico: ItemIntegracaoArt12 = {
  id: 'canonico',
  name: 'Item canônico',
  quantity: 30,
  merchandiseValue: 42000,
  freightValue: 400,
  icmsRate: 18,
  icmsFreightRate: 18,
  ipiRate: 10,
  hasSt: false,
  stValue: 0,
  valorNota: 46600,
  abcPct: 100,
  classe: 'A',
}

describe('VÍNCULO AUTOMÁTICO — zero na origem = zero na célula (CEO, 25/09)', () => {
  it('Compras ZERADA (nenhum item) → célula custa 0 nos dois lados', () => {
    const input = derivarCasoDeItens([])
    expect(input.quantity).toBe(0)
    expect(input.unitPrice).toBe(0)
    expect(input.freightValue).toBe(0)
    const cell = computeCellArt12(input, { ...CONFIG_PADRAO_ART12 }, row2027)
    expect(cell.hoje.unitario).toBe(0)
    expect(cell.exercicio.unitario).toBe(0)
    expect(cell.hoje.bruto).toBe(0)
    expect(cell.exercicio.bruto).toBe(0)
  })

  it('item "Zerar campos" (qtd 0, mercadoria 0) → célula zerada', () => {
    const zerado: ItemIntegracaoArt12 = {
      ...itemCanonico,
      quantity: 0,
      merchandiseValue: 0,
      freightValue: 0,
      valorNota: 0,
    }
    const input = derivarCasoDeItens([zerado])
    expect(input.quantity).toBe(0)
    const cell = computeCellArt12(input, { ...CONFIG_PADRAO_ART12 }, row2027)
    expect(cell.hoje.unitario).toBe(0)
    expect(cell.exercicio.unitario).toBe(0)
  })
})

describe('OUROS CHANCELADOS — item canônico na origem reproduz ao centavo', () => {
  it('item canônico → HOJE 1.158,93 · exercício 1.116,63 · Δ −3,65%', () => {
    const input = derivarCasoDeItens([itemCanonico])
    expect(input.quantity).toBe(30)
    expect(input.unitPrice).toBe(1400)
    expect(input.freightValue).toBe(400)
    const cell = computeCellArt12(input, { ...CONFIG_PADRAO_ART12 }, row2027)
    expect(fmt(cell.hoje.unitario)).toBe('1158.93')
    expect(fmt(cell.exercicio.unitario)).toBe('1116.63')
    expect(fmt(cell.deltaPct)).toBe('-3.65')
  })

  it('caso canônico do motor segue intacto (referência de teste)', () => {
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row2027)
    expect(fmt(cell.hoje.unitario)).toBe('1158.93')
    expect(fmt(cell.exercicio.unitario)).toBe('1116.63')
  })
})
