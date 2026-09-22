/**
 * ============================================================================
 * MOTOR ART. 12 — CMV POR EXERCÍCIO CONFORME A LC 214/2025
 * ============================================================================
 * Reconstrução do módulo "CMV por Exercício" sob a lógica estrita do Art. 12
 * da LC 214/2025. Nada do motor anterior é fonte — apenas referência visual.
 *
 * FUNDAMENTOS (verificados no texto da lei, Planalto/normas.leg.br):
 * - Art. 12, caput: base = valor da operação.
 * - Art. 12, §1º, IV: frete cobrado pelo fornecedor INTEGRA a base.
 * - Art. 12, §2º, I: IBS/CBS não integram a própria base (por fora).
 * - Art. 12, §2º, II: IPI não integra a base (fora em TODOS os exercícios).
 * - Art. 12, §2º, V: ICMS, ISS, PIS e COFINS não integram a base —
 *   vigência EXPRESSA de 01/01/2026 a 31/12/2032 (fundamenta o 2033 pendente).
 * - Art. 47, §2º: crédito do adquirente = débito destacado no documento fiscal.
 * - Art. 344: IBS 2027–2028 = 0,1% (0,05% estadual + 0,05% municipal).
 * - Art. 347: CBS 2027–2028 = alíquota de referência − 0,1 p.p.
 * - ADCT art. 128, I–IV: ICMS/ISS a 9/10 (2029), 8/10 (2030), 7/10 (2031), 6/10 (2032).
 * - ADCT art. 129: ICMS/ISS extintos a partir de 2033.
 * - CF art. 153, §3º + LC 214 art. 454: IPI zerado a partir de 2027,
 *   ressalvados produtos com industrialização incentivada na ZFM (ADCT art. 92-B).
 * - LC 123/2006: fornecedor do Simples Nacional — nota congelada, sem destaque.
 *
 * PACTO DA HONESTIDADE: nenhuma premissa escondida. O que a lei não define
 * está marcado "pendente de definição" (2033) e vai ao relatório de chancela.
 * ============================================================================
 */

export type ExercicioKey = 2026 | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033
export type RegimeId = 'presumido' | 'real' | 'simples'
export type PerfilId = 'comercio' | 'industria'
export type RepasseMode = 'integral' | 'parcial' | 'nenhum'
export type Semaforo = 'verde' | 'ambar' | 'vermelho'
/** Validade da exclusão/efeito da linha: integral = expresso na lei; condicionada = depende de fato/prática; pendente = sem definição legal. */
export type Validade = 'integral' | 'condicionada' | 'nao_aplicavel' | 'pendente'

export interface Fundamento {
  dispositivo: string
  efeito: string
  validade: Validade
  nota?: string
}

export interface ScheduleRowArt {
  exercicio: ExercicioKey
  cbsRate: number // % CBS no exercício
  ibsRate: number // % IBS no exercício
  icmsPct: number // fração da alíquota de ICMS/ISS vigente (100 = integral)
  ipiZero: boolean // IPI zerado a partir de 2027 (ressalva ZFM tratada à parte)
  habilitado: boolean
  pendente?: string
}

/** Fração do IBS na transição = complementar à fração do ICMS (ADCT art. 128): 2029 → 1/10 de 17,7% etc. */
export const IBS_PLENO = 17.7

export const CRONOGRAMA_ART12: ScheduleRowArt[] = [
  { exercicio: 2026, cbsRate: 0.9, ibsRate: 0.1, icmsPct: 100, ipiZero: false, habilitado: true },
  { exercicio: 2027, cbsRate: 8.8, ibsRate: 0.1, icmsPct: 100, ipiZero: true, habilitado: true },
  { exercicio: 2028, cbsRate: 8.8, ibsRate: 0.1, icmsPct: 100, ipiZero: true, habilitado: true },
  { exercicio: 2029, cbsRate: 8.8, ibsRate: 1.77, icmsPct: 90, ipiZero: true, habilitado: true },
  { exercicio: 2030, cbsRate: 8.8, ibsRate: 3.54, icmsPct: 80, ipiZero: true, habilitado: true },
  { exercicio: 2031, cbsRate: 8.8, ibsRate: 5.31, icmsPct: 70, ipiZero: true, habilitado: true },
  { exercicio: 2032, cbsRate: 8.8, ibsRate: 7.08, icmsPct: 60, ipiZero: true, habilitado: true },
  {
    exercicio: 2033,
    cbsRate: 8.8,
    ibsRate: IBS_PLENO,
    icmsPct: 0,
    ipiZero: true,
    habilitado: false,
    pendente:
      'Pendente de definição: a exclusão do §2º, V (ICMS/ISS/PIS/COFINS fora da base) vigora expressamente só até 31/12/2032. A partir de 2033 a lei não define o tratamento da base na aquisição (ICMS extinto pelo ADCT art. 129) — sem cálculo até definição regulamentar.',
  },
]

