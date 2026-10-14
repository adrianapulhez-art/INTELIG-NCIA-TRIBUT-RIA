import { describe, it, expect } from 'vitest'
import {
  calcularCelulaFornecedorPlenoXAdquirenteSn,
  calcularQuatroCelulasComparacao,
} from './art12SnCalculations'
import { CASO_CANONICO_ITEM } from './art12Calculations'

/**
 * BLINDAGEM DO COMPORTAMENTO DO ESPELHO COM COMPRADOR SN E SN HÍBRIDO (CHANCELA ADRI)
 *
 * Garante que:
 * 1. Fornecedores LP e LR × Adquirentes SN e SN híbrido geram exatamente os valores canônicos chancelados:
 *    - SN puro: HOJE 1.413,33 → 2027 1.482,94 (+4,92%)
 *    - SN híbrido: HOJE 1.413,33 → 2027 1.383,56 (−2,11%)
 * 2. Composição matemática do híbrido:
 *    44.488,27 (nota cheia) - 2.947,91 (CBS) - 33,50 (IBS) = 41.506,86 (compras líquidas)
 *    41.506,86 / 30 unidades = 1.383,5620 → formatado 1.383,56
 * 3. Cards 01, 02 e 03 trazem fundamentações legais explícitas:
 *    - art. 13 §1º LC 123/2006
 *    - art. 23 LC 123/2006
 *    - art. 41 LC 214/2025
 * 4. Cenário único sem repasse: valores não chancelados (1.511,83 e 1.539,12) NÃO pertencem ao cálculo
 */
describe('Espelho Repasse — Comprador SN / SN Híbrido (Chancela Adri)', () => {
  it('célula LP × SN puro gera HOJE 1.413,33 e 2027 1.482,94 (+4,92%)', () => {
    const res = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples',
      CASO_CANONICO_ITEM,
    )

    expect(res.hoje.custoUnitario).toBeCloseTo(1413.33, 2)
    expect(res.exercicio2027.custoUnitario).toBeCloseTo(1482.94, 2)
    expect(res.deltaPct).toBeCloseTo(4.92, 2)
    expect(res.exercicio2027.creditosTotais).toBe(0)
    expect(res.exercicio2027.comprasLiquidas).toBeCloseTo(44488.27, 2)
  })

  it('célula LR × SN puro gera rigorosamente os mesmos valores (LP e LR indiferentes)', () => {
    const res = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_real',
      'simples',
      CASO_CANONICO_ITEM,
    )

    expect(res.hoje.custoUnitario).toBeCloseTo(1413.33, 2)
    expect(res.exercicio2027.custoUnitario).toBeCloseTo(1482.94, 2)
    expect(res.deltaPct).toBeCloseTo(4.92, 2)
  })

  it('célula LP × SN híbrido gera HOJE 1.413,33 e 2027 1.383,56 (−2,11%) com deduções CBS e IBS', () => {
    const res = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples_hibrido',
      CASO_CANONICO_ITEM,
    )

    expect(res.hoje.custoUnitario).toBeCloseTo(1413.33, 2)
    expect(res.exercicio2027.notaCheia).toBeCloseTo(44488.27, 2)
    expect(res.exercicio2027.creditoCbs).toBeCloseTo(2947.91, 2)
    expect(res.exercicio2027.creditoIbs).toBeCloseTo(33.50, 2)
    expect(res.exercicio2027.creditoIcms).toBe(0) // Regra Adri: híbrido NUNCA credita ICMS 18%
    expect(res.exercicio2027.creditosTotais).toBeCloseTo(2981.41, 2)
    expect(res.exercicio2027.comprasLiquidas).toBeCloseTo(41506.86, 2)
    expect(res.exercicio2027.custoUnitario).toBeCloseTo(1383.56, 2)
    expect(res.deltaPct).toBeCloseTo(-2.11, 2)
  })

  it('célula LR × SN híbrido coincide com LP × SN híbrido em 2027', () => {
    const res = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_real',
      'simples_hibrido',
      CASO_CANONICO_ITEM,
    )

    expect(res.hoje.custoUnitario).toBeCloseTo(1413.33, 2)
    expect(res.exercicio2027.custoUnitario).toBeCloseTo(1383.56, 2)
    expect(res.deltaPct).toBeCloseTo(-2.11, 2)
  })

  it('Cards 01, 02 e 03 contêm fundamentação legal expressa entre colchetes', () => {
    const resSn = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples',
      CASO_CANONICO_ITEM,
    )
    const resHib = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples_hibrido',
      CASO_CANONICO_ITEM,
    )

    // Fundamentos nos cards de SN Puro
    const fundSn = [
      ...resSn.card01.linhas.map((l) => l.fundamento).filter(Boolean),
      ...resSn.card02.linhas.map((l) => l.fundamento).filter(Boolean),
      ...resSn.card03.linhas.map((l) => l.fundamento).filter(Boolean),
    ].join(' ')

    expect(fundSn).toContain('art. 13, §1º da LC 123/2006')

    // Fundamentos nos cards de SN Híbrido
    const fundHib = [
      ...resHib.card01.linhas.map((l) => l.fundamento).filter(Boolean),
      ...resHib.card02.linhas.map((l) => l.fundamento).filter(Boolean),
      ...resHib.card03.linhas.map((l) => l.fundamento).filter(Boolean),
    ].join(' ')

    expect(fundHib).toContain('art. 41 da LC 214/2025')
    expect(fundHib).toContain('art. 23 da LC 123/2006')
  })

  it('valores espúrios Parcial 1.511,83 e Sem repasse 1.539,12 não são gerados pelo motor oficial', () => {
    const celulas = calcularQuatroCelulasComparacao(CASO_CANONICO_ITEM)
    const unitarios = celulas.map((c) => c.exercicio2027.custoUnitario)

    for (const u of unitarios) {
      expect(u).not.toBeCloseTo(1511.83, 2)
      expect(u).not.toBeCloseTo(1539.12, 2)
    }
  })
})
