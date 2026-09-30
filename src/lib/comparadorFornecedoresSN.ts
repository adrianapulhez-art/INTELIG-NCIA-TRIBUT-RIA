/**
 * ============================================================================
 * COMPARADOR DE FORNECEDORES SN (30/09, aprovado pela CEO na prévia)
 * ============================================================================
 * Os dois caminhos do Simples Nacional lado a lado — mesmo adquirente, mesmo item,
 * mesma Calculadora de Compras. Nenhum número novo: os dois lados saem dos motores
 * já chancelados (sessão SN puro com crédito do art. 23 + motor Art. 12 híbrido).
 * Funções puras — blindáveis no pipeline.
 */
import { r2 } from './art12Calculations'
import { calcularSessaoSN, creditoEfetivoArt23, type PerfilSN } from './art12SnCalculations'
import {
  computeCellArt12Item,
  type CellConfigArt,
  type CellResultArt,
  type RegimeId,
  type ScheduleRowArt,
} from './art12Calculations'
import { type ItemIntegracaoArt12 } from './integracaoComprasArt12'

/** Resultado de UM item para UM fornecedor (puro ou híbrido). */
export interface LadoComparacao {
  /** Preço da nota do fornecedor (congelado no puro; recomposto no híbrido). */
  precoNota: number
  /** Crédito total do adquirente. */
  credito: number
  /** Rótulo do crédito conforme a regra (art. 23 proporcional × art. 47 integral). */
  creditoLabel: string
  /** Custo líquido unitário. */
  unitario: number
  /** Δ vs HOJE do próprio adquirente. */
  deltaPct: number
  /** Estoque reajustado do item (custo unitário × qtd comprada). */
  estoque: number
  /** Gap de negociação vs célula plena de referência. */
  gap: number
}

/** Resultado completo da comparação para um item. */
export interface ComparacaoFornecedores {
  item: ItemIntegracaoArt12
  puro: LadoComparacao
  hibrido: LadoComparacao
  /** Diferença puro − híbrido (negativo = puro mais barato). */
  diffUnitario: number
  /** Diferença de estoque (puro − híbrido). */
  diffEstoque: number
}

/**
 * COMPARAÇÃO POR ITEM — os dois fornecedores com os motores chancelados.
 * @param cellHoje célula HOJE do adquirente (baseline do Δ e do estoque HOJE)
 * @param estoqueBaseHoje estoque HOJE do item (unitário HOJE × qtd)
 */
export function compararFornecedoresSN(
  item: ItemIntegracaoArt12,
  perfil: PerfilSN,
  adquirente: RegimeId,
  cfgBase: CellConfigArt,
  row: ScheduleRowArt,
  custoPlenoUnitario: number,
): ComparacaoFornecedores {
  const qtd = Math.max(1, item.quantity)

  // --- LADO PURO: motor da sessão (nota congelada + crédito do art. 23)
  const r = calcularSessaoSN(item, perfil)
  const cellHoje = computeCellArt12Item(
    item,
    { ...cfgBase, compradorRegime: adquirente, fornecedorRegime: adquirente },
    row,
  )
  const credito = creditoEfetivoArt23(adquirente, r)
  const custoLiquido = r.receitaBruta - credito
  const unitarioPuro = r2(custoLiquido / qtd)
  const deltaPctPuro =
    cellHoje.hoje.unitario > 0 ? r2((unitarioPuro / cellHoje.hoje.unitario - 1) * 100) : 0

  // --- LADO HÍBRIDO: motor Art. 12 chancelado (crédito integral, premissa IT)
  const cellHib = computeCellArt12Item(
    item,
    { ...cfgBase, compradorRegime: adquirente, fornecedorRegime: 'simples_hibrido' },
    row,
  )
  const unitarioHib = cellHib.exercicio.unitario

  const creditoLabel =
    adquirente === 'simples'
      ? 'sem crédito (optante não apropria — art. 47)'
      : adquirente === 'simples_hibrido'
        ? 'crédito proporcional de CBS+IBS (art. 23)'
        : 'crédito proporcional ICMS+CBS+IBS (art. 23)'

  const puro: LadoComparacao = {
    precoNota: r.receitaBruta,
    credito,
    creditoLabel,
    unitario: unitarioPuro,
    deltaPct: deltaPctPuro,
    estoque: r2(unitarioPuro * qtd),
    gap: r2(unitarioPuro - custoPlenoUnitario),
  }
  const hibrido: LadoComparacao = {
    precoNota: r2(cellHib.exercicio.bruto),
    credito: r2(cellHib.exercicio.creditos),
    creditoLabel: 'crédito integral (art. 47 — motor Art. 12 chancelado)',
    unitario: unitarioHib,
    deltaPct: cellHib.deltaPct,
    estoque: r2(unitarioHib * qtd),
    gap: r2(unitarioHib - custoPlenoUnitario),
  }

  return {
    item,
    puro,
    hibrido,
    diffUnitario: r2(unitarioPuro - unitarioHib),
    diffEstoque: r2(unitarioPuro * qtd - unitarioHib * qtd),
  }
}
