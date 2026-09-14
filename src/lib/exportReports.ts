import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Resolução resiliente a interop ESM/CJS de pacotes de terceiros (jspdf-autotable e xlsx)
// No Vite/Rollup ou dev mode (esbuild), importações default de pacotes CJS/UMD podem vir como { default: fn } ou a própria fn
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
import { formatBRL, formatNumberBR, formatPercentBR } from './taxCalculations'

/**
 * Interface para opções de exportação de DRE (Presumido, Real ou Simples)
 */
export interface DreExportOptions {
  title: string
  regimeName: string
  activityOrAnexo?: string
  quantity: number
  unitGrossRevenue: number
  totalGrossRevenue: number
  rows: {
    description: string
    unitValue?: number | string | null
    totalValue: number | string
    isHeader?: boolean
    isTotal?: boolean
    isSubtotal?: boolean
    isInformative?: boolean
  }[]
  summaryCards: {
    title: string
    value: string
    subtitle?: string
    numericValue?: number
  }[]
  metadata?: { label: string; value: string }[]
  notes?: string[]
}

/**
 * Interface para opções de exportação da Comparação de Regimes
 */
export interface ComparisonExportOptions {
  quantity: number
  unitGrossRevenue: number
  totalGrossRevenue: number
  bestRegime: {
    key: string
    name: string
  }
  economyDifference: number
  worstRegimeName: string
  summaryRegimes: {
    name: string
    taxBurden: number
    effectiveTaxRate: number
    netProfit: number
    netMargin: number
    isBest?: boolean
  }[]
  comparisonRows: {
    line: string
    presumido: number | string
    real: number | string
    simples: number | string
    isHeader?: boolean
    isTotal?: boolean
    isHighlight?: boolean
  }[]
  metadata?: { label: string; value: string }[]
  notes?: string[]
}

/**
 * Interface para opções de exportação do Plano de Voo da Reforma Tributária
 */
export interface ReformaExportOptions {
  selectedYear: number
  quantity: number
  totalGrossRevenue: number
  currentRegimeName: string
  currentTaxBurden: number
  reformaTaxBurden: number
  taxDifference: number
  isReformaBetter: boolean
  turningPointYear: number | null
  totalTransitionSavings: number
  yearlyFlightPlan: {
    year: number
    phaseTitle: string
    cbsRate: number
    ibsRate: number
    isRate: number
    taxBurden: number
    effectiveTaxRate: number
    netProfit: number
    differenceVsCurrent: number
  }[]
  notes?: string[]
}

/**
 * Gera carimbo de data e hora em PT-BR
 */
function getTimestampBR(): string {
  const now = new Date()
  return now.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Helper para desenhar o cabeçalho executivo no PDF
 */
function drawPdfHeader(doc: jsPDF, title: string, regimeName: string, metaRight?: string) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Barra de destaque esmeralda no topo
  doc.setFillColor(16, 185, 129) // emerald-500
  doc.rect(0, 0, pageWidth, 4, 'F')

  // Topo: Marca e Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text('IT — Inteligência Tributária', 14, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text('Plataforma de Simulação e Planejamento Tributário', 14, 20)

  // Lado direito: Data de geração
  const timestamp = metaRight || `Gerado em: ${getTimestampBR()}`
  doc.setFontSize(8)
  doc.text(timestamp, pageWidth - 14, 15, { align: 'right' })

  // Linha divisória fina
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.setLineWidth(0.5)
  doc.line(14, 23, pageWidth - 14, 23)

  // Título do Relatório
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(title, 14, 30)

  // Subtítulo / Regime
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105) // slate-600
  doc.text(`Regime: ${regimeName}`, 14, 35)

  return 38 // Retorna a coordenada Y onde o conteúdo seguinte deve iniciar
}

/**
 * Helper para desenhar o rodapé em todas as páginas do PDF
 */
function drawPdfFooter(doc: jsPDF) {
  const pageCount = (
    doc as unknown as { internal: { getNumberOfPages: () => number } }
  ).internal.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184) // slate-400
    doc.text('Relatório gerado pela plataforma IT — Inteligência Tributária', 14, pageHeight - 9)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 9, { align: 'right' })
  }
}

/**
 * EXPORTAR DRE (Presumido, Real ou Simples) PARA PDF
 */
