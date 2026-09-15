import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { TaxStateSnapshot } from '@/contexts/TaxContext'

export interface TaxScenarioRecord {
  id: string
  owner: string
  name: string
  data: TaxStateSnapshot
  created: string
  updated: string
  source?: 'cloud' | 'local'
}

const LOCAL_STORAGE_SCENARIOS_KEY = 'it_tax_scenarios_v1'
const LEGACY_STORAGE_SCENARIOS_KEYS = [
  'tax_scenarios_local',
  'saved_tax_scenarios',
  'tax_scenarios',
]

/**
 * Lê cenários armazenados em localStorage com suporte a fallback de chaves legadas.
 */
export function getLocalTaxScenarios(): TaxScenarioRecord[] {
  if (typeof window === 'undefined') return []
  try {
    // 1. Tenta a chave principal
    const raw = localStorage.getItem(LOCAL_STORAGE_SCENARIOS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          source: item.source || 'local',
          data: sanitizeSnapshotForPersistence(item.data),
        }))
      }
    }

    // 2. Tenta chaves legadas se a principal estiver vazia
    for (const legacyKey of LEGACY_STORAGE_SCENARIOS_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey)
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formatted: TaxScenarioRecord[] = parsed.map((item, idx) => ({
              id: item.id || `local-migrated-${Date.now()}-${idx}`,
              owner: item.owner || 'local_user',
              name: item.name || `Cenário ${idx + 1}`,
              data: item.data || item,
              created: item.created || new Date().toISOString(),
              updated: item.updated || new Date().toISOString(),
              source: 'local' as const,
            }))
            // Migra para a chave principal sem apagar
            localStorage.setItem(LOCAL_STORAGE_SCENARIOS_KEY, JSON.stringify(formatted))
            return formatted
          }
        } catch {
          // Ignora erro nessa chave
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar cenários do localStorage:', err)
  }
  return []
}

/**
 * Salva a lista de cenários no localStorage.
 */
export function saveLocalTaxScenarios(scenarios: TaxScenarioRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_SCENARIOS_KEY, JSON.stringify(scenarios))
  } catch (err) {
    console.warn('Erro ao salvar cenários no localStorage:', err)
  }
}

/**
 * Normaliza e sanitiza um TaxStateSnapshot para garantir isolamento e persistência
 * explícita de desiredNetRevenue, cost, costOrigin, manualCostOverride, mode e margin.
 * Migração retrocompatível sem descartar nenhum dado antigo existente.
 */
