import React from 'react'
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportReportButtonsProps {
  onExportPdf: () => void | Promise<void>
  onExportExcel: () => void | Promise<void>
  disabled?: boolean
  className?: string
  pdfTitle?: string
  excelTitle?: string
}

export function ExportReportButtons({
  onExportPdf,
  onExportExcel,
  disabled = false,
  className = '',
  pdfTitle = 'Exportar relatório em PDF formatado',
  excelTitle = 'Exportar planilha em Excel com valores numéricos',
}: ExportReportButtonsProps) {
  const [isPdfLoading, setIsPdfLoading] = React.useState(false)
  const [isExcelLoading, setIsExcelLoading] = React.useState(false)

  const handlePdf = async () => {
    if (disabled || isPdfLoading) return
    try {
      setIsPdfLoading(true)
      await onExportPdf()
    } finally {
      setIsPdfLoading(false)
    }
  }

  const handleExcel = async () => {
    if (disabled || isExcelLoading) return
    try {
      setIsExcelLoading(true)
      await onExportExcel()
    } finally {
      setIsExcelLoading(false)
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-mono text-slate-700 font-semibold">
          Exportar Relatório Demonstrativo:
        </span>
        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
          {disabled ? '(simule para habilitar)' : '(PDF executivo ou Excel analítico)'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isPdfLoading}
          onClick={handlePdf}
          title={pdfTitle}
          className="h-8 px-3 rounded-lg bg-white border-slate-300 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-mono text-xs cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
        >
          {isPdfLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-rose-600" />
          )}
          <span>PDF</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isExcelLoading}
          onClick={handleExcel}
          title={excelTitle}
          className="h-8 px-3 rounded-lg bg-white border-slate-300 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-mono text-xs cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
        >
          {isExcelLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>Excel</span>
        </Button>
      </div>
    </div>
  )
}
