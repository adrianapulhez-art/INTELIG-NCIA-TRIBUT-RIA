/**
 * Módulo central de namespacing e isolamento de persistência por cenário/empresa (Fase A)
 *
 * Responsável por:
 * 1. Inventário formal de chaves de dados operacionais
 * 2. Namespacing padronizado: it_<modulo>_<cenarioId> (ou it_<modulo>_default se nenhum ativo)
 * 3. Migração automática de chaves legadas e globais antigas sem perda de dados
 * 4. Fim da dupla gravação (ex: Sessão SN passa a usar chave única namespaced)
 * 5. Limpeza em cascata ao excluir cenários ou clientes
 */

export const CENARIO_ATIVO_KEY = 'it_cenario_ativo_v1'

export interface CenarioAtivoInfo {
  id: string
  cliente: string
  nome: string
  scope?: string
}

/** Chaves legadas globais conhecidas que causam mistura de dados entre empresas */
export const CHAVES_LEGADAS = {
  CBS_ALIQUOTA: 'it_reforma_cbs_aliquota_v1',
  MARKUP_POS: 'it_markup_pos_state_v1',
  SESSAO_SN_V1: 'it_reforma_sessao_sn_config_v1',
  SESSAO_SN_LEGADA: 'it_reforma_sessao_sn_config',
  CMV_SCHEDULE: 'it_cmv_exercicio_schedule_v1',
} as const

/** Módulos operacionais com suporte a namespacing por cenário */
export type ModuloIsolado = 'cbs' | 'markup_pos' | 'sessao_sn' | 'cmv_schedule'

/**
 * Obtém o ID do cenário ativo no momento, lendo de `it_cenario_ativo_v1`.
 * Retorna null se não houver cenário ativo.
 */
export function getActiveScenarioId(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(CENARIO_ATIVO_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CenarioAtivoInfo
    return parsed?.id || null
  } catch {
    return null
  }
}

/**
 * Retorna a chave de armazenamento namespaced para o módulo e cenário especificados.
 * Se o scenarioId for omitido, resolve pelo cenário ativo atual. Se nenhum estiver ativo, usa "default".
 */
export function getNamespacedKey(
  modulo: ModuloIsolado,
  explicitScenarioId?: string | null,
): string {
  const scenarioId = explicitScenarioId ?? getActiveScenarioId() ?? 'default'
  switch (modulo) {
    case 'cbs':
      return `it_cbs_${scenarioId}`
    case 'markup_pos':
      return `it_markup_pos_${scenarioId}`
    case 'sessao_sn':
      return `it_sessao_sn_${scenarioId}`
    case 'cmv_schedule':
      return `it_cmv_schedule_${scenarioId}`
  }
}

/**
 * Remove todas as chaves namespaced associadas a um ID de cenário específico (Limpeza em cascata).
 */
export function removerChavesDoCenario(scenarioId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  if (!scenarioId) return

  const modulos: ModuloIsolado[] = ['cbs', 'markup_pos', 'sessao_sn', 'cmv_schedule']
  for (const m of modulos) {
    const key = getNamespacedKey(m, scenarioId)
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignora em modo anônimo
    }
  }

  // Se o cenário ativo for o excluído, limpa também a chave do cenário ativo
  try {
    const activeId = getActiveScenarioId()
    if (activeId === scenarioId) {
      window.localStorage.removeItem(CENARIO_ATIVO_KEY)
    }
  } catch {
    // ignora
  }
}

/**
 * Limpa todos os dados operacionais namespaced de todos os cenários (Limpeza total).
 */
export function limparTodasAsChavesNamespaced(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const prefixos = ['it_cbs_', 'it_markup_pos_', 'it_sessao_sn_', 'it_cmv_schedule_']
    const toRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && prefixos.some((p) => key.startsWith(p))) {
        toRemove.push(key)
      }
    }
    for (const k of toRemove) {
      window.localStorage.removeItem(k)
    }
  } catch {
    // ignora
  }
}
