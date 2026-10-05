/**
 * ============================================================================
 * MOTOR FISCAL — MARKUP PÓS-REFORMA (LC 214/2025) — pedido da CEO (04/10)
 * ============================================================================
 * Página independente /demo/markup-pos — cliente do contador em 4 regimes:
 * LP · LR · SN puro · SN híbrido. Estrutura copiada da Markup pré-reforma
 * (2 modos: Custo+Margem e Preço de venda líquido), com o DIVISOR pós-reforma.
 *
 * ÁLGEBRA (chancelada na F1, derivada em Python e conferida pela CEO):
 *   LP/LR (fisco):    taxFactor = (1−t) / (1+s)          — t=ICMS, s=CBS+IBS
 *   LP/LR (contrib.): taxFactor = (1−t) / (1+s(1−t))     — PLP 16/25
 *   SN puro:          taxFactor = 1 − efetiva            — DAS por dentro (art. 23)
 *   SN híbrido:       taxFactor = (1−f) / (1+s(1−f))     — f = fração ICMS no DAS;
 *                       CBS/IBS por fora s/ base SEM o ICMS do DAS (premissa IT)
 *   Preço (nota) = base ÷ (taxFactor × (1−DV) × (1−custom) × (1−margem))
 *     modo custo+margem: base = custo · modo líquido: base = RL âncora (sem margem)
 *   RL do modo custo+margem = custo ÷ (1−margem) — a RL alvo implícita na margem
 *     (coerência entre os modos: o líquido parte da RL; o C+M a deriva do custo).
 *   RL do modo líquido = RL âncora.
 *
 * PRECISÃO (padrão da casa — prova nos prints da pré-reforma): o fator entra na
 * divisão em PRECISÃO TOTAL; o arredondamento a 6 casas é só para EXIBIÇÃO.
 * Arredondar o fator antes de dividir desloca o preço até 1 centavo (LP 2027:
 * 2.229,99 vs ouro 2.229,98 — corrigido em 05/10 a mando da CEO).
 *
 * DECOMPOSIÇÃO DA NOTA HÍBRIDA = ouro da F1 "ANTES da DV" (nota-base): o ouro
 * chancelado (V 2.045,64 + CBS 177,68 + IBS 2,02 = 2.225,33) deriva do preço
 * SEM DV. As parcelas ao centavo somam 2.225,34 (1 centavo de arredondamento,
 * documentado na blindagem com tolerância de ±0,01).
 *
 * PROVA DE CONTINUIDADE (ouro da F1): em 2026, os fatores reproduzem ao 6º
 * decimal os divisores da pré-reforma — LP 0,790070 · LR 0,744150 · SN 0,96.
 * Ouros 2027 (exemplo cama, margem 30%, DV 5%): LP 2.229,98 · LR 2.100,37 ·
 * SN 2.217,79 · híbrido 2.342,45 (nota-base 2.225,33 = V 2.045,64 + CBS 177,68 + IBS 2,02).
 * NOTA LR (05/10, CEO informada): o ouro antigo 2.100,22 exigiria custo 1.051,65,
 * incompatível com o caso canônico da Compras (30 un × R$ 1.400 + frete R$ 400 →
 * custo LR 1.051,73). Ouro corrigido para 2.100,37 — a álgebra e a RL 1.502,47
 * (= 1.051,73 ÷ 0,70) confirmam o custo 1.051,73.
 */
import { type ExercicioKey } from './art12Calculations'

export type RegimeVendedor = 'presumido' | 'real' | 'simples' | 'simples_hibrido'
export type TeseBaseIcms = 'fisco' | 'contribuinte'
export type ModoMarkup = 'custo_margem' | 'liquid'

/** Alíquotas do exercício (2027/2028: CBS editável — v0.0.341; IBS 0,1% cravado art. 344). */
export interface AliquotasExercicio {
  icms: number
  cbs: number
  ibs: number
  /** DAS efetivo do SN puro (anexo/faixa informados — art. 23, §2º). Editável na página (decisão CEO, 05/10). */
  efetivaSN: number
  /** Fração do ICMS dentro do DAS do híbrido (art. 41, §3º — informada). Editável na página. */
  icmsFracHibrido: number
}

