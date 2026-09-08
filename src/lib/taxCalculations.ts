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
