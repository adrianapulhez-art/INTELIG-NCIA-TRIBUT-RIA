import { describe, it, expect } from 'vitest'
import { lerEspelhoComprasCard03 } from './leituraCard03Compras'
import {
  montarItensIntegracao,
  derivarCasoUnitario,
  type ItemIntegracaoArt12,
} from './integracaoComprasArt12'
import type { ClienteRegimeKey, FornecedorPosKey } from './markupPosCalculations'

/**
 * TESTE DE BLINDAGEM DA INTEGRAÇÃO CARD 03 COM AS 16 CÉLULAS CHANCELADAS PELA ADRI
 *
 * Configuração:
 * - Item da sessão Adri: RBV R$ 42.000,00 · frete R$ 0,00 · 30 unidades (R$ 1.400,00/un)
 * - Alíquota ICMS 18%, IPI 0%, sem ST.
 * - Caminho real que o MarkupPosPage usa: lerEspelhoComprasCard03(clienteRegime, { item, inputPleno, ... })
 *
 * 16 VALORES OBRIGATÓRIOS (Custo Unitário 2027; Compras Líquidas CL entre parênteses):
 * - lp×lp 1106.10 (33.182,94) · lp×lr 1041.81 (31.254,30) · lp×snp 1372.28 (41.168,40) · lp×snh 1380.96 (41.428,80)
 *   (régua Adri Rodada 1 do cliente LP: lp×snp parcela creditável 831,60; lp×snh créditos 5.269,23)
 * - lr×lp 1106.10 (33.182,94) · lr×lr 1041.81 (31.254,30) · lr×snp 1335.17 (40.055,19) · lr×snh 1355.68 (40.670,38)
 * - snp×lp 1473.54 · snp×lr 1387.89 · snp×snp 1400.00 · snp×snh 1525.26 (VB=CL, sem crédito)
 * - snh×lp 1371.34 (41.140,05) · snh×lr 1291.63 (38.748,93) · snh×snp 1379.49 (41.384,81) · snh×snh 1400.00 (CL 42.000,00 exato)
 *
 * Travas adicionais obrigatórias:
 * 1. VB (Valor Bruto / nota fiscal 2027) por fornecedor idêntico em todos os adquirentes:
 *    - Fornecedor LP:  44.206,15
 *    - Fornecedor LR:  41.636,82
 *    - Fornecedor SNP: 42.000,00
 *    - Fornecedor SNH: 45.757,94 — EXCETO no adquirente LP, onde a régua Adri Rodada 1
 *      constrói a nota do híbrido por fora: 46.698,03
 * 2. Fração creditável do DAS do fornecedor SNP: 831,60 no adquirente LP (régua Adri Rodada 1,
 *    LC 123 art. 23 §1º/§2º c/c LC 214 art. 47 §9º II) e 1.944,81 no adquirente LR
 * 3. SNH adquirente com ICMS 0,00 nas 4 células (híbrido nunca credita ICMS 18%).
 */

