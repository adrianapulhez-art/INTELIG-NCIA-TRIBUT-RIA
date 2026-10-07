/**
 * Testes unitários do Simulador de Opção PGDAS × Regime Regular (Fase 1)
 *
 * Regras de Governança:
 * - Ouro intocado da casa: cálculos existentes permanecem intactos.
 * - Caso didático secundário de coerência (exercício 2027):
 *   RBT12: 1.800.000,00 (Faixa 5 do Anexo I)
 *   Receita do semestre: 900.000,00
 *   Mix: 65% PJ
 *   Fornecedor: Regime Regular
 *   Compras: 60% (540.000,00)
 *   Avaliação das ordens de grandeza: DAS (~13k) vs Regular (~29k)
 * - Teste com benefício de redução 100% de alíquota em produto (ex: arroz / cesta básica)
 *   onde o custo do Regime Regular cai acentuadamente e inverte o veredito.
 */
import { describe, it, expect } from 'vitest'
import {
  calcularSimuladorOpcao,
  derivarRbt12PorFaixa,
  getAliquotasRegimeRegular,
  type SimuladorOpcaoInput,
} from './simuladorOpcaoCalculations'
import { roundHalfUp } from './art12SnCalculations'

describe('SimuladorOpcaoCalculations — Fase 1 (Núcleo de Cálculo)', () => {
  it('deve derivar corretamente RBT12 por faixa (mínimo, médio, máximo)', () => {
    // Anexo I: Faixa 1 (0 a 180.000)
    expect(derivarRbt12PorFaixa('anexo1', 1, 'minimo')).toBe(60000)
    expect(derivarRbt12PorFaixa('anexo1', 1, 'medio')).toBe(90000)
    expect(derivarRbt12PorFaixa('anexo1', 1, 'maximo')).toBe(180000)

    // Faixa 5: 1.800.000 a 3.600.000
    expect(derivarRbt12PorFaixa('anexo1', 5, 'minimo')).toBe(1800000.01)
    expect(derivarRbt12PorFaixa('anexo1', 5, 'medio')).toBe(2700000)
    expect(derivarRbt12PorFaixa('anexo1', 5, 'maximo')).toBe(3600000)
  })

  it('deve retornar alíquotas-teste da fase experimental para 2027 rotuladas como PENDENTE_CONFIRMACAO', () => {
    const aliq2027 = getAliquotasRegimeRegular(2027)
    expect(aliq2027.cbsPct).toBe(9.18)
    expect(aliq2027.ibsPct).toBe(0.1)
    expect(aliq2027.statusLegal).toBe('PENDENTE_CONFIRMACAO')
    expect(aliq2027.rotulo).toContain('Alíquotas-teste')
  })

  it('deve calcular caso didático de coerência 2027 (RBT12 1.800.000, semestre 900.000, compras 60% regular)', () => {
    const input: SimuladorOpcaoInput = {
      nomeSimulacao: 'Caso Didático Coerência 2027',
      exercicio: 2027,
      segmento: 'comercio',
      anexoId: 'anexo1',
      uf: 'SP',
      faixaNumero: 4, // 720k a 1.800k (teto 1.800.000)
      rbt12: 1800000,
      perfilCanal: 'MISTO',
      percentualPj: 65,
      regimeFornecedores: 'REGULAR',
      percentualComprasSobreFaturamento: 60,
      receitaSemestre: 900000,
      desejaInformarNcm: false,
    }

    const resultado = calcularSimuladorOpcao(input)

    // Alíquota efetiva do DAS para Anexo I Faixa 4 no teto de 1.800.000:
    // (1.800.000 * 10,7% - 22.500) / 1.800.000 = (192.600 - 22.500) / 1.800.000 = 170.100 / 1.800.000 = 9,45%
    expect(resultado.aliquotaEfetivaDasPct).toBe(9.45)

    // DAS devido total no semestre: 900.000 * 9,45% = 85.050,00
    expect(resultado.opcaoDas.dasTotalDevido).toBe(85050)

    // Partilha Faixa 4 Anexo I:
    // CBS (15,33%) + IBS (0,17%) = 15,50%
    // IBS/CBS contido no DAS: 85.050 * 15,50% = 13.182,75 (próximo ao didático 13.182,78 com arredondamentos de decimais)
    expect(resultado.opcaoDas.custoLiquidoIbsCbs).toBeCloseTo(13182.75, 1)

    // Regime Regular:
    // Receita: 900.000
    // Débito Bruto: 900.000 * 9,28% (CBS 9,18% + IBS 0,10%) = 83.520,00
    // Compras: 900.000 * 60% = 540.000
    // Créditos sobre compras de fornecedor Regular: 540.000 * 9,28% = 50.112,00
    // Custo líquido Regular base: 83.520 - 50.112 = 33.408,00
    // Caso adquirentes B2B/B2C ou mix: nosso motor calcula o saldo devedor puro rigoroso da apuração
    expect(resultado.opcaoRegular.debitoTotal).toBe(83520)
    expect(resultado.opcaoRegular.creditoTotal).toBe(50112)
    expect(resultado.opcaoRegular.custoLiquidoIbsCbs).toBe(33408)

    // Veredito: DAS é mais vantajoso aqui (13.182,75 < 33.408,00)
    expect(resultado.opcaoVencedora).toBe('DAS')
    expect(resultado.seloMelhorOpcao).toContain('SIMPLES NACIONAL')
    expect(resultado.opcaoDas.memoriaPassos.length).toBeGreaterThanOrEqual(4)
    expect(resultado.opcaoRegular.memoriaPassos.length).toBeGreaterThanOrEqual(4)
  })

  it('deve inverter o veredito para REGIME REGULAR quando houver benefício de alíquota zero / redução de 100% no produto', () => {
    // Cenário onde o produto tem 100% de redução na CBS e no IBS (ex: cesta básica nacional / arroz)
    const inputComBeneficio: SimuladorOpcaoInput = {
      nomeSimulacao: 'Cenário Produto Beneficiado (Arroz / Alíquota Zero)',
      exercicio: 2027,
      segmento: 'comercio',
      anexoId: 'anexo1',
      uf: 'SP',
      faixaNumero: 4,
      rbt12: 1800000,
      perfilCanal: 'B2B',
      percentualPj: 100,
      regimeFornecedores: 'REGULAR',
      percentualComprasSobreFaturamento: 60,
      receitaSemestre: 900000,
      desejaInformarNcm: true,
      itensNcm: [
        {
          id: 'item-arroz',
          ncm: '1006.30.21',
          descricao: 'Arroz beneficiado / Cesta Básica Nacional',
          cClassTrib: '100001',
          percentualReceita: 100,
          valorReceita: 900000,
          reducaoCbsPct: 100, // Alíquota zero
          reducaoIbsPct: 100, // Alíquota zero
          baseLegal: 'LC 214/2025, Art. 128 / Cesta Básica Nacional',
        },
      ],
    }

    const resultado = calcularSimuladorOpcao(inputComBeneficio)

    // No DAS, a guia PGDAS continua cobrando a alíquota cheia do anexo (sem redução proporcional direta sem segregação específica)
    expect(resultado.opcaoDas.custoLiquidoIbsCbs).toBeCloseTo(13182.75, 1)

    // No Regime Regular:
    // Débito Bruto: 0 (porque a redução é 100%)
    // Créditos de compras: 540.000 * 9,28% = 50.112,00
    // Custo líquido: R$ 0,00 (apuração com crédito acumulado)
    expect(resultado.opcaoRegular.debitoTotal).toBe(0)
    expect(resultado.opcaoRegular.custoLiquidoIbsCbs).toBe(0)

    // Veredito inverte para REGULAR
    expect(resultado.opcaoVencedora).toBe('REGULAR')
    expect(resultado.seloMelhorOpcao).toContain('REGIME REGULAR')
  })

  it('deve aplicar crédito proporcional quando o fornecedor for Simples Nacional (LC 123 art. 23 + LC 214 art. 47 §9º II)', () => {
    const input: SimuladorOpcaoInput = {
      nomeSimulacao: 'Fornecedor Simples Nacional',
      exercicio: 2027,
      segmento: 'comercio',
      anexoId: 'anexo1',
      uf: 'MG',
      faixaNumero: 1,
      rbt12: 180000,
      perfilCanal: 'B2B',
      percentualPj: 100,
      regimeFornecedores: 'SIMPLES_NACIONAL',
      percentualComprasSobreFaturamento: 50,
      receitaSemestre: 100000,
      desejaInformarNcm: false,
    }

    const resultado = calcularSimuladorOpcao(input)
    // Compras = 50.000
    // Fornecedor SN não transfere 9,28% cheio, transfere apenas a fração do anexo (CBS 0,6132% + IBS 0,0068% = 0,62%)
    // Crédito total = 50.000 * 0,62% = 310,00
    expect(resultado.opcaoRegular.creditoTotal).toBeCloseTo(310.0, 1)
    // Garante que a memória de cálculo explica a limitação legal da LC 123 art. 23
    const passoCredito = resultado.opcaoRegular.memoriaPassos.find((p) =>
      p.etiqueta.includes('Crédito sobre Compras'),
    )
    expect(passoCredito?.detalhe).toContain('LC 123 art. 23')
  })
})
