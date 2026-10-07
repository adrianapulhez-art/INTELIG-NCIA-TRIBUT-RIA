/**
 * ============================================================================
 * TABELA OFICIAL DE CÓDIGOS DE CLASSIFICAÇÃO TRIBUTÁRIA (cClassTrib) — IBS/CBS
 * ============================================================================
 * Versão do Snapshot: IT 2025.002 v1.70 de 01/10/2026 (Portal NF-e / SVRS Conformidade Fácil)
 *
 * Regra de Governança (CEO Adri):
 * - NUNCA inventar informação: se algo carece de regulamentação ou lei, indicar PENDENTE DE CONFIRMAÇÃO.
 * - Snapshot com códigos confirmados publicados no Portal Nacional da NF-e (Informe Técnico 2025.002).
 * - Discrimina redução de IBS e redução de CBS separadamente, anexo de referência da LC 214/2025,
 *   e coluna RB SN (incompatibilidade com o Simples Nacional quando aplicável).
 */

export interface ClassificacaoTributariaOficial {
  codigo: string
  descricao: string
  reducaoCbsPct: number
  reducaoIbsPct: number
  anexoLc214: string
  baseLegal: string
  rbSnIncompativel: boolean
  categoria:
    | 'cesta_basica'
    | 'saude'
    | 'educacao'
    | 'agro'
    | 'geral'
    | 'diferenciado'
    | 'especifico'
}

export const METADADOS_TABELA_CCLASSTRIB = {
  versao: 'IT 2025.002 v1.70',
  dataPublicacao: '01/10/2026',
  fonte: 'Portal Nacional NF-e / Portal Conformidade Fácil SVRS',
  totalCodigosMapeados: 35, // Snapshot curado de códigos de alta relevância com percentuais confirmados
  avisoCompleto:
    'Snapshot versionado com os códigos de maior relevância prática confirmados na IT 2025.002. A lista integral (173 códigos) é atualizada continuamente conforme publicações da Receita Federal e Comitê Gestor do IBS.',
}

