/**
 * ============================================================================
 * SIMULADOR DE OPÇÃO PGDAS × REGIME REGULAR
 * IT — Inteligência Tributária (Módulo de Planejamento Tributário Estratégico)
 * ============================================================================
 * Inspiração funcional didática: análise comparativa de regimes para optantes do
 * Simples Nacional no contexto da Reforma Tributária (EC 132/2023, LC 214/2025).
 *
 * PREMISSAS PERMANENTES DA CEO (Adri):
 * 1. Execução simples e didática para o contador iniciante.
 * 2. Todo resultado vem seguido de MEMÓRIA DE CÁLCULO passo a passo com números.
 * 3. Cards de comparação SEMPRE LADO A LADO (grid), nunca empilhados verticalmente.
 * 4. NUNCA inventar informação: legislação inexistente ou pendente = "PENDENTE DE CONFIRMAÇÃO".
 * 5. Valores de ouro intocados (DAS 1.696,00; blocos 576,64/259,9968/2,8832/856,48;
 *    crédito 839,52; unitário 1.385,35; baseline 2026).
 * 6. 6 decimais internos; half-up no resultado final exibido.
 * 7. Nenhuma marca, nome ou conteúdo de benchmark em código ou UI.
 */

import {
  roundHalfUp,
  fmt6,
  fmtSN,
  calcularAliquotaEfetivaOficial,
  calcularPartilhaExercicio,
  ANEXOS_BASE_LC123,
} from './art12SnCalculations'

/** Alíquotas de teste / transição para a Fase Experimental (LC 214/2025 art. 348) */
export interface AliquotasRegimeRegularExercicio {
  ano: number
  cbsPct: number
  ibsPct: number
  rotulo: string
  statusLegal: 'OFICIAL' | 'PENDENTE_CONFIRMACAO'
  notaExplicativa: string
}

export const ALIQUOTAS_TESTE_REGIME_REGULAR: Record<number, AliquotasRegimeRegularExercicio> = {
  2027: {
    ano: 2027,
    cbsPct: 9.18, // 0,90% teste + estimativa padrão de compensação da fase de transição (alíquota de referência experimental)
    ibsPct: 0.1, // 0,10% teste estadual/distrital (art. 348, §1º)
    rotulo: 'Alíquotas-teste fase experimental (CBS 9,18% + IBS 0,10% = 9,28%)',
    statusLegal: 'PENDENTE_CONFIRMACAO',
    notaExplicativa:
      'Alíquotas-teste da fase experimental de transição fixadas provisoriamente para simulação comparativa (LC 214/2025, art. 348). Sujeitas a fixação pelo Comitê Gestor do IBS e Receita Federal.',
  },
  2028: {
    ano: 2028,
    cbsPct: 9.18,
    ibsPct: 0.1,
    rotulo: 'Alíquotas-teste fase experimental 2028 (CBS 9,18% + IBS 0,10% = 9,28%)',
    statusLegal: 'PENDENTE_CONFIRMACAO',
    notaExplicativa: 'Mesmo patamar experimental de 2027 (CBS 9,18% e IBS 0,10%).',
  },
  2029: {
    ano: 2029,
    cbsPct: 8.8,
    ibsPct: 1.0,
    rotulo: 'Transição 2029 (Estimativa preliminar)',
    statusLegal: 'PENDENTE_CONFIRMACAO',
    notaExplicativa:
      'PENDENTE DE CONFIRMAÇÃO: Projeção de início da redução escalonada de ICMS/ISS e transição para alíquotas plenas.',
  },
  2030: {
    ano: 2030,
    cbsPct: 8.8,
    ibsPct: 2.0,
    rotulo: 'Transição 2030 (Estimativa preliminar)',
    statusLegal: 'PENDENTE_CONFIRMACAO',
    notaExplicativa: 'PENDENTE DE CONFIRMAÇÃO: Projeção escalonada.',
  },
  2031: {
    ano: 2031,
    cbsPct: 8.8,
    ibsPct: 3.0,
    rotulo: 'Transição 2031 (Estimativa preliminar)',
    statusLegal: 'PENDENTE_CONFIRMACAO',
    notaExplicativa: 'PENDENTE DE CONFIRMAÇÃO: Projeção escalonada.',
  },
  2032: {
    ano: 2032,
    cbsPct: 8.8,
    ibsPct: 4.0,
    rotulo: 'Transição 2032 (Estimativa preliminar)',
    statusLegal: 'PENDENTE_CONFIRMACAO',
    notaExplicativa: 'PENDENTE DE CONFIRMAÇÃO: Projeção escalonada.',
  },
  2033: {
    ano: 2033,
    cbsPct: 8.8,
    ibsPct: 17.7, // Total estimado de referência ~26,5%
    rotulo: 'Regime Definitivo pós-2033 (Estimativa ~26,5%)',
    statusLegal: 'PENDENTE_CONFIRMACAO',
    notaExplicativa:
      'PENDENTE DE CONFIRMAÇÃO: Alíquotas plenas após extinção integral do ICMS/ISS. Alíquota padrão estimada pelo Ministério da Fazenda (~26,5%).',
  },
}