export interface CmvArt12Input {
  quantity: number
  unitPrice: number
  freightValue: number
  icmsRate: number // % ICMS na mercadoria
  icmsFreightRate: number // % ICMS no frete
  ipiRate: number // % IPI (só indústria; ZFM mantém)
}

/** Caso canônico: 30 un. × R$ 1.400,00 + frete R$ 400,00; ICMS 18%; IPI 10% (só indústria). */
export const CASO_CANONICO_ART12: CmvArt12Input = {
  quantity: 30,
  unitPrice: 1400,
  freightValue: 400,
  icmsRate: 18,
  icmsFreightRate: 18,
  ipiRate: 10,
}

export interface CellConfigArt {
  fornecedorRegime: RegimeId
  fornecedorPerfil: PerfilId
  compradorRegime: RegimeId
  compradorPerfil: PerfilId
  zfm: boolean
  repasse: RepasseMode
  repassePct: number // % quando repasse = 'parcial'
}

export const CONFIG_PADRAO_ART12: CellConfigArt = {
  fornecedorRegime: 'presumido',
  fornecedorPerfil: 'comercio',
  compradorRegime: 'presumido',
  compradorPerfil: 'comercio',
  zfm: false,
  repasse: 'integral',
  repassePct: 50,
}

export interface MemoryLineArt {
  key: string
  label: string
  formula: string
  value: number // positivo = soma ao bruto; negativo = dedução/crédito
  kind: 'bruto' | 'credito' | 'debito' | 'nota'
  fundamento: Fundamento
}

export interface SideResultArt {
  lines: MemoryLineArt[]
  bruto: number
  creditos: number
  debitos: number // CBS+IBS destacados na nota (custo quando não creditáveis)
  baseLimpa: number | null
  liquido: number
  unitario: number
}

export interface CellResultArt {
  hoje: SideResultArt
  exercicio: SideResultArt
  deltaPct: number
  semaforo: Semaforo
  porque: string
}

export const r2 = (x: number): number => Math.floor(x * 100 + 0.5) / 100

const fmt = (v: number): string =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Embutimento tributário no preço de venda do fornecedor, por regime (PIS/COFINS). */
const EMBUTIDO: Record<RegimeId, number> = { presumido: 0.0365, real: 0.0925, simples: 0 }

/**
 * FATOR DE REPASSE reconstruído sobre a BASE LIMPA (derivação documentada).
 *
 * O fornecedor hoje cobra o bruto B que contém, embutidos "por dentro", o ICMS
 * (alíquota t) e o PIS/COFINS cumulativo/não cumulativo (e). O preço que preserva
 * a receita líquida dele após a mudança tributária é:
 *
 *   B·f − t_ex·B·f − e·B·f = B − t_hoje·B − e·B      (receita líquida constante)
 *   f = (1 − t_hoje − e) / (1 − t_ex)
 *
 * onde t_ex = t_hoje × fração do exercício (ADCT art. 128). Em 2026 não há
 * mudança de tributos do fornecedor (PIS/COFINS vivos, CBS teste compensável):
 * f = 1. Fornecedor SN: regime próprio, nota congelada (LC 123/2006): f = 1.
 */
export function fatorRepasseArt12(
  config: CellConfigArt,
  input: CmvArt12Input,
  row: ScheduleRowArt,
): number {
  if (config.fornecedorRegime === 'simples') return 1
  if (row.exercicio === 2026) return 1
  const t = input.icmsRate / 100
  const e = EMBUTIDO[config.fornecedorRegime]
  const tEx = t * (row.icmsPct / 100)
  const fIntegral = (1 - t - e) / (1 - tEx)
  if (config.repasse === 'integral') return fIntegral
  if (config.repasse === 'nenhum') return 1
  return 1 + (config.repassePct / 100) * (fIntegral - 1)
}

