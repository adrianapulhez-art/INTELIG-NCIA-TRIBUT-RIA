/**
 * BLINDAGEM DA SESSÃO "SN NA REFORMA" — CASO CANÔNICO CORRIGIDO (PADRÃO-OURO)
 *
 * Caso: Celular Samsung 30 un × 1.400,00 = 42.000,00 + frete 400,00 = 42.400,00.
 * Fonte de verdade: Anexo I (comércio), 1ª faixa, 2027–2028:
 *   - Alíquota efetiva: 4,00%
 *   - Frações de repartição:
 *       ICMS 34,00% (4,00% × 34,00% = 1,36%)
 *       CBS 15,33%  (4,00% × 15,33% = 0,6132%)
 *       IBS 0,17%   (4,00% × 0,17%  = 0,0068%)
 *       IRPJ/CSLL/CPP 50,50% (4,00% × 50,50% = 2,02%) [não gera crédito]
 *
 * DAS devido decomposto em 4 blocos (42.400,00 × 4,00% = 1.696,00):
 *   - ICMS: 576,640000
 *   - CBS:  259,996800
 *   - IBS:    2,883200
 *   - IRPJ/CSLL/CPP: 856,480000
 *   Soma das 4 parcelas = 1.696,000000 (consistência perfeita)
 *
 * Parcela creditável do adquirente (2027, art. 47 §9º II):
 *   ICMS (576,64) + CBS (259,9968) + IBS (2,8832) = 839,520000.
 *   Custo líquido total: 42.400,00 − 839,52 = 41.560,480000.
 *   Custo unitário: 41.560,48 ÷ 30 = 1.385,349333... → exibição: 1.385,35.
 *
 * Baseline 2026 (art. 23 redação antiga, só ICMS):
 *   Crédito só de ICMS pela fração: 42.400 × 1,36% = 576,640000.
 *   Compras líquidas: 42.400 − 576,64 = 41.823,360000.
 *   Custo unitário baseline: 41.823,36 ÷ 30 = 1.394,112000 → exibição: 1.394,11.
 *
 * Parâmetro baseDoDas ('bruta' × 'liquida'):
 *   - Bruta: crédito 839,52; unitário 1.385,35.
 *   - Líquida (dedução ICMS 576,64): base = 41.823,360000;
 *     crédito = 41.823,36 × 1,98% = 828,102528;
 *     ou seja, exato e transparente com 6 decimais.
 */
import { describe, expect, it } from 'vitest'
import {
  calcularSessaoSN,
  creditoEfetivoArt23,
  PERFIL_SN_NOTA_PADRAO,
  TABELA_OFICIAL_SN,
  type PerfilSN,
} from './art12SnCalculations'
import { montarItensIntegracao } from './integracaoComprasArt12'

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

