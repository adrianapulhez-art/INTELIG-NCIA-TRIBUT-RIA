migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Idempotente: pular se usuário já existir
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'adrianapulhez@gmail.com')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('adrianapulhez@gmail.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Demonstração IT')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'adrianapulhez@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
