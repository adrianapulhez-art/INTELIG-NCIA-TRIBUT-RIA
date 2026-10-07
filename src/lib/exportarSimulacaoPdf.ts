import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { SimulacaoOpcaoRecord } from '@/services/simuladorOpcaoService'
import { fmtSN, roundHalfUp } from '@/lib/art12SnCalculations'

export function exportarSimulacaoOpcaoParaPdf(simulacao: SimulacaoOpcaoRecord): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const r = simulacao.resultado_json
  const c = simulacao.cenario_json

  // Cabeçalho institucional IT
  doc.setFillColor(6, 18, 14)
  doc.rect(0, 0, 210, 32, 'F')

  doc.setTextColor(52, 211, 153) // emerald-400
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('IT — INTELIGÊNCIA TRIBUTÁRIA', 14, 12)

  doc.setTextColor(241, 245, 249)
  doc.setFontSize(11)
  doc.text(`Simulador de Opção: PGDAS × Regime Regular — Exercício ${c.exercicio}`, 14, 20)

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    `Cenário: ${simulacao.nome} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} | Tabela: ${simulacao.versao_cclasstrib || 'IT 2025.002 v1.70'}`,
    14,
    27,
  )

  let yPos = 40

  // Veredito / Melhor Opção
  doc.setFillColor(240, 253, 244)
  doc.setDrawColor(52, 211, 153)
  doc.roundedRect(14, yPos, 182, 24, 2, 2, 'FD')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(6, 78, 59)
  doc.text(`${r.seloMelhorOpcao}`, 18, yPos + 8)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text(
    `Economia mensal estimada: R$ ${fmtSN(r.economiaMensalizada)}/mês (R$ ${fmtSN(r.diferencaTotalSemestre)} no semestre).`,
    18,
    yPos + 15,
  )
  doc.text(
    `Canal comercial: ${c.perfilCanal} (${c.percentualPj}% PJ) | Fornecedor: ${c.regimeFornecedores}`,
    18,
    yPos + 20,
  )

  yPos += 30

  // Tabela Comparativa Lado a Lado
  autoTable(doc, {
    startY: yPos,
    head: [
      ['Item de Confronto', 'Opção A: Por Dentro (PGDAS)', 'Opção B: Por Fora (Regime Regular)'],
    ],
    body: [
      [
        'Regime de Apuração',
        'Simples Nacional (Guia Única DAS)',
        'Regime Regular Não-Cumulativo (IBS/CBS)',
      ],
      [
        'Alíquota Efetiva / Nominal',
        `${fmtSN(r.aliquotaEfetivaDasPct, 4)}% (DAS Efetivo)`,
        `${fmtSN(r.aliquotasRegularAplicadas.totalPct, 2)}% (${r.aliquotasRegularAplicadas.rotulo})`,
      ],
      [
        'Débito Bruto de IBS/CBS',
        `R$ ${fmtSN(r.opcaoDas.debitoTotal)} (Fração ${r.partilhaDas.cbsPct + r.partilhaDas.ibsPct}%)`,
        `R$ ${fmtSN(r.opcaoRegular.debitoTotal)}`,
      ],
      [
        'Créditos sobre Aquisições',
        'R$ 0,00 (vedado)',
        `− R$ ${fmtSN(r.opcaoRegular.creditoTotal)} (${c.percentualComprasSobreFaturamento}% compras)`,
      ],
      [
        'CUSTO LÍQUIDO NO SEMESTRE',
        `R$ ${fmtSN(r.opcaoDas.custoLiquidoIbsCbs)}`,
        `R$ ${fmtSN(r.opcaoRegular.custoLiquidoIbsCbs)}`,
      ],
      [
        'Custo Líquido Mensalizado (÷6)',
        `R$ ${fmtSN(roundHalfUp(r.opcaoDas.custoLiquidoIbsCbs / 6, 2))}/mês`,
        `R$ ${fmtSN(roundHalfUp(r.opcaoRegular.custoLiquidoIbsCbs / 6, 2))}/mês`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, font: 'helvetica' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  // Memória de cálculo resumida
  const finalTableY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Memória de Cálculo e Fundamentação Legal', 14, finalTableY)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  let yMemoria = finalTableY + 6
  doc.text(
    `• Opção DAS: LC 123/2006 Art. 18 §1º + LC 214/2025 Art. 348. Frações oficiais: CBS ${r.partilhaDas.cbsPct}%, IBS ${r.partilhaDas.ibsPct}%.`,
    14,
    yMemoria,
  )
  yMemoria += 5
  doc.text(
    `• Opção Regular: LC 214/2025 Art. 12 §2º e Art. 47 §9º II. Débitos apurados rigorosamente por item com créditos sobre compras.`,
    14,
    yMemoria,
  )
  yMemoria += 5
  doc.text(
    `• Ressalva: Valores constituem estimativas técnicas baseadas na legislação da Reforma Tributária publicada até a data de emissão.`,
    14,
    yMemoria,
  )

  // Rodapé
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'IT — Inteligência Tributária | Relatório gerado exclusivamente para planejamento e governança tributária.',
    14,
    285,
  )

  doc.save(`Simulacao_Opcao_${simulacao.nome.replace(/\s+/g, '_')}_${c.exercicio}.pdf`)
}
