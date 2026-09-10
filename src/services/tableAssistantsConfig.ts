export interface TableAssistantConfig {
  slug: string
  name: string
  title: string
  pageName: string
  tagline: string
  description: string
  quickQuestions: string[]
  contextSummary: string
}

export const TABLE_ASSISTANTS: Record<string, TableAssistantConfig> = {
  markup: {
    slug: 'it-markup-assistant',
    name: 'Assistente de Markup',
    title: 'IA — Especialista em Markup e Precificação',
    pageName: 'Calculadora de Markup',
    tagline: 'Otimização de Preço de Venda e Margem Líquida',
    description:
      'Auxilia no cálculo do markup divisor/multiplicador, detalhamento de custos unitários e análise de viabilidade por regime.',
    quickQuestions: [
      'Como funciona o método "Receita Líquida Desejada"?',
      'Como simular a retenção do ICMS-ST (MVA) na venda de produtos?',
      'Como calcular o DIFAL na venda interestadual para consumidor final?',
      'Como lançar custos variáveis de comissão e taxas de cartão?',
    ],
    contextSummary:
      'Tabela ativa: Calculadora de Markup. Métodos: Receita Líquida Desejada e Custo + Margem. Subsistemas integrados: Substituição Tributária (MVA) e Operações Interestaduais (DIFAL).',
  },
  compras: {
    slug: 'it-compras-assistant',
    name: 'Assistente de Compras',
    title: 'IA — Especialista em Compras e Créditos Fiscais',
    pageName: 'Calculadora de Compras',
    tagline: 'Apuração do Custo Real de Aquisição e Baixa por Quantidade',
    description:
      'Orienta sobre apropriação de créditos de ICMS, PIS/COFINS, impacto do IPI, fretes, ST e DIFAL no custo de estoque, além da conexão do CMV às vendas pela baixa automática de estoque por quantidade.',
    quickQuestions: [
      'Como funciona a baixa automática de estoque por quantidade vendida?',
      'Quando devo ativar a baixa automática de estoque?',
      'Como a quantidade e o CMV consolidado dos itens fluem para as DREs?',
      'Como o estoque final é calculado automaticamente no Presumido, Real e Simples?',
      'Como o ICMS-ST recolhido na compra integra o custo (CMV)?',
    ],
    contextSummary:
      'Tabela ativa: Calculadora de Compras Multi-Itens. Cadastro de N itens de mercadoria com tributos específicos, custos apropriados por item, rateio de estoques e encargos globais, baixa automática de estoque por quantidade vendida e CMV consolidado enviado às DREs.',
  },
  simples: {
    slug: 'it-simples-assistant',
    name: 'Assistente do Simples Nacional',
    title: 'IA — Especialista em Simples Nacional',
    pageName: 'DRE Simples Nacional',
    tagline: 'LC 123/2006, PGDAS-D, Anexos e Fator R',
    description:
      'Ajuda na apuração da alíquota efetiva pelo RBT12, enquadramento de Anexos (I ao V), regra de Fator R e início de atividade.',
    quickQuestions: [
      'Como funciona a regra do Fator R (Folha >= 28%)?',
      'Como calcular a alíquota efetiva do PGDAS-D?',
      'O que muda com a regra de Início de Atividade?',
      'O que acontece quando o faturamento ultrapassa o sublimite de R$ 3,6M?',
    ],
    contextSummary:
      'Tabela ativa: DRE Simples Nacional. RBT12, Alíquota Nominal e Efetiva, Parcela a Deduzir, Anexos I a V e Fator R.',
  },
  'dre-presumido': {
    slug: 'it-presumido-assistant',
    name: 'Assistente do Lucro Presumido',
    title: 'IA — Especialista em Lucro Presumido',
    pageName: 'DRE Lucro Presumido',
    tagline: 'Presunção Fiscal, IRPJ/CSLL e Folha com Encargos',
    description:
      'Explica percentuais de presunção (8%, 12%, 32%), adicional de 10% de IRPJ, PIS/COFINS cumulativos e encargos patronais (INSS 20%).',
    quickQuestions: [
      'Quais são os percentuais de presunção para comércio e serviços?',
      'Quando incide o adicional de 10% de IRPJ?',
      'Como é calculada a cota patronal de INSS na folha?',
      'Quando vale a pena optar pelo Lucro Presumido?',
    ],
    contextSummary:
      'Tabela ativa: DRE Lucro Presumido. Presunção IRPJ/CSLL, Adicional IRPJ > 20k/mês, PIS 0,65%, COFINS 3,00% e Folha com INSS patronal.',
  },
  'dre-real': {
    slug: 'it-real-assistant',
    name: 'Assistente do Lucro Real',
    title: 'IA — Especialista em Lucro Real & LALUR',
    pageName: 'DRE Lucro Real',
    tagline: 'Apuração Não-Cumulativa, Mini-LALUR e Lucro Efetivo',
    description:
      'Orienta sobre créditos de PIS/COFINS (1,65%/7,6%), deduções e o Mini-LALUR (adições de despesas indedutíveis como multas e exclusões como dividendos e incentivos).',
    quickQuestions: [
      'Essa multa por atraso de tributos é adição no LALUR?',
      'Dividendos e lucros no exterior entram como exclusão no LALUR?',
      'Como calcular os créditos de PIS (1,65%) e COFINS (7,6%)?',
      'Quais despesas operacionais são dedutíveis da base do IRPJ/CSLL?',
    ],
    contextSummary:
      'Tabela ativa: DRE Lucro Real. PIS 1,65% e COFINS 7,6% não-cumulativos, Mini-LALUR estruturado (adições e exclusões individuais), IRPJ 15%+10%, CSLL 9% sobre lucro líquido ajustado.',
  },
  comparacao: {
    slug: 'it-comparacao-assistant',
    name: 'Assistente de Comparação de Regimes',
    title: 'IA — Especialista em Planejamento Tributário',
    pageName: 'Comparação de Regimes',
    tagline: 'Confronto Triplo, Margem Líquida e Sensibilidade',
    description:
      'Orienta na identificação do regime mais econômico, leitura da análise de sensibilidade e interpretação de gráficos comparativos.',
    quickQuestions: [
      'Qual métrica devo olhar para saber o regime mais vantajoso?',
      'Como interpretar a seção de Análise de Sensibilidade?',
      'Por que a carga tributária efetiva varia com o aumento de receita?',
      'Como exportar o relatório para apresentar ao cliente?',
    ],
    contextSummary:
      'Tabela ativa: Comparação de Regimes. Confronto Simples x Presumido x Real, Análise de Sensibilidade e Ponto de Virada.',
  },
  reforma: {
    slug: 'it-reforma-assistant',
    name: 'Assistente da Reforma Tributária',
    title: 'IA — Especialista em Reforma Tributária (IBS/CBS)',
    pageName: 'Reforma Tributária — IBS/CBS',
    tagline: 'EC 132/23, LC 214/25, Cronograma 2026–2033 e Créditos Amplos',
    description:
      'Guia completo na transição 2026–2033: alíquotas vigentes por ano, cálculo por fora, plano de voo, ponto de virada, compensação CBS × PIS/COFINS e Simples Nacional.',
    quickQuestions: [
      'Qual é o cronograma de transição de 2026 a 2033?',
      'Como funciona a compensação de créditos de CBS em 2026?',
      'O que muda na precificação "por fora" em relação ao cálculo atual?',
      'O Simples Nacional acaba ou ganha novas opções com a Reforma?',
    ],
    contextSummary:
      'Tabela ativa: Reforma Tributária — IBS/CBS (EC 132/2023). Linha do tempo 2026–2033, alíquotas editáveis, plano de voo e confronto com o sistema atual.',
  },
  clientes: {
    slug: 'it-clientes-assistant',
    name: 'Assistente de Gestão de Clientes',
    title: 'IA — Gestão de Clientes e Cenários',
    pageName: 'Painel de Clientes',
    tagline: 'Organização de Carteira e Histórico de Simulações',
    description:
      'Ajuda a organizar clientes, vincular múltiplos cenários fiscais, comparar simulações salvas e manter o histórico atualizado.',
    quickQuestions: [
      'Como salvar um cenário tributário para um cliente específico?',
      'Como carregar um cenário salvo de volta para a tela de trabalho?',
      'Quais dados são persistidos dentro de cada cenário?',
      'Como organizar a revisão tributária periódica dos clientes?',
    ],
    contextSummary:
      'Tabela ativa: Gestão de Clientes. Carteira de clientes, persistência de cenários tributários no banco e carregamento de simulações.',
  },
  home: {
    slug: 'it-tax-assistant',
    name: 'Assistente Tributário IT',
    title: 'IA — Assistente Tributário Inteligente',
    pageName: 'Visão Geral do Sistema',
    tagline: 'Guia Completo de Navegação e Decisão Fiscal',
    description:
      'Seu copiloto em tributação brasileira. Faça perguntas sobre qualquer tabela, conceito fiscal ou metodologia de precificação do sistema.',
    quickQuestions: [
      'Quais tabelas e módulos o sistema IT oferece?',
      'Por onde devo começar a análise de um novo cliente?',
      'Qual a diferença de cálculo entre Simples, Presumido e Real?',
      'Como simular a formação de preço e comparar com o custo de compras?',
    ],
    contextSummary:
      'Tabela ativa: Dashboard Geral IT. Navegação entre Markup, Compras, DREs, Comparativo e Clientes.',
  },
}

export function getAssistantForTab(tabKey: string): TableAssistantConfig {
  return TABLE_ASSISTANTS[tabKey] || TABLE_ASSISTANTS.home
}
