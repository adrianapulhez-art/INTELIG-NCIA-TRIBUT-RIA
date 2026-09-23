/**
 * ============================================================================
 * BLINDAGEM — CMV POR EXERCÍCIO ART. 12 (LC 214/2025) — v2 (23/09/2026)
 * ============================================================================
 * Ouros derivados em Python independente e aguardando CHANCELA da CEO.
 * v2: PIS/COFINS sobre base sem ICMS (tese do século) + 2 blocos + leitura
 * da base do ICMS (fiscos × plp16). Escada Nenhum preservada (1.158,93 → 1.260,69).
 * ============================================================================
 */
import { describe, expect, it } from 'vitest'
import {
  CASO_CANONICO_ART12,
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  computeCellArt12,
  escadaArt12,
  matrizArt12,
  reguasArt12,
  r2,
} from './art12Calculations'

const fmt = (v: number): string => v.toFixed(2)

describe('CMV Art. 12 v2 — invariante central (base limpa = preço líquido do fornecedor)', () => {
  it('cadeia plena integral: custo = base limpa do fornecedor — FLAT 1.116,63 (−3,65%) em 2027–2032', () => {
    const cfg = { ...CONFIG_PADRAO_ART12 }
    for (const row of CRONOGRAMA_ART12.filter((r) => r.habilitado && r.exercicio >= 2027)) {
      const cell = computeCellArt12(CASO_CANONICO_ART12, cfg, row)
      expect(fmt(cell.exercicio.unitario)).toBe('1116.63')
      expect(fmt(cell.deltaPct)).toBe('-3.65')
      expect(fmt(cell.exercicio.liquido)).toBe('33498.97')
    }
  })

  it('2026: custo idêntico ao HOJE (tributos vivos + CBS/IBS-teste compensáveis)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2026)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    expect(fmt(cell.exercicio.bruto)).toBe('42400.00')
    expect(fmt(cell.exercicio.unitario)).toBe('1158.93')
    expect(fmt(cell.deltaPct)).toBe('0.00')
  })

  it('HOJE intacto: régua canônica R$ 1.158,93/un', () => {
    const cell = computeCellArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12 },
      CRONOGRAMA_ART12[1],
    )
    expect(fmt(cell.hoje.unitario)).toBe('1158.93')
    expect(fmt(cell.hoje.bruto)).toBe('42400.00')
    expect(fmt(cell.hoje.creditos)).toBe('7632.00')
  })

  it('tese do século: PIS/COFINS embutidos sobre a base SEM ICMS (34.768 × 3,65% = 1.269,03)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const pis = cell.exercicio.lines.find((l) => l.key === 'piscofinshoje')!
    expect(fmt(-pis.value)).toBe('1269.03')
    expect(pis.fundamento.nota).toContain('1.188.403')
  })

  it('preço do fornecedor recomposto (leitura Fisco): (33.498,97 + 2.981,41) ÷ 0,82 = 44.488,27', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const preco = cell.exercicio.lines.find((l) => l.key === 'precofornecedor')!
    expect(fmt(preco.value)).toBe('44488.27')
    expect(preco.formula).toContain('0,180000')
  })

  it('2033: pendente de definição — sem cálculo, marcador na UI', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2033)!
    expect(row.habilitado).toBe(false)
    expect(row.pendente).toContain('Pendente de definição')
    expect(row.pendente).toContain('31/12/2032')
  })
})

