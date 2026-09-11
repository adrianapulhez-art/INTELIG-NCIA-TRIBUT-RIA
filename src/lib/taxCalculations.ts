/**
 * Utilitários de formatação e parsing para moeda (BRL) e percentuais
 * Padrão brasileiro: R$ 1.234,56 / -R$ 123,45 / 0,65%
 */

export function formatBRL(
  value: number | null | undefined,
  options?: { showSignForNegative?: boolean },
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'R$ 0,00'
  }

  const isNeg = value < 0
  const absVal = Math.abs(value)
  const parts = absVal.toFixed(2).split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decPart = parts[1]

  const formatted = `R$ ${intPart},${decPart}`
  if (isNeg) {
    return `-${formatted}`
  }
  return formatted
}

export function formatNumberBR(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0,00'
  }
  const parts = value.toFixed(decimals).split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decPart = parts[1] || ''
  return decPart ? `${intPart},${decPart}` : intPart
}

export function formatPercentBR(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0,00%'
  }
  return `${formatNumberBR(value, decimals)}%`
}

export function formatFactorBR(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0,0000'
  }
  return value.toFixed(decimals).replace('.', ',')
}

/**
 * Converte string digitada pelo usuário em número de forma robusta e determinística.
 * Aceita:
 * - "1.400,00" -> 1400 (ponto = milhar, vírgula = decimal)
 * - "1.400,50" -> 1400.5
 * - "1400,50" -> 1400.5
 * - "1400.50" -> 1400.5 (estilo en-US digitado pelo usuário)
 * - "1,400.50" -> 1400.5 (en-US com vírgula de milhar)
 * - "1.400" -> 1400 (milhar sem decimal)
 * - "1.400.000" -> 1400000 (milhares)
 * - "1400" -> 1400
 * - "R$ 1.400,00" -> 1400 (limpa símbolos)
 * Sempre retorna número finito; vazio, NaN e Infinity viram 0.
 */
/**
 * Apuração de item de compra conforme regras fiscais da Calculadora de Compras:
 * 1. Preço Total = valor unitário da compra × quantidade comprada do item.
 *    Valor bruto da compra, SEM passar pelo custo médio do estoque, SEM deduzir tributos.
 * 2. Compras Líquidas = valor das compras (unitário × quantidade) MENOS tributos recuperáveis por regime:
 *    - Lucro Presumido: deduz ICMS destacado sobre mercadoria e ICMS sobre frete do item;
 *    - Lucro Real: deduz ICMS destacado, ICMS sobre frete, PIS (1,65%) e COFINS (7,60%);
 *    - Simples Nacional: nada é recuperável -> valor bruto integral.
 *    Também NÃO passa pelo custo médio do estoque nem pelo estoque inicial/final.
 */
export interface PurchaseItemTaxCalculationInput {
  quantity: number
  unitPrice: number
  merchandiseValue?: number
  freightValue?: number
  icmsFreightRate?: number
  icmsFreightValue?: number
  ipiRate?: number
  calculatedIpi?: number
  hasSt?: boolean
  stValue?: number
  icmsRate?: number
  calculatedIcms?: number
  calculatedPis?: number
  calculatedCofins?: number
  freightPisCofinsMethod?: 'position_b' | 'position_a'
}

export function calculatePurchaseItemGrossTotal(
  item: Pick<PurchaseItemTaxCalculationInput, 'quantity' | 'unitPrice' | 'merchandiseValue'>,
): number {
  const qty = Math.max(0, Number.isFinite(item.quantity) ? item.quantity : 0)
  const unit = Math.max(0, Number.isFinite(item.unitPrice) ? item.unitPrice : 0)
  if (qty > 0 && unit > 0) {
    return Math.round(qty * unit * 100) / 100
  }
  const merch = Math.max(
    0,
    Number.isFinite(item.merchandiseValue) ? (item.merchandiseValue ?? 0) : 0,
  )
  if (merch > 0) {
    return Math.round(merch * 100) / 100
  }
  return 0
}

/**
 * Apuração do Custo Total / Compras Líquidas do item de compra conforme regime:
 * Base bruta de aquisição = Mercadoria + Frete (+ IPI não recuperável + ST na entrada).
 * O frete compõe o custo total de aquisição nos 3 regimes (art. 289 do RIR/2018).
 * Deduções de tributos recuperáveis conforme o regime:
 * - Lucro Presumido: Base Bruta − ICMS mercadoria − ICMS frete
 * - Lucro Real: Base Bruta − ICMS mercadoria − ICMS frete − PIS (1,65%) − COFINS (7,60%)
 * - Simples Nacional: Base Bruta integral (nada recuperável — art. 23 LC 123/2006)
 */
