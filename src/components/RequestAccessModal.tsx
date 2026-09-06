import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, Sparkles, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface RequestAccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RequestAccessModal({ open, onOpenChange }: RequestAccessModalProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [cargo, setCargo] = useState('')
  const [regime, setRegime] = useState('simples')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || !empresa.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha Nome, E-mail corporativo e Nome da empresa.',
        variant: 'destructive',
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast({
        title: 'E-mail inválido',
        description: 'Por favor, informe um endereço de e-mail válido.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      toast({
        title: 'Acesso Solicitado com Sucesso!',
        description:
          'Nossa equipe de inteligência tributária entrará em contato nas próximas 24 horas.',
      })
    }, 900)
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setIsSubmitted(false)
      setNome('')
      setEmail('')
      setEmpresa('')
      setCargo('')
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] bg-[#0d131f] border-slate-800 text-slate-100 p-6 md:p-8 shadow-2xl">
        {!isSubmitted ? (
          <>
            <DialogHeader className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold w-fit">
                <Sparkles className="w-3.5 h-3.5" />
                Vagas Antecipadas • EC 132
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                Solicitar Acesso à IT
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-400">
                Calcule preços de venda, compare regimes e simule cenários da Reforma Tributária com
                precisão enterprise.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-xs font-medium text-slate-300">
                  Nome completo *
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: Carlos Eduardo Silveira"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="bg-slate-900/80 border-slate-700/80 focus:border-emerald-500 text-slate-100 placeholder:text-slate-500 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                  E-mail corporativo *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="carlos@suaempresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-900/80 border-slate-700/80 focus:border-emerald-500 text-slate-100 placeholder:text-slate-500 h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="empresa" className="text-xs font-medium text-slate-300">
                    Empresa *
                  </Label>
                  <Input
                    id="empresa"
                    placeholder="Nome da empresa"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    required
                    className="bg-slate-900/80 border-slate-700/80 focus:border-emerald-500 text-slate-100 placeholder:text-slate-500 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cargo" className="text-xs font-medium text-slate-300">
                    Cargo / Função
                  </Label>
                  <Input
                    id="cargo"
                    placeholder="Ex: CFO, Contador, Diretor"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="bg-slate-900/80 border-slate-700/80 focus:border-emerald-500 text-slate-100 placeholder:text-slate-500 h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="regime" className="text-xs font-medium text-slate-300">
                  Regime principal de interesse
                </Label>
                <select
                  id="regime"
                  value={regime}
                  onChange={(e) => setRegime(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-900/80 border border-slate-700/80 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="simples">Simples Nacional (com Simples Híbrido)</option>
                  <option value="presumido">Lucro Presumido</option>
                  <option value="real">Lucro Real</option>
                  <option value="autonomo">Pessoa Física Autônomo</option>
                  <option value="todos">Todos os regimes (Comparativo Completo)</option>
                </select>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-11 text-base shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando solicitação...
                    </>
                  ) : (
                    'Solicitar Acesso Imediato'
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1 text-slate-400 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dados protegidos conforme a LGPD. Sem spam.</span>
              </div>
            </form>
          </>
        ) : (
          <div className="py-8 px-2 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Solicitação Recebida!</h3>
              <p className="text-sm text-slate-300 max-w-sm mx-auto">
                Obrigado, <strong className="text-emerald-400">{nome}</strong>. Nós enviamos as
                instruções de homologação para <span className="text-white underline">{email}</span>
                .
              </p>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs text-slate-400">
              Ambiente preparado para os parâmetros da{' '}
              <strong className="text-slate-200">LC 214/2025</strong> e cobrança teste CBS/IBS 2026.
            </div>
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800 font-medium"
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
