migrate(
  (app) => {
    // F1 — VERSIONAMENTO DE CENÁRIOS (CEO, 02/10): atualizar simulação existente
    // empilha uma VERSÃO nova dentro do registro — nada é sobrescrito, a anterior
    // fica preservada e restaurável. As versões moram no REGISTRO (fora do
    // snapshot), então restauração e máxima "nunca média" ficam intocadas.
    const collection = app.findCollectionByNameOrId('saved_scenarios')
    collection.fields.add(
      new Field({
        name: 'versions',
        type: 'json',
        required: false,
        maxSize: 8388608, // 8MB — histórico de versões do cenário
      }),
    )
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('saved_scenarios')
      collection.fields.removeByName('versions')
      app.save(collection)
    } catch (_) {}
  },
)
