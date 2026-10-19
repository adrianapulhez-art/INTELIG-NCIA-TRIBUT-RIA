/**
 * Serviço de Classificação Fiscal NCM/SH — LC 214/2025 (Fase 3)
 * Consulta em tempo real à coleção 'lc214_anexos_ncm' (297 registros oficiais da LC 214/2025)
 * e sugestão de cClassTrib (Tabela Oficial IT 2025.002 v1.70).
 *
 * Regras estritas chanceladas pela Adri:
 * 1. Base e busca EXCLUSIVAMENTE NCM/SH de 8 dígitos — NBS expressamente FORA DE ESCOPO.
 * 2. Casamento por prefixo da posição/subposição NCM/SH respeitando a extensão dos termos legais.
 * 3. Detecção de ambiguidade quando múltiplos anexos/itens casam: NUNCA presumir, exigir chancela manual.
 * 4. NCM fora dos anexos: "Sem redutor — alíquota cheia" com 0% de redução.
 * 5. Fonte oficial Planalto / DOU rotulada em cada enquadramento.
 */

import pb from '@/lib/pocketbase/client'
import {
  TABELA_OFICIAL_CCLASSTRIB,
  buscarCClassTrib,
  type ClassificacaoTributariaOficial,
} from '@/lib/tabelaOficialCClassTrib'

export interface Lc214AnexoNcmRecord {
  id: string
  anexo: string
  artigo_origem: string
  item: string
  descricao: string
  ncm_sh: string
  percentual_reducao_pct: number
  descricao_reducao: string
  versao_extracao: string
  fonte: string
  created?: string
  updated?: string
}

export interface EnquadramentoNcmOpcao {
  id: string
  anexo: string
  artigo_origem: string
  item: string
  descricao: string
  ncm_sh_termo: string
  percentual_reducao_pct: number
  descricao_reducao: string
  fonte: string
}

export interface ClassificacaoNcmResult {
  ncmLimpo: string
  ncmFormatado: string
  status: 'sem_ncm' | 'incompleto' | 'nao_encontrado' | 'enquadrado' | 'ambiguo'
  opcoesEncontradas: EnquadramentoNcmOpcao[]
  opcaoSelecionada?: EnquadramentoNcmOpcao
  percentualReducaoPct: number
  rotuloReducao: string
  anexo?: string
  artigoOrigem?: string
  fonte?: string
  sugestaoCClassTrib?: ClassificacaoTributariaOficial
  codigoCClassTribSugerido?: string
}

/** Formata string/número de dígitos em máscara NCM: 0000.00.00 */
export function formatarMascaraNcm(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return ''
  const str = typeof valor === 'string' ? valor : String(valor)
  const limpo = str.replace(/\D/g, '').slice(0, 8)
  if (limpo.length <= 4) return limpo
  if (limpo.length <= 6) return `${limpo.slice(0, 4)}.${limpo.slice(4)}`
  return `${limpo.slice(0, 4)}.${limpo.slice(4, 6)}.${limpo.slice(6)}`
}

/** Limpa caracteres não-dígito do NCM */
export function limparNcm(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return ''
  const str = typeof valor === 'string' ? valor : String(valor)
  return str.replace(/\D/g, '').slice(0, 8)
}

// Cache em memória para evitar dezenas de roundtrips repetidos
let cacheAnexos: Lc214AnexoNcmRecord[] | null = null
let promessaCargaCache: Promise<Lc214AnexoNcmRecord[]> | null = null

/**
 * Carrega a tabela completa de anexos da LC 214/2025 do banco PocketBase.
 */
