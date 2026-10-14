/**
 * BLINDAGEM DAS 4 NOVAS CÉLULAS DE COMPARAÇÃO — ESPELHO DE REPASSE (CHANCELA ADRI)
 * (Fornecedores LP / LR × Adquirentes SN puro / SN híbrido — migrado da antiga Sessão 04 independente para o Espelho)
 *
 * Regras chanceladas pela Adri (padrão ouro, não negociável):
 * 1. Adquirente SN puro: não credita NADA (art. 13, §1º, LC 123/2006).
 *    Custo de aquisição = NOTA CHEIA em 2026 (42.400,00 → 1.413,33) e em 2027 (44.488,27 → 1.482,94; Δ = +4,92%).
 * 2. Adquirente SN híbrido: credita APENAS CBS e IBS destacados na nota do fornecedor (art. 41 LC 214/2025).
 *    NUNCA credita ICMS 18% (sem campo com fração do DAS — art. 23 LC 123/2006) e NUNCA credita PIS/COFINS.
 *    Custo 2026 = NOTA CHEIA (42.400,00 → 1.413,33);
 *    Custo 2027 = 44.488,27 − 2.947,91 (CBS) − 33,50 (IBS) = 41.506,86 → 1.383,56; Δ = −2,11%.
 * 3. Convenção de arredondamento: half-up a 2 casas.
 * 4. Cadeia canônica: mercadorias 42.000,00 (30 un × 1.400,00) + frete 400,00 = nota 2026 42.400,00.
 *    Nota 2027 formada pelo fornecedor: base líquida 33.498,97 + CBS 2.947,91 + IBS 33,50 = 36.480,38 ÷ 0,82 = 44.488,27.
 */
import { describe, expect, it } from 'vitest'
import {
  calcularCelulaFornecedorPlenoXAdquirenteSn,
  calcularQuatroCelulasComparacao,
} from './art12SnCalculations'
import { montarItensIntegracao } from './integracaoComprasArt12'

