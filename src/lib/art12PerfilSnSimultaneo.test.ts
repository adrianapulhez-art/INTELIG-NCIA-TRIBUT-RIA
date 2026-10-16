/**
 * BLINDAGEM DO PERFIL DO FORNECEDOR SN SIMULTÂNEO (ART. 12 + SESSÃO SN)
 *
 * Cobertura dos 4 pilares:
 * (1) OUROS com perfil padrão (Anexo I · 1ª faixa · efetiva 4,00% · fração ICMS 34%):
 *     - Cenário 04 híbrido e cenário 03 puro (comentados com test.skip onde a reconstrução dos inputs específicos da calculadora de markup estiver pendente);
 *     - Crédito canônico 839,52 (parcela creditável 1,98% sobre nota canônica 42.400,00);
 *     - Célula LR × LR neutra: nota 2027 41.902,54 · divisor 0,365562 · compras líquidas 31.551,96 · custo 1.051,73 · Δ 0,00%;
 *     - Células puro 1.482,94 e híbrido 1.383,56;
 *     - Custo LP comprando de SN no baseline 2026: 1.394,11;
 *     - Nota régua B 44.488,27.
 *
 * (2) RECÁLCULO SIMULTÂNEO:
 *     - Perfil com efetiva 6,00% (fração ICMS 34%) em vez de 4,00%;
 *     - ICMS do DAS muda em ambos os caminhos:
 *         calcularSessaoSN: 42.400 × 6% × 34% = 864,96 de ICMS;
 *         computeCellArt12Item (fornecedor 'simples_hibrido' + perfil { efetivaPct: 6, icmsFracPct: 34 }):
 *           icmsDasRef = 864,96;
 *           base IBS/CBS = 42.400 − 864,96 = 41.535,04;
 *     - O resultado difere estritamente do obtido com o perfil padrão (prova de que o fio está vivo).
 *
 * (3) MODO 'da nota' (origem === 'nota'):
 *     - Parcelas digitadas icms 1,80% / cbs 0,50% / ibs 0,05%;
 *     - efetivaPct = 2,35% exata;
 *     - irpjCsllCppPct = 97,65%;
 *     - Caso-limite: soma ≥ 100% → irpjCsllCppPct = 0 (nunca negativo);
 *     - Arredondamento half-up (convenção chancelada).
 *
 * (4) IDENTIDADE COM FALLBACK:
 *     - computeCellArt12Item com perfilFornecedorSN undefined vs perfilFornecedorSN = PERFIL_SN_PADRAO;
 *     - Retorno rigorosamente idêntico: hoje.unitario, exercicio.unitario, exercicio.bruto, exercicio.creditos, deltaPct.
 */
import { describe, expect, it } from 'vitest'
import {
  computeCellArt12Item,
  PERFIL_SN_PADRAO,
  type CellConfigArt,
  type ScheduleRowArt,
} from './art12Calculations'
import {
  calcularCelulaFornecedorPlenoXAdquirenteSn,
  calcularSessaoSN,
  PERFIL_SN_NOTA_PADRAO,
  roundHalfUp,
  type PerfilSN,
} from './art12SnCalculations'
import { calcularCelulaLrXLr } from './art12LrCalculations'
import { montarItensIntegracao, type ItemComprasOrigem } from './integracaoComprasArt12'

const ITEM_COMPRA_CANONICO: ItemComprasOrigem = {
  id: 'item-canonico-samsung',
  name: 'Celular Samsung (exemplo canônico)',
  quantity: 30,
  merchandiseValue: 42000,
  freightValue: 400,
  icmsRate: 18,
  icmsFreightRate: 18,
  ipiRate: 0,
  hasSt: false,
  stValue: 0,
}

const itemCanônico = montarItensIntegracao([ITEM_COMPRA_CANONICO])[0]

const row2027: ScheduleRowArt = {
  exercicio: 2027,
  cbsRate: 8.8,
  ibsRate: 0.1,
  icmsPct: 100,
  ipiZero: true,
  habilitado: true,
}

