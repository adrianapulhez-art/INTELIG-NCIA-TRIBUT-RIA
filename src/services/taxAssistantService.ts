import pb from '@/lib/pocketbase/client'
import { streamAgentChat, type AgentCitation } from '@/lib/skipAi'

export interface TaxChatImageAttachment {
  data_url: string
  name?: string
  size?: number
  type?: string
}

export interface TaxChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created: string
  citations?: AgentCitation[]
  agentSlug?: string
  tabKey?: string
  image?: TaxChatImageAttachment
}

export interface SendTaxMessageParams {
  agentSlug: string
  message: string
  context?: string
  image?: TaxChatImageAttachment | null
  conversationId?: string | null
  tabKey?: string
  signal?: AbortSignal
  onChunk?: (delta: string, full: string) => void
  onCitations?: (citations: AgentCitation[]) => void
}

export interface SendTaxMessageResult {
  content: string
  conversationId: string
  messageId: string
  citations?: AgentCitation[]
}

/**
 * Envia mensagem para o assistente tributário nativo via Skip Cloud Hooks / $ai.agent
 * Tenta primeiro streaming para feedback em tempo real. Se streaming falhar por rede/proxy,
 * faz fallback transparente para o endpoint síncrono.
 */
export async function sendTaxAssistantMessage({
  agentSlug,
  message,
  context,
  image,
  conversationId,
  signal,
  onChunk,
  onCitations,
}: SendTaxMessageParams): Promise<SendTaxMessageResult> {
  const token = pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''

  const requestPayload = {
    agent_slug: agentSlug,
    message,
    context,
    image: image || null,
    conversation_id: conversationId || null,
  }

  // Tentativa com SSE Streaming
  try {
    const streamRes = await fetch(`${baseUrl}/backend/v1/tax-assistant/ask-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(requestPayload),
      signal,
    })

    if (streamRes.ok) {
      const result = await streamAgentChat(streamRes, {
        onChunk,
        onCitations,
        signal,
      })

      const convId = streamRes.headers.get('X-Conversation-Id') || result.conversation_id
      return {
        content: result.content,
        conversationId: convId,
        messageId: result.message_id,
        citations: result.citations,
      }
    }
  } catch (streamErr) {
    // Se foi abortado voluntariamente pelo usuário, repassa
    if (signal?.aborted) {
      throw streamErr
    }
    // Caso contrário, continua para a chamada síncrona de fallback
    console.warn('[TaxAssistant] Stream indisponível, usando fallback síncrono:', streamErr)
  }

  // Fallback síncrono direto
  const syncRes = await fetch(`${baseUrl}/backend/v1/tax-assistant/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(requestPayload),
    signal,
  })

  const payload = await syncRes.json().catch(() => ({}))

  if (!syncRes.ok) {
    const errorMsg =
      payload?.error || payload?.message || `Erro ao comunicar com o assistente (${syncRes.status})`
    throw new Error(errorMsg)
  }

  // Simula o callback onChunk para renderização imediata
  if (onChunk && payload.content) {
    onChunk(payload.content, payload.content)
  }
  if (onCitations && payload.citations) {
    onCitations(payload.citations)
  }

  return {
    content: payload.content || '',
    conversationId: payload.conversation_id || '',
    messageId: payload.message_id || '',
    citations: payload.citations,
  }
}
