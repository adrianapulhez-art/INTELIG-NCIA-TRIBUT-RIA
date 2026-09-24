/**
 * ============================================================================
 * MOTOR ART. 12 — CMV POR EXERCÍCIO CONFORME A LC 214/2025 (v2)
 * Estrutura da proposta da CEO adotada em 23/09/2026 (Opção A).
 * ============================================================================
 * Mudanças v2:
 * 1. PIS/COFINS do fornecedor sobre BASE SEM ICMS (tese do século — STJ RE
 *    1.188.403; STF Tema 1098, RE 1.210.186). Coerente com a Composição dos
 *    Tributos do Markup. Substitui o 3,65%/9,25% sobre bruto do v1.
 * 2. Memória do lado Exercício em 2 BLOCOS titulados:
 *    BLOCO 1 — Formação do preço do fornecedor (até o preço da nota);
 *    BLOCO 2 — Custo da aquisição para o comprador (até o custo unitário).
 * 3. Seletor baseIcmsTransicao: 'fisco' | 'contribuinte' — a lei não define se
 *    CBS/IBS integram a base do ICMS na transição (2026–2032).
 *    Fisco: integram — ICMS por dentro sobre operação + CBS + IBS.
 *    Contribuinte: não integram (PLP 16/25). Cadeia plena fecha igual nas duas
 *    (o crédito lava o destaque); muda a nota e o custo do comprador SN.
 * 4. Erro de R$ 0,36 da proposta original corrigido (base limpa 33.498,97).
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
 * está marcado "pendente de definição" (2033; base do ICMS na transição).
 * ============================================================================
 */

export type ExercicioKey = 2026 | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033
export type RegimeId = 'presumido' | 'real' | 'simples' | 'simples_hibrido'
export type PerfilId = 'comercio' | 'industria'
export type RepasseMode = 'integral' | 'parcial' | 'nenhum'
export type Semaforo = 'verde' | 'ambar' | 'vermelho'
export type BaseIcmsTransicao = 'fisco' | 'contribuinte'
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
  /** Tese sobre a base do ICMS na transição (2026–2032): 'fisco' (padrão) ou 'contribuinte' (PLP 16/25). */
  baseIcmsTransicao: BaseIcmsTransicao
}

export const CONFIG_PADRAO_ART12: CellConfigArt = {
  fornecedorRegime: 'presumido',
  fornecedorPerfil: 'comercio',
  compradorRegime: 'presumido',
  compradorPerfil: 'comercio',
  zfm: false,
  repasse: 'integral',
  repassePct: 50,
  baseIcmsTransicao: 'fisco',
}

export interface MemoryLineArt {
  key: string
  label: string
  formula: string
  value: number // positivo = soma ao bruto; negativo = dedução/crédito
  kind: 'bruto' | 'credito' | 'debito' | 'nota'
  fundamento: Fundamento
  /** BLOCO da memória (estrutura da proposta): 1 = formação do preço do fornecedor; 2 = custo da aquisição do comprador. */
  bloco: 1 | 2
  /** Subtotal do bloco: 'preco_nota' (fim do bloco 1) ou 'custo_unitario' (fim do bloco 2). */
  subtotal?: 'preco_nota' | 'custo_unitario'
  /** Camada de auditoria (Fase A): derivação passo a passo, 6 casas, sem arredondamento intermediário. */
  passos?: DerivaPasso[]
}

/** Um passo de derivação: conta explícita com precisão de 6 casas e origem legal/técnica. */
export interface DerivaPasso {
  ordem: number
  descricao: string
  expressao: string
  /** Resultado do passo em 6 casas (string pt-BR) — nunca truncado. */
  resultado: string
  /** Origem da constante ou dispositivo legal do passo. */
  fundamento?: string
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

/** Exibição de grandeza não-monetária com EXATAMENTE 6 casas (auditabilidade — nunca truncar). */
const fmt6 = (v: number): string =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })

/** Exibição de valor monetário intermediário: 6 casas + versão comercial entre parênteses. */
const fmtMoney6 = (v: number): string => `${fmt6(v)} (R$ ${fmt(v)})`

/** PIS/COFINS embutido no preço do fornecedor — ALÍQUOTA sobre BASE SEM ICMS (tese do século). */
const EMBUTIDO: Record<RegimeId, number> = {
  presumido: 0.0365,
  real: 0.0925,
  simples: 0,
  simples_hibrido: 0,
}
export const EMBUTIDO_LABEL: Record<RegimeId, string> = {
  presumido: '3,65% (cumulativo — LP)',
  real: '9,25% (não cumulativo — LR)',
  simples: '— (SN)',
  simples_hibrido: '— (SN híbrido — IBS/CBS por fora)',
}

/**
 * FATOR DE REPASSE (v2 — tese do século na base do PIS/COFINS).
 *
 * O fornecedor hoje cobra o bruto B que contém, embutidos "por dentro", o ICMS
 * (alíquota t) e o PIS/COFINS (e) incidentes sobre a BASE SEM ICMS — tese do
 * século (STJ RE 1.188.403; STF Tema 1098). Receita líquida dele HOJE:
 *
 *   B − t·B − e·(B − t·B) = B·(1 − t)·(1 − e)
 *
 * No exercício (≥ 2027) PIS/COFINS estão extintos (EC 132, art. 22, I) e a CBS
 * entra por fora (art. 12, §2º, I). Preservando a receita líquida:
 *
 *   B·f·(1 − t_ex) = B·(1 − t)·(1 − e)
 *   f = (1 − t)·(1 − e) / (1 − t_ex)
 *
 * onde t_ex = t × fração do exercício (ADCT art. 128). Em 2026 não há mudança
 * de tributos do fornecedor: f = 1. Fornecedor SN: nota congelada: f = 1.
 *
 * A tese do FISCO (CBS/IBS dentro da base do ICMS) atua no DESEMBUTE da nota
 * (preço da nota = (base+CBS+IBS)÷(1−t_ex)), não no fator — a receita líquida
 * alvo do fornecedor é a mesma nas duas teses.
 */
