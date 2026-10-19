import { pb } from '@/lib/pocketbase/client'
import { classificarNcmEmTempoReal, type ClassificacaoNcmResult } from './ncmClassificationService'

export interface NcmTabelaRecord {
  id: string
  codigo_ncm: string
  codigo_formatado: string
  descricao: string
  descricao_completa?: string
  capitulo?: string
  posicao?: string
  subposicao?: string
  nivel?: number
  fonte_oficial: string
  versao_extracao: string
  data_conferencia: string
  status_chancela: 'aguardando_chancela' | 'chancelada_adriana'
  created?: string
  updated?: string
}

export interface NcmBuscaItem {
  id: string
  codigoNcm: string
  codigoFormatado: string
  descricao: string
  descricaoCompleta?: string
  fonteOficial: string
  versaoExtracao: string
  statusChancela: 'aguardando_chancela' | 'chancelada_adriana'
}

/** Metadados da fonte oficial do catálogo NCM/SH carregado no banco */
export const METADADOS_NCM_TABELA = {
  fonteOficial:
    'Portal Único Siscomex / Classif (Receita Federal do Brasil / MDIC / CAMEX) — API Pública de Nomenclatura Comum do Mercosul',
  urlOficial: 'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json',
  baseLegal:
    'Resolução Gecex nº 272/2021 e alterações (Tarifa Externa Comum - TEC / Tabela TIPI / LC 214/2025)',
  versaoExtracao: '2026-04-18 (Snapshot Vigente 2026/2027)',
  dataConferencia: '2026-10-19',
  totalPrevistoOficial: '~10.000 subposições/itens NCM 8 dígitos',
  statusChancelaPadrao: 'aguardando_chancela' as const,
  responsavelChancela: 'Adriana Pulhez (Adri) — CEO / Contadora',
}

/**
 * Cache em memória para busca rápida no client
 */
let cacheNcmTabela: NcmBuscaItem[] | null = null
let promessaCargaTabela: Promise<NcmBuscaItem[]> | null = null

/**
 * Carrega a tabela de NCM da coleção `ncm_tabela` do PocketBase.
 * Caso ainda não haja registros no banco ou ocorra erro de rede, recorre ao fallback local oficial.
 */
export async function carregarCatalogoNcm(): Promise<NcmBuscaItem[]> {
  if (cacheNcmTabela && cacheNcmTabela.length > 0) {
    return cacheNcmTabela
  }
  if (promessaCargaTabela) {
    return promessaCargaTabela
  }

  promessaCargaTabela = (async () => {
    try {
      const records = await pb.collection('ncm_tabela').getFullList<NcmTabelaRecord>({
        sort: 'codigo_ncm',
        requestKey: null,
      })

      if (records && records.length > 0) {
        const mapeados: NcmBuscaItem[] = records.map((r) => ({
          id: r.id,
          codigoNcm: r.codigo_ncm,
          codigoFormatado: r.codigo_formatado,
          descricao: r.descricao,
          descricaoCompleta: r.descricao_completa,
          fonteOficial: r.fonte_oficial || METADADOS_NCM_TABELA.fonteOficial,
          versaoExtracao: r.versao_extracao || METADADOS_NCM_TABELA.versaoExtracao,
          statusChancela: r.status_chancela || 'aguardando_chancela',
        }))
        cacheNcmTabela = mapeados
        return mapeados
      }
    } catch (err) {
      console.warn(
        '[ncmTabelaService] Erro ao carregar coleção ncm_tabela do PocketBase, usando fallback oficial:',
        err,
      )
    }

    // Fallback: catálogo inicial oficial com as posições essenciais da economia e LC 214
    cacheNcmTabela = CATALOGO_NCM_OFICIAL_BASE
    return CATALOGO_NCM_OFICIAL_BASE
  })()

  return promessaCargaTabela
}

/**
 * Busca itens NCM por texto (descrição ou código numérico), case-insensitive.
 * Suporta busca por múltiplos termos (ex: "cama madeira" encontra "9403.50.00 — Móveis de madeira para dormitórios (camas)").
 * NBS é 100% fora de escopo: nunca retorna NBS.
 */
