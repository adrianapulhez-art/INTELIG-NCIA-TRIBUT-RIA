/**
 * ============================================================================
 * MÁXIMA DA CASA — INEGOCIÁVEL (comando da CEO Adriana Pulhez, 27/09/2026):
 * A IT NUNCA FAZ MÉDIA DE VALORES ENTRE PRODUTOS DIFERENTES. Nunca gera média
 * entre itens importados da Calculadora de Compras. Informação unitária é POR
 * ITEM — cada produto tem sua própria célula de cálculo (por item: próxima etapa).
 * Qualquer alteração futura que reintroduza média entre itens viola esta máxima.
 * ============================================================================
 * INTEGRAÇÃO DE BASE COM SISTEMA PRÉ-REFORMA — vínculo automático (25/09).
 * A célula FORNECEDOR × COMPRADOR × REPASSE calcula sobre UM item de compra
 * (aquisição unitária real). Regras:
 *  - 1 item com valor → a célula calcula sobre ele (unitário real, sem média).
 *  - 0 itens → célula zerada (zero na origem, zero na célula).
 *  - 2+ itens com valor → SEM CÁLCULO AGREGADO (nada de média): os itens extras
 *    ficam pendentes para o cálculo por item (próxima etapa) — nunca agregados.
 * Regra de consistência: o item canônico (30 un × R$ 1.400 + frete R$ 400,
 * ICMS 18%, IPI 10%) reproduz os ouros chancelados ao centavo.
 */
import { type CmvArt12Input } from './art12Calculations'

export interface ItemComprasOrigem {
  id: string
  name: string
  quantity: number
  merchandiseValue: number
  freightValue: number
  icmsRate: number
  icmsFreightRate: number
  ipiRate: number
  hasSt: boolean
  stValue: number
}

export interface ItemIntegracaoArt12 {
  id: string
  name: string
  quantity: number
  merchandiseValue: number
  freightValue: number
  icmsRate: number
  icmsFreightRate: number
  ipiRate: number
  hasSt: boolean
  stValue: number
  /** Valor da nota do item: mercadoria + frete + IPI + ST. */
  valorNota: number
  /** Participação % no valor total da seleção (base da curva ABC). */
  abcPct: number
  /** Classe ABC por acumulação desc de valor: A até 80%, B até 95%, C o resto. */
  classe: 'A' | 'B' | 'C' | '—'
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** Resultado do derivador unitário: 1 item OU zero (nunca agregação/média). */
export interface CasoUnitario {
  input: CmvArt12Input | null
  /** Item que originou o cálculo (quando input ≠ null). */
  item: ItemIntegracaoArt12 | null
  /** Itens com valor além do primeiro — aguardam cálculo por item (próxima etapa). */
  pendentesPorItem: ItemIntegracaoArt12[]
}

/**
 * DERIVADOR UNITÁRIO (máxima da casa — sem média entre produtos diferentes):
 * extrai a aquisição do PRIMEIRO item com valor. Se houver mais itens com valor,
 * eles ficam pendentes para o cálculo por item (próxima etapa) — nunca agregados.
 */
export function derivarCasoUnitario(items: ItemIntegracaoArt12[]): CasoUnitario {
  const comValor = items.filter((i) => i.valorNota > 0)
  if (comValor.length === 0) return { input: null, item: null, pendentesPorItem: [] }
  const primeiro = comValor[0]
  const input: CmvArt12Input = {
    quantity: primeiro.quantity || 0,
    unitPrice: primeiro.quantity > 0 ? r2((primeiro.merchandiseValue || 0) / primeiro.quantity) : 0,
    freightValue: r2(primeiro.freightValue || 0),
    icmsRate: primeiro.icmsRate || 0,
    icmsFreightRate: primeiro.icmsFreightRate || 0,
    ipiRate: primeiro.ipiRate || 0,
  }
  return { input, item: primeiro, pendentesPorItem: comValor.slice(1) }
}

/** Calcula valor de nota, % e classe ABC de cada item (sobre o total com valor > 0). */
export function montarItensIntegracao(origem: ItemComprasOrigem[]): ItemIntegracaoArt12[] {
  const base = origem.map((i) => ({
    ...i,
    valorNota: r2(
      (i.merchandiseValue || 0) +
        (i.freightValue || 0) +
        ((i.merchandiseValue || 0) * (i.ipiRate || 0)) / 100 +
        (i.hasSt ? i.stValue || 0 : 0),
    ),
    abcPct: 0,
    classe: '—' as const,
  }))
  const total = base.reduce((a, i) => a + i.valorNota, 0)
  const ordenados = [...base].sort((a, b) => b.valorNota - a.valorNota)
  let acum = 0
  for (const i of ordenados) {
    if (i.valorNota <= 0 || total <= 0) continue
    i.abcPct = Math.round((i.valorNota / total) * 10000) / 100
    const pctAcum = (acum / total) * 100
    i.classe = pctAcum < 80 ? 'A' : pctAcum < 95 ? 'B' : 'C'
    acum += i.valorNota
  }
  return base
}
