import { roundHalfUp, calcularPartilhaExercicio, normalizarAnexoId } from './art12SnCalculations'
import { calculatePgdas, SimplesAnexoId } from './simplesCalculations'

/** Constantes de referência chanceladas pela Adri (proteção de ouro) */
export const REFERENCIAS_MARKUP_POS = {
  ICMS_PADRAO_PCT: 18.0, // Fator 0,8200 (transição LP/LR)
  CBS_PADRAO_PCT: 26.5, // 26,50% por fora (estimativa Senado)
  IBS_PADRAO_PCT: 0.1, // 0,10% por fora (alíquota-teste LC 214 art. 346)
  MARGEM_PADRAO_PCT: 51.9, // 51,90% chancelada pré-reforma
  QUANTIDADE_PADRAO: 24, // 24 un. caso canônico
} as const

export interface DespesaVariavelVenda {
  id: string
  descricao: string
  aliquota?: number // em %, undefined quando vazio no campo
}

export type FornecedorPosKey = 'lp' | 'lr' | 'snp' | 'snh'

export interface FornecedorPosMeta {
  key: FornecedorPosKey
  sigla: string
  rotulo: string
  descricao: string
  fundamento: string
  regimeVenda: 'lucro_presumido' | 'lucro_real' | 'simples_puro' | 'simples_hibrido'
}

export const FORNECEDORES_META: Record<FornecedorPosKey, FornecedorPosMeta> = {
  lp: {
    key: 'lp',
    sigla: 'LP',
    rotulo: 'Fornecedor Lucro Presumido',
    descricao: 'Fornecedor LP · Carga plena na origem com repasse de base limpa (Art. 12 LC 214)',
    fundamento:
      'LC 214/2025, art. 12 + art. 47: crédito financeiro pleno anula CBS e IBS destacados.',
    regimeVenda: 'lucro_presumido',
  },
  lr: {
    key: 'lr',
    sigla: 'LR',
    rotulo: 'Fornecedor Lucro Real',
    descricao: 'Fornecedor LR · Régua A neutra chancelada (reprecificação com crédito integral)',
    fundamento: 'LC 214/2025, art. 12 + art. 47: creditamento amplo e desembute com divisor LR.',
    regimeVenda: 'lucro_real',
  },
  snp: {
    key: 'snp',
    sigla: 'SNP',
    rotulo: 'Fornecedor Simples Nacional Puro',
    descricao:
      'Fornecedor SN Puro · Sistemática do Simples Nacional (LC 123/2006): DAS por dentro, sem ICMS 18%',
    fundamento:
      'LC 123/2006, art. 18 c/c LC 214/2025 art. 139: recolhimento unificado no DAS sem alíquota cheia.',
    regimeVenda: 'simples_puro',
  },
  snh: {
    key: 'snh',
    sigla: 'SNH',
    rotulo: 'Fornecedor Simples Nacional Híbrido',
    descricao:
      'Fornecedor SN Híbrido · Opt-in CBS/IBS regime regular (art. 41 LC 214) + DAS híbrido (ICMS e federais)',
    fundamento:
      'LC 214/2025, art. 41 c/c art. 12 §2º V: CBS e IBS por fora sobre base sem ICMS; DAS híbrido por dentro.',
    regimeVenda: 'simples_hibrido',
  },
}

export interface MarkupPosColunaInput {
  key: FornecedorPosKey
  custoUnitario: number
  custoHoje: number
  deltaCustoPct: number
  comprasLiquidasTotal: number
  notaCompraTotal: number
  fatorDvConsolidado: number
  somaDvPct: number
  margemLucroEfetiva: number
  icmsRateEfetivo: number
  cbsRateEfetivo: number
  ibsRateEfetivo: number
  quantidadeVendidaEfetiva: number
  // Parâmetros do Simples Nacional vindos do TaxContext / Markup pré-reforma
  simplesAnexo?: string
  simplesRbt12?: number
  effectiveSimplesRbt12?: number
}

export interface FatiasDasDetalhe {
  aliquotaTotalPct: number
  dasTotal: number
  // Fatias
  icmsPct: number
  icmsValor: number
  cbsPct: number
  cbsValor: number
  ibsPct: number
  ibsValor: number
  federaisPct: number
  federaisValor: number
}

