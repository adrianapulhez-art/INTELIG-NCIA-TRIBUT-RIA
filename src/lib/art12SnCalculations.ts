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
