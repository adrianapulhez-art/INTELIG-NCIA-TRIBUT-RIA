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
  CloudCheck,
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  Sparkles,
  FileText,
  Pencil,
  Check,
  X,
  Undo2,
} from 'lucide-react'
import { useTaxContext } from '@/contexts/TaxContext'
import {
  listClients,
  createClient,
  deleteClient,
  listClientScenarios,
  createClientScenario,
  updateClientScenario,
  deleteClientScenario,
  AccountingClientRecord,
  ClientSavedScenarioRecord,
} from '@/services/clientScenariosService'
import { formatBRL } from '@/lib/taxCalculations'

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

  // Abas do modal: "gravar" ou "historico"
  const [activeTab, setActiveTab] = useState<'gravar' | 'historico'>(initialTab)

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

  // Listagem de cenários
  const [scenarios, setScenarios] = useState<ClientSavedScenarioRecord[]>([])
  const [isLoadingScenarios, setIsLoadingScenarios] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Exclusão e Restauração
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [restoredId, setRestoredId] = useState<string | null>(null)

  // Depósito de cenários: pastas de clientes expandidas/recolhidas
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleFolder = (clientId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  // Feedback Toast interno
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'warning' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback(null)
    }, 4500)
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
      setActiveTab(initialTab)
      setScenarioName(getDefaultScenarioName())
      setScenarioNotes('')
      setIsCreatingClientInline(false)
      setEditingScenarioId(null)
      setEditingScenarioName('')
      setConfirmDeleteScenario(null)
      setConfirmDeleteClient(null)
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
          `Cenário "${result.record.name}" gravado na nuvem para o cliente ${clientName}!`,
        )
      } else {
        showFeedback(
          'warning',
          'Salvo localmente — sincroniza quando houver conexão com o servidor.',
        )
      }

      // Alterna suavemente para o histórico para mostrar o item gravado
      setTimeout(() => {
        setActiveTab('historico')
      }, 900)
    } catch (err) {
      console.error('Erro ao gravar cenário:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao gravar cenário.'
      showFeedback('error', `Falha ao gravar cenário: ${msg}`)
    } finally {
      setIsSavingScenario(false)
    }
  }

  // Restaurar cenário para a tela
  const handleRestore = (item: ClientSavedScenarioRecord) => {
    try {
      loadSnapshot(item.snapshot)
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
  const filteredScenarios = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return scenarios.filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.clientName && s.clientName.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      return matchSearch
    })
  }, [scenarios, searchQuery])

  // DEPÓSITO DE CENÁRIOS — agrupamento por cliente (pasta) e simulação (subpasta)
  const clientFolders = useMemo(() => {
    const map = new Map<string, { clientName: string; items: typeof filteredScenarios }>()
    filteredScenarios.forEach((s) => {
      const key = s.client || '_sem_cliente_'
      if (!map.has(key)) {
        map.set(key, { clientName: s.clientName || 'Cliente', items: [] })
      }
      map.get(key)!.items.push(s)
    })
    return Array.from(map.entries())
      .map(([clientId, group]) => ({
        clientId,
        clientName: group.clientName,
        items: group.items.sort(
          (a, b) =>
            new Date(b.updated || b.created || 0).getTime() -
            new Date(a.updated || a.created || 0).getTime(),
        ),
      }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt-BR'))
  }, [filteredScenarios])

  // Contagem de cenários por cliente ativo
  const activeClientScenariosCount = useMemo(() => {
    if (!selectedClientId) return 0
    return scenarios.filter((s) => s.client === selectedClientId).length
  }, [scenarios, selectedClientId])

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

        {/* Abas Superiores do Modal */}
        <div className="flex items-center gap-2 pt-2 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('gravar')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'gravar'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Gravar Novo Cenário</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'historico'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Cenários Salvos</span>
            <Badge className="text-[10px] px-1.5 py-0 border-0 font-mono bg-slate-800 text-slate-300">
              {scenarios.length}
            </Badge>
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
        {/* ABA 1: FORMULÁRIO DE GRAVAÇÃO COM SELETOR DE CLIENTE DO ESCRITÓRIO */}
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

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Observações / Premissas (opcional)
                </label>
                <textarea
                  value={scenarioNotes}
                  onChange={(e) => setScenarioNotes(e.target.value)}
                  placeholder="Ex.: Inclui reajuste de aluguel e 2 novos colaboradores para o próximo trimestre..."
                  rows={2}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans resize-none"
                />
              </div>

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

              <Button
                type="submit"
                size="sm"
                disabled={isSavingScenario || !scenarioName.trim() || !selectedClientId}
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                {isSavingScenario ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gravando...</span>
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
        {/* ABA 2: LISTA DE CENÁRIOS SALVOS / RESTAURAÇÃO / EXCLUSÃO */}
        {/* ============================================================ */}
        {activeTab === 'historico' && (
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
                {clientFolders.map((folder) => {
                  const isExpanded =
                    expandedFolders.has(folder.clientId) || searchQuery.trim().length > 0
                  const isFolderView = true
                  return (
                    <div
                      key={folder.clientId}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden"
                    >
                      {/* PASTA DO CLIENTE */}
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder.clientId)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-900/60 hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs font-bold text-white truncate text-left">
                            {folder.clientName}
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5 shrink-0">
                          {folder.items.length}{' '}
                          {folder.items.length === 1 ? 'simulação' : 'simulações'}
                        </span>
                      </button>

                      {/* SUBPASTAS: SIMULAÇÕES DO CLIENTE */}
                      {isExpanded && (
                        <div className="p-2 space-y-2">
                          {folder.items.map((sc) => {
                            const isCurrentRestored = restoredId === sc.id
                            const isDeleting = deletingId === sc.id
                            const isLocal = sc.source === 'local' || sc.pendingSync

                            // Total de despesas contido no snapshot
                            const snapExpenses = sc.snapshot?.operatingExpenses || []
                            const totalExp = snapExpenses.reduce(
                              (acc, curr) => acc + (curr.value || 0),
                              0,
                            )

                            return (
                              <div
                                key={sc.id}
                                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isCurrentRestored
                                    ? 'bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/10'
                                    : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/40'
                                }`}
                              >
                                {editingScenarioId === sc.id ? (
                                  /* Modo de Edição Inline de Nome */
                                  <div className="w-full space-y-2 py-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                        Renomear cenário:
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="text"
                                        value={editingScenarioName}
                                        onChange={(e) => setEditingScenarioName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleSaveRename(sc.id)
                                          } else if (e.key === 'Escape') {
                                            handleCancelRename()
                                          }
                                        }}
                                        autoFocus
                                        placeholder="Nome do cenário..."
                                        className="h-8 text-xs bg-slate-900 border-emerald-500/60 text-white font-sans flex-1"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={
                                          isSavingScenarioName || !editingScenarioName.trim()
                                        }
                                        onClick={() => handleSaveRename(sc.id)}
                                        className="h-8 px-2.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
                                        title="Salvar novo nome"
                                      >
                                        {isSavingScenarioName ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5 mr-1" />
                                        )}
                                        <span>Salvar</span>
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={isSavingScenarioName}
                                        onClick={handleCancelRename}
                                        className="h-8 px-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                                        title="Cancelar edição"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Modo Normal de Exibição */
                                  <>
                                    <div className="space-y-1 min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-xs sm:text-sm text-white truncate">
                                          {sc.name}
                                        </span>
                                        {sc.clientName && !isFolderView && (
                                          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                                            <Building2 className="w-3 h-3 mr-1 inline" />
                                            {sc.clientName}
                                          </Badge>
                                        )}
                                        {/* Badge de Origem/Escopo */}
                                        {sc.scope === 'markup' && (
                                          <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] font-mono">
                                            Markup
                                          </Badge>
                                        )}
                                        {sc.scope === 'compras' && (
                                          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono">
                                            Compras
                                          </Badge>
                                        )}
                                        {(!sc.scope || sc.scope === 'despesas-operacionais') && (
                                          <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[9px] font-mono">
                                            Despesas
                                          </Badge>
                                        )}
                                        {isLocal && (
                                          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono">
                                            Offline / Local
                                          </Badge>
                                        )}
                                      </div>

                                      {sc.notes && (
                                        <p className="text-[11px] text-slate-400 line-clamp-1">
                                          {sc.notes}
                                        </p>
                                      )}

                                      {/* Metadados específicos do escopo do cenário salvo */}
                                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatDate(sc.updated || sc.created)}
                                        </span>
                                        <span>•</span>
                                        {sc.scope === 'markup' ? (
                                          <span className="text-emerald-400/90">
                                            Receita Consolidada:{' '}
                                            {formatBRL(sc.snapshot?.totalConsolidatedRevenue || 0)}{' '}
                                            ({sc.snapshot?.markupProducts?.length || 0} produtos)
                                          </span>
                                        ) : sc.scope === 'compras' ? (
                                          <span className="text-amber-400/90">
                                            Mercadorias:{' '}
                                            {formatBRL(sc.snapshot?.totalPurchasesMerchandise || 0)}{' '}
                                            ({sc.snapshot?.purchasesItems?.length || 0} itens)
                                          </span>
                                        ) : (
                                          <span className="text-rose-400/90">
                                            Despesas: {formatBRL(totalExp)} ({snapExpenses.length}{' '}
                                            itens)
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Ações: Restaurar, Editar e Excluir */}
                                    <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleRestore(sc)}
                                        className="h-7 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-sm"
                                        title="Restaurar dados deste cenário no formulário"
                                      >
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        Restaurar
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleStartRename(sc)}
                                        className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                                        title="Renomear cenário"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={isDeleting}
                                        onClick={() =>
                                          setConfirmDeleteScenario({ id: sc.id, name: sc.name })
                                        }
                                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                        title="Excluir cenário"
                                      >
                                        {isDeleting ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
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