describe('Sessão SN na Reforma — Blindagem do Caso Canônico Corrigido (Padrão-Ouro)', () => {
  it('1. Caso Canônico — padrão-ouro 2027 com fonte oficial (Anexo I, 1ª faixa)', () => {
    const r = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO)

    // Nota fiscal: 30 un × 1.400,00 = 42.000,00 + frete 400,00 = 42.400,00
    expect(r.receitaBruta).toBe(42400)
    expect(r.receitaBruta6).toBe(42400)

    // DAS devido total (4,00% × 42.400,00 = 1.696,00)
    expect(r.dasEfetivo).toBe(1696.0)
    expect(r.dasEfetivo6).toBe(1696.0)

    // Decomposição exata em 4 blocos em 6 decimais:
    // ICMS: 42.400 × 1,36% = 576,640000
    expect(r.icmsNota6).toBe(576.64)
    expect(r.icmsNota).toBe(576.64)

    // CBS: 42.400 × 0,6132% = 259,996800
    expect(r.cbsDAS6).toBeCloseTo(259.9968, 6)
    expect(r.cbsDAS).toBe(260.0) // half-up

    // IBS: 42.400 × 0,0068% = 2,883200
    expect(r.ibsDAS6).toBeCloseTo(2.8832, 6)
    expect(r.ibsDAS).toBe(2.88)

    // IRPJ/CSLL/CPP: 42.400 × 2,02% = 856,480000
    expect(r.irpjCsllCppDAS6).toBeCloseTo(856.48, 6)
    expect(r.irpjCsllCppDAS).toBe(856.48)

    // Consistência matemática dos 4 blocos:
    // 576,64 + 259,9968 + 2,8832 + 856,48 = 1.696,000000
    expect(r.das4Blocos.somaParcelas6).toBeCloseTo(1696.0, 6)
    expect(r.das4Blocos.consistente).toBe(true)

    // Parcela Creditável (ICMS + CBS + IBS = 576,64 + 259,9968 + 2,8832 = 839,520000)
    expect(r.parcelaCreditavelTotal6).toBeCloseTo(839.52, 6)
    expect(r.parcelaCreditavelTotal).toBe(839.52)
    expect(r.creditoTotal).toBe(839.52)

    // Crédito por unidade: 839,52 ÷ 30 = 27,984000 → 27,98
    expect(r.creditoUnidade6).toBeCloseTo(27.984, 6)
    expect(r.creditoUnidade).toBe(27.98)

    // Custo Líquido total: 42.400 − 839,52 = 41.560,480000
    expect(r.custoLiquido6).toBeCloseTo(41560.48, 6)
    expect(r.custoLiquido).toBe(41560.48)

    // Custo Unitário líquido: 41.560,48 ÷ 30 = 1.385,349333... → half-up 1.385,35
    expect(r.custoUnitarioLiquido6).toBeCloseTo(1385.349333, 5)
    expect(r.custoUnitarioLiquido).toBe(1385.35)

    // Baseline 2026: crédito só de ICMS pela fração (576,64)
    // Custo 2026: 42.400 − 576,64 = 41.823,36
    // Unitário 2026: 41.823,36 ÷ 30 = 1.394,112000 → exibição 1.394,11
    expect(r.creditoHojeSN6).toBe(576.64)
    expect(r.creditoHojeSN).toBe(576.64)
    expect(r.custoHojeSN).toBe(41823.36)
    expect(r.custoUnitarioHojeSN6).toBeCloseTo(1394.112, 6)
    expect(r.custoUnitarioHojeSN).toBe(1394.11)

    // REJEIÇÃO FORMAL DOS VALORES ANTIGOS ERRADOS
    expect(r.dasEfetivo).not.toBe(1768.08)
    expect(r.custoUnitarioLiquido).not.toBe(1354.4)
    expect(r.icmsNota).not.toBe(551.2)
    expect(r.cbsDAS).not.toBe(1144.8)
    expect(r.ibsDAS).not.toBe(72.08)
    expect(r.custoHojeSN).not.toBe(34768.0)
    expect(r.custoUnitarioHojeSN).not.toBe(1158.93)
  })

  it('2. Decomposição do DAS em 4 Blocos (honestidade matemática e selo de consistência)', () => {
    const r = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO)
    const { das4Blocos } = r

    expect(das4Blocos.icmsValor6).toBe(576.64)
    expect(das4Blocos.cbsValor6).toBeCloseTo(259.9968, 6)
    expect(das4Blocos.ibsValor6).toBeCloseTo(2.8832, 6)
    expect(das4Blocos.irpjCsllCppValor6).toBeCloseTo(856.48, 6)

    // Soma exata sem perda de centavos
    const soma =
      das4Blocos.icmsValor6 +
      das4Blocos.cbsValor6 +
      das4Blocos.ibsValor6 +
      das4Blocos.irpjCsllCppValor6
    expect(soma).toBeCloseTo(das4Blocos.dasTotalDevido6, 6)
    expect(das4Blocos.consistente).toBe(true)
    expect(das4Blocos.diferencaCentavos).toBeLessThanOrEqual(0.01)
  })

  it('3. Origem rotulada visível: "estimativa da tabela" (default) vs "da nota"', () => {
    // Default: estimativa da tabela
    const rTabela = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO)
    expect(rTabela.origemPercentuais).toBe('tabela')
    expect(rTabela.origemRotulo).toBe('estimativa da tabela')

    // Modo digitado da nota
    const perfilNota: PerfilSN = {
      ...PERFIL_SN_NOTA_PADRAO,
      origem: 'nota',
      icmsNotaPct: 1.36,
      cbsNotaPct: 0.6132,
      ibsNotaPct: 0.0068,
      efetivaPct: 4.0,
    }
    const rNota = calcularSessaoSN(itemCanônico, perfilNota)
    expect(rNota.origemPercentuais).toBe('nota')
    expect(rNota.origemRotulo).toBe('da nota')
    expect(rNota.icmsPct).toBe(1.36)
    expect(rNota.cbsPct).toBe(0.6132)
    expect(rNota.ibsPct).toBe(0.0068)
  })

  it('4. Parâmetro baseDoDas: "bruta" (default) vs "liquida" (dedução art. 25, §1º, II)', () => {
    // Posição A: Base Bruta
    const rBruta = calcularSessaoSN(itemCanônico, {
      ...PERFIL_SN_NOTA_PADRAO,
      baseDoDas: 'bruta',
    })
    expect(rBruta.baseDasUtilizada).toBe(42400)
    expect(rBruta.creditoTotal).toBe(839.52)
    expect(rBruta.custoUnitarioLiquido).toBe(1385.35)

    // Posição B: Base Líquida de ICMS da nota
    // Dedução ICMS = 42.400 × 1,36% = 576,64
    // Base líquida = 42.400 − 576,64 = 41.823,36
    const rLiquida = calcularSessaoSN(itemCanônico, {
      ...PERFIL_SN_NOTA_PADRAO,
      baseDoDas: 'liquida',
    })
    expect(rLiquida.baseDasUtilizada6).toBeCloseTo(41823.36, 6)
    expect(rLiquida.baseDasUtilizada).toBe(41823.36)

    // Crédito sobre a base líquida: 41.823,36 × 1,98% = 828,102528 → 828,10
    // DAS sobre a base líquida: 41.823,36 × 4,00% = 1.672,934400 → 1.672,93
    expect(rLiquida.dasEfetivo6).toBeCloseTo(1672.9344, 6)
    expect(rLiquida.dasEfetivo).toBe(1672.93)
    expect(rLiquida.parcelaCreditavelTotal6).toBeCloseTo(828.102528, 6)
    expect(rLiquida.parcelaCreditavelTotal).toBe(828.1)
    // Custo líquido sob base líquida: 42.400 − 828,10 = 41.571,90 → un: 1.385,73
    expect(rLiquida.custoLiquido).toBe(41571.9)
    expect(rLiquida.custoUnitarioLiquido).toBe(1385.73)

    // O motor disponibiliza o comparativo simultâneo de ambas as teses
    expect(rBruta.comparativoBases.bruta.creditoTotal).toBe(839.52)
    expect(rBruta.comparativoBases.liquida.base).toBe(41823.36)
  })

  it('5. Regra de crédito por regime adquirente (art. 23 + art. 47 LC 214)', () => {
    const r = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO)

    // Lucro Presumido: crédito integral da parcela creditável = 839,52
    expect(creditoEfetivoArt23('presumido', r)).toBe(839.52)

    // Lucro Real 2027: parcela creditável integral = 839,52
    expect(creditoEfetivoArt23('real', r)).toBe(839.52)

    // Simples Nacional híbrido: credita CBS + IBS (260,00 + 2,88 = 262,88)
    // O ICMS segue no DAS do fornecedor e o híbrido não apropria
    expect(creditoEfetivoArt23('simples_hibrido', r)).toBe(262.88)

    // Simples Nacional puro: ZERO crédito (optante não toma crédito de optante — art. 47)
    expect(creditoEfetivoArt23('simples', r)).toBe(0)
  })

  it('6. Adquirente Lucro Real em 2026 (ADI SRF 15/2007 + SC COSIT 297/2019)', () => {
    const rLR = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO, 'real')

    // Base PIS/COFINS = 42.400 − 576,64 (ICMS fracionário da nota) = 41.823,36
    expect(rLR.pisCofinsBaseHoje).toBe(41823.36)
    // PIS 1,65% × 41.823,36 = 690,085440 → 690,09
    // COFINS 7,60% × 41.823,36 = 3.178,575360 → 3.178,58
    // Total PIS/COFINS = 3.868,660800 → 3.868,66
    expect(rLR.creditoPisCofinsHoje6).toBeCloseTo(3868.6608, 6)
    expect(rLR.creditoPisCofinsHoje).toBe(3868.66)

    // Total créditos LR 2026 = 576,64 + 3.868,66 = 4.445,30
    expect(rLR.creditoHojeSN).toBe(4445.3)
    // Custo líquido LR 2026 = 42.400 − 4.445,30 = 37.954,70 → unitário 1.265,16
    expect(rLR.custoHojeSN).toBe(37954.7)
    expect(rLR.custoUnitarioHojeSN).toBe(1265.16)
  })

  it('7. Tabela oficial aceita outros exercícios e parametrização', () => {
    expect(TABELA_OFICIAL_SN['anexo1_faixa1_2026'].fracaoCbsPct).toBe(0)
    expect(TABELA_OFICIAL_SN['anexo1_faixa1_2026'].fracaoIbsPct).toBe(0)
    expect(TABELA_OFICIAL_SN['anexo1_faixa1_2026'].fracaoIcmsPct).toBe(34.0)

    expect(TABELA_OFICIAL_SN['anexo1_faixa1_2027'].fracaoCbsPct).toBe(15.33)
    expect(TABELA_OFICIAL_SN['anexo1_faixa1_2027'].fracaoIbsPct).toBe(0.17)
    expect(TABELA_OFICIAL_SN['anexo1_faixa1_2027'].fracaoIrpjCsllCppPct).toBe(50.5)
  })
})
