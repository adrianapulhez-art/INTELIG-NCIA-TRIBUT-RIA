import { type ItemIntegracaoArt12 } from './integracaoComprasArt12'
import {
  type CardMemoriaQuatroCelulas,
  type LinhaPassoCard,
  roundHalfUp,
  fmtSN,
} from './art12SnCalculations'

export interface ResultadoCelulaLrXLr {
  id: string
  fornecedorRotulo: string
  fornecedorSigla: 'LR'
  adquirenteRotulo: string
  adquirenteSigla: 'LR'
  rotuloConfronto: string

  quantidade: number

  hoje: {
    mercadorias: number
    frete: number
    notaCheia: number
    icmsCredito: number
    pisCredito: number
    cofinsCredito: number
    baseSemIcms: number
    comprasLiquidas: number
    custoUnitario: number
  }

  exercicio2027: {
    receitaLiquidaPreservada: number
    cbsAliquotaPct: number
    cbsDestacada: number
    ibsAliquotaPct: number
    ibsDestacado: number
    subtotalAntesIcms: number
    divisorIcms: number
    notaCheia: number
    icmsDestacado: number
    fatorDivisorExibido: number
    fatorDivisorMotor: number
    comprasLiquidas: number
    custoUnitario: number
  }

  deltaUnitario: number
  deltaPct: number

  // Contraste com LR × LP
  contrasteLp: {
    custoUnitario: number
    deltaPct: number
  }

  card01: CardMemoriaQuatroCelulas
  card02: CardMemoriaQuatroCelulas
  card03: CardMemoriaQuatroCelulas
}

/**
 * Célula canônica chancelada pela Adri: Lucro Real × Lucro Real (LR × LR Neutro).
 *
 * Régua A: fornecedor LR reprecifica preservando a própria receita líquida de 31.551,96.
 *
 * CARD 01 (HOJE 2026):
 * mercadorias 42.000,00 (30 un × 1.400,00) + frete 400,00 = nota 42.400,00
 * (−) crédito ICMS 7.632,00 (18%)
 * (−) PIS 1,65% sobre 34.768,00 = 573,67
 * (−) COFINS 7,60% sobre 34.768,00 = 2.642,37
 * = compras líquidas 31.551,96 · ÷ 30 = 1.051,73
 *
 * CARD 02 (Fornecedor LR, 2027, Régua A):
 * receita líquida a preservar 31.551,96 (= 42.400 − 7.632 − 3.216,04)
 * (+) CBS 8,8% = 2.776,57 (por fora)
 * (+) IBS 0,1% = 31,55 (por fora)
 * subtotal 34.360,08
 * (÷ 0,82) = nota 41.902,54
 * ICMS destacado 7.542,46
 * fator divisor exibido 0,3655 (0,365562 no motor; produto 0,9750 × 0,9800 × 0,9700 × 0,8200 × 0,4810)
 *
 * CARD 03 (Adquirente LR, 2027):
 * nota 41.902,54
 * (−) ICMS 7.542,46
 * (−) CBS 2.776,57
 * (−) IBS 31,55
 * = compras líquidas 31.551,96 · ÷ 30 = 1.051,73 · Δ 0,00% (célula neutra)
 */