export function exportDreToPdf(options: DreExportOptions, filename?: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let currentY = drawPdfHeader(doc, options.title, options.regimeName)

  // Metadados (em linha compacta)
  if (options.metadata && options.metadata.length > 0) {
    doc.setFillColor(248, 250, 252) // slate-50
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 9, 1.5, 1.5, 'FD')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)

    const metaText = options.metadata.map((m) => `${m.label}: ${m.value}`).join('   |   ')
    doc.text(metaText, 17, currentY + 5.8)
    currentY += 13
  } else {
    currentY += 4
  }

  // Tabela da DRE
  const tableHeaders = [['Descrição da Linha', 'Unitário', `Total (${options.quantity} un.)`]]
  const tableData = options.rows.map((row) => {
    const desc = row.description
    const unit =
      row.unitValue === null || row.unitValue === undefined || row.unitValue === ''
        ? '—'
        : typeof row.unitValue === 'number'
          ? formatBRL(row.unitValue)
          : String(row.unitValue)
    const total =
      typeof row.totalValue === 'number' ? formatBRL(row.totalValue) : String(row.totalValue)
    return [desc, unit, total]
  })

  autoTableFn(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableData,
    theme: 'plain',
    margin: { left: 14, right: 14 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59], // slate-800
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 42, halign: 'right' },
      2: { cellWidth: 42, halign: 'right' },
    },
    didParseCell: (data) => {
      // Ajustar cabeçalho da tabela: colunas de números à direita
      if (data.section === 'head' && data.column.index > 0) {
        data.cell.styles.halign = 'right'
      }

      // Estilizar linhas com base nos marcadores
      if (data.section === 'body') {
        const rowMeta = options.rows[data.row.index]
        if (!rowMeta) return

        if (rowMeta.isTotal) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [236, 253, 245] // emerald-50
          data.cell.styles.textColor = [6, 95, 70] // emerald-800
        } else if (rowMeta.isSubtotal) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [241, 245, 249] // slate-100
        } else if (rowMeta.isInformative) {
          data.cell.styles.fontStyle = 'italic'
          data.cell.styles.textColor = [100, 116, 139] // slate-500
          data.cell.styles.fillColor = [248, 250, 252] // slate-50
        }
      }
    },
  })

  // Capturar posição Y final da tabela
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // Cards de Resumo Executivo
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - 28
  const cardGap = 4
  const cardCount = options.summaryCards.length
  const cardWidth = (contentWidth - (cardCount - 1) * cardGap) / cardCount
  const cardHeight = 16

  // Checa se cabe na página atual, senão quebra página
  let summaryY = finalY
  if (summaryY + cardHeight + 20 > doc.internal.pageSize.getHeight() - 15) {
    doc.addPage()
    summaryY = 20
  }

  options.summaryCards.forEach((card, idx) => {
    const cardX = 14 + idx * (cardWidth + cardGap)
    // Fundo cinza suave ou verde para lucro líquido
    const isNetProfit = card.title.toLowerCase().includes('lucro líquido')

    if (isNetProfit) {
      doc.setFillColor(236, 253, 245) // emerald-50
      doc.setDrawColor(167, 243, 208) // emerald-200
    } else {
      doc.setFillColor(248, 250, 252) // slate-50
      doc.setDrawColor(226, 232, 240) // slate-200
    }
    doc.roundedRect(cardX, summaryY, cardWidth, cardHeight, 1.5, 1.5, 'FD')

    // Título do Card
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(isNetProfit ? 5 : 100, isNetProfit ? 150 : 116, isNetProfit ? 105 : 139)
    doc.text(card.title.toUpperCase(), cardX + 3, summaryY + 5)

    // Valor Principal
    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(isNetProfit ? 4 : 15, isNetProfit ? 120 : 23, isNetProfit ? 87 : 42)
    doc.text(card.value, cardX + 3, summaryY + 11)

    // Subtítulo opcional
    if (card.subtitle) {
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(card.subtitle, cardX + 3, summaryY + 14.5)
    }
  })

  // Notas e Observações Legais
  if (options.notes && options.notes.length > 0) {
    let noteY = summaryY + cardHeight + 6
    if (noteY + 20 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage()
      noteY = 20
    }

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('OBSERVAÇÕES E NOTAS TÉCNICAS:', 14, noteY)
    noteY += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)

    options.notes.forEach((note) => {
      const splitNote = doc.splitTextToSize(`• ${note}`, contentWidth)
      doc.text(splitNote, 14, noteY)
      noteY += splitNote.length * 3.5
    })
  }

  // Rodapé em todas as páginas
  drawPdfFooter(doc)

  const finalName = filename || `${options.title.toLowerCase().replace(/[\s—]+/g, '_')}.pdf`
  doc.save(finalName)
}

