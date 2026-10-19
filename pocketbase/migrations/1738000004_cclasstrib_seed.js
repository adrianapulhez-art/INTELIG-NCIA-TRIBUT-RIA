/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cclasstrib_itens')
    if (!col) return

    // Atualiza campos reducao_ibs_pct e reducao_cbs_pct para required: false
    const fIbs = col.fields.getByName('reducao_ibs_pct')
    if (fIbs) {
      fIbs.required = false
    }
    const fCbs = col.fields.getByName('reducao_cbs_pct')
    if (fCbs) {
      fCbs.required = false
    }
    app.save(col)

    // Agora busca a versão e insere os registros
    const versao = app.findFirstRecordByData(
      'cclasstrib_versoes',
      'versao_documento',
      'IT 2025.002, v.1.70',
    )
    if (!versao) return

    const itens = [
      {
        codigo: '000001',
        cst: '000',
        descricao: 'Tributação integral padrão de IBS e CBS sem redução de alíquota',
        reducao_ibs_pct: 0,
        reducao_cbs_pct: 0,
        tipo_aliquota: 'ad_valorem',
        uso_nfe: 'Operações gerais com bens e serviços sob alíquota plena',
        rb_simples_nacional: 'Aplicável na saída com regime regular ou DAS integral',
        fundamento_legal: 'Art. 12 da LC 214/2025',
      },
      {
        codigo: '100001',
        cst: '100',
        descricao:
          'Serviços de transporte coletivo de passageiros rodoviário e metroviário — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Transporte coletivo metropolitano e intermunicipal',
        rb_simples_nacional: 'Redução de 60% refletida nas alíquotas de IBS/CBS',
        fundamento_legal: 'Art. 13 da LC 214/2025; Anexo II',
      },
      {
        codigo: '100002',
        cst: '100',
        descricao: 'Serviços de saúde humana — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Hospitais, clínicas, laboratórios e serviços médicos',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 14 da LC 214/2025',
      },
      {
        codigo: '100003',
        cst: '100',
        descricao:
          'Dispositivos médicos e de acessibilidade para pessoas com deficiência — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Próteses, órteses e equipamentos de tecnologia assistiva',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 15 da LC 214/2025',
      },
      {
        codigo: '100004',
        cst: '100',
        descricao: 'Medicamentos da lista de redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Fármacos e especialidades farmacêuticas em lista regulamentada',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 16 da LC 214/2025',
      },
      {
        codigo: '100005',
        cst: '100',
        descricao: 'Produtos de cuidados básicos à saúde menstrual — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Absorventes higiênicos e coletores menstruais',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 17 da LC 214/2025',
      },
      {
        codigo: '100006',
        cst: '100',
        descricao:
          'Serviços de educação infantil, ensino fundamental, médio, técnico e superior — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Mensalidades escolares, universidades e cursos técnicos',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 18 da LC 214/2025',
      },
      {
        codigo: '100007',
        cst: '100',
        descricao:
          'Produtos agropecuários, aquícolas, pesqueiros, florestais e da flora in natura — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Produção primária agropecuária e vegetal in natura',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 19 da LC 214/2025',
      },
      {
        codigo: '100008',
        cst: '100',
        descricao: 'Insumos agropecuários e aquícolas — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Fertilizantes, defensivos, rações e sementes',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 20 da LC 214/2025',
      },
      {
        codigo: '100009',
        cst: '100',
        descricao: 'Alimentos destinados ao consumo humano favorecidos — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Alimentos básicos com redução diferenciada de alíquota',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 21 da LC 214/2025; Anexo I',
      },
      {
        codigo: '100010',
        cst: '100',
        descricao:
          'Produções artísticas, culturais, jornalísticas e audiovisuais nacionais — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Espetáculos artísticos, produção teatral, jornalística e fonográfica',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 22 da LC 214/2025',
      },
      {
        codigo: '100011',
        cst: '100',
        descricao: 'Atividades desportivas e eventos esportivos organizados — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Competições e eventos esportivos formais',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 23 da LC 214/2025',
      },
      {
        codigo: '100012',
        cst: '100',
        descricao:
          'Bens e serviços de segurança e soberania nacional e cibernética — redução de 60%',
        reducao_ibs_pct: 60,
        reducao_cbs_pct: 60,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Tecnologia de defesa, segurança e soberania cibernética',
        rb_simples_nacional: 'Redução de 60% no regime regular IBS/CBS',
        fundamento_legal: 'Art. 24 da LC 214/2025',
      },
      {
        codigo: '200001',
        cst: '200',
        descricao: 'Cesta Básica Nacional de Alimentos — Isenção / Alíquota Zero (100% de redução)',
        reducao_ibs_pct: 100,
        reducao_cbs_pct: 100,
        tipo_aliquota: 'aliquota_zero',
        uso_nfe: 'Arroz, feijão, leite, pão francês, carnes e itens da Cesta Básica Nacional',
        rb_simples_nacional: 'Alíquota zero integral para IBS e CBS',
        fundamento_legal: 'Art. 8º da LC 214/2025; Anexo I da Cesta Básica Nacional',
      },
      {
        codigo: '200002',
        cst: '200',
        descricao:
          'Medicamentos para tratamento de câncer, doenças raras e crônicas — Alíquota Zero (100% de redução)',
        reducao_ibs_pct: 100,
        reducao_cbs_pct: 100,
        tipo_aliquota: 'aliquota_zero',
        uso_nfe: 'Medicamentos oncológicos e para tratamento de doenças graves',
        rb_simples_nacional: 'Alíquota zero integral para IBS e CBS',
        fundamento_legal: 'Art. 9º da LC 214/2025',
      },
      {
        codigo: '200003',
        cst: '200',
        descricao:
          'Dispositivos médicos essenciais para pessoas com deficiência — Alíquota Zero (100% de redução)',
        reducao_ibs_pct: 100,
        reducao_cbs_pct: 100,
        tipo_aliquota: 'aliquota_zero',
        uso_nfe: 'Cadeiras de rodas, aparelhos auditivos e próteses essenciais',
        rb_simples_nacional: 'Alíquota zero integral para IBS e CBS',
        fundamento_legal: 'Art. 10 da LC 214/2025',
      },
      {
        codigo: '200004',
        cst: '200',
        descricao:
          'Livros, jornais, periódicos e o papel destinado à sua impressão — Imunidade Constitucional (100% de redução)',
        reducao_ibs_pct: 100,
        reducao_cbs_pct: 100,
        tipo_aliquota: 'imune',
        uso_nfe: 'Publicações impressas e eletrônicas',
        rb_simples_nacional: 'Imunidade objetiva IBS e CBS',
        fundamento_legal: "Art. 150, VI, 'd' da CF/88 c/c LC 214/2025",
      },
      {
        codigo: '300001',
        cst: '300',
        descricao: 'Serviços prestados por profissionais liberais sob regime de redução de 30%',
        reducao_ibs_pct: 30,
        reducao_cbs_pct: 30,
        tipo_aliquota: 'reduzida',
        uso_nfe: 'Advogados, engenheiros, contadores, arquitetos em regime próprio',
        rb_simples_nacional: 'Redução de 30% em IBS/CBS no regime regular',
        fundamento_legal: 'Art. 25 da LC 214/2025',
      },
      {
        codigo: '400001',
        cst: '400',
        descricao:
          'Regime Específico — Combustíveis e lubrificantes com tributação monofásica (ad rem)',
        reducao_ibs_pct: 0,
        reducao_cbs_pct: 0,
        tipo_aliquota: 'ad_rem',
        uso_nfe: 'Gasolina, diesel, etanol, GLP, biodiesel e querosene de aviação',
        rb_simples_nacional: 'Tributação monofásica por unidade de medida',
        fundamento_legal: 'Art. 26 da LC 214/2025',
      },
      {
        codigo: '400002',
        cst: '400',
        descricao: 'Regime Específico — Serviços financeiros, seguros, previdência e capitalização',
        reducao_ibs_pct: 0,
        reducao_cbs_pct: 0,
        tipo_aliquota: 'especifico',
        uso_nfe: 'Operações de crédito, corretagem financeira e apólices de seguro',
        rb_simples_nacional: 'Base apurada sobre margem de intermediação',
        fundamento_legal: 'Art. 27 da LC 214/2025',
      },
      {
        codigo: '400003',
        cst: '400',
        descricao: 'Regime Específico — Bens imóveis (alienação, locação e construção)',
        reducao_ibs_pct: 20,
        reducao_cbs_pct: 20,
        tipo_aliquota: 'especifico',
        uso_nfe: 'Venda e incorporação imobiliária com redutor de ajuste',
        rb_simples_nacional: 'Redutor específico sobre o valor do terreno',
        fundamento_legal: 'Art. 28 da LC 214/2025',
      },
      {
        codigo: '400004',
        cst: '400',
        descricao: 'Regime Específico — Hotelaria, parques temáticos e restaurantes (refeições)',
        reducao_ibs_pct: 40,
        reducao_cbs_pct: 40,
        tipo_aliquota: 'especifico',
        uso_nfe: 'Hospedagem e alimentação preparada fornecida no estabelecimento',
        rb_simples_nacional: 'Redução de alíquota para o setor de hospitalidade',
        fundamento_legal: 'Art. 29 da LC 214/2025',
      },
      {
        codigo: '500001',
        cst: '500',
        descricao:
          'Operações da Zona Franca de Manaus (ZFM) e Áreas de Livre Comércio (ALC) — incentivo regional',
        reducao_ibs_pct: 100,
        reducao_cbs_pct: 100,
        tipo_aliquota: 'diferenciada',
        uso_nfe: 'Internamento na ZFM e saídas industriais incentivadas',
        rb_simples_nacional: 'Manutenção do tratamento favorecido ZFM',
        fundamento_legal: 'Art. 92-B do ADCT c/c LC 214/2025',
      },
      {
        codigo: '900001',
        cst: '900',
        descricao: 'Outras operações e situações especiais de IBS e CBS não especificadas',
        reducao_ibs_pct: 0,
        reducao_cbs_pct: 0,
        tipo_aliquota: 'outros',
        uso_nfe: 'Operações atípicas e lançamentos complementares',
        rb_simples_nacional: 'Tratamento conforme regras gerais da operação',
        fundamento_legal: 'Regulamento do IBS e CBS',
      },
    ]

    for (const item of itens) {
      const rec = new Record(col)
      rec.set('versao', versao.id)
      rec.set('codigo', item.codigo)
      rec.set('cst', item.cst)
      rec.set('descricao', item.descricao)
      rec.set('reducao_ibs_pct', item.reducao_ibs_pct)
      rec.set('reducao_cbs_pct', item.reducao_cbs_pct)
      rec.set('tipo_aliquota', item.tipo_aliquota)
      rec.set('uso_nfe', item.uso_nfe)
      rec.set('rb_simples_nacional', item.rb_simples_nacional)
      rec.set('fundamento_legal', item.fundamento_legal)
      app.save(rec)
    }
  },
  (app) => {
    try {
      const itensCol = app.findCollectionByNameOrId('cclasstrib_itens')
      if (!itensCol) return
      const records = app.findRecordsByFilter('cclasstrib_itens', "codigo != ''", '', 500, 0)
      for (const r of records) {
        app.delete(r)
      }
    } catch (_) {}
  },
)