export function calcularCelulaLrXLr(
  item?: ItemIntegracaoArt12,
  cbsAliquotaPct: number = 8.8,
): ResultadoCelulaLrXLr {
  const qtd = item?.quantity && item.quantity > 0 ? item.quantity : 30
  const mercHoje = item?.merchandiseValue !== undefined ? item.merchandiseValue : 42000.0
  const freteHoje = item?.freightValue !== undefined ? item.freightValue : 400.0
  const notaHoje = roundHalfUp(mercHoje + freteHoje, 2) // 42.400,00

  // CARD 01 (HOJE 2026)
  const icmsCreditoHoje = roundHalfUp(notaHoje * 0.18, 2) // 7.632,00
  const baseSemIcmsHoje = roundHalfUp(notaHoje - icmsCreditoHoje, 2) // 34.768,00
  const pisCreditoHoje = roundHalfUp(baseSemIcmsHoje * 0.0165, 2) // 573,67
  const cofinsCreditoHoje = roundHalfUp(baseSemIcmsHoje * 0.076, 2) // 2.642,37
  const totalCreditosHoje = roundHalfUp(icmsCreditoHoje + pisCreditoHoje + cofinsCreditoHoje, 2) // 10.848,04
  const comprasLiquidasHoje = roundHalfUp(notaHoje - totalCreditosHoje, 2) // 31.551,96
  const unitarioHoje = roundHalfUp(comprasLiquidasHoje / qtd, 2) // 1.051,73

  // CARD 02 (Fornecedor LR 2027, Régua A)
  const receitaLiquidaPreservada = comprasLiquidasHoje // 31.551,96
  const ibsAliquotaPct = 0.1
  const cbsDestacada = roundHalfUp((receitaLiquidaPreservada * cbsAliquotaPct) / 100, 2) // 2.776,57
  const ibsDestacado = roundHalfUp((receitaLiquidaPreservada * ibsAliquotaPct) / 100, 2) // 31,55
  const subtotalAntesIcms = roundHalfUp(receitaLiquidaPreservada + cbsDestacada + ibsDestacado, 2) // 34.360,08
  const divisorIcms = 0.82 // (1 - 0.18)
  const nota2027 = roundHalfUp(subtotalAntesIcms / divisorIcms, 2) // 41.902,54
  const icmsDestacado2027 = roundHalfUp(nota2027 * 0.18, 2) // 7.542,46

  // Fator divisor da Markup Pós-Reforma chancelado pela Adri:
  // Fatores idênticos aos do LP (0,9750 × 0,9800 × 0,9700 × 0,8200 × 0,4810) = 0,3655621644...
  const fatorDivisorMotor = 0.365562
  const fatorDivisorExibido = 0.3655

  // CARD 03 (Adquirente LR 2027)
  const comprasLiquidas2027 = roundHalfUp(
    nota2027 - icmsDestacado2027 - cbsDestacada - ibsDestacado,
    2,
  ) // 31.551,96
  const unitario2027 = roundHalfUp(comprasLiquidas2027 / qtd, 2) // 1.051,73
  const deltaUnitario = roundHalfUp(unitario2027 - unitarioHoje, 2) // 0,00
  const deltaPct = 0.0

  // Contraste didático vs LR × LP
  const contrasteLp = {
    custoUnitario: 1116.63,
    deltaPct: 6.17,
  }

  // Linhas do CARD 01
  const linhasCard01: LinhaPassoCard[] = [
    {
      sinal: '(+)',
      label: 'Mercadorias na nota fiscal',
      formula: `${qtd} un. × R$ ${fmtSN(mercHoje / qtd, 2)}`,
      valor: mercHoje,
      fundamento: 'LC 214/2025, art. 12, caput: valor da operação integral.',
    },
    {
      sinal: '(+)',
      label: 'Frete sobre compras cobrado pelo fornecedor',
      formula: 'transporte cobrado na nota de aquisição',
      valor: freteHoje,
      fundamento: 'LC 214/2025, art. 12, §1º, IV: frete cobrado integra a operação.',
    },
    {
      sinal: '(−)',
      label: 'Crédito ICMS (18% sobre nota cheia)',
      formula: `18% × R$ ${fmtSN(notaHoje, 2)}`,
      valor: -icmsCreditoHoje,
      fundamento: 'Art. 155, §2º, I, CF/88 c/c LC 87/1996: regime não cumulativo de ICMS.',
    },
    {
      sinal: '(−)',
      label: 'Crédito PIS (1,65% sobre base sem ICMS)',
      formula: `1,65% × (R$ ${fmtSN(notaHoje, 2)} − R$ ${fmtSN(icmsCreditoHoje, 2)} = R$ ${fmtSN(baseSemIcmsHoje, 2)})`,
      valor: -pisCreditoHoje,
      fundamento: 'Lei 10.637/2002 c/c RE 574.706/STF (Tema 69): ICMS fora da base de PIS.',
    },
    {
      sinal: '(−)',
      label: 'Crédito COFINS (7,60% sobre base sem ICMS)',
      formula: `7,60% × (R$ ${fmtSN(notaHoje, 2)} − R$ ${fmtSN(icmsCreditoHoje, 2)} = R$ ${fmtSN(baseSemIcmsHoje, 2)})`,
      valor: -cofinsCreditoHoje,
      fundamento: 'Lei 10.833/2003 c/c RE 574.706/STF (Tema 69): ICMS fora da base de COFINS.',
    },
    {
      sinal: '(=)',
      label: 'Compras líquidas em 2026 (custo de aquisição LR)',
      formula: `R$ ${fmtSN(notaHoje, 2)} − R$ ${fmtSN(icmsCreditoHoje, 2)} − R$ ${fmtSN(pisCreditoHoje, 2)} − R$ ${fmtSN(cofinsCreditoHoje, 2)}`,
      valor: comprasLiquidasHoje,
      destaque: true,
      fundamento:
        'Regra de ouro pré-reforma: creditamento integral de ICMS e PIS/COFINS pelo Lucro Real.',
    },
    {
      sinal: '(÷)',
      label: 'Custo unitário de aquisição HOJE (2026)',
      formula: `R$ ${fmtSN(comprasLiquidasHoje, 2)} ÷ ${qtd} un.`,
      valor: unitarioHoje,
      destaque: true,
      fundamento: 'Baseline de comparação unitária pré-reforma do adquirente LR.',
    },
  ]

  const card01: CardMemoriaQuatroCelulas = {
    numero: 'CARD 01',
    titulo: '1º CUSTO DE AQUISIÇÃO PARA O ADQUIRENTE (LR · 2026)',
    subtitulo: 'Memória de aquisição HOJE · compra de fornecedor LR · LR × LR',
    cor: 'emerald',
    linhas: linhasCard01,
  }

  // Linhas do CARD 02
  const linhasCard02: LinhaPassoCard[] = [
    {
      sinal: '(=)',
      label: 'Receita líquida a preservar pelo fornecedor LR (Régua A)',
      formula: `R$ ${fmtSN(notaHoje, 2)} − ICMS R$ ${fmtSN(icmsCreditoHoje, 2)} − PIS/COFINS R$ ${fmtSN(pisCreditoHoje + cofinsCreditoHoje, 2)}`,
      valor: receitaLiquidaPreservada,
      destaque: true,
      fundamento:
        'Chancela da Adri (Régua A): fornecedor LR reprecifica preservando a própria receita líquida de 31.551,96.',
    },
    {
      sinal: '(+)',
      label: `CBS ${fmtSN(cbsAliquotaPct, 2)}% por fora (destacada na nota fiscal)`,
      formula: `${fmtSN(cbsAliquotaPct, 2)}% × R$ ${fmtSN(receitaLiquidaPreservada, 2)}`,
      valor: cbsDestacada,
      fundamento:
        'LC 214/2025, art. 12, §2º, I e V: CBS não integra a própria base de cálculo (incidência por fora) e ICMS fora da base.',
    },
    {
      sinal: '(+)',
      label: 'IBS 0,10% por fora (destacado na nota fiscal — alíquota teste)',
      formula: `0,10% × R$ ${fmtSN(receitaLiquidaPreservada, 2)}`,
      valor: ibsDestacado,
      fundamento:
        'LC 214/2025, art. 12, §2º, I e V + art. 344: IBS não integra a própria base de cálculo e ICMS fora da base.',
    },
    {
      sinal: '(=)',
      label: 'Subtotal antes do ICMS por dentro (2027)',
      formula: `R$ ${fmtSN(receitaLiquidaPreservada, 2)} + R$ ${fmtSN(cbsDestacada, 2)} + R$ ${fmtSN(ibsDestacado, 2)}`,
      valor: subtotalAntesIcms,
      fundamento: 'Base recomposta antes do desembute do ICMS estadual na transição.',
    },
    {
      sinal: '(÷)',
      label: 'Desembute do ICMS 18% por dentro (÷ 0,820000)',
      formula: `R$ ${fmtSN(subtotalAntesIcms, 2)} ÷ (1 − 0,18) · fator divisor motor ${fatorDivisorMotor.toFixed(6)} (exibido ${fatorDivisorExibido.toFixed(4)})`,
      valor: divisorIcms,
      fundamento:
        'Art. 12, §2º + ADCT art. 128: ICMS estadual permanece por dentro até a transição; fatores idênticos aos do LP (0,9750 × 0,9800 × 0,9700 × 0,8200 × 0,4810).',
    },
    {
      sinal: '(=)',
      label: 'Preço da nota fiscal do fornecedor LR em 2027',
      formula: `R$ ${fmtSN(subtotalAntesIcms, 2)} ÷ 0,82 = R$ ${fmtSN(nota2027, 2)} [ICMS destacado: R$ ${fmtSN(icmsDestacado2027, 2)}]`,
      valor: nota2027,
      destaque: true,
      fundamento:
        'Preço formado pelo fornecedor LR em 2027 pela Régua A chancelada: nota 41.902,54 com ICMS destacado de 7.542,46.',
    },
  ]

  const card02: CardMemoriaQuatroCelulas = {
    numero: 'CARD 02',
    titulo: '2º FORMAÇÃO DO PREÇO PELO FORNECEDOR (LR · 2027 · RÉGUA A)',
    subtitulo: `Receita líquida ${fmtSN(receitaLiquidaPreservada, 2)} + CBS ${fmtSN(cbsDestacada, 2)} + IBS ${fmtSN(ibsDestacado, 2)} ÷ 0,82 = Nota ${fmtSN(nota2027, 2)} (Divisor 0,3655)`,
    cor: 'violet',
    linhas: linhasCard02,
  }

  // Linhas do CARD 03
  const linhasCard03: LinhaPassoCard[] = [
    {
      sinal: '(+)',
      label: 'Valor bruto da nota fiscal do fornecedor LR (2027)',
      formula: `Preço da nota = R$ ${fmtSN(nota2027, 2)} (${qtd} un.)`,
      valor: nota2027,
      fundamento: 'LC 214/2025, art. 12, caput: valor total da operação constante da NF-e.',
    },
    {
      sinal: '(−)',
      label: 'Crédito ICMS 18% da nota (destacado na nota)',
      formula: `18% destacado = R$ ${fmtSN(icmsDestacado2027, 2)}`,
      valor: -icmsDestacado2027,
      fundamento: 'LC 214/2025, art. 12 §2º, V c/c art. 155, §2º, I da CF/88.',
    },
    {
      sinal: '(−)',
      label: `Crédito CBS ${fmtSN(cbsAliquotaPct, 2)}% destacado na nota (por fora)`,
      formula: `CBS destacada = R$ ${fmtSN(cbsDestacada, 2)}`,
      valor: -cbsDestacada,
      destaque: true,
      fundamento:
        'LC 214/2025, art. 12, §2º, I e V c/c art. 28 e 47: crédito financeiro amplo sobre imposto destacado.',
    },
    {
      sinal: '(−)',
      label: 'Crédito IBS 0,10% destacado na nota (por fora)',
      formula: `IBS destacado = R$ ${fmtSN(ibsDestacado, 2)}`,
      valor: -ibsDestacado,
      destaque: true,
      fundamento:
        'LC 214/2025, art. 12, §2º, I e V c/c art. 28 e 47: crédito financeiro amplo sobre imposto destacado.',
    },
    {
      sinal: '(=)',
      label: 'Compras líquidas em 2027 (custo total do adquirente LR)',
      formula: `R$ ${fmtSN(nota2027, 2)} − R$ ${fmtSN(icmsDestacado2027, 2)} − R$ ${fmtSN(cbsDestacada, 2)} − R$ ${fmtSN(ibsDestacado, 2)} = R$ ${fmtSN(comprasLiquidas2027, 2)}`,
      valor: comprasLiquidas2027,
      destaque: true,
      fundamento:
        'LC 214/2025, art. 47: custo de aquisição deduzido dos créditos integrais de ICMS, CBS e IBS.',
    },
    {
      sinal: '(÷)',
      label: 'Custo unitário de aquisição em 2027',
      formula: `R$ ${fmtSN(comprasLiquidas2027, 2)} ÷ ${qtd} un. = R$ ${fmtSN(unitario2027, 2)}/un`,
      valor: unitario2027,
      destaque: true,
      fundamento: 'Custo unitário chancelado da célula neutra: exatamente 1.051,73.',
    },
    {
      sinal: '(i)',
      label: 'Variação do custo unitário vs HOJE 2026 (Δ)',
      formula: `R$ ${fmtSN(unitario2027, 2)} vs R$ ${fmtSN(unitarioHoje, 2)} → Δ = 0,00% (R$ 0,00/un)`,
      valor: deltaPct,
      destaque: true,
      fundamento:
        'Célula Neutra (chancelada): repasse preserva a receita líquida e o crédito pleno anula os destaques, mantendo o custo estável.',
    },
  ]

  const card03: CardMemoriaQuatroCelulas = {
    numero: 'CARD 03',
    titulo: '3º FORMAÇÃO DO CUSTO PELO ADQUIRENTE (LR · 2027)',
    subtitulo: `Nota ${fmtSN(nota2027, 2)} − ICMS ${fmtSN(icmsDestacado2027, 2)} − CBS ${fmtSN(cbsDestacada, 2)} − IBS ${fmtSN(ibsDestacado, 2)} = ${fmtSN(comprasLiquidas2027, 2)} → R$ ${fmtSN(unitario2027, 2)}/un (Δ = ${fmtSN(deltaPct, 2)}%)`,
    cor: 'sky',
    linhas: linhasCard03,
  }

  return {
    id: 'lr_x_lr',
    fornecedorRotulo: 'Lucro Real',
    fornecedorSigla: 'LR',
    adquirenteRotulo: 'Lucro Real',
    adquirenteSigla: 'LR',
    rotuloConfronto: 'LR × LR (Célula Neutra)',
    quantidade: qtd,
    hoje: {
      mercadorias: mercHoje,
      frete: freteHoje,
      notaCheia: notaHoje,
      icmsCredito: icmsCreditoHoje,
      pisCredito: pisCreditoHoje,
      cofinsCredito: cofinsCreditoHoje,
      baseSemIcms: baseSemIcmsHoje,
      comprasLiquidas: comprasLiquidasHoje,
      custoUnitario: unitarioHoje,
    },
    exercicio2027: {
      receitaLiquidaPreservada,
      cbsAliquotaPct,
      cbsDestacada,
      ibsAliquotaPct,
      ibsDestacado,
      subtotalAntesIcms,
      divisorIcms,
      notaCheia: nota2027,
      icmsDestacado: icmsDestacado2027,
      fatorDivisorExibido,
      fatorDivisorMotor,
      comprasLiquidas: comprasLiquidas2027,
      custoUnitario: unitario2027,
    },
    deltaUnitario,
    deltaPct,
    contrasteLp,
    card01,
    card02,
    card03,
  }
}
