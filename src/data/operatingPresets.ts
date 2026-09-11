import { OperatingExpenseCategory, OperatingRevenueCategory } from '@/contexts/TaxContext'

export type CompanySize = 'small' | 'medium' | 'large'

export interface ExpensePreset {
  id: string
  label: string
  description: string
  category: OperatingExpenseCategory
  suggestedValue: number
  hint: string
  size: CompanySize
}

export interface RevenuePreset {
  id: string
  label: string
  description: string
  category: OperatingRevenueCategory
  suggestedValue: number
  hint: string
  size: CompanySize
}

export const COMPANY_SIZE_LABELS: Record<
  CompanySize,
  { label: string; badge: string; description: string }
> = {
  small: {
    label: 'Pequeno Porte',
    badge: 'ME / EPP',
    description:
      'Estrutura enxuta, comércio de bairro, prestador de serviço e pequenos escritórios',
  },
  medium: {
    label: 'Médio Porte',
    badge: 'Média Empresa',
    description:
      'Operação regional/nacional, filial, ERP, folha robusta com encargos e consultorias',
  },
  large: {
    label: 'Grande Porte',
    badge: 'Corporativo / S.A.',
    description: 'Multidepartamental, governança corporativa, auditoria, nuvem, frotas e royalties',
  },
}

export const EXPENSE_CATEGORY_LABELS: Record<
  OperatingExpenseCategory,
  { label: string; short: string; badgeClass: string }
> = {
  vendas: {
    label: 'Despesas com Vendas',
    short: 'Vendas',
    badgeClass: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
  },
  administrativas: {
    label: 'Despesas Administrativas',
    short: 'Administrativa',
    badgeClass: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
  },
  financeiras: {
    label: 'Despesas Financeiras',
    short: 'Financeira',
    badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  },
  outras: {
    label: 'Outras Despesas Operacionais',
    short: 'Outras',
    badgeClass: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
  },
}

export const REVENUE_CATEGORY_LABELS: Record<
  OperatingRevenueCategory,
  { label: string; short: string; badgeClass: string }
> = {
  financeiras: {
    label: 'Receitas Financeiras',
    short: 'Financeira',
    badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  },
  outras: {
    label: 'Outras Receitas Operacionais',
    short: 'Outras Operacionais',
    badgeClass: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  },
}

