migrate(
  (app) => {
    const collection = new Collection({
      name: 'simulacoes_opcao',
      type: 'base',
      listRule: "@request.auth.id != '' && owner = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
      fields: [
        {
          name: 'owner',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'nome',
          type: 'text',
          required: true,
        },
        {
          name: 'categoria_canal',
          type: 'text',
        },
        {
          name: 'veredito',
          type: 'text',
        },
        {
          name: 'exercicio',
          type: 'number',
        },
        {
          name: 'economia_mensal',
          type: 'number',
        },
        {
          name: 'diferenca_semestre',
          type: 'number',
        },
        {
          name: 'versao_cclasstrib',
          type: 'text',
        },
        {
          name: 'cenario_json',
          type: 'json',
        },
        {
          name: 'resultado_json',
          type: 'json',
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
        'CREATE INDEX idx_simulacoes_opcao_owner_created ON simulacoes_opcao (owner, created DESC)',
        'CREATE INDEX idx_simulacoes_opcao_veredito ON simulacoes_opcao (veredito)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('simulacoes_opcao')
    app.delete(collection)
  },
)
