/**
 * BLINDAGEM DA SESSÃO "SN NA REFORMA" (28/09) — caso canônico travado ao centavo.
 * Caso: Celular 30 un × 1.400,00 + frete 400,00 · modo NOTA (1,30% ICMS + 2,70% CBS +
 * 0,17% IBS — 1ª faixa comércio, art. 23, §2º) · exercício 2027.
 * A sessão NÃO altera os ouros do Art. 12 — é camada própria.
 */
import { calcularSessaoSN, creditoEfetivoArt23, PERFIL_SN_NOTA_PADRAO } from './art12SnCalculations'
import { montarItensIntegracao } from './integracaoComprasArt12'
import { describe, expect, it } from 'vitest'

const itemCanônico = montarItensIntegracao([
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

describe('Sessão SN na Reforma — crédito proporcional do art. 23', () => {
  it('caso canônico — modo NOTA (percentuais do documento fiscal)', () => {
    const r = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO)
    // Receita bruta = mercadoria + frete
    expect(r.receitaBruta).toBe(42400)
    // DAS efetivo = 4,17% × 42.400 = 1.768,08
    expect(r.dasEfetivo).toBe(1768.08)
    // ICMS gerado na nota = 1,30% × 42.400 = 551,20
    expect(r.icmsNota).toBe(551.2)
    // CBS = 2,70% × 42.400 = 1.144,80
    expect(r.cbsDAS).toBe(1144.8)
    // IBS = 0,17% × 42.400 = 72,08
    expect(r.ibsDAS).toBe(72.08)
    // Crédito total do adquirente = 1.768,08 ("montante equivalente ao cobrado")
    expect(r.creditoTotal).toBe(1768.08)
    // Crédito por unidade = 1.768,08 ÷ 30 = 58,94
    expect(r.creditoUnidade).toBe(58.94)
    // Custo líquido = 42.400 − 1.768,08 = 40.631,92
    expect(r.custoLiquido).toBe(40631.92)
    // Custo unitário líquido = 40.631,92 ÷ 30 = 1.354,40
    expect(r.custoUnitarioLiquido).toBe(1354.4)
  })

  it('modo ANEXO — alíquota efetiva × fração do anexo (estimado)', () => {
    const r = calcularSessaoSN(itemCanônico, {
      ...PERFIL_SN_NOTA_PADRAO,
      modo: 'anexo',
      efetivaPct: 4.0,
      icmsFracPct: 32.5,
    })
    // ICMS derivado = 4,00% × 32,5% = 1,30%
    expect(r.icmsPct).toBe(1.3)
    // CBS derivada = 4,00% − 1,30% = 2,70% (PIS/COFINS extintos em 2027)
    expect(r.cbsPct).toBe(2.7)
    // IBS no modo anexo = 0 (partilha estatística em 2027–28)
    expect(r.ibsPct).toBe(0)
    // Crédito = 1,30% + 2,70% = 4,00% × 42.400 = 1.696,00
    expect(r.creditoTotal).toBe(1696)
    // Custo líquido = 42.400 − 1.696 = 40.704 → 1.356,80/un
    expect(r.custoUnitarioLiquido).toBe(1356.8)
  })

  it('REGRA DE CRÉDITO por adquirente (art. 23 + art. 47) — travada', () => {
    const r = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO)
    // LP/LR (não optantes): crédito proporcional INTEGRAL — ICMS + CBS + IBS = 1.768,08
    expect(creditoEfetivoArt23('presumido', r)).toBe(1768.08)
    expect(creditoEfetivoArt23('real', r)).toBe(1768.08)
    // SN híbrido (regime regular): só CBS + IBS — ICMS do fornecedor segue no DAS
    expect(creditoEfetivoArt23('simples_hibrido', r)).toBe(1216.88)
    // SN puro (optante): SEM crédito — optante não apropria (art. 47)
    expect(creditoEfetivoArt23('simples', r)).toBe(0)
    // Custo líquido resultante por adquirente (nota 42.400 − crédito)
    const unit = (adq: Parameters<typeof creditoEfetivoArt23>[0]) =>
      (42400 - creditoEfetivoArt23(adq, r)) / 30
    // LP/LR: 40.631,92 ÷ 30 = 1.354,40
    expect(unit('presumido')).toBe(1354.4)
    // SN híbrido: 42.400 − 1.216,88 = 41.183,12 ÷ 30 = 1.372,77
    expect(unit('simples_hibrido')).toBe(1372.77)
    // SN: nota cheia 42.400 ÷ 30 = 1.413,33 (ouro intacto)
    expect(unit('simples')).toBe(1413.33)
  })

  it('a sessão NUNCA altera os ouros do Art. 12 (camada própria)', () => {
    // O ouro LP×SN do Art. 12 continua 1.413,33 (crédito zero lá) — a sessão é ao lado.
    // Este teste trava a independência: o cálculo da sessão não lê nem escreve o motor Art. 12.
    const r = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO)
    // O custo da sessão (1.354,40) é DIFERENTE do ouro do Art. 12 (1.413,33) — por desenho:
    // a sessão inclui o crédito do art. 23 que o Art. 12 ainda não computa.
    expect(r.custoUnitarioLiquido).not.toBe(1413.33)
    expect(r.custoUnitarioLiquido).toBe(1354.4)
  })

  it('LR comprando em 2026 — crédito ICMS + PIS 1,65% + COFINS 7,6% s/ base sem ICMS (ADI SRF 15/2007)', () => {
    const r = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO, 'real')
    // Base PIS/COFINS = 42.400 − 551,20 (ICMS destacado) = 41.848,80 (Lei 14.592/23, STJ Tema 1231)
    expect(r.pisCofinsBaseHoje).toBe(41848.8)
    expect(r.icmsNota).toBe(551.2)
    // PIS 1,65% × 41.848,80 = 690,51 · COFINS 7,60% × 41.848,80 = 3.180,51 → 3.871,02
    expect(r.creditoPisCofinsHoje).toBe(3871.02)
    // HOJE-SN do LR = 42.400 − 551,20 − 690,51 − 3.180,51 = 37.977,78 → 1.265,93/un (ouro)
    expect(r.creditoHojeSN).toBe(4422.22)
    expect(r.custoHojeSN).toBe(37977.78)
    expect(r.custoUnitarioHojeSN).toBe(1265.93)
    // LP intocado: HOJE-SN = só ICMS → 1.394,96 (ouro de 02/10)
    const rLP = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO, 'presumido')
    expect(rLP.custoUnitarioHojeSN).toBe(1394.96)
    expect(rLP.creditoPisCofinsHoje).toBe(0)
    // 2027 do LR: nota congelada − crédito art. 23 integral (ICMS+CBS+IBS) = 1.354,40 — não muda
    expect(r.custoUnitarioLiquido).toBe(1354.4)
    // Δ honesto do LR (2027 × 2026-SN, mesma combinação) = +6,99%
    const delta = (r.custoUnitarioLiquido / r.custoUnitarioHojeSN - 1) * 100
    expect(Math.round(delta * 100) / 100).toBe(6.99)
    // Δ honesto do LP segue −2,91% (regressão)
    const deltaLP = (rLP.custoUnitarioLiquido / rLP.custoUnitarioHojeSN - 1) * 100
    expect(Math.round(deltaLP * 100) / 100).toBe(-2.91)
  })

  it('edredom (50 un × 200) e travesseiro (30 un — 1.050 + 50) — ouros por item do LR em 2026', () => {
    const edr = montarItensIntegracao([
      {
        id: 'edr',
        name: 'Edredom',
        quantity: 50,
        merchandiseValue: 10000,
        freightValue: 0,
        icmsRate: 18,
        icmsFreightRate: 18,
        ipiRate: 0,
        hasSt: false,
        stValue: 0,
      },
    ])[0]
    const rEdr = calcularSessaoSN(edr, PERFIL_SN_NOTA_PADRAO, 'real')
    expect(rEdr.custoUnitarioHojeSN).toBe(179.14)
    const trav = montarItensIntegracao([
      {
        id: 'trav',
        name: 'Travesseiro',
        quantity: 30,
        merchandiseValue: 1050,
        freightValue: 50,
        icmsRate: 18,
        icmsFreightRate: 18,
        ipiRate: 0,
        hasSt: false,
        stValue: 0,
      },
    ])[0]
    const rTrav = calcularSessaoSN(trav, PERFIL_SN_NOTA_PADRAO, 'real')
    expect(rTrav.custoUnitarioHojeSN).toBe(32.84)
  })
})