export async function carregarAnexosLc214(): Promise<Lc214AnexoNcmRecord[]> {
  if (cacheAnexos && cacheAnexos.length > 0) {
    return cacheAnexos
  }
  if (promessaCargaCache) {
    return promessaCargaCache
  }

  promessaCargaCache = (async () => {
    try {
      const records = await pb.collection('lc214_anexos_ncm').getFullList<Lc214AnexoNcmRecord>({
        sort: 'anexo,item',
      })
      cacheAnexos = records
      return records
    } catch (err) {
      console.warn(
        '[ncmClassificationService] Falha ao carregar lc214_anexos_ncm do PocketBase:',
        err,
      )
      return []
    } finally {
      promessaCargaCache = null
    }
  })()

  return promessaCargaCache
}

/**
 * Encontra as opções que casam com um NCM de 8 dígitos.
 * Termos em ncm_sh podem ser capítulos (07, 08), posições (0901, 2008.1),
 * subposições (1006.20) ou NCMs completos (1006.40.00).
 */
export function casarNcmComAnexos(
  ncmLimpo8: string,
  anexos: Lc214AnexoNcmRecord[],
): EnquadramentoNcmOpcao[] {
  if (ncmLimpo8.length !== 8) return []

  const opcoes: EnquadramentoNcmOpcao[] = []

  for (const anexoRec of anexos) {
    if (!anexoRec.ncm_sh) continue
    const termos = anexoRec.ncm_sh
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    for (const termo of termos) {
      const termoLimpo = termo.replace(/\D/g, '')
      if (termoLimpo.length >= 2 && ncmLimpo8.startsWith(termoLimpo)) {
        opcoes.push({
          id: anexoRec.id,
          anexo: anexoRec.anexo,
          artigo_origem: anexoRec.artigo_origem,
          item: String(anexoRec.item || ''),
          descricao: anexoRec.descricao,
          ncm_sh_termo: termo,
          percentual_reducao_pct: Number(anexoRec.percentual_reducao_pct || 0),
          descricao_reducao: anexoRec.descricao_reducao,
          fonte:
            anexoRec.fonte || 'Presidência da República / Diário Oficial da União (LC 214/2025)',
        })
        break // Já casou com este registro do anexo
      }
    }
  }

  return opcoes
}

/**
 * Sugere cClassTrib da tabela oficial a partir do resultado do enquadramento.
 */
export function sugerirCClassTribParaEnquadramento(
  percentualReducaoPct: number,
  anexo?: string,
  codigoManual?: string,
): ClassificacaoTributariaOficial | undefined {
  if (codigoManual) {
    const item = buscarCClassTrib(codigoManual)
    if (item) return item
  }

  if (percentualReducaoPct === 100) {
    // Cesta Básica ou alíquota zero
    return (
      TABELA_OFICIAL_CCLASSTRIB.find((c) => c.reducaoCbsPct === 100 && c.reducaoIbsPct === 100) ||
      buscarCClassTrib('200001')
    )
  }

  if (percentualReducaoPct === 60) {
    if (anexo?.includes('IV')) {
      // Dispositivos Médicos
      return buscarCClassTrib('100003')
    }
    if (anexo?.includes('VIII')) {
      // Higiene Pessoal Baixa Renda
      return buscarCClassTrib('100005')
    }
    if (anexo?.includes('IX')) {
      // Insumos Agropecuários
      return buscarCClassTrib('100008')
    }
    if (anexo?.includes('VII')) {
      // Alimentos Favorecidos
      return buscarCClassTrib('100009')
    }
    // Redução geral 60%
    return (
      TABELA_OFICIAL_CCLASSTRIB.find((c) => c.reducaoCbsPct === 60 && c.reducaoIbsPct === 60) ||
      buscarCClassTrib('100001')
    )
  }

  // Sem redutor (alíquota cheia)
  return buscarCClassTrib('000001')
}

/**
 * Avalia o enquadramento de um NCM digitado em tempo real.
 */
