import React from 'react'
import { Scale, CheckCircle2 } from 'lucide-react'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'
import { TrilhaChancelaBadge } from './TrilhaChancelaBadge'
import type { ResultadoSessaoSN } from '@/lib/art12SnCalculations'

interface PainelTesesSnProps {
  resultado: ResultadoSessaoSN
  baseAtual: 'bruta' | 'liquida'
  onAlternarBase: (novaBase: 'bruta' | 'liquida') => void
  hojeFormatado?: string
}

/**
 * PAINEL DE TESES EM ABERTO — Res. CGSN 190/2026 (determinação da CEO, Fase 2).
 * Exibe honestamente e lado a lado as teses tributárias com o rótulo:
 * "CRITÉRIO IT v2 (chancela CEO + data de hoje)".
 */
export function PainelTesesSn({
  resultado,
  baseAtual,
  onAlternarBase,
  hojeFormatado = new Date().toLocaleDateString('pt-BR'),
}: PainelTesesSnProps) {
  const { comparativoBases, receitaBruta, icmsNota6, parcelaCreditavelPct } = resultado
  const { bruta, liquida } = comparativoBases

  return (
    <div className="rounded-xl border border-violet-500/40 bg-slate-950/70 p-3.5 space-y-3">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-violet-400" />
            <span className="text-[11px] font-mono font-black uppercase tracking-wider text-violet-300">
              Pendências de Regulamentação — Res. CGSN 190/2026
            </span>
          </div>
          <p className="text-[9px] font-mono text-slate-400 leading-tight">
            Teses tributárias abertas para a apropriação de créditos de optantes do Simples Nacional
            na Reforma Tributária (LC 123/2006 arts. 23 e 25 × LC 214/2025).
          </p>
        </div>
        <TrilhaChancelaBadge label={`CRITÉRIO IT v2 (chancela CEO · ${hojeFormatado})`} compact />
      </div>

      {/* Grid com as duas teses em confronto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Tese A: Base Bruta */}
        <div
          className={`rounded-lg border p-3 space-y-2 transition-all cursor-pointer ${
            baseAtual === 'bruta'
              ? 'bg-violet-500/10 border-violet-400/80 ring-1 ring-violet-500/40'
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
          onClick={() => onAlternarBase('bruta')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-violet-200">
              Tese A · Base do DAS Bruta (Default IT)
            </span>
            {baseAtual === 'bruta' && (
              <span className="text-[9px] font-mono font-bold bg-violet-500 text-slate-950 px-1.5 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Em uso
              </span>
            )}
          </div>
          <p className="text-[9px] font-mono text-slate-400 leading-tight">
            Incidência da alíquota efetiva sobre a receita bruta total da nota (LC 123/2006, art.
            3º, §12º), sem abatimento do ICMS destacado.
          </p>
          <div className="space-y-1 bg-slate-950/60 p-2 rounded border border-slate-800/80 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Base do DAS:</span>
              <span className="text-slate-200 font-bold">{formatBRL(bruta.base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DAS Devido (4,00%):</span>
              <span className="text-slate-200 font-bold">{formatBRL(bruta.das)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400 font-bold">Crédito LP 2027 (1,98%):</span>
              <span className="text-emerald-300 font-bold">{formatBRL(bruta.creditoTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1">
              <span className="text-slate-300 font-bold">Custo Unitário Líquido:</span>
              <span className="text-violet-300 font-bold">{formatBRL(bruta.custoUnitario)}/un</span>
            </div>
          </div>
          <div className="text-[8px] font-mono text-slate-500">
            Fundamento: LC 123/2006, art. 3º, §12º + art. 23, §1º.
          </div>
        </div>

        {/* Tese B: Base Líquida */}
        <div
          className={`rounded-lg border p-3 space-y-2 transition-all cursor-pointer ${
            baseAtual === 'liquida'
              ? 'bg-violet-500/10 border-violet-400/80 ring-1 ring-violet-500/40'
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
          onClick={() => onAlternarBase('liquida')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-violet-200">
              Tese B · Base Líquida da Fração ICMS
            </span>
            {baseAtual === 'liquida' && (
              <span className="text-[9px] font-mono font-bold bg-violet-500 text-slate-950 px-1.5 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Em uso
              </span>
            )}
          </div>
          <p className="text-[9px] font-mono text-slate-400 leading-tight">
            Dedução do ICMS cobrado do adquirente (art. 25, §1º, II da LC 123) com base na fração do
            anexo informada no documento fiscal ({formatNumberBR(resultado.icmsPct, 2)}%).
          </p>
          <div className="space-y-1 bg-slate-950/60 p-2 rounded border border-slate-800/80 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Dedução ICMS nota:</span>
              <span className="text-rose-300 font-bold">-{formatBRL(liquida.deducaoIcms)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Base Líquida apurada:</span>
              <span className="text-slate-200 font-bold">{formatBRL(liquida.base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DAS Devido (4,00%):</span>
              <span className="text-slate-200 font-bold">{formatBRL(liquida.das)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400 font-bold">Crédito LP 2027 (1,98%):</span>
              <span className="text-emerald-300 font-bold">{formatBRL(liquida.creditoTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1">
              <span className="text-slate-300 font-bold">Custo Unitário Líquido:</span>
              <span className="text-violet-300 font-bold">
                {formatBRL(liquida.custoUnitario)}/un
              </span>
            </div>
          </div>
          <div className="text-[8px] font-mono text-slate-500">
            Fundamento: LC 123/2006, art. 25, §1º, II + Res. CGSN 190/2026.
          </div>
        </div>
      </div>

      {/* Nota de honestidade da IT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-violet-950/30 border border-violet-500/20 text-[9px] font-mono text-slate-400">
        <div>
          <span className="text-violet-300 font-bold">
            Decomposição do "montante equivalente" (art. 23):
          </span>{' '}
          A IT adota transparentemente a Tese A (R$ {formatBRL(bruta.creditoTotal)} de crédito) como
          padrão, permitindo alternância imediata para a Tese B (R${' '}
          {formatBRL(liquida.creditoTotal)}).
        </div>
        <span className="text-slate-500 shrink-0">
          Δ no crédito: {formatBRL(Math.abs(bruta.creditoTotal - liquida.creditoTotal))}
        </span>
      </div>
    </div>
  )
}
