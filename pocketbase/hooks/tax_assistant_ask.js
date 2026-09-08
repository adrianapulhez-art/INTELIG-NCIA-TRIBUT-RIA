// Hook to process messages sent to the specialized tax assistants
// One hook per file, all variables inline inside the callback to respect Goja scoping.
routerAdd(
  'POST',
  '/backend/v1/tax-assistant/ask',
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

      // Supported assistant slugs
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

      // Optional context injection (page, table, current regime, numbers)
      let enrichedMessage = message
      if (body.context && typeof body.context === 'string' && body.context.trim().length > 0) {
        enrichedMessage = `[Contexto da tela ativa: ${body.context.trim()}]\n\nPergunta do usuário: ${message}`
      }

      const convId = body.conversation_id || null

      const result = $ai.agent(agentSlug).chat({
        user_id: userId,
        conversation_id: convId,
        message: enrichedMessage,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
        agent_slug: agentSlug,
      })
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
