import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  // Redireciona para onde o usuário tentava ir ou /app caso já autenticado
  useEffect(() => {
    document.title = isSignUp
      ? 'Criar conta de teste | IT — Inteligência Tributária'
      : 'Acesso à demo | IT — Inteligência Tributária'

    if (!authLoading && isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/app'
      navigate(from, { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate, location.state, isSignUp])

  // Validação simples de formato de e-mail
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanEmail = email.trim()
    const cleanName = name.trim()

    // 1. Validações gerais
    if (!cleanEmail) {
      toast.error('Informe o seu endereço de e-mail.')
      return
    }

    if (!isValidEmail(cleanEmail)) {
      toast.error('Informe um endereço de e-mail válido (ex: nome@empresa.com.br).')
      return
    }

    if (!password) {
      toast.error('Informe a senha de acesso.')
      return
    }

    // 2. Validações específicas do cadastro de cliente
    if (isSignUp) {
      if (!cleanName || cleanName.length < 2) {
        toast.error('Por favor, informe seu nome completo.')
        return
      }

      if (password.length < 8) {
        toast.error('A senha deve conter no mínimo 8 caracteres.')
        return
      }

      if (password !== passwordConfirm) {
        toast.error('As senhas digitadas não conferem. Verifique e tente novamente.')
        return
      }
    }

    setLoading(true)

    try {
      if (isSignUp) {
        // Fluxo de Cadastro completo de cliente
        await register(cleanName, cleanEmail, password)
        toast.success(`Conta criada com sucesso! Bem-vindo(a), ${cleanName}.`)
      } else {
        // Fluxo de Login
        await login(cleanEmail, password)
        toast.success('Login realizado com sucesso!')
      }

      const destination =
        (location.state as { from?: { pathname?: string } })?.from?.pathname || '/app'
      navigate(destination, { replace: true })
    } catch (err: unknown) {
      const error = err as {
        status?: number
        message?: string
        data?: {
          message?: string
          data?: Record<string, { code?: string; message?: string }>
        }
      }

      const fieldData = error?.data?.data

      if (fieldData?.email) {
        const emailMsg = fieldData.email.message || ''
        if (
          fieldData.email.code === 'validation_not_unique' ||
          emailMsg.toLowerCase().includes('unique') ||
          emailMsg.toLowerCase().includes('already')
        ) {
          toast.error(
            'Este e-mail já está cadastrado. Tente entrar com sua senha existente ou use outro e-mail.',
          )
        } else {
          toast.error(`E-mail inválido: ${emailMsg}`)
        }
      } else if (fieldData?.password) {
        toast.error(`Senha: ${fieldData.password.message}`)
      } else if (fieldData?.passwordConfirm) {
        toast.error(`Confirmação de senha: ${fieldData.passwordConfirm.message}`)
      } else if (error?.status === 400 && !isSignUp) {
        toast.error('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.')
      } else if (error?.message) {
        toast.error(error.message)
      } else {
        toast.error('Não foi possível completar a operação. Tente novamente mais tarde.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleClick = () => {
    toast.info('Login social com Google em breve disponível na versão final.')
  }

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    toast.info(
      'A recuperação automática de senha por e-mail será liberada em breve na versão final.',
    )
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
                {isSignUp
                  ? 'Cadastre seu perfil de cliente para testar a calculadora tributária.'
                  : 'Ambiente de demonstração da IT — Inteligência Tributária.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo Nome Completo (exibido apenas no cadastro) */}
              {isSignUp && (
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-300">
                    Nome completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required={isSignUp}
                    placeholder="Seu nome ou de sua empresa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="h-10 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-sm"
                  />
                </div>
              )}

              {/* Campo E-mail */}
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

              {/* Campo Senha */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                    Senha
                  </Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  placeholder={isSignUp ? 'Mínimo de 8 caracteres' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-10 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-sm"
                />
              </div>

              {/* Campo Confirmação de Senha (apenas no cadastro) */}
              {isSignUp && (
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="passwordConfirm" className="text-xs font-medium text-slate-300">
                    Confirmar senha
                  </Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    required={isSignUp}
                    placeholder="Repita a senha digitada"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    disabled={loading}
                    className="h-10 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-sm"
                  />
                  {password && passwordConfirm && (
                    <div className="text-[11px] flex items-center gap-1.5 pt-0.5">
                      {password === passwordConfirm ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> As senhas conferem
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> As senhas não conferem
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Dica para demonstração no login */}
              {!isSignUp && (
                <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-[11px] text-slate-400 leading-snug">
                  <span className="text-emerald-400 font-medium">Conta demo padrão:</span>{' '}
                  <span className="text-slate-300 font-mono">adrianapulhez@gmail.com</span> /{' '}
                  <span className="text-slate-300 font-mono">Skip@Pass</span>
                </div>
              )}

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

            {/* Separador e botão social visual */}
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
                    onClick={() => {
                      setIsSignUp(false)
                      setPasswordConfirm('')
                    }}
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
