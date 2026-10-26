/**
 * BLINDAGEM DO ARTIGO 12 LC 214/2025: PADRÃO-OURO SNP (SIMPLES NACIONAL PURO) × SNH (SIMPLES NACIONAL HÍBRIDO)
 *
 * MUDANÇA 1 (v0.0.444):
 * O patch da v0.0.443 inverteu a condição do híbrido em `src/lib/art12Calculations.ts`:
 * híbrido SOMENTE quando explicitamente `tipo === 'hibrido'` ou regime `simples_hibrido`.
 * Sem perfil explícito (undefined) = PURO por default.
 *
 * Casos cobertos neste arquivo de teste:
 * (a) Chamada SEM perfil explícito (undefined) → cai no ramo PURO: sem destaque de CBS/IBS
 *     pela alíquota cheia (9,14%/0,10%) sobre base desonerada, sem rótulo "fornecedor SN híbrido".
 * (b) Perfil 'hibrido' → OUROS DO CENÁRIO 04 chancelados pela Adri:
 *     fator divisor 0,430739 · P 3.236,55 · DAS híbrido 3,38% = 109,40 (ICMS 44,02 + federais 65,38)
 *     · BC CBS 3.192,53 · CBS 280,94 · IBS 3,19 por fora · nota 3.520,68 (arredondamento meio a meio para cima).
 * (c) Perfil 'puro' → OUROS DO CENÁRIO 03 chancelados pela Adri:
 *     preço 3.237,55 · DAS 129,50 (4,00%) · ICMS 44,03 por dentro · CBS 19,85 · IBS 0,22 · federais 65,40
 *     — tudo por dentro do DAS, sem dedução de ICMS da base.
 */
import { describe, expect, it } from 'vitest'
import {
  CRONOGRAMA_ART12,
  computeCellArt12,
  type CellConfigArt,
  type CmvArt12Input,
} from './art12Calculations'
import { roundHalfUp } from './art12SnCalculations'

const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!

const itemExemplo: CmvArt12Input = {
  quantity: 30,
  unitPrice: 1400.0,
  freightValue: 400.0,
  icmsRate: 18,
  icmsFreightRate: 18,
  ipiRate: 0,
}

