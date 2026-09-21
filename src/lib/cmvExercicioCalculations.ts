/**
 * PILAR: CMV POR EXERCÍCIO (2026–2033) — Página Reforma Tributária
 * --------------------------------------------------------------------
 * FONTE ÚNICA DE CÁLCULO do módulo (lição dos centavos: nunca duas fontes).
 * O exercício é um seletor dentro do módulo — nunca página própria.
 * Não altera nenhum motor, página, cenário ou teste existente.
 *
 * Convenções fiscais (EC 132/2023 + LC 214/2025):
 * - CBS na transição (2027–2032): cobrada "por dentro" (embutida) — crédito do
 *   adquirente LP/LR sobre o bruto: bruto × CBS/(100+CBS).
 * - IBS na transição: mesma convenção "por dentro", linha sempre exibida.
 * - ICMS integral em 2026–2028 (icmsPct = 100) e cedendo de 2029 a 2032;
 *   crédito proporcional: (ICMS merc + ICMS frete) × icmsPct/100.
 * - IPI: extinto a partir de 2027 (exceto ZFM — seletor mantém o IPI).
 * - Repasse do fornecedor (A3): Integral (remove embutimento PIS/COFINS e embute
 *   a CBS: bruto × (1+CBS)/(1+embutido)), Parcial %, Nenhum (bruto congelado).
 *   Fornecedor SN: regime próprio — nota não se altera (fator 1).
 * - Arredondamento em 2 casas em cada linha (fórmulas visíveis na UI).
 */

export type ExercicioKey = 2026 | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033
export type RegimeId = 'presumido' | 'real' | 'simples'
export type PerfilId = 'comercio' | 'industria'
export type RepasseMode = 'integral' | 'parcial' | 'nenhum'
export type Semaforo = 'verde' | 'ambar' | 'vermelho'

export interface ScheduleRow {
  exercicio: ExercicioKey
  cbsRate: number // % CBS efetiva (0,9 teste 2026; 8,8 plena de referência)
  ibsRate: number // % IBS efetiva (0,1 teste; transição = pct × 17,7%; plena 17,7)
  icmsPct: number // % de permanência do ICMS (100 = integral; 90 = cede 10%)
  ipiRate: number // % IPI padrão comércio←indústria (0 a partir de 2027, exceto ZFM)
  habilitado: boolean // Fase A: 2027 e 2028
}

export const CRONOGRAMA_OFICIAL: ScheduleRow[] = [
  { exercicio: 2026, cbsRate: 0.9, ibsRate: 0.1, icmsPct: 100, ipiRate: 10, habilitado: false },
  { exercicio: 2027, cbsRate: 8.8, ibsRate: 0.1, icmsPct: 100, ipiRate: 0, habilitado: true },
  { exercicio: 2028, cbsRate: 8.8, ibsRate: 0.1, icmsPct: 100, ipiRate: 0, habilitado: true },
  { exercicio: 2029, cbsRate: 8.8, ibsRate: 1.77, icmsPct: 90, ipiRate: 0, habilitado: false },
  { exercicio: 2030, cbsRate: 8.8, ibsRate: 3.54, icmsPct: 80, ipiRate: 0, habilitado: false },
  { exercicio: 2031, cbsRate: 8.8, ibsRate: 5.31, icmsPct: 70, ipiRate: 0, habilitado: false },
  { exercicio: 2032, cbsRate: 8.8, ibsRate: 7.08, icmsPct: 60, ipiRate: 0, habilitado: false },
  { exercicio: 2033, cbsRate: 8.8, ibsRate: 17.7, icmsPct: 0, ipiRate: 0, habilitado: false },
]

// Persistência das edições no mecanismo local já usado pelo sistema (sem backend novo)
const SCHEDULE_KEY = 'it_cmv_exercicio_schedule_v1'

export function loadSchedule(): ScheduleRow[] {
  if (typeof window === 'undefined') return CRONOGRAMA_OFICIAL
  try {
    const raw = window.localStorage.getItem(SCHEDULE_KEY)
    if (!raw) return CRONOGRAMA_OFICIAL
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return CRONOGRAMA_OFICIAL
    return CRONOGRAMA_OFICIAL.map((row) => {
      const found = parsed.find((p: ScheduleRow) => p && p.exercicio === row.exercicio)
      return found ? { ...row, ...found, habilitado: row.habilitado } : row
    })
  } catch {
    return CRONOGRAMA_OFICIAL
  }
}

export function saveSchedule(rows: ScheduleRow[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SCHEDULE_KEY, JSON.stringify(rows))
  } catch {
    // ignora — quota/privacidade
  }
}