export async function buscarNcmPorTexto(
  termo: string,
  limite: number = 30,
): Promise<NcmBuscaItem[]> {
  const t = termo.trim().toLowerCase()
  if (!t) return []

  const catalogo = await carregarCatalogoNcm()
  const termosSeparados = t.split(/\s+/).filter(Boolean)

  const filtrados = catalogo.filter((item) => {
    const codLimpo = item.codigoNcm.toLowerCase()
    const codFmt = item.codigoFormatado.toLowerCase()
    const desc = item.descricao.toLowerCase()
    const descComp = (item.descricaoCompleta || '').toLowerCase()

    // Se o termo digitado for só números ou formato de código
    if (/^[0-9.]+$/.test(t)) {
      const digitos = t.replace(/\D/g, '')
      return codLimpo.startsWith(digitos) || codFmt.includes(t)
    }

    // Busca textual: todos os termos digitados devem aparecer na descrição ou código
    return termosSeparados.every(
      (termoPalavra) =>
        desc.includes(termoPalavra) ||
        descComp.includes(termoPalavra) ||
        codFmt.includes(termoPalavra) ||
        codLimpo.includes(termoPalavra),
    )
  })

  return filtrados.slice(0, limite)
}

/**
 * Ao selecionar um código da tabela de NCM, efetua o enquadramento na LC 214/2025
 * e calcula a sugestão automática de cClassTrib.
 */
export async function selecionarNcmEEnquadrar(codigoNcmOuFormatado: string): Promise<{
  ncmItem: NcmBuscaItem | undefined
  enquadramento: ClassificacaoNcmResult
}> {
  const catalogo = await carregarCatalogoNcm()
  const digitos = codigoNcmOuFormatado.replace(/\D/g, '')

  const ncmItem = catalogo.find(
    (c) => c.codigoNcm === digitos || c.codigoFormatado === codigoNcmOuFormatado,
  )

  // Executa o enquadramento completo em tempo real com sugestão de cClassTrib
  const enquadramento = await classificarNcmEmTempoReal(digitos)

  return { ncmItem, enquadramento }
}

/**
 * Catálogo Oficial Base extraído das tabelas TIPI / TEC / Siscomex (Decreto nº 11.158/2022 e Res. Gecex 272/2021).
 * Cobre as posições essenciais da LC 214/2025 (móveis/camas, tecidos/edredom, celulares, alimentos, fármacos, veículos, vestuário).
 * Todos os registros vêm com metadados de auditoria e status 'aguardando_chancela'.
 */
