import { describe, it, expect } from 'vitest'
import { lerEspelhoComprasCard03 } from './leituraCard03Compras'
import {
  montarItensIntegracao,
  derivarCasoUnitario,
  type ItemIntegracaoArt12,
} from './integracaoComprasArt12'
import {
  calcularMarkupPosColuna,
  REFERENCIAS_MARKUP_POS,
  type ClienteRegimeKey,
  type FornecedorPosKey,
  type CustoCard03Resultado,
} from './markupPosCalculations'

/**
 * ============================================================================
 * TESTE DE INTEGRAÇÃO DO CANO — CARD 03 (COMPRAS) → MARKUP PÓS-REFORMA
 * ============================================================================
 *
 * CRITÉRIO DE CHANCELA (acordo com a Adri): os 16 valores-ouro só valem se
 * reproduzidos pelo MESMO CAMINHO DE LEITURA que a MarkupPosPage usa — não
 * apenas pelo motor:
 *
 *   montarItensIntegracao → derivarCasoUnitario → lerEspelhoComprasCard03
 *   → calcularMarkupPosColuna
 *
 * A suíte-irmã card03IntegracaoOuro.test.ts cobre o espelho (motor) sozinho;
 * aqui o espelho é consumido como a página consome: cada resultado de
 * lerEspelhoComprasCard03 alimenta calcularMarkupPosColuna com os parâmetros
 * de referência da página (margem 51,9% · ICMS 18% · CBS 26,5% · IBS 0,1% ·
 * DV zerado · quantidade de referência), e TODO resultado numérico derivado —
 * células do custo, preços, tributos por fora, DAS e suas fatias, lote —
 * é travado contra os ouros chancelados (tolerância de 1 centavo).
 *
 * NÃO lê sessão do usuário nem localStorage: os dados canônicos fixos são
 * montados em memória e INJETADOS no caminho de leitura (item + inputPleno +
 * perfilSN = PERFIL_SN_DESTACADOS_OURO). O leitor resolve a CBS pelo mesmo
 * fallback da página sem sessão gravada (referência 2027 = 9,14%).
 *
 * 16 VALORES-OURO (Custo Unitário 2027; Compras Líquidas CL entre parênteses):
 * - lp×lp 1106.10 (33.182,94) · lp×lr 1041.81 (31.254,30) · lp×snp 1335.17 (40.055,19) · lp×snh 1355.68 (40.670,38)
 * - lr×lp 1106.10 (33.182,94) · lr×lr 1041.81 (31.254,30) · lr×snp 1335.17 (40.055,19) · lr×snh 1355.68 (40.670,38)
 * - snp×lp 1473.54 · snp×lr 1387.89 · snp×snp 1400.00 · snp×snh 1525.26 (VB=CL, sem crédito)
 * - snh×lp 1371.34 (41.140,05) · snh×lr 1291.63 (38.748,93) · snh×snp 1379.49 (41.384,81) · snh×snh 1400.00 (CL 42.000,00 exato)
 * ============================================================================
 */

/** Tolerância consagrada na suíte de ouros: 1 centavo. */
const TOLERANCIA_CENTAVO = 0.01

const ADQUIRENTES: ClienteRegimeKey[] = ['lp', 'lr', 'snp', 'snh']
const FORNECEDORES: FornecedorPosKey[] = ['lp', 'lr', 'snp', 'snh']

/**
 * Dados canônicos fixos que geraram os ouros — EXATAMENTE os mesmos valores da
 * suíte de ouros (REUSE, não reinvenção): RBV 42.000 · frete 0 · 30 un.
 */
const ITENS_ORIGEM_CANONICOS = [
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
] as const

/** 16 ouros: [adquirente][fornecedor] → custo unitário 2027 · compras líquidas. */
const CHANCELAS: Record<
  ClienteRegimeKey,
  Record<FornecedorPosKey, { custo: number; cl: number }>