/** Retorna a alíquota de teste ou fallback para o exercício */
export function getAliquotasRegimeRegular(ano: number): AliquotasRegimeRegularExercicio {
  if (ALIQUOTAS_TESTE_REGIME_REGULAR[ano]) {
    return ALIQUOTAS_TESTE_REGIME_REGULAR[ano]
  }
  if (ano > 2033) {
    return {
      ano,
      cbsPct: 8.8,
      ibsPct: 17.7,
      rotulo: `Regime Definitivo ${ano} (Estimativa ~26,5%)`,
      statusLegal: 'PENDENTE_CONFIRMACAO',
      notaExplicativa:
        'PENDENTE DE CONFIRMAÇÃO: Aguarda resoluções futuras do Senado Federal e Comitê Gestor.',
    }
  }
  return ALIQUOTAS_TESTE_REGIME_REGULAR[2027]
}

/** Perfil de canal comercial da empresa */
export type PerfilCanal = 'B2B' | 'B2C' | 'MISTO'

/** Regime tributário dos fornecedores de insumos/mercadorias */
export type RegimeFornecedor = 'REGULAR' | 'SIMPLES_NACIONAL' | 'NAO_INFORMADO'

/** Item de receita particionada por NCM/cClassTrib */
export interface ItemParticaoReceita {
  id: string
  ncm: string
  descricao: string
  cClassTrib: string
  percentualReceita: number // 0 a 100
  valorReceita: number // em R$
  // Benefícios fiscais da cClassTrib selecionada
  reducaoCbsPct: number // ex: 0, 60, 100
  reducaoIbsPct: number // ex: 0, 60, 100
  baseLegal: string
  anexoLc214?: string
  rbSnIncompativel?: boolean
}

/** Entradas para o cálculo do Simulador de Opção */
export interface SimuladorOpcaoInput {
  nomeSimulacao?: string
  exercicio: number // 2027 a 2036
  segmento: 'comercio' | 'servicos' | 'industria' | 'transporte'
  anexoId: string // 'anexo1' | 'anexo2' | 'anexo3' | 'anexo4' | 'anexo5'
  uf: string
  faixaNumero: number // 1 a 6
  posicionamentoFaixa?: 'minimo' | 'medio' | 'maximo' | 'manual'
  rbt12: number // R$ 0 a 4.800.000,00
  perfilCanal: PerfilCanal
  percentualPj: number // 0 a 100 (se B2B = 100, se B2C = 0, se Misto = customizável)
  regimeFornecedores: RegimeFornecedor
  percentualComprasSobreFaturamento: number // 0 a 100%
  receitaSemestre: number // R$ faturamento no período de 6 meses
  itensNcm?: ItemParticaoReceita[]
  desejaInformarNcm?: boolean
  versaoTabelaBeneficios?: string
}

/** Passo da memória de cálculo */
export interface PassoMemoriaCalculo {
  ordem: number
  etiqueta: string
  formula: string
  resultadoTexto: string
  detalhe?: string
  pendenteConfirmacao?: boolean
}