/**
 * EXPORTAR COMPARAÇÃO DE REGIMES PARA PDF
 */
export function exportComparisonToPdf(options: ComparisonExportOptions, filename?: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let currentY = drawPdfHeader(
    doc,
    'Comparação de Regimes Tributários',
    'Lucro Presumido vs Lucro Real vs Simples Nacional',
  )

  // Metadados / Resumo do Vencedor em destaque
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - 28

  doc.setFillColor(236, 253, 245) // emerald-50
  doc.setDrawColor(16, 185, 129) // emerald-500
  doc.setLineWidth(0.8)
  doc.roundedRect(14, currentY, contentWidth, 12, 1.5, 1.5, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(6, 95, 70) // emerald-800
  doc.text(`REGIME RECOMENDADO: ${options.bestRegime.name.toUpperCase()}`, 17, currentY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const econText =
    options.economyDifference > 0
      ? `Economia estimada: ${formatBRL(options.economyDifference)} frente ao regime ${options.worstRegimeName}.`
      : 'Todos os regimes apresentam paridade de resultado ou cálculo zerado.'
  const baseText = `Base: ${options.quantity} un. vendidas | Receita Bruta: ${formatBRL(options.totalGrossRevenue)}`
  doc.text(`${econText}   —   ${baseText}`, 17, currentY + 9.5)

  currentY += 16

  // 3 Cards dos Regimes
  const cardGap = 4
  const cardWidth = (contentWidth - 2 * cardGap) / 3
  const cardHeight = 22

  options.summaryRegimes.forEach((regime, idx) => {
    const cardX = 14 + idx * (cardWidth + cardGap)
    const isBest = regime.isBest

    if (isBest) {
      doc.setFillColor(236, 253, 245)
      doc.setDrawColor(16, 185, 129)
      doc.setLineWidth(0.8)
    } else {
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
    }
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD')

    // Título do Regime + Badge se Melhor
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(isBest ? 6 : 15, isBest ? 95 : 23, isBest ? 70 : 42)
    doc.text(regime.name, cardX + 3, currentY + 4.5)

    if (isBest) {
      doc.setFontSize(6.5)
      doc.setTextColor(16, 185, 129)
      doc.text('(MELHOR RESULTADO)', cardX + cardWidth - 3, currentY + 4.5, { align: 'right' })
    }

    // Carga Tributária
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(
      `Tributos: ${formatBRL(regime.taxBurden)} (${formatNumberBR(regime.effectiveTaxRate, 2)}%)`,
      cardX + 3,
      currentY + 10,
    )

    // Lucro Líquido
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(isBest ? 4 : 15, isBest ? 120 : 23, isBest ? 87 : 42)
    doc.text(`Lucro Líquido: ${formatBRL(regime.netProfit)}`, cardX + 3, currentY + 15.5)

    // Margem Líquida
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(148, 163, 184)
    doc.text(`Margem: ${formatPercentBR(regime.netMargin)}`, cardX + 3, currentY + 19.5)
  })

  currentY += cardHeight + 6

  // Tabela Comparativa Detalhada
  const tableHeaders = [['Linha de Resultado', 'Lucro Presumido', 'Lucro Real', 'Simples Nacional']]
  const tableData = options.comparisonRows.map((row) => {
    const pVal =
      typeof row.presumido === 'number' ? formatBRL(row.presumido) : String(row.presumido)
    const rVal = typeof row.real === 'number' ? formatBRL(row.real) : String(row.real)
    const sVal = typeof row.simples === 'number' ? formatBRL(row.simples) : String(row.simples)
    return [row.line, pVal, rVal, sVal]
  })

  autoTableFn(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableData,
    theme: 'plain',
    margin: { left: 14, right: 14 },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 32, halign: 'right' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index > 0) {
        data.cell.styles.halign = 'right'
      }

      if (data.section === 'body') {
        const rowMeta = options.comparisonRows[data.row.index]
        if (!rowMeta) return

        if (rowMeta.isTotal) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [236, 253, 245]
          data.cell.styles.textColor = [6, 95, 70]
        } else if (rowMeta.isHighlight) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [241, 245, 249]
        }
      }
    },
  })

  // Notas no rodapé
  if (options.notes && options.notes.length > 0) {
    const finalY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
    let noteY = finalY
    if (noteY + 20 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage()
      noteY = 20
    }

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('CONSIDERAÇÕES REGULATÓRIAS E TRIBUTÁRIAS:', 14, noteY)
    noteY += 3.5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)

    options.notes.forEach((note) => {
      const splitNote = doc.splitTextToSize(`• ${note}`, contentWidth)
      doc.text(splitNote, 14, noteY)
      noteY += splitNote.length * 3.2
    })
  }

  drawPdfFooter(doc)

  const finalName = filename || 'comparativo_regimes_tributarios.pdf'
  doc.save(finalName)
}

