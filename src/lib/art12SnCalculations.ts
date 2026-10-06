/**
 * ============================================================================
 * SESSÃO "SN NA REFORMA" — TRATAMENTO DIFERENCIADO PARA OPTANTES
 * Motor PRÓPRIO da sessão — o motor Art. 12 consolidado NÃO é tocado.
 * ============================================================================
 * OBJETIVO (determinação da CEO): calcular o CRÉDITO PROPORCIONAL do adquirente
 * nas aquisições de optante do Simples Nacional — LC 123/2006, art. 23:
 *   §1º (redação LC 214/2025): adquirente não optante tem crédito correspondente
 *   ao ICMS, IBS e CBS incidentes sobre aquisições de ME/EPP optante do SN,
 *   "em montante equivalente ao cobrado por meio desse regime único";
 *   §2º: a alíquota do crédito é INFORMADA NO DOCUMENTO FISCAL e corresponde aos
 *   percentuais de ICMS, IBS e CBS dos Anexos I a V para a faixa de receita do
 *   fornecedor no mês da operação.
 *
 * ORIGEM DOS PERCENTUAIS (determinação da CEO, "honestidade matemática"):
 *   - 'nota'   — percentuais informados no documento fiscal (art. 23, §2º da LC 123);
 *   - 'tabela' — derivados da TABELA OFICIAL (Faixa × Exercício).
 *   O default é "tabela" (estimativa da tabela oficial).
 *
 * DAS DEVIDO EM 4 BLOCOS (determinação da CEO, "honestidade matemática"):
 *   ICMS · CBS · IBS · IRPJ/CSLL/CPP
 *   com selo visual de consistência half-up na soma das parcelas.
 *
 * BASE DO DAS (parâmetro pendente de regulamentação — Res. CGSN 190/2026):
 *   - 'bruta'   — base cheia (mercadorias + frete) [default];
 *   - 'liquida' — base sem o ICMS da nota (art. 25, §1º, II dedução sobre a fração).
 *
 * PRECISÃO:
 *   Memória com 6 decimais em toda etapa intermediária; half-up a 2 casas
 *   apenas no resultado final exibido.
 */
import { r2 } from './art12Calculations'
import type { ItemIntegracaoArt12 } from './integracaoComprasArt12'

/** Arredondamento half-up com N casas decimais. */
export function roundHalfUp(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.floor(val * factor + 0.5) / factor
}

/** Formata número com 6 decimais exatos. */
export function fmt6(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}

/** Formata valor monetário com 6 decimais + valor comercial formatado. */
export function fmtMoney6(v: number): string {
  return `${fmt6(v)} (R$ ${fmtSN(roundHalfUp(v, 2), 2)})`
}

/** Formata número no padrão BR com N casas (default 2). */
export function fmtSN(v: number, casas = 2): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/** Origem do percentual de crédito. */
export type OrigemPercentual = 'nota' | 'tabela'

/** Modo de preenchimento da alíquota efetiva (compatibilidade e tipagem). */
export type ModoPreenchimentoSN = 'nota' | 'anexo'

/** Base de cálculo do DAS (pendência Res. CGSN 190/2026). */
export type BaseDoDas = 'bruta' | 'liquida'

/**
 * Estrutura da Tabela Oficial do Simples Nacional por Faixa e Exercício.
 * Frações de repartição somam 100,00%.
 */
export interface TabelaOficialFaixaConfig {
  anexo: string
  faixa: string
  exercicio: number // 2026, 2027, 2028, etc.
  limiteRbt12: number
  aliquotaEfetivaPct: number // ex: 4.00%
  // Frações de repartição do DAS (em % da alíquota efetiva, soma = 100%)
  fracaoIcmsPct: number // ex: 34.00%
  fracaoCbsPct: number // ex: 15.33% (em 2026 = 0)
  fracaoIbsPct: number // ex: 0.17% (em 2026 = 0)
  fracaoIrpjCsllCppPct: number // ex: 50.50% (em 2026 = 66.00%)
}

/**
 * TABELA OFICIAL DE REPARTIÇÃO DO SIMPLES NACIONAL
 * Fonte de verdade canônica. Aceita expansão para outras faixas/exercícios.
 * Para 2026: SN não recolhe CBS/IBS (LC 214/2025, art. 348, III, "c") → CBS/IBS = 0.
 * Para 2027–2028: Anexo I — 1ª faixa: efetiva 4,00%, ICMS 34,00%, CBS 15,33%, IBS 0,17%, IRPJ/CSLL/CPP 50,50%.
 */
