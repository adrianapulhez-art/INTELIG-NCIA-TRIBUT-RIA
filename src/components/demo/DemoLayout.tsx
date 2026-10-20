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
      className: 'bg-[#261502] border-amber-500/40 text-amber-200 text-xs',
    })
  }, [desativarCenario])

  const handleUndo = React.useCallback(() => {
    if (undo()) {
      toast.success('Ação desfeita', {
        duration: 2000,
        className: 'bg-[#261502] border-amber-500/40 text-amber-200 text-xs',
      })
    }
  }, [undo])

  const handleRedo = React.useCallback(() => {
    if (redo()) {
      toast.success('Ação refeita', {
        duration: 2000,
        className: 'bg-[#261502] border-amber-500/40 text-amber-200 text-xs',
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
    { key: 'reforma', label: 'Calculadora de Compras - Pós EC 132', path: '/demo/reforma' },
    { key: 'clientes', label: 'Clientes', path: '/demo/clientes' },
    { key: 'manual', label: 'Manual', path: '/demo/manual' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative selection:bg-amber-100 selection:text-amber-950 font-sans overflow-x-hidden">
      {/* Fundo sutil neutro */}
      <div className="fixed inset-0 pointer-events-none bg-slate-50 z-0" />
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-40 z-0" />

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-amber-900/10 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm">
        <Link to="/demo" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-300/80 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-[#261502] text-sm font-mono drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
              IT
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-[#5c3e06] transition-colors">
              IT — Inteligência Tributária
            </span>
            <span className="text-[10px] text-[#5c3e06] font-semibold tracking-wide uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b87c14]" />
              Ambiente de Demonstração
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Indicador de CENÁRIO ATIVO (multi-cliente) — persistente em pré e pós-reforma */}
          {cenarioAtivo && (
            <div className="hidden md:flex items-center gap-2 bg-amber-50/80 border border-amber-300/80 rounded-lg px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b87c14]" />
              <span className="text-[11px] font-semibold text-[#3b2405] max-w-[220px] truncate">
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
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-amber-100 text-[#3b2405] border border-amber-300">
                      {undoCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-xs bg-[#261502] border-amber-700/60 text-amber-100"
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
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-amber-100 text-[#3b2405] border border-amber-300">
                      {redoCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-xs bg-[#261502] border-amber-700/60 text-amber-100"
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
                className="w-8 h-8 rounded-full object-cover border border-amber-200 shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#f9e596] to-[#e5b742] border border-amber-300 flex items-center justify-center text-[#261502] font-mono text-xs font-extrabold shadow-sm">
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

      {/* Barra de Navegação em Tabs / Pills com tratamento dourado metálico escovado e brilho dramático */}
      <div className="relative z-10 pt-5 pb-2 px-4 sm:px-8 max-w-6xl mx-auto w-full text-center">
        {/* Selo AMBIENTE DE DEMONSTRAÇÃO — Tratamento Dourado Metálico com Brilho Dramático */}
        <div className="group/pill relative overflow-hidden inline-flex items-center gap-1.5 px-4 py-1 rounded-full border border-amber-300/90 bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-extrabold text-xs tracking-wider uppercase shadow-md shadow-amber-950/20 mb-3.5 cursor-default transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/30 hover:border-amber-100">
          {/* 1. Camada de reflexo metálico escovado horizontal com faixas especulares */}
          <div
            className="pointer-events-none absolute inset-0 opacity-45 group-hover/pill:opacity-70 mix-blend-overlay transition-opacity duration-300"
            style={{
              background:
                'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
            }}
          />
          {/* 2. Camada de microtextura folheada a ouro suave */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25 group-hover/pill:opacity-40 mix-blend-soft-light transition-opacity duration-300"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 30%, rgba(255,240,150,0.8), transparent 70%)',
            }}
          />
          {/* 3. Chanfro / linha superior luminosa */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90 group-hover/pill:opacity-100 transition-opacity duration-300" />
          {/* 4. Iluminação radial no hover */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.45),transparent_70%)] opacity-0 group-hover/pill:opacity-100 transition-opacity duration-300" />
          {/* 5. Sheen diagonal fluido no hover */}
          <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/pill:translate-x-[130%] transition-transform duration-700 ease-out" />

          <Sparkles className="relative z-10 w-3.5 h-3.5 text-[#3b2405] drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]" />
          <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] group-hover/pill:drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] uppercase">
            Ambiente de Demonstração
          </span>
        </div>

        {/* Barra de Tabs em Pills com tratamento dourado e texto em maiúsculo (uppercase) */}
        <div className="p-2 rounded-2xl bg-white/95 border border-amber-300/50 inline-flex flex-wrap items-center justify-center gap-1.5 shadow-lg shadow-amber-950/10 max-w-full backdrop-blur-md">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`group/navbtn relative overflow-hidden px-3.5 sm:px-4 py-2 rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] font-black shadow-md shadow-amber-950/25 hover:shadow-xl hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0 hover:text-[#0f0700]'
                    : 'bg-gradient-to-b from-[#fffbf0] via-[#fbf2d8] to-[#f4e2af] border border-amber-200/60 text-[#3b2405] font-bold shadow-2xs hover:from-[#fdf5d6] hover:via-[#f5dc8a] hover:to-[#dfa732] hover:border-amber-300 hover:text-[#0f0700] hover:shadow-md hover:shadow-amber-900/15 hover:-translate-y-0.5 active:translate-y-0'
                }`}
              >
                {/* 1. Camada de reflexo metálico escovado horizontal com faixas especulares */}
                <div
                  className={`pointer-events-none absolute inset-0 mix-blend-overlay transition-opacity duration-300 ${
                    isActive
                      ? 'opacity-45 group-hover/navbtn:opacity-70'
                      : 'opacity-25 group-hover/navbtn:opacity-60'
                  }`}
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
                  }}
                />

                {/* 2. Camada de microtextura folheada a ouro suave */}
                <div
                  className={`pointer-events-none absolute inset-0 mix-blend-soft-light transition-opacity duration-300 ${
                    isActive
                      ? 'opacity-25 group-hover/navbtn:opacity-40'
                      : 'opacity-15 group-hover/navbtn:opacity-35'
                  }`}
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 30%, rgba(255,240,150,0.8), transparent 70%)',
                  }}
                />

                {/* 3. Chanfro / linha superior luminosa */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent transition-opacity duration-300 ${
                    isActive
                      ? 'opacity-90 group-hover/navbtn:opacity-100'
                      : 'opacity-60 group-hover/navbtn:opacity-90'
                  }`}
                />

                {/* 4. Iluminação radial no hover */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.45),transparent_70%)] opacity-0 group-hover/navbtn:opacity-100 transition-opacity duration-300" />

                {/* 5. Sheen diagonal fluido no hover */}
                <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/navbtn:translate-x-[130%] transition-transform duration-700 ease-out" />

                {/* Rótulo com relevo luminoso em uppercase */}
                <span
                  className={`relative z-10 transition-all uppercase ${
                    isActive
                      ? 'drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] group-hover/navbtn:drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]'
                      : 'drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] group-hover/navbtn:drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]'
                  }`}
                >
                  {tab.label}
                </span>
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
