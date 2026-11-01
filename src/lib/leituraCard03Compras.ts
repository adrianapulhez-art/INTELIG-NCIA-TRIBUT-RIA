import {
  computeCellArt12,
  computeCellArt12Item,
  CONFIG_PADRAO_ART12,
  CRONOGRAMA_ART12,
  CASO_CANONICO_ART12,
  aplicarOverrideCbsArt12,
  type CmvArt12Input,
} from './art12Calculations'
import {
  calcularCelulaFornecedorPlenoXAdquirenteSn,
  calcularSessaoSN,
  obterPerfilSnEfetivo,
  carregarConfigSessaoSN,
  getTabelaOficialConfig,
  PERFIL_SN_NOTA_PADRAO,
  type PerfilSN,
} from './art12SnCalculations'
import { calcularCelulaLrXLr } from './art12LrCalculations'
import type { ItemIntegracaoArt12 } from './integracaoComprasArt12'
import type {
  ClienteRegimeKey,
  FornecedorPosKey,
  CustoCard03Resultado,
} from './markupPosCalculations'

/**
 * REFERÊNCIA de CBS para 2027 — usada APENAS quando não há sessão gravada nem override.
 * É o valor que reproduz os VB chancelados (44.206,15 e 45.757,94). Com 8,8% sairia
 * 44.068,56 e 45.619,67. Não é constante de regra: é o default da sessão para 2027.
 */
export const CBS_REFERENCIA_2027 = 9.14

/** CBS estabelecida na Sessão SN (campo editável). undefined quando não configurada. */
export function obterCbsSessaoSn(): number | undefined {
  try {
    const salvo = carregarConfigSessaoSN()
    const v = salvo?.cbsAliquotaPct
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined
  } catch {
    return undefined
  }
}

/**
 * Percentual de ICMS/CBS/IBS que a Sessão efetivamente usa.
 * - modo 'nota': o percentual digitado no documento fiscal.
 * - modo 'tabela': fração oficial × alíquota efetiva da faixa (nunca um valor fixo).
 */
function resolverPctNota(perfil: PerfilSN, tributo: 'icms' | 'cbs' | 'ibs'): number {
  const origemNota =
    perfil.origem === 'nota' || (perfil.modo === 'nota' && perfil.origem !== 'tabela')
  if (origemNota) {
    const direto =
      tributo === 'icms'
        ? perfil.icmsNotaPct
        : tributo === 'cbs'
          ? perfil.cbsNotaPct
          : perfil.ibsNotaPct
    if (direto > 0) return direto
  }
  const efetiva = perfil.efetivaPct || PERFIL_SN_NOTA_PADRAO.efetivaPct
  const frac =
    tributo === 'icms'
      ? (perfil.icmsFracPct ?? PERFIL_SN_NOTA_PADRAO.icmsFracPct)
      : tributo === 'cbs'
        ? (perfil.cbsFracPct ?? PERFIL_SN_NOTA_PADRAO.cbsFracPct)
        : (perfil.ibsFracPct ?? PERFIL_SN_NOTA_PADRAO.ibsFracPct)
  return Number(((efetiva * frac) / 100).toFixed(5))
}

export interface LeituraCard03Input {
  inputPleno?: CmvArt12Input
  item?: ItemIntegracaoArt12
  perfilSN?: PerfilSN
  cbsAliquotaPct?: number
  cbsRateOverride?: number
  ibsRateOverride?: number
}
export type EspelhoQuatroFornecedores = Record<FornecedorPosKey, CustoCard03Resultado>

/**
 * PERFIL PADRÃO DA CHANCELA — Anexo I, 4ª faixa (RBT12 R$ 720.000,01 a 1.800.000),
 * exercício 2027, RBT12 R$ 1.800.000 => alíquota efetiva 9,45%.
 * Derivado da tabela oficial, NÃO digitado: 9,45% × 33,50% = 3,16575% (ICMS),
 * × 15,33% = 1,44868% (CBS), × 0,17% = 0,01606% (IBS).
 * Esta é a configuração em que os 16 valores de R$ 42.000 foram chancelados.
 */
