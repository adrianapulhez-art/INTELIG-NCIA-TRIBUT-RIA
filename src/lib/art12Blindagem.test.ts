/**
 * ============================================================================
 * BLINDAGEM — CMV POR EXERCÍCIO ART. 12 (LC 214/2025)
 * ============================================================================
 * Suíte nova (arquivo próprio). Nada da suíte canônica é tocada.
 *
 * NOTA LEGAL (Art. 12, LC 214/2025): base = valor da operação (caput); frete na
 * base (§1º, IV); IBS/CBS fora (§2º, I); IPI fora (§2º, II); ICMS/ISS/PIS/COFINS
 * fora com vigência expressa 01/01/2026 a 31/12/2032 (§2º, V).
 *
 * VALORES DE OURO — caso canônico (30 un. × R$ 1.400,00 + frete R$ 400,00,
 * ICMS 18%, IPI 10% só indústria), derivados em Python independente e
 * AGUARDANDO CHANCELA DA CEO antes de serem tratados como definitivos.
 * ============================================================================
 */
import { describe, expect, it } from 'vitest'
import {
  CASO_CANONICO_ART12,
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  computeCellArt12,
  escadaArt12,
  fatorRepasseArt12,
  matrizArt12,
  reguasArt12,
  r2,
} from './art12Calculations'

const fmt = (v: number): string => v.toFixed(2)

describe('CMV Art. 12 — invariante central (base limpa)', () => {
  it('cadeia plena integral: base limpa constante = preço líquido do fornecedor (neutro)', () => {
    const cfg = { ...CONFIG_PADRAO_ART12 }
    for (const row of CRONOGRAMA_ART12.filter((r) => r.habilitado)) {
      const cell = computeCellArt12(CASO_CANONICO_ART12, cfg, row)
      expect(fmt(cell.exercicio.baseLimpa!)).toBe('33220.41')
      expect(fmt(cell.exercicio.unitario)).toBe('1107.35')
      expect(fmt(cell.deltaPct)).toBe('-4.45')
    }
  })

  it('fator de repasse sobre base limpa (não é o fator antigo (1+CBS)/(1+embutido))', () => {
    const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const f = fatorRepasseArt12(CONFIG_PADRAO_ART12, CASO_CANONICO_ART12, row2027)
    expect(fmt(f * 100) === fmt(95.55)).toBe(true) // 0,955488 ≈ 95,55%
    expect(fmt(f)).toBe('0.96') // 2 casas: 0,96
    const row2032 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2032)!
    const f2032 = fatorRepasseArt12(CONFIG_PADRAO_ART12, CASO_CANONICO_ART12, row2032)
    expect(fmt(f2032)).toBe('0.88')
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

  it('2026: sem repasse (f=1) e custo idêntico ao HOJE (tributos vivos + CBS teste compensável)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2026)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    expect(fmt(cell.exercicio.bruto)).toBe('42400.00')
    expect(fmt(cell.exercicio.unitario)).toBe('1158.93')
    expect(fmt(cell.deltaPct)).toBe('0.00')
    // PIS/COFINS cumulativo embutido excluído da base (§2º, V)
    const pisLine = cell.exercicio.lines.find((l) => l.key === 'piscofins')
    expect(pisLine?.fundamento.dispositivo).toContain('§2º, V')
  })

  it('frete na base (§1º, IV) e IPI fora (§2º, II) — memória contém fundamentos', () => {
    const cell = computeCellArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12 },
      CRONOGRAMA_ART12[1],
    )
    const frete = cell.exercicio.lines.find((l) => l.key === 'frete')
    expect(frete?.fundamento.dispositivo).toContain('§1º, IV')
    const base = cell.exercicio.lines.find((l) => l.key === 'baselimpa')
    expect(base?.fundamento.dispositivo).toContain('§2º')
  })

  it('2033: pendente de definição — sem cálculo, marcador na UI', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2033)!
    expect(row.habilitado).toBe(false)
    expect(row.pendente).toContain('Pendente de definição')
    expect(row.pendente).toContain('31/12/2032')
  })
})

describe('CMV Art. 12 — réguas de repasse (quem absorve)', () => {
  it('ouro 2027: integral 1.107,35 (−4,45%) · parcial 1.133,14 (−2,23%) · nenhum 1.158,93 (0,00%)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const rs = reguasArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const byMode = Object.fromEntries(rs.map((r) => [r.mode, r.cell]))
    expect(fmt(byMode.integral.cell.exercicio.unitario)).toBe('1107.35')
    expect(fmt(byMode.integral.cell.deltaPct)).toBe('-4.45')
    expect(fmt(byMode.parcial.cell.exercicio.unitario)).toBe('1133.14')
    expect(fmt(byMode.parcial.cell.deltaPct)).toBe('-2.23')
    expect(fmt(byMode.nenhum.cell.exercicio.unitario)).toBe('1158.93')
    expect(fmt(byMode.nenhum.cell.deltaPct)).toBe('0.00')
  })

  it('escada régua NENHUM: comprador absorve — 1.158,93 → 1.260,69 (2027→2032)', () => {
    const esc = escadaArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 })
    const by = Object.fromEntries(esc.map((e) => [e.exercicio, e]))
    expect(fmt(by[2027].unitario)).toBe('1158.93')
    expect(fmt(by[2029].unitario)).toBe('1184.37')
    expect(fmt(by[2030].unitario)).toBe('1209.81')
    expect(fmt(by[2031].unitario)).toBe('1235.25')
    expect(fmt(by[2032].unitario)).toBe('1260.69')
    expect(fmt(by[2032].deltaPct)).toBe('8.78')
  })

  it('degrau constante da escada Nenhum: +25,44/un por ano (CBS+IBS sobre base limpa ÷ 30)', () => {
    const esc = escadaArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 })
    for (let i = 1; i < esc.length; i++) {
      const degrau = r2(esc[i].unitario - esc[i - 1].unitario)
      expect(fmt(degrau)).toBe('25.44')
    }
  })
})

