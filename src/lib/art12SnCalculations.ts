/**
 * ============================================================================
 * SESSÃO "SN NA REFORMA" — TRATAMENTO DIFERENCIADO PARA OPTANTES (28/09)
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
 * Dois modos de preenchimento (decisão da CEO):
 *   'nota'  — percentuais lidos do documento fiscal (padrão ouro);
 *   'anexo' — anexo + faixa + RBT12 do fornecedor (estimado — flag na tela).
 * A sessão NÃO altera os ouros chancelados do Art. 12 — é uma camada nova ao lado.
 */
import { r2, type ExercicioKey, type ScheduleRowArt } from './art12Calculations'
import type { ItemIntegracaoArt12 } from './integracaoComprasArt12'

/** Modo de preenchimento da alíquota efetiva (decisão da CEO, 28/09). */
export type ModoPreenchimentoSN = 'nota' | 'anexo'

export interface PerfilSN {
  modo: ModoPreenchimentoSN
  /** MODO NOTA — percentuais informados no documento fiscal (art. 23, §2º). */
  icmsNotaPct: number
  cbsNotaPct: number
  ibsNotaPct: number
  /** MODO ANEXO — anexo + faixa + RBT12 do fornecedor (estimativa declarada). */
  anexo: string
  faixa: string
  rbt12: number
  /** Alíquota efetiva calculada (nominal da faixa − dedução) — preenchida pelo usuário. */
  efetivaPct: number
  /** Fração da alíquota efetiva destinada ao ICMS no anexo (ex.: 32,5% na 1ª faixa comércio). */
  icmsFracPct: number
}

/** Perfil padrão da sessão: percentuais da nota da 1ª faixa do comércio (Anexo I). */
export const PERFIL_SN_NOTA_PADRAO: PerfilSN = {
  modo: 'nota',
  icmsNotaPct: 1.3,
  cbsNotaPct: 2.7,
  ibsNotaPct: 0.17,
  anexo: 'Anexo I (comércio)',
  faixa: '1ª faixa (RBT12 até R$ 120.000,00)',
  rbt12: 120000,
  efetivaPct: 4.0,
  icmsFracPct: 32.5,
}

export interface LinhaMemoriaSN {
  key: string
  label: string
  formula: string
  value: number
  destaque?: boolean
  fundamento?: string
}

export interface ResultadoSessaoSN {
  /** Item da Calculadora de Compras em análise. */
  item: ItemIntegracaoArt12
  perfil: PerfilSN
  /** Percentuais efetivos usados (da nota ou derivados do anexo). */
  icmsPct: number
  cbsPct: number
  ibsPct: number
  efetivaPct: number
  /** Memória de cálculo detalhada. */
  memoria: LinhaMemoriaSN[]
  /** Valores-chave. */
  receitaBruta: number
  dasEfetivo: number
  icmsNota: number
  cbsDAS: number
  ibsDAS: number
  creditoTotal: number
  creditoUnidade: number
  custoLiquido: number
  custoUnitarioLiquido: number
}

/**
 * CÁLCULO DA SESSÃO — memória detalhada conforme a prévia chancelada pela CEO:
 * Receita bruta → DAS efetivo por dentro → ICMS gerado na nota → CBS/IBS no DAS
 * → preço da nota (congelado) → crédito proporcional do adquirente (art. 23)
 * → custo líquido.
 */
