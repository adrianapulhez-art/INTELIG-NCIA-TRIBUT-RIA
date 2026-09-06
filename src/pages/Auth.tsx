import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function AuthPage() {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = 'Acesso à demo | IT — Inteligência Tributária'

    // Se já estiver logado, redireciona para /app
    if (pb.authStore.isValid) {
      navigate('/app', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Preencha e-mail e senha')
      return
    }

    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres')
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        // Criar conta de teste
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          name: email.split('@')[0],
        })
        // Realizar login automático após cadastro
        await pb.collection('users').authWithPassword(email, password)
        toast.success('Conta de teste criada com sucesso! Redirecionando...')
      } else {
        // Entrar na demo
        await pb.collection('users').authWithPassword(email, password)
        toast.success('Login realizado com sucesso!')
      }

      navigate('/app')
    } catch (err: unknown) {
      const error = err as {
        message?: string
        data?: { message?: string; data?: Record<string, { message?: string }> }
      }
      const fieldErrors = error?.data?.data
      let message = 'Não foi possível autenticar. Verifique suas credenciais.'

      if (fieldErrors?.email) {
        message = `E-mail: ${fieldErrors.email.message}`
      } else if (fieldErrors?.password) {
        message = `Senha: ${fieldErrors.password.message}`
      } else if (error?.message) {
        message = error.message
      }

      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleClick = () => {
    toast.info('Login social com Google em breve disponível na versão final.')
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-between relative selection:bg-emerald-500/30 selection:text-emerald-300 font-sans">
      {/* Background visual elements matching landing page */}
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-60" />
      <div className="fixed inset-0 pointer-events-none bg-glow-radial opacity-70" />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center text-center">
            <Link
              to="/"
              className="flex items-center gap-2.5 group cursor-pointer transition-transform hover:scale-[1.02]"
              aria-label="Voltar para a página inicial"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="font-extrabold text-slate-950 text-lg tracking-wider font-mono">
                  IT
                </span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-lg font-bold text-white tracking-tight leading-none">
                  IT — Inteligência Tributária
                </span>
                <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-medium uppercase mt-1">
                  Decodificando a Reforma
                </span>
              </div>
            </Link>
          </div>

          {/* Card / Box */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/40">
            {/* Header Titles */}
            <div className="text-center space-y-2 mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
                {isSignUp ? 'Criar conta de teste' : 'Entrar na demo'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Ambiente de demonstração da IT — Inteligência Tributária.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-10 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-sm"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-10 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-md shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </span>
                ) : isSignUp ? (
                  'Criar conta de teste'
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            {/* Separador ou botão social */}
            <div className="mt-4 space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleClick}
                className="w-full h-10 bg-slate-950/40 hover:bg-slate-800/80 border-slate-800 text-slate-200 text-sm font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.9 6.4C.7 8.8 0 10.4 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.2 7.5 23 12 23z"
                  />
                </svg>
                Continuar com Google
              </Button>

              {/* Alternar entre Login e Criar conta */}
              <div className="pt-2 text-center">
                {isSignUp ? (
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    Já tem uma conta?{' '}
                    <span className="font-semibold text-emerald-400 underline underline-offset-4">
                      Entrar
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    Ainda não tem acesso?{' '}
                    <span className="font-semibold text-emerald-400 underline underline-offset-4">
                      Criar conta de teste
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer link to website */}
      <footer className="relative z-10 py-6 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 px-3 rounded-md hover:bg-slate-900/50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao site
        </Link>
      </footer>
    </div>
  )
}