> = {
  lp: {
    lp: { custo: 1106.1, cl: 33182.94 },
    lr: { custo: 1041.81, cl: 31254.3 },
    snp: { custo: 1335.17, cl: 40055.19 },
    snh: { custo: 1355.68, cl: 40670.38 },
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
}

/** VB (nota fiscal 2027) por fornecedor, idêntico em todos os adquirentes. */
const VB_ESPERADO_POR_FORNECEDOR: Record<FornecedorPosKey, number> = {
  lp: 44206.15,
  lr: 41636.82,
  snp: 42000.0,
  snh: 45757.94,
}

/** Montagem do item da sessão exatamente como MarkupPosPage monta a partir de purchasesItems */
const itensIntegracao = montarItensIntegracao([...ITENS_ORIGEM_CANONICOS])
const caso = derivarCasoUnitario(itensIntegracao)
const itemSessao: ItemIntegracaoArt12 = caso.item!
const inputPleno = caso.input!

/** Leitura via caminho real do MarkupPosPage (mesma injeção da suíte de ouros). */
function obterEspelho(clienteRegime: ClienteRegimeKey) {
  return lerEspelhoComprasCard03(clienteRegime, {
    item: itemSessao,
    inputPleno,
  })
}

/**
 * Consumo do espelho pela página: cada coluna recebe o resultado da leitura
 * do Card 03 e os parâmetros de referência do Markup Pós (DV zerado →
 * fatorDvConsolidado 1, somaDvPct 0; margem do produto inexistente → régua
 * 51,9%; alíquotas sem input do usuário → referências).
 */
function calcularColunaComoAPagina(
  key: FornecedorPosKey,
  clienteRegime: ClienteRegimeKey,
  custoInfo: CustoCard03Resultado,
) {
  return calcularMarkupPosColuna({
    key,
    clienteRegime,
    custoUnitario: custoInfo.custo2027,
    custoHoje: custoInfo.custoHoje,
    deltaCustoPct: custoInfo.deltaPct,
    comprasLiquidasTotal: custoInfo.comprasLiquidas2027,
    notaCompraTotal: custoInfo.notaCheia2027,
    fatorDvConsolidado: 1.0,
    somaDvPct: 0,
    margemLucroEfetiva: REFERENCIAS_MARKUP_POS.MARGEM_PADRAO_PCT,
    icmsRateEfetivo: REFERENCIAS_MARKUP_POS.ICMS_PADRAO_PCT,
    cbsRateEfetivo: REFERENCIAS_MARKUP_POS.CBS_PADRAO_PCT,
    ibsRateEfetivo: REFERENCIAS_MARKUP_POS.IBS_PADRAO_PCT,
    quantidadeVendidaEfetiva: REFERENCIAS_MARKUP_POS.QUANTIDADE_PADRAO,
    simplesAnexo: 'anexo_1',
    simplesRbt12: 180000,
    custoInfo,
  })
}

/** Comparador de centavos: falha apontando célula, esperado chancelado × obtido. */
function exigirIgualdade(celula: string, esperado: number, obtido: number) {
  const diff = Math.abs(obtido - esperado)
  if (diff > TOLERANCIA_CENTAVO) {
    throw new Error(
      `[CANO CARD 03 → MARKUP PÓS] CÉLULA DIVERGENTE: ${celula} — ` +
        `esperado (chancela Adri) ${esperado.toFixed(2)} × obtido (cano da página) ${obtido.toFixed(2)} ` +
        `(diferença ${(obtido - esperado).toFixed(2)})`,
    )
  }
  expect(obtido).toBeCloseTo(esperado, 2)
}

describe('Cano de Integração Card 03 Compras → Markup Pós — 16 Ouros Chancelados (caminho real da página)', () => {
  for (const adquirente of ADQUIRENTES) {
    describe(`Adquirente ${adquirente.toUpperCase()}: leitura + formação de preço pelo caminho da página`, () => {
      const espelho = obterEspelho(adquirente)

      for (const fornecedor of FORNECEDORES) {
        const ouro = CHANCELAS[adquirente][fornecedor]
        const celulaNome = `${adquirente.toUpperCase()} × ${fornecedor.toUpperCase()}`

        it(`${celulaNome}: custo ${ouro.custo.toFixed(2)} e CL ${ouro.cl.toFixed(2)} reproduzidos pelo cano completo`, () => {
          const custoInfo = espelho[fornecedor]

          // 1) Células do custo (leitura do Card 03) — ouros 2027
          exigirIgualdade(`${celulaNome} · custo2027`, ouro.custo, custoInfo.custo2027)
          exigirIgualdade(
            `${celulaNome} · comprasLiquidas2027`,
            ouro.cl,
            custoInfo.comprasLiquidas2027,
          )

          // 2) Consistência do cano: a coluna do Markup recebe o MESMO custo lido
          const coluna = calcularColunaComoAPagina(fornecedor, adquirente, custoInfo)
          exigirIgualdade(
            `${celulaNome} · custoUnitario propagado à coluna`,
            ouro.custo,
            coluna.custoUnitario,
          )
          exigirIgualdade(
            `${celulaNome} · notaCompraTotal propagada`,
            VB_ESPERADO_POR_FORNECEDOR[fornecedor],
            coluna.notaCompraTotal,
          )

          // 3) Travas estruturais da formação de preço (por regime do cliente)
          if (adquirente === 'snp') {
            // SNP: nota = preço, sem CBS/IBS por fora; DAS por dentro com fatias
            expect(coluna.isSimples).toBe(true)
            expect(coluna.isSimplesHibrido).toBe(false)
            expect(coluna.cbsUnitario).toBe(0)
            expect(coluna.ibsUnitario).toBe(0)
            expect(coluna.totalNotaUnitario).toBe(coluna.precoVendaUnitario)
            exigirIgualdade(
              `${celulaNome} · totalNotaLote (preço × quantidade de referência)`,
              Math.round(
                coluna.precoVendaUnitario * REFERENCIAS_MARKUP_POS.QUANTIDADE_PADRAO * 100,
              ) / 100,
              coluna.totalNotaLote,
            )
            // Fatias do DAS: soma das fatias nunca excede o DAS total (por dentro)
            if (coluna.fatiasDas) {
              const somaFatias =
                coluna.fatiasDas.icmsValor +
                coluna.fatiasDas.federaisValor +
                coluna.fatiasDas.cbsValor +
                coluna.fatiasDas.ibsValor
              expect(somaFatias).toBeLessThanOrEqual(coluna.fatiasDas.dasTotal + TOLERANCIA_CENTAVO)
              expect(coluna.fatiasDas.dasTotal).toBeGreaterThan(0)
              // ICMS nunca 18% (≈ 578) — fração do DAS
              expect(coluna.icmsUnitario).toBeLessThan(100)
            }
          }

          if (adquirente === 'snh') {
            // SNH: DAS híbrido por dentro (ICMS fração — nunca 18%) + CBS/IBS por fora
            expect(coluna.isSimples).toBe(true)
            expect(coluna.isSimplesHibrido).toBe(true)
            expect(coluna.cbsUnitario).toBeGreaterThan(0)
            expect(coluna.icmsUnitario).toBeLessThan(100)
            // Base CBS/IBS = preço − ICMS do DAS (art. 12 §2º V)
            exigirIgualdade(
              `${celulaNome} · baseCalculoIbsCbs = preço − ICMS do DAS`,
              Math.round((coluna.precoVendaUnitario - coluna.icmsUnitario) * 100) / 100,
              coluna.baseCalculoIbsCbs,
            )
            // Nota total = preço + CBS + IBS (por fora)
            exigirIgualdade(
              `${celulaNome} · totalNotaUnitario = preço + CBS + IBS`,
              Math.round(
                (coluna.precoVendaUnitario + coluna.cbsUnitario + coluna.ibsUnitario) * 100,
              ) / 100,
              coluna.totalNotaUnitario,
            )
          }

          if (adquirente === 'lp' || adquirente === 'lr') {
            // LP/LR: ICMS transição com BC incluindo CBS/IBS (RC 32303/2025)
            expect(coluna.isSimples).toBe(false)
            expect(coluna.totalNotaUnitario).toBe(coluna.precoVendaUnitario)
            // Preço = (BC + CBS + IBS) ÷ (1 − 18%)
            const valorSemIcmsEsperado =
              Math.round(
                (coluna.baseCalculoIbsCbs + coluna.cbsUnitario + coluna.ibsUnitario) * 100,
              ) / 100
            exigirIgualdade(
              `${celulaNome} · valorSemIcms = BC + CBS + IBS`,
              valorSemIcmsEsperado,
              coluna.valorSemIcms,
            )
            exigirIgualdade(
              `${celulaNome} · icmsUnitario = preço × 18%`,
              Math.round(coluna.precoVendaUnitario * 0.18 * 100) / 100,
              coluna.icmsUnitario,
            )
          }
        })
      }
    })
  }
})
