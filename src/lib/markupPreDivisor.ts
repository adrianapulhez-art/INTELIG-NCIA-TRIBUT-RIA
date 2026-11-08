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
  chave: string
  nome: string
  /** Alíquota nominal configurada (%) */
  taxaNominalPct: number
  /** Taxa efetiva sobre o PV (%) — igual à nominal quando a base é o próprio PV */
  taxaEfetivaPct: number
  /** Base de incidência da parcela, para exibição na memória de cálculo */
  baseLabel: string
  /** Categoria da dedução */
  tipo: 'tributo' | 'dv' | 'margem'
  /** Percentual da base de incidência sobre o PV (ex: 82% no caso de exclusão do ICMS de 18%) */
  basePctDoPv?: number
  /** Se o ICMS foi excluído da base desta parcela */
  icmsExcluidoDaBase?: boolean
}

export interface MarkupPreDivisorResultado {
  /** Markup divisor = 1 − Σ(parcelas % sobre PV); 0 quando a combinação não comporta preço positivo */
  divisor: number
  valido: boolean
  somaDeducoesPct: number
  parcelas: MarkupPreParcela[]
  somaTributosPct: number
  somaDvPct: number
  margemPct: number
}

export interface DecomposicaoPrecoPre {
  precoVenda: number
  custoUnitario: number
  valorTributos: number
  valorDv: number
  valorLucroMargem: number
  somaComponentes: number
  diferencaCentavos: number
  margemEfetivaPct: number
  detalheTributos: Array<{
    chave?: string
    nome: string
    valor: number
    taxaEfetivaPct: number
    taxaNominalPct?: number
    baseCalculo?: number
    icmsExcluido?: number
    baseLabel?: string
  }>
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
  /**
   * Exclusão do ICMS destacado da base do PIS e COFINS (Parecer SEI nº 14483/2021 / Tese do Século RE 574.706).
   * No Lucro Presumido e Lucro Real, o padrão é true (exclusão aplicável à operação de saída).
   * Passe explicitamente false apenas para cenários de controle em que a exclusão não se aplica.
   * No Simples Nacional, nunca se aplica (carga da venda é do DAS).
   */
  excluirIcmsBasePisCofins?: boolean
}): MarkupPreDivisorResultado {
  const num = (v: number | undefined) => (Number.isFinite(v) ? Math.max(0, v!) : 0)
  const icms = num(params.icmsRatePct)
  const das = num(params.dasEfetivoPct)
  const dv = num(params.dvRatePct)
  const margem = num(params.marginPct)
  const customs = Array.isArray(params.customTaxesPct) ? params.customTaxesPct : []

  // No Simples Nacional a exclusão não se aplica (carga tributária é do DAS).
  // No Lucro Presumido e Lucro Real, a exclusão é o padrão legal (Parecer SEI 14483/2021),
  // a menos que explicitamente desligada (false) para cenários de controle.
  const aplicarExclusao =
    params.regime !== 'simples' &&
    (params.excluirIcmsBasePisCofins !== undefined ? params.excluirIcmsBasePisCofins : true)

  const parcelas: MarkupPreParcela[] = []
  const push = (
    chave: string,
    nome: string,
    taxaNominalPct: number,
    taxaEfetivaPct: number,
    baseLabel: string,
    tipo: 'tributo' | 'dv' | 'margem',
    basePctDoPv?: number,
    icmsExcluidoDaBase?: boolean,
  ) => {
    if (taxaEfetivaPct > 0 || taxaNominalPct > 0) {
      parcelas.push({
        chave,
        nome,
        taxaNominalPct,
        taxaEfetivaPct,
        baseLabel,
        tipo,
        basePctDoPv,
        icmsExcluidoDaBase,
      })
    }
  }

  let somaTributos = 0

  if (params.regime === 'simples') {
    // Simples Nacional: NÃO aplicar fórmula de exclusão — carga pelo DAS unificado
    push(
      'das',
      'DAS (PGDAS)',
      das,
      das,
      'PV — ICMS/PIS/COFINS já integrados no DAS (PGDAS-D)',
      'tributo',
      100,
      false,
    )
    somaTributos += das
  } else {
    // ICMS destacado da operação de saída compõe a carga da venda integralmente
    push('icms', 'ICMS', icms, icms, 'PV — operação de saída', 'tributo', 100, false)
    somaTributos += icms

    // Base do PIS/COFINS = PV − ICMS destacado = PV × (1 − icms / 100)
    // Evita dupla dedução: basePctDoPv reflete exatamente a base resultante em % do PV.
    const basePctDoPv = aplicarExclusao ? Math.max(0, 100 - icms) : 100
    const fatorExclusao = basePctDoPv / 100
    const basePisCofinsLabel = aplicarExclusao
      ? `PV − ICMS destacado (${(100 - icms).toFixed(1).replace('.', ',')}% do PV - Parecer SEI nº 14483/2021)`
      : 'PV — receita bruta integral'

    if (params.regime === 'presumido') {
      const pisEfetivo = PIS_PRESUMIDO_PCT * fatorExclusao
      const cofinsEfetivo = COFINS_PRESUMIDO_PCT * fatorExclusao
      push(
        'pis',
        'PIS',
        PIS_PRESUMIDO_PCT,
        pisEfetivo,
        `${basePisCofinsLabel} (cumulativo)`,
        'tributo',
        basePctDoPv,
        aplicarExclusao,
      )
      push(
        'cofins',
        'COFINS',
        COFINS_PRESUMIDO_PCT,
        cofinsEfetivo,
        `${basePisCofinsLabel} (cumulativo)`,
        'tributo',
        basePctDoPv,
        aplicarExclusao,
      )
      somaTributos += pisEfetivo + cofinsEfetivo
    } else {
      // Lucro Real: débitos de venda com exclusão do ICMS na saída;
      // créditos de entrada já deduzem o CMV líquido das compras (sem dupla contagem).
      const pisEfetivo = PIS_REAL_PCT * fatorExclusao
      const cofinsEfetivo = COFINS_REAL_PCT * fatorExclusao
      push(
        'pis',
        'PIS',
        PIS_REAL_PCT,
        pisEfetivo,
        `${basePisCofinsLabel} (não cumulativo / débito venda)`,
        'tributo',
        basePctDoPv,
        aplicarExclusao,
      )
      push(
        'cofins',
        'COFINS',
        COFINS_REAL_PCT,
        cofinsEfetivo,
        `${basePisCofinsLabel} (não cumulativo / débito venda)`,
        'tributo',
        basePctDoPv,
        aplicarExclusao,
      )
      somaTributos += pisEfetivo + cofinsEfetivo
    }
  }

  customs.forEach((taxa, i) => {
    const t = num(taxa)
    if (t > 0) {
      push(`custom_${i + 1}`, `Tributo adicional ${i + 1}`, t, t, 'PV', 'tributo')
      somaTributos += t
    }
  })

  push('dv', 'Despesas Variáveis de Venda (Σ DV)', dv, dv, 'PV', 'dv')

  let margemAplicada = 0
  if (params.comMargem !== false) {
    margemAplicada = margem
    push('margem', 'Margem desejada', margem, margem, 'PV bruto (Lucro ÷ PV)', 'margem')
  }

  const soma = somaTributos + dv + margemAplicada
  const divisor = 1 - soma / 100
  const valido = divisor > 0.0001

  return {
    divisor: valido ? divisor : 0,
    valido,
    somaDeducoesPct: soma,
    parcelas,
    somaTributosPct: somaTributos,
    somaDvPct: dv,
    margemPct: margemAplicada,
  }
}

