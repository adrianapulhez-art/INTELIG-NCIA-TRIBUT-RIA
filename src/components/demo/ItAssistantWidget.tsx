import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { ChatMarkdown } from '@/components/demo/ChatMarkdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { assistantAvatar } from '@/components/demo/ItAssistantAvatar'
import { Send, X } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Assistente IT — agente único Skip Cloud (slug: it-assistant).
 * Base de conhecimento: Manual de Uso da Calculadora Markup (10 capítulos).
 * Contexto de rota: a página atual é enviada com cada mensagem — o agente prioriza
 * os capítulos do módulo correspondente e explicita conexões entre módulos.
 */
const ROUTE_LABELS: Record<string, string> = {
  '/demo': '/demo',
  '/demo/markup': '/demo/markup',
  '/demo/compras': '/demo/compras',
  '/demo/despesas-operacionais': '/demo/despesas-operacionais',
  '/demo/dre-presumido': '/demo/dre-presumido',
  '/demo/dre-real': '/demo/dre-real',
  '/demo/simples': '/demo/simples',
  '/demo/dashboard': '/demo/dashboard',
  '/demo/reforma': '/demo/reforma',
  '/demo/clientes': '/demo/clientes',
  '/demo/manual': '/demo/manual',
}

export const ItAssistantWidget: React.FC = () => {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const route = ROUTE_LABELS[location.pathname] || location.pathname

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, loading])

  const ask = async () => {
    const message = input.trim()
    if (!message || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: message }])
    setLoading(true)
    try {
      const res = await pb.send('/backend/v1/it-assistant/ask', {
        method: 'POST',
        body: JSON.stringify({ message, conversation_id: conversationId, route }),
      })
      setConversationId(res.conversation_id || conversationId)
      setMessages((m) => [...m, { role: 'assistant', content: res.content || 'Sem resposta.' }])
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Não consegui falar com o Assistente IT agora. Tente novamente em instantes.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Assistente IT — tirar dúvidas sobre o Manual"
        className="group/assistant fixed bottom-5 right-5 z-50 inline-flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] border border-amber-200/90 text-[#261502] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-950/35 hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer overflow-hidden"
      >
        {/* 1. Camada de reflexo metálico escovado horizontal com faixas especulares luminosas */}
        <div
          className="pointer-events-none absolute inset-0 opacity-45 group-hover/assistant:opacity-70 mix-blend-overlay transition-opacity duration-300"
          style={{
            background:
              'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.95) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.95) 72%, rgba(150,95,10,0.5) 100%)',
          }}
        />

        {/* 2. Camada de microtextura folheada a ouro suave */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25 group-hover/assistant:opacity-40 mix-blend-soft-light transition-opacity duration-300"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 30%, rgba(255,240,150,0.8), transparent 70%)',
          }}
        />

        {/* 3. Chanfro / linha superior luminosa */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90 group-hover/assistant:opacity-100 transition-opacity duration-300" />

        {/* 4. Iluminação radial no hover */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.45),transparent_70%)] opacity-0 group-hover/assistant:opacity-100 transition-opacity duration-300" />

        {/* 5. Sheen diagonal fluido vivo no hover */}
        <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/70 to-transparent -rotate-45 translate-x-[-130%] group-hover/assistant:translate-x-[130%] transition-transform duration-700 ease-out" />

        <img
          src={assistantAvatar}
          alt="Assistente IT"
          className="relative z-10 w-8 h-8 rounded-full object-cover border border-amber-300/80 shadow-sm"
        />
        <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] group-hover/assistant:drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] group-hover/assistant:text-[#0f0700] transition-colors">
          Assistente IT
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 max-h-[70vh] flex flex-col rounded-2xl border border-amber-300/70 bg-white shadow-2xl shadow-amber-950/20 overflow-hidden font-sans">
      {/* Header do painel do Assistente IT — tratamento metálico dourado elegante */}
      <div className="relative overflow-hidden flex items-center justify-between px-4 py-3 border-b border-amber-300/80 bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14]">
        {/* Camada de brilho escovado */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            background:
              'linear-gradient(90deg, rgba(160,105,15,0.4) 0%, rgba(255,248,190,0.85) 24%, rgba(200,140,25,0.2) 48%, rgba(255,250,210,0.9) 72%, rgba(150,95,10,0.5) 100%)',
          }}
        />
        {/* Linha de chanfro superior */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-100 to-transparent opacity-90" />

        <div className="relative z-10 flex items-center gap-2.5">
          <img
            src={assistantAvatar}
            alt="Assistente IT"
            className="w-7 h-7 rounded-full object-cover border border-amber-200 shadow-sm"
          />
          <div className="flex flex-col">
            <span className="text-xs font-black text-[#261502] uppercase tracking-wide drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
              Assistente IT
            </span>
            <span className="text-[10px] text-[#4a3307] font-mono font-bold drop-shadow-[0_1px_0_rgba(255,255,255,0.3)]">
              Base: Manual da Calculadora Markup
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar assistente"
          className="relative z-10 text-[#3b2405] hover:text-[#0f0700] hover:bg-amber-400/30 rounded-full p-1 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-[240px] bg-white"
      >
        {messages.length === 0 && (
          <div className="text-xs text-[#3b2405] leading-relaxed p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
            Olá! Sou o Assistente IT. Pergunte sobre a Calculadora Markup — fluxo, modos, regimes,
            Memória de Cálculo, DREs e integrações. Estou lendo a página em que você está para
            responder com contexto.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                m.role === 'user'
                  ? 'bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] text-[#261502] font-semibold border border-amber-300 shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs'
              }`}
            >
              {m.role === 'user' ? (
                <span className="text-xs whitespace-pre-wrap">{m.content}</span>
              ) : (
                <ChatMarkdown content={m.content} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-amber-50/50 border border-amber-200/60 shadow-2xs">
              <span className="text-xs text-[#5c3e06] font-mono font-medium">
                Consultando o manual…
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-amber-200/50 bg-amber-50/30 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              ask()
            }
          }}
          placeholder="Pergunte ao Assistente IT…"
          className="flex-1 bg-white border-amber-200 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:ring-amber-400 focus-visible:border-amber-400"
        />
        <Button
          size="sm"
          onClick={ask}
          disabled={loading || !input.trim()}
          className="group/send relative overflow-hidden bg-gradient-to-b from-[#f9e596] via-[#e5b742] to-[#b87c14] hover:from-[#faebaa] hover:via-[#ecbf4e] hover:to-[#c6871a] text-[#261502] border border-amber-300/80 font-bold shadow-md shadow-amber-950/20 cursor-pointer"
        >
          {/* Brilho no botão de envio */}
          <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/50 to-transparent -rotate-45 translate-x-[-130%] group-hover/send:translate-x-[130%] transition-transform duration-500 ease-out" />
          <Send className="relative z-10 w-3.5 h-3.5 text-[#261502]" />
        </Button>
      </div>
    </div>
  )
}

export default ItAssistantWidget
