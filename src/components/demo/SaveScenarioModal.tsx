import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Save,
  Building2,
  Plus,
  FolderOpen,
  Trash2,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  WifiOff,
  Search,
  ChevronRight,
  Sparkles,
  FileText,
  Check,
  X,
  Undo2,
  History,
} from 'lucide-react'
import { useTaxContext } from '@/contexts/TaxContext'
import {
  listClients,
  createClient,
  deleteClient,
  listClientScenarios,
  createClientScenario,
  updateClientScenario,
  updateClientScenarioWithVersion,
  updateScenarioVersionNote,
  deleteScenarioVersion,
  deleteClientScenario,
  AccountingClientRecord,
  ClientSavedScenarioRecord,
  type ScenarioVersion,
} from '@/services/clientScenariosService'
import { PurchaseItem } from '@/contexts/TaxContext'
import {
  formatBRL,
  formatNumberBR,
  calculatePurchaseItemGrossTotal,
  calculatePurchaseItemNetPurchases,
} from '@/lib/taxCalculations'
interface SaveScenarioModalProps {
  isOpen: boolean
  onClose: () => void
  scope?: string
  initialTab?: 'gravar' | 'historico'
}

export const SaveScenarioModal: React.FC<SaveScenarioModalProps> = ({
  isOpen,
  onClose,
  scope = 'despesas-operacionais',
  initialTab = 'gravar',
}) => {
  const {
    getSnapshot,
    loadSnapshot,
    ativarCenario,
    totalOperatingExpenses,
    totalOperatingRevenues,
    regime,
    markupProducts,
    totalConsolidatedRevenue,
    totalConsolidatedQuantity,
    totalConsolidatedCost,
    purchasesItems,
    totalPurchasesQuantity,
    totalPurchasesMerchandise,
    calculatedProductStock,
  } = useTaxContext()

  // Abas do modal — BOTÕES MATRIZ (CEO, 02/10): cada aba é uma MATRIZ por escopo
  // (compras · markup · despesas-operacionais); dentro dela, a listagem por linha.
  const [activeTab, setActiveTab] = useState<
    'compras' | 'markup' | 'despesas-operacionais' | 'gravar'
  >('gravar')

  // Clientes
  const [clients, setClients] = useState<AccountingClientRecord[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false)

  // Criação inline de cliente
  const [isCreatingClientInline, setIsCreatingClientInline] = useState<boolean>(false)
  const [newClientName, setNewClientName] = useState<string>('')
  const [newClientDoc, setNewClientDoc] = useState<string>('')
  const [isSavingClient, setIsSavingClient] = useState<boolean>(false)

  // Gravação de cenário
  const [scenarioName, setScenarioName] = useState<string>('')
  const [scenarioNotes, setScenarioNotes] = useState<string>('')
  const [isSavingScenario, setIsSavingScenario] = useState<boolean>(false)

  // F2 — ATUALIZAR SIMULAÇÃO EXISTENTE (CEO, 02/10): destino do salvamento +
  // simulação-alvo + nota da versão
  const [saveDest, setSaveDest] = useState<'nova' | 'atualizar'>('nova')
  const [targetScenarioId, setTargetScenarioId] = useState<string>('')
  const [versionNote, setVersionNote] = useState<string>('')

  // Listagem de cenários
  const [scenarios, setScenarios] = useState<ClientSavedScenarioRecord[]>([])
  const [isLoadingScenarios, setIsLoadingScenarios] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Exclusão e Restauração
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [restoredId, setRestoredId] = useState<string | null>(null)

  // Feedback Toast interno
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)

  // CEO 02/10: SUCESSO fica visível ATÉ o usuário fechar (sem timeout) — o usuário
  // precisa da certeza de que gravou. Erro/aviso continuam com auto-dismiss.
  const showFeedback = (type: 'success' | 'warning' | 'error', message: string) => {
    setFeedback({ type, message })
    if (type !== 'success') {
      setTimeout(() => {
        setFeedback(null)
      }, 4500)
    }
  }

  // Gerador de nome padrão do cenário com base no escopo e data
  const getDefaultScenarioName = useCallback(() => {
    const d = new Date()
    const dateStr = d.toLocaleDateString('pt-BR')
    if (scope === 'markup') {
      return `Cenário Markup e Precificação — ${dateStr}`
    } else if (scope === 'compras') {
      return `Cenário Compras de Mercadorias — ${dateStr}`
    }
    return `Cenário Despesas Operacionais — ${dateStr}`
  }, [scope])

  // Edição inline de nome de cenário
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)
  const [editingScenarioName, setEditingScenarioName] = useState<string>('')
  const [isSavingScenarioName, setIsSavingScenarioName] = useState<boolean>(false)

  // Confirmação modal de exclusão de cenário
  const [confirmDeleteScenario, setConfirmDeleteScenario] = useState<{
    id: string
    name: string
  } | null>(null)

  // Confirmação modal de exclusão de cliente
  const [confirmDeleteClient, setConfirmDeleteClient] = useState<{
    id: string
    name: string
    scenarioCount: number
  } | null>(null)
  const [isDeletingClient, setIsDeletingClient] = useState<boolean>(false)

  // Edição inline de nota de versão de salvamento
  const [editingVersion, setEditingVersion] = useState<{ id: string; n: number } | null>(null)
  const [editingVersionNote, setEditingVersionNote] = useState<string>('')
  const [isSavingVersionNote, setIsSavingVersionNote] = useState<boolean>(false)

  // Carregar lista de clientes
  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true)
    try {
      const data = await listClients()
      setClients(data)
      setSelectedClientId((current) => {
        if (current && data.some((c) => c.id === current)) {
          return current
        }
        return data.length > 0 ? data[0].id : ''
      })
    } catch (err) {
      console.warn('Erro ao carregar clientes:', err)
    } finally {
      setIsLoadingClients(false)
    }
  }, [])

  // Carregar lista de cenários
  const fetchScenarios = useCallback(async () => {
    setIsLoadingScenarios(true)
    try {
      const data = await listClientScenarios()
      setScenarios(data)
    } catch (err) {
      console.warn('Erro ao carregar cenários:', err)
    } finally {
      setIsLoadingScenarios(false)
    }
  }, [])

  // Atualizar dados ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      fetchClients()
      fetchScenarios()
      setActiveTab('gravar')
      setScenarioName(getDefaultScenarioName())
      setScenarioNotes('')
      setIsCreatingClientInline(false)
      setEditingScenarioId(null)
      setEditingScenarioName('')
      setConfirmDeleteScenario(null)
      setConfirmDeleteClient(null)
      setEditingVersion(null)
      setEditingVersionNote('')
      setFeedback(null)
    }
  }, [isOpen, fetchClients, fetchScenarios, getDefaultScenarioName, initialTab])

  // Criar cliente inline
  const handleCreateClientInline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const name = newClientName.trim()
    if (!name) {
      showFeedback('error', 'Informe o nome ou razão social do cliente.')
      return
    }

    setIsSavingClient(true)
    try {
      const result = await createClient({
        name,
        document: newClientDoc.trim() || undefined,
      })

      const newCli = result.record
      setClients((prev) => [newCli, ...prev.filter((c) => c.id !== newCli.id)])
      setSelectedClientId(newCli.id)
      setIsCreatingClientInline(false)
      setNewClientName('')
      setNewClientDoc('')

      if (result.synced) {
        showFeedback('success', `Cliente "${newCli.name}" cadastrado na nuvem com sucesso!`)
      } else {
        showFeedback(
          'warning',
          `Cliente "${newCli.name}" salvo localmente — sincroniza quando houver conexão.`,
        )
      }
    } catch (err) {
      console.error('Erro ao salvar cliente inline:', err)
      showFeedback('error', 'Falha ao cadastrar cliente.')
    } finally {
      setIsSavingClient(false)
    }
  }

  // Gravar cenário
  const handleSaveScenario = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const name = scenarioName.trim()
    if (!name) {
      showFeedback('error', 'Defina um nome identificador para o cenário.')
      return
    }

    if (!selectedClientId) {
      showFeedback(
        'error',
        'Selecione um cliente do escritório ou crie um novo antes de gravar o cenário.',
      )
      return
    }

    const currentClient = clients.find((c) => c.id === selectedClientId)
    const clientName = currentClient?.name || 'Cliente'

    setIsSavingScenario(true)
    try {
      const snapshot = getSnapshot()

      // F2 — ATUALIZAR simulação existente: empilha versão nova (nada é sobrescrito).
      // CEO 02/10 (ajuste 4): botão ATUALIZAR sempre ativo — campos faltantes viram
      // feedback na tela, não botão desabilitado.
      if (saveDest === 'atualizar') {
        if (!targetScenarioId) {
          setIsSavingScenario(false)
          showFeedback('error', 'Escolha a simulação a atualizar antes de gravar.')
          return
        }
        if (!versionNote.trim()) {
          setIsSavingScenario(false)
          showFeedback('error', 'Escreva a nota da versão — o que mudou nesta atualização.')
          return
        }
        const target = scenarios.find((s) => s.id === targetScenarioId)
        const result = await updateClientScenarioWithVersion({
          id: targetScenarioId,
          snapshot,
          versionNote: versionNote.trim(),
          scope,
          notes: scenarioNotes.trim() || undefined,
        })

        setScenarios((prev) => prev.map((s) => (s.id === result.record.id ? result.record : s)))

        const nextN = result.version.n
        if (result.synced) {
          showFeedback(
            'success',
            `✅ CENÁRIO ATUALIZADO E SALVO: "${target?.name || name}" agora está na versão v${nextN} — a versão anterior (v${nextN - 1}) continua preservada na listagem.`,
          )
        } else {
          showFeedback(
            'warning',
            `✅ CENÁRIO ATUALIZADO E SALVO localmente: "${target?.name || name}" está na versão v${nextN} — sincroniza com a nuvem quando houver conexão.`,
          )
        }
        setVersionNote('')
        // CEO 02/10: NÃO alterna de aba — o usuário fica vendo a confirmação
        return
      }

      const result = await createClientScenario({
        clientId: selectedClientId,
        clientName,
        name,
        snapshot,
        scope,
        notes: scenarioNotes.trim() || undefined,
      })

      // Atualiza lista de cenários
      setScenarios((prev) => [result.record, ...prev.filter((s) => s.id !== result.record.id)])

      if (result.synced) {
        showFeedback(
          'success',
          `✅ CENÁRIO GRAVADO E SALVO: "${result.record.name}" entrou na listagem do cliente ${clientName}!`,
        )
      } else {
        showFeedback(
          'success',
          '✅ CENÁRIO GRAVADO E SALVO localmente — sincroniza quando houver conexão com o servidor.',
        )
      }

      // CEO 02/10: NÃO alterna de aba — o usuário fica vendo a confirmação
    } catch (err) {
      console.error('Erro ao gravar cenário:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao gravar cenário.'
      showFeedback('error', `Falha ao gravar cenário: ${msg}`)
    } finally {
      setIsSavingScenario(false)
    }
  }

  // Restaurar cenário para a tela — agora ATIVA: persiste no navegador + hidrata no boot
  const handleRestore = (item: ClientSavedScenarioRecord) => {
    try {
      ativarCenario({
        id: item.id,
        cliente: item.clientName || 'Cliente',
        nome: item.name,
        snapshot: item.snapshot,
      })
      setRestoredId(item.id)
      const clientLabel = item.clientName ? ` (Cliente: ${item.clientName})` : ''
      showFeedback(
        'success',
        `Cenário "${item.name}"${clientLabel} restaurado com sucesso no formulário e DREs!`,
      )
      setTimeout(() => setRestoredId(null), 3000)
    } catch (err) {
      console.error('Erro ao restaurar cenário:', err)
      showFeedback('error', 'Não foi possível restaurar o snapshot deste cenário.')
    }
  }

  // CEO 02/10 (ajuste 5): GESTÃO POR SALVAMENTO (data) — cada versão vira linha com
  // RESTAURAR · ABRIR (memória) · DELETAR.
  const [confirmDeleteVersion, setConfirmDeleteVersion] = useState<{
    id: string
    name: string
    n: number
  } | null>(null)
  const [isDeletingVersion, setIsDeletingVersion] = useState<boolean>(false)
  // Memória de cálculo do salvamento: linha em inspeção (v = null → estado atual)
  const [memoryRow, setMemoryRow] = useState<{
    sc: ClientSavedScenarioRecord
    v: ScenarioVersion | null
  } | null>(null)

  const handleConfirmDeleteVersion = async () => {
    if (!confirmDeleteVersion) return
    const { id, n, name } = confirmDeleteVersion
    setIsDeletingVersion(true)
    try {
      const updated = await deleteScenarioVersion(id, n)
      setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      showFeedback('success', `Versão v${n} de "${name}" excluída do histórico.`)
      setConfirmDeleteVersion(null)
    } catch (err) {
      console.error('Erro ao excluir versão:', err)
      showFeedback('error', 'Não foi possível excluir a versão.')
    } finally {
      setIsDeletingVersion(false)
    }
  }

  // Restaurar uma VERSÃO (data) do histórico: hidrata o snapshot daquela data
  const handleRestoreVersion = (sc: ClientSavedScenarioRecord, v: ScenarioVersion) => {
    try {
      ativarCenario({
        id: sc.id,
        cliente: sc.clientName || 'Cliente',
        nome: `${sc.name} — v${v.n}`,
        snapshot: v.snapshot,
      })
      setRestoredId(`${sc.id}-v${v.n}`)
      showFeedback('success', `Salvamento v${v.n} de "${sc.name}" restaurado no formulário e DREs!`)
      setTimeout(() => setRestoredId(null), 3000)
    } catch (err) {
      console.error('Erro ao restaurar versão:', err)
      showFeedback('error', 'Não foi possível restaurar este salvamento.')
    }
  }

  // Salvar nota da versão (ou observações do cenário quando for versão inicial sem n)
  const handleSaveVersionNote = async () => {
    if (!editingVersion) return
    const trimmed = editingVersionNote.trim()
    if (!trimmed) {
      showFeedback('error', 'A nota da versão não pode ficar em branco.')
      return
    }
    setIsSavingVersionNote(true)
    try {
      if (editingVersion.n > 0) {
        const updated = await updateScenarioVersionNote(editingVersion.id, editingVersion.n, trimmed)
        setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      } else {
        const updated = await updateClientScenario(editingVersion.id, { notes: trimmed })
        setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      }
      setEditingVersion(null)
      setEditingVersionNote('')
      showFeedback('success', 'Nota da versão atualizada com sucesso!')
    } catch (err) {
      console.error('Erro ao atualizar nota da versão:', err)
      showFeedback('error', 'Não foi possível atualizar a nota da versão.')
    } finally {
      setIsSavingVersionNote(false)
    }
  }

  // Cancelar edição de nota da versão
  const handleCancelEditVersionNote = () => {
    setEditingVersion(null)
    setEditingVersionNote('')
  }

  // Iniciar renomeação inline de cenário
  const handleStartRename = (sc: ClientSavedScenarioRecord) => {
    setEditingScenarioId(sc.id)
    setEditingScenarioName(sc.name)
  }

  // Cancelar renomeação inline
  const handleCancelRename = () => {
    setEditingScenarioId(null)
    setEditingScenarioName('')
  }

  // Salvar renomeação inline de cenário
  const handleSaveRename = async (id: string) => {
    const trimmed = editingScenarioName.trim()
    if (!trimmed) {
      showFeedback('error', 'O nome do cenário não pode ficar em branco.')
      return
    }
    setIsSavingScenarioName(true)
    try {
      const updated = await updateClientScenario(id, { name: trimmed })
      setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      setEditingScenarioId(null)
      setEditingScenarioName('')
      showFeedback('success', `Cenário renomeado para "${trimmed}" com sucesso!`)
    } catch (err) {
      console.error('Erro ao renomear cenário:', err)
      showFeedback('error', 'Não foi possível renomear o cenário.')
    } finally {
      setIsSavingScenarioName(false)
    }
  }

  // Executar exclusão de cenário confirmada
  const handleConfirmDeleteScenario = async () => {
    if (!confirmDeleteScenario) return
    const { id, name } = confirmDeleteScenario
    setDeletingId(id)
    try {
      await deleteClientScenario(id)
      setScenarios((prev) => prev.filter((s) => s.id !== id))
      showFeedback('success', `Cenário "${name}" excluído permanentemente.`)
      setConfirmDeleteScenario(null)
    } catch (err) {
      console.error('Erro ao excluir cenário:', err)
      showFeedback('error', 'Falha ao excluir o cenário.')
    } finally {
      setDeletingId(null)
    }
  }

  // Executar exclusão de cliente confirmada (cascade)
  const handleConfirmDeleteClient = async () => {
    if (!confirmDeleteClient) return
    const { id, name } = confirmDeleteClient
    setIsDeletingClient(true)
    try {
      await deleteClient(id)
      setClients((prev) => {
        const remaining = prev.filter((c) => c.id !== id)
        setSelectedClientId(remaining.length > 0 ? remaining[0].id : '')
        return remaining
      })
      // Remove cenários desse cliente da lista local
      setScenarios((prev) => prev.filter((s) => s.client !== id))
      showFeedback(
        'success',
        `Cliente "${name}" e seus cenários vinculados foram excluídos com sucesso.`,
      )
      setConfirmDeleteClient(null)
    } catch (err) {
      console.error('Erro ao excluir cliente:', err)
      showFeedback('error', 'Falha ao excluir cliente.')
    } finally {
      setIsDeletingClient(false)
    }
  }

  // Cenários filtrados
  // MATRIZ (CEO, 02/10): cada aba-matriz mostra SÓ o escopo dela, em linhas.
  // A aba 'gravar' (formulário) é acessada por botão próprio.
  const filteredScenarios = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return scenarios.filter((s) => {
      const matchScope =
        activeTab === 'gravar' || (s.scope || 'despesas-operacionais') === activeTab
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.clientName && s.clientName.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      return matchScope && matchSearch
    })
  }, [scenarios, searchQuery, activeTab])

  // Contagem de cenários por cliente ativo
  // CEO 02/10: contagem por ESCOPO da página + fallback por nome do cliente.
  // Corrige o bug E2E 02/10: cenário gravado com sucesso mas contador ficava em 0,
  // e o bloco "Destino do Salvamento" (portão do ATUALIZAR) nunca aparecia.
  const activeClientScenariosCount = useMemo(() => {
    if (!selectedClientId) return 0
    const currentClient = clients.find((c) => c.id === selectedClientId)
    return scenarios.filter(
      (s) =>
        (s.client === selectedClientId ||
          (!!currentClient && !!s.clientName && s.clientName === currentClient.name)) &&
        (s.scope || 'despesas-operacionais') === scope,
    ).length
  }, [scenarios, selectedClientId, clients, scope])

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—'
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#07130f] border border-emerald-500/40 text-slate-100 shadow-2xl p-5 sm:p-7">
        <DialogHeader className="border-b border-emerald-500/20 pb-3">
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
                <Save className="w-4 h-4" />
              </div>
              <span>
                {scope === 'markup'
                  ? 'Gravar Cenário de Markup e Precificação'
                  : scope === 'compras'
                    ? 'Gravar Cenário de Compras de Mercadorias'
                    : 'Gravar Cenário de Despesas e Receitas'}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono">
                Escritório Contábil
              </Badge>
              {scope === 'markup' && (
                <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono">
                  Markup
                </Badge>
              )}
              {scope === 'compras' && (
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                  Compras
                </Badge>
              )}
              {scope === 'despesas-operacionais' && (
                <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-mono">
                  Despesas
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            {scope === 'markup'
              ? 'Armazene os parâmetros de markup, alíquotas automáticas, margens e produtos precificados organizados por cliente do escritório, com histórico e restauração instantânea.'
              : scope === 'compras'
                ? 'Armazene os itens de compras cadastrados, alíquotas fiscais, fretes e posições de estoque organizados por cliente do escritório, com histórico e restauração instantânea.'
                : 'Armazene a base de dados desta página e do planejamento fiscal organizada individualmente por cliente do escritório, com histórico e restauração instantânea.'}
          </DialogDescription>
        </DialogHeader>

        {/* BOTÕES MATRIZ (CEO, 02/10): um por escopo — Compras · Markup e Precificação ·
            Despesas/Receitas Operacionais. CADA matriz abre a LISTA do escopo em linhas
            (com RESTAURAR · EDITAR · DELETAR). O formulário fica no botão "+ Gravar novo". */}
        <div className="flex items-center gap-2 pt-2 border-b border-slate-800/80 overflow-x-auto">
          {(
            [
              { id: 'compras', label: 'Cenário de Compras' },
              { id: 'markup', label: 'Cenário Markup e Precificação' },
              { id: 'despesas-operacionais', label: 'Cenário Despesas/Receitas Op.' },
            ] as const
          ).map((m) => {
            const count = scenarios.filter(
              (s) => (s.scope || 'despesas-operacionais') === m.id,
            ).length
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveTab(m.id)}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === m.id
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{m.label}</span>
                <Badge className="text-[10px] px-1.5 py-0 border-0 font-mono bg-slate-800 text-slate-300">
                  {count}
                </Badge>
              </button>
            )
          })}
          {/* Formulário de gravação: botão próprio, sempre à direita das matrizes */}
          <button
            type="button"
            onClick={() => setActiveTab('gravar')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ml-auto cursor-pointer ${
              activeTab === 'gravar'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>+ Gravar novo</span>
          </button>
        </div>

        {/* Feedback Banner Interno */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between border animate-in fade-in slide-in-from-top-1 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : feedback.type === 'warning'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : feedback.type === 'warning' ? (
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* FORMULÁRIO DE GRAVAÇÃO (aba "+ Gravar novo") */}
        {/* ============================================================ */}
        {activeTab === 'gravar' && (
          <form onSubmit={handleSaveScenario} className="space-y-5 pt-2">
            {/* Bloco 1: Seleção e Criação Inline de Cliente */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Cliente do Escritório</span>
                  <span className="text-emerald-400">*</span>
                </label>

                {!isCreatingClientInline && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingClientInline(true)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Novo Cliente</span>
                  </button>
                )}
              </div>

              {/* Se estiver criando cliente inline */}
              {isCreatingClientInline ? (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">
                      Cadastrar Novo Cliente
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingClientInline(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">
                        Nome / Razão Social *
                      </label>
                      <Input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Ex.: Indústria Alfa Ltda."
                        autoFocus
                        className="h-8 text-xs bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">
                        CNPJ / CPF (opcional)
                      </label>
                      <Input
                        type="text"
                        value={newClientDoc}
                        onChange={(e) => setNewClientDoc(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="h-8 text-xs bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsCreatingClientInline(false)}
                      className="h-7 text-xs text-slate-400 hover:text-white"
                    >
                      Voltar à lista
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSavingClient || !newClientName.trim()}
                      onClick={handleCreateClientInline}
                      className="h-7 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                    >
                      {isSavingClient ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Plus className="w-3 h-3 mr-1" />
                      )}
                      Salvar Cliente
                    </Button>
                  </div>
                </div>
              ) : (
                /* Dropdown de Clientes existentes */
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="flex-1 h-9 text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans cursor-pointer"
                    >
                      {clients.length === 0 ? (
                        <option value="">Nenhum cliente cadastrado ainda</option>
                      ) : (
                        clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.document ? `(${c.document})` : ''}
                          </option>
                        ))
                      )}
                    </select>

                    {selectedClientId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const cur = clients.find((c) => c.id === selectedClientId)
                          if (cur) {
                            setConfirmDeleteClient({
                              id: cur.id,
                              name: cur.name,
                              scenarioCount: activeClientScenariosCount,
                            })
                          }
                        }}
                        className="h-9 px-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 text-xs shrink-0 cursor-pointer"
                        title="Excluir este cliente do cadastro"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Excluir cliente</span>
                      </Button>
                    )}
                  </div>

                  {clients.length === 0 && (
                    <p className="text-[11px] text-amber-300/80 font-mono">
                      Nenhum cliente no banco. Clique em "+ Novo Cliente" para cadastrar a primeira
                      empresa atendida.
                    </p>
                  )}

                  {selectedClientId && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                      <span>Cenários já salvos deste cliente:</span>
                      <strong className="text-emerald-300">{activeClientScenariosCount}</strong>
                    </div>
                  )}
                </div>
              )}
              {/* F2 — DESTINO DO SALVAMENTO: nova simulação × atualizar existente */}
              {activeClientScenariosCount > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/25 space-y-3">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 block">
                    Destino do Salvamento
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSaveDest('nova')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        saveDest === 'nova'
                          ? 'border-emerald-500/60 bg-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/60 hover:border-emerald-500/30'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold block ${saveDest === 'nova' ? 'text-emerald-300' : 'text-slate-300'}`}
                      >
                        Nova simulação
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Cria um cenário novo na pasta do cliente
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveDest('atualizar')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        saveDest === 'atualizar'
                          ? 'border-emerald-500/60 bg-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/60 hover:border-emerald-500/30'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold block ${saveDest === 'atualizar' ? 'text-emerald-300' : 'text-slate-300'}`}
                      >
                        Atualizar simulação existente
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Empilha uma versão nova — a anterior fica preservada
                      </span>
                    </button>
                  </div>

                  {saveDest === 'atualizar' && (
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-mono text-slate-400 block">
                        Simulação a atualizar *
                      </label>
                      <select
                        value={targetScenarioId}
                        onChange={(e) => setTargetScenarioId(e.target.value)}
                        className="w-full h-9 text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans cursor-pointer"
                      >
                        <option value="">Escolher simulação...</option>
                        {scenarios
                          .filter((s) => {
                            const currentClient = clients.find((c) => c.id === selectedClientId)
                            const mesmoCliente =
                              s.client === selectedClientId ||
                              (!!currentClient &&
                                !!s.clientName &&
                                s.clientName === currentClient.name)
                            return mesmoCliente && (s.scope || 'despesas-operacionais') === scope
                          })
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} — v{(s.versions?.length || 0) + 1} em diante ·{' '}
                              {s.updated ? new Date(s.updated).toLocaleDateString('pt-BR') : ''}
                            </option>
                          ))}
                      </select>
                      <label className="text-[10px] font-mono text-slate-400 block">
                        Nota da versão — o que mudou nesta atualização *
                      </label>
                      <textarea
                        value={versionNote}
                        onChange={(e) => setVersionNote(e.target.value)}
                        rows={2}
                        placeholder="Ex.: + Teclado Redragon Sion no estoque (item 03) — crédito PIS/COFINS LR"
                        className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans resize-none"
                      />
                      <p className="text-[10px] text-emerald-300/80 font-mono">
                        A versão anterior fica preservada e restaurável — nada é sobrescrito.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bloco 2: Identificação do Cenário */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 block">
                  Nome do Cenário <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {scenarioName.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScenarioName('')}
                      className="text-[11px] text-slate-400 hover:text-rose-300 font-mono cursor-pointer flex items-center gap-1 transition-colors"
                      title="Apagar todo o texto digitado"
                    >
                      <X className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setScenarioName(getDefaultScenarioName())}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono cursor-pointer flex items-center gap-1 transition-colors"
                    title="Preencher com a sugestão automática de data"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Sugerir nome</span>
                  </button>
                </div>
              </div>
              <Input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Ex.: Cenário 2025 — Base Atual de Despesas"
                className="h-9 text-xs bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-emerald-500 font-sans"
              />

              {/* CEO 02/10: campo "Observações / Premissas" removido do formulário —
                  cenário se identifica pelo nome; todo o restante intacto */}
              {/* Resumo dos Valores que Serão Gravados conforme o Scope */}
              {scope === 'markup' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-emerald-500/20">
                      <span className="text-[10px] text-slate-400 block">Receita Consolidada:</span>
                      <span className="text-emerald-400 font-bold font-mono text-sm">
                        {formatBRL(totalConsolidatedRevenue)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-blue-500/20">
                      <span className="text-[10px] text-slate-400 block">Qtd. Total / Itens:</span>
                      <span className="text-blue-300 font-bold font-mono text-sm">
                        {totalConsolidatedQuantity} un. ({markupProducts.length} itens)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-amber-500/20">
                      <span className="text-[10px] text-slate-400 block">Custo Consolidado:</span>
                      <span className="text-amber-300 font-bold font-mono text-sm">
                        {formatBRL(totalConsolidatedCost)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                    <span>
                      Regime ativo: <strong className="text-emerald-300 uppercase">{regime}</strong>
                    </span>
                    <span>{markupProducts.length} produto(s) cadastrado(s)</span>
                  </div>
                </div>
              )}

              {scope === 'compras' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  {(() => {
                    const totalFreight = purchasesItems.reduce(
                      (acc, item) => acc + (item.freightValue || 0),
                      0,
                    )
                    const stockQtyTotal =
                      calculatedProductStock?.totals?.totalStockQty ?? totalPurchasesQuantity
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-emerald-500/20">
                            <span className="text-[10px] text-slate-400 block">
                              Total Mercadorias:
                            </span>
                            <span className="text-emerald-400 font-bold font-mono text-sm">
                              {formatBRL(totalPurchasesMerchandise)}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-blue-500/20">
                            <span className="text-[10px] text-slate-400 block">Frete Total:</span>
                            <span className="text-blue-300 font-bold font-mono text-sm">
                              {formatBRL(totalFreight)}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-amber-500/20">
                            <span className="text-[10px] text-slate-400 block">
                              Posição Estoque:
                            </span>
                            <span className="text-amber-300 font-bold font-mono text-sm">
                              {stockQtyTotal} un.
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                          <span>
                            Itens de compra:{' '}
                            <strong className="text-emerald-300">
                              {purchasesItems.length} item(ns)
                            </strong>
                          </span>
                          <span>Total comprado: {totalPurchasesQuantity} un.</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {scope !== 'markup' && scope !== 'compras' && (
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-rose-500/20">
                    <span className="text-[10px] text-slate-400 block">Despesas Lançadas:</span>
                    <span className="text-rose-400 font-bold font-mono text-sm">
                      {formatBRL(totalOperatingExpenses)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-emerald-500/20">
                    <span className="text-[10px] text-slate-400 block">Receitas Lançadas:</span>
                    <span className="text-emerald-400 font-bold font-mono text-sm">
                      {formatBRL(totalOperatingRevenues)}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 font-sans leading-tight">
                ℹ O snapshot grava integralmente o contexto fiscal e operacional (markup, compras,
                despesas, estoque e regimes) para permitir restauração fiel a qualquer tempo.
              </p>
            </div>

            {/* Ações Inferiores */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              >
                Cancelar
              </Button>

              {/* CEO 02/10 (ajuste 4): botão ATUALIZAR sempre ATIVO — a validação de
                  campos faltantes vira feedback na tela, não botão desabilitado */}
              <Button
                type="submit"
                size="sm"
                disabled={isSavingScenario || !selectedClientId}
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                {isSavingScenario ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gravando...</span>
                  </>
                ) : saveDest === 'atualizar' ? (
                  <>
                    <History className="w-3.5 h-3.5" />
                    <span>Atualizar</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Gravar Cenário</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CENÁRIO                   */}
        {/* ============================================================ */}
        <Dialog
          open={Boolean(confirmDeleteScenario)}
          onOpenChange={(open) => !open && setConfirmDeleteScenario(null)}
        >
          <DialogContent className="max-w-md bg-[#07130f] border border-rose-500/40 text-slate-100 shadow-2xl p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span>Excluir Cenário Salvo?</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 leading-relaxed">
                Tem certeza de que deseja excluir permanentemente o cenário{' '}
                <strong className="text-white">"{confirmDeleteScenario?.name}"</strong>? Esta ação
                não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteScenario(null)}
                className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={Boolean(deletingId)}
                onClick={handleConfirmDeleteScenario}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CLIENTE                   */}
        {/* ============================================================ */}
        <Dialog
          open={Boolean(confirmDeleteClient)}
          onOpenChange={(open) => !open && setConfirmDeleteClient(null)}
        >
          <DialogContent className="max-w-md bg-[#07130f] border border-rose-500/40 text-slate-100 shadow-2xl p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <span>Excluir Cliente e Cenários?</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 leading-relaxed">
                Você está prestes a excluir o cliente{' '}
                <strong className="text-white">"{confirmDeleteClient?.name}"</strong>.
                {confirmDeleteClient && confirmDeleteClient.scenarioCount > 0 ? (
                  <span className="block mt-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200">
                    ⚠ <strong>Atenção:</strong> este cliente possui{' '}
                    <strong>{confirmDeleteClient.scenarioCount} cenário(s) gravado(s)</strong>.
                    Todos os cenários vinculados a ele também serão excluídos em cascata.
                  </span>
                ) : (
                  <span className="block mt-1 text-slate-400">
                    Este cliente não possui cenários gravados vinculados.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteClient(null)}
                className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isDeletingClient}
                onClick={handleConfirmDeleteClient}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                {isDeletingClient ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Excluindo cliente...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Excluir Cliente</span>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* MODAL DE MEMÓRIA DE CÁLCULO DO SALVAMENTO (CEO, 02/10)       */}
        {/* ============================================================ */}
        <Dialog open={Boolean(memoryRow)} onOpenChange={(open) => !open && setMemoryRow(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#07130f] border border-sky-500/40 text-slate-100 shadow-2xl p-5 sm:p-6">
            <DialogHeader className="border-b border-sky-500/20 pb-3">
              <div className="flex items-center justify-between gap-3 pr-6">
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>
                    Memória de Cálculo — {memoryRow?.sc.name}
                    {memoryRow?.v ? ` (v${memoryRow.v.n})` : ' (estado atual)'}
                  </span>
                </DialogTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono shrink-0">
                  {(memoryRow?.sc.scope === 'compras'
                    ? 'Compras'
                    : memoryRow?.sc.scope === 'markup'
                      ? 'Markup'
                      : 'Despesas'
                  ).toUpperCase()}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-400">
                Foto fiscal do salvamento de{' '}
                {memoryRow
                  ? formatDate(memoryRow.v?.at || memoryRow.sc.updated || memoryRow.sc.created)
                  : ''}{' '}
                — calculada a partir do snapshot gravado, sem tocar no estado atual das telas.
              </DialogDescription>
            </DialogHeader>

            {memoryRow &&
              (() => {
                const snap = memoryRow.v?.snapshot || memoryRow.sc.snapshot
                const items: PurchaseItem[] = snap?.purchasesItems || []
                const regimeMem = (snap?.regime || scope || 'presumido') as
                  | 'presumido'
                  | 'real'
                  | 'simples'
                const regimeLabel =
                  regimeMem === 'presumido'
                    ? 'Lucro Presumido'
                    : regimeMem === 'real'
                      ? 'Lucro Real'
                      : 'Simples Nacional'

                if (items.length === 0) {
                  return (
                    <div className="py-10 text-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-mono">
                        Este salvamento não contém itens de compra no snapshot.
                      </p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-3 pt-1">
                    {items.map((it, idx) => {
                      const gross = calculatePurchaseItemGrossTotal(it)
                      const net = calculatePurchaseItemNetPurchases(it, regimeMem)
                      const qty = Math.max(0, it.quantity || 0)
                      const unit = qty > 0 ? gross / qty : 0
                      const freight = Math.max(0, it.freightValue || 0)
                      const icmsMerc = Math.max(0, it.calculatedIcms || 0)
                      const icmsFreight = Math.max(0, it.icmsFreightValue || 0)
                      const pis = Math.max(0, it.calculatedPis || 0)
                      const cofins = Math.max(0, it.calculatedCofins || 0)
                      const ipi = Math.max(0, it.calculatedIpi || 0)
                      const st = it.hasSt ? Math.max(0, it.stValue || 0) : 0

                      return (
                        <div
                          key={it.id || idx}
                          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-sky-400" />
                              {it.name || `Item ${idx + 1}`}
                            </span>
                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                              {regimeLabel}
                            </Badge>
                          </div>

                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-emerald-400">
                                (+) Mercadorias ({formatNumberBR(qty, 0)} un. × {formatBRL(unit)})
                              </span>
                              <span className="text-slate-100 font-semibold">
                                {formatBRL(gross)}
                              </span>
                            </div>
                            {freight > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-emerald-400">(+) Frete sobre compras</span>
                                <span className="text-slate-100 font-semibold">
                                  {formatBRL(freight)}
                                </span>
                              </div>
                            )}
                            {ipi > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-emerald-400">(+) IPI não recuperável</span>
                                <span className="text-slate-100 font-semibold">
                                  {formatBRL(ipi)}
                                </span>
                              </div>
                            )}
                            {st > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-emerald-400">(+) ICMS-ST na entrada</span>
                                <span className="text-slate-100 font-semibold">
                                  {formatBRL(st)}
                                </span>
                              </div>
                            )}
                            {regimeMem !== 'simples' && icmsMerc > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-rose-400">
                                  (−) ICMS sobre mercadorias ({formatNumberBR(it.icmsRate || 0, 2)}%
                                  × {formatBRL(gross)})
                                </span>
                                <span className="text-rose-400 font-semibold">
                                  -{formatBRL(icmsMerc)}
                                </span>
                              </div>
                            )}
                            {regimeMem !== 'simples' && icmsFreight > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-rose-400">(−) ICMS sobre fretes</span>
                                <span className="text-rose-400 font-semibold">
                                  -{formatBRL(icmsFreight)}
                                </span>
                              </div>
                            )}
                            {regimeMem === 'real' && pis > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-rose-400">(−) PIS (1,65%)</span>
                                <span className="text-rose-400 font-semibold">
                                  -{formatBRL(pis)}
                                </span>
                              </div>
                            )}
                            {regimeMem === 'real' && cofins > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-rose-400">(−) COFINS (7,60%)</span>
                                <span className="text-rose-400 font-semibold">
                                  -{formatBRL(cofins)}
                                </span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
                              <span className="font-bold text-emerald-400">
                                (=) Compras Líquidas / Custo Total:
                              </span>
                              <span className="font-bold text-emerald-400 text-sm">
                                {formatBRL(net)}
                              </span>
                            </div>
                            {qty > 0 && (
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>Custo Unitário Líquido ({formatNumberBR(qty, 0)} un.):</span>
                                <span className="text-emerald-300 font-semibold">
                                  {formatBRL(net / qty)} / un.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono">
                Memória read-only do snapshot gravado — para editar, restaure o salvamento.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMemoryRow(null)}
                className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE VERSÃO (CEO, 02/10) */}
        {/* ============================================================ */}
        <Dialog
          open={Boolean(confirmDeleteVersion)}
          onOpenChange={(open) => !open && setConfirmDeleteVersion(null)}
        >
          <DialogContent className="max-w-md bg-[#07130f] border border-rose-500/40 text-slate-100 shadow-2xl p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <span>Excluir Salvamento v{confirmDeleteVersion?.n}?</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 leading-relaxed">
                O salvamento <strong className="text-white">v{confirmDeleteVersion?.n}</strong> de{' '}
                <strong className="text-white">"{confirmDeleteVersion?.name}"</strong> será
                removido. As demais linhas e o estado atual não são afetados. Esta ação não poderá
                ser desfeita.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteVersion(null)}
                className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isDeletingVersion}
                onClick={handleConfirmDeleteVersion}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                {isDeletingVersion ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* LISTAGEM POR LINHA — mostrada em TODAS as matrizes de escopo */}
        {/* ============================================================ */}
        {activeTab !== 'gravar' && (
          <div className="space-y-4 pt-2">
            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar por nome do cenário ou cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 bg-slate-950/80 border-slate-800 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Listagem */}
            {isLoadingScenarios ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Carregando cenários salvos...</p>
              </div>
            ) : filteredScenarios.length === 0 ? (
              <div className="py-10 text-center space-y-3 px-4 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {searchQuery
                    ? `Nenhum cenário encontrado para "${searchQuery}".`
                    : 'Nenhum cenário salvo ainda para esta ou outras páginas.'}
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveTab('gravar')}
                  className="h-7 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Gravar primeiro cenário
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {/* CEO 02/10 (ajuste 5): LISTAGEM POR LINHA — cada linha = um salvamento
                    (data + o que mudou), com botões RESTAURAR · EDITAR · DELETAR.
                    A matriz do escopo já isola os cenários desta página. */}
                {filteredScenarios.flatMap((sc) => {
                  const isLocal = sc.source === 'local' || sc.pendingSync
                  const snapExpenses = sc.snapshot?.operatingExpenses || []
                  const totalExp = snapExpenses.reduce((acc, curr) => acc + (curr.value || 0), 0)
                  // CEO 02/10 (ajuste 5): LINHAS = SALVAMENTOS (datas). Sem histórico →
                  // 1 linha (criação); com histórico → cada versão é uma linha.
                  const rows: { v: ScenarioVersion | null }[] =
                    sc.versions && sc.versions.length > 0
                      ? [...sc.versions].sort((a, b) => b.n - a.n).map((v) => ({ v }))
                      : [{ v: null }]
                  return rows.map(({ v }) => {
                    const rowKey = v ? `${sc.id}-v${v.n}` : sc.id
                    const isCurrentRestored = restoredId === rowKey
                    const rowDate = v?.at || sc.updated || sc.created
                    const rowNote = v?.note || sc.notes || 'Salvamento original'
                    const snap = v?.snapshot || sc.snapshot
                    const resumo =
                      sc.scope === 'markup'
                        ? `Receita: ${formatBRL(snap?.totalConsolidatedRevenue || 0)} (${snap?.markupProducts?.length || 0} produtos)`
                        : sc.scope === 'compras'
                          ? `Mercadorias: ${formatBRL(snap?.totalPurchasesMerchandise || 0)} (${snap?.purchasesItems?.length || 0} itens)`
                          : `Despesas: ${formatBRL(totalExp)} (${snapExpenses.length} itens)`

                    return (
                      <div
                        key={rowKey}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrentRestored
                            ? 'bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/10'
                            : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="w-full">
                          <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-white truncate">
                                  {sc.name}
                                </span>
                                {v && (
                                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                                    v{v.n}
                                  </Badge>
                                )}
                                {!v && sc.versions && sc.versions.length > 0 && (
                                  <Badge className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-mono">
                                    estado atual
                                  </Badge>
                                )}
                                {isLocal && (
                                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono">
                                    Offline / Local
                                  </Badge>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-300 line-clamp-1">{rowNote}</p>

                              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(rowDate)}
                                </span>
                                <span>•</span>
                                <span>{resumo}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  v ? handleRestoreVersion(sc, v) : handleRestore(sc)
                                }
                                className="h-7 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-sm"
                                title="Restaurar os dados deste salvamento no formulário"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Restaurar
                              </Button>

                              {/* CEO 02/10: ABRIR = memória de cálculo do salvamento
                                  (a partir do snapshot da linha, read-only) */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingVersion({ id: sc.id, n: v?.n || 0 })
                                  setEditingVersionNote(v?.note || sc.notes || '')
                                }}
                                className="h-7 px-2 text-[11px] font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 cursor-pointer"
                                title="Editar a nota deste salvamento"
                              >
                                Editar
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMemoryRow({ sc, v })}
                                className="h-7 px-2 text-[11px] font-mono font-bold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 border border-sky-500/40 cursor-pointer"
                                title="Abrir a memória de cálculo deste salvamento"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Abrir
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === sc.id}
                                onClick={() =>
                                  v
                                    ? setConfirmDeleteVersion({ id: sc.id, name: sc.name, n: v.n })
                                    : setConfirmDeleteScenario({ id: sc.id, name: sc.name })
                                }
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                title="Deletar este salvamento"
                              >
                                {deletingId === sc.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400 font-mono">
                Total:{' '}
                <strong className="text-emerald-400">{filteredScenarios.length} cenários</strong>
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
