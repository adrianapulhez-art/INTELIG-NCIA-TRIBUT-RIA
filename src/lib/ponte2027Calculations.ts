/**
 * PONTE 2027 — Simulador de Transição para a CBS (EC 132/23 + LC 214/25)
 * Fase 1: crédito financeiro item a item, custo líquido do adquirente,
 * janela 2027–2028 (CBS cheia + ICMS/ISS integrais) e crédito B2B entregue ao cliente.
 *
 * Base legal:
 * - EC 132/2023, ADCT arts. 125–133 (cronograma 2026–2033)
 * - LC 214/2025, arts. 47–48 (creditamento e destaque), art. 31 (split payment),
 *   art. 168, I (vedação: aquisições de optante do Simples Nacional)
 * - Art. 48, parágrafo único, LC 214/25: destaque do imposto no documento fiscal
 *   como condição de apropriação do crédito.
 */

export const CBS_2027_RATE = 8.8 // % CBS plena estimada (LC 214/25, art. 349 — resolução do Senado)
export const IBS_2027_RATE = 0.1 // % IBS-teste em 2027 (ADCT art. 127)
export const ICMS_DEFAULT_RATE = 18 // % estimativa de ICMS sobre vendas (editável)
export const ISS_DEFAULT_RATE = 5 // % estimativa de ISS sobre vendas (editável)
export const PIS_COFINS_CUMULATIVO = 3.65 // % PIS 0,65 + COFINS 3,00 (cumulativo)
export const PIS_COFINS_NAO_CUMULATIVO = 9.25 // % PIS 1,65 + COFINS 7,6 (não cumulativo)

export type Ponte2027Regime = 'presumido' | 'real' | 'simples'

export type PonteAcquisitionKind =
  | 'mercadoria'
  | 'energia'
  | 'frete'
  | 'servico'
  | 'aluguel'
  | 'ativo'
  | 'outros'

export type PonteCreditStatus = 'integral' | 'parcial' | 'vedado'

/** Item de aquisição com crédito financeiro de CBS em 2027 */
export interface PonteAcquisitionItem {
  id: string
  description: string
  kind: PonteAcquisitionKind
  /** Valor bruto da aquisição (o que consta no documento fiscal) */
  value: number
  /** Alíquota de ICMS embutida na aquisição (para o custo no sistema atual) */
  icmsRate: number
  /** O documento fiscal destaca CBS/IBS? (art. 48, § único, LC 214/25) */
  cbsHighlighted: boolean
  /** Fornecedor é optante do Simples Nacional? (vedação do art. 168, I) */
  supplierSimples: boolean
  /** Uso pessoal ou consumo não vinculado à atividade? */
  personalUse: boolean
  /** Crédito parcialmente vedado (ex.: 50% em hipóteses específicas) */
  partialCreditPercent: number
}

/** Estado salvo da Ponte 2027 (integrado ao snapshot do TaxContext) */
export interface Ponte2027State {
  regime: Ponte2027Regime
  /** Receita bruta anual projetada para 2027 (default: receita consolidada do motor) */
  revenue2027: number
  /** Alíquotas de ICMS/ISS sobre vendas no sistema atual (editáveis) */
  icmsRate: number
  issRate: number
  /** Aquisições item a item */
  acquisitions: PonteAcquisitionItem[]
}

export const INITIAL_PONTE2027_STATE: Ponte2027State = {
  regime: 'presumido',
  revenue2027: 0,
  icmsRate: ICMS_DEFAULT_RATE,
  issRate: ISS_DEFAULT_RATE,
  acquisitions: [],
}