// -----------------------------------------------------------------------------
// Catálogo de Exemplos de Despesas Operacionais por Porte (8 a 12 exemplos cada)
// -----------------------------------------------------------------------------
export const EXPENSE_PRESETS: ExpensePreset[] = [
  // PEQUENO PORTE (10 exemplos realistas)
  {
    id: 'exp-sm-1',
    label: 'Aluguel do Ponto Comercial',
    description: 'Aluguel do ponto comercial e IPTU proporcional',
    category: 'administrativas',
    suggestedValue: 3200,
    hint: 'Imóvel locado para loja física, consultório ou escritório central.',
    size: 'small',
  },
  {
    id: 'exp-sm-2',
    label: 'Energia Elétrica Comercial',
    description: 'Energia elétrica do estabelecimento operacional',
    category: 'administrativas',
    suggestedValue: 780,
    hint: 'Consumo de energia da loja/escritório (despesa de utilidades).',
    size: 'small',
  },
  {
    id: 'exp-sm-3',
    label: 'Água e Saneamento',
    description: 'Fornecimento de água e saneamento básico',
    category: 'administrativas',
    suggestedValue: 190,
    hint: 'Conta de água do ponto comercial.',
    size: 'small',
  },
  {
    id: 'exp-sm-4',
    label: 'Internet e Telefonia Fixa/Móvel',
    description: 'Banda larga fibra óptica e planos de celular corporativo',
    category: 'administrativas',
    suggestedValue: 350,
    hint: 'Conectividade e comunicação para vendas e suporte.',
    size: 'small',
  },
  {
    id: 'exp-sm-5',
    label: 'Honorários Contábeis',
    description: 'Honorários mensais da assessoria contábil externa',
    category: 'administrativas',
    suggestedValue: 1400,
    hint: 'Serviço mensal de contabilidade, folha e obrigações fiscais.',
    size: 'small',
  },
  {
    id: 'exp-sm-6',
    label: 'Folha de Pagamento Salarial',
    description: 'Salários base da equipe de vendas e apoio',
    category: 'administrativas',
    suggestedValue: 6800,
    hint: 'Remuneração operacional da equipe direta.',
    size: 'small',
  },
  {
    id: 'exp-sm-7',
    label: 'Pró-labore dos Sócios-Administradores',
    description: 'Pró-labore mensal dos sócios em atividade na empresa',
    category: 'administrativas',
    suggestedValue: 4500,
    hint: 'Remuneração oficial dos dirigentes com recolhimento previdenciário.',
    size: 'small',
  },
  {
    id: 'exp-sm-8',
    label: 'Marketing Digital e Anúncios',
    description: 'Campanhas em redes sociais e tráfego pago local',
    category: 'vendas',
    suggestedValue: 1200,
    hint: 'Investimento em anúncios no Google Ads e Meta para captação.',
    size: 'small',
  },
  {
    id: 'exp-sm-9',
    label: 'Materiais de Escritório e Limpeza',
    description: 'Papelaria, cartuchos e insumos de conservação',
    category: 'administrativas',
    suggestedValue: 280,
    hint: 'Material de consumo administrativo rotineiro.',
    size: 'small',
  },
  {
    id: 'exp-sm-10',
    label: 'Transporte e Combustível Operacional',
    description: 'Combustível, vale-transporte e corridas para entregas',
    category: 'vendas',
    suggestedValue: 950,
    hint: 'Deslocamento da equipe e entregas locais de encomendas.',
    size: 'small',
  },

  // MÉDIO PORTE (10 exemplos realistas)
  {
    id: 'exp-md-1',
    label: 'Folha + Encargos Trabalhistas',
    description: 'Salários da equipe, FGTS, provisões de 13º e férias',
    category: 'administrativas',
    suggestedValue: 38500,
    hint: 'Encargos sociais e folha de múltiplos colaboradores.',
    size: 'medium',
  },
  {
    id: 'exp-md-2',
    label: 'Licenciamento de Software ERP e CRM',
    description: 'Assinaturas mensais de ERP em nuvem e gestão comercial',
    category: 'administrativas',
    suggestedValue: 3200,
    hint: 'Sistemas de emissão de NF-e, controle financeiro e CRM.',
    size: 'medium',
  },
  {
    id: 'exp-md-3',
    label: 'Consultoria Tributária e Financeira',
    description: 'Assessoria especializada em planejamento tributário e controladoria',
    category: 'administrativas',
    suggestedValue: 5500,
    hint: 'Apoio externo para conformidade fiscal e otimização.',
    size: 'medium',
  },
  {
    id: 'exp-md-4',
    label: 'Vigilância, Alarme e Portaria',
    description: 'Monitoramento 24h, segurança patrimonial e portaria remota',
    category: 'administrativas',
    suggestedValue: 2400,
    hint: 'Proteção das instalações comerciais e estoques.',
    size: 'medium',
  },
  {
    id: 'exp-md-5',
    label: 'Manutenção Predial e de Equipamentos',
    description: 'Manutenção preventiva de ar-condicionado, máquinas e instalações',
    category: 'administrativas',
    suggestedValue: 1850,
    hint: 'Conservação de patrimônio em uso contínuo.',
    size: 'medium',
  },
  {
    id: 'exp-md-6',
    label: 'Comissões sobre Vendas Comerciais',
    description: 'Comissões variáveis pagas a vendedores e representantes',
    category: 'vendas',
    suggestedValue: 8900,
    hint: 'Despesa diretamente atrelada ao volume de faturamento alcançado.',
    size: 'medium',
  },
  {
    id: 'exp-md-7',
    label: 'Viagens, Diárias e Hospedagens',
    description: 'Deslocamento de consultores e executivos para prospecção',
    category: 'vendas',
    suggestedValue: 3600,
    hint: 'Passagens, hotéis e alimentação em visitas comerciais.',
    size: 'medium',
  },
  {
    id: 'exp-md-8',
    label: 'Assinaturas de Ferramentas SaaS e TI',
    description: 'Plataformas de comunicação, e-mail corporativo e automações',
    category: 'administrativas',
    suggestedValue: 1450,
    hint: 'Serviços em nuvem para produtividade interna.',
    size: 'medium',
  },
  {
    id: 'exp-md-9',
    label: 'Tarifas Bancárias e Custódia de Cobrança',
    description: 'Manutenção de contas, tarifas de boletos e custódia',
    category: 'financeiras',
    suggestedValue: 1250,
    hint: 'Tarifas cobradas por instituições financeiras conveniadas.',
    size: 'medium',
  },
  {
    id: 'exp-md-10',
    label: 'Juros Passivos e Encargos de Financiamento',
    description: 'Juros sobre capital de giro e parcelamento bancário',
    category: 'financeiras',
    suggestedValue: 4200,
    hint: 'Despesa financeira dedutível no Lucro Real.',
    size: 'medium',
  },

  // GRANDE PORTE (10 exemplos realistas)
  {
    id: 'exp-lg-1',
    label: 'Folha de Múltiplos Departamentos',
    description: 'Folha corporativa abrangendo Engenharia, RH, Operações e Finanças',
    category: 'administrativas',
    suggestedValue: 185000,
    hint: 'Quadro funcional abrangente de matriz e filiais.',
    size: 'large',
  },
  {
    id: 'exp-lg-2',
    label: 'Benefícios Corporativos (VR, VA, Saúde)',
    description: 'Plano de saúde corporativo, odontológico e vales alimentação/refeição',
    category: 'administrativas',
    suggestedValue: 34000,
    hint: 'Pacote de benefícios para retenção de talentos (dedutível PAT).',
    size: 'large',
  },
  {
    id: 'exp-lg-3',
    label: 'Depreciação e Amortização Contábil',
    description: 'Depreciação de máquinas industriais, veículos e intangíveis',
    category: 'administrativas',
    suggestedValue: 28500,
    hint: 'Desgaste de ativo imobilizado registrado no resultado contábil.',
    size: 'large',
  },
  {
    id: 'exp-lg-4',
    label: 'Honorários Jurídicos Contenciosos/Preventivos',
    description: 'Banca jurídica para assessoria trabalhista, cível e tributária',
    category: 'administrativas',
    suggestedValue: 16000,
    hint: 'Suporte legal contínuo para contratos e processos.',
    size: 'large',
  },
  {
    id: 'exp-lg-5',
    label: 'Auditoria Independente Externa (Big 4)',
    description: 'Auditoria externa periódica das demonstrações financeiras',
    category: 'administrativas',
    suggestedValue: 22000,
    hint: 'Conformidade para investidores, conselho e CVM/bancos.',
    size: 'large',
  },
  {
    id: 'exp-lg-6',
    label: 'Licenciamento de Patentes e Royalties Pagos',
    description: 'Royalties pelo uso de marcas registradas e tecnologia proprietária',
    category: 'outras',
    suggestedValue: 19500,
    hint: 'Remuneração de propriedade industrial e franquias.',
    size: 'large',
  },
  {
    id: 'exp-lg-7',
    label: 'Publicidade Institucional e Grandes Campanhas',
    description: 'Agência de publicidade, TV, mídia externa e branding nacional',
    category: 'vendas',
    suggestedValue: 45000,
    hint: 'Fortalecimento da marca e campanhas de alcance massivo.',
    size: 'large',
  },
  {
    id: 'exp-lg-8',
    label: 'Logística Reversa e Gestão de Frota Própria',
    description: 'Manutenção de carretas, rastreamento via satélite e pedágios',
    category: 'vendas',
    suggestedValue: 32000,
    hint: 'Operação de transporte rodoviário interestadual e centros de distribuição.',
    size: 'large',
  },
  {
    id: 'exp-lg-9',
    label: 'TI e Infraestrutura em Nuvem (AWS/Azure)',
    description: 'Servidores dedicados, banco de dados distribuído e segurança cibernética',
    category: 'administrativas',
    suggestedValue: 27000,
    hint: 'Infraestrutura computacional elástica de alta disponibilidade.',
    size: 'large',
  },
  {
    id: 'exp-lg-10',
    label: 'Despesas Financeiras de Empréstimos e Debêntures',
    description: 'Juros e amortizações de debêntures e linhas de financiamento de longo prazo',
    category: 'financeiras',
    suggestedValue: 48000,
    hint: 'Custo da dívida corporativa estruturada.',
    size: 'large',
  },
]

