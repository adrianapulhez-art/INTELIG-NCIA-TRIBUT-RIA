import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTaxContext } from '@/contexts/TaxContext'
import {
  listTaxScenarios,
  createTaxScenario,
  updateTaxScenario,
  deleteTaxScenario,
  TaxScenarioRecord,
} from '@/services/taxScenarios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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

  // Modais
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false)
  const [scenarioNameInput, setScenarioNameInput] = useState<string>('')
  const [isListDropdownOpen, setIsListDropdownOpen] = useState<boolean>(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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

  // Carrega cenários do banco
  const fetchScenarios = useCallback(async () => {
    if (!user) return
    setIsLoadingList(true)
    try {
      const data = await listTaxScenarios()
      setScenarios(data)
    } catch (err: unknown) {
      console.error('Erro ao buscar cenários:', err)
      showFeedback('error', 'Não foi possível carregar os cenários salvos no servidor.')
    } finally {
      setIsLoadingList(false)
    }
  }, [user])

  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios])

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
      showFeedback('success', `Cenário "${newRecord.name}" salvo no banco de dados com sucesso!`)
    } catch (err: unknown) {
      console.error('Erro ao salvar cenário:', err)
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao salvar cenário.'
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
      showFeedback('success', `Cenário "${name}" atualizado no servidor com o estado atual!`)
    } catch (err: unknown) {
      console.error('Erro ao atualizar cenário:', err)
      showFeedback('error', 'Falha ao atualizar cenário no banco.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Carregar um cenário do banco
  const handleLoad = (scenario: TaxScenarioRecord) => {
    try {
      loadSnapshot(scenario.data)
      setActiveScenarioId(scenario.id)
      setActiveScenarioName(scenario.name)
      setIsListDropdownOpen(false)
      showFeedback('success', `Cenário "${scenario.name}" restaurado em todas as calculadoras!`)
    } catch (err: unknown) {
      console.error('Erro ao restaurar dados do cenário:', err)
      showFeedback('error', 'Não foi possível restaurar os dados deste cenário.')
    }
  }

  // Excluir cenário
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
      showFeedback('success', `Cenário "${name}" excluído do servidor com sucesso.`)
    } catch (err: unknown) {
      console.error('Erro ao excluir cenário:', err)
      showFeedback('error', 'Falha ao excluir cenário no servidor.')
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

  return (
    <>
      {/* Barra de Cenários Superior */}
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
                      Rascunho não salvo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  {activeScenarioName
                    ? 'Dados sincronizados com o servidor. Você pode atualizar ou criar um novo.'
                    : 'Salve os dados de todas as telas (Markup, Compras e DREs) no banco na nuvem.'}
                </p>
              </div>
            </div>

            {/* Direita: Ações principais */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Dropdown de Cenários Salvos */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsListDropdownOpen((prev) => !prev)}
                  className="h-8 text-xs font-semibold bg-[#0f172a] border-slate-700/80 text-slate-200 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-slate-800/80 gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cenários Salvos</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {scenarios.length}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </Button>

                {/* Dropdown menu */}
                {isListDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsListDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-700/80 bg-[#0c1320] p-2 shadow-2xl z-40 backdrop-blur-xl animate-in fade-in-0 zoom-in-95">
                      <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800/80 text-xs">
                        <span className="font-semibold text-slate-200">Seus cenários no banco</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={fetchScenarios}
                          disabled={isLoadingList}
                          className="h-6 px-1.5 text-[11px] text-slate-400 hover:text-emerald-400"
                          title="Recarregar lista"
                        >
                          <RefreshCw className={`w-3 h-3 ${isLoadingList ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50 py-1">
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
                              Clique em "Salvar cenário" para gravar o estado atual de todas as
                              telas.
                            </p>
                          </div>
                        ) : (
                          scenarios.map((sc) => {
                            const isCurrent = sc.id === activeScenarioId
                            const isDeleting = isDeletingId === sc.id
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
                                        {sc.data?.regime || 'presumido'}
                                      </span>
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

                                  {isCurrent ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleUpdateCurrent}
                                      disabled={isUpdating}
                                      className="h-6 px-2 text-[11px] text-teal-400 hover:text-teal-300 hover:bg-teal-500/20 font-medium cursor-pointer"
                                    >
                                      {isUpdating ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        'Atualizar'
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        handleLoad(sc)
                                      }}
                                      title="Carregar este cenário"
                                      className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                    >
                                      Abrir
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
                  title="Sobrescrever o cenário ativo no banco com as alterações atuais de todas as telas"
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
                      : `Cliente ${new Date().toLocaleDateString('pt-BR')}`,
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

      {/* Modal: Salvar Cenário */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="bg-[#0b121e] border-slate-700/80 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Save className="w-5 h-5 text-emerald-400" />
              Salvar Cenário Tributário no Banco
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              O snapshot completo de todas as calculadoras (Markup, Compras, DRE Simples, DRE Lucro
              Presumido, DRE Lucro Real e Comparação) será salvo no servidor vinculado ao seu
              usuário.
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
                Dica: identifique pelo cliente, segmento ou data para facilitar o acesso de qualquer
                dispositivo.
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
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold gap-1.5"
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

      {/* Modal: Confirmar Exclusão */}
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
              Tem certeza de que deseja excluir este cenário do banco de dados? Esta ação não pode
              ser desfeita.
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
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              {isDeletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
