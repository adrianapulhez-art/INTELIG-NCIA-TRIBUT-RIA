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
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xl shadow-emerald-950/30 hover:bg-emerald-500 transition-all duration-200 cursor-pointer"
      >
        <img
          src={assistantAvatar}
          alt="Assistente IT"
          className="w-8 h-8 rounded-full object-cover border border-emerald-200 shadow-sm"
        />
        <span>Assistente IT</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 max-h-[70vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden font-sans">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <img
            src={assistantAvatar}
            alt="Assistente IT"
            className="w-7 h-7 rounded-full object-cover border border-emerald-200 shadow-sm"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900">Assistente IT</span>
            <span className="text-[10px] text-emerald-800 font-mono font-medium">
              Base: Manual da Calculadora Markup
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar assistente"
          className="text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-[240px] bg-white"
      >
        {messages.length === 0 && (
          <div className="text-xs text-slate-600 leading-relaxed p-2.5 rounded-xl bg-slate-50 border border-slate-200">
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
                  ? 'bg-emerald-600 text-white shadow-2xs'
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
            <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-slate-50 border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-mono">Consultando o manual…</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
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
          className="flex-1 bg-white border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500"
        />
        <Button
          size="sm"
          onClick={ask}
          disabled={loading || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default ItAssistantWidget