export const ALIQUOTAS_PADRAO: Record<2026 | 2027 | 2028, AliquotasExercicio> = {
  2026: { icms: 18, cbs: 0.9, ibs: 0.1, efetivaSN: 4.0, icmsFracHibrido: 1.3 },
  2027: { icms: 18, cbs: 8.8, ibs: 0.1, efetivaSN: 4.17, icmsFracHibrido: 1.3 },
  2028: { icms: 18, cbs: 8.8, ibs: 0.1, efetivaSN: 4.17, icmsFracHibrido: 1.3 },
}

const r6 = (v: number) => Math.round(v * 1e6) / 1e6
const r2 = (v: number) => Math.round(v * 100) / 100

/**
 * Fator de venda P→RL em PRECISÃO TOTAL — usado no cálculo do preço.
 * O arredondamento a 6 casas (fatorVendaPos) é só para exibição/badge.
 */
export function fatorVendaPosFull(
  regime: RegimeVendedor,
  exercicio: 2026 | 2027 | 2028,
  a: AliquotasExercicio,
  tese: TeseBaseIcms = 'fisco',
): number | null {
  const t = a.icms / 100
  const s = (a.cbs + a.ibs) / 100
  if (regime === 'presumido' || regime === 'real') {
    if (exercicio === 2026) {
      const pc = regime === 'presumido' ? 0.0365 : 0.0925
      return (1 - t) * (1 - pc)
    }
    if (tese === 'fisco') return (1 - t) / (1 + s)
    return (1 - t) / (1 + s * (1 - t))
  }
  if (regime === 'simples') {
    return 1 - a.efetivaSN / 100
  }
  // híbrido: NÃO existe em 2026 (opção set/2026 → efeitos 01/01/2027)
  if (exercicio === 2026) return null
  const f = 1 - a.icmsFracHibrido / 100
  return f / (1 + s * f)
}

/** Fator de venda P→RL por regime × exercício × tese — arredondado a 6 casas (EXIBIÇÃO). */
export function fatorVendaPos(
  regime: RegimeVendedor,
  exercicio: 2026 | 2027 | 2028,
  a: AliquotasExercicio,
  tese: TeseBaseIcms = 'fisco',
): number | null {
  const full = fatorVendaPosFull(regime, exercicio, a, tese)
  return full === null ? null : r6(full)
}

export interface LinhaMemoriaPos {
  key: string
  label: string
  formula: string
  value: number
  destaque?: boolean
  fundamento?: string
}

export interface ResultadoMarkupPos {
  regime: RegimeVendedor
  exercicio: 2026 | 2027 | 2028
  modo: ModoMarkup
  /** Fator de venda P→RL (null = regime indisponível no exercício) — exibição (6 casas). */
  fator: number | null
  /** Divisor completo aplicado à base. */
  divisor: number
  /** Preço de venda = NOTA (RBV) — o que sai no documento fiscal. */
  preco: number
  /** RL do modo: custo+margem → custo ÷ (1−margem); líquido → RL âncora. */
  rl: number
  /** Decomposição da nota-BASE do híbrido (sem DV — ouro F1); demais: só o total. */
  decomposicaoNota: {
    valorOperacao: number
    cbsDestaque: number
    ibsDestaque: number
    notaTotal: number
  }
  memoria: LinhaMemoriaPos[]
}

export interface EntradaMarkupPos {
  /** Custo+Margem: custo unitário do item (motor Art. 12). Líquido: RL âncora. */
  base: number
  margemPct: number
  dvPct: number
  customTaxesPct: number
}

/**
 * CÁLCULO CENTRAL — memória bloco a bloco, no padrão da pré-reforma.
 * base = custo (custo+margem) ou RL âncora (líquido).
 */