export interface MarkupPosColunaResultado {
  key: FornecedorPosKey
  meta: FornecedorPosMeta
  custoUnitario: number
  custoHoje: number
  deltaCustoPct: number
  comprasLiquidasTotal: number
  notaCompraTotal: number

  // Divisores e fatores
  divisorPrincipal: number
  divisorSemIcms: number
  fatorTributarioEfetivo: number

  // Preço e tributos
  baseCalculoIbsCbs: number
  cbsUnitario: number
  ibsUnitario: number
  valorSemIcms: number
  precoVendaUnitario: number
  totalNotaUnitario: number

  // Tributos específicos por sistemática
  isSimples: boolean
  isSimplesHibrido: boolean
  icmsUnitario: number
  fatiasDas?: FatiasDasDetalhe

  // Resultado econômico
  dvUnitarioTotal: number
  lucroUnitarioRealizado: number
  margemEfetivaPct: number
  tributosPorForaUnitario: number

  // Lote
  faturamentoTotal: number
  custoTotal: number
  cbsTotal: number
  ibsTotal: number
  totalNotaLote: number
}

/**
 * Calcula a precificação de uma coluna do Markup Pós EC 132 respeitando rigorosamente a
 * sistemática tributária de cada fornecedor/vendedor:
 * - LP e LR: ICMS transição com base incluindo CBS/IBS (LC 214 art. 12 §2º V + RC 32303/2025).
 * - SNP: Simples Nacional Puro — DAS por dentro (alíquota efetiva do anexo), fatias detalhadas, sem ICMS 18%.
 * - SNH: Simples Nacional Híbrido — DAS híbrido por dentro (ICMS + federais), CBS/IBS por fora sobre base limpa de ICMS.
 */
