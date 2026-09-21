// pocketbase/migrations/0008_delete_legacy_table_assistants.js
// Limpeza dos 9 agentes antigos "especialistas por tabela" (criados em 08–10/09), órfãos da
// interface desde a exclusão dos assistentes (v0.0.201–0.0.203). Arquitetura vigente da CEO:
// agente ÚNICO it-assistant (migration 0007). Decisão da CEO em 21/09/2026.
// ATENÇÃO: irreversível em prática — o down NÃO recria os agentes porque suas definições
// originais (migrations 0003–0005) foram removidas do projeto. O $ai.agents.delete faz
// cascade em tools, fontes de memória, chunks, conversas e mensagens desses agentes.
migrate(
  (app) => {
    const legacy = [
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
    for (const slug of legacy) {
      try {
        $ai.agents.delete(app, slug)
      } catch (err) {
        // Agente já inexistente: idempotente, segue a lista
      }
    }
  },
  (app) => {
    // Down intencionalmente vazio: as definições originais foram removidas junto com as
    // migrations 0003–0005 (v0.0.202–0.0.203); não há como restaurá-las fielmente.
  },
)