/** Lado HOJE (régua): sem Art. 12 — direito atual. Custo canônico R$ 1.158,93/un no caso LP×LP comércio. */
export function computeHojeArt12(input: CmvArt12Input, config: CellConfigArt): SideResultArt {
  const semFund: Fundamento = {
    dispositivo: '—',
    efeito: 'regra atual (baseline)',
    validade: 'nao_aplicavel',
  }
  const merc = r2(input.quantity * input.unitPrice)
  const frete = r2(input.freightValue)
  const temIpi = config.fornecedorPerfil === 'industria' && input.ipiRate > 0
  const ipiValor = temIpi ? r2(merc * (input.ipiRate / 100)) : 0
  const bruto = r2(merc + frete + ipiValor)

  const lines: MemoryLineArt[] = [
    {
      key: 'mercadoria',
      label: 'Mercadoria',
      formula: `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)}`,
      value: merc,
      kind: 'bruto',
      fundamento: semFund,
    },
    {
      key: 'frete',
      label: 'Frete',
      formula: 'valor da nota',
      value: frete,
      kind: 'bruto',
      fundamento: semFund,
    },
  ]
  if (temIpi) {
    lines.push({
      key: 'ipi',
      label: 'IPI destacado',
      formula: `${fmt(merc)} × ${fmt(input.ipiRate)}%`,
      value: ipiValor,
      kind: 'bruto',
      fundamento: semFund,
    })
  }

  const icmsMerc = r2(merc * (input.icmsRate / 100))
  const icmsFrete = r2(frete * (input.icmsFreightRate / 100))
  const fornecedorEmite = config.fornecedorRegime !== 'simples'
  const pleno = config.compradorRegime !== 'simples' && fornecedorEmite
  const creditoIcms = pleno ? r2(icmsMerc + icmsFrete) : 0
  lines.push({
    key: 'icms',
    label: '(−) ICMS destacado',
    formula: pleno
      ? `${fmt(merc)} × ${fmt(input.icmsRate)}% + ${fmt(frete)} × ${fmt(input.icmsFreightRate)}%`
      : config.compradorRegime === 'simples'
        ? 'Comprador SN — sem crédito'
        : 'NF de fornecedor SN — sem destaque',
    value: -creditoIcms,
    kind: 'credito',
    fundamento: semFund,
  })

  const basePis = r2(merc - icmsMerc + (frete - icmsFrete))
  const creditoPis = config.fornecedorRegime === 'real' && pleno ? r2(basePis * 0.0925) : 0
  lines.push({
    key: 'piscofins',
    label: '(−) Crédito PIS/COFINS',
    formula:
      config.fornecedorRegime === 'real'
        ? pleno
          ? `${fmt(basePis)} × 9,25% (base sem ICMS)`
          : 'Comprador SN — sem crédito'
        : config.fornecedorRegime === 'presumido'
          ? 'cumulativo — sem aproveitamento'
          : 'fornecedor SN — sem destaque',
    value: -creditoPis,
    kind: 'credito',
    fundamento: semFund,
  })

  const tomaIpi = temIpi && config.compradorPerfil === 'industria'
  lines.push({
    key: 'creditoipi',
    label: '(−) Crédito IPI',
    formula: tomaIpi
      ? `${fmt(ipiValor)} (industrial — crédito integral)`
      : temIpi
        ? 'revendedor não credita IPI'
        : 'operação sem IPI',
    value: -(tomaIpi ? ipiValor : 0),
    kind: 'credito',
    fundamento: semFund,
  })

  const creditos = r2(creditoIcms + creditoPis + (tomaIpi ? ipiValor : 0))
  const liquido = r2(bruto - creditos)
  return {
    lines,
    bruto,
    creditos,
    debitos: 0,
    baseLimpa: null,
    liquido,
    unitario: r2(liquido / Math.max(1, input.quantity)),
  }
}