export function resetSchedule(): ScheduleRow[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(SCHEDULE_KEY)
    } catch {
      // ignora
    }
  }
  return CRONOGRAMA_OFICIAL
}

export interface CmvExercicioInput {
  quantity: number
  unitPrice: number
  freightValue: number
  icmsRate: number // % ICMS na mercadoria
  icmsFreightRate: number // % ICMS no frete
  ipiRate: number // % IPI quando fornecedor indústria (e ZFM a partir de 2027)
}

export const CASO_CANONICO: CmvExercicioInput = {
  quantity: 30,
  unitPrice: 1400,
  freightValue: 400,
  icmsRate: 18,
  icmsFreightRate: 18,
  ipiRate: 10,
}

export interface CellConfig {
  fornecedorRegime: RegimeId
  fornecedorPerfil: PerfilId
  compradorRegime: RegimeId
  compradorPerfil: PerfilId
  zfm: boolean
  repasse: RepasseMode
  repassePct: number // % quando repasse = 'parcial'
}

export const CONFIG_PADRAO: CellConfig = {
  fornecedorRegime: 'presumido',
  fornecedorPerfil: 'comercio',
  compradorRegime: 'presumido',
  compradorPerfil: 'comercio',
  zfm: false,
  repasse: 'integral',
  repassePct: 50,
}

export interface MemoryLine {
  key: string
  label: string
  formula: string
  value: number // positivo = soma ao bruto; negativo = crédito/dedução
  kind: 'bruto' | 'credito' | 'nota'
}

export interface SideResult {
  lines: MemoryLine[]
  bruto: number
  creditos: number
  liquido: number
  unitario: number
}

export interface CellResult {
  hoje: SideResult
  exercicio: SideResult
  deltaPct: number
  semaforo: Semaforo
  alerta?: string
}

export const r2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100

const fmt = (v: number): string =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Fator de repasse do fornecedor sobre o bruto (A3). 1 = bruto congelado. */
export function repasseFactor(
  config: CellConfig,
  cbsRate: number,
  exercicio: ExercicioKey,
): number {
  if (config.fornecedorRegime === 'simples') return 1 // regime próprio — nota não se altera
  if (exercicio < 2027) return 1 // 2026: CBS teste é compensável — sem alteração de preço
  // Embutimento removido pelo fornecedor (PIS/COFINS embutidos no preço hoje)
  const embutido = config.fornecedorRegime === 'presumido' ? 0.0365 : 0.0925
  const fatorIntegral = (1 + cbsRate / 100) / (1 + embutido)
  if (config.repasse === 'integral') return fatorIntegral
  if (config.repasse === 'nenhum') return 1 // bruto congelado
  return 1 + (config.repassePct / 100) * (fatorIntegral - 1)
}

/** Lado HOJE (baseline): créditos conforme comprador × fornecedor */
export function computeHojeSide(input: CmvExercicioInput, config: CellConfig): SideResult {
  const merc = r2(input.quantity * input.unitPrice)
  const frete = r2(input.freightValue)
  const temIpi = config.fornecedorPerfil === 'industria' && input.ipiRate > 0
  const ipiValor = temIpi ? r2(merc * (input.ipiRate / 100)) : 0
  const bruto = r2(merc + frete + ipiValor)

  const lines: MemoryLine[] = [
    {
      key: 'mercadoria',
      label: 'Mercadoria',
      formula: `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)}`,
      value: merc,
      kind: 'bruto',
    },
    { key: 'frete', label: 'Frete', formula: 'valor da nota', value: frete, kind: 'bruto' },
  ]
  if (temIpi) {
    lines.push({
      key: 'ipi',
      label: 'IPI destacado',
      formula: `${fmt(merc)} × ${fmt(input.ipiRate)}%`,
      value: ipiValor,
      kind: 'bruto',
    })
  }

  // ICMS: crédito integral para comprador LP/LR quando há destaque (fornecedor LP/LR)
  const icmsMerc = r2(merc * (input.icmsRate / 100))
  const icmsFrete = r2(frete * (input.icmsFreightRate / 100))
  const fornecedorEmiteDestaque = config.fornecedorRegime !== 'simples'
  const tomaIcms = config.compradorRegime !== 'simples' && fornecedorEmiteDestaque
  const creditoIcms = tomaIcms ? r2(icmsMerc + icmsFrete) : 0
  lines.push({
    key: 'icms',
    label: '(−) ICMS destacado',
    formula: tomaIcms
      ? `${fmt(merc)} × ${fmt(input.icmsRate)}% + ${fmt(frete)} × ${fmt(input.icmsFreightRate)}%`
      : fornecedorEmiteDestaque
        ? 'Comprador SN — sem crédito'
        : 'NF de fornecedor SN — sem destaque de ICMS',
    value: -creditoIcms,
    kind: 'credito',
  })

  // PIS/COFINS: somente fornecedor LR (9,25% sobre base sem ICMS — posição B)
  const basePisCofins = r2(merc - icmsMerc + (frete - icmsFrete))
  const tomaPisCofins = config.fornecedorRegime === 'real' && config.compradorRegime !== 'simples'
  const creditoPisCofins = tomaPisCofins ? r2(basePisCofins * 0.0925) : 0
  lines.push({
    key: 'piscofins',
    label: '(−) Crédito PIS/COFINS',
    formula: tomaPisCofins
      ? `${fmt(basePisCofins)} × 9,25% (base sem ICMS)`
      : config.fornecedorRegime === 'presumido'
        ? 'cumulativo — sem aproveitamento'
        : 'fornecedor SN — sem destaque',
    value: -creditoPisCofins,
    kind: 'credito',
  })

  // IPI: crédito somente comprador industrial comprando de indústria
  const tomaIpi = temIpi && config.compradorPerfil === 'industria'
  lines.push({
    key: 'creditoipi',
    label: '(−) Crédito IPI',
    formula: tomaIpi
      ? `${fmt(ipiValor)} (industrial — crédito integral)`
      : temIpi
        ? 'revendedor nunca toma — custo sem crédito'
        : config.fornecedorPerfil === 'industria'
          ? 'IPI zero na operação'
          : 'revenda no estado — operação não sujeita a IPI',
    value: -(tomaIpi ? ipiValor : 0),
    kind: 'credito',
  })

  const creditos = r2(creditoIcms + creditoPisCofins + (tomaIpi ? ipiValor : 0))
  const liquido = r2(bruto - creditos)
  const unitario = r2(liquido / Math.max(1, input.quantity))

  return { lines, bruto, creditos, liquido, unitario }
}