export function sanitizeSnapshotForPersistence(raw: TaxStateSnapshot | unknown): TaxStateSnapshot {
  if (!raw || typeof raw !== 'object') {
    return raw as TaxStateSnapshot
  }
  const snap = raw as Partial<TaxStateSnapshot>

  // Migração e sanitização suave de desiredLiquidRevenueByRegime
  const rawRL =
    typeof snap.desiredNetRevenue === 'number' && Number.isFinite(snap.desiredNetRevenue)
      ? snap.desiredNetRevenue
      : 0

  const desiredLiquidRevenueByRegime = snap.desiredLiquidRevenueByRegime
    ? {
        simples:
          typeof snap.desiredLiquidRevenueByRegime.simples === 'number' &&
          Number.isFinite(snap.desiredLiquidRevenueByRegime.simples)
            ? snap.desiredLiquidRevenueByRegime.simples
            : rawRL,
        presumido:
          typeof snap.desiredLiquidRevenueByRegime.presumido === 'number' &&
          Number.isFinite(snap.desiredLiquidRevenueByRegime.presumido)
            ? snap.desiredLiquidRevenueByRegime.presumido
            : rawRL,
        real:
          typeof snap.desiredLiquidRevenueByRegime.real === 'number' &&
          Number.isFinite(snap.desiredLiquidRevenueByRegime.real)
            ? snap.desiredLiquidRevenueByRegime.real
            : rawRL,
      }
    : {
        simples: rawRL,
        presumido: rawRL,
        real: rawRL,
      }

  const marginByRegime = snap.marginByRegime
    ? {
        simples:
          snap.marginByRegime.simples !== undefined
            ? Number(snap.marginByRegime.simples)
            : undefined,
        presumido:
          snap.marginByRegime.presumido !== undefined
            ? Number(snap.marginByRegime.presumido)
            : undefined,
        real: snap.marginByRegime.real !== undefined ? Number(snap.marginByRegime.real) : undefined,
      }
    : snap.additionalMargin !== undefined && snap.additionalMargin > 0
      ? {
          simples: snap.additionalMargin,
          presumido: snap.additionalMargin,
          real: snap.additionalMargin,
        }
      : {}

  let markupProducts = snap.markupProducts
  if (Array.isArray(markupProducts)) {
    markupProducts = markupProducts.map((p) => {
      const mode =
        p.mode === 'cost_margin' || p.mode === 'liquid' ? p.mode : snap.markupMode || 'liquid'
      const cost = typeof p.cost === 'number' && Number.isFinite(p.cost) ? p.cost : 0
      let desiredNetRevenue =
        typeof p.desiredNetRevenue === 'number' && Number.isFinite(p.desiredNetRevenue)
          ? p.desiredNetRevenue
          : 0

      // Se cenário legado não salvou desiredNetRevenue separadamente mas estava no modo liquid
      if (
        mode === 'liquid' &&
        desiredNetRevenue === 0 &&
        cost > 0 &&
        (snap.desiredNetRevenue ?? 0) === 0
      ) {
        desiredNetRevenue = cost
      }

      const desiredNetRevenueByRegime = p.desiredNetRevenueByRegime
        ? {
            simples:
              p.desiredNetRevenueByRegime.simples !== undefined
                ? Number(p.desiredNetRevenueByRegime.simples)
                : undefined,
            presumido:
              p.desiredNetRevenueByRegime.presumido !== undefined
                ? Number(p.desiredNetRevenueByRegime.presumido)
                : undefined,
            real:
              p.desiredNetRevenueByRegime.real !== undefined
                ? Number(p.desiredNetRevenueByRegime.real)
                : undefined,
          }
        : desiredNetRevenue > 0
          ? {
              simples: desiredNetRevenue,
              presumido: desiredNetRevenue,
              real: desiredNetRevenue,
            }
          : {}

      const rawMargin = typeof p.margin === 'number' && Number.isFinite(p.margin) ? p.margin : 0
      const pMarginByRegime = p.marginByRegime
        ? {
            simples:
              p.marginByRegime.simples !== undefined ? Number(p.marginByRegime.simples) : undefined,
            presumido:
              p.marginByRegime.presumido !== undefined
                ? Number(p.marginByRegime.presumido)
                : undefined,
            real: p.marginByRegime.real !== undefined ? Number(p.marginByRegime.real) : undefined,
          }
        : rawMargin > 0
          ? {
              simples: rawMargin,
              presumido: rawMargin,
              real: rawMargin,
            }
          : marginByRegime

      return {
        ...p,
        mode,
        desiredNetRevenue,
        desiredNetRevenueByRegime,
        marginByRegime: pMarginByRegime,
        cost,
        costOrigin: p.costOrigin || (p.purchaseItemId ? 'purchases' : 'manual'),
        manualCostOverride: p.manualCostOverride,
        margin: rawMargin,
      }
    })
  }

  return {
    ...snap,
    desiredLiquidRevenueByRegime,
    marginByRegime,
    markupProducts,
  } as TaxStateSnapshot
}

function formatScenarioRecord(record: RecordModel): TaxScenarioRecord {
  const parsedData = (
    typeof record.data === 'string' ? JSON.parse(record.data) : record.data
  ) as TaxStateSnapshot
  return {
    id: record.id,
    owner: record.owner,
    name: record.name,
    data: sanitizeSnapshotForPersistence(parsedData),
    created: record.created,
    updated: record.updated,
    source: 'cloud',
  }
}

/**
 * Lista todos os cenários.
 * Tenta buscar no PocketBase na nuvem. Se houver erro de rede ou usuário não logado,
 * usa os cenários armazenados em localStorage.
 * Combina ambos garantindo que nenhum cenário seja perdido e que mais de 10+ cenários sejam suportados sem limite artificial.
 */
export async function listTaxScenarios(): Promise<TaxScenarioRecord[]> {
  const localList = getLocalTaxScenarios()
  const isAuth = Boolean(pb.authStore.isValid && pb.authStore.record?.id)

  if (!isAuth) {
    return localList.sort(
      (a, b) =>
        new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime(),
    )
  }

  try {
    // getFullList busca todos os registros sem truncar em 10 ou 30 itens
    const records = await pb.collection('tax_scenarios').getFullList({
      sort: '-updated',
    })
    const cloudList = records.map(formatScenarioRecord)

    // Mescla nuvem com local (se houver cenários locais não sincronizados, mantém acessíveis)
    const cloudIds = new Set(cloudList.map((c) => c.id))
    const localOnly = localList.filter((l) => !cloudIds.has(l.id))

    // Atualiza o cache local com os da nuvem + locais exclusivos
    const merged = [...cloudList, ...localOnly]
    saveLocalTaxScenarios(merged)

    return merged.sort(
      (a, b) =>
        new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime(),
    )
  } catch (err) {
    console.warn('Falha ao listar cenários do servidor PocketBase, usando cache local:', err)
    return localList.sort(
      (a, b) =>
        new Date(b.updated || b.created).getTime() - new Date(a.updated || a.created).getTime(),
    )
  }
}

