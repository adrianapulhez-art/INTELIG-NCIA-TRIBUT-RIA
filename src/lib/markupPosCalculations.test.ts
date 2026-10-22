import { describe, it, expect } from 'vitest'
import { roundHalfUp } from './art12SnCalculations'
import {
  calcularMarkupPosColuna,
  CLIENTES_REGIME_META,
  FORNECEDORES_META,
  carregarEstadoMarkupPos,
  salvarEstadoMarkupPos,
  STORAGE_KEY_MARKUP_POS,
  type ClienteRegimeKey,
} from './markupPosCalculations'
import { lerEspelhoComprasCard03 } from './leituraCard03Compras'

describe('Blindagem da Calculadora de Markup Pós EC 132 (2027+) — Reestruturação por Regime do Cliente', () => {
  // =========================================================================
  // 1. BLINDAGEM DOS OUROS DO CARD 03 DA COMPRAS PARA CADA REGIME DE CLIENTE
  // =========================================================================
  describe('Leitura ao vivo do Card 03 da Compras (Fonte Única do Custo)', () => {
    it('Cliente LP: lê custos chancelados LP 1.116,63 · LR 1.051,73 · SNP 1.394,11 · SNH 1.413,33', () => {
      const espelhoLp = lerEspelhoComprasCard03('lp')

      // Ouros chancelados
      expect(espelhoLp.lp.custo2027).toBe(1116.63)
      expect(espelhoLp.lp.custoHoje).toBe(1051.73)
      expect(espelhoLp.lp.deltaPct).toBe(6.17)
      expect(espelhoLp.lp.motorOrigem).toBe('art12_pleno')

      expect(espelhoLp.lr.custo2027).toBe(1051.73)
      expect(espelhoLp.lr.motorOrigem).toBe('art12_pleno')

      // Compra de SN puro: motor Sessão SN com adquirente presumido (crédito restrito art. 23 LC 123)
      expect(espelhoLp.snp.custo2027).toBe(1394.11)
      expect(espelhoLp.snp.motorOrigem).toBe('sessao_sn')

      // Compra de SN híbrido: matriz Art. 12 (crédito financeiro lava CBS/IBS)
      expect(espelhoLp.snh.custo2027).toBe(1413.33)
      expect(espelhoLp.snh.motorOrigem).toBe('art12_pleno')
    })

    it('Cliente LR: lê custos chancelados LP 1.116,63 · LR 1.051,73 (Régua A neutra Δ 0,00%) · SNP 1.265,16 · SNH 1.413,33', () => {
      const espelhoLr = lerEspelhoComprasCard03('lr')

      expect(espelhoLr.lp.custo2027).toBe(1116.63)

      // Célula LR×LR Neutra da Régua A chancelada pela Adri
      expect(espelhoLr.lr.custo2027).toBe(1051.73)
      expect(espelhoLr.lr.custoHoje).toBe(1051.73)
      expect(espelhoLr.lr.deltaPct).toBe(0)

      // Compra de SN puro pelo LR: baseline HOJE credita PIS/COFINS (1.265,16)
      expect(espelhoLr.snp.custo2027).toBe(1394.11)
      expect(espelhoLr.snp.custoHoje).toBe(1265.16)
      expect(espelhoLr.snp.motorOrigem).toBe('sessao_sn')

      expect(espelhoLr.snh.custo2027).toBe(1413.33)
    })

    it('Cliente SNP (Simples Puro): lê custos chancelados 4 Células LP×SNP 1.482,94 · LR×SNP 1.482,94 · SNP×SNP 1.413,33 · SNH×SNP 1.516,48', () => {
      const espelhoSnp = lerEspelhoComprasCard03('snp')

      // 4 Células: optante puro tem ZERO créditos (art. 13 §1º LC 123) -> Custo é a nota cheia 1.482,94
      expect(espelhoSnp.lp.custo2027).toBe(1482.94)
      expect(espelhoSnp.lp.motorOrigem).toBe('quatro_celulas_sn')

      expect(espelhoSnp.lr.custo2027).toBe(1482.94)
      expect(espelhoSnp.lr.motorOrigem).toBe('quatro_celulas_sn')

      // Sessão SN puro × puro (zero crédito)
      expect(espelhoSnp.snp.custo2027).toBe(1413.33)
      expect(espelhoSnp.snp.motorOrigem).toBe('sessao_sn')

      // Compra de SN híbrido: destaque vira custo integral (1.516,48)
      expect(espelhoSnp.snh.custo2027).toBe(1516.48)
    })

    it('Cliente SNH (Simples Híbrido): lê custos chancelados 4 Células LP×SNH 1.383,56 · LR×SNH 1.383,56 · SNP×SNH 1.413,33 · SNH×SNH 1.413,33', () => {
      const espelhoSnh = lerEspelhoComprasCard03('snh')

      // 4 Células: credita CBS/IBS (art. 41 LC 214) e NUNCA ICMS 18% -> 1.383,56
      expect(espelhoSnh.lp.custo2027).toBe(1383.56)
      expect(espelhoSnh.lp.motorOrigem).toBe('quatro_celulas_sn')

      expect(espelhoSnh.lr.custo2027).toBe(1383.56)
      expect(espelhoSnh.lr.motorOrigem).toBe('quatro_celulas_sn')

      // Compras de SNP e SNH no regime regular de CBS/IBS
      expect(espelhoSnh.snp.custo2027).toBe(1413.33)
      expect(espelhoSnh.snh.custo2027).toBe(1413.33)
    })
  })

  // =========================================================================
  // 2. BLINDAGEM DA FORMAÇÃO DO PREÇO POR REGIME DO CLIENTE DO CONTADOR
  // =========================================================================
  describe('Formação do Preço nas Regras Markup por Regime do Cliente', () => {
    it('Cliente LP / LR: segue composição legal com ICMS transição (art. 12 §2º V + Sefaz-SP RC 32303/2025)', () => {
      const res = calcularMarkupPosColuna({
        key: 'lp',
        clienteRegime: 'lp',
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

      expect(res.isSimples).toBe(false)
      expect(res.isSimplesHibrido).toBe(false)
      expect(res.clienteRegime).toBe('lp')

      // Divisor sem ICMS = 1 - 0.519 = 0.481
      expect(res.divisorSemIcms).toBe(0.481)
      // BC IBS/CBS = 1116.63 / 0.481 = 2321.48 (limpa de ICMS!)
      expect(res.baseCalculoIbsCbs).toBe(2321.48)
      // CBS 26,5% por fora = 615.19
      expect(res.cbsUnitario).toBe(615.19)
      // IBS 0,1% por fora = 2.32
      expect(res.ibsUnitario).toBe(2.32)
      // Valor sem ICMS = 2321.48 + 615.19 + 2.32 = 2938.99
      expect(res.valorSemIcms).toBe(2938.99)
      // ICMS por último com base incluindo CBS/IBS (Sefaz-SP RC 32303/2025):
      // Preço / Nota = 2938.99 / 0.82 = 3584.13
      expect(res.precoVendaUnitario).toBe(3584.13)
      expect(res.totalNotaUnitario).toBe(3584.13)
      expect(res.icmsUnitario).toBe(roundHalfUp(3584.13 * 0.18, 2))
    })

    it('Cliente SNP: segue sistemática do Simples Nacional Puro — DAS por dentro, NUNCA ICMS 18%', () => {
      const res = calcularMarkupPosColuna({
        key: 'lp',
        clienteRegime: 'snp',
        custoUnitario: 1482.94, // Custo do Card 03 para cliente SNP comprando de LP
        custoHoje: 1413.33,
        deltaCustoPct: 4.92,
        comprasLiquidasTotal: 44488.27,
        notaCompraTotal: 44488.27,
        fatorDvConsolidado: 1.0,
        somaDvPct: 0,
        margemLucroEfetiva: 51.9,
        icmsRateEfetivo: 18.0, // NÃO deve ser usado!
        cbsRateEfetivo: 26.5,
        ibsRateEfetivo: 0.1,
        quantidadeVendidaEfetiva: 24,
        simplesAnexo: 'anexo_1',
        simplesRbt12: 180000,
      })

      expect(res.isSimples).toBe(true)
      expect(res.isSimplesHibrido).toBe(false)
      expect(res.clienteRegime).toBe('snp')

      // Divisor SNP = 0,481 * 0,96 = 0,46176
      expect(res.divisorPrincipal).toBeCloseTo(0.46176, 5)
      // Preço = 1.482,94 / 0,46176 = 3.211,50
      expect(res.precoVendaUnitario).toBe(3211.5)
      expect(res.totalNotaUnitario).toBe(3211.5)

      // DAS total 4% de 3.211,50 = 128,46
      expect(res.fatiasDas?.dasTotal).toBe(128.46)
      // ICMS dentro do DAS = 34% de 128,46 = 43,68 (NUNCA 18% = ~578 reais!)
      expect(res.icmsUnitario).toBe(43.68)
      expect(res.icmsUnitario).toBeLessThan(100)
      // Sem CBS/IBS por fora no Simples Puro
      expect(res.cbsUnitario).toBe(0)
      expect(res.ibsUnitario).toBe(0)
    })

    it('Cliente SNH: segue sistemática do Simples Nacional Híbrido — DAS híbrido 3,38% por dentro + CBS/IBS por fora', () => {
      const res = calcularMarkupPosColuna({
        key: 'lp',
        clienteRegime: 'snh',
        custoUnitario: 1383.56, // Custo do Card 03 para cliente SNH comprando de LP
        custoHoje: 1413.33,
        deltaCustoPct: -2.11,
        comprasLiquidasTotal: 41506.86,
        notaCompraTotal: 44488.27,
        fatorDvConsolidado: 1.0,
        somaDvPct: 0,
        margemLucroEfetiva: 51.9,
        icmsRateEfetivo: 18.0,
        cbsRateEfetivo: 26.5,
        ibsRateEfetivo: 0.1,
        quantidadeVendidaEfetiva: 24,
        simplesAnexo: 'anexo_1',
        simplesRbt12: 180000,
      })

      expect(res.isSimples).toBe(true)
      expect(res.isSimplesHibrido).toBe(true)
      expect(res.clienteRegime).toBe('snh')

      // Divisor SNH = 0,481 * (1 - 0,0338) = 0,4647422
      expect(res.divisorPrincipal).toBeCloseTo(0.4647422, 5)
      // Preço P = 1.383,56 / 0,4647422 = 2.977,05
      expect(res.precoVendaUnitario).toBe(2977.05)
      // ICMS da fração do DAS = 2.977,05 * 1,36% = 40,49
      expect(res.icmsUnitario).toBe(40.49)
      // Base CBS/IBS sem ICMS = 2.977,05 - 40,49 = 2.936,56
      expect(res.baseCalculoIbsCbs).toBe(2936.56)
      // CBS 26,5% por fora = 778,19
      expect(res.cbsUnitario).toBe(778.19)
      // IBS 0,1% por fora = 2,94
      expect(res.ibsUnitario).toBe(2.94)
      // Nota total = 2.977,05 + 778,19 + 2,94 = 3.758,18
      expect(res.totalNotaUnitario).toBe(3758.18)
    })
  })

  // =========================================================================
  // 3. BLINDAGEM DA MATRIZ COMPLETA DE 16 COMBINAÇÕES (4 CLIENTES × 4 FORNECEDORES)
  // =========================================================================
  describe('Matriz 16 Combinações (4 Clientes × 4 Fornecedores)', () => {
    const clientes: ClienteRegimeKey[] = ['lp', 'lr', 'snp', 'snh']
    const fornecedores = ['lp', 'lr', 'snp', 'snh'] as const

    for (const cliente of clientes) {
      it(`Cliente ${cliente.toUpperCase()}: calcula todas as 4 combinações de fornecedor com custos válidos e preço derivado`, () => {
        const espelho = lerEspelhoComprasCard03(cliente)

        for (const forn of fornecedores) {
          const custo = espelho[forn]
          expect(custo.custo2027).toBeGreaterThan(0)
          expect(custo.comprasLiquidas2027).toBeGreaterThan(0)
          expect(custo.rotuloMotor).toBeDefined()

          const res = calcularMarkupPosColuna({
            key: forn,
            clienteRegime: cliente,
            custoUnitario: custo.custo2027,
            custoHoje: custo.custoHoje,
            deltaCustoPct: custo.deltaPct,
            comprasLiquidasTotal: custo.comprasLiquidas2027,
            notaCompraTotal: custo.notaCheia2027,
            fatorDvConsolidado: 1.0,
            somaDvPct: 0,
            margemLucroEfetiva: 51.9,
            icmsRateEfetivo: 18.0,
            cbsRateEfetivo: 26.5,
            ibsRateEfetivo: 0.1,
            quantidadeVendidaEfetiva: 24,
            simplesAnexo: 'anexo_1',
            simplesRbt12: 180000,
            custoInfo: custo,
          })

          expect(res.precoVendaUnitario).toBeGreaterThan(custo.custo2027)
          expect(res.totalNotaUnitario).toBeGreaterThanOrEqual(res.precoVendaUnitario)
          expect(res.totalNotaLote).toBe(roundHalfUp(res.totalNotaUnitario * 24, 2))
          expect(res.lucroUnitarioRealizado).toBeGreaterThan(0)
        }
      })
    }
  })

  // =========================================================================
  // 4. PERSISTÊNCIA: "UM SALVAMENTO, UMA PÁGINA" (CHAVE it_markup_pos_state_v1)
  // =========================================================================
  describe('Persistência e Metadados', () => {
    it('Persiste e carrega o clienteRegimeSelecionado na chave oficial', () => {
      // Mock do localStorage em ambiente de teste
      const mockStorage: Record<string, string> = {}
      const originalLocal = globalThis.localStorage

      // @ts-expect-error test mock
      globalThis.localStorage = {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v
        },
        removeItem: (k: string) => {
          delete mockStorage[k]
        },
      }

      salvarEstadoMarkupPos({
        clienteRegimeSelecionado: 'snp',
        fornecedorSelecionado: 'lr',
        icmsRateInput: 18,
        margemLucroInput: 45,
      })

      expect(mockStorage[STORAGE_KEY_MARKUP_POS]).toBeDefined()
      const estado = carregarEstadoMarkupPos()
      expect(estado?.clienteRegimeSelecionado).toBe('snp')
      expect(estado?.fornecedorSelecionado).toBe('lr')
      expect(estado?.margemLucroInput).toBe(45)

      globalThis.localStorage = originalLocal
    })

    it('CLIENTES_REGIME_META e FORNECEDORES_META contêm os 4 regimes com fundamentos', () => {
      expect(Object.keys(CLIENTES_REGIME_META)).toEqual(['lp', 'lr', 'snp', 'snh'])
      expect(Object.keys(FORNECEDORES_META)).toEqual(['lp', 'lr', 'snp', 'snh'])
      expect(CLIENTES_REGIME_META.lp.fundamento).toContain('LC 214/2025')
      expect(CLIENTES_REGIME_META.snh.fundamento).toContain('art. 41')
    })
  })
})
