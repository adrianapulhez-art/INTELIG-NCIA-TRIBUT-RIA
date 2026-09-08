/**
 * Módulo de Cálculos Especializados:
 * 1) Substituição Tributária (ICMS-ST)
 * 2) Operações Interestaduais (Alíquotas Interestaduais e DIFAL - EC 87/15, EC 188/22, Convênio 190/22)
 *
 * Em total conformidade com a legislação tributária brasileira (LC 87/96, LC 123/06 art. 18, §1º).
 */

// Lista completa das 27 Unidades Federativas do Brasil
export type BrazilianUF =
  | 'AC'
  | 'AL'
  | 'AP'
  | 'AM'
  | 'BA'
  | 'CE'
  | 'DF'
  | 'ES'
  | 'GO'
  | 'MA'
  | 'MT'
  | 'MS'
  | 'MG'
  | 'PA'
  | 'PB'
  | 'PR'
  | 'PE'
  | 'PI'
  | 'RJ'
  | 'RN'
  | 'RS'
  | 'RO'
  | 'RR'
  | 'SC'
  | 'SP'
  | 'SE'
  | 'TO'

export interface UfOption {
  sigla: BrazilianUF
  nome: string
  regiao: 'N' | 'NE' | 'CO' | 'SE' | 'S'
  aliquotaInternaPadrao: number // Alíquota modal interna de ICMS comumente aplicada no estado (2024/2025)
}

export const BRAZILIAN_UFS: UfOption[] = [
  { sigla: 'AC', nome: 'Acre', regiao: 'N', aliquotaInternaPadrao: 19 },
  { sigla: 'AL', nome: 'Alagoas', regiao: 'NE', aliquotaInternaPadrao: 19 },
  { sigla: 'AP', nome: 'Amapá', regiao: 'N', aliquotaInternaPadrao: 18 },
  { sigla: 'AM', nome: 'Amazonas', regiao: 'N', aliquotaInternaPadrao: 20 },
  { sigla: 'BA', nome: 'Bahia', regiao: 'NE', aliquotaInternaPadrao: 20.5 },
  { sigla: 'CE', nome: 'Ceará', regiao: 'NE', aliquotaInternaPadrao: 20 },
  { sigla: 'DF', nome: 'Distrito Federal', regiao: 'CO', aliquotaInternaPadrao: 20 },
  { sigla: 'ES', nome: 'Espírito Santo', regiao: 'SE', aliquotaInternaPadrao: 17 },
  { sigla: 'GO', nome: 'Goiás', regiao: 'CO', aliquotaInternaPadrao: 19 },
  { sigla: 'MA', nome: 'Maranhão', regiao: 'NE', aliquotaInternaPadrao: 22 },
  { sigla: 'MT', nome: 'Mato Grosso', regiao: 'CO', aliquotaInternaPadrao: 17 },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', regiao: 'CO', aliquotaInternaPadrao: 17 },
  { sigla: 'MG', nome: 'Minas Gerais', regiao: 'SE', aliquotaInternaPadrao: 18 },
  { sigla: 'PA', nome: 'Pará', regiao: 'N', aliquotaInternaPadrao: 19 },
  { sigla: 'PB', nome: 'Paraíba', regiao: 'NE', aliquotaInternaPadrao: 20 },
  { sigla: 'PR', nome: 'Paraná', regiao: 'S', aliquotaInternaPadrao: 19.5 },
  { sigla: 'PE', nome: 'Pernambuco', regiao: 'NE', aliquotaInternaPadrao: 20.5 },
  { sigla: 'PI', nome: 'Piauí', regiao: 'NE', aliquotaInternaPadrao: 21 },
  { sigla: 'RJ', nome: 'Rio de Janeiro', regiao: 'SE', aliquotaInternaPadrao: 22 }, // 20% + 2% FCP
  { sigla: 'RN', nome: 'Rio Grande do Norte', regiao: 'NE', aliquotaInternaPadrao: 18 },
  { sigla: 'RS', nome: 'Rio Grande do Sul', regiao: 'S', aliquotaInternaPadrao: 17 },
  { sigla: 'RO', nome: 'Rondônia', regiao: 'N', aliquotaInternaPadrao: 19.5 },
  { sigla: 'RR', nome: 'Roraima', regiao: 'N', aliquotaInternaPadrao: 20 },
  { sigla: 'SC', nome: 'Santa Catarina', regiao: 'S', aliquotaInternaPadrao: 17 },
  { sigla: 'SP', nome: 'São Paulo', regiao: 'SE', aliquotaInternaPadrao: 18 },
  { sigla: 'SE', nome: 'Sergipe', regiao: 'NE', aliquotaInternaPadrao: 19 },
  { sigla: 'TO', nome: 'Tocantins', regiao: 'N', aliquotaInternaPadrao: 20 },
]