export function fatorRepasseArt12(
  config: CellConfigArt,
  input: CmvArt12Input,
  row: ScheduleRowArt,
): number {
  if (config.fornecedorRegime === 'simples' || config.fornecedorRegime === 'simples_hibrido')
    return 1
  if (row.exercicio === 2026) return 1
  const t = input.icmsRate / 100
  const e = EMBUTIDO[config.fornecedorRegime]
  const tEx = t * (row.icmsPct / 100)
  const fIntegral = ((1 - t) * (1 - e)) / (1 - tEx)
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
      bloco: 1,
      fundamento: semFund,
    },
    {
      key: 'frete',
      label: 'Frete',
      formula: 'valor da nota',
      value: frete,
      kind: 'bruto',
      bloco: 1,
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
      bloco: 1,
      fundamento: semFund,
    })
  }

  const icmsMerc = r2(merc * (input.icmsRate / 100))
  const icmsFrete = r2(frete * (input.icmsFreightRate / 100))
  // HOJE não conhece o híbrido (opção a partir de 2027): fornecedor SN-híbrido = SN padrão;
  // comprador SN-híbrido = SN padrão (sem créditos hoje).
  const fornecedorEmite =
    config.fornecedorRegime !== 'simples' && config.fornecedorRegime !== 'simples_hibrido'
  const pleno =
    config.compradorRegime !== 'simples' &&
    config.compradorRegime !== 'simples_hibrido' &&
    fornecedorEmite
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
    bloco: 2,
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
          ? `${fmt(basePis)} × 9,25% (base sem ICMS — tese do século)`
          : 'Comprador SN — sem crédito'
        : config.fornecedorRegime === 'presumido'
          ? 'cumulativo — sem aproveitamento'
          : 'fornecedor SN — sem destaque',
    value: -creditoPis,
    kind: 'credito',
    bloco: 2,
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
    bloco: 2,
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

