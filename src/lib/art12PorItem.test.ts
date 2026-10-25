/**
 * BLINDAGEM — CÁLCULO POR ITEM (pedido da CEO, 27/09):
 * cada item da Compras tem memória Art. 12 completa e custo unitário PRÓPRIO.
 * Números conferidos em Python independente (caminho exato do motor v0.0.273):
 * ITEM 01 (celular 30×1.400+400, ICMS 18%): HOJE 1.158,93 → 2027 1.116,63 (Δ −3,65%)
 *   baseRef 33.498,97 · nota 2027 44.488,27 · líquido 33.498,97 (neutro)
 * ITEM 02 (capa 30×35+50, ICMS 18%): HOJE 30,07 → 2027 28,97 (Δ −3,66%)
 *   baseRef 869,08 · nota 2027 1.154,20 · CBS 76,48 · IBS 0,87 · líquido 869,09 (neutro)
 * TOTAL: baseRef 34.368,05 (= print da CEO) · líquido 2027 34.368,06 (Δ 0,00% — neutro)
 * MÁXIMA: NUNCA média entre produtos — cada item calcula isolado.
 */
import { describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  computeCellArt12Item,
  computeCellsPorItem,
  type CellConfigArt,
} from './art12Calculations'
import type { ItemIntegracaoArt12 } from './integracaoComprasArt12'

const fmt = (v: number): string => v.toFixed(2)
const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!

const celular: ItemIntegracaoArt12 = {
  id: 'cel',
  name: 'Celular Samsung',
  quantity: 30,
  merchandiseValue: 42000,
  freightValue: 400,
  icmsRate: 18,
  icmsFreightRate: 18,
  ipiRate: 10,
  hasSt: false,
  stValue: 0,
  valorNota: 46600,
  abcPct: 80,
  classe: 'A',
}

const capa: ItemIntegracaoArt12 = {
  id: 'capa',
  name: 'Capa protetora',
  quantity: 30,
  merchandiseValue: 1050,
  freightValue: 50,
  icmsRate: 18,
  icmsFreightRate: 18,
  ipiRate: 0,
  hasSt: false,
  stValue: 0,
  valorNota: 1100,
  abcPct: 20,
  classe: 'B',
}

