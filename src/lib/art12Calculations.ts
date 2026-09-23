/**
 * ============================================================================
 * MOTOR ART. 12 — CMV POR EXERCÍCIO CONFORME A LC 214/2025 (v2)
 * ============================================================================
 * v2 (23/09/2026) — reestruturação aprovada pela CEO (Opção A):
 * 1. PIS/COFINS do fornecedor incidentes sobre a BASE SEM ICMS (tese do
 *    século — STJ RE 1.188.403; STF Tema 1098, RE 1.210.186). Coerente com a
 *    Composição dos Tributos do Markup.
 * 2. Memória em 2 BLOCOS TITULADOS:
 *    ① Formação do preço do fornecedor (do preço HOJE à recomposição)
 *    ② Custo da aquisição para o comprador (da nota às compras líquidas)
 * 3. Pendência parametrizada: base do ICMS na transição (CBS/IBS integram ou
 *    não a base do ICMS embutido) — leitura 'fiscos' (padrão) × 'plp16'.
 *    Cadeia plena fecha IGUAL nas duas leituras; difere no comprador SN.
 *
 * FUNDAMENTOS (verificados no texto da lei, Planalto/normas.leg.br):
 * - Art. 12, caput: base = valor da operação. §1º, IV: frete INTEGRA a base.
 * - §2º, I: IBS/CBS fora da própria base. §2º, II: IPI fora (todos os exercícios).
 * - §2º, V: ICMS/ISS/PIS/COFINS fora — vigência expressa 01/01/2026 a 31/12/2032.
 * - EC 132/2023, art. 22, I: PIS/COFINS extintos a partir de 2027.
 * - Art. 47, §2º: crédito do adquirente = débito destacado no documento fiscal.
 * - Art. 344: IBS 2027–2028 = 0,1%. Art. 347: CBS 2027–2028 = referência − 0,1 p.p.
 * - ADCT art. 128, I–IV: ICMS/ISS a 9/10 (2029) … 6/10 (2032); art. 129: extintos 2033.
 * - CF art. 153, §3º + LC 214 art. 454: IPI zerado 2027+ (ZFM: ADCT art. 92-B).
 * - LC 123/2006: fornecedor do Simples Nacional — nota congelada, sem destaque.
 *
 * PACTO DA HONESTIDADE: nenhuma premissa escondida. O que a lei não define
 * está marcado "pendente de definição" (2033; base do ICMS na transição).
 * ============================================================================
 */

export type ExercicioKey = 2026 | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033
export type RegimeId = 'presumido' | 'real' | 'simples'
export type PerfilId = 'comercio' | 'industria'
export type RepasseMode = 'integral' | 'parcial' | 'nenhum'
export type Semaforo = 'verde' | 'ambar' | 'vermelho'
export type BaseIcmsLeitura = 'fiscos' | 'plp16'
export type Validade = 'integral' | 'condicionada' | 'nao_aplicavel' | 'pendente'

export interface Fundamento {
  dispositivo: string
  efeito: string
  validade: Validade
  nota?: string
}

export interface ScheduleRowArt {
  exercicio: ExercicioKey
  cbsRate: number
  ibsRate: number
  icmsPct: number
  ipiZero: boolean
  habilitado: boolean
  pendente?: string
}

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
  icmsRate: number
  icmsFreightRate: number
  ipiRate: number
}

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
  repassePct: number
  /** PENDENTE DE DEFINIÇÃO (parametrizado): CBS/IBS integram a base do ICMS embutido na transição? */
  baseIcmsLeitura: BaseIcmsLeitura
}

export const CONFIG_PADRAO_ART12: CellConfigArt = {
  fornecedorRegime: 'presumido',
  fornecedorPerfil: 'comercio',
  compradorRegime: 'presumido',
  compradorPerfil: 'comercio',
  zfm: false,
  repasse: 'integral',
  repassePct: 50,
  baseIcmsLeitura: 'fiscos',
}

export interface MemoryLineArt {
  key: string
  label: string
  formula: string
  value: number
  kind: 'bruto' | 'credito' | 'debito' | 'nota' | 'subtotal'
  /** Bloco da memória em 2 atos (v2). */
  bloco?: 'fornecedor' | 'comprador'
  fundamento: Fundamento
  passos?: DerivaPasso[]
}

export interface DerivaPasso {
  ordem: number
  descricao: string
  expressao: string
  resultado: string
  fundamento?: string
}

export interface SideResultArt {
  lines: MemoryLineArt[]
  bruto: number
  creditos: number
  debitos: number
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

const fmt6 = (v: number): string =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })

const fmtMoney6 = (v: number): string => `${fmt6(v)} (R$ ${fmt(v)})`

/** PIS/COFINS embutidos no preço do fornecedor — sobre a BASE SEM ICMS (tese do século). */
const EMBUTIDO: Record<RegimeId, number> = { presumido: 0.0365, real: 0.0925, simples: 0 }

/** Lado HOJE (régua): sem Art. 12 — direito atual. Custo canônico R$ 1.158,93/un (LP×LP comércio). */
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

  // Tese do século: base do PIS/COFINS EXCLUI o ICMS destacado (STJ RE 1.188.403; STF Tema 1098)
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

/** Passos do Ato 1 — formação do preço do fornecedor (6 casas, sem arredondamento intermediário). */
function buildPassosPreco(
  config: CellConfigArt,
  row: ScheduleRowArt,
  baseOper: number,
  icmsHoje: number,
  pisCofinsHoje: number,
  baseLimpaHoje: number,
  tEx: number,
  V: number,
  modo: string,
): DerivaPasso[] {
  const leitura = config.baseIcmsLeitura || 'fiscos'
  const cbsRate = row.cbsRate / 100
  const ibsRate = row.ibsRate / 100
  const e = EMBUTIDO[config.fornecedorRegime]
  const baseSemIcmsHoje = r2(baseOper - icmsHoje)
  const cbsIbsTotal = r2(baseLimpaHoje * (cbsRate + ibsRate))
  const passos: DerivaPasso[] = [
    {
      ordem: 1,
      descricao: 'Base sem ICMS do preço HOJE',
      expressao: `${fmt(baseOper)} − ${fmt(icmsHoje)}`,
      resultado: fmtMoney6(baseSemIcmsHoje),
      fundamento: 'ICMS embutido no preço HOJE (por dentro): preço × alíquota.',
    },
    {
      ordem: 2,
      descricao: 'PIS/COFINS embutidos no preço HOJE (sobre a base SEM ICMS — tese do século)',
      expressao: `${fmt6(baseSemIcmsHoje)} × ${fmt6(e)}`,
      resultado: fmtMoney6(pisCofinsHoje),
      fundamento:
        'STJ RE 1.188.403 + STF Tema 1098 (RE 1.210.186): ICMS destacado NÃO integra a base do PIS/COFINS. LP 3,65% (cumulativo) · LR 9,25% (não cumulativo).',
    },
    {
      ordem: 3,
      descricao: 'Base limpa do fornecedor (o que ele realmente líquida HOJE)',
      expressao: `${fmt6(baseSemIcmsHoje)} − ${fmt6(pisCofinsHoje)}`,
      resultado: fmtMoney6(baseLimpaHoje),
      fundamento: 'Preço HOJE sem ICMS e sem PIS/COFINS — referência do repasse.',
    },
  ]
  if (modo === 'congelado' || modo === 'nenhum') {
    passos.push({
      ordem: 4,
      descricao:
        modo === 'nenhum'
          ? 'Fornecedor NÃO repassa — preço congelado'
          : config.fornecedorRegime === 'simples'
            ? 'Fornecedor SN — nota congelada (LC 123/2006)'
            : row.exercicio === 2026
              ? '2026 — tributos do fornecedor inalterados: preço congelado'
              : 'Exercício pendente — sem repasse calculado',
      expressao: 'preço HOJE',
      resultado: fmtMoney6(V),
      fundamento: 'Repasse é prática de mercado, não imposição legal.',
    })
    return passos
  }
  passos.push(
    {
      ordem: 4,
      descricao: `CBS ${fmt(row.cbsRate)}% + IBS ${fmt(row.ibsRate)}% sobre a base limpa (alvo do repasse integral)`,
      expressao: `${fmt6(baseLimpaHoje)} × ${fmt6(cbsRate + ibsRate)}`,
      resultado: fmtMoney6(cbsIbsTotal),
      fundamento: 'LC 214/2025, art. 12, §2º, I: CBS/IBS por fora da própria base.',
    },
    {
      ordem: 5,
      descricao:
        leitura === 'fiscos'
          ? 'Valor da operação — base do ICMS (LEITURA DO FISCO: CBS/IBS integram)'
          : 'Valor da operação (LEITURA DO CONTRIBUINTE — PLP 16/25: CBS/IBS por fora)',
      expressao: leitura === 'fiscos' ? `${fmt6(baseLimpaHoje)} + CBS + IBS` : 'base limpa',
      resultado: fmtMoney6(leitura === 'fiscos' ? r2(baseLimpaHoje + cbsIbsTotal) : baseLimpaHoje),
      fundamento:
        'PENDENTE DE DEFINIÇÃO (transição 2026–2032): a lei não exclui expressamente IBS/CBS da base do ICMS. Fisco: integram. PLP 16/25: exclui (lógica do IPI — CF, art. 155, §2º, XI).',
    },
    {
      ordem: 6,
      descricao: 'Desembute do ICMS à fração do exercício (preço por dentro)',
      expressao: `valor da operação ÷ (1 − ${fmt6(tEx)})`,
      resultado: fmtMoney6(V),
      fundamento: `ICMS embutido à fração do exercício (ADCT, art. 128): ${fmt(row.icmsPct)}% da alíquota.`,
    },
  )
  if (leitura === 'plp16') {
    passos.push({
      ordem: 7,
      descricao: 'CBS/IBS destacados POR FORA (somados à nota)',
      expressao: `+ ${fmt(cbsIbsTotal)}`,
      resultado: fmtMoney6(r2(V + cbsIbsTotal)),
      fundamento: 'Leitura do contribuinte: destaque por fora, fora da base do ICMS.',
    })
  }
  passos.push({
    ordem: passos.length + 1,
    descricao: 'Preço do fornecedor (resultado final — arredondado a 2 casas, half-up)',
    expressao: '—',
    resultado: fmt(V),
    fundamento:
      'Repasse integral = receita líquida do fornecedor constante (base limpa preservada).',
  })
  return passos
}

