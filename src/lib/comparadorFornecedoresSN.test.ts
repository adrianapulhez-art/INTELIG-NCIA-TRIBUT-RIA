/**
 * BLINDAGEM DO COMPARADOR DE FORNECEDORES SN (30/09) — caso canônico travado.
 * Nenhum número novo: os dois lados saem dos motores chancelados.
 * Puro: nota 42.400,00 − crédito 1.768,08 = 1.354,40/un (sessão SN)
 * Híbrido: motor Art. 12 chancelado = 1.413,33/un (ouro)
 */
import { compararFornecedoresSN } from './comparadorFornecedoresSN'
import { PERFIL_SN_NOTA_PADRAO } from './art12SnCalculations'
import { CONFIG_PADRAO_ART12, CRONOGRAMA_ART12 } from './art12Calculations'
import { montarItensIntegracao } from './integracaoComprasArt12'
import { describe, expect, it } from 'vitest'

const item = montarItensIntegracao([
  {
    id: 'purch-1',
    name: 'Celular Samsung (exemplo)',
    quantity: 30,
    merchandiseValue: 42000,
    freightValue: 400,
    icmsRate: 18,
    icmsFreightRate: 18,
    ipiRate: 0,
    hasSt: false,
    stValue: 0,
  },
])[0]
const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
const cfg = { ...CONFIG_PADRAO_ART12, repasse: 'integral' as const }
const custoPleno = 1116.63 // ouro LP×LP chancelado

describe('Comparador de fornecedores SN — os dois lados dos motores chancelados', () => {
  it('LP comprando: puro 1.354,40 × híbrido 1.413,33 — puro vence por 58,93', () => {
    const c = compararFornecedoresSN(item, PERFIL_SN_NOTA_PADRAO, 'presumido', cfg, row, custoPleno)
    // PURO — motor da sessão
    expect(c.puro.precoNota).toBe(42400)
    expect(c.puro.credito).toBe(1768.08)
    expect(c.puro.unitario).toBe(1354.4)
    expect(c.puro.estoque).toBe(40631.92)
    expect(c.puro.gap).toBe(237.77)
    // HÍBRIDO — motor Art. 12 chancelado (ouro)
    expect(c.hibrido.unitario).toBe(1413.33)
    expect(c.hibrido.estoque).toBe(42399.9)
    expect(c.hibrido.gap).toBe(296.7)
    // Diferenças
    expect(c.diffUnitario).toBe(-58.93)
    expect(c.diffEstoque).toBe(-1767.98)
  })

  it('SN comprando: sem crédito dos dois lados — puro = híbrido = 1.413,33 (ouro)', () => {
    const c = compararFornecedoresSN(item, PERFIL_SN_NOTA_PADRAO, 'simples', cfg, row, custoPleno)
    // Optante não apropria crédito de nota SN puro (art. 47)
    expect(c.puro.credito).toBe(0)
    expect(c.puro.unitario).toBe(1413.33)
    // E o híbrido também fecha em 1.413,33 (ouro chancelado)
    expect(c.hibrido.unitario).toBe(1413.33)
    expect(c.diffUnitario).toBe(0)
  })

  it('gap de negociação dos dois lados é coerente com a célula plena', () => {
    const c = compararFornecedoresSN(item, PERFIL_SN_NOTA_PADRAO, 'presumido', cfg, row, custoPleno)
    // gap = unitário − célula plena
    expect(c.puro.gap).toBe(Math.round((c.puro.unitario - custoPleno) * 100) / 100)
    expect(c.hibrido.gap).toBe(Math.round((c.hibrido.unitario - custoPleno) * 100) / 100)
  })
})
