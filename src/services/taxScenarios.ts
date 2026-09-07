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
}

function formatScenarioRecord(record: RecordModel): TaxScenarioRecord {
  return {
    id: record.id,
    owner: record.owner,
    name: record.name,
    data: (typeof record.data === 'string'
      ? JSON.parse(record.data)
      : record.data) as TaxStateSnapshot,
    created: record.created,
    updated: record.updated,
  }
}

/**
 * Lista todos os cenários do usuário autenticado (ordenados pelo mais recentemente atualizado).
 */
export async function listTaxScenarios(): Promise<TaxScenarioRecord[]> {
  const records = await pb.collection('tax_scenarios').getFullList({
    sort: '-updated',
  })
  return records.map(formatScenarioRecord)
}

/**
 * Busca um cenário específico por ID.
 */
export async function getTaxScenario(id: string): Promise<TaxScenarioRecord> {
  const record = await pb.collection('tax_scenarios').getOne(id)
  return formatScenarioRecord(record)
}

/**
 * Cria um novo cenário tributário para o usuário logado.
 */
export async function createTaxScenario(
  name: string,
  snapshot: TaxStateSnapshot,
): Promise<TaxScenarioRecord> {
  const authUserId = pb.authStore.record?.id
  if (!authUserId) {
    throw new Error('Usuário não autenticado.')
  }

  const record = await pb.collection('tax_scenarios').create({
    owner: authUserId,
    name: name.trim(),
    data: snapshot,
  })

  return formatScenarioRecord(record)
}

/**
 * Atualiza os dados e/ou nome de um cenário existente.
 */
export async function updateTaxScenario(
  id: string,
  updates: { name?: string; data?: TaxStateSnapshot },
): Promise<TaxScenarioRecord> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) {
    payload.name = updates.name.trim()
  }
  if (updates.data !== undefined) {
    payload.data = updates.data
  }

  const record = await pb.collection('tax_scenarios').update(id, payload)
  return formatScenarioRecord(record)
}

/**
 * Exclui um cenário existente.
 */
export async function deleteTaxScenario(id: string): Promise<boolean> {
  return await pb.collection('tax_scenarios').delete(id)
}
