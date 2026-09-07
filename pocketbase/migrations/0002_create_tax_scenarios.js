migrate(
  (app) => {
    const collection = new Collection({
      name: 'tax_scenarios',
      type: 'base',
      listRule: "@request.auth.id != '' && owner = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner = @request.auth.id",
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
          name: 'name',
          type: 'text',
          required: true,
          min: 1,
          max: 200,
        },
        {
          name: 'data',
          type: 'json',
          required: true,
          maxSize: 2097152, // 2MB
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
        'CREATE INDEX idx_tax_scenarios_owner_updated ON tax_scenarios (owner, updated DESC)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('tax_scenarios')
      app.delete(collection)
    } catch (_) {}
  },
)
