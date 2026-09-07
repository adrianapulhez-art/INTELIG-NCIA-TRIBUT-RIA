import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const navigate = useNavigate()
  const { login, loginWithGoogle } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
  }

  const handleClose = () => {
    onOpenChange(false)
    // Pequeno reset suave após fechar
    setTimeout(() => {
      setPassword('')
    }, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanEmail = email.trim()

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

    setLoading(true)

    try {
      await login(cleanEmail, password)
      toast.success('Login realizado com sucesso!')
      onOpenChange(false)
      navigate('/app')
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
        toast.error(`E-mail inválido: ${fieldData.email.message}`)
      } else if (fieldData?.password) {
        toast.error(`Senha: ${fieldData.password.message}`)
      } else if (error?.status === 400) {
        toast.error('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.')
      } else if (error?.message) {
        toast.error(error.message)
      } else {
        toast.error('Não foi possível entrar. Tente novamente mais tarde.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleClick = async () => {
    setGoogleLoading(true)

    try {
      const profile = await loginWithGoogle()
      const welcomeName = profile.name ? `, ${profile.name}` : ''
      toast.success(`Login com Google realizado com sucesso! Bem-vindo(a)${welcomeName}.`)
      onOpenChange(false)
      navigate('/app')
    } catch (err: unknown) {
      console.error('Erro no login com Google:', err)
      const error = err as {
        status?: number
        message?: string
        isAbort?: boolean
      }

      if (
        error?.isAbort ||
        error?.message?.toLowerCase().includes('abort') ||
        error?.message?.toLowerCase().includes('cancel') ||
        error?.message?.toLowerCase().includes('closed')
      ) {
        toast.info('Autenticação com Google cancelada.')
        return
      }

      const msg = (error?.message || '').toLowerCase()
      if (
        error?.status === 400 ||
        error?.status === 404 ||
        msg.includes('disabled') ||
        msg.includes('missing') ||
        msg.includes('invalid client') ||
        msg.includes('not configured') ||
        msg.includes('failed to authenticate')
      ) {
        toast.error(
          'Login com Google indisponível no momento. O provedor está sendo configurado no painel. Utilize o login por e-mail e senha abaixo.',
          { duration: 5000 },
        )
      } else {
        toast.error('Não foi possível autenticar com o Google. Tente novamente ou use seu e-mail.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleFillDemo = () => {
    setEmail('adrianapulhez@gmail.com')
    setPassword('Skip@Pass')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] bg-[#0d131f] border-slate-800 text-slate-100 p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md">
              <span className="font-extrabold text-slate-950 text-xs font-mono">IT</span>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-400 tracking-wider uppercase">
              Acesso à Plataforma
            </span>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-white font-sans">
            Entrar na conta
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-400">
            Acesse o simulador tributário e comparativo de regimes da EC 132/2023.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* E-mail */}
          <div className="space-y-1.5 text-left">
            <Label htmlFor="login-modal-email" className="text-xs font-medium text-slate-300">
              E-mail
            </Label>
            <Input
              id="login-modal-email"
              type="email"
              autoComplete="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-10 bg-slate-950/60 border-slate-700/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-sm"
            />
          </div>

          {/* Senha */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-modal-password" className="text-xs font-medium text-slate-300">
                Senha
              </Label>
              <Link
                to="/auth"
                onClick={() => onOpenChange(false)}
                className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              id="login-modal-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-10 bg-slate-950/60 border-slate-700/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-sm"
            />
          </div>

          {/* Dica conta demo padrão */}
          <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-[11px] text-slate-400 flex items-center justify-between gap-2">
            <div>
              <span className="text-emerald-400 font-medium">Conta demo:</span>{' '}
              <span className="text-slate-300 font-mono">adrianapulhez@gmail.com</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Preencher
            </button>
          </div>

          {/* Botão Entrar */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-md shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Entrando...
              </span>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        {/* Separador e botão Social */}
        <div className="space-y-3 mt-1">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-[#0d131f] px-2 text-[11px] uppercase tracking-wider text-slate-500">
              ou
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleClick}
            disabled={googleLoading || loading}
            className="w-full h-10 bg-slate-950/40 hover:bg-slate-800/80 border-slate-800 text-slate-200 text-sm font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <span className="flex items-center gap-2 text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                Conectando ao Google...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              </>
            )}
          </Button>

          {/* Link para criar conta completa */}
          <div className="pt-2 text-center text-xs text-slate-400">
            Ainda não tem acesso?{' '}
            <Link
              to="/auth"
              onClick={() => onOpenChange(false)}
              className="font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 inline-flex items-center gap-0.5"
            >
              Criar conta de teste
              <ArrowRight className="w-3 h-3 ml-0.5 inline" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