/** Lado EXERCÍCIO — memória Art. 12 linha a linha (fórmula + fundamento + validade). */
export function computeExercicioArt12(
  input: CmvArt12Input,
  config: CellConfigArt,
  row: ScheduleRowArt,
): SideResultArt {
  const f = fatorRepasseArt12(config, input, row)
  const merc = r2(input.quantity * input.unitPrice * f)
  const frete = r2(input.freightValue * f)

  const fornecedorSN = config.fornecedorRegime === 'simples'
  const compradorSN = config.compradorRegime === 'simples'
  const pleno = !fornecedorSN && !compradorSN

  // IPI: fora da base em todos (§2º, II); zerado 2027+ (CF 153 §3º + art. 454); ZFM mantém (ADCT 92-B)
  const ipiEfetivo =
    config.fornecedorPerfil === 'industria'
      ? row.ipiZero
        ? config.zfm
          ? input.ipiRate
          : 0
        : input.ipiRate
      : 0
  const temIpi = ipiEfetivo > 0
  const ipiValor = temIpi ? r2(merc * (ipiEfetivo / 100)) : 0
  const bruto = r2(merc + frete + ipiValor)

  const lines: MemoryLineArt[] = []

  // 1) Mercadoria — valor da operação (caput), com fator de repasse sobre base limpa
  lines.push({
    key: 'mercadoria',
    label: 'Mercadoria (com repasse)',
    formula:
      f === 1
        ? `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)} — bruto congelado`
        : `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)} × ${fmt(f)} — fator sobre base limpa: (1−ICMS−embutido)÷(1−ICMS×${fmt(row.icmsPct)}%)`,
    value: merc,
    kind: 'bruto',
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, caput',
      efeito: 'valor da operação compõe a base',
      validade: f === 1 ? 'condicionada' : 'condicionada',
      nota:
        f === 1
          ? config.fornecedorRegime === 'simples'
            ? 'Fornecedor SN — nota congelada (LC 123/2006).'
            : '2026: tributos do fornecedor inalterados — repasse nulo.'
          : 'Repasse depende da prática de mercado — validade condicionada à negociação.',
    },
  })

  // 2) Frete — INTEGRA a base (§1º, IV)
  lines.push({
    key: 'frete',
    label: 'Frete',
    formula: f === 1 ? 'valor da nota' : `${fmt(input.freightValue)} × ${fmt(f)} (repasse)`,
    value: frete,
    kind: 'bruto',
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, §1º, IV',
      efeito: 'transporte cobrado pelo fornecedor INTEGRA a base',
      validade: 'integral',
    },
  })

  // 3) IPI destacado (indústria) / zerado / ZFM
  if (config.fornecedorPerfil === 'industria') {
    if (temIpi && !row.ipiZero) {
      lines.push({
        key: 'ipi',
        label: 'IPI destacado',
        formula: `${fmt(merc)} × ${fmt(ipiEfetivo)}%`,
        value: ipiValor,
        kind: 'bruto',
        fundamento: {
          dispositivo: 'CF, art. 153, §3º (EC 132/2023)',
          efeito: 'IPI vigente em 2026 — fora da base do IBS/CBS',
          validade: 'integral',
          nota: 'Exclusão expressa: LC 214/2025, art. 12, §2º, II (vale em todos os exercícios).',
        },
      })
    } else if (temIpi && config.zfm) {
      lines.push({
        key: 'ipi',
        label: 'IPI destacado (ZFM mantém)',
        formula: `${fmt(merc)} × ${fmt(ipiEfetivo)}%`,
        value: ipiValor,
        kind: 'bruto',
        fundamento: {
          dispositivo: 'ADCT, art. 92-B (EC 132/2023)',
          efeito: 'diferencial competitivo da ZFM preservado — IPI mantido',
          validade: 'condicionada',
          nota: 'Ressalva à zerada geral de 2027 (CF, art. 153, §3º; LC 214/2025, art. 454).',
        },
      })
    } else {
      lines.push({
        key: 'ipi',
        label: 'IPI — zerado neste exercício',
        formula: 'sem destaque na nota',
        value: 0,
        kind: 'nota',
        fundamento: {
          dispositivo: 'CF, art. 153, §3º + LC 214/2025, art. 454',
          efeito: 'alíquotas do IPI reduzidas a zero a partir de 2027',
          validade: 'integral',
          nota: 'Fora da base em qualquer hipótese: art. 12, §2º, II. Crédito só ao industrial.',
        },
      })
    }
  }

  // 4) ICMS destacado — crédito do adquirente enquanto vigente (fração ADCT 128)
  const icmsDest = r2((merc + frete) * (input.icmsRate / 100) * (row.icmsPct / 100))
  const creditoIcms = pleno ? icmsDest : 0
  lines.push({
    key: 'icms',
    label:
      row.icmsPct === 100
        ? '(−) ICMS destacado (alíquota integral)'
        : `(−) ICMS destacado (${fmt(row.icmsPct)}% da alíquota)`,
    formula: pleno
      ? `(${fmt(merc)} + ${fmt(frete)}) × ${fmt(input.icmsRate)}% × ${fmt(row.icmsPct)}%`
      : compradorSN
        ? 'Comprador SN — sem crédito'
        : 'NF de fornecedor SN — sem destaque',
    value: -creditoIcms,
    kind: 'credito',
    fundamento: {
      dispositivo: 'ADCT, art. 128, I–IV (EC 132/2023)',
      efeito:
        row.icmsPct === 100
          ? 'ICMS integral até 2028 — frações começam em 2029 (9/10)'
          : `ICMS cede ${fmt(100 - row.icmsPct)}% da alíquota ao IBS neste exercício`,
      validade: 'integral',
      nota: 'Extinção em 2033: ADCT, art. 129.',
    },
  })

  // 5) PIS/COFINS — só em 2026 (extintos a partir de 2027)
  if (row.exercicio === 2026 && !fornecedorSN) {
    const icmsMerc = r2(merc * (input.icmsRate / 100))
    const icmsFrete = r2(frete * (input.icmsFreightRate / 100))
    if (config.fornecedorRegime === 'real') {
      const basePis = r2(merc - icmsMerc + (frete - icmsFrete))
      const creditoPis = pleno ? r2(basePis * 0.0925) : 0
      lines.push({
        key: 'piscofins',
        label: '(−) Crédito PIS/COFINS',
        formula: pleno ? `${fmt(basePis)} × 9,25% (base sem ICMS)` : 'Comprador SN — sem crédito',
        value: -creditoPis,
        kind: 'credito',
        fundamento: {
          dispositivo: 'LC 214/2025, art. 12, §2º, V',
          efeito: 'PIS/COFINS fora da base do IBS/CBS (vigência 2026–2032)',
          validade: 'integral',
          nota: 'Crédito na aquisição: regime não cumulativo vigente (LC 10.865/2003).',
        },
      })
    } else {
      const pisEmbutido = r2(bruto * 0.0365)
      lines.push({
        key: 'piscofins',
        label: '(−) PIS/COFINS cumulativo embutido — excluído da base',
        formula: `${fmt(bruto)} × 3,65% (montante incidente)`,
        value: -pisEmbutido,
        kind: 'credito',
        fundamento: {
          dispositivo: 'LC 214/2025, art. 12, §2º, V',
          efeito: 'tributo embutido no preço NÃO integra a base do IBS/CBS',
          validade: 'integral',
          nota: 'Regime cumulativo (LP): sem crédito, mas excluído da base — vigência 2026–2032.',
        },
      })
    }
  } else if (row.exercicio >= 2027) {
    lines.push({
      key: 'piscofins',
      label: 'PIS/COFINS — extintos',
      formula: 'sem linha de crédito ou exclusão',
      value: 0,
      kind: 'nota',
      fundamento: {
        dispositivo: 'EC 132/2023, art. 22, I',
        efeito: 'revogação do art. 195, I, "b" e IV da CF a partir de 2027',
        validade: 'integral',
      },
    })
  }

  // Base limpa
  const baseLimpa = r2(
    bruto -
      icmsDest -
      ipiValor -
      Math.max(
        0,
        ...lines.filter((l) => l.key === 'piscofins' && l.value < 0).map((l) => -l.value),
      ),
  )
  lines.push({
    key: 'baselimpa',
    label: '(=) Base limpa do IBS/CBS',
    formula: `${fmt(bruto)} − ICMS ${fmt(icmsDest)}${ipiValor ? ` − IPI ${fmt(ipiValor)}` : ''}${row.exercicio === 2026 && !fornecedorSN ? ' − PIS/COFINS' : ''}`,
    value: baseLimpa,
    kind: 'nota',
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, caput + §2º, I, II e V',
      efeito: 'base = valor da operação SEM IBS/CBS, IPI, ICMS/ISS e PIS/COFINS',
      validade: row.exercicio <= 2032 ? 'integral' : 'pendente',
      nota:
        row.exercicio <= 2032
          ? '§2º, V com vigência expressa: 01/01/2026 a 31/12/2032.'
          : '§2º, V expira em 31/12/2032 — base de 2033 sem definição.',
    },
  })

  // 6) CBS e IBS — por fora (destacadas); crédito integral na cadeia plena
  const cbsV = r2(baseLimpa * (row.cbsRate / 100))
  const ibsV = r2(baseLimpa * (row.ibsRate / 100))
  if (fornecedorSN) {
    lines.push({
      key: 'cbsibs',
      label: 'CBS/IBS — sem destaque (fornecedor SN)',
      formula: 'nota do Simples Nacional não destaca CBS/IBS',
      value: 0,
      kind: 'nota',
      fundamento: {
        dispositivo: 'LC 123/2006 (regime próprio do SN)',
        efeito: 'sem destaque → sem crédito e sem acréscimo ao custo',
        validade: 'condicionada',
        nota: 'Congelamento da nota: hipótese da cadeia SN — validar na prática de mercado.',
      },
    })
  } else {
    lines.push({
      key: 'cbs',
      label: `(+) CBS ${fmt(row.cbsRate)}% destacada (por fora)`,
      formula: `${fmt(baseLimpa)} × ${fmt(row.cbsRate)}%`,
      value: cbsV,
      kind: 'debito',
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, I',
        efeito: 'CBS não integra a própria base — incidência por fora',
        validade: 'integral',
        nota:
          row.cbsRate === 0.9
            ? 'Alíquota-teste 2026 (LC 214/2025, art. 343).'
            : 'CBS 2027–2028 = referência − 0,1 p.p. (art. 347).',
      },
    })
    lines.push({
      key: 'ibs',
      label: `(+) IBS ${fmt(row.ibsRate)}% destacado (por fora)`,
      formula: `${fmt(baseLimpa)} × ${fmt(row.ibsRate)}%`,
      value: ibsV,
      kind: 'debito',
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, I',
        efeito: 'IBS não integra a própria base — incidência por fora',
        validade: 'integral',
        nota:
          row.ibsRate === 0.1
            ? 'IBS-teste 0,1% (art. 344: 0,05% estadual + 0,05% municipal).'
            : `Fração de ${fmt(row.ibsRate)}% de ${fmt(IBS_PLENO)}% (ADCT art. 128).`,
      },
    })
    if (!compradorSN) {
      lines.push({
        key: 'creditocbs',
        label: '(−) Crédito CBS',
        formula: `${fmt(cbsV)} (débito destacado na nota)`,
        value: -cbsV,
        kind: 'credito',
        fundamento: {
          dispositivo: 'LC 214/2025, art. 47, §2º',
          efeito: 'crédito do adquirente = débito destacado no documento fiscal',
          validade: 'integral',
          nota: 'Apropriação condicionada à extinção do débito da operação (art. 47, caput).',
        },
      })
      lines.push({
        key: 'creditoibs',
        label: '(−) Crédito IBS',
        formula: `${fmt(ibsV)} (débito destacado na nota)`,
        value: -ibsV,
        kind: 'credito',
        fundamento: {
          dispositivo: 'LC 214/2025, art. 47, §2º',
          efeito: 'crédito do adquirente = débito destacado no documento fiscal',
          validade: 'integral',
        },
      })
    } else {
      lines.push({
        key: 'creditocbsibs',
        label: 'CBS/IBS — sem crédito (comprador SN)',
        formula: 'destaque vira custo integral',
        value: 0,
        kind: 'nota',
        fundamento: {
          dispositivo: 'LC 123/2006 + LC 214/2025, art. 47',
          efeito: 'optante do SN não apropria crédito do regime regular',
          validade: 'integral',
        },
      })
    }
  }

  const creditos = r2(
    lines.filter((l) => l.kind === 'credito').reduce((acc, l) => acc + -l.value, 0),
  )
  const debitos = r2(lines.filter((l) => l.kind === 'debito').reduce((acc, l) => acc + l.value, 0))
  const liquido = fornecedorSN ? bruto : pleno ? r2(bruto - creditos) : r2(bruto + debitos)
  return {
    lines,
    bruto,
    creditos,
    debitos,
    baseLimpa,
    liquido,
    unitario: r2(liquido / Math.max(1, input.quantity)),
  }
}