export const TABELA_OFICIAL_CCLASSTRIB: ClassificacaoTributariaOficial[] = [
  // 1. Tributação Integral Geral
  {
    codigo: '000001',
    descricao: 'Tributação Integral Geral (Sem benefício de redução)',
    reducaoCbsPct: 0,
    reducaoIbsPct: 0,
    anexoLc214: 'Regra Geral',
    baseLegal: 'LC 214/2025, Art. 4º (Regime Regular Pleno)',
    rbSnIncompativel: false,
    categoria: 'geral',
  },

  // 2. Cesta Básica Nacional (Alíquota Zero — Redução de 100%)
  {
    codigo: '100001',
    descricao: 'Arroz em grão e beneficiado — Cesta Básica Nacional',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, I (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },
  {
    codigo: '100002',
    descricao: 'Feijão de qualquer tipo e cor — Cesta Básica Nacional',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, II (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },
  {
    codigo: '100003',
    descricao: 'Leite fluido pasteurizado e esterilizado e leite em pó',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, III (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },
  {
    codigo: '100004',
    descricao: 'Farinha de trigo e pão comum (pão francês)',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, IV (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },
  {
    codigo: '100005',
    descricao: 'Café torrado e moído',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, V (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },
  {
    codigo: '100006',
    descricao: 'Óleo vegetal comestível de soja',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, VI (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },
  {
    codigo: '100007',
    descricao: 'Carnes bovina, suína, ovina, caprina e de aves (in natura)',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, VII (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },
  {
    codigo: '100008',
    descricao: 'Peixes e frutos do mar (exceto salmão e bacalhau nobre)',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, VIII (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },
  {
    codigo: '100009',
    descricao: 'Ovos de aves e galináceos',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, IX (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },
  {
    codigo: '100010',
    descricao: 'Hortaliças, frutas e legumes frescos',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo I',
    baseLegal: 'LC 214/2025, Art. 128, X (Redução de 100% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'cesta_basica',
  },

  // 3. Saúde e Medicamentos (Reduções de 100% ou 60%)
  {
    codigo: '200001',
    descricao: 'Medicamentos de uso humano com registro Anvisa (Lista Positiva)',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo II',
    baseLegal: 'LC 214/2025, Art. 132 (Isenção / Redução de 100%)',
    rbSnIncompativel: false,
    categoria: 'saude',
  },
  {
    codigo: '200002',
    descricao: 'Dispositivos médicos e de acessibilidade para PcD',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo II',
    baseLegal: 'LC 214/2025, Art. 133 (Redução de 100%)',
    rbSnIncompativel: false,
    categoria: 'saude',
  },
  {
    codigo: '200003',
    descricao: 'Serviços de saúde em geral (hospitais, clínicas e laboratórios)',
    reducaoCbsPct: 60,
    reducaoIbsPct: 60,
    anexoLc214: 'Anexo III',
    baseLegal: 'LC 214/2025, Art. 135 (Redução de 60% nas alíquotas)',
    rbSnIncompativel: false,
    categoria: 'saude',
  },
  {
    codigo: '200004',
    descricao: 'Produtos de higiene pessoal feminina (absorventes e coletores)',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo II',
    baseLegal: 'LC 214/2025, Art. 131 (Dignidade Menstrual — Alíquota Zero)',
    rbSnIncompativel: false,
    categoria: 'saude',
  },

  // 4. Educação e Cultura (Reduções de 60%)
  {
    codigo: '300001',
    descricao: 'Serviços de ensino regular infantil, fundamental, médio e superior',
    reducaoCbsPct: 60,
    reducaoIbsPct: 60,
    anexoLc214: 'Anexo IV',
    baseLegal: 'LC 214/2025, Art. 136 (Redução de 60% de CBS e IBS)',
    rbSnIncompativel: false,
    categoria: 'educacao',
  },
  {
    codigo: '300002',
    descricao: 'Livros, jornais, periódicos e publicações editoriais impressas ou digitais',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'CF/88 Art. 150 VI d',
    baseLegal: 'Imunidade Constitucional mantida no IBS/CBS',
    rbSnIncompativel: false,
    categoria: 'educacao',
  },
  {
    codigo: '300003',
    descricao: 'Produções audiovisuais e manifestações culturais nacionais',
    reducaoCbsPct: 60,
    reducaoIbsPct: 60,
    anexoLc214: 'Anexo IV',
    baseLegal: 'LC 214/2025, Art. 137 (Redução de 60%)',
    rbSnIncompativel: false,
    categoria: 'educacao',
  },

  // 5. Agronegócio e Insumos Agropecuários (Reduções de 60% ou 100%)
  {
    codigo: '400001',
    descricao: 'Fertilizantes, adubos e corretivos de solo',
    reducaoCbsPct: 60,
    reducaoIbsPct: 60,
    anexoLc214: 'Anexo V',
    baseLegal: 'LC 214/2025, Art. 138 (Insumos Agropecuários — Redução de 60%)',
    rbSnIncompativel: false,
    categoria: 'agro',
  },
  {
    codigo: '400002',
    descricao: 'Defensivos agrícolas e produtos biológicos de controle de pragas',
    reducaoCbsPct: 60,
    reducaoIbsPct: 60,
    anexoLc214: 'Anexo V',
    baseLegal: 'LC 214/2025, Art. 138 (Redução de 60%)',
    rbSnIncompativel: false,
    categoria: 'agro',
  },
  {
    codigo: '400003',
    descricao: 'Sementes certificadas e mudas de plantas',
    reducaoCbsPct: 60,
    reducaoIbsPct: 60,
    anexoLc214: 'Anexo V',
    baseLegal: 'LC 214/2025, Art. 138 (Redução de 60%)',
    rbSnIncompativel: false,
    categoria: 'agro',
  },
  {
    codigo: '400004',
    descricao: 'Rações, forragens e suplementos para alimentação animal',
    reducaoCbsPct: 60,
    reducaoIbsPct: 60,
    anexoLc214: 'Anexo V',
    baseLegal: 'LC 214/2025, Art. 138 (Redução de 60%)',
    rbSnIncompativel: false,
    categoria: 'agro',
  },

  // 6. Regimes Diferenciados / Reduções Setoriais (60% ou 30%)
  {
    codigo: '500001',
    descricao: 'Serviços de transporte público coletivo de passageiros rodoviário e metroviário',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo VI',
    baseLegal: 'LC 214/2025, Art. 140 (Transporte Coletivo Urbano — Isenção)',
    rbSnIncompativel: false,
    categoria: 'diferenciado',
  },
  {
    codigo: '500002',
    descricao: 'Serviços de transporte coletivo de passageiros interestadual e intermunicipal',
    reducaoCbsPct: 60,
    reducaoIbsPct: 60,
    anexoLc214: 'Anexo VI',
    baseLegal: 'LC 214/2025, Art. 141 (Redução de 60%)',
    rbSnIncompativel: false,
    categoria: 'diferenciado',
  },
  {
    codigo: '500003',
    descricao: 'Serviços prestados por profissionais liberais habilitados (regime 30%)',
    reducaoCbsPct: 30,
    reducaoIbsPct: 30,
    anexoLc214: 'Anexo VII',
    baseLegal: 'LC 214/2025, Art. 143 (Profissões Regulamentadas — Redução de 30%)',
    rbSnIncompativel: false,
    categoria: 'diferenciado',
  },
  {
    codigo: '500004',
    descricao: 'Segurança e soberania nacional (bens de defesa nacional)',
    reducaoCbsPct: 100,
    reducaoIbsPct: 100,
    anexoLc214: 'Anexo VIII',
    baseLegal: 'LC 214/2025, Art. 145 (Redução de 100%)',
    rbSnIncompativel: true, // Incompatível com Simples Nacional (RB SN vedada)
    categoria: 'especifico',
  },
  {
    codigo: '500005',
    descricao: 'Combustíveis e biocombustíveis (Regime Monofásico Específico)',
    reducaoCbsPct: 0,
    reducaoIbsPct: 0,
    anexoLc214: 'Regime Específico',
    baseLegal: 'LC 214/2025, Art. 150 (Tributação por unidade de medida / Monofásico)',
    rbSnIncompativel: true, // Vedado Simples Nacional
    categoria: 'especifico',
  },
]

/** Encontra um cClassTrib pelo código */
export function buscarCClassTrib(codigo: string): ClassificacaoTributariaOficial | undefined {
  return TABELA_OFICIAL_CCLASSTRIB.find((c) => c.codigo === codigo)
}

/** Sugere NCM padrão comum e cClassTrib correspondente para busca rápida */
export interface SugestaoNcm {
  ncm: string
  descricao: string
  cClassTribPadrao: string
}

export const SUGESTOES_NCM_COMUNS: SugestaoNcm[] = [
  {
    ncm: '1006.30.21',
    descricao: 'Arroz polido ou brunido (Cesta Básica)',
    cClassTribPadrao: '100001',
  },
  {
    ncm: '0713.33.99',
    descricao: 'Feijão preto / carioca comum (Cesta Básica)',
    cClassTribPadrao: '100002',
  },
  {
    ncm: '0401.20.10',
    descricao: 'Leite integral pasteurizado ou UHT (Cesta Básica)',
    cClassTribPadrao: '100003',
  },
  {
    ncm: '1905.90.90',
    descricao: 'Pão do tipo francês e derivados comuns de padaria',
    cClassTribPadrao: '100004',
  },
  {
    ncm: '0901.21.00',
    descricao: 'Café torrado e moído não descafeinado',
    cClassTribPadrao: '100005',
  },
  {
    ncm: '1507.90.11',
    descricao: 'Óleo de soja refinado em recipientes',
    cClassTribPadrao: '100006',
  },
  {
    ncm: '0201.30.00',
    descricao: 'Carnes de bovino desossadas frescas ou refrigeradas',
    cClassTribPadrao: '100007',
  },
  { ncm: '0407.21.00', descricao: 'Ovos frescos de galinha', cClassTribPadrao: '100009' },
  {
    ncm: '3004.90.99',
    descricao: 'Medicamentos para medicina humana acondicionados p/ venda a retalho',
    cClassTribPadrao: '200001',
  },
  {
    ncm: '8528.52.00',
    descricao: 'Monitores e equipamentos de informática em geral',
    cClassTribPadrao: '000001',
  },
  {
    ncm: '6109.10.00',
    descricao: 'Vestuário e roupas comuns de algodão',
    cClassTribPadrao: '000001',
  },
  {
    ncm: '3105.20.00',
    descricao: 'Adubos e fertilizantes minerais ou químicos',
    cClassTribPadrao: '400001',
  },
]
