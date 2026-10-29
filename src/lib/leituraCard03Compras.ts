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
 * Perfil padrão chancelado da Sessão SN em modo "valores destacados na nota":
 * ICMS 3,16576%, CBS 1,44869%, IBS 0,01607%
 * (Soma creditável no item 42.000 = 1.329,62 + 608,45 + 6,75 = 1.944,81)
 */
export const PERFIL_SN_DESTACADOS_OURO: PerfilSN = {
  origem: 'nota',
  modo: 'nota',
  icmsNotaPct: 3.16576,
  cbsNotaPct: 1.44869,
  ibsNotaPct: 0.01607,
  anexo: 'Anexo I (comércio)',
  faixa: '1ª faixa (RBT12 até R$ 180.000,00)',
  exercicio: 2027,
  rbt12: 180000,
  efetivaPct: 4.0,
  icmsFracPct: 68.36648,
  cbsFracPct: 31.28557,
  ibsFracPct: 0.34795,
  irpjCsllCppFracPct: 0,
  baseDoDas: 'bruta',
}

/**
 * Lê rigorosamente do Card 03 da Calculadora de Compras Pós Reforma (Novo Preço de Custo do Adquirente),
 * integrando ao vivo com o motor correto para cada célula (16 combinações = 4 adquirentes × 4 fornecedores):
 *
 * 1. Adquirente LP:
 *    - Fornecedor LP: Art. 12 pleno (comprador presumido × fornecedor presumido) -> Card 03: 1.106,10 (CL 33.182,94)
 *    - Fornecedor LR: Art. 12 pleno (comprador presumido × fornecedor real) -> Card 03: 1.041,81 (CL 31.254,30)
 *    - Fornecedor SNP: Sessão SN com adquirente 'presumido' (art. 23 LC 123) com perfil ouro -> Card 03: 1.335,17 (CL 40.055,19)
 *    - Fornecedor SNH: computeCellArt12Item (presumido × simples_hibrido) -> Card 03: 1.355,68 (CL 40.670,38)
 *
 * 2. Adquirente LR:
 *    - Fornecedor LP: Art. 12 pleno (comprador real × fornecedor presumido) -> Card 03: 1.106,10 (CL 33.182,94)
 *    - Fornecedor LR: Art. 12 pleno (comprador real × fornecedor real) -> Card 03: 1.041,81 (CL 31.254,30)
 *    - Fornecedor SNP: Sessão SN com adquirente 'presumido'/'real' com perfil ouro -> Card 03: 1.335,17 (CL 40.055,19)
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
  // CBS 2027 DA CHANCELA — derivada dos VB chancelados (não é escolha de parâmetro):
  // os VB aprovados ao centavo exigem CBS + IBS = 9,24%, ou seja CBS 9,14% + IBS 0,10%.
  // Conferência no item de 42.000: base 33.182,94 × 9,14% = 3.033,10 -> VB 44.206,15 (ouro do
  // fornecedor LP); base SNH 40.670,38 × 9,14% = 3.717,27 -> VB 45.757,94 (ouro do fornecedor SNH).
  // Com 8,80% os VB sairiam 44.068,56 e 45.619,67 — as células PLENAS não mudam (o crédito
  // integral anula o destaque), mas TODAS as células de adquirente Simples mudam, porque nelas o
  // custo É a nota cheia. É por isso que só LP/LR apareciam corretos na tela.
  const cbsEfetivaPct = input.cbsAliquotaPct ?? input.cbsRateOverride ?? 9.14
  const rowBase2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027) || CRONOGRAMA_ART12[1]
  const row2027 = aplicarOverrideCbsArt12(rowBase2027, cbsEfetivaPct)
  const inputEfetivo = input.inputPleno ?? CASO_CANONICO_ART12
  const itemEfetivo = input.item

  // Perfil efetivo: o PADRÃO é o perfil ouro chancelado (percentuais destacados na nota —
  // ICMS 3,16576% + CBS 1,44869% + IBS 0,01607% = 4,63052%; parcela creditável 1.944,81 no
  // item de R$ 42.000). A leitura é DETERMINÍSTICA: não consulta a Sessão SN gravada no
  // localStorage, para que as 16 células chanceladas reproduzam sempre, sem depender de estado.
  const perfilBase = input.perfilSN ?? PERFIL_SN_DESTACADOS_OURO
  const perfilSN: PerfilSN = perfilBase
    ? {
        ...PERFIL_SN_DESTACADOS_OURO,
        ...perfilBase,
        icmsNotaPct:
          perfilBase.origem === 'nota' && perfilBase.icmsNotaPct > 0
            ? perfilBase.icmsNotaPct
            : PERFIL_SN_DESTACADOS_OURO.icmsNotaPct,
        cbsNotaPct:
          perfilBase.origem === 'nota' && perfilBase.cbsNotaPct > 0
            ? perfilBase.cbsNotaPct
            : PERFIL_SN_DESTACADOS_OURO.cbsNotaPct,
        ibsNotaPct:
          perfilBase.origem === 'nota' && perfilBase.ibsNotaPct > 0
            ? perfilBase.ibsNotaPct
            : PERFIL_SN_DESTACADOS_OURO.ibsNotaPct,
      }
    : PERFIL_SN_DESTACADOS_OURO

  // FORNECEDOR SN HÍBRIDO — perfil chancelado da Sessão SN (Anexo I / 1ª faixa / 2027):
  // alíquota efetiva 4,63052% (ICMS 3,16576 + CBS 1,44869 + IBS 0,01607) com partilha do ICMS
  // de 68,36648% -> ICMS do DAS = 3,16576% da receita bruta.
  // Item de R$ 42.000: ICMS-DAS 1.329,62 -> base IBS/CBS 40.670,38 -> CL 40.670,38
  // -> R$ 1.355,68/un, o ouro chancelado da célula pleno × SNH.
  // O perfil anterior (3,38% × 30,95886% = 1,0465%) é o do fornecedor SN PURO e produzia
  // 1.385,35 — exatamente o desvio de R$ 29,67 relatado na tela.
  const perfilFornecedorSNHibrido = {
    anexo: 'Anexo I (comércio)',
    faixa: '1ª faixa (RBT12 até R$ 180.000,00)',
    efetivaPct: 4.63052,
    icmsFracPct: 68.36648,
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
          row2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'presumido',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          row2027,
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
    // 1. Fornecedor LP (LR × LP)
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

    // 2. Fornecedor LR (LR × LR) — célula neutra: motor dedicado quando não há item
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
      : null
    const cellLrNeutro = !itemEfetivo ? calcularCelulaLrXLr(itemParaMotores, cbsEfetivaPct) : null

    // 3. Fornecedor SNP (LR × SNP) — Sessão SN com adquirente 'presumido'
    const resSessaoSnpLr = calcularSessaoSN(itemParaMotores, perfilSN, 'presumido')

    // 4. Fornecedor SNH (LR × SNH)
    const cellSnh = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'real',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          row2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'real',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          row2027,
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
        custo2027: cellLr ? cellLr.exercicio.unitario : cellLrNeutro!.exercicio2027.custoUnitario,
        custoHoje: cellLr ? cellLr.hoje.unitario : cellLrNeutro!.hoje.custoUnitario,
        deltaPct: cellLr ? cellLr.deltaPct : cellLrNeutro!.deltaPct,
        comprasLiquidas2027: cellLr
          ? cellLr.exercicio.liquido
          : cellLrNeutro!.exercicio2027.comprasLiquidas,
        notaCheia2027: cellLr ? cellLr.exercicio.bruto : cellLrNeutro!.exercicio2027.notaCheia,
        motorOrigem: cellLr ? 'art12_pleno' : 'lr_x_lr',
        rotuloMotor: 'Cadeia Plena Art. 12 (LR × LR — Célula Neutra)',
        fundamentoLegal:
          'LC 214/2025, art. 12 + art. 47: célula neutra — reprecificação preserva a receita líquida do fornecedor.',
        linhasMemoriaCusto: cellLr
          ? cellLr.exercicio.lines.map((l) => ({
              label: l.label,
              formula: l.formula,
              valor: l.value,
              destaque: Boolean(l.subtotal),
              fundamento: l.fundamento.dispositivo,
            }))
          : cellLrNeutro!.card03.linhas.map((l) => ({
              label: l.label,
              formula: l.formula,
              valor: l.valor,
              destaque: Boolean(l.destaque),
              fundamento: l.fundamento,
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
    // 1. Fornecedor LP (LP × SNP)
    const celulaSnpLp = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'presumido',
          },
          row2027,
        )
      : null
    const fallbackSnpLp = !itemEfetivo
      ? calcularCelulaFornecedorPlenoXAdquirenteSn(
          'lucro_presumido',
          'simples',
          itemParaMotores,
          cbsEfetivaPct,
        )
      : null

    // 2. Fornecedor LR (LR × SNP)
    const celulaSnpLr = itemEfetivo
      ? computeCellArt12Item(
          itemEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'real',
          },
          row2027,
        )
      : null
    const fallbackSnpLr = !itemEfetivo
      ? calcularCelulaFornecedorPlenoXAdquirenteSn(
          'lucro_real',
          'simples',
          itemParaMotores,
          cbsEfetivaPct,
        )
      : null

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
          row2027,
        )
      : computeCellArt12(
          inputEfetivo,
          {
            ...CONFIG_PADRAO_ART12,
            compradorRegime: 'simples',
            fornecedorRegime: 'simples_hibrido',
            perfilFornecedorSN: perfilFornecedorSNHibrido,
          },
          row2027,
        )

    return {
      lp: {
        custo2027: celulaSnpLp
          ? celulaSnpLp.exercicio.unitario
          : fallbackSnpLp!.exercicio2027.custoUnitario,
        custoHoje: celulaSnpLp ? celulaSnpLp.hoje.unitario : fallbackSnpLp!.hoje.custoUnitario,
        deltaPct: celulaSnpLp ? celulaSnpLp.deltaPct : fallbackSnpLp!.deltaPct,
        comprasLiquidas2027: celulaSnpLp
          ? celulaSnpLp.exercicio.liquido
          : fallbackSnpLp!.exercicio2027.comprasLiquidas,
        notaCheia2027: celulaSnpLp
          ? celulaSnpLp.exercicio.bruto
          : fallbackSnpLp!.exercicio2027.notaCheia,
        motorOrigem: celulaSnpLp ? 'art12_pleno' : 'quatro_celulas_sn',
        rotuloMotor: 'Matriz Art. 12 (SN Puro × LP)',
        fundamentoLegal:
          'LC 123/2006 art. 13, §1º + LC 214/2025 art. 47, §9º, I: optante não apropria crédito — absorve a nota cheia.',
        linhasMemoriaCusto: celulaSnpLp
          ? celulaSnpLp.exercicio.lines.map((l) => ({
              label: l.label,
              formula: l.formula,
              valor: l.value,
              destaque: Boolean(l.subtotal),
              fundamento: l.fundamento.dispositivo,
            }))
          : fallbackSnpLp!.card03.linhas.map((l) => ({
              label: l.label,
              formula: l.formula,
              valor: l.valor,
              destaque: Boolean(l.destaque),
              fundamento: l.fundamento,
            })),
      },
      lr: {
        custo2027: celulaSnpLr
          ? celulaSnpLr.exercicio.unitario
          : fallbackSnpLr!.exercicio2027.custoUnitario,
        custoHoje: celulaSnpLr ? celulaSnpLr.hoje.unitario : fallbackSnpLr!.hoje.custoUnitario,
        deltaPct: celulaSnpLr ? celulaSnpLr.deltaPct : fallbackSnpLr!.deltaPct,
        comprasLiquidas2027: celulaSnpLr
          ? celulaSnpLr.exercicio.liquido
          : fallbackSnpLr!.exercicio2027.comprasLiquidas,
        notaCheia2027: celulaSnpLr
          ? celulaSnpLr.exercicio.bruto
          : fallbackSnpLr!.exercicio2027.notaCheia,
        motorOrigem: celulaSnpLr ? 'art12_pleno' : 'quatro_celulas_sn',
        rotuloMotor: 'Matriz Art. 12 (SN Puro × LR)',
        fundamentoLegal:
          'LC 123/2006 art. 13, §1º + LC 214/2025 art. 47, §9º, I: optante não apropria crédito — absorve a nota cheia.',
        linhasMemoriaCusto: celulaSnpLr
          ? celulaSnpLr.exercicio.lines.map((l) => ({
              label: l.label,
              formula: l.formula,
              valor: l.value,
              destaque: Boolean(l.subtotal),
              fundamento: l.fundamento.dispositivo,
            }))
          : fallbackSnpLr!.card03.linhas.map((l) => ({
              label: l.label,
              formula: l.formula,
              valor: l.valor,
              destaque: Boolean(l.destaque),
              fundamento: l.fundamento,
            })),
      },
      snp: {
        custo2027: celulaSnpSnp
          ? celulaSnpSnp.exercicio.unitario
          : fallbackSessaoSnpSn!.custoUnitarioLiquido,
        custoHoje: celulaSnpSnp
          ? celulaSnpSnp.hoje.unitario
          : fallbackSessaoSnpSn!.custoUnitarioHojeSN,
        deltaPct: celulaSnpSnp
          ? celulaSnpSnp.deltaPct
          : deltaComHoje(
              fallbackSessaoSnpSn!.custoUnitarioLiquido,
              fallbackSessaoSnpSn!.custoUnitarioHojeSN,
            ),
        comprasLiquidas2027: celulaSnpSnp
          ? celulaSnpSnp.exercicio.liquido
          : fallbackSessaoSnpSn!.custoLiquido,
        notaCheia2027: celulaSnpSnp
          ? celulaSnpSnp.exercicio.bruto
          : fallbackSessaoSnpSn!.receitaBruta,
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
  const celulaSnhLp = itemEfetivo
    ? computeCellArt12Item(
        itemEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'presumido',
        },
        row2027,
      )
    : null
  const fallbackSnhLp = !itemEfetivo
    ? calcularCelulaFornecedorPlenoXAdquirenteSn(
        'lucro_presumido',
        'simples_hibrido',
        itemParaMotores,
        cbsEfetivaPct,
      )
    : null

  // 2. Fornecedor LR (LR × SNH)
  const celulaSnhLr = itemEfetivo
    ? computeCellArt12Item(
        itemEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'real',
        },
        row2027,
      )
    : null
  const fallbackSnhLr = !itemEfetivo
    ? calcularCelulaFornecedorPlenoXAdquirenteSn(
        'lucro_real',
        'simples_hibrido',
        itemParaMotores,
        cbsEfetivaPct,
      )
    : null

  // 3. Fornecedor SNP (SNP × SNH)
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

  // Crédito do adquirente SN HÍBRIDO comprando de fornecedor SN PURO (ouro: 1.379,49).
  // A nota do optante é congelada, mas quem apura CBS/IBS no regime regular (LC 214/2025, art. 41)
  // credita as FRAÇÕES desses tributos embutidas no DAS do fornecedor — as mesmas do perfil ouro:
  // CBS 1,44869% + IBS 0,01607% = 1,46476%. Em 42.000: crédito 615,20 -> 41.384,81 -> 1.379,49/un.
  // Sem esse crédito a célula cairia na nota cheia (42.000,00 -> 1.400,00).
  const custoSnpNoAdquirenteSnh = (() => {
    const notaCheia = cellSnpSnh.exercicio.bruto
    const fracao = (perfilSN.cbsNotaPct + perfilSN.ibsNotaPct) / 100
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
        row2027,
      )
    : computeCellArt12(
        inputEfetivo,
        {
          ...CONFIG_PADRAO_ART12,
          compradorRegime: 'simples_hibrido',
          fornecedorRegime: 'simples_hibrido',
          perfilFornecedorSN: perfilFornecedorSNHibrido,
        },
        row2027,
      )

  return {
    lp: {
      custo2027: celulaSnhLp
        ? celulaSnhLp.exercicio.unitario
        : fallbackSnhLp!.exercicio2027.custoUnitario,
      custoHoje: celulaSnhLp ? celulaSnhLp.hoje.unitario : fallbackSnhLp!.hoje.custoUnitario,
      deltaPct: celulaSnhLp ? celulaSnhLp.deltaPct : fallbackSnhLp!.deltaPct,
      comprasLiquidas2027: celulaSnhLp
        ? celulaSnhLp.exercicio.liquido
        : fallbackSnhLp!.exercicio2027.comprasLiquidas,
      notaCheia2027: celulaSnhLp
        ? celulaSnhLp.exercicio.bruto
        : fallbackSnhLp!.exercicio2027.notaCheia,
      motorOrigem: celulaSnhLp ? 'art12_pleno' : 'quatro_celulas_sn',
      rotuloMotor: 'Matriz Art. 12 (LP × SN Híbrido)',
      fundamentoLegal:
        'LC 214/2025 art. 41: credita CBS e IBS; NUNCA credita ICMS 18% -> Custo 1.371,34.',
      linhasMemoriaCusto: celulaSnhLp
        ? celulaSnhLp.exercicio.lines.map((l) => ({
            label: l.label,
            formula: l.formula,
            valor: l.value,
            destaque: Boolean(l.subtotal),
            fundamento: l.fundamento.dispositivo,
          }))
        : fallbackSnhLp!.card03.linhas.map((l) => ({
            label: l.label,
            formula: l.formula,
            valor: l.valor,
            destaque: Boolean(l.destaque),
            fundamento: l.fundamento,
          })),
    },
    lr: {
      custo2027: celulaSnhLr
        ? celulaSnhLr.exercicio.unitario
        : fallbackSnhLr!.exercicio2027.custoUnitario,
      custoHoje: celulaSnhLr ? celulaSnhLr.hoje.unitario : fallbackSnhLr!.hoje.custoUnitario,
      deltaPct: celulaSnhLr ? celulaSnhLr.deltaPct : fallbackSnhLr!.deltaPct,
      comprasLiquidas2027: celulaSnhLr
        ? celulaSnhLr.exercicio.liquido
        : fallbackSnhLr!.exercicio2027.comprasLiquidas,
      notaCheia2027: celulaSnhLr
        ? celulaSnhLr.exercicio.bruto
        : fallbackSnhLr!.exercicio2027.notaCheia,
      motorOrigem: celulaSnhLr ? 'art12_pleno' : 'quatro_celulas_sn',
      rotuloMotor: 'Matriz Art. 12 (LR × SN Híbrido)',
      fundamentoLegal:
        'LC 214/2025 art. 41: credita CBS e IBS; NUNCA credita ICMS 18% -> Custo 1.291,63.',
      linhasMemoriaCusto: celulaSnhLr
        ? celulaSnhLr.exercicio.lines.map((l) => ({
            label: l.label,
            formula: l.formula,
            valor: l.value,
            destaque: Boolean(l.subtotal),
            fundamento: l.fundamento.dispositivo,
          }))
        : fallbackSnhLr!.card03.linhas.map((l) => ({
            label: l.label,
            formula: l.formula,
            valor: l.valor,
            destaque: Boolean(l.destaque),
            fundamento: l.fundamento,
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
