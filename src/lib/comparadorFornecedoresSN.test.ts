/**
 * BLINDAGEM DO COMPARADOR DE FORNECEDORES SN — caso canônico travado.
 * CRITÉRIO IT v2 (chancela CEO, 01/10): base do IBS/CBS do fornecedor híbrido sem o
 * ICMS INCIDENTE na operação (fração do DAS — art. 12, §2º, V + art. 23, §2º) e
 * crédito de ICMS proporcional ao adquirente pleno (art. 23, §1º, redação LC 214/25).
 * Ouros v2: LP/LR×SNH 1.394,11 · SN×SNH 1.537,48 · SNH×SNH 1.413,33 · puro 1.385,35.
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

describe('Comparador de fornecedores SN — os dois lados dos motores chancelados (v2)', () => {
  it('LP comprando: puro 1.385,35 × híbrido 1.394,11 — puro vence por 8,76', () => {
    const c = compararFornecedoresSN(item, PERFIL_SN_NOTA_PADRAO, 'presumido', cfg, row, custoPleno)
    // PURO — motor da sessão corrigido com Anexo I 1ª faixa oficial (crédito 839,52)
    expect(c.puro.precoNota).toBe(42400)
    expect(c.puro.credito).toBe(839.52)
    expect(c.puro.unitario).toBe(1385.35)
    expect(c.puro.estoque).toBe(41560.5) // 1.385,35 × 30
    expect(c.puro.gap).toBe(268.72) // 1.385,35 − 1.116,63
    // HÍBRIDO — critério IT v2 (chancelado Adri): ICMS do DAS 576,64 fora da base; nota 46.124,54;
    // créditos 3.682,69 + 41,85 + 576,64 = 4.301,18 → compras líquidas 41.823,36
    expect(c.hibrido.credito).toBe(4301.18)
    expect(c.hibrido.unitario).toBe(1394.11)
    expect(c.hibrido.estoque).toBe(41823.3)
    expect(c.hibrido.gap).toBe(277.48)
    // Diferenças
    expect(c.diffUnitario).toBe(-8.76)
    expect(c.diffEstoque).toBe(-262.8)
  })

  it('SN comprando: sem crédito dos dois lados — puro 1.413,33 (ouro) × híbrido 1.537,48 (v2)', () => {
    const c = compararFornecedoresSN(item, PERFIL_SN_NOTA_PADRAO, 'simples', cfg, row, custoPleno)
    // Optante não apropria crédito de nota SN puro (art. 47, §9º, I)
    expect(c.puro.credito).toBe(0)
    expect(c.puro.unitario).toBe(1413.33)
    // Híbrido: nota cheia 46.124,54 sem crédito → 1.537,48 (leitura (b) de 28/09)
    expect(c.hibrido.unitario).toBe(1537.48)
    expect(c.diffUnitario).toBe(124.15)
  })

  it('SN híbrido comprando: credita CBS+IBS integral — híbrido fecha 1.413,33 (ouro intacto)', () => {
    const c = compararFornecedoresSN(
      item,
      PERFIL_SN_NOTA_PADRAO,
      'simples_hibrido',
      cfg,
      row,
      custoPleno,
    )
    expect(c.hibrido.unitario).toBe(1413.33)
    // ICMS segue no DAS do adquirente híbrido — sem crédito de ICMS (art. 41)
    expect(c.hibrido.credito).toBe(3724.54)
  })

  it('gap de negociação dos dois lados é coerente com a célula plena', () => {
    const c = compararFornecedoresSN(item, PERFIL_SN_NOTA_PADRAO, 'presumido', cfg, row, custoPleno)
    // gap = unitário − célula plena
    expect(c.puro.gap).toBe(Math.round((c.puro.unitario - custoPleno) * 100) / 100)
    expect(c.hibrido.gap).toBe(Math.round((c.hibrido.unitario - custoPleno) * 100) / 100)
  })
})
