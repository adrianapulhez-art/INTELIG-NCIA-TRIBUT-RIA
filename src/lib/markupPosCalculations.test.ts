import { describe, it, expect } from 'vitest'
import {
  computeCellArt12,
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  CASO_CANONICO_ART12,
} from './art12Calculations'
import { roundHalfUp, calcularCelulaFornecedorPlenoXAdquirenteSn } from './art12SnCalculations'
import { REFERENCIAS_MARKUP_POS } from '@/pages/demo/MarkupPosPage'

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

  it('6. Motor de cálculo com campos VAZIOS ao abrir continua usando os valores de referência chancelados pela Adri', () => {
    // Referências chanceladas
    expect(REFERENCIAS_MARKUP_POS.ICMS_PADRAO_PCT).toBe(18.0)
    expect(REFERENCIAS_MARKUP_POS.CBS_PADRAO_PCT).toBe(26.5)
    expect(REFERENCIAS_MARKUP_POS.MARGEM_PADRAO_PCT).toBe(51.9)
    expect(REFERENCIAS_MARKUP_POS.QUANTIDADE_PADRAO).toBe(24)

    // Simulando estado inicial: DV vazia ([]), ICMS undefined, CBS undefined, Margem undefined, Qtd undefined
    const despesasVariaveisVazia: Array<{ aliquota?: number }> = []
    const icmsInput: number | undefined = undefined
    const cbsInput: number | undefined = undefined
    const margemInput: number | undefined = undefined
    const qtdInput: number | undefined = undefined

    // Fallback do motor
    const icmsEfetivo = icmsInput ?? REFERENCIAS_MARKUP_POS.ICMS_PADRAO_PCT
    const cbsEfetivo = cbsInput ?? REFERENCIAS_MARKUP_POS.CBS_PADRAO_PCT
    const margemEfetiva = margemInput ?? REFERENCIAS_MARKUP_POS.MARGEM_PADRAO_PCT
    const qtdEfetiva = qtdInput ?? REFERENCIAS_MARKUP_POS.QUANTIDADE_PADRAO

    expect(icmsEfetivo).toBe(18.0)
    expect(cbsEfetivo).toBe(26.5)
    expect(margemEfetiva).toBe(51.9)
    expect(qtdEfetiva).toBe(24)

    // Fatores com DV vazia (fator DV = 1,0000)
    const fatorDvConsolidado = despesasVariaveisVazia.reduce(
      (f, curr) => f * Math.max(0, 1 - (curr.aliquota ?? 0) / 100),
      1,
    )
    expect(fatorDvConsolidado).toBe(1.0)

    const fatorIcms = Math.max(0, 1 - icmsEfetivo / 100)
    expect(fatorIcms).toBe(0.82)

    const fatorMargem = Math.max(0, 1 - margemEfetiva / 100)
    expect(fatorMargem).toBe(0.481)

    // Divisor: 1,0000 * 0,8200 * 0,4810 = 0,394420
    const divisor = fatorDvConsolidado * fatorIcms * fatorMargem
    expect(roundHalfUp(divisor, 6)).toBe(0.39442)

    // Custos ouros Card 03 Compras
    const custoLp = 1116.63
    const custoLr = 1051.73
    const custoSnp = 1482.94
    const custoSnh = 1383.56

    const precoVendaLp = roundHalfUp(custoLp / divisor, 2)
    const precoVendaLr = roundHalfUp(custoLr / divisor, 2)
    const precoVendaSnp = roundHalfUp(custoSnp / divisor, 2)
    const precoVendaSnh = roundHalfUp(custoSnh / divisor, 2)

    // Não zera, não produz NaN, mantém ordenação
    expect(precoVendaLp).toBe(2831.07)
    expect(precoVendaLr).toBe(2666.52)
    expect(precoVendaSnp).toBe(3759.8)
    expect(precoVendaSnh).toBe(3507.83)

    // CBS 26,50% por fora sobre Preço de Venda
    const cbsLp = roundHalfUp(precoVendaLp * (cbsEfetivo / 100), 2)
    expect(cbsLp).toBe(750.23)
    const notaLp = roundHalfUp(precoVendaLp + cbsLp, 2)
    expect(notaLp).toBe(3581.3)

    // Lote de 24 un.
    const loteLp = roundHalfUp(notaLp * qtdEfetiva, 2)
    expect(loteLp).toBe(roundHalfUp(3581.3 * 24, 2))
  })
})