export const PERFIL_SN_DESTACADOS_OURO: PerfilSN = (() => {
  const cfg = getTabelaOficialConfig(2027, 'anexo1', 4, 1800000)
  const efetiva = cfg.aliquotaEfetivaPct
  return {
    origem: 'tabela',
    modo: 'anexo',
    icmsNotaPct: Number(((efetiva * cfg.fracaoIcmsPct) / 100).toFixed(5)),
    cbsNotaPct: Number(((efetiva * cfg.fracaoCbsPct) / 100).toFixed(5)),
    ibsNotaPct: Number(((efetiva * cfg.fracaoIbsPct) / 100).toFixed(5)),
    anexo: cfg.anexo,
    faixa: cfg.faixa,
    exercicio: 2027,
    rbt12: 1800000,
    anexoId: 'anexo1',
    faixaNumero: 4,
    efetivaPct: efetiva,
    icmsFracPct: cfg.fracaoIcmsPct,
    cbsFracPct: cfg.fracaoCbsPct,
    ibsFracPct: cfg.fracaoIbsPct,
    irpjCsllCppFracPct: cfg.fracaoIrpjCsllCppFracPct,
    baseDoDas: 'bruta',
  }
})()

/**
 * FONTE ÚNICA: o perfil que a Sessão SN efetivamente usa.
 * Havendo sessão gravada, ela manda (tabela ou nota). Sem sessão, a chancela acima
 * passa a ser o PADRÃO da sessão — nunca um valor paralelo ao que a tela mostra.
 */
export function obterPerfilSessaoOuChancela(): PerfilSN {
  const salvo = carregarConfigSessaoSN()
  if (!salvo) return PERFIL_SN_DESTACADOS_OURO
  return obterPerfilSnEfetivo(2027)
}

// PERFIL_SN_DESTACADOS_OURO was previously defined here as a literal; now derived above.

/**
 * Lê rigorosamente do Card 03 da Calculadora de Compras Pós Reforma (Novo Preço de Custo do Adquirente),
 * integrando ao vivo com o motor correto para cada célula (16 combinações = 4 adquirentes × 4 fornecedores):
 *
 * 1. Adquirente LP:
 *    - Fornecedor LP: computeCellArt12Item (presumido × presumido) -> Card 03: 1.106,10 (CL 33.182,94)
 *    - Fornecedor LR: computeCellArt12Item (presumido × real) -> Card 03: 1.041,81 (CL 31.254,36)
 *    - Fornecedor SNP: calcularSessaoSN (adquirente presumido) -> Card 03: 1.335,17 (CL 40.055,19)
 *    - Fornecedor SNH: computeCellArt12Item (presumido × simples_hibrido) -> Card 03: 1.355,68 (CL 40.670,38)
 *
 * 2. Adquirente LR:
 *    - Fornecedor LP: computeCellArt12Item (real × presumido) -> Card 03: 1.106,10 (CL 33.182,94)
 *    - Fornecedor LR: computeCellArt12Item (real × real) -> Card 03: 1.041,81 (CL 31.254,36)
 *    - Fornecedor SNP: calcularSessaoSN (adquirente real) -> Card 03: 1.335,17 (CL 40.055,19)
 *    - Fornecedor SNH: computeCellArt12Item (real × simples_hibrido) -> Card 03: 1.355,68 (CL 40.670,38)
 *
 * 3. Adquirente SNP:
 *    - Fornecedor LP: computeCellArt12Item (simples × presumido) -> Card 03: 1.473,54 (CL 44.206,15)
 *    - Fornecedor LR: computeCellArt12Item (simples × real) -> Card 03: 1.387,89 (CL 41.636,82)
 *    - Fornecedor SNP: computeCellArt12Item (simples × simples) -> Card 03: 1.400,00 (CL 42.000,00)
 *    - Fornecedor SNH: computeCellArt12Item (simples × simples_hibrido) -> Card 03: 1.525,26 (CL 45.757,94)
 *
 * 4. Adquirente SNH:
 *    - Fornecedor LP: computeCellArt12Item (simples_hibrido × presumido) -> Card 03: 1.371,34 (CL 41.140,05)
 *    - Fornecedor LR: computeCellArt12Item (simples_hibrido × real) -> Card 03: 1.291,63 (CL 38.748,93)
 *    - Fornecedor SNP: computeCellArt12Item (simples_hibrido × simples) -> Card 03: 1.379,49 (CL 41.384,81)
 *    - Fornecedor SNH: computeCellArt12Item (simples_hibrido × simples_hibrido) -> Card 03: 1.400,00 (CL 42.000,00)
 */