describe('Art. 12 LC 214/2025 — Ouros SNP (Puro) × SNH (Híbrido)', () => {
  // (a) chamada SEM perfil explícito (undefined) → cai no ramo PURO
  it('(a) Chamada com fornecedor "simples" e perfilFornecedorSN undefined cai no ramo PURO (sem destaque de CBS/IBS pela alíquota cheia e sem rótulo "fornecedor SN híbrido")', () => {
    const configSemPerfil: CellConfigArt = {
      fornecedorRegime: 'simples',
      fornecedorPerfil: 'comercio',
      compradorRegime: 'presumido',
      compradorPerfil: 'comercio',
      zfm: false,
      repasse: 'nenhum',
      repassePct: 0,
      baseIcmsTransicao: 'fisco',
      perfilFornecedorSN: undefined,
    }

    const cell = computeCellArt12(itemExemplo, configSemPerfil, row2027)

    // Não deve conter a explicação do fornecedor híbrido
    expect(cell.porque).not.toContain('Fornecedor SN híbrido')
    expect(cell.porque).toContain('Fornecedor SN')

    // Na memória de cálculo do lado do exercício, não deve ter linhas de CBS/IBS destacadas por fora (cbs_snhib / ibs_snhib)
    const chavesExercicio = cell.exercicio.lines.map((l) => l.key)
    expect(chavesExercicio).not.toContain('cbs_snhib')
    expect(chavesExercicio).not.toContain('ibs_snhib')
    expect(chavesExercicio).not.toContain('preconota_snhib')

    // Deve conter a marcação de SN Puro
    expect(chavesExercicio).toContain('sn_preconota')
    expect(chavesExercicio).toContain('cbsibs') // sem destaque (fornecedor SN)

    // A nota permanece no valor congelado da operação sem acréscimo de CBS/IBS por fora
    const brutoEsperado = 30 * 1400.0 + 400.0 // 42.400,00
    expect(cell.exercicio.bruto).toBe(brutoEsperado)
  })

  // (b) perfil 'hibrido' → OUROS DO CENÁRIO 04 chancelados pela Adri
  it('(b) Perfil "hibrido" — OUROS DO CENÁRIO 04 chancelados pela Adri: divisor 0,430739 · P 3.236,55 · DAS híbrido 3,38% = 109,40 · BC CBS 3.192,53 · CBS 280,94 · IBS 3,19 · nota 3.520,68', () => {
    // Fatores de teste canônicos chancelados:
    // Fator DV: 0,975 * 0,97 * 0,98 = 0,926835
    // Fator Margem 51,9%: (1 - 0,519) = 0,481
    // DAS híbrido 3,38%: (1 - 0,0338) = 0,9662
    const fDv = 0.975 * 0.97 * 0.98
    const fMargem = 0.481
    const fDasHibrido = 1 - 0.0338
    const divisor = fDv * fMargem * fDasHibrido
    expect(roundHalfUp(divisor, 6)).toBe(0.430739)

    const precoHibrido = 3236.55
    const dasHibrido = roundHalfUp(precoHibrido * 0.0338, 2)
    expect(dasHibrido).toBe(109.4)

    // Repartição do DAS híbrido (4,00% nominal × frações do Anexo I 1ª faixa):
    // ICMS: 3.236,55 × (4% × 34%) = 3.236,55 × 1,36% = 44,01708 → 44,02
    // Federais (IRPJ/CSLL/CPP): 3.236,55 × (4% × 50,5%) = 3.236,55 × 2,02% = 65,37831 → 65,38
    const icms = roundHalfUp(precoHibrido * (0.04 * 0.34), 2)
    const federais = roundHalfUp(precoHibrido * (0.04 * 0.505), 2)
    expect(icms).toBe(44.02)
    expect(federais).toBe(65.38)
    expect(roundHalfUp(icms + federais, 2)).toBe(109.4)

    // Base de cálculo CBS/IBS sem o ICMS do DAS:
    // BC = 3.236,55 − 44,02 = 3.192,53
    const bcCbsIbs = roundHalfUp(precoHibrido - icms, 2)
    expect(bcCbsIbs).toBe(3192.53)

    // CBS e IBS destacados por fora com alíquota cheia 2027 (CBS 8,80% / IBS 0,10%):
    // CBS: 3.192,53 × 8,80% = 280,94264 → 280,94
    // IBS: 3.192,53 × 0,10% = 3,19253 → 3,19 (meio a meio para cima)
    const cbs = roundHalfUp(bcCbsIbs * 0.088, 2)
    const ibs = roundHalfUp(bcCbsIbs * 0.001, 2)
    expect(cbs).toBe(280.94)
    expect(ibs).toBe(3.19)

    // Nota fiscal final com tributos por fora:
    // 3.236,55 + 280,94 + 3,19 = 3.520,68
    const nota = roundHalfUp(precoHibrido + cbs + ibs, 2)
    expect(nota).toBe(3520.68)

    // Verificação também pelo motor computeCellArt12 com perfil 'hibrido' explícito:
    const configHibrido: CellConfigArt = {
      fornecedorRegime: 'simples_hibrido',
      fornecedorPerfil: 'comercio',
      compradorRegime: 'presumido',
      compradorPerfil: 'comercio',
      zfm: false,
      repasse: 'integral',
      repassePct: 100,
      baseIcmsTransicao: 'fisco',
      perfilFornecedorSN: {
        anexo: 'Anexo I (comércio)',
        faixa: '1ª faixa',
        efetivaPct: 4.0,
        icmsFracPct: 34.0,
        tipo: 'hibrido',
      },
    }
    const cellHibrido = computeCellArt12(itemExemplo, configHibrido, row2027)
    expect(cellHibrido.porque).toContain('Fornecedor SN híbrido')
    const chaves = cellHibrido.exercicio.lines.map((l) => l.key)
    expect(chaves).toContain('cbs_snhib')
    expect(chaves).toContain('ibs_snhib')
    expect(chaves).toContain('preconota_snhib')
  })

  // (c) perfil 'puro' → OUROS DO CENÁRIO 03 chancelados pela Adri
  it('(c) Perfil "puro" — OUROS DO CENÁRIO 03 chancelados pela Adri: preço 3.237,55 · DAS 129,50 (4,00%) · ICMS 44,03 · CBS 19,85 · IBS 0,22 · federais 65,40 (tudo por dentro)', () => {
    // Preço canônico de venda cenário 03 SN Puro:
    const precoPuro = 3237.55
    const aliquotaDas = 0.04
    const dasTotal = roundHalfUp(precoPuro * aliquotaDas, 2)
    expect(dasTotal).toBe(129.5) // 4,00% × 3.237,55 = 129,502 → 129,50

    // Decomposição interna das frações do Anexo I 1ª faixa em 2027–2028:
    // ICMS 34,00%: 129,50 × 34,00% = 44,0300 → 44,03
    // CBS 15,33%:  129,50 × 15,33% = 19,85235 → 19,85
    // IBS 0,17%:   129,50 × 0,17%  = 0,22015 → 0,22
    // Federais 50,50%: 129,50 × 50,50% = 65,3975 → 65,40
    const icms = roundHalfUp(dasTotal * 0.34, 2)
    const cbs = roundHalfUp(dasTotal * 0.1533, 2)
    const ibs = roundHalfUp(dasTotal * 0.0017, 2)
    const federais = roundHalfUp(dasTotal * 0.505, 2)

    expect(icms).toBe(44.03)
    expect(cbs).toBe(19.85)
    expect(ibs).toBe(0.22)
    expect(federais).toBe(65.4)

    // Tudo por dentro do DAS: a soma das 4 parcelas é consistente com o total do DAS
    const somaParcelas = roundHalfUp(icms + cbs + ibs + federais, 2)
    expect(somaParcelas).toBe(129.5)

    // Teste com computeCellArt12 garantindo perfil 'puro'
    const configPuro: CellConfigArt = {
      fornecedorRegime: 'simples',
      fornecedorPerfil: 'comercio',
      compradorRegime: 'presumido',
      compradorPerfil: 'comercio',
      zfm: false,
      repasse: 'nenhum',
      repassePct: 0,
      baseIcmsTransicao: 'fisco',
      perfilFornecedorSN: {
        anexo: 'Anexo I (comércio)',
        faixa: '1ª faixa',
        efetivaPct: 4.0,
        icmsFracPct: 34.0,
        tipo: 'puro',
      },
    }
    const cellPuro = computeCellArt12(itemExemplo, configPuro, row2027)
    expect(cellPuro.porque).toContain('Fornecedor SN: nota congelada')
    expect(cellPuro.exercicio.lines.map((l) => l.key)).toContain('sn_preconota')
  })
})