export const UFS_MAP = new Map<BrazilianUF, UfOption>(BRAZILIAN_UFS.map((u) => [u.sigla, u]))

/**
 * Tabela de Alíquotas Interestaduais (art. 155, § 2º, IV da CF/88 e Resolução do Senado Federal nº 22/89 e nº 13/2012)
 *
 * Regras constitucionais:
 * - Se produto importado (ou com conteúdo de importação > 40% - Res. SF 13/2012): 4,00%
 * - Origem Sul (S) ou Sudeste (SE) [exceto ES] com destino a Norte (N), Nordeste (NE), Centro-Oeste (CO) ou ES: 7,00%
 * - Demais operações interestaduais (intra S/SE, ou origem N/NE/CO/ES para qualquer UF): 12,00%
 * - Mesma UF (operação interna): alíquota interna da UF de origem
 */
export function getInterstateTaxRate(
  originUf: BrazilianUF,
  destinationUf: BrazilianUF,
  isImportedContent = false,
): number {
  if (originUf === destinationUf) {
    const origin = UFS_MAP.get(originUf)
    return origin?.aliquotaInternaPadrao ?? 18
  }

  // Resolução SF 13/2012 - Produto de origem importada em operação interestadual
  if (isImportedContent) {
    return 4.0
  }

  const originInfo = UFS_MAP.get(originUf)
  const destInfo = UFS_MAP.get(destinationUf)

  if (!originInfo || !destInfo) {
    return 12.0
  }

  // Origem Sul ou Sudeste (exceto Espírito Santo, que tem tratamento de N/NE/CO na saída de acordo com o art. 2º da Res. SF 22/89)
  const isSouthOrSoutheastOrigin =
    (originInfo.regiao === 'S' || originInfo.regiao === 'SE') && originUf !== 'ES'

  // Destino Norte, Nordeste, Centro-Oeste ou Espírito Santo
  const isTargetFavoredRegion =
    destInfo.regiao === 'N' ||
    destInfo.regiao === 'NE' ||
    destInfo.regiao === 'CO' ||
    destinationUf === 'ES'

  if (isSouthOrSoutheastOrigin && isTargetFavoredRegion) {
    return 7.0
  }

  return 12.0
}

// ============================================================================
// 1) SUBSISTEMA: SUBSTITUIÇÃO TRIBUTÁRIA (ICMS-ST)
// ============================================================================

export interface StSubsystemState {
  enabled: boolean // Toggle opt-in geral do subsistema de ST
  // COMPRA: empresa é a substituída (recebe mercadoria com ST recolhido na nota de entrada)
  purchasesStPaid: number // Valor do ICMS-ST recolhido/destacado na compra que integra o custo/CMV
  purchasesBaseSt: number // Base de cálculo do ICMS-ST da nota de compra (informativo)
  // VENDA: empresa é o contribuinte substituto (responsável pela retenção do ICMS-ST)
  isSaleSubstituto: boolean // Se ativo, a empresa apura a retenção de ST na venda
  mvaPercent: number // MVA (Margem de Valor Agregado) original ou ajustada em %
  destInternalIcmsRate: number // Alíquota interna de ICMS do estado de destino (%)
  includeIpiInBase: boolean // Se IPI compõe a base do ST
  ipiRateOrValue: number // % de IPI aplicado sobre a operação ou valor fixo
  includeFreightInBase: boolean // Se frete compõe a base do ST
  freightValue: number // Frete cobrado/pago pelo substituto
  // Simples Nacional: Segregação da receita com ST (LC 123/06 art. 18, §1º, I)
  simplesStExclusive: boolean // Se verdadeiro, vendas com ST têm ICMS segregado/excluído do DAS
  simplesStRevenueShare: number // % da receita bruta que é sujeita a ST (0 a 100%, padrão 100% se ST ativo)
}

export const INITIAL_ST_SUBSYSTEM: StSubsystemState = {
  enabled: false,
  purchasesStPaid: 0,
  purchasesBaseSt: 0,
  isSaleSubstituto: false,
  mvaPercent: 40.0, // MVA sugerida padrão típica de autopeças/alimentos/tintas
  destInternalIcmsRate: 18.0,
  includeIpiInBase: false,
  ipiRateOrValue: 0,
  includeFreightInBase: false,
  freightValue: 0,
  simplesStExclusive: true,
  simplesStRevenueShare: 100,
}

