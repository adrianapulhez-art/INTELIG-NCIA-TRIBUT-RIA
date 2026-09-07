import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import {
  LogOut,
  Calculator,
  Construction,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Building2,
} from 'lucide-react'

export default function AppDashboardPlaceholder() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    document.title = 'Calculadora | IT — Inteligência Tributária'
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  // Nome de exibição amigável
  const displayName = user?.name || user?.email?.split('@')[0] || 'Cliente IT'
  const userInitials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'IT'

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-between relative selection:bg-emerald-500/30 selection:text-emerald-300 font-sans">
      {/* Background glow and grid */}
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-60" />
      <div className="fixed inset-0 pointer-events-none bg-glow-radial opacity-70" />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#0a0f18]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <span className="font-extrabold text-slate-950 text-sm font-mono">IT</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight">
              IT — Inteligência Tributária
            </span>
            <span className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase">
              Área do Cliente • Demonstração
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Perfil do cliente logado com nome e email */}
          <div className="flex items-center gap-2.5 pl-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono text-xs font-semibold shadow-inner">
              {userInitials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200 leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="max-w-lg w-full space-y-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl shadow-black/40">
          <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/10">
            <Calculator className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <UserCheck className="w-3.5 h-3.5" />
              Sessão de cliente ativa
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight pt-2">
              Olá, {displayName}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Você está autenticado na plataforma IT. Os módulos completos de simulação e cálculo da
              Reforma Tributária (IBS / CBS / Imposto Seletivo) estão sendo preparados para sua
              conta.
            </p>
          </div>

          {/* Card com detalhes do usuário cliente */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-slate-400">Nome do cliente:</span>
              <span className="font-semibold text-slate-200">{displayName}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-slate-400">E-mail:</span>
              <span className="font-mono text-emerald-400">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 pt-1">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Ambiente seguro pronto para simulações e auditoria fiscal</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Regras e alíquotas EC 132 &amp; LC 214/2025 integradas</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sessão persistente ativa via PocketBase</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              asChild
              variant="outline"
              className="w-full bg-slate-950/40 hover:bg-slate-800 border-slate-800 text-slate-200 text-xs h-9 cursor-pointer"
            >
              <Link to="/" className="flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar à landing page
              </Link>
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs h-9 cursor-pointer"
            >
              Encerrar sessão
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 border-t border-slate-800/40 text-center text-xs text-slate-500 font-mono">
        IT — Inteligência Tributária • Demonstração Skip Cloud
      </footer>
    </div>
  )
}