/**
 * EXPORTAR DRE PARA EXCEL (Valores numéricos reais)
 */
export function exportDreToExcel(options: DreExportOptions, filename?: string): void {
  const wb = (xlsxLib.utils || XLSX.utils).book_new()

  // Montar array de linhas bidimensional
  const sheetData: (string | number | null | undefined)[][] = []

  // Cabeçalho institucional
  sheetData.push(['IT — Inteligência Tributária'])
  sheetData.push([options.title])
  sheetData.push([`Regime: ${options.regimeName}`])
  sheetData.push([`Data de emissão: ${getTimestampBR()}`])
  sheetData.push([])

  // Metadados
  if (options.metadata && options.metadata.length > 0) {
    sheetData.push(['Parâmetros da Simulação'])
    options.metadata.forEach((m) => {
      sheetData.push([m.label, m.value])
    })
    sheetData.push([])
  }

  // Tabela Principal
  sheetData.push(['Descrição da Linha', 'Unitário (R$)', `Total (${options.quantity} un.) (R$)`])

  options.rows.forEach((row) => {
    const unitVal =
      typeof row.unitValue === 'number'
        ? row.unitValue
        : row.unitValue === '—' || !row.unitValue
          ? null
          : row.unitValue
    const totalVal = typeof row.totalValue === 'number' ? row.totalValue : row.totalValue
    sheetData.push([row.description, unitVal, totalVal])
  })

  sheetData.push([])

  // Resumo Executivo
  sheetData.push(['Indicadores de Desempenho / Resumo', 'Valor / Total'])
  options.summaryCards.forEach((c) => {
    const val = c.numericValue !== undefined ? c.numericValue : c.value
    sheetData.push([c.title, val, c.subtitle || ''])
  })

  // Notas
  if (options.notes && options.notes.length > 0) {
    sheetData.push([])
    sheetData.push(['Notas Técnicas'])
    options.notes.forEach((n) => sheetData.push([n]))
  }

  const ws = (xlsxLib.utils || XLSX.utils).aoa_to_sheet(sheetData)

  // Ajustar larguras das colunas
  ws['!cols'] = [{ wch: 45 }, { wch: 18 }, { wch: 22 }, { wch: 25 }]

  ;(xlsxLib.utils || XLSX.utils).book_append_sheet(wb, ws, 'Demonstração DRE')

  const finalName = filename || `${options.title.toLowerCase().replace(/[\s—]+/g, '_')}.xlsx`
  if (typeof xlsxLib.writeFile === 'function') {
    xlsxLib.writeFile(wb, finalName)
  } else {
    XLSX.writeFile(wb, finalName)
  }
}

/**
 * EXPORTAR COMPARAÇÃO DE REGIMES PARA EXCEL (Valores numéricos reais)
 */
