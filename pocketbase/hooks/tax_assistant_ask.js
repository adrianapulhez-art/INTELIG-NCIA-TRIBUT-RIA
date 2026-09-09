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

      // Processamento de imagem anexa (Visão computacional / multimodal via $ai.chat fast)
      let imageDescription = ''
      const imagePayload = body.image || null
      if (imagePayload && typeof imagePayload === 'object' && imagePayload.data_url) {
        try {
          const visionPrompt =
            'Você é um leitor óptico especialista em documentos tributários, notas fiscais, cupons, tabelas, telas e planilhas contábeis brasileiras. ' +
            'Examine minuciosamente esta imagem enviada pelo cliente. ' +
            'Extraia e descreva detalhadamente todos os dados fiscais e contábeis visíveis: ' +
            'tipo de documento/tela, números de NF/danfe, CNPJs, CFOP, NCM, alíquotas (ICMS, IPI, PIS, COFINS, ISS, ST, DIFAL), ' +
            'valores destacados (base de cálculo, valor do produto, impostos retidos/destacados, total), ' +
            'campos preenchidos ou vazios, e qualquer detalhe visual relevante para responder à dúvida do usuário: "' +
            message +
            '". Seja técnico, preciso e estruturado.'

          const visionRes = $ai.chat({
            model: 'fast',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: visionPrompt },
                  { type: 'image_url', image_url: { url: imagePayload.data_url } },
                ],
              },
            ],
          })

          const rawVision = visionRes.choices?.[0]?.message?.content
          if (rawVision && typeof rawVision === 'string' && rawVision.trim().length > 0) {
            imageDescription = rawVision.trim()
          }
        } catch (visionErr) {
          console.log(
            '[TaxAssistant:ask] Falha na leitura visual da imagem:',
            visionErr.message || visionErr,
          )
          // Não quebra a conversa se a visão falhar: informa no prompt que o cliente anexou uma imagem
          imageDescription = `[Aviso: O cliente anexou uma imagem (${imagePayload.name || 'documento'}), porém o leitor de visão encontrou uma instabilidade temporária. Oriente o cliente com base no texto da dúvida dele ou solicite os valores numéricos se necessário].`
        }
      }

      // Optional context injection (page, table, current regime, numbers)
      let enrichedMessage = message
      if (body.context && typeof body.context === 'string' && body.context.trim().length > 0) {
        enrichedMessage = `[Contexto da tela ativa: ${body.context.trim()}]\n\n`
      } else {
        enrichedMessage = ''
      }

      if (imageDescription) {
        enrichedMessage += `[DADOS EXTRAÍDOS DA IMAGEM ANEXADA PELO CLIENTE]:\n${imageDescription}\n\n`
        enrichedMessage += `Pergunta do usuário sobre a imagem/documento: ${message}`
      } else {
        enrichedMessage += `Pergunta do usuário: ${message}`
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