/** Lado EXERCÍCIO SELECIONADO (2027+): CBS/IBS por dentro, ICMS cedendo, IPI conforme cronograma */
export function computeExercicioSide(
  input: CmvExercicioInput,
  config: CellConfig,
  row: ScheduleRow,
): SideResult {
  const f = repasseFactor(config, row.cbsRate, row.exercicio)
  const merc = r2(input.quantity * input.unitPrice * f)
  const frete = r2(input.freightValue * f)

  // IPI conforme cronograma do exercício; ZFM mantém o IPI de hoje
  const ipiEfetivo =
    config.fornecedorPerfil === 'industria' ? (config.zfm ? input.ipiRate : row.ipiRate) : 0
  const temIpi = ipiEfetivo > 0
  const ipiValor = temIpi ? r2(merc * (ipiEfetivo / 100)) : 0
  const bruto = r2(merc + frete + ipiValor)

  const lines: MemoryLine[] = [
    {
      key: 'mercadoria',
      label: 'Mercadoria (com repasse)',
      formula:
        f === 1
          ? config.fornecedorRegime === 'simples'
            ? `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)} — regime próprio, sem repasse`
            : `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)} — bruto congelado`
          : `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)} × ${fmt(f)} (repasse ${
              config.repasse === 'integral' ? 'integral' : `parcial ${fmt(config.repassePct)}%`
            })`,
      value: merc,
      kind: 'bruto',
    },
    { key: 'frete', label: 'Frete', formula: 'valor da nota', value: frete, kind: 'bruto' },
  ]
  if (temIpi) {
    lines.push({
      key: 'ipi',
      label: config.zfm ? 'IPI destacado (ZFM mantém)' : 'IPI destacado',
      formula: `${fmt(merc)} × ${fmt(ipiEfetivo)}%`,
      value: ipiValor,
      kind: 'bruto',
    })
  }

  const fornecedorEmiteDestaque = config.fornecedorRegime !== 'simples'
  const compradorCredita = config.compradorRegime !== 'simples'

  // ICMS — permanece integral em 2027/2028; cede a partir de 2029 (icmsPct)
  const icmsMerc = r2(merc * (input.icmsRate / 100))
  const icmsFrete = r2(frete * (input.icmsFreightRate / 100))
  const creditoIcms =
    compradorCredita && fornecedorEmiteDestaque
      ? r2((icmsMerc + icmsFrete) * (row.icmsPct / 100))
      : 0
  lines.push({
    key: 'icms',
    label: `(−) ICMS (${fmt(row.icmsPct)}% da alíquota)`,
    formula:
      compradorCredita && fornecedorEmiteDestaque
        ? `(${fmt(icmsMerc)} + ${fmt(icmsFrete)}) × ${fmt(row.icmsPct)}%`
        : fornecedorEmiteDestaque
          ? 'Comprador SN — sem crédito'
          : 'NF de fornecedor SN — sem destaque de ICMS',
    value: -creditoIcms,
    kind: 'credito',
  })

  // CBS "por dentro" (regra da transição): crédito = bruto × CBS/(100+CBS)
  const creditoCbs =
    compradorCredita && fornecedorEmiteDestaque
      ? r2(bruto * (row.cbsRate / (100 + row.cbsRate)))
      : 0
  lines.push({
    key: 'cbs',
    label: `(−) CBS ${fmt(row.cbsRate)}% (por dentro)`,
    formula:
      compradorCredita && fornecedorEmiteDestaque
        ? `${fmt(bruto)} × ${fmt(row.cbsRate)} ÷ (100 + ${fmt(row.cbsRate)})`
        : config.compradorRegime === 'simples'
          ? 'NF sem CBS destacada — sem crédito'
          : 'NF de fornecedor SN — sem destaque de CBS',
    value: -creditoCbs,
    kind: 'credito',
  })

  // IBS — linha explícita mesmo pequena; mesmas regras de crédito do ICMS
  const creditoIbs =
    compradorCredita && fornecedorEmiteDestaque
      ? r2(bruto * (row.ibsRate / (100 + row.ibsRate)))
      : 0
  lines.push({
    key: 'ibs',
    label: `(−) IBS ${fmt(row.ibsRate)}% (por dentro)`,
    formula:
      compradorCredita && fornecedorEmiteDestaque
        ? `${fmt(bruto)} × ${fmt(row.ibsRate)} ÷ (100 + ${fmt(row.ibsRate)})`
        : config.compradorRegime === 'simples'
          ? 'Comprador SN — sem crédito'
          : 'NF de fornecedor SN — sem destaque de IBS',
    value: -creditoIbs,
    kind: 'credito',
  })

  // IPI: crédito somente comprador industrial
  const tomaIpi = temIpi && config.compradorPerfil === 'industria'
  lines.push({
    key: 'creditoipi',
    label: '(−) Crédito IPI',
    formula: tomaIpi
      ? `${fmt(ipiValor)} (industrial — crédito integral)`
      : temIpi
        ? 'revendedor nunca toma — custo sem crédito'
        : config.fornecedorPerfil === 'industria'
          ? config.zfm
            ? 'IPI mantido (ZFM)'
            : 'IPI extinto neste exercício'
          : 'revenda no estado — operação não sujeita a IPI',
    value: -(tomaIpi ? ipiValor : 0),
    kind: 'credito',
  })

  const creditos = r2(creditoIcms + creditoCbs + creditoIbs + (tomaIpi ? ipiValor : 0))
  const liquido = r2(bruto - creditos)
  const unitario = r2(liquido / Math.max(1, input.quantity))

  return { lines, bruto, creditos, liquido, unitario }
}