describe('Blindagem Integração Card 03 Compras — 16 Células Chanceladas pela Adri', () => {
  // Montagem do item da sessão exatamente como MarkupPosPage monta a partir de purchasesItems
  const itensIntegracao = montarItensIntegracao([
    {
      id: 'item-sessao-adri-42k',
      name: 'Item Sessão da Adri (RBV 42k, frete 0, 30 un)',
      quantity: 30,
      merchandiseValue: 42000,
      freightValue: 0,
      icmsRate: 18,
      icmsFreightRate: 18,
      ipiRate: 0,
      hasSt: false,
      stValue: 0,
    },
  ])

  const caso = derivarCasoUnitario(itensIntegracao)
  const itemSessao: ItemIntegracaoArt12 = caso.item!
  const inputPleno = caso.input!

  // Helpers de leitura via caminho real do MarkupPosPage
  function obterEspelho(clienteRegime: ClienteRegimeKey) {
    return lerEspelhoComprasCard03(clienteRegime, {
      item: itemSessao,
      inputPleno,
    })
  }

  // Mapa de chancelas oficiais
  const CHANCELAS = {
    lp: {
      lp: { custo: 1106.1, cl: 33182.94 },
      lr: { custo: 1041.81, cl: 31254.3 },
      snp: { custo: 1372.28, cl: 41168.4 },
      snh: { custo: 1380.96, cl: 41428.8 },
    },
    lr: {
      lp: { custo: 1106.1, cl: 33182.94 },
      lr: { custo: 1041.81, cl: 31254.3 },
      snp: { custo: 1335.17, cl: 40055.19 },
      snh: { custo: 1355.68, cl: 40670.38 },
    },
    snp: {
      lp: { custo: 1473.54, cl: 44206.15 },
      lr: { custo: 1387.89, cl: 41636.82 },
      snp: { custo: 1400.0, cl: 42000.0 },
      snh: { custo: 1525.26, cl: 45757.94 },
    },
    snh: {
      lp: { custo: 1371.34, cl: 41140.05 },
      lr: { custo: 1291.63, cl: 38748.93 },
      snp: { custo: 1379.49, cl: 41384.81 },
      snh: { custo: 1400.0, cl: 42000.0 },
    },
  } as const

  const VB_ESPERADO_POR_FORNECEDOR: Record<FornecedorPosKey, number> = {
    lp: 44206.15,
    lr: 41636.82,
    snp: 42000.0,
    snh: 45757.94,
  }

  describe('1. Linha Adquirente Lucro Presumido (LP)', () => {
    const espelho = obterEspelho('lp')

    it('LP × LP: custo unitário 1106.10 e CL 33.182,94', () => {
      console.log(
        `[CELULA lp x lp] obtido=${espelho.lp.custo2027} (CL=${espelho.lp.comprasLiquidas2027}, VB=${espelho.lp.notaCheia2027}) | motor=${espelho.lp.motorOrigem} (${espelho.lp.rotuloMotor})`,
      )
      expect(espelho.lp.custo2027).toBe(CHANCELAS.lp.lp.custo)
      expect(espelho.lp.comprasLiquidas2027).toBe(CHANCELAS.lp.lp.cl)
    })

    it('LP × LR: custo unitário 1041.81 e CL 31.254,30', () => {
      console.log(
        `[CELULA lp x lr] obtido=${espelho.lr.custo2027} (CL=${espelho.lr.comprasLiquidas2027}, VB=${espelho.lr.notaCheia2027}) | motor=${espelho.lr.motorOrigem} (${espelho.lr.rotuloMotor})`,
      )
      expect(espelho.lr.custo2027).toBe(CHANCELAS.lp.lr.custo)
      expect(espelho.lr.comprasLiquidas2027).toBe(CHANCELAS.lp.lr.cl)
    })

    it('LP × SNP: custo unitário 1372.28, CL 41.168,40 e parcela creditável 831,60 (régua Adri)', () => {
      console.log(
        `[CELULA lp x snp] obtido=${espelho.snp.custo2027} (CL=${espelho.snp.comprasLiquidas2027}, VB=${espelho.snp.notaCheia2027}) | motor=${espelho.snp.motorOrigem} (${espelho.snp.rotuloMotor})`,
      )
      expect(espelho.snp.custo2027).toBe(CHANCELAS.lp.snp.custo)
      expect(espelho.snp.comprasLiquidas2027).toBe(CHANCELAS.lp.snp.cl)
      expect(espelho.snp.notaCheia2027).toBe(42000)
      // Parcela creditável total = nota − CL: ICMS 571,20 + CBS 257,54 + IBS 2,86 = 831,60
      const parcela = Number(
        (espelho.snp.notaCheia2027 - espelho.snp.comprasLiquidas2027).toFixed(2),
      )
      console.log(`[PARCELA CREDITAVEL LPxSNP] obtido=${parcela} | esperado=831.60`)
      expect(parcela).toBe(831.6)
      // Memória de cálculo coerente com o CARD 3º: crédito por unidade 27,72
      const linhaUn = espelho.snp.linhasMemoriaCusto.find((l) => l.label.includes('por unidade'))
      if (linhaUn) {
        console.log(`[CREDITO POR UNIDADE LPxSNP] linha=${linhaUn.label} valor=${linhaUn.valor}`)
        expect(linhaUn.valor).toBeCloseTo(27.72, 2)
      }
    })

    it('LP × SNH: custo unitário 1380.96, CL 41.428,80 e créditos 5.269,23 (régua Adri)', () => {
      console.log(
        `[CELULA lp x snh] obtido=${espelho.snh.custo2027} (CL=${espelho.snh.comprasLiquidas2027}, VB=${espelho.snh.notaCheia2027}) | motor=${espelho.snh.motorOrigem} (${espelho.snh.rotuloMotor})`,
      )
      expect(espelho.snh.custo2027).toBe(CHANCELAS.lp.snh.custo)
      expect(espelho.snh.comprasLiquidas2027).toBe(CHANCELAS.lp.snh.cl)
      expect(espelho.snh.notaCheia2027).toBe(46698.03)
      // Créditos do adquirente LP = nota − CL: CBS 4.656,60 + IBS 41,43 + ICMS art. 23 571,20 = 5.269,23
      const creditos = Number(
        (espelho.snh.notaCheia2027 - espelho.snh.comprasLiquidas2027).toFixed(2),
      )
      console.log(`[CREDITOS LPxSNH] obtido=${creditos} | esperado=5269.23`)
      expect(creditos).toBe(5269.23)
    })
  })

  describe('2. Linha Adquirente Lucro Real (LR)', () => {
    const espelho = obterEspelho('lr')

    it('LR × LP: custo unitário 1106.10 e CL 33.182,94', () => {
      console.log(
        `[CELULA lr x lp] obtido=${espelho.lp.custo2027} (CL=${espelho.lp.comprasLiquidas2027}, VB=${espelho.lp.notaCheia2027}) | motor=${espelho.lp.motorOrigem} (${espelho.lp.rotuloMotor})`,
      )
      expect(espelho.lp.custo2027).toBe(CHANCELAS.lr.lp.custo)
      expect(espelho.lp.comprasLiquidas2027).toBe(CHANCELAS.lr.lp.cl)
    })

    it('LR × LR: custo unitário 1041.81 e CL 31.254,30', () => {
      console.log(
        `[CELULA lr x lr] obtido=${espelho.lr.custo2027} (CL=${espelho.lr.comprasLiquidas2027}, VB=${espelho.lr.notaCheia2027}) | motor=${espelho.lr.motorOrigem} (${espelho.lr.rotuloMotor})`,
      )
      expect(espelho.lr.custo2027).toBe(CHANCELAS.lr.lr.custo)
      expect(espelho.lr.comprasLiquidas2027).toBe(CHANCELAS.lr.lr.cl)
    })

    it('LR × SNP: custo unitário 1335.17 e CL 40.055,19', () => {
      console.log(
        `[CELULA lr x snp] obtido=${espelho.snp.custo2027} (CL=${espelho.snp.comprasLiquidas2027}, VB=${espelho.snp.notaCheia2027}) | motor=${espelho.snp.motorOrigem} (${espelho.snp.rotuloMotor})`,
      )
      expect(espelho.snp.custo2027).toBe(CHANCELAS.lr.snp.custo)
      expect(espelho.snp.comprasLiquidas2027).toBe(CHANCELAS.lr.snp.cl)
    })

    it('LR × SNH: custo unitário 1355.68 e CL 40.670,38', () => {
      console.log(
        `[CELULA lr x snh] obtido=${espelho.snh.custo2027} (CL=${espelho.snh.comprasLiquidas2027}, VB=${espelho.snh.notaCheia2027}) | motor=${espelho.snh.motorOrigem} (${espelho.snh.rotuloMotor})`,
      )
      expect(espelho.snh.custo2027).toBe(CHANCELAS.lr.snh.custo)
      expect(espelho.snh.comprasLiquidas2027).toBe(CHANCELAS.lr.snh.cl)
    })
  })

  describe('3. Linha Adquirente Simples Nacional Puro (SNP)', () => {
    const espelho = obterEspelho('snp')

    it('SNP × LP: custo unitário 1473.54 (VB=CL, sem crédito)', () => {
      console.log(
        `[CELULA snp x lp] obtido=${espelho.lp.custo2027} (CL=${espelho.lp.comprasLiquidas2027}, VB=${espelho.lp.notaCheia2027}) | motor=${espelho.lp.motorOrigem} (${espelho.lp.rotuloMotor})`,
      )
      expect(espelho.lp.custo2027).toBe(CHANCELAS.snp.lp.custo)
      expect(espelho.lp.comprasLiquidas2027).toBe(CHANCELAS.snp.lp.cl)
    })

    it('SNP × LR: custo unitário 1387.89 (VB=CL, sem crédito)', () => {
      console.log(
        `[CELULA snp x lr] obtido=${espelho.lr.custo2027} (CL=${espelho.lr.comprasLiquidas2027}, VB=${espelho.lr.notaCheia2027}) | motor=${espelho.lr.motorOrigem} (${espelho.lr.rotuloMotor})`,
      )
      expect(espelho.lr.custo2027).toBe(CHANCELAS.snp.lr.custo)
      expect(espelho.lr.comprasLiquidas2027).toBe(CHANCELAS.snp.lr.cl)
    })

    it('SNP × SNP: custo unitário 1400.00 (VB=CL, sem crédito)', () => {
      console.log(
        `[CELULA snp x snp] obtido=${espelho.snp.custo2027} (CL=${espelho.snp.comprasLiquidas2027}, VB=${espelho.snp.notaCheia2027}) | motor=${espelho.snp.motorOrigem} (${espelho.snp.rotuloMotor})`,
      )
      expect(espelho.snp.custo2027).toBe(CHANCELAS.snp.snp.custo)
      expect(espelho.snp.comprasLiquidas2027).toBe(CHANCELAS.snp.snp.cl)
    })

    it('SNP × SNH: custo unitário 1525.26 (VB=CL, sem crédito)', () => {
      console.log(
        `[CELULA snp x snh] obtido=${espelho.snh.custo2027} (CL=${espelho.snh.comprasLiquidas2027}, VB=${espelho.snh.notaCheia2027}) | motor=${espelho.snh.motorOrigem} (${espelho.snh.rotuloMotor})`,
      )
      expect(espelho.snh.custo2027).toBe(CHANCELAS.snp.snh.custo)
      expect(espelho.snh.comprasLiquidas2027).toBe(CHANCELAS.snp.snh.cl)
    })
  })

  describe('4. Linha Adquirente Simples Nacional Híbrido (SNH)', () => {
    const espelho = obterEspelho('snh')

    it('SNH × LP: custo unitário 1371.34 e CL 41.140,05', () => {
      console.log(
        `[CELULA snh x lp] obtido=${espelho.lp.custo2027} (CL=${espelho.lp.comprasLiquidas2027}, VB=${espelho.lp.notaCheia2027}) | motor=${espelho.lp.motorOrigem} (${espelho.lp.rotuloMotor})`,
      )
      expect(espelho.lp.custo2027).toBe(CHANCELAS.snh.lp.custo)
      expect(espelho.lp.comprasLiquidas2027).toBe(CHANCELAS.snh.lp.cl)
    })

    it('SNH × LR: custo unitário 1291.63 e CL 38.748,93', () => {
      console.log(
        `[CELULA snh x lr] obtido=${espelho.lr.custo2027} (CL=${espelho.lr.comprasLiquidas2027}, VB=${espelho.lr.notaCheia2027}) | motor=${espelho.lr.motorOrigem} (${espelho.lr.rotuloMotor})`,
      )
      expect(espelho.lr.custo2027).toBe(CHANCELAS.snh.lr.custo)
      expect(espelho.lr.comprasLiquidas2027).toBe(CHANCELAS.snh.lr.cl)
    })

    it('SNH × SNP: custo unitário 1379.49 e CL 41.384,81', () => {
      console.log(
        `[CELULA snh x snp] obtido=${espelho.snp.custo2027} (CL=${espelho.snp.comprasLiquidas2027}, VB=${espelho.snp.notaCheia2027}) | motor=${espelho.snp.motorOrigem} (${espelho.snp.rotuloMotor})`,
      )
      expect(espelho.snp.custo2027).toBe(CHANCELAS.snh.snp.custo)
      expect(espelho.snp.comprasLiquidas2027).toBe(CHANCELAS.snh.snp.cl)
    })

    it('SNH × SNH: custo unitário 1400.00 e CL 42.000,00 exato', () => {
      console.log(
        `[CELULA snh x snh] obtido=${espelho.snh.custo2027} (CL=${espelho.snh.comprasLiquidas2027}, VB=${espelho.snh.notaCheia2027}) | motor=${espelho.snh.motorOrigem} (${espelho.snh.rotuloMotor})`,
      )
      expect(espelho.snh.custo2027).toBe(CHANCELAS.snh.snh.custo)
      expect(espelho.snh.comprasLiquidas2027).toBe(CHANCELAS.snh.snh.cl)
    })
  })

  describe('5. Travas Estruturais Obrigatórias Adicionais', () => {
    it('VB por fornecedor é idêntico em todos os adquirentes (LP 44.206,15 · LR 41.636,82 · SNP 42.000 · SNH 45.757,94)', () => {
      const adquirentes: ClienteRegimeKey[] = ['lp', 'lr', 'snp', 'snh']
      const espelhos = adquirentes.map((a) => ({ regime: a, espelho: obterEspelho(a) }))

      for (const fKey of ['lp', 'lr', 'snp', 'snh'] as const) {
        const esperado = VB_ESPERADO_POR_FORNECEDOR[fKey]
        for (const { regime, espelho } of espelhos) {
          // Régua Adri Rodada 1 (Cliente LP): a nota do híbrido no LP é construída
          // por fora (mercadoria 42.000 + CBS 4.656,60 + IBS 41,43) = 46.698,03
          const esperadoEfetivo = regime === 'lp' && fKey === 'snh' ? 46698.03 : esperado
          const obtido = espelho[fKey].notaCheia2027
          console.log(
            `[VB TRAVA] Fornecedor ${fKey.toUpperCase()} no adquirente ${regime.toUpperCase()}: obtido=${obtido} | esperado=${esperadoEfetivo} (${regime === 'lp' && fKey === 'snh' ? 'régua Adri LP' : 'trava global'})`,
          )
          expect(obtido).toBe(esperadoEfetivo)
        }
      }
    })

    it('Fração creditável do DAS do fornecedor SNP: 831,60 no LP (régua Adri) e 1.944,81 no LR', () => {
      // LP: parcela creditável em campo próprio da nota (art. 23 LC 123 c/c art. 47 §9º II LC 214):
      // Nota VB = 42.000,00; CL = 41.168,40 -> 831,60 = ICMS 571,20 + CBS 257,54 + IBS 2,86
      // LR: cadeia plena — Nota VB = 42.000,00; CL = 40.055,19 -> 1.944,81
      const espelhoLp = obterEspelho('lp')
      const espelhoLr = obterEspelho('lr')

      const creditoLp = Number(
        (espelhoLp.snp.notaCheia2027 - espelhoLp.snp.comprasLiquidas2027).toFixed(2),
      )
      const creditoLr = Number(
        (espelhoLr.snp.notaCheia2027 - espelhoLr.snp.comprasLiquidas2027).toFixed(2),
      )

      console.log(
        `[FRACAO DAS SNP] Crédito LPxSNP=${creditoLp} | Crédito LRxSNP=${creditoLr} | esperados: LP=831.60 · LR=1944.81`,
      )
      expect(creditoLp).toBe(831.6)
      expect(creditoLr).toBe(1944.81)
    })

    it('SNH adquirente tem ICMS 0,00 nas 4 células (híbrido nunca credita ICMS 18%)', () => {
      const espelhoSnh = obterEspelho('snh')
      const keys: FornecedorPosKey[] = ['lp', 'lr', 'snp', 'snh']

      for (const k of keys) {
        const info = espelhoSnh[k]
        // Nas linhas de memória, qualquer crédito de ICMS deve ser 0
        const linhaIcms = info.linhasMemoriaCusto.find(
          (l) =>
            l.label.toLowerCase().includes('icms') &&
            (l.label.includes('(−)') || (l as any).sinal === '(−)'),
        )
        if (linhaIcms) {
          console.log(
            `[ICMS SNH ${k.toUpperCase()}] linha=${linhaIcms.label} valor=${linhaIcms.valor}`,
          )
          expect(Math.abs(linhaIcms.valor)).toBe(0)
        }
      }
    })
  })
})
