/**
 * ============================================================================
 * BLINDAGEM DA MÁXIMA DA CASA (comando da CEO Adriana Pulhez, 27/09/2026):
 * A IT NUNCA FAZ MÉDIA DE VALORES ENTRE PRODUTOS DIFERENTES — nunca gera média
 * entre itens importados da Calculadora de Compras. Informação unitária é POR
 * ITEM. Estes testes TRAVAM a máxima: qualquer alteração futura que reintroduza
 * média/agregação entre itens quebra a suíte e para o pipeline.
 * ============================================================================
 */
import { describe, expect, it } from 'vitest'
import { CONFIG_PADRAO_ART12, CRONOGRAMA_ART12, computeCellArt12 } from './art12Calculations'
import { derivarCasoUnitario, type ItemIntegracaoArt12 } from './integracaoComprasArt12'

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

describe('MÁXIMA DA CASA — nunca média entre produtos diferentes (CEO, 27/09)', () => {
  it('UM item → célula calcula sobre o unitário REAL do item (celular: 30 × 1.400 + 400 = ouros)', () => {
    const { input, item, pendentesPorItem } = derivarCasoUnitario([celular])
    expect(item?.id).toBe('cel')
    expect(pendentesPorItem).toHaveLength(0)
    expect(input).not.toBeNull()
    expect(input!.quantity).toBe(30)
    expect(input!.unitPrice).toBe(1400)
    expect(input!.freightValue).toBe(400)
    const cell = computeCellArt12(input!, { ...CONFIG_PADRAO_ART12 }, row2027)
    // ouros chancelados do caso canônico (que É o celular)
    expect(fmt(cell.hoje.unitario)).toBe('1158.93')
    expect(fmt(cell.exercicio.unitario)).toBe('1116.63')
    expect(fmt(cell.deltaPct)).toBe('-3.65')
  })

  it('DOIS itens NUNCA agregam: sem média de preço/qtd/alíquota — extras ficam pendentes por item', () => {
    const { input, item, pendentesPorItem } = derivarCasoUnitario([celular, capa])
    // a célula calcula sobre o PRIMEIRO item (maior valor), unitário real dele:
    expect(item?.id).toBe('cel')
    expect(input!.quantity).toBe(30) // NÃO 60 (soma proibida)
    expect(input!.unitPrice).toBe(1400) // NÃO 716,67 (média proibida)
    expect(input!.freightValue).toBe(400) // NÃO 450
    expect(input!.icmsRate).toBe(18) // NÃO média
    // a capa NÃO sumiu: fica pendente para o cálculo por item (próxima etapa)
    expect(pendentesPorItem).toHaveLength(1)
    expect(pendentesPorItem[0].id).toBe('capa')
  })

  it('ordem por valor: o item de MAIOR valor comanda a célula; demais ficam pendentes', () => {
    const { item, pendentesPorItem } = derivarCasoUnitario([capa, celular])
    expect(item?.id).toBe('cel')
    expect(pendentesPorItem.map((p) => p.id)).toEqual(['capa'])
  })

  it('ZERO itens → célula zerada (zero na origem, zero na célula)', () => {
    const { input, item, pendentesPorItem } = derivarCasoUnitario([])
    expect(input).toBeNull()
    expect(item).toBeNull()
    expect(pendentesPorItem).toHaveLength(0)
  })

  it('item zerado (Zerar campos) → célula zerada, sem média fantasma', () => {
    const zerado: ItemIntegracaoArt12 = {
      ...celular,
      quantity: 0,
      merchandiseValue: 0,
      freightValue: 0,
      valorNota: 0,
    }
    const { input } = derivarCasoUnitario([zerado])
    expect(input).toBeNull()
  })
})