export function calcularMarkupPosColuna(input: MarkupPosColunaInput): MarkupPosColunaResultado {
  const {
    key,
    custoUnitario,
    custoHoje,
    deltaCustoPct,
    comprasLiquidasTotal,
    notaCompraTotal,
    fatorDvConsolidado,
    somaDvPct,
    margemLucroEfetiva,
    icmsRateEfetivo,
    cbsRateEfetivo,
    ibsRateEfetivo,
    quantidadeVendidaEfetiva,
    simplesAnexo = 'anexo_1',
    simplesRbt12 = 0,
    effectiveSimplesRbt12,
  } = input

  const meta = FORNECEDORES_META[key]
  const fatorMargem = Math.max(0, 1 - margemLucroEfetiva / 100)
  const divisorSemIcms = Math.max(0.0001, fatorDvConsolidado * fatorMargem)

  // -------------------------------------------------------------------------
  // SISTEMÁTICA DO SIMPLES NACIONAL (SNP e SNH)
  // -------------------------------------------------------------------------
  const anexoClean = (simplesAnexo as SimplesAnexoId) || 'anexo_1'
  const anexoIdNorm = normalizarAnexoId(anexoClean)
  const rbt12Clean =
    effectiveSimplesRbt12 && effectiveSimplesRbt12 > 0 ? effectiveSimplesRbt12 : simplesRbt12 || 0

  const pgdasRes = calculatePgdas(anexoClean, rbt12Clean)
  const aliquotaSnEfetiva = pgdasRes.aliquotaEfetiva > 0 ? pgdasRes.aliquotaEfetiva : 4.0

  // Partilha 2027 do anexo/faixa (Anexo I 1ª faixa: ICMS 34%, CBS 15,33%, IBS 0,17%, Federais 50,50%)
  const partilha2027 = calcularPartilhaExercicio(anexoIdNorm, 1, 2027)
  const fracaoIcmsPct = partilha2027.fracaoIcmsPct
  const fracaoCbsPct = partilha2027.fracaoCbsPct
  const fracaoIbsPct = partilha2027.fracaoIbsPct
  const fracaoFederaisPct = partilha2027.fracaoIrpjCsllCppPct

  const qtdMultiplicador = Math.max(1, quantidadeVendidaEfetiva)

  if (key === 'snp') {
    // =========================================================================
    // CENÁRIO 03: SIMPLES NACIONAL PURO (SNP)
    // - DAS calculado por dentro com a alíquota do Simples (NUNCA ICMS 18%)
    // - Tudo por dentro do DAS, sem dedução de ICMS da base
    // - Preço = Custo ÷ Divisor do SN (fatorDv * fatorMargem * (1 - alíquota SN))
    // - Nota fiscal = Preço de venda (CBS/IBS por fora = 0)
    // =========================================================================
    const fatorDasPuro = Math.max(0.0001, 1 - aliquotaSnEfetiva / 100)
    const divisorSnp = Math.max(0.0001, divisorSemIcms * fatorDasPuro)
    const precoVendaUnitario = roundHalfUp(custoUnitario / divisorSnp, 2)

    const dasTotal = roundHalfUp(precoVendaUnitario * (aliquotaSnEfetiva / 100), 2)
    const icmsNoDas = roundHalfUp(dasTotal * (fracaoIcmsPct / 100), 2)
    const cbsNoDas = roundHalfUp(dasTotal * (fracaoCbsPct / 100), 2)
    const ibsNoDas = roundHalfUp(dasTotal * (fracaoIbsPct / 100), 2)
    const federaisNoDas = roundHalfUp(dasTotal * (fracaoFederaisPct / 100), 2)

    const fatiasDas: FatiasDasDetalhe = {
      aliquotaTotalPct: aliquotaSnEfetiva,
      dasTotal,
      icmsPct: fracaoIcmsPct,
      icmsValor: icmsNoDas,
      cbsPct: fracaoCbsPct,
      cbsValor: cbsNoDas,
      ibsPct: fracaoIbsPct,
      ibsValor: ibsNoDas,
      federaisPct: fracaoFederaisPct,
      federaisValor: federaisNoDas,
    }

    const dvUnitarioTotal = roundHalfUp(precoVendaUnitario * (somaDvPct / 100), 2)
    const lucroUnitarioRealizado = roundHalfUp(
      precoVendaUnitario - custoUnitario - dasTotal - dvUnitarioTotal,
      2,
    )
    const margemEfetivaPct =
      precoVendaUnitario > 0
        ? roundHalfUp((lucroUnitarioRealizado / precoVendaUnitario) * 100, 2)
        : 0

    return {
      key: 'snp',
      meta,
      custoUnitario,
      custoHoje,
      deltaCustoPct,
      comprasLiquidasTotal,
      notaCompraTotal,
      divisorPrincipal: divisorSnp,
      divisorSemIcms,
      fatorTributarioEfetivo: fatorDasPuro,
      baseCalculoIbsCbs: precoVendaUnitario, // Base integral do DAS
      cbsUnitario: 0, // No SN puro, recolhido dentro do DAS
      ibsUnitario: 0,
      valorSemIcms: precoVendaUnitario,
      precoVendaUnitario,
      totalNotaUnitario: precoVendaUnitario,
      isSimples: true,
      isSimplesHibrido: false,
      icmsUnitario: icmsNoDas,
      fatiasDas,
      dvUnitarioTotal,
      lucroUnitarioRealizado,
      margemEfetivaPct,
      tributosPorForaUnitario: 0,
      faturamentoTotal: roundHalfUp(precoVendaUnitario * qtdMultiplicador, 2),
      custoTotal: roundHalfUp(custoUnitario * qtdMultiplicador, 2),
      cbsTotal: 0,
      ibsTotal: 0,
      totalNotaLote: roundHalfUp(precoVendaUnitario * qtdMultiplicador, 2),
    }
  }

  if (key === 'snh') {
    // =========================================================================
    // CENÁRIO 04: SIMPLES NACIONAL HÍBRIDO (SNH)
    // - DAS híbrido por dentro: apenas ICMS + Federais (IRPJ/CSLL/CPP)
    //   Alíquota = efetiva × (fração ICMS + fração Federais)
    //   Ex.: 4,00% × (34% + 50,50%) = 3,38%
    // - Divisor SNH = fatorDv * fatorMargem * (1 - alíquota DAS híbrido) (0,430739 com DVs de teste)
    // - Preço P = Custo ÷ Divisor SNH
    // - BC CBS/IBS = P − ICMS do DAS (art. 12 §2º V LC 214)
    // - CBS e IBS por fora sobre a BC
    // - Nota fiscal = P + CBS + IBS
    // =========================================================================
    const somaFracaoDasHibrido = fracaoIcmsPct + fracaoFederaisPct
    const aliquotaDasHibridoPct = roundHalfUp((aliquotaSnEfetiva * somaFracaoDasHibrido) / 100, 4)
    const fatorDasHibrido = Math.max(0.0001, 1 - aliquotaDasHibridoPct / 100)
    const divisorSnh = Math.max(0.0001, divisorSemIcms * fatorDasHibrido)
    const precoVendaUnitario = roundHalfUp(custoUnitario / divisorSnh, 2)

    const dasHibridoTotal = roundHalfUp(precoVendaUnitario * (aliquotaDasHibridoPct / 100), 2)
    // Alíquotas efetivas individuais sobre o preço
    const aliqEfetivaIcmsSn = (aliquotaSnEfetiva * fracaoIcmsPct) / 100 // 1,36%
    const aliqEfetivaFederaisSn = (aliquotaSnEfetiva * fracaoFederaisPct) / 100 // 2,02%
    const icmsNoDas = roundHalfUp(precoVendaUnitario * (aliqEfetivaIcmsSn / 100), 2)
    const federaisNoDas = roundHalfUp(precoVendaUnitario * (aliqEfetivaFederaisSn / 100), 2)

    // Base de cálculo do IBS/CBS = Preço P líquido do ICMS do DAS (LC 214 art. 12 §2º V)
    const baseCalculoIbsCbs = roundHalfUp(precoVendaUnitario - icmsNoDas, 2)
    const cbsUnitario = roundHalfUp(baseCalculoIbsCbs * (cbsRateEfetivo / 100), 2)
    const ibsUnitario = roundHalfUp(baseCalculoIbsCbs * (ibsRateEfetivo / 100), 2)
    const totalNotaUnitario = roundHalfUp(precoVendaUnitario + cbsUnitario + ibsUnitario, 2)

    const fatiasDas: FatiasDasDetalhe = {
      aliquotaTotalPct: aliquotaDasHibridoPct,
      dasTotal: dasHibridoTotal,
      icmsPct: fracaoIcmsPct,
      icmsValor: icmsNoDas,
      cbsPct: 0,
      cbsValor: 0,
      ibsPct: 0,
      ibsValor: 0,
      federaisPct: fracaoFederaisPct,
      federaisValor: federaisNoDas,
    }

    const dvUnitarioTotal = roundHalfUp(precoVendaUnitario * (somaDvPct / 100), 2)
    const lucroUnitarioRealizado = roundHalfUp(
      precoVendaUnitario - custoUnitario - dasHibridoTotal - dvUnitarioTotal,
      2,
    )
    const margemEfetivaPct =
      precoVendaUnitario > 0
        ? roundHalfUp((lucroUnitarioRealizado / precoVendaUnitario) * 100, 2)
        : 0
    const tributosPorForaUnitario = roundHalfUp(cbsUnitario + ibsUnitario, 2)

    return {
      key: 'snh',
      meta,
      custoUnitario,
      custoHoje,
      deltaCustoPct,
      comprasLiquidasTotal,
      notaCompraTotal,
      divisorPrincipal: divisorSnh,
      divisorSemIcms,
      fatorTributarioEfetivo: fatorDasHibrido,
      baseCalculoIbsCbs,
      cbsUnitario,
      ibsUnitario,
      valorSemIcms: precoVendaUnitario,
      precoVendaUnitario,
      totalNotaUnitario,
      isSimples: true,
      isSimplesHibrido: true,
      icmsUnitario: icmsNoDas,
      fatiasDas,
      dvUnitarioTotal,
      lucroUnitarioRealizado,
      margemEfetivaPct,
      tributosPorForaUnitario,
      faturamentoTotal: roundHalfUp(precoVendaUnitario * qtdMultiplicador, 2),
      custoTotal: roundHalfUp(custoUnitario * qtdMultiplicador, 2),
      cbsTotal: roundHalfUp(cbsUnitario * qtdMultiplicador, 2),
      ibsTotal: roundHalfUp(ibsUnitario * qtdMultiplicador, 2),
      totalNotaLote: roundHalfUp(totalNotaUnitario * qtdMultiplicador, 2),
    }
  }

  // =========================================================================
  // COLUNAS LP E LR: SISTEMÁTICA DA TRANSIÇÃO (NÃO TOCAR — LC 214 art. 12 + RC 32303/2025)
  // =========================================================================
  const fatorIcms = Math.max(0.0001, 1 - icmsRateEfetivo / 100)
  const divisorGeralLpLr = divisorSemIcms * fatorIcms

  // 1. Base IBS/CBS = Custo ÷ Divisor sem ICMS
  const baseCalculoIbsCbs = roundHalfUp(custoUnitario / divisorSemIcms, 2)

  // 2. CBS e IBS por fora sobre a BC limpa de ICMS
  const cbsUnitario = roundHalfUp(baseCalculoIbsCbs * (cbsRateEfetivo / 100), 2)
  const ibsUnitario = roundHalfUp(baseCalculoIbsCbs * (ibsRateEfetivo / 100), 2)

  // 3. Valor sem ICMS = BC + CBS + IBS
  const valorSemIcms = roundHalfUp(baseCalculoIbsCbs + cbsUnitario + ibsUnitario, 2)

  // 4. Preço de Venda / Nota Fiscal = Valor sem ICMS ÷ (1 - alíquota ICMS)
  const precoVendaUnitario = roundHalfUp(valorSemIcms / fatorIcms, 2)
  const icmsUnitario = roundHalfUp(precoVendaUnitario * (icmsRateEfetivo / 100), 2)
  const dvUnitarioTotal = roundHalfUp(precoVendaUnitario * (somaDvPct / 100), 2)

  const lucroUnitarioRealizado = roundHalfUp(
    precoVendaUnitario - custoUnitario - icmsUnitario - dvUnitarioTotal - cbsUnitario - ibsUnitario,
    2,
  )
  const margemEfetivaPct =
    precoVendaUnitario > 0 ? roundHalfUp((lucroUnitarioRealizado / precoVendaUnitario) * 100, 2) : 0

  const tributosPorForaUnitario = roundHalfUp(cbsUnitario + ibsUnitario, 2)
  const totalNotaUnitario = precoVendaUnitario

  return {
    key,
    meta,
    custoUnitario,
    custoHoje,
    deltaCustoPct,
    comprasLiquidasTotal,
    notaCompraTotal,
    divisorPrincipal: divisorGeralLpLr,
    divisorSemIcms,
    fatorTributarioEfetivo: fatorIcms,
    baseCalculoIbsCbs,
    cbsUnitario,
    ibsUnitario,
    valorSemIcms,
    precoVendaUnitario,
    totalNotaUnitario,
    isSimples: false,
    isSimplesHibrido: false,
    icmsUnitario,
    dvUnitarioTotal,
    lucroUnitarioRealizado,
    margemEfetivaPct,
    tributosPorForaUnitario,
    faturamentoTotal: roundHalfUp(precoVendaUnitario * qtdMultiplicador, 2),
    custoTotal: roundHalfUp(custoUnitario * qtdMultiplicador, 2),
    cbsTotal: roundHalfUp(cbsUnitario * qtdMultiplicador, 2),
    ibsTotal: roundHalfUp(ibsUnitario * qtdMultiplicador, 2),
    totalNotaLote: roundHalfUp(totalNotaUnitario * qtdMultiplicador, 2),
  }
}

/** Chave padrão de armazenamento local com isolamento de escopo */
export const STORAGE_KEY_MARKUP_POS = 'it_markup_pos_state_v1'

export interface MarkupPosSavedState {
  despesasVariaveis?: DespesaVariavelVenda[]
  icmsRateInput?: number
  cbsRateInput?: number
  ibsRateInput?: number
  margemLucroInput?: number
  quantidadeVendidaInput?: number
  fornecedorSelecionado?: FornecedorPosKey
}

export function carregarEstadoMarkupPos(): MarkupPosSavedState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const raw = window.localStorage.getItem(STORAGE_KEY_MARKUP_POS)
    if (!raw) return null
    return JSON.parse(raw) as MarkupPosSavedState
  } catch {
    return null
  }
}

export function salvarEstadoMarkupPos(estado: MarkupPosSavedState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(STORAGE_KEY_MARKUP_POS, JSON.stringify(estado))
  } catch {
    // ignorar falha de localStorage
  }
}
