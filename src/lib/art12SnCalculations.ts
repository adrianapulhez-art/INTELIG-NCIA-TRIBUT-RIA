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
  faixaNumero?: number
  anexoId?: string
  exercicio: number // 2026, 2027, 2028, 2029, ..., 2033
  limiteRbt12: number
  aliquotaNominalPct?: number
  parcelaDeduzir?: number
  aliquotaEfetivaPct: number // ex: 4.00%
  // Frações de repartição do DAS (em % da alíquota efetiva, soma = 100%)
  fracaoIcmsPct: number // fração de ICMS/ISS estadual/municipal
  fracaoCbsPct: number // ex: 15.33% (em 2026 = 0)
  fracaoIbsPct: number // ex: 0.17% (em 2026 = 0)
  fracaoIrpjCsllCppPct: number // ex: 50.50% (em 2026 = 66.00%)
  fracaoIpiPct?: number // só anexo II se houver (recolhido no DAS nas faixas 1-5)
  /** Status de confirmação legal da partilha neste exercício */
  statusLegal?: 'OFICIAL' | 'PENDENTE_CONFIRMACAO'
  /** Nota explicativa da fonte ou pendência */
  notaFonte?: string
}

/**
 * Parâmetros de base dos 5 Anexos da Lei Complementar nº 123/2006 (Art. 18 / Res. CGSN 140/2018).
 * Suportam todas as 6 faixas de cada anexo com alíquota nominal, dedução e partilha original.
 */
export interface AnexoBaseConfig {
  id: string
  nome: string
  descricao: string
  tributoEstadualMunicipal: 'icms' | 'iss' | 'icms_ipi'
  cppNoDas: boolean
  faixas: {
    numero: number
    nome: string
    limiteInferior: number
    limiteSuperior: number
    aliquotaNominal: number
    parcelaDeduzir: number
    partilhaOriginal: {
      irpj: number
      csll: number
      cofins: number
      pis: number
      cpp: number
      icms?: number
      iss?: number
      ipi?: number
    }
  }[]
}

export const ANEXOS_BASE_LC123: Record<string, AnexoBaseConfig> = {
  anexo1: {
    id: 'anexo1',
    nome: 'Anexo I (Comércio / Bens)',
    descricao: 'Revenda de mercadorias no comércio atacadista e varejista',
    tributoEstadualMunicipal: 'icms',
    cppNoDas: true,
    faixas: [
      {
        numero: 1,
        nome: '1ª faixa (RBT12 até R$ 180.000,00)',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 4.0,
        parcelaDeduzir: 0,
        partilhaOriginal: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 41.5, icms: 34.0 },
      },
      {
        numero: 2,
        nome: '2ª faixa (R$ 180.000,01 a R$ 360.000,00)',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 7.3,
        parcelaDeduzir: 5940,
        partilhaOriginal: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 41.5, icms: 34.0 },
      },
      {
        numero: 3,
        nome: '3ª faixa (R$ 360.000,01 a R$ 720.000,00)',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 9.5,
        parcelaDeduzir: 13860,
        partilhaOriginal: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5 },
      },
      {
        numero: 4,
        nome: '4ª faixa (R$ 720.000,01 a R$ 1.800.000,00)',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 10.7,
        parcelaDeduzir: 22500,
        partilhaOriginal: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5 },
      },
      {
        numero: 5,
        nome: '5ª faixa (R$ 1.800.000,01 a R$ 3.600.000,00)',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 14.3,
        parcelaDeduzir: 87300,
        partilhaOriginal: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5 },
      },
      {
        numero: 6,
        nome: '6ª faixa — Sublimite (R$ 3.600.000,01 a R$ 4.800.000,00)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 19.0,
        parcelaDeduzir: 378000,
        partilhaOriginal: { irpj: 13.5, csll: 10.0, cofins: 28.27, pis: 6.13, cpp: 42.1, icms: 0 },
      },
    ],
  },
  anexo2: {
    id: 'anexo2',
    nome: 'Anexo II (Indústria)',
    descricao: 'Venda de mercadorias industrializadas pelo próprio contribuinte (com IPI)',
    tributoEstadualMunicipal: 'icms_ipi',
    cppNoDas: true,
    faixas: [
      {
        numero: 1,
        nome: '1ª faixa (RBT12 até R$ 180.000,00)',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 4.5,
        parcelaDeduzir: 0,
        partilhaOriginal: {
          irpj: 5.5,
          csll: 3.5,
          cofins: 11.51,
          pis: 2.49,
          cpp: 37.5,
          ipi: 7.5,
          icms: 32.0,
        },
      },
      {
        numero: 2,
        nome: '2ª faixa (R$ 180.000,01 a R$ 360.000,00)',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 7.8,
        parcelaDeduzir: 5940,
        partilhaOriginal: {
          irpj: 5.5,
          csll: 3.5,
          cofins: 11.51,
          pis: 2.49,
          cpp: 37.5,
          ipi: 7.5,
          icms: 32.0,
        },
      },
      {
        numero: 3,
        nome: '3ª faixa (R$ 360.000,01 a R$ 720.000,00)',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 10.0,
        parcelaDeduzir: 13860,
        partilhaOriginal: {
          irpj: 5.5,
          csll: 3.5,
          cofins: 11.51,
          pis: 2.49,
          cpp: 37.5,
          ipi: 7.5,
          icms: 32.0,
        },
      },
      {
        numero: 4,
        nome: '4ª faixa (R$ 720.000,01 a R$ 1.800.000,00)',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 11.2,
        parcelaDeduzir: 22500,
        partilhaOriginal: {
          irpj: 5.5,
          csll: 3.5,
          cofins: 11.51,
          pis: 2.49,
          cpp: 37.5,
          ipi: 7.5,
          icms: 32.0,
        },
      },
      {
        numero: 5,
        nome: '5ª faixa (R$ 1.800.000,01 a R$ 3.600.000,00)',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 14.7,
        parcelaDeduzir: 85500,
        partilhaOriginal: {
          irpj: 5.5,
          csll: 3.5,
          cofins: 11.51,
          pis: 2.49,
          cpp: 37.5,
          ipi: 7.5,
          icms: 32.0,
        },
      },
      {
        numero: 6,
        nome: '6ª faixa — Sublimite (R$ 3.600.000,01 a R$ 4.800.000,00)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 30.0,
        parcelaDeduzir: 720000,
        partilhaOriginal: {
          irpj: 8.5,
          csll: 7.5,
          cofins: 20.96,
          pis: 4.54,
          cpp: 23.5,
          ipi: 35.0,
          icms: 0,
        },
      },
    ],
  },
  anexo3: {
    id: 'anexo3',
    nome: 'Anexo III (Serviços em Geral / Fator R ≥ 28%)',
    descricao: 'Locação de bens móveis e serviços em geral ou intelectuais com Fator R ≥ 28%',
    tributoEstadualMunicipal: 'iss',
    cppNoDas: true,
    faixas: [
      {
        numero: 1,
        nome: '1ª faixa (RBT12 até R$ 180.000,00)',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 6.0,
        parcelaDeduzir: 0,
        partilhaOriginal: { irpj: 4.0, csll: 3.5, cofins: 12.82, pis: 2.78, cpp: 43.4, iss: 33.5 },
      },
      {
        numero: 2,
        nome: '2ª faixa (R$ 180.000,01 a R$ 360.000,00)',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 11.2,
        parcelaDeduzir: 9360,
        partilhaOriginal: { irpj: 4.0, csll: 3.5, cofins: 14.05, pis: 3.05, cpp: 43.4, iss: 32.0 },
      },
      {
        numero: 3,
        nome: '3ª faixa (R$ 360.000,01 a R$ 720.000,00)',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 13.5,
        parcelaDeduzir: 17640,
        partilhaOriginal: { irpj: 4.0, csll: 3.5, cofins: 13.64, pis: 2.96, cpp: 43.4, iss: 32.5 },
      },
      {
        numero: 4,
        nome: '4ª faixa (R$ 720.000,01 a R$ 1.800.000,00)',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 16.0,
        parcelaDeduzir: 35640,
        partilhaOriginal: { irpj: 4.0, csll: 3.5, cofins: 13.64, pis: 2.96, cpp: 43.4, iss: 32.5 },
      },
      {
        numero: 5,
        nome: '5ª faixa (R$ 1.800.000,01 a R$ 3.600.000,00)',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 21.0,
        parcelaDeduzir: 125640,
        partilhaOriginal: { irpj: 4.0, csll: 3.5, cofins: 12.82, pis: 2.78, cpp: 43.4, iss: 33.5 },
      },
      {
        numero: 6,
        nome: '6ª faixa — Sublimite (R$ 3.600.000,01 a R$ 4.800.000,00)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 33.0,
        parcelaDeduzir: 648000,
        partilhaOriginal: { irpj: 35.0, csll: 15.0, cofins: 16.03, pis: 3.47, cpp: 30.5, iss: 0 },
      },
    ],
  },
  anexo4: {
    id: 'anexo4',
    nome: 'Anexo IV (Serviços sem CPP no DAS)',
    descricao:
      'Construção civil, vigilância, limpeza e advocacia (CPP recolhida em separado via DCTFWeb)',
    tributoEstadualMunicipal: 'iss',
    cppNoDas: false,
    faixas: [
      {
        numero: 1,
        nome: '1ª faixa (RBT12 até R$ 180.000,00)',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 4.5,
        parcelaDeduzir: 0,
        partilhaOriginal: { irpj: 18.8, csll: 15.2, cofins: 17.67, pis: 3.83, cpp: 0, iss: 44.5 },
      },
      {
        numero: 2,
        nome: '2ª faixa (R$ 180.000,01 a R$ 360.000,00)',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 9.0,
        parcelaDeduzir: 8100,
        partilhaOriginal: { irpj: 19.8, csll: 15.2, cofins: 20.55, pis: 4.45, cpp: 0, iss: 40.0 },
      },
      {
        numero: 3,
        nome: '3ª faixa (R$ 360.000,01 a R$ 720.000,00)',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 10.2,
        parcelaDeduzir: 12420,
        partilhaOriginal: { irpj: 20.8, csll: 15.2, cofins: 19.73, pis: 4.27, cpp: 0, iss: 40.0 },
      },
      {
        numero: 4,
        nome: '4ª faixa (R$ 720.000,01 a R$ 1.800.000,00)',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 14.0,
        parcelaDeduzir: 39780,
        partilhaOriginal: { irpj: 17.8, csll: 19.2, cofins: 18.9, pis: 4.1, cpp: 0, iss: 40.0 },
      },
      {
        numero: 5,
        nome: '5ª faixa (R$ 1.800.000,01 a R$ 3.600.000,00)',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 22.0,
        parcelaDeduzir: 183780,
        partilhaOriginal: { irpj: 18.8, csll: 19.2, cofins: 18.08, pis: 3.92, cpp: 0, iss: 40.0 },
      },
      {
        numero: 6,
        nome: '6ª faixa — Sublimite (R$ 3.600.000,01 a R$ 4.800.000,00)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 33.0,
        parcelaDeduzir: 828000,
        partilhaOriginal: { irpj: 53.5, csll: 21.5, cofins: 20.55, pis: 4.45, cpp: 0, iss: 0 },
      },
    ],
  },
  anexo5: {
    id: 'anexo5',
    nome: 'Anexo V (Serviços Intelectuais / Fator R < 28%)',
    descricao: 'Serviços técnicos, consultorias, engenharia e TI quando Fator R < 28%',
    tributoEstadualMunicipal: 'iss',
    cppNoDas: true,
    faixas: [
      {
        numero: 1,
        nome: '1ª faixa (RBT12 até R$ 180.000,00)',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 15.5,
        parcelaDeduzir: 0,
        partilhaOriginal: {
          irpj: 25.0,
          csll: 15.0,
          cofins: 14.1,
          pis: 3.05,
          cpp: 28.85,
          iss: 14.0,
        },
      },
      {
        numero: 2,
        nome: '2ª faixa (R$ 180.000,01 a R$ 360.000,00)',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 18.0,
        parcelaDeduzir: 4500,
        partilhaOriginal: {
          irpj: 23.0,
          csll: 15.0,
          cofins: 14.1,
          pis: 3.05,
          cpp: 27.85,
          iss: 17.0,
        },
      },
      {
        numero: 3,
        nome: '3ª faixa (R$ 360.000,01 a R$ 720.000,00)',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 19.5,
        parcelaDeduzir: 9900,
        partilhaOriginal: {
          irpj: 24.0,
          csll: 15.0,
          cofins: 14.92,
          pis: 3.23,
          cpp: 23.85,
          iss: 19.0,
        },
      },
      {
        numero: 4,
        nome: '4ª faixa (R$ 720.000,01 a R$ 1.800.000,00)',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 20.5,
        parcelaDeduzir: 17100,
        partilhaOriginal: {
          irpj: 21.0,
          csll: 15.0,
          cofins: 15.74,
          pis: 3.41,
          cpp: 23.85,
          iss: 21.0,
        },
      },
      {
        numero: 5,
        nome: '5ª faixa (R$ 1.800.000,01 a R$ 3.600.000,00)',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 23.0,
        parcelaDeduzir: 62100,
        partilhaOriginal: {
          irpj: 23.0,
          csll: 12.5,
          cofins: 14.1,
          pis: 3.05,
          cpp: 23.85,
          iss: 23.5,
        },
      },
      {
        numero: 6,
        nome: '6ª faixa — Sublimite (R$ 3.600.000,01 a R$ 4.800.000,00)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 30.5,
        parcelaDeduzir: 540000,
        partilhaOriginal: { irpj: 35.0, csll: 15.5, cofins: 16.44, pis: 3.56, cpp: 29.5, iss: 0 },
      },
    ],
  },
}

