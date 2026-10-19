/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('lc214_anexos_ncm')
    const count = app.countRecords('lc214_anexos_ncm')
    if (count > 0) {
      console.log(
        'Coleção lc214_anexos_ncm já possui registros (' +
          count +
          '). Carga seed pulada para idempotência.',
      )
      return
    }

    const FONTE_OFICIAL =
      'Presidência da República / Diário Oficial da União (Planalto: LCP 214/2025)'
    const DATA_EXTRACAO = '2025-01-16'

    // ==========================================
    // 1. ANEXO I — Cesta Básica Nacional (Alimentação Humana · Redução a Zero: 100%)
    // Base legal: Art. 125 da LC 214/2025
    // ==========================================
    const anexoI = [
      {
        item: '1',
        ncm_sh: '1006.20, 1006.30, 1006.40.00',
        desc: 'Arroz das subposições 1006.20 e 1006.30 e do código 1006.40.00 da NCM/SH',
      },
      {
        item: '2',
        ncm_sh: '0401.10.10, 0401.10.90, 0401.20.10, 0401.20.90, 0401.40.10, 0401.50.10',
        desc: 'Leite fluido e leite pasteurizado/ultrapasteurizado para consumo direto da população',
      },
      {
        item: '3',
        ncm_sh: '0402.10.10, 0402.10.90, 0402.21.10, 0402.21.20, 0402.29.10, 0402.29.20',
        desc: 'Leite em pó em conformidade com legislação específica',
      },
      {
        item: '4',
        ncm_sh: '1901.10.10, 1901.10.90, 2106.90.90',
        desc: 'Fórmulas infantis em conformidade com requisitos da legislação específica',
      },
      { item: '5', ncm_sh: '0405.10.00', desc: 'Manteiga' },
      { item: '6', ncm_sh: '1517.10.00', desc: 'Margarina' },
      { item: '7', ncm_sh: '0713.33.19, 0713.33.29, 0713.33.99, 0713.35.90', desc: 'Feijões' },
      {
        item: '8',
        ncm_sh: '0901, 2101.1',
        desc: 'Café da posição 09.01 e da subposição 2101.1 da NCM/SH',
      },
      { item: '9', ncm_sh: '1513.21.20', desc: 'Óleo de babaçu para consumo como alimento' },
      {
        item: '10',
        ncm_sh: '1106.20.00, 1903.00.00',
        desc: 'Farinha de mandioca e tapioca e seus sucedâneos',
      },
      { item: '11', ncm_sh: '1102.20.00, 1103.13.00', desc: 'Farinha, grumos e sêmolas, de milho' },
      { item: '12', ncm_sh: '1104.19.00, 1104.23.00', desc: 'Grãos de milho' },
      { item: '13', ncm_sh: '1101.00.10', desc: 'Farinha de trigo' },
      { item: '14', ncm_sh: '1701.14.00, 1701.99.00', desc: 'Açúcar' },
      { item: '15', ncm_sh: '1902.1', desc: 'Massas alimentícias não cozidas nem recheadas' },
      {
        item: '16',
        ncm_sh: '1905.90.90, 1901.20.10, 1901.20.90',
        desc: 'Pão francês (formato cilíndrico alongado) e pré-mistura ou massa para preparação',
      },
      { item: '17', ncm_sh: '1104.12.00, 1104.22.00', desc: 'Grãos de aveia' },
      { item: '18', ncm_sh: '1102.90.00', desc: 'Farinha de aveia' },
      {
        item: '19',
        ncm_sh:
          '0201, 0202, 0206.10.00, 0206.2, 0210.20.00, 0203, 0206.30.00, 0206.4, 0209.10, 0210.1, 0204, 0210.99.20, 0210.99.90, 0206.80.00, 0206.90.00, 0207, 0209.90.00, 0210.99.1',
        desc: 'Carnes bovina, suína, ovina, caprina e de aves e miudezas comestíveis (exceto foies gras)',
      },
      {
        item: '20',
        ncm_sh: '0302, 0303, 0304',
        desc: 'Peixes e carnes de peixes frescos, refrigerados ou congelados (exceto salmonídeos, atuns, bacalhaus, hadoque, saithe e ovas)',
      },
      {
        item: '21',
        ncm_sh: '0406.10.10, 0406.10.90, 0406.20.00, 0406.90.10, 0406.90.20, 0406.90.30',
        desc: 'Queijos tipo mozarela, minas, prato, queijo de coalho, ricota, requeijão, provolone, parmesão e queijo fresco',
      },
      {
        item: '22',
        ncm_sh: '2501.00.20, 2501.00.90',
        desc: 'Sal para consumo humano com teor de iodo legal',
      },
      { item: '23', ncm_sh: '0903.00', desc: 'Mate da posição 09.03 da NCM/SH' },
      {
        item: '24',
        ncm_sh: '1901.90.90',
        desc: 'Farinha com baixo teor de proteína para aminoacidopatias e erros inatos do metabolismo',
      },
      {
        item: '25',
        ncm_sh: '1902.19.00',
        desc: 'Massas com baixo teor de proteína para pessoas com acidemias e defeitos do ciclo da ureia',
      },
      {
        item: '26',
        ncm_sh: '2106.90.90',
        desc: 'Fórmulas dietoterápicas para erros inatos do metabolismo',
      },
    ]

    for (let i = 0; i < anexoI.length; i++) {
      const row = anexoI[i]
      const rec = new Record(col)
      rec.set('anexo', 'Anexo I')
      rec.set('artigo_origem', 'Art. 125, LC 214/2025')
      rec.set('item', row.item)
      rec.set('descricao', row.desc)
      rec.set('ncm_sh', row.ncm_sh)
      rec.set('percentual_reducao_pct', 100)
      rec.set(
        'descricao_reducao',
        'Redução a zero das alíquotas de IBS e CBS (Cesta Básica Nacional)',
      )
      rec.set('versao_extracao', DATA_EXTRACAO)
      rec.set('fonte', FONTE_OFICIAL)
      app.save(rec)
    }

    // ==========================================
    // 2. ANEXO IV — Dispositivos Médicos (Redução de 60%)
    // Base legal: Art. 131 da LC 214/2025
    // ==========================================
    const anexoIV = [
      { item: '1', ncm_sh: '3926.90.30', desc: 'Bolsa para drenagem' },
      {
        item: '2',
        ncm_sh: '9018.90.99',
        desc: 'Sistema para drenagem com conjunto intermediário para medição contínua da diurese',
      },
      {
        item: '3',
        ncm_sh: '3701.10.10',
        desc: 'Chapas e filmes para raios-X, sensibilizados em uma face',
      },
      { item: '4', ncm_sh: '3006.40.20', desc: 'Cimentos para reconstituição óssea' },
      { item: '5', ncm_sh: '3004.90.99', desc: 'Substitutos de enxerto ósseo' },
      { item: '6', ncm_sh: '3926.90.40', desc: 'Coletor para unidade de drenagem externa' },
      { item: '7', ncm_sh: '3917.40', desc: 'Conector completo com tampa' },
      { item: '8', ncm_sh: '3917.40', desc: 'Conector em Y' },
      {
        item: '9',
        ncm_sh: '3004.90.99',
        desc: 'Conjuntos de troca e concentrados polieletrolíticos para diálise',
      },
      { item: '10', ncm_sh: '9018.90.10', desc: 'Conjunto para autotransfusão' },
      { item: '11', ncm_sh: '9021.90.19', desc: 'Conjunto para hidrocefalia de baixo perfil' },
      { item: '12', ncm_sh: '9021.90.19, 9021.90.80', desc: 'Conjunto para hidrocefalia standard' },
      { item: '13', ncm_sh: '9021.90.91', desc: 'Eletrodo endocárdico definitivo' },
      { item: '14', ncm_sh: '9021.90.91', desc: 'Eletrodo epicárdico definitivo' },
      { item: '15', ncm_sh: '9021.90.91', desc: 'Eletrodo para marcapasso temporário endocárdico' },
      { item: '16', ncm_sh: '9021.90.91', desc: 'Eletrodo para marcapasso temporário epicárdico' },
      { item: '17', ncm_sh: '9021.90.19', desc: 'Espaçador de tendão' },
      {
        item: '18',
        ncm_sh: '3702.10.20',
        desc: 'Filmes especiais para raios-X sensibilizados em ambas as faces',
      },
      {
        item: '19',
        ncm_sh: '3702.10.10',
        desc: 'Filmes especiais para raios-X sensibilizados em uma face',
      },
      { item: '20', ncm_sh: '8421.29.90', desc: 'Filtro de linha arterial e venoso' },
      {
        item: '21',
        ncm_sh: '8421.29.90',
        desc: 'Filtro de sangue arterial e venoso para recirculação',
      },
      { item: '22', ncm_sh: '8421.29.90', desc: 'Filtro para cardioplegia' },
      {
        item: '23',
        ncm_sh: '3006.10',
        desc: 'Categutes esterilizados, suturas cirúrgicas e hemostáticos absorvíveis',
      },
      { item: '24', ncm_sh: '9018.90.40', desc: 'Hemoconcentrador para circulação extracorpórea' },
      { item: '25', ncm_sh: '8421.29.11', desc: 'Hemodialisador capilar' },
      { item: '26', ncm_sh: '9021.50.00', desc: 'Marcapasso cardíaco câmara dupla' },
      {
        item: '27',
        ncm_sh: '9021.50.00',
        desc: 'Marcapasso cardíaco multiprogramável com telemetria',
      },
      { item: '28', ncm_sh: '3701.10.29', desc: 'Outras chapas e filmes para raios-X' },
      {
        item: '29',
        ncm_sh: '9018.90.99',
        desc: 'Oxigenador de bolha com tubos para circulação extracorpórea',
      },
      {
        item: '30',
        ncm_sh: '9018.90.99',
        desc: 'Oxigenador de membrana com tubos para circulação extracorpórea',
      },
      { item: '31', ncm_sh: '9018.90.99', desc: 'Reservatório de cardiotomia' },
      {
        item: '32',
        ncm_sh: '9018.90.99',
        desc: 'Reservatório para cardioplegia com tubo sem filtro',
      },
      { item: '33', ncm_sh: '9018.90.40', desc: 'Rins artificiais' },
      { item: '34', ncm_sh: '9021.90.19', desc: 'Shunt lombo-peritonal' },
      {
        item: '35',
        ncm_sh: '3005.90.90',
        desc: 'Substituto temporário de pele (biológica/sintética)',
      },
      { item: '36', ncm_sh: '3006.10.90', desc: 'Tela inorgânica cirúrgica' },
      { item: '37', ncm_sh: '9021.90.19, 9021.90.89', desc: 'Válvula para hidrocefalia' },
      { item: '38', ncm_sh: '9021.90.19', desc: 'Válvula para tratamento de ascite' },
      { item: '39', ncm_sh: '2844.43.90', desc: 'Fonte de irídio 192' },
      { item: '40', ncm_sh: '9021.90.12', desc: 'Stent vascular' },
      {
        item: '41',
        ncm_sh: '8479.89.99',
        desc: 'Reprocessador de filtros utilizados em hemodiálise',
      },
      {
        item: '42',
        ncm_sh: '9021.29.00, 9021.10.10, 9021.10.20',
        desc: 'Implantes osseointegráveis e seus componentes manufaturados para próteses dentárias',
      },
      { item: '43', ncm_sh: '9021.90.11', desc: 'Cardiodesfibrilador implantável' },
      { item: '44', ncm_sh: '9021.90.12', desc: 'Espiral para embolização' },
      { item: '45', ncm_sh: '3002.12.21', desc: 'Imunoglobulina anti-Rh' },
      { item: '46', ncm_sh: '3002.12.22', desc: 'Outras imunoglobulinas séricas' },
      { item: '47', ncm_sh: '3002.12.23', desc: 'Concentrado de fator VIII' },
      { item: '48', ncm_sh: '3002.12.21, 3002.12.29', desc: 'Outras frações do sangue' },
      {
        item: '49',
        ncm_sh: '3822.1',
        desc: 'Reagentes de diagnóstico ou de laboratório em qualquer suporte',
      },
      {
        item: '50',
        ncm_sh: '3006.30.21',
        desc: 'Reagentes de diagnóstico administrados ao paciente à base de somatoliberina',
      },
      {
        item: '51',
        ncm_sh: '3006.40.12',
        desc: 'Produtos para obturação dentária, exceto cimentos',
      },
      {
        item: '52',
        ncm_sh: '3006.70.00',
        desc: 'Preparações em gel lubrificante para intervenções cirúrgicas/exames',
      },
      {
        item: '53',
        ncm_sh: '3006.91.10',
        desc: 'Bolsas para uso em colostomia, ileostomia e urostomia',
      },
      { item: '54', ncm_sh: '3006.91.90', desc: 'Equipamentos identificáveis para ostomia' },
      {
        item: '55',
        ncm_sh: '3926.90.30',
        desc: 'Bolsas para uso em medicina (hemodiálise e similares)',
      },
      {
        item: '56',
        ncm_sh: '3926.90.40',
        desc: 'Artigos exclusivamente de laboratório de análises clínicas',
      },
      {
        item: '57',
        ncm_sh: '3926.90.50',
        desc: 'Acessórios plásticos para linhas de sangue em hemodiálise (clamps, clipes)',
      },
      { item: '58', ncm_sh: '4015.1', desc: 'Luvas cirúrgicas e luvas de procedimento' },
      { item: '59', ncm_sh: '9018.31', desc: 'Seringas, mesmo com agulhas' },
      { item: '60', ncm_sh: '9018.32', desc: 'Agulhas tubulares de metal e agulhas para suturas' },
      { item: '61', ncm_sh: '9018.39.10', desc: 'Agulhas, exceto as de metal e as para suturas' },
      {
        item: '62',
        ncm_sh: '9018.39.2',
        desc: 'Sondas, cateteres e cânulas, individualmente ou em conjunto',
      },
      { item: '63', ncm_sh: '9018.39.30', desc: 'Lancetas para vacinação e cautérios' },
      {
        item: '64',
        ncm_sh: '9018.39.9',
        desc: 'Instrumentos semelhantes a seringas, agulhas, cateteres e cânulas',
      },
      { item: '65', ncm_sh: '9018.49.1', desc: 'Brocas para odontologia' },
      { item: '66', ncm_sh: '9018.49.20', desc: 'Limas para odontologia' },
      {
        item: '67',
        ncm_sh: '9018.90.95',
        desc: 'Grampos e clipes cirúrgicos, aplicadores e extratores',
      },
      {
        item: '68',
        ncm_sh: '9018.39.99, 9018.90.99',
        desc: 'Outros instrumentos e aparelhos para medicina, cirurgia e odontologia',
      },
      {
        item: '69',
        ncm_sh: '9402.90',
        desc: 'Mesas de operação e exames, camas hospitalares e de uso clínico',
      },
      { item: '70', ncm_sh: '9018.20.10', desc: 'Fotocoagulador a laser' },
      { item: '71', ncm_sh: '9018.90.21', desc: 'Bisturi elétrico' },
      {
        item: '72',
        ncm_sh: '9018.90.99',
        desc: 'Aparelho de anestesia com monitor multiparâmetros',
      },
      { item: '73', ncm_sh: '8419.81.10', desc: 'Autoclave' },
      { item: '74', ncm_sh: '9018.50.90', desc: 'Retinógrafo' },
      { item: '75', ncm_sh: '3821.00.00', desc: 'Meios de cultura' },
      {
        item: '76',
        ncm_sh: '8419.89.99',
        desc: 'Termocicladores utilizados em diagnóstico e na pesquisa científica',
      },
      { item: '77', ncm_sh: '8419.90.40', desc: 'Partes e peças de termocicladores' },
      {
        item: '78',
        ncm_sh: '8479.89.12',
        desc: 'Pipetadores laboratoriais para diagnóstico e pesquisa científica',
      },
      { item: '79', ncm_sh: '9027.20.12', desc: 'Cromatógrafo de fase líquida' },
      {
        item: '80',
        ncm_sh: '9027.20.21',
        desc: 'Sequenciadores automáticos de ADN mediante eletroforese capilar',
      },
      {
        item: '81',
        ncm_sh: '9027.20.29',
        desc: 'Aparelhos de eletroforese para diagnóstico e pesquisa científica',
      },
      {
        item: '82',
        ncm_sh: '9027.30',
        desc: 'Analisadores por espectrofotometria para diagnóstico e pesquisa científica',
      },
      {
        item: '83',
        ncm_sh: '9027.50.20',
        desc: 'Analisadores por fotometria para diagnóstico e pesquisa científica',
      },
      { item: '84', ncm_sh: '9027.50.50', desc: 'Citômetro de fluxo' },
      {
        item: '85',
        ncm_sh: '9027.50.90',
        desc: 'Analisadores por radiações ópticas para diagnóstico e pesquisa científica',
      },
      {
        item: '86',
        ncm_sh: '9027.89.99',
        desc: 'Outros analisadores para diagnóstico e pesquisa científica',
      },
      { item: '87', ncm_sh: '9027.81.00', desc: 'Espectrômetro de massa' },
      { item: '88', ncm_sh: '9027.89.99', desc: 'Outros analisadores para diagnóstico' },
      { item: '89', ncm_sh: '9027.90.10', desc: 'Micrótomo' },
      {
        item: '90',
        ncm_sh: '9027.90.9',
        desc: 'Partes e peças de equipamentos analisadores laboratoriais',
      },
      { item: '91', ncm_sh: '4014.10.00', desc: 'Preservativo' },
      { item: '92', ncm_sh: '9018.90.99', desc: 'Dispositivo intrauterino (DIU)' },
      { item: '93', ncm_sh: '3824.99.89', desc: 'Substância para conservação de órgãos e tecidos' },
      {
        item: '94',
        ncm_sh: '9021.90.91',
        desc: 'Introdutor de punção para implante de eletrodo endocárdico',
      },
      { item: '95', ncm_sh: '9021.90.99', desc: 'Enxerto tubular de politetrafluoretileno - PTFE' },
      { item: '96', ncm_sh: '9021.90.99', desc: 'Enxerto arterial e venoso tubular inorgânico' },
      { item: '97', ncm_sh: '9021.90.99', desc: 'Botão para crânio' },
      {
        item: '98',
        ncm_sh: '9018.39.29',
        desc: 'Guia metálico para introdução de cateter duplo lumen',
      },
      { item: '99', ncm_sh: '9018.39.29', desc: 'Dilatador para implante de cateter duplo lumen' },
      { item: '100', ncm_sh: '9018.39.29', desc: 'Guia de troca para angioplastia' },
      { item: '101', ncm_sh: '9018.39.29', desc: 'Introdutor para cateter com e sem válvula' },
      { item: '102', ncm_sh: '9018.39.99, 9018.39.91', desc: 'Kit cânula' },
      { item: '103', ncm_sh: '9018.39.29', desc: 'Dreno para sucção' },
      { item: '104', ncm_sh: '9018.39.29', desc: 'Sistema de drenagem mediastinal' },
      { item: '105', ncm_sh: '9018.90.99', desc: 'Conjunto descartável de balão intra-aórtico' },
    ]

    for (let i = 0; i < anexoIV.length; i++) {
      const row = anexoIV[i]
      const rec = new Record(col)
      rec.set('anexo', 'Anexo IV')
      rec.set('artigo_origem', 'Art. 131, LC 214/2025')
      rec.set('item', row.item)
      rec.set('descricao', row.desc)
      rec.set('ncm_sh', row.ncm_sh)
      rec.set('percentual_reducao_pct', 60)
      rec.set(
        'descricao_reducao',
        'Redução de 60% das alíquotas do IBS e da CBS (Dispositivos Médicos)',
      )
      rec.set('versao_extracao', DATA_EXTRACAO)
      rec.set('fonte', FONTE_OFICIAL)
      app.save(rec)
    }

    // ==========================================
    // 3. ANEXO V — Acessibilidade para Pessoas com Deficiência (Redução de 60%)
    // Base legal: Art. 132 da LC 214/2025
    // ==========================================
    const anexoV = [
      {
        item: '1.1',
        ncm_sh: '8708.99.10',
        desc: 'Comando de embreagem manual, suas partes e acessórios para adaptação veicular PCD',
      },
      {
        item: '1.2',
        ncm_sh: '8708.99.10',
        desc: 'Comando de freio manual, suas partes e acessórios para adaptação veicular PCD',
      },
      {
        item: '1.3',
        ncm_sh: '8708.99.10',
        desc: 'Comando de acelerador manual, suas partes e acessórios para adaptação veicular PCD',
      },
      {
        item: '1.4',
        ncm_sh: '8708.99.10',
        desc: 'Inversão do pedal do acelerador, suas partes e acessórios',
      },
      {
        item: '1.5',
        ncm_sh: '8708.99.10',
        desc: 'Prolongamento de pedais, suas partes e acessórios',
      },
      {
        item: '1.6',
        ncm_sh: '8708.29.99',
        desc: 'Empunhadura, suas partes e acessórios para adaptação veicular PCD',
      },
      {
        item: '1.7',
        ncm_sh: '8708.99.10',
        desc: 'Servo acionadores de volante, suas partes e acessórios',
      },
      {
        item: '1.8',
        ncm_sh: '8708.29.99',
        desc: 'Deslocamento de comandos do painel, suas partes e acessórios',
      },
      {
        item: '1.9',
        ncm_sh: '8708.29.99',
        desc: 'Plataforma giratória para assento de veículo PCD, partes e acessórios',
      },
      {
        item: '1.10',
        ncm_sh: '8708.29.99',
        desc: 'Trilho elétrico para deslocamento do assento interior do veículo PCD',
      },
      {
        item: '1.11',
        ncm_sh: '8428.90.90',
        desc: 'Plataforma de elevação para cadeira de rodas (manual/eletro-hidráulica)',
      },
      {
        item: '1.12',
        ncm_sh: '8708.29.99',
        desc: 'Rampa para cadeira de rodas veicular, suas partes e acessórios',
      },
      { item: '1.13', ncm_sh: '8425.31.10', desc: 'Guincho para transportar cadeira de rodas' },
      {
        item: '2.1',
        ncm_sh: '6602.00.00',
        desc: 'Bengala inteiriça, dobrável ou telescópica, com ponteira de náilon',
      },
      {
        item: '2.2',
        ncm_sh: '9102.11.10, 9102.11.90, 9102.91.00',
        desc: 'Relógio em braille, com sintetizador de voz e mostrador ampliado',
      },
      { item: '2.3', ncm_sh: '9025.19.90', desc: 'Termômetro digital com sistema de voz' },
      {
        item: '2.4',
        ncm_sh: '8470.10.00, 8470.29.00',
        desc: 'Calculadora digital com sistema de voz em braille/áudio',
      },
      {
        item: '2.5',
        ncm_sh: '8543.70.99',
        desc: 'Agenda eletrônica com teclado em braille com ou sem sintetizador de voz',
      },
      { item: '2.6', ncm_sh: '9017.20.00', desc: 'Reglete para escrita em braille' },
      {
        item: '2.7',
        ncm_sh: '8471.60.90',
        desc: 'Display braille e teclado em braille para uso em microcomputador',
      },
      { item: '2.8', ncm_sh: '8472.90.99', desc: 'Máquina de escrever para escrita em braille' },
      {
        item: '2.9',
        ncm_sh: '8443.32.22',
        desc: 'Impressora de caracteres em braille para uso com microcomputadores',
      },
      {
        item: '2.10',
        ncm_sh: '8471.80.00',
        desc: 'Equipamento sintetizador para reprodução em voz de sinais gerados por computador',
      },
      {
        item: '3.1',
        ncm_sh: '8517.1',
        desc: 'Aparelho telefônico com teclado alfanumérico e visor luminoso para surdos',
      },
      {
        item: '3.2',
        ncm_sh: '9103.10.00, 9105.11.00',
        desc: 'Relógio despertador vibratório e/ou luminoso',
      },
      {
        item: '3.3',
        ncm_sh: '8471.60.53',
        desc: 'Unidades de entrada de dados tipo mouse controláveis pelo movimento dos olhos para deficientes',
      },
    ]

    for (let i = 0; i < anexoV.length; i++) {
      const row = anexoV[i]
      const rec = new Record(col)
      rec.set('anexo', 'Anexo V')
      rec.set('artigo_origem', 'Art. 132, LC 214/2025')
      rec.set('item', row.item)
      rec.set('descricao', row.desc)
      rec.set('ncm_sh', row.ncm_sh)
      rec.set('percentual_reducao_pct', 60)
      rec.set(
        'descricao_reducao',
        'Redução de 60% das alíquotas do IBS e da CBS (Dispositivos de Acessibilidade PCD)',
      )
      rec.set('versao_extracao', DATA_EXTRACAO)
      rec.set('fonte', FONTE_OFICIAL)
      app.save(rec)
    }

    // ==========================================
    // 4. ANEXO VI — Nutrição Enteral/Parenteral e Erros Inatos do Metabolismo (Redução de 60%)
    // Base legal: Art. 133 da LC 214/2025
    // ==========================================
    const anexoVI = [
      { item: '1', ncm_sh: '2936.28.12', desc: 'Acetato de dextroalfatocoferol' },
      { item: '2', ncm_sh: '2922.41.90', desc: 'Acetato de lisina' },
      { item: '3', ncm_sh: '2915.29.90', desc: 'Acetato de potássio' },
      { item: '4', ncm_sh: '2915.29.10', desc: 'Acetato de sódio' },
      { item: '5', ncm_sh: '2915.29.90', desc: 'Acetato de zinco' },
      { item: '6', ncm_sh: '2922.50.39', desc: 'Acetiltirosina' },
      { item: '7', ncm_sh: '2915.21.00', desc: 'Ácido acético' },
      { item: '8', ncm_sh: '2936.27.10', desc: 'Ácido ascórbico' },
      { item: '9', ncm_sh: '2922.49.90', desc: 'Ácido aspártico' },
      { item: '10', ncm_sh: '2918.14.00', desc: 'Ácido cítrico' },
      { item: '11', ncm_sh: '2936.29.11', desc: 'Ácido fólico' },
      { item: '12', ncm_sh: '2922.42.10', desc: 'Ácido glutâmico' },
      { item: '13', ncm_sh: '2918.19.90', desc: 'Ácido málico' },
      { item: '14', ncm_sh: '2811.19.90', desc: 'Ácido selenioso' },
      { item: '15', ncm_sh: '2002.10.00', desc: 'Água para injeção' },
      { item: '16', ncm_sh: '2922.49.90', desc: 'Alanilglutamina' },
      { item: '17', ncm_sh: '2922.49.90', desc: 'Alanina' },
      { item: '18', ncm_sh: '3002.12.36', desc: 'Albumina humana' },
      { item: '19', ncm_sh: '2925.29.19', desc: 'Arginina' },
      { item: '20', ncm_sh: '2922.49.90', desc: 'Asparagina' },
      { item: '21', ncm_sh: '2836.30.00', desc: 'Bicarbonato de sódio' },
      { item: '22', ncm_sh: '2936.29.31', desc: 'Biotina' },
      { item: '23', ncm_sh: '2936.26.10', desc: 'Cianocobalamina' },
      { item: '24', ncm_sh: '2930.90.39', desc: 'Cistina' },
      { item: '25', ncm_sh: '2827.39.93', desc: 'Cloreto crômico' },
      { item: '26', ncm_sh: '2827.20.10, 2827.20.90', desc: 'Cloreto de cálcio' },
      { item: '27', ncm_sh: '2827.31.10, 2827.31.90', desc: 'Cloreto de magnésio' },
      { item: '28', ncm_sh: '2827.39.95', desc: 'Cloreto de manganês' },
      { item: '29', ncm_sh: '3104.20.10, 3104.20.90', desc: 'Cloreto de potássio' },
      { item: '30', ncm_sh: '2501.00.90', desc: 'Cloreto de sódio' },
      { item: '31', ncm_sh: '2827.39.98', desc: 'Cloreto de zinco' },
      { item: '32', ncm_sh: '2936.25.20', desc: 'Cloridrato de piridoxina' },
      { item: '33', ncm_sh: '2936.22.10', desc: 'Cloridrato de tiamina' },
      { item: '34', ncm_sh: '2936.22.90', desc: 'Cocarboxilase' },
      { item: '35', ncm_sh: '2936.29.21', desc: 'Colecalciferol' },
      { item: '36', ncm_sh: '2936.29.29', desc: 'Ergocalciferol' },
      { item: '37', ncm_sh: '2922.49.90', desc: 'Fenilalanina' },
      { item: '38', ncm_sh: '2936.29.40', desc: 'Fitomenadiona' },
      { item: '39', ncm_sh: '2106.90.90', desc: 'Fórmula para dieta isenta de fenilalanina' },
      { item: '40', ncm_sh: '2106.90.90', desc: 'Fórmula para dieta isenta de metionina' },
      {
        item: '41',
        ncm_sh: '2106.90.90',
        desc: 'Fórmula para dieta isenta de lisina e pobre de triptofano',
      },
      {
        item: '42',
        ncm_sh: '2106.90.90',
        desc: 'Fórmula para dieta isenta de leucina, isoleucina ou valina',
      },
      {
        item: '43',
        ncm_sh: '2106.90.90',
        desc: 'Fórmula para dieta isenta de fenilalanina e de metionina',
      },
      {
        item: '44',
        ncm_sh: '2106.90.90',
        desc: 'Fórmula para dieta isenta de aminoácidos não essenciais',
      },
      {
        item: '45',
        ncm_sh: '2106.90.90',
        desc: 'Fórmula para dieta isenta de metionina, treonina, valina e restrita de isoleucina',
      },
      {
        item: '46',
        ncm_sh: '2106.90.90',
        desc: 'Fórmula para dieta cetogênica (4g gordura para 1g carboidrato/proteína)',
      },
      {
        item: '47',
        ncm_sh: '2202.99.00',
        desc: 'Fórmula hiperlipídica para suplementação de triglicerídios de cadeia média',
      },
      {
        item: '48',
        ncm_sh: '2202.99.00',
        desc: 'Preparação líquida de 4 partes de trioleato de glicerol para 1 de trierucato',
      },
      { item: '49', ncm_sh: '2835.24.00', desc: 'Fosfato de potássio dibásico' },
      { item: '50', ncm_sh: '2835.24.00', desc: 'Fosfato de potássio monobásico' },
      { item: '51', ncm_sh: '2835.22.00', desc: 'Fosfato de sódio monobásico' },
      { item: '52', ncm_sh: '2936.22.90', desc: 'Fosfato de tiamina' },
      { item: '53', ncm_sh: '2936.23.20', desc: 'Fosfato sódico de riboflavina' },
      { item: '54', ncm_sh: '1702.50.00', desc: 'Frutose' },
      { item: '55', ncm_sh: '2919.90.90', desc: 'Glicerofosfato de sódio' },
      { item: '56', ncm_sh: '2922.49.10', desc: 'Glicina' },
      { item: '57', ncm_sh: '2918.16.10', desc: 'Gliconato de cálcio' },
      { item: '58', ncm_sh: '1702.30.11', desc: 'Glicose' },
      { item: '59', ncm_sh: '2933.29.92', desc: 'Histidina' },
      { item: '60', ncm_sh: '3505.10.00', desc: 'Icodextrina' },
      { item: '61', ncm_sh: '2827.60.12', desc: 'Iodeto de potássio' },
      { item: '62', ncm_sh: '2922.49.90', desc: 'Isoleucina' },
      { item: '63', ncm_sh: '2923.20.00', desc: 'Lecitina de ovo' },
      { item: '64', ncm_sh: '2922.49.90', desc: 'Leucina' },
      { item: '65', ncm_sh: '2922.49.90', desc: 'Levovalina' },
      { item: '66', ncm_sh: '2922.41.10', desc: 'Lisina' },
      { item: '67', ncm_sh: '2930.40.10, 2930.40.90', desc: 'Metionina' },
      { item: '68', ncm_sh: '2936.29.52', desc: 'Nicotinamida' },
      { item: '69', ncm_sh: '2936.21.13', desc: 'Palmitato de retinol' },
      { item: '70', ncm_sh: '2922.49.90', desc: 'Prolina' },
      { item: '71', ncm_sh: '2936.23.10', desc: 'Riboflavina' },
      { item: '72', ncm_sh: '2842.90.00', desc: 'Selenito de sódio' },
      { item: '73', ncm_sh: '2922.50.99', desc: 'Serina' },
      { item: '74', ncm_sh: '2905.44.00', desc: 'Sorbitol' },
      { item: '75', ncm_sh: '2833.21.00', desc: 'Sulfato de magnésio' },
      { item: '76', ncm_sh: '2833.29.70', desc: 'Sulfato de zinco' },
      { item: '77', ncm_sh: '2922.49.90', desc: 'Taurina' },
      { item: '78', ncm_sh: '2922.50.39', desc: 'Tirosina' },
      { item: '79', ncm_sh: '2936.28.11', desc: 'Tocoferol' },
      { item: '80', ncm_sh: '2922.50.99', desc: 'Treonina' },
      { item: '81', ncm_sh: '1513.19.00, 1513.29.11', desc: 'Triglicerídeos de cadeia média' },
    ]

    for (let i = 0; i < anexoVI.length; i++) {
      const row = anexoVI[i]
      const rec = new Record(col)
      rec.set('anexo', 'Anexo VI')
      rec.set('artigo_origem', 'Art. 133, LC 214/2025')
      rec.set('item', row.item)
      rec.set('descricao', row.desc)
      rec.set('ncm_sh', row.ncm_sh)
      rec.set('percentual_reducao_pct', 60)
      rec.set(
        'descricao_reducao',
        'Redução de 60% das alíquotas do IBS e da CBS (Nutrição Enteral/Parenteral e Erros Inatos do Metabolismo)',
      )
      rec.set('versao_extracao', DATA_EXTRACAO)
      rec.set('fonte', FONTE_OFICIAL)
      app.save(rec)
    }

    // ==========================================
    // 5. ANEXO VII — Alimentos Destinados ao Consumo Humano (Redução de 60%)
    // Base legal: Art. 135 da LC 214/2025
    // ==========================================
    const anexoVII = [
      {
        item: '1',
        ncm_sh:
          '0306.1, 0306.3, 0307.31.00, 0307.32.00, 0307.42.00, 0307.43, 0307.51.00, 0307.52.00, 0307.91.00, 0307.92.00',
        desc: 'Crustáceos (exceto lagostas e lagostim) e moluscos',
      },
      {
        item: '2',
        ncm_sh: '0403.20.00, 0403.90.00, 2202.99.00',
        desc: 'Leite fermentado, bebidas e compostos lácteos',
      },
      { item: '3', ncm_sh: '0409.00.00', desc: 'Mel natural' },
      {
        item: '4',
        ncm_sh: '1101.00, 1102, 1105, 1106, 1208',
        desc: 'Farinha das posições 1101.00, 11.02, 11.05, 11.06 e 12.08 da NCM/SH (ressalvados Anexo I)',
      },
      {
        item: '5',
        ncm_sh: '1103.11.00, 1103.19.00',
        desc: 'Grumos e sêmolas de cereais (ressalvados Anexo I)',
      },
      {
        item: '6',
        ncm_sh: '1104.1, 1104.2',
        desc: 'Grãos de cereais das subposições 1104.1 e 1104.2 (ressalvados Anexo I)',
      },
      { item: '7', ncm_sh: '1108.12.00', desc: 'Amido de milho' },
      {
        item: '8',
        ncm_sh: '1507.90, 1508, 1511, 1512, 1513, 1514, 1515',
        desc: 'Óleos de soja, milho, canola e demais óleos vegetais para consumo como alimento',
      },
      {
        item: '9',
        ncm_sh: '1902.20.00, 1902.30.00',
        desc: 'Massas alimentícias recheadas ou outras',
      },
      {
        item: '10',
        ncm_sh: '2009',
        desc: 'Sucos naturais de fruta ou produtos hortícolas sem adição de açúcar ou conservantes',
      },
      {
        item: '11',
        ncm_sh: '2008',
        desc: 'Polpas de frutas ou produtos hortícolas sem açúcar e sem conservantes',
      },
      { item: '12', ncm_sh: '1905.90.10', desc: 'Pão de Forma' },
      { item: '13', ncm_sh: '2002.90.00', desc: 'Extrato de tomate' },
      {
        item: '14',
        ncm_sh: '07, 08',
        desc: 'Frutas, produtos hortícolas e demais vegetais sem adição de açúcar dos capítulos 7 e 8',
      },
      {
        item: '15',
        ncm_sh: '10, 12',
        desc: 'Cereais do capítulo 10 e sementes/frutos oleaginosos do capítulo 12',
      },
      {
        item: '16',
        ncm_sh: '2004, 2005, 2002.10.00',
        desc: 'Produtos hortícolas pré-cozidos ou cozidos em água/vapor sem sal ou aditivos',
      },
      {
        item: '17',
        ncm_sh: '2008.1',
        desc: 'Fruta de casca rija regional, amendoins e outras sementes apenas torrados ou cozidos',
      },
    ]

    for (let i = 0; i < anexoVII.length; i++) {
      const row = anexoVII[i]
      const rec = new Record(col)
      rec.set('anexo', 'Anexo VII')
      rec.set('artigo_origem', 'Art. 135, LC 214/2025')
      rec.set('item', row.item)
      rec.set('descricao', row.desc)
      rec.set('ncm_sh', row.ncm_sh)
      rec.set('percentual_reducao_pct', 60)
      rec.set(
        'descricao_reducao',
        'Redução de 60% das alíquotas do IBS e da CBS (Alimentos Favorecidos para Consumo Humano)',
      )
      rec.set('versao_extracao', DATA_EXTRACAO)
      rec.set('fonte', FONTE_OFICIAL)
      app.save(rec)
    }

    // ==========================================
    // 6. ANEXO VIII — Higiene Pessoal e Limpeza Baixa Renda (Redução de 60%)
    // Base legal: Art. 136 da LC 214/2025
    // ==========================================
    const anexoVIII = [
      { item: '1', ncm_sh: '3401.11.90', desc: 'Sabões de toucador' },
      { item: '2', ncm_sh: '3306.10.00', desc: 'Dentifrícios' },
      { item: '3', ncm_sh: '9603.21.00', desc: 'Escovas de dentes' },
      { item: '4', ncm_sh: '4818.10.00', desc: 'Papel higiênico' },
      { item: '5', ncm_sh: '3808.94.19', desc: 'Água sanitária' },
      { item: '6', ncm_sh: '3401.19.00', desc: 'Sabões em barra' },
      {
        item: '7',
        ncm_sh: '9619.00.00',
        desc: 'Fraldas e artigos higiênicos semelhantes de qualquer matéria',
      },
    ]

    for (let i = 0; i < anexoVIII.length; i++) {
      const row = anexoVIII[i]
      const rec = new Record(col)
      rec.set('anexo', 'Anexo VIII')
      rec.set('artigo_origem', 'Art. 136, LC 214/2025')
      rec.set('item', row.item)
      rec.set('descricao', row.desc)
      rec.set('ncm_sh', row.ncm_sh)
      rec.set('percentual_reducao_pct', 60)
      rec.set(
        'descricao_reducao',
        'Redução de 60% das alíquotas do IBS e da CBS (Higiene Pessoal e Limpeza Baixa Renda)',
      )
      rec.set('versao_extracao', DATA_EXTRACAO)
      rec.set('fonte', FONTE_OFICIAL)
      app.save(rec)
    }

    // ==========================================
    // 7. ANEXO IX — Insumos Agropecuários e Aquícolas (Redução de 60%)
    // Base legal: Art. 138 da LC 214/2025
    // ==========================================
    const anexoIX = [
      {
        item: '1',
        ncm_sh: '3101.00.00',
        desc: 'Biofertilizantes em conformidade com legislação específica',
      },
      {
        item: '2',
        ncm_sh: '31, 3824.99.77, 3824.99.79, 3824.99.89',
        desc: 'Fertilizantes (adubos) do Capítulo 31',
      },
      {
        item: '3',
        ncm_sh: '25',
        desc: 'Corretivos de solo, remineralizadores e substratos para plantas do Capítulo 25',
      },
      {
        item: '4',
        ncm_sh: '3002.49, 3002.90.00, 3821.00.00',
        desc: 'Inoculantes, meios de cultura e outros microrganismos para uso agrícola',
      },
      {
        item: '5',
        ncm_sh: '38.24, 3807.00.00, 12.11, 38.08',
        desc: 'Bioestimulantes e bioinsumos para controle fitossanitário',
      },
      {
        item: '6',
        ncm_sh: '38.08, 3824.99.89',
        desc: 'Inseticidas, fungicidas, herbicidas, formicidas, dessecantes e reguladores de crescimento para uso agropecuário',
      },
      {
        item: '7',
        ncm_sh:
          '05.06, 1201.10.00, 1213.00.00, 1301.90.90, 1302.19.9, 1401.90.00, 1404.90.90, 2102.20.00, 23.02, 23.03, 2304.00, 2305.00.00, 23.06, 2308.00.00, 2703.00.00, 2839.90.10, 2839.90.50, 2922.4, 2930.40, 33.01, 3802.90.40, 3804.00, 3824.99.71, 4401.39.00, 4401.4, 4402.90.00, 4701.00.00, 5305.00.90, 6806.20.00',
        desc: 'Calcário, tortas, bagaços, resíduos vegetais, cinzas, aminoácidos e matérias-primas destinadas à fabricação de fertilizantes e corretivos',
      },
      {
        item: '8',
        ncm_sh:
          '2503.00.10, 2503.00.90, 2510.10.10, 2510.10.90, 2510.20.10, 2510.20.90, 2802.00.00, 2806.10.20, 2807.00.10, 2808.00.10, 2809.20.11, 2809.20.19, 2811.19.20, 2815.11.00, 2815.12.00, 2836.20.10, 2836.20.90, 2915.21.00',
        desc: 'Ácido nítrico, sulfúrico, fosfórico, enxofre e produtos químicos destinados diretamente à fabricação de fertilizantes',
      },
      {
        item: '9',
        ncm_sh: '3507.90.4',
        desc: 'Enzimas preparadas para decomposição de matéria orgânica animal e vegetal',
      },
      {
        item: '10',
        ncm_sh: '07, 10, 12',
        desc: 'Sementes genéticas, básicas, certificadas (C1, C2) e sementes crioulas dos Capítulos 7, 10 e 12',
      },
      {
        item: '11',
        ncm_sh: '06.01, 06.02',
        desc: 'Mudas de plantas e demais materiais propagativos de plantas e fungos',
      },
      {
        item: '12',
        ncm_sh: '3002.12, 3002.15, 3002.42, 3002.90.00, 30.04',
        desc: 'Vacinas, soros e medicamentos de uso veterinário (exceto animais domésticos)',
      },
      { item: '13', ncm_sh: '0105.1', desc: 'Aves de um dia, exceto as ornamentais' },
      { item: '14', ncm_sh: '0511.10.00, 0511.9', desc: 'Embriões e sêmen congelado ou resfriado' },
      {
        item: '15',
        ncm_sh: '01.02, 01.03, 01.04',
        desc: 'Reprodutores de raça pura e matrizes com registro genealógico',
      },
      { item: '16', ncm_sh: '0407.1', desc: 'Ovos fertilizados' },
      { item: '17', ncm_sh: '0106.90.00', desc: 'Girinos e alevinos' },
      {
        item: '18',
        ncm_sh: '2309.90',
        desc: 'Rações para animais, concentrados, suplementos e premix (exceto para animais domésticos)',
      },
      {
        item: '19',
        ncm_sh: '10, 11, 12',
        desc: 'Sementes e cereais destinados à fabricação de ração animal (exceto domésticos)',
      },
      {
        item: '20',
        ncm_sh: '23.01, 23.02, 23.03, 2304.00, 2305.00.00, 23.06, 2308.00.00',
        desc: 'Farelos e tortas de produtos vegetais destinados à alimentação animal',
      },
      {
        item: '21',
        ncm_sh: '02.10, 03.09, 0712.90.10, 15, 2501.00, 2521.00.00, 2930.40',
        desc: 'Farinhas de peixe, carne, ossos, sal mineralizado e insumos para ração animal',
      },
      { item: '22', ncm_sh: 'NBS 1.1410.90.00', desc: 'Serviços agronômicos' },
      {
        item: '23',
        ncm_sh: 'NBS 1.1410.90.00',
        desc: 'Serviços de técnico agrícola, agropecuário ou em agroecologia',
      },
      {
        item: '24',
        ncm_sh: 'NBS 1.1405.21.00, 1.1405.22.00, 1.1405.90.00',
        desc: 'Serviços veterinários para produção animal',
      },
      { item: '25', ncm_sh: 'NBS 1.1410.90.00', desc: 'Serviços de zootecnistas' },
      {
        item: '26',
        ncm_sh: 'NBS 1.1405.22.00',
        desc: 'Serviços de inseminação e fertilização de animais de criação',
      },
      { item: '27', ncm_sh: 'NBS 1.1403.10.00', desc: 'Serviços de engenharia florestal' },
      {
        item: '28',
        ncm_sh: 'NBS 1.1901.10.00',
        desc: 'Serviços de pulverização e controle de pragas agrícolas',
      },
      {
        item: '29',
        ncm_sh: 'NBS 1.1901.10.00',
        desc: 'Serviços de semeadura, adubação, preparação de solo, plantio e colheita',
      },
      {
        item: '30',
        ncm_sh: 'NBS 1.1403.29.00',
        desc: 'Serviços de projetos para irrigação e fertirrigação',
      },
      {
        item: '31',
        ncm_sh: 'NBS 1.1404.41.00',
        desc: 'Serviços de análise laboratorial de solos, sementes, água e sanidade animal',
      },
      {
        item: '32',
        ncm_sh: 'NBS 1.1105.10.00',
        desc: 'Licenciamento de direitos sobre cultivares',
      },
      {
        item: '33',
        ncm_sh: 'NBS 1.1109.10.00',
        desc: 'Cessão definitiva de direitos sobre cultivares',
      },
      {
        item: '34',
        ncm_sh: 'NBS 1.1105.10.00',
        desc: 'Melhoramento genético de animais e plantas e biotecnologia',
      },
      { item: '35', ncm_sh: '2303.30.00, 2303.20.00', desc: 'Vinhaça' },
    ]

    for (let i = 0; i < anexoIX.length; i++) {
      const row = anexoIX[i]
      const rec = new Record(col)
      rec.set('anexo', 'Anexo IX')
      rec.set('artigo_origem', 'Art. 138, LC 214/2025')
      rec.set('item', row.item)
      rec.set('descricao', row.desc)
      rec.set('ncm_sh', row.ncm_sh)
      rec.set('percentual_reducao_pct', 60)
      rec.set(
        'descricao_reducao',
        'Redução de 60% das alíquotas do IBS e da CBS (Insumos Agropecuários e Aquícolas)',
      )
      rec.set('versao_extracao', DATA_EXTRACAO)
      rec.set('fonte', FONTE_OFICIAL)
      app.save(rec)
    }

    console.log(
      'Carga seed lc214_anexos_ncm concluída com sucesso. Total de anexos carregados: Anexo I (26), Anexo IV (105), Anexo V (26), Anexo VI (81), Anexo VII (17), Anexo VIII (7), Anexo IX (35).',
    )
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('lc214_anexos_ncm')
      app.truncateCollection(col)
    } catch (_) {}
  },
)
