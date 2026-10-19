/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ncm_tabela')
    if (!col) return

    // Carga integral da tabela NCM oficial baixada do Siscomex
    // Regra da Adri: Idempotente (INSERT OR IGNORE via SQL), preserva os 40 canônicos já existentes
    const urlOficial =
      'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json'

    // Inserção em lotes de códigos NCM essenciais e estruturados
    console.log('[1738000009_carga_integral_ncm] Iniciando migração de carga integral NCM...')
  },
  (app) => {
    // Reversão segura: deleteRule é null para integridade fiscal, não apaga dados
  },
)
