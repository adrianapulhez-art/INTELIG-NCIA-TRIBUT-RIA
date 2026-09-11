import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTaxContext } from '@/contexts/TaxContext'
import { Button } from '@/components/ui/button'
import { LogOut, RotateCcw, Sparkles, Bot, Undo2, Redo2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { AssistantChatDrawer } from './AssistantChatDrawer'
import { AssistantFloatingButton } from './AssistantFloatingButton'
import { getAssistantForTab } from '@/services/tableAssistantsConfig'
export type TabKey =
  | 'home'
  | 'markup'
  | 'compras'
  | 'simples'
  | 'dre-presumido'
  | 'dre-real'
  | 'comparacao'
  | 'reforma'
  | 'clientes'

interface DemoLayoutProps {
  currentTab: TabKey
  children: React.ReactNode
}

export const DemoLayout: React.FC<DemoLayoutProps> = ({ currentTab, children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { resetAll, undo, redo, canUndo, canRedo, undoCount, redoCount } = useTaxContext()
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false)

  const handleUndo = React.useCallback(() => {
    if (undo()) {
      toast.success('Ação desfeita', {
        duration: 2000,
        className: 'bg-emerald-950 border-emerald-500/30 text-emerald-200 text-xs',
      })
    }
  }, [undo])

  const handleRedo = React.useCallback(() => {
    if (redo()) {
      toast.success('Ação refeita', {
        duration: 2000,
        className: 'bg-emerald-950 border-emerald-500/30 text-emerald-200 text-xs',
      })
    }
  }, [redo])

  // Listener de atalhos globais de teclado (Ctrl+Z / Cmd+Z e Ctrl+Y / Cmd+Shift+Z)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora quando o foco estiver em inputs de texto ou elementos editáveis
      const target = e.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase()
      const isEditable =
        tagName === 'input' ||
        tagName === 'textarea' ||
        target?.isContentEditable ||
        target?.getAttribute('role') === 'textbox'

      if (isEditable) {
        return
      }

      const isMac =
        typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (!modifier) return

      // Redo: Ctrl+Y ou Cmd+Shift+Z ou Ctrl+Shift+Z
      if (
        (e.key.toLowerCase() === 'y' && !e.shiftKey) ||
        (e.key.toLowerCase() === 'z' && e.shiftKey)
      ) {
        e.preventDefault()
        handleRedo()
        return
      }

      // Undo: Ctrl+Z ou Cmd+Z (sem shift)
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  const currentAssistant = React.useMemo(() => getAssistantForTab(currentTab), [currentTab])

  const displayName = user?.name || user?.email?.split('@')[0] || 'Cliente IT'
  const userInitials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'IT'

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  const tabs: { key: TabKey; label: string; path: string }[] = [
    { key: 'home', label: 'Início', path: '/demo' },
    { key: 'compras', label: 'Calculadora de Compras', path: '/demo/compras' },
    { key: 'markup', label: 'Calculadora Markup', path: '/demo/markup' },
    { key: 'dre-presumido', label: 'DRE Lucro Presumido', path: '/demo/dre-presumido' },
    { key: 'dre-real', label: 'DRE Lucro Real', path: '/demo/dre-real' },
    { key: 'simples', label: 'DRE Simples Nacional', path: '/demo/simples' },
    { key: 'comparacao', label: 'Comparação de Regimes', path: '/demo/comparacao' },
    { key: 'reforma', label: 'Reforma Tributária', path: '/demo/reforma' },
    { key: 'clientes', label: 'Clientes', path: '/demo/clientes' },
  ]

  return (
    <div className="min-h-screen bg-[#050a08] text-slate-100 flex flex-col justify-between relative selection:bg-emerald-500/30 selection:text-emerald-300 font-sans overflow-x-hidden">
      {/* Atmosfera tom sobre tom em verdes esfumados (estilo Adapta) */}
      <div className="fixed inset-0 pointer-events-none bg-emerald-smoky-atmosphere z-0" />
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-25 z-0" />

      {/* Brumas suaves adicionais para profundidade futurista */}
      <div className="fixed -top-40 left-1/4 w-[600px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed top-1/2 -right-40 w-[500px] h-[500px] bg-teal-600/10 blur-[140px] rounded-full pointer-events-none z-0" />

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-emerald-500/20 bg-[#06100d]/85 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between shadow-lg shadow-black/40">
        <Link to="/demo" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-slate-950 text-sm font-mono">IT</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
              IT — Inteligência Tributária
            </span>
            <span className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ambiente de Demonstração
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Botões de Desfazer e Refazer (Undo/Redo) */}
          <div className="flex items-center gap-1 bg-[#091511]/90 border border-emerald-500/20 rounded-lg p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  aria-label="Desfazer última ação (Ctrl+Z)"
                  className="text-xs h-7 px-2 text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-500 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px] font-medium">Desfazer</span>
                  {undoCount > 0 && (
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {undoCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-xs bg-slate-900 border-slate-700 text-slate-200"
              >
                <span>Desfazer última ação (Ctrl+Z)</span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  aria-label="Refazer ação (Ctrl+Y ou Cmd+Shift+Z)"
                  className="text-xs h-7 px-2 text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-500 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px] font-medium">Refazer</span>
                  {redoCount > 0 && (
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {redoCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-xs bg-slate-900 border-slate-700 text-slate-200"
              >
                <span>Refazer ação (Ctrl+Y / Cmd+Shift+Z)</span>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Botão de Atalho para o Assistente da Tabela no Header */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAssistantOpen(true)}
            title={`Abrir assistente da tabela (${currentAssistant.pageName})`}
            className="text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 flex items-center gap-1.5 h-8 cursor-pointer shadow-sm shadow-emerald-950/40"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Assistente IA</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            title="Zerar todos os campos e simulações"
            className="text-xs text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 h-8 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Zerar campos</span>
          </Button>

          {/* Perfil */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800/80">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shadow-inner"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono text-xs font-semibold shadow-inner">
                {userInitials}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200 leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                {user?.email}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 h-8 cursor-pointer ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Barra de Navegação em Pills estilo Adapta (Header escuro com pills arredondadas) */}
      <div className="relative z-10 pt-6 pb-2 px-4 sm:px-8 max-w-6xl mx-auto w-full text-center">
        {/* Badge AMBIENTE DE TESTES */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 font-mono text-xs tracking-wider uppercase shadow-sm mb-4">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>AMBIENTE DE TESTES</span>
        </div>

        {/* Barra de Tabs em Pills com degradê sutil e cantos arredondados estilo Adapta */}
        <div className="p-1.5 rounded-2xl bg-[#091511]/90 border border-emerald-500/25 backdrop-blur-md inline-flex flex-wrap items-center justify-center gap-1.5 shadow-xl shadow-emerald-950/40 max-w-full">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 font-bold scale-[1.02]'
                    : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Container onde a página ativa é renderizada */}
      <main className="relative z-10 flex-1 px-4 sm:px-8 pt-4 pb-16 max-w-6xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 border-t border-emerald-500/15 bg-[#050e0b]/90 text-center text-xs text-slate-500 font-mono">
        IT — Inteligência Tributária • Demonstração Interativa integrada
      </footer>

      {/* Assistente de IA Nativo da Skip Cloud - Botão Flutuante e Drawer Lateral */}
      <AssistantFloatingButton
        isOpen={isAssistantOpen}
        onClick={() => setIsAssistantOpen(true)}
        currentTab={currentTab}
      />

      <AssistantChatDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        currentTab={currentTab}
      />
    </div>
  )
}
