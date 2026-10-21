import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useTaxContext, TaxStateSnapshot } from '@/contexts/TaxContext'
import {
  listTaxScenarios,
  updateTaxScenario,
  deleteTaxScenario,
  TaxScenarioRecord,
} from '@/services/taxScenarios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatBRL } from '@/lib/taxCalculations'
import { PageHero } from '@/components/demo/PageHero'
import {
  listClientScenarios,
  deleteClientScenario,
  ClientSavedScenarioRecord,
} from '@/services/clientScenariosService'
import { ScenarioMemoryDialog, ScenarioMemorySource } from '@/components/demo/ScenarioMemoryDialog'
import {
  Users,
  Search,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle2,
  PlusCircle,
  FileSpreadsheet,
  TrendingUp,
  Folder,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  Info,
} from 'lucide-react'

export default function ClientsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loadSnapshot, getSnapshot, ativarCenario } = useTaxContext()

  const [scenarios, setScenarios] = useState<TaxScenarioRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Edição inline de nome
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [isSavingName, setIsSavingName] = useState<boolean>(false)

  // Confirmação de exclusão
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Atualização com estado atual
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Feedback banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback(null)
    }, 4500)
  }

  const fetchScenarios = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const data = await listTaxScenarios()
      setScenarios(data)
    } catch (err: unknown) {
      console.error('Erro ao buscar cenários:', err)
      showFeedback('error', 'Falha ao buscar os cenários salvos no servidor.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios])

  // Formatação de datas
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

  // Carregar e navegar para a home da demo (/demo/markup)
  const handleLoadAndNavigate = (scenario: TaxScenarioRecord) => {
    try {
      // PERSISTÊNCIA DO CENÁRIO ATIVO: F5/nova aba não perde mais o estado restaurado.
      ativarCenario({
        id: scenario.id,
        cliente: '',
        nome: scenario.name,
        snapshot: scenario.data,
      })
      showFeedback('success', `Cenário "${scenario.name}" restaurado com sucesso!`)
      // Pequeno timeout para permitir que o usuário veja a confirmação se desejar
      navigate('/demo/markup')
    } catch (err: unknown) {
      console.error('Erro ao restaurar cenário:', err)
      showFeedback('error', 'Não foi possível restaurar os dados deste cenário.')
    }
  }

  // Atualizar dados do cenário com o estado atual do TaxContext
  const handleUpdateSnapshot = async (scenario: TaxScenarioRecord) => {
    setUpdatingId(scenario.id)
    try {
      const currentSnapshot = getSnapshot()
      const updated = await updateTaxScenario(scenario.id, { data: currentSnapshot })
      setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      showFeedback(
        'success',
        `Cenário "${scenario.name}" atualizado com o estado atual das calculadoras!`,
      )
    } catch (err: unknown) {
      console.error('Erro ao atualizar dados do cenário:', err)
      showFeedback('error', 'Falha ao sincronizar o cenário com o estado atual.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Iniciar edição inline de nome
  const startEditing = (scenario: TaxScenarioRecord) => {
    setEditingId(scenario.id)
    setEditingName(scenario.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEditingName = async (id: string) => {
    const trimmed = editingName.trim()
    if (!trimmed) {
      showFeedback('error', 'O nome do cenário não pode ficar em branco.')
      return
    }
    setIsSavingName(true)
    try {
      const updated = await updateTaxScenario(id, { name: trimmed })
      setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      setEditingId(null)
      setEditingName('')
      showFeedback('success', 'Nome do cenário atualizado com sucesso!')
    } catch (err: unknown) {
      console.error('Erro ao renomear cenário:', err)
      showFeedback('error', 'Não foi possível renomear o cenário.')
    } finally {
      setIsSavingName(false)
    }
  }

  // Excluir cenário
  const handleDeleteScenario = async () => {
    if (!deleteConfirmId) return
    const target = scenarios.find((s) => s.id === deleteConfirmId)
    setIsDeleting(true)
    try {
      await deleteTaxScenario(deleteConfirmId)
      setScenarios((prev) => prev.filter((s) => s.id !== deleteConfirmId))
      showFeedback('success', `Cenário "${target?.name || 'selecionado'}" excluído com sucesso.`)
      setDeleteConfirmId(null)
    } catch (err: unknown) {
      console.error('Erro ao excluir cenário:', err)
      showFeedback('error', 'Falha ao excluir o cenário do servidor.')
    } finally {
      setIsDeleting(false)
    }
  }

  // DEPÓSITO DE CENÁRIOS POR CLIENTE (saved_scenarios — mesma fonte do modal "Cenários Salvos")
  const [clientScenarios, setClientScenarios] = useState<ClientSavedScenarioRecord[]>([])
  const [isLoadingClientScenarios, setIsLoadingClientScenarios] = useState<boolean>(true)
  const [expandedClientFolders, setExpandedClientFolders] = useState<Set<string>>(new Set())
  // CEO 02/10: APAGAR CENÁRIO ao lado do RESTAURAR nos cards do depósito
  const [deleteScenarioConfirm, setDeleteScenarioConfirm] = useState<{
    id: string
    name: string
    clientName?: string
  } | null>(null)
  const [isDeletingScenario, setIsDeletingScenario] = useState<boolean>(false)
  // CEO 02/10: ABRIR = memória de cálculo do cenário do depósito (componente compartilhado)
  const [memorySource, setMemorySource] = useState<ScenarioMemorySource | null>(null)

  // Nota didática de apoio colapsável (recolhida por padrão)
  const [isDidacticNoteOpen, setIsDidacticNoteOpen] = useState<boolean>(false)

  const handleDeleteClientScenario = async () => {
    if (!deleteScenarioConfirm) return
    const { id, name } = deleteScenarioConfirm
    setIsDeletingScenario(true)
    try {
      await deleteClientScenario(id)
      setClientScenarios((prev) => prev.filter((s) => s.id !== id))
      showFeedback('success', `Cenário "${name}" apagado com sucesso.`)
      setDeleteScenarioConfirm(null)
    } catch (err: unknown) {
      console.error('Erro ao apagar cenário do depósito:', err)
      showFeedback('error', 'Falha ao apagar o cenário.')
    } finally {
      setIsDeletingScenario(false)
    }
  }

  const toggleClientFolder = (clientId: string) => {
    setExpandedClientFolders((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  const fetchClientScenarios = useCallback(async () => {
    if (!user) return
    setIsLoadingClientScenarios(true)
    try {
      const data = await listClientScenarios()
      setClientScenarios(data)
    } catch (err: unknown) {
      console.warn('Falha ao listar cenários por cliente:', err)
      setClientScenarios([])
    } finally {
      setIsLoadingClientScenarios(false)
    }
  }, [user])

  useEffect(() => {
    fetchClientScenarios()
  }, [fetchClientScenarios])

  const clientFolders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const bySearch = clientScenarios.filter((s) => {
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        (s.clientName && s.clientName.toLowerCase().includes(q)) ||
        (s.scope && s.scope.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      )
    })
    const map = new Map<string, { clientName: string; items: ClientSavedScenarioRecord[] }>()
    bySearch.forEach((s) => {
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
  }, [clientScenarios, searchQuery])

  const totalClientScenarios = clientScenarios.length

  // Filtragem por busca
  const filteredScenarios = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return scenarios
    return scenarios.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q)
      const regimeMatch = (s.data?.regime || '').toLowerCase().includes(q)
      return nameMatch || regimeMatch
    })
  }, [scenarios, searchQuery])

  // Métricas para cards de resumo
  const summaryMetrics = useMemo(() => {
    const total = scenarios.length

    // Regime mais usado
    const regimeCounts: Record<string, number> = {}
    let lastDate: string | null = null

    scenarios.forEach((s) => {
      const reg = s.data?.regime || 'presumido'
      regimeCounts[reg] = (regimeCounts[reg] || 0) + 1

      const dateStr = s.updated || s.created
      if (dateStr) {
        if (!lastDate || new Date(dateStr) > new Date(lastDate)) {
          lastDate = dateStr
        }
      }
    })

    let mostUsedRegime: string = 'Nenhum'
    let maxCount = 0
    Object.entries(regimeCounts).forEach(([r, count]) => {
      if (count > maxCount) {
        maxCount = count
        mostUsedRegime = r
      }
    })

    const regimeLabels: Record<string, string> = {
      presumido: 'Lucro Presumido',
      real: 'Lucro Real',
      simples: 'Simples Nacional',
    }

    return {
      total,
      mostUsedRegime: total > 0 ? regimeLabels[mostUsedRegime] || mostUsedRegime : '—',
      lastSimulationDate: lastDate ? formatDate(lastDate) : '—',
    }
  }, [scenarios])

  // Helper para derivar receita ou destaque do snapshot
  const deriveScenarioDetails = (data?: TaxStateSnapshot) => {
    if (!data) return { regimeLabel: 'Lucro Presumido', revenue: 0, productsCount: 0 }

    const regimeLabels: Record<string, string> = {
      presumido: 'Lucro Presumido',
      real: 'Lucro Real',
      simples: 'Simples Nacional',
    }
    const regimeLabel = regimeLabels[data.regime] || 'Lucro Presumido'

    let revenue = 0
    if (data.totalConsolidatedRevenue && data.totalConsolidatedRevenue > 0) {
      revenue = data.totalConsolidatedRevenue
    } else if (data.simulatedSalePrice && data.simulatedSalePrice > 0) {
      const qty =
        data.presumidoQuantitySold || data.realQuantitySold || data.simplesQuantitySold || 1
      revenue = data.simulatedSalePrice * qty
    }

    const productsCount = data.markupProducts?.length || 0

    return {
      regimeLabel,
      revenue,
      productsCount,
      regime: data.regime || 'presumido',
    }
  }

  return (
    <DemoLayout currentTab="clientes">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Destaque Central Topo: Hero Banner estilo ADAPTA ONE */}
        <PageHero
          title="PAINEL DE CLIENTES"
          subtitle="Gerencie os diagnósticos e planejamentos tributários salvos no servidor vinculados à sua conta com restauração e sincronização instantânea."
          badge="CONSULTORIA IT & CENÁRIOS SALVOS"
          icon={Users}
        />

        {/* Cabeçalho */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#f9e596]/40 to-[#e5b742]/30 border border-amber-300 flex items-center justify-center text-[#3b2405] shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-[#261502] tracking-tight">
                    Gerenciador de Cenários Tributários
                  </h2>
                  <Badge className="bg-amber-50 text-[#3b2405] border border-amber-300 text-[10px] font-mono font-semibold">
                    Consultoria IT
                  </Badge>
                </div>
                <p className="text-xs text-[#5c3e06]">
                  Histórico de planejamentos fiscais salvos na nuvem.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchScenarios}
                disabled={isLoading}
                className="h-8 text-xs font-semibold bg-white border-amber-300/80 text-[#3b2405] hover:text-[#261502] hover:border-amber-400 hover:bg-amber-50/60 cursor-pointer gap-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Atualizar lista</span>
              </Button>

              <button
                type="button"
                onClick={() => navigate('/demo/markup')}
                className="group/btn relative overflow-hidden inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] text-xs font-extrabold uppercase tracking-wide cursor-pointer shadow-md shadow-amber-950/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-40 group-hover/btn:opacity-70 mix-blend-overlay transition-opacity duration-300"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
                  }}
                />
                <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/btn:translate-x-[130%] transition-transform duration-700 ease-out" />
                <PlusCircle className="relative z-10 w-3.5 h-3.5 text-[#3b2405]" />
                <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                  Nova Simulação
                </span>
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                feedback.type === 'success'
                  ? 'bg-amber-50 border-amber-300 text-[#3b2405]'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#b87c14] shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-500 hover:text-slate-900 text-xs cursor-pointer ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 3 Cards de Resumo no Topo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-slate-500 font-semibold">
                Cenários Salvos
              </span>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#f9e596]/40 to-[#e5b742]/30 text-[#3b2405] border border-amber-300 flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {summaryMetrics.total}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Simulações salvas no banco pelo seu usuário
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-slate-500 font-semibold">
                Regime Mais Frequente
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#b87c14] border border-amber-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#3b2405] truncate">
              {' '}
              {summaryMetrics.mostUsedRegime}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Regime mais selecionado nos snapshots</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-slate-500 font-semibold">
                Última Atualização
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100/60 text-[#b87c14] border border-amber-300 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-sm sm:text-base font-semibold font-mono text-slate-900">
              {summaryMetrics.lastSimulationDate}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Data e horário da simulação mais recente
            </p>
          </div>
        </div>

        {/* DEPÓSITO DE CENÁRIOS POR CLIENTE — árvore de pastas (pasta = cliente, subpasta = simulação) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Depósito de Cenários por Cliente
              </h3>
              <span className="text-xs font-mono text-slate-500">
                ({totalClientScenarios} simulações)
              </span>
            </div>
          </div>

          {isLoadingClientScenarios ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#b87c14] mx-auto" />
              <p className="text-xs text-slate-500 mt-2 font-mono">
                Abrindo o depósito de cenários...
              </p>
            </div>
          ) : clientFolders.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-500">
                Nenhuma simulação por cliente ainda. Grave cenários pelo botão{' '}
                <strong className="text-[#5c3e06]">"Gravar Novo Cenário"</strong> nas calculadoras —
                cada cenário fica organizado na pasta do seu cliente.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {clientFolders.map((folder) => {
                const isExpanded =
                  expandedClientFolders.has(folder.clientId) || searchQuery.trim().length > 0
                return (
                  <div
                    key={folder.clientId}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                  >
                    {/* PASTA DO CLIENTE — Tarja em degradê cinza-ardósia com letra branca em caixa alta monoespaçada negrito */}
                    <button
                      type="button"
                      onClick={() => toggleClientFolder(folder.clientId)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-slate-700 via-slate-650 to-slate-700 bg-slate-700 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 hover:bg-slate-800 text-white transition-all cursor-pointer border-b border-slate-600 shadow-xs"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-amber-300 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" />
                        )}
                        <Folder className="w-4 h-4 text-amber-300 shrink-0" />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-white truncate text-left">
                          {folder.clientName}
                        </span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-200 bg-[#261502] border border-amber-500/50 rounded-full px-2.5 py-0.5 shrink-0">
                        {folder.items.length}{' '}
                        {folder.items.length === 1 ? 'simulação' : 'simulações'}
                      </span>
                    </button>

                    {/* SUBPASTAS: SIMULAÇÕES DO CLIENTE (Camada interna recuada no padrão chancelado) */}
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isExpanded
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mx-2 sm:mx-3 my-3 p-3 sm:p-4 rounded-xl bg-slate-100/90 border border-slate-200 shadow-inner space-y-2.5">
                          {folder.items.map((sc) => {
                            const details = deriveScenarioDetails(sc.snapshot)
                            return (
                              <div
                                key={sc.id}
                                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-amber-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                                      {sc.name}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-amber-50 text-[#3b2405] border border-amber-300">
                                      {details.regimeLabel}
                                    </span>
                                    {sc.scope && (
                                      <span className="text-[10px] font-mono text-slate-500">
                                        {sc.scope}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                                    {formatDate(sc.updated || sc.created)} · Receita Bruta Est.{' '}
                                    <strong className="text-slate-800 font-semibold">
                                      {formatBRL(details.revenue)}
                                    </strong>{' '}
                                    · {details.productsCount} produto(s)
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      ativarCenario({
                                        id: sc.id,
                                        cliente: sc.client || '',
                                        nome: sc.name,
                                        snapshot: sc.snapshot,
                                      })
                                      showFeedback(
                                        'success',
                                        `Cenário "${sc.name}" restaurado com sucesso!`,
                                      )
                                      navigate('/demo/markup')
                                    }}
                                    className="group/btn relative overflow-hidden inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] text-xs font-bold cursor-pointer shadow-xs hover:shadow-md hover:shadow-amber-500/30 transition-all duration-200"
                                    title="Restaurar esta simulação nas calculadoras"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span className="drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
                                      Restaurar
                                    </span>
                                  </button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setMemorySource({
                                        name: sc.name,
                                        scope: sc.scope,
                                        snapshot: sc.snapshot,
                                        savedAt: sc.updated || sc.created,
                                      })
                                    }
                                    className="h-8 px-2.5 text-xs font-mono font-semibold bg-white border-amber-300 text-[#3b2405] hover:text-[#261502] hover:bg-amber-50 hover:border-amber-400 cursor-pointer shrink-0 shadow-xs gap-1"
                                    title="Exportar dossiê analítico deste cenário em PDF"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-[#b87c14]" />{' '}
                                    <span>Abrir</span>
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isDeletingScenario}
                                    onClick={() =>
                                      setDeleteScenarioConfirm({
                                        id: sc.id,
                                        name: sc.name,
                                        clientName: sc.clientName || sc.client || 'Cliente',
                                      })
                                    }
                                    className="h-8 px-2.5 text-xs bg-white border-slate-200 text-rose-700 hover:text-rose-800 hover:bg-rose-50 hover:border-rose-300 cursor-pointer shrink-0 shadow-xs gap-1"
                                    title="Apagar este cenário permanentemente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Apagar</span>
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tabela e Filtros de Cenários */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#b87c14]" />
              <h3 className="text-sm sm:text-base font-bold text-[#261502]">
                Carteira de Cenários Tributários
              </h3>
              <span className="text-xs font-mono text-slate-500">
                ({filteredScenarios.length} de {scenarios.length})
              </span>
            </div>

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Filtrar por nome ou regime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 bg-slate-50 border-slate-200 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista / Tabela */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-[#b87c14] mx-auto" />
              <p className="text-xs text-slate-500 font-mono">
                Consultando cenários salvos no servidor seguro...
              </p>
            </div>
          ) : scenarios.length === 0 ? (
            /* Estado vazio amigável */
            <div className="py-12 sm:py-16 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#f9e596]/40 to-[#e5b742]/30 border border-amber-300 text-[#3b2405] flex items-center justify-center mx-auto shadow-xs">
                <FolderOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-[#261502]">Nenhum cenário salvo ainda</h4>
                <p className="text-xs text-[#5c3e06] leading-relaxed">
                  Para que um cliente ou diagnóstico apareça neste painel, basta abrir qualquer
                  calculadora (Markup, Compras ou DREs), preencher os dados e clicar em{' '}
                  <strong className="text-[#3b2405] font-semibold">"Salvar Cenário"</strong> na
                  barra inferior.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/demo/markup')}
                  className="group/btn relative overflow-hidden inline-flex items-center gap-1.5 h-9 px-5 rounded-xl bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] text-xs font-extrabold uppercase tracking-wide cursor-pointer shadow-md shadow-amber-950/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300"
                >
                  <span className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                    Ir para a Calculadora Markup
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#3b2405]" />
                </button>
              </div>
            </div>
          ) : filteredScenarios.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-xs text-slate-500">
                Nenhum cenário encontrado para a busca{' '}
                <strong className="text-[#3b2405]">"{searchQuery}"</strong>.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#3b2405] hover:bg-amber-50 h-7"
              >
                Limpar busca
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-left">
                    <th className="py-3 px-3 font-semibold text-slate-700">Cenário / Cliente</th>
                    <th className="py-3 px-3 font-semibold text-slate-700">Regime Salvo</th>
                    <th className="py-3 px-3 font-semibold text-slate-700 hidden md:table-cell">
                      Receita Bruta Est.
                    </th>
                    <th className="py-3 px-3 font-semibold text-slate-700 hidden sm:table-cell">
                      Criado em
                    </th>
                    <th className="py-3 px-3 font-semibold text-slate-700 hidden lg:table-cell">
                      Última Atualização
                    </th>
                    <th className="py-3 px-3 font-semibold text-slate-700 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredScenarios.map((sc) => {
                    const isEditing = editingId === sc.id
                    const details = deriveScenarioDetails(sc.data)
                    const isUpdating = updatingId === sc.id

                    return (
                      <tr key={sc.id} className="hover:bg-slate-50 transition-colors group">
                        {/* Nome do Cenário (com edição inline) */}
                        <td className="py-3 px-3 text-slate-900">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 max-w-xs">
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                                className="h-7 text-xs bg-white border-amber-500 text-slate-900 font-sans shadow-xs"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditingName(sc.id)
                                  if (e.key === 'Escape') cancelEditing()
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isSavingName}
                                onClick={() => saveEditingName(sc.id)}
                                className="h-7 w-7 p-0 text-[#3b2405] hover:bg-amber-50"
                                title="Salvar nome"
                              >
                                {isSavingName ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditing}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 font-sans text-xs sm:text-sm">
                                {sc.name}
                              </span>
                              <button
                                onClick={() => startEditing(sc)}
                                className="text-slate-400 hover:text-[#3b2405] opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                title="Renomear este cenário"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                            ID: {sc.id}
                          </span>
                        </td>

                        {/* Regime Tributário */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                              details.regime === 'simples'
                                ? 'bg-amber-50 text-[#3b2405] border border-amber-300'
                                : details.regime === 'real'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-amber-50 text-[#3b2405] border border-amber-300'
                            }`}
                          >
                            {details.regimeLabel}
                          </span>
                        </td>

                        {/* Receita Bruta Estimada */}
                        <td className="py-3 px-3 hidden md:table-cell text-slate-700 font-mono">
                          {details.revenue > 0 ? (
                            <span className="text-slate-900 font-semibold">
                              {formatBRL(details.revenue)}
                            </span>
                          ) : (
                            <span className="text-slate-400">R$ 0,00</span>
                          )}
                        </td>

                        {/* Data de Criação */}
                        <td className="py-3 px-3 hidden sm:table-cell text-slate-500">
                          {formatDate(sc.created)}
                        </td>

                        {/* Data de Atualização */}
                        <td className="py-3 px-3 hidden lg:table-cell text-slate-500">
                          {formatDate(sc.updated)}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Carregar e ir para home */}
                            <button
                              type="button"
                              onClick={() => handleLoadAndNavigate(sc)}
                              className="group/btn relative overflow-hidden inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] text-xs font-bold cursor-pointer shadow-2xs hover:shadow-md hover:shadow-amber-500/30 transition-all duration-200"
                              title="Restaurar este cenário nas calculadoras e ir para a demo"
                            >
                              <span className="drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
                                Carregar
                              </span>
                              <ArrowRight className="w-3 h-3 text-[#3b2405]" />
                            </button>

                            {/* Atualizar com snapshot atual */}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating}
                              onClick={() => handleUpdateSnapshot(sc)}
                              className="h-7 px-2 text-[11px] bg-white border-slate-300 text-[#3b2405] hover:bg-amber-50 hover:border-amber-300 cursor-pointer shadow-2xs"
                              title="Sobrescrever este cenário no servidor com as variáveis atuais da tela"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <span>Atualizar</span>
                              )}
                            </Button>

                            {/* Renomear */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(sc)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              title="Renomear cenário"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            {/* Excluir */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(sc.id)}
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 cursor-pointer"
                              title="Excluir cenário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* NOTA DIDÁTICA DE APOIO COLAPSÁVEL — RECOLHIDA POR PADRÃO (PADRÃO CHANCELADO DO PROJETO) */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setIsDidacticNoteOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left bg-slate-50/70 hover:bg-slate-100/80 transition-colors cursor-pointer border-b border-transparent data-[open=true]:border-slate-200"
            data-open={isDidacticNoteOpen}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#f9e596]/40 to-[#e5b742]/30 border border-amber-300 flex items-center justify-center text-[#3b2405] shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 block">
                  ORIENTAÇÕES DE GESTÃO · SINCRONIZAÇÃO E PERSISTÊNCIA DOS CENÁRIOS
                </span>
                <span className="text-[11px] text-slate-500 font-sans">
                  Entenda como funciona o auto-sync, restauração nas calculadoras e memória de
                  cálculo dos diagnósticos fiscais.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-600 shrink-0">
              <span>{isDidacticNoteOpen ? 'RECOLHER NOTAS' : 'VER NOTAS DIDÁTICAS'}</span>
              {isDidacticNoteOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              isDidacticNoteOpen
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
            }`}
          >
            <div className="overflow-hidden">
              <div className="p-4 sm:p-5 text-xs text-slate-600 bg-white space-y-3 leading-relaxed border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[11px] font-mono font-bold text-slate-900 uppercase block">
                      1. Restauração e Auto-Sync
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Ao clicar em <strong>Restaurar</strong> ou <strong>Carregar</strong>, o
                      snapshot tributário é hidratado integralmente nas calculadoras (Markup,
                      Compras, DREs) e persistido no navegador. F5 ou nova aba não perdem o estado
                      restaurado.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[11px] font-mono font-bold text-slate-900 uppercase block">
                      2. Memória de Cálculo Read-Only
                    </span>
                    <p className="text-[11px] text-slate-500">
                      O botão <strong>Abrir</strong> exibe a memória de cálculo exata capturada no
                      momento em que a simulação foi gravada, discriminando itens de compra,
                      impostos recuperáveis e custos unitários sem alterar as variáveis da tela.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[11px] font-mono font-bold text-slate-900 uppercase block">
                      3. Organização por Cliente
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Cada simulação fica agrupada na pasta do respectivo cliente contábil. É
                      possível versionar diferentes diagnósticos para o mesmo contribuinte
                      comparando alternativas tributárias lado a lado.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Confirmação de Exclusão */}
        <Dialog
          open={Boolean(deleteConfirmId)}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        >
          <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-sm shadow-xl p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-slate-900 text-base flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Excluir Cenário do Servidor?
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Esta ação apagará permanentemente o cenário e seus parâmetros do banco de dados na
                nuvem. Não é possível desfazer.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteScenario}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer shadow-xs"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Confirmar Exclusão'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* MODAL: MEMÓRIA DE CÁLCULO DO CENÁRIO DO DEPÓSITO (CEO, 02/10) */}
        {/* ============================================================ */}
        <ScenarioMemoryDialog
          source={memorySource}
          onClose={() => setMemorySource(null)}
          fallbackScope="compras"
        />

        {/* ============================================================ */}
        {/* DIÁLOGO: APAGAR CENÁRIO DO DEPÓSITO (CEO, 02/10) — saved_scenarios */}
        {/* ============================================================ */}
        <Dialog
          open={Boolean(deleteScenarioConfirm)}
          onOpenChange={(open) => !open && setDeleteScenarioConfirm(null)}
        >
          <DialogContent className="max-w-md bg-white border border-rose-200 text-slate-900 shadow-xl p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Apagar Cenário do Depósito?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Tem certeza de que deseja apagar permanentemente o cenário{' '}
                <strong className="text-rose-700 font-semibold">
                  "{deleteScenarioConfirm?.name}"
                </strong>
                ? Esta ação não poderá ser desfeita — todas as versões do histórico vão junto.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteScenarioConfirm(null)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeletingScenario}
                onClick={handleDeleteClientScenario}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer shadow-xs"
              >
                {isDeletingScenario ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Confirmar Exclusão'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DemoLayout>
  )
}