export function createAcquisitionItem(
  description = '',
  kind: PonteAcquisitionKind = 'mercadoria',
  value = 0,
): PonteAcquisitionItem {
  return {
    id: `ponte-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description,
    kind,
    value,
    icmsRate: kind === 'mercadoria' || kind === 'ativo' ? ICMS_DEFAULT_RATE : 0,
    cbsHighlighted: true,
    supplierSimples: false,
    personalUse: false,
    partialCreditPercent: 0,
  }
}

/** Classificação técnica do crédito do item (H/HA/A traduzido em regra de negócio) */
export function getCreditStatus(item: PonteAcquisitionItem): PonteCreditStatus {
  if (item.personalUse || item.supplierSimples || !item.cbsHighlighted) return 'vedado'
  if (item.partialCreditPercent > 0 && item.partialCreditPercent < 100) return 'parcial'
  return 'integral'
}

export function getCreditStatusReason(item: PonteAcquisitionItem): string {
  if (item.personalUse)
    return 'Vedado — uso pessoal ou consumo não vinculado à atividade (LC 214/25, art. 47, §1º)'
  if (item.supplierSimples)
    return 'Vedado — fornecedor optante do Simples Nacional (LC 214/25, art. 168, I)'
  if (!item.cbsHighlighted)
    return 'Vedado — documento fiscal sem destaque do imposto (LC 214/25, art. 48, § único)'
  if (item.partialCreditPercent > 0 && item.partialCreditPercent < 100)
    return `Parcial — crédito aproveitado em ${item.partialCreditPercent}% (hipótese específica)`
  return 'Integral — aquisição vinculada à atividade com destaque no documento fiscal'
}

export interface PonteAcquisitionResult {
  item: PonteAcquisitionItem
  status: PonteCreditStatus
  statusReason: string
  /** CBS destacada na aquisição (valor bruto × 8,8%) */
  cbsOnPurchase: number
  /** Crédito financeiro efetivamente apropriado */
  creditCbs: number
  /** Custo da aquisição no sistema atual (com ICMS embutido, sem crédito) */
  costCurrentSystem: number
  /** Custo líquido do adquirente em 2027: valor − crédito de CBS */
  netCost2027: number
  /** Economia por item: custo atual − custo líquido 2027 */
  saving: number
}

export interface Ponte2027Result {
  regime: Ponte2027Regime
  regimeName: string
  // --- Sistema atual (2026) ---
  /** Tributos sobre vendas no sistema atual: ICMS + ISS + PIS/COFINS */
  currentSalesTaxes: number
  currentIcms: number
  currentIss: number
  currentPisCofins: number
  currentEffectiveRate: number
  // --- Sistema novo (2027) ---
  /** CBS devida sobre as vendas (por fora) */
  cbsOnSales: number
  /** IBS-teste devido (0,1%) */
  ibsOnSales: number
  /** Crédito total apropriado das aquisições */
  totalCredit: number
  /** CBS líquida a recolher (nunca negativa) */
  netCbsToPay: number
  /** ICMS/ISS que continuam devidos em 2027 (integrais na janela) */
  transitionalIcms: number
  transitionalIss: number
  /** Carga total 2027 = CBS líquida + IBS + ICMS + ISS */
  total2027Burden: number
  total2027EffectiveRate: number
  // --- Confronto ---
  burdenDifference: number // negativo = economia
  is2027Better: boolean
  // --- Crédito B2B entregue ao cliente ---
  /** Crédito de CBS que a empresa destaca e entrega ao cliente PJ */
  creditDeliveredToB2B: number
  // --- Janela 2027–2028 ---
  windowAlert: {
    active: boolean
    title: string
    message: string
  }
  // --- Itens ---
  itemResults: PonteAcquisitionResult[]
  totals: {
    grossAcquisitions: number
    cbsOnPurchases: number
    totalCredit: number
    netCost2027: number
    currentCost: number
    saving: number
  }
  // --- Precificação ---
  pricing: {
    /** Alíquota embutida atual sobre vendas (ICMS + ISS + PIS/COFINS) */
    currentEmbeddedRate: number
    /** Alíquota por fora 2027 (CBS + IBS) */
    newOnTopRate: number
    /** Preço sugerido 2027 para manter a mesma receita líquida */
    suggestedPrice2027: number
    priceDifference: number
    priceDifferencePercent: number
  }
}

function regimeName(regime: Ponte2027Regime): string {
  if (regime === 'presumido') return 'Lucro Presumido'
  if (regime === 'real') return 'Lucro Real'
  return 'Simples Nacional'
}

/** PIS/COFINS do sistema atual por regime */
export function currentPisCofinsRate(regime: Ponte2027Regime): number {
  if (regime === 'presumido') return PIS_COFINS_CUMULATIVO
  if (regime === 'real') return PIS_COFINS_NAO_CUMULATIVO
  return 0 // Simples: DAS único (PIS/COFINS dentro da guia)
}

/**
 * Motor principal da Ponte 2027 — Fase 1
 * Calcula o confronto sistema atual × 2027 com crédito financeiro item a item.
 */
export function calculatePonte2027(state: Ponte2027State): Ponte2027Result {
  const { regime, revenue2027, icmsRate, issRate, acquisitions } = state
  const revenue = Math.max(0, revenue2027)

  // ============ 1. SISTEMA ATUAL (2026) ============
  const currentIcms = revenue * (icmsRate / 100)
  const currentIss = revenue * (issRate / 100)
  const currentPisCofins = revenue * (currentPisCofinsRate(regime) / 100)
  const currentSalesTaxes = currentIcms + currentIss + currentPisCofins
  const currentEffectiveRate = revenue > 0 ? (currentSalesTaxes / revenue) * 100 : 0

  // ============ 2. SISTEMA NOVO (2027) ============
  // Débitos por fora (LC 214/25 — CBS/IBS não integram a própria base)
  const cbsOnSales = revenue * (CBS_2027_RATE / 100)
  const ibsOnSales = revenue * (IBS_2027_RATE / 100)

  // ============ 3. CRÉDITO FINANCEIRO ITEM A ITEM ============
  const itemResults: PonteAcquisitionResult[] = acquisitions.map((item) => {
    const status = getCreditStatus(item)
    const statusReason = getCreditStatusReason(item)
    const cbsOnPurchase = Math.max(0, item.value) * (CBS_2027_RATE / 100)

    let creditCbs = 0
    if (status === 'integral') creditCbs = cbsOnPurchase
    else if (status === 'parcial') creditCbs = cbsOnPurchase * (item.partialCreditPercent / 100)

    // Custo no sistema atual: valor + ICMS embutido na aquisição (sem crédito de CBS)
    const costCurrentSystem = Math.max(0, item.value) * (1 + item.icmsRate / 100)
    // Custo líquido do adquirente (síntese de Bernard Appy): valor − crédito
    const netCost2027 = Math.max(0, item.value) - creditCbs
    const saving = costCurrentSystem - netCost2027

    return {
      item,
      status,
      statusReason,
      cbsOnPurchase,
      creditCbs,
      costCurrentSystem,
      netCost2027,
      saving,
    }
  })

  const totalCredit = itemResults.reduce((acc, r) => acc + r.creditCbs, 0)
  const grossAcquisitions = acquisitions.reduce((acc, i) => acc + Math.max(0, i.value), 0)
  const cbsOnPurchases = grossAcquisitions * (CBS_2027_RATE / 100)
  const netCost2027Total = itemResults.reduce((acc, r) => acc + r.netCost2027, 0)
  const currentCostTotal = itemResults.reduce((acc, r) => acc + r.costCurrentSystem, 0)

  // ============ 4. APURAÇÃO 2027 ============
  const netCbsToPay = Math.max(0, cbsOnSales - totalCredit)
  // Janela 2027–2028: ICMS/ISS continuam INTEGRAIS (ADCT art. 127 — IBS ainda em teste)
  const transitionalIcms = revenue * (icmsRate / 100)
  const transitionalIss = revenue * (issRate / 100)
  const total2027Burden = netCbsToPay + ibsOnSales + transitionalIcms + transitionalIss
  const total2027EffectiveRate = revenue > 0 ? (total2027Burden / revenue) * 100 : 0

  // ============ 5. CONFRONTO ============
  const burdenDifference = total2027Burden - currentSalesTaxes
  const is2027Better = burdenDifference < 0

  // ============ 6. CRÉDITO B2B ENTREGUE AO CLIENTE ============
  // A empresa destaca CBS na venda e o cliente PJ credita integralmente.
  const creditDeliveredToB2B = cbsOnSales

  // ============ 7. JANELA 2027–2028 ============
  const windowAlert = {
    active: revenue > 0,
    title: 'Janela 2027–2028 — atenção com a carga dupla',
    message:
      'Em 2027 a CBS entra cheia (8,8%) enquanto ICMS e ISS permanecem INTEGRAIS até 2029. Empresas com pouca capacidade de creditamento podem pagar os dois sistemas ao mesmo tempo. Revise preços e contratos B2B antes de janeiro de 2027.',
  }

  // ============ 8. PRECIFICAÇÃO ============
  const currentEmbeddedRate = (icmsRate + issRate + currentPisCofinsRate(regime)) / 100
  const newOnTopRate = (CBS_2027_RATE + IBS_2027_RATE) / 100
  // Preço líquido atual (desonerado dos tributos embutidos)
  const netPriceCurrent = revenue * (1 - currentEmbeddedRate)
  // Preço sugerido 2027: líquido ÷ (1 − alíquotas por fora). A CBS "por fora" NÃO
  // pode ser embutida por multiplicação — senão o líquido cai junto. Divide p/ preservar.
  const suggestedPrice2027 = netPriceCurrent / (1 - newOnTopRate)
  const priceDifference = suggestedPrice2027 - revenue
  const priceDifferencePercent = revenue > 0 ? (priceDifference / revenue) * 100 : 0

  return {
    regime,
    regimeName: regimeName(regime),
    currentSalesTaxes,
    currentIcms,
    currentIss,
    currentPisCofins,
    currentEffectiveRate,
    cbsOnSales,
    ibsOnSales,
    totalCredit,
    netCbsToPay,
    transitionalIcms,
    transitionalIss,
    total2027Burden,
    total2027EffectiveRate,
    burdenDifference,
    is2027Better,
    creditDeliveredToB2B,
    windowAlert,
    itemResults,
    totals: {
      grossAcquisitions,
      cbsOnPurchases,
      totalCredit,
      netCost2027: netCost2027Total,
      currentCost: currentCostTotal,
      saving: currentCostTotal - netCost2027Total,
    },
    pricing: {
      currentEmbeddedRate: currentEmbeddedRate * 100,
      newOnTopRate: newOnTopRate * 100,
      suggestedPrice2027,
      priceDifference,
      priceDifferencePercent,
    },
  }
}

/**
 * Constrói o estado da Ponte 2027 a partir dos dados já existentes no motor IT.
 * Reaproveita: receita consolidada do Markup, itens de Compras e despesas operacionais.
 */
export function buildPonteStateFromTaxContext(input: {
  regime: Ponte2027Regime
  revenue: number
  icmsRate: number
  issRate: number
  purchases: { name: string; merchandiseValue: number }[]
  operatingExpenses: { description: string; value: number }[]
  currentAcquisitions?: PonteAcquisitionItem[]
}): Ponte2027State {
  // Se já existem aquisições salvas, preserva (não sobrescreve edição manual)
  if (input.currentAcquisitions && input.currentAcquisitions.length > 0) {
    return {
      regime: input.regime,
      revenue2027: input.revenue,
      icmsRate: input.icmsRate,
      issRate: input.issRate,
      acquisitions: input.currentAcquisitions,
    }
  }

  const acquisitions: PonteAcquisitionItem[] = []

  // 1. Compras de mercadorias → crédito integral (fornecedor PJ tributado)
  for (const p of input.purchases) {
    if (p.merchandiseValue > 0) {
      acquisitions.push(
        createAcquisitionItem(p.name || 'Mercadoria', 'mercadoria', p.merchandiseValue),
      )
    }
  }

  // 2. Despesas operacionais → classificação por natureza
  for (const e of input.operatingExpenses) {
    if (e.value > 0) {
      const desc = (e.description || '').toLowerCase()
      let kind: PonteAcquisitionKind = 'servico'
      if (desc.includes('energia') || desc.includes('luz') || desc.includes('elétric'))
        kind = 'energia'
      else if (desc.includes('frete') || desc.includes('transport')) kind = 'frete'
      else if (desc.includes('aluguel') || desc.includes('locação') || desc.includes('locacao'))
        kind = 'aluguel'
      else if (
        desc.includes('software') ||
        desc.includes('equipamento') ||
        desc.includes('máquina') ||
        desc.includes('maquina')
      )
        kind = 'ativo'
      acquisitions.push(createAcquisitionItem(e.description, kind, e.value))
    }
  }

  return {
    regime: input.regime,
    revenue2027: input.revenue,
    icmsRate: input.icmsRate,
    issRate: input.issRate,
    acquisitions,
  }
}

// ============================================================================
// FASE 2 — COMPARATIVO DE REGIMES 2027 · CRÉDITO B2B · SENSIBILIDADE POR MARGEM
// ============================================================================

/** Carga 2027 por regime, com a MESMA receita e aquisições (crédito compartilhado) */
export interface RegimeCompare2027 {
  regime: Ponte2027Regime
  regimeName: string
  /** Carga total 2027: CBS líquida + IBS + ICMS/ISS integrais */
  total2027Burden: number
  effectiveRate: number
  /** Carga do sistema atual do próprio regime (referência) */
  currentSalesTaxes: number
  currentEffectiveRate: number
  burdenDifference: number
  is2027Better: boolean
}

export function compareRegimes2027(state: Ponte2027State): RegimeCompare2027[] {
  const regimes: Ponte2027Regime[] = ['presumido', 'real', 'simples']
  return regimes.map((regime) => {
    const r = calculatePonte2027({ ...state, regime })
    return {
      regime,
      regimeName: regimeName(regime),
      total2027Burden: r.total2027Burden,
      effectiveRate: r.total2027EffectiveRate,
      currentSalesTaxes: r.currentSalesTaxes,
      currentEffectiveRate: r.currentEffectiveRate,
      burdenDifference: r.burdenDifference,
      is2027Better: r.is2027Better,
    }
  })
}

/**
 * Crédito B2B — o que o cliente PJ credita sobre a venda, hoje × 2027.
 * Hoje: cliente credita o ICMS destacado (LP/LR); vendedor SN não destaca —
 * cliente não credita nada. Em 2027: todos destacam CBS e o cliente PJ credita.
 */
export interface B2BCreditResult {
  regime: Ponte2027Regime
  /** CBS destacada na venda (o cliente PJ credita integralmente) */
  cbsDelivered: number
  /** Crédito do cliente no sistema atual (ICMS + PIS/COFINS p/ LR; nada p/ vendedor SN) */
  currentSystemCredit: number
  creditDifference: number
}

export function computeB2BCredit(
  revenue: number,
  regime: Ponte2027Regime,
  icmsRate: number,
): B2BCreditResult {
  const cbsDelivered = Math.max(0, revenue) * (CBS_2027_RATE / 100)
  let currentSystemCredit = 0
  if (regime === 'presumido') {
    currentSystemCredit = Math.max(0, revenue) * (icmsRate / 100)
  } else if (regime === 'real') {
    currentSystemCredit = Math.max(0, revenue) * ((icmsRate + PIS_COFINS_NAO_CUMULATIVO) / 100)
  }
  return {
    regime,
    cbsDelivered,
    currentSystemCredit,
    creditDifference: cbsDelivered - currentSystemCredit,
  }
}

// ============================================================================
// FASE 3 — SPLIT PAYMENT (LC 214/25, ART. 31) · FLUXO DE CAIXA · CARTEIRA 2027
// ============================================================================

export interface SplitPaymentResult {
  /** % retido na fonte (parâmetro de simulação — regulamentação define hipóteses/limites) */
  retentionRate: number
  /** CBS líquida anual retida pelo adquirente (não passa pelo caixa do vendedor) */
  retainedCbs: number
  /** CBS líquida anual que o vendedor ainda recolhe via DARE */
  cashCbs: number
  /** Carga total 2027 — split NÃO altera a carga, só o caixa (timing) */
  totalBurden: number
  /** Float de capital de giro que o vendedor deixa de segurar (efeito financeiro) */
  workingCapitalImpact: number
}

/**
 * Split payment — LC 214/25, art. 31: o IBS/CBS pode ser retido na fonte pelo
 * adquirente. O mecanismo existe em lei; o % é PARÂMETRO de simulação (a
 * regulamentação define as hipóteses e limites). Efeito: não muda a carga —
 * muda o caixa (o vendedor deixa de segurar o float da CBS entre venda e DARE).
 */
export function computeSplitPayment(
  result: Ponte2027Result,
  retentionRate: number,
): SplitPaymentResult {
  const rate = Math.min(100, Math.max(0, retentionRate))
  const retainedCbs = result.netCbsToPay * (rate / 100)
  return {
    retentionRate: rate,
    retainedCbs,
    cashCbs: result.netCbsToPay - retainedCbs,
    totalBurden: result.total2027Burden,
    workingCapitalImpact: retainedCbs,
  }
}

export interface CashFlowMonth {
  month: number
  /** CBS líquida do mês (após crédito) */
  netCbs: number
  /** Parte retida na fonte (split) — sai direto para o fisco */
  splitRetained: number
  /** CBS que o vendedor recolhe via DARE */
  cbsOnCash: number
  /** ICMS + ISS do mês (integrais na janela) */
  icmsIss: number
  /** IBS-teste do mês */
  ibs: number
  /** Saída total 2027 */
  out2027: number
  /** Saída no sistema atual (ICMS + ISS + PIS/COFINS) */
  outCurrent: number
  /** Δ acumulado (2027 − atual) */
  deltaCumulative: number
}

export interface CashFlow2027Result {
  months: CashFlowMonth[]
  totalOut2027: number
  totalOutCurrent: number
  /** = burdenDifference (carga) — split não muda o total, só o timing */
  annualDelta: number
  split: SplitPaymentResult
}

/**
 * Fluxo de caixa mensal 2027 × sistema atual — receita uniforme (÷12),
 * crédito das aquisições uniforme, ICMS/ISS/PIS-COFINS no mesmo mês.
 * O split aparece como timing: parte da CBS vai direto do adquirente ao fisco.
 */
export function computeCashFlow2027(
  state: Ponte2027State,
  result: Ponte2027Result,
  split: SplitPaymentResult,
): CashFlow2027Result {
  const months: CashFlowMonth[] = []
  const netCbsM = result.netCbsToPay / 12
  const splitM = split.retainedCbs / 12
  const cbsCashM = split.cashCbs / 12
  const icmsIssM = (result.transitionalIcms + result.transitionalIss) / 12
  const ibsM = result.ibsOnSales / 12
  const outCurrentM = result.currentSalesTaxes / 12
  let cum = 0
  for (let m = 1; m <= 12; m++) {
    const out2027 = cbsCashM + splitM + icmsIssM + ibsM
    cum += out2027 - outCurrentM
    months.push({
      month: m,
      netCbs: netCbsM,
      splitRetained: splitM,
      cbsOnCash: cbsCashM,
      icmsIss: icmsIssM,
      ibs: ibsM,
      out2027,
      outCurrent: outCurrentM,
      deltaCumulative: cum,
    })
  }
  return {
    months,
    totalOut2027: result.total2027Burden,
    totalOutCurrent: result.currentSalesTaxes,
    annualDelta: result.burdenDifference,
    split,
  }
}

export interface MarginSensitivityPoint {
  marginPct: number
  /** Margem líquida em R$ hoje (mantida em 2027 com reprecificação) */
  netIncome: number
  /** Preço de lista hoje (referência = receita) */
  priceToday: number
  /** Preço de lista 2027 que entrega a MESMA margem R$ (desembute) */
  price2027: number
  deltaPct: number
  /** Crédito B2B que o cliente PJ credita sobre o preço 2027 (CBS 8,8%) */
  creditB2B2027: number
  /** Margem R$ se NÃO reprecificar (preço mantido): sai PIS/COFINS, entra CBS+IBS — ICMS/ISS permanecem */
  netIncomeNoReprice: number
}

/**
 * Sensibilidade por margem — o desembute em números (lente isolada do preço:
 * custos constantes; o efeito da CBS sobre custos está no confronto item a item).
 * Preço 2027 que mantém a margem: P × (1−e) ÷ (1−o) — o % é igual para toda margem
 * (jogo de alíquotas); o que cresce com a margem é o R$ em jogo.
 */
export function marginSensitivity(
  revenue: number,
  regime: Ponte2027Regime,
  icmsRate: number,
  issRate: number,
): MarginSensitivityPoint[] {
  const P = Math.max(0, revenue)
  const e = (icmsRate + issRate + currentPisCofinsRate(regime)) / 100
  const o = (CBS_2027_RATE + IBS_2027_RATE) / 100
  const margins = [10, 15, 20, 25, 30]
  const pc = currentPisCofinsRate(regime) / 100
  return margins.map((m) => {
    const margin = m / 100
    const price2027 = (P * (1 - e)) / (1 - o)
    return {
      marginPct: m,
      netIncome: P * margin,
      priceToday: P,
      price2027,
      deltaPct: P > 0 ? ((1 - e) / (1 - o) - 1) * 100 : 0,
      creditB2B2027: price2027 * (CBS_2027_RATE / 100),
      // Sem reprecificação: preço antigo, custos antigos; PIS/COFINS extinto (pc sai),
      // CBS+IBS entram por fora (o), ICMS/ISS PERMANECEM (janela 2027–2028).
      netIncomeNoReprice: P * (margin + pc - o),
    }
  })
}