export const TABELA_OFICIAL_SN: Record<string, TabelaOficialFaixaConfig> = {
  // Anexo I - 1ª Faixa - 2026
  anexo1_faixa1_2026: {
    anexo: 'Anexo I (comércio)',
    faixa: '1ª faixa (RBT12 até R$ 180.000,00)',
    exercicio: 2026,
    limiteRbt12: 180000,
    aliquotaEfetivaPct: 4.0,
    fracaoIcmsPct: 34.0,
    fracaoCbsPct: 0.0,
    fracaoIbsPct: 0.0,
    fracaoIrpjCsllCppPct: 66.0,
  },
  // Anexo I - 1ª Faixa - 2027
  anexo1_faixa1_2027: {
    anexo: 'Anexo I (comércio)',
    faixa: '1ª faixa (RBT12 até R$ 180.000,00)',
    exercicio: 2027,
    limiteRbt12: 180000,
    aliquotaEfetivaPct: 4.0,
    fracaoIcmsPct: 34.0,
    fracaoCbsPct: 15.33,
    fracaoIbsPct: 0.17,
    fracaoIrpjCsllCppPct: 50.5,
  },
  // Anexo I - 1ª Faixa - 2028
  anexo1_faixa1_2028: {
    anexo: 'Anexo I (comércio)',
    faixa: '1ª faixa (RBT12 até R$ 180.000,00)',
    exercicio: 2028,
    limiteRbt12: 180000,
    aliquotaEfetivaPct: 4.0,
    fracaoIcmsPct: 34.0,
    fracaoCbsPct: 15.33,
    fracaoIbsPct: 0.17,
    fracaoIrpjCsllCppPct: 50.5,
  },
}

/** Busca configuração da tabela oficial para a chave ou fallback para 1ª faixa 2027. */
export function getTabelaOficialConfig(
  exercicio = 2027,
  anexo = 'anexo1',
  faixa = 'faixa1',
): TabelaOficialFaixaConfig {
  const chave = `${anexo}_${faixa}_${exercicio}`
  if (TABELA_OFICIAL_SN[chave]) return TABELA_OFICIAL_SN[chave]
  // Fallback se exercício for 2026
  if (exercicio === 2026) return TABELA_OFICIAL_SN['anexo1_faixa1_2026']
  // Default 2027
  return TABELA_OFICIAL_SN['anexo1_faixa1_2027']
}

export interface PerfilSN {
  /** 'tabela' (estimativa oficial) ou 'nota' (do documento fiscal). Default 'tabela'. */
  origem: OrigemPercentual
  /** Compatibilidade com modo legado ('nota' | 'anexo') */
  modo?: ModoPreenchimentoSN

  /** MODO NOTA — percentuais informados no documento fiscal (art. 23, §2º). */
  icmsNotaPct: number
  cbsNotaPct: number
  ibsNotaPct: number

  /** MODO TABELA — anexo, faixa, exercício e RBT12 do fornecedor. */
  anexo: string
  faixa: string
  exercicio: number
  rbt12: number

  /** Alíquota efetiva total (nominal da faixa − dedução ou fixada na 1ª faixa). */
  efetivaPct: number

  /** Frações oficiais da partilha (% sobre a alíquota efetiva) */
  icmsFracPct: number
  cbsFracPct: number
  ibsFracPct: number
  irpjCsllCppFracPct: number

  /** Base do DAS: 'bruta' | 'liquida' (Res. CGSN 190/2026). Default 'bruta'. */
  baseDoDas?: BaseDoDas
}

/** Perfil padrão da sessão: Anexo I — 1ª faixa — 2027 (fonte de verdade oficial). */
export const PERFIL_SN_NOTA_PADRAO: PerfilSN = {
  origem: 'tabela',
  modo: 'anexo',
  // Valores manuais de contingência para modo nota (quando contador digitar)
  icmsNotaPct: 1.36,
  cbsNotaPct: 0.6132,
  ibsNotaPct: 0.0068,

  // Tabela oficial Anexo I 1ª faixa 2027
  anexo: 'Anexo I (comércio)',
  faixa: '1ª faixa (RBT12 até R$ 180.000,00)',
  exercicio: 2027,
  rbt12: 120000,
  efetivaPct: 4.0,

  // Frações de repartição oficiais
  icmsFracPct: 34.0,
  cbsFracPct: 15.33,
  ibsFracPct: 0.17,
  irpjCsllCppFracPct: 50.5,

  baseDoDas: 'bruta',
}

