// pocketbase/hooks/zz_diag_memory.js — DIAGNÓSTICO TEMPORÁRIO (remover após uso).
// Testa a recuperação RAG pura do agente it-assistant: searchMemory sem LLM.
routerAdd(
  'POST',
  '/backend/v1/zz-diag-memory',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')
    const query = (body.query || '').trim()
    if (!query) return e.badRequestError('query is required')
    try {
      const result = $ai.agent('it-assistant').searchMemory({ query: query, k: 6 })
      const items = (result.items || []).map((it) => ({
        score: it.score,
        text: (it.text || it.content || '').slice(0, 200),
      }))
      return e.json(200, { count: items.length, items: items })
    } catch (err) {
      return e.json(500, { error: (err && err.message) || String(err) })
    }
  },
  $apis.requireAuth(),
)
