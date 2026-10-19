/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const lc214AnexosCollection = new Collection({
      name: 'lc214_anexos_ncm',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null, // Regra permanente da Adriana: nunca apagar dados fiscais
      fields: [
        {
          name: 'anexo',
          type: 'text',
          required: true,
        },
        {
          name: 'artigo_origem',
          type: 'text',
          required: true,
        },
        {
          name: 'item',
          type: 'text',
          required: true,
        },
        {
          name: 'descricao',
          type: 'text',
          required: true,
        },
        {
          name: 'ncm_sh',
          type: 'text',
          required: true,
        },
        {
          name: 'percentual_reducao_pct',
          type: 'number',
          required: true,
        },
        {
          name: 'descricao_reducao',
          type: 'text',
          required: true,
        },
        {
          name: 'versao_extracao',
          type: 'text',
          required: true,
        },
        {
          name: 'fonte',
          type: 'text',
          required: true,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_lc214_anexos_anexo ON lc214_anexos_ncm (anexo)',
        'CREATE INDEX idx_lc214_anexos_ncm ON lc214_anexos_ncm (ncm_sh)',
        'CREATE INDEX idx_lc214_anexos_reducao ON lc214_anexos_ncm (percentual_reducao_pct)',
      ],
    })
    app.save(lc214AnexosCollection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('lc214_anexos_ncm')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
