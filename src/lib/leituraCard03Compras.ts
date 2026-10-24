import {
  computeCellArt12,
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
 * Lê rigorosamente do Card 03 da Calculadora de Compras Pós Reforma (Novo Preço de Custo do Adquirente),
 * integrando ao vivo com o motor correto para cada célula (16 combinações = 4 adquirentes × 4 fornecedores):
 *
 * 1. Adquirente LP:
 *    - Fornecedor LP: Art. 12 pleno (comprador presumido × fornecedor presumido) -> Card 03: 1.116,63 (ouro)
 *    - Fornecedor LR: Art. 12 pleno (comprador presumido × fornecedor real) -> Card 03: 1.051,73 (ouro)
 *    - Fornecedor SNP: Sessão SN com adquirente 'presumido' (art. 23 LC 123) -> Card 03: 1.394,11 (ouro canônico)
 *    - Fornecedor SNH: Célula Pleno × SNH (art. 41 LC 214) / computeCellArt12 -> Card 03: 1.413,33 (ouro matriz)
 *
 * 2. Adquirente LR:
 *    - Fornecedor LP: Art. 12 pleno (comprador real × fornecedor presumido) -> Card 03: 1.116,63 (ouro)
 *    - Fornecedor LR: Motor LR×LR neutro (calcularCelulaLrXLr) -> Card 03: 1.051,73 (ouro Δ 0,00%)
 *    - Fornecedor SNP: Sessão SN com adquirente 'real' (crédito PIS/COFINS baseline) -> Card 03: 1.265,16 (ouro)
 *    - Fornecedor SNH: computeCellArt12 (real × simples_hibrido) -> Card 03: 1.413,33 (ouro matriz)
 *
 * 3. Adquirente SNP:
 *    - Fornecedor LP: 4 Células (calcularCelulaFornecedorPlenoXAdquirenteSn LP×SNP) -> Card 03: 1.482,94 (ouro)
 *    - Fornecedor LR: 4 Células (calcularCelulaFornecedorPlenoXAdquirenteSn LR×SNP) -> Card 03: 1.482,94 (ouro)
 *    - Fornecedor SNP: Sessão SN com adquirente 'simples' (zero crédito art. 13 §1º) -> Card 03: 1.413,33 (ouro)
 *    - Fornecedor SNH: computeCellArt12 (simples × simples_hibrido) -> Card 03: 1.516,48 (ouro matriz)
 *
 * 4. Adquirente SNH:
 *    - Fornecedor LP: 4 Células (calcularCelulaFornecedorPlenoXAdquirenteSn LP×SNH) -> Card 03: 1.383,56 (ouro)
 *    - Fornecedor LR: 4 Células (calcularCelulaFornecedorPlenoXAdquirenteSn LR×SNH) -> Card 03: 1.383,56 (ouro)
 *    - Fornecedor SNP: Sessão SN com adquirente 'simples_hibrido' (zero crédito ICMS 18%) -> Card 03: 1.413,33 (ouro)
 *    - Fornecedor SNH: computeCellArt12 (simples_hibrido × simples_hibrido) -> Card 03: 1.413,33 (ouro)
 */
export function lerEspelhoComprasCard03(
  clienteRegime: ClienteRegimeKey,
  input: LeituraCard03Input = {},
): EspelhoQuatroFornecedores {
  const cbsEfetivaPct = input.cbsAliquotaPct ?? input.cbsRateOverride
  const rowBase2027 = CRONOGRAMA_ART12.find((r) => r.exercicio === 2027) || CRONOGRAMA_ART12[1]
  const row2027 = aplicarOverrideCbsArt12(rowBase2027, cbsEfetivaPct)
  const inputEfetivo = input.inputPleno ?? CASO_CANONICO_ART12
  const itemEfetivo = input.item
  const perfilSN = input.perfilSN ?? obterPerfilSnEfetivo(2027) ?? PERFIL_SN_NOTA_PADRAO

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

  // =========================================================================
  // CLIENTE LUCRO PRESUMIDO (LP)
  // =========================================================================
  if (clienteRegime === 'lp') {
    // 1. Fornecedor LP (LP × LP) — Art. 12 pleno
    const cellLp = computeCellArt12(
      inputEfetivo,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'presumido',
        fornecedorRegime: 'presumido',
      },
      row2027,
    )

    // 2. Fornecedor LR (LP × LR) — Art. 12 pleno
    const cellLr = computeCellArt12(
      inputEfetivo,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'presumido',
        fornecedorRegime: 'real',
      },
      row2027,
    )

    // 3. Fornecedor SNP (LP × SNP) — Sessão SN com adquirente 'presumido'
    // Custo unitário de ouro: 1.394,11 (fração do DAS 1,36% aproveitada pelo LP art. 23 LC 123)
    const resSessaoSnp = calcularSessaoSN(itemParaMotores, perfilSN, 'presumido')

    // 4. Fornecedor SNH (LP × SNH) — computeCellArt12 (presumido × simples_hibrido)
    // Custo de ouro: 1.413,33 (lava CBS/IBS no crédito)
    const cellSnh = computeCellArt12(
      inputEfetivo,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'presumido',
        fornecedorRegime: 'simples_hibrido',
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
        custoHoje: resSessaoSnp.custoUnitarioHojeSN,
        deltaPct:
          resSessaoSnp.custoUnitarioHojeSN > 0
            ? Number(
                (
                  ((resSessaoSnp.custoUnitarioLiquido - resSessaoSnp.custoUnitarioHojeSN) /
                    resSessaoSnp.custoUnitarioHojeSN) *
                  100
                ).toFixed(2),
              )
            : 0,
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
        custoHoje: cellSnh.hoje.unitario,
        deltaPct: cellSnh.deltaPct,
        comprasLiquidas2027: cellSnh.exercicio.liquido,
        notaCheia2027: cellSnh.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Matriz Art. 12 (LP × SN Híbrido)',
        fundamentoLegal:
          'LC 214/2025 art. 41 c/c art. 47: fornecedor SN híbrido destaca CBS/IBS por fora e comprador LP apropria crédito integral.',
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
    // 1. Fornecedor LP (LR × LP) — Art. 12 pleno
    const cellLp = computeCellArt12(
      inputEfetivo,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'real',
        fornecedorRegime: 'presumido',
      },
      row2027,
    )

    // 2. Fornecedor LR (LR × LR) — Motor LR×LR neutro dedicado chancelado pela Adri
    const cellLrNeutro = calcularCelulaLrXLr(itemParaMotores, cbsEfetivaPct)

    // 3. Fornecedor SNP (LR × SNP) — Sessão SN com adquirente 'real'
    // Custo de ouro hoje: 1.265,16 (soma créditos PIS/COFINS baseline ADI SRF 15/2007)
    const resSessaoSnpLr = calcularSessaoSN(itemParaMotores, perfilSN, 'real')

    // 4. Fornecedor SNH (LR × SNH) — computeCellArt12 (real × simples_hibrido)
    const cellSnh = computeCellArt12(
      inputEfetivo,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'real',
        fornecedorRegime: 'simples_hibrido',
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
          'LC 214/2025 art. 12: adquirente LR credita CBS/IBS do LP; em 2027 custo unifica com o LP.',
        linhasMemoriaCusto: cellLp.exercicio.lines.map((l) => ({
          label: l.label,
          formula: l.formula,
          valor: l.value,
          destaque: Boolean(l.subtotal),
          fundamento: l.fundamento.dispositivo,
        })),
      },
      lr: {
        custo2027: cellLrNeutro.exercicio2027.custoUnitario,
        custoHoje: cellLrNeutro.hoje.custoUnitario,
        deltaPct: cellLrNeutro.deltaPct,
        comprasLiquidas2027: cellLrNeutro.exercicio2027.comprasLiquidas,
        notaCheia2027: cellLrNeutro.exercicio2027.notaCheia,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Célula LR × LR Neutra Chancelada (Régua A)',
        fundamentoLegal:
          'LC 214/2025, art. 12 + art. 47: reprecificação preserva receita líquida (31.551,96) e crédito lava destaque (Δ 0,00%).',
        linhasMemoriaCusto: cellLrNeutro.card03.linhas.map((l) => ({
          sinal: l.sinal,
          label: l.label,
          formula: l.formula,
          valor: l.valor,
          destaque: l.destaque,
          fundamento: l.fundamento,
        })),
      },
      snp: {
        custo2027: resSessaoSnpLr.custoUnitarioLiquido,
        custoHoje: resSessaoSnpLr.custoUnitarioHojeSN,
        deltaPct:
          resSessaoSnpLr.custoUnitarioHojeSN > 0
            ? Number(
                (
                  ((resSessaoSnpLr.custoUnitarioLiquido - resSessaoSnpLr.custoUnitarioHojeSN) /
                    resSessaoSnpLr.custoUnitarioHojeSN) *
                  100
                ).toFixed(2),
              )
            : 0,
        comprasLiquidas2027: resSessaoSnpLr.custoLiquido,
        notaCheia2027: resSessaoSnpLr.receitaBruta,
        motorOrigem: 'sessao_sn',
        rotuloMotor: 'Sessão SN (LR × SN Puro)',
        fundamentoLegal:
          'LC 123/2006 art. 23 c/c ADI SRF 15/2007 (baseline HOJE credita PIS/COFINS de SN no LR).',
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
        custoHoje: cellSnh.hoje.unitario,
        deltaPct: cellSnh.deltaPct,
        comprasLiquidas2027: cellSnh.exercicio.liquido,
        notaCheia2027: cellSnh.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Matriz Art. 12 (LR × SN Híbrido)',
        fundamentoLegal:
          'LC 214/2025 art. 41 c/c art. 47: crédito financeiro de CBS e IBS pelo adquirente LR.',
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
    // 1. Fornecedor LP (LP × SNP) — Motor das 4 Células Pleno × SN (Card 03 ouro: 1.482,94)
    const celulaSnpLp = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_presumido',
      'simples',
      itemParaMotores,
      cbsEfetivaPct,
    )

    // 2. Fornecedor LR (LR × SNP) — Motor das 4 Células Pleno × SN (Card 03 ouro: 1.482,94)
    const celulaSnpLr = calcularCelulaFornecedorPlenoXAdquirenteSn(
      'lucro_real',
      'simples',
      itemParaMotores,
      cbsEfetivaPct,
    )

    // 3. Fornecedor SNP (SNP × SNP) — Sessão SN com adquirente 'simples' (zero crédito art. 13 §1º LC 123)
    // Custo de ouro: 1.413,33 (nota cheia)
    const resSessaoSnpSn = calcularSessaoSN(itemParaMotores, perfilSN, 'simples')

    // 4. Fornecedor SNH (SNH × SNP) — computeCellArt12 (simples × simples_hibrido)
    // Custo de ouro: 1.516,48 (destaque CBS/IBS vira custo integral para o optante puro)
    const cellSnhSn = computeCellArt12(
      inputEfetivo,
      {
        ...CONFIG_PADRAO_ART12,
        compradorRegime: 'simples',
        fornecedorRegime: 'simples_hibrido',
      },
      row2027,
    )

    return {
      lp: {
        custo2027: celulaSnpLp.exercicio2027.custoUnitario,
        custoHoje: celulaSnpLp.hoje.custoUnitario,
        deltaPct: celulaSnpLp.deltaPct,
        comprasLiquidas2027: celulaSnpLp.exercicio2027.comprasLiquidas,
        notaCheia2027: celulaSnpLp.exercicio2027.notaCheia,
        motorOrigem: 'quatro_celulas_sn',
        rotuloMotor: '4 Células Pleno × SN (LP × SN Puro)',
        fundamentoLegal:
          'LC 123/2006 art. 13 §1º: optante puro tem ZERO créditos — custo de aquisição = NOTA CHEIA 44.488,27 (R$ 1.482,94/un).',
        linhasMemoriaCusto: celulaSnpLp.card03.linhas.map((l) => ({
          sinal: l.sinal,
          label: l.label,
          formula: l.formula,
          valor: l.valor,
          destaque: l.destaque,
          fundamento: l.fundamento,
        })),
      },
      lr: {
        custo2027: celulaSnpLr.exercicio2027.custoUnitario,
        custoHoje: celulaSnpLr.hoje.custoUnitario,
        deltaPct: celulaSnpLr.deltaPct,
        comprasLiquidas2027: celulaSnpLr.exercicio2027.comprasLiquidas,
        notaCheia2027: celulaSnpLr.exercicio2027.notaCheia,
        motorOrigem: 'quatro_celulas_sn',
        rotuloMotor: '4 Células Pleno × SN (LR × SN Puro)',
        fundamentoLegal:
          'LC 123/2006 art. 13 §1º: sem crédito de PIS/COFINS nem CBS/IBS — custo idêntico à compra de LP (1.482,94).',
        linhasMemoriaCusto: celulaSnpLr.card03.linhas.map((l) => ({
          sinal: l.sinal,
          label: l.label,
          formula: l.formula,
          valor: l.valor,
          destaque: l.destaque,
          fundamento: l.fundamento,
        })),
      },
      snp: {
        custo2027: resSessaoSnpSn.custoUnitarioLiquido,
        custoHoje: resSessaoSnpSn.custoUnitarioHojeSN,
        deltaPct:
          resSessaoSnpSn.custoUnitarioHojeSN > 0
            ? Number(
                (
                  ((resSessaoSnpSn.custoUnitarioLiquido - resSessaoSnpSn.custoUnitarioHojeSN) /
                    resSessaoSnpSn.custoUnitarioHojeSN) *
                  100
                ).toFixed(2),
              )
            : 0,
        comprasLiquidas2027: resSessaoSnpSn.custoLiquido,
        notaCheia2027: resSessaoSnpSn.receitaBruta,
        motorOrigem: 'sessao_sn',
        rotuloMotor: 'Sessão SN (SN Puro × SN Puro)',
        fundamentoLegal:
          'LC 123/2006 art. 13 §1º: compra entre optantes do Simples sem transferência de créditos (custo 1.413,33).',
        linhasMemoriaCusto: resSessaoSnpSn.memoria.map((m) => ({
          label: m.label,
          formula: m.formula,
          valor: m.value,
          destaque: m.destaque,
          fundamento: m.fundamento,
        })),
      },
      snh: {
        custo2027: cellSnhSn.exercicio.unitario,
        custoHoje: cellSnhSn.hoje.unitario,
        deltaPct: cellSnhSn.deltaPct,
        comprasLiquidas2027: cellSnhSn.exercicio.liquido,
        notaCheia2027: cellSnhSn.exercicio.bruto,
        motorOrigem: 'art12_pleno',
        rotuloMotor: 'Matriz Art. 12 (SN Puro × SN Híbrido)',
        fundamentoLegal:
          'LC 214/2025 art. 47 §9º I c/c art. 41: fornecedor híbrido destaca CBS/IBS por fora e comprador puro absorve como custo integral (1.516,48).',
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
  // 1. Fornecedor LP (LP × SNH) — Motor das 4 Células Pleno × SN (Card 03 ouro: 1.383,56)
  const celulaSnhLp = calcularCelulaFornecedorPlenoXAdquirenteSn(
    'lucro_presumido',
    'simples_hibrido',
    itemParaMotores,
    cbsEfetivaPct,
  )

  // 2. Fornecedor LR (LR × SNH) — Motor das 4 Células Pleno × SN (Card 03 ouro: 1.383,56)
  const celulaSnhLr = calcularCelulaFornecedorPlenoXAdquirenteSn(
    'lucro_real',
    'simples_hibrido',
    itemParaMotores,
    cbsEfetivaPct,
  )

  // 3. Fornecedor SNP (SNP × SNH) — computeCellArt12 (simples_hibrido × simples)
  // Custo de ouro: 1.413,33 (nota congelada sem destaque)
  const cellSnpSnh = computeCellArt12(
    inputEfetivo,
    {
      ...CONFIG_PADRAO_ART12,
      compradorRegime: 'simples_hibrido',
      fornecedorRegime: 'simples',
    },
    row2027,
  )

  // 4. Fornecedor SNH (SNH × SNH) — computeCellArt12 (simples_hibrido × simples_hibrido)
  // Custo de ouro: 1.413,33 (ambos no regime regular de CBS/IBS — crédito lava o destaque)
  const cellSnhSnh = computeCellArt12(
    inputEfetivo,
    {
      ...CONFIG_PADRAO_ART12,
      compradorRegime: 'simples_hibrido',
      fornecedorRegime: 'simples_hibrido',
    },
    row2027,
  )

  return {
    lp: {
      custo2027: celulaSnhLp.exercicio2027.custoUnitario,
      custoHoje: celulaSnhLp.hoje.custoUnitario,
      deltaPct: celulaSnhLp.deltaPct,
      comprasLiquidas2027: celulaSnhLp.exercicio2027.comprasLiquidas,
      notaCheia2027: celulaSnhLp.exercicio2027.notaCheia,
      motorOrigem: 'quatro_celulas_sn',
      rotuloMotor: '4 Células Pleno × SN (LP × SN Híbrido)',
      fundamentoLegal:
        'LC 214/2025 art. 41: credita CBS (2.947,91) e IBS (33,50); NUNCA credita ICMS 18% (8.007,89) -> Custo 1.383,56.',
      linhasMemoriaCusto: celulaSnhLp.card03.linhas.map((l) => ({
        sinal: l.sinal,
        label: l.label,
        formula: l.formula,
        valor: l.valor,
        destaque: l.destaque,
        fundamento: l.fundamento,
      })),
    },
    lr: {
      custo2027: celulaSnhLr.exercicio2027.custoUnitario,
      custoHoje: celulaSnhLr.hoje.custoUnitario,
      deltaPct: celulaSnhLr.deltaPct,
      comprasLiquidas2027: celulaSnhLr.exercicio2027.comprasLiquidas,
      notaCheia2027: celulaSnhLr.exercicio2027.notaCheia,
      motorOrigem: 'quatro_celulas_sn',
      rotuloMotor: '4 Células Pleno × SN (LR × SN Híbrido)',
      fundamentoLegal:
        'LC 214/2025 art. 41: idêntico à compra de LP — credita CBS e IBS destacados, sem ICMS 18% (1.383,56).',
      linhasMemoriaCusto: celulaSnhLr.card03.linhas.map((l) => ({
        sinal: l.sinal,
        label: l.label,
        formula: l.formula,
        valor: l.valor,
        destaque: l.destaque,
        fundamento: l.fundamento,
      })),
    },
    snp: {
      custo2027: cellSnpSnh.exercicio.unitario,
      custoHoje: cellSnpSnh.hoje.unitario,
      deltaPct: cellSnpSnh.deltaPct,
      comprasLiquidas2027: cellSnpSnh.exercicio.liquido,
      notaCheia2027: cellSnpSnh.exercicio.bruto,
      motorOrigem: 'art12_pleno',
      rotuloMotor: 'Matriz Art. 12 (SN Híbrido × SN Puro)',
      fundamentoLegal:
        'LC 123/2006: fornecedor SN puro não destaca CBS/IBS na nota -> nota congelada (1.413,33).',
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
      custoHoje: cellSnhSnh.hoje.unitario,
      deltaPct: cellSnhSnh.deltaPct,
      comprasLiquidas2027: cellSnhSnh.exercicio.liquido,
      notaCheia2027: cellSnhSnh.exercicio.bruto,
      motorOrigem: 'art12_pleno',
      rotuloMotor: 'Matriz Art. 12 (SN Híbrido × SN Híbrido)',
      fundamentoLegal:
        'LC 214/2025 art. 41: ambos optantes no regime regular de CBS/IBS — o crédito do adquirente lava o destaque (1.413,33).',
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