export function calcularSessaoSN(item: ItemIntegracaoArt12, perfil: PerfilSN): ResultadoSessaoSN {
  const merc = r2(item.merchandiseValue || 0)
  const frete = r2(item.freightValue || 0)
  const receitaBruta = r2(merc + frete)

  // Percentuais efetivos: modo nota = lidos do documento; modo anexo = derivados da faixa.
  const icmsPct =
    perfil.modo === 'nota' ? perfil.icmsNotaPct : r2((perfil.efetivaPct * perfil.icmsFracPct) / 100)
  const cbsPct = perfil.modo === 'nota' ? perfil.cbsNotaPct : r2(perfil.efetivaPct - icmsPct) // 2027–28: PIS/COFINS extintos, CBS entra no lugar
  const ibsPct = perfil.modo === 'nota' ? perfil.ibsNotaPct : 0
  const efetivaPct = r2(icmsPct + cbsPct + ibsPct)

  const dasEfetivo = r2(receitaBruta * (efetivaPct / 100))
  const icmsNota = r2(receitaBruta * (icmsPct / 100))
  const cbsDAS = r2(receitaBruta * (cbsPct / 100))
  const ibsDAS = r2(receitaBruta * (ibsPct / 100))

  const creditoTotal = r2(icmsNota + cbsDAS + ibsDAS)
  const creditoUnidade = r2(creditoTotal / Math.max(1, item.quantity))
  const custoLiquido = r2(receitaBruta - creditoTotal)
  const custoUnitarioLiquido = r2(custoLiquido / Math.max(1, item.quantity))

  const origemDado =
    perfil.modo === 'nota'
      ? 'percentuais lidos do DOCUMENTO FISCAL (art. 23, §2º) — padrão ouro'
      : `ESTIMADO pela faixa: ${perfil.anexo}, ${perfil.faixa}, RBT12 informado`

  const memoria: LinhaMemoriaSN[] = [
    {
      key: 'mercadorias',
      label: '(+) Mercadorias',
      formula: `${item.quantity} un. × ${item.merchandiseValue / Math.max(1, item.quantity)} — da Calculadora de Compras`,
      value: merc,
    },
    {
      key: 'frete',
      label: '(+) Frete sobre vendas',
      formula: 'valor da nota',
      value: frete,
    },
    {
      key: 'receitabruta',
      label: '(=) Receita bruta da operação',
      formula: 'base do DAS — LC 123/2006, art. 3º, §12º',
      value: receitaBruta,
      destaque: true,
      fundamento: 'LC 123/2006, art. 3º, §12º: alíquota efetiva incide sobre a receita bruta.',
    },
    {
      key: 'efetiva',
      label: `(i) Alíquota efetiva do fornecedor — ${efetivaPct}%`,
      formula: origemDado,
      value: efetivaPct,
      fundamento:
        perfil.modo === 'nota'
          ? 'LC 123/2006, art. 23, §2º: percentuais informados no documento fiscal.'
          : 'LC 123/2006, art. 3º, §12º: RBT12 × percentual da faixa − dedução (estimativa declarada).',
    },
    {
      key: 'das',
      label: '(−) DAS efetivo do fornecedor — por dentro',
      formula: `${efetivaPct}% × ${receitaBruta} = ${dasEfetivo} (ICMS ${icmsNota} + CBS ${cbsDAS} + IBS ${ibsDAS})`,
      value: -dasEfetivo,
      fundamento: 'Recolhimento unificado sobre a receita bruta — sem destaque na nota.',
    },
    {
      key: 'icmsnota',
      label: '(=) ICMS gerado na nota do fornecedor',
      formula: `${icmsPct}% × ${receitaBruta} = ${icmsNota} — o percentual que o art. 23, §2º manda informar no documento`,
      value: icmsNota,
      destaque: true,
      fundamento: 'LC 123/2006, art. 23, §2º (redação LC 214/2025).',
    },
    {
      key: 'cbsdas',
      label: '(i) CBS recolhida pelo fornecedor (dentro do DAS)',
      formula: `${cbsPct}% × ${receitaBruta} = ${cbsDAS} — sem destaque na nota`,
      value: cbsDAS,
      fundamento:
        'LC 123/2006, Anexo XX (redação LC 214/2025, art. 139): PIS/COFINS extintos em 2027, CBS entra no lugar.',
    },
    {
      key: 'ibsdas',
      label: '(i) IBS recolhido pelo fornecedor (dentro do DAS)',
      formula: `${ibsPct}% × ${receitaBruta} = ${ibsDAS} — partilha da faixa`,
      value: ibsDAS,
      fundamento: 'LC 214/2025, art. 139: IBS integra o rol do Simples Nacional.',
    },
    {
      key: 'preconota',
      label: '(=) PREÇO DA NOTA DO FORNECEDOR SN',
      formula:
        'sem destaque de ICMS/CBS/IBS — tributos por dentro do preço (nota congelada 2027–2032)',
      value: receitaBruta,
      destaque: true,
      fundamento: 'Fornecedor SN não reprecifica por destaque — repasse não se aplica.',
    },
    {
      key: 'credito_base',
      label: 'Base do crédito do adquirente',
      formula: 'valor da operação — art. 23, §1º',
      value: receitaBruta,
      fundamento: 'LC 123/2006, art. 23, §1º (redação LC 214/2025).',
    },
    {
      key: 'credito_icms',
      label: '(+) Crédito de ICMS do adquirente',
      formula: `${icmsPct}% × ${receitaBruta} = ${icmsNota}`,
      value: icmsNota,
      fundamento: 'Art. 23, §1º: crédito em montante equivalente ao cobrado no regime único.',
    },
    {
      key: 'credito_cbs',
      label: '(+) Crédito de CBS do adquirente',
      formula: `${cbsPct}% × ${receitaBruta} = ${cbsDAS}`,
      value: cbsDAS,
      fundamento: 'Art. 23, §1º + art. 47, §9º, II da LC 214/2025.',
    },
    {
      key: 'credito_ibs',
      label: '(+) Crédito de IBS do adquirente',
      formula: `${ibsPct}% × ${receitaBruta} = ${ibsDAS}`,
      value: ibsDAS,
      fundamento: 'Art. 23, §1º + art. 47, §9º, II da LC 214/2025.',
    },
    {
      key: 'credito_total',
      label: '(=) CRÉDITO TOTAL DO ADQUIRENTE',
      formula: `${icmsNota} + ${cbsDAS} + ${ibsDAS} = ${creditoTotal} — "montante equivalente ao cobrado por meio desse regime único"`,
      value: creditoTotal,
      destaque: true,
      fundamento: 'LC 123/2006, art. 23, §1º (redação LC 214/2025).',
    },
    {
      key: 'credito_unidade',
      label: '(÷) Crédito por unidade',
      formula: `${creditoTotal} ÷ ${item.quantity} un.`,
      value: creditoUnidade,
    },
    {
      key: 'custoliquido',
      label: '(=) CUSTO LÍQUIDO COM O ART. 23',
      formula: `${receitaBruta} − ${creditoTotal} = ${custoLiquido}`,
      value: custoLiquido,
      destaque: true,
    },
    {
      key: 'custounitario',
      label: '(÷) Custo unitário líquido',
      formula: `${custoLiquido} ÷ ${item.quantity} un.`,
      value: custoUnitarioLiquido,
      destaque: true,
    },
  ]

  return {
    item,
    perfil,
    icmsPct,
    cbsPct,
    ibsPct,
    efetivaPct,
    memoria,
    receitaBruta,
    dasEfetivo,
    icmsNota,
    cbsDAS,
    ibsDAS,
    creditoTotal,
    creditoUnidade,
    custoLiquido,
    custoUnitarioLiquido,
  }
}

/** Formata número no padrão BR com N casas (espelha o motor Art. 12). */
export function fmtSN(v: number, casas = 2): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}
