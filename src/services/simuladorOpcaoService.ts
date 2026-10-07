import pb from '@/lib/pocketbase/client'
import type { SimuladorOpcaoInput, VereditoSimulador } from '@/lib/simuladorOpcaoCalculations'
import { METADADOS_TABELA_CCLASSTRIB } from '@/lib/tabelaOficialCClassTrib'

export interface SimulacaoOpcaoRecord {
  id: string
  owner: string
  nome: string
  categoria_canal: string
  veredito: 'DAS' | 'REGULAR' | 'EMPATE'
  exercicio: number
  economia_mensal: number
  diferenca_semestre: number
  versao_cclasstrib: string
  cenario_json: SimuladorOpcaoInput
  resultado_json: VereditoSimulador
  created: string
  updated: string
}

const LOCAL_STORAGE_KEY = 'it_simulacoes_opcao_fallback'

export function getLocalSimulacoes(): SimulacaoOpcaoRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalSimulacoes(simulacoes: SimulacaoOpcaoRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(simulacoes))
  } catch (e) {
    console.error('Erro salvando simulacao em local storage:', e)
  }
}

/** Salva uma nova simulação (PocketBase com fallback resiliente para localStorage) */
export async function salvarSimulacaoOpcao(
  nome: string,
  cenario: SimuladorOpcaoInput,
  resultado: VereditoSimulador,
): Promise<SimulacaoOpcaoRecord> {
  const userId = pb.authStore.model?.id || 'demo-user-id'
  const novoRegistro: Omit<SimulacaoOpcaoRecord, 'id' | 'created' | 'updated'> = {
    owner: userId,
    nome: nome || cenario.nomeSimulacao || `Simulação ${cenario.exercicio}`,
    categoria_canal: cenario.perfilCanal,
    veredito: resultado.opcaoVencedora,
    exercicio: cenario.exercicio,
    economia_mensal: resultado.economiaMensalizada,
    diferenca_semestre: resultado.diferencaTotalSemestre,
    versao_cclasstrib: METADADOS_TABELA_CCLASSTRIB.versao,
    cenario_json: cenario,
    resultado_json: resultado,
  }

  try {
    if (pb.authStore.isValid && pb.authStore.model?.id) {
      const record = await pb.collection('simulacoes_opcao').create({
        ...novoRegistro,
        owner: pb.authStore.model.id,
      })
      const completo: SimulacaoOpcaoRecord = {
        id: record.id,
        owner: record.owner,
        nome: record.nome,
        categoria_canal: record.categoria_canal,
        veredito: record.veredito,
        exercicio: record.exercicio,
        economia_mensal: record.economia_mensal,
        diferenca_semestre: record.diferenca_semestre,
        versao_cclasstrib: record.versao_cclasstrib,
        cenario_json: record.cenario_json,
        resultado_json: record.resultado_json,
        created: record.created,
        updated: record.updated,
      }
      // Espelha localmente
      const locais = getLocalSimulacoes()
      saveLocalSimulacoes([completo, ...locais.filter((s) => s.id !== completo.id)])
      return completo
    }
  } catch (err) {
    console.warn('PocketBase offline ou não autenticado, salvando localmente:', err)
  }

  // Fallback local
  const mockId = `sim-${Date.now()}`
  const now = new Date().toISOString()
  const fallbackRecord: SimulacaoOpcaoRecord = {
    id: mockId,
    ...novoRegistro,
    created: now,
    updated: now,
  }
  const locais = getLocalSimulacoes()
  saveLocalSimulacoes([fallbackRecord, ...locais])
  return fallbackRecord
}

/** Lista todas as simulações do usuário logado */
export async function listarSimulacoesOpcao(): Promise<SimulacaoOpcaoRecord[]> {
  try {
    if (pb.authStore.isValid && pb.authStore.model?.id) {
      const records = await pb.collection('simulacoes_opcao').getFullList({
        sort: '-created',
        filter: `owner = "${pb.authStore.model.id}"`,
      })
      const mapeados: SimulacaoOpcaoRecord[] = records.map((r: any) => ({
        id: r.id,
        owner: r.owner,
        nome: r.nome,
        categoria_canal: r.categoria_canal,
        veredito: r.veredito,
        exercicio: r.exercicio,
        economia_mensal: r.economia_mensal,
        diferenca_semestre: r.diferenca_semestre,
        versao_cclasstrib: r.versao_cclasstrib,
        cenario_json: r.cenario_json,
        resultado_json: r.resultado_json,
        created: r.created,
        updated: r.updated,
      }))
      if (mapeados.length > 0) {
        saveLocalSimulacoes(mapeados)
        return mapeados
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar simulações no PocketBase, usando cache local:', err)
  }

  return getLocalSimulacoes()
}

/** Exclui uma simulação */
export async function excluirSimulacaoOpcao(id: string): Promise<void> {
  try {
    if (pb.authStore.isValid && pb.authStore.model?.id) {
      await pb.collection('simulacoes_opcao').delete(id)
    }
  } catch (err) {
    console.warn('Erro ao deletar no PocketBase, removendo local:', err)
  }
  const locais = getLocalSimulacoes().filter((s) => s.id !== id)
  saveLocalSimulacoes(locais)
}