export function calculatePurchaseItemNetPurchases(
  item: PurchaseItemTaxCalculationInput,
  regime: 'presumido' | 'real' | 'simples',
): number {
  const merchGross = calculatePurchaseItemGrossTotal(item)
  const freight = Math.max(0, Number.isFinite(item.freightValue) ? (item.freightValue ?? 0) : 0)
  const ipi =
    item.calculatedIpi !== undefined && Number.isFinite(item.calculatedIpi)
      ? Math.max(0, item.calculatedIpi)
      : Math.max(0, (merchGross * Math.max(0, item.ipiRate ?? 0)) / 100)
  const st =
    item.hasSt && item.stValue !== undefined && Number.isFinite(item.stValue)
      ? Math.max(0, item.stValue)
      : 0

  // Base bruta de aquisição: mercadoria + frete + IPI não recuperável + ST
  const acquisitionGross = merchGross + freight + ipi + st
  if (acquisitionGross <= 0) return 0

  if (regime === 'simples') {
    // Simples Nacional: nada é recuperável -> custo bruto integral
    return Math.round(acquisitionGross * 100) / 100
  }

  // ICMS destacado sobre a mercadoria do item
  const icms =
    item.calculatedIcms !== undefined && Number.isFinite(item.calculatedIcms)
      ? Math.max(0, item.calculatedIcms)
      : Math.max(0, (merchGross * Math.max(0, item.icmsRate ?? 0)) / 100)

  // ICMS sobre frete do item se houver
  const icmsFreight =
    item.icmsFreightValue !== undefined && Number.isFinite(item.icmsFreightValue)
      ? Math.max(0, item.icmsFreightValue)
      : Math.max(0, (freight * Math.max(0, item.icmsFreightRate ?? 0)) / 100)

  if (regime === 'presumido') {
    // Lucro Presumido: mercadoria + frete (+ ipi + st) - ICMS mercadoria - ICMS frete
    return Math.max(0, Math.round((acquisitionGross - icms - icmsFreight) * 100) / 100)
  }

  // Lucro Real: deduz ICMS, ICMS s/ frete, PIS e COFINS (conforme método da tese / frete)
  const method = item.freightPisCofinsMethod || 'position_b'
  const freightNetIcms = Math.max(0, freight - icmsFreight)
  const mercNetIcms = Math.max(0, merchGross - icms)

  if (method === 'position_a') {
    // Posição A: PIS 1,65% s/ mercNetIcms + COFINS 7,60% s/ mercNetIcms + Crédito sobre frete 4,65% s/ freightNetIcms
    const pis =
      item.calculatedPis !== undefined && Number.isFinite(item.calculatedPis)
        ? Math.max(0, item.calculatedPis)
        : Math.round(mercNetIcms * 0.0165 * 100) / 100
    const cofins =
      item.calculatedCofins !== undefined && Number.isFinite(item.calculatedCofins)
        ? Math.max(0, item.calculatedCofins)
        : Math.round(mercNetIcms * 0.076 * 100) / 100
    const freightCredit = Math.round(freightNetIcms * 0.0465 * 100) / 100

    return Math.max(
      0,
      Math.round((acquisitionGross - icms - icmsFreight - pis - cofins - freightCredit) * 100) /
        100,
    )
  }

  // Posição B (padrão): base PIS/COFINS = mercadoria líquida + frete líquido de ICMS
  const combinedBase = mercNetIcms + freightNetIcms
  const pis =
    item.calculatedPis !== undefined && Number.isFinite(item.calculatedPis)
      ? Math.max(0, item.calculatedPis)
      : Math.round(combinedBase * 0.0165 * 100) / 100
  const cofins =
    item.calculatedCofins !== undefined && Number.isFinite(item.calculatedCofins)
      ? Math.max(0, item.calculatedCofins)
      : Math.round(combinedBase * 0.076 * 100) / 100

  return Math.max(0, Math.round((acquisitionGross - icms - icmsFreight - pis - cofins) * 100) / 100)
}

export function parseBRNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : 0
  }
  if (!input) return 0

  let cleaned = String(input).trim()
  // Preserva sinal negativo inicial se houver
  const isNegative = cleaned.startsWith('-') || cleaned.endsWith('-')
  // Remove "R$", "%", letras, espaços e símbolos exceto dígitos, '.', ',' e '-'
  cleaned = cleaned.replace(/[^\d.,-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === ',') return 0

  // Remove eventuais hífens internos
  cleaned = cleaned.replace(/-/g, '')
  if (!cleaned) return 0

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  let normalized = cleaned

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastComma > lastDot) {
      // Formato pt-BR padrão: 1.400,50 -> ponto é milhar, vírgula é decimal
      normalized = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato en-US: 1,400.50 -> vírgula é milhar, ponto é decimal
      normalized = cleaned.replace(/,/g, '')
    }
  } else if (hasComma) {
    // Apenas vírgula(s)
    const commas = cleaned.split(',')
    if (commas.length === 2) {
      // Ex.: "1400,50" ou "1,5" -> vírgula decimal
      normalized = `${commas[0]}.${commas[1]}`
    } else {
      // Múltiplas vírgulas, ex: "1,400,000" -> vírgula como milhar
      normalized = cleaned.replace(/,/g, '')
    }
  } else if (hasDot) {
    // Apenas ponto(s)
    const dots = cleaned.split('.')
    if (dots.length === 2) {
      const decPart = dots[1]
      // Se tiver exatamente 3 dígitos após o ponto E parte inteira de 1-3 dígitos (ex: "1.400", "12.345"),
      // no contexto brasileiro isso é tipicamente separador de milhar digitado sem decimal!
      // Se tiver 1 ou 2 dígitos (ex.: "1400.5", "1400.50", "0.5"), é ponto decimal estilo en-US.
      // Se tiver mais de 3 dígitos (ex.: "1.5432"), trata como decimal.
      if (decPart.length === 3 && dots[0].length >= 1 && dots[0].length <= 3) {
        // Ex.: "1.400" -> 1400
        normalized = dots[0] + dots[1]
      } else {
        // Ex.: "1400.50", "1.5", "0.25"
        normalized = cleaned
      }
    } else {
      // Múltiplos pontos, ex.: "1.400.000" -> milhares
      normalized = cleaned.replace(/\./g, '')
    }
  }

  const num = parseFloat(normalized)
  if (!Number.isFinite(num)) return 0
  return isNegative ? -Math.abs(num) : num
}