export interface StCalculationResult {
  operationValue: number // Valor base da operação de saída (ex: receita do produto)
  freightInBase: number
  ipiInBase: number
  baseCalculoSt: number // (Operação + IPI + Frete) * (1 + MVA/100)
  debitoProprioIcms: number // ICMS próprio da operação destacada
  icmsStTotalCalculado: number // (Base ST * Alíquota Interna Destino) - Débito Próprio
  icmsStAReter: number // max(0, icmsStTotalCalculado)
  // Efeito nas Compras
  costAdditionPurchases: number // ICMS-ST na compra que se soma ao custo do produto/CMV
}

/**
 * Calcula a apuração de Substituição Tributária na Venda (Substituto)
 * Base Legal: Lei Complementar 87/96, art. 8º; Convênio ICMS 142/2018.
 * Fórmula: Base ST = (Valor Operação + IPI + Frete + Outras Despesas) * (1 + MVA/100)
 * ICMS ST = (Base ST * Alíquota Interna Destino) - ICMS Próprio da Operação
 */
export function calculateSaleIcmsSt(params: {
  operationValue: number
  originInterstateRate: number // Alíquota própria aplicada na saída (ex: 7%, 12% ou alíquota interna)
  mvaPercent: number
  destInternalRate: number
  includeIpi?: boolean
  ipiPercentOrVal?: number
  includeFreight?: boolean
  freightVal?: number
}): StCalculationResult {
  const opVal = Math.max(0, params.operationValue || 0)
  const freight = params.includeFreight ? Math.max(0, params.freightVal || 0) : 0
  const ipiVal = params.includeIpi ? (opVal * Math.max(0, params.ipiPercentOrVal || 0)) / 100 : 0

  const subtotalBase = opVal + freight + ipiVal
  const mvaMultiplier = 1 + Math.max(0, params.mvaPercent || 0) / 100
  const baseCalculoSt = Math.round(subtotalBase * mvaMultiplier * 100) / 100

  // Débito próprio da operação de saída
  const debitoProprioIcms =
    Math.round((((opVal + freight) * Math.max(0, params.originInterstateRate || 0)) / 100) * 100) /
    100

  // Débito total da ST
  const debitoTotalDestino =
    Math.round(((baseCalculoSt * Math.max(0, params.destInternalRate || 0)) / 100) * 100) / 100

  const icmsStTotalCalculado = Math.round((debitoTotalDestino - debitoProprioIcms) * 100) / 100
  const icmsStAReter = Math.max(0, icmsStTotalCalculado)

  return {
    operationValue: opVal,
    freightInBase: freight,
    ipiInBase: ipiVal,
    baseCalculoSt,
    debitoProprioIcms,
    icmsStTotalCalculado,
    icmsStAReter,
    costAdditionPurchases: 0,
  }
}

// ============================================================================
// 2) SUBSISTEMA: OPERAÇÕES INTERESTADUAIS (DIFAL / EC 87/15 / EC 188/22)
// ============================================================================

export interface InterstateSubsystemState {
  enabled: boolean // Toggle opt-in geral do subsistema de operações interestaduais
  originUf: BrazilianUF // UF de origem (padrão SP)
  destinationUf: BrazilianUF // UF de destino (padrão RJ)
  isEndConsumer: boolean // Destinatário é consumidor final? (sim / não)
  isTaxpayer: boolean // Destinatário é contribuinte do ICMS? (com Inscrição Estadual)
  isImportedContent: boolean // Produto importado / FCI (aplica alíquota de 4%)
  fcpPercent: number // Fundo de Combate à Pobreza no estado de destino (0% a 2%, padrão 0%)
  // ENTRADA INTERESTADUAL (COMPRAS):
  isPurchaseForUsageOrAsset: boolean // Entrada destinada a uso/consumo ou ativo imobilizado (gera DIFAL na entrada)
  purchasesOriginUf: BrazilianUF // UF de origem do fornecedor na compra
  purchasesDestUf: BrazilianUF // UF de destino (nossa empresa)
}

export const INITIAL_INTERSTATE_SUBSYSTEM: InterstateSubsystemState = {
  enabled: false,
  originUf: 'SP',
  destinationUf: 'RJ',
  isEndConsumer: true,
  isTaxpayer: false,
  isImportedContent: false,
  fcpPercent: 0,
  isPurchaseForUsageOrAsset: false,
  purchasesOriginUf: 'SP',
  purchasesDestUf: 'SP',
}

