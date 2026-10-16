import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTaxContext } from '@/contexts/TaxContext'
import { Button } from '@/components/ui/button'
import { LogOut, RotateCcw, Sparkles, Undo2, Redo2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { ItAssistantWidget } from '@/components/demo/ItAssistantWidget'

export type TabKey =
  | 'home'
  | 'simulador-opcao'
  | 'compras'
  | 'markup'
  | 'despesas-operacionais'
  | 'dre-presumido'
  | 'dre-real'
  | 'simples'
  | 'dashboard'
  | 'reforma'
  | 'clientes'
  | 'manual'
interface DemoLayoutProps {
  currentTab: TabKey
  children: React.ReactNode
}

export const DemoLayout: React.FC<DemoLayoutProps> = ({ currentTab, children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const {
    resetAll,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    cenarioAtivo,
    desativarCenario,
  } = useTaxContext()

  const handleDesativarCenario = React.useCallback(() => {
    desativarCenario()
    toast.success('Cenário desativado — telas zeradas', {
      duration: 2500,
      className: 'bg-emerald-950 border-emerald-500/30 text-emerald-200 text-xs',
    })
  }, [desativarCenario])

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
    {
      key: 'simulador-opcao',
      label: 'Simulador de Opção (PGDAS × Regular)',
      path: '/demo/simulador-opcao',
    },
    { key: 'compras', label: 'Calculadora de Compras', path: '/demo/compras' },
    { key: 'markup', label: 'Calculadora Markup', path: '/demo/markup' },
    {
      key: 'despesas-operacionais',
      label: 'Despesas e Receitas Op.',
      path: '/demo/despesas-operacionais',
    },
    { key: 'dre-presumido', label: 'DRE Lucro Presumido', path: '/demo/dre-presumido' },
    { key: 'dre-real', label: 'DRE Lucro Real', path: '/demo/dre-real' },
    { key: 'simples', label: 'DRE Simples Nacional', path: '/demo/simples' },
    { key: 'dashboard', label: 'Dashboard', path: '/demo/dashboard' },
    { key: 'reforma', label: 'Reforma Tributária', path: '/demo/reforma' },
    { key: 'clientes', label: 'Clientes', path: '/demo/clientes' },
    { key: 'manual', label: 'Manual', path: '/demo/manual' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative selection:bg-emerald-100 selection:text-emerald-900 font-sans overflow-x-hidden">
      {/* Fundo sutil neutro */}
      <div className="fixed inset-0 pointer-events-none bg-slate-50 z-0" />
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-40 z-0" />

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm">
        <Link to="/demo" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-white text-sm font-mono">IT</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">
              IT — Inteligência Tributária
            </span>
            <span className="text-[10px] text-emerald-700 font-medium tracking-wide uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ambiente de Demonstração
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Indicador de CENÁRIO ATIVO (multi-cliente) — persistente em pré e pós-reforma */}
          {cenarioAtivo && (
            <div className="hidden md:flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span className="text-[11px] font-medium text-sky-800 max-w-[220px] truncate">
                Cenário: {cenarioAtivo.cliente} · {cenarioAtivo.nome}
              </span>
              <button
                type="button"
                onClick={handleDesativarCenario}
                title="Desativar o cenário ativo e zerar as telas"
                className="text-[10px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 cursor-pointer hover:bg-rose-100 transition-colors"
              >
                Desativar
              </button>
            </div>
          )}
          {/* Botões de Desfazer e Refazer (Undo/Redo) */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  aria-label="Desfazer última ação (Ctrl+Z)"
                  className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px] font-medium">Desfazer</span>
                  {undoCount > 0 && (
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {undoCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-xs bg-slate-900 border-slate-700 text-slate-100"
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
                  className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px] font-medium">Refazer</span>
                  {redoCount > 0 && (
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {redoCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-xs bg-slate-900 border-slate-700 text-slate-100"
              >
                <span>Refazer ação (Ctrl+Y / Cmd+Shift+Z)</span>
              </TooltipContent>
            </Tooltip>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            title="Zerar todos os campos e simulações"
            className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 h-8 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Zerar campos</span>
          </Button>

          {/* Perfil */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-mono text-xs font-semibold shadow-sm">
                {userInitials}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[160px]">
                {user?.email}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 h-8 cursor-pointer ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Barra de Navegação em Tabs / Pills neutras com acento esmeralda */}
      <div className="relative z-10 pt-5 pb-2 px-4 sm:px-8 max-w-6xl mx-auto w-full text-center">
        {/* Badge AMBIENTE DE DEMONSTRAÇÃO */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium text-xs tracking-wide uppercase shadow-sm mb-3">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Ambiente de Demonstração</span>
        </div>

        {/* Barra de Tabs em Pills com fundo branco e borda suave */}
        <div className="p-1.5 rounded-2xl bg-white border border-slate-200 inline-flex flex-wrap items-center justify-center gap-1.5 shadow-sm max-w-full">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
      <footer className="relative z-10 py-5 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        IT — Inteligência Tributária • Demonstração Interativa integrada
      </footer>

      {/* Assistente IT — agente único (manual como base de conhecimento) */}
      <ItAssistantWidget />
    </div>
  )
}
