/**
 * Motor único do Markup Pré-Reforma — formação do preço de venda por divisor
 * aditivo sobre o preço de venda bruto (PV).
 *
 * Identidade: PV = Custo + Tributos da venda + Despesas variáveis + Lucro,
 * com Lucro = PV × Margem e cada tributo/despesa incidindo sobre o MESMO PV.
 * Logo: Markup divisor = 1 − Σ(percentuais efetivos sobre o PV) e PV = Custo ÷ divisor.
 *
 * Retificação: substitui a fórmula multiplicativa (1−a)×(1−b)×… que tratava cada
 * percentual como dedução sucessiva sobre o saldo da anterior (duas DVs de 2%
 * somavam 3,96% em vez de 4%). Aqui todas as parcelas compartilham a base PV.
 */

export type MarkupPreRegime = 'presumido' | 'real' | 'simples'

export interface MarkupPreParcela {
  nome: string
  /** Alíquota nominal configurada (%) */
  taxaNominalPct: number
  /** Taxa efetiva sobre o PV (%) — igual à nominal quando a base é o próprio PV */
  taxaEfetivaPct: number
  /** Base de incidência da parcela, para exibição na memória de cálculo */
  baseLabel: string
}

export interface MarkupPreDivisorResultado {
  /** Markup divisor = 1 − Σ(parcelas % sobre PV); 0 quando a combinação não comporta preço positivo */
  divisor: number
  valido: boolean
  somaDeducoesPct: number
  parcelas: MarkupPreParcela[]
}

// PIS 0,65% + COFINS 3,00% (Lei 9.718/98, cumulativos) — base: receita bruta (PV)
export const PIS_PRESUMIDO_PCT = 0.65
export const COFINS_PRESUMIDO_PCT = 3.0
export const PIS_COFINS_PRESUMIDO_PCT = PIS_PRESUMIDO_PCT + COFINS_PRESUMIDO_PCT // 3,65%
// PIS 1,65% + COFINS 7,60% (Leis 10.637/02 e 10.833/03, não cumulativos) — base: receita bruta (PV)
export const PIS_REAL_PCT = 1.65
export const COFINS_REAL_PCT = 7.6
export const PIS_COFINS_REAL_PCT = PIS_REAL_PCT + COFINS_REAL_PCT // 9,25%

export function calcularMarkupDivisorPre(params: {
  regime: MarkupPreRegime
  /** Alíquota de ICMS da operação de saída (% do PV) — não usado no Simples */
  icmsRatePct?: number
  /** Alíquota efetiva do DAS (PGDAS) — só Simples (% do PV; ICMS/PIS/COFINS já dentro do DAS) */
  dasEfetivoPct?: number
  /** Tributos adicionais configuráveis (% do PV) */
  customTaxesPct?: number[]
  /** Σ despesas variáveis de venda (% do PV) */
  dvRatePct?: number
  /** Margem desejada sobre o PV bruto (Lucro ÷ PV) — ignorada quando comMargem = false */
  marginPct?: number
  /** false no modo Receita Líquida (a margem não entra no divisor) */
  comMargem?: boolean
}): MarkupPreDivisorResultado {
  const num = (v: number | undefined) => (Number.isFinite(v) ? Math.max(0, v!) : 0)
  const icms = num(params.icmsRatePct)
  const das = num(params.dasEfetivoPct)
  const dv = num(params.dvRatePct)
  const margem = num(params.marginPct)
  const customs = Array.isArray(params.customTaxesPct) ? params.customTaxesPct : []

  const parcelas: MarkupPreParcela[] = []
  const push = (nome: string, taxaPct: number, baseLabel: string) => {
    if (taxaPct > 0) {
      parcelas.push({ nome, taxaNominalPct: taxaPct, taxaEfetivaPct: taxaPct, baseLabel })
    }
  }

  if (params.regime === 'simples') {
    push('DAS (PGDAS)', das, 'PV — ICMS/PIS/COFINS já integrados no DAS')
  } else {
    push('ICMS', icms, 'PV — operação de saída')
    if (params.regime === 'presumido') {
      push('PIS', PIS_PRESUMIDO_PCT, 'PV — receita bruta (cumulativo)')
      push('COFINS', COFINS_PRESUMIDO_PCT, 'PV — receita bruta (cumulativo)')
    } else {
      push('PIS', PIS_REAL_PCT, 'PV — receita bruta (não cumulativo)')
      push('COFINS', COFINS_REAL_PCT, 'PV — receita bruta (não cumulativo)')
    }
  }
  customs.forEach((taxa, i) => push(`Tributo adicional ${i + 1}`, num(taxa), 'PV'))
  push('Despesas Variáveis de Venda (Σ DV)', dv, 'PV')
  if (params.comMargem !== false) {
    push('Margem desejada', margem, 'PV bruto (Lucro ÷ PV)')
  }

  const soma = parcelas.reduce((acc, p) => acc + p.taxaEfetivaPct, 0)
  const divisor = 1 - soma / 100
  const valido = divisor > 0.0001
  return { divisor: valido ? divisor : 0, valido, somaDeducoesPct: soma, parcelas }
}

/**
 * PV = base ÷ markup divisor, arredondado ao centavo (meio a meio para cima em
 * valores positivos). Divisor zero/negativo ⇒ combinação inválida ⇒ preço 0.
 */
export function precoPeloDivisorPre(base: number, divisor: number): number {
  if (!(divisor > 0) || !(base > 0)) return 0
  return Math.round((base / divisor) * 100) / 100
}
