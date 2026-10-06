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
  ANEXOS_BASE_LC123,
  calcularAliquotaEfetivaOficial,
  calcularPartilhaExercicio,
  calcularSessaoSN,
  creditoEfetivoArt23,
  getTabelaOficialConfig,
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

  it('8. Expansão Completa — Anexo I 6ª faixa (Sublimite: ICMS 0% no DAS, recolhido por fora)', () => {
    // Anexo I 6ª faixa (RBT12 = R$ 4.000.000,00)
    // Nominal: 19,00%, Parcela deduzir: R$ 378.000,00
    // Efetiva: (4.000.000 × 19% − 378.000) ÷ 4.000.000 = (760.000 − 378.000) ÷ 4.000.000 = 382.000 ÷ 4.000.000 = 9,55%
    const efetiva6a = calcularAliquotaEfetivaOficial('anexo1', 6, 4000000)
    expect(efetiva6a).toBe(9.55)

    const cfg6a = getTabelaOficialConfig(2027, 'anexo1', 6, 4000000)
    expect(cfg6a.aliquotaEfetivaPct).toBe(9.55)
    // No sublimite estadual do Anexo I, o ICMS no DAS é 0% (recolhido por fora no regime normal)
    expect(cfg6a.fracaoIcmsPct).toBe(0.0)
    // PIS/COFINS de 34,40% substituído por CBS (34,23%) e IBS teste (0,17%)
    expect(cfg6a.fracaoCbsPct).toBeCloseTo(34.23, 2)
    expect(cfg6a.fracaoIbsPct).toBe(0.17)
    expect(cfg6a.fracaoIrpjCsllCppPct).toBe(65.6) // 13.5 + 10.0 + 42.1 = 65.6%
    expect(cfg6a.fracaoCbsPct + cfg6a.fracaoIbsPct + cfg6a.fracaoIrpjCsllCppPct).toBeCloseTo(
      100.0,
      2,
    )

    // Simulação com o item canônico sob a 6ª faixa
    const perfil6a: PerfilSN = {
      origem: 'tabela',
      modo: 'anexo',
      anexo: cfg6a.anexo,
      faixa: cfg6a.faixa,
      exercicio: 2027,
      rbt12: 4000000,
      efetivaPct: cfg6a.aliquotaEfetivaPct,
      icmsFracPct: cfg6a.fracaoIcmsPct,
      cbsFracPct: cfg6a.fracaoCbsPct,
      ibsFracPct: cfg6a.fracaoIbsPct,
      irpjCsllCppFracPct: cfg6a.fracaoIrpjCsllCppPct,
      baseDoDas: 'bruta',
      icmsNotaPct: 0,
      cbsNotaPct: 0,
      ibsNotaPct: 0,
    }
    const r6 = calcularSessaoSN(itemCanônico, perfil6a)
    // DAS devido total: 42.400 × 9,55% = 4.049,20
    expect(r6.dasEfetivo).toBe(4049.2)
    // ICMS no DAS = 0
    expect(r6.icmsNota).toBe(0)
    // Parcela creditável do DAS: CBS + IBS = 34,40% da efetiva 9,55% = 3,2852%
    // 42.400 × 3,2852% = 1.392,9248 → 1.392,92
    expect(r6.parcelaCreditavelTotal6).toBeCloseTo(1392.9248, 4)
    expect(r6.das4Blocos.consistente).toBe(true)
  })

  it('9. Expansão Completa — Anexo III (Serviços em Geral / Fator R ≥ 28%)', () => {
    // Anexo III 1ª faixa: nominal 6,00%, parcela deduzir 0
    // Partilha: ISS 33,50%, CBS 15,43%, IBS 0,17%, Federais 50,90% (IRPJ 4 + CSLL 3.5 + CPP 43.4)
    const cfgAnexo3 = getTabelaOficialConfig(2027, 'anexo3', 1, 150000)
    expect(cfgAnexo3.aliquotaEfetivaPct).toBe(6.0)
    expect(cfgAnexo3.fracaoIcmsPct).toBe(33.5) // ISS municipal
    expect(cfgAnexo3.fracaoCbsPct).toBeCloseTo(15.43, 2) // PIS (2,78%) + COFINS (12,82%) - IBS (0,17%)
    expect(cfgAnexo3.fracaoIbsPct).toBe(0.17)
    expect(cfgAnexo3.fracaoIrpjCsllCppPct).toBe(50.9)
    expect(cfgAnexo3.statusLegal).toBe('PENDENTE_CONFIRMACAO')

    // DAS devido e decomposição para serviços de R$ 42.400,00
    const perfil3: PerfilSN = {
      origem: 'tabela',
      modo: 'anexo',
      anexo: cfgAnexo3.anexo,
      faixa: cfgAnexo3.faixa,
      exercicio: 2027,
      rbt12: 150000,
      efetivaPct: cfgAnexo3.aliquotaEfetivaPct,
      icmsFracPct: cfgAnexo3.fracaoIcmsPct,
      cbsFracPct: cfgAnexo3.fracaoCbsPct,
      ibsFracPct: cfgAnexo3.fracaoIbsPct,
      irpjCsllCppFracPct: cfgAnexo3.fracaoIrpjCsllCppPct,
      baseDoDas: 'bruta',
      icmsNotaPct: 0,
      cbsNotaPct: 0,
      ibsNotaPct: 0,
    }
    const r3 = calcularSessaoSN(itemCanônico, perfil3)
    // DAS devido total: 42.400 × 6,00% = 2.544,00
    expect(r3.dasEfetivo).toBe(2544.0)
    expect(r3.das4Blocos.consistente).toBe(true)
  })

  it('10. Expansão Completa — Anexo V (Serviços Intelectuais / Fator R < 28%)', () => {
    // Anexo V 1ª faixa: nominal 15,50%, parcela deduzir 0
    // Partilha: ISS 14,00%, CBS 16,98%, IBS 0,17%, Federais 68,85% (IRPJ 25 + CSLL 15 + CPP 28.85)
    const cfgAnexo5 = getTabelaOficialConfig(2027, 'anexo5', 1, 150000)
    expect(cfgAnexo5.aliquotaEfetivaPct).toBe(15.5)
    expect(cfgAnexo5.fracaoIcmsPct).toBe(14.0) // ISS
    expect(cfgAnexo5.fracaoCbsPct).toBeCloseTo(16.98, 2) // PIS (3,05%) + COFINS (14,10%) - IBS (0,17%)
    expect(cfgAnexo5.fracaoIbsPct).toBe(0.17)
    expect(cfgAnexo5.fracaoIrpjCsllCppPct).toBe(68.85)
    expect(cfgAnexo5.statusLegal).toBe('PENDENTE_CONFIRMACAO')

    const perfil5: PerfilSN = {
      origem: 'tabela',
      modo: 'anexo',
      anexo: cfgAnexo5.anexo,
      faixa: cfgAnexo5.faixa,
      exercicio: 2027,
      rbt12: 150000,
      efetivaPct: cfgAnexo5.aliquotaEfetivaPct,
      icmsFracPct: cfgAnexo5.fracaoIcmsPct,
      cbsFracPct: cfgAnexo5.fracaoCbsPct,
      ibsFracPct: cfgAnexo5.fracaoIbsPct,
      irpjCsllCppFracPct: cfgAnexo5.fracaoIrpjCsllCppPct,
      baseDoDas: 'bruta',
      icmsNotaPct: 0,
      cbsNotaPct: 0,
      ibsNotaPct: 0,
    }
    const r5 = calcularSessaoSN(itemCanônico, perfil5)
    // DAS devido total: 42.400 × 15,50% = 6.572,00
    expect(r5.dasEfetivo).toBe(6572.0)
    expect(r5.das4Blocos.consistente).toBe(true)
  })

  it('11. Transição 2029–2032 e Tratamento Honesto do Anexo II (Indústria / IPI)', () => {
    // Anexo II (Indústria): 1ª faixa nominal 4,50%, IPI 7,50%, ICMS 32,00%
    const cfgAnexo2 = getTabelaOficialConfig(2027, 'anexo2', 1, 150000)
    expect(cfgAnexo2.fracaoIpiPct).toBe(7.5)
    expect(cfgAnexo2.fracaoIcmsPct).toBe(32.0)
    expect(cfgAnexo2.statusLegal).toBe('PENDENTE_CONFIRMACAO')
    expect(cfgAnexo2.notaFonte).toContain('PENDENTE_CONFIRMACAO')

    // Exercício 2029 (Anexo I, 1ª faixa): ICMS tem redução de 10% (recolhe 90% = 30,60%) e IBS absorve 10% do ICMS + 0,17% = 3,57%
    const cfg2029 = getTabelaOficialConfig(2029, 'anexo1', 1)
    expect(cfg2029.fracaoIcmsPct).toBeCloseTo(30.6, 2) // 34% × 90% = 30,60%
    expect(cfg2029.fracaoIbsPct).toBeCloseTo(3.57, 2) // 0,17% + (34% × 10%) = 3,57%
    expect(cfg2029.fracaoCbsPct).toBe(15.33)
    expect(cfg2029.fracaoIrpjCsllCppPct).toBe(50.5)
    expect(cfg2029.statusLegal).toBe('PENDENTE_CONFIRMACAO')
  })
})
