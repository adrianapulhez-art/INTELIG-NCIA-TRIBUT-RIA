import { describe, it, expect } from 'vitest'
import {
  computeCellArt12,
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  CASO_CANONICO_ART12,
} from './art12Calculations'
import { roundHalfUp, calcularCelulaFornecedorPlenoXAdquirenteSn } from './art12SnCalculations'

describe('Validação dos Custos do Adquirente Lucro Presumido 2027 (Card 03)', () => {
  const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!

  it('1. Célula LP × LP 2027 reproduz o ouro chancelado de 1.116,63', () => {
    const cellLp = computeCellArt12(
      CASO_CANONICO_ART12,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'presumido',
        fornecedorRegime: 'presumido',
      },
      row2027,
    )
    expect(cellLp.exercicio.unitario).toBe(1116.63)
  })

  it('2. Célula LP × LR 2027 reproduz o ouro chancelado de 1.051,73', () => {
    const cellLr = computeCellArt12(
      CASO_CANONICO_ART12,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'presumido',
        fornecedorRegime: 'real',
      },
      row2027,
    )
    expect(cellLr.exercicio.unitario).toBe(1051.73)
  })

  it('3. Célula LP × SNP 2027 reproduz o ouro chancelado de 1.482,94', () => {
    const celulaSnp = calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_presumido', 'simples')
    expect(celulaSnp.exercicio2027.custoUnitario).toBeCloseTo(1482.94, 2)
  })

  it('4. Célula LP × SNH 2027 reproduz o ouro chancelado de 1.383,56', () => {
    const celulaSnh = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples_hibrido',
    )
    expect(celulaSnh.exercicio2027.custoUnitario).toBeCloseTo(1383.56, 2)
  })

  it('5. Divisor multiplicativo com DV 7,50%, ICMS 18% e Margem 51,9% produz o divisor esperado', () => {
    // DVs: 2,5% (0,9750), 2,0% (0,9800), 3,0% (0,9700) -> consolidado 0,9750 * 0,9800 * 0,9700 = 0,926835
    // ICMS 18% -> 0,8200
    // Margem 51,9% -> 0,4810
    // Divisor: 0,926835 * 0,8200 * 0,4810 = 0,365562...
    const fDv = 0.975 * 0.98 * 0.97
    const fIcms = 0.82
    const fMargem = 0.481
    const divisor = fDv * fIcms * fMargem
    expect(roundHalfUp(divisor, 4)).toBe(0.3656)

    // Preços simulados correspondentes
    const pLp = roundHalfUp(1116.63 / divisor, 2)
    const pLr = roundHalfUp(1051.73 / divisor, 2)
    const pSnp = roundHalfUp(1482.94 / divisor, 2)
    const pSnh = roundHalfUp(1383.56 / divisor, 2)

    expect(pLp).toBeGreaterThan(3000)
    expect(pLr).toBeLessThan(pLp)
    expect(pSnp).toBeGreaterThan(pLp)
    expect(pSnh).toBeLessThan(pSnp)
  })
})