/** Célula completa: HOJE × exercício + delta + semáforo */
export function computeCell(
  input: CmvExercicioInput,
  config: CellConfig,
  row: ScheduleRow,
): CellResult {
  const hoje = computeHojeSide(input, config)
  const exercicio = computeExercicioSide(input, config, row)
  const deltaPct = hoje.unitario > 0 ? r2((exercicio.unitario / hoje.unitario - 1) * 100) : 0
  const semaforo: Semaforo = deltaPct <= -0.5 ? 'verde' : deltaPct < 0.5 ? 'ambar' : 'vermelho'

  let alerta: string | undefined
  if (config.compradorRegime === 'simples' && deltaPct >= 0.5) {
    alerta = 'Nota maior sem crédito: custo sobe'
  }

  return { hoje, exercicio, deltaPct, semaforo, alerta }
}

/**
 * VALORES DE OURO — derivados da fórmula A2.7 da spec aplicada ao caso canônico
 * (30 un. × R$ 1.400,00 + frete R$ 400,00, ICMS 18%, fornecedor LP comércio,
 * comprador LP comércio, repasse Integral, sem ZFM). Registrados como constante
 * para a blindagem automatizada (teste de ouro da Fase A).
 */
export const OURO_LPLP_2027 = {
  mercadoria: 44086.83,
  frete: 419.87,
  bruto: 44506.7,
  icms: 8011.21,
  cbs: 3599.81,
  ibs: 44.46,
  liquido: 32851.22,
  unitario: 1095.04,
  deltaPct: -5.51,
}

export const OURO_LPLP_2028 = OURO_LPLP_2027 // 2028 tem as mesmas alíquotas de 2027

export const OURO_REPASSE_LPLP_2027 = {
  integral: { unitario: 1095.04, deltaPct: -5.51 },
  parcial: { unitario: 1069.12, deltaPct: -7.75 },
  nenhum: { unitario: 1043.21, deltaPct: -9.99 },
}