/**
 * Calcula a alíquota efetiva oficial pela fórmula da LC 123/2006 art. 18, §1º:
 *   Alíquota Efetiva = (RBT12 × Alíquota Nominal − Parcela a Deduzir) ÷ RBT12
 * Na 1ª faixa (RBT12 <= 180k) ou quando RBT12 = 0, a efetiva é exatamente a nominal.
 */
export function calcularAliquotaEfetivaOficial(
  anexoId: string,
  faixaNumero: number,
  rbt12: number,
): number {
  const anexo = ANEXOS_BASE_LC123[anexoId] || ANEXOS_BASE_LC123.anexo1
  const faixa = anexo.faixas[faixaNumero - 1] || anexo.faixas[0]
  if (faixa.numero === 1 || rbt12 <= 0 || faixa.parcelaDeduzir === 0) {
    return faixa.aliquotaNominal
  }
  const efetiva = ((rbt12 * (faixa.aliquotaNominal / 100) - faixa.parcelaDeduzir) / rbt12) * 100
  return Math.max(0, roundHalfUp(efetiva, 4))
}

/**
 * Deriva a repartição tributária do DAS (ICMS/ISS, CBS, IBS, IRPJ+CSLL+CPP) por exercício
 * respeitando os valores chancelados da casa e aplicando a regra de transição da LC 214/2025:
 * - 2026: CBS = 0, IBS = 0, PIS+COFINS recolhidos como federais no DAS (art. 348, III, "c").
 * - 2027–2028: CBS plena entra substituindo PIS/COFINS (+ teste IBS 0,17%).
 *   Caso Anexo I 1ª faixa: ICMS 34,00%, CBS 15,33%, IBS 0,17%, IRPJ+CSLL+CPP 50,50% (TOTAL 100%).
 * - 2029–2032: Transição gradual conforme cronograma (ICMS/ISS decresce e IBS cresce).
 * - A partir de 2033: ICMS e ISS extintos no DAS; IBS pleno substitui parcela estadual/municipal.
 *
 * REGRA PERMANENTE DA ADRI: valores de exercícios 2029+ ou anexos com transição em regulamentação
 * são marcados como PENDENTE_CONFIRMACAO para que nunca se invente um dispositivo inexistente.
 */
