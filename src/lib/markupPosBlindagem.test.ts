/**
 * BLINDAGEM — MARKUP PÓS-REFORMA (F1 chancelada pela CEO, 04/10 · correção 05/10)
 * Ouros derivados em Python e conferidos: fatores ao 6º decimal, preços ao centavo.
 * Prova de continuidade: fatores 2026 = divisores da pré-reforma.
 *
 * CORREÇÕES 05/10 (CEO informada — ouros canônicos, motor adaptado):
 * 1. Preço usa o fator em PRECISÃO TOTAL (r6 só para exibição) — LP 2027 fecha 2.229,98.
 * 2. LR 2027: ouro do preço corrigido 2.100,22 → 2.100,37 (custo canônico 1.051,73;
 *    2.100,22 exigiria custo 1.051,65, incompatível com o caso canônico da Compras).
 * 3. Decomposição híbrida = nota-BASE (sem DV) — ouro 2.225,33; as parcelas ao
 *    centavo somam 2.225,34 (arredondamento documentado, asserção com tolerância ±0,01).
 * 4. RL do modo C+M = custo ÷ (1−margem) — a RL alvo implícita na margem.
 */
import { describe, it, expect } from 'vitest'
import {
  fatorVendaPos,
  calcularMarkupPos,
  ALIQUOTAS_PADRAO,
  type EntradaMarkupPos,
} from './markupPosCalculations'

const A27 = ALIQUOTAS_PADRAO[2027]
const A26 = ALIQUOTAS_PADRAO[2026]
const entradaCama: EntradaMarkupPos = { base: 1116.63, margemPct: 30, dvPct: 5, customTaxesPct: 0 }

describe('Fatores de venda P→RL — ouros da F1', () => {
  it('2026 reproduz os divisores da pré-reforma ao 6º decimal (prova de continuidade)', () => {
    expect(fatorVendaPos('presumido', 2026, A26)).toBe(0.79007)
    expect(fatorVendaPos('real', 2026, A26)).toBe(0.74415)
    expect(fatorVendaPos('simples', 2026, A26)).toBe(0.96)
  })

  it('2027: LP e LR dividem o mesmo fator (PIS/COFINS mortos)', () => {
    expect(fatorVendaPos('presumido', 2027, A27)).toBe(0.752984)
    expect(fatorVendaPos('real', 2027, A27)).toBe(0.752984)
  })

  it('2027: SN puro = 1 − 4,17% (art. 23) · híbrido = 0,9073', () => {
    expect(fatorVendaPos('simples', 2027, A27)).toBe(0.9583)
    expect(fatorVendaPos('simples_hibrido', 2027, A27)).toBe(0.9073)
  })

  it('híbrido NÃO existe em 2026 (opção set/26 → efeitos 01/01/2027)', () => {
    expect(fatorVendaPos('simples_hibrido', 2026, A26)).toBeNull()
  })

  it('tese do contribuinte (PLP 16/25): LP/LR 2027 = 0,764227', () => {
    expect(fatorVendaPos('presumido', 2027, A27, 'contribuinte')).toBe(0.764227)
    expect(fatorVendaPos('real', 2027, A27, 'contribuinte')).toBe(0.764227)
  })
})

describe('Preços — exemplo cama (custo+margem, margem 30%, DV 5%)', () => {
  it('LP 2027: 1.116,63 → 2.229,98 (fator em precisão total)', () => {
    const r = calcularMarkupPos('presumido', 2027, 'custo_margem', entradaCama, A27)
    expect(r.preco).toBe(2229.98)
    expect(r.rl).toBe(1595.19)
  })

  it('LR 2027: custo 1.051,73 → 2.100,37 (ouro corrigido 05/10)', () => {
    const r = calcularMarkupPos(
      'real',
      2027,
      'custo_margem',
      { ...entradaCama, base: 1051.73 },
      A27,
    )
    expect(r.preco).toBe(2100.37)
    expect(r.rl).toBe(1502.47)
  })

  it('SN puro 2027: custo 1.413,33 → 2.217,79 (RL 2.019,04)', () => {
    const r = calcularMarkupPos(
      'simples',
      2027,
      'custo_margem',
      { ...entradaCama, base: 1413.33 },
      A27,
    )
    expect(r.preco).toBe(2217.79)
    expect(r.rl).toBe(2019.04)
  })

  it('SN híbrido 2027: custo 1.413,33 → 2.342,45 (RL 2.019,04 — igual ao SN puro)', () => {
    const r = calcularMarkupPos(
      'simples_hibrido',
      2027,
      'custo_margem',
      { ...entradaCama, base: 1413.33 },
      A27,
    )
    expect(r.preco).toBe(2342.45)
    expect(r.rl).toBe(2019.04)
  })

  it('decomposição da nota-BASE híbrida (sem DV — ouro F1) com tolerância de ±0,01', () => {
    const r = calcularMarkupPos(
      'simples_hibrido',
      2027,
      'custo_margem',
      { ...entradaCama, base: 1413.33 },
      A27,
    )
    const d = r.decomposicaoNota
    expect(d.valorOperacao).toBe(2045.64)
    expect(d.cbsDestaque).toBe(177.68)
    expect(d.ibsDestaque).toBe(2.02)
    expect(d.notaTotal).toBe(2225.33)
    // parcelas ao centavo somam 2.225,34 — 1 centavo de arredondamento (documentado)
    expect(
      Math.abs(d.valorOperacao + d.cbsDestaque + d.ibsDestaque - d.notaTotal),
    ).toBeLessThanOrEqual(0.01)
  })

  it('modo líquido: RL 2.000 → LP 2.795,89 · SN 2.196,87 · híbrido 2.320,36', () => {
    const liq: EntradaMarkupPos = { base: 2000, margemPct: 0, dvPct: 5, customTaxesPct: 0 }
    expect(calcularMarkupPos('presumido', 2027, 'liquid', liq, A27).preco).toBe(2795.89)
    expect(calcularMarkupPos('simples', 2027, 'liquid', liq, A27).preco).toBe(2196.87)
    expect(calcularMarkupPos('simples_hibrido', 2027, 'liquid', liq, A27).preco).toBe(2320.36)
  })

  it('regime indisponível (híbrido 2026) → resultado zerado, sem erro', () => {
    const r = calcularMarkupPos('simples_hibrido', 2026, 'custo_margem', entradaCama, A26)
    expect(r.fator).toBeNull()
    expect(r.preco).toBe(0)
  })
})
