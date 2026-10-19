/**
 * Serviço de acesso e leitura em tempo de execução da Tabela cClassTrib
 * Banco PocketBase: coleções cclasstrib_versoes, cclasstrib_itens, cclasstrib_conferencias.
 *
 * Regras da Adriana:
 * 1. NUNCA inventar dados fiscais.
 * 2. Origem rotulada e auditável (versão, data de publicação, conferência, fonte oficial).
 * 3. Leitura do banco em runtime — percentuais não fixados no código do app.
 * 4. Sem alterar lógicas de cálculo ou valores de ouro.
 */

import pb from '@/lib/pocketbase/client'

export interface CClassTribVersaoRecord {
  id: string
  versao_documento: string
  data_publicacao: string
  data_conferencia: string
  origem_fonte: string
  total_registros: number
  ativa: boolean
  metadados?: {
    arquivo_origem?: string
    snapshot_hash?: string
    responsavel?: string
    chancela?: string
    observacao?: string
  }
  created: string
  updated: string
}

export interface CClassTribItemRecord {
  id: string
  versao: string
  codigo: string
  cst: string
  descricao: string
  reducao_ibs_pct: number
  reducao_cbs_pct: number
  tipo_aliquota?: string
  uso_nfe?: string
  rb_simples_nacional?: string
  fundamento_legal?: string
  created: string
  updated: string
}

export interface CClassTribConferenciaRecord {
  id: string
  data_conferencia: string
  status: 'sem_alteracoes' | 'nova_versao_detectada' | 'erro_conexao' | 'aguardando_chancela'
  versao_local: string
  versao_remota?: string
  fonte_consultada: string
  diff_resumo?: {
    status?: string
    novos?: number
    alterados?: number
    removidos?: number
    mensagem?: string
    versao_vigente?: string
    versao_remota?: string
  }
  chancelada_por_usuario?: boolean
  observacoes?: string
  created: string
  updated: string
}

/**
 * Obtém a versão ativa vigente da Tabela cClassTrib.
 */
export async function obterVersaoAtivaCClassTrib(): Promise<CClassTribVersaoRecord | null> {
  try {
    const record = await pb
      .collection('cclasstrib_versoes')
      .getFirstListItem<CClassTribVersaoRecord>('ativa = true')
    return record
  } catch (err) {
    console.warn('[cClassTribService] Falha ao carregar versão ativa do banco:', err)
    return null
  }
}

/**
 * Lista todas as versões cadastradas (carga versionada).
 */
export async function listarVersoesCClassTrib(): Promise<CClassTribVersaoRecord[]> {
  try {
    const records = await pb
      .collection('cclasstrib_versoes')
      .getFullList<CClassTribVersaoRecord>({ sort: '-created' })
    return records
  } catch (err) {
    console.warn('[cClassTribService] Falha ao listar versões:', err)
    return []
  }
}

/**
 * Lista os itens da cClassTrib de uma versão específica ou da versão ativa.
 */
export async function listarItensCClassTrib(versaoId?: string): Promise<CClassTribItemRecord[]> {
  try {
    let targetVersaoId = versaoId
    if (!targetVersaoId) {
      const versaoAtiva = await obterVersaoAtivaCClassTrib()
      if (versaoAtiva) {
        targetVersaoId = versaoAtiva.id
      }
    }

    const filter = targetVersaoId ? `versao = "${targetVersaoId}"` : ''
    const records = await pb.collection('cclasstrib_itens').getFullList<CClassTribItemRecord>({
      filter: filter || undefined,
      sort: 'codigo',
    })
    return records
  } catch (err) {
    console.warn('[cClassTribService] Falha ao listar itens cClassTrib:', err)
    return []
  }
}

/**
 * Busca um item específico pelo código cClassTrib no banco.
 */
export async function buscarItemPorCodigo(
  codigo: string,
  versaoId?: string,
): Promise<CClassTribItemRecord | null> {
  try {
    let filter = `codigo = "${codigo}"`
    if (versaoId) {
      filter += ` && versao = "${versaoId}"`
    }
    const item = await pb
      .collection('cclasstrib_itens')
      .getFirstListItem<CClassTribItemRecord>(filter)
    return item
  } catch {
    return null
  }
}

/**
 * Lista o histórico de conferências programadas do job.
 */
export async function listarConferenciasCClassTrib(): Promise<CClassTribConferenciaRecord[]> {
  try {
    const records = await pb
      .collection('cclasstrib_conferencias')
      .getFullList<CClassTribConferenciaRecord>({ sort: '-data_conferencia' })
    return records
  } catch (err) {
    console.warn('[cClassTribService] Falha ao listar conferências:', err)
    return []
  }
}

/**
 * Dispara uma conferência sob demanda via backend hook.
 */
export async function dispararConferenciaCClassTrib(): Promise<{
  sucesso: boolean
  versao_local: string
  versao_remota: string
  nova_versao_detectada: boolean
  mensagem: string
}> {
  return await pb.send('/backend/v1/cclasstrib/conferir', {
    method: 'POST',
  })
}
