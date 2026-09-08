// Hook to stream messages from the specialized tax assistants
// One hook per file, all variables inline inside the callback.
routerAdd(
  'POST',
  '/backend/v1/tax-assistant/ask-stream',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth?.id
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária para consultar o assistente')
      }

      const message = (body.message || '').trim()
      if (!message) {
        return e.badRequestError('A mensagem não pode ser vazia')
      }

      const allowedSlugs = [
        'it-tax-assistant',
        'it-markup-assistant',
        'it-compras-assistant',
        'it-simples-assistant',
        'it-presumido-assistant',
        'it-real-assistant',
        'it-comparacao-assistant',
        'it-clientes-assistant',
        'it-reforma-assistant',
      ]

      let agentSlug = (body.agent_slug || 'it-tax-assistant').trim()
      if (allowedSlugs.indexOf(agentSlug) === -1) {
        agentSlug = 'it-tax-assistant'
      }

      let enrichedMessage = message
      if (body.context && typeof body.context === 'string' && body.context.trim().length > 0) {
        enrichedMessage = `[Contexto da tela ativa: ${body.context.trim()}]\n\nPergunta do usuário: ${message}`
      }

      const conv = $ai.agent(agentSlug).getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
        title: 'Dúvidas ' + agentSlug,
      })

      const iter = $ai.agent(agentSlug).chat({
        user_id: userId,
        conversation_id: conv.id,
        message: enrichedMessage,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)
      $response.stream(e, iter)
      return null
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'Serviço de IA temporariamente indisponível' })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha ao consultar o assistente da tabela' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'IA temporariamente ocupada. Tente novamente.' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
