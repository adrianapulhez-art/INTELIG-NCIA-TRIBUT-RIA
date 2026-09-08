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
  CheckCircle2,
  PlusCircle,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react'

export default function ClientsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loadSnapshot, getSnapshot } = useTaxContext()

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
      loadSnapshot(scenario.data)
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
        <div className="bg-[#08120e]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Gerenciador de Cenários Tributários
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                    Consultoria IT
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
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
                className="h-8 text-xs font-semibold bg-[#0f172a] border-slate-700 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 cursor-pointer gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Atualizar lista</span>
              </Button>

              <Button
                size="sm"
                onClick={() => navigate('/demo/markup')}
                className="h-8 text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer gap-1.5 shadow-sm shadow-emerald-500/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Nova Simulação</span>
              </Button>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
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

        {/* 3 Cards de Resumo no Topo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0b101b]/90 border border-slate-800/90 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
                Cenários Salvos
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {summaryMetrics.total}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Simulações salvas no banco pelo seu usuário
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#0b101b]/90 border border-slate-800/90 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
                Regime Mais Frequente
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-teal-300 truncate">
              {summaryMetrics.mostUsedRegime}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Regime mais selecionado nos snapshots</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#0b101b]/90 border border-slate-800/90 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
                Última Atualização
              </span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-sm sm:text-base font-semibold font-mono text-slate-200">
              {summaryMetrics.lastSimulationDate}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Data e horário da simulação mais recente
            </p>
          </div>
        </div>

        {/* Tabela e Filtros de Cenários */}
        <div className="bg-[#0b101b]/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Carteira de Cenários Tributários
              </h3>
              <span className="text-xs font-mono text-slate-500">
                ({filteredScenarios.length} de {scenarios.length})
              </span>
            </div>

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Filtrar por nome ou regime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 bg-slate-950/70 border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista / Tabela */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mx-auto" />
              <p className="text-xs text-slate-400 font-mono">
                Consultando cenários salvos no servidor seguro...
              </p>
            </div>
          ) : scenarios.length === 0 ? (
            /* Estado vazio amigável */
            <div className="py-12 sm:py-16 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <FolderOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-white">Nenhum cenário salvo ainda</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para que um cliente ou diagnóstico apareça neste painel, basta abrir qualquer
                  calculadora (Markup, Compras ou DREs), preencher os dados e clicar em{' '}
                  <strong className="text-emerald-400">"Salvar Cenário"</strong> na barra inferior.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => navigate('/demo/markup')}
                  className="h-9 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <span>Ir para a Calculadora Markup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : filteredScenarios.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-xs text-slate-400">
                Nenhum cenário encontrado para a busca{' '}
                <strong className="text-emerald-400">"{searchQuery}"</strong>.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-xs text-emerald-400 hover:bg-emerald-500/10 h-7"
              >
                Limpar busca
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-left">
                    <th className="py-3 px-3 font-semibold text-slate-300">Cenário / Cliente</th>
                    <th className="py-3 px-3 font-semibold text-slate-300">Regime Salvo</th>
                    <th className="py-3 px-3 font-semibold text-slate-300 hidden md:table-cell">
                      Receita Bruta Est.
                    </th>
                    <th className="py-3 px-3 font-semibold text-slate-300 hidden sm:table-cell">
                      Criado em
                    </th>
                    <th className="py-3 px-3 font-semibold text-slate-300 hidden lg:table-cell">
                      Última Atualização
                    </th>
                    <th className="py-3 px-3 font-semibold text-slate-300 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredScenarios.map((sc) => {
                    const isEditing = editingId === sc.id
                    const details = deriveScenarioDetails(sc.data)
                    const isUpdating = updatingId === sc.id

                    return (
                      <tr key={sc.id} className="hover:bg-slate-900/50 transition-colors group">
                        {/* Nome do Cenário (com edição inline) */}
                        <td className="py-3 px-3 text-slate-200">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 max-w-xs">
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                                className="h-7 text-xs bg-slate-950 border-emerald-500 text-white font-sans"
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
                                className="h-7 w-7 p-0 text-emerald-400 hover:bg-emerald-500/20"
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
                                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white font-sans text-xs sm:text-sm">
                                {sc.name}
                              </span>
                              <button
                                onClick={() => startEditing(sc)}
                                className="text-slate-500 hover:text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity p-0.5"
                                title="Renomear este cenário"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                            ID: {sc.id}
                          </span>
                        </td>

                        {/* Regime Tributário */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                              details.regime === 'simples'
                                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                                : details.regime === 'real'
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {details.regimeLabel}
                          </span>
                        </td>

                        {/* Receita Bruta Estimada */}
                        <td className="py-3 px-3 hidden md:table-cell text-slate-300 font-mono">
                          {details.revenue > 0 ? (
                            <span className="text-slate-200 font-semibold">
                              {formatBRL(details.revenue)}
                            </span>
                          ) : (
                            <span className="text-slate-500">R$ 0,00</span>
                          )}
                        </td>

                        {/* Data de Criação */}
                        <td className="py-3 px-3 hidden sm:table-cell text-slate-400">
                          {formatDate(sc.created)}
                        </td>

                        {/* Data de Atualização */}
                        <td className="py-3 px-3 hidden lg:table-cell text-slate-400">
                          {formatDate(sc.updated)}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Carregar e ir para home */}
                            <Button
                              size="sm"
                              onClick={() => handleLoadAndNavigate(sc)}
                              className="h-7 px-2.5 text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer gap-1"
                              title="Restaurar este cenário nas calculadoras e ir para a demo"
                            >
                              <span>Carregar</span>
                              <ArrowRight className="w-3 h-3" />
                            </Button>

                            {/* Atualizar com snapshot atual */}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating}
                              onClick={() => handleUpdateSnapshot(sc)}
                              className="h-7 px-2 text-[11px] bg-slate-900 border-slate-700/80 text-teal-300 hover:bg-teal-500/20 hover:border-teal-500/40 cursor-pointer"
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
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Renomear cenário"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            {/* Excluir */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(sc.id)}
                              className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 cursor-pointer"
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

        {/* Modal de Confirmação de Exclusão */}
        <Dialog
          open={Boolean(deleteConfirmId)}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        >
          <DialogContent className="bg-[#0b121e] border-slate-700/80 text-slate-100 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white text-base flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Excluir Cenário do Servidor?
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Esta ação apagará permanentemente o cenário e seus parâmetros do banco de dados na
                nuvem. Não é possível desfazer.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteScenario}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
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
      </div>
    </DemoLayout>
  )
}