/** Resultado de uma opção (DAS vs Regular) */
export interface ResultadoOpcao {
  nome: string
  tipo: 'DAS' | 'REGULAR'
  rotuloCurto: string
  // Débitos brutos
  debitoCbs: number
  debitoIbs: number
  debitoTotal: number
  // Créditos sobre compras
  creditoCbs: number
  creditoIbs: number
  creditoTotal: number
  // Custo líquido de IBS/CBS
  custoLiquidoIbsCbs: number
  // Custo total considerando demais tributos (se aplicável, ex: DAS total completo)
  dasTotalDevido?: number
  fracaoIbsCbsNoDas?: number
  // Memória de cálculo passo a passo
  memoriaPassos: PassoMemoriaCalculo[]
  // Conta-corrente da neutralidade
  neutralidade: {
    coletadoDoCliente: number
    creditoEntrada: number
    recolhidoGuia: number
    efeitoNoResultado: number
    explicacao: string
  }
}

/** Veredito e síntese comparativa */
export interface VereditoSimulador {
  opcaoVencedora: 'DAS' | 'REGULAR' | 'EMPATE'
  seloMelhorOpcao: string
  motivoVeredito: string
  diferencaTotalSemestre: number
  economiaMensalizada: number // diferencaTotalSemestre / 6
  opcaoDas: ResultadoOpcao
  opcaoRegular: ResultadoOpcao
  // Detalhes consultivos
  alertasConsultivos: {
    tipo: 'info' | 'aviso' | 'pendencia'
    titulo: string
    texto: string
  }[]
  // Indicador de benefício fiscal relevante
  possuiReducaoBeneficio: boolean
  aliquotaEfetivaDasPct: number
  partilhaDas: {
    cbsPct: number
    ibsPct: number
    icmsPct: number
    demaisPct: number
  }
  aliquotasRegularAplicadas: {
    cbsPct: number
    ibsPct: number
    totalPct: number
    rotulo: string
    statusLegal: 'OFICIAL' | 'PENDENTE_CONFIRMACAO'
  }
}

/**
 * Ponto médio, piso e teto de cada faixa para derivação automática do RBT12.
 */
export function derivarRbt12PorFaixa(
  anexoId: string,
  faixaNumero: number,
  posicao: 'minimo' | 'medio' | 'maximo',
): number {
  const anexo = ANEXOS_BASE_LC123[anexoId] || ANEXOS_BASE_LC123.anexo1
  const faixa = anexo.faixas[faixaNumero - 1] || anexo.faixas[0]
  if (posicao === 'minimo') {
    return faixa.limiteInferior === 0 ? 60000 : faixa.limiteInferior + 0.01
  }
  if (posicao === 'maximo') {
    return faixa.limiteSuperior
  }
  // Ponto médio
  const piso = faixa.limiteInferior
  const teto = faixa.limiteSuperior
  return roundHalfUp((piso + teto) / 2, 2)
}

/**
 * NÚCLEO DE CÁLCULO — SIMULADOR DE OPÇÃO (FASE 1)
 * Calcula rigorosamente por item/NCM (sem médias agregadas quando houver NCMs),
 * com 6 decimais internos e arredondamento half-up na apresentação.
 */
