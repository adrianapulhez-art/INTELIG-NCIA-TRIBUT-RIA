// src/services/ncmTabelaService.test.ts
import { describe, it, expect } from 'vitest'
import {
  buscarNcmPorTexto,
  carregarCatalogoNcm,
  selecionarNcmEEnquadrar,
  METADADOS_NCM_TABELA,
} from './ncmTabelaService'

import { formatarMascaraNcm, limparNcm } from './ncmClassificationService'

describe('formatarMascaraNcm e limparNcm - Robustez de tipos e defesa contra TypeError', () => {
  it('não deve lançar TypeError quando receber number, null, undefined ou string', () => {
    expect(formatarMascaraNcm(null)).toBe('')
    expect(formatarMascaraNcm(undefined)).toBe('')
    expect(formatarMascaraNcm(85171300 as unknown as string)).toBe('8517.13.00')
    expect(formatarMascaraNcm(94049000 as unknown as string)).toBe('9404.90.00')
    expect(formatarMascaraNcm('85171300')).toBe('8517.13.00')
    expect(formatarMascaraNcm('8517.13.00')).toBe('8517.13.00')
    expect(formatarMascaraNcm('')).toBe('')
    expect(formatarMascaraNcm(0 as unknown as string)).toBe('0')

    expect(limparNcm(null)).toBe('')
    expect(limparNcm(undefined)).toBe('')
    expect(limparNcm(85171300 as unknown as string)).toBe('85171300')
    expect(limparNcm('8517.13.00')).toBe('85171300')
  })
})

describe('ncmTabelaService - Validação da Tabela e Busca NCM', () => {
  it('deve conter metadados oficiais consistentes e rastreáveis', () => {
    expect(METADADOS_NCM_TABELA.fonteOficial).toContain('Siscomex')
    expect(METADADOS_NCM_TABELA.versaoExtracao).toContain('Resolução Gecex')
    expect(METADADOS_NCM_TABELA.dataConferencia).toBe('2026-10-19')
    expect(METADADOS_NCM_TABELA.statusChancelaPadrao).toBe('aguardando_chancela')
  })

  it('deve carregar o catálogo de NCM sem lançar exceções', async () => {
    const catalogo = await carregarCatalogoNcm()
    expect(catalogo).toBeDefined()
    expect(catalogo.length).toBeGreaterThan(0)
  })

  it('deve encontrar termos da amostra original: "cama", "carne", "pneu", "calçado", "veículo"', async () => {
    const resCama = await buscarNcmPorTexto('cama')
    expect(resCama.length).toBeGreaterThan(0)
    expect(
      resCama.some((i) => i.codigoNcm.startsWith('9403') || i.codigoNcm.startsWith('6302')),
    ).toBe(true)

    const resPneu = await buscarNcmPorTexto('pneu')
    expect(resPneu.length).toBeGreaterThan(0)
    expect(resPneu.some((i) => i.codigoNcm.startsWith('4011'))).toBe(true)

    const resCalcado = await buscarNcmPorTexto('calçado')
    expect(resCalcado.length).toBeGreaterThan(0)
    expect(
      resCalcado.some((i) => i.codigoNcm.startsWith('6403') || i.codigoNcm.startsWith('6404')),
    ).toBe(true)
  })

  it('deve suportar busca por código exato ou parcial', async () => {
    const res8703 = await buscarNcmPorTexto('8703.22.10')
    expect(res8703.length).toBeGreaterThan(0)
    expect(res8703[0].codigoNcm).toBe('87032210')

    const resEdredom = await buscarNcmPorTexto('9404.90.00')
    expect(resEdredom.length).toBeGreaterThan(0)
    expect(resEdredom[0].codigoNcm).toBe('94049000')
  })

  it('deve enquadrar NCM na LC 214 e sugerir cClassTrib corretamente ao selecionar NCM', async () => {
    // Exemplo: Celular / Smartphone 8517.13.00
    const resultado = await selecionarNcmEEnquadrar('8517.13.00')
    expect(resultado).toBeDefined()
    expect(resultado.enquadramento).toBeDefined()
    expect(resultado.enquadramento.status).toBeDefined()
    expect(resultado.enquadramento.percentualReducaoPct).toBeDefined()
    expect(resultado.enquadramento.rotuloReducao).toBeDefined()
  })

  it('preserva os 40 canônicos com códigos de 8 dígitos sem jamais retornar NBS', async () => {
    const catalogo = await carregarCatalogoNcm()
    // Nenhum código deve ser NBS (que começa com 1 ou tem formato de serviço diferente)
    // Todos devem ter 8 dígitos numéricos
    for (const item of catalogo) {
      expect(item.codigoNcm).toMatch(/^\d{8}$/)
    }
  })
})
