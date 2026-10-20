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
      {/* Barra de Cenários Superior / Inferior Enxuta com Acabamento Ouro/Marrom */}
      <div className="relative z-10 w-full mb-6">
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-[#0d1624] via-[#09111c] to-[#0a1420] p-3 sm:p-3.5 shadow-lg shadow-black/40 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Esquerda: Identificação e status do cenário */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <Bookmark className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Cenário Tributário
                  </span>
                  {activeScenarioName ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-400/40">
                      <BookmarkCheck className="w-3 h-3 text-amber-300" />
                      Ativo: {activeScenarioName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
                      Rascunho não gravado
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Direita: Ação Gravar Cenário com Ouro Dramático */}
            <div className="flex items-center gap-2 flex-wrap">
              {onGravarCenario && (
                <button
                  type="button"
                  onClick={onGravarCenario}
                  className="group/btn relative overflow-hidden inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] hover:text-[#0f0700] text-xs font-black uppercase tracking-wide shadow-md shadow-amber-950/30 hover:shadow-lg hover:shadow-amber-500/35 cursor-pointer transition-all duration-300"
                  title="Gravar cenário tributário completo"
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-40 group-hover/btn:opacity-70 mix-blend-overlay transition-opacity duration-300"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
                    }}
                  />
                  <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/btn:translate-x-[130%] transition-transform duration-700 ease-out" />
                  <Save className="relative z-10 w-3.5 h-3.5 text-[#3b2405]" />
                  <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                    Gravar Cenário
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`mt-2.5 px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${
                feedback.type === 'success'
                  ? 'bg-amber-500/15 border-amber-400/30 text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
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