export async function classificarNcmEmTempoReal(
  ncmDigitado: string,
  opcaoEscolhidaId?: string,
  cClassTribManual?: string,
): Promise<ClassificacaoNcmResult> {
  const ncmLimpo = limparNcm(ncmDigitado)
  const ncmFormatado = formatarMascaraNcm(ncmLimpo)

  if (!ncmLimpo) {
    return {
      ncmLimpo: '',
      ncmFormatado: '',
      status: 'sem_ncm',
      opcoesEncontradas: [],
      percentualReducaoPct: 0,
      rotuloReducao: 'Sem NCM informado — alíquota cheia',
      sugestaoCClassTrib: buscarCClassTrib('000001'),
      codigoCClassTribSugerido: '000001',
    }
  }

  if (ncmLimpo.length < 8) {
    return {
      ncmLimpo,
      ncmFormatado,
      status: 'incompleto',
      opcoesEncontradas: [],
      percentualReducaoPct: 0,
      rotuloReducao: 'NCM incompleto (informe 8 dígitos)',
    }
  }

  const anexos = await carregarAnexosLc214()
  const opcoes = casarNcmComAnexos(ncmLimpo, anexos)

  // Caso 1: Fora de qualquer anexo
  if (opcoes.length === 0) {
    const cClass = sugerirCClassTribParaEnquadramento(0, undefined, cClassTribManual)
    return {
      ncmLimpo,
      ncmFormatado,
      status: 'nao_encontrado',
      opcoesEncontradas: [],
      percentualReducaoPct: 0,
      rotuloReducao: 'Sem redutor — alíquota cheia',
      sugestaoCClassTrib: cClass,
      codigoCClassTribSugerido: cClass?.codigo || '000001',
      fonte: 'Presidência da República / Diário Oficial da União (LC 214/2025)',
    }
  }

  // Caso 2: Ambiguidade (mais de uma opção)
  if (opcoes.length > 1) {
    // Se o usuário já escolheu manualmente uma opção:
    const escolhida = opcaoEscolhidaId ? opcoes.find((o) => o.id === opcaoEscolhidaId) : undefined

    if (escolhida) {
      const cClass = sugerirCClassTribParaEnquadramento(
        escolhida.percentual_reducao_pct,
        escolhida.anexo,
        cClassTribManual,
      )
      return {
        ncmLimpo,
        ncmFormatado,
        status: 'enquadrado',
        opcoesEncontradas: opcoes,
        opcaoSelecionada: escolhida,
        percentualReducaoPct: escolhida.percentual_reducao_pct,
        rotuloReducao: `Redução de ${escolhida.percentual_reducao_pct}% (${escolhida.anexo})`,
        anexo: escolhida.anexo,
        artigoOrigem: escolhida.artigo_origem,
        fonte: escolhida.fonte,
        sugestaoCClassTrib: cClass,
        codigoCClassTribSugerido: cClass?.codigo,
      }
    }

    // Sem escolha manual ainda -> status ambíguo exigindo intervenção
    return {
      ncmLimpo,
      ncmFormatado,
      status: 'ambiguo',
      opcoesEncontradas: opcoes,
      percentualReducaoPct: 0,
      rotuloReducao: `Ambiguidade detectada (${opcoes.length} opções nos anexos — selecione manualmente)`,
      fonte: 'Presidência da República / Diário Oficial da União (LC 214/2025)',
    }
  }

  // Caso 3: Enquadramento único automático
  const unica = opcoes[0]
  const cClass = sugerirCClassTribParaEnquadramento(
    unica.percentual_reducao_pct,
    unica.anexo,
    cClassTribManual,
  )
  return {
    ncmLimpo,
    ncmFormatado,
    status: 'enquadrado',
    opcoesEncontradas: opcoes,
    opcaoSelecionada: unica,
    percentualReducaoPct: unica.percentual_reducao_pct,
    rotuloReducao: `Redução de ${unica.percentual_reducao_pct}% (${unica.anexo})`,
    anexo: unica.anexo,
    artigoOrigem: unica.artigo_origem,
    fonte: unica.fonte,
    sugestaoCClassTrib: cClass,
    codigoCClassTribSugerido: cClass?.codigo,
  }
}