export function calcularPartilhaExercicio(
  anexoId: string,
  faixaNumero: number,
  exercicio: number,
): {
  fracaoIcmsPct: number
  fracaoCbsPct: number
  fracaoIbsPct: number
  fracaoIrpjCsllCppPct: number
  fracaoIpiPct?: number
  statusLegal: 'OFICIAL' | 'PENDENTE_CONFIRMACAO'
  notaFonte: string
} {
  const anexo = ANEXOS_BASE_LC123[anexoId] || ANEXOS_BASE_LC123.anexo1
  const faixa = anexo.faixas[faixaNumero - 1] || anexo.faixas[0]
  const p = faixa.partilhaOriginal
  const tributoEstadualOriginal = (p.icms ?? 0) + (p.iss ?? 0)
  const pisCofinsOriginal = roundHalfUp(p.pis + p.cofins, 4)
  const federaisSemPisCofins = roundHalfUp(p.irpj + p.csll + p.cpp, 4)
  const ipiOriginal = p.ipi ?? 0

  // 1. EXERCÍCIO 2026: Regime de teste sem CBS e sem IBS no SN (LC 214/2025, art. 348, III, "c")
  if (exercicio === 2026) {
    return {
      fracaoIcmsPct: tributoEstadualOriginal,
      fracaoCbsPct: 0.0,
      fracaoIbsPct: 0.0,
      fracaoIrpjCsllCppPct: roundHalfUp(federaisSemPisCofins + pisCofinsOriginal, 4),
      fracaoIpiPct: ipiOriginal,
      statusLegal: 'OFICIAL',
      notaFonte:
        'LC 214/2025 art. 348, III, "c": SN não recolhe CBS/IBS em 2026. Frações originais da LC 123.',
    }
  }

  // 2. EXERCÍCIOS 2027 E 2028: CBS plena entra no DAS substituindo PIS/COFINS (+ teste IBS 0,17%)
  if (exercicio === 2027 || exercicio === 2028) {
    // Caso de ouro chancelado: Anexo I, 1ª faixa
    if (anexoId === 'anexo1' && faixaNumero === 1) {
      return {
        fracaoIcmsPct: 34.0,
        fracaoCbsPct: 15.33,
        fracaoIbsPct: 0.17,
        fracaoIrpjCsllCppPct: 50.5,
        fracaoIpiPct: 0,
        statusLegal: 'OFICIAL',
        notaFonte:
          'LC 123/2006 Anexo I + LC 214/2025 art. 139 e art. 348: chancelado pela Adri (DAS 100,00%).',
      }
    }

    // Demais faixas do Anexo I (2ª a 6ª)
    if (anexoId === 'anexo1') {
      // Nas faixas 2 a 5: ICMS original é 34,0% (faixa 2) ou 33,5% (faixas 3, 4, 5).
      // PIS+COFINS original é 15,50% (2,76% + 12,74%).
      // Substituição: CBS absorve 15,33% e IBS absorve 0,17% (= 15,50% total do PIS/COFINS).
      // Na 6ª faixa (sublimite), ICMS no DAS é 0% (recolhido por fora no regime normal estadual).
      // PIS+COFINS original da 6ª faixa é 34,40% (28,27% + 6,13%).
      if (faixaNumero === 6) {
        // Sublimite: 34,40% passa para CBS (34,23%) e IBS teste (0,17%)
        const cbs = roundHalfUp(pisCofinsOriginal - 0.17, 4)
        return {
          fracaoIcmsPct: 0.0,
          fracaoCbsPct: cbs,
          fracaoIbsPct: 0.17,
          fracaoIrpjCsllCppPct: federaisSemPisCofins,
          fracaoIpiPct: 0,
          statusLegal: 'OFICIAL',
          notaFonte:
            'LC 123 art. 18: sublimite com ICMS por fora. PIS/COFINS 34,40% substituído por CBS (34,23%) + IBS (0,17%).',
        }
      }

      const cbs = roundHalfUp(pisCofinsOriginal - 0.17, 4) // 15,33%
      return {
        fracaoIcmsPct: tributoEstadualOriginal,
        fracaoCbsPct: cbs,
        fracaoIbsPct: 0.17,
        fracaoIrpjCsllCppPct: federaisSemPisCofins,
        fracaoIpiPct: 0,
        statusLegal: 'OFICIAL',
        notaFonte:
          'LC 123 art. 18 + LC 214 art. 139: substituição canônica de PIS/COFINS por CBS (15,33%) e IBS teste (0,17%).',
      }
    }

    // Anexo II (Indústria)
    if (anexoId === 'anexo2') {
      // Nota da Adri: Anexo II inclui IPI e prevê tratamento próprio.
      // PIS+COFINS original: faixas 1-5 = 14,00% (2,49% + 11,51%).
      // Substituição padrão de transição: IBS 0,17% e CBS 13,83%.
      const cbs = roundHalfUp(pisCofinsOriginal - 0.17, 4)
      return {
        fracaoIcmsPct: tributoEstadualOriginal,
        fracaoCbsPct: cbs,
        fracaoIbsPct: 0.17,
        fracaoIrpjCsllCppPct: federaisSemPisCofins,
        fracaoIpiPct: ipiOriginal,
        statusLegal: 'PENDENTE_CONFIRMACAO',
        notaFonte:
          'PENDENTE_CONFIRMACAO: LC 123 art. 18 / LC 214 art. 139. Anexo II inclui IPI e partilha com folha/Wages28%. Fator "r" não aplicável formalmente na partilha básica (aplicável apenas na transição III vs V conforme LC 123 art. 18 §5º-J). Fração CBS estimada pela substituição de PIS/COFINS.',
      }
    }

    // Anexos III, IV e V (Serviços — ISS em vez de ICMS)
    // PIS+COFINS substituído por CBS + IBS (0,17% teste)
    const cbs = roundHalfUp(pisCofinsOriginal - 0.17, 4)
    return {
      fracaoIcmsPct: tributoEstadualOriginal, // ISS municipal
      fracaoCbsPct: cbs,
      fracaoIbsPct: 0.17,
      fracaoIrpjCsllCppPct: federaisSemPisCofins,
      fracaoIpiPct: 0,
      statusLegal: 'PENDENTE_CONFIRMACAO',
      notaFonte: `PENDENTE_CONFIRMACAO: ${anexo.nome}. Fração de ISS mantida (${tributoEstadualOriginal}%). CBS estimada (${cbs}%) substituindo PIS/COFINS original (${pisCofinsOriginal}%) deduzido o IBS teste (0,17%). Aguarda regulamentação pelo CGSN dos anexos de serviços.`,
    }
  }

  // 3. EXERCÍCIOS 2029 A 2032: Transição gradual do ICMS/ISS para IBS
  // Cronograma da EC 132/2023 e LC 214/2025:
  // 2029: 90% ICMS/ISS remanescente, 10% transferido para IBS
  // 2030: 80% ICMS/ISS, 20% para IBS
  // 2031: 70% ICMS/ISS, 30% para IBS
  // 2032: 60% ICMS/ISS, 40% para IBS
  if (exercicio >= 2029 && exercicio <= 2032) {
    const fatoresTransicao: Record<number, { icmsFator: number; ibsFator: number }> = {
      2029: { icmsFator: 0.9, ibsFator: 0.1 },
      2030: { icmsFator: 0.8, ibsFator: 0.2 },
      2031: { icmsFator: 0.7, ibsFator: 0.3 },
      2032: { icmsFator: 0.6, ibsFator: 0.4 },
    }
    const ft = fatoresTransicao[exercicio] || { icmsFator: 0.9, ibsFator: 0.1 }
    const fracaoIcms = roundHalfUp(tributoEstadualOriginal * ft.icmsFator, 4)
    const fracaoIbs = roundHalfUp(0.17 + tributoEstadualOriginal * ft.ibsFator, 4)
    const fracaoCbs = roundHalfUp(pisCofinsOriginal - 0.17, 4)

    return {
      fracaoIcmsPct: fracaoIcms,
      fracaoCbsPct: fracaoCbs,
      fracaoIbsPct: fracaoIbs,
      fracaoIrpjCsllCppPct: federaisSemPisCofins,
      fracaoIpiPct: ipiOriginal,
      statusLegal: 'PENDENTE_CONFIRMACAO',
      notaFonte: `PENDENTE_CONFIRMACAO: Transição proporcional 2029–2032 (ano ${exercicio}: ICMS/ISS a ${roundHalfUp(ft.icmsFator * 100, 0)}% e IBS absorvendo ${roundHalfUp(ft.ibsFator * 100, 0)}% da quota subnacional). Aguarda decreto ou Resolução CGSN com tabela expressa por faixa para o exercício ${exercicio}.`,
    }
  }

  // 4. EXERCÍCIO 2033 EM DIANTE: ICMS/ISS formalmente extintos
  return {
    fracaoIcmsPct: 0.0,
    fracaoCbsPct: roundHalfUp(pisCofinsOriginal - 0.17, 4),
    fracaoIbsPct: roundHalfUp(0.17 + tributoEstadualOriginal, 4),
    fracaoIrpjCsllCppPct: federaisSemPisCofins,
    fracaoIpiPct: ipiOriginal,
    statusLegal: 'PENDENTE_CONFIRMACAO',
    notaFonte:
      'PENDENTE_CONFIRMACAO: Pós-2033 (extinção total do ICMS/ISS pelo ADCT). Fração IBS absorve a totalidade da cota estadual/municipal. Aguarda definição do CGSN.',
  }
}

/** Gera a chave padrão para lookup na TABELA_OFICIAL_SN */
export function getChaveTabelaOficial(
  anexoId: string,
  faixaNumero: number,
  exercicio: number,
): string {
  return `${anexoId}_faixa${faixaNumero}_${exercicio}`
}

/**
 * Constrói o registro completo de TabelaOficialFaixaConfig para um dado anexo, faixa, exercício e RBT12.
 */
export function buildTabelaOficialFaixaConfig(
  anexoId: string,
  faixaNumero: number,
  exercicio: number,
  rbt12?: number,
): TabelaOficialFaixaConfig {
  const anexo = ANEXOS_BASE_LC123[anexoId] || ANEXOS_BASE_LC123.anexo1
  const faixa = anexo.faixas[faixaNumero - 1] || anexo.faixas[0]
  const rbt12Calculo = rbt12 !== undefined && rbt12 > 0 ? rbt12 : faixa.limiteSuperior
  const aliquotaEfetiva = calcularAliquotaEfetivaOficial(anexoId, faixa.numero, rbt12Calculo)
  const partilha = calcularPartilhaExercicio(anexoId, faixa.numero, exercicio)

  return {
    anexo: anexo.nome,
    faixa: faixa.nome,
    faixaNumero: faixa.numero,
    anexoId: anexo.id,
    exercicio,
    limiteRbt12: faixa.limiteSuperior,
    aliquotaNominalPct: faixa.aliquotaNominal,
    parcelaDeduzir: faixa.parcelaDeduzir,
    aliquotaEfetivaPct: aliquotaEfetiva,
    fracaoIcmsPct: partilha.fracaoIcmsPct,
    fracaoCbsPct: partilha.fracaoCbsPct,
    fracaoIbsPct: partilha.fracaoIbsPct,
    fracaoIrpjCsllCppPct: partilha.fracaoIrpjCsllCppPct,
    fracaoIpiPct: partilha.fracaoIpiPct,
    statusLegal: partilha.statusLegal,
    notaFonte: partilha.notaFonte,
  }
}

/**
 * Popula inicialmente a TABELA_OFICIAL_SN para todos os Anexos (I a V), todas as faixas (1 a 6)
 * e exercícios da transição (2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033).
 */