export interface LinhaMemoriaSN {
  key: string
  label: string
  formula: string
  value: number // valor formatado/comercial ou principal com half-up a 2 casas
  value6?: number // precisão estrita de 6 decimais
  destaque?: boolean
  fundamento?: string
  bloco?: 'das_decomposto' | 'credito' | 'custo' | 'contexto'
}

/** Decomposição em 4 blocos do DAS devido (honestidade matemática). */
export interface DecomposicaoDas4Blocos {
  /** Base utilizada (bruta ou líquida) */
  baseCalculo: number
  baseCalculo6: number
  aliquotaEfetivaPct: number

  // Parcelas do DAS em 6 decimais
  icmsValor6: number
  cbsValor6: number
  ibsValor6: number
  irpjCsllCppValor6: number
  dasTotalDevido6: number

  // Parcelas arredondadas (half-up 2 casas)
  icmsValor: number
  cbsValor: number
  ibsValor: number
  irpjCsllCppValor: number
  dasTotalDevido: number

  // Consistência da soma das 4 parcelas
  somaParcelas: number
  somaParcelas6: number
  consistente: boolean // true se Math.abs(somaParcelas - dasTotalDevido) <= 0.01
  diferencaCentavos: number
}

export interface ResultadoSessaoSN {
  /** Item da Calculadora de Compras em análise. */
  item: ItemIntegracaoArt12
  perfil: PerfilSN
  origemPercentuais: OrigemPercentual
  origemRotulo: 'da nota' | 'estimativa da tabela'
  baseDoDas: BaseDoDas

  /** Percentuais aplicados sobre a base do DAS */
  icmsPct: number
  cbsPct: number
  ibsPct: number
  irpjCsllCppPct: number
  efetivaPct: number

  /** Parcela creditável (% da alíquota): ICMS + CBS + IBS (exclui IRPJ/CSLL/CPP) */
  parcelaCreditavelPct: number

  /** Decomposição oficial do DAS em 4 blocos com selo de consistência */
  das4Blocos: DecomposicaoDas4Blocos

  /** Valores-chave (comerciais half-up 2 casas) */
  receitaBruta: number
  receitaBruta6: number
  baseDasUtilizada: number
  baseDasUtilizada6: number

  dasEfetivo: number
  dasEfetivo6: number

  icmsNota: number
  icmsNota6: number
  cbsDAS: number
  cbsDAS6: number
  ibsDAS: number
  ibsDAS6: number
  irpjCsllCppDAS: number
  irpjCsllCppDAS6: number

  /** PARCELA CREDITÁVEL (R$): ICMS + CBS + IBS */
  parcelaCreditavelTotal: number
  parcelaCreditavelTotal6: number

  creditoTotal: number
  creditoTotal6: number
  creditoUnidade: number
  creditoUnidade6: number

  custoLiquido: number
  custoLiquido6: number
  custoUnitarioLiquido: number
  custoUnitarioLiquido6: number

  /** Baseline 2026 do fornecedor SN: crédito só de ICMS pela fração (34% × 4% = 1,36%) */
  creditoHojeSN: number
  creditoHojeSN6: number
  custoHojeSN: number
  custoHojeSN6: number
  custoUnitarioHojeSN: number
  custoUnitarioHojeSN6: number

  /** Crédito PIS/COFINS de 2026 para Lucro Real (ADI SRF 15/2007 + SC COSIT 297/2019) */
  creditoPisCofinsHoje: number
  creditoPisCofinsHoje6: number
  pisCofinsBaseHoje: number
  pisCofinsBaseHoje6: number

  /** Comparativo simultâneo: cálculo sob base líquida e base bruta para painel de teses */
  comparativoBases: {
    bruta: {
      base: number
      das: number
      creditoTotal: number
      custoLiquido: number
      custoUnitario: number
    }
    liquida: {
      base: number
      deducaoIcms: number
      das: number
      creditoTotal: number
      custoLiquido: number
      custoUnitario: number
    }
  }

  /** Memória de cálculo detalhada */
  memoria: LinhaMemoriaSN[]
}

/**
 * CÁLCULO DA SESSÃO "SN NA REFORMA"
 * Motor com fundamentação legal explícita e memória em 6 decimais.
 */