export function lerEspelhoComprasCard03(
  clienteRegime: ClienteRegimeKey,
  input: LeituraCard03Input = {},
): EspelhoQuatroFornecedores {
  // CBS: fonte única = Sessão SN (campo editável). Só há dois fallbacks, nesta ordem:
  //   1) override explícito de quem chamou (testes/parametrização);
  //   2) a referência 2027 da casa (9,14%), que é o DEFAULT da sessão quando não configurada.
  // Em nenhum caso existe um 8,8% paralelo ao que a tela mostra.
  const cbsEfetivaPct =
    input.cbsAliquotaPct ?? input.cbsRateOverride ?? obterCbsSessaoSn() ?? CBS_REFERENCIA_2027
  const rowBase2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027) || CRONOGRAMA_ART12[1]
  const row2027 = aplicarOverrideCbsArt12(rowBase2027, cbsEfetivaPct)

  // CBS DA SESSÃO SN — fonte da NOTA do fornecedor SIMPLES HÍBRIDO.
  // DIVERGÊNCIA REAL ENTRE AS DUAS CBS (comprovada nos prints da Adri, 31/10): a Sessão SN
  // aplica a SUA própria alíquota (campo "CBS do ano", default 9,14%) em todas as suas células,
  // inclusive na nota do fornecedor híbrido. O campo do topo da Compras
  // ('it_reforma_cbs_aliquota_v1') NÃO chega lá. Por isso, com 11,24% no topo, o Card 03 mostra
  // SNH × SNP = 1.526,08 (nota 45.782,32, construída a 9,14%) e não 1.554,73 (46.641,93).
  // As células de fornecedor SN HÍBRIDO seguem esta linha; as plenas e a de SN puro, a do topo.
  const cbsSessaoPct = obterCbsSessaoSn() ?? CBS_REFERENCIA_2027
  const rowSn2027 = aplicarOverrideCbsArt12(rowBase2027, cbsSessaoPct)
  const inputEfetivo = input.inputPleno ?? CASO_CANONICO_ART12
  const itemEfetivo = input.item

  // FONTE ÚNICA: a Sessão SN. Em modo 'nota' valem os percentuais digitados; em modo
  // 'tabela' os percentuais saem das frações oficiais × alíquota efetiva da faixa.
  // Nada aqui é valor fixo de perfil — só a referência acima quando não há sessão.
  const perfilBase = input.perfilSN ?? obterPerfilSessaoOuChancela()
  const perfilSN: PerfilSN = {
    ...PERFIL_SN_NOTA_PADRAO,
    ...perfilBase,
    icmsNotaPct: resolverPctNota(perfilBase, 'icms'),
    cbsNotaPct: resolverPctNota(perfilBase, 'cbs'),
    ibsNotaPct: resolverPctNota(perfilBase, 'ibs'),
  }

  // FORNECEDOR SN HÍBRIDO — perfil DERIVADO da sessão (alíquota efetiva e fração de ICMS
  // da faixa escolhida). Antes era fixo em 4,63052% / 68,36648%, o que só valia para a
  // 4ª faixa em 9,45% e ficava errado em qualquer outra configuração.
  const perfilFornecedorSNHibrido = {
    anexo: perfilSN.anexo,
    faixa: perfilSN.faixa,
    efetivaPct: perfilSN.efetivaPct,
    icmsFracPct: perfilSN.icmsFracPct,
    tipo: 'hibrido' as const,
  }

  // Fallback item sintético canônico se não houver item real da compras
  const itemCanonicoFallback: ItemIntegracaoArt12 = {
    id: 'item-canonico',
    name: 'Item Canônico de Validação',
    quantity: inputEfetivo.quantity || 30,
    merchandiseValue: (inputEfetivo.quantity || 30) * (inputEfetivo.unitPrice || 1400),
    freightValue: inputEfetivo.freightValue || 400,
    icmsRate: inputEfetivo.icmsRate || 18,
    icmsFreightRate: inputEfetivo.icmsFreightRate || 18,
    ipiRate: inputEfetivo.ipiRate || 0,
    hasSt: false,
    stValue: 0,
    valorNota:
      (inputEfetivo.quantity || 30) * (inputEfetivo.unitPrice || 1400) +
      (inputEfetivo.freightValue || 400),
    abcPct: 100,
    classe: 'A',
  }
  const itemParaMotores =
    itemEfetivo && itemEfetivo.valorNota > 0 ? itemEfetivo : itemCanonicoFallback

  // FONTE ÚNICA DO CUSTO DE HOJE DE FORNECEDOR SIMPLES — exatamente o número que a Calculadora
  // de Compras exibe na coluna do fornecedor optante. Quem compra de optante NÃO credita
  // ICMS/PIS/COFINS (a nota do Simples não destaca esses tributos: LC 123/2006, art. 13, §1º),
  // então o custo de hoje é a NOTA CHEIA ÷ quantidade — chancela de art12QuatroCelulasBlindagem
  // (42.400,00 -> 1.413,33), válida para SN puro E SN híbrido.
  // Antes, este campo vinha de duas fontes (cell.hoje.unitario = 1.148,00 nos cards plenos × Simples
  // e custoUnitarioHojeSN = 1.380,96 no card SNP), deixando o riscado do "Custo Card 03 (2027)"
  // incoerente entre os cards da mesma tela.
  const custoHojeFornecedorSimples = (() => {
    const qtd = itemParaMotores.quantity > 0 ? itemParaMotores.quantity : 1
    const notaHoje =
      (itemParaMotores.merchandiseValue || 0) +
      (itemParaMotores.freightValue || 0) +
      (itemParaMotores.hasSt ? itemParaMotores.stValue || 0 : 0)
    const unit = notaHoje / qtd
    return Number.isFinite(unit) ? Number(unit.toFixed(2)) : 0
  })()

  // Δ% sempre coerente com o custo de hoje EXIBIDO (mesma fonte), nunca com a do motor Art. 12.
  const deltaComHoje = (custo2027: number, custoHoje: number) =>
    custoHoje > 0 ? Number((((custo2027 - custoHoje) / custoHoje) * 100).toFixed(2)) : 0

  // =========================================================================
  // CLIENTE LUCRO PRESUMIDO (LP)
  // =========================================================================
  if (clienteRegime === 'lp') {
    // 1. Fornecedor LP (LP × LP)
    const cellLp = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'presumido',
            fornecedorRegime: 'presumido',
          },
          row2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'presumido',
            fornecedorRegime: 'presumido',
          },
          row2027,
        )

    // 2. Fornecedor LR (LP × LR)
    const cellLr = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'presumido',
            fornecedorRegime: 'real',
          },
          row2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'presumido',
            fornecedorRegime: 'real',
          },
          row2027,
        )

    // 3. Fornecedor SNP (LP × SNP) — Sessão SN com adquirente 'presumido'
    // Custo unitário de ouro: 1.335,17 (fração do DAS 1.944,81 aproveitada pelo LP art. 23 LC 123)
    const resSessaoSnp = calcularSessaoSN(itemParaMotores, perfilSN, 'presumido')

    // 4. Fornecedor SNH (LP × SNH)
    const cellSnh = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'presumido',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          rowSn2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'presumido',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          rowSn2027,
        )

    return {
      lp: {
        custo2027: cellLp.exercicio.unitario,
        custoHoje: cellLp.hoje.unitario,
        deltaPct: cellLp.deltaPct,
        comprasLiquidas2027: cellLp.exercicio.liquido,
        notaCheia2027: cellLp.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Cadeia Plena Art. 12 (LP × LP)',
        fundamentoLegal:
          'LC 214/2025, art. 12 + art. 47: crédito financeiro pleno anula CBS e IBS destacados.',
        linhasMemoriaCusto: cellLp.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
      lr: {
        custo2027: cellLr.exercicio.unitario,
        custoHoje: cellLr.hoje.unitario,
        deltaPct: cellLr.deltaPct,
        comprasLiquidas2027: cellLr.exercicio.liquido,
        notaCheia2027: cellLr.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Cadeia Plena Art. 12 (LP × LR)',
        fundamentoLegal:
          'LC 214/2025, art. 12 + art. 47: menor custo da cadeia plena pelo preço líquido menor do LR.',
        linhasMemoriaCusto: cellLr.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
      snp: {
        custo2027: resSessaoSnp.custoUnitarioLiquido,
        custoHoje: custoHojeFornecedorSimples,
        deltaPct: deltaComHoje(resSessaoSnp.custoUnitarioLiquido, custoHojeFornecedorSimples),
        comprasLiquidas2027: resSessaoSnp.custoLiquido,
        notaCheia2027: resSessaoSnp.receitaBruta,
        motorOrigem: 'sessao_sn',
        rotuloMotor: 'Sessão SN (LP × SN Puro — Art. 23 LC 123)',
        fundamentoLegal:
          'LC 123/2006 art. 23 §1º/§2º c/c LC 214 art. 47 §9º II: crédito restrito à parcela creditável do DAS informada em campo próprio.',
        linhasMemoriaCusto: resSessaoSnp.memoria.map((m) => ({
          label: m.label,
          formula: m.formula,
          valor: m.value,
          destaque: m.destaque,
          fundamento: m.fundamento,
        })),
      },
      snh: {
        custo2027: cellSnh.exercicio.unitario,
        custoHoje: custoHojeFornecedorSimples,
        deltaPct: deltaComHoje(cellSnh.exercicio.unitario, custoHojeFornecedorSimples),
        comprasLiquidas2027: cellSnh.exercicio.liquido,
        notaCheia2027: cellSnh.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Matriz Art. 12 (LP × SN Híbrido)',
        fundamentoLegal:
          'LC 214/2025 art. 12 / art. 47 §9º I c/c LC 123 art. 23: CBS/IBS pelo regime regular e ICMS fracionado na nota.',
        linhasMemoriaCusto: cellSnh.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
    }
  }

  // =========================================================================
  // CLIENTE LUCRO REAL (LR)
  // =========================================================================
  if (clienteRegime === 'lr') {
    const cellLp = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'real',
            fornecedorRegime: 'presumido',
          },
          row2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'real',
            fornecedorRegime: 'presumido',
          },
          row2027,
        )

    const cellLr = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'real',
            fornecedorRegime: 'real',
          },
          row2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'real',
            fornecedorRegime: 'real',
          },
          row2027,
        )

    const resSessaoSnpLr = calcularSessaoSN(itemParaMotores, perfilSN, 'presumido')

    const cellSnh = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'real',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          rowSn2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'real',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          rowSn2027,
        )

    return {
      lp: {
        custo2027: cellLp.exercicio.unitario,
        custoHoje: cellLp.hoje.unitario,
        deltaPct: cellLp.deltaPct,
        comprasLiquidas2027: cellLp.exercicio.liquido,
        notaCheia2027: cellLp.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Cadeia Plena Art. 12 (LR × LP)',
        fundamentoLegal:
          'LC 214/2025, art. 12 + art. 47: crédito financeiro pleno anula CBS e IBS destacados.',
        linhasMemoriaCusto: cellLp.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
      lr: {
        custo2027: cellLr.exercicio.unitario,
        custoHoje: cellLr.hoje.unitario,
        deltaPct: cellLr.deltaPct,
        comprasLiquidas2027: cellLr.exercicio.liquido,
        notaCheia2027: cellLr.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Cadeia Plena Art. 12 (LR × LR — Célula Neutra)',
        fundamentoLegal:
          'LC 214/2025, art. 12 + art. 47: célula neutra — reprecificação preserva a receita líquida do fornecedor.',
        linhasMemoriaCusto: cellLr.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
      snp: {
        custo2027: resSessaoSnpLr.custoUnitarioLiquido,
        custoHoje: custoHojeFornecedorSimples,
        deltaPct: deltaComHoje(resSessaoSnpLr.custoUnitarioLiquido, custoHojeFornecedorSimples),
        comprasLiquidas2027: resSessaoSnpLr.custoLiquido,
        notaCheia2027: resSessaoSnpLr.receitaBruta,
        motorOrigem: 'sessao_sn',
        rotuloMotor: 'Sessão SN (LR × SN Puro — Art. 23 LC 123)',
        fundamentoLegal:
          'LC 123/2006 art. 23 §1º/§2º c/c LC 214 art. 47 §9º II: crédito restrito à parcela creditável do DAS informada em campo próprio.',
        linhasMemoriaCusto: resSessaoSnpLr.memoria.map((m) => ({
          label: m.label,
          formula: m.formula,
          valor: m.value,
          destaque: m.destaque,
          fundamento: m.fundamento,
        })),
      },
      snh: {
        custo2027: cellSnh.exercicio.unitario,
        custoHoje: custoHojeFornecedorSimples,
        deltaPct: deltaComHoje(cellSnh.exercicio.unitario, custoHojeFornecedorSimples),
        comprasLiquidas2027: cellSnh.exercicio.liquido,
        notaCheia2027: cellSnh.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Matriz Art. 12 (LR × SN Híbrido)',
        fundamentoLegal:
          'LC 214/2025 art. 12 / art. 47 §9º I c/c LC 123 art. 23: CBS/IBS pelo regime regular e ICMS fracionado na nota.',
        linhasMemoriaCusto: cellSnh.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
    }
  }

  // =========================================================================
  // CLIENTE SIMPLES NACIONAL PURO (SNP)
  // =========================================================================
  if (clienteRegime === 'snp') {
    // 1. Fornecedor LP (SNP × LP)
    const cellLp = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'presumido',
          },
          row2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'presumido',
          },
          row2027,
        )

    // 2. Fornecedor LR (SNP × LR)
    const cellLr = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'real',
          },
          row2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'real',
          },
          row2027,
        )

    // 3. Fornecedor SNP (SNP × SNP)
    const celulaSnpSnp = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'simples',
          },
          row2027,
        )
      : null
    const fallbackSessaoSnpSn = !itemEfetivo
      ? calcularSessaoSN(itemParaMotores, perfilSN, 'simples')
      : null

    // 4. Fornecedor SNH (SNP × SNH)
    const cellSnhSn = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          rowSn2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          rowSn2027,
        )

    const custoSnpSnp2027 = celulaSnpSnp
      ? celulaSnpSnp.exercicio.unitario
      : (fallbackSessaoSnpSn?.custoUnitarioLiquido ?? 0)
    const notaSnpSnp2027 = celulaSnpSnp
      ? celulaSnpSnp.exercicio.bruto
      : (fallbackSessaoSnpSn?.receitaBruta ?? 0)
    const liquidoSnpSnp2027 = celulaSnpSnp
      ? celulaSnpSnp.exercicio.liquido
      : (fallbackSessaoSnpSn?.custoLiquido ?? 0)

    return {
      lp: {
        custo2027: cellLp.exercicio.unitario,
        custoHoje: cellLp.hoje.unitario,
        deltaPct: cellLp.deltaPct,
        comprasLiquidas2027: cellLp.exercicio.liquido,
        notaCheia2027: cellLp.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Matriz Art. 12 (SN Puro × LP)',
        fundamentoLegal:
          'LC 123/2006 art. 13, §1º + LC 214/2025 art. 47, §9º, I: optante não apropria crédito — absorve a nota cheia.',
        linhasMemoriaCusto: cellLp.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
      lr: {
        custo2027: cellLr.exercicio.unitario,
        custoHoje: cellLr.hoje.unitario,
        deltaPct: cellLr.deltaPct,
        comprasLiquidas2027: cellLr.exercicio.liquido,
        notaCheia2027: cellLr.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Matriz Art. 12 (SN Puro × LR)',
        fundamentoLegal:
          'LC 123/2006 art. 13, §1º + LC 214/2025 art. 47, §9º, I: optante não apropria crédito — absorve a nota cheia.',
        linhasMemoriaCusto: cellLr.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
      snp: {
        custo2027: custoSnpSnp2027,
        custoHoje: custoHojeFornecedorSimples,
        deltaPct: deltaComHoje(custoSnpSnp2027, custoHojeFornecedorSimples),
        comprasLiquidas2027: liquidoSnpSnp2027,
        notaCheia2027: notaSnpSnp2027,
        motorOrigem: celulaSnpSnp ? 'art12_pleno' : 'sessao_sn',
        rotuloMotor: 'Matriz Art. 12 (SN Puro × SNP)',
        fundamentoLegal:
          'LC 123/2006 art. 13, §1º: optante não apropria crédito — custo = nota cheia congelada.',
        linhasMemoriaCusto: celulaSnpSnp
          ? celulaSnpSnp.exercicio.lines.map((l) => ({
              label: l.label,
              formula: l.formula,
              valor: l.value,
              destaque: Boolean(l.subtotal),
              fundamento: l.fundamento.dispositivo,
            }))
          : fallbackSessaoSnpSn!.memoria.map((m) => ({
              label: m.label,
              formula: m.formula,
              valor: m.value,
              destaque: m.destaque,
              fundamento: m.fundamento,
            })),
      },
      snh: {
        custo2027: cellSnhSn.exercicio.unitario,
        custoHoje: custoHojeFornecedorSimples,
        deltaPct: deltaComHoje(cellSnhSn.exercicio.unitario, custoHojeFornecedorSimples),
        comprasLiquidas2027: cellSnhSn.exercicio.liquido,
        notaCheia2027: cellSnhSn.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Matriz Art. 12 (SN Puro × SN Híbrido)',
        fundamentoLegal:
          'LC 123/2006 art. 13, §1º + LC 214/2025 art. 41: optante não credita CBS/IBS destacados — absorve a nota cheia.',
        linhasMemoriaCusto: cellSnhSn.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
    }
  }

  // =========================================================================
  // CLIENTE SIMPLES NACIONAL HÍBRIDO (SNH)
  // =========================================================================
  // 1. Fornecedor LP (LP × SNH)
  const cellLpSnh = itemEfetivo
    ? computeCellArt12Item(
        itemEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'presumido',
        },
        row2027,
      )
    : computeCellArt12(
        inputEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'presumido',
        },
        row2027,
      )

  // 2. Fornecedor LR (LR × SNH)
  const cellLrSnh = itemEfetivo
    ? computeCellArt12Item(
        itemEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'real',
        },
        row2027,
      )
    : computeCellArt12(
        inputEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'real',
        },
        row2027,
      )

  // 3. Fornecedor SNP (SNH × SNP)
  const cellSnpSnh = itemEfetivo
    ? computeCellArt12Item(
        itemEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'simples',
        },
        row2027,
      )
    : computeCellArt12(
        inputEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'simples',
        },
        row2027,
      )

  // Crédito do adquirente SN HÍBRIDO comprando de fornecedor SN PURO.
  // A nota do optante é congelada, mas quem apura CBS/IBS no regime regular (LC 214/2025,
  // art. 41) credita as FRAÇÕES desses tributos embutidas no DAS do fornecedor.
  // As frações vêm da SESSÃO (cbsDAS + ibsDAS ÷ base), nunca de um par fixo: antes estava
  // gravado 1,44869% + 0,01607% = 1,46476%, o que só valia para a 4ª faixa em 9,45%.
  const custoSnpNoAdquirenteSnh = (() => {
    const notaCheia = cellSnpSnh.exercicio.bruto
    const sessaoSnh = calcularSessaoSN(itemParaMotores, perfilSN, 'simples_hibrido')
    const baseSessao = sessaoSnh.baseDasUtilizada6 || 0
    const fracao = baseSessao > 0 ? (sessaoSnh.cbsDAS6 + sessaoSnh.ibsDAS6) / baseSessao : 0
    const credito = Number((notaCheia * fracao).toFixed(2))
    const liquido = Number((notaCheia - credito).toFixed(2))
    const qtd = itemParaMotores.quantity > 0 ? itemParaMotores.quantity : 1
    return {
      notaCheia,
      comprasLiquidas: liquido,
      custoUnitario: Number((liquido / qtd).toFixed(2)),
    }
  })()

  // 4. Fornecedor SNH (SNH × SNH)
  const cellSnhSnh = itemEfetivo
    ? computeCellArt12Item(
        itemEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'simples_hibrido',
          perfilFornecedorSN: perfilFornecedorSNHibrido,
        },
        rowSn2027,
      )
    : computeCellArt12(
        inputEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'simples_hibrido',
          perfilFornecedorSN: perfilFornecedorSNHibrido,
        },
        rowSn2027,
      )

  return {
    lp: {
      custo2027: cellLpSnh.exercicio.unitario,
      custoHoje: cellLpSnh.hoje.unitario,
      deltaPct: cellLpSnh.deltaPct,
      comprasLiquidas2027: cellLpSnh.exercicio.liquido,
      notaCheia2027: cellLpSnh.exercicio.bruto,
      motorOrigem: 'art12_pleno',
      rotuloMotor: 'Matriz Art. 12 (LP × SN Híbrido)',
      fundamentoLegal:
        'LC 214/2025 art. 41: credita CBS e IBS; NUNCA credita ICMS 18% -> Custo 1.371,34.',
      linhasMemoriaCusto: cellLpSnh.exercicio.lines.map((l) => ({
        label: l.label,
        formula: l.formula,
        valor: l.value,
        destaque: Boolean(l.subtotal),
        fundamento: l.fundamento.dispositivo,
      })),
    },
    lr: {
      custo2027: cellLrSnh.exercicio.unitario,
      custoHoje: cellLrSnh.hoje.unitario,
      deltaPct: cellLrSnh.deltaPct,
      comprasLiquidas2027: cellLrSnh.exercicio.liquido,
      notaCheia2027: cellLrSnh.exercicio.bruto,
      motorOrigem: 'art12_pleno',
      rotuloMotor: 'Matriz Art. 12 (LR × SN Híbrido)',
      fundamentoLegal:
        'LC 214/2025 art. 41: credita CBS e IBS; NUNCA credita ICMS 18% -> Custo 1.291,63.',
      linhasMemoriaCusto: cellLrSnh.exercicio.lines.map((l) => ({
        label: l.label,
        formula: l.formula,
        valor: l.value,
        destaque: Boolean(l.subtotal),
        fundamento: l.fundamento.dispositivo,
      })),
    },
    snp: {
      custo2027: custoSnpNoAdquirenteSnh.custoUnitario,
      custoHoje: custoHojeFornecedorSimples,
      deltaPct: deltaComHoje(custoSnpNoAdquirenteSnh.custoUnitario, custoHojeFornecedorSimples),
      comprasLiquidas2027: custoSnpNoAdquirenteSnh.comprasLiquidas,
      notaCheia2027: custoSnpNoAdquirenteSnh.notaCheia,
      motorOrigem: 'art12_pleno',
      rotuloMotor: 'Matriz Art. 12 (SN Híbrido × SN Puro)',
      fundamentoLegal:
        'LC 123/2006 art. 13, §1º: nota do optante sem destaque — não há crédito a apropriar.',
      linhasMemoriaCusto: cellSnpSnh.exercicio.lines.map((l) => ({
        label: l.label,
        formula: l.formula,
        valor: l.value,
        destaque: Boolean(l.subtotal),
        fundamento: l.fundamento.dispositivo,
      })),
    },
    snh: {
      custo2027: cellSnhSnh.exercicio.unitario,
      custoHoje: custoHojeFornecedorSimples,
      deltaPct: deltaComHoje(cellSnhSnh.exercicio.unitario, custoHojeFornecedorSimples),
      comprasLiquidas2027: cellSnhSnh.exercicio.liquido,
      notaCheia2027: cellSnhSnh.exercicio.bruto,
      motorOrigem: 'art12_pleno',
      rotuloMotor: 'Matriz Art. 12 (SN Híbrido × SN Híbrido)',
      fundamentoLegal:
        'LC 214/2025 art. 41 + LC 123 art. 23: nota cheia absorvida (adquirente também optante pleno de IBS/CBS no regular).',
      linhasMemoriaCusto: cellSnhSnh.exercicio.lines.map((l) => ({
        label: l.label,
        formula: l.formula,
        valor: l.value,
        destaque: Boolean(l.subtotal),
        fundamento: l.fundamento.dispositivo,
      })),
    },
  }
}
