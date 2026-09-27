/**
 * INTEGRAÇÃO DE BASE COM SISTEMA PRÉ-REFORMA — Fase 1
 * Derivador: itens importados da Calculadora de Compras → aquisição equivalente
 * do módulo CMV Art. 12 (CmvArt12Input). A célula FORNECEDOR × COMPRADOR × REPASSE
 * calcula sobre este input; sem importação, o caso canônico segue intacto.
 *
 * Regra de consistência: importar o item canônico (30 un × R$ 1.400 + frete R$ 400,
 * ICMS 18%, IPI 10%) TEM de reproduzir os ouros chancelados ao centavo.
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

/** Agrega itens (já com classe ABC calculada) na aquisição equivalente do Art. 12. */
export function derivarCasoDeItens(items: ItemIntegracaoArt12[]): CmvArt12Input {
  const merc = items.reduce((a, i) => a + (i.merchandiseValue || 0), 0)
  const fret = items.reduce((a, i) => a + (i.freightValue || 0), 0)
  const qtd = items.reduce((a, i) => a + (i.quantity || 0), 0)
  // Alíquotas médias ponderadas pela base de cada tributo
  const icmsRate =
    merc > 0
      ? items.reduce((a, i) => a + (i.merchandiseValue || 0) * (i.icmsRate || 0), 0) / merc
      : 0
  const ipiRate =
    merc > 0
      ? items.reduce((a, i) => a + (i.merchandiseValue || 0) * (i.ipiRate || 0), 0) / merc
      : 0
  const icmsFreightRate =
    fret > 0
      ? items.reduce((a, i) => a + (i.freightValue || 0) * (i.icmsFreightRate || 0), 0) / fret
      : 0
  return {
    quantity: qtd,
    unitPrice: qtd > 0 ? r2(merc / qtd) : 0,
    freightValue: r2(fret),
    icmsRate: Math.round(icmsRate * 100) / 100,
    icmsFreightRate: Math.round(icmsFreightRate * 100) / 100,
    ipiRate: Math.round(ipiRate * 100) / 100,
  }
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
