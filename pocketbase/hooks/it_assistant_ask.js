// pocketbase/hooks/it_assistant_ask.js
// Assistente IT — rota autenticada que conversa com o agente único ('it-assistant').
// Contexto de rota: a página atual do cliente é enviada com cada mensagem e prefixada
// no texto, para o agente priorizar os capítulos do módulo correspondente.
routerAdd(
  'POST',
  '/backend/v1/it-assistant/ask',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')

      const message = (body.message || '').trim()
      if (!message) return e.badRequestError('message is required')

      // Contexto de rota (especialização por página — o agente prioriza o capítulo do módulo)
      const ROUTE_LABELS = {
        '/demo': 'Início da demo (visão geral dos módulos)',
        '/demo/markup': 'Calculadora Markup (/demo/markup) — Manual: capítulos 1 a 8',
        '/demo/compras':
          'Calculadora de Compras (/demo/compras) — integração com o Markup: capítulo 9',
        '/demo/despesas-operacionais':
          'Despesas e Receitas Operacionais (/demo/despesas-operacionais) — alimenta as DREs: capítulo 8',
        '/demo/dre-presumido':
          'DRE Lucro Presumido (/demo/dre-presumido) — do preço à DRE: capítulo 8',
        '/demo/dre-real': 'DRE Lucro Real (/demo/dre-real) — do preço à DRE: capítulo 8',
        '/demo/simples': 'DRE Simples Nacional (/demo/simples) — do preço à DRE: capítulo 8',
        '/demo/dashboard': 'Dashboard (/demo/dashboard) — visão consolidada',
        '/demo/reforma': 'Reforma Tributária IBS/CBS (/demo/reforma) — Glossário: capítulo 10',
        '/demo/ponte-2027': 'Ponte 2027 (/demo/ponte-2027) — Glossário: capítulo 10',
        '/demo/clientes': 'Clientes (/demo/clientes) — depósito de cenários: capítulo 2',
        '/demo/manual': 'Manual de Uso (/demo/manual) — todos os capítulos',
      }
      const routeLabel = ROUTE_LABELS[body.route] || null
      const prefixedMessage = routeLabel
        ? '[Contexto: o usuário está na página ' + routeLabel + '] ' + message
        : message

      const result = $ai.agent('it-assistant').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: prefixedMessage,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'Assistente temporariamente indisponível' })
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'falha na requisição do agente' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'Assistente temporariamente indisponível' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