/** Célula completa: HOJE × exercício + delta + semáforo + porquê da variação. */
export function computeCellArt12(
  input: CmvArt12Input,
  config: CellConfigArt,
  row: ScheduleRowArt,
): CellResultArt {
  const hoje = computeHojeArt12(input, config)
  const exercicio = computeExercicioArt12(input, config, row)
  const deltaPct = hoje.unitario > 0 ? r2((exercicio.unitario / hoje.unitario - 1) * 100) : 0
  const semaforo: Semaforo = deltaPct <= -0.5 ? 'verde' : deltaPct < 0.5 ? 'ambar' : 'vermelho'

  const pleno = config.compradorRegime !== 'simples' && config.fornecedorRegime !== 'simples'
  let porque: string
  if (!row.habilitado) {
    porque = 'Pendente de definição — sem cálculo.'
  } else if (config.fornecedorRegime === 'simples') {
    porque =
      'Fornecedor SN: nota congelada (LC 123/2006), sem repasse e sem destaque. O custo do comprador muda apenas pelo lado dos créditos próprios.'
  } else if (config.compradorRegime === 'simples') {
    porque =
      'Comprador SN não credita CBS/IBS (LC 123/2006 + art. 47): o destaque destacado na nota vira custo integral.'
  } else if (config.repasse === 'integral') {
    porque =
      'Cadeia plena com crédito integral: o destaque de CBS/IBS entra no preço do fornecedor e sai no crédito do adquirente (art. 12 + art. 47) — o custo acompanha o preço líquido do fornecedor. Variação relevante só ocorre se o repasse falhar.'
  } else if (config.repasse === 'nenhum') {
    porque = `Fornecedor não repassa: o adquirente absorve a CBS/IBS sem redução equivalente do bruto — quem absorve o impacto é o COMPRADOR (custo sobe pela diferença de créditos).`
  } else {
    porque = `Repasse parcial (${fmt(config.repassePct)}%): fornecedor absorve ${fmt(100 - config.repassePct)}% do impacto na margem; comprador absorve o restante via preço.`
  }

  return { hoje, exercicio, deltaPct, semaforo, porque }
}

