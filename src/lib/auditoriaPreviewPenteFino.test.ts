import { describe, expect, it } from 'vitest'
import {
  CASO_CANONICO_ART12,
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  computeCellArt12,
  matrizArt12,
} from './art12Calculations'
import {
  calcularSessaoSN,
  calcularCelulaFornecedorPlenoXAdquirenteSn,
  PERFIL_SN_NOTA_PADRAO,
  roundHalfUp,
} from './art12SnCalculations'
import { calcularCelulaLrXLr } from './art12LrCalculations'
import type { ItemIntegracaoArt12 } from './integracaoComprasArt12'

const fmt2 = (v: number): string => v.toFixed(2)

describe('Auditoria Preview — Pente Fino v0.0.440 (Ouros Chancelados da Adri)', () => {
  const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!

  it('1. LP base limpa 33.498,97 e custo LP 1.116,63 (−3,65%)', () => {
    const cellLp = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row2027)
    expect(fmt2(cellLp.exercicio.baseLimpa!)).toBe('33498.97')
    expect(fmt2(cellLp.exercicio.unitario)).toBe('1116.63')
    expect(fmt2(cellLp.deltaPct)).toBe('-3.65')
  })

  it('2. Custo LR 1.051,73 na cadeia plena', () => {
    const cellLr = computeCellArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12, fornecedorRegime: 'real', compradorRegime: 'real' },
      row2027,
    )
    expect(fmt2(cellLr.exercicio.unitario)).toBe('1051.73')
    expect(fmt2(cellLr.deltaPct)).toBe('0.00')
  })

  it('3. Régua A LR × LR neutro: nota 41.902,54 e custo 1.051,73', () => {
    const celulaLr = calcularCelulaLrXLr()
    expect(celulaLr.exercicio2027.notaCheia).toBe(41902.54)
    expect(celulaLr.exercicio2027.custoUnitario).toBe(1051.73)
    expect(celulaLr.deltaPct).toBe(0.0)
  })

  it('4. Custo SNP comprando de LP: 1.482,94 e SNH comprando de LP: 1.383,56', () => {
    const cellSnpLp = calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_presumido', 'simples')
    expect(cellSnpLp.exercicio2027.custoUnitario).toBe(1482.94)

    const cellSnhLp = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples_hibrido',
    )
    expect(cellSnhLp.exercicio2027.custoUnitario).toBe(1383.56)
  })

  it('5. DAS Sessão SN 1.696,00 com blocos 576,64 / 259,9968 / 2,8832 / 856,48 e crédito 839,52', () => {
    const itemCanonico: ItemIntegracaoArt12 = {
      id: 'canonico-30',
      name: 'Item Canônico 30 un',
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
    const r = calcularSessaoSN(itemCanonico, PERFIL_SN_NOTA_PADRAO)
    expect(r.dasEfetivo).toBe(1696.0)
    expect(r.icmsNota6).toBe(576.64)
    expect(r.cbsDAS6).toBe(259.9968)
    expect(r.ibsDAS6).toBe(2.8832)
    expect(r.irpjCsllCppDAS6).toBe(856.48)
    expect(r.parcelaCreditavelTotal6).toBe(839.52)
  })

  it('6. Cenário 04 SNH: divisor 0,430739 · P 3.236,55 · DAS híbrido 109,40 · nota 3.520,68', () => {
    const fDv = 0.975 * 0.97 * 0.98
    const fMargem = 0.481
    const fDasHibrido = 1 - 0.0338
    const divisor = fDv * fMargem * fDasHibrido
    expect(roundHalfUp(divisor, 6)).toBe(0.430739)

    const precoHibrido = 3236.55
    const dasHibrido = roundHalfUp(precoHibrido * 0.0338, 2)
    expect(dasHibrido).toBe(109.4)

    const icms = roundHalfUp(precoHibrido * (0.04 * 0.34), 2)
    const federais = roundHalfUp(precoHibrido * (0.04 * 0.505), 2)
    expect(icms).toBe(44.02)
    expect(federais).toBe(65.38)
    expect(roundHalfUp(icms + federais, 2)).toBe(109.4)

    const bcCbsIbs = roundHalfUp(precoHibrido - icms, 2)
    expect(bcCbsIbs).toBe(3192.53)

    const cbs = roundHalfUp(bcCbsIbs * 0.088, 2)
    const ibs = roundHalfUp(bcCbsIbs * 0.001, 2)
    expect(cbs).toBe(280.94)
    expect(ibs).toBe(3.19)

    const nota = roundHalfUp(precoHibrido + cbs + ibs, 2)
    expect(nota).toBe(3520.68)
  })

  it('7. Célula LR × SNP custo 1.396,75 e célula LR × SNH custo 1.303,15', () => {
    const cellLrSnp = calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_real', 'simples')
    expect(cellLrSnp.exercicio2027.custoUnitario).toBe(1396.75)

    const cellLrSnh = calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_real', 'simples_hibrido')
    expect(cellLrSnh.exercicio2027.custoUnitario).toBe(1303.15)
  })

  it('8. Item da sessão Adri (RBV 42.000, frete 0): base LP 33.182,94 · base LR 31.254,30 · custo SNP × LP 1.468,95', () => {
    const itemAdri: ItemIntegracaoArt12 = {
      id: 'item-adri-42k',
      name: 'Item Sessão Adri',
      quantity: 30,
      merchandiseValue: 42000,
      freightValue: 0,
      icmsRate: 18,
      icmsFreightRate: 18,
      ipiRate: 0,
      hasSt: false,
      stValue: 0,
      valorNota: 42000,
      abcPct: 100,
      classe: 'A',
    }

    const resLp = calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_presumido', 'simples', itemAdri)
    expect(resLp.exercicio2027.baseLimpa).toBe(33182.94)
    expect(resLp.exercicio2027.custoUnitario).toBe(1468.95)

    const resLr = calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_real', 'simples', itemAdri)
    expect(resLr.exercicio2027.baseLimpa).toBe(31254.3)
  })

  it('9. Matriz 16 células coberta e íntegra', () => {
    const matriz = matrizArt12(CASO_CANONICO_ART12, CONFIG_PADRAO_ART12, row2027)
    expect(matriz.length).toBe(4)
    matriz.forEach((linha) => {
      expect(linha.cells.length).toBe(4)
      linha.cells.forEach((col) => {
        expect(col.cell.exercicio.unitario).toBeGreaterThan(0)
      })
    })
  })
})