export interface InterstateCalculationResult {
  interstateRate: number // Alíquota interestadual aplicada (4%, 7% ou 12%)
  internalRateDest: number // Alíquota interna do estado de destino
  fcpRate: number // % FCP do destino
  hasDifalSale: boolean // Se há cálculo de DIFAL na venda (consumidor final não contribuinte)
  baseCalculo: number
  icmsOrigemInterestadual: number // Base * Alíquota Interestadual (recolhido na UF de origem)
  difalTotal: number // Base * (Alíquota Interna Destino - Alíquota Interestadual)
  fcpValue: number // Base * FCP%
  difalDestino: number // Parcela destinada à UF de destino (100% conforme EC 87/15 após transição, ou com partilha se aplicável)
  // DIFAL na Compra (Uso/Consumo ou Ativo)
  hasDifalPurchase: boolean
  purchasesInterstateRate: number
  purchasesInternalRateDest: number
  difalPurchaseValue: number // Entrada uso/consumo: base * (Alíquota Interna - Alíquota Interestadual)
}

/**
 * Apuração de Operações Interestaduais e DIFAL
 * Base Legal: Emenda Constitucional 87/2015, Lei Complementar 190/2022, Convênio ICMS 236/2021
 */
export function calculateInterstateOperation(params: {
  subsystem: InterstateSubsystemState
  saleGrossValue: number
  purchasesGrossValue: number
}): InterstateCalculationResult {
  const {
    enabled,
    originUf,
    destinationUf,
    isEndConsumer,
    isTaxpayer,
    isImportedContent,
    fcpPercent,
    isPurchaseForUsageOrAsset,
    purchasesOriginUf,
    purchasesDestUf,
  } = params.subsystem

  if (!enabled) {
    return {
      interstateRate: 18,
      internalRateDest: 18,
      fcpRate: 0,
      hasDifalSale: false,
      baseCalculo: params.saleGrossValue,
      icmsOrigemInterestadual: 0,
      difalTotal: 0,
      fcpValue: 0,
      difalDestino: 0,
      hasDifalPurchase: false,
      purchasesInterstateRate: 18,
      purchasesInternalRateDest: 18,
      difalPurchaseValue: 0,
    }
  }

  // 1. VENDA INTERESTADUAL
  const interstateRate = getInterstateTaxRate(originUf, destinationUf, isImportedContent)
  const destUfInfo = UFS_MAP.get(destinationUf)
  const internalRateDest = destUfInfo?.aliquotaInternaPadrao ?? 18
  const fcpRate = Math.max(0, fcpPercent || 0)

  // DIFAL na venda incide quando a operação é interestadual E destinada a CONSUMIDOR FINAL NÃO CONTRIBUINTE
  const isInterstateSale = originUf !== destinationUf
  const hasDifalSale = isInterstateSale && isEndConsumer && !isTaxpayer

  const baseCalculo = Math.max(0, params.saleGrossValue || 0)
  const icmsOrigemInterestadual = Math.round(((baseCalculo * interstateRate) / 100) * 100) / 100

  let difalTotal = 0
  let fcpValue = 0
  let difalDestino = 0

  if (hasDifalSale) {
    const rateDiff = Math.max(0, internalRateDest - interstateRate)
    difalTotal = Math.round(((baseCalculo * rateDiff) / 100) * 100) / 100
    fcpValue = Math.round(((baseCalculo * fcpRate) / 100) * 100) / 100
    // Conforme EC 87/15 a partir de 2019, 100% do DIFAL é devido ao estado de destino
    difalDestino = difalTotal + fcpValue
  }

  // 2. COMPRA INTERESTADUAL
  const isInterstatePurchase = purchasesOriginUf !== purchasesDestUf
  const purchasesInterstateRate = getInterstateTaxRate(purchasesOriginUf, purchasesDestUf, false)
  const ourDestInfo = UFS_MAP.get(purchasesDestUf)
  const purchasesInternalRateDest = ourDestInfo?.aliquotaInternaPadrao ?? 18

  // DIFAL na entrada ocorre para mercadorias destinadas a uso/consumo ou ativo imobilizado
  const hasDifalPurchase = isInterstatePurchase && isPurchaseForUsageOrAsset
  let difalPurchaseValue = 0

  if (hasDifalPurchase) {
    const purchaseDiff = Math.max(0, purchasesInternalRateDest - purchasesInterstateRate)
    difalPurchaseValue = Math.round(((params.purchasesGrossValue * purchaseDiff) / 100) * 100) / 100
  }

  return {
    interstateRate,
    internalRateDest,
    fcpRate,
    hasDifalSale,
    baseCalculo,
    icmsOrigemInterestadual,
    difalTotal,
    fcpValue,
    difalDestino,
    hasDifalPurchase,
    purchasesInterstateRate,
    purchasesInternalRateDest,
    difalPurchaseValue,
  }
}