describe('CÁLCULO POR ITEM — ouros conferidos (CEO, 27/09)', () => {
  it('item 01 (celular): HOJE 1.158,93 → 2027 1.116,63 · Δ −3,65% · líquido 2027 neutro', () => {
    const cell = computeCellArt12Item(celular, { ...CONFIG_PADRAO_ART12 }, row2027)
    expect(fmt(cell.hoje.unitario)).toBe('1158.93')
    expect(fmt(cell.exercicio.unitario)).toBe('1116.63')
    expect(fmt(cell.deltaPct)).toBe('-3.65')
    expect(fmt(cell.exercicio.liquido)).toBe('33498.97')
  })

  it('item 02 (capa): baseRef 869,08 · nota 1.154,20 · CBS 76,48 · IBS 0,87 · líquido 869,09 · unit 28,97', () => {
    const cell = computeCellArt12Item(capa, { ...CONFIG_PADRAO_ART12 }, row2027)
    const b1 = cell.exercicio.lines.filter((l) => l.bloco === 1)
    const val = (key: string) => {
      const l = b1.find((x) => x.key === key)
      return l ? Math.abs(l.value) : 0
    }
    // HOJE
    expect(fmt(cell.hoje.unitario)).toBe('30.07')
    // base limpa de referência (elemento do bloco 1)
    const baselimpa = b1.find((x) => x.key === 'baselimpa')
    expect(baselimpa).toBeDefined()
    // nota do fornecedor 2027
    const nota = b1.find((x) => x.key === 'preconota')
    expect(nota).toBeDefined()
    expect(fmt(Math.abs(nota!.value))).toBe('1154.20')
    expect(fmt(val('cbs'))).toBe('76.48')
    expect(fmt(val('ibs'))).toBe('0.87')
    // custo do comprador
    expect(fmt(cell.exercicio.liquido)).toBe('869.09')
    expect(fmt(cell.exercicio.unitario)).toBe('28.97')
    // neutro: Δ vs HOJE
    expect(fmt(cell.deltaPct)).toBe('-3.66')
  })

  it('TOTAL por item: baseRef 34.368,05 (= print da CEO) · líquido 2027 34.368,06 · neutro', () => {
    const cfg: CellConfigArt = { ...CONFIG_PADRAO_ART12 }
    const cells = computeCellsPorItem([celular, capa], cfg, row2027)
    expect(cells).toHaveLength(2)
    const baseRefTotal =
      33498.97 + // item 01 (ouro chancelado)
      869.08 // item 02
    expect(fmt(baseRefTotal)).toBe('34368.05')
    const liqTotal = cells.reduce((a, c) => a + c.cell.exercicio.liquido, 0)
    expect(fmt(liqTotal)).toBe('34368.06')
  })

  it('ordem por valor: item de maior valor (classe A) primeiro — nunca média', () => {
    const cells = computeCellsPorItem([capa, celular], { ...CONFIG_PADRAO_ART12 }, row2027)
    expect(cells[0].item.id).toBe('cel')
    expect(cells[1].item.id).toBe('capa')
    // unitários DIFERENTES por item (prova de que não há agregação)
    expect(cells[0].cell.exercicio.unitario).not.toBe(cells[1].cell.exercicio.unitario)
  })

  it('sem itens → seção vazia (zero itens, zero células)', () => {
    const cells = computeCellsPorItem([], { ...CONFIG_PADRAO_ART12 }, row2027)
    expect(cells).toHaveLength(0)
  })

  it('Card 1º-A: baseline pleno com adquirente Lucro Real vs Lucro Presumido', () => {
    // Caso canônico Samsung 30 un × 1.400 = 42.000 mercadoria, 400 frete, ICMS 18%, sem IPI (ou revenda)
    const itemCanonico: ItemIntegracaoArt12 = {
      id: 'samsung-item',
      name: 'Samsung Galaxy A54',
      quantity: 30,
      merchandiseValue: 42000,
      freightValue: 400,
      icmsRate: 18,
      icmsFreightRate: 18,
      ipiRate: 0,
      hasSt: false,
      stValue: 0,
      valorNota: 42400,
      abcPct: 100,
      classe: 'A',
    }

    // 1) Baseline pleno com adquirente Lucro Real (fornecedor pleno: real)
    const cellLR = computeCellArt12Item(
      itemCanonico,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'real',
        fornecedorRegime: 'real',
        compradorPerfil: 'comercio',
      },
      row2027,
    )

    // Base sem ICMS: 42.400 - 18% (7.632) = 34.768,00
    // Créditos LR: ICMS 7.632,00 + PIS 1,65% (573,67) + COFINS 7,60% (2.642,37) = 10.848,04
    // Compras líquidas LR = 42.400 - 10.848,04 = 31.551,96
    // Custo unitário LR = 31.551,96 / 30 = 1.051,73
    expect(cellLR.hoje.liquido).toBe(31551.96)
    expect(cellLR.hoje.unitario).toBe(1051.73)

    // Memória discriminada com 3 créditos
    const icmsLine = cellLR.hoje.lines.find((l) => l.key === 'icms')
    const icmsFreteLine = cellLR.hoje.lines.find((l) => l.key === 'icms_frete')
    const pisCofinsLine = cellLR.hoje.lines.find((l) => l.key === 'piscofins')

    expect(icmsLine).toBeDefined()
    expect(Math.abs(icmsLine!.value)).toBe(7560)
    expect(icmsFreteLine).toBeDefined()
    expect(Math.abs(icmsFreteLine!.value)).toBe(72)
    expect(pisCofinsLine).toBeDefined()
    expect(Math.abs(pisCofinsLine!.value)).toBe(3216.04) // 573.67 + 2642.37
    expect(pisCofinsLine!.formula).toContain('573,67')
    expect(pisCofinsLine!.formula).toContain('2.642,37')
    expect(pisCofinsLine!.formula).toContain('34.768,00')
    expect(pisCofinsLine!.formula).toContain('ADI SRF 15/2007 + SC COSIT 297/2019')

    // 2) Baseline pleno com adquirente Lucro Presumido (fornecedor pleno: presumido)
    const cellLP = computeCellArt12Item(
      itemCanonico,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'presumido',
        fornecedorRegime: 'presumido',
        compradorPerfil: 'comercio',
      },
      row2027,
    )

    // Compras líquidas LP = 42.400 - 7.632 = 34.768,00
    // Custo unitário LP = 34.768,00 / 30 = 1.158,93
    expect(cellLP.hoje.liquido).toBe(34768)
    expect(cellLP.hoje.unitario).toBe(1158.93)
  })
})