/** Réguas de repasse (Integral / Parcial % / Nenhum) sobre o fator reconstruído. */
export function reguasArt12(input: CmvArt12Input, config: CellConfigArt, row: ScheduleRowArt) {
  const modes: RepasseMode[] = ['integral', 'parcial', 'nenhum']
  return modes.map((mode) => {
    const cfg: CellConfigArt = { ...config, repasse: mode }
    return { mode, cell: computeCellArt12(input, cfg, row) }
  })
}

/** Matriz 3×3: comprador (linhas) × fornecedor (colunas). */
export function matrizArt12(input: CmvArt12Input, config: CellConfigArt, row: ScheduleRowArt) {
  const regimes: RegimeId[] = ['presumido', 'real', 'simples']
  return regimes.map((comprador) => ({
    comprador,
    cells: regimes.map((fornecedor) => {
      const cfg: CellConfigArt = {
        ...config,
        compradorRegime: comprador,
        fornecedorRegime: fornecedor,
      }
      return { fornecedor, cell: computeCellArt12(input, cfg, row) }
    }),
  }))
}

/** Escada do custo (régua Nenhum): quem absorve o impacto quando o fornecedor não repassa. */
export function escadaArt12(input: CmvArt12Input, config: CellConfigArt) {
  return CRONOGRAMA_ART12.filter((r) => r.exercicio >= 2026 && r.exercicio <= 2032).map((row) => {
    const cfg: CellConfigArt = { ...config, repasse: 'nenhum' }
    const cell = computeCellArt12(input, cfg, row)
    return { exercicio: row.exercicio, unitario: cell.exercicio.unitario, deltaPct: cell.deltaPct }
  })
}
