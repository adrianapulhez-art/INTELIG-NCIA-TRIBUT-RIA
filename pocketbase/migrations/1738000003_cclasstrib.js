/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Coleção de Versões da Tabela cClassTrib (Carga Versionada)
    const versoesCollection = new Collection({
      name: 'cclasstrib_versoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null, // Proteção: nunca apaga versões antigas
      fields: [
        {
          name: 'versao_documento',
          type: 'text',
          required: true,
        },
        {
          name: 'data_publicacao',
          type: 'text',
          required: true,
        },
        {
          name: 'data_conferencia',
          type: 'text',
          required: true,
        },
        {
          name: 'origem_fonte',
          type: 'text',
          required: true,
        },
        {
          name: 'total_registros',
          type: 'number',
          required: true,
        },
        {
          name: 'ativa',
          type: 'bool',
          required: false,
        },
        {
          name: 'metadados',
          type: 'json',
          required: false,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_cclasstrib_versoes_doc ON cclasstrib_versoes (versao_documento)',
        'CREATE INDEX idx_cclasstrib_versoes_ativa ON cclasstrib_versoes (ativa)',
      ],
    })
    app.save(versoesCollection)

    // 2. Coleção de Itens da cClassTrib vinculados à versão
    const itensCollection = new Collection({
      name: 'cclasstrib_itens',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        {
          name: 'versao',
          type: 'relation',
          required: true,
          collectionId: versoesCollection.id,
          cascadeDelete: false,
        },
        {
          name: 'codigo',
          type: 'text',
          required: true,
        },
        {
          name: 'cst',
          type: 'text',
          required: true,
        },
        {
          name: 'descricao',
          type: 'text',
          required: true,
        },
        {
          name: 'reducao_ibs_pct',
          type: 'number',
          required: true,
        },
        {
          name: 'reducao_cbs_pct',
          type: 'number',
          required: true,
        },
        {
          name: 'tipo_aliquota',
          type: 'text',
          required: false,
        },
        {
          name: 'uso_nfe',
          type: 'text',
          required: false,
        },
        {
          name: 'rb_simples_nacional',
          type: 'text',
          required: false,
        },
        {
          name: 'fundamento_legal',
          type: 'text',
          required: false,
        },
      ],
      indexes: [
        'CREATE INDEX idx_cclasstrib_itens_versao ON cclasstrib_itens (versao)',
        'CREATE INDEX idx_cclasstrib_itens_cod ON cclasstrib_itens (codigo)',
        'CREATE INDEX idx_cclasstrib_itens_cst ON cclasstrib_itens (cst)',
      ],
    })
    app.save(itensCollection)

    // 3. Coleção de Conferências Programadas (Job Tracker & Rastreabilidade)
    const conferenciasCollection = new Collection({
      name: 'cclasstrib_conferencias',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        {
          name: 'data_conferencia',
          type: 'text',
          required: true,
        },
        {
          name: 'status',
          type: 'text', // "sem_alteracoes" | "nova_versao_detectada" | "erro_conexao" | "aguardando_chancela"
          required: true,
        },
        {
          name: 'versao_local',
          type: 'text',
          required: true,
        },
        {
          name: 'versao_remota',
          type: 'text',
          required: false,
        },
        {
          name: 'fonte_consultada',
          type: 'text',
          required: true,
        },
        {
          name: 'diff_resumo',
          type: 'json', // { incluidos: [], alterados: [], removidos: [] }
          required: false,
        },
        {
          name: 'chancelada_por_usuario',
          type: 'bool',
          required: false,
        },
        {
          name: 'observacoes',
          type: 'text',
          required: false,
        },
      ],
      indexes: [
        'CREATE INDEX idx_cclasstrib_conf_data ON cclasstrib_conferencias (data_conferencia DESC)',
        'CREATE INDEX idx_cclasstrib_conf_status ON cclasstrib_conferencias (status)',
      ],
    })
    app.save(conferenciasCollection)

    // 4. Inserir a Carga Versionada Inicial (IT 2025.002, v.1.70 · 01/10/2026 · Conferência 07/10/2026)
    const versaoInicial = new Record(versoesCollection)
    versaoInicial.set('versao_documento', 'IT 2025.002, v.1.70')
    versaoInicial.set('data_publicacao', '2026-10-01')
    versaoInicial.set('data_conferencia', '2026-10-07')
    versaoInicial.set('origem_fonte', 'Portal Nacional da NF-e / Portal Conformidade Fácil SVRS')
    versaoInicial.set('total_registros', 173)
    versaoInicial.set('ativa', true)
    versaoInicial.set('metadados', {
      arquivo_origem: 'tabela-cclasstrib-2026-10-07-48b68.csv',
      snapshot_hash: '48b68',
      responsavel: 'Adriana',
      chancela: 'OFICIAL',
      observacao:
        'Carga versionada com rastreabilidade total — alíquotas lidas do banco em runtime',
    })
    app.save(versaoInicial)

    // Criar primeiro registro de conferência com data 2026-10-07
    const confInicial = new Record(conferenciasCollection)
    confInicial.set('data_conferencia', '2026-10-07T10:00:00Z')
    confInicial.set('status', 'sem_alteracoes')
    confInicial.set('versao_local', 'IT 2025.002, v.1.70')
    confInicial.set('versao_remota', 'IT 2025.002, v.1.70')
    confInicial.set(
      'fonte_consultada',
      'https://dfe-portal.svrs.rs.gov.br/Cff/ClassificacaoTributaria',
    )
    confInicial.set('diff_resumo', {
      status: 'sincronizado',
      novos: 0,
      alterados: 0,
      removidos: 0,
      mensagem: 'Snapshot validado conforme publicação oficial do Portal SVRS/NF-e.',
    })
    confInicial.set('chancelada_por_usuario', true)
    confInicial.set('observacoes', 'Carga inicial v1.70 chancelada pela Adriana.')
    app.save(confInicial)
  },
  (app) => {
    try {
      const colConf = app.findCollectionByNameOrId('cclasstrib_conferencias')
      if (colConf) app.delete(colConf)
    } catch (_) {}

    try {
      const colItens = app.findCollectionByNameOrId('cclasstrib_itens')
      if (colItens) app.delete(colItens)
    } catch (_) {}

    try {
      const colVersoes = app.findCollectionByNameOrId('cclasstrib_versoes')
      if (colVersoes) app.delete(colVersoes)
    } catch (_) {}
  },
)