/**
 * PV = base ÷ markup divisor, arredondado ao centavo. Divisor zero/negativo ⇒ combinação inválida ⇒ preço 0.
 */
export function precoPeloDivisorPre(base: number, divisor: number): number {
  if (!(divisor > 0) || !(base > 0)) return 0
  return Math.round((base / divisor) * 100) / 100
}

/**
 * Decompõe o PV nas partes: Custo + Tributos + DV + Lucro = PV.
 * Garante a identidade C + T + DV + L = PV ao centavo ajustando o Lucro (sobra líquida).
 */
export function decomporPrecoVendaPre(
  precoVenda: number,
  custoUnitario: number,
  resultadoDivisor: MarkupPreDivisorResultado,
): DecomposicaoPrecoPre {
  const pv = Math.max(0, precoVenda || 0)
  const custo = Math.max(0, custoUnitario || 0)

  let valorTributos = 0
  let valorDv = 0
  const detalheTributos: DecomposicaoPrecoPre['detalheTributos'] = []

  const targetTributos = Math.round(pv * (resultadoDivisor.somaTributosPct / 100) * 100) / 100
  const targetDv = Math.round(pv * (resultadoDivisor.somaDvPct / 100) * 100) / 100

  let sumLines = 0
  for (const parcela of resultadoDivisor.parcelas) {
    if (parcela.tipo === 'tributo') {
      const v = Math.round(pv * (parcela.taxaEfetivaPct / 100) * 100) / 100
      sumLines += v

      // Base de cálculo em reais e ICMS excluído desta parcela
      const basePct = parcela.basePctDoPv !== undefined ? parcela.basePctDoPv : 100
      const baseCalculo = Math.round(pv * (basePct / 100) * 100) / 100
      const icmsExcluido = parcela.icmsExcluidoDaBase
        ? Math.round((pv - baseCalculo) * 100) / 100
        : 0

      detalheTributos.push({
        chave: parcela.chave,
        nome: parcela.nome,
        valor: v,
        taxaEfetivaPct: parcela.taxaEfetivaPct,
        taxaNominalPct: parcela.taxaNominalPct,
        baseCalculo,
        icmsExcluido,
        baseLabel: parcela.baseLabel,
      })
    }
  }

  // Conciliação de centavos entre a soma das linhas e o total sobre a carga efetiva
  const diffTributos = Math.round((targetTributos - sumLines) * 100) / 100
  if (diffTributos !== 0 && detalheTributos.length > 0) {
    let maxIdx = 0
    let maxVal = detalheTributos[0].valor
    for (let i = 1; i < detalheTributos.length; i++) {
      if (detalheTributos[i].valor > maxVal) {
        maxVal = detalheTributos[i].valor
        maxIdx = i
      }
    }
    detalheTributos[maxIdx].valor =
      Math.round((detalheTributos[maxIdx].valor + diffTributos) * 100) / 100
  }

  valorTributos = targetTributos
  valorDv = targetDv

  // Lucro é o resíduo contábil exato que fecha a identidade C + T + DV + L = PV
  const valorLucroMargem = Math.round((pv - custo - valorTributos - valorDv) * 100) / 100
  const somaComponentes =
    Math.round((custo + valorTributos + valorDv + valorLucroMargem) * 100) / 100
  const diferencaCentavos = Math.round((pv - somaComponentes) * 100) / 100
  const margemEfetivaPct = pv > 0 ? Math.round((valorLucroMargem / pv) * 10000) / 100 : 0

  return {
    precoVenda: pv,
    custoUnitario: custo,
    valorTributos,
    valorDv,
    valorLucroMargem,
    somaComponentes,
    diferencaCentavos,
    margemEfetivaPct,
    detalheTributos,
  }
}
