/**
 * Tabelas oficiais do Simples Nacional (Lei Complementar nº 123/2006,
 * atualizada pela LC nº 155/2016 e Resolução CGSN nº 140/2018).
 *
 * Contempla:
 * - Anexos I (Comércio), II (Indústria), III (Serviços em geral), IV (Serviços sem CPP no DAS), V (Serviços com Fator R)
 * - Faixas nominais de RBT12 (até R$ 4,8 milhões) e parcelas a deduzir (PD)
 * - Tabela de repartição de tributos (IRPJ, CSLL, COFINS, PIS, CPP, ICMS, IPI, ISS)
 * - Fórmulas do PGDAS:
 *     Alíquota Efetiva = (RBT12 * Alíquota Nominal - PD) / RBT12
 * - Sublimite estadual/municipal de R$ 3.600.000,00 (ICMS e ISS recolhidos "por fora" na 6ª faixa)
 * - Fator R: FS12 / RBT12 (se >= 28% -> Anexo III; se < 28% -> Anexo V)
 */

export type SimplesAnexoId = 'anexo_1' | 'anexo_2' | 'anexo_3' | 'anexo_4' | 'anexo_5'

export interface SimplesFaixa {
  numero: number
  nome: string
  limiteInferior: number
  limiteSuperior: number
  aliquotaNominal: number // percentual, ex: 4.0 para 4%
  parcelaDeduzir: number // em R$
  // Percentuais de partilha dentro da faixa (somam 100%)
  partilha: {
    irpj: number
    csll: number
    cofins: number
    pis: number
    cpp: number
    icms?: number
    ipi?: number
    iss?: number
  }
}

export interface SimplesAnexoConfig {
  id: SimplesAnexoId
  nome: string
  descricao: string
  tipoAtividade: 'comercio' | 'industria' | 'servicos'
  sujeitoFatorR?: boolean
  cppNoDas: boolean
  tributoEstadualMunicipal: 'icms' | 'iss' | 'icms_ipi'
  faixas: SimplesFaixa[]
}

export const SUBLIMITE_SIMPLES = 3600000.0 // R$ 3,6 milhões
export const LIMITE_MAXIMO_SIMPLES = 4800000.0 // R$ 4,8 milhões