export function exportComparisonToExcel(options: ComparisonExportOptions, filename?: string): void {
  const wb = (xlsxLib.utils || XLSX.utils).book_new()
  const sheetData: (string | number | null | undefined)[][] = []

  sheetData.push(['IT — Inteligência Tributária'])
  sheetData.push(['Comparação de Regimes Tributários'])
  sheetData.push([`Regime Recomendado: ${options.bestRegime.name}`])
  if (options.economyDifference > 0) {
    sheetData.push([
      `Economia estimada em relação ao regime ${options.worstRegimeName}: R$ ${options.economyDifference.toFixed(2)}`,
    ])
  }
  sheetData.push([`Data de emissão: ${getTimestampBR()}`])
  sheetData.push([
    `Base de cálculo: ${options.quantity} unidades | Receita bruta total: R$ ${options.totalGrossRevenue.toFixed(2)}`,
  ])
  sheetData.push([])

  // Quadro de Resumo por Regime
  sheetData.push([
    'Regime Tributário',
    'Carga Tributária Total (R$)',
    'Alíquota Efetiva (%)',
    'Lucro Líquido Final (R$)',
    'Margem Líquida (%)',
    'Classificação',
  ])

  options.summaryRegimes.forEach((r) => {
    sheetData.push([
      r.name,
      r.taxBurden,
      r.effectiveTaxRate,
      r.netProfit,
      r.netMargin,
      r.isBest ? 'MELHOR RESULTADO' : 'Cenário Alternativo',
    ])
  })

  sheetData.push([])

  // Tabela Comparativa Completa
  sheetData.push([
    'Linha de Resultado',
    'Lucro Presumido (R$)',
    'Lucro Real (R$)',
    'Simples Nacional (R$)',
  ])

  options.comparisonRows.forEach((r) => {
    sheetData.push([r.line, r.presumido, r.real, r.simples])
  })

  // Notas
  if (options.notes && options.notes.length > 0) {
    sheetData.push([])
    sheetData.push(['Notas Técnicas e Condições Legais'])
    options.notes.forEach((n) => sheetData.push([n]))
  }

  const ws = (xlsxLib.utils || XLSX.utils).aoa_to_sheet(sheetData)
  ws['!cols'] = [{ wch: 42 }, { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 20 }]

  ;(xlsxLib.utils || XLSX.utils).book_append_sheet(wb, ws, 'Comparativo de Regimes')

  const finalName = filename || 'comparativo_regimes_tributarios.xlsx'
  if (typeof xlsxLib.writeFile === 'function') {
    xlsxLib.writeFile(wb, finalName)
  } else {
    XLSX.writeFile(wb, finalName)
  }
}

/**
 * EXPORTAR PLANO DE VOO DA REFORMA TRIBUTÁRIA PARA PDF
 */
export function exportReformaToPdf(options: ReformaExportOptions, filename?: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let currentY = drawPdfHeader(
    doc,
    'Plano de Voo — Reforma Tributária (EC 132/23 & LC 214/25)',
    `Transição 2026–2033 | Comparativo vs ${options.currentRegimeName}`,
  )

  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - 28

  // Banner executivo do Ponto de Virada / Status
  doc.setFillColor(236, 253, 245) // emerald-50
  doc.setDrawColor(16, 185, 129) // emerald-500
  doc.setLineWidth(0.8)
  doc.roundedRect(14, currentY, contentWidth, 13, 1.5, 1.5, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(6, 95, 70) // emerald-800
  const turningPointText = options.turningPointYear
    ? `PONTO DE VIRADA: ANO ${options.turningPointYear} (A partir deste ano, o sistema novo supera o regime atual)`
    : 'SISTEMA ATUAL SEGUE MAIS ECONÔMICO DURANTE TODA A TRANSIÇÃO'
  doc.text(turningPointText, 17, currentY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const savingsText =
    options.totalTransitionSavings > 0
      ? `Economia acumulada estimada (2026–2033): ${formatBRL(options.totalTransitionSavings)}`
      : 'Carga tributária no novo sistema estimada sob não-cumulatividade plena'
  const subMeta = `Ano em análise: ${options.selectedYear} | Receita Bruta: ${formatBRL(options.totalGrossRevenue)}`
  doc.text(`${savingsText}   —   ${subMeta}`, 17, currentY + 9.5)

  currentY += 17

  // Tabela do Plano de Voo Ano a Ano
  const tableHeaders = [
    [
      'Ano',
      'Fase Legal',
      'CBS (%)',
      'IBS (%)',
      'Carga Anual (R$)',
      'Alíq. Efetiva',
      'Dif. vs Atual',
    ],
  ]
  const tableData = options.yearlyFlightPlan.map((row) => {
    const isSelected = row.year === options.selectedYear
    const yearLabel = isSelected ? `${row.year} ★` : String(row.year)
    const diffText =
      row.differenceVsCurrent < 0
        ? `-${formatBRL(Math.abs(row.differenceVsCurrent))}`
        : `+${formatBRL(row.differenceVsCurrent)}`
    return [
      yearLabel,
      row.phaseTitle,
      `${formatPercentBR(row.cbsRate)}`,
      `${formatPercentBR(row.ibsRate)}`,
      formatBRL(row.taxBurden),
      formatPercentBR(row.effectiveTaxRate),
      diffText,
    ]
  })

  autoTableFn(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableData,
    theme: 'plain',
    margin: { left: 14, right: 14 },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 18, halign: 'right' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 2) {
        data.cell.styles.halign = 'right'
      }
      if (data.section === 'body') {
        const item = options.yearlyFlightPlan[data.row.index]
        if (item && item.year === options.selectedYear) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [236, 253, 245]
          data.cell.styles.textColor = [6, 95, 70]
        }
        if (data.column.index === 6 && item) {
          if (item.differenceVsCurrent < 0) {
            data.cell.styles.textColor = [5, 150, 105] // verde economia
            data.cell.styles.fontStyle = 'bold'
          } else if (item.differenceVsCurrent > 0) {
            data.cell.styles.textColor = [225, 29, 72] // rose aumento
          }
        }
      }
    },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // Notas e Observações Legais
  if (options.notes && options.notes.length > 0) {
    let noteY = finalY
    if (noteY + 25 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage()
      noteY = 20
    }

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('FUNDAMENTAÇÃO LEGAL E DIRETRIZES DA REFORMA:', 14, noteY)
    noteY += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)

    options.notes.forEach((note) => {
      const splitNote = doc.splitTextToSize(`• ${note}`, contentWidth)
      doc.text(splitNote, 14, noteY)
      noteY += splitNote.length * 3.5
    })
  }

  drawPdfFooter(doc)

  const finalName = filename || `plano_de_voo_reforma_tributaria_${options.selectedYear}.pdf`
  doc.save(finalName)
}

