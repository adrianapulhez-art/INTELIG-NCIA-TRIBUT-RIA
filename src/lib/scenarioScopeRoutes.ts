/**
 * Mapeamento escopo do cenário salvo → rota de destino.
 * Regra da Adri: "o sistema abre na página em que estava sendo gravado o cenário" —
 * nenhum escopo cai na Markup por padrão indevido; mudança apenas de navegação,
 * restauração (TaxContext) intocada.
 */
export function rotaDoEscopoCenario(scope?: string | null): string {
  const s = (scope || '').trim().toLowerCase()
  if (s.includes('compra')) return '/demo/compras'
  if (s.includes('despesa')) return '/demo/despesas-operacionais'
  if (s.includes('markup-pos') || s.includes('reforma') || s.includes('pos')) {
    return '/demo/markup-pos'
  }
  if (s.includes('simples')) return '/demo/simples'
  if (s.includes('dre-presumido') || s.includes('presumido')) return '/demo/dre-presumido'
  if (s.includes('dre-real') || s === 'real') return '/demo/dre-real'
  if (s.includes('dashboard')) return '/demo/dashboard'
  // Fallback: escopos markup e desconhecidos → Markup (home da demo), como hoje.
  return '/demo/markup'
}
