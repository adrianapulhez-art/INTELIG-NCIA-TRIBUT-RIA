/**
 * CARTEIRA 2027 — RELATÓRIO EXPORTÁVEL DA PONTE 2027 (FASE 3)
 * PDF (jsPDF + autoTable) e Excel (xlsx), no padrão visual IT dos demais relatórios.
 * Reutiliza drawPdfHeader/getTimestampBR via assinatura própria (arquivo novo,
 * sem tocar em exportReports.ts).
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatBRL, formatPercentBR } from './taxCalculations'
import type {
  Ponte2027Result,
  RegimeCompare2027,
  B2BCreditResult,
  SplitPaymentResult,
  CashFlow2027Result,
} from './ponte2027Calculations'

// Resolução resiliente a interop ESM/CJS (mesmo padrão de exportReports.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const autoTableFn: any =
  typeof autoTable === 'function'
    ? autoTable
    : (autoTable as unknown as { default?: unknown })?.default &&
        typeof (autoTable as unknown as { default?: unknown }).default === 'function'
      ? (autoTable as unknown as { default: unknown }).default
      : autoTable

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const xlsxLib: any = (XLSX as unknown as { default?: unknown })?.default ?? XLSX

export interface Carteira2027ExportOptions {
  regimeName: string
  revenue2027: number
  result: Ponte2027Result
  comparativo: RegimeCompare2027[]
  b2b: B2BCreditResult
  split: SplitPaymentResult
  cashFlow: CashFlow2027Result
  margens: { marginPct: number; price2027: number; netIncomeNoReprice: number; netIncome: number }[]
}

function header(doc: jsPDF, subtitle: string): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFillColor(16, 185, 129)
  doc.rect(0, 0, pageWidth, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text('IT — Inteligência Tributária', 14, 15)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Carteira 2027 — Ponte para a CBS (EC 132/23 & LC 214/25)', 14, 21)
  doc.setFontSize(8)
  doc.text(subtitle, 14, 26)
  const ts = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Emitido em ${ts}`, pageWidth - 14, 15, { align: 'right' })
  return 34
}

export function exportCarteira2027ToPdf(
  options: Carteira2027ExportOptions,
  filename?: string,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { result } = options
  let y = header(
    doc,
    `Regime: ${options.regimeName} · Receita 2027: ${formatBRL(options.revenue2027)}`,
  )

  // Banner executivo
  const melhor = options.comparativo.reduce<RegimeCompare2027 | null>(
    (b, r) => (!b || r.total2027Burden < b.total2027Burden ? r : b),
    null,
  )
  doc.setFillColor(236, 253, 245)
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(0.8)
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 14, 1.5, 1.5, 'FD')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(6, 95, 70)
  doc.text(
    `CONFRONTO: ${result.is2027Better ? 'ECONOMIA' : 'MAIOR CARGA'} de ${formatBRL(Math.abs(result.burdenDifference))}/ano · Melhor regime 2027: ${melhor?.regimeName ?? '—'} · Split simulado: ${formatPercentBR(options.split.retentionRate)}`,
    18,
    y + 5.5,
  )
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(
    'Janela 2027–2028: CBS cheia + ICMS/ISS integrais. Split payment não altera a carga — altera o caixa.',
    18,
    y + 10.5,
  )
  y += 20

  // 1. Confronto anual
  autoTableFn(doc, {
    startY: y,
    head: [['Confronto anual', 'Sistema atual', '2027', 'Δ']],
    body: [
      [
        'Carga tributária',
        formatBRL(result.currentSalesTaxes),
        formatBRL(result.total2027Burden),
        (result.burdenDifference >= 0 ? '+' : '') + formatBRL(result.burdenDifference),
      ],
      [
        'Carga efetiva',
        formatPercentBR(result.currentEffectiveRate),
        formatPercentBR(result.total2027EffectiveRate),
        '',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // 2. Composição 2027
  autoTableFn(doc, {
    startY: y,
    head: [['Composição 2027', 'Valor anual']],
    body: [
      ['CBS líquida (após créditos)', formatBRL(result.netCbsToPay)],
      ['IBS-teste (0,1%)', formatBRL(result.ibsOnSales)],
      ['ICMS integral (janela)', formatBRL(result.transitionalIcms)],
      ['ISS integral (janela)', formatBRL(result.transitionalIss)],
      ['Crédito apropriado das aquisições', formatBRL(result.totalCredit)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // 3. Comparativo de regimes
  autoTableFn(doc, {
    startY: y,
    head: [['Regime', 'Carga 2027', 'Efetiva 2027', 'Carga hoje', 'Δ 2027 vs hoje']],
    body: options.comparativo.map((r) => [
      r.regimeName,
      formatBRL(r.total2027Burden),
      formatPercentBR(r.effectiveRate),
      formatBRL(r.currentSalesTaxes),
      (r.burdenDifference >= 0 ? '+' : '') + formatBRL(r.burdenDifference),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // 4. Split payment & caixa
  autoTableFn(doc, {
    startY: y,
    head: [['Split payment (art. 31) e caixa', 'Valor']],
    body: [
      [
        `CBS retida na fonte (${formatPercentBR(options.split.retentionRate)})`,
        formatBRL(options.split.retainedCbs),
      ],
      ['CBS via DARE (caixa)', formatBRL(options.split.cashCbs)],
      ['Float de capital de giro transferido', formatBRL(options.split.workingCapitalImpact)],
      ['Saídas 2027 (total)', formatBRL(options.cashFlow.totalOut2027)],
      ['Saídas sistema atual (total)', formatBRL(options.cashFlow.totalOutCurrent)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // 5. Crédito B2B
  autoTableFn(doc, {
    startY: y,
    head: [['Crédito B2B entregue ao cliente PJ', 'Valor']],
    body: [
      ['Cliente credita hoje', formatBRL(options.b2b.currentSystemCredit)],
      ['Cliente credita em 2027 (CBS 8,8%)', formatBRL(options.b2b.cbsDelivered)],
      [
        'Diferença',
        (options.b2b.creditDifference >= 0 ? '+' : '') + formatBRL(options.b2b.creditDifference),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // 6. Sensibilidade por margem
  autoTableFn(doc, {
    startY: y,
    head: [['Margem', 'Preço 2027 (mesma margem)', 'Margem hoje', 'Margem se não reprecificar']],
    body: options.margens.map((m) => [
      `${m.marginPct}%`,
      formatBRL(m.price2027),
      formatBRL(m.netIncome),
      formatBRL(m.netIncomeNoReprice),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // Notas
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  const notes = [
    'Base legal: EC 132/2023 (ADCT arts. 125–133) · LC 214/2025, arts. 47–48 (creditamento e destaque), art. 31 (split payment) e art. 168, I (vedação — fornecedor SN).',
    'CBS de referência 8,8% (LC 214/25, art. 349). IBS-teste 0,1% (ADCT art. 127). ICMS/ISS estimados — parametrizáveis.',
    'Split payment: percentual simulado; a regulamentação definirá hipóteses e limites de retenção.',
    'Relatório gerado pela plataforma IT — Inteligência Tributária. A IT não substitui o contador — amplifica seus resultados.',
  ]
  notes.forEach((n) => {
    const lines = doc.splitTextToSize(n, doc.internal.pageSize.getWidth() - 28)
    doc.text(lines, 14, y)
    y += lines.length * 3.5 + 1
  })

  doc.save(filename || 'carteira-2027-ponte-cbs.pdf')
}

export function exportCarteira2027ToExcel(
  options: Carteira2027ExportOptions,
  filename?: string,
): void {
  const wb = xlsxLib.utils.book_new()
  const { result } = options

  // Sheet 1 — Resumo
  const s1: (string | number)[][] = [
    ['CARTEIRA 2027 — PONTE PARA A CBS (EC 132/23 & LC 214/25)'],
    [`Regime: ${options.regimeName} · Receita 2027: ${options.revenue2027}`],
    [],
    ['Confronto anual', 'Sistema atual', '2027', 'Δ'],
    ['Carga tributária', result.currentSalesTaxes, result.total2027Burden, result.burdenDifference],
    ['Carga efetiva (%)', result.currentEffectiveRate, result.total2027EffectiveRate, ''],
    [],
    ['Composição 2027', 'Valor anual'],
    ['CBS líquida (após créditos)', result.netCbsToPay],
    ['IBS-teste (0,1%)', result.ibsOnSales],
    ['ICMS integral (janela)', result.transitionalIcms],
    ['ISS integral (janela)', result.transitionalIss],
    ['Crédito apropriado', result.totalCredit],
    [],
    ['Split payment (art. 31)', 'Valor'],
    [`CBS retida na fonte (${options.split.retentionRate}%)`, options.split.retainedCbs],
    ['CBS via DARE', options.split.cashCbs],
    ['Float de capital de giro', options.split.workingCapitalImpact],
  ]
  const ws1 = xlsxLib.utils.aoa_to_sheet(s1)
  ws1['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 18 }, { wch: 16 }]
  xlsxLib.utils.book_append_sheet(wb, ws1, 'Resumo')

  // Sheet 2 — Fluxo mensal
  const s2: (string | number)[][] = [
    [
      'Mês',
      'CBS líquida',
      'Split retido',
      'CBS caixa (DARE)',
      'ICMS+ISS',
      'IBS',
      'Saída 2027',
      'Saída atual',
      'Δ acumulado',
    ],
    ...options.cashFlow.months.map((m) => [
      m.month,
      m.netCbs,
      m.splitRetained,
      m.cbsOnCash,
      m.icmsIss,
      m.ibs,
      m.out2027,
      m.outCurrent,
      m.deltaCumulative,
    ]),
  ]
  const ws2 = xlsxLib.utils.aoa_to_sheet(s2)
  ws2['!cols'] = Array.from({ length: 9 }, () => ({ wch: 16 }))
  xlsxLib.utils.book_append_sheet(wb, ws2, 'Fluxo mensal 2027')

  // Sheet 3 — Regimes + B2B + Margens
  const s3: (string | number)[][] = [
    ['Comparativo de regimes 2027'],
    ['Regime', 'Carga 2027', 'Efetiva 2027 (%)', 'Carga hoje', 'Δ'],
    ...options.comparativo.map((r) => [
      r.regimeName,
      r.total2027Burden,
      r.effectiveRate,
      r.currentSalesTaxes,
      r.burdenDifference,
    ]),
    [],
    ['Crédito B2B'],
    ['Cliente credita hoje', options.b2b.currentSystemCredit],
    ['Cliente credita 2027', options.b2b.cbsDelivered],
    ['Diferença', options.b2b.creditDifference],
    [],
    ['Sensibilidade por margem'],
    ['Margem (%)', 'Preço 2027', 'Margem hoje', 'Se não reprecificar'],
    ...options.margens.map((m) => [m.marginPct, m.price2027, m.netIncome, m.netIncomeNoReprice]),
  ]
  const ws3 = xlsxLib.utils.aoa_to_sheet(s3)
  ws3['!cols'] = Array.from({ length: 5 }, () => ({ wch: 20 }))
  xlsxLib.utils.book_append_sheet(wb, ws3, 'Regimes · B2B · Margens')

  xlsxLib.writeFile(wb, filename || 'carteira-2027-ponte-cbs.xlsx')
}