export function calcularSimuladorOpcao(input: SimuladorOpcaoInput): VereditoSimulador {
  const exercicio = input.exercicio || 2027
  const anexoId = input.anexoId || 'anexo1'
  const faixaNumero = Math.max(1, Math.min(6, input.faixaNumero || 1))
  const receitaTotal = Math.max(0, input.receitaSemestre || 0)
  const pctCompras = Math.max(0, Math.min(100, input.percentualComprasSobreFaturamento || 0))
  const comprasTotal = roundHalfUp((receitaTotal * pctCompras) / 100, 6)

  // 1. Alíquota efetiva oficial do Simples Nacional (LC 123 art. 18 §1º)
  const rbt12Calculo = input.rbt12 && input.rbt12 > 0 ? input.rbt12 : 180000
  const aliqEfetivaDas = calcularAliquotaEfetivaOficial(anexoId, faixaNumero, rbt12Calculo)
  const partilha = calcularPartilhaExercicio(anexoId, faixaNumero, exercicio)

  // Frações do DAS para CBS e IBS
  const fracaoCbsPct = partilha.fracaoCbsPct // ex: 15,33%
  const fracaoIbsPct = partilha.fracaoIbsPct // ex: 0,17%
  const fracaoIbsCbsPct = roundHalfUp(fracaoCbsPct + fracaoIbsPct, 4) // ex: 15,50%
  const aliqEfetivaIbsCbsNoDas = roundHalfUp((aliqEfetivaDas * fracaoIbsCbsPct) / 100, 6) // ex: 4% * 15,5% = 0,62%

  // 2. Alíquotas vigentes do Regime Regular (fase experimental ou definitiva)
  const aliqRegular = getAliquotasRegimeRegular(exercicio)
  const tauCbsCheia = aliqRegular.cbsPct / 100
  const tauIbsCheia = aliqRegular.ibsPct / 100

  // 3. Itens e benefícios: partição de receita
  const temItensNcm = Boolean(
    input.desejaInformarNcm && input.itensNcm && input.itensNcm.length > 0,
  )
  const itens: ItemParticaoReceita[] = temItensNcm
    ? input.itensNcm!
    : [
        {
          id: 'item-unico-100',
          ncm: 'Geral',
          descricao: 'Receita 100% tributável (sem segregação NCM)',
          cClassTrib: '000001',
          percentualReceita: 100,
          valorReceita: receitaTotal,
          reducaoCbsPct: 0,
          reducaoIbsPct: 0,
          baseLegal: 'Regra geral de tributação integral (sem benefício)',
        },
      ]

  let possuiReducaoBeneficio = false

  // ==========================================================================
  // OPÇÃO A: POR DENTRO / DAS (PGDAS)
  // No Simples Nacional, os tributos IBS e CBS estão embutidos na guia única DAS.
  // ==========================================================================
  // O DAS devido total do semestre sobre a receita
  const dasDevidoTotalSemestre = roundHalfUp((receitaTotal * aliqEfetivaDas) / 100, 6)
  const cbsNoDas = roundHalfUp(dasDevidoTotalSemestre * (fracaoCbsPct / 100), 6)
  const ibsNoDas = roundHalfUp(dasDevidoTotalSemestre * (fracaoIbsPct / 100), 6)
  const custoIbsCbsDas = roundHalfUp(cbsNoDas + ibsNoDas, 6)

  // Na opção por dentro, a empresa não toma crédito de compras no regime PGDAS
  // (LC 123 art. 23 — a ME/EPP no DAS não apropria créditos de insumos para abater o DAS).
  const creditoCbsDas = 0
  const creditoIbsDas = 0
  const creditoTotalDas = 0
  const custoLiquidoDas = custoIbsCbsDas

  const memoriaDas: PassoMemoriaCalculo[] = [
    {
      ordem: 1,
      etiqueta: 'Alíquota Efetiva do DAS (LC 123 art. 18 §1º)',
      formula: `(RBT12 R$ ${fmtSN(rbt12Calculo)} × AliqNominal − ParcelaDeduzir) ÷ RBT12`,
      resultadoTexto: `${fmtSN(aliqEfetivaDas, 4)}%`,
      detalhe: `Calculado sobre o Anexo ${anexoId.toUpperCase().replace('ANEXO', '')}, Faixa ${faixaNumero}.`,
    },
    {
      ordem: 2,
      etiqueta: 'DAS Total Devido no Semestre',
      formula: `Receita Semestre R$ ${fmtSN(receitaTotal)} × Alíquota Efetiva ${fmtSN(aliqEfetivaDas, 4)}%`,
      resultadoTexto: `R$ ${fmtSN(dasDevidoTotalSemestre)}`,
      detalhe: 'Valor total da guia única DAS incidente sobre o faturamento do período.',
    },
    {
      ordem: 3,
      etiqueta: 'Partilha Oficial de IBS e CBS no DAS (TABELA_OFICIAL_SN)',
      formula: `Fração CBS ${fmtSN(fracaoCbsPct, 2)}% + Fração IBS ${fmtSN(fracaoIbsPct, 2)}% = ${fmtSN(fracaoIbsCbsPct, 2)}% do DAS`,
      resultadoTexto: `${fmtSN(aliqEfetivaIbsCbsNoDas, 4)}% da receita`,
      detalhe: `CBS no DAS: R$ ${fmtSN(cbsNoDas)} | IBS no DAS: R$ ${fmtSN(ibsNoDas)}.`,
      pendenteConfirmacao: partilha.statusLegal === 'PENDENTE_CONFIRMACAO',
    },
    {
      ordem: 4,
      etiqueta: 'Crédito sobre Compras no DAS',
      formula: 'LC 123/2006 art. 23 (vedação a créditos no regime único PGDAS)',
      resultadoTexto: 'R$ 0,00 (vedado)',
      detalhe:
        'Empresas no Simples Nacional puro recolhem sobre o faturamento bruto sem apropriação de créditos de insumos.',
    },
    {
      ordem: 5,
      etiqueta: 'Custo Líquido de IBS/CBS no DAS',
      formula: `IBS/CBS contido no DAS (R$ ${fmtSN(custoIbsCbsDas)}) − Créditos (R$ 0,00)`,
      resultadoTexto: `R$ ${fmtSN(custoLiquidoDas)}`,
      detalhe: `Custo direto de IBS/CBS recolhido via guia única no semestre.`,
    },
  ]

  // ==========================================================================
  // OPÇÃO B: POR FORA / REGIME REGULAR (IBS/CBS "POR FORA")
  // Empresa opta por recolher IBS/CBS fora do DAS, apurando débitos e créditos.
  // ==========================================================================
  let debitoCbsRegularTotal = 0
  let debitoIbsRegularTotal = 0

  // Cálculo rigorosamente POR ITEM de receita (sem média)
  for (const item of itens) {
    const receitaItem =
      item.valorReceita > 0 ? item.valorReceita : (receitaTotal * item.percentualReceita) / 100
    if (receitaItem <= 0) continue

    const redCbs = Math.max(0, Math.min(100, item.reducaoCbsPct || 0))
    const redIbs = Math.max(0, Math.min(100, item.reducaoIbsPct || 0))
    if (redCbs > 0 || redIbs > 0) {
      possuiReducaoBeneficio = true
    }

    // Alíquotas efetivas após redução de benefício da cClassTrib
    const aliqEfetivaCbsItem = tauCbsCheia * (1 - redCbs / 100)
    const aliqEfetivaIbsItem = tauIbsCheia * (1 - redIbs / 100)

    const debCbsItem = roundHalfUp(receitaItem * aliqEfetivaCbsItem, 6)
    const debIbsItem = roundHalfUp(receitaItem * aliqEfetivaIbsItem, 6)

    debitoCbsRegularTotal += debCbsItem
    debitoIbsRegularTotal += debIbsItem
  }

  debitoCbsRegularTotal = roundHalfUp(debitoCbsRegularTotal, 6)
  debitoIbsRegularTotal = roundHalfUp(debitoIbsRegularTotal, 6)
  const debitoTotalRegular = roundHalfUp(debitoCbsRegularTotal + debitoIbsRegularTotal, 6)

  // CRÉDITOS SOBRE COMPRAS NO REGIME REGULAR (LC 214/2025 art. 28 e art. 47)
  // Regra de governança chancelada pela CEO:
  // - Se Fornecedor REGULAR: crédito pela alíquota cheia (9,28% em 2027: 9,18% CBS + 0,10% IBS).
  // - Se Fornecedor SIMPLES NACIONAL: crédito é estritamente proporcional à fração do Anexo
  //   conforme LC 123 art. 23 §1º/§2º + LC 214 art. 47 §9º II, NUNCA alíquota cheia de 9,28%!
  //   ICMS destacado na nota SN NÃO gera crédito de IBS/CBS.
  // - Se NÃO INFORMADO: assume premissa prudencial neutra de fornecedor SN.
  let aliqCreditoCbsComprasPct = 0
  let aliqCreditoIbsComprasPct = 0
  let explicacaoOrigemCredito = ''

  if (input.regimeFornecedores === 'REGULAR') {
    aliqCreditoCbsComprasPct = aliqRegular.cbsPct // 9,18%
    aliqCreditoIbsComprasPct = aliqRegular.ibsPct // 0,10%
    explicacaoOrigemCredito = `Fornecedor Regime Regular: crédito integral pelas alíquotas cheias vigentes (${fmtSN(aliqRegular.cbsPct, 2)}% CBS + ${fmtSN(aliqRegular.ibsPct, 2)}% IBS = ${fmtSN(aliqRegular.cbsPct + aliqRegular.ibsPct, 2)}%).`
  } else {
    // Fornecedor Simples Nacional (LC 123 art. 23 + LC 214 art. 47 §9º II)
    // Toma a fração de CBS e IBS da 1ª faixa do Anexo I como referência oficial ou do anexo base
    const aliqEfetivaFornecedor = 4.0 // Baseline oficial Anexo I 1ª faixa
    aliqCreditoCbsComprasPct = roundHalfUp((aliqEfetivaFornecedor * partilha.fracaoCbsPct) / 100, 4) // 4% × 15,33% = 0,6132%
    aliqCreditoIbsComprasPct = roundHalfUp((aliqEfetivaFornecedor * partilha.fracaoIbsPct) / 100, 4) // 4% × 0,17% = 0,0068%
    explicacaoOrigemCredito = `Fornecedor Simples Nacional: crédito proporcional da fração da nota (LC 123 art. 23 §2º e LC 214 art. 47 §9º II). CBS ${fmtSN(aliqCreditoCbsComprasPct, 4)}% + IBS ${fmtSN(aliqCreditoIbsComprasPct, 4)}% = ${fmtSN(aliqCreditoCbsComprasPct + aliqCreditoIbsComprasPct, 4)}%. ICMS não gera crédito.`
  }

  const creditoCbsRegular = roundHalfUp((comprasTotal * aliqCreditoCbsComprasPct) / 100, 6)
  const creditoIbsRegular = roundHalfUp((comprasTotal * aliqCreditoIbsComprasPct) / 100, 6)
  const creditoTotalRegular = roundHalfUp(creditoCbsRegular + creditoIbsRegular, 6)

  // Custo líquido do Regime Regular: Débitos − Créditos
  const custoLiquidoRegular = roundHalfUp(Math.max(0, debitoTotalRegular - creditoTotalRegular), 6)

  const memoriaRegular: PassoMemoriaCalculo[] = [
    {
      ordem: 1,
      etiqueta: 'Alíquotas do Regime Regular aplicadas',
      formula: `CBS nominal: ${fmtSN(aliqRegular.cbsPct, 2)}% | IBS nominal: ${fmtSN(aliqRegular.ibsPct, 2)}% (Total: ${fmtSN(aliqRegular.cbsPct + aliqRegular.ibsPct, 2)}%)`,
      resultadoTexto: aliqRegular.rotulo,
      detalhe: aliqRegular.notaExplicativa,
      pendenteConfirmacao: aliqRegular.statusLegal === 'PENDENTE_CONFIRMACAO',
    },
    {
      ordem: 2,
      etiqueta: 'Débito Bruto de IBS/CBS sobre a Receita',
      formula: temItensNcm
        ? `Cálculo estrito por item (${itens.length} NCMs com eventuais reduções de alíquota cClassTrib)`
        : `Receita Semestre R$ ${fmtSN(receitaTotal)} × ${fmtSN(aliqRegular.cbsPct + aliqRegular.ibsPct, 2)}%`,
      resultadoTexto: `R$ ${fmtSN(debitoTotalRegular)}`,
      detalhe: `CBS Bruta: R$ ${fmtSN(debitoCbsRegularTotal)} | IBS Bruto: R$ ${fmtSN(debitoIbsRegularTotal)}.`,
    },
    {
      ordem: 3,
      etiqueta: 'Base de Aquisições e Crédito sobre Compras',
      formula: `Compras Semestre R$ ${fmtSN(comprasTotal)} (${fmtSN(pctCompras)}% do faturamento) × Alíquota de Crédito (${fmtSN(aliqCreditoCbsComprasPct + aliqCreditoIbsComprasPct, 4)}%)`,
      resultadoTexto: `R$ ${fmtSN(creditoTotalRegular)}`,
      detalhe: explicacaoOrigemCredito,
    },
    {
      ordem: 4,
      etiqueta: 'Custo Líquido de IBS/CBS no Regime Regular',
      formula: `Débito Bruto (R$ ${fmtSN(debitoTotalRegular)}) − Créditos de Aquisições (R$ ${fmtSN(creditoTotalRegular)})`,
      resultadoTexto: `R$ ${fmtSN(custoLiquidoRegular)}`,
      detalhe: 'Saldo líquido devedor recolhido aos cofres públicos através das guias de IBS/CBS.',
    },
  ]

  // ==========================================================================
  // CONTA-CORRENTE DA NEUTRALIDADE (COLETADO − CRÉDITO − RECOLHIDO = EFEITO)
  // Mostra didaticamente ao contador iniciante que o tributo "por fora" é repassado
  // ao cliente e que a empresa apenas recolhe a diferença.
  // ==========================================================================
  const neutralidadeDas = {
    coletadoDoCliente: 0, // No PGDAS o tributo está dentro do preço de venda (sem destaque por fora)
    creditoEntrada: 0,
    recolhidoGuia: custoLiquidoDas,
    efeitoNoResultado: custoLiquidoDas, // Custo direto na DRE
    explicacao:
      'No DAS, a empresa absorve o recolhimento em sua margem bruta como dedução da receita (tributo por dentro).',
  }

  const neutralidadeRegular = {
    coletadoDoCliente: debitoTotalRegular, // Cobrado por fora na nota fiscal do cliente adquirente
    creditoEntrada: creditoTotalRegular,
    recolhidoGuia: custoLiquidoRegular,
    efeitoNoResultado: 0, // Se 100% repassado no preço por fora, efeito contábil líquido é neutro no caixa se todos pagarem
    explicacao:
      'No Regime Regular, o IBS/CBS é cobrado a maior na nota do adquirente (não-cumulatividade plena). O valor recolhido equivale exatamente ao saldo coletado menos o crédito tomado.',
  }

  // ==========================================================================
  // VEREDITO E SÍNTESE COMPARATIVA
  // ==========================================================================
  let opcaoVencedora: 'DAS' | 'REGULAR' | 'EMPATE' = 'EMPATE'
  let diferencaTotalSemestre = 0
  let economiaMensalizada = 0
  let motivoVeredito = ''
  let seloMelhorOpcao = ''

  if (Math.abs(custoLiquidoDas - custoLiquidoRegular) < 0.01) {
    opcaoVencedora = 'EMPATE'
    diferencaTotalSemestre = 0
    economiaMensalizada = 0
    seloMelhorOpcao = 'REGIMES EQUIVALENTES'
    motivoVeredito =
      'Ambas as opções resultam exatamente no mesmo custo líquido de IBS/CBS para o período.'
  } else if (custoLiquidoDas < custoLiquidoRegular) {
    opcaoVencedora = 'DAS'
    diferencaTotalSemestre = roundHalfUp(custoLiquidoRegular - custoLiquidoDas, 2)
    economiaMensalizada = roundHalfUp(diferencaTotalSemestre / 6, 2)
    seloMelhorOpcao = 'MELHOR OPÇÃO: SIMPLES NACIONAL (PGDAS)'
    motivoVeredito = `A opção por manter o recolhimento embutido no DAS proporciona uma economia de R$ ${fmtSN(economiaMensalizada)}/mês (R$ ${fmtSN(diferencaTotalSemestre)} no semestre) em comparação ao Regime Regular.`
  } else {
    opcaoVencedora = 'REGULAR'
    diferencaTotalSemestre = roundHalfUp(custoLiquidoDas - custoLiquidoRegular, 2)
    economiaMensalizada = roundHalfUp(diferencaTotalSemestre / 6, 2)
    seloMelhorOpcao = 'MELHOR OPÇÃO: REGIME REGULAR (POR FORA)'
    motivoVeredito = `A opção pelo Regime Regular por fora é mais vantajosa economicamente, gerando economia de R$ ${fmtSN(economiaMensalizada)}/mês (R$ ${fmtSN(diferencaTotalSemestre)} no semestre) devido aos créditos de compras e/ou benefícios fiscais.`
  }

  // Alertas consultivos didáticos (sem marcas)
  const alertasConsultivos: {
    tipo: 'info' | 'aviso' | 'pendencia'
    titulo: string
    texto: string
  }[] = [
    {
      tipo: 'aviso',
      titulo: 'Ressalva de Estimativa e Alíquotas-Teste',
      texto:
        'Os valores apresentados são estimativas didáticas calculadas com base nas informações fornecidas e nas alíquotas-teste da fase experimental da transição (LC 214/2025, art. 348), não constituindo garantia de tributação futura nem substituindo parecer formal de assessoria tributária.',
    },
    {
      tipo: 'info',
      titulo: 'Gestão de Caixa e Prazos de Recolhimento',
      texto:
        'A opção pelo Regime Regular pode exigir recolhimento de guias de IBS/CBS em prazos distintos do DAS (dia 20 do mês subsequente), impactando a necessidade de capital de giro e conciliação bancária do caixa.',
    },
    {
      tipo: 'info',
      titulo: 'Dinâmica Comercial B2B versus B2C',
      texto:
        input.perfilCanal === 'B2C'
          ? 'No mercado varejista (B2C), o consumidor final olha apenas o preço final de prateleira e não apropria créditos tributários. Migrar para o Regime Regular exige cautela para não encarecer o preço visível ao público.'
          : input.perfilCanal === 'B2B'
            ? 'No mercado corporativo (B2B), clientes PJ do Regime Regular aproveitam integralmente os créditos de IBS/CBS destacados na sua nota, tornando a opção "Por Fora" altamente atraente para competitividade de vendas.'
            : 'Em canais mistos, deve-se ponderar a sensibilidade a preços do consumidor varejista (B2C) com o interesse de crédito dos clientes empresariais (B2B).',
    },
  ]

  if (
    partilha.statusLegal === 'PENDENTE_CONFIRMACAO' ||
    aliqRegular.statusLegal === 'PENDENTE_CONFIRMACAO'
  ) {
    alertasConsultivos.push({
      tipo: 'pendencia',
      titulo: 'PENDENTE DE CONFIRMAÇÃO (Legislação Incompleta)',
      texto:
        'Dispositivos regulamentares da partilha do Simples Nacional ou alíquotas subnacionais definitivas ainda aguardam publicação pelo Comitê Gestor do IBS e CGSN. Os cálculos adotam o padrão de cautela legal estabelecido.',
    })
  }

  return {
    opcaoVencedora,
    seloMelhorOpcao,
    motivoVeredito,
    diferencaTotalSemestre,
    economiaMensalizada,
    opcaoDas: {
      nome: 'Opção Por Dentro (PGDAS)',
      tipo: 'DAS',
      rotuloCurto: 'Simples Nacional (DAS)',
      debitoCbs: cbsNoDas,
      debitoIbs: ibsNoDas,
      debitoTotal: custoIbsCbsDas,
      creditoCbs: creditoCbsDas,
      creditoIbs: creditoIbsDas,
      creditoTotal: creditoTotalDas,
      custoLiquidoIbsCbs: custoLiquidoDas,
      dasTotalDevido: dasDevidoTotalSemestre,
      fracaoIbsCbsNoDas: aliqEfetivaIbsCbsNoDas,
      memoriaPassos: memoriaDas,
      neutralidade: neutralidadeDas,
    },
    opcaoRegular: {
      nome: 'Opção Por Fora (Regime Regular)',
      tipo: 'REGULAR',
      rotuloCurto: 'Regime Regular (IBS/CBS)',
      debitoCbs: debitoCbsRegularTotal,
      debitoIbs: debitoIbsRegularTotal,
      debitoTotal: debitoTotalRegular,
      creditoCbs: creditoCbsRegular,
      creditoIbs: creditoIbsRegular,
      creditoTotal: creditoTotalRegular,
      custoLiquidoIbsCbs: custoLiquidoRegular,
      memoriaPassos: memoriaRegular,
      neutralidade: neutralidadeRegular,
    },
    alertasConsultivos,
    possuiReducaoBeneficio,
    aliquotaEfetivaDasPct: aliqEfetivaDas,
    partilhaDas: {
      cbsPct: fracaoCbsPct,
      ibsPct: fracaoIbsPct,
      icmsPct: partilha.fracaoIcmsPct,
      demaisPct: partilha.fracaoIrpjCsllCppPct,
    },
    aliquotasRegularAplicadas: {
      cbsPct: aliqRegular.cbsPct,
      ibsPct: aliqRegular.ibsPct,
      totalPct: roundHalfUp(aliqRegular.cbsPct + aliqRegular.ibsPct, 2),
      rotulo: aliqRegular.rotulo,
      statusLegal: aliqRegular.statusLegal,
    },
  }
}
