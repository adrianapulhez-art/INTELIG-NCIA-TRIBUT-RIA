import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { ChatMarkdown } from '@/components/demo/ChatMarkdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { assistantAvatar } from '@/components/demo/ItAssistantAvatar'
import { MessageCircle, Send, X } from 'lucide-react'

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
  '/demo/ponte-2027': '/demo/ponte-2027',
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
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-xl shadow-emerald-950/50 hover:bg-emerald-400 transition-all duration-200 cursor-pointer"
      >
        <img
          src={assistantAvatar}
          alt="Assistente IT"
          className="w-8 h-8 rounded-full object-cover border border-emerald-300/60 shadow-sm"
        />
        <span>Assistente IT</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 max-h-[70vh] flex flex-col rounded-2xl border border-emerald-500/30 bg-[#06100d]/97 backdrop-blur-md shadow-2xl shadow-emerald-950/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20 bg-[#091511]/90">
        <div className="flex items-center gap-2">
          <img
            src={assistantAvatar}
            alt="Assistente IT"
            className="w-7 h-7 rounded-full object-cover border border-emerald-400/50 shadow-inner"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">Assistente IT</span>
            <span className="text-[9px] text-emerald-400 font-mono">
              Base: Manual da Calculadora Markup
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar assistente"
          className="text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[240px]">
        {messages.length === 0 && (
          <div className="text-xs text-slate-400 leading-relaxed p-2">
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
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-slate-100'
                  : 'bg-[#091511] border border-slate-700/60 text-slate-200'
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
            <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-[#091511] border border-slate-700/60">
              <span className="text-xs text-slate-400 font-mono">Consultando o manual…</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-emerald-500/20 bg-[#091511]/90 flex items-center gap-2">
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
          className="flex-1 bg-[#020605] border-emerald-500/25 text-xs text-slate-200 placeholder:text-slate-500"
        />
        <Button
          size="sm"
          onClick={ask}
          disabled={loading || !input.trim()}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default ItAssistantWidget
