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
 * Converte string digitada pelo usuário em número.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56", etc.
 * Sempre retorna número finito; vazio, NaN e Infinity viram 0.
 */
export function parseBRNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : 0
  }
  if (!input) return 0

  let cleaned = String(input).trim()
  // Remove "R$", "%", espaços e outros caracteres não numéricos exceto , . e -
  cleaned = cleaned.replace(/[R$\s%]/g, '')
  if (!cleaned) return 0

  // Se tiver tanto '.' quanto ',', assume '.' como milhar e ',' como decimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    // Apenas vírgula: substitui por ponto
    cleaned = cleaned.replace(',', '.')
  }

  const num = parseFloat(cleaned)
  return Number.isFinite(num) ? num : 0
}