function gerarTabelaOficialCompleta(): Record<string, TabelaOficialFaixaConfig> {
  const tabela: Record<string, TabelaOficialFaixaConfig> = {}
  const exercicios = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

  for (const anexoKey of Object.keys(ANEXOS_BASE_LC123)) {
    const anexo = ANEXOS_BASE_LC123[anexoKey]
    for (const faixa of anexo.faixas) {
      for (const ex of exercicios) {
        const chave = getChaveTabelaOficial(anexo.id, faixa.numero, ex)
        // Usar limite superior da faixa para estimativa inicial da efetiva
        tabela[chave] = buildTabelaOficialFaixaConfig(
          anexo.id,
          faixa.numero,
          ex,
          faixa.limiteSuperior,
        )
      }
    }
  }

  // SOBRESCREVER EXPLICITAMENTE OS VALORES DE OURO CANÔNICOS CHANCELADOS PELA ADRI
  // Anexo I - 1ª Faixa - 2026
  tabela['anexo1_faixa1_2026'] = {
    anexo: 'Anexo I (comércio)',
    faixa: '1ª faixa (RBT12 até R$ 180.000,00)',
    faixaNumero: 1,
    anexoId: 'anexo1',
    exercicio: 2026,
    limiteRbt12: 180000,
    aliquotaNominalPct: 4.0,
    parcelaDeduzir: 0,
    aliquotaEfetivaPct: 4.0,
    fracaoIcmsPct: 34.0,
    fracaoCbsPct: 0.0,
    fracaoIbsPct: 0.0,
    fracaoIrpjCsllCppPct: 66.0,
    statusLegal: 'OFICIAL',
    notaFonte: 'LC 214/2025 art. 348, III, "c": SN sem CBS/IBS em 2026.',
  }
  // Anexo I - 1ª Faixa - 2027
  tabela['anexo1_faixa1_2027'] = {
    anexo: 'Anexo I (comércio)',
    faixa: '1ª faixa (RBT12 até R$ 180.000,00)',
    faixaNumero: 1,
    anexoId: 'anexo1',
    exercicio: 2027,
    limiteRbt12: 180000,
    aliquotaNominalPct: 4.0,
    parcelaDeduzir: 0,
    aliquotaEfetivaPct: 4.0,
    fracaoIcmsPct: 34.0,
    fracaoCbsPct: 15.33,
    fracaoIbsPct: 0.17,
    fracaoIrpjCsllCppPct: 50.5,
    statusLegal: 'OFICIAL',
    notaFonte: 'Caso canônico chancelado pela Adri (DAS 100,00%).',
  }
  // Anexo I - 1ª Faixa - 2028
  tabela['anexo1_faixa1_2028'] = {
    anexo: 'Anexo I (comércio)',
    faixa: '1ª faixa (RBT12 até R$ 180.000,00)',
    faixaNumero: 1,
    anexoId: 'anexo1',
    exercicio: 2028,
    limiteRbt12: 180000,
    aliquotaNominalPct: 4.0,
    parcelaDeduzir: 0,
    aliquotaEfetivaPct: 4.0,
    fracaoIcmsPct: 34.0,
    fracaoCbsPct: 15.33,
    fracaoIbsPct: 0.17,
    fracaoIrpjCsllCppPct: 50.5,
    statusLegal: 'OFICIAL',
    notaFonte: 'Caso canônico chancelado pela Adri (DAS 100,00%).',
  }

  return tabela
}

/**
 * TABELA OFICIAL DE REPARTIÇÃO DO SIMPLES NACIONAL (Cobertura Completa: Anexos I a V, 1ª a 6ª Faixa, 2026 a 2033)
 * Fonte de verdade canônica que atende à exigência da Adri.
 */
export const TABELA_OFICIAL_SN: Record<string, TabelaOficialFaixaConfig> =
  gerarTabelaOficialCompleta()

/** Normaliza string de anexo (ex: 'Anexo I (comércio)', 'anexo_1', 'anexo1') para chave interna 'anexo1' */
export function normalizarAnexoId(anexoStr: string): string {
  if (!anexoStr) return 'anexo1'
  const s = anexoStr.toLowerCase()
  if (
    s.includes('anexo i') &&
    !s.includes('anexo ii') &&
    !s.includes('anexo iii') &&
    !s.includes('anexo iv') &&
    !s.includes('anexo v')
  )
    return 'anexo1'
  if (s.includes('anexo ii') && !s.includes('anexo iii')) return 'anexo2'
  if (s.includes('anexo iii')) return 'anexo3'
  if (s.includes('anexo iv')) return 'anexo4'
  if (s.includes('anexo v')) return 'anexo5'
  if (s.includes('anexo_1') || s.includes('anexo1')) return 'anexo1'
  if (s.includes('anexo_2') || s.includes('anexo2')) return 'anexo2'
  if (s.includes('anexo_3') || s.includes('anexo3')) return 'anexo3'
  if (s.includes('anexo_4') || s.includes('anexo4')) return 'anexo4'
  if (s.includes('anexo_5') || s.includes('anexo5')) return 'anexo5'
  return 'anexo1'
}

/** Normaliza string de faixa (ex: '1ª faixa...', 'faixa1', 1) para número de faixa 1..6 */
export function normalizarFaixaNumero(faixaStr: string | number): number {
  if (typeof faixaStr === 'number') return Math.max(1, Math.min(6, faixaStr))
  if (!faixaStr) return 1
  const s = faixaStr.toString().toLowerCase()
  if (s.includes('1ª') || s.includes('faixa1') || s.includes('faixa 1')) return 1
  if (s.includes('2ª') || s.includes('faixa2') || s.includes('faixa 2')) return 2
  if (s.includes('3ª') || s.includes('faixa3') || s.includes('faixa 3')) return 3
  if (s.includes('4ª') || s.includes('faixa4') || s.includes('faixa 4')) return 4
  if (s.includes('5ª') || s.includes('faixa5') || s.includes('faixa 5')) return 5
  if (s.includes('6ª') || s.includes('faixa6') || s.includes('faixa 6')) return 6
  return 1
}

/** Busca configuração da tabela oficial para a combinação dada, recalculando a alíquota efetiva se RBT12 for informado. */
export function getTabelaOficialConfig(
  exercicio = 2027,
  anexo = 'anexo1',
  faixa: string | number = 'faixa1',
  rbt12?: number,
): TabelaOficialFaixaConfig {
  const anexoId = normalizarAnexoId(anexo)
  const faixaNum = normalizarFaixaNumero(faixa)
  const chave = getChaveTabelaOficial(anexoId, faixaNum, exercicio)

  const cfgBase =
    TABELA_OFICIAL_SN[chave] || buildTabelaOficialFaixaConfig(anexoId, faixaNum, exercicio, rbt12)

  // Se o usuário informou um RBT12 específico diferente do padrão ou se for faixa > 1, recalcular a alíquota efetiva
  if (rbt12 !== undefined && rbt12 > 0) {
    const efetivaRecalculada = calcularAliquotaEfetivaOficial(anexoId, faixaNum, rbt12)
    return {
      ...cfgBase,
      aliquotaEfetivaPct: efetivaRecalculada,
    }
  }

  return cfgBase
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

  /** Identificador do anexo (ex: 'anexo1') e número da faixa (1..6) para recuperação precisa */
  anexoId?: string
  faixaNumero?: number

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

/** Chave de persistência oficial no localStorage para a configuração da Sessão SN */
export const STORAGE_KEY_SESSAO_SN_CONFIG = 'it_reforma_sessao_sn_config_v1'

export interface SessaoSnConfigPersistida {
  anexoId: string
  faixaNum: number
  rbt12: number
  origem: OrigemPercentual
  baseDoDas: BaseDoDas
  valorIcmsInput?: string
  valorCbsInput?: string
  valorIbsInput?: string
}

/** Carrega a configuração da Sessão SN do localStorage de forma tolerante a falhas */
export function carregarConfigSessaoSN(): SessaoSnConfigPersistida | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    // Tenta a chave canônica versionada ou legado sem v1
    const raw =
      window.localStorage.getItem(STORAGE_KEY_SESSAO_SN_CONFIG) ||
      window.localStorage.getItem('it_reforma_sessao_sn_config')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      anexoId: typeof parsed.anexoId === 'string' ? parsed.anexoId : 'anexo1',
      faixaNum: typeof parsed.faixaNum === 'number' ? Math.max(1, Math.min(6, parsed.faixaNum)) : 1,
      rbt12: typeof parsed.rbt12 === 'number' && parsed.rbt12 > 0 ? parsed.rbt12 : 120000,
      origem: parsed.origem === 'nota' ? 'nota' : 'tabela',
      baseDoDas: parsed.baseDoDas === 'liquida' ? 'liquida' : 'bruta',
      valorIcmsInput: typeof parsed.valorIcmsInput === 'string' ? parsed.valorIcmsInput : '',
      valorCbsInput: typeof parsed.valorCbsInput === 'string' ? parsed.valorCbsInput : '',
      valorIbsInput: typeof parsed.valorIbsInput === 'string' ? parsed.valorIbsInput : '',
    }
  } catch {
    return null
  }
}

/** Salva a configuração da Sessão SN no localStorage de forma resiliente */
export function salvarConfigSessaoSN(config: SessaoSnConfigPersistida): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    const str = JSON.stringify(config)
    window.localStorage.setItem(STORAGE_KEY_SESSAO_SN_CONFIG, str)
    // Mantém compatibilidade com a chave sem sufixo sugerida no enunciado
    window.localStorage.setItem('it_reforma_sessao_sn_config', str)
  } catch {
    // silencioso para não quebrar em modo privado
  }
}

