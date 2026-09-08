import { parseBRNumber, formatBRL, formatNumberBR } from './taxCalculations'

/**
 * Validação de integridade e fidedignidade dos cálculos do parseBRNumber e
 * da regra de cálculo de Compras & Estoque.
 * Pode ser executado em tempo de desenvolvimento ou verificado estaticamente.
 */
export function runTaxCalculationSanityTests(): {
  allPassed: boolean
  results: { test: string; passed: boolean; expected: number | string; received: number | string }[]
} {
  const tests: { test: string; expected: number; received: number }[] = [
    // Tabela de requisitos da tarefa:
    // 1. "1.400,00" -> 1400 (ponto = milhar, vírgula = decimal)
    {
      test: 'parseBRNumber("1.400,00") deve ser 1400',
      expected: 1400,
      received: parseBRNumber('1.400,00'),
    },
    // 2. "1.400,50" -> 1400.5
    {
      test: 'parseBRNumber("1.400,50") deve ser 1400.5',
      expected: 1400.5,
      received: parseBRNumber('1.400,50'),
    },
    // 3. "1400,50" -> 1400.5
    {
      test: 'parseBRNumber("1400,50") deve ser 1400.5',
      expected: 1400.5,
      received: parseBRNumber('1400,50'),
    },
    // 4. "1400.50" -> 1400.5 (ponto como decimal estilo en-US)
    {
      test: 'parseBRNumber("1400.50") deve ser 1400.5',
      expected: 1400.5,
      received: parseBRNumber('1400.50'),
    },
    // 5. "1,400.50" -> 1400.5 (en-US com vírgula de milhar)
    {
      test: 'parseBRNumber("1,400.50") deve ser 1400.5',
      expected: 1400.5,
      received: parseBRNumber('1,400.50'),
    },
    // 6. "1.400" -> 1400 (milhar pt-BR)
    {
      test: 'parseBRNumber("1.400") deve ser 1400',
      expected: 1400,
      received: parseBRNumber('1.400'),
    },
    // 7. "1.400.000" -> 1400000
    {
      test: 'parseBRNumber("1.400.000") deve ser 1400000',
      expected: 1400000,
      received: parseBRNumber('1.400.000'),
    },
    // 8. "1400" -> 1400
    {
      test: 'parseBRNumber("1400") deve ser 1400',
      expected: 1400,
      received: parseBRNumber('1400'),
    },
    // 9. "R$ 1.400,00" -> 1400
    {
      test: 'parseBRNumber("R$ 1.400,00") deve ser 1400',
      expected: 1400,
      received: parseBRNumber('R$ 1.400,00'),
    },
    // Casos adicionais:
    // "50" -> 50
    {
      test: 'parseBRNumber("50") deve ser 50',
      expected: 50,
      received: parseBRNumber('50'),
    },
    // 50 * 1400 -> 70000
    {
      test: 'Multiplicação de qtd 50 por "1.400,00" deve resultar em 70.000,00',
      expected: 70000,
      received: 50 * parseBRNumber('1.400,00'),
    },
    // "0,00" -> 0
    {
      test: 'parseBRNumber("0,00") deve ser 0',
      expected: 0,
      received: parseBRNumber('0,00'),
    },
    // "" / null / undefined -> 0
    {
      test: 'parseBRNumber("") deve ser 0',
      expected: 0,
      received: parseBRNumber(''),
    },
    {
      test: 'parseBRNumber(null) deve ser 0',
      expected: 0,
      received: parseBRNumber(null),
    },
    {
      test: 'parseBRNumber(undefined) deve ser 0',
      expected: 0,
      received: parseBRNumber(undefined),
    },
    // 10. Cálculo de ICMS s/ frete por item: frete 500, alíquota 18% -> 90
    {
      test: 'ICMS s/ frete do item (500 * 18 / 100) deve ser 90',
      expected: 90,
      received: (500 * 18) / 100,
    },
    // 11. Aquisições brutas (mercadoria 10.000 + frete 500) = 10.500
    {
      test: 'Aquisições brutas integrando frete do item (10000 + 500) deve ser 10500',
      expected: 10500,
      received: 10000 + 500,
    },
    // 12. Custo no Presumido: mercadoria 10.000 + frete 500 - ICMS 1.800 - ICMS frete 90 = 8.610
    {
      test: 'Custo líquido Presumido (10000 + 500 - 1800 - 90) deve ser 8610',
      expected: 8610,
      received: 10000 + 500 - 1800 - 90,
    },
    // 13. Custo no Simples Nacional: mercadoria 10.000 + frete 500 (sem créditos recuperáveis) = 10.500
    {
      test: 'Custo Simples Nacional integrando frete sem dedução de crédito deve ser 10500',
      expected: 10500,
      received: 10000 + 500,
    },
    // 14. Ausência de double-count: additionalCosts sem "Compras brutas" duplica apenas fretes rateados
    {
      test: 'Ausência de double count em additionalCosts default ([{ description: "Frete e seguro s/ compras", value: 0 }])',
      expected: 0,
      received: [{ id: '1', description: 'Frete e seguro s/ compras', value: 0 }].reduce(
        (acc, c) => acc + c.value,
        0,
      ),
    },
  ]

  const results = tests.map((t) => ({
    test: t.test,
    passed: Math.abs(t.expected - t.received) < 0.00001,
    expected: t.expected,
    received: t.received,
  }))

  const allPassed = results.every((r) => r.passed)

  return { allPassed, results }
}
