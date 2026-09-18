migrate(
  (app) => {
    // 1. Coleção 'clients' (Clientes do Escritório Contábil)
    const clientsCollection = new Collection({
      name: 'clients',
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
          name: 'document',
          type: 'text',
          required: false,
          max: 30,
        },
        {
          name: 'notes',
          type: 'text',
          required: false,
          max: 2000,
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
        'CREATE INDEX idx_clients_owner_created ON clients (owner, created DESC)',
        'CREATE INDEX idx_clients_owner_name ON clients (owner, name)',
      ],
    })
    app.save(clientsCollection)

    const savedClientsCollection = app.findCollectionByNameOrId('clients')

    // 2. Coleção 'saved_scenarios' (Cenários gravados por cliente e escopo)
    const savedScenariosCollection = new Collection({
      name: 'saved_scenarios',
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
          name: 'client',
          type: 'relation',
          required: true,
          collectionId: savedClientsCollection.id,
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
          name: 'scope',
          type: 'text',
          required: false,
          max: 100,
        },
        {
          name: 'schema_version',
          type: 'number',
          required: false,
        },
        {
          name: 'snapshot',
          type: 'json',
          required: true,
          maxSize: 4194304, // 4MB
        },
        {
          name: 'notes',
          type: 'text',
          required: false,
          max: 2000,
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
        'CREATE INDEX idx_saved_scenarios_owner_client ON saved_scenarios (owner, client, updated DESC)',
        'CREATE INDEX idx_saved_scenarios_scope ON saved_scenarios (scope)',
      ],
    })
    app.save(savedScenariosCollection)
  },
  (app) => {
    try {
      const savedScenarios = app.findCollectionByNameOrId('saved_scenarios')
      app.delete(savedScenarios)
    } catch (_) {}

    try {
      const clients = app.findCollectionByNameOrId('clients')
      app.delete(clients)
    } catch (_) {}
  },
)
