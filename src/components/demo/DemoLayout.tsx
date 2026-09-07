import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTaxContext } from '@/contexts/TaxContext'
import { Button } from '@/components/ui/button'
import { LogOut, RotateCcw, Sparkles } from 'lucide-react'

export type TabKey = 'markup' | 'compras' | 'simples' | 'dre-presumido' | 'dre-real' | 'comparacao'

interface DemoLayoutProps {
  currentTab: TabKey
  children: React.ReactNode
}

export const DemoLayout: React.FC<DemoLayoutProps> = ({ currentTab, children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { resetAll } = useTaxContext()

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
    { key: 'markup', label: 'Calculadora Markup', path: '/demo/markup' },
    { key: 'compras', label: 'Calculadora de Compras', path: '/demo/compras' },
    { key: 'simples', label: 'DRE Simples Nacional', path: '/demo/simples' },
    { key: 'dre-presumido', label: 'DRE Lucro Presumido', path: '/demo/dre-presumido' },
    { key: 'dre-real', label: 'DRE Lucro Real', path: '/demo/dre-real' },
    { key: 'comparacao', label: 'Comparação de Regimes', path: '/demo/comparacao' },
  ]

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-between relative selection:bg-emerald-500/30 selection:text-emerald-300 font-sans">
      {/* Background glow and subtle grid */}
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-40" />
      <div className="fixed inset-0 pointer-events-none bg-glow-radial opacity-60" />

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-slate-800/80 bg-[#0a0f18]/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <span className="font-extrabold text-slate-950 text-sm font-mono">IT</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight">
              IT — Inteligência Tributária
            </span>
            <span className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase">
              Demonstração Interativa
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
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

      {/* Header da Demo: Badge + Título + Subtítulo + 4 Botões */}
      <div className="relative z-10 pt-8 pb-4 px-4 sm:px-8 max-w-6xl mx-auto w-full text-center space-y-4">
        {/* Badge AMBIENTE DE TESTES */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-xs tracking-wider uppercase shadow-sm">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>AMBIENTE DE TESTES</span>
        </div>

        {/* Título com degradê */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Bem-vindo à{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            demo da IT
          </span>
        </h1>

        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Escolha a calculadora que deseja utilizar.
        </p>

        {/* 4 Botões de Navegação Lado a Lado */}
        <div className="pt-3 pb-2 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 font-bold'
                    : 'bg-[#0f172a]/90 text-slate-300 border border-slate-700/80 hover:border-emerald-500/40 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Container onde a página ativa é renderizada */}
      <main className="relative z-10 flex-1 px-4 sm:px-8 pb-16 max-w-6xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 border-t border-slate-800/60 bg-[#070b12]/90 text-center text-xs text-slate-500 font-mono">
        IT — Inteligência Tributária • Demonstração Interativa integrada
      </footer>
    </div>
  )
}