// -----------------------------------------------------------------------------
// Catálogo de Exemplos de Receitas Operacionais por Porte (4 a 6 exemplos cada)
// -----------------------------------------------------------------------------
export const REVENUE_PRESETS: RevenuePreset[] = [
  // PEQUENO PORTE (5 exemplos)
  {
    id: 'rev-sm-1',
    label: 'Venda de Mercadorias no Balcão',
    description: 'Receita complementar de vendas de balcão e produtos conexos',
    category: 'outras',
    suggestedValue: 14500,
    hint: 'Receita comercial de mercadorias no ponto de venda.',
    size: 'small',
  },
  {
    id: 'rev-sm-2',
    label: 'Prestação de Pequenos Serviços',
    description: 'Serviços eventuais de instalação, suporte e pequenos reparos',
    category: 'outras',
    suggestedValue: 3800,
    hint: 'Mão de obra acessória cobrada do cliente final.',
    size: 'small',
  },
  {
    id: 'rev-sm-3',
    label: 'Frete e Entrega Cobrado de Clientes',
    description: 'Taxa de entrega rápida e frete faturado na nota fiscal',
    category: 'outras',
    suggestedValue: 920,
    hint: 'Reembolso ou cobrança de frete sobre entregas locais.',
    size: 'small',
  },
  {
    id: 'rev-sm-4',
    label: 'Rendimento de Poupança/CDB Fácil',
    description: 'Rendimentos de reserva de emergência em conta bancária PJ',
    category: 'financeiras',
    suggestedValue: 240,
    hint: 'Remuneração da sobra diária de caixa.',
    size: 'small',
  },
  {
    id: 'rev-sm-5',
    label: 'Descontos Comerciais Obtidos',
    description: 'Descontos financeiros obtidos por liquidação antecipada de boletos',
    category: 'financeiras',
    suggestedValue: 310,
    hint: 'Abatimento obtido junto a fornecedores.',
    size: 'small',
  },

  // MÉDIO PORTE (5 exemplos)
  {
    id: 'rev-md-1',
    label: 'Venda de Produtos e Acessórios Conexos',
    description: 'Comercialização de itens complementares da linha de produção',
    category: 'outras',
    suggestedValue: 42000,
    hint: 'Receita operacional decorrente de vendas secundárias.',
    size: 'medium',
  },
  {
    id: 'rev-md-2',
    label: 'Serviços de Instalação e Homologação',
    description: 'Mão de obra técnica de montagem e homologação em campo',
    category: 'outras',
    suggestedValue: 18500,
    hint: 'Serviços técnicos especializados vinculados ao fornecimento.',
    size: 'medium',
  },
  {
    id: 'rev-md-3',
    label: 'Contratos de Manutenção Recorrente',
    description: 'Receita mensal fixa de SLA e manutenção preventiva',
    category: 'outras',
    suggestedValue: 12400,
    hint: 'Contratos mensais de continuidade operacional.',
    size: 'medium',
  },
  {
    id: 'rev-md-4',
    label: 'Rendimentos de Aplicações Financeiras',
    description: 'Receita financeira com CDB, LCI e fundos DI corporativos',
    category: 'financeiras',
    suggestedValue: 4800,
    hint: 'Rendimento de capital de giro alocado no mercado financeiro.',
    size: 'medium',
  },
  {
    id: 'rev-md-5',
    label: 'Aluguel de Espaço Próprio a Terceiros',
    description: 'Sublocação de sala comercial ou galpão ocioso da empresa',
    category: 'outras',
    suggestedValue: 3500,
    hint: 'Monetização de espaço físico ocioso de propriedade da PJ.',
    size: 'medium',
  },

  // GRANDE PORTE (5 exemplos)
  {
    id: 'rev-lg-1',
    label: 'Venda Consolidada de Bens e Soluções',
    description: 'Fornecimento corporativo integrado B2B de grande escala',
    category: 'outras',
    suggestedValue: 165000,
    hint: 'Contratos de grande porte de fornecimento.',
    size: 'large',
  },
  {
    id: 'rev-lg-2',
    label: 'Licenciamento de Tecnologia e Software',
    description: 'Licenças anuais de plataformas proprietárias e APIs parceiras',
    category: 'outras',
    suggestedValue: 54000,
    hint: 'Exploração econômica de propriedade intelectual própria.',
    size: 'large',
  },
  {
    id: 'rev-lg-3',
    label: 'Royalties Recebidos de Franquias/Rede',
    description: 'Royalties de uso de marca arrecadados da rede de franqueados',
    category: 'outras',
    suggestedValue: 38000,
    hint: 'Taxa operacional mensal de licenciamento de franquia.',
    size: 'large',
  },
  {
    id: 'rev-lg-4',
    label: 'Receitas Financeiras e Operações de Câmbio',
    description: 'Rendimento de títulos públicos, debêntures incentivadas e swap',
    category: 'financeiras',
    suggestedValue: 29500,
    hint: 'Gestão de tesouraria de grande porte.',
    size: 'large',
  },
  {
    id: 'rev-lg-5',
    label: 'Recuperação de Tributos Operacionais',
    description: 'Monetização de créditos tributários reconhecidos contabilmente',
    category: 'outras',
    suggestedValue: 24000,
    hint: 'Recuperação de pagamentos a maior ou créditos operacionais homologados.',
    size: 'large',
  },
]
