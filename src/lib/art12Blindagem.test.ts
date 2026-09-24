/**
 * ============================================================================
 * BLINDAGEM — CMV POR EXERCÍCIO ART. 12 (LC 214/2025) — v3 (23/09/2026)
 * ============================================================================
 * Estrutura da proposta da CEO adotada (Opção A): PIS/COFINS sobre BASE SEM
 * ICMS (tese do século — STJ RE 1.188.403; STF Tema 1098), memória em 2 blocos
 * (formação do preço do fornecedor → custo da aquisição do comprador) e
 * seletor de tese sobre a base do ICMS na transição (fisco × contribuinte).
 *
 * v3 — APRESENTAÇÃO POR ELEMENTOS (pedido da CEO, 23/09): a memória exibe os
 * VALORES DOS ELEMENTOS analisados (mercadorias, frete, ICMS sobre mercadorias,
 * ICMS sobre fretes, PIS, COFINS — alíquota × base em cada linha, padrão
 * Markup), sem fator na exibição. O fator permanece internamente no motor.
 *
 * VALORES DE OURO v2 — caso canônico (30 un. × R$ 1.400,00 + frete R$ 400,00,
 * ICMS 18%, IPI 10% só indústria), derivados em Python independente e
 * CHANCELADOS PELA CEO (23/09, 07:19) — referência oficial do módulo.
 * ============================================================================
 * INVARIANTES TRAVADAS (ouros chancelados — NÃO MUDAM na v3):
 * - Cadeia plena integral 2027–2032: base limpa 33.498,97 · custo 1.116,63/un
 *   (−3,65%) nas DUAS teses (o crédito lava o destaque).
 * - Réguas 2027: integral 1.116,63 (−3,65%) · parcial 50% 1.137,78 (−1,82%) ·
 *   nenhum 1.158,93 (0,00%).
 * - Escada régua NENHUM: 1.158,93 (2026–2028, flat) → 1.184,37 (2029) →
 *   1.209,81 (2030) → 1.235,25 (2031) → 1.260,69 (2032); degrau +25,44/un.
 * - Matriz 2027 (tese do Fisco): LP×LP 1.116,63 · LR×LR 1.051,73 (0,00%) ·
 *   SN×LP 1.482,94 · SN×LR 1.396,75 · SN×SN 1.413,33.
 * - Tese do Contribuinte: nota 43.833,81 · SN×LP 1.461,13 (pleno idêntico).
 * - HOJE: 1.158,93 (LP) / 1.051,73 (LR) — intocado.
 * - 2026: sem reprecificação (f=1) — custo = HOJE nas cadeias plenas.
 * - 2033: pendente de definição (§2º, V expira em 31/12/2032).
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

describe('CMV Art. 12 v2 — invariante central (cadeia plena neutra)', () => {
  it('cadeia plena integral: base limpa constante = preço líquido do fornecedor (33.498,97) e custo 1.116,63 (−3,65%) em TODOS os exercícios 2027–2032, nas DUAS teses', () => {
    for (const tese of ['fisco', 'contribuinte'] as const) {
      const cfg = { ...CONFIG_PADRAO_ART12, baseIcmsTransicao: tese }
      for (const row of CRONOGRAMA_ART12.filter((r) => r.habilitado && r.exercicio >= 2027)) {
        const cell = computeCellArt12(CASO_CANONICO_ART12, cfg, row)
        expect(fmt(cell.exercicio.baseLimpa!)).toBe('33498.97')
        expect(fmt(cell.exercicio.unitario)).toBe('1116.63')
        expect(fmt(cell.deltaPct)).toBe('-3.65')
})

describe('CMV Art. 12 v2 — indústria e ZFM (IPI §2º, II)', () => {
=======
=======
})

describe('CMV Art. 12 v2 — indústria e ZFM (IPI §2º, II)', () => {

  it('fator de repasse v2: (1−ICMS)×(1−PIS/COFINS)÷(1−ICMS×fração) — 2027 LP = 0,963500', () => {
    const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const f = fatorRepasseArt12(CONFIG_PADRAO_ART12, CASO_CANONICO_ART12, row2027)
    expect(f.toFixed(6)).toBe('0.963500')
    // Interno: mercadoria reprecificada = 42.000 × 0,963500 = 40.467,00 (não exibido como elemento)
    expect(fmt(r2(42000 * f))).toBe('40467.00')
  })

  it('HOJE intacto: régua canônica R$ 1.158,93/un (LP) e R$ 1.051,73/un (LR)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const lp = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    expect(fmt(lp.hoje.unitario)).toBe('1158.93')
    const lr = computeCellArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12, fornecedorRegime: 'real', compradorRegime: 'real' },
      row,
    )
    expect(fmt(lr.hoje.unitario)).toBe('1051.73')
  })

  it('2026: sem reprecificação (f=1) e custo idêntico ao HOJE nas cadeias plenas (CBS teste compensável)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2026)!
    const lp = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    expect(fmt(lp.exercicio.unitario)).toBe('1158.93')
    expect(fmt(lp.deltaPct)).toBe('0.00')
    // PIS/COFINS embutidos sobre BASE SEM ICMS: 34.768 × 3,65% = 1.269,03 (não 1.547,60 do v1)
    const pis26 = lp.exercicio.lines.find((l) => l.key === 'pis')!
    const cofins26 = lp.exercicio.lines.find((l) => l.key === 'cofins')!
    expect(fmt(r2(pis26.value + cofins26.value))).toBe('-1269.03')
    expect(pis26.fundamento.dispositivo).toContain('§2º, V')
    const lr = computeCellArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12, fornecedorRegime: 'real', compradorRegime: 'real' },
      row,
    )
    expect(fmt(lr.exercicio.unitario)).toBe('1051.73')
    expect(fmt(lr.deltaPct)).toBe('0.00')
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

describe('CMV Art. 12 v2 — estrutura em 2 blocos (proposta da CEO)', () => {
  const row2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
  const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row2027)

  it('bloco 1 — formação do preço do fornecedor: elementos reais (42.000 + 400 − ICMS 7.632 − PIS/COFINS 1.269,03) → base limpa 33.498,97 → +CBS 2.947,91 +IBS 33,50 → nota 44.488,27 (tese do Fisco)', () => {
    const b1 = cell.exercicio.lines.filter((l) => l.bloco === 1)
    const get = (k: string) => b1.find((l) => l.key === k)!
    // Apresentação v3 por ELEMENTOS (padrão Markup — sem fator na exibição):
    expect(fmt(get('mercadoria').value)).toBe('42000.00')
    expect(get('mercadoria').formula).toContain('1.400,00')
    expect(fmt(get('frete').value)).toBe('400.00')
    expect(fmt(get('icms_merc').value)).toBe('-7560.00')
    expect(fmt(get('icms_frete').value)).toBe('-72.00')
    expect(fmt(get('pis').value)).toBe('-225.99')
    expect(fmt(get('cofins').value)).toBe('-1043.04')
    expect(fmt(get('baselimpa').value)).toBe('33498.97')
    expect(fmt(get('cbs').value)).toBe('2947.91')
    expect(fmt(get('ibs').value)).toBe('33.50')
    expect(fmt(get('preconota').value)).toBe('44488.27')
    expect(get('preconota').subtotal).toBe('preco_nota')
    expect(get('preconota').label).toContain('FISCO')
    // A soma dos elementos fecha na base limpa (nenhum fator visível):
    const somaElementos = r2(
      get('mercadoria').value +
        get('frete').value +
        get('icms_merc').value +
        get('icms_frete').value +
        get('pis').value +
        get('cofins').value,
    )
    expect(fmt(somaElementos)).toBe('33498.97')
  })

  it('bloco 2 — custo da aquisição: nota 44.488,27 − ICMS 8.007,89 − CBS − IBS = compras líquidas 33.498,97 → 1.116,63/un', () => {
    const b2 = cell.exercicio.lines.filter((l) => l.bloco === 2)
    const get = (k: string) => b2.find((l) => l.key === k)!
    expect(fmt(get('bruto_nota').value)).toBe('44488.27')
    expect(fmt(get('creditoicms').value)).toBe('-8007.89')
    expect(fmt(get('creditocbs').value)).toBe('-2947.91')
    expect(fmt(get('creditoibs').value)).toBe('-33.50')
    expect(fmt(get('comprasliquidas').value)).toBe('33498.97')
    expect(fmt(get('custounitario').value)).toBe('1116.63')
  })

  it('tese do Contribuinte: nota menor (43.833,81), ICMS destaque 7.353,43, custo do comprador pleno IGUAL (1.116,63)', () => {
    const cellC = computeCellArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12, baseIcmsTransicao: 'contribuinte' },
      row2027,
    )
    const get = (k: string) => cellC.exercicio.lines.find((l) => l.key === k)!
    expect(fmt(get('preconota').value)).toBe('43833.81')
    expect(get('preconota').label).toContain('CONTRIBUINTE')
    expect(fmt(get('creditoicms').value)).toBe('-7353.43')
    expect(fmt(cellC.exercicio.unitario)).toBe('1116.63')
    expect(fmt(cellC.deltaPct)).toBe('-3.65')
  })

  it('identidade de auditoria: nota = base limpa + ICMS + CBS + IBS (fecha ao centavo nas duas teses)', () => {
    for (const tese of ['fisco', 'contribuinte'] as const) {
      const c = computeCellArt12(
        CASO_CANONICO_ART12,
        { ...CONFIG_PADRAO_ART12, baseIcmsTransicao: tese },
        row2027,
      )
      const get = (k: string) => c.exercicio.lines.find((l) => l.key === k)!
      const soma = r2(
        get('baselimpa').value + -get('creditoicms').value + get('cbs').value + get('ibs').value,
      )
      expect(fmt(soma)).toBe(fmt(get('preconota').value))
    }
  })
})

describe('CMV Art. 12 v2 — réguas de repasse (quem absorve)', () => {
  it('ouro 2027 (iguais nas duas teses): integral 1.116,63 (−3,65%) · parcial 1.137,78 (−1,82%) · nenhum 1.158,93 (0,00%)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    for (const tese of ['fisco', 'contribuinte'] as const) {
      const rs = reguasArt12(
        CASO_CANONICO_ART12,
        { ...CONFIG_PADRAO_ART12, baseIcmsTransicao: tese },
        row,
      )
      const byMode = Object.fromEntries(rs.map((r) => [r.mode, r.cell]))
      expect(fmt(byMode.integral.exercicio.unitario)).toBe('1116.63')
      expect(fmt(byMode.integral.deltaPct)).toBe('-3.65')
      expect(fmt(byMode.parcial.exercicio.unitario)).toBe('1137.78')
      expect(fmt(byMode.parcial.deltaPct)).toBe('-1.82')
      expect(fmt(byMode.nenhum.exercicio.unitario)).toBe('1158.93')
      expect(fmt(byMode.nenhum.deltaPct)).toBe('0.00')
    }
  })

  it('escada régua NENHUM inalterada: 1.158,93 → 1.260,69 (2027→2032), degrau constante +25,44/un', () => {
    const esc = escadaArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 })
    const by = Object.fromEntries(esc.map((e) => [e.exercicio, e]))
    expect(fmt(by[2026].unitario)).toBe('1158.93')
    expect(fmt(by[2027].unitario)).toBe('1158.93')
    expect(fmt(by[2028].unitario)).toBe('1158.93')
    expect(fmt(by[2029].unitario)).toBe('1184.37')
    expect(fmt(by[2030].unitario)).toBe('1209.81')
    expect(fmt(by[2031].unitario)).toBe('1235.25')
    expect(fmt(by[2032].unitario)).toBe('1260.69')
    expect(fmt(by[2032].deltaPct)).toBe('8.78')
    // Degraus constantes a partir de 2029 (2026–2028: ICMS integral, escada flat)
    for (let i = 3; i < esc.length; i++) {
      const degrau = r2(esc[i].unitario - esc[i - 1].unitario)
      expect(fmt(degrau)).toBe('25.44')
    }
  })
})

describe('CMV Art. 12 v2 — matriz 3×3 (2027)', () => {
  const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!

  it('ouro por célula — tese do FISCO (unitário/delta vs próprio HOJE)', () => {
    const matriz = matrizArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const get = (c: string, f: string) => {
      const linha = matriz.find((l) => l.comprador === c)!
      return linha.cells.find((x) => x.fornecedor === f)!.cell
    }
    // Cadeia plena: custo = preço líquido do fornecedor (crédito lava o destaque)
    expect(fmt(get('presumido', 'presumido').exercicio.unitario)).toBe('1116.63')
    expect(fmt(get('real', 'real').exercicio.unitario)).toBe('1051.73')
    expect(fmt(get('real', 'real').deltaPct)).toBe('0.00') // LR×LR NEUTRO — já creditava PIS/COFINS
    expect(fmt(get('presumido', 'real').exercicio.unitario)).toBe('1051.73')
    expect(fmt(get('presumido', 'real').deltaPct)).toBe('0.00')
    expect(fmt(get('real', 'presumido').exercicio.unitario)).toBe('1116.63')
    expect(fmt(get('real', 'presumido').deltaPct)).toBe('-3.65')
    // Comprador SN: destaque vira custo integral
    expect(fmt(get('simples', 'presumido').exercicio.unitario)).toBe('1482.94')
    expect(fmt(get('simples', 'presumido').deltaPct)).toBe('4.93')
    expect(fmt(get('simples', 'real').exercicio.unitario)).toBe('1396.75')
    expect(fmt(get('simples', 'real').deltaPct)).toBe('-1.17')
    expect(fmt(get('simples', 'simples').exercicio.unitario)).toBe('1413.33')
    expect(fmt(get('simples', 'simples').deltaPct)).toBe('0.00')
  })

  it('ouro por célula — tese do CONTRIBUINTE: pleno idêntico; SN muda (nota menor)', () => {
    const matriz = matrizArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12, baseIcmsTransicao: 'contribuinte' },
      row,
    )
    const get = (c: string, f: string) => {
      const linha = matriz.find((l) => l.comprador === c)!
      return linha.cells.find((x) => x.fornecedor === f)!.cell
    }
    expect(fmt(get('presumido', 'presumido').exercicio.unitario)).toBe('1116.63')
    expect(fmt(get('simples', 'presumido').exercicio.unitario)).toBe('1461.13')
    expect(fmt(get('simples', 'real').exercicio.unitario)).toBe('1376.20')
  })

  it('fornecedor SN: bruto congelado, sem destaque (LC 123/2006)', () => {
    const matriz = matrizArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const cellSN = matriz
      .find((l) => l.comprador === 'presumido')!
      .cells.find((x) => x.fornecedor === 'simples')!.cell
    expect(fmt(cellSN.exercicio.bruto)).toBe('42400.00')
    const nota = cellSN.exercicio.lines.find((l) => l.key === 'cbsibs')
    expect(nota?.fundamento.dispositivo).toContain('LC 123/2006')
  })

  it('menor custo da matriz = células com fornecedor LR (preço líquido menor)', () => {
    const matriz = matrizArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const all = matriz.flatMap((l) => l.cells.map((c) => c.cell.exercicio.unitario))
    expect(fmt(Math.min(...all))).toBe('1051.73')
  })
})

describe('CMV Art. 12 — SN HÍBRIDO (LC 214/2025 art. 41 + Res. CGSN 186/2026)', () => {
  const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
  // Ouros híbridos derivados em Python e confirmados ao vivo na matriz (23/09).
  // Premissa chancelada pela CEO: base do IBS/CBS do fornecedor SN híbrido = VO sem ICMS.
  const ourosHib: Record<string, { unit: string; delta: string }> = {
    'presumido|simples_hibrido': { unit: '1413.33', delta: '0.00' }, // lava no crédito
    'real|simples_hibrido': { unit: '1413.33', delta: '0.00' },
    'simples|simples_hibrido': { unit: '1516.48', delta: '7.30' }, // pior caso
    'simples_hibrido|presumido': { unit: '1383.56', delta: '-2.11' },
    'simples_hibrido|real': { unit: '1303.15', delta: '-7.80' }, // menor custo da linha
    'simples_hibrido|simples': { unit: '1413.33', delta: '0.00' },
    'simples_hibrido|simples_hibrido': { unit: '1413.33', delta: '0.00' },
  }

  it('ouros por célula híbrida — tese do FISCO', () => {
    const matriz = matrizArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const get = (c: string, f: string) => {
      const linha = matriz.find((l) => l.comprador === c)!
      return linha.cells.find((x) => x.fornecedor === f)!.cell
    }
    for (const [par, ouro] of Object.entries(ourosHib)) {
      const [c, f] = par.split('|')
      const cell = get(c, f)
      expect(fmt(cell.exercicio.unitario), `${c}×${f} unit`).toBe(ouro.unit)
      expect(fmt(cell.deltaPct), `${c}×${f} delta`).toBe(ouro.delta)
    }
  })

  it('fornecedor SN híbrido: nota congelada + CBS/IBS por fora sobre base SEM ICMS (premissa IT)', () => {
    const cell = computeCellArt12(
      CASO_CANONICO_ART12,
      { ...CONFIG_PADRAO_ART12, fornecedorRegime: 'simples_hibrido' },
      row,
    )
    const get = (k: string) => cell.exercicio.lines.find((l) => l.key === k)!
    expect(fmt(get('cbsibs').value)).toBe('3094.35') // CBS 3.059,58 + IBS 34,77
    expect(get('cbsibs').formula).toContain('base sem ICMS')
    expect(get('cbsibs').fundamento.dispositivo).toContain('art. 41')
    // Fundamento neutro (auditoria v0.0.241): crédito depende do regime do ADQUIRENTE
    expect(get('cbsibs').fundamento.efeito).toContain('depende do regime')
    expect(fmt(get('preconota_snhib').value)).toBe('45494.35')
    expect(fmt(cell.exercicio.bruto)).toBe('45494.35')
  })

  it('comprador SN padrão sobre fornecedor híbrido: SEM crédito — destaque vira custo (art. 47 + LC 123)', () => {
    const cell = computeCellArt12(
      CASO_CANONICO_ART12,
      {
        ...CONFIG_PADRAO_ART12,
        fornecedorRegime: 'simples_hibrido',
        compradorRegime: 'simples',
      },
      row,
    )
    const creditos = cell.exercicio.lines.filter((l) => l.kind === 'credito' && l.bloco === 2)
    const somaCreditos = creditos.reduce((acc, l) => acc + l.value, 0)
    expect(fmt(somaCreditos)).toBe('-0.00')
    expect(fmt(cell.exercicio.unitario)).toBe('1516.48')
  })

  it('comprador SN HÍBRIDO: credita CBS/IBS da nota, NÃO credita ICMS nem PIS/COFINS (seguem no DAS)', () => {
    const cell = computeCellArt12(
      CASO_CANONICO_ART12,
      {
        ...CONFIG_PADRAO_ART12,
        fornecedorRegime: 'presumido',
        compradorRegime: 'simples_hibrido',
      },
      row,
    )
    const get = (k: string) => cell.exercicio.lines.find((l) => l.key === k)!
    expect(fmt(get('creditocbs').value)).toBe('-2947.91')
    expect(fmt(get('creditoibs').value)).toBe('-33.50')
    expect(get('creditocbs').fundamento.efeito).toContain('regime regular')
    const creditoIcms = get('creditoicms')
    expect(creditoIcms.value).toBe(0)
    expect(creditoIcms.label).toContain('DAS')
  })

  it('HOJE não conhece o híbrido (opção a partir de 2027): trata como SN padrão', () => {
    const cell = computeCellArt12(
      CASO_CANONICO_ART12,
      {
        ...CONFIG_PADRAO_ART12,
        fornecedorRegime: 'simples_hibrido',
        compradorRegime: 'simples_hibrido',
      },
      row,
    )
    expect(fmt(cell.hoje.unitario)).toBe('1413.33')
  })

  it('matriz 4×4: menor custo geral segue LR×LR (1.051,73); pior caso = SN×SN-híb (1.516,48)', () => {
    const matriz = matrizArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const all = matriz.flatMap((l) => l.cells.map((c) => c.cell.exercicio.unitario))
    expect(fmt(Math.min(...all))).toBe('1051.73')

describe('CMV Art. 12 v2 — indústria e ZFM (IPI §2º, II)', () => {
=======
    expect(fmt(Math.max(...all))).toBe('1516.48')
  })
})

describe('CMV Art. 12 v2 — indústria e ZFM (IPI §2º, II)', () => {
=======

describe('CMV Art. 12 v2 — indústria e ZFM (IPI §2º, II)', () => {
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
    const credIpi = industrial.exercicio.lines.find((l) => l.key === 'creditoipi')!
    expect(credIpi.value).toBeLessThan(0)
    expect(fmt(industrial.exercicio.unitario)).toBe('1116.63')
  })

  it('indústria 2026: IPI 10% na nota, crédito integral ao industrial — custo = HOJE (1.158,93)', () => {
    const cfg: typeof CONFIG_PADRAO_ART12 = {
      ...CONFIG_PADRAO_ART12,
      fornecedorPerfil: 'industria',
      compradorPerfil: 'industria',
    }
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2026)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, cfg, row)
    expect(fmt(cell.exercicio.unitario)).toBe('1158.93')
    expect(fmt(cell.deltaPct)).toBe('0.00')
    // PIS/COFINS embutidos sobre base sem ICMS e sem IPI: 34.768 × 3,65%
    const pisI = cell.exercicio.lines.find((l) => l.key === 'pis')!
    const cofinsI = cell.exercicio.lines.find((l) => l.key === 'cofins')!
    expect(fmt(r2(pisI.value + cofinsI.value))).toBe('-1269.03')
  })
})

describe('CMV Art. 12 v2 — camada de auditoria (cada passo recalculado = valor exibido)', () => {
  const parseBR = (s: string): number => Number(s.replace(/\./g, '').replace(',', '.'))

  it('Mercadoria 2027: elemento real (30 un. × R$ 1.400,00 = 42.000,00) — sem fator na exibição', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const linha = cell.exercicio.lines.find((l) => l.key === 'mercadoria')!
    expect(fmt(linha.value)).toBe('42000.00')
    expect(linha.formula).toContain('1.400,00')
    expect(linha.formula).not.toContain('fator')
    const passos = linha.passos!
    expect(parseBR(passos[passos.length - 1].resultado)).toBe(42000)
  })

  it('Preço da nota 2027 (tese do Fisco): (33.498,97 + 2.947,91 + 33,50) ÷ 0,82 = 44.488,27 — recalculado do zero', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const nota = cell.exercicio.lines.find((l) => l.key === 'preconota')!
    const recalc = Math.floor(((33498.97 + 2947.91 + 33.5) / 0.82) * 100 + 0.5) / 100
    expect(fmt(nota.value)).toBe(fmt(recalc))
    expect(fmt(nota.value)).toBe('44488.27')
    expect(nota.passos!.some((p) => p.resultado.includes('(R$ 44.488,27)'))).toBe(true)
  })

  it('Compras líquidas 2027: nota − créditos = 33.498,97 (identidade ao centavo)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const get = (k: string) => cell.exercicio.lines.find((l) => l.key === k)!
    const recalc = r2(
      get('bruto_nota').value +
        get('creditoicms').value +
        get('creditocbs').value +
        get('creditoibs').value,
    )
    expect(fmt(recalc)).toBe('33498.97')
    expect(fmt(get('comprasliquidas').value)).toBe('33498.97')
  })

  it('fórmula exibida da mercadoria não expõe fator (apresentação por elementos — v3)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const linha = cell.exercicio.lines.find((l) => l.key === 'mercadoria')!
    expect(linha.formula).toContain('1.400,00')
    expect(linha.formula).not.toContain('0,963500')
  })

  it('2026 (f=1): mercadoria elementar = 42.000 e custo = HOJE', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2026)!
    const cell = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    const linha = cell.exercicio.lines.find((l) => l.key === 'mercadoria')!
    expect(parseBR(linha.passos![linha.passos!.length - 1].resultado)).toBe(42000)
    expect(fmt(linha.value)).toBe('42000.00')
  })
})

describe('CMV Art. 12 v2 — semáforo e porquê', () => {
  it('semáforo reflete o lado do comprador (cadeia plena integral = verde: −3,65%)', () => {
    const row = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027)!
    const pleno = computeCellArt12(CASO_CANONICO_ART12, { ...CONFIG_PADRAO_ART12 }, row)
    expect(pleno.semaforo).toBe('verde') // −3,65%: extinção de PIS/COFINS chega ao comprador (repasse integral)
    expect(pleno.porque).toContain('art. 47')
    const cfgSN: typeof CONFIG_PADRAO_ART12 = { ...CONFIG_PADRAO_ART12, compradorRegime: 'simples' }
    const sn = computeCellArt12(CASO_CANONICO_ART12, cfgSN, row)
    expect(sn.semaforo).toBe('vermelho')
    expect(sn.porque).toContain('custo integral')
  })
})