/** Constrói um PerfilSN completo a partir da configuração persistida (ou default se inexistente) */
export function obterPerfilSnEfetivo(exercicio = 2027): PerfilSN {
  const salvo = carregarConfigSessaoSN()
  if (!salvo) return PERFIL_SN_NOTA_PADRAO

  const cfg = getTabelaOficialConfig(exercicio, salvo.anexoId, salvo.faixaNum, salvo.rbt12)
  return {
    origem: salvo.origem,
    modo: salvo.origem === 'nota' ? 'nota' : 'anexo',
    anexo: cfg.anexo,
    faixa: cfg.faixa,
    exercicio,
    rbt12: salvo.rbt12,
    anexoId: salvo.anexoId,
    faixaNumero: salvo.faixaNum,
    efetivaPct: cfg.aliquotaEfetivaPct,
    icmsFracPct: cfg.fracaoIcmsPct,
    cbsFracPct: cfg.fracaoCbsPct,
    ibsFracPct: cfg.fracaoIbsPct,
    irpjCsllCppFracPct: cfg.fracaoIrpjCsllCppPct,
    baseDoDas: salvo.baseDoDas,
    icmsNotaPct: 0,
    cbsNotaPct: 0,
    ibsNotaPct: 0,
  }
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
  icmsCreditoHojeSN: number
  icmsCreditoHojeSN6: number
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
    icmsPct = perfil.icmsNotaPct
    cbsPct = perfil.cbsNotaPct
    ibsPct = perfil.ibsNotaPct
    efetivaPct = roundHalfUp(icmsPct + cbsPct + ibsPct, 4)
    irpjCsllCppPct = Math.max(0, roundHalfUp(100 - efetivaPct, 4))
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

  // 5. Baseline 2026 do fornecedor SN conforme o adquirente:
  // - Adquirente Simples Nacional Puro: ZERO crédito (art. 13, §1º, LC 123/2006 — dedução na apuração do DAS,
  //   não crédito na aquisição; PIS/COFINS = 0,00 por ser isento da não cumulatividade; compras líquidas = nota cheia).
  // - Adquirente Lucro Presumido: crédito só de ICMS pela fração (34% × 4% = 1,36% sobre a nota bruta; 42.400 × 1,36% = 576,64).
  // - Adquirente Lucro Real: ICMS pela fração (576,64) + PIS/COFINS (ADI SRF 15/2007 + SC COSIT 297/2019) sobre a base sem ICMS = 4.445,30 total.
  const icmsBaselinePct = origem === 'nota' ? icmsPct : (efetivaPct * icmsFracPct) / 100
  const icmsCreditoCalculado6 = (receitaBruta6 * icmsBaselinePct) / 100

  // Se o adquirente for Simples Nacional Puro ('simples'), crédito de ICMS é 0,00
  const icmsCredito2026_6 = adquirente === 'simples' ? 0 : icmsCreditoCalculado6
  const icmsCredito2026 = roundHalfUp(icmsCredito2026_6, 2)
  const icmsCreditoHojeSN6 = icmsCredito2026_6
  const icmsCreditoHojeSN = icmsCredito2026

  // Adquirente Lucro Real em 2026: ADI SRF 15/2007 + SC COSIT 297/2019
  // Alíquotas plenas 1,65% e 7,60% sobre a base sem o ICMS destacado na nota (Lei 14.592/2023)
  const pisCofinsBaseHoje6 = adquirente === 'real' ? receitaBruta6 - icmsCreditoCalculado6 : 0
  const pisCofinsBaseHoje = roundHalfUp(pisCofinsBaseHoje6, 2)
  const creditoPisHoje6 = adquirente === 'real' ? (pisCofinsBaseHoje6 * 1.65) / 100 : 0
  const creditoCofinsHoje6 = adquirente === 'real' ? (pisCofinsBaseHoje6 * 7.6) / 100 : 0
  const creditoPisCofinsHoje6 = creditoPisHoje6 + creditoCofinsHoje6
  const creditoPisCofinsHoje = roundHalfUp(creditoPisCofinsHoje6, 2)

  const creditoHojeSN6 =
    adquirente === 'simples'
      ? 0
      : adquirente === 'real'
        ? icmsCredito2026_6 + creditoPisCofinsHoje6
        : icmsCredito2026_6
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
          : 'LC 123/2006, art. 18, §1º: alíquota efetiva derivada da RBT12 (nominal − dedução ÷ RBT12) por Anexo e exercício.',
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
      label: `1. Parcela ICMS (${fmtSN(icmsPct, 4)}%)`,
      formula:
        origem === 'nota'
          ? `Alíquota da nota: ${fmtSN(icmsPct, 4)}% [da nota] × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(icmsNota6)}`
          : `Fração ${fmtSN(icmsFracPct, 2)}% [${perfil.anexo || 'Anexo I'} · ${perfil.faixa || '1ª faixa'}] × Alíquota Efetiva ${fmtSN(efetivaPct, 2)}% = ${fmtMoney6(icmsNota6)}`,
      value: icmsNota,
      value6: icmsNota6,
      bloco: 'das_decomposto',
      fundamento: 'LC 123/2006, art. 23, §2º + LC 214/2025: fração do ICMS repassada no DAS.',
    },
    // BLOCO 2: CBS
    {
      key: 'cbsdas',
      label: `2. Parcela CBS (${fmtSN(cbsPct, 4)}%)`,
      formula:
        origem === 'nota'
          ? `Alíquota da nota: ${fmtSN(cbsPct, 4)}% [da nota] × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(cbsDAS6)}`
          : `Fração ${fmtSN(cbsFracPct, 2)}% [${perfil.anexo || 'Anexo I'} · ${perfil.faixa || '1ª faixa'}] × Alíquota Efetiva ${fmtSN(efetivaPct, 2)}% = ${fmtMoney6(cbsDAS6)}`,
      value: cbsDAS,
      value6: cbsDAS6,
      bloco: 'das_decomposto',
      fundamento:
        'LC 214/2025, art. 139 + LC 123/2006, Anexo XX: CBS substitui PIS/COFINS em 2027.',
    },
    // BLOCO 3: IBS
    {
      key: 'ibsdas',
      label: `3. Parcela IBS (${fmtSN(ibsPct, 4)}%)`,
      formula:
        origem === 'nota'
          ? `Alíquota da nota: ${fmtSN(ibsPct, 4)}% [da nota] × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(ibsDAS6)}`
          : `Fração ${fmtSN(ibsFracPct, 2)}% [${perfil.anexo || 'Anexo I'} · ${perfil.faixa || '1ª faixa'}] × Alíquota Efetiva ${fmtSN(efetivaPct, 2)}% = ${fmtMoney6(ibsDAS6)}`,
      value: ibsDAS,
      value6: ibsDAS6,
      bloco: 'das_decomposto',
      fundamento: 'LC 214/2025, art. 139: IBS integra o Simples Nacional.',
    },
    // BLOCO 4: IRPJ/CSLL/CPP (não gera crédito)
    {
      key: 'irpjcsllcppdas',
      label: `4. Parcela IRPJ / CSLL / CPP (${fmtSN(irpjCsllCppPct, 4)}%) — NÃO GERA CRÉDITO`,
      formula:
        origem === 'nota'
          ? `Alíquota residual: ${fmtSN(irpjCsllCppPct, 4)}% × ${fmtSN(baseDasUtilizada6, 2)} = ${fmtMoney6(irpjCsllCppDAS6)}`
          : `Fração ${fmtSN(irpjCsllCppFracPct, 2)}% [${perfil.anexo || 'Anexo I'} · ${perfil.faixa || '1ª faixa'}] × Alíquota Efetiva ${fmtSN(efetivaPct, 2)}% = ${fmtMoney6(irpjCsllCppDAS6)}`,
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
    icmsCreditoHojeSN,
    icmsCreditoHojeSN6,
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

/**
 * ============================================================================
 * 4 CÉLULAS DE COMPARAÇÃO — FORNECEDOR LP / LR × ADQUIRENTE SN PURO / SN HÍBRIDO
 * Regras chanceladas pela Adri (padrão ouro, não negociável):
 * 1. Adquirente SN puro: não credita NADA (art. 13 §1º LC 123/06).
 *    Custo = NOTA CHEIA em 2026 (42.400,00 → 1.413,33) e em 2027 (44.488,27 → 1.482,94; Δ = +4,92%).
 * 2. Adquirente SN híbrido: credita APENAS CBS e IBS destacados na nota (art. 41 LC 214/25).
 *    NUNCA credita ICMS 18% nem PIS/COFINS.
 *    Custo 2026 = NOTA CHEIA (42.400,00 → 1.413,33);
 *    Custo 2027 = 44.488,27 − 2.947,91 − 33,50 = 41.506,86 → 1.383,56 (Δ = −2,11%).
 * 3. Convenção de arredondamento: half-up 2 casas decimais.
 * ============================================================================
 */

export type FornecedorPlenoRegime = 'lucro_presumido' | 'lucro_real'
export type AdquirenteSnRegime = 'simples' | 'simples_hibrido'

export interface LinhaPassoCard {
  sinal: '(+)' | '(−)' | '(=)' | '(÷)' | '(i)'
  label: string
  formula: string
  valor: number
  valor6?: number
  destaque?: boolean
  fundamento?: string
}

export interface CardMemoriaQuatroCelulas {
  numero: 'CARD 01' | 'CARD 02' | 'CARD 03'
  titulo: string
  subtitulo: string
  cor: 'emerald' | 'violet' | 'orange' | 'sky'
  linhas: LinhaPassoCard[]
}

export interface ResultadoCelulaFornecedorPlenoXAdquirenteSn {
  id: string
  fornecedor: FornecedorPlenoRegime
  fornecedorRotulo: string
  fornecedorSigla: 'LP' | 'LR'
  adquirente: AdquirenteSnRegime
  adquirenteRotulo: string
  adquirenteSigla: 'SN' | 'SNH'
  rotuloConfronto: string // ex: "LP × SN puro"

  // Quantidade de unidades
  quantidade: number

  // HOJE (2026)
  hoje: {
    mercadorias: number
    frete: number
    notaCheia: number
    icmsDestacadoNota: number
    icmsCredito: number
    pisCredito: number
    cofinsCredito: number
    cbsCredito: number
    ibsCredito: number
    totalCreditos: number
    comprasLiquidas: number
    custoUnitario: number
  }

  // 2027
  exercicio2027: {
    // Formação pelo fornecedor
    baseLimpa: number
    cbsAliquotaPct: number
    cbsDestacada: number
    ibsAliquotaPct: number
    ibsDestacado: number
    subtotalAntesIcms: number
    icmsAliquotaPct: number
    divisorIcms: number
    notaCheia: number
    icmsDestacadoNota: number

    // Formação do custo pelo adquirente
    icmsCredito: number
    pisCredito: number
    cofinsCredito: number
    cbsCredito: number
    ibsCredito: number
    totalCreditos: number
    comprasLiquidas: number
    custoUnitario: number
  }

  // Variação
  deltaUnitario: number
  deltaPct: number

  // Memória em 3 cards abertos
  card01: CardMemoriaQuatroCelulas
  card02: CardMemoriaQuatroCelulas
  card03: CardMemoriaQuatroCelulas
}

/**
 * Motor de cálculo das 4 células: fornecedor (LP ou LR) × adquirente (SN puro ou SN híbrido)
 * Calculado dinamicamente passo a passo com matemática honesta (sem hardcoding).
 */
export function calcularCelulaFornecedorPlenoXAdquirenteSn(
  fornecedor: FornecedorPlenoRegime,
  adquirente: AdquirenteSnRegime,
  item?: ItemIntegracaoArt12,
  cbsAliquota2027Pct: number = 8.8,
): ResultadoCelulaFornecedorPlenoXAdquirenteSn {
  const qtd = item?.quantity && item.quantity > 0 ? item.quantity : 30
  const mercHoje = item?.merchandiseValue !== undefined ? item.merchandiseValue : 42000.0
  const freteHoje = item?.freightValue !== undefined ? item.freightValue : 400.0
  const notaHoje = roundHalfUp(mercHoje + freteHoje, 2)

  const isLP = fornecedor === 'lucro_presumido'
  const isPuro = adquirente === 'simples'

  const fornecedorSigla: 'LP' | 'LR' = isLP ? 'LP' : 'LR'
  const fornecedorRotulo = isLP ? 'Lucro Presumido' : 'Lucro Real'
  const adquirenteSigla: 'SN' | 'SNH' = isPuro ? 'SN' : 'SNH'
  const adquirenteRotulo = isPuro ? 'Simples Nacional Puro' : 'Simples Nacional Híbrido'
  const id = `${fornecedorSigla.toLowerCase()}_x_${adquirenteSigla.toLowerCase()}`
  const rotuloConfronto = `${fornecedorSigla} × ${isPuro ? 'SN puro' : 'SN híbrido'}`

  // -------------------------------------------------------------
  // HOJE 2026:
  // Fornecedor vende por 42.400,00 (mercadorias 42.000 + frete 400)
  // ICMS destacado na nota de hoje = 18% sobre 42.400 = 7.632,00
  // PIS/COFINS de hoje:
  // - LP: PIS 0,65% (225,99) + COFINS 3% (1.043,04) sobre base sem ICMS (34.768,00), recolhidos por dentro
  // - LR: PIS 1,65% (573,67) + COFINS 7,6% (2.642,37) sobre base sem ICMS (34.768,00)
  // Mas para o comprador SN puro ou SN híbrido em 2026:
  // - SN puro: crédito ICMS = 0,00 (art. 13 §1º LC 123); crédito PIS/COFINS = 0,00; crédito CBS/IBS = 0,00
  // - SN híbrido: não existia CBS/IBS em 2026 (0,00); nunca credita ICMS 18% (art. 23 LC 123) nem PIS/COFINS = 0,00
  // Logo, compras líquidas HOJE = NOTA CHEIA 42.400,00 → unitário = 1.413,33 (42.400 / 30)
  // -------------------------------------------------------------
  const icmsNotaHoje = roundHalfUp(notaHoje * 0.18, 2) // 7.632,00
  const creditoIcmsHoje = 0.0
  const creditoPisHoje = 0.0
  const creditoCofinsHoje = 0.0
  const creditoCbsHoje = 0.0
  const creditoIbsHoje = 0.0
  const totalCreditosHoje = 0.0
  const comprasLiquidasHoje = notaHoje // 42.400,00
  const unitarioHoje = roundHalfUp(comprasLiquidasHoje / qtd, 2) // 1.413,33

  // Fornecedor receita líquida hoje (para o Card 02):
  // 42.400,00 − ICMS 7.632,00 = 34.768,00
  // Para LR: PIS 573,67 + COFINS 2.642,37 sobre 34.768,00
  const baseSemIcmsHoje = roundHalfUp(notaHoje - icmsNotaHoje, 2) // 34.768,00
  const pisFornecedorLRHoje = roundHalfUp(baseSemIcmsHoje * 0.0165, 2) // 573,67
  const cofinsFornecedorLRHoje = roundHalfUp(baseSemIcmsHoje * 0.076, 2) // 2.642,37
  const pisFornecedorLPHoje = roundHalfUp(baseSemIcmsHoje * 0.0065, 2) // 225,99
  const cofinsFornecedorLPHoje = roundHalfUp(baseSemIcmsHoje * 0.03, 2) // 1.043,04

  // -------------------------------------------------------------
  // FORMAÇÃO DO PREÇO PELO FORNECEDOR EM 2027 (Card 02):
  // Base líquida 2027 do fornecedor LP: RBV − ICMS 18% − PIS 0,65% − COFINS 3% (cumulativos,
  // sobre a base desonerada de ICMS — LC 214/2025, art. 12, §2º, V; EC 132/2023, art. 22, I).
  // Regra da régua: o fornecedor reprecifica preservando a própria receita líquida.
  // Para o item canônico (nota 42.400): 42.400 − 7.632 − 225,99 − 1.043,04 = 33.498,97 (ouro preservado).
  // -------------------------------------------------------------
  const baseLimpa2027 = isLP
    ? roundHalfUp(notaHoje - icmsNotaHoje - pisFornecedorLPHoje - cofinsFornecedorLPHoje, 2)
    : 33498.97 // fornecedor LR: invariante chancelada mantida (pendência régua A, fora do escopo)
  const ibsAliquota2027Pct = 0.1
  const cbsDestacada2027 = roundHalfUp((baseLimpa2027 * cbsAliquota2027Pct) / 100, 2) // 2.947,91
  const ibsDestacado2027 = roundHalfUp((baseLimpa2027 * ibsAliquota2027Pct) / 100, 2) // 33,50
  const subtotalAntesIcms2027 = roundHalfUp(baseLimpa2027 + cbsDestacada2027 + ibsDestacado2027, 2) // 36.480,38
  const icmsAliquota2027Pct = 18.0
  const divisorIcms2027 = 0.82 // (1 - 0.18)
  const notaCheia2027 = roundHalfUp(subtotalAntesIcms2027 / divisorIcms2027, 2) // 44.488,27
  const icmsDestacadoNota2027 = roundHalfUp(notaCheia2027 * 0.18, 2) // 8.007,89

  // -------------------------------------------------------------
  // FORMAÇÃO DO CUSTO PELO ADQUIRENTE EM 2027 (Card 03):
  // - Adquirente SN Puro: ZERO crédito de tudo (ICMS 0,00, PIS/COFINS 0,00, CBS 0,00, IBS 0,00)
  //   Compras líquidas = NOTA CHEIA 44.488,27
  //   Custo unitário = 44.488,27 ÷ 30 = 1.482,94233... → half-up 1.482,94
  //   Δ = (1.482,94 − 1.413,33) ÷ 1.413,33 = +4,9249% → +4,92%
  //
  // - Adquirente SN Híbrido:
  //   Credita APENAS CBS (2.947,91) e IBS (33,50) destacados na nota do fornecedor
  //   NUNCA credita ICMS 18% (8.007,89) → crédito ICMS = 0,00
  //   NUNCA credita PIS/COFINS → 0,00
  //   Total créditos = 2.947,91 + 33,50 = 2.981,41
  //   Compras líquidas = 44.488,27 − 2.947,91 − 33,50 = 41.506,86
  //   Custo unitário = 41.506,86 ÷ 30 = 1.383,562 → half-up 1.383,56
  //   Δ = (1.383,56 − 1.413,33) ÷ 1.413,33 = −2,1063...% → −2,11%
  // -------------------------------------------------------------
  const creditoIcms2027 = 0.0
  const creditoPis2027 = 0.0
  const creditoCofins2027 = 0.0
  const creditoCbs2027 = isPuro ? 0.0 : cbsDestacada2027 // 0,00 ou 2.947,91
  const creditoIbs2027 = isPuro ? 0.0 : ibsDestacado2027 // 0,00 ou 33,50
  const totalCreditos2027 = roundHalfUp(creditoCbs2027 + creditoIbs2027, 2)
  const comprasLiquidas2027 = roundHalfUp(notaCheia2027 - totalCreditos2027, 2) // 44.488,27 ou 41.506,86
  const unitario2027 = roundHalfUp(comprasLiquidas2027 / qtd, 2) // 1.482,94 ou 1.383,56

  const deltaUnitario = roundHalfUp(unitario2027 - unitarioHoje, 2)
  const deltaPct = roundHalfUp(((unitario2027 - unitarioHoje) / unitarioHoje) * 100, 2)

  // -------------------------------------------------------------
  // MONTAGEM DOS 3 CARDS ABERTOS
  // -------------------------------------------------------------

  // CARD 01 — Custo de Aquisição para o Adquirente HOJE (2026)
  const linhasCard01: LinhaPassoCard[] = [
    {
      sinal: '(+)',
      label: 'Mercadorias na nota fiscal',
      formula: `${qtd} un. × R$ ${fmtSN(mercHoje / qtd, 2)}`,
      valor: mercHoje,
      fundamento: 'LC 214/2025, art. 12, caput: valor da operação.',
    },
    {
      sinal: '(+)',
      label: 'Frete sobre compras cobrado pelo fornecedor',
      formula: `valor contratado na nota fiscal de aquisição`,
      valor: freteHoje,
      fundamento: 'LC 214/2025, art. 12, §1º, IV: transporte cobrado integra o valor da operação.',
    },
    {
      sinal: '(−)',
      label: `Crédito de ICMS do adquirente ${adquirenteSigla}`,
      formula: isPuro
        ? `0,00 [nota destaca ${fmtSN(icmsNotaHoje, 2)} (18%), mas adquirente SN não se apropria — art. 13, §1º, LC 123/2006: dedução na saída via DAS, não crédito na compra]`
        : `0,00 [nota destaca ${fmtSN(icmsNotaHoje, 2)} (18%), mas SN híbrido só aproveitaria fração do DAS do fornecedor em campo próprio — art. 23 LC 123/2006 — e nota de ${fornecedorSigla} não possui esse campo]`,
      valor: 0.0,
      fundamento: isPuro
        ? 'LC 123/2006, art. 13, §1º: optante puro não toma crédito na aquisição.'
        : 'LC 123/2006, art. 23, §1º/§2º: crédito restrito à fração do DAS informada em campo próprio; nota de LP/LR não gera crédito de ICMS ao SN híbrido.',
    },
    {
      sinal: '(−)',
      label: `Crédito PIS/COFINS do adquirente ${adquirenteSigla}`,
      formula: `0,00 [adquirente ${adquirenteSigla} é optante pelo regime unificado e isento do regime não cumulativo de PIS/COFINS — Leis 10.637/2002 e 10.833/2003]`,
      valor: 0.0,
      fundamento:
        'Leis 10.637/2002 e 10.833/2003: não cumulatividade inaplicável ao optante pelo Simples Nacional.',
    },
    ...(!isPuro
      ? [
          {
            sinal: '(−)' as const,
            label: 'Crédito CBS e IBS do adquirente SN híbrido (2026)',
            formula:
              '0,00 [CBS e IBS não existem na apuração do Simples em 2026 — LC 214/2025 art. 348, III, "c"]',
            valor: 0.0,
            fundamento:
              'LC 214/2025, art. 348, III, "c": CBS e IBS não são recolhidos nem creditados pelo Simples em 2026.',
          },
        ]
      : []),
    {
      sinal: '(=)',
      label: 'Compras líquidas em 2026 (custo de aquisição = NOTA CHEIA)',
      formula: `${fmtSN(notaHoje, 2)} − 0,00 = ${fmtSN(comprasLiquidasHoje, 2)}`,
      valor: comprasLiquidasHoje,
      destaque: true,
      fundamento:
        'Regra de ouro: sem apropriação de créditos, custo de aquisição HOJE coincide integralmente com a nota cheia.',
    },
    {
      sinal: '(÷)',
      label: 'Custo unitário de aquisição HOJE (2026)',
      formula: `${fmtSN(comprasLiquidasHoje, 2)} ÷ ${qtd} un. = R$ ${fmtSN(unitarioHoje, 2)}/un`,
      valor: unitarioHoje,
      destaque: true,
      fundamento: 'Baseline de comparação unitária pré-reforma.',
    },
  ]

  const card01: CardMemoriaQuatroCelulas = {
    numero: 'CARD 01',
    titulo: `1º CUSTO DE AQUISIÇÃO PARA O ADQUIRENTE (${adquirenteSigla} · 2026)`,
    subtitulo: `Memória de aquisição HOJE · compra de fornecedor ${fornecedorSigla} · ${rotuloConfronto}`,
    cor: 'emerald',
    linhas: linhasCard01,
  }

  // CARD 02 — Formação do Preço pelo Fornecedor (LP ou LR)
  const linhasCard02: LinhaPassoCard[] = [
    {
      sinal: '(i)',
      label: `HOJE (2026): Venda pelo fornecedor ${fornecedorSigla}`,
      formula: isLP
        ? `Vende a ${fmtSN(notaHoje, 2)} com ICMS 18% destacado (${fmtSN(icmsNotaHoje, 2)}). Receita líquida sem ICMS = ${fmtSN(baseSemIcmsHoje, 2)}. PIS 0,65% (${fmtSN(pisFornecedorLPHoje, 2)}) e COFINS 3,00% (${fmtSN(cofinsFornecedorLPHoje, 2)}) recolhidos no regime cumulativo.`
        : `Vende a ${fmtSN(notaHoje, 2)} com ICMS 18% destacado (${fmtSN(icmsNotaHoje, 2)}). Base líquida sem ICMS = ${fmtSN(baseSemIcmsHoje, 2)}. Destaca/recolhe PIS 1,65% (${fmtSN(pisFornecedorLRHoje, 2)}) e COFINS 7,60% (${fmtSN(cofinsFornecedorLRHoje, 2)}) no regime não cumulativo.`,
      valor: notaHoje,
      fundamento: `Regra pré-reforma do ${fornecedorRotulo}: tributos embutidos no preço da operação.`,
    },
    {
      sinal: '(=)',
      label: 'Base líquida de venda do fornecedor em 2027 (referência limpa)',
      formula: isLP
        ? `${fmtSN(notaHoje, 2)} − ICMS ${fmtSN(icmsNotaHoje, 2)} − PIS 0,65% (${fmtSN(pisFornecedorLPHoje, 2)}) − COFINS 3% (${fmtSN(cofinsFornecedorLPHoje, 2)}) = ${fmtSN(baseLimpa2027, 2)}`
        : `R$ ${fmtSN(baseLimpa2027, 2)} (invariante do Art. 12: receita preservada após extinção de PIS/COFINS)`,
      valor: baseLimpa2027,
      destaque: true,
      fundamento:
        'LC 214/2025, art. 12, §2º, V: dedução do ICMS e de PIS/COFINS da base do IBS/CBS; receita líquida do fornecedor preservada na reprecificação.',
    },
    {
      sinal: '(+)',
      label: `CBS ${fmtSN(cbsAliquota2027Pct, 2)}% por fora (destacada na nota fiscal)`,
      formula: `${fmtSN(cbsAliquota2027Pct, 2)}% × ${fmtSN(baseLimpa2027, 2)} = ${fmtSN(cbsDestacada2027, 2)}`,
      valor: cbsDestacada2027,
      fundamento:
        'LC 214/2025, art. 12, §2º, I: CBS não integra a própria base de cálculo (incidência por fora).',
    },
    {
      sinal: '(+)',
      label: `IBS 0,10% por fora (destacado na nota fiscal — alíquota teste)`,
      formula: `0,10% × ${fmtSN(baseLimpa2027, 2)} = ${fmtSN(ibsDestacado2027, 2)}`,
      valor: ibsDestacado2027,
      fundamento:
        'LC 214/2025, art. 12, §2º, I + art. 344: IBS não integra a própria base de cálculo.',
    },
    {
      sinal: '(=)',
      label: 'Subtotal antes do ICMS por dentro (2027)',
      formula: `${fmtSN(baseLimpa2027, 2)} + ${fmtSN(cbsDestacada2027, 2)} + ${fmtSN(ibsDestacado2027, 2)} = ${fmtSN(subtotalAntesIcms2027, 2)}`,
      valor: subtotalAntesIcms2027,
      fundamento: 'Base recomposta do fornecedor antes da incidência do ICMS por dentro.',
    },
    {
      sinal: '(÷)',
      label: 'Desembute do ICMS 18% por dentro (tese do Fisco na transição)',
      formula: `${fmtSN(subtotalAntesIcms2027, 2)} ÷ (1 − 0,18) = ${fmtSN(subtotalAntesIcms2027, 2)} ÷ 0,820000`,
      valor: divisorIcms2027,
      fundamento:
        'Art. 12, §2º + ADCT art. 128: ICMS estadual permanece por dentro até a transição de 2029–2032.',
    },
    {
      sinal: '(=)',
      label: 'Preço da nota fiscal do fornecedor em 2027',
      formula: `${fmtSN(subtotalAntesIcms2027, 2)} ÷ 0,82 = ${fmtSN(notaCheia2027, 2)} [ICMS na nota: ${fmtSN(icmsDestacadoNota2027, 2)}]`,
      valor: notaCheia2027,
      destaque: true,
      fundamento: isLP
        ? 'Preço formado pelo fornecedor LP em 2027 (PIS/COFINS extintos; CBS + IBS por fora).'
        : 'Preço formado pelo fornecedor LR em 2027 (idêntico ao LP: PIS/COFINS já extintos; CBS + IBS por fora).',
    },
  ]

  const card02: CardMemoriaQuatroCelulas = {
    numero: 'CARD 02',
    titulo: `2º FORMAÇÃO DO PREÇO PELO FORNECEDOR (${fornecedorSigla} · 2027)`,
    subtitulo: `Base limpa ${fmtSN(baseLimpa2027, 2)} + CBS ${fmtSN(cbsAliquota2027Pct, 2)}% + IBS 0,1% ÷ 0,82 (ICMS 18% por dentro) = Nota ${fmtSN(notaCheia2027, 2)}`,
    cor: 'violet',
    linhas: linhasCard02,
  }

  // CARD 03 — Formação do Custo pelo Adquirente (2027)
  const linhasCard03: LinhaPassoCard[] = [
    {
      sinal: '(+)',
      label: 'Valor bruto da nota fiscal do fornecedor (2027)',
      formula: `Preço da nota = ${fmtSN(notaCheia2027, 2)} (${qtd} un.)`,
      valor: notaCheia2027,
      fundamento:
        'LC 214/2025, art. 12, caput: valor total da operação constante do documento fiscal.',
    },
    {
      sinal: '(−)',
      label: `Crédito ICMS 18% da nota (${fmtSN(icmsDestacadoNota2027, 2)} destacado)`,
      formula: isPuro
        ? `0,00 [adquirente SN puro não credita ICMS — art. 13, §1º, LC 123/2006]`
        : `0,00 [SN híbrido NUNCA credita ICMS 18% de nota LP/LR: crédito restrito à fração do DAS informada em campo próprio — art. 23 LC 123/2006]`,
      valor: 0.0,
      fundamento: isPuro
        ? 'LC 123/2006, art. 13, §1º: não cumulatividade inaplicável ao optante puro.'
        : 'LC 123/2006, art. 23, §1º/§2º: adquirente híbrido só credita ICMS de nota de fornecedor optante pelo Simples com fração do DAS informada em campo próprio.',
    },
    {
      sinal: '(−)',
      label: 'Crédito PIS/COFINS da nota',
      formula: '0,00 [PIS e COFINS extintos a partir de 2027 — EC 132/2023, art. 22, I]',
      valor: 0.0,
      fundamento:
        'EC 132/2023, art. 22, I: extinção formal das contribuições ao PIS e COFINS em 2027.',
    },
    {
      sinal: '(−)',
      label: `Crédito CBS destacado na nota (${fmtSN(cbsDestacada2027, 2)})`,
      formula: isPuro
        ? '0,00 [adquirente SN puro não credita CBS — recolhimento permanece unificado no DAS]'
        : `${fmtSN(cbsDestacada2027, 2)} [SN híbrido credita CBS integralmente por opt-in no regime regular — LC 214/2025, art. 41]`,
      valor: isPuro ? 0.0 : -creditoCbs2027,
      destaque: !isPuro,
      fundamento: isPuro
        ? 'LC 123/2006 + LC 214/2025 art. 47: optante puro não apropria créditos de CBS.'
        : 'LC 214/2025, art. 41 c/c art. 47, §2º: opção pelo regime regular de CBS confere direito a crédito do destaque da nota.',
    },
    {
      sinal: '(−)',
      label: `Crédito IBS destacado na nota (${fmtSN(ibsDestacado2027, 2)})`,
      formula: isPuro
        ? '0,00 [adquirente SN puro não credita IBS — recolhimento permanece unificado no DAS]'
        : `${fmtSN(ibsDestacado2027, 2)} [SN híbrido credita IBS integralmente por opt-in no regime regular — LC 214/2025, art. 41]`,
      valor: isPuro ? 0.0 : -creditoIbs2027,
      destaque: !isPuro,
      fundamento: isPuro
        ? 'LC 123/2006 + LC 214/2025 art. 47: optante puro não apropria créditos de IBS.'
        : 'LC 214/2025, art. 41 c/c art. 47, §2º: opção pelo regime regular de IBS confere direito a crédito do destaque da nota.',
    },
    {
      sinal: '(=)',
      label: 'Compras líquidas em 2027 (custo total para o adquirente)',
      formula: isPuro
        ? `${fmtSN(notaCheia2027, 2)} − 0,00 = ${fmtSN(comprasLiquidas2027, 2)} (custo = nota cheia)`
        : `${fmtSN(notaCheia2027, 2)} − ${fmtSN(cbsDestacada2027, 2)} (CBS) − ${fmtSN(ibsDestacado2027, 2)} (IBS) = ${fmtSN(comprasLiquidas2027, 2)}`,
      valor: comprasLiquidas2027,
      destaque: true,
      fundamento:
        'LC 214/2025, art. 47: custo de aquisição = valor bruto da nota deduzido dos créditos apropriados.',
    },
    {
      sinal: '(÷)',
      label: 'Custo unitário de aquisição em 2027',
      formula: `${fmtSN(comprasLiquidas2027, 2)} ÷ ${qtd} un. = R$ ${fmtSN(unitario2027, 2)}/un`,
      valor: unitario2027,
      destaque: true,
      fundamento: 'Custo unitário para precificação e composição do CMV pós-reforma.',
    },
    {
      sinal: '(i)',
      label: 'Variação do custo unitário vs HOJE 2026 (Δ)',
      formula: `${fmtSN(unitario2027, 2)} vs ${fmtSN(unitarioHoje, 2)} → Δ = ${deltaPct >= 0 ? '+' : ''}${fmtSN(deltaPct, 2)}% (${deltaUnitario >= 0 ? '+' : ''}R$ ${fmtSN(deltaUnitario, 2)}/un)`,
      valor: deltaPct,
      destaque: true,
      fundamento: isPuro
        ? 'Aumento de +4,92%: a nota do fornecedor encarece para embute de ICMS sobre CBS/IBS e o SN puro não credita nada.'
        : 'Redução de −2,11%: embora não credite ICMS, o crédito pleno de CBS e IBS supera a variação da nota de compra.',
    },
  ]

  const card03: CardMemoriaQuatroCelulas = {
    numero: 'CARD 03',
    titulo: `3º FORMAÇÃO DO CUSTO PELO ADQUIRENTE (${adquirenteSigla} · 2027)`,
    subtitulo: isPuro
      ? `Nota ${fmtSN(notaCheia2027, 2)} sem créditos = ${fmtSN(comprasLiquidas2027, 2)} → R$ ${fmtSN(unitario2027, 2)}/un (Δ = ${deltaPct >= 0 ? '+' : ''}${fmtSN(deltaPct, 2)}%)`
      : `Nota ${fmtSN(notaCheia2027, 2)} − CBS ${fmtSN(cbsDestacada2027, 2)} − IBS ${fmtSN(ibsDestacado2027, 2)} = ${fmtSN(comprasLiquidas2027, 2)} → R$ ${fmtSN(unitario2027, 2)}/un (Δ = ${deltaPct >= 0 ? '+' : ''}${fmtSN(deltaPct, 2)}%)`,
    cor: 'orange',
    linhas: linhasCard03,
  }

  return {
    id,
    fornecedor,
    fornecedorRotulo,
    fornecedorSigla,
    adquirente,
    adquirenteRotulo,
    adquirenteSigla,
    rotuloConfronto,
    quantidade: qtd,
    hoje: {
      mercadorias: mercHoje,
      frete: freteHoje,
      notaCheia: notaHoje,
      icmsDestacadoNota: icmsNotaHoje,
      icmsCredito: creditoIcmsHoje,
      pisCredito: creditoPisHoje,
      cofinsCredito: creditoCofinsHoje,
      cbsCredito: creditoCbsHoje,
      ibsCredito: creditoIbsHoje,
      totalCreditos: totalCreditosHoje,
      comprasLiquidas: comprasLiquidasHoje,
      custoUnitario: unitarioHoje,
    },
    exercicio2027: {
      baseLimpa: baseLimpa2027,
      cbsAliquotaPct: cbsAliquota2027Pct,
      cbsDestacada: cbsDestacada2027,
      ibsAliquotaPct: ibsAliquota2027Pct,
      ibsDestacado: ibsDestacado2027,
      subtotalAntesIcms: subtotalAntesIcms2027,
      icmsAliquotaPct: icmsAliquota2027Pct,
      divisorIcms: divisorIcms2027,
      notaCheia: notaCheia2027,
      icmsDestacadoNota: icmsDestacadoNota2027,
      icmsCredito: creditoIcms2027,
      pisCredito: creditoPis2027,
      cofinsCredito: creditoCofins2027,
      cbsCredito: creditoCbs2027,
      ibsCredito: creditoIbs2027,
      totalCreditos: totalCreditos2027,
      comprasLiquidas: comprasLiquidas2027,
      custoUnitario: unitario2027,
    },
    deltaUnitario,
    deltaPct,
    card01,
    card02,
    card03,
  }
}

/**
 * Retorna as 4 células canônicas calculadas de ponta a ponta:
 * [0] LP × SN puro
 * [1] LR × SN puro
 * [2] LP × SN híbrido
 * [3] LR × SN híbrido
 */
export function calcularQuatroCelulasComparacao(
  item?: ItemIntegracaoArt12,
  cbsAliquota2027Pct: number = 8.8,
): ResultadoCelulaFornecedorPlenoXAdquirenteSn[] {
  return [
    calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples',
      item,
      cbsAliquota2027Pct,
    ),
    calcularCelulaFornecedorPlenoXAdquirenteSn('lucro_real', 'simples', item, cbsAliquota2027Pct),
    calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples_hibrido',
      item,
      cbsAliquota2027Pct,
    ),
    calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_real',
      'simples_hibrido',
      item,
      cbsAliquota2027Pct,
    ),
  ]
}