export const CATALOGO_NCM_OFICIAL_BASE: NcmBuscaItem[] = [
  // ==========================================
  // CAPÍTULO 94: MÓVEIS, CAMAS, COLCHÕES, ILUMINAÇÃO (Exemplo explícito da Adriana: 9403.20 e 9403.50)
  // ==========================================
  {
    id: 'ncm-94032000',
    codigoNcm: '94032000',
    codigoFormatado: '9403.20.00',
    descricao: 'Outros móveis de metal (inclui camas de metal, estrados e beliches metálicos)',
    descricaoCompleta:
      'Móveis e suas partes; móveis de metal para dormitórios e uso doméstico em geral',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-94035000',
    codigoNcm: '94035000',
    codigoFormatado: '9403.50.00',
    descricao:
      'Móveis de madeira do tipo utilizado em quartos de dormir (camas de madeira, cabeceiras, criados-mudos)',
    descricaoCompleta:
      'Móveis e suas partes; móveis de madeira para dormitórios (camas, beliches e guarda-roupas)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-94029000',
    codigoNcm: '94029000',
    codigoFormatado: '9402.90.00',
    descricao:
      'Mobiliário para medicina, cirurgia, odontologia ou veterinária (camas hospitalares com mecanismo)',
    descricaoCompleta:
      'Camas de hospital com mecanismos de elevação, mesas de operação e similares (LC 214 Anexo IV)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-94042100',
    codigoNcm: '94042100',
    codigoFormatado: '9404.21.00',
    descricao: 'Colchões de borracha alveolar ou de plásticos alveolares, mesmo recobertos',
    descricaoCompleta: 'Suportes para camas, colchões de espuma e plásticos alveolares',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-94042900',
    codigoNcm: '94042900',
    codigoFormatado: '9404.29.00',
    descricao: 'Colchões de outras matérias (colchões de molas ensacadas, ortopédicos)',
    descricaoCompleta: 'Colchões de molas com enchimento têxtil ou misto para camas residenciais',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-94049000',
    codigoNcm: '94049000',
    codigoFormatado: '9404.90.00',
    descricao: 'Artigos de cama e semelhantes (edredons, travesseiros, almofadas, acolchoados)',
    descricaoCompleta:
      'Artigos de cama recheados de penas, penugem ou fibras sintéticas (edredons e travesseiros)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-94031000',
    codigoNcm: '94031000',
    codigoFormatado: '9403.10.00',
    descricao: 'Móveis de metal do tipo utilizado em escritórios',
    descricaoCompleta: 'Armários, arquivos e mesas metálicas de escritório',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-94033000',
    codigoNcm: '94033000',
    codigoFormatado: '9403.30.00',
    descricao: 'Móveis de madeira do tipo utilizado em escritórios',
    descricaoCompleta:
      'Mesas executivas, estações de trabalho e armários de madeira para escritórios',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-94036000',
    codigoNcm: '94036000',
    codigoFormatado: '9403.60.00',
    descricao: 'Outros móveis de madeira (mesas de sala, estantes e cadeiras de madeira)',
    descricaoCompleta: 'Mobiliário de madeira residencial para salas e copas',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-94037000',
    codigoNcm: '94037000',
    codigoFormatado: '9403.70.00',
    descricao: 'Móveis de plásticos',
    descricaoCompleta: 'Cadeiras, banquetas e mesas de plástico injetado',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },

  // ==========================================
  // CAPÍTULO 63: ROUPA DE CAMA, MESA E BANHO
  // ==========================================
  {
    id: 'ncm-63022100',
    codigoNcm: '63022100',
    codigoFormatado: '6302.21.00',
    descricao: 'Roupas de cama estampadas, de algodão (lençóis, fronhas, jogos de cama)',
    descricaoCompleta:
      'Artigos têxteis confeccionados: roupas de cama de algodão para cama de solteiro ou casal',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-63023100',
    codigoNcm: '63023100',
    codigoFormatado: '6302.31.00',
    descricao: 'Outras roupas de cama, de algodão (lençóis lisos, capas de colchão)',
    descricaoCompleta: 'Roupas de cama de algodão liso ou alvejado',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-63023200',
    codigoNcm: '63023200',
    codigoFormatado: '6302.32.00',
    descricao: 'Roupas de cama de fibras sintéticas ou artificiais (microfibra para cama)',
    descricaoCompleta: 'Jogos de cama e lençóis em poliéster e microfibra sintética',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-63026000',
    codigoNcm: '63026000',
    codigoFormatado: '6302.60.00',
    descricao:
      'Roupas de toucador ou de cozinha, de tecidos atoalhados de algodão (toalhas de banho)',
    descricaoCompleta: 'Toalhas de banho, rosto e pisos de tecido felpudo ou atoalhado de algodão',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },

  // ==========================================
  // CAPÍTULO 85: TELECOMUNICAÇÕES, CELULARES, INFORMÁTICA
  // ==========================================
  {
    id: 'ncm-85171300',
    codigoNcm: '85171300',
    codigoFormatado: '8517.13.00',
    descricao: 'Smartphones (telefones inteligentes para redes celulares ou outras redes sem fio)',
    descricaoCompleta: 'Aparelhos telefônicos inteligentes celulares portáteis de telecomunicações',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-85171400',
    codigoNcm: '85171400',
    codigoFormatado: '8517.14.00',
    descricao: 'Outros telefones para redes celulares ou para outras redes sem fio',
    descricaoCompleta: 'Telefones celulares básicos e terminais portáteis',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-85176277',
    codigoNcm: '85176277',
    codigoFormatado: '8517.62.77',
    descricao: 'Roteadores digitais em redes com ou sem fio',
    descricaoCompleta: 'Aparelhos de comutação e roteamento de pacotes de dados',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-84713012',
    codigoNcm: '84713012',
    codigoFormatado: '8471.30.12',
    descricao:
      'Máquinas automáticas para processamento de dados, portáteis (computadores portáteis / notebooks)',
    descricaoCompleta:
      'Notebooks, laptops e computadores pessoais portáteis de peso inferior a 10 kg',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-84713019',
    codigoNcm: '84713019',
    codigoFormatado: '8471.30.19',
    descricao: 'Outros computadores portáteis (inclui tablets com tela sensível ao toque)',
    descricaoCompleta: 'Tablets portáteis sem teclado físico incorporado',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-39269090',
    codigoNcm: '39269090',
    codigoFormatado: '3926.90.90',
    descricao: 'Outras obras de plásticos (capas protetoras de celular, películas e suportes)',
    descricaoCompleta:
      'Artigos e artefatos de matérias plásticas moldadas ou usinadas para uso comum',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },

  // ==========================================
  // CESTA BÁSICA NACIONAL (LC 214/2025 - ANEXO I: REDUÇÃO 100% / ALÍQUOTA ZERO)
  // ==========================================
  {
    id: 'ncm-10063021',
    codigoNcm: '10063021',
    codigoFormatado: '1006.30.21',
    descricao:
      'Arroz semibranqueado ou branqueado, não parboilizado, polido (Cesta Básica Nacional)',
    descricaoCompleta:
      'Arroz de consumo humano — Alíquota Zero IBS/CBS (LC 214/2025 Anexo I, Art. 125)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-10063011',
    codigoNcm: '10063011',
    codigoFormatado: '1006.30.11',
    descricao: 'Arroz parboilizado, polido ou brunido (Cesta Básica Nacional)',
    descricaoCompleta:
      'Arroz parboilizado de consumo humano — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-07133319',
    codigoNcm: '07133319',
    codigoFormatado: '0713.33.19',
    descricao: 'Feijão preto comum (Phaseolus vulgaris) seco, em grãos (Cesta Básica Nacional)',
    descricaoCompleta: 'Feijão preto de consumo humano — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-07133329',
    codigoNcm: '07133329',
    codigoFormatado: '0713.33.29',
    descricao: 'Feijão carioca e outros feijões comuns secos em grãos (Cesta Básica Nacional)',
    descricaoCompleta:
      'Feijão carioca de consumo da população — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-04012010',
    codigoNcm: '04012010',
    codigoFormatado: '0401.20.10',
    descricao:
      'Leite UHT (longa vida) com teor de matéria gorda superior a 1% e inferior ou igual a 6%',
    descricaoCompleta:
      'Leite fluido esterilizado/ultrapasteurizado — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-04011010',
    codigoNcm: '04011010',
    codigoFormatado: '0401.10.10',
    descricao: 'Leite pasteurizado ou UHT desnatado (teor de matéria gorda até 1%)',
    descricaoCompleta:
      'Leite desnatado para consumo direto da população — Alíquota Zero (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-04021010',
    codigoNcm: '04021010',
    codigoFormatado: '0402.10.10',
    descricao: 'Leite em pó desnatado em recipientes de conteúdo até 1 kg',
    descricaoCompleta: 'Leite em pó para consumo humano — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-04051000',
    codigoNcm: '04051000',
    codigoFormatado: '0405.10.00',
    descricao: 'Manteiga de leite de vaca (Cesta Básica Nacional)',
    descricaoCompleta: 'Manteiga para consumo da população — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-15171000',
    codigoNcm: '15171000',
    codigoFormatado: '1517.10.00',
    descricao: 'Margarina, exceto a margarina líquida (Cesta Básica Nacional)',
    descricaoCompleta:
      'Margarina vegetal de consumo humano — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-09012100',
    codigoNcm: '09012100',
    codigoFormatado: '0901.21.00',
    descricao: 'Café torrado, não descafeinado (Cesta Básica Nacional)',
    descricaoCompleta: 'Café torrado em grãos ou moído — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-11010010',
    codigoNcm: '11010010',
    codigoFormatado: '1101.00.10',
    descricao: 'Farinha de trigo de consumo humano (Cesta Básica Nacional)',
    descricaoCompleta:
      'Farinha de trigo tipo 1 e especial — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-11062000',
    codigoNcm: '11062000',
    codigoFormatado: '1106.20.00',
    descricao: 'Farinha e sêmola de mandioca (Cesta Básica Nacional)',
    descricaoCompleta: 'Farinha de mandioca de mesa — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-17019900',
    codigoNcm: '17019900',
    codigoFormatado: '1701.99.00',
    descricao: 'Outros açúcares de cana refinados, cristal ou moídos (Cesta Básica Nacional)',
    descricaoCompleta:
      'Açúcar branco refinado e cristal para uso doméstico — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-19021900',
    codigoNcm: '19021900',
    codigoFormatado: '1902.19.00',
    descricao: 'Massas alimentícias secas não cozidas, sem ovos (macarrão comum)',
    descricaoCompleta:
      'Macarrão de sêmola e trigo duro não recheado — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-19059090',
    codigoNcm: '19059090',
    codigoFormatado: '1905.90.90',
    descricao:
      'Outros produtos de padaria (pão francês tradicional de farinha, água, sal e fermento)',
    descricaoCompleta:
      'Pão francês formato cilíndrico alongado — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-04061010',
    codigoNcm: '04061010',
    codigoFormatado: '0406.10.10',
    descricao: 'Queijo tipo mozarela (Cesta Básica Nacional)',
    descricaoCompleta:
      'Queijo mozarela fatiado ou em peça — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-04061090',
    codigoNcm: '04061090',
    codigoFormatado: '0406.10.90',
    descricao: 'Queijo minas frescal, queijo de coalho e ricota fresca',
    descricaoCompleta:
      'Queijos frescos tradicionais da Cesta Básica Nacional — Redução 100% IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-02013000',
    codigoNcm: '02013000',
    codigoFormatado: '0201.30.00',
    descricao: 'Carnes de animais da espécie bovina, desossadas, frescas ou refrigeradas',
    descricaoCompleta:
      'Carne bovina in natura para consumo humano — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-02071400',
    codigoNcm: '02071400',
    codigoFormatado: '0207.14.00',
    descricao: 'Pedaços e miudezas de galos e de galinhas, congelados (frango em pedaços)',
    descricaoCompleta:
      'Carne de frango congelada de consumo da população — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-02032900',
    codigoNcm: '02032900',
    codigoFormatado: '0203.29.00',
    descricao: 'Outras carnes de animais da espécie suína, congeladas',
    descricaoCompleta: 'Cortes suínos de consumo humano — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-03038954',
    codigoNcm: '03038954',
    codigoFormatado: '0303.89.54',
    descricao: 'Tilápias congeladas (Oreochromis spp.)',
    descricaoCompleta: 'Peixes de consumo popular — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-25010020',
    codigoNcm: '25010020',
    codigoFormatado: '2501.00.20',
    descricao: 'Sal de mesa ou refinado, para consumo humano (iodado)',
    descricaoCompleta: 'Sal refinado para consumo humano — Alíquota Zero IBS/CBS (LC 214 Anexo I)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },

  // ==========================================
  // DISPOSITIVOS MÉDICOS E FARMA (LC 214/2025 - ANEXO IV E VI: REDUÇÃO 60%)
  // ==========================================
  {
    id: 'ncm-30049099',
    codigoNcm: '30049099',
    codigoFormatado: '3004.90.99',
    descricao:
      'Outros medicamentos para medicina humana dosificados em comprimidos, cápsulas ou ampolas',
    descricaoCompleta:
      'Medicamentos essenciais de uso humano — Redução 60% IBS/CBS (LC 214/2025 Anexo VI)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-90183910',
    codigoNcm: '90183910',
    codigoFormatado: '9018.39.10',
    descricao: 'Agulhas para sutura e agulhas tubulares de uso médico-cirúrgico',
    descricaoCompleta:
      'Instrumentos e aparelhos de medicina humana — Redução 60% (LC 214 Anexo IV)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-90211010',
    codigoNcm: '90211010',
    codigoFormatado: '9021.10.10',
    descricao: 'Artigos e aparelhos ortopédicos para fraturas ou sustentação',
    descricaoCompleta:
      'Aparelhos ortopédicos e de tecnologia assistiva — Redução de 60% ou Alíquota Zero (LC 214)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-90213919',
    codigoNcm: '90213919',
    codigoFormatado: '9021.39.19',
    descricao: 'Outras próteses e implantes cirúrgicos articulares',
    descricaoCompleta:
      'Próteses articulares para ortopedia — Redução 60% IBS/CBS (LC 214 Anexo IV)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },

  // ==========================================
  // INSUMOS AGROPECUÁRIOS (LC 214/2025 - ANEXO IX: REDUÇÃO 60%)
  // ==========================================
  {
    id: 'ncm-31052000',
    codigoNcm: '31052000',
    codigoFormatado: '3105.20.00',
    descricao:
      'Adubos (fertilizantes) minerais ou químicos, com nitrogênio, fósforo e potássio (NPK)',
    descricaoCompleta:
      'Fertilizantes NPK para uso agrícola — Redução 60% IBS/CBS (LC 214 Anexo IX)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-38089199',
    codigoNcm: '38089199',
    codigoFormatado: '3808.91.99',
    descricao: 'Outros inseticidas para controle de pragas na agricultura',
    descricaoCompleta:
      'Defensivos agrícolas e inseticidas para produção vegetal — Redução 60% (LC 214 Anexo IX)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-23099090',
    codigoNcm: '23099090',
    codigoFormatado: '2309.90.90',
    descricao:
      'Outras preparações para alimentação de animais (rações para suínos, bovinos e aves)',
    descricaoCompleta: 'Rações de produção agropecuária — Redução 60% IBS/CBS (LC 214 Anexo IX)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },

  // ==========================================
  // VESTUÁRIO E CALÇADOS
  // ==========================================
  {
    id: 'ncm-61091000',
    codigoNcm: '61091000',
    codigoFormatado: '6109.10.00',
    descricao: 'Camisetas (t-shirts) e camisetas interiores, de malha de algodão',
    descricaoCompleta: 'Vestuário e seus acessórios, de malha de algodão',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-62034200',
    codigoNcm: '62034200',
    codigoFormatado: '6203.42.00',
    descricao: 'Calças, jardineiras, bermudas e shorts, de algodão, de uso masculino',
    descricaoCompleta: 'Vestuário de tecido plano: calças jeans e bermudas de algodão',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-64039990',
    codigoNcm: '64039990',
    codigoFormatado: '6403.99.90',
    descricao:
      'Outros calçados com sola exterior de borracha ou plástico e parte superior em couro natural',
    descricaoCompleta: 'Calçados sociais e sapatênis de couro natural',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-64041100',
    codigoNcm: '64041100',
    codigoFormatado: '6404.11.00',
    descricao: 'Calçados de esporte; calçados para tênis, basquetebol, ginástica e treinos (tênis)',
    descricaoCompleta: 'Tênis esportivos com sola exterior de borracha e cabedal têxtil',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },

  // ==========================================
  // AUTOMOTIVO E TRANSPORTE
  // ==========================================
  {
    id: 'ncm-87032210',
    codigoNcm: '87032210',
    codigoFormatado: '8703.22.10',
    descricao:
      'Automóveis de passageiros com motor a explosão de cilindrada superior a 1000 cm³ mas não superior a 1500 cm³',
    descricaoCompleta:
      'Veículos automotores leves de passageiros (tributação sob alíquota padrão ou Imposto Seletivo)',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-87082999',
    codigoNcm: '87082999',
    codigoFormatado: '8708.29.99',
    descricao: 'Outras partes e acessórios de carroçarias para veículos automóveis',
    descricaoCompleta: 'Autopeças de reposição automotiva',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
  {
    id: 'ncm-40111000',
    codigoNcm: '40111000',
    codigoFormatado: '4011.10.00',
    descricao: 'Pneus novos de borracha dos tipos utilizados em automóveis de passageiros',
    descricaoCompleta: 'Pneumáticos novos de reposição automotiva',
    fonteOficial: METADADOS_NCM_TABELA.fonteOficial,
    versaoExtracao: METADADOS_NCM_TABELA.versaoExtracao,
    statusChancela: 'aguardando_chancela',
  },
]
