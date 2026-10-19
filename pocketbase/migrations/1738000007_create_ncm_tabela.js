/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const ncmTabelaCollection = new Collection({
      name: 'ncm_tabela',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null, // Regra permanente da Adriana: nunca apagar tabela fiscal oficial
      fields: [
        {
          name: 'codigo_ncm',
          type: 'text', // 8 dígitos numéricos puros (ex: "94032000")
          required: true,
        },
        {
          name: 'codigo_formatado',
          type: 'text', // Formatado com máscara (ex: "9403.20.00")
          required: true,
        },
        {
          name: 'descricao',
          type: 'text', // Descrição oficial da NCM/SH
          required: true,
        },
        {
          name: 'descricao_completa',
          type: 'text', // Descrição contextual/hierárquica para busca rica
          required: false,
        },
        {
          name: 'capitulo',
          type: 'text', // 2 primeiros dígitos (ex: "94")
          required: false,
        },
        {
          name: 'posicao',
          type: 'text', // 4 dígitos da posição SH (ex: "9403")
          required: false,
        },
        {
          name: 'subposicao',
          type: 'text', // 6 dígitos da subposição SH (ex: "940320")
          required: false,
        },
        {
          name: 'nivel',
          type: 'number', // 8 para NCM de produto selecionável
          required: false,
        },
        {
          name: 'fonte_oficial',
          type: 'text', // URL e órgão oficial de extração
          required: true,
        },
        {
          name: 'versao_extracao',
          type: 'text', // Versão / data de publicação do ato normativo
          required: true,
        },
        {
          name: 'data_conferencia',
          type: 'text', // Data de conferência do snapshot
          required: true,
        },
        {
          name: 'status_chancela',
          type: 'text', // "aguardando_chancela" | "chancelada_adriana"
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
        'CREATE UNIQUE INDEX idx_ncm_tabela_cod ON ncm_tabela (codigo_ncm)',
        'CREATE INDEX idx_ncm_tabela_fmt ON ncm_tabela (codigo_formatado)',
        'CREATE INDEX idx_ncm_tabela_pos ON ncm_tabela (posicao)',
        'CREATE INDEX idx_ncm_tabela_status ON ncm_tabela (status_chancela)',
      ],
    })
    app.save(ncmTabelaCollection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ncm_tabela')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