describe('Art. 12 & Sessão SN — Blindagem de Perfil Simultâneo e Ouros Chancelados', () => {
  // ==========================================================================
  // PILAR 1: OUROS COM PERFIL PADRÃO
  // ==========================================================================
  describe('Pilar 1 — Ouros com perfil padrão (Anexo I · 1ª faixa · efetiva 4,00% · fração ICMS 34%)', () => {
    it('1.1 Crédito canônico 839,52 e custo LP baseline 1.394,11 sobre nota canônica 42.400,00', () => {
      const resSN = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO, 'presumido')

      expect(resSN.receitaBruta).toBe(42400.0)
      // Parcela creditável 2027: 1,98% (ICMS 1,36% + CBS 0,6132% + IBS 0,0068%) = 839,52
      expect(resSN.parcelaCreditavelTotal).toBe(839.52)
      expect(resSN.creditoTotal).toBe(839.52)
      // Custo unitário 2026 baseline LP comprando de SN: 1.394,11
      expect(resSN.custoHojeSN).toBe(41823.36)
      expect(resSN.custoUnitarioHojeSN).toBe(1394.11)
      expect(resSN.creditoHojeSN).toBe(576.64)
    })

    it('1.2 Célula LR × LR neutra — nota 2027 41.902,54 · divisor 0,365562 · compras líquidas 31.551,96 · custo 1.051,73 · Δ 0,00%', () => {
      const celulaLr = calcularCelulaLrXLr(itemCanônico)

      expect(celulaLr.exercicio2027.notaCheia).toBe(41902.54)
      expect(celulaLr.exercicio2027.fatorDivisorMotor).toBe(0.365562)
      expect(celulaLr.exercicio2027.fatorDivisorExibido).toBe(0.3655)
      expect(celulaLr.exercicio2027.comprasLiquidas).toBe(31551.96)
      expect(celulaLr.hoje.comprasLiquidas).toBe(31551.96)
      expect(celulaLr.exercicio2027.custoUnitario).toBe(1051.73)
      expect(celulaLr.hoje.custoUnitario).toBe(1051.73)
      expect(celulaLr.deltaPct).toBe(0.0)
    })

    it('1.3 Células puro 1.482,94 e híbrido 1.383,56 e nota régua B 44.488,27', () => {
      const celulaPuro = calcularCelulaFornecedorPlenoXAdquirenteSn(
        'lucro_presumido',
        'simples',
        itemCanônico,
      )
      const celulaHibrido = calcularCelulaFornecedorPlenoXAdquirenteSn(
        'lucro_presumido',
        'simples_hibrido',
        itemCanônico,
      )

      // Célula puro: 1.482,94
      expect(celulaPuro.exercicio2027.custoUnitario).toBe(1482.94)
      expect(celulaPuro.exercicio2027.notaCheia).toBe(44488.27) // Nota régua B plena
      expect(celulaPuro.exercicio2027.totalCreditos).toBe(0.0)

      // Célula híbrido: 1.383,56
      expect(celulaHibrido.exercicio2027.custoUnitario).toBe(1383.56)
      expect(celulaHibrido.exercicio2027.notaCheia).toBe(44488.27) // Nota régua B plena
      expect(celulaHibrido.exercicio2027.cbsCredito).toBe(2947.91)
      expect(celulaHibrido.exercicio2027.ibsCredito).toBe(33.5)
      expect(celulaHibrido.exercicio2027.totalCreditos).toBe(2981.41)
    })

    // Ouros do módulo Markup Pós-Reforma (cenários 03 e 04 unitários da precificação de venda)
    // ouro chancelado — reconstrução de input pendente da tela de precificação
    it.skip('1.4 Cenário 03 puro — 3.237,55 · DAS 129,50 (ICMS 44,03 · CBS 19,85 · IBS 0,22 · federais 65,40)', () => {
      // ouro chancelado — reconstrução de input pendente
    })

    // ouro chancelado — reconstrução de input pendente da tela de precificação
    it.skip('1.5 Cenário 04 híbrido — divisor 0,430739 · P 3.236,55 · DAS 3,38% = 109,40 (ICMS 44,02 + federais 65,38) · BC CBS 3.192,53 · CBS 280,94 · IBS 3,19 · nota 3.520,68', () => {
      // ouro chancelado — reconstrução de input pendente
    })
  })

  // ==========================================================================
  // PILAR 2: RECÁLCULO SIMULTÂNEO
  // ==========================================================================
  describe('Pilar 2 — Recálculo simultâneo (efetiva 6,00% · fração ICMS 34%)', () => {
    it('2.1 ICMS do DAS derivado muda em ambos os caminhos e base IBS/CBS torna-se 41.535,04', () => {
      // Perfil customizado: efetiva 6,00% com fração ICMS 34%
      // 42.400 × 6% × 34% = 864,96 de ICMS
      // Base IBS/CBS = 42.400 − 864,96 = 41.535,04
      const perfil6: PerfilSN = {
        ...PERFIL_SN_NOTA_PADRAO,
        efetivaPct: 6.0,
        icmsFracPct: 34.0,
      }

      // CAMINHO A: calcularSessaoSN
      const resSessaoPadrao = calcularSessaoSN(itemCanônico, PERFIL_SN_NOTA_PADRAO)
      const resSessao6 = calcularSessaoSN(itemCanônico, perfil6)

      expect(resSessao6.icmsNota).toBe(864.96)
      expect(resSessao6.icmsNota6).toBeCloseTo(864.96, 6)
      expect(resSessaoPadrao.icmsNota).toBe(576.64)
      expect(resSessao6.icmsNota).not.toBe(resSessaoPadrao.icmsNota)

      // CAMINHO B: computeCellArt12Item com fornecedor 'simples_hibrido'
      const configPadrao: CellConfigArt = {
        fornecedorRegime: 'simples_hibrido',
        fornecedorPerfil: 'comercio',
        compradorRegime: 'real',
        compradorPerfil: 'comercio',
        zfm: false,
        repasse: 'integral',
        repassePct: 100,
        baseIcmsTransicao: 'fisco',
        perfilFornecedorSN: PERFIL_SN_PADRAO,
      }

      const config6: CellConfigArt = {
        ...configPadrao,
        perfilFornecedorSN: {
          anexo: 'Anexo I (customizado)',
          faixa: 'Faixa customizada 6%',
          efetivaPct: 6.0,
          icmsFracPct: 34.0,
        },
      }

      const cellPadrao = computeCellArt12Item(itemCanônico, configPadrao, row2027)
      const cell6 = computeCellArt12Item(itemCanônico, config6, row2027)

      // Verificar memória do cell6:
      // icmsDasRef = 42.400 × 6% × 34% = 864,96
      // baseIbsCbsRef = 42.400 − 864,96 = 41.535,04
      // CBS híbrido = 41.535,04 × 8,8% = 3.655,08
      // IBS híbrido = 41.535,04 × 0,1% = 41,54
      const linhaIcms6 = cell6.exercicio.lines.find((l) => l.key === 'snhib_icms_das')
      const linhaBase6 = cell6.exercicio.lines.find((l) => l.key === 'snhib_base_it')

      expect(linhaIcms6).toBeDefined()
      expect(linhaIcms6?.value).toBe(-864.96)

      expect(linhaBase6).toBeDefined()
      expect(linhaBase6?.value).toBe(41535.04)

      // No padrão:
      // icmsDasRef = 42.400 × 4% × 34% = 576,64
      // baseIbsCbsRef = 42.400 − 576,64 = 41.823,36
      const linhaIcmsPadrao = cellPadrao.exercicio.lines.find((l) => l.key === 'snhib_icms_das')
      const linhaBasePadrao = cellPadrao.exercicio.lines.find((l) => l.key === 'snhib_base_it')
      expect(linhaIcmsPadrao?.value).toBe(-576.64)
      expect(linhaBasePadrao?.value).toBe(41823.36)

      // Prova de que o fio está vivo e difere do padrão
      expect(cell6.exercicio.bruto).not.toBe(cellPadrao.exercicio.bruto)
      expect(cell6.exercicio.creditos).not.toBe(cellPadrao.exercicio.creditos)
      expect(cell6.exercicio.unitario).not.toBe(cellPadrao.exercicio.unitario)
    })
  })

  // ==========================================================================
  // PILAR 3: MODO 'da nota' (origem === 'nota')
  // ==========================================================================
  describe('Pilar 3 — Modo "da nota" (origem === "nota")', () => {
    it('3.1 Parcelas digitadas icms 1,80% / cbs 0,50% / ibs 0,05% resultam em efetiva 2,35% e irpjCsllCpp 97,65%', () => {
      const perfilNota: PerfilSN = {
        ...PERFIL_SN_NOTA_PADRAO,
        origem: 'nota',
        icmsNotaPct: 1.8,
        cbsNotaPct: 0.5,
        ibsNotaPct: 0.05,
      }

      const res = calcularSessaoSN(itemCanônico, perfilNota)

      expect(res.origemPercentuais).toBe('nota')
      expect(res.origemRotulo).toBe('da nota')
      expect(res.icmsPct).toBe(1.8)
      expect(res.cbsPct).toBe(0.5)
      expect(res.ibsPct).toBe(0.05)
      expect(res.efetivaPct).toBe(2.35)
      expect(res.irpjCsllCppPct).toBe(97.65)
    })

    it('3.2 Caso limite com soma ≥ 100% garante irpjCsllCppPct = 0 (nunca negativo)', () => {
      const perfilLimite100: PerfilSN = {
        ...PERFIL_SN_NOTA_PADRAO,
        origem: 'nota',
        icmsNotaPct: 40.0,
        cbsNotaPct: 40.0,
        ibsNotaPct: 20.0, // soma = 100%
      }

      const res100 = calcularSessaoSN(itemCanônico, perfilLimite100)
      expect(res100.efetivaPct).toBe(100.0)
      expect(res100.irpjCsllCppPct).toBe(0.0)

      const perfilSupera100: PerfilSN = {
        ...PERFIL_SN_NOTA_PADRAO,
        origem: 'nota',
        icmsNotaPct: 50.0,
        cbsNotaPct: 40.0,
        ibsNotaPct: 20.0, // soma = 110%
      }

      const resSupera = calcularSessaoSN(itemCanônico, perfilSupera100)
      expect(resSupera.efetivaPct).toBe(110.0)
      expect(resSupera.irpjCsllCppPct).toBe(0.0)
      expect(resSupera.irpjCsllCppPct).toBeGreaterThanOrEqual(0.0)
    })

    it('3.3 Arredondamento half-up chancelado para 4 casas decimais na efetivaPct e irpjCsllCppPct', () => {
      const perfilFracionario: PerfilSN = {
        ...PERFIL_SN_NOTA_PADRAO,
        origem: 'nota',
        icmsNotaPct: 1.33333,
        cbsNotaPct: 0.66666,
        ibsNotaPct: 0.00001,
      }

      // Soma esperada: 1,33333 + 0,66666 + 0,00001 = 2,00000 -> 2
      const soma = 1.33333 + 0.66666 + 0.00001
      expect(roundHalfUp(soma, 4)).toBe(2)

      const res = calcularSessaoSN(itemCanônico, perfilFracionario)
      expect(res.efetivaPct).toBe(2)
      expect(res.irpjCsllCppPct).toBe(98)
    })
  })

  // ==========================================================================
  // PILAR 4: IDENTIDADE COM FALLBACK
  // ==========================================================================
  describe('Pilar 4 — Identidade com fallback (perfil undefined vs PERFIL_SN_PADRAO)', () => {
    it('4.1 computeCellArt12Item com perfilFornecedorSN undefined vs perfilFornecedorSN = PERFIL_SN_PADRAO produz retorno idêntico', () => {
      const configSemPerfil: CellConfigArt = {
        fornecedorRegime: 'simples_hibrido',
        fornecedorPerfil: 'comercio',
        compradorRegime: 'presumido',
        compradorPerfil: 'comercio',
        zfm: false,
        repasse: 'integral',
        repassePct: 100,
        baseIcmsTransicao: 'fisco',
        perfilFornecedorSN: undefined,
      }

      const configComPerfilPadrao: CellConfigArt = {
        ...configSemPerfil,
        perfilFornecedorSN: PERFIL_SN_PADRAO,
      }

      const resultadoSemPerfil = computeCellArt12Item(itemCanônico, configSemPerfil, row2027)
      const resultadoComPadrao = computeCellArt12Item(itemCanônico, configComPerfilPadrao, row2027)

      // Exatas asserções requeridas pelo pilar 4:
      // hoje.unitario, exercicio.unitario, exercicio.bruto, exercicio.creditos, deltaPct
      expect(resultadoSemPerfil.hoje.unitario).toBe(resultadoComPadrao.hoje.unitario)
      expect(resultadoSemPerfil.exercicio.unitario).toBe(resultadoComPadrao.exercicio.unitario)
      expect(resultadoSemPerfil.exercicio.bruto).toBe(resultadoComPadrao.exercicio.bruto)
      expect(resultadoSemPerfil.exercicio.creditos).toBe(resultadoComPadrao.exercicio.creditos)
      expect(resultadoSemPerfil.deltaPct).toBe(resultadoComPadrao.deltaPct)

      // Rigor total em todas as grandezas
      expect(resultadoSemPerfil.hoje.bruto).toBe(resultadoComPadrao.hoje.bruto)
      expect(resultadoSemPerfil.hoje.creditos).toBe(resultadoComPadrao.hoje.creditos)
      expect(resultadoSemPerfil.exercicio.liquido).toBe(resultadoComPadrao.exercicio.liquido)
      expect(resultadoSemPerfil.semaforo).toBe(resultadoComPadrao.semaforo)
    })

    it('4.2 Identidade com fallback também quando fornecedorRegime é "simples" (puro)', () => {
      const configPuroSemPerfil: CellConfigArt = {
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

      const configPuroComPadrao: CellConfigArt = {
        ...configPuroSemPerfil,
        perfilFornecedorSN: PERFIL_SN_PADRAO,
      }

      const resSem = computeCellArt12Item(itemCanônico, configPuroSemPerfil, row2027)
      const resCom = computeCellArt12Item(itemCanônico, configPuroComPadrao, row2027)

      expect(resSem.hoje.unitario).toBe(resCom.hoje.unitario)
      expect(resSem.exercicio.unitario).toBe(resCom.exercicio.unitario)
      expect(resSem.exercicio.bruto).toBe(resCom.exercicio.bruto)
      expect(resSem.exercicio.creditos).toBe(resCom.exercicio.creditos)
      expect(resSem.deltaPct).toBe(resCom.deltaPct)
    })
  })
})