export const SIMPLES_ANEXOS: Record<SimplesAnexoId, SimplesAnexoConfig> = {
  anexo_1: {
    id: 'anexo_1',
    nome: 'Anexo I — Comércio',
    descricao: 'Revenda de mercadorias no comércio atacadista e varejista',
    tipoAtividade: 'comercio',
    cppNoDas: true,
    tributoEstadualMunicipal: 'icms',
    faixas: [
      {
        numero: 1,
        nome: '1ª Faixa',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 4.0,
        parcelaDeduzir: 0,
        partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 41.5, icms: 34.0 },
      },
      {
        numero: 2,
        nome: '2ª Faixa',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 7.3,
        parcelaDeduzir: 5940,
        partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 41.5, icms: 34.0 },
      },
      {
        numero: 3,
        nome: '3ª Faixa',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 9.5,
        parcelaDeduzir: 13860,
        partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5 },
      },
      {
        numero: 4,
        nome: '4ª Faixa',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 10.7,
        parcelaDeduzir: 22500,
        partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5 },
      },
      {
        numero: 5,
        nome: '5ª Faixa',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 14.3,
        parcelaDeduzir: 87300,
        partilha: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5 },
      },
      {
        numero: 6,
        nome: '6ª Faixa (Sublimite)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 19.0,
        parcelaDeduzir: 378000,
        // Na 6ª faixa, o ICMS é recolhido por fora no regime normal estadual.
        // Os tributos federais no DAS somam 100%: IRPJ 13.5%, CSLL 10%, COFINS 28.27%, PIS 6.13%, CPP 42.10%
        partilha: { irpj: 13.5, csll: 10.0, cofins: 28.27, pis: 6.13, cpp: 42.1, icms: 0 },
      },
    ],
  },

  anexo_2: {
    id: 'anexo_2',
    nome: 'Anexo II — Indústria',
    descricao: 'Venda de mercadorias industrializadas pelo próprio contribuinte',
    tipoAtividade: 'industria',
    cppNoDas: true,
    tributoEstadualMunicipal: 'icms_ipi',
    faixas: [
      {
        numero: 1,
        nome: '1ª Faixa',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 4.5,
        parcelaDeduzir: 0,
        partilha: {
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
        nome: '2ª Faixa',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 7.8,
        parcelaDeduzir: 5940,
        partilha: {
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
        nome: '3ª Faixa',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 10.0,
        parcelaDeduzir: 13860,
        partilha: {
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
        nome: '4ª Faixa',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 11.2,
        parcelaDeduzir: 22500,
        partilha: {
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
        nome: '5ª Faixa',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 14.7,
        parcelaDeduzir: 85500,
        partilha: {
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
        nome: '6ª Faixa (Sublimite)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 30.0,
        parcelaDeduzir: 720000,
        // ICMS recolhido por fora no sublimite. Tributos no DAS: IRPJ 8.5%, CSLL 7.5%, COFINS 20.96%, PIS 4.54%, CPP 23.50%, IPI 35.00%
        partilha: { irpj: 8.5, csll: 7.5, cofins: 20.96, pis: 4.54, cpp: 23.5, ipi: 35.0, icms: 0 },
      },
    ],
  },

  anexo_3: {
    id: 'anexo_3',
    nome: 'Anexo III — Serviços em Geral / Fator R ≥ 28%',
    descricao:
      'Locação de bens móveis e serviços em geral (manutenção, instalação, turismo) ou intelectuais com Fator R ≥ 28%',
    tipoAtividade: 'servicos',
    sujeitoFatorR: true,
    cppNoDas: true,
    tributoEstadualMunicipal: 'iss',
    faixas: [
      {
        numero: 1,
        nome: '1ª Faixa',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 6.0,
        parcelaDeduzir: 0,
        partilha: { irpj: 4.0, csll: 3.5, cofins: 12.82, pis: 2.78, cpp: 43.4, iss: 33.5 },
      },
      {
        numero: 2,
        nome: '2ª Faixa',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 11.2,
        parcelaDeduzir: 9360,
        partilha: { irpj: 4.0, csll: 3.5, cofins: 14.05, pis: 3.05, cpp: 43.4, iss: 32.0 },
      },
      {
        numero: 3,
        nome: '3ª Faixa',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 13.5,
        parcelaDeduzir: 17640,
        partilha: { irpj: 4.0, csll: 3.5, cofins: 13.64, pis: 2.96, cpp: 43.4, iss: 32.5 },
      },
      {
        numero: 4,
        nome: '4ª Faixa',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 16.0,
        parcelaDeduzir: 35640,
        partilha: { irpj: 4.0, csll: 3.5, cofins: 13.64, pis: 2.96, cpp: 43.4, iss: 32.5 },
      },
      {
        numero: 5,
        nome: '5ª Faixa',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 21.0,
        parcelaDeduzir: 125640,
        partilha: { irpj: 4.0, csll: 3.5, cofins: 12.82, pis: 2.78, cpp: 43.4, iss: 33.5 },
      },
      {
        numero: 6,
        nome: '6ª Faixa (Sublimite)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 33.0,
        parcelaDeduzir: 648000,
        // ISS recolhido por fora no sublimite municipal. Tributos federais: IRPJ 35%, CSLL 15%, COFINS 16.03%, PIS 3.47%, CPP 30.50%
        partilha: { irpj: 35.0, csll: 15.0, cofins: 16.03, pis: 3.47, cpp: 30.5, iss: 0 },
      },
    ],
  },

  anexo_4: {
    id: 'anexo_4',
    nome: 'Anexo IV — Serviços com CPP fora do DAS',
    descricao:
      'Construção civil, vigilância, limpeza, conservação e advocacia (CPP recolhida patronal em separado no INSS)',
    tipoAtividade: 'servicos',
    cppNoDas: false,
    tributoEstadualMunicipal: 'iss',
    faixas: [
      {
        numero: 1,
        nome: '1ª Faixa',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 4.5,
        parcelaDeduzir: 0,
        partilha: { irpj: 18.8, csll: 15.2, cofins: 17.67, pis: 3.83, cpp: 0, iss: 44.5 },
      },
      {
        numero: 2,
        nome: '2ª Faixa',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 9.0,
        parcelaDeduzir: 8100,
        partilha: { irpj: 19.8, csll: 15.2, cofins: 20.55, pis: 4.45, cpp: 0, iss: 40.0 },
      },
      {
        numero: 3,
        nome: '3ª Faixa',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 10.2,
        parcelaDeduzir: 12420,
        partilha: { irpj: 20.8, csll: 15.2, cofins: 19.73, pis: 4.27, cpp: 0, iss: 40.0 },
      },
      {
        numero: 4,
        nome: '4ª Faixa',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 14.0,
        parcelaDeduzir: 39780,
        partilha: { irpj: 17.8, csll: 19.2, cofins: 18.9, pis: 4.1, cpp: 0, iss: 40.0 },
      },
      {
        numero: 5,
        nome: '5ª Faixa',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 22.0,
        parcelaDeduzir: 183780,
        partilha: { irpj: 18.8, csll: 19.2, cofins: 18.08, pis: 3.92, cpp: 0, iss: 40.0 },
      },
      {
        numero: 6,
        nome: '6ª Faixa (Sublimite)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 33.0,
        parcelaDeduzir: 828000,
        // ISS recolhido por fora no sublimite. Tributos federais: IRPJ 53.5%, CSLL 21.5%, COFINS 20.55%, PIS 4.45%
        partilha: { irpj: 53.5, csll: 21.5, cofins: 20.55, pis: 4.45, cpp: 0, iss: 0 },
      },
    ],
  },

  anexo_5: {
    id: 'anexo_5',
    nome: 'Anexo V — Serviços Intelectuais / Fator R < 28%',
    descricao:
      'Serviços técnicos, científicos, TI, desenvolvimento, consultoria, engenharia quando Fator R < 28%',
    tipoAtividade: 'servicos',
    sujeitoFatorR: true,
    cppNoDas: true,
    tributoEstadualMunicipal: 'iss',
    faixas: [
      {
        numero: 1,
        nome: '1ª Faixa',
        limiteInferior: 0,
        limiteSuperior: 180000,
        aliquotaNominal: 15.5,
        parcelaDeduzir: 0,
        partilha: { irpj: 25.0, csll: 15.0, cofins: 14.1, pis: 3.05, cpp: 28.85, iss: 14.0 },
      },
      {
        numero: 2,
        nome: '2ª Faixa',
        limiteInferior: 180000,
        limiteSuperior: 360000,
        aliquotaNominal: 18.0,
        parcelaDeduzir: 4500,
        partilha: { irpj: 23.0, csll: 15.0, cofins: 14.1, pis: 3.05, cpp: 27.85, iss: 17.0 },
      },
      {
        numero: 3,
        nome: '3ª Faixa',
        limiteInferior: 360000,
        limiteSuperior: 720000,
        aliquotaNominal: 19.5,
        parcelaDeduzir: 9900,
        partilha: { irpj: 24.0, csll: 15.0, cofins: 14.92, pis: 3.23, cpp: 23.85, iss: 19.0 },
      },
      {
        numero: 4,
        nome: '4ª Faixa',
        limiteInferior: 720000,
        limiteSuperior: 1800000,
        aliquotaNominal: 20.5,
        parcelaDeduzir: 17100,
        partilha: { irpj: 21.0, csll: 15.0, cofins: 15.74, pis: 3.41, cpp: 23.85, iss: 21.0 },
      },
      {
        numero: 5,
        nome: '5ª Faixa',
        limiteInferior: 1800000,
        limiteSuperior: 3600000,
        aliquotaNominal: 23.0,
        parcelaDeduzir: 62100,
        partilha: { irpj: 23.0, csll: 12.5, cofins: 14.1, pis: 3.05, cpp: 23.85, iss: 23.5 },
      },
      {
        numero: 6,
        nome: '6ª Faixa (Sublimite)',
        limiteInferior: 3600000,
        limiteSuperior: 4800000,
        aliquotaNominal: 30.5,
        parcelaDeduzir: 540000,
        // ISS recolhido por fora no sublimite. Tributos federais: IRPJ 35%, CSLL 15.5%, COFINS 16.44%, PIS 3.56%, CPP 29.50%
        partilha: { irpj: 35.0, csll: 15.5, cofins: 16.44, pis: 3.56, cpp: 29.5, iss: 0 },
      },
    ],
  },
}

export interface FatorRCalculation {
  payroll12m: number
  rbt12: number
  fatorR: number // ex: 0.285 para 28.5%
  fatorRPercent: number // ex: 28.5
  isElegibleAnexo3: boolean
  recommendedAnexo: SimplesAnexoId
  explanation: string
}

export function calculateFatorR(payroll12m: number, rbt12: number): FatorRCalculation {
  const folha = Math.max(0, payroll12m || 0)
  const receita = Math.max(0, rbt12 || 0)

  let fatorR = 0
  if (receita > 0) {
    fatorR = folha / receita
  } else if (folha > 0) {
    fatorR = 0.28 // Regra CGSN: se folha > 0 e receita 0 no início
  }

  const fatorRPercent = Math.round(fatorR * 10000) / 100
  const isElegibleAnexo3 = fatorR >= 0.28
  const recommendedAnexo: SimplesAnexoId = isElegibleAnexo3 ? 'anexo_3' : 'anexo_5'

  const explanation = isElegibleAnexo3
    ? `Fator R de ${fatorRPercent.toFixed(2)}% (≥ 28,00%) enquadra automaticamente a empresa no ANEXO III (alíquotas mais baixas).`
    : `Fator R de ${fatorRPercent.toFixed(2)}% (< 28,00%) enquadra a empresa no ANEXO V (alíquotas mais elevadas). Aumentar a folha/pró-labore pode gerar economia tributária.`

  return {
    payroll12m: folha,
    rbt12: receita,
    fatorR,
    fatorRPercent,
    isElegibleAnexo3,
    recommendedAnexo,
    explanation,
  }
}

export interface PgdasDetailedResult {
  anexoId: SimplesAnexoId
  anexoNome: string
  rbt12: number
  faixaNumero: number
  faixaNome: string
  aliquotaNominal: number // %
  parcelaDeduzir: number // R$
  aliquotaEfetiva: number // %
  isSublimiteExceeded: boolean // se rbt12 > 3.600.000
  sublimiteWarning?: string
  // Repartição da alíquota efetiva (% e R$ sobre a receita)
  reparticao: {
    irpjRate: number
    csllRate: number
    cofinsRate: number
    pisRate: number
    cppRate: number
    icmsRate: number
    ipiRate: number
    issRate: number
    totalRate: number
  }
}

/**
 * Calcula a alíquota efetiva do PGDAS e a distribuição entre os tributos
 * conforme o Anexo e o RBT12.
 */
export function calculatePgdas(anexoId: SimplesAnexoId, rbt12: number): PgdasDetailedResult {
  const anexo = SIMPLES_ANEXOS[anexoId] || SIMPLES_ANEXOS.anexo_1
  const rbt12Val = Math.max(0, rbt12 || 0)

  // Localiza a faixa correspondente
  let faixa = anexo.faixas[0]
  for (const f of anexo.faixas) {
    if (rbt12Val <= f.limiteSuperior) {
      faixa = f
      break
    }
  }
  // Se ultrapassou o limite do anexo, fixa na 6ª faixa
  if (rbt12Val > anexo.faixas[anexo.faixas.length - 1].limiteSuperior) {
    faixa = anexo.faixas[anexo.faixas.length - 1]
  }

  // Fórmula PGDAS:
  // Alíquota Efetiva = (RBT12 * Alíquota Nominal - Parcela Deduzir) / RBT12
  let aliquotaEfetiva = 0
  if (rbt12Val <= 0) {
    // Quando RBT12 for 0, usa a alíquota nominal da 1ª faixa como referência
    aliquotaEfetiva = faixa.aliquotaNominal
  } else {
    aliquotaEfetiva =
      ((rbt12Val * (faixa.aliquotaNominal / 100) - faixa.parcelaDeduzir) / rbt12Val) * 100
    // Garante que não fique negativa
    aliquotaEfetiva = Math.max(0, aliquotaEfetiva)
  }

  // Verifica sublimite
  const isSublimiteExceeded = rbt12Val > SUBLIMITE_SIMPLES
  let sublimiteWarning: string | undefined = undefined
  if (isSublimiteExceeded) {
    if (
      anexo.tributoEstadualMunicipal === 'icms' ||
      anexo.tributoEstadualMunicipal === 'icms_ipi'
    ) {
      sublimiteWarning =
        'Atenção (Sublimite Estadual excedido): RBT12 > R$ 3.600.000,00. O ICMS (e IPI se houver) deve ser recolhido por fora da guia DAS, diretamente no regime normal do Estado. O DAS contempla apenas os tributos federais da 6ª faixa.'
    } else {
      sublimiteWarning =
        'Atenção (Sublimite Municipal excedido): RBT12 > R$ 3.600.000,00. O ISS deve ser recolhido por fora da guia DAS, diretamente no Município. O DAS contempla apenas os tributos federais da 6ª faixa.'
    }
  }

  // Distribuição da alíquota efetiva pelos percentuais da tabela de partilha
  // Cada tributo = aliquotaEfetiva * (partilha[tributo] / 100)
  const part = faixa.partilha
  const irpjRate = (aliquotaEfetiva * (part.irpj || 0)) / 100
  const csllRate = (aliquotaEfetiva * (part.csll || 0)) / 100
  const cofinsRate = (aliquotaEfetiva * (part.cofins || 0)) / 100
  const pisRate = (aliquotaEfetiva * (part.pis || 0)) / 100
  const cppRate = (aliquotaEfetiva * (part.cpp || 0)) / 100
  const icmsRate = (aliquotaEfetiva * (part.icms || 0)) / 100
  const ipiRate = (aliquotaEfetiva * (part.ipi || 0)) / 100
  const issRate = (aliquotaEfetiva * (part.iss || 0)) / 100

  const totalRate =
    irpjRate + csllRate + cofinsRate + pisRate + cppRate + icmsRate + ipiRate + issRate

  return {
    anexoId: anexo.id,
    anexoNome: anexo.nome,
    rbt12: rbt12Val,
    faixaNumero: faixa.numero,
    faixaNome: faixa.nome,
    aliquotaNominal: faixa.aliquotaNominal,
    parcelaDeduzir: faixa.parcelaDeduzir,
    aliquotaEfetiva: Math.round(aliquotaEfetiva * 10000) / 10000,
    isSublimiteExceeded,
    sublimiteWarning,
    reparticao: {
      irpjRate,
      csllRate,
      cofinsRate,
      pisRate,
      cppRate,
      icmsRate,
      ipiRate,
      issRate,
      totalRate,
    },
  }
}