export function calcularSessaoSN(
  item: ItemIntegracaoArt12,
  perfil: PerfilSN,
  adquirente: 'presumido' | 'real' | 'simples' | 'simples_hibrido' = 'presumido',
): ResultadoSessaoSN {
  const qtd = Math.max(1, item.quantity)
  const merc6 = item.merchandiseValue || 0
  const frete6 = item.freightValue || 0
  const receitaBruta6 = merc6 + frete6
  const receitaBruta = roundHalfUp(receitaBruta6, 2)

  // 1. Origem dos percentuais e resolução da alíquota
  // Se perfil.origem for 'nota' (ou legado perfil.modo === 'nota' sem origem explícita)
  const origem: OrigemPercentual =
    perfil.origem === 'nota' || (perfil.modo === 'nota' && perfil.origem !== 'tabela')
      ? 'nota'
      : 'tabela'

  const origemRotulo: 'da nota' | 'estimativa da tabela' =
    origem === 'nota' ? 'da nota' : 'estimativa da tabela'

  const baseDoDas: BaseDoDas = perfil.baseDoDas ?? 'bruta'

  // Determinar percentuais de partilha
  let efetivaPct = perfil.efetivaPct || 4.0
  let icmsFracPct = perfil.icmsFracPct ?? 34.0
  let cbsFracPct = perfil.cbsFracPct ?? 15.33
  let ibsFracPct = perfil.ibsFracPct ?? 0.17
  let irpjCsllCppFracPct = perfil.irpjCsllCppFracPct ?? 50.5

  let icmsPct = 0
  let cbsPct = 0
  let ibsPct = 0
  let irpjCsllCppPct = 0

  if (origem === 'nota') {
    // Modo NOTA: percentuais digitados diretamente da nota (art. 23, §2º da LC 123)
    icmsPct = perfil.icmsNotaPct
    cbsPct = perfil.cbsNotaPct
    ibsPct = perfil.ibsNotaPct
    efetivaPct = perfil.efetivaPct || roundHalfUp(icmsPct + cbsPct + ibsPct, 4)
    irpjCsllCppPct = Math.max(0, roundHalfUp(efetivaPct - (icmsPct + cbsPct + ibsPct), 4))
  } else {
    // Modo TABELA (estimativa oficial da tabela Faixa × Exercício)
    // Parcela de cada tributo = efetiva × fração
    icmsPct = (efetivaPct * icmsFracPct) / 100 // 4% × 34% = 1,36%
    cbsPct = (efetivaPct * cbsFracPct) / 100 // 4% × 15,33% = 0,6132%
    ibsPct = (efetivaPct * ibsFracPct) / 100 // 4% × 0,17% = 0,0068%
    irpjCsllCppPct = (efetivaPct * irpjCsllCppFracPct) / 100 // 4% × 50,5% = 2,02%
  }

  // Parcela creditável em % = ICMS + CBS + IBS (exclui IRPJ/CSLL/CPP)
  const parcelaCreditavelPct = icmsPct + cbsPct + ibsPct

  // 2. Base de cálculo do DAS (Bruta vs Líquida do ICMS da nota)
  // Parcela ICMS para efeito de dedução do art. 25, §1º, II
  const parcelaIcmsDeducao6 = (receitaBruta6 * icmsPct) / 100
  const baseDasLiquida6 = receitaBruta6 - parcelaIcmsDeducao6

  const baseDasUtilizada6 = baseDoDas === 'liquida' ? baseDasLiquida6 : receitaBruta6
  const baseDasUtilizada = roundHalfUp(baseDasUtilizada6, 2)

  // 3. Decomposição do DAS em 4 Blocos (com 6 decimais)
  const icmsNota6 = (baseDasUtilizada6 * icmsPct) / 100
  const cbsDAS6 = (baseDasUtilizada6 * cbsPct) / 100
  const ibsDAS6 = (baseDasUtilizada6 * ibsPct) / 100
  const irpjCsllCppDAS6 = (baseDasUtilizada6 * irpjCsllCppPct) / 100
  const dasEfetivo6 = (baseDasUtilizada6 * efetivaPct) / 100

  // Valores half-up para exibição comercial
  const icmsNota = roundHalfUp(icmsNota6, 2)
  const cbsDAS = roundHalfUp(cbsDAS6, 2)
  const ibsDAS = roundHalfUp(ibsDAS6, 2)
  const irpjCsllCppDAS = roundHalfUp(irpjCsllCppDAS6, 2)
  const dasEfetivo = roundHalfUp(dasEfetivo6, 2)

  const somaParcelas6 = icmsNota6 + cbsDAS6 + ibsDAS6 + irpjCsllCppDAS6
  const somaParcelas = roundHalfUp(icmsNota + cbsDAS + ibsDAS + irpjCsllCppDAS, 2)
  const diferencaCentavos = roundHalfUp(Math.abs(somaParcelas - dasEfetivo), 2)
  const consistente = diferencaCentavos <= 0.01

  const das4Blocos: DecomposicaoDas4Blocos = {
    baseCalculo: baseDasUtilizada,
    baseCalculo6: baseDasUtilizada6,
    aliquotaEfetivaPct: efetivaPct,
    icmsValor6: icmsNota6,
    cbsValor6: cbsDAS6,
    ibsValor6: ibsDAS6,
    irpjCsllCppValor6: irpjCsllCppDAS6,
    dasTotalDevido6: dasEfetivo6,
    icmsValor: icmsNota,
    cbsValor: cbsDAS,
    ibsValor: ibsDAS,
    irpjCsllCppValor: irpjCsllCppDAS,
    dasTotalDevido: dasEfetivo,
    somaParcelas,
    somaParcelas6,
    consistente,
    diferencaCentavos,
  }

  // 4. Parcela Creditável (art. 23, §1º: ICMS + CBS + IBS)
  // Consumida pelos cards de custo
  const parcelaCreditavelTotal6 = icmsNota6 + cbsDAS6 + ibsDAS6
  const parcelaCreditavelTotal = roundHalfUp(parcelaCreditavelTotal6, 2)

  const creditoTotal6 = parcelaCreditavelTotal6
  const creditoTotal = parcelaCreditavelTotal
  const creditoUnidade6 = creditoTotal6 / qtd
  const creditoUnidade = roundHalfUp(creditoUnidade6, 2)

  // Custo líquido para o adquirente: nota integral − parcela creditável
  const custoLiquido6 = receitaBruta6 - creditoTotal6
  const custoLiquido = roundHalfUp(custoLiquido6, 2)
  const custoUnitarioLiquido6 = custoLiquido6 / qtd
  const custoUnitarioLiquido = roundHalfUp(custoUnitarioLiquido6, 2)

  // 5. Baseline 2026 do fornecedor SN: crédito só de ICMS pela fração
  // (art. 23 redação original; CBS/IBS inexistem no SN em 2026 conforme LC 214 art. 348 III "c")
  // Fração do ICMS: 34% × 4% = 1,36% sobre a nota bruta (42.400 × 1,36% = 576,64)
  const icmsBaselinePct = origem === 'nota' ? icmsPct : (efetivaPct * icmsFracPct) / 100
  const icmsCredito2026_6 = (receitaBruta6 * icmsBaselinePct) / 100
  const icmsCredito2026 = roundHalfUp(icmsCredito2026_6, 2)

  // Adquirente Lucro Real em 2026: ADI SRF 15/2007 + SC COSIT 297/2019
  // Alíquotas plenas 1,65% e 7,60% sobre a base sem o ICMS destacado na nota (Lei 14.592/2023)
  const pisCofinsBaseHoje6 = receitaBruta6 - icmsCredito2026_6
  const pisCofinsBaseHoje = roundHalfUp(pisCofinsBaseHoje6, 2)
  const creditoPisHoje6 = (pisCofinsBaseHoje6 * 1.65) / 100
  const creditoCofinsHoje6 = (pisCofinsBaseHoje6 * 7.6) / 100
  const creditoPisCofinsHoje6 = creditoPisHoje6 + creditoCofinsHoje6
  const creditoPisCofinsHoje = roundHalfUp(creditoPisCofinsHoje6, 2)

  const creditoHojeSN6 =
    adquirente === 'real' ? icmsCredito2026_6 + creditoPisCofinsHoje6 : icmsCredito2026_6
  const creditoHojeSN = roundHalfUp(creditoHojeSN6, 2)

  const custoHojeSN6 = receitaBruta6 - creditoHojeSN6
  const custoHojeSN = roundHalfUp(custoHojeSN6, 2)
  const custoUnitarioHojeSN6 = custoHojeSN6 / qtd
  const custoUnitarioHojeSN = roundHalfUp(custoUnitarioHojeSN6, 2)

  // 6. Comparativo simultâneo de bases (Res. CGSN 190/2026) para painel de teses
  const calcBaseBruta = () => {
    const b6 = receitaBruta6
    const das6 = (b6 * efetivaPct) / 100
    const cred6 = (b6 * (icmsPct + cbsPct + ibsPct)) / 100
    const cLiq6 = b6 - cred6
    return {
      base: roundHalfUp(b6, 2),
      das: roundHalfUp(das6, 2),
      creditoTotal: roundHalfUp(cred6, 2),
      custoLiquido: roundHalfUp(cLiq6, 2),
      custoUnitario: roundHalfUp(cLiq6 / qtd, 2),
    }
  }

  const calcBaseLiquida = () => {
    const deducao6 = (receitaBruta6 * icmsPct) / 100
    const b6 = receitaBruta6 - deducao6
    const das6 = (b6 * efetivaPct) / 100
    const cred6 = (b6 * (icmsPct + cbsPct + ibsPct)) / 100
    const cLiq6 = receitaBruta6 - cred6
    return {
      base: roundHalfUp(b6, 2),
      deducaoIcms: roundHalfUp(deducao6, 2),
      das: roundHalfUp(das6, 2),
      creditoTotal: roundHalfUp(cred6, 2),
      custoLiquido: roundHalfUp(cLiq6, 2),
      custoUnitario: roundHalfUp(cLiq6 / qtd, 2),
    }
  }

  const comparativoBases = {
    bruta: calcBaseBruta(),
    liquida: calcBaseLiquida(),
  }

  // 7. Montagem da memória com 6 decimais e citações legais
  const memoria: LinhaMemoriaSN[] = [
    {
      key: 'mercadorias',
      label: '(+) Mercadorias',
      formula: `${qtd} un. × R$ ${fmtSN(merc6 / qtd, 2)} — da Calculadora de Compras`,
      value: roundHalfUp(merc6, 2),
      value6: merc6,
      bloco: 'contexto',
      fundamento: 'LC 214/2025, art. 12: valor da operação.',
    },
    {
      key: 'frete',
      label: '(+) Frete sobre vendas',
      formula: 'valor contratado na nota',
      value: roundHalfUp(frete6, 2),
      value6: frete6,
      bloco: 'contexto',
      fundamento: 'LC 214/2025, art. 12, §1º, IV: transporte cobrado integra a operação.',
    },
    {
      key: 'receitabruta',
      label: '(=) Receita bruta da operação',
      formula: `${fmtSN(merc6, 2)} + ${fmtSN(frete6, 2)} = ${fmtMoney6(receitaBruta6)}`,
      value: receitaBruta,
      value6: receitaBruta6,
      destaque: true,
      bloco: 'contexto',
      fundamento: 'LC 123/2006, art. 3º, §12º: receita bruta auferida na operação.',
    },
    {
      key: 'base_das',
      label: `Base de cálculo do DAS (${baseDoDas === 'liquida' ? 'Líquida da fração ICMS' : 'Bruta integral'})`,
      formula:
        baseDoDas === 'liquida'
          ? `${fmtSN(receitaBruta6, 2)} − ICMS da nota (${fmtSN(parcelaIcmsDeducao6, 2)}) = ${fmtMoney6(baseDasUtilizada6)}`
          : `Receita bruta integral = ${fmtMoney6(receitaBruta6)}`,
      value: baseDasUtilizada,
      value6: baseDasUtilizada6,
      bloco: 'contexto',
      fundamento:
        baseDoDas === 'liquida'
          ? 'LC 123/2006, art. 25, §1º, II (dedução do ICMS cobrado do adquirente) — Res. CGSN 190/2026.'
          : 'LC 123/2006, art. 3º, §12º: alíquota incide sobre a receita bruta integral.',
    },
    {
      key: 'efetiva',
      label: `(i) Alíquota efetiva do fornecedor — ${fmtSN(efetivaPct, 2)}% [${origemRotulo}]`,
      formula:
        origem === 'nota'
          ? 'Percentuais digitados do documento fiscal — padrão ouro'
          : `Tabela oficial: ${perfil.anexo}, ${perfil.faixa}, Exercício ${perfil.exercicio || 2027}`,
      value: efetivaPct,
      value6: efetivaPct,
      bloco: 'das_decomposto',
      fundamento:
        origem === 'nota'
          ? 'LC 123/2006, art. 23, §2º (redação LC 214/2025): alíquotas do crédito informadas no documento fiscal.'
          : 'LC 123/2006, art. 3º, §12º: alíquota efetiva do Anexo I (comércio) por faixa e exercício.',
    },
    {
      key: 'das',
      label: `(−) DAS devido do fornecedor — R$ ${fmtSN(dasEfetivo, 2)} (por dentro)`,
      formula: `${fmtSN(efetivaPct, 2)}% × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(dasEfetivo6)}`,
      value: -dasEfetivo,
      value6: -dasEfetivo6,
      destaque: true,
      bloco: 'das_decomposto',
      fundamento: 'LC 123/2006, art. 13: regime unificado de arrecadação tributária.',
    },
    // BLOCO 1: ICMS
    {
      key: 'icmsnota',
      label: `· ICMS (${fmtSN(icmsPct, 4)}% do DAS)`,
      formula: `${fmtSN(icmsPct, 4)}% × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(icmsNota6)} [Fração: ${fmtSN(icmsFracPct, 2)}%]`,
      value: icmsNota,
      value6: icmsNota6,
      bloco: 'das_decomposto',
      fundamento: 'LC 123/2006, art. 23, §2º + LC 214/2025: fração do ICMS repassada no DAS.',
    },
    // BLOCO 2: CBS
    {
      key: 'cbsdas',
      label: `· CBS (${fmtSN(cbsPct, 4)}% do DAS)`,
      formula: `${fmtSN(cbsPct, 4)}% × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(cbsDAS6)} [Fração: ${fmtSN(cbsFracPct, 2)}%]`,
      value: cbsDAS,
      value6: cbsDAS6,
      bloco: 'das_decomposto',
      fundamento:
        'LC 214/2025, art. 139 + LC 123/2006, Anexo XX: CBS substitui PIS/COFINS em 2027.',
    },
    // BLOCO 3: IBS
    {
      key: 'ibsdas',
      label: `· IBS (${fmtSN(ibsPct, 4)}% do DAS)`,
      formula: `${fmtSN(ibsPct, 4)}% × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(ibsDAS6)} [Fração: ${fmtSN(ibsFracPct, 2)}%]`,
      value: ibsDAS,
      value6: ibsDAS6,
      bloco: 'das_decomposto',
      fundamento: 'LC 214/2025, art. 139: IBS integra o Simples Nacional.',
    },
    // BLOCO 4: IRPJ/CSLL/CPP (não gera crédito)
    {
      key: 'irpjcsllcppdas',
      label: `· IRPJ / CSLL / CPP (${fmtSN(irpjCsllCppPct, 4)}% do DAS) — NÃO GERA CRÉDITO`,
      formula: `${fmtSN(irpjCsllCppPct, 4)}% × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(irpjCsllCppDAS6)} [Fração: ${fmtSN(irpjCsllCppFracPct, 2)}%]`,
      value: irpjCsllCppDAS,
      value6: irpjCsllCppDAS6,
      bloco: 'das_decomposto',
      fundamento:
        'LC 123/2006, art. 23, §1º: crédito restringe-se exclusivamente a ICMS, CBS e IBS.',
    },
    {
      key: 'preconota',
      label: '(=) PREÇO DA NOTA DO FORNECEDOR SN',
      formula: 'sem destaque de CBS/IBS na nota — tributos por dentro do preço (nota congelada)',
      value: receitaBruta,
      value6: receitaBruta6,
      destaque: true,
      bloco: 'contexto',
      fundamento: 'LC 123/2006: fornecedor optante não reprecifica por destaque.',
    },
    {
      key: 'credito_base',
      label: 'Base da parcela creditável do adquirente',
      formula: `Base do DAS (${baseDoDas}) = ${fmtMoney6(baseDasUtilizada6)}`,
      value: baseDasUtilizada,
      value6: baseDasUtilizada6,
      bloco: 'credito',
      fundamento: 'LC 123/2006, art. 23, §1º + LC 214/2025, art. 47, §9º, II.',
    },
    {
      key: 'credito_icms',
      label: '(+) Parcela creditável — ICMS',
      formula: `${fmtSN(icmsPct, 4)}% × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(icmsNota6)}`,
      value: icmsNota,
      value6: icmsNota6,
      bloco: 'credito',
      fundamento: 'LC 123/2006, art. 23, §1º (redação LC 214/2025).',
    },
    {
      key: 'credito_cbs',
      label: '(+) Parcela creditável — CBS',
      formula: `${fmtSN(cbsPct, 4)}% × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(cbsDAS6)}`,
      value: cbsDAS,
      value6: cbsDAS6,
      bloco: 'credito',
      fundamento: 'LC 214/2025, art. 47, §9º, II + LC 123/2006, art. 23, §1º.',
    },
    {
      key: 'credito_ibs',
      label: '(+) Parcela creditável — IBS',
      formula: `${fmtSN(ibsPct, 4)}% × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(ibsDAS6)}`,
      value: ibsDAS,
      value6: ibsDAS6,
      bloco: 'credito',
      fundamento: 'LC 214/2025, art. 47, §9º, II + LC 123/2006, art. 23, §1º.',
    },
    {
      key: 'credito_total',
      label: '(=) PARCELA CREDITÁVEL TOTAL (ICMS + CBS + IBS)',
      formula: `${fmtSN(icmsNota6, 6)} + ${fmtSN(cbsDAS6, 6)} + ${fmtSN(ibsDAS6, 6)} = ${fmtMoney6(parcelaCreditavelTotal6)}`,
      value: parcelaCreditavelTotal,
      value6: parcelaCreditavelTotal6,
      destaque: true,
      bloco: 'credito',
      fundamento:
        'LC 123/2006, art. 23, §1º: crédito em montante equivalente ao cobrado por meio do regime único.',
    },
    {
      key: 'credito_unidade',
      label: '(÷) Crédito por unidade',
      formula: `${fmtSN(parcelaCreditavelTotal6, 6)} ÷ ${qtd} un. = ${fmtMoney6(creditoUnidade6)}`,
      value: creditoUnidade,
      value6: creditoUnidade6,
      bloco: 'credito',
    },
    {
      key: 'custoliquido',
      label: '(=) CUSTO LÍQUIDO COM PARCELA CREDITÁVEL',
      formula: `${fmtSN(receitaBruta6, 2)} − ${fmtSN(parcelaCreditavelTotal6, 6)} = ${fmtMoney6(custoLiquido6)}`,
      value: custoLiquido,
      value6: custoLiquido6,
      destaque: true,
      bloco: 'custo',
    },
    {
      key: 'custounitario',
      label: '(÷) CUSTO UNITÁRIO LÍQUIDO (EXIBIDO)',
      formula: `${fmtSN(custoLiquido6, 6)} ÷ ${qtd} un. = ${fmt6(custoUnitarioLiquido6)} → R$ ${fmtSN(custoUnitarioLiquido, 2)}`,
      value: custoUnitarioLiquido,
      value6: custoUnitarioLiquido6,
      destaque: true,
      bloco: 'custo',
    },
  ]

  return {
    item,
    perfil,
    origemPercentuais: origem,
    origemRotulo,
    baseDoDas,
    icmsPct,
    cbsPct,
    ibsPct,
    irpjCsllCppPct,
    efetivaPct,
    parcelaCreditavelPct,
    das4Blocos,
    receitaBruta,
    receitaBruta6,
    baseDasUtilizada,
    baseDasUtilizada6,
    dasEfetivo,
    dasEfetivo6,
    icmsNota,
    icmsNota6,
    cbsDAS,
    cbsDAS6,
    ibsDAS,
    ibsDAS6,
    irpjCsllCppDAS,
    irpjCsllCppDAS6,
    parcelaCreditavelTotal,
    parcelaCreditavelTotal6,
    creditoTotal,
    creditoTotal6,
    creditoUnidade,
    creditoUnidade6,
    custoLiquido,
    custoLiquido6,
    custoUnitarioLiquido,
    custoUnitarioLiquido6,
    creditoHojeSN,
    creditoHojeSN6,
    custoHojeSN,
    custoHojeSN6,
    custoUnitarioHojeSN,
    custoUnitarioHojeSN6,
    creditoPisCofinsHoje,
    creditoPisCofinsHoje6,
    pisCofinsBaseHoje,
    pisCofinsBaseHoje6,
    comparativoBases,
    memoria,
  }
}

/**
 * REGRA DE CRÉDITO DO ADQUIRENTE (art. 23 LC 123/2006 + art. 47 LC 214/2025)
 * Retorna a parcela creditável efetiva conforme o regime do adquirente.
 */
export function creditoEfetivoArt23(
  adquirente: 'presumido' | 'real' | 'simples' | 'simples_hibrido',
  r: Pick<ResultadoSessaoSN, 'creditoTotal' | 'parcelaCreditavelTotal' | 'cbsDAS' | 'ibsDAS'>,
  creditoHojeLR?: number,
): number {
  if (adquirente === 'simples') return 0
  if (adquirente === 'simples_hibrido') return roundHalfUp(r.cbsDAS + r.ibsDAS, 2)
  if (adquirente === 'real' && creditoHojeLR !== undefined) return roundHalfUp(creditoHojeLR, 2)
  return r.parcelaCreditavelTotal ?? r.creditoTotal
}