describe('CMV Art. 12 — matriz 3×3 (2027)', () => {
  const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
  const matriz = matrizArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)

  it('ouro por célula (unitário/delta vs próprio HOJE)', () => {
    const get = (c: string, f: string) => {
      const linha = matriz.find((l) => l.comprador === c)!
      return linha.cells.find((x) => x.fornecedor === f)!.cell
    }
    // Cadeia plena 2027: custo = preço líquido do fornecedor
    expect(fmt(get('presumido', 'presumido').exercicio.unitario)).toBe('1107.35')
    expect(fmt(get('real', 'real').exercicio.unitario)).toBe('1028.20')
    // LP comprando de LR: preço líquido LR (1.028,20) — crédito lava o destaque
    expect(fmt(get('presumido', 'real').exercicio.unitario)).toBe('1028.20')
    // Comprador SN: destaque sem crédito vira custo (1.448,98) — alerta na célula
    expect(fmt(get('simples', 'presumido').exercicio.unitario)).toBe('1448.98')
    expect(fmt(get('simples', 'simples').exercicio.unitario)).toBe('1516.48')
  })

  it('fornecedor SN: bruto congelado, sem destaque (LC 123/2006)', () => {
    const linha = matriz.find((l) => l.comprador === 'presumido')!
    const cellSN = linha.cells.find((x) => x.fornecedor === 'simples')!.cell
    expect(fmt(cellSN.exercicio.bruto)).toBe('42400.00')
    expect(cellSN.exercicio.baseLimpa).toBeNull()
    const nota = cellSN.exercicio.lines.find((l) => l.key === 'cbsibs')
    expect(nota?.fundamento.dispositivo).toContain('LC 123/2006')
  })

  it('menor custo da matriz = célula fornecedor LR (preço líquido menor)', () => {
    const all = matriz.flatMap((l) => l.cells.map((c) => c.cell.exercicio.unitario))
    expect(fmt(Math.min(...all))).toBe('1028.20')
  })
})

describe('CMV Art. 12 — indústria e ZFM (IPI §2º, II)', () => {
  it('fornecedor indústria 2027: IPI zerado (CF 153 §3º + art. 454) — linha de nota', () => {
    const cfg: typeof CONFIG_PADRAO_ART12 = {
      ...CONFIG_PADRAO_ART12,
      fornecedorPerfil: 'industria',
    }
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, cfg, row)
    const ipi = cell.exercicio.lines.find((l) => l.key === 'ipi')
    expect(ipi?.fundamento.dispositivo).toContain('art. 454')
    expect(ipi?.value).toBe(0)
  })

  it('ZFM mantém IPI (ADCT art. 92-B) — crédito só ao comprador industrial', () => {
    const cfgF: typeof CONFIG_PADRAO_ART12 = {
      ...CONFIG_PADRAO_ART12,
      fornecedorPerfil: 'industria',
      zfm: true,
    }
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const revendedor = computeCellArt12(CASO_CANONICO_ART12, cfgF, row)
    const ipiRev = revendedor.exercicio.lines.find((l) => l.key === 'ipi')
    expect(ipiRev?.fundamento.dispositivo).toContain('92-B')
    expect(ipiRev!.value).toBeGreaterThan(0)
    const cfgI: typeof CONFIG_PADRAO_ART12 = { ...cfgF, compradorPerfil: 'industria' }
    const industrial = computeCellArt12(CASO_CANONICO_ART12, cfgI, row)
    const credIpi = industrial.exercicio.lines.find((l) => l.key === 'creditoipi')
    expect(credIpi!.value).toBeLessThan(0)
  })
})

describe('CMV Art. 12 — semáforo e porquê', () => {
  it('semáforo reflete o lado do comprador (neutro = âmbar na cadeia plena integral)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const pleno = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    expect(pleno.semaforo).toBe('ambar')
    expect(pleno.porque).toContain('art. 47')
    const cfgSN: typeof CONFIG_PADRAO_ART12 = { ...CONFIG_PADRAO_ART12, compradorRegime: 'simples' }
    const sn = computeCellArt12(CASO_CANONICO_ART12, cfgSN, row)
    expect(sn.semaforo).toBe('vermelho')
    expect(sn.porque).toContain('custo integral')
  })
})