describe('CMV Art. 12 v2 — réguas de repasse', () => {
  it('ouro 2027 LP×LP: integral 1.116,63 (−3,65%) · parcial 1.137,78 (−1,82%) · nenhum 1.158,93 (0,00%)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const rs = reguasArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const byMode = Object.fromEntries(rs.map((r) => [r.mode, r.cell]))
    expect(fmt(byMode.integral.exercicio.unitario)).toBe('1116.63')
    expect(fmt(byMode.integral.deltaPct)).toBe('-3.65')
    expect(fmt(byMode.parcial.exercicio.unitario)).toBe('1137.78')
    expect(fmt(byMode.parcial.deltaPct)).toBe('-1.82')
    expect(fmt(byMode.nenhum.exercicio.unitario)).toBe('1158.93')
    expect(fmt(byMode.nenhum.deltaPct)).toBe('0.00')
  })

  it('escada régua NENHUM preservada: 1.158,93 → 1.260,69 (2027→2032), degrau +25,44/un a partir de 2029', () => {
    const esc = escadaArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 })
    const by = Object.fromEntries(esc.map((e) => [e.exercicio, e]))
    expect(fmt(by[2027].unitario)).toBe('1158.93')
    expect(fmt(by[2029].unitario)).toBe('1184.37')
    expect(fmt(by[2030].unitario)).toBe('1209.81')
    expect(fmt(by[2031].unitario)).toBe('1235.25')
    expect(fmt(by[2032].unitario)).toBe('1260.69')
    expect(fmt(by[2032].deltaPct)).toBe('8.78')
    for (let i = 1; i < esc.length; i++) {
      if (esc[i].exercicio <= 2028) continue // degrau começa em 2029 (ICMS integral até 2028)
      expect(fmt(r2(esc[i].unitario - esc[i - 1].unitario))).toBe('25.44')
    }
  })
})

describe('CMV Art. 12 v2 — matriz 3×3 (2027) nas duas leituras', () => {
  const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!

  it('leitura do FISCO (padrão): LP×LP 1.116,63 · LR×LR 1.051,73 neutro · SN×LP 1.482,94 · SN×SN 1.413,33', () => {
    const matriz = matrizArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const get = (c: string, f: string) => {
      const linha = matriz.find((l) => l.comprador === c)!
      return linha.cells.find((x) => x.fornecedor === f)!.cell
    }
    expect(fmt(get('presumido', 'presumido').exercicio.unitario)).toBe('1116.63')
    expect(fmt(get('real', 'real').exercicio.unitario)).toBe('1051.73')
    expect(fmt(get('real', 'real').deltaPct)).toBe('0.00') // LR×LR neutro
    expect(fmt(get('presumido', 'real').exercicio.unitario)).toBe('1051.73') // crédito lava
    expect(fmt(get('simples', 'presumido').exercicio.unitario)).toBe('1482.94')
    expect(fmt(get('simples', 'simples').exercicio.unitario)).toBe('1413.33')
    expect(fmt(get('presumido', 'simples').exercicio.unitario)).toBe('1413.33') // fornecedor SN congelado
  })

  it('leitura do CONTRIBUINTE (PLP 16/25): cadeia plena IGUAL; comprador SN muda (1.461,13)', () => {
    const matriz = matrizArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12, baseIcmsLeitura: 'plp16' },
      row,
    )
    const get = (c: string, f: string) => {
      const linha = matriz.find((l) => l.comprador === c)!
      return linha.cells.find((x) => x.fornecedor === f)!.cell
    }
    expect(fmt(get('presumido', 'presumido').exercicio.unitario)).toBe('1116.63') // igual
    expect(fmt(get('real', 'real').exercicio.unitario)).toBe('1051.73') // igual
    expect(fmt(get('simples', 'presumido').exercicio.unitario)).toBe('1461.13') // muda
    expect(fmt(get('simples', 'presumido').deltaPct)).toBe('3.38')
  })

  it('menor custo da matriz = fornecedor LR (1.051,73)', () => {
    const matriz = matrizArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const all = matriz.flatMap((l) => l.cells.map((c) => c.cell.exercicio.unitario))
    expect(fmt(Math.min(...all))).toBe('1051.73')
  })
})