/**
 * EXPORTAR PLANO DE VOO DA REFORMA TRIBUTÁRIA PARA EXCEL
 */
export function exportReformaToExcel(options: ReformaExportOptions, filename?: string): void {
  const wb = (xlsxLib.utils || XLSX.utils).book_new()
  const sheetData: (string | number | null | undefined)[][] = []

  sheetData.push(['IT — Inteligência Tributária'])
  sheetData.push(['Plano de Voo da Reforma Tributária — IBS/CBS (EC 132/23 & LC 214/25)'])
  sheetData.push([`Regime atual de confronto: ${options.currentRegimeName}`])
  sheetData.push([`Ano selecionado em análise: ${options.selectedYear}`])
  if (options.turningPointYear) {
    sheetData.push([`Ponto de Virada estimado: Ano ${options.turningPointYear}`])
  }
  if (options.totalTransitionSavings > 0) {
    sheetData.push([
      `Economia acumulada estimada (2026–2033): R$ ${options.totalTransitionSavings.toFixed(2)}`,
    ])
  }
  sheetData.push([`Data de emissão: ${getTimestampBR()}`])
  sheetData.push([
    `Base operacional: ${options.quantity} unidades | Faturamento Bruto: R$ ${options.totalGrossRevenue.toFixed(2)}`,
  ])
  sheetData.push([])

  // Cabeçalho da Planilha
  sheetData.push([
    'Ano',
    'Fase de Transição Legal',
    'Alíquota CBS (%)',
    'Alíquota IBS (%)',
    'Alíquota IS (%)',
    'Carga Tributária Total no Ano (R$)',
    'Alíquota Efetiva (%)',
    'Lucro Líquido Projetado (R$)',
    'Carga Atual de Confronto (R$)',
    'Diferença vs Atual (R$)',
    'Veredito',
  ])

  options.yearlyFlightPlan.forEach((r) => {
    sheetData.push([
      r.year,
      r.phaseTitle,
      r.cbsRate,
      r.ibsRate,
      r.isRate,
      r.taxBurden,
      r.effectiveTaxRate,
      r.netProfit,
      options.currentTaxBurden,
      r.differenceVsCurrent,
      r.differenceVsCurrent < 0 ? 'Economia no Novo Sistema' : 'Regime Atual Mais Econômico',
    ])
  })

  if (options.notes && options.notes.length > 0) {
    sheetData.push([])
    sheetData.push(['Notas Técnicas e Premissas Legais (LC 214/2025 e EC 132/2023)'])
    options.notes.forEach((n) => sheetData.push([n]))
  }

  const ws = (xlsxLib.utils || XLSX.utils).aoa_to_sheet(sheetData)
  ws['!cols'] = [
    { wch: 10 },
    { wch: 38 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 26 },
  ]

  ;(xlsxLib.utils || XLSX.utils).book_append_sheet(wb, ws, 'Plano de Voo 2026-2033')

  const finalName = filename || `plano_de_voo_reforma_tributaria_${options.selectedYear}.xlsx`
  if (typeof xlsxLib.writeFile === 'function') {
    xlsxLib.writeFile(wb, finalName)
  } else {
    XLSX.writeFile(wb, finalName)
  }
}