const itemCanonico = montarItensIntegracao([
  {
    id: 'purch-samsung',
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

describe('Blindagem das 4 Novas Células — Fornecedor LP/LR × Adquirente SN Puro/Híbrido', () => {
  it('1. Célula LP × SN puro fecha exatamente nos valores de ouro chancelados (1.413,33 / 1.482,94 / +4,92%)', () => {
    const celula = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples',
      itemCanonico,
    )

    // HOJE 2026
    expect(celula.hoje.notaCheia).toBe(42400.0)
    expect(celula.hoje.icmsCredito).toBe(0.0)
    expect(celula.hoje.pisCredito).toBe(0.0)
    expect(celula.hoje.cofinsCredito).toBe(0.0)
    expect(celula.hoje.cbsCredito).toBe(0.0)
    expect(celula.hoje.ibsCredito).toBe(0.0)
    expect(celula.hoje.totalCreditos).toBe(0.0)
    expect(celula.hoje.comprasLiquidas).toBe(42400.0)
    expect(celula.hoje.custoUnitario).toBe(1413.33)

    // FORNECEDOR 2027
    expect(celula.exercicio2027.baseLimpa).toBe(33498.97)
    expect(celula.exercicio2027.cbsDestacada).toBe(2947.91)
    expect(celula.exercicio2027.ibsDestacado).toBe(33.5)
    expect(celula.exercicio2027.subtotalAntesIcms).toBe(36480.38)
    expect(celula.exercicio2027.divisorIcms).toBe(0.82)
    expect(celula.exercicio2027.notaCheia).toBe(44488.27)
    expect(celula.exercicio2027.icmsDestacadoNota).toBe(8007.89)

    // ADQUIRENTE SN PURO 2027 (ZERO CRÉDITOS)
    expect(celula.exercicio2027.icmsCredito).toBe(0.0)
    expect(celula.exercicio2027.pisCredito).toBe(0.0)
    expect(celula.exercicio2027.cofinsCredito).toBe(0.0)
    expect(celula.exercicio2027.cbsCredito).toBe(0.0)
    expect(celula.exercicio2027.ibsCredito).toBe(0.0)
    expect(celula.exercicio2027.totalCreditos).toBe(0.0)
    expect(celula.exercicio2027.comprasLiquidas).toBe(44488.27)
    expect(celula.exercicio2027.custoUnitario).toBe(1482.94)

    // VARIAÇÃO
    expect(celula.deltaUnitario).toBe(69.61) // 1.482,94 − 1.413,33
    expect(celula.deltaPct).toBe(4.92)
  })

  it('2. Célula LR × SN puro é IDÊNTICA à LP × SN puro (1.413,33 / 1.482,94 / +4,92%)', () => {
    const celula = calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_real', 'simples', itemCanonico)

    expect(celula.hoje.comprasLiquidas).toBe(42400.0)
    expect(celula.hoje.custoUnitario).toBe(1413.33)
    expect(celula.exercicio2027.notaCheia).toBe(44488.27)
    expect(celula.exercicio2027.totalCreditos).toBe(0.0)
    expect(celula.exercicio2027.comprasLiquidas).toBe(44488.27)
    expect(celula.exercicio2027.custoUnitario).toBe(1482.94)
    expect(celula.deltaPct).toBe(4.92)
  })

  it('3. Célula LP × SN híbrido fecha exatamente nos valores de ouro chancelados (1.413,33 / 1.383,56 / −2,11%)', () => {
    const celula = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples_hibrido',
      itemCanonico,
    )

    // HOJE 2026: nota cheia 42.400,00 → 1.413,33 (sem CBS/IBS em 2026; sem ICMS 18% e sem PIS/COFINS)
    expect(celula.hoje.notaCheia).toBe(42400.0)
    expect(celula.hoje.icmsCredito).toBe(0.0)
    expect(celula.hoje.pisCredito).toBe(0.0)
    expect(celula.hoje.cofinsCredito).toBe(0.0)
    expect(celula.hoje.cbsCredito).toBe(0.0)
    expect(celula.hoje.ibsCredito).toBe(0.0)
    expect(celula.hoje.totalCreditos).toBe(0.0)
    expect(celula.hoje.comprasLiquidas).toBe(42400.0)
    expect(celula.hoje.custoUnitario).toBe(1413.33)

    // FORNECEDOR 2027
    expect(celula.exercicio2027.notaCheia).toBe(44488.27)
    expect(celula.exercicio2027.cbsDestacada).toBe(2947.91)
    expect(celula.exercicio2027.ibsDestacado).toBe(33.5)
    expect(celula.exercicio2027.icmsDestacadoNota).toBe(8007.89)

    // ADQUIRENTE SN HÍBRIDO 2027: credita CBS (2.947,91) e IBS (33,50); NUNCA credita ICMS 18% (8.007,89)
    expect(celula.exercicio2027.cbsCredito).toBe(2947.91)
    expect(celula.exercicio2027.ibsCredito).toBe(33.5)
    expect(celula.exercicio2027.icmsCredito).toBe(0.0)
    expect(celula.exercicio2027.pisCredito).toBe(0.0)
    expect(celula.exercicio2027.cofinsCredito).toBe(0.0)
    expect(celula.exercicio2027.totalCreditos).toBe(2981.41)

    // Compras líquidas: 44.488,27 − 2.947,91 − 33,50 = 41.506,86
    expect(celula.exercicio2027.comprasLiquidas).toBe(41506.86)
    // Custo unitário: 41.506,86 ÷ 30 = 1.383,562 → 1.383,56
    expect(celula.exercicio2027.custoUnitario).toBe(1383.56)

    // VARIAÇÃO: (1.383,56 − 1.413,33) ÷ 1.413,33 = −2,1063...% → −2,11%
    expect(celula.deltaUnitario).toBe(-29.77)
    expect(celula.deltaPct).toBe(-2.11)
  })

  it('4. Célula LR × SN híbrido é IDÊNTICA à LP × SN híbrido (1.413,33 / 1.383,56 / −2,11%)', () => {
    const celula = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_real',
      'simples_hibrido',
      itemCanonico,
    )

    expect(celula.hoje.comprasLiquidas).toBe(42400.0)
    expect(celula.hoje.custoUnitario).toBe(1413.33)
    expect(celula.exercicio2027.notaCheia).toBe(44488.27)
    expect(celula.exercicio2027.cbsCredito).toBe(2947.91)
    expect(celula.exercicio2027.ibsCredito).toBe(33.5)
    expect(celula.exercicio2027.icmsCredito).toBe(0.0)
    expect(celula.exercicio2027.totalCreditos).toBe(2981.41)
    expect(celula.exercicio2027.comprasLiquidas).toBe(41506.86)
    expect(celula.exercicio2027.custoUnitario).toBe(1383.56)
    expect(celula.deltaPct).toBe(-2.11)
  })

  it('5. Regras jurídicas chanceladas estão refletidas na memória linha a linha dos 3 cards', () => {
    const celulaPuro = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples',
      itemCanonico,
    )
    const celulaHib = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples_hibrido',
      itemCanonico,
    )

    // CARD 01: Linha de ICMS fundamenta ausência de crédito
    expect(
      celulaPuro.card01.linhas.some((l) => l.label.includes('Crédito de ICMS') && l.valor === 0),
    ).toBe(true)
    expect(
      celulaPuro.card01.linhas.some((l) => l.formula.includes('art. 13, §1º, LC 123/2006')),
    ).toBe(true)

    // CARD 02: Formação da nota pelo fornecedor
    expect(
      celulaPuro.card02.linhas.some(
        (l) => l.label.includes('Base líquida de venda') && l.valor === 33498.97,
      ),
    ).toBe(true)
    expect(
      celulaPuro.card02.linhas.some((l) => l.label.includes('CBS 8,80%') && l.valor === 2947.91),
    ).toBe(true)
    expect(
      celulaPuro.card02.linhas.some((l) => l.label.includes('IBS 0,10%') && l.valor === 33.5),
    ).toBe(true)
    expect(
      celulaPuro.card02.linhas.some(
        (l) => l.label.includes('Preço da nota fiscal') && l.valor === 44488.27,
      ),
    ).toBe(true)

    // CARD 03 Híbrido: credita apenas CBS e IBS
    expect(
      celulaHib.card03.linhas.some((l) => l.label.includes('Crédito CBS') && l.valor === -2947.91),
    ).toBe(true)
    expect(
      celulaHib.card03.linhas.some((l) => l.label.includes('Crédito IBS') && l.valor === -33.5),
    ).toBe(true)
    expect(
      celulaHib.card03.linhas.some((l) => l.label.includes('Crédito ICMS') && l.valor === 0),
    ).toBe(true)
    expect(celulaHib.card03.linhas.some((l) => l.formula.includes('NUNCA credita ICMS 18%'))).toBe(
      true,
    )
  })

  it('6. calcularQuatroCelulasComparacao devolve as 4 células com a ordem canônica', () => {
    const lista = calcularQuatroCelulasComparacao(itemCanonico)
    expect(lista).toHaveLength(4)

    expect(lista[0].rotuloConfronto).toBe('LP × SN puro')
    expect(lista[1].rotuloConfronto).toBe('LR × SN puro')
    expect(lista[2].rotuloConfronto).toBe('LP × SN híbrido')
    expect(lista[3].rotuloConfronto).toBe('LR × SN híbrido')

    // Valores unitários de ouro 2026 / 2027 / delta
    expect(lista[0].hoje.custoUnitario).toBe(1413.33)
    expect(lista[0].exercicio2027.custoUnitario).toBe(1482.94)
    expect(lista[0].deltaPct).toBe(4.92)

    expect(lista[1].hoje.custoUnitario).toBe(1413.33)
    expect(lista[1].exercicio2027.custoUnitario).toBe(1482.94)
    expect(lista[1].deltaPct).toBe(4.92)

    expect(lista[2].hoje.custoUnitario).toBe(1413.33)
    expect(lista[2].exercicio2027.custoUnitario).toBe(1383.56)
    expect(lista[2].deltaPct).toBe(-2.11)

    expect(lista[3].hoje.custoUnitario).toBe(1413.33)
    expect(lista[3].exercicio2027.custoUnitario).toBe(1383.56)
    expect(lista[3].deltaPct).toBe(-2.11)
  })
})