describe('CMV Art. 12 v2 — indústria e ZFM (IPI §2º, II)', () => {
  it('fornecedor indústria 2027: IPI zerado — linha de nota', () => {
    const cfg = { ...CONFIG_PADRAO_ART12, fornecedorPerfil: 'industria' as const }
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, cfg, row)
    const ipi = cell.exercicio.lines.find((l) => l.key === 'ipi')
    expect(ipi?.fundamento.dispositivo).toContain('153')
    expect(ipi?.value).toBe(0)
  })

  it('ZFM mantém IPI (ADCT art. 92-B) — crédito só ao comprador industrial', () => {
    const cfgF = { ...CONFIG_PADRAO_ART12, fornecedorPerfil: 'industria' as const, zfm: true }
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const revendedor = computeCellArt12(CASO_CANONICO_ART12, cfgF, row)
    const ipiRev = revendedor.exercicio.lines.find((l) => l.key === 'ipi')
    expect(ipiRev?.fundamento.dispositivo).toContain('92-B')
    expect(ipiRev!.value).toBeGreaterThan(0)
    const cfgI = { ...cfgF, compradorPerfil: 'industria' as const }
    const industrial = computeCellArt12(CASO_CANONICO_ART12, cfgI, row)
    const credIpi = industrial.exercicio.lines.find((l) => l.key === 'creditoipi')
    expect(credIpi!.value).toBeLessThan(0)
  })
})

describe('CMV Art. 12 v2 — camada de auditoria (passos recalculados = exibidos)', () => {
  const parseBR = (s: string): number => {
    const principal = s.includes('(') ? s.slice(0, s.indexOf('(')) : s
    return Number(principal.replace(/[R$\s.]/g, '').replace(',', '.'))
  }

  it('Ato 1 (preço do fornecedor): passos reproduzem 33.498,97 → 44.488,27 ao centavo', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const preco = cell.exercicio.lines.find((l) => l.key === 'precofornecedor')!
    const passos = preco.passos!
    expect(parseBR(passos[2].resultado)).toBe(33498.97) // base limpa
    expect(parseBR(passos[5].resultado)).toBe(44488.27) // desembute
    expect(parseBR(passos[passos.length - 1].resultado)).toBe(preco.value)
  })

  it('Ato 2 (compras líquidas): bruto − créditos = 33.498,97 → 1.116,63/un', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const compras = cell.exercicio.lines.find((l) => l.key === 'comprasliquidas')!
    const passos = compras.passos!
    expect(parseBR(passos[0].resultado)).toBe(44488.27)
    expect(parseBR(passos[1].resultado)).toBe(10989.3) // ICMS 8.007,89 + CBS/IBS 2.981,41
    expect(parseBR(passos[2].resultado)).toBe(33498.97)
    expect(parseBR(passos[3].resultado)).toBe(1116.63)
    expect(parseBR(passos[3].resultado)).toBe(cell.exercicio.unitario)
  })

  it('pendência marcada na linha "Valor da operação" (validade pendente)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const valorop = cell.exercicio.lines.find((l) => l.key === 'valorop')!
    expect(valorop.fundamento.validade).toBe('pendente')
    expect(valorop.fundamento.nota).toContain('duas leituras')
  })

  it('2 blocos: linhas marcadas fornecedor × comprador, subtotais presentes', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const forn = cell.exercicio.lines.filter((l) => l.bloco === 'fornecedor')
    const comp = cell.exercicio.lines.filter((l) => l.bloco === 'comprador')
    expect(forn.length).toBeGreaterThan(3)
    expect(comp.length).toBeGreaterThan(2)
    expect(forn.some((l) => l.key === 'precofornecedor' && l.kind === 'subtotal')).toBe(true)
    expect(comp.some((l) => l.key === 'comprasliquidas' && l.kind === 'subtotal')).toBe(true)
  })
})

describe('CMV Art. 12 v2 — semáforo e porquê', () => {
  it('semáforo reflete o lado do comprador (−3,65% = verde; SN = vermelho)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const pleno = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    expect(pleno.semaforo).toBe('verde')
    expect(pleno.porque).toContain('art. 47')
    const cfgSN = { ...CONFIG_PADRAO_ART12, compradorRegime: 'simples' as const }
    const sn = computeCellArt12(CASO_CANONICO_ART12, cfgSN, row)
    expect(sn.semaforo).toBe('vermelho')
    expect(sn.porque).toContain('custo integral')
  })
})
