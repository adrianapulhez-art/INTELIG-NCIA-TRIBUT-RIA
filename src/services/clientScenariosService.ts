import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { TaxStateSnapshot } from '@/contexts/TaxContext'
import { sanitizeSnapshotForPersistence } from './taxScenarios'

export const SCENARIO_SCHEMA_VERSION = 1

export interface AccountingClientRecord {
  id: string
  owner: string
  name: string
  document?: string
  notes?: string
  created: string
  updated: string
  source?: 'cloud' | 'local'
}

export interface ClientSavedScenarioRecord {
  id: string
  owner: string
  client: string
  clientName?: string
  name: string
  scope: string
  schema_version: number
  snapshot: TaxStateSnapshot
  notes?: string
  created: string
  updated: string
  source?: 'cloud' | 'local'
  pendingSync?: boolean
}

const LOCAL_STORAGE_CLIENTS_KEY = 'it_accounting_clients_v1'
const LOCAL_STORAGE_SCENARIOS_KEY = 'it_client_saved_scenarios_v1'

// ==========================================
// RESILIÊNCIA OFF-LINE / LOCAL STORAGE HELPERS
// ==========================================

export function getLocalClients(): AccountingClientRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.warn('Erro ao ler clientes do localStorage:', err)
    return []
  }
}

export function saveLocalClients(clients: AccountingClientRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(clients))
  } catch (err) {
    console.warn('Erro ao salvar clientes no localStorage:', err)
  }
}

export function getLocalClientScenarios(): ClientSavedScenarioRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SCENARIOS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        ...item,
        snapshot: sanitizeSnapshotForPersistence(item.snapshot),
      }))
    }
    return []
  } catch (err) {
    console.warn('Erro ao ler cenários de clientes do localStorage:', err)
    return []
  }
}

export function saveLocalClientScenarios(scenarios: ClientSavedScenarioRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_SCENARIOS_KEY, JSON.stringify(scenarios))
  } catch (err) {
    console.warn('Erro ao salvar cenários de clientes no localStorage:', err)
  }
}

function formatClientRecord(rec: RecordModel): AccountingClientRecord {
  return {
    id: rec.id,
    owner: rec.owner,
    name: rec.name || '',
    document: rec.document || '',
    notes: rec.notes || '',
    created: rec.created,
    updated: rec.updated,
    source: 'cloud',
  }
}

function formatScenarioRecord(rec: RecordModel): ClientSavedScenarioRecord {
  let snap: TaxStateSnapshot
  try {
    snap = typeof rec.snapshot === 'string' ? JSON.parse(rec.snapshot) : rec.snapshot
  } catch {
    snap = {} as TaxStateSnapshot
  }

  // Tenta extrair o nome do cliente expandido se veio via ?expand=client
  const expandedClient = rec.expand?.client as RecordModel | undefined
  const clientName = expandedClient?.name

  return {
    id: rec.id,
    owner: rec.owner,
    client: rec.client,
    clientName,
    name: rec.name || '',
    scope: rec.scope || 'despesas-operacionais',
    schema_version: rec.schema_version || SCENARIO_SCHEMA_VERSION,
    snapshot: sanitizeSnapshotForPersistence(snap),
    notes: rec.notes || '',
    created: rec.created,
    updated: rec.updated,
    source: 'cloud',
  }
}

// ==========================================
// CLIENTES (CLIENTS) API & OFFLINE-FIRST
// ==========================================

