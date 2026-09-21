import { describe, it, expect } from 'vitest'
import {
  CASO_CANONICO,
  CONFIG_PADRAO,
  CRONOGRAMA_OFICIAL,
  computeCell,
  computeHojeSide,
  computeExercicioSide,
  repasseFactor,
  OURO_LPLP_2027,
  OURO_LPLP_2028,
  OURO_REPASSE_LPLP_2027,
  r2,
} from '@/lib/cmvExercicioCalculations'
import type { CellConfig, ScheduleRow } from '@/lib/cmvExercicioCalculations'

const row2027 = CRONOGRAMA_OFICIAL.find((r) => r.exercicio === 2027) as ScheduleRow
const row2028 = CRONOGRAMA_OFICIAL.find((r) => r.exercicio === 2028) as ScheduleRow

const LP_LP: CellConfig = { ...CONFIG_PADRAO }

describe('Blindagem Fase A — CMV por Exercício (Página Reforma)', () => {
  it('cronograma oficial: 2027/2028 com IBS 0,1% e ICMS 100%; IPI extinto a partir de 2027', () => {
    expect(row2027.cbsRate).toBe(8.8)
    expect(row2027.ibsRate).toBe(0.1)
    expect(row2027.icmsPct).toBe(100)
    expect(row2027.ipiRate).toBe(0)
    expect(row2028.cbsRate).toBe(8.8)
    expect(row2028.ibsRate).toBe(0.1)
    expect(row2028.icmsPct).toBe(100)
    // 2029: primeira estação com ICMS cedendo (90%) — Fase B
    const row2029 = CRONOGRAMA_OFICIAL.find((r) => r.exercicio === 2029) as ScheduleRow
    expect(row2029.icmsPct).toBe(90)
  })

  it('fator de repasse integral: (1+8,8%)/(1+3,65%) ≈ 1,049735 (LP) e 1,049229 (LR)', () => {
    const fLP = repasseFactor(LP_LP, CASO_CANONICO, row2027)
    expect(fLP).toBeCloseTo(1.049686, 5)
    const fLR = repasseFactor({ ...LP_LP, fornecedorRegime: 'real' }, CASO_CANONICO, row2027)
    expect(fLR).toBeCloseTo(1.088 / 1.0925, 6)
    // SN e "nenhum": fator 1 (congelado)
    expect(repasseFactor({ ...LP_LP, fornecedorRegime: 'simples' }, CASO_CANONICO, row2027)).toBe(1)
    expect(repasseFactor({ ...LP_LP, repasse: 'nenhum' }, CASO_CANONICO, row2027)).toBe(1)
    // 2033 (desembute total): ICMS sai (×0,82), CBS+IBS entram por fora (×1,265), PIS/COFINS sai (÷1,0365) → ≈1,0008
    const row2033 = CRONOGRAMA_OFICIAL.find((r) => r.exercicio === 2033) as ScheduleRow
    const f2033 = repasseFactor(LP_LP, CASO_CANONICO, row2033)
    expect(f2033).toBeCloseTo(1.000772, 5)
  })

  it('VALOR DE OURO LP×LP 2027 (Integral): mercadoria 44.086,83 + frete 419,87 = bruto 44.506,70; ICMS −8.011,21; CBS −3.599,81; IBS −44,46; líquido 32.851,22 → 1.095,04/un (−5,51%)', () => {
    const cell = computeCell(CASO_CANONICO, LP_LP, row2027)
    const ex = cell.exercicio

    expect(ex.lines.find((l) => l.key === 'mercadoria')?.value).toBe(44086.83)
    expect(ex.lines.find((l) => l.key === 'frete')?.value).toBe(419.87)
    expect(ex.bruto).toBe(44506.7)
    expect(ex.lines.find((l) => l.key === 'icms')?.value).toBe(-8011.21)
    expect(ex.lines.find((l) => l.key === 'cbs')?.value).toBe(-3599.81)
    // IBS 0,1%: presença obrigatória (linha explícita, valor pequeno)
    const ibs = ex.lines.find((l) => l.key === 'ibs')
    expect(ibs).toBeDefined()
    expect(ibs?.value).toBe(-44.46)
    expect(ex.liquido).toBe(32851.22)
    expect(ex.unitario).toBe(1095.04)
    expect(cell.deltaPct).toBe(-5.51)
    expect(cell.semaforo).toBe('verde')
  })

  it('VALOR DE OURO LP×LP 2028: idêntico a 2027 (mesmas alíquotas de transição)', () => {
    const cell = computeCell(CASO_CANONICO, LP_LP, row2028)
    expect(cell.exercicio.unitario).toBe(OURO_LPLP_2028.unitario)
    expect(cell.exercicio.unitario).toBe(1095.04)
    expect(cell.exercicio.liquido).toBe(32851.22)
  })

  it('VALOR DE OURO LP×LP 2029 (Fase B): ICMS cede a 90% (−8.011,21 → −7.210,09) e IBS sobe p/ 1,77% (−44,46 → −774,07); líquido 32.922,73 → 1.097,42/un (−5,31%)', () => {
    const row2029 = CRONOGRAMA_OFICIAL.find((r) => r.exercicio === 2029) as ScheduleRow
    expect(row2029.habilitado).toBe(true)
    const cell = computeCell(CASO_CANONICO, LP_LP, row2029)
    const ex = cell.exercicio
    expect(ex.lines.find((l) => l.key === 'icms')?.value).toBe(-7210.09)
    expect(ex.lines.find((l) => l.key === 'cbs')?.value).toBe(-3599.81)
    expect(ex.lines.find((l) => l.key === 'ibs')?.value).toBe(-774.07)
    expect(ex.liquido).toBe(32922.73)
    expect(ex.unitario).toBe(1097.42)
    expect(cell.deltaPct).toBe(-5.31)
    // Ponto cego da transição: 2029 é MAIS CARO que 2027 — corte do ICMS (−801,12) > IBS (+729,61)
    expect(ex.unitario).toBeGreaterThan(1095.04)
  })

  it('VALOR DE OURO LP×LP 2030 (Fase C): ICMS 80% (−6.408,97), IBS 3,54% (−1.521,67); líquido 32.976,25 → 1.099,21/un (−5,15%)', () => {
    const row2030 = CRONOGRAMA_OFICIAL.find((r) => r.exercicio === 2030) as ScheduleRow
    expect(row2030.habilitado).toBe(true)
    const cell = computeCell(CASO_CANONICO, LP_LP, row2030)
    const ex = cell.exercicio
    expect(ex.lines.find((l) => l.key === 'icms')?.value).toBe(-6408.97)
    expect(ex.lines.find((l) => l.key === 'cbs')?.value).toBe(-3599.81)
    expect(ex.lines.find((l) => l.key === 'ibs')?.value).toBe(-1521.67)
    expect(ex.liquido).toBe(32976.25)
    expect(ex.unitario).toBe(1099.21)
    expect(cell.deltaPct).toBe(-5.15)
    // A escada do custo sobe: cada estação é mais cara que a anterior
    expect(ex.unitario).toBeGreaterThan(1097.42) // 2029
  })

  it('VALOR DE OURO LP×LP 2031 (Fase C/2): ICMS 70% (−5.607,85), IBS 5,31% (−2.244,14); líquido 33.054,90 → 1.101,83/un (−4,93%)', () => {
    const row2031 = CRONOGRAMA_OFICIAL.find((r) => r.exercicio === 2031) as ScheduleRow
    expect(row2031.habilitado).toBe(true)
    const cell = computeCell(CASO_CANONICO, LP_LP, row2031)
    const ex = cell.exercicio
    expect(ex.lines.find((l) => l.key === 'icms')?.value).toBe(-5607.85)
    expect(ex.lines.find((l) => l.key === 'cbs')?.value).toBe(-3599.81)
    expect(ex.lines.find((l) => l.key === 'ibs')?.value).toBe(-2244.14)
    expect(ex.liquido).toBe(33054.9)
    expect(ex.unitario).toBe(1101.83)
    expect(cell.deltaPct).toBe(-4.93)
    // A escada do custo continua subindo
    expect(ex.unitario).toBeGreaterThan(1099.21) // 2030
  })

  it('VALOR DE OURO LP×LP 2032 (Fase C/3): ICMS 60% (−4.806,73), IBS 7,08% (−2.942,73); líquido 33.157,43 → 1.105,25/un (−4,63%)', () => {
    const row2032 = CRONOGRAMA_OFICIAL.find((r) => r.exercicio === 2032) as ScheduleRow
    expect(row2032.habilitado).toBe(true)
    const cell = computeCell(CASO_CANONICO, LP_LP, row2032)
    const ex = cell.exercicio
    expect(ex.lines.find((l) => l.key === 'icms')?.value).toBe(-4806.73)
    expect(ex.lines.find((l) => l.key === 'cbs')?.value).toBe(-3599.81)
    expect(ex.lines.find((l) => l.key === 'ibs')?.value).toBe(-2942.73)
    expect(ex.liquido).toBe(33157.43)
    expect(ex.unitario).toBe(1105.25)
    expect(cell.deltaPct).toBe(-4.63)
    // O degrau da escada cresce: +3,42/un (vs +2,62 de 2030→2031)
    expect(ex.unitario).toBeGreaterThan(1101.83) // 2031
  })

  it('réguas de repasse LP×LP 2027: Integral 1.096,31 (−5,4%) · Parcial 50% · Nenhum — lado a lado', () => {
    const integral = computeCell(CASO_CANONICO, { ...LP_LP, repasse: 'integral' }, row2027)
    const parcial = computeCell(
      CASO_CANONICO,
      { ...LP_LP, repasse: 'parcial', repassePct: 50 },
      row2027,
    )
    const nenhum = computeCell(CASO_CANONICO, { ...LP_LP, repasse: 'nenhum' }, row2027)

    expect(integral.exercicio.unitario).toBe(OURO_REPASSE_LPLP_2027.integral.unitario)
    expect(integral.exercicio.unitario).toBe(1096.31)
    expect(parcial.exercicio.unitario).toBe(OURO_REPASSE_LPLP_2027.parcial.unitario)
    expect(nenhum.exercicio.unitario).toBe(OURO_REPASSE_LPLP_2027.nenhum.unitario)
    // Parcial fica entre Integral e Nenhum
    expect(parcial.exercicio.unitario).toBeGreaterThan(integral.exercicio.unitario)
    expect(parcial.exercicio.unitario).toBeLessThan(nenhum.exercicio.unitario)
  })

  it('igualdade ao centavo: cada célula da matriz 3×3 = sua memória (2027 e 2028)', () => {
    const regimes = ['presumido', 'real', 'simples'] as const
    for (const row of [row2027, row2028]) {
      for (const comprador of regimes) {
        for (const fornecedor of regimes) {
          const cfg: CellConfig = {
            ...LP_LP,
            compradorRegime: comprador,
            fornecedorRegime: fornecedor,
          }
          const cell = computeCell(CASO_CANONICO, cfg, row)
          // A memória (linhas) deve recompor exatamente o bruto e o líquido da célula
          const brutoLinhas = r2(
            cell.exercicio.lines
              .filter((l) => l.kind === 'bruto')
              .reduce((acc, l) => acc + l.value, 0),
          )
          const creditosLinhas = r2(
            cell.exercicio.lines
              .filter((l) => l.kind === 'credito')
              .reduce((acc, l) => acc + Math.abs(l.value), 0),
          )
          expect(brutoLinhas).toBe(cell.exercicio.bruto)
          expect(creditosLinhas).toBe(cell.exercicio.creditos)
          expect(r2(cell.exercicio.bruto - cell.exercicio.creditos)).toBe(cell.exercicio.liquido)
          // unitário = líquido / quantidade
          expect(cell.exercicio.unitario).toBe(r2(cell.exercicio.liquido / CASO_CANONICO.quantity))
          // SN nunca toma crédito
          if (comprador === 'simples') {
            expect(cell.exercicio.creditos).toBe(0)
            if (fornecedor !== 'simples') expect(cell.alerta).toBeTruthy()
          }
        }
      }
    }
  })

  it('linha do IBS 0,1% presente e com fórmula visível em todas as células LP/LR (presença obrigatória)', () => {
    const regimes = ['presumido', 'real'] as const
    for (const comprador of regimes) {
      for (const fornecedor of regimes) {
        const cfg: CellConfig = {
          ...LP_LP,
          compradorRegime: comprador,
          fornecedorRegime: fornecedor,
        }
        const side = computeExercicioSide(CASO_CANONICO, cfg, row2027)
        const ibs = side.lines.find((l) => l.key === 'ibs')
        expect(ibs).toBeDefined()
        expect(ibs?.formula).toContain('0,10')
      }
    }
  })

  it('lado HOJE: comprador SN não toma crédito; fornecedor LR dá crédito de PIS/COFINS a LP/LR', () => {
    const hojeSN = computeHojeSide(CASO_CANONICO, { ...LP_LP, compradorRegime: 'simples' })
    expect(hojeSN.creditos).toBe(0)

    const hojeLPdeLR = computeHojeSide(CASO_CANONICO, {
      ...LP_LP,
      fornecedorRegime: 'real',
    })
    const piscofins = hojeLPdeLR.lines.find((l) => l.key === 'piscofins')
    expect(piscofins?.value).toBeLessThan(0)

    // Fornecedor LP: linha com traço + nota "cumulativo — sem aproveitamento"
    const hojeLPdeLP = computeHojeSide(CASO_CANONICO, LP_LP)
    const pcLP = hojeLPdeLP.lines.find((l) => l.key === 'piscofins')
    expect(pcLP?.value).toBe(-0)
    expect(pcLP?.formula).toContain('cumulativo')
  })

  it('IPI: revendedor nunca toma; industrial toma; ZFM mantém IPI em 2027; indústria→comércio converge com comércio', () => {
    // Indústria → Comércio revendedor: IPI é custo em 2026, zera em 2027 (convergência)
    const indCom2026 = computeCell(
      CASO_CANONICO,
      { ...LP_LP, fornecedorPerfil: 'industria' },
      CRONOGRAMA_OFICIAL[0],
    )
    const indCom2027 = computeCell(
      CASO_CANONICO,
      { ...LP_LP, fornecedorPerfil: 'industria' },
      row2027,
    )
    const comCom2027 = computeCell(CASO_CANONICO, LP_LP, row2027)
    // Em 2027 compra da indústria converge com a compra do comércio
    expect(indCom2027.exercicio.unitario).toBe(comCom2027.exercicio.unitario)
    // Em 2026 (IPI 10% sem crédito) era mais caro
    expect(indCom2026.hoje.unitario).toBeGreaterThan(comCom2026().hoje.unitario)

    // ZFM mantém IPI em 2027
    const zfm2027 = computeCell(
      CASO_CANONICO,
      { ...LP_LP, fornecedorPerfil: 'industria', zfm: true },
      row2027,
    )
    expect(zfm2027.exercicio.lines.find((l) => l.key === 'ipi')).toBeDefined()

    // Industrial comprando de indústria toma crédito do IPI (neutro)
    const indInd = computeCell(
      CASO_CANONICO,
      { ...LP_LP, fornecedorPerfil: 'industria', compradorPerfil: 'industria' },
      CRONOGRAMA_OFICIAL[0],
    )
    expect(indInd.hoje.creditos).toBeGreaterThan(0)
  })

  it('VALOR DE OURO LP×LP 2033 (Fase D — desembute total): ICMS extinto, CBS 8,8% e IBS 17,7% por fora; líquido 33.543,66 → 1.118,12/un (−3,52%)', () => {
    const row2033 = CRONOGRAMA_OFICIAL.find((r) => r.exercicio === 2033) as ScheduleRow
    expect(row2033.habilitado).toBe(true)
    const cell = computeCell(CASO_CANONICO, LP_LP, row2033)
    const ex = cell.exercicio
    expect(ex.lines.find((l) => l.key === 'icms')?.value).toBe(-0)
    expect(ex.lines.find((l) => l.key === 'icms')?.label).toContain('extinto')
    expect(ex.lines.find((l) => l.key === 'cbs')?.value).toBe(-2951.84)
    expect(ex.lines.find((l) => l.key === 'cbs')?.label).toContain('por fora')
    expect(ex.lines.find((l) => l.key === 'cbs')?.formula).toContain('(100 + 8,80 + 17,70)')
    expect(ex.lines.find((l) => l.key === 'ibs')?.value).toBe(-5937.23)
    expect(ex.lines.find((l) => l.key === 'ibs')?.label).toContain('por fora')
    expect(ex.liquido).toBe(33543.66)
    expect(ex.unitario).toBe(1118.12)
    expect(cell.deltaPct).toBe(-3.52)
    // O último degrau é o maior da escada: +12,87/un vs 2032
    expect(ex.unitario).toBeGreaterThan(1105.25)
    // Réguas convergem em 2033 (fator ≈1): integral ≈ parcial ≈ nenhum
    const integral = computeCell(CASO_CANONICO, { ...LP_LP, repasse: 'integral' }, row2033)
    const nenhum = computeCell(CASO_CANONICO, { ...LP_LP, repasse: 'nenhum' }, row2033)
    expect(Math.abs(integral.exercicio.unitario - nenhum.exercicio.unitario)).toBeLessThan(1)
  })

  it('constantes de ouro registradas batem com a fórmula (teste de ouro da Fase A)', () => {
    expect(OURO_LPLP_2027.unitario).toBe(1095.04)
    expect(OURO_LPLP_2027.liquido).toBe(32851.22)
    expect(OURO_LPLP_2027.mercadoria).toBe(44086.83)
    expect(OURO_LPLP_2027.icms).toBe(8011.21)
    expect(OURO_LPLP_2027.cbs).toBe(3599.81)
    expect(OURO_LPLP_2027.ibs).toBe(44.46)
  })
})

function comCom2026(): ReturnType<typeof computeCell> {
  return computeCell(CASO_CANONICO, CONFIG_PADRAO, CRONOGRAMA_OFICIAL[0])
}
