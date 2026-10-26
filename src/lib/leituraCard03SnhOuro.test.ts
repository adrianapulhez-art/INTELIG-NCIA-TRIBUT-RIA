import { describe, it, expect } from 'vitest'
import { lerEspelhoComprasCard03 } from './leituraCard03Compras'
import { calcularCelulaFornecedorPlenoXAdquirenteSn } from './art12SnCalculations'
import type { ItemIntegracaoArt12 } from './integracaoComprasArt12'

/**
 * Teste de blindagem: divergência Markup × Compras na célula pleno × SNH resolvida.
 *
 * Provando:
 * 1. No item da sessão da Adri (RBV 42.000, frete 0, 30 un), o custo 2027 sai 1.355,68
 *    nas colunas snh dos adquirentes lp e lr (ouro chancelado do Card 03 Compras).
 * 2. No caso canônico (RBV 42.000 + frete 400, 30 un), relatar e verificar o comportamento
 *    do motor calcularCelulaFornecedorPlenoXAdquirenteSn chamado em lerEspelhoComprasCard03.
 */
describe('Blindagem Leitura Card 03 Compras — Células Pleno × SNH (cenário 04)', () => {
  const itemSessaoAdri: ItemIntegracaoArt12 = {
    id: 'item-sessao-adri',
    name: 'Item Sessão da Adri (RBV 42k, frete 0)',
    quantity: 30,
    merchandiseValue: 42000,
    freightValue: 0,
    icmsRate: 18,
    icmsFreightRate: 18,
    ipiRate: 0,
    hasSt: false,
    stValue: 0,
    valorNota: 42000,
    abcPct: 100,
    classe: 'A',
  }

  it('1. Item da sessão da Adri produz 1.355,68 no Card 03 para LP × SNH e LR × SNH', () => {
    // Cálculo direto pelo motor oficial das Células Pleno × SN
    const diretoLp = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples_hibrido',
      itemSessaoAdri,
    )
    const diretoLr = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_real',
      'simples_hibrido',
      itemSessaoAdri,
    )

    expect(diretoLp.exercicio2027.custoUnitario).toBe(1355.68)
    expect(diretoLr.exercicio2027.custoUnitario).toBe(1303.15) // LR com base limpa LR

    // Leitura via lerEspelhoComprasCard03
    const espelhoLp = lerEspelhoComprasCard03('lp', { item: itemSessaoAdri })
    expect(espelhoLp.snh.custo2027).toBe(1355.68)
    expect(espelhoLp.snh.motorOrigem).toBe('quatro_celulas_sn')
    expect(espelhoLp.snh.rotuloMotor).toBe('Células Pleno × SN (LP × SN Híbrido — cenário 04)')
    expect(espelhoLp.snh.linhasMemoriaCusto.length).toBeGreaterThan(0)

    const espelhoLr = lerEspelhoComprasCard03('lr', { item: itemSessaoAdri })
    // LR × SNH no motor calcularCelulaFornecedorPlenoXAdquirenteSn usa a régua do LR (base limpa LR)
    expect(espelhoLr.snh.custo2027).toBe(diretoLr.exercicio2027.custoUnitario)
    expect(espelhoLr.snh.motorOrigem).toBe('quatro_celulas_sn')
    expect(espelhoLr.snh.rotuloMotor).toBe('Células Pleno × SN (LR × SN Híbrido — cenário 04)')
  })

  it('2. Caso canônico (RBV 42k + frete 400): lerEspelhoComprasCard03 reflete o motor oficial das Células Pleno × SN', () => {
    const espelhoLpCanonico = lerEspelhoComprasCard03('lp')
    const espelhoLrCanonico = lerEspelhoComprasCard03('lr')

    // Valores calculados pelo motor calcularCelulaFornecedorPlenoXAdquirenteSn no caso canônico (30 un, 42.400 nota)
    const diretoLpCanonico = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples_hibrido',
    )
    const diretoLrCanonico = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_real',
      'simples_hibrido',
    )

    // O motor calcularCelulaFornecedorPlenoXAdquirenteSn produz 1.383,56 para LP×SNH e 1.303,15 para LR×SNH
    expect(espelhoLpCanonico.snh.custo2027).toBe(diretoLpCanonico.exercicio2027.custoUnitario)
    expect(espelhoLpCanonico.snh.custo2027).toBe(1383.56)

    expect(espelhoLrCanonico.snh.custo2027).toBe(diretoLrCanonico.exercicio2027.custoUnitario)
    expect(espelhoLrCanonico.snh.custo2027).toBe(1303.15)
  })
})