/** Lado EXERCÍCIO — memória Art. 12 em 2 blocos (① fornecedor → ② comprador). */
export function computeExercicioArt12(
  input: CmvArt12Input,
  config: CellConfigArt,
  row: ScheduleRowArt,
): SideResultArt {
  const leitura = config.baseIcmsLeitura || 'fiscos'
  const fornecedorSN = config.fornecedorRegime === 'simples'
  const compradorSN = config.compradorRegime === 'simples'
  const pleno = !fornecedorSN && !compradorSN
  const qtd = Math.max(1, input.quantity)

  // ---- Referências HOJE do fornecedor
  const mercHoje = r2(input.quantity * input.unitPrice)
  const freteHoje = r2(input.freightValue)
  const baseOper = r2(mercHoje + freteHoje)
  const t = input.icmsRate / 100
  const icmsHoje = r2(baseOper * t)
  const e = EMBUTIDO[config.fornecedorRegime]
  const pisCofinsHoje = fornecedorSN ? 0 : r2((baseOper - icmsHoje) * e)
  const baseLimpaHoje = fornecedorSN ? 0 : r2(baseOper - icmsHoje - pisCofinsHoje)

  // ---- IPI do exercício (§2º, II; zerado 2027+; ZFM mantém)
  const ipiEfetivo =
    config.fornecedorPerfil === 'industria'
      ? row.ipiZero
        ? config.zfm
          ? input.ipiRate
          : 0
        : input.ipiRate
      : 0
  const temIpi = ipiEfetivo > 0

  // ---- Ato 1: preço do fornecedor
  const tEx = t * (row.icmsPct / 100)
  const cbsRate = row.cbsRate / 100
  const ibsRate = row.ibsRate / 100
  const cbsIbsTotal = r2(baseLimpaHoje * (cbsRate + ibsRate))
  const semCalculo = !row.habilitado
  const congelado = fornecedorSN || row.exercicio === 2026 || semCalculo
  const modo: string = congelado ? 'congelado' : config.repasse
  const Vint =
    leitura === 'fiscos'
      ? r2((baseLimpaHoje + cbsIbsTotal) / (1 - tEx))
      : r2(baseLimpaHoje / (1 - tEx))
  const V = congelado
    ? baseOper
    : modo === 'integral'
      ? Vint
      : modo === 'nenhum'
        ? baseOper
        : r2(baseOper + (config.repassePct / 100) * (Vint - baseOper))

  const mercEx = congelado ? mercHoje : r2(V * (mercHoje / baseOper))
  const ipiValor = temIpi ? r2(mercEx * (ipiEfetivo / 100)) : 0
  const bruto = r2(V + ipiValor)

  // ---- ICMS destacado no exercício (fração ADCT 128) — base = valor da operação (V)
  const icmsDestEx = r2(V * tEx)

  // ---- CBS/IBS devidos pelo fornecedor (base dele no exercício)
  // inside = parcela de CBS/IBS JÁ EMBUTIDA no preço recomposto; porfora = destaque por fora
  let inside = 0
  let baseForn = 0
  if (!fornecedorSN && row.habilitado) {
    if (row.exercicio === 2026) {
      baseForn = r2(V - icmsDestEx - pisCofinsHoje) // PIS/COFINS vivos: excluídos (§2º, V)
    } else if (modo === 'integral') {
      inside = leitura === 'fiscos' ? cbsIbsTotal : 0
      baseForn = r2(V - icmsDestEx - inside)
    } else if (modo === 'parcial') {
      inside = leitura === 'fiscos' ? r2((config.repassePct / 100) * cbsIbsTotal) : 0
      baseForn = r2(V - icmsDestEx - inside)
    } else {
      inside = 0
      baseForn = r2(V - icmsDestEx)
    }
  }
  const cbsDue = !fornecedorSN && row.habilitado ? r2(baseForn * cbsRate) : 0
  const ibsDue = !fornecedorSN && row.habilitado ? r2(baseForn * ibsRate) : 0
  const due = r2(cbsDue + ibsDue)
  const porfora = r2(due - inside)

  // ---- Créditos do comprador
  const creditoIcms = pleno ? icmsDestEx : 0
  const creditoCbsIbs = pleno ? due : 0
  const creditoIpi = temIpi && config.compradorPerfil === 'industria' ? ipiValor : 0
  const creditoPisCofins =
    row.exercicio === 2026 && config.fornecedorRegime === 'real' && pleno
      ? r2((baseOper - icmsHoje) * 0.0925)
      : 0
  const creditos = r2(creditoIcms + creditoCbsIbs + creditoIpi + creditoPisCofins)
  const debitos = porfora
  const liquido = r2(bruto + debitos - creditos)

  // ============================ LINHAS ============================
  const lines: MemoryLineArt[] = []

  // ---------- BLOCO ① — FORMAÇÃO DO PREÇO DO FORNECEDOR ----------
  lines.push({
    key: 'mercadoria',
    bloco: 'fornecedor',
    label: 'Mercadoria — preço HOJE',
    formula: `${fmt(input.quantity)} un. × ${fmt(input.unitPrice)}`,
    value: mercHoje,
    kind: 'bruto',
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, caput',
      efeito: 'valor da operação compõe a base',
      validade: 'integral',
    },
  })
  lines.push({
    key: 'frete',
    bloco: 'fornecedor',
    label: 'Frete — preço HOJE',
    formula: 'valor da nota',
    value: freteHoje,
    kind: 'bruto',
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, §1º, IV',
      efeito: 'transporte cobrado pelo fornecedor INTEGRA a base',
      validade: 'integral',
    },
  })
  if (temIpi) {
    lines.push({
      key: 'ipi',
      bloco: 'fornecedor',
      label: config.zfm ? 'IPI destacado (ZFM mantém)' : 'IPI destacado',
      formula: `${fmt(mercEx)} × ${fmt(ipiEfetivo)}%`,
      value: ipiValor,
      kind: 'bruto',
      fundamento: {
        dispositivo: config.zfm
          ? 'ADCT, art. 92-B (EC 132/2023)'
          : 'CF, art. 153, §3º (EC 132/2023)',
        efeito: config.zfm
          ? 'diferencial competitivo da ZFM preservado — IPI mantido'
          : 'IPI vigente — fora da base do IBS/CBS',
        validade: config.zfm ? 'condicionada' : 'integral',
        nota: 'Exclusão expressa: LC 214/2025, art. 12, §2º, II (vale em todos os exercícios).',
      },
    })
  } else if (
    config.fornecedorPerfil === 'industria' &&
    row.habilitado &&
    row.ipiZero &&
    !config.zfm
  ) {
    lines.push({
      key: 'ipi',
      bloco: 'fornecedor',
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
  lines.push({
    key: 'icmshoje',
    bloco: 'fornecedor',
    label: '(−) ICMS embutido no preço HOJE',
    formula: `${fmt(baseOper)} × ${fmt(input.icmsRate)}%`,
    value: -icmsHoje,
    kind: 'nota',
    fundamento: {
      dispositivo: 'ICMS por dentro (preço × alíquota)',
      efeito: 'exclusão para chegar à base limpa do fornecedor',
      validade: 'nao_aplicavel',
    },
  })
  lines.push({
    key: 'piscofinshoje',
    bloco: 'fornecedor',
    label:
      row.exercicio >= 2027 && !fornecedorSN
        ? '(−) PIS/COFINS embutidos HOJE — extintos no exercício'
        : '(−) PIS/COFINS — fora da base do IBS/CBS',
    formula: fornecedorSN
      ? 'fornecedor SN — regime próprio (LC 123/2006)'
      : `${fmt(baseOper - icmsHoje)} × ${fmt(e * 100)}% (base SEM ICMS — tese do século)`,
    value: -pisCofinsHoje,
    kind: 'nota',
    fundamento: {
      dispositivo:
        row.exercicio >= 2027 ? 'EC 132/2023, art. 22, I' : 'LC 214/2025, art. 12, §2º, V',
      efeito:
        row.exercicio >= 2027
          ? 'PIS/COFINS revogados a partir de 2027 — o embutido sai do preço'
          : 'tributo vivo NÃO integra a base do IBS/CBS (vigência 2026–2032)',
      validade: 'integral',
      nota: 'STJ RE 1.188.403 + STF Tema 1098: ICMS destacado não integra a base do PIS/COFINS.',
    },
  })
  if (!fornecedorSN) {
    lines.push({
      key: 'baselimpa',
      bloco: 'fornecedor',
      label: '(=) Base limpa do fornecedor',
      formula: `${fmt(baseOper)} − ICMS ${fmt(icmsHoje)} − PIS/COFINS ${fmt(pisCofinsHoje)}`,
      value: baseLimpaHoje,
      kind: 'nota',
      passos: [
        {
          ordem: 1,
          descricao: 'Base sem ICMS do preço HOJE',
          expressao: `${fmt(baseOper)} − ${fmt(icmsHoje)}`,
          resultado: fmtMoney6(r2(baseOper - icmsHoje)),
          fundamento: 'ICMS por dentro.',
        },
        {
          ordem: 2,
          descricao: 'PIS/COFINS embutidos (base SEM ICMS — tese do século)',
          expressao: `${fmt6(baseOper - icmsHoje)} × ${fmt6(e)}`,
          resultado: fmtMoney6(pisCofinsHoje),
          fundamento: 'STJ RE 1.188.403 + STF Tema 1098.',
        },
        {
          ordem: 3,
          descricao: 'Base limpa (resultado final — 2 casas, half-up)',
          expressao: 'base sem ICMS − PIS/COFINS',
          resultado: fmt(baseLimpaHoje),
          fundamento: 'Referência do repasse: receita líquida do fornecedor.',
        },
      ],
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, caput + §2º, I, II e V',
        efeito: 'base = valor da operação SEM IBS/CBS, IPI, ICMS/ISS e PIS/COFINS',
        validade: row.exercicio <= 2032 ? 'integral' : 'pendente',
      },
    })
  }
  if (modo === 'integral' && !fornecedorSN && row.habilitado) {
    lines.push({
      key: 'cbsforn',
      bloco: 'fornecedor',
      label: `(+) CBS ${fmt(row.cbsRate)}% sobre a base limpa`,
      formula: `${fmt(baseLimpaHoje)} × ${fmt(row.cbsRate)}%`,
      value: cbsDue,
      kind: 'nota',
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, I',
        efeito: 'CBS por fora da própria base — compõe o preço recomposto',
        validade: 'integral',
        nota:
          leitura === 'fiscos'
            ? 'Leitura do Fisco: integra a base do ICMS na transição (pendente de definição).'
            : 'Leitura do contribuinte: por fora da base do ICMS (PLP 16/25).',
      },
    })
    lines.push({
      key: 'ibsforne',
      bloco: 'fornecedor',
      label: `(+) IBS ${fmt(row.ibsRate)}% sobre a base limpa`,
      formula: `${fmt(baseLimpaHoje)} × ${fmt(row.ibsRate)}%`,
      value: ibsDue,
      kind: 'nota',
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, I',
        efeito: 'IBS por fora da própria base — compõe o preço recomposto',
        validade: 'integral',
        nota:
          leitura === 'fiscos'
            ? 'Leitura do Fisco: integra a base do ICMS na transição (pendente de definição).'
            : 'Leitura do contribuinte: por fora da base do ICMS (PLP 16/25).',
      },
    })
    lines.push({
      key: 'valorop',
      bloco: 'fornecedor',
      label:
        leitura === 'fiscos'
          ? '(=) Valor da operação — base do ICMS (leitura do Fisco)'
          : '(=) Valor da operação — CBS/IBS por fora (leitura do contribuinte)',
      formula:
        leitura === 'fiscos'
          ? `${fmt(baseLimpaHoje)} + CBS ${fmt(cbsDue)} + IBS ${fmt(ibsDue)}`
          : `base limpa ${fmt(baseLimpaHoje)} (PLP 16/25)`,
      value: leitura === 'fiscos' ? r2(baseLimpaHoje + due) : baseLimpaHoje,
      kind: 'nota',
      fundamento: {
        dispositivo: 'PENDENTE DE DEFINIÇÃO (transição 2026–2032)',
        efeito:
          leitura === 'fiscos'
            ? 'leitura do Fisco: IBS/CBS integram a base do ICMS embutido'
            : 'leitura do contribuinte: IBS/CBS por fora da base do ICMS',
        validade: 'pendente',
        nota: 'Cadeia plena fecha igual nas duas leituras; difere no comprador SN.',
      },
    })
  }
  if (modo === 'parcial' && !fornecedorSN && row.habilitado) {
    lines.push({
      key: 'cbsibsparcial',
      bloco: 'fornecedor',
      label: `(+) CBS/IBS devidos — ${fmt(config.repassePct)}% embutidos no preço`,
      formula: `base exercício ${fmt(baseForn)} × ${fmt(row.cbsRate + row.ibsRate)}% · embutido ${fmt(inside)} · por fora ${fmt(porfora)}`,
      value: due,
      kind: 'nota',
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, I + prática de mercado',
        efeito: 'repasses parciais dividem o impacto entre fornecedor e comprador',
        validade: 'condicionada',
        nota: 'Repasse é prática de mercado, não imposição legal.',
      },
    })
  }
  if ((modo === 'nenhum' || modo === 'congelado') && !fornecedorSN && row.habilitado) {
    lines.push({
      key: 'cbsibsfora',
      bloco: 'fornecedor',
      label:
        row.exercicio === 2026
          ? '(+) CBS/IBS-teste por fora (compensáveis ao fornecedor)'
          : '(+) CBS/IBS por fora — fornecedor NÃO repassa',
      formula: `base ${fmt(baseForn)} × ${fmt(row.cbsRate + row.ibsRate)}%`,
      value: due,
      kind: 'nota',
      fundamento: {
        dispositivo:
          row.exercicio === 2026 ? 'LC 214/2025, arts. 343 e 344' : 'LC 214/2025, art. 12, §2º, I',
        efeito:
          row.exercicio === 2026
            ? 'alíquotas-teste de 2026 — compensação contra PIS/COFINS/IBS'
            : 'preço congelado: destaque por fora, absorvido pelo fornecedor',
        validade: row.exercicio === 2026 ? 'integral' : 'condicionada',
        nota:
          row.exercicio === 2026 ? undefined : 'Repasse é prática de mercado, não imposição legal.',
      },
    })
  }
  lines.push({
    key: 'precofornecedor',
    bloco: 'fornecedor',
    label:
      modo === 'integral'
        ? '(=) PREÇO DO FORNECEDOR — recomposto'
        : modo === 'parcial'
          ? `(=) PREÇO DO FORNECEDOR — repasse ${fmt(config.repassePct)}%`
          : '(=) PREÇO DO FORNECEDOR — congelado',
    formula:
      modo === 'integral' && leitura === 'fiscos'
        ? `(base limpa + CBS + IBS) ÷ (1 − ${fmt6(tEx)})`
        : modo === 'integral'
          ? `base limpa ÷ (1 − ${fmt6(tEx)}) + CBS/IBS por fora`
          : modo === 'parcial'
            ? `${fmt(baseOper)} + ${fmt(config.repassePct)}% × (preço integral − ${fmt(baseOper)})`
            : 'preço HOJE (sem repasse)',
    value: V,
    kind: 'subtotal',
    passos: buildPassosPreco(
      config,
      row,
      baseOper,
      icmsHoje,
      pisCofinsHoje,
      baseLimpaHoje,
      tEx,
      V,
      modo,
    ),
    fundamento: {
      dispositivo:
        modo === 'integral' ? 'LC 214/2025, art. 12 + prática de mercado' : 'Prática de mercado',
      efeito:
        modo === 'integral'
          ? 'repasse integral: receita líquida do fornecedor constante (base limpa preservada)'
          : modo === 'parcial'
            ? 'repasse parcial: impacto dividido entre fornecedor e comprador'
            : 'preço congelado: fornecedor absorve o impacto',
      validade: 'condicionada',
      nota: fornecedorSN ? 'Fornecedor SN — nota congelada (LC 123/2006).' : undefined,
    },
  })

  // ---------- BLOCO ② — CUSTO DA AQUISIÇÃO PARA O COMPRADOR ----------
  lines.push({
    key: 'brutonota',
    bloco: 'comprador',
    label: 'Valor bruto da nota',
    formula: porfora > 0 ? `${fmt(V)} + CBS/IBS por fora ${fmt(porfora)}` : 'preço do fornecedor',
    value: bruto,
    kind: 'bruto',
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12, caput',
      efeito: 'valor da operação pago pelo comprador',
      validade: 'integral',
    },
  })
  if (porfora > 0) {
    lines.push({
      key: 'cbsfora',
      bloco: 'comprador',
      label: `(+) CBS ${fmt(row.cbsRate)}% destacada por fora`,
      formula: `${fmt(baseForn)} × ${fmt(row.cbsRate)}%`,
      value: cbsDue,
      kind: 'debito',
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, I',
        efeito: 'destaque por fora (leitura do contribuinte / preço congelado)',
        validade: 'integral',
      },
    })
    lines.push({
      key: 'ibsfora',
      bloco: 'comprador',
      label: `(+) IBS ${fmt(row.ibsRate)}% destacado por fora`,
      formula: `${fmt(baseForn)} × ${fmt(row.ibsRate)}%`,
      value: ibsDue,
      kind: 'debito',
      fundamento: {
        dispositivo: 'LC 214/2025, art. 12, §2º, I',
        efeito: 'destaque por fora (leitura do contribuinte / preço congelado)',
        validade: 'integral',
      },
    })
  }
  lines.push({
    key: 'icmsdest',
    bloco: 'comprador',
    label: pleno
      ? `(−) ICMS destacado — crédito${row.icmsPct < 100 ? ` (${fmt(row.icmsPct)}% da alíquota)` : ''}`
      : '(−) ICMS destacado — sem crédito (SN)',
    formula: pleno
      ? `${fmt(V)} × ${fmt(input.icmsRate)}% × ${fmt(row.icmsPct)}%`
      : fornecedorSN
        ? 'NF de fornecedor SN — sem destaque (LC 123/2006)'
        : 'LC 123/2006 + art. 47: optante do SN não apropria crédito',
    value: -creditoIcms,
    kind: pleno ? 'credito' : 'nota',
    fundamento: {
      dispositivo: 'ADCT, art. 128, I–IV (EC 132/2023) + LC 214/2025, art. 47, §2º',
      efeito: pleno
        ? row.icmsPct === 100
          ? 'ICMS integral até 2028 — crédito do adquirente'
          : `ICMS cede ${fmt(100 - row.icmsPct)}% da alíquota ao IBS neste exercício`
        : 'sem crédito — o destaque vira custo',
      validade: 'integral',
      nota: 'Extinção em 2033: ADCT, art. 129.',
    },
  })
  if (!fornecedorSN) {
    lines.push({
      key: 'cbsdest',
      bloco: 'comprador',
      label: pleno ? '(−) CBS destacada — crédito' : '(−) CBS destacada — sem crédito (SN)',
      formula: pleno
        ? `${fmt(cbsDue)} (débito destacado na nota — art. 47, §2º)`
        : 'destaque vira custo integral',
      value: pleno ? -cbsDue : 0,
      kind: pleno ? 'credito' : 'nota',
      fundamento: {
        dispositivo: 'LC 214/2025, art. 47, §2º',
        efeito: pleno ? 'crédito do adquirente = débito destacado' : 'sem crédito — custo integral',
        validade: 'integral',
      },
    })
    lines.push({
      key: 'ibsdest',
      bloco: 'comprador',
      label: pleno ? '(−) IBS destacado — crédito' : '(−) IBS destacado — sem crédito (SN)',
      formula: pleno
        ? `${fmt(ibsDue)} (débito destacado na nota — art. 47, §2º)`
        : 'destaque vira custo integral',
      value: pleno ? -ibsDue : 0,
      kind: pleno ? 'credito' : 'nota',
      fundamento: {
        dispositivo: 'LC 214/2025, art. 47, §2º',
        efeito: pleno ? 'crédito do adquirente = débito destacado' : 'sem crédito — custo integral',
        validade: 'integral',
      },
    })
  }
  if (creditoIpi > 0) {
    lines.push({
      key: 'creditoipi',
      bloco: 'comprador',
      label: '(−) Crédito IPI (industrial)',
      formula: `${fmt(ipiValor)} — crédito integral`,
      value: -creditoIpi,
      kind: 'credito',
      fundamento: {
        dispositivo: 'CF, art. 153, §3º + LC 214/2025, art. 454',
        efeito: 'IPI mantido na ZFM — crédito ao industrial',
        validade: 'condicionada',
      },
    })
  }
  if (creditoPisCofins > 0) {
    lines.push({
      key: 'creditopiscofins',
      bloco: 'comprador',
      label: '(−) Crédito PIS/COFINS (fornecedor não cumulativo)',
      formula: `${fmt(baseOper - icmsHoje)} × 9,25% (base sem ICMS — tese do século)`,
      value: -creditoPisCofins,
      kind: 'credito',
      fundamento: {
        dispositivo: 'LC 10.865/2003 + STJ RE 1.188.403',
        efeito: 'crédito na aquisição de fornecedor não cumulativo (2026)',
        validade: 'integral',
      },
    })
  }
  lines.push({
    key: 'comprasliquidas',
    bloco: 'comprador',
    label: '(=) COMPRAS LÍQUIDAS — custo do comprador',
    formula: `${fmt(bruto)}${porfora > 0 ? ` + ${fmt(porfora)}` : ''} − créditos ${fmt(creditos)}`,
    value: liquido,
    kind: 'subtotal',
    passos: [
      {
        ordem: 1,
        descricao: 'Valor bruto da nota (preço do fornecedor + por fora, se houver)',
        expressao: porfora > 0 ? `${fmt(V)} + ${fmt(porfora)}` : fmt(V),
        resultado: fmtMoney6(bruto),
        fundamento: 'Bloco ① — ver memória da linha "Preço do fornecedor".',
      },
      {
        ordem: 2,
        descricao:
          'Créditos do adquirente (ICMS + CBS/IBS destacados' +
          (creditoIpi > 0 ? ' + IPI' : '') +
          (creditoPisCofins > 0 ? ' + PIS/COFINS' : '') +
          ')',
        expressao:
          `${fmt(icmsDestEx)} + ${fmt(due)}` +
          (creditoIpi > 0 ? ` + ${fmt(creditoIpi)}` : '') +
          (creditoPisCofins > 0 ? ` + ${fmt(creditoPisCofins)}` : ''),
        resultado: fmtMoney6(creditos),
        fundamento: 'LC 214/2025, art. 47, §2º: crédito = débito destacado no documento fiscal.',
      },
      {
        ordem: 3,
        descricao: 'Compras líquidas (resultado final — 2 casas, half-up)',
        expressao: 'bruto − créditos',
        resultado: fmt(liquido),
        fundamento:
          'Cadeia plena com crédito integral: o custo = preço líquido do fornecedor (base limpa).',
      },
      {
        ordem: 4,
        descricao: 'Custo unitário',
        expressao: `${fmt(liquido)} ÷ ${fmt(input.quantity)} un.`,
        resultado: fmt(r2(liquido / qtd)),
        fundamento: 'CMV unitário do exercício.',
      },
    ],
    fundamento: {
      dispositivo: 'LC 214/2025, art. 12 + art. 47, §2º',
      efeito: 'custo da aquisição = nota − créditos destacados',
      validade: 'integral',
    },
  })

  return {
    lines,
    bruto,
    creditos,
    debitos,
    baseLimpa: fornecedorSN ? null : baseForn,
    liquido,
    unitario: r2(liquido / qtd),
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
    porque = `Comprador SN não credita CBS/IBS (LC 123/2006 + art. 47): o destaque vira custo integral. Leitura da base do ICMS (${config.baseIcmsLeitura === 'plp16' ? 'contribuinte — PLP 16/25' : 'Fisco'}) muda o resultado desta célula.`
  } else if (config.repasse === 'integral') {
    porque =
      'Cadeia plena com repasse integral: o preço do fornecedor é recomposto e o crédito do adquirente lava o destaque (art. 12 + art. 47) — o custo acompanha o preço líquido do fornecedor (base limpa preservada). Variação relevante só ocorre se o repasse falhar.'
  } else if (config.repasse === 'nenhum') {
    porque =
      'Fornecedor não repassa: o adquirente paga CBS/IBS sobre a base sem redução equivalente do bruto — quem absorve o impacto é o COMPRADOR.'
  } else {
    porque = `Repasse parcial (${fmt(config.repassePct)}%): fornecedor absorve ${fmt(100 - config.repassePct)}% do impacto na margem; comprador absorve o restante via preço.`
  }

  return { hoje, exercicio, deltaPct, semaforo, porque }
}

/** Réguas de repasse (Integral / Parcial % / Nenhum). */
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