/**
 * Busca um cenário específico por ID (tenta nuvem e depois local).
 */
export async function getTaxScenario(id: string): Promise<TaxScenarioRecord> {
  try {
    const record = await pb.collection('tax_scenarios').getOne(id)
    return formatScenarioRecord(record)
  } catch {
    const localList = getLocalTaxScenarios()
    const found = localList.find((s) => s.id === id)
    if (found) return found
    throw new Error('Cenário não encontrado.')
  }
}

/**
 * Cria um novo cenário tributário.
 * Tenta salvar no PocketBase (se autenticado); caso ocorra falha de rede ou sem auth,
 * salva no localStorage mantendo integridade e disponibilidade total.
 */
export async function createTaxScenario(
  name: string,
  snapshot: TaxStateSnapshot,
): Promise<TaxScenarioRecord> {
  const cleanName = name.trim()
  const authUserId = pb.authStore.record?.id
  const now = new Date().toISOString()

  // Se logado, tenta criar no PocketBase
  if (authUserId) {
    try {
      const record = await pb.collection('tax_scenarios').create({
        owner: authUserId,
        name: cleanName,
        data: snapshot,
      })
      const formatted = formatScenarioRecord(record)
      // Atualiza lista local
      const currentLocals = getLocalTaxScenarios().filter((s) => s.id !== formatted.id)
      saveLocalTaxScenarios([formatted, ...currentLocals])
      return formatted
    } catch (err) {
      console.warn('Erro ao salvar cenário no servidor, salvando em storage local:', err)
    }
  }

  // Fallback local se não autenticado ou se PocketBase falhar
  const localRecord: TaxScenarioRecord = {
    id: `scen-local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    owner: authUserId || 'local_user',
    name: cleanName,
    data: sanitizeSnapshotForPersistence(snapshot),
    created: now,
    updated: now,
    source: 'local',
  }
  const currentLocals = getLocalTaxScenarios().filter((s) => s.id !== localRecord.id)
  saveLocalTaxScenarios([localRecord, ...currentLocals])
  return localRecord
}

/**
 * Atualiza os dados e/ou nome de um cenário existente.
 */
export async function updateTaxScenario(
  id: string,
  updates: { name?: string; data?: TaxStateSnapshot },
): Promise<TaxScenarioRecord> {
  const now = new Date().toISOString()
  let updatedRecord: TaxScenarioRecord | null = null

  // Tenta atualizar no PocketBase se não for um id puramente local
  if (!id.startsWith('scen-local-') && pb.authStore.isValid) {
    try {
      const payload: Record<string, unknown> = {}
      if (updates.name !== undefined) {
        payload.name = updates.name.trim()
      }
      if (updates.data !== undefined) {
        payload.data = updates.data
      }

      const record = await pb.collection('tax_scenarios').update(id, payload)
      updatedRecord = formatScenarioRecord(record)
    } catch (err) {
      console.warn('Erro ao atualizar no PocketBase, atualizando localmente:', err)
    }
  }

  // Atualiza no localStorage
  const localList = getLocalTaxScenarios()
  const foundIndex = localList.findIndex((s) => s.id === id)

  if (foundIndex >= 0) {
    const existing = localList[foundIndex]
    const localUpdated: TaxScenarioRecord = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      data:
        updates.data !== undefined ? sanitizeSnapshotForPersistence(updates.data) : existing.data,
      updated: now,
    }
    localList[foundIndex] = localUpdated
    saveLocalTaxScenarios(localList)
    if (!updatedRecord) {
      updatedRecord = localUpdated
    }
  } else if (updatedRecord) {
    saveLocalTaxScenarios([updatedRecord, ...localList])
  }

  if (updatedRecord) return updatedRecord
  throw new Error('Não foi possível atualizar o cenário especificado.')
}

/**
 * Exclui um cenário existente.
 */
export async function deleteTaxScenario(id: string): Promise<boolean> {
  // Remove do localStorage primeiro
  const localList = getLocalTaxScenarios()
  const filtered = localList.filter((s) => s.id !== id)
  saveLocalTaxScenarios(filtered)

  // Se não for id puramente local, remove do PocketBase
  if (!id.startsWith('scen-local-') && pb.authStore.isValid) {
    try {
      await pb.collection('tax_scenarios').delete(id)
    } catch (err) {
      console.warn('Erro ao excluir no PocketBase (já removido localmente):', err)
    }
  }

  return true
}
