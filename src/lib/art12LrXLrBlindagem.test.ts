import { describe, it, expect } from 'vitest'
import { calcularCelulaLrXLr } from './art12LrCalculations'
import {
  computeCellArt12,
  CRONOGRAMA_ART12,
  CASO_CANONICO_ART12,
  CONFIG_PADRAO_ART12,
} from './art12Calculations'

const fmt = (n: number) => n.toFixed(2)

describe('Blindagem Célula LR × LR (Régua A chancelada pela Adri) e Contraste vs LR × LP', () => {
  it('blinda valores de ouro da célula LR × LR: nota 41.902,54 · CBS 2.776,57 · IBS 31,55 · ICMS 7.542,46 · compras líquidas 31.551,96 · custo 1.051,73 · Δ 0,00%', () => {
    const celula = calcularCelulaLrXLr()

    // CARD 01 (HOJE 2026)
    expect(fmt(celula.hoje.mercadorias)).toBe('42000.00')
    expect(fmt(celula.hoje.frete)).toBe('400.00')
    expect(fmt(celula.hoje.notaCheia)).toBe('42400.00')
    expect(fmt(celula.hoje.icmsCredito)).toBe('7632.00')
    expect(fmt(celula.hoje.baseSemIcms)).toBe('34768.00')
    expect(fmt(celula.hoje.pisCredito)).toBe('573.67')
    expect(fmt(celula.hoje.cofinsCredito)).toBe('2642.37')
    expect(fmt(celula.hoje.comprasLiquidas)).toBe('31551.96')
    expect(fmt(celula.hoje.custoUnitario)).toBe('1051.73')

    // CARD 02 (Fornecedor LR 2027, Régua A)
    expect(fmt(celula.exercicio2027.receitaLiquidaPreservada)).toBe('31551.96')
    expect(celula.exercicio2027.cbsAliquotaPct).toBe(8.8)
    expect(fmt(celula.exercicio2027.cbsDestacada)).toBe('2776.57')
    expect(celula.exercicio2027.ibsAliquotaPct).toBe(0.1)
    expect(fmt(celula.exercicio2027.ibsDestacado)).toBe('31.55')
    expect(fmt(celula.exercicio2027.subtotalAntesIcms)).toBe('34360.08')
    expect(celula.exercicio2027.divisorIcms).toBe(0.82)
    expect(fmt(celula.exercicio2027.notaCheia)).toBe('41902.54')
    expect(fmt(celula.exercicio2027.icmsDestacado)).toBe('7542.46')

    // Divisor exibido 0,3655 e divisor motor 0,365562
    expect(celula.exercicio2027.fatorDivisorExibido).toBe(0.3655)
    expect(celula.exercicio2027.fatorDivisorMotor).toBe(0.365562)

    // CARD 03 (Adquirente LR 2027)
    expect(fmt(celula.exercicio2027.comprasLiquidas)).toBe('31551.96')
    expect(fmt(celula.exercicio2027.custoUnitario)).toBe('1051.73')
    expect(fmt(celula.deltaPct)).toBe('0.00')
    expect(fmt(celula.deltaUnitario)).toBe('0.00')

    // Contraste com LR × LP (+6,17% e 1.116,63)
    expect(fmt(celula.contrasteLp.custoUnitario)).toBe('1116.63')
    expect(fmt(celula.contrasteLp.deltaPct)).toBe('6.17')
  })

  it('motor art12Calculations: mantém LR × LR neutro (1.051,73 / 0,00%) e LR × LP intacto (1.116,63 / +6,17%)', () => {
    const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!

    // LR × LR
    const cellLrXLr = computeCellArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12, compradorRegime: 'real', fornecedorRegime: 'real' },
      row2027,
    )
    expect(fmt(cellLrXLr.exercicio.unitario)).toBe('1051.73')
    expect(fmt(cellLrXLr.deltaPct)).toBe('0.00')

    // LR × LP (comprador LR comprando de fornecedor LP)
    const cellLrXLp = computeCellArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12, compradorRegime: 'real', fornecedorRegime: 'presumido' },
      row2027,
    )
    expect(fmt(cellLrXLp.exercicio.unitario)).toBe('1116.63')
    expect(fmt(cellLrXLp.deltaPct)).toBe('6.17')
  })

  it('valida estrutura dos 3 cards abertos canônicos para EspelhoRepasseDialog', () => {
    const celula = calcularCelulaLrXLr()
    expect(celula.card01.numero).toBe('CARD 01')
    expect(celula.card01.cor).toBe('emerald')
    expect(celula.card01.linhas.length).toBeGreaterThan(5)

    expect(celula.card02.numero).toBe('CARD 02')
    expect(celula.card02.cor).toBe('violet')
    expect(celula.card02.linhas.some((l) => l.formula.includes('0,3655'))).toBe(true)
    expect(celula.card02.linhas.some((l) => l.valor === 41902.54)).toBe(true)

    expect(celula.card03.numero).toBe('CARD 03')
    expect(celula.card03.cor).toBe('sky')
    expect(celula.card03.linhas.some((l) => l.valor === 1051.73)).toBe(true)
    expect(celula.card03.linhas.some((l) => l.fundamento?.includes('Célula Neutra'))).toBe(true)
  })
})