/** Lado EXERCÍCIO — memória Art. 12 em 2 BLOCOS (estrutura da proposta da CEO). */
export function computeExercicioArt12(
  input: CmvArt12Input,
  config: CellConfigArt,
  row: ScheduleRowArt,
): SideResultArt {
  const f = fatorRepasseArt12(config, input, row)
  const merc = r2(input.quantity * input.unitPrice * f)
  const frete = r2(input.freightValue * f)

  const fornecedorSN = config.fornecedorRegime === 'simples'
  const fornecedorSNHib = config.fornecedorRegime === 'simples_hibrido'
  const compradorSN = config.compradorRegime === 'simples'
  const compradorSNHib = config.compradorRegime === 'simples_hibrido'
  const pleno = !fornecedorSN && !fornecedorSNHib && !compradorSN && !compradorSNHib
  const leituraFisco = config.baseIcmsTransicao === 'fisco'

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

  // ==================== BLOCO 1 — FORMAÇÃO DO PREÇO DO FORNECEDOR ====================
  // 1) Mercadorias — ELEMENTO REAL (qtd × preço unitário), sem fator na exibição
  const mercReal = r2(input.quantity * input.unitPrice)
  const freteReal = r2(input.freightValue)
  lines.push({
    key: 'mercadoria',
    label: '(+) Mercadorias',
    formula: `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)}`,
    value: mercReal,
    kind: 'bruto',
    bloco: 1,
    passos: [
      {
        ordem: 1,
        descricao: 'Quantidade × preço unitário (elemento da operação — sem fator)',
        expressao: `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)}`,
        resultado: fmt(mercReal),
        fundamento: 'LC 214/2025, art. 12, caput: valor da operação.',
      },
    ],
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, caput',
      efeito: 'valor da operação compõe a base',
      validade: 'integral',
      nota:
        f === 1
          ? 'Bruto congelado neste exercício (sem reprecificação).'
          : 'Elemento da operação de hoje — a reprecificação do exercício entra no desembute do ICMS e no repasse (linhas seguintes).',
    },
  })

  // 2) Frete — INTEGRA a base (§1º, IV) — ELEMENTO REAL
  lines.push({
    key: 'frete',
    label: '(+) Frete sobre compras',
    formula: 'valor da nota',
    value: freteReal,
    kind: 'bruto',
    bloco: 1,
    passos: [
      {
        ordem: 1,
        descricao: 'Frete da aquisição (integra a base do IBS/CBS)',
        expressao: 'valor da nota',
        resultado: fmt(freteReal),
        fundamento:
          'LC 214/2025, art. 12, §1º, IV: transporte cobrado pelo fornecedor INTEGRA a base.',
      },
    ],
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
        bloco: 1,
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
        bloco: 1,
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
        bloco: 1,
        fundamento: {
          dispositivo: 'CF, art. 153, §3º + LC 214/2025, art. 454',
          efeito: 'alíquotas do IPI reduzidas a zero a partir de 2027',
          validade: 'integral',
          nota: 'Fora da base em qualquer hipótese: art. 12, §2º, II. Crédito só ao industrial.',
        },
      })
    }
  }

  // 4) ICMS sobre mercadorias / fretes — ALÍQUOTA CHEIA sobre o elemento real
  //    (estrutura de hoje — a fração do exercício entra no desembute e no crédito do bloco 2)
  const icmsMercRef = r2(mercReal * (input.icmsRate / 100))
  const icmsFreteRef = r2(freteReal * (input.icmsFreightRate / 100))
  // ICMS à fração do exercício (caminho EXATO do motor v2 chancelado — base reprecificada)
  const icmsDest = r2((merc + frete) * (input.icmsRate / 100) * (row.icmsPct / 100))
  lines.push({
    key: 'icms_merc',
    label: '(−) ICMS sobre mercadorias',
    formula: `${fmt(input.icmsRate)}% × ${fmt(mercReal)} = ${fmt(icmsMercRef)}`,
    value: -icmsMercRef,
    kind: 'nota',
    bloco: 1,
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, §2º, V + ADCT, art. 128, I–IV',
      efeito: 'ICMS fora da base do IBS/CBS — alíquota cheia da estrutura de hoje',
      validade: 'integral',
      nota:
        row.icmsPct === 100
          ? 'ICMS integral até 2028 — frações começam em 2029 (9/10): ver desembute e crédito.'
          : `ICMS cede ${fmt(100 - row.icmsPct)}% da alíquota ao IBS neste exercício — fração no desembute (÷) e no crédito do bloco 2.`,
    },
  })
  lines.push({
    key: 'icms_frete',
    label: '(−) ICMS sobre fretes',
    formula: `${fmt(input.icmsFreightRate)}% × ${fmt(freteReal)} = ${fmt(icmsFreteRef)}`,
    value: -icmsFreteRef,
    kind: 'nota',
    bloco: 1,
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, §2º, V + §1º, IV',
      efeito: 'ICMS sobre o frete (que integra a base) — fora da base do IBS/CBS',
      validade: 'integral',
    },
  })

  // 5) PIS e COFINS embutidos no preço de hoje — separados, sobre BASE SEM ICMS (tese do século)
  const PIS_RATE: Record<RegimeId, number> = {
    presumido: 0.0065,
    real: 0.0165,
    simples: 0,
    simples_hibrido: 0,
  }
  const COFINS_RATE: Record<RegimeId, number> = {
    presumido: 0.03,
    real: 0.076,
    simples: 0,
    simples_hibrido: 0,
  }
  const baseSemIcmsRef = r2(mercReal + freteReal - icmsMercRef - icmsFreteRef)
  const pisRef = r2(baseSemIcmsRef * PIS_RATE[config.fornecedorRegime])
  const cofinsRef = r2(baseSemIcmsRef * COFINS_RATE[config.fornecedorRegime])
  const mostraPisCofins = !fornecedorSN
  if (mostraPisCofins) {
    const rotuloExercicio =
      row.exercicio === 2026
        ? 'embutido no preço'
        : 'embutido no preço de hoje — extinto no exercício (referência da base)'
    lines.push({
      key: 'pis',
      label: `(−) PIS ${rotuloExercicio}`,
      formula: `${fmt(PIS_RATE[config.fornecedorRegime] * 100)}% × ${fmt(baseSemIcmsRef)} = ${fmt(pisRef)}`,
      value: -pisRef,
      kind: 'nota',
      bloco: 1,
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, V + STJ RE 1.188.403 (Tema 1098 STF)',
        efeito: 'PIS embutido no preço NÃO integra a base do IBS/CBS',
        validade: 'integral',
        nota:
          row.exercicio === 2026
            ? 'Base sem ICMS: tese do século, sedimentada no sistema.'
            : 'Extinto a partir de 2027 (EC 132/2023, art. 22, I) — a reprecificação preserva a base líquida de referência.',
      },
    })
    lines.push({
      key: 'cofins',
      label: `(−) COFINS ${rotuloExercicio}`,
      formula: `${fmt(COFINS_RATE[config.fornecedorRegime] * 100)}% × ${fmt(baseSemIcmsRef)} = ${fmt(cofinsRef)}`,
      value: -cofinsRef,
      kind: 'nota',
      bloco: 1,
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, V + STJ RE 1.188.403 (Tema 1098 STF)',
        efeito: 'COFINS embutida no preço NÃO integra a base do IBS/CBS',
        validade: 'integral',
        nota:
          row.exercicio === 2026
            ? 'Base sem ICMS: tese do século, sedimentada no sistema.'
            : 'Extinta a partir de 2027 (EC 132/2023, art. 22, I) — a reprecificação preserva a base líquida de referência.',
      },
    })
  }

  // 5c) Base limpa do fornecedor (alvo do IBS/CBS) — caminho EXATO do motor v2 chancelado:
  //     bruto reprecificado − ICMS à fração − IPI − PIS/COFINS (invariante da cadeia plena).
  //     A exibição é por ELEMENTOS (linhas acima); o fator f permanece internamente no cálculo.
  const exclusoesPisCofins = r2(
    lines
      .filter(
        (l) => (l.key === 'pis' || l.key === 'cofins') && l.value < 0 && row.exercicio === 2026,
      )
      .reduce((acc, l) => acc + -l.value, 0),
  )
  const baseLimpa = r2(bruto - icmsDest - ipiValor - exclusoesPisCofins)

  // 5b) Repasse — a diferença entre a referência de hoje e a base do exercício, explicada como ELEMENTO
  //     (f continua no motor para o cálculo; aqui só a leitura por elementos)
  const baseReferencia = r2(baseSemIcmsRef - pisRef - cofinsRef)
  const ganhoNaoRepassado = row.exercicio >= 2027 ? r2(baseLimpa - baseReferencia) : 0
  if (ganhoNaoRepassado > 0) {
    lines.push({
      key: 'ganho',
      label:
        config.repasse === 'nenhum'
          ? '(+) Sem repasse: ganho do fornecedor fica no preço (ICMS à fração + PIS/COFINS extintos)'
          : `(+) Repasse parcial (${fmt(config.repassePct)}%): parte do ganho fica no preço`,
      formula: `${fmt(baseLimpa)} (base do exercício) − ${fmt(baseReferencia)} (referência de hoje)`,
      value: ganhoNaoRepassado,
      kind: 'debito',
      bloco: 1,
      fundamento: {
        dispositivo: 'Repasse: prática de mercado (sem obrigação na LC 214/2025)',
        efeito:
          config.repasse === 'nenhum'
            ? 'fornecedor não reprecifica: a extinção de PIS/COFINS e a fração do ICMS elevam a base dele — quem absorve é o COMPRADOR'
            : 'reprecificação parcial: o ganho se divide entre margem do fornecedor e custo do comprador',
        validade: 'condicionada',
        nota: 'Depende da negociação — validade condicionada à prática de mercado.',
      },
    })
  }

  // Base limpa do fornecedor (alvo do IBS/CBS) — soma dos elementos exibidos
  lines.push({
    key: 'baselimpa',
    label:
      ganhoNaoRepassado > 0
        ? '(=) Base limpa do fornecedor no exercício'
        : '(=) Base limpa de referência',
    formula: `${fmt(mercReal)} + ${fmt(freteReal)} − ICMS ${fmt(r2(icmsMercRef + icmsFreteRef))}${mostraPisCofins ? ` − PIS/COFINS ${fmt(r2(pisRef + cofinsRef))}` : ''}${ganhoNaoRepassado > 0 ? ` + ganho ${fmt(ganhoNaoRepassado)}` : ''}`,
    value: baseLimpa,
    kind: 'nota',
    bloco: 1,
    passos: [
      {
        ordem: 1,
        descricao: 'Elementos da operação (reais)',
        expressao: `${fmt(mercReal)} + ${fmt(freteReal)}`,
        resultado: fmt(r2(mercReal + freteReal)),
        fundamento: 'LC 214/2025, art. 12, caput + §1º, IV.',
      },
      {
        ordem: 2,
        descricao: 'Exclusão: ICMS (alíquota cheia — estrutura de hoje)',
        expressao: `${fmt(icmsMercRef)} + ${fmt(icmsFreteRef)}`,
        resultado: fmtMoney6(r2(icmsMercRef + icmsFreteRef)),
        fundamento:
          'Art. 12, §2º, V. Fração do exercício: ADCT, art. 128 — entra no desembute (÷) e no crédito (bloco 2).',
      },
      ...(mostraPisCofins
        ? [
            {
              ordem: 3,
              descricao: 'Exclusão: PIS/COFINS embutidos — sobre base sem ICMS (tese do século)',
              expressao: `${fmt(baseSemIcmsRef)} × ${fmt(EMBUTIDO[config.fornecedorRegime] * 100)}%`,
              resultado: fmtMoney6(r2(pisRef + cofinsRef)),
              fundamento: 'Art. 12, §2º, V + STJ RE 1.188.403. Vigência 2026–2032.',
            },
          ]
        : []),
      ...(ganhoNaoRepassado > 0
        ? [
            {
              ordem: 4,
              descricao:
                config.repasse === 'nenhum'
                  ? 'Sem repasse: ganho do fornecedor (ICMS à fração + PIS/COFINS extintos) permanece no preço'
                  : `Repasse parcial (${fmt(config.repassePct)}%): parte do ganho permanece no preço`,
              expressao: `${fmt(baseLimpa)} − ${fmt(baseReferencia)}`,
              resultado: fmtMoney6(ganhoNaoRepassado),
              fundamento: 'Repasse é prática de mercado — sem obrigação na lei.',
            },
          ]
        : []),
      {
        ordem: 9,
        descricao: 'Base limpa (resultado final — arredondado a 2 casas, half-up)',
        expressao: 'elementos − ICMS − PIS/COFINS + ganho (se houver)',
        resultado: fmt(baseLimpa),
        fundamento: 'Base do IBS/CBS: caput + §2º, I, II e V.',
      },
    ],
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

  // Botão único "Memória + base legal" — renderizado APÓS a base limpa (marcador de posição)
  lines.push({
    key: 'memoria_bloco1',
    label: 'MEMORIA_BLOCO1',
    formula: '',
    value: 0,
    kind: 'nota',
    bloco: 1,
  })

  // 6) CBS e IBS — por fora (destacadas); sobre a base limpa
  const cbsV = r2(baseLimpa * (row.cbsRate / 100))
  const ibsV = r2(baseLimpa * (row.ibsRate / 100))
  if (fornecedorSN || fornecedorSNHib) {
    // ---- FORNECEDOR SN (padrão OU híbrido): nota congelada (LC 123/2006) ----
    // Híbrido (LC 214/2025 art. 41 + Res. CGSN 186/2026): IBS/CBS saem do DAS e
    // são destacados POR FORA na nota — premissa IT chancelada pela CEO (23/09):
    // base do IBS/CBS = valor da operação SEM ICMS embutido (baseSemIcmsRef).
    const cbsSNHib = fornecedorSNHib ? r2(baseSemIcmsRef * (row.cbsRate / 100)) : 0
    const ibsSNHib = fornecedorSNHib ? r2(baseSemIcmsRef * (row.ibsRate / 100)) : 0
    lines.push({
      key: 'cbsibs',
      label: fornecedorSNHib
        ? '(+) CBS/IBS destacados por fora (fornecedor SN híbrido)'
        : 'CBS/IBS — sem destaque (fornecedor SN)',
      formula: fornecedorSNHib
        ? `${fmt(row.cbsRate)}% × ${fmt(baseSemIcmsRef)} = ${fmt(cbsSNHib)} + ${fmt(row.ibsRate)}% × ${fmt(baseSemIcmsRef)} = ${fmt(ibsSNHib)} — base sem ICMS (premissa IT)`
        : 'nota do Simples Nacional não destaca CBS/IBS',
      value: r2(cbsSNHib + ibsSNHib),
      kind: fornecedorSNHib ? 'debito' : 'nota',
      bloco: 1,
      fundamento: {
        dispositivo: fornecedorSNHib
          ? 'LC 214/2025, art. 41 + LC 123/2006 + Res. CGSN 186/2026'
          : 'LC 123/2006 (regime próprio do SN)',
        efeito: fornecedorSNHib
          ? 'regime regular de IBS/CBS no Simples: destaque por fora na nota — gera crédito ao adquirente'
          : 'sem destaque → sem crédito e sem acréscimo ao custo',
        validade: fornecedorSNHib ? 'condicionada' : 'condicionada',
        nota: fornecedorSNHib
          ? 'Premissa IT (chancelada pela CEO): base do IBS/CBS sem ICMS embutido — pendente de regulamentação detalhada. Demais tributos seguem no DAS.'
          : 'Congelamento da nota: hipótese da cadeia SN — validar na prática de mercado.',
      },
    })
    if (fornecedorSNHib) {
      lines.push({
        key: 'preconota_snhib',
        label: '(=) Preço da nota do fornecedor SN híbrido',
        formula: `${fmt(bruto)} + CBS/IBS ${fmt(r2(cbsSNHib + ibsSNHib))}`,
        value: r2(bruto + cbsSNHib + ibsSNHib),
        kind: 'nota',
        bloco: 1,
        subtotal: 'preco_nota',
        fundamento: {
          dispositivo: 'LC 214/2025, art. 41 + LC 123/2006',
          efeito: 'nota congelada + IBS/CBS por fora (regime regular no Simples)',
          validade: 'condicionada',
          nota: 'Premissa IT: base do IBS/CBS sem ICMS embutido.',
        },
      })
    }
    // Fornecedor SN (padrão ou híbrido): nota congelada — bloco 2 = bruto direto (+ CBS/IBS se híbrido)
    // Créditos do comprador: só IBS/CBS destacados (LC 214 art. 47) — e só quem apura no
    // regime regular (pleno ou SN híbrido). SN padrão não credita.
    const creditosSN = fornecedorSNHib && !compradorSN ? r2(cbsSNHib + ibsSNHib) : 0
    const liquidoSN = r2(bruto + cbsSNHib + ibsSNHib - creditosSN)
    return {
      lines,
      bruto: r2(bruto + cbsSNHib + ibsSNHib),
      creditos: creditosSN,
      debitos: 0,
      baseLimpa: null,
      liquido: liquidoSN,
      unitario: r2(liquidoSN / Math.max(1, input.quantity)),
    }
  }

  lines.push({
    key: 'cbs',
    label: `(+) CBS ${fmt(row.cbsRate)}% destacada (por fora)`,
    formula: `${fmt(row.cbsRate)}% × ${fmt(baseLimpa)} = ${fmt(cbsV)}`,
    value: cbsV,
    kind: 'debito',
    bloco: 1,
    passos: [
      {
        ordem: 1,
        descricao: 'Depende de: Base limpa do fornecedor',
        expressao: 'bruto − ICMS − IPI − PIS/COFINS',
        resultado: fmtMoney6(baseLimpa),
        fundamento: 'A CBS nasce da base limpa — ver memória da linha de origem.',
      },
      {
        ordem: 2,
        descricao: 'CBS por fora (destacada na nota)',
        expressao: `${fmt6(baseLimpa)} × ${fmt6(row.cbsRate / 100)}`,
        resultado: fmtMoney6(cbsV),
        fundamento: 'Art. 12, §2º, I: CBS não integra a própria base.',
      },
      {
        ordem: 3,
        descricao: 'Resultado final (arredondado a 2 casas, half-up)',
        expressao: '—',
        resultado: fmt(cbsV),
        fundamento:
          row.cbsRate === 0.9
            ? 'Alíquota-teste 2026 (art. 343).'
            : 'CBS 2027–2028 = referência − 0,1 p.p. (art. 347).',
      },
    ],
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
    formula: `${fmt(row.ibsRate)}% × ${fmt(baseLimpa)} = ${fmt(ibsV)}`,
    value: ibsV,
    kind: 'debito',
    bloco: 1,
    passos: [
      {
        ordem: 1,
        descricao: 'Depende de: Base limpa do fornecedor',
        expressao: 'bruto − ICMS − IPI − PIS/COFINS',
        resultado: fmtMoney6(baseLimpa),
        fundamento: 'O IBS nasce da base limpa — ver memória da linha de origem.',
      },
      {
        ordem: 2,
        descricao: 'IBS por fora (destacado na nota)',
        expressao: `${fmt6(baseLimpa)} × ${fmt6(row.ibsRate / 100)}`,
        resultado: fmtMoney6(ibsV),
        fundamento: 'Art. 12, §2º, I: IBS não integra a própria base.',
      },
      {
        ordem: 3,
        descricao: 'Resultado final (arredondado a 2 casas, half-up)',
        expressao: '—',
        resultado: fmt(ibsV),
        fundamento:
          row.ibsRate === 0.1
            ? 'IBS-teste 0,1% (art. 344: 0,05% estadual + 0,05% municipal).'
            : `Fração de ${fmt(row.ibsRate)}% de ${fmt(17.7)}% (ADCT art. 128).`,
      },
    ],
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

  // 7) PENDÊNCIA — base do ICMS na transição: preço da nota do fornecedor
  // Tese do Fisco: ICMS por dentro sobre operação + CBS + IBS → nota = (base+CBS+IBS)/(1−t_ex)
  // Tese do Contribuinte: ICMS sobre a operação sem CBS/IBS → nota = base/(1−t_ex) + CBS + IBS
  let precoNota: number
  let icmsNota: number
  if (row.exercicio === 2026) {
    // 2026: tributos do fornecedor inalterados — SEM reprecificação (f=1).
    // A nota é a de hoje + CBS/IBS-teste destacadas por fora (compensáveis — art. 343/344).
    precoNota = r2(merc + frete + cbsV + ibsV)
    icmsNota = r2((merc + frete) * (input.icmsRate / 100) * (row.icmsPct / 100))
  } else if (leituraFisco) {
    const baseRecomposta = r2(baseLimpa + cbsV + ibsV)
    precoNota = r2(baseRecomposta / (1 - (input.icmsRate / 100) * (row.icmsPct / 100)))
    icmsNota = r2(precoNota * (input.icmsRate / 100) * (row.icmsPct / 100))
  } else {
    const valorOperacao = r2(baseLimpa / (1 - (input.icmsRate / 100) * (row.icmsPct / 100)))
    precoNota = r2(valorOperacao + cbsV + ibsV)
    icmsNota = r2(valorOperacao * (input.icmsRate / 100) * (row.icmsPct / 100))
  }
  lines.push({
    key: 'preconota',
    label:
      row.exercicio === 2026
        ? '(=) Preço da nota do fornecedor (2026: sem reprecificação)'
        : `(=) Preço da nota do fornecedor — tese do ${leituraFisco ? 'FISCO' : 'CONTRIBUINTE'}`,
    formula:
      row.exercicio === 2026
        ? `${fmt(r2(merc + frete))} + CBS ${fmt(cbsV)} + IBS ${fmt(ibsV)} — tributos do fornecedor inalterados, CBS/IBS-teste por fora`
        : leituraFisco
          ? `(${fmt(baseLimpa)} + ${fmt(cbsV)} + ${fmt(ibsV)}) ÷ (1 − ${fmt(input.icmsRate)}% × ${fmt(row.icmsPct)}%) — ICMS por dentro sobre operação + CBS + IBS`
          : `${fmt(baseLimpa)} ÷ (1 − ${fmt(input.icmsRate)}% × ${fmt(row.icmsPct)}%) + ${fmt(cbsV)} + ${fmt(ibsV)} — ICMS sobre a operação sem CBS/IBS`,
    value: precoNota,
    kind: 'nota',
    bloco: 1,
    subtotal: 'preco_nota',
    passos:
      row.exercicio === 2026
        ? [
            {
              ordem: 1,
              descricao: 'Nota de hoje (sem reprecificação — f = 1)',
              expressao: `${fmt(r2(merc + frete))}`,
              resultado: fmtMoney6(r2(merc + frete)),
              fundamento: '2026: tributos do fornecedor inalterados.',
            },
            {
              ordem: 2,
              descricao: 'CBS/IBS-teste destacadas por fora (compensáveis)',
              expressao: `${fmt(cbsV)} + ${fmt(ibsV)}`,
              resultado: fmtMoney6(r2(cbsV + ibsV)),
              fundamento: 'LC 214/2025, arts. 343 e 344: alíquotas-teste de 2026.',
            },
            {
              ordem: 3,
              descricao: 'Preço da nota do fornecedor (subtotal do bloco 1)',
              expressao: '—',
              resultado: fmt(precoNota),
              fundamento: 'Valor que chega ao comprador na nota fiscal.',
            },
          ]
        : [
            {
              ordem: 1,
              descricao: 'Depende de: Base limpa + CBS + IBS',
              expressao: `${fmt(baseLimpa)} + ${fmt(cbsV)} + ${fmt(ibsV)}`,
              resultado: fmtMoney6(r2(baseLimpa + cbsV + ibsV)),
              fundamento: 'Base recomposta do fornecedor.',
            },
            {
              ordem: 2,
              descricao: leituraFisco
                ? 'Desembute do ICMS por dentro (tese do Fisco: base inclui CBS+IBS)'
                : 'Desembute do ICMS (tese do Contribuinte: base sem CBS/IBS)',
              expressao: `÷ (1 − ${fmt6((input.icmsRate / 100) * (row.icmsPct / 100))})`,
              resultado: fmtMoney6(
                leituraFisco
                  ? precoNota
                  : r2(baseLimpa / (1 - (input.icmsRate / 100) * (row.icmsPct / 100))),
              ),
              fundamento: leituraFisco
                ? 'Tese do Fisco: CBS/IBS integram a base do ICMS na transição (lacuna normativa — pendência).'
                : 'Tese do Contribuinte: CBS/IBS fora da base do ICMS (PLP 16/25 — pendência).',
            },
            ...(leituraFisco
              ? []
              : [
                  {
                    ordem: 3,
                    descricao: 'Soma das parcelas por fora (CBS + IBS)',
                    expressao: `${fmt(r2(baseLimpa / (1 - (input.icmsRate / 100) * (row.icmsPct / 100))))} + ${fmt(cbsV)} + ${fmt(ibsV)}`,
                    resultado: fmtMoney6(precoNota),
                    fundamento: 'CBS/IBS destacadas por fora da operação.',
                  },
                ]),
            {
              ordem: leituraFisco ? 3 : 4,
              descricao: 'Preço da nota do fornecedor (subtotal do bloco 1)',
              expressao: '—',
              resultado: fmt(precoNota),
              fundamento: 'Valor que chega ao comprador na nota fiscal.',
            },
          ],
    fundamento: {
      dispositivo:
        row.exercicio === 2026
          ? 'LC 214/2025, arts. 343 e 344 (alíquotas-teste 2026)'
          : 'LC 214/2025, art. 12, caput + §2º, I (pendência: base do ICMS na transição)',
      efeito:
        row.exercicio === 2026
          ? 'CBS/IBS-teste destacadas por fora — compensáveis, sem reprecificação'
          : leituraFisco
            ? 'Tese do Fisco: CBS/IBS integram a base do ICMS — ICMS por dentro sobre operação + CBS + IBS'
            : 'Tese do Contribuinte: CBS/IBS por fora da base do ICMS (PLP 16/25)',
      validade: row.exercicio === 2026 ? 'integral' : 'pendente',
      nota:
        row.exercicio === 2026
          ? 'Alíquotas-teste: CBS 0,9% (art. 343) e IBS 0,1% (art. 344).'
          : 'A lei não define expressamente. Cadeia plena fecha igual nas duas teses; muda a nota e o custo do comprador SN.',
    },
  })
  if (ipiValor > 0) {
    lines.push({
      key: 'ipi_nota',
      label: '(+) IPI destacado na nota',
      formula: `${fmt(ipiValor)} (fora da base — art. 12, §2º, II)`,
      value: ipiValor,
      kind: 'debito',
      bloco: 1,
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, II',
        efeito: 'IPI fora da base do IBS/CBS — destacado na nota',
        validade: 'integral',
      },
    })
  }

  // ==================== BLOCO 2 — CUSTO DA AQUISIÇÃO PARA O COMPRADOR ====================
  const notaTotal = r2(precoNota + ipiValor)
  lines.push({
    key: 'bruto_nota',
    label: 'Valor bruto da nota',
    formula: ipiValor > 0 ? `${fmt(precoNota)} + IPI ${fmt(ipiValor)}` : `${fmt(precoNota)}`,
    value: notaTotal,
    kind: 'bruto',
    bloco: 2,
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, caput',
      efeito: 'valor da operação pago pelo comprador',
      validade: 'integral',
    },
  })

  // Crédito ICMS do comprador — destaque na nota (tese define o tamanho do destaque)
  // Comprador SN HÍBRIDO: IBS/CBS no regime regular, MAS ICMS/ISS/PIS/COFINS seguem
  // no DAS (LC 214 art. 41) → NÃO credita ICMS nem PIS/COFINS da nota.
  const creditoIcms = pleno ? icmsNota : 0
  lines.push({
    key: 'creditoicms',
    label: pleno
      ? '(−) Crédito ICMS destacado'
      : compradorSN
        ? '(−) ICMS destacado — sem crédito (comprador SN)'
        : compradorSNHib
          ? '(−) ICMS destacado — sem crédito (SN híbrido: ICMS segue no DAS)'
          : '(−) ICMS destacado — NF de fornecedor SN não destaca',
    formula: pleno
      ? `${fmt(precoNota)} × ${fmt(input.icmsRate)}% × ${fmt(row.icmsPct)}% (${leituraFisco ? 'tese do Fisco: base inclui CBS+IBS' : 'tese do Contribuinte: base sem CBS/IBS'})`
      : 'sem crédito',
    value: -creditoIcms,
    kind: 'credito',
    bloco: 2,
    fundamento: {
      dispositivo: 'LC 214/2025, art. 47, §2º + ADCT, art. 128',
      efeito: 'crédito do adquirente = débito destacado no documento fiscal',
      validade: 'integral',
      nota: leituraFisco
        ? 'Tese do Fisco: destaque maior (base inclui CBS+IBS) — crédito maior.'
        : 'Tese do Contribuinte: destaque sobre a operação sem CBS/IBS.',
    },
  })

  if (!compradorSN) {
    lines.push({
      key: 'creditocbs',
      label: compradorSNHib ? '(−) Crédito CBS (SN híbrido — destaque da nota)' : '(−) Crédito CBS',
      formula: compradorSNHib
        ? `${fmt(cbsV)} (débito destacado na nota do fornecedor)`
        : `${fmt(cbsV)} (débito destacado na nota)`,
      value: -cbsV,
      kind: 'credito',
      bloco: 2,
      fundamento: {
        dispositivo: 'LC 214/2025, art. 47, §2º',
        efeito: compradorSNHib
          ? 'SN híbrido apura IBS/CBS no regime regular — credita o destaque da nota'
          : 'crédito do adquirente = débito destacado no documento fiscal',
        validade: 'integral',
        nota: compradorSNHib
          ? 'Optante pelo regime regular de IBS/CBS no Simples (LC 214/2025, art. 41).'
          : 'Apropriação condicionada à extinção do débito da operação (art. 47, caput).',
      },
    })
    lines.push({
      key: 'creditoibs',
      label: compradorSNHib ? '(−) Crédito IBS (SN híbrido — destaque da nota)' : '(−) Crédito IBS',
      formula: compradorSNHib
        ? `${fmt(ibsV)} (débito destacado na nota do fornecedor)`
        : `${fmt(ibsV)} (débito destacado na nota)`,
      value: -ibsV,
      kind: 'credito',
      bloco: 2,
      fundamento: {
        dispositivo: 'LC 214/2025, art. 47, §2º',
        efeito: compradorSNHib
          ? 'SN híbrido apura IBS/CBS no regime regular — credita o destaque da nota'
          : 'crédito do adquirente = débito destacado no documento fiscal',
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
      bloco: 2,
      fundamento: {
        dispositivo: 'LC 123/2006 + LC 214/2025, art. 47',
        efeito: 'optante do SN não apropria crédito do regime regular',
        validade: 'integral',
      },
    })
  }

  // Crédito IPI do comprador industrial (IPI destacado na nota — crédito integral)
  if (ipiValor > 0 && config.compradorPerfil === 'industria') {
    lines.push({
      key: 'creditoipi',
      label: '(−) Crédito IPI (comprador industrial)',
      formula: `${fmt(ipiValor)} (crédito integral — industrial)`,
      value: -ipiValor,
      kind: 'credito',
      bloco: 2,
      fundamento: {
        dispositivo: 'LC 214/2025, art. 47, §2º + CF, art. 153, §3º',
        efeito: 'crédito do adquirente industrial = IPI destacado na nota',
        validade: 'integral',
      },
    })
  }

  // Crédito PIS/COFINS do comprador LR (2026 — fornecedor LR destaca)
  if (row.exercicio === 2026 && config.fornecedorRegime === 'real' && pleno) {
    // Base do crédito = valor da operação da nota de hoje (sem reprecificação) − ICMS destacado
    const basePisC = r2(merc + frete - icmsNota)
    const creditoPis = r2(basePisC * 0.0925)
    lines.push({
      key: 'creditopiscofins',
      label: '(−) Crédito PIS/COFINS (comprador LR)',
      formula: `${fmt(basePisC)} × 9,25% (base sem ICMS — tese do século)`,
      value: -creditoPis,
      kind: 'credito',
      bloco: 2,
      fundamento: {
        dispositivo: 'LC 10.865/2003 + STJ RE 1.188.403',
        efeito: 'crédito do adquirente LR na aquisição (regime não cumulativo)',
        validade: 'integral',
      },
    })
  }

  const creditos = r2(
    lines
      .filter((l) => l.kind === 'credito' && l.bloco === 2)
      .reduce((acc, l) => acc + -l.value, 0),
  )
  const debitos = r2(
    lines.filter((l) => l.kind === 'debito' && l.bloco === 2).reduce((acc, l) => acc + l.value, 0),
  )
  // Compras líquidas = nota − créditos (o destaque de CBS/IBS já está dentro do preço da nota)
  const comprasLiquidas = r2(notaTotal - creditos)
  lines.push({
    key: 'comprasliquidas',
    label: '(=) Compras líquidas',
    formula: `${fmt(notaTotal)} − créditos ${fmt(creditos)}`,
    value: comprasLiquidas,
    kind: 'nota',
    bloco: 2,
    subtotal: 'custo_unitario',
    passos: [
      {
        ordem: 1,
        descricao: 'Valor bruto da nota (subtotal do bloco 1)',
        expressao: '—',
        resultado: fmtMoney6(notaTotal),
        fundamento: 'Preço da nota do fornecedor (+ IPI, se houver).',
      },
      {
        ordem: 2,
        descricao:
          'Créditos do adquirente (ICMS + CBS + IBS' +
          (row.exercicio === 2026 && config.fornecedorRegime === 'real' ? ' + PIS/COFINS' : '') +
          ')',
        expressao: '—',
        resultado: fmtMoney6(creditos),
        fundamento: 'Art. 47, §2º: crédito = débito destacado. Comprador SN: sem créditos.',
      },
      {
        ordem: 3,
        descricao: 'Compras líquidas (subtotal do bloco 2)',
        expressao: '—',
        resultado: fmt(comprasLiquidas),
        fundamento: 'Custo da aquisição para o comprador.',
      },
    ],
    fundamento: {
      dispositivo: 'LC 214/2025, art. 47',
      efeito: 'custo da aquisição = nota − créditos do adquirente',
      validade: 'integral',
    },
  })

  const unitario = r2(comprasLiquidas / Math.max(1, input.quantity))
  lines.push({
    key: 'custounitario',
    label: '(÷) Custo unitário',
    formula: `${fmt(comprasLiquidas)} ÷ ${fmt(input.quantity)} un.`,
    value: unitario,
    kind: 'nota',
    bloco: 2,
    subtotal: 'custo_unitario',
    passos: [
      {
        ordem: 1,
        descricao: 'Compras líquidas ÷ quantidade',
        expressao: `${fmt(comprasLiquidas)} ÷ ${fmt(input.quantity)}`,
        resultado: fmt(unitario),
        fundamento: 'Custo unitário da aquisição no exercício.',
      },
    ],
    fundamento: {
      dispositivo: '—',
      efeito: 'custo unitário do CMV no exercício',
      validade: 'nao_aplicavel',
    },
  })

  return {
    lines,
    bruto: notaTotal,
    creditos,
    debitos,
    baseLimpa,
    liquido: comprasLiquidas,
    unitario,
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
  } else if (config.fornecedorRegime === 'simples_hibrido') {
    porque =
      'Fornecedor SN híbrido: nota congelada + IBS/CBS destacados por fora (LC 214/2025, art. 41) — o destaque gera crédito ao adquirente pleno. Premissa IT: base do IBS/CBS sem ICMS.'
  } else if (config.fornecedorRegime === 'simples') {
    porque =
      'Fornecedor SN: nota congelada (LC 123/2006), sem repasse e sem destaque. O custo do comprador muda apenas pelo lado dos créditos próprios.'
  } else if (config.compradorRegime === 'simples_hibrido') {
    porque =
      'Comprador SN híbrido: credita IBS/CBS da nota (regime regular — LC 214/2025, art. 41), mas ICMS/PIS/COFINS seguem no DAS, sem crédito.'
  } else if (config.compradorRegime === 'simples') {
    porque =
      'Comprador SN não credita CBS/IBS (LC 123/2006 + art. 47): o destaque destacado na nota vira custo integral.'
  } else if (config.repasse === 'integral') {
    porque =
      'Cadeia plena com crédito integral: o destaque de CBS/IBS entra no preço do fornecedor e sai no crédito do adquirente (art. 12 + art. 47) — o custo acompanha o preço líquido do fornecedor. Variação relevante só ocorre se o repasse falhar.'
  } else if (config.repasse === 'nenhum') {
    porque = `Fornecedor não repassa: o adquirente paga CBS/IBS sobre a base limpa sem redução equivalente do bruto — quem absorve o impacto é o COMPRADOR.`
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

/** Matriz 3×6: comprador (linhas) × fornecedor (colunas — SN ganhou a variante híbrida). */
export function matrizArt12(input: CmvArt12Input, config: CellConfigArt, row: ScheduleRowArt) {
  const regimes: RegimeId[] = ['presumido', 'real', 'simples', 'simples_hibrido']
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