export function calcularMarkupPos(
  regime: RegimeVendedor,
  exercicio: 2026 | 2027 | 2028,
  modo: ModoMarkup,
  entrada: EntradaMarkupPos,
  a: AliquotasExercicio,
  tese: TeseBaseIcms = 'fisco',
): ResultadoMarkupPos {
  const fatorFull = fatorVendaPosFull(regime, exercicio, a, tese)
  const fator = fatorFull === null ? null : r6(fatorFull)
  const memoria: LinhaMemoriaPos[] = []
  const fdv = 1 - entrada.dvPct / 100
  const fcu = entrada.customTaxesPct > 0 ? 1 - entrada.customTaxesPct / 100 : 1

  if (fatorFull === null || entrada.base <= 0) {
    return {
      regime,
      exercicio,
      modo,
      fator,
      divisor: 0,
      preco: 0,
      rl: 0,
      decomposicaoNota: { valorOperacao: 0, cbsDestaque: 0, ibsDestaque: 0, notaTotal: 0 },
      memoria,
    }
  }

  const s = (a.cbs + a.ibs) / 100
  const t = a.icms / 100

  // --- Memória do FATOR (bloco ①) ---
  if (regime === 'presumido' || regime === 'real') {
    if (exercicio === 2026) {
      const pc = regime === 'presumido' ? 3.65 : 9.25
      memoria.push({
        key: 'fator',
        label: '(i) Fator de venda P→RL',
        formula: `(1−${a.icms}%) × (1−${pc}%) = ${fator}`,
        value: fator,
        fundamento: 'PIS/COFINS sobre a base sem ICMS (STJ RE 1.188.403) — regime pré-reforma.',
      })
    } else if (tese === 'fisco') {
      memoria.push({
        key: 'fator',
        label: '(i) Fator de venda P→RL',
        formula: `(1−${a.icms}%) ÷ (1+${(s * 100).toFixed(2)}%) = ${fator}`,
        value: fator,
        fundamento:
          'LC 214/2025, art. 12, §2º, V: ICMS/ISS fora da base do IBS/CBS — ICMS por dentro, CBS/IBS por fora.',
      })
    } else {
      memoria.push({
        key: 'fator',
        label: '(i) Fator de venda P→RL',
        formula: `(1−${a.icms}%) ÷ (1+${(s * 100).toFixed(2)}%×(1−${a.icms}%)) = ${fator}`,
        value: fator,
        fundamento:
          'PLP 16/25: IBS/CBS fora da base do ICMS (tese do contribuinte — pendente de lei).',
      })
    }
  } else if (regime === 'simples') {
    memoria.push({
      key: 'fator',
      label: '(i) Fator de venda P→RL',
      formula: `1 − ${a.efetivaSN}% (DAS por dentro) = ${fator}`,
      value: fator,
      fundamento: 'LC 123/2006, art. 23, §2º: percentuais informados no documento fiscal.',
    })
  } else {
    memoria.push({
      key: 'fator',
      label: '(i) Fator de venda P→RL',
      formula: `(1−${a.icmsFracHibrido}%) ÷ (1+${(s * 100).toFixed(2)}%×(1−${a.icmsFracHibrido}%)) = ${fator}`,
      value: fator,
      fundamento:
        'LC 214/2025, art. 41: ICMS no DAS + CBS/IBS por fora s/ base sem o ICMS do DAS (premissa IT chancelada).',
    })
  }

  // --- Divisor completo (bloco ②) — fator em PRECISÃO TOTAL (padrão da casa) ---
  const semMargem = fatorFull * fdv * fcu
  const divisor = r6(
    modo === 'custo_margem' ? semMargem * (1 - entrada.margemPct / 100) : semMargem,
  )
  memoria.push({
    key: 'dv',
    label: '(×) Despesas Variáveis de Venda',
    formula: `1 − ${entrada.dvPct}% = ${r6(fdv)}`,
    value: fdv,
  })
  if (entrada.customTaxesPct > 0) {
    memoria.push({
      key: 'custom',
      label: '(×) Tributos customizados',
      formula: `1 − ${entrada.customTaxesPct}% = ${r6(fcu)}`,
      value: fcu,
    })
  }
  if (modo === 'custo_margem') {
    memoria.push({
      key: 'margem',
      label: '(×) Margem de lucro',
      formula: `1 − ${entrada.margemPct}% = ${r6(1 - entrada.margemPct / 100)}`,
      value: 1 - entrada.margemPct / 100,
    })
  }
  memoria.push({
    key: 'divisor',
    label: '(=) DIVISOR COMPLETO',
    formula:
      memoria
        .filter((l) => ['fator', 'dv', 'custom', 'margem'].includes(l.key))
        .map((l) => l.value)
        .join(' × ') + ` = ${divisor}`,
    value: divisor,
    destaque: true,
  })

  // --- Preço = NOTA (bloco ③) ---
  const preco = r2(entrada.base / divisor)
  memoria.push({
    key: 'preco',
    label:
      modo === 'custo_margem'
        ? '(÷) PREÇO DE VENDA — NOTA (RBV)'
        : '(÷) PREÇO DE VENDA — NOTA (RBV)',
    formula: `${entrada.base} ÷ ${divisor} = ${preco}`,
    value: preco,
    destaque: true,
  })

  // --- Decomposição da nota-BASE do híbrido (bloco ④ — ouro F1 "antes da DV") ---
  let decomposicaoNota = { valorOperacao: preco, cbsDestaque: 0, ibsDestaque: 0, notaTotal: preco }
  if (regime === 'simples_hibrido' && exercicio >= 2027) {
    const f = 1 - a.icmsFracHibrido / 100
    const precoSemDV = r2(
      entrada.base /
        r6(fatorFull * fcu * (modo === 'custo_margem' ? 1 - entrada.margemPct / 100 : 1)),
    )
    const V = r2(precoSemDV / (1 + s * f))
    const cbsD = r2((a.cbs / 100) * V * f)
    const ibsD = r2((a.ibs / 100) * V * f)
    decomposicaoNota = {
      valorOperacao: V,
      cbsDestaque: cbsD,
      ibsDestaque: ibsD,
      notaTotal: precoSemDV,
    }
    memoria.push({
      key: 'decomp_v',
      label: '(i) Valor da operação (sem destaque)',
      formula: `${precoSemDV} ÷ (1+${(s * 100).toFixed(2)}%×(1−${a.icmsFracHibrido}%)) = ${V}`,
      value: V,
      fundamento: 'LC 214/2025, art. 41: híbrido cobra CBS/IBS por fora.',
    })
    memoria.push({
      key: 'decomp_cbs',
      label: '(+) CBS destacada na nota',
      formula: `${a.cbs}% × ${V} × (1−${a.icmsFracHibrido}%) = ${cbsD}`,
      value: cbsD,
      fundamento: 'LC 214/2025, art. 12, §2º, V: base do IBS/CBS sem o ICMS da operação.',
    })
    memoria.push({
      key: 'decomp_ibs',
      label: '(+) IBS destacado na nota',
      formula: `${a.ibs}% × ${V} × (1−${a.icmsFracHibrido}%) = ${ibsD}`,
      value: ibsD,
    })
    memoria.push({
      key: 'decomp_total',
      label: '(=) NOTA-BASE (V + CBS + IBS — sem DV)',
      formula: `${V} + ${cbsD} + ${ibsD} = ${precoSemDV} (parcelas ao centavo podem divergir 0,01)`,
      value: precoSemDV,
      destaque: true,
      fundamento:
        'Cliente PJ credita o destaque (art. 47) — a nota maior não encarece a cadeia plena.',
    })
  }

  // --- RL do modo (bloco ⑤): C+M → custo ÷ (1−margem); líquido → RL âncora ---
  const rl =
    modo === 'custo_margem' ? r2(entrada.base / (1 - entrada.margemPct / 100)) : r2(entrada.base)
  memoria.push({
    key: 'rl',
    label: '(=) RECEITA LÍQUIDA ALVO',
    formula:
      modo === 'custo_margem'
        ? `${entrada.base} ÷ (1−${entrada.margemPct}%) = ${rl}`
        : `RL âncora informada = ${rl}`,
    value: rl,
    destaque: true,
  })

  return { regime, exercicio, modo, fator, divisor, preco, rl, decomposicaoNota, memoria }
}

/** Ouros da F1 — travados na blindagem (exemplo cama, margem 30%, DV 5%, custom 0). */
export const OUROS_F1 = {
  fatores2026: { presumido: 0.79007, real: 0.74415, simples: 0.96 },
  fatores2027: { presumido: 0.752984, real: 0.752984, simples: 0.9583, simples_hibrido: 0.9073 },
  precos2027: { presumido: 2229.98, real: 2100.37, simples: 2217.79, simples_hibrido: 2342.45 },
  notaHibrida2027: {
    valorOperacao: 2045.64,
    cbsDestaque: 177.68,
    ibsDestaque: 2.02,
    notaTotal: 2225.33,
  },
} as const
