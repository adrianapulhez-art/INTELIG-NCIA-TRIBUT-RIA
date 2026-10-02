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

export interface ScenarioManagerBarProps {
  onGravarCenario?: () => void
}

export const ScenarioManagerBar: React.FC<ScenarioManagerBarProps> = ({ onGravarCenario }) => {
  const { user } = useAuth()
  const { getSnapshot, loadSnapshot, ativarCenario } = useTaxContext()

  const [scenarios, setScenarios] = useState<TaxScenarioRecord[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [activeScenarioName, setActiveScenarioName] = useState<string | null>(null)

  const [isLoadingList, setIsLoadingList] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isUpdating, setIsUpdating] = useState<boolean>(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  const fetchScenarios = useCallback(async () => {
    setIsLoadingList(true)
    try {
      const list = await listTaxScenarios()
      setScenarios(list)
    } catch (err) {
      console.error('Erro ao carregar cenários:', err)
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios])

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
                  {/* CEO 02/10: gerenciamento sai da barra — vive DENTRO do modal
                      (botões matriz por escopo). Barra fica só com Gravar Cenário. */}
                </div>
              </div>
            </div>

            {/* Direita: Ações principais limpas e enxutas — CEO 02/10: SÓ Gravar Cenário
                (Gerenciar e Carregar Cenários saem da barra; gestão vive no modal) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão Gravar Cenário (abre o modal rico quando onGravarCenario é fornecido) */}
              <Button
                size="sm"
                onClick={() => {
                  if (onGravarCenario) {
                    onGravarCenario()
                  } else {
                    setScenarioNameInput(
                      activeScenarioName
                        ? `${activeScenarioName} (revisão)`
                        : `Cenário Gravado — ${new Date().toLocaleDateString('pt-BR')}`,
                    )
                    setIsSaveModalOpen(true)
                  }
                }}
                className="h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/25 gap-1.5 cursor-pointer"
                title="Gravar cenário tributário completo"
              >
                <Save className="w-3.5 h-3.5 text-slate-950" />
                <span>Gravar Cenário</span>
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
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default ScenarioManagerBar
