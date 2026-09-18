import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTaxContext, TaxStateSnapshot } from '@/contexts/TaxContext'
import {
  listTaxScenarios,
  createTaxScenario,
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
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Clock,
  FolderOpen,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Search,
  ExternalLink,
  Plus,
  HelpCircle,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'

export const ScenarioManagerBar: React.FC = () => {
  const { user } = useAuth()
  const { getSnapshot, loadSnapshot } = useTaxContext()

  const [scenarios, setScenarios] = useState<TaxScenarioRecord[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [activeScenarioName, setActiveScenarioName] = useState<string | null>(null)

  const [isLoadingList, setIsLoadingList] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isUpdating, setIsUpdating] = useState<boolean>(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Camada Modal Completa de Cenários (Subcamada)
  const [isScenariosModalOpen, setIsScenariosModalOpen] = useState<boolean>(false)
  const [searchFilter, setSearchFilter] = useState<string>('')

  // Modal rápido de Salvar
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false)
  const [scenarioNameInput, setScenarioNameInput] = useState<string>('')

  // Confirmação de exclusão
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Dropdown rápido de acesso (menu suspenso tradicional mantido e aprimorado com link para camada completa)
  const [isQuickDropdownOpen, setIsQuickDropdownOpen] = useState<boolean>(false)

  // Feedback banner / inline toast
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

  // Carrega cenários (nuvem + local)
  const fetchScenarios = useCallback(async () => {
    setIsLoadingList(true)
    try {
      const data = await listTaxScenarios()
      setScenarios(data)
    } catch (err: unknown) {
      console.error('Erro ao buscar cenários:', err)
      showFeedback('error', 'Não foi possível carregar os cenários salvos.')
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios, user])

  // Salvar novo cenário
  const handleSaveNew = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const name = scenarioNameInput.trim()
    if (!name) {
      showFeedback('error', 'Informe um nome para o cenário antes de salvar.')
      return
    }

    setIsSaving(true)
    try {
      const snapshot = getSnapshot()
      const newRecord = await createTaxScenario(name, snapshot)
      setScenarios((prev) => [newRecord, ...prev.filter((s) => s.id !== newRecord.id)])
      setActiveScenarioId(newRecord.id)
      setActiveScenarioName(newRecord.name)
      setIsSaveModalOpen(false)
      setScenarioNameInput('')
      showFeedback('success', `Cenário "${newRecord.name}" gravado com sucesso!`)
    } catch (err: unknown) {
      console.error('Erro ao salvar cenário:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao gravar cenário.'
      showFeedback('error', `Falha ao salvar cenário: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Atualizar cenário ativo com estado atual
  const handleUpdateCurrent = async () => {
    if (!activeScenarioId) return
    const target = scenarios.find((s) => s.id === activeScenarioId)
    const name = target?.name || activeScenarioName || 'Cenário'

    setIsUpdating(true)
    try {
      const snapshot = getSnapshot()
      const updatedRecord = await updateTaxScenario(activeScenarioId, { data: snapshot })
      setScenarios((prev) => prev.map((s) => (s.id === updatedRecord.id ? updatedRecord : s)))
      showFeedback(
        'success',
        `Cenário "${name}" sincronizado com os dados atuais de todas as telas!`,
      )
    } catch (err: unknown) {
      console.error('Erro ao atualizar cenário:', err)
      showFeedback('error', 'Falha ao atualizar o cenário ativo.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Carregar um cenário do banco/armazenamento
  const handleLoad = (scenario: TaxScenarioRecord) => {
    try {
      loadSnapshot(scenario.data)
      setActiveScenarioId(scenario.id)
      setActiveScenarioName(scenario.name)
      setIsQuickDropdownOpen(false)
      setIsScenariosModalOpen(false)
      showFeedback(
        'success',
        `Cenário "${scenario.name}" carregado e restaurado com sucesso em todas as telas (Markup, Compras e DREs)!`,
      )
    } catch (err: unknown) {
      console.error('Erro ao restaurar dados do cenário:', err)
      showFeedback('error', 'Não foi possível restaurar os dados deste cenário.')
    }
  }

  // Excluir cenário com confirmação
  const handleDelete = async (id: string, name: string) => {
    setIsDeletingId(id)
    try {
      await deleteTaxScenario(id)
      setScenarios((prev) => prev.filter((s) => s.id !== id))
      if (activeScenarioId === id) {
        setActiveScenarioId(null)
        setActiveScenarioName(null)
      }
      setConfirmDeleteId(null)
      showFeedback('success', `Cenário "${name}" excluído com sucesso.`)
    } catch (err: unknown) {
      console.error('Erro ao excluir cenário:', err)
      showFeedback('error', 'Falha ao excluir o cenário.')
    } finally {
      setIsDeletingId(null)
    }
  }

  // Formatação de data amigável
  const formatDate = (isoString?: string) => {
    if (!isoString) return ''
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

  // Helper para resumir dados do cenário
  const getScenarioSummary = (data?: TaxStateSnapshot) => {
    if (!data) return { regime: 'presumido', productsCount: 0, revenue: 0 }
    const regime = data.regime || 'presumido'
    const productsCount = data.markupProducts?.length || 0
    let revenue = data.totalConsolidatedRevenue || 0
    if (!revenue && data.simulatedSalePrice) {
      const qty =
        data.presumidoQuantitySold || data.realQuantitySold || data.simplesQuantitySold || 1
      revenue = data.simulatedSalePrice * qty
    }
    return { regime, productsCount, revenue }
  }

  // Lista filtrada para a subcamada
  const filteredScenarios = useMemo(() => {
    const q = searchFilter.toLowerCase().trim()
    if (!q) return scenarios
    return scenarios.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q)
      const regimeMatch = (s.data?.regime || '').toLowerCase().includes(q)
      return nameMatch || regimeMatch
    })
  }, [scenarios, searchFilter])

  return (
    <>
      {/* Barra de Cenários Superior / Inferior Enxuta */}
      <div className="relative z-10 w-full mb-6">
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] p-3 sm:p-3.5 shadow-lg shadow-black/40 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Esquerda: Identificação e status do cenário */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Bookmark className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Cenário Tributário
                  </span>
                  {activeScenarioName ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <BookmarkCheck className="w-3 h-3 text-emerald-400" />
                      Ativo: {activeScenarioName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
                      Rascunho não gravado
                    </span>
                  )}
                  {/* Chip discreto estilo do sistema: "Camada de Cenários ›" */}
                  <button
                    type="button"
                    onClick={() => setIsScenariosModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                    title="Abrir camada de todos os cenários gravados"
                  >
                    <Layers className="w-3 h-3 text-emerald-400" />
                    <span>Gerenciar ({scenarios.length}) ›</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  {activeScenarioName
                    ? 'Cenário carregado e sincronizado. Você pode atualizar ou criar um novo.'
                    : 'Grave ou recupere cenários completos (Markup, Compras e DREs) com capacidade para 10+ simulações.'}
                </p>
              </div>
            </div>

            {/* Direita: Ações principais limpas e enxutas */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão rápido: Cenários Salvos (com indicação do total e subcamada integrada) */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickDropdownOpen((prev) => !prev)}
                  className="h-8 text-xs font-semibold bg-[#0f172a] border-slate-700/80 text-slate-200 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-slate-800/80 gap-1.5 cursor-pointer"
                  title="Abrir menu rápido de cenários gravados"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Carregar Cenários</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {scenarios.length}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </Button>

                {/* Dropdown Menu com suporte completo a scroll e link para camada */}
                {isQuickDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsQuickDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-700/80 bg-[#0c1320] p-2.5 shadow-2xl z-40 backdrop-blur-xl animate-in fade-in-0 zoom-in-95">
                      <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800/80 text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200">Cenários Gravados</span>
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px] px-1.5 py-0">
                            Total: {scenarios.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchScenarios}
                            disabled={isLoadingList}
                            className="h-6 px-1.5 text-[11px] text-slate-400 hover:text-emerald-400"
                            title="Recarregar lista"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isLoadingList ? 'animate-spin' : ''}`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsQuickDropdownOpen(false)
                              setIsScenariosModalOpen(true)
                            }}
                            className="h-6 px-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 gap-1 font-mono"
                            title="Abrir em camada expansiva"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Camada ›</span>
                          </Button>
                        </div>
                      </div>

                      {/* Lista de cenários com scroll suave e indicação visual para 10+ cenários */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50 py-1 pr-1 custom-scrollbar">
                        {isLoadingList ? (
                          <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            <span>Carregando cenários...</span>
                          </div>
                        ) : scenarios.length === 0 ? (
                          <div className="py-6 px-3 text-center text-xs text-slate-400 space-y-1">
                            <p className="font-medium text-slate-300">
                              Nenhum cenário salvo ainda.
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Clique em "Salvar Cenário" para gravar o estado atual de todas as
                              telas.
                            </p>
                          </div>
                        ) : (
                          scenarios.map((sc) => {
                            const isCurrent = sc.id === activeScenarioId
                            const isDeleting = isDeletingId === sc.id
                            const summary = getScenarioSummary(sc.data)
                            return (
                              <div
                                key={sc.id}
                                className={`p-2.5 rounded-lg transition-colors flex flex-col gap-1.5 ${
                                  isCurrent
                                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                                    : 'hover:bg-slate-800/60'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-xs text-white truncate block">
                                        {sc.name}
                                      </span>
                                      {isCurrent && (
                                        <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/30 text-emerald-300 uppercase">
                                          Ativo
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                                        {formatDate(sc.updated || sc.created)}
                                      </span>
                                      <span className="text-slate-600">•</span>
                                      <span className="capitalize text-emerald-400/90 font-medium">
                                        {summary.regime === 'real'
                                          ? 'Lucro Real'
                                          : summary.regime === 'simples'
                                            ? 'Simples'
                                            : 'Presumido'}
                                      </span>
                                      {summary.productsCount > 0 && (
                                        <>
                                          <span className="text-slate-600">•</span>
                                          <span className="text-slate-400">
                                            {summary.productsCount}{' '}
                                            {summary.productsCount === 1 ? 'prod.' : 'prods.'}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/40">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleLoad(sc)}
                                    className="h-6 px-2 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 font-medium cursor-pointer"
                                  >
                                    Carregar
                                  </Button>

                                  {isCurrent && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleUpdateCurrent}
                                      disabled={isUpdating}
                                      title="Atualizar com os dados atuais da tela"
                                      className="h-6 px-2 text-[11px] text-teal-400 hover:text-teal-300 hover:bg-teal-500/20 font-medium cursor-pointer"
                                    >
                                      {isUpdating ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        'Atualizar'
                                      )}
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={isDeleting}
                                    onClick={() => setConfirmDeleteId(sc.id)}
                                    className="h-6 px-1.5 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                                    title="Excluir este cenário"
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      {/* Rodapé do dropdown: Atalho para abrir camada completa */}
                      {scenarios.length > 0 && (
                        <div className="pt-2 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span>
                            Exibindo {scenarios.length}{' '}
                            {scenarios.length === 1 ? 'cenário' : 'cenários'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuickDropdownOpen(false)
                              setIsScenariosModalOpen(true)
                            }}
                            className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <span>Ver todos em detalhes</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Botão Atualizar Cenário Ativo (se houver um selecionado) */}
              {activeScenarioId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateCurrent}
                  disabled={isUpdating}
                  title="Sobrescrever o cenário ativo com as alterações atuais de todas as telas"
                  className="h-8 text-xs font-semibold bg-teal-950/40 border-teal-500/40 text-teal-300 hover:bg-teal-900/50 hover:text-white gap-1.5 cursor-pointer"
                >
                  {isUpdating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                  )}
                  <span>Atualizar Ativo</span>
                </Button>
              )}

              {/* Botão Salvar Novo Cenário */}
              <Button
                size="sm"
                onClick={() => {
                  setScenarioNameInput(
                    activeScenarioName
                      ? `${activeScenarioName} (cópia)`
                      : `Cenário ${new Date().toLocaleDateString('pt-BR')}`,
                  )
                  setIsSaveModalOpen(true)
                }}
                className="h-8 text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20 gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Cenário</span>
              </Button>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`mt-2.5 px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
        </div>
      </div>

      {/* SUBCAMADA PRINCIPAL: MODAL DE GESTÃO COMPLETA DE CENÁRIOS (Padrão de Camadas do Sistema) */}
      <Dialog open={isScenariosModalOpen} onOpenChange={setIsScenariosModalOpen}>
        <DialogContent className="bg-[#0b121e] border-slate-700/80 text-slate-100 sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          {/* Cabeçalho da Camada */}
          <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-[#0d1624] to-[#09111c] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                  <span>Cenários Tributários Salvos</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono">
                    {scenarios.length} gravados
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Acesse, carregue, compare e gerencie todos os cenários completos salvos no
                  sistema.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchScenarios}
              disabled={isLoadingList}
              className="h-8 text-xs font-semibold bg-[#0f172a] border-slate-700 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>

          {/* Barra de Filtro e Busca */}
          <div className="p-4 bg-[#080d16] border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar por nome do cliente, cenário ou regime..."
                className="pl-9 bg-[#0c1320] border-slate-700 text-white text-xs h-9 focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>
                Capacidade: <strong>Mínimo 10+ cenários</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400">{filteredScenarios.length} exibidos</span>
            </div>
          </div>

          {/* Lista Completa de Cenários com scroll amplo e organizado em cards */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 max-h-[60vh] custom-scrollbar">
            {isLoadingList ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Carregando cenários gravados...</span>
              </div>
            ) : filteredScenarios.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-medium text-slate-300 text-sm">
                  {searchFilter
                    ? 'Nenhum cenário encontrado para os termos pesquisados.'
                    : 'Nenhum cenário salvo ainda.'}
                </p>
                <p className="text-xs text-slate-500">
                  Grave um novo cenário a qualquer momento com o botão "Salvar Cenário".
                </p>
              </div>
            ) : (
              filteredScenarios.map((sc, index) => {
                const isCurrent = sc.id === activeScenarioId
                const isDeleting = isDeletingId === sc.id
                const summary = getScenarioSummary(sc.data)
                return (
                  <div
                    key={sc.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                        : 'bg-[#0e1625]/80 hover:bg-[#121c2f] border-slate-800'
                    }`}
                  >
                    {/* Info do Cenário */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-slate-800/90 text-slate-300 flex items-center justify-center shrink-0 font-mono text-xs font-bold border border-slate-700/60 mt-0.5">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white truncate block">
                            {sc.name}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono uppercase">
                              Cenário Ativo
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-mono capitalize ${
                              summary.regime === 'real'
                                ? 'border-teal-500/40 text-teal-300 bg-teal-500/10'
                                : summary.regime === 'simples'
                                  ? 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10'
                                  : 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                            }`}
                          >
                            {summary.regime === 'real'
                              ? 'Lucro Real'
                              : summary.regime === 'simples'
                                ? 'Simples Nacional'
                                : 'Lucro Presumido'}
                          </Badge>
                        </div>

                        {/* Metadados analíticos */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formatDate(sc.updated || sc.created)}
                          </span>
                          {summary.productsCount > 0 && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-300">
                                {summary.productsCount}{' '}
                                {summary.productsCount === 1
                                  ? 'produto cadastrado'
                                  : 'produtos cadastrados'}
                              </span>
                            </>
                          )}
                          {summary.revenue > 0 && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-emerald-400 font-semibold">
                                Receita: {formatBRL(summary.revenue)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação na Subcamada */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <Button
                        size="sm"
                        onClick={() => handleLoad(sc)}
                        className="h-8 text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 px-3 cursor-pointer shadow-sm shadow-emerald-500/20"
                      >
                        Carregar
                      </Button>

                      {isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleUpdateCurrent}
                          disabled={isUpdating}
                          className="h-8 text-xs font-semibold bg-teal-950/40 border-teal-500/40 text-teal-300 hover:bg-teal-900/50 hover:text-white px-2.5 cursor-pointer"
                          title="Sincronizar este cenário com alterações recentes"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Atualizar'
                          )}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isDeleting}
                        onClick={() => setConfirmDeleteId(sc.id)}
                        className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                        title="Excluir este cenário"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Rodapé da Subcamada */}
          <div className="p-4 border-t border-slate-800 bg-[#09111c] flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Total disponível: <strong className="text-emerald-400">{scenarios.length}</strong>{' '}
              cenários gravados
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScenariosModalOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsScenariosModalOpen(false)
                  setScenarioNameInput(
                    activeScenarioName
                      ? `${activeScenarioName} (cópia)`
                      : `Cenário ${new Date().toLocaleDateString('pt-BR')}`,
                  )
                  setIsSaveModalOpen(true)
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Cenário</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Salvar Cenário */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="bg-[#0b121e] border-slate-700/80 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Save className="w-5 h-5 text-emerald-400" />
              Salvar Cenário Tributário
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              O snapshot completo de todas as calculadoras (Markup, Compras, DRE Simples, DRE Lucro
              Presumido, DRE Lucro Real e Dashboard) será preservado de forma íntegra e acessível.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNew} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome do Cenário / Cliente
              </label>
              <Input
                value={scenarioNameInput}
                onChange={(e) => setScenarioNameInput(e.target.value)}
                placeholder="Ex.: Cliente Alfa — Comércio SP — 2025"
                autoFocus
                className="bg-[#070b12] border-slate-700 text-white focus:border-emerald-500 focus:ring-emerald-500/30"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Dica: identifique pelo cliente, segmento ou data para facilitar o acesso em camadas.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSaveModalOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving || !scenarioNameInput.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Confirmar e Salvar</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Exclusão com Confirmação Segura */}
      <Dialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent className="bg-[#0b121e] border-slate-700/80 text-slate-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Excluir Cenário?
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Tem certeza de que deseja excluir este cenário? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteId(null)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={Boolean(isDeletingId)}
              onClick={() => {
                if (confirmDeleteId) {
                  const sc = scenarios.find((s) => s.id === confirmDeleteId)
                  handleDelete(confirmDeleteId, sc?.name || 'Cenário')
                }
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
            >
              {isDeletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
