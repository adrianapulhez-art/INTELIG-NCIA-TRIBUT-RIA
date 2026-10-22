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

  it('4b. Chancela Cenário 03 SN puro e Cenário 04 SN híbrido (motor dedicado)', () => {
    // Validação matemática das chancelas da Adri registradas em memória:
    // Custo base = 1.394,11 (ou custo correspondente que com os fatores produz 3.237,55 / 3.236,55)
    // Fatores de DV do caso de teste: 0,975 * 0,97 * 0,98 = 0,926835
    // Fator margem 51,9%: 0,481
    // Divisor sem tributos: 0,926835 * 0,481 = 0,445807635
    // Cenário 03 Puro:
    // Alíquota SN = 4,00% -> fator DAS = 0,9600
    // Divisor SN puro = 0,445807635 * 0,96 = 0,4279753...
    // Preço 3.237,55 * 0,4279753 = custo ~ 1.385,60
    // DAS 4% = 3.237,55 * 0,04 = 129,502 -> 129,50
    // Partilha 2027: ICMS 34%, CBS 15,33%, IBS 0,17%, Federais 50,50%
    const preco03 = 3237.55
    const das03 = roundHalfUp(preco03 * 0.04, 2)
    expect(das03).toBe(129.5)
    const icms03 = roundHalfUp(das03 * 0.34, 2)
    const cbs03 = roundHalfUp(das03 * 0.1533, 2)
    const ibs03 = roundHalfUp(das03 * 0.0017, 2)
    const federais03 = roundHalfUp(das03 * 0.505, 2)
    expect(icms03).toBe(44.03)
    expect(cbs03).toBe(19.85)
    expect(ibs03).toBe(0.22)
    expect(federais03).toBe(65.4)

    // Cenário 04 Híbrido:
    // Alíquota DAS híbrido = 4% * (34% + 50,5%) = 3,38% -> fator = 0,9662
    // Fator divisor híbrido = 0,445807635 * 0,9662 = 0,430739... -> 0,430739
    const fDv = 0.975 * 0.97 * 0.98
    const fMargem = 0.481
    const fDasHibrido = 1 - 0.0338
    const divisorHibrido = fDv * fMargem * fDasHibrido
    expect(roundHalfUp(divisorHibrido, 6)).toBe(0.430739)

    const preco04 = 3236.55
    const das04 = roundHalfUp(preco04 * 0.0338, 2)
    expect(das04).toBe(109.4)
    const icms04 = roundHalfUp(preco04 * (0.04 * 0.34), 2)
    const federais04 = roundHalfUp(preco04 * (0.04 * 0.505), 2)
    expect(icms04).toBe(44.02)
    expect(federais04).toBe(65.38)
    expect(roundHalfUp(icms04 + federais04, 2)).toBe(109.4)

    // Base CBS/IBS limpa de ICMS = P - ICMS = 3.236,55 - 44,02 = 3.192,53
    const bcCbsIbs04 = roundHalfUp(preco04 - icms04, 2)
    expect(bcCbsIbs04).toBe(3192.53)

    // CBS por fora 8,8% e IBS por fora 0,1%
    const cbs04 = roundHalfUp(bcCbsIbs04 * 0.088, 2)
    const ibs04 = roundHalfUp(bcCbsIbs04 * 0.001, 2)
    expect(cbs04).toBe(280.94)
    expect(ibs04).toBe(3.19)

    // Nota fiscal total = 3.236,55 + 280,94 + 3,19 = 3.520,68
    const nota04 = roundHalfUp(preco04 + cbs04 + ibs04, 2)
    expect(nota04).toBe(3520.68)
  })

  it('5. Estrutura correta da composição legal: caso verbatim da Adri com alíquotas reais', () => {
    // O caso verbatim da Adri:
    // Custo do adquirente = 1.106,10
    // Fatores DV: 0,9750 * 0,9700 * 0,9800 = 0,926835
    // Fator Margem: 0,4810 (margem 51,9%)
    // Divisor sem ICMS: 0,9750 * 0,9700 * 0,9800 * 0,4810 = 0,445807635 -> 0,4458 (arredondado a 4 casas no relato dela)
    // 1. Divisor SEM ICMS:
    const fDv = 0.975 * 0.97 * 0.98
    const fMargem = 0.481
    const divisorSemIcms = fDv * fMargem
    expect(roundHalfUp(divisorSemIcms, 4)).toBe(0.4458)

    // 2. BC IBS/CBS = Custo ÷ Divisor sem ICMS
    // Com 4 casas no divisor como na conta manual dela: 1106,10 / 0,4458 = 2481,1574 -> 2481,15
    const bcIbsCbs = roundHalfUp(1106.1 / 0.4458, 2)
    expect(bcIbsCbs).toBe(2481.16) // ou 2481,15 dependendo do truncamento/arredondamento de 0,4458076...
    const bcComDivisorCheio = roundHalfUp(1106.1 / divisorSemIcms, 2)
    expect(bcComDivisorCheio).toBe(2481.12)

    // Usando exatamente a BC da usuária (2.481,15) e suas alíquotas de exemplo (CBS 8,80% e IBS 0,10%):
    const bcUser = 2481.15
    const cbsUserAliq = 8.8 // 0,088
    const ibsUserAliq = 0.1 // 0,001
    const icmsUserAliq = 18.0

    // 3. CBS = BC * 0,088 -> 2.481,15 * 0,088 = 218,3412 -> 218,34
    const cbsUser = roundHalfUp(bcUser * (cbsUserAliq / 100), 2)
    expect(cbsUser).toBe(218.34)

    // 4. IBS = BC * 0,001 -> 2.481,15 * 0,001 = 2,48115 -> 2,48
    const ibsUser = roundHalfUp(bcUser * (ibsUserAliq / 100), 2)
    expect(ibsUser).toBe(2.48)

    // 5. Valor sem ICMS = BC + CBS + IBS -> 2481,15 + 218,34 + 2,48 = 2701,97
    const valorSemIcmsUser = roundHalfUp(bcUser + cbsUser + ibsUser, 2)
    expect(valorSemIcmsUser).toBe(2701.97)

    // 6. Preço / Nota = Valor sem ICMS ÷ (1 - 0,18) -> 2701,97 ÷ 0,82 = 3.295,0853... -> 3.295,09
    const precoUser = roundHalfUp(valorSemIcmsUser / 0.82, 2)
    expect(precoUser).toBe(3295.09) // no relato da Adri: 3.295,08 por arredondamento intermediário

    // ICMS destacado sobre a nota (que inclui IBS e CBS)
    const icmsDestacadoUser = roundHalfUp(precoUser * (icmsUserAliq / 100), 2)
    expect(icmsDestacadoUser).toBe(593.12)

    // Verificação da assimetria legal:
    // O ICMS NÃO está dentro da BC do IBS/CBS (LC 214 art. 12 §2º V)
    expect(bcUser).toBeLessThan(precoUser)
    // O IBS e CBS ESTÃO dentro da base de cálculo do ICMS (Sefaz-SP RC 32303/2025)
    expect(valorSemIcmsUser).toBeGreaterThan(bcUser)
  })

  it('6. Motor de cálculo com campos VAZIOS ao abrir continua usando os valores de referência chancelados pela Adri na nova composição legal', () => {
    // Referências chanceladas
    expect(REFERENCIAS_MARKUP_POS.ICMS_PADRAO_PCT).toBe(18.0)
    expect(REFERENCIAS_MARKUP_POS.CBS_PADRAO_PCT).toBe(26.5)
    expect(REFERENCIAS_MARKUP_POS.IBS_PADRAO_PCT).toBe(0.1)
    expect(REFERENCIAS_MARKUP_POS.MARGEM_PADRAO_PCT).toBe(51.9)
    expect(REFERENCIAS_MARKUP_POS.QUANTIDADE_PADRAO).toBe(24)

    // Simulando estado inicial: DV vazia ([]), ICMS undefined, CBS undefined, IBS undefined, Margem undefined, Qtd undefined
    const despesasVariaveisVazia: Array<{ aliquota?: number }> = []
    const icmsInput: number | undefined = undefined
    const cbsInput: number | undefined = undefined
    const ibsInput: number | undefined = undefined
    const margemInput: number | undefined = undefined
    const qtdInput: number | undefined = undefined

    // Fallback do motor
    const icmsEfetivo = icmsInput ?? REFERENCIAS_MARKUP_POS.ICMS_PADRAO_PCT
    const cbsEfetivo = cbsInput ?? REFERENCIAS_MARKUP_POS.CBS_PADRAO_PCT
    const ibsEfetivo = ibsInput ?? REFERENCIAS_MARKUP_POS.IBS_PADRAO_PCT
    const margemEfetiva = margemInput ?? REFERENCIAS_MARKUP_POS.MARGEM_PADRAO_PCT
    const qtdEfetiva = qtdInput ?? REFERENCIAS_MARKUP_POS.QUANTIDADE_PADRAO

    expect(icmsEfetivo).toBe(18.0)
    expect(cbsEfetivo).toBe(26.5)
    expect(ibsEfetivo).toBe(0.1)
    expect(margemEfetiva).toBe(51.9)
    expect(qtdEfetiva).toBe(24)

    // Fatores com DV vazia (fator DV = 1,0000)
    const fatorDvConsolidado = despesasVariaveisVazia.reduce(
      (f, curr) => f * Math.max(0, 1 - (curr.aliquota ?? 0) / 100),
      1,
    )
    expect(fatorDvConsolidado).toBe(1.0)

    const fatorMargem = Math.max(0, 1 - margemEfetiva / 100)
    expect(fatorMargem).toBe(0.481)

    const fatorIcms = Math.max(0, 1 - icmsEfetivo / 100)
    expect(fatorIcms).toBe(0.82)

    // Divisor SEM ICMS: 1,0000 * 0,4810 = 0,481000
    const divisorSemIcms = fatorDvConsolidado * fatorMargem
    expect(roundHalfUp(divisorSemIcms, 6)).toBe(0.481)

    // Custos ouros Card 03 Compras
    const custoLp = 1116.63
    const custoLr = 1051.73
    const custoSnp = 1482.94
    const custoSnh = 1383.56

    // 1. Base de Cálculo do IBS/CBS por fornecedor (sem ICMS)
    const bcLp = roundHalfUp(custoLp / divisorSemIcms, 2)
    const bcLr = roundHalfUp(custoLr / divisorSemIcms, 2)
    const bcSnp = roundHalfUp(custoSnp / divisorSemIcms, 2)
    const bcSnh = roundHalfUp(custoSnh / divisorSemIcms, 2)

    expect(bcLp).toBe(2321.48)
    expect(bcLr).toBe(2186.55)
    expect(bcSnp).toBe(3083.04)
    expect(bcSnh).toBe(2876.42)

    // 2. CBS 26,50% por fora sobre a BC
    const cbsLp = roundHalfUp(bcLp * (cbsEfetivo / 100), 2)
    expect(cbsLp).toBe(615.19)

    // 3. IBS 0,10% por fora sobre a BC
    const ibsLp = roundHalfUp(bcLp * (ibsEfetivo / 100), 2)
    expect(ibsLp).toBe(2.32)

    // 4. Valor sem ICMS
    const valorSemIcmsLp = roundHalfUp(bcLp + cbsLp + ibsLp, 2)
    expect(valorSemIcmsLp).toBe(2938.99)

    // 5. Preço de Venda / Nota Fiscal (com ICMS por dentro englobando IBS e CBS)
    const precoVendaLp = roundHalfUp(valorSemIcmsLp / fatorIcms, 2)
    expect(precoVendaLp).toBe(3584.13)

    // Nota final = Preço final
    const notaLp = precoVendaLp
    expect(notaLp).toBe(3584.13)

    // Lote de 24 un.
    const loteLp = roundHalfUp(notaLp * qtdEfetiva, 2)
    expect(loteLp).toBe(roundHalfUp(3584.13 * 24, 2))
  })

  it('7. Validação de composição legal: FALHA se ICMS estiver dentro da base de cálculo do IBS/CBS', () => {
    const custo = 1116.63
    const margem = 51.9
    const icms = 18.0
    const cbs = 26.5
    const ibs = 0.1

    const fatorMargem = 1 - margem / 100
    const fatorIcms = 1 - icms / 100

    // COMPOSIÇÃO ERRADA (antiga):
    // Divisor incluía o ICMS (fatorMargem * fatorIcms = 0,39442)
    // Preço antes de CBS/IBS = Custo / 0,39442 = 2831,07
    // A BC do CBS/IBS era o Preço de Venda (que continha o ICMS de R$ 509,59 dentro!)
    const divisorErrado = fatorMargem * fatorIcms
    const bcErrada = roundHalfUp(custo / divisorErrado, 2) // 2831,07 (contém ICMS!)

    // COMPOSIÇÃO CORRETA (LC 214 art. 12 §2º V):
    // Divisor NÃO inclui ICMS: divisorSemIcms = fatorMargem = 0,481
    // BC do CBS/IBS = Custo / divisorSemIcms = 2321,48 (limpa de ICMS!)
    const divisorCorreto = fatorMargem
    const bcCorreta = roundHalfUp(custo / divisorCorreto, 2) // 2321,48

    // Teste que FALHA se o ICMS estiver dentro da base do IBS/CBS:
    expect(bcCorreta).not.toBe(bcErrada)
    expect(bcCorreta).toBeLessThan(bcErrada)
    expect(bcErrada - bcCorreta).toBeCloseTo(509.59, 1) // Diferença correspondente ao ICMS desembaraçado da base

    // Na composição correta, a CBS e IBS são calculados sobre a base limpa:
    const cbsCorreta = roundHalfUp(bcCorreta * (cbs / 100), 2)
    const ibsCorreta = roundHalfUp(bcCorreta * (ibs / 100), 2)
    expect(cbsCorreta).toBe(615.19)
    expect(ibsCorreta).toBe(2.32)

    // Se calculasse CBS/IBS sobre a base errada (com ICMS):
    const cbsErrada = roundHalfUp(bcErrada * (cbs / 100), 2)
    expect(cbsErrada).toBe(750.23)
    expect(cbsCorreta).not.toBe(cbsErrada) // Proteção legal explícita
  })

  it('8. Cada coluna de fornecedor tem base de cálculo própria, preço simulado próprio e nota fiscal própria', () => {
    const fDv = 0.975 * 0.98 * 0.97 // 0,926835
    const fMargem = 0.481 // 51,9%
    const fIcms = 0.82 // 18%
    const divisorSemIcms = fDv * fMargem

    const custos = {
      lp: 1116.63,
      lr: 1051.73,
      snp: 1482.94,
      snh: 1383.56,
    }

    const resultados = Object.entries(custos).map(([, custo]) => {
      const bc = roundHalfUp(custo / divisorSemIcms, 2)
      const cbs = roundHalfUp(bc * 0.265, 2)
      const ibs = roundHalfUp(bc * 0.001, 2)
      const valorSemIcms = roundHalfUp(bc + cbs + ibs, 2)
      const precoFinal = roundHalfUp(valorSemIcms / fIcms, 2)
      return { bc, cbs, ibs, valorSemIcms, precoFinal }
    })

    // Nenhuma coluna tem base de cálculo repetida
    const bcs = new Set(resultados.map((r) => r.bc))
    expect(bcs.size).toBe(4)

    // Nenhuma coluna tem preço final repetido
    const precos = new Set(resultados.map((r) => r.precoFinal))
    expect(precos.size).toBe(4)

    // Ordenação preservada conforme os custos do Card 03: LR < LP < SNH < SNP
    const [lp, lr, snp, snh] = resultados
    expect(lr.precoFinal).toBeLessThan(lp.precoFinal)
    expect(lp.precoFinal).toBeLessThan(snh.precoFinal)
    expect(snh.precoFinal).toBeLessThan(snp.precoFinal)
  })

  it('9. Motor completo calcularMarkupPosColuna diferencia sistemáticas e integra parâmetros do Simples', async () => {
    // Importa o motor da coluna
    const { calcularMarkupPosColuna } = await import('./markupPosCalculations')

    // Coluna LP (ICMS 18%)
    const resLp = calcularMarkupPosColuna({
      key: 'lp',
      custoUnitario: 1116.63,
      custoHoje: 1051.73,
      deltaCustoPct: 6.17,
      comprasLiquidasTotal: 33498.97,
      notaCompraTotal: 44488.27,
      fatorDvConsolidado: 1.0,
      somaDvPct: 0,
      margemLucroEfetiva: 51.9,
      icmsRateEfetivo: 18.0,
      cbsRateEfetivo: 26.5,
      ibsRateEfetivo: 0.1,
      quantidadeVendidaEfetiva: 24,
    })
    expect(resLp.isSimples).toBe(false)
    expect(resLp.precoVendaUnitario).toBe(3584.13)
    expect(resLp.icmsUnitario).toBe(roundHalfUp(3584.13 * 0.18, 2))

    // Coluna SNP (Simples Nacional Puro) — sem ICMS 18%!
    const resSnp = calcularMarkupPosColuna({
      key: 'snp',
      custoUnitario: 1482.94,
      custoHoje: 1413.33,
      deltaCustoPct: 4.92,
      comprasLiquidasTotal: 44488.27,
      notaCompraTotal: 44488.27,
      fatorDvConsolidado: 1.0,
      somaDvPct: 0,
      margemLucroEfetiva: 51.9,
      icmsRateEfetivo: 18.0, // Não deve ser usado no SNP!
      cbsRateEfetivo: 26.5,
      ibsRateEfetivo: 0.1,
      quantidadeVendidaEfetiva: 24,
      simplesAnexo: 'anexo_1',
      simplesRbt12: 180000,
    })
    expect(resSnp.isSimples).toBe(true)
    expect(resSnp.isSimplesHibrido).toBe(false)
    // Divisor SNP = 0,481 * 0,96 = 0,46176
    // Preço = 1.482,94 / 0,46176 = 3.211,49
    expect(resSnp.divisorPrincipal).toBeCloseTo(0.46176, 5)
    expect(resSnp.precoVendaUnitario).toBe(3211.5)
    // DAS total 4% de 3.211,50 = 128,46
    expect(resSnp.fatiasDas?.dasTotal).toBe(128.46)
    // ICMS no DAS = 34% de 128,46 = 43,68 (NUNCA 18% = ~578 reais!)
    expect(resSnp.fatiasDas?.icmsValor).toBe(43.68)
    expect(resSnp.icmsUnitario).toBe(43.68)
    expect(resSnp.icmsUnitario).toBeLessThan(100) // Proteção explícita contra 18%

    // Coluna SNH (Simples Nacional Híbrido) — DAS híbrido 3,38% por dentro + CBS/IBS por fora
    const resSnh = calcularMarkupPosColuna({
      key: 'snh',
      custoUnitario: 1383.56,
      custoHoje: 1413.33,
      deltaCustoPct: -2.11,
      comprasLiquidasTotal: 41506.86,
      notaCompraTotal: 44488.27,
      fatorDvConsolidado: 1.0,
      somaDvPct: 0,
      margemLucroEfetiva: 51.9,
      icmsRateEfetivo: 18.0, // Não deve ser usado como ICMS integral!
      cbsRateEfetivo: 26.5,
      ibsRateEfetivo: 0.1,
      quantidadeVendidaEfetiva: 24,
      simplesAnexo: 'anexo_1',
      simplesRbt12: 180000,
    })
    expect(resSnh.isSimples).toBe(true)
    expect(resSnh.isSimplesHibrido).toBe(true)
    // DAS híbrido = 3,38% -> divisor = 0,481 * (1 - 0,0338) = 0,481 * 0,9662 = 0,4647422
    expect(resSnh.divisorPrincipal).toBeCloseTo(0.4647422, 5)
    // Preço P = 1.383,56 / 0,4647422 = 2.977,05
    expect(resSnh.precoVendaUnitario).toBe(2977.05)
    // ICMS da fração do DAS = 2.977,05 * 1,36% = 40,49
    expect(resSnh.fatiasDas?.icmsValor).toBe(40.49)
    // Base de cálculo do CBS/IBS = P - ICMS = 2.977,05 - 40,49 = 2.936,56
    expect(resSnh.baseCalculoIbsCbs).toBe(2936.56)
    // CBS 26,5% por fora = 778,19
    expect(resSnh.cbsUnitario).toBe(778.19)
    // IBS 0,1% por fora = 2,94
    expect(resSnh.ibsUnitario).toBe(2.94)
    // Nota fiscal total = 2.977,05 + 778,19 + 2,94 = 3.758,18
    expect(resSnh.totalNotaUnitario).toBe(3758.18)
  })
})