export async function listClients(): Promise<AccountingClientRecord[]> {
  const localList = getLocalClients()
  const isAuth = Boolean(pb.authStore.isValid && pb.authStore.record?.id)

  if (!isAuth) {
    return localList.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  try {
    const records = await pb.collection('clients').getFullList({
      sort: 'name',
    })
    const cloudList = records.map(formatClientRecord)

    // Preserva eventuais clientes criados offline
    const cloudIds = new Set(cloudList.map((c) => c.id))
    const localOnly = localList.filter((l) => !cloudIds.has(l.id))
    const merged = [...cloudList, ...localOnly]
    saveLocalClients(merged)

    return merged.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  } catch (err) {
    console.warn('Falha ao buscar clientes do PocketBase, usando cache local:', err)
    return localList.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }
}

export async function createClient(data: {
  name: string
  document?: string
  notes?: string
}): Promise<{ record: AccountingClientRecord; synced: boolean }> {
  const cleanName = data.name.trim()
  const cleanDoc = data.document?.trim() || ''
  const cleanNotes = data.notes?.trim() || ''
  const authUserId = pb.authStore.record?.id
  const now = new Date().toISOString()

  if (authUserId) {
    try {
      const record = await pb.collection('clients').create({
        owner: authUserId,
        name: cleanName,
        document: cleanDoc,
        notes: cleanNotes,
      })
      const formatted = formatClientRecord(record)
      const current = getLocalClients().filter((c) => c.id !== formatted.id)
      saveLocalClients([...current, formatted])
      return { record: formatted, synced: true }
    } catch (err) {
      console.warn('Erro ao criar cliente no servidor PocketBase, criando localmente:', err)
    }
  }

  // Fallback offline / sem auth
  const localRecord: AccountingClientRecord = {
    id: `client-local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    owner: authUserId || 'local_user',
    name: cleanName,
    document: cleanDoc,
    notes: cleanNotes,
    created: now,
    updated: now,
    source: 'local',
  }
  const current = getLocalClients().filter((c) => c.id !== localRecord.id)
  saveLocalClients([...current, localRecord])
  return { record: localRecord, synced: false }
}

// ==========================================
// CENÁRIOS POR CLIENTE (SAVED_SCENARIOS)
// ==========================================

export async function listClientScenarios(clientId?: string): Promise<ClientSavedScenarioRecord[]> {
  const localList = getLocalClientScenarios()
  const isAuth = Boolean(pb.authStore.isValid && pb.authStore.record?.id)

  const filterLocals = (list: ClientSavedScenarioRecord[]) =>
    clientId ? list.filter((s) => s.client === clientId) : list

  if (!isAuth) {
    return filterLocals(localList).sort(
      (a, b) =>
        new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime(),
    )
  }

  try {
    const filter = clientId ? `client = "${clientId}"` : ''
    const records = await pb.collection('saved_scenarios').getFullList({
      filter: filter || undefined,
      sort: '-updated',
      expand: 'client',
    })
    const cloudList = records.map(formatScenarioRecord)

    // Mescla com locais exclusivos ou pendentes de sincronização
    const cloudIds = new Set(cloudList.map((c) => c.id))
    const localOnly = localList.filter((l) => !cloudIds.has(l.id))
    const merged = [...cloudList, ...localOnly]
    saveLocalClientScenarios(merged)

    // Tenta sincronizar registros locais pendentes em background se houver
    syncPendingScenarios().catch((err) =>
      console.warn('Tentativa de sincronização em background falhou:', err),
    )

    return filterLocals(merged).sort(
      (a, b) =>
        new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime(),
    )
  } catch (err) {
    console.warn('Falha ao listar cenários do servidor PocketBase, usando cache local:', err)
    return filterLocals(localList).sort(
      (a, b) =>
        new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime(),
    )
  }
}

export async function createClientScenario(params: {
  clientId: string
  clientName?: string
  name: string
  snapshot: TaxStateSnapshot
  scope?: string
  notes?: string
}): Promise<{ record: ClientSavedScenarioRecord; synced: boolean }> {
  const cleanName = params.name.trim()
  const authUserId = pb.authStore.record?.id
  const now = new Date().toISOString()
  const cleanSnapshot = sanitizeSnapshotForPersistence(params.snapshot)
  const scope = params.scope || 'despesas-operacionais'
  const notes = params.notes?.trim() || ''

  // Se o cliente for local (ainda não sincronizado no PocketBase) ou se offline, tenta criar cliente primeiro
  let actualClientId = params.clientId

  if (authUserId) {
    // Se o clientId for temporário local, tenta subir o cliente antes
    if (actualClientId.startsWith('client-local-')) {
      const localClient = getLocalClients().find((c) => c.id === actualClientId)
      if (localClient) {
        try {
          const syncedClient = await pb.collection('clients').create({
            owner: authUserId,
            name: localClient.name,
            document: localClient.document || '',
            notes: localClient.notes || '',
          })
          actualClientId = syncedClient.id
          // Atualiza id do cliente no local storage
          const updatedClients = getLocalClients().map((c) =>
            c.id === localClient.id ? formatClientRecord(syncedClient) : c,
          )
          saveLocalClients(updatedClients)
        } catch (err) {
          console.warn('Não foi possível promover o cliente para a nuvem no momento:', err)
        }
      }
    }

    if (!actualClientId.startsWith('client-local-')) {
      try {
        const record = await pb.collection('saved_scenarios').create({
          owner: authUserId,
          client: actualClientId,
          name: cleanName,
          scope,
          schema_version: SCENARIO_SCHEMA_VERSION,
          snapshot: cleanSnapshot,
          notes,
        })
        const formatted = formatScenarioRecord(record)
        if (params.clientName) {
          formatted.clientName = params.clientName
        }

        const current = getLocalClientScenarios().filter((s) => s.id !== formatted.id)
        saveLocalClientScenarios([formatted, ...current])
        return { record: formatted, synced: true }
      } catch (err) {
        console.warn('Erro ao salvar cenário no PocketBase, salvando em storage local:', err)
      }
    }
  }

  // Fallback offline / localStorage
  const localRecord: ClientSavedScenarioRecord = {
    id: `scen-client-local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    owner: authUserId || 'local_user',
    client: actualClientId,
    clientName: params.clientName,
    name: cleanName,
    scope,
    schema_version: SCENARIO_SCHEMA_VERSION,
    snapshot: cleanSnapshot,
    notes,
    created: now,
    updated: now,
    source: 'local',
    pendingSync: Boolean(authUserId),
  }

  const current = getLocalClientScenarios().filter((s) => s.id !== localRecord.id)
  saveLocalClientScenarios([localRecord, ...current])
  return { record: localRecord, synced: false }
}

export async function deleteClientScenario(id: string): Promise<boolean> {
  const localList = getLocalClientScenarios()
  const filtered = localList.filter((s) => s.id !== id)
  saveLocalClientScenarios(filtered)

  if (!id.startsWith('scen-client-local-') && pb.authStore.isValid) {
    try {
      await pb.collection('saved_scenarios').delete(id)
    } catch (err) {
      console.warn('Erro ao excluir no PocketBase (já removido localmente):', err)
    }
  }
  return true
}

/**
 * Tenta sincronizar registros que ficaram pendentes no localStorage quando houve queda de rede.
 */
export async function syncPendingScenarios(): Promise<number> {
  const isAuth = Boolean(pb.authStore.isValid && pb.authStore.record?.id)
  if (!isAuth) return 0

  const localList = getLocalClientScenarios()
  const pending = localList.filter((s) => s.pendingSync || s.id.startsWith('scen-client-local-'))
  if (pending.length === 0) return 0

  let syncedCount = 0
  const authUserId = pb.authStore.record!.id

  for (const item of pending) {
    try {
      let targetClientId = item.client
      if (targetClientId.startsWith('client-local-')) {
        const localCli = getLocalClients().find((c) => c.id === targetClientId)
        if (localCli) {
          const createdCli = await pb.collection('clients').create({
            owner: authUserId,
            name: localCli.name,
            document: localCli.document || '',
            notes: localCli.notes || '',
          })
          targetClientId = createdCli.id
        }
      }

      if (!targetClientId.startsWith('client-local-')) {
        const created = await pb.collection('saved_scenarios').create({
          owner: authUserId,
          client: targetClientId,
          name: item.name,
          scope: item.scope || 'despesas-operacionais',
          schema_version: item.schema_version || SCENARIO_SCHEMA_VERSION,
          snapshot: item.snapshot,
          notes: item.notes || '',
        })
        const formatted = formatScenarioRecord(created)
        formatted.clientName = item.clientName

        // Substitui o registro local pelo sincronizado da nuvem
        const currentList = getLocalClientScenarios()
        const index = currentList.findIndex((x) => x.id === item.id)
        if (index >= 0) {
          currentList[index] = formatted
        } else {
          currentList.push(formatted)
        }
        saveLocalClientScenarios(currentList)
        syncedCount++
      }
    } catch (syncErr) {
      console.warn(`Falha ao sincronizar cenário ${item.name}:`, syncErr)
    }
  }

  return syncedCount
}
