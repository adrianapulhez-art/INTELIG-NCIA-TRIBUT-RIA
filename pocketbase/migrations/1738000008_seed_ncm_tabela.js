/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ncm_tabela')
    if (!col) return

    // Snapshot inicial de NCMs oficiais (TIPI / TEC / Classif Siscomex)
    // Versão oficial: Resolução Gecex nº 272/2021 e Decreto 11.158/2022
    // Carga idempotente: verifica antes de inserir
    const SEED_NCM_LIST = [
      {
        codigo_ncm: '94032000',
        codigo_formatado: '9403.20.00',
        descricao: 'Outros móveis de metal (inclui camas de metal, estrados e beliches metálicos)',
        descricao_completa:
          'Móveis e suas partes; móveis de metal para dormitórios e uso doméstico em geral',
        capitulo: '94',
        posicao: '9403',
        subposicao: '940320',
        nivel: 8,
      },
      {
        codigo_ncm: '94035000',
        codigo_formatado: '9403.50.00',
        descricao:
          'Móveis de madeira do tipo utilizado em quartos de dormir (camas de madeira, cabeceiras, criados-mudos)',
        descricao_completa:
          'Móveis e suas partes; móveis de madeira para dormitórios (camas, beliches e guarda-roupas)',
        capitulo: '94',
        posicao: '9403',
        subposicao: '940350',
        nivel: 8,
      },
      {
        codigo_ncm: '94029000',
        codigo_formatado: '9402.90.00',
        descricao:
          'Mobiliário para medicina, cirurgia, odontologia ou veterinária (camas hospitalares com mecanismo)',
        descricao_completa:
          'Camas de hospital com mecanismos de elevação, mesas de operação e similares (LC 214 Anexo IV)',
        capitulo: '94',
        posicao: '9402',
        subposicao: '940290',
        nivel: 8,
      },
      {
        codigo_ncm: '94042100',
        codigo_formatado: '9404.21.00',
        descricao: 'Colchões de borracha alveolar ou de plásticos alveolares, mesmo recobertos',
        descricao_completa: 'Suportes para camas, colchões de espuma e plásticos alveolares',
        capitulo: '94',
        posicao: '9404',
        subposicao: '940421',
        nivel: 8,
      },
      {
        codigo_ncm: '94042900',
        codigo_formatado: '9404.29.00',
        descricao: 'Colchões de outras matérias (colchões de molas ensacadas, ortopédicos)',
        descricao_completa:
          'Colchões de molas com enchimento têxtil ou misto para camas residenciais',
        capitulo: '94',
        posicao: '9404',
        subposicao: '940429',
        nivel: 8,
      },
      {
        codigo_ncm: '94049000',
        codigo_formatado: '9404.90.00',
        descricao: 'Artigos de cama e semelhantes (edredons, travesseiros, almofadas, acolchoados)',
        descricao_completa:
          'Artigos de cama recheados de penas, penugem ou fibras sintéticas (edredons e travesseiros)',
        capitulo: '94',
        posicao: '9404',
        subposicao: '940490',
        nivel: 8,
      },
      {
        codigo_ncm: '94031000',
        codigo_formatado: '9403.10.00',
        descricao: 'Móveis de metal do tipo utilizado em escritórios',
        descricao_completa: 'Armários, arquivos e mesas metálicas de escritório',
        capitulo: '94',
        posicao: '9403',
        subposicao: '940310',
        nivel: 8,
      },
      {
        codigo_ncm: '94033000',
        codigo_formatado: '9403.30.00',
        descricao: 'Móveis de madeira do tipo utilizado em escritórios',
        descricao_completa:
          'Mesas executivas, estações de trabalho e armários de madeira para escritórios',
        capitulo: '94',
        posicao: '9403',
        subposicao: '940330',
        nivel: 8,
      },
      {
        codigo_ncm: '94036000',
        codigo_formatado: '9403.60.00',
        descricao: 'Outros móveis de madeira (mesas de sala, estantes e cadeiras de madeira)',
        descricao_completa: 'Mobiliário de madeira residencial para salas e copas',
        capitulo: '94',
        posicao: '9403',
        subposicao: '940360',
        nivel: 8,
      },
      {
        codigo_ncm: '94037000',
        codigo_formatado: '9403.70.00',
        descricao: 'Móveis de plásticos',
        descricao_completa: 'Cadeiras, banquetas e mesas de plástico injetado',
        capitulo: '94',
        posicao: '9403',
        subposicao: '940370',
        nivel: 8,
      },
      {
        codigo_ncm: '63022100',
        codigo_formatado: '6302.21.00',
        descricao: 'Roupas de cama estampadas, de algodão (lençóis, fronhas, jogos de cama)',
        descricao_completa:
          'Artigos têxteis confeccionados: roupas de cama de algodão para cama de solteiro ou casal',
        capitulo: '63',
        posicao: '6302',
        subposicao: '630221',
        nivel: 8,
      },
      {
        codigo_ncm: '63023100',
        codigo_formatado: '6302.31.00',
        descricao: 'Outras roupas de cama, de algodão (lençóis lisos, capas de colchão)',
        descricao_completa: 'Roupas de cama de algodão liso ou alvejado',
        capitulo: '63',
        posicao: '6302',
        subposicao: '630231',
        nivel: 8,
      },
      {
        codigo_ncm: '63023200',
        codigo_formatado: '6302.32.00',
        descricao: 'Roupas de cama de fibras sintéticas ou artificiais (microfibra para cama)',
        descricao_completa: 'Jogos de cama e lençóis em poliéster e microfibra sintética',
        capitulo: '63',
        posicao: '6302',
        subposicao: '630232',
        nivel: 8,
      },
      {
        codigo_ncm: '63026000',
        codigo_formatado: '6302.60.00',
        descricao:
          'Roupas de toucador ou de cozinha, de tecidos atoalhados de algodão (toalhas de banho)',
        descricao_completa:
          'Toalhas de banho, rosto e pisos de tecido felpudo ou atoalhado de algodão',
        capitulo: '63',
        posicao: '6302',
        subposicao: '630260',
        nivel: 8,
      },
      {
        codigo_ncm: '85171300',
        codigo_formatado: '8517.13.00',
        descricao:
          'Smartphones (telefones inteligentes para redes celulares ou outras redes sem fio)',
        descricao_completa:
          'Aparelhos telefônicos inteligentes celulares portáteis de telecomunicações',
        capitulo: '85',
        posicao: '8517',
        subposicao: '851713',
        nivel: 8,
      },
      {
        codigo_ncm: '85171400',
        codigo_formatado: '8517.14.00',
        descricao: 'Outros telefones para redes celulares ou para outras redes sem fio',
        descricao_completa: 'Telefones celulares básicos e terminais portáteis',
        capitulo: '85',
        posicao: '8517',
        subposicao: '851714',
        nivel: 8,
      },
      {
        codigo_ncm: '85176277',
        codigo_formatado: '8517.62.77',
        descricao: 'Roteadores digitais em redes com ou sem fio',
        descricao_completa: 'Aparelhos de comutação e roteamento de pacotes de dados',
        capitulo: '85',
        posicao: '8517',
        subposicao: '851762',
        nivel: 8,
      },
      {
        codigo_ncm: '84713012',
        codigo_formatado: '8471.30.12',
        descricao:
          'Máquinas automáticas para processamento de dados, portáteis (computadores portáteis / notebooks)',
        descricao_completa:
          'Notebooks, laptops e computadores pessoais portáteis de peso inferior a 10 kg',
        capitulo: '84',
        posicao: '8471',
        subposicao: '847130',
        nivel: 8,
      },
      {
        codigo_ncm: '84713019',
        codigo_formatado: '8471.30.19',
        descricao: 'Outros computadores portáteis (inclui tablets com tela sensível ao toque)',
        descricao_completa: 'Tablets portáteis sem teclado físico incorporado',
        capitulo: '84',
        posicao: '8471',
        subposicao: '847130',
        nivel: 8,
      },
      {
        codigo_ncm: '39269090',
        codigo_formatado: '3926.90.90',
        descricao: 'Outras obras de plásticos (capas protetoras de celular, películas e suportes)',
        descricao_completa:
          'Artigos e artefatos de matérias plásticas moldadas ou usinadas para uso comum',
        capitulo: '39',
        posicao: '3926',
        subposicao: '392690',
        nivel: 8,
      },
      {
        codigo_ncm: '10063021',
        codigo_formatado: '1006.30.21',
        descricao:
          'Arroz semibranqueado ou branqueado, não parboilizado, polido (Cesta Básica Nacional)',
        descricao_completa:
          'Arroz de consumo humano — Alíquota Zero IBS/CBS (LC 214/2025 Anexo I, Art. 125)',
        capitulo: '10',
        posicao: '1006',
        subposicao: '100630',
        nivel: 8,
      },
      {
        codigo_ncm: '10063011',
        codigo_formatado: '1006.30.11',
        descricao: 'Arroz parboilizado, polido ou brunido (Cesta Básica Nacional)',
        descricao_completa:
          'Arroz parboilizado de consumo humano — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '10',
        posicao: '1006',
        subposicao: '100630',
        nivel: 8,
      },
      {
        codigo_ncm: '07133319',
        codigo_formatado: '0713.33.19',
        descricao: 'Feijão preto comum (Phaseolus vulgaris) seco, em grãos (Cesta Básica Nacional)',
        descricao_completa:
          'Feijão preto de consumo humano — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '07',
        posicao: '0713',
        subposicao: '071333',
        nivel: 8,
      },
      {
        codigo_ncm: '07133329',
        codigo_formatado: '0713.33.29',
        descricao: 'Feijão carioca e outros feijões comuns secos em grãos (Cesta Básica Nacional)',
        descricao_completa:
          'Feijão carioca de consumo da população — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '07',
        posicao: '0713',
        subposicao: '071333',
        nivel: 8,
      },
      {
        codigo_ncm: '04012010',
        codigo_formatado: '0401.20.10',
        descricao:
          'Leite UHT (longa vida) com teor de matéria gorda superior a 1% e inferior ou igual a 6%',
        descricao_completa:
          'Leite fluido esterilizado/ultrapasteurizado — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '04',
        posicao: '0401',
        subposicao: '040120',
        nivel: 8,
      },
      {
        codigo_ncm: '04011010',
        codigo_formatado: '0401.10.10',
        descricao: 'Leite pasteurizado ou UHT desnatado (teor de matéria gorda até 1%)',
        descricao_completa:
          'Leite desnatado para consumo direto da população — Alíquota Zero (LC 214 Anexo I)',
        capitulo: '04',
        posicao: '0401',
        subposicao: '040110',
        nivel: 8,
      },
      {
        codigo_ncm: '04021010',
        codigo_formatado: '0402.10.10',
        descricao: 'Leite em pó desnatado em recipientes de conteúdo até 1 kg',
        descricao_completa:
          'Leite em pó para consumo humano — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '04',
        posicao: '0402',
        subposicao: '040210',
        nivel: 8,
      },
      {
        codigo_ncm: '04051000',
        codigo_formatado: '0405.10.00',
        descricao: 'Manteiga de leite de vaca (Cesta Básica Nacional)',
        descricao_completa:
          'Manteiga para consumo da população — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '04',
        posicao: '0405',
        subposicao: '040510',
        nivel: 8,
      },
      {
        codigo_ncm: '15171000',
        codigo_formatado: '1517.10.00',
        descricao: 'Margarina, exceto a margarina líquida (Cesta Básica Nacional)',
        descricao_completa:
          'Margarina vegetal de consumo humano — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '15',
        posicao: '1517',
        subposicao: '151710',
        nivel: 8,
      },
      {
        codigo_ncm: '09012100',
        codigo_formatado: '0901.21.00',
        descricao: 'Café torrado, não descafeinado (Cesta Básica Nacional)',
        descricao_completa:
          'Café torrado em grãos ou moído — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '09',
        posicao: '0901',
        subposicao: '090121',
        nivel: 8,
      },
      {
        codigo_ncm: '11010010',
        codigo_formatado: '1101.00.10',
        descricao: 'Farinha de trigo de consumo humano (Cesta Básica Nacional)',
        descricao_completa:
          'Farinha de trigo tipo 1 e especial — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '11',
        posicao: '1101',
        subposicao: '110100',
        nivel: 8,
      },
      {
        codigo_ncm: '11062000',
        codigo_formatado: '1106.20.00',
        descricao: 'Farinha e sêmola de mandioca (Cesta Básica Nacional)',
        descricao_completa: 'Farinha de mandioca de mesa — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '11',
        posicao: '1106',
        subposicao: '110620',
        nivel: 8,
      },
      {
        codigo_ncm: '17019900',
        codigo_formatado: '1701.99.00',
        descricao: 'Outros açúcares de cana refinados, cristal ou moídos (Cesta Básica Nacional)',
        descricao_completa:
          'Açúcar branco refinado e cristal para uso doméstico — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '17',
        posicao: '1701',
        subposicao: '170199',
        nivel: 8,
      },
      {
        codigo_ncm: '19021900',
        codigo_formatado: '1902.19.00',
        descricao: 'Massas alimentícias secas não cozidas, sem ovos (macarrão comum)',
        descricao_completa:
          'Macarrão de sêmola e trigo duro não recheado — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '19',
        posicao: '1902',
        subposicao: '190219',
        nivel: 8,
      },
      {
        codigo_ncm: '19059090',
        codigo_formatado: '1905.90.90',
        descricao:
          'Outros produtos de padaria (pão francês tradicional de farinha, água, sal e fermento)',
        descricao_completa:
          'Pão francês formato cilíndrico alongado — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '19',
        posicao: '1905',
        subposicao: '190590',
        nivel: 8,
      },
      {
        codigo_ncm: '04061010',
        codigo_formatado: '0406.10.10',
        descricao: 'Queijo tipo mozarela (Cesta Básica Nacional)',
        descricao_completa:
          'Queijo mozarela fatiado ou em peça — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '04',
        posicao: '0406',
        subposicao: '040610',
        nivel: 8,
      },
      {
        codigo_ncm: '04061090',
        codigo_formatado: '0406.10.90',
        descricao: 'Queijo minas frescal, queijo de coalho e ricota fresca',
        descricao_completa:
          'Queijos frescos tradicionais da Cesta Básica Nacional — Redução 100% IBS/CBS (LC 214 Anexo I)',
        capitulo: '04',
        posicao: '0406',
        subposicao: '040610',
        nivel: 8,
      },
      {
        codigo_ncm: '02013000',
        codigo_formatado: '0201.30.00',
        descricao: 'Carnes de animais da espécie bovina, desossadas, frescas ou refrigeradas',
        descricao_completa:
          'Carne bovina in natura para consumo humano — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '02',
        posicao: '0201',
        subposicao: '020130',
        nivel: 8,
      },
      {
        codigo_ncm: '02071400',
        codigo_formatado: '0207.14.00',
        descricao: 'Pedaços e miudezas de galos e de galinhas, congelados (frango em pedaços)',
        descricao_completa:
          'Carne de frango congelada de consumo da população — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '02',
        posicao: '0207',
        subposicao: '020714',
        nivel: 8,
      },
      {
        codigo_ncm: '02032900',
        codigo_formatado: '0203.29.00',
        descricao: 'Outras carnes de animais da espécie suína, congeladas',
        descricao_completa:
          'Cortes suínos de consumo humano — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '02',
        posicao: '0203',
        subposicao: '020329',
        nivel: 8,
      },
      {
        codigo_ncm: '03038954',
        codigo_formatado: '0303.89.54',
        descricao: 'Tilápias congeladas (Oreochromis spp.)',
        descricao_completa: 'Peixes de consumo popular — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '03',
        posicao: '0303',
        subposicao: '030389',
        nivel: 8,
      },
      {
        codigo_ncm: '25010020',
        codigo_formatado: '2501.00.20',
        descricao: 'Sal de mesa ou refinado, para consumo humano (iodado)',
        descricao_completa:
          'Sal refinado para consumo humano — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
        capitulo: '25',
        posicao: '2501',
        subposicao: '250100',
        nivel: 8,
      },
      {
        codigo_ncm: '30049099',
        codigo_formatado: '3004.90.99',
        descricao:
          'Outros medicamentos para medicina humana dosificados em comprimidos, cápsulas ou ampolas',
        descricao_completa:
          'Medicamentos essenciais de uso humano — Redução 60% IBS/CBS (LC 214/2025 Anexo VI)',
        capitulo: '30',
        posicao: '3004',
        subposicao: '300490',
        nivel: 8,
      },
      {
        codigo_ncm: '90183910',
        codigo_formatado: '9018.39.10',
        descricao: 'Agulhas para sutura e agulhas tubulares de uso médico-cirúrgico',
        descricao_completa:
          'Instrumentos e aparelhos de medicina humana — Redução 60% (LC 214 Anexo IV)',
        capitulo: '90',
        posicao: '9018',
        subposicao: '901839',
        nivel: 8,
      },
      {
        codigo_ncm: '90211010',
        codigo_formatado: '9021.10.10',
        descricao: 'Artigos e aparelhos ortopédicos para fraturas ou sustentação',
        descricao_completa:
          'Aparelhos ortopédicos e de tecnologia assistiva — Redução de 60% ou Alíquota Zero (LC 214)',
        capitulo: '90',
        posicao: '9021',
        subposicao: '902110',
        nivel: 8,
      },
      {
        codigo_ncm: '90213919',
        codigo_formatado: '9021.39.19',
        descricao: 'Outras próteses e implantes cirúrgicos articulares',
        descricao_completa:
          'Próteses articulares para ortopedia — Redução 60% IBS/CBS (LC 214 Anexo IV)',
        capitulo: '90',
        posicao: '9021',
        subposicao: '902139',
        nivel: 8,
      },
      {
        codigo_ncm: '31052000',
        codigo_formatado: '3105.20.00',
        descricao:
          'Adubos (fertilizantes) minerais ou químicos, com nitrogênio, fósforo e potássio (NPK)',
        descricao_completa:
          'Fertilizantes NPK para uso agrícola — Redução 60% IBS/CBS (LC 214 Anexo IX)',
        capitulo: '31',
        posicao: '3105',
        subposicao: '310520',
        nivel: 8,
      },
      {
        codigo_ncm: '38089199',
        codigo_formatado: '3808.91.99',
        descricao: 'Outros inseticidas para controle de pragas na agricultura',
        descricao_completa:
          'Defensivos agrícolas e inseticidas para produção vegetal — Redução 60% (LC 214 Anexo IX)',
        capitulo: '38',
        posicao: '3808',
        subposicao: '380891',
        nivel: 8,
      },
      {
        codigo_ncm: '23099090',
        codigo_formatado: '2309.90.90',
        descricao:
          'Outras preparações para alimentação de animais (rações para suínos, bovinos e aves)',
        descricao_completa:
          'Rações de produção agropecuária — Redução 60% IBS/CBS (LC 214 Anexo IX)',
        capitulo: '23',
        posicao: '2309',
        subposicao: '230990',
        nivel: 8,
      },
      {
        codigo_ncm: '61091000',
        codigo_formatado: '6109.10.00',
        descricao: 'Camisetas (t-shirts) e camisetas interiores, de malha de algodão',
        descricao_completa: 'Vestuário e seus acessórios, de malha de algodão',
        capitulo: '61',
        posicao: '6109',
        subposicao: '610910',
        nivel: 8,
      },
      {
        codigo_ncm: '62034200',
        codigo_formatado: '6203.42.00',
        descricao: 'Calças, jardineiras, bermudas e shorts, de algodão, de uso masculino',
        descricao_completa: 'Vestuário de tecido plano: calças jeans e bermudas de algodão',
        capitulo: '62',
        posicao: '6203',
        subposicao: '620342',
        nivel: 8,
      },
      {
        codigo_ncm: '64039990',
        codigo_formatado: '6403.99.90',
        descricao:
          'Outros calçados com sola exterior de borracha ou plástico e parte superior em couro natural',
        descricao_completa: 'Calçados sociais e sapatênis de couro natural',
        capitulo: '64',
        posicao: '6403',
        subposicao: '640399',
        nivel: 8,
      },
      {
        codigo_ncm: '64041100',
        codigo_formatado: '6404.11.00',
        descricao:
          'Calçados de esporte; calçados para tênis, basquetebol, ginástica e treinos (tênis)',
        descricao_completa: 'Tênis esportivos com sola exterior de borracha e cabedal têxtil',
        capitulo: '64',
        posicao: '6404',
        subposicao: '640411',
        nivel: 8,
      },
      {
        codigo_ncm: '87032210',
        codigo_formatado: '8703.22.10',
        descricao:
          'Automóveis de passageiros com motor a explosão de cilindrada superior a 1000 cm³ mas não superior a 1500 cm³',
        descricao_completa:
          'Veículos automotores leves de passageiros (tributação sob alíquota padrão ou Imposto Seletivo)',
        capitulo: '87',
        posicao: '8703',
        subposicao: '870322',
        nivel: 8,
      },
      {
        codigo_ncm: '87082999',
        codigo_formatado: '8708.29.99',
        descricao: 'Outras partes e acessórios de carroçarias para veículos automóveis',
        descricao_completa: 'Autopeças de reposição automotiva',
        capitulo: '87',
        posicao: '8708',
        subposicao: '870829',
        nivel: 8,
      },
      {
        codigo_ncm: '40111000',
        codigo_formatado: '4011.10.00',
        descricao: 'Pneus novos de borracha dos tipos utilizados em automóveis de passageiros',
        descricao_completa: 'Pneumáticos novos de reposição automotiva',
        capitulo: '40',
        posicao: '4011',
        subposicao: '401110',
        nivel: 8,
      },
    ]

    const FONTE =
      'Portal Único Siscomex / Classif (MDIC / CAMEX / RFB) — Resolução Gecex nº 272/2021 e Decreto 11.158/2022'
    const VERSAO = '2026-04-18 (Snapshot Vigente 2026/2027)'
    const CONFERENCIA = '2026-10-19'
    const STATUS = 'aguardando_chancela'

    for (const item of SEED_NCM_LIST) {
      try {
        const existente = app.findFirstRecordByFilter('ncm_tabela', 'codigo_ncm = {:cod}', {
          cod: item.codigo_ncm,
        })
        if (existente) continue
      } catch (_) {}

      const record = new Record(col)
      record.set('codigo_ncm', item.codigo_ncm)
      record.set('codigo_formatado', item.codigo_formatado)
      record.set('descricao', item.descricao)
      record.set('descricao_completa', item.descricao_completa)
      record.set('capitulo', item.capitulo)
      record.set('posicao', item.posicao)
      record.set('subposicao', item.subposicao)
      record.set('nivel', item.nivel)
      record.set('fonte_oficial', FONTE)
      record.set('versao_extracao', VERSAO)
      record.set('data_conferencia', CONFERENCIA)
      record.set('status_chancela', STATUS)
      app.save(record)
    }
  },
  (app) => {
    // Reversão segura: deleteRule é null para integridade fiscal, não remove dados
  },
)
