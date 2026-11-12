/**
 * TOMBSTONES DE EXCLUSÃO (Fase de resiliência de delete, 2026)
 *
 * Problema resolvido: cenários deletados voltavam a aparecer. O delete local
 * sempre funcionava, mas o delete no PocketBase podia falhar silenciosamente
 * (rede, regra de API) e o merge offline-first de `listClientScenarios` /
 * `listTaxScenarios` regravava o registro da nuvem no localStorage — ressurreição.
 *
 * Mecanismo:
 * 1. Ao apagar, o id vai para uma lista local de "tombstones" (com timestamp).
 * 2. No merge, registro da nuvem cujo id está nos tombstones NÃO é regravado
 *    nem exibido — e o delete na nuvem é tentado de novo (retry).
 * 3. O tombstone é removido só quando a exclusão na nuvem é confirmada.
 */

const TOMBSTONES_KEY = 'it_deletion_tombstones_v1'

export interface DeletionTombstone {
  /** Id do registro deletado. */
  id: string
  /** Coleção de origem ('saved_scenarios' | 'tax_scenarios' | 'clients'). */
  collection: 'saved_scenarios' | 'tax_scenarios' | 'clients'
  /** ISO — momento da exclusão. */
  at: string
}

function readTombstones(): DeletionTombstone[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t) => t && typeof t.id === 'string') : []
  } catch (err) {
    console.warn('Erro ao ler tombstones de exclusão:', err)
    return []
  }
}

function writeTombstones(list: DeletionTombstone[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(list))
  } catch (err) {
    console.warn('Erro ao salvar tombstones de exclusão:', err)
  }
}

/** Registra que um id foi deletado localmente (aguardando confirmação da nuvem). */
export function addDeletionTombstone(
  id: string,
  collection: DeletionTombstone['collection'],
): void {
  if (!id) return
  const list = readTombstones().filter((t) => !(t.id === id && t.collection === collection))
  list.push({ id, collection, at: new Date().toISOString() })
  writeTombstones(list)
}

/** Remove o tombstone — chamado SOMENTE quando a exclusão na nuvem é confirmada. */
export function removeDeletionTombstone(
  id: string,
  collection: DeletionTombstone['collection'],
): void {
  const list = readTombstones().filter((t) => !(t.id === id && t.collection === collection))
  writeTombstones(list)
}

/** Verifica se um id está tombstoned numa coleção. */
export function isDeletionTombstoned(
  id: string,
  collection: DeletionTombstone['collection'],
): boolean {
  return readTombstones().some((t) => t.id === id && t.collection === collection)
}

/** Lista todos os tombstones de uma coleção (para retry em lote no merge). */
export function getDeletionTombstones(
  collection: DeletionTombstone['collection'],
): DeletionTombstone[] {
  return readTombstones().filter((t) => t.collection === collection)
}
